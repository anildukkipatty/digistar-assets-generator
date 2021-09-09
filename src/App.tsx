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
  'backgrounds', 'jackets', 'heads', 'chains', 'glasses', 'caps'
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
      backgrounds: 1, jackets: 3, heads: 2, chains: 4, glasses: 5, caps: 6
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
            c = {...c, fileLink, imgB64: `data:image/png;base64, ${fs.readFileSync(fileLink).toString('base64')}`};
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
  async function randomGenerate() {
    const noOfImages = 250;
    const imageContainerList: Card[][] = new Array(noOfImages);
    
    await prefillWithRepeats(imageContainerList);

    for(let i = 0; i < noOfImages; i++) {
      const foldersToFillFrom: string[] = folderNames as unknown as string[];
      foldersToFillFrom.forEach(folderName => {
        const card = getRandomItem(folderName);
          if (imageContainerList[i] === undefined) imageContainerList[i] = [];
          
          if (card !== undefined){
            imageContainerList[i].push(card);
            if (folderName === 'backgrounds') {
            }
          }
      })
    }
    
    const res = JSON.stringify({
      generatedPath: `${readBaseURI}/outputs`,
      files: expandDependencies(imageContainerList)
        .map(cardsList => cardsList.sort((a, b) => getCardOrderVal(a) - getCardOrderVal(b)))
        .map(cardsList => cardsList.map(c => c.fileLink))
    });
    fs.writeFileSync('./composer.json', res);
    setNoOfCombinations(imageContainerList.length)
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
  async function prefillWithRepeats(imageContainerList: Card[][]) {
    folderNames.forEach(folder => {
      const filesWithRepeat = data.filter(c => c.folder === folder && c.repeat && c.repeat > 0);
      const usedIndexes: number[] = [];
      filesWithRepeat.forEach(c => {
        if (!c.repeat) return;
        for(let ii = 0; ii < c.repeat; ii++) {
          let randomIndex = getRandomNumber(imageContainerList.length - 1);
          while (usedIndexes.indexOf(randomIndex) >= 0) {
            randomIndex = getRandomNumber(imageContainerList.length - 1);
          }
          usedIndexes.push(randomIndex);
          if (!imageContainerList[randomIndex]) {
            imageContainerList[randomIndex] = [];
          }
          imageContainerList[randomIndex].push(c);
        }
      });
    });
  }
  function getRandomItem(folderName: string) {
    const itemsCount = data
      .filter(c => c.folder === folderName)
      .filter(c => !(c.repeat && c.repeat > 0))
      .length;
    const randomIndex = getRandomNumber(itemsCount);
    const item = data
      .filter(c => c.folder === folderName)
      .filter(c => !(c.repeat && c.repeat > 0))[randomIndex];
    if (item === undefined) {
      
      if (folderName === 'heads') {
        return data.filter(c => c.folder === folderName).filter(c => !(c.repeat && c.repeat > 0))[randomIndex - 1];
      }
      if (folderName === 'jackets') {
        return data.filter(c => c.folder === folderName).filter(c => !(c.repeat && c.repeat > 0))[randomIndex - 1];
      }
      if (folderName === 'backgrounds') {
        return data.filter(c => c.folder === folderName).filter(c => !(c.repeat && c.repeat > 0))[randomIndex - 1];
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
    return exportedDependencies;
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
                    {obj.selected ? <input onChange={e => obj.repeat = parseInt(e.target.value)} onClick={e => {e.stopPropagation();}} /> : ''}
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
