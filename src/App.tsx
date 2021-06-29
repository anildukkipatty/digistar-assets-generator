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

interface Card {
  folder: string;
  fileLink: string;
  fileName: string;
  selected: boolean;
  dependencies: CardDependency;
  imgB64?: string;
  sortingScore?: number;
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
// type FolderNames = typeof folderNames[number];

function App() {
  let [readBaseURI, setReadBaseURI] = useState<string | null>(null);
  // let [writeBaseURI, setWriteBaseURI] = useState(null);
  let [showWIP, setShowWIP] = useState(false);
  let [output, _setOutput] = useState('');
  useEffect(() => {
    init();
  }, []);
  async function init() {
    ipcRenderer.on('jimp-reply', (_event: any, data: string) => {
      console.log('jimp-reply', data);
    });
  }
  const [data, setData] = useState<Card[]>([])
  const [_p, setP] = useState(1)
  type TempSortingScore = {
    [Property: string]: number
  }
  const [tempSortingScores, setTempSortingScores] = useState<TempSortingScore>({});
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

  // function getCardOrderVal(card: Card): number {
  //   const scoreDict: {[Property in FolderNames]: number} = {
  //     backgrounds: 1, jackets: 3, heads: 2, chains: 4, glasses: 5, caps: 6
  //   };
  //   return card.sortingScore ? card.sortingScore : scoreDict[card.folder as FolderNames];
  // };

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
            const fileLink = `${path.filePaths[0]}/${pc.folder}/${c.fileName}`;
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
    const tempData = data.map(c => {
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
    fs.writeFileSync('test.json', JSON.stringify(tempData));
  }
  function showAddDependency(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.preventDefault();
    e.stopPropagation();
    setShowWIP(true);
    console.log(data);
    return false;
  }
  async function addDependencyToCard(c: Card) {
    const selectedCard = data.filter(c => c.selected)[0];
    const item = {...c};
    const numScore = tempSortingScores[item.fileName];
    if (numScore) {
      item.sortingScore = numScore;
    }
    if (selectedCard.dependencies.compulsory) {
      selectedCard.dependencies.compulsory.push(item as CardLike);
    } else {
      selectedCard.dependencies.compulsory = [item as CardLike];
    }
    alert('Dependency added');
    setP(new Date().getTime());
  }

  return (
    <>
    <div className="App" style={{display: showWIP ? 'none' : 'flex', flexDirection: 'column'}}>
      {! readBaseURI ? (
        <button style={{cursor: 'pointer'}} onClick={_ => settingReadBaseURI()}>Open assets</button>
      ) : 
      (
        <button style={{cursor: 'pointer'}} onClick={_ => generateImages()}>Generate images</button>
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
                    <span>{obj.selected ? 'SELECTED' : ''}</span>
                    <img style={imgStyle} alt="" src={obj.imgB64} />
                    {obj.selected ?  (
                      <div>
                        <button onClick={(e) => showAddDependency(e)}>Add Dependency</button>
                        <button>Add sortingScore</button>
                        <button>Delete item</button>
                      </div>
                    ) : '' }
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
    <div style={{display: showWIP ? 'flex' : 'none', flexDirection: 'column'}}>
      <button onClick={() => setShowWIP(false)}>Go Back</button>
      <p>Choose dependencies: {JSON.stringify(tempSortingScores)}</p>
      <div style={{...imgStyleDiv}}>
        {
          (data.filter(c => c.selected).length > 0) ? (
            <img style={imgStyle} alt="" src={data.filter(c => c.selected)[0].imgB64} />
          ): 'Nothing selected'
        }
        {
          (data.filter(c => c.selected).length > 0) ?
            data.filter(c => c.selected)[0].dependencies.compulsory?.map(c => c.fileName).join(' | ')
          : 'No Dependencies yet'
        }
      </div>
      <div>
        <pre>
          {output}
        </pre>
      </div>
      <div style={{display: 'flex', justifyContent: 'center', flexWrap: 'wrap'}}>
        {data.filter(c => c.folder === 'jackets').map((obj, i) => {
          return (
            <div onClick={() => addDependencyToCard(obj)} key={i} style={{...imgStyleDiv}}>
              <img style={imgStyle} alt="" src={obj.imgB64} />
              <input onClick={e => e.stopPropagation()} onChange={e => setTempSortingScores(o => {
                o[obj.fileName] = parseInt(e.target.value);
                return {...o};
              })} type="text" value={tempSortingScores[obj.fileName]} />
            </div>
          )
        })}
      </div>
      </div>
    </>
  );
}

export default App;
