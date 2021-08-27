export interface Card {
  folder: string;
  fileLink: string;
  fileName: string;
  selected: boolean;
  dependencies: CardDependency;
  imgB64?: string;
  sortingScore?: number;
}
export interface CardDependency {
  compulsory?: CardLike[];
  atleastone?: CardLike[];
  optionsl?: CardLike[];
}
export interface CardLike {
  folder: string;
  fileName: string;
  fileLink?: string;
  selected?: boolean;
  dependencies?: CardDependency;
  imgB64?: string;
  sortingScore?: number;
}
// type FolderNames = typeof folderNames[number];
export type TempSortingScore = {
  [Property: string]: number
}

export const folderNames = [
  'backgrounds', 'jackets', 'heads', 'chains', 'glasses', 'caps'
] as const;

export function filterJunkFiles(name: string): boolean {
  return name !== '.DS_Store'
}

export class InitialDataLoader {
  private relativePath: RelativePath;
  private fs: any;
  private data: Card[] = [];

  constructor(relativePath: RelativePath, fs: any) {
    this.relativePath = relativePath;
    this.fs = fs;
  }
  run() {
    const updatedChosenPath = this.relativePath.getPath();
    try {
      this.data = folderNames.reduce((data, folderName) => {
        const temp: Card[] = this.fs.readdirSync(`${updatedChosenPath}/${folderName}`)
        .filter(filterJunkFiles)
        .map((fileName: string) => {
          return {
            // imgB64: `data:image/jpeg;base64, ${fs.readFileSync(`${folderLoc}/${folder}/${name}`).toString('base64')}`,
            folder: folderName,
            fileLink: `${updatedChosenPath}/${folderName}/${fileName}`,
            selected: false,
            fileName,
            dependencies: {}
          }
        })
        return [...data, ...temp];
      }, this.data);
    } catch (error) {
      console.log(error);
      throw {code: 'IFS', message: 'Incorrect folder structure'};
    }
  }
  getData() {
    return this.data;
  }
  getDataString() {
    return JSON.stringify(this.data);
  }
}

export class FSCardLoader {
  private path: string;
  private fs: any;
  private cards: Card[] = [];
  
  constructor({path, fs}: {path: string, fs: any}) {
    this.path = path;
    this.fs = fs;
  }

  load(metaDataFilename: string = 'meta-data.json') {
    let parsedCards: Card[];
    try {
      parsedCards = JSON.parse(this.fs.readFileSync(`${this.path}/${metaDataFilename}`).toString())
    } catch (error) {
      throw {code: 'JPE', message: 'MetaData JSON file seems to be broken'};
    }
    this.cards = parsedCards.map((pc: Card) => {
        pc.imgB64 = `data:image/png;base64, ${this.fs.readFileSync(pc.fileLink).toString('base64')}`
        if (pc.dependencies.compulsory && pc.dependencies.compulsory.length > 0) {
          
          const newCompulsoryDependencies = pc.dependencies.compulsory
          .map(c => {
            const relativePath = new RelativePath(this.path);
            const fileLink = `${relativePath.getPath()}/${pc.folder}/${c.fileName}`;
            c = {...c, fileLink, imgB64: `data:image/png;base64, ${this.fs.readFileSync(fileLink).toString('base64')}`};
            return c;
          });
          pc.dependencies.compulsory = newCompulsoryDependencies;
        }
        return pc;
      });
  }

  getCards() {
    return this.cards;
  }
}

export class RelativePath {
  private path: string;
  constructor(path: string, baseURI: string = '/nftImages') {
    this.path = `.${baseURI}${path.split(baseURI)[1]}`;
  }

  getPath() {
    return this.path;
  }
}

export class MetaDataGenerator {
  private cards: Card[] = [];
  private metaData: CardLike[] = [];
  
  constructor(cards: Card[] = []) {
    this.cards = cards;
  }
  run() {
    this.metaData = this.cards.map(c => {
      const item = {...c} as CardLike;
      delete item.imgB64;
      delete item.selected;
      if (c.dependencies.compulsory && c.dependencies.compulsory.length > 0) {
        c.dependencies.compulsory = c.dependencies.compulsory.map(d => {
          const item = {...d};
          delete item.imgB64;
          delete item.selected;
          delete item.dependencies;
          return item;
        });
      }
      return item;
    });
  }
  getMetaData() {
    return this.metaData;
  }
  getMetaDataString() {
    return JSON.stringify(this.metaData);
  }
}

export class DependencyManager {
  private selectedCards: Card[];
  private sortingScores: TempSortingScore;

  constructor(cards: Card[] = [], sortingScores: TempSortingScore = {}) {
    this.selectedCards = cards;
    this.sortingScores = sortingScores;
  }
  addDependency(card: Card) {
    const item = {...card};
    const numScore = this.sortingScores[item.fileName];
    if (numScore) {
      item.sortingScore = numScore;
    }
    for (const card of this.selectedCards) {
      if (card.dependencies.compulsory && card.dependencies.compulsory.length > 0) {
        card.dependencies.compulsory.push(item as CardLike);
      } else {
        card.dependencies.compulsory = [item as CardLike];
      }
    }
  }

}
