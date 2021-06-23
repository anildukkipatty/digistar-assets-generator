// import fs from 'fs';
const fs = require('fs');

interface Card {
  folder: string;
  fileLink: string;
  fileName: string;
  selected: boolean;
  dependencies: CardDependency[];
  imgB64?: string;
}
interface CardDependency {
  type: 'compulsory' | 'atleastone' | 'optional';
  card: CardLike;
}
interface CardLike {
  folder: string;
  fileName: string;
  fileLink?: string;
  selected?: boolean;
  dependencies?: CardDependency[];
  imgB64?: string;
}
let folderNames = [
  'backgrounds', 'jackets', 'heads', 'chains', 'glasses', 'caps'
]
function filterJunkFiles(name: string): boolean {
  return name != '.DS_Store'
}

async function bootUp(folderLoc: string){
  let dataObj: Card[] = [];
  folderNames.forEach(folder => {
    const names = fs.readdirSync(`${folderLoc}/${folder}`)
      .filter(filterJunkFiles)
      .map((name: string) => ({
        folder,
        // imgB64: `data:image/jpeg;base64, ${fs.readFileSync(`${folderLoc}/${folder}/${name}`).toString('base64')}`,
        fileLink: `${folderLoc}/${folder}/${name}`,
        selected: false,
        fileName: name,
        dependencies: []
      }));
    dataObj = dataObj.concat(names);
  });
  
  fs.writeFileSync(folderLoc+'/meta-data.json', JSON.stringify(dataObj));
}

bootUp('./nftImages/lukaku');


export {};
