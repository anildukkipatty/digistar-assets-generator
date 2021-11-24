import './App.css';
// import * as imgs from './images.js';
// import React from 'react';
// interface Card {
//   folder: string;
//   imgB64: string;
//   fileLink: string;
//   selected: boolean;
//   fileName?: string;
//   dependencies?: Card[];
// }
// folderNames.forEach(folder => {
//   const names = fs.readdirSync(`${path.filePaths[0]}/${folder}`)
//     .filter(filterJunkFiles)
//     .map((name: string) => ({
//       folder,
//       imgB64: `data:image/png;base64, ${fs.readFileSync(`${path.filePaths[0]}/${folder}/${name}`).toString('base64')}`,
//       fileLink: `${path.filePaths[0]}/${folder}/${name}`,
//       selected: false
//     }));
//   dataObj = dataObj.concat(names);
//   setData(dataObj);
// });
import { useEffect, useState } from 'react';
import { run } from './helper';
const dialog = window.require('electron').remote.dialog;
const ipcRenderer = window.require('electron').ipcRenderer;
const fs = window.require('electron').remote.require('fs');
const os = window.require('os');
const {spawn} = window.require('electron').remote.require('child_process');

interface Card {
  folder: string;
  fileLink: string;
  fileName: string;
  selected: boolean;
  dependencies: CardDependency;
  imgB64?: string;
  sortingScore?: number;
  repeat?: number;
}
interface CardDependency {
  compulsory?: CardLike[];
  atleastone?: CardLike[];
  optionsl?: CardLike[];
}
interface CardLike {
  folder: string;
  fileName: string;
  fileLink?: string;
  selected?: boolean;
  dependencies?: CardDependency[];
  imgB64?: string;
  sortingScore?: number;
}
const folderNames = [
  'backgrounds', 'jackets', 'heads', 'chains', 'glasses', 'caps', 'masks'
] as const;
const WINDOWS = 'win32';
const MACOS = 'darwin';
type FolderNames = typeof folderNames[number];
class RelativePath {
  private path: string;
  constructor(path: string, baseURI: string = '/nftImages') {
    this.path = `.${baseURI}${path.split(baseURI)[1]}`;
  }

  getPath() {
    return this.path;
  }
}
const jacketsToGoOverChains = [
  '34.png', '36.png', '163.png', '164.png', '165.png',
  '45.png', '46.png', '47.png',
  '48.png', '49.png', '51.png',
  '52.png', '64.png', '65.png', '66.png', '72.png',
  '76.png', '77.png', '167.png'
];
// const jacketsToGoOverChains = [
//   '30.png', '34.png', '36.png',
//   '45.png', '46.png', '47.png',
//   '48.png', '49.png', '51.png',
//   '52.png', '60.png', '61.png',
//   '62.png', '63.png', '64.png',
//   '65.png', '66.png', '72.png',
//   '76.png', '77.png'
// ];
const tees = [
  '53.png', '54.png',
  '55.png', '56.png',
  '57.png', '58.png',
  '59.png', '73.png',
  '28.png'
];

function App() {
  let [readBaseURI, setReadBaseURI] = useState<string | null>(null);
  // let [writeBaseURI, setWriteBaseURI] = useState(null);
  let [showWIP, setShowWIP] = useState(false);
  let [output, _setOutput] = useState('');
  let [outputImages, _setOutputImages] = useState<string[]>([]);
  let [noOfImagesdGenerated, setNoOfImagesGenerated] = useState(0);
  let [noOfCombinations, setNoOfCombinations] = useState(0);
  useEffect(() => {
    init();
  }, []);
  async function init() {
    ipcRenderer.on('jimp-reply', (_event: any, data: string) => {
      // setOutputImages(oldArr => [...oldArr, `data:image/png;base64, ${fs.readFileSync(data).toString('base64')}`])
      setNoOfImagesGenerated(num => ++num);
      console.log('jimp-reply', data);
    });
    console.log(os.platform() == MACOS, os.platform() === WINDOWS);
    
  }
  const [data, setData] = useState<Card[]>([])
  const [_p, setP] = useState(1)
  const imgStyleDiv = {
    width: '200px',
    border: '2px solid #000',
    marginRight: '3px',
    cursor: 'pointer',
  };
  const imgStyle = {
    width: '200px',
    height: '200px',
  };
  function imageSelected(obj: Card) {
    obj.selected = !obj.selected;
    setData(data);
    setP(new Date().getTime());
    return;
  }
  function recurbaby(position: number, cardsArrList: Card[][], tempCardsArr: Card[], finalOutput: Card[][]){
    if (position >= cardsArrList.length)
      return
    for (let card of cardsArrList[position]) {
      recurbaby(position+1, cardsArrList, [...tempCardsArr, card], finalOutput)
      if (position === cardsArrList.length - 1){
        
        finalOutput.push([...tempCardsArr, card])
      }
    }
  }

  function getCardOrderVal(card: Card): number {
    const scoreDict: {[Property in FolderNames]: number} = {
      backgrounds: 1, jackets: 3, heads: 2, chains: 4, masks: 4.5, glasses: 5, caps: 6
    };
    return card.sortingScore ? card.sortingScore : scoreDict[card.folder as FolderNames];
  };

  async function settingReadBaseURI() {
    const path = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    setReadBaseURI(path.filePaths[0]);
    // @todo:critical write better error handling
    let metaData: Card[] = JSON.parse(fs.readFileSync(`${path.filePaths[0]}/meta-data.json`).toString())
      .map((pc: Card) => {
        pc.imgB64 = `data:image/png;base64, ${fs.readFileSync(pc.fileLink).toString('base64')}`
        if (pc.dependencies.compulsory && pc.dependencies.compulsory.length > 0) {
          
          const newCompulsoryDependencies = pc.dependencies.compulsory
          .map(c => {
            const fileLink = `${path.filePaths[0]}/${c.folder}/${c.fileName}`;
            try {
              c = {...c, fileLink, imgB64: `data:image/png;base64, ${fs.readFileSync(fileLink).toString('base64')}`};
            } catch (error) {
              console.log(pc);
              console.log(c);
              
              throw error;
            }
            return c;
          });
          pc.dependencies.compulsory = newCompulsoryDependencies;
        }
        return pc;
      });
    
      setData(metaData);
  }

  async function generateImages() {
    const files: Card[][] = []
    folderNames.forEach((folder, i: number) => {
      const files_selected = data.filter(obj => obj.folder === folder && obj.selected)
      if (files_selected.length > 0)
        files[i] = files_selected;
    })
    let finalOutput: Card[][] = [];
    recurbaby(0, files.filter(ar => ar.length > 0), [], finalOutput);
    finalOutput = finalOutput
      .map(image => {
        image.forEach(card => {
          let dependencies = [];
          switch (card.folder) {
            case 'jackets':
              dependencies = jacketsExpandDependencies(card);
              image = [...image, ...dependencies];
            break;
            
            case 'caps':
              console.log('CAPS CASE');
              dependencies = capsExpandedDependencies(card, image);
              image = [...image, ...dependencies];
            break;
  
            default:
            break
          }
        });
        return image;
      })
      // changing chains sortingScore if its used with overcoat jackets
      .map(cardsList => {
        const overcoatJacket = cardsList
        .filter((c: Card) => c.folder === 'jackets')
        .filter((c: Card) => {
          return jacketsToGoOverChains.indexOf(c.fileName.toLowerCase()) >= 0
        })[0];
        if (overcoatJacket) {
          return cardsList.map((c: Card) => {
            if (c.folder === 'chains')
              c.sortingScore = 2.1;
            return Object.assign({}, c as any);
          })
        }
        return cardsList.map((c: Card) => {
          if (c.folder === 'chains')
            c.sortingScore = 4;
          return Object.assign({}, c as any);
        });
      })
      .map(cardsList => cardsList.sort((a, b) => getCardOrderVal(a) - getCardOrderVal(b)));
    
    const res = JSON.stringify({
      generatedPath: `${readBaseURI}/outputs`,
      files: finalOutput.map(cl => cl.map(c => c.fileLink))
    });
    fs.writeFileSync('./composer.json', res);
    setNoOfCombinations(finalOutput.length)
    setShowWIP(true);
    if (os.platform() === WINDOWS) {
      ipcRenderer.send('jimp-concat', 'ping');
      return;
    }
    const python = spawn("./compose", [readBaseURI]);

    python.stdout.on("data", (data: any) => {
        console.log(`stdout: ${data}`);
        _setOutput((x) => `${x} \n ${data.toString()}`);
        setNoOfImagesGenerated(num => ++num);
        try {
          // setOutputImages(oldArr => [...oldArr, `data:image/png;base64, ${fs.readFileSync(data.toString().trim()).toString('base64')}`])
        } catch (error) {
          console.log('Error loading output file: ', data.toString());
        }
    });

    python.stderr.on("data", (data: Buffer) => {
        console.log(`stderr: ${data}`);
        _setOutput(`${output} \n ${data.toString()}`);
    });

    python.on('error', (error: any) => {
        console.log(`error: ${error.message}`);
        _setOutput(`${output} \n ${error.message}`);
    });

    python.on("close", (code: unknown) => {
        console.log(`child process exited with code ${code}`);
        _setOutput((x) => `${x} \n ${code}`);
    });
  }
  async function autoSetRarity() {
    let rarity: any = [];
    try {
      rarity = fs.readFileSync(`${readBaseURI}/rarity.csv`)
      .toString('ascii')
      .split('\n')
      .map((line: string) => line.split(',')
        .map(token => token.trim())
      )
      .map((obj: string[]) => ({folder: obj[0].toLowerCase(), fileName: obj[1].toLowerCase(), repeat: parseInt(obj[2])}))

      setData((data: Card[]) => {
        data.map(c => {
          const r = rarity.filter((o: any) => o.folder === c.folder.toLowerCase() && o.fileName === c.fileName.toLowerCase())[0]
          if (r !== undefined && r.repeat !== 0) {
            c.selected = true;
            c.repeat = r.repeat;
            console.log(r.repeat);
          }
          return c;
        })
        return data;
      });
      setTimeout(() => {
        setP(new Date().getTime());
      }, 500);
    } catch (error) {
      alert('Rarity file not found.');
      console.error(error);
      
      return;
    }
  }
  async function generateFromPresets() {
    const presetFileNames = fs.readdirSync(`${readBaseURI}/presets`).filter((fname: String) => fname.indexOf('.json') >= 0);
    const presetBasedImages = []
    for (const fileName of presetFileNames) {
      const image = JSON.parse(fs.readFileSync(`${readBaseURI}/presets/${fileName}`).toString('ascii'))
        .attributes
        .map((x: any) => {
          return `${readBaseURI}/${Object.keys(x)[0]}/${x[Object.keys(x)[0]]}.png`
        });

      presetBasedImages.push(image);

    }
    const composerFile = {generatedPath: `${readBaseURI}/outputs`, files: presetBasedImages};
    fs.writeFileSync(`./composer.json`, JSON.stringify(composerFile));
    setNoOfCombinations(presetBasedImages.length)
    setShowWIP(true);
    if (os.platform() === WINDOWS) {
      ipcRenderer.send('jimp-concat', 'ping');
      return;
    }
    const python = spawn("./compose", [readBaseURI]);

    python.stdout.on("data", (data: any) => {
        console.log(`stdout: ${data}`);
        _setOutput((x) => `${x} \n ${data.toString()}`);
        setNoOfImagesGenerated(num => ++num);
        try {
          // setOutputImages(oldArr => [...oldArr, `data:image/png;base64, ${fs.readFileSync(data.toString().trim()).toString('base64')}`])
        } catch (error) {
          console.log('Error loading output file: ', data.toString());
        }
    });

    python.stderr.on("data", (data: Buffer) => {
        console.log(`stderr: ${data}`);
        _setOutput(`${output} \n ${data.toString()}`);
    });

    python.on('error', (error: any) => {
        console.log(`error: ${error.message}`);
        _setOutput(`${output} \n ${error.message}`);
    });

    python.on("close", (code: unknown) => {
        console.log(`child process exited with code ${code}`);
        _setOutput((x) => `${x} \n ${code}`);
    });
  }
  async function randomGenerate() {
    const noOfImages = 350;
    const imageList: Card[][] = new Array(noOfImages);
    
    await prefillWithRepeats(imageList);

    for(let i = 0; i < noOfImages; i++) {
      const foldersToFillFrom: string[] = (folderNames as unknown as string[]).filter(folderName => {
        let image = imageList[i];
        if (!image) return true;
        return image.map(x => x.folder).indexOf(folderName) < 0;
      });
      // console.log(foldersToFillFrom);
      
      foldersToFillFrom.forEach(folderName => {
        const card = getRandomItem(folderName);
          if (imageList[i] === undefined) imageList[i] = [];
          
          if (card !== undefined){
            imageList[i].push(card);
            if (folderName === 'backgrounds') {
            }
          }
      })
    }
    
    const res = JSON.stringify({
      generatedPath: `${readBaseURI}/outputs`,
      files: expandDependencies(imageList)
        // changing chains sortingScore if its used with overcoat jackets
        .map(cardsList => {
          const overcoatJacket = cardsList
          .filter((c: Card) => c.folder === 'jackets')
          .filter((c: Card) => {
            return jacketsToGoOverChains.indexOf(c.fileName.toLowerCase()) >= 0
          })[0];
          if (overcoatJacket) {
            return cardsList.map((c: Card) => {
              if (c.folder === 'chains')
                c.sortingScore = 2.1;
              return Object.assign({}, c as any);
            })
          }
          return cardsList.map((c: Card) => {
            if (c.folder === 'chains')
              c.sortingScore = 4;
            return Object.assign({}, c as any);
          });
        })
        .map(cardsList => cardsList.sort((a, b) => getCardOrderVal(a) - getCardOrderVal(b)))
        .map(cardsList => cardsList.map(c => c.fileLink))
    });
    fs.writeFileSync('./composer.json', res);
    setNoOfCombinations(imageList.length)
    setShowWIP(true);
    if (os.platform() === WINDOWS) {
      ipcRenderer.send('jimp-concat', 'ping');
      return;
    }
    const python = spawn("./compose", [readBaseURI]);

    python.stdout.on("data", (data: any) => {
        console.log(`stdout: ${data}`);
        _setOutput((x) => `${x} \n ${data.toString()}`);
        setNoOfImagesGenerated(num => ++num);
        try {
          // setOutputImages(oldArr => [...oldArr, `data:image/png;base64, ${fs.readFileSync(data.toString().trim()).toString('base64')}`])
        } catch (error) {
          console.log('Error loading output file: ', data.toString());
        }
    });

    python.stderr.on("data", (data: Buffer) => {
        console.log(`stderr: ${data}`);
        _setOutput(`${output} \n ${data.toString()}`);
    });

    python.on('error', (error: any) => {
        console.log(`error: ${error.message}`);
        _setOutput(`${output} \n ${error.message}`);
    });

    python.on("close", (code: unknown) => {
        console.log(`child process exited with code ${code}`);
        _setOutput((x) => `${x} \n ${code}`);
    });
  }
  async function prefillWithRepeats(imageList: Card[][]) {
    folderNames.forEach(folder => {
      let availableIds = fetchAvailableIds(imageList, folder);
      const filesWithRepeat = data.filter(c => c.folder === folder && c.repeat && c.repeat > 0);
      
      filesWithRepeat.forEach(c => {
        if (!c.repeat) return;
        for(let ii = 0; ii < c.repeat; ii++) {
          if (availableIds.length <= 0) {
            console.log('All slots are filled');
            
            return
          };
          
          let randomIndex = getRandomNumber(availableIds.length - 1);
          let indexToUse = availableIds[randomIndex];
          if (!imageList[indexToUse]) {
            imageList[indexToUse] = [];
          }
          imageList[indexToUse].push(c);
          console.log('Slot filled');
          
          availableIds = availableIds.slice(0, randomIndex).concat(availableIds.slice(randomIndex+1, availableIds.length));
        }
      });
    });

    function fetchAvailableIds(imageList: Card[][], folder: string) {
      const res = [];
      try {
        for(let i = 0; i < imageList.length; i++) {
          if (imageList[i] === undefined) {
            res.push(i);
            continue;
          };
          if (imageList[i].filter(c => c.folder === folder).length <= 0)
            res.push(i);
        }
        
      } catch (error) {
        console.log(imageList);
        throw error;
      }
      return res;
    }
  }
  function getRandomItem(folderName: string) {
    const itemsCount = data
      .filter(c => c.folder === folderName)
      .filter(c => !(c.repeat && c.repeat >= 0))
      .length;
    const randomIndex = getRandomNumber(itemsCount);
    const item = data
      .filter(c => c.folder === folderName)
      .filter(c => !(c.repeat && c.repeat >= 0))[randomIndex];
    if (item === undefined) {
      
      if (folderName === 'heads') {
        return data.filter(c => c.folder === folderName).filter(c => !(c.repeat && c.repeat >= 0))[randomIndex - 1];
      }
      if (folderName === 'jackets') {
        return data.filter(c => c.folder === folderName).filter(c => !(c.repeat && c.repeat >= 0))[randomIndex - 1];
      }
      if (folderName === 'backgrounds') {
        return data.filter(c => c.folder === folderName).filter(c => !(c.repeat && c.repeat >= 0))[randomIndex - 1];
      }
    }
    return item;
  }
  function getRandomNumber(maxCount: number) {
    // random between 0-maxCount
    return Math.floor(Math.random() * (maxCount + 1));
  }
  function expandDependencies(imagesList: Card[][]) {
    const newImagesList: Card[][] = [];
    for (const image of imagesList) {
      let newImage: Card[] = [];
      
      for (const c of image) {
        // branch based on folder of the dependants
        let dependencies = [];
        switch (c.folder) {
          case 'jackets':
            dependencies = jacketsExpandDependencies(c);
            newImage = [...newImage, ...dependencies, c];
          break;
          
          case 'caps':
            console.log('CAPS CASE');
            dependencies = capsExpandedDependencies(c, image);
            newImage = [...newImage, ...dependencies, c];
          break;

          default:
            newImage = [...newImage, c];
          break
        }
        
      }
      newImagesList.push(newImage);
    }
    return newImagesList;
  }
  function jacketsExpandDependencies(c: Card) {
    let dependencies: Card[] = [];
    const compulsoryDep = c.dependencies.compulsory;
    if (compulsoryDep && compulsoryDep.length > 0) {
      dependencies = [...dependencies, ...compulsoryDep.map(c => c as Card)];
    }
    return dependencies;
  }
  function capsExpandedDependencies(c: Card, cardsContainer: Card[]) {
    const background = cardsContainer.filter(c => c.folder === 'backgrounds')[0];
    if (! background) return [];

    let exportedDependencies: Card[] = [];
    const dependencies = c.dependencies.atleastone;
    if (dependencies && dependencies.length > 0) {
      const fileLink = `${readBaseURI}/cap patches/${background.fileName}`;
      const relativePathFileLink = new RelativePath(fileLink).getPath();
      const capPatch: Card = {
        fileName: background.fileName,
        fileLink: relativePathFileLink,
        folder: 'cap patches',
        imgB64: `data:image/png;base64, ${fs.readFileSync(fileLink).toString('base64')}`,
        dependencies: {},
        selected: false,
        sortingScore: 2.1
      };
      exportedDependencies = [...exportedDependencies, capPatch];
    }
    const compulsoryDependencies = c.dependencies.compulsory;
    if (compulsoryDependencies && compulsoryDependencies.length > 0) {
      exportedDependencies = [...exportedDependencies, ...compulsoryDependencies.map(c => c as Card)];
    }
    return exportedDependencies;
  }
  function generateStats() {
    // loop through all json files
    // {itemName: val}
    // write to a file
    const jsonFileNames = fs.readdirSync(readBaseURI+'/outputs')
      .filter((name: string) => name.indexOf('.json') >= 0)

    const statsObj = jsonFileNames.map((name: string) => JSON.parse(fs.readFileSync(`${readBaseURI}/outputs/${name}`)))
      .map((obj: any) => obj.attributes)
      .reduce((res: any, img: any[]) => {
        if (!res) res = {};
        const jacketsCount = img.filter((layer: any) => Object.keys(layer)[0] === 'jackets').length;
        img.forEach((attr: any) => {
          let fileName: string = attr[Object.keys(attr)[0]];
          if (jacketsCount >= 2 && tees.indexOf(`${fileName}.png`.toLowerCase()) >= 0) {
            return;
          }
          if (Object.keys(attr)[0].indexOf('cap patches') >= 0) {
            fileName += ' cap patch';
          }
          if (!res[fileName]) res[fileName] = 0;
          res[fileName] += 1;
        })
        return res;
      }, {});
    
    const namesDict = fs.readFileSync('nameDict.csv')
      .toString('ascii')
      .split('\n')
      .map((line: string) => {
        const splitLines = line.split(',');
        return {oldName: splitLines[0], newName: splitLines[1].trim()};
      })
      .reduce((nameObj: any, cur: any) => {
        if (! nameObj) nameObj = {};
        nameObj[cur.oldName] = cur.newName;
        return nameObj;
      }, {});

    const csvObj: any[][] = [['asset name', 'count', 'percentage']];
    Object.keys(statsObj).forEach((keyName: string) => {
      if (! namesDict[keyName]) {
        console.log(keyName, 'undfined filename');
      }
      csvObj.push([namesDict[keyName], statsObj[keyName], (statsObj[keyName] / jsonFileNames.length * 100).toFixed(2)]);
    });
    const csvString = csvObj.map(o => o.join(',')).join('\n');
    fs.writeFileSync(`${readBaseURI}/outputs/stats.csv`, csvString);
    alert('Done');
  }
  function runDedupe() {
    interface ImageMetaData {
      name: string;
      attributes: any[];
    }
    const jsonFileNames = fs.readdirSync(readBaseURI+'/outputs')
      .filter((name: string) => name.indexOf('.json') >= 0)

    const dedupeMap = new Map();
    const duplicateFileNamesSet = new Set;
    jsonFileNames.map((name: string) => JSON.parse(fs.readFileSync(`${readBaseURI}/outputs/${name}`)))
    .forEach((obj: ImageMetaData) => {
      const dedupeKey = obj.attributes
      .map((attr: any) => attr[Object.keys(attr)[0]])
      .sort()
      .join(';');
      if (dedupeMap.has(dedupeKey)) {
        duplicateFileNamesSet.add(dedupeMap.get(dedupeKey));
        duplicateFileNamesSet.add(obj.name);
      }
      dedupeMap.set(dedupeKey, obj.name);
    })
    if (duplicateFileNamesSet.size > 0) {
      alert('Duplicates found and logged');
      console.log(duplicateFileNamesSet.values());
      return;
    }
    alert("No duplicates found");
  }
  function renameAllFiles() {
    const seed = new Date().getTime();
    const fileNames = fs.readdirSync(readBaseURI+'/outputs')
      .filter((name: string) => name.indexOf('.json') >= 0)
      .map((name: string) => name.split(".json")[0]);
    
    for(const fileName of fileNames) {
      const newName = seed + new Date().getTime() + "";
      const jsonObj = (JSON.parse(fs.readFileSync(`${readBaseURI}/outputs/${fileName}.json`).toString('ascii')));
      jsonObj.name = newName;
      fs.writeFileSync(`${readBaseURI}/outputs/${fileName}.json`, JSON.stringify(jsonObj));
      
      fs.renameSync(`${readBaseURI}/outputs/${fileName}.png`, `${readBaseURI}/outputs/${newName}.png`);
      fs.renameSync(`${readBaseURI}/outputs/${fileName}.json`, `${readBaseURI}/outputs/${newName}.json`);
    }
    alert('Done');
  }
  function createNFTJSONFiles() {
    const PLAYER = "Eric Abidal";
    alert(`Player name being used is: ${PLAYER}`);
    try {
      if (! fs.existsSync(`${readBaseURI}/outputs/ipfs`)) {
        fs.mkdirSync(`${readBaseURI}/outputs/ipfs`);
      }
      run(fs, `${readBaseURI}/outputs`, PLAYER);
      alert('Done');
    } catch (error) {
      alert('Error.. check logs');
      console.error(error);
    }
  }
  function orderNFTFiles() {
    const jsonFileNames: string[] = fs.readdirSync(`${readBaseURI}/outputs`)
      .filter((fileName: string) => fileName.indexOf('.json') >= 0)
      .map((fileName: string) => fileName.split('.json')[0]);
    
    if (! fs.existsSync(`${readBaseURI}/outputs/orderedFiles`)) {
      fs.mkdirSync(`${readBaseURI}/outputs/orderedFiles`);
    }
  
    jsonFileNames.forEach((fileName: string, i: number) => {
      fs.copyFileSync(`${readBaseURI}/outputs/${fileName}.json`, `${readBaseURI}/outputs/orderedFiles/${i}.json`);
    });

    alert('done');
  }
  function validateNFTFiles() {
    type NFTAttribute = {trait_type: string, value: string};
    interface NFT {
      description: string; attributes: NFTAttribute[]; image: string;
    }
    const jsonFileNames: string[] = fs.readdirSync(`${readBaseURI}/outputs/orderedFiles`)
      .filter((fileName: string) => fileName.indexOf('.json') >= 0)
      .map((fileName: string) => fileName.split('.json')[0]);
    const counter = {invalidJSONFile: 0, filesWithPatches: 0};

    jsonFileNames.forEach((fileName: string) => {
      let NFTObj: NFT;
      try {
        NFTObj = JSON.parse(fs.readFileSync(`${readBaseURI}/outputs/orderedFiles/${fileName}.json`).toString('ascii'));
        const drips = NFTObj.attributes.filter((attr: NFTAttribute) => attr.trait_type === 'Drip');
        if (drips && drips.length > 1) {
          // NFTObj.attributes = NFTObj.attributes.filter((attr: NFTAttribute) => {
          //   if (attr.value.toLowerCase().indexOf('patch') >= 0) return false;
          //   return true;
          // });
          // fs.writeFileSync(`${readBaseURI}/outputs/orderedFiles/${fileName}.json`, JSON.stringify(NFTObj));
          // counter.filesWithPatches += 1;
          // console.log(`${fileName}.json updated`);
          counter.filesWithPatches += 1;
          console.log(`${fileName}.json`, drips);
        }
      } catch (error) {
        console.log(`${fileName}.json has invalid JSON structure`);
        counter.invalidJSONFile += 1;
        // const updatedNFTString = fs.readFileSync(`${readBaseURI}/outputs/orderedFiles/${fileName}.json`)
        // .toString('ascii')
        // .replaceAll("ć", "c");
        // fs.writeFileSync(`${readBaseURI}/outputs/orderedFiles/${fileName}.json`, updatedNFTString);
      }
    });

    console.log(counter);
    alert('done');
  }

  return (
    <>
    <div className="App" style={{display: showWIP ? 'none' : 'flex', flexDirection: 'column'}}>
      {! readBaseURI ? (
        <button style={{cursor: 'pointer'}} onClick={_ => settingReadBaseURI()}>Open assets</button>
      ) : 
      (
        <>
          <button style={{cursor: 'pointer'}} onClick={_ => generateImages()}>Generate images</button>
          <button style={{cursor: 'pointer'}} onClick={_ => randomGenerate()}>Random generate</button>
          <button style={{cursor: 'pointer'}} onClick={_ => autoSetRarity()}>Auto-set Rarity</button>
          <button style={{cursor: 'pointer'}} onClick={_ => generateFromPresets()}>Generate from presets</button>
          <button style={{cursor: 'pointer'}} onClick={_ => generateStats()}>Stats</button>
          <button style={{cursor: 'pointer'}} onClick={_ => runDedupe()}>Dedupe</button>
          <button style={{cursor: 'pointer'}} onClick={_ => renameAllFiles()}>Rename All Files</button>
          <button style={{cursor: 'pointer'}} onClick={_ => createNFTJSONFiles()}>Create NFT JSON files</button>
          <button style={{cursor: 'pointer'}} onClick={_ => orderNFTFiles()}>Order NFT files</button>
          <button style={{cursor: 'pointer'}} onClick={_ => validateNFTFiles()}>Validate NFT JSON files</button>
        </>
      )
      }
      {readBaseURI}
      {folderNames.map((folder, i) => {
        return (
          <div key={i}>
            <p>{folder}</p>
            <div style={{display: 'flex', justifyContent: 'center', flexWrap: 'wrap'}}>
              {data.filter(obj => obj.folder === folder).map((obj, i) => {
                return (
                  <div key={i} onClick={_ => imageSelected(obj)} style={{...imgStyleDiv}}>
                    <span>{obj.selected ? `SELECTED` : ''}</span>
                    {obj.selected ? <input placeholder={obj.repeat+''}  onChange={e => obj.repeat = parseInt(e.target.value)} onClick={e => {e.stopPropagation();}} /> : ''}
                    <img style={imgStyle} alt="" src={obj.imgB64} />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
    <div style={{display: showWIP ? 'flex' : 'none', flexDirection: 'column'}}>
      <p>No of combinations: {noOfCombinations}</p>
      <p>No of images generated: {noOfImagesdGenerated}</p>
      <div>
        <pre>
          {output}
        </pre>
      </div>
      <div style={{display: 'flex', justifyContent: 'center', flexWrap: 'wrap'}}>
        {outputImages.map((obj, i) => {
          return (
            <div key={i} style={{...imgStyleDiv}}>
              <img style={imgStyle} alt="" src={obj} />
            </div>
          )
        })}
      </div>
      </div>
    </>
  );
}

export default App;
