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

  async function generateMetaData() {
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
    fs.writeFileSync(`${readBaseURI}/meta-data.json`, JSON.stringify(tempData));
    alert('Done');
  }
  function showAddDependency(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.preventDefault();
    e.stopPropagation();
    setShowWIP(true);
    console.log(data);
    return false;
  }
  // @todo: support array of cards Card[]
  async function addDependencyToCard(c: Card) {
    const selectedCards = data.filter(c => c.selected);
    const item = {...c};
    const numScore = tempSortingScores[item.fileName];
    if (numScore) {
      item.sortingScore = numScore;
    }
    for await (const card of selectedCards) {
      if (card.dependencies.compulsory && card.dependencies.compulsory.length > 0) {
        card.dependencies.compulsory.push(item as CardLike);
      } else {
        card.dependencies.compulsory = [item as CardLike];
      }
    }
    alert('Dependency added');
    setP(new Date().getTime());
  }
  function deleteCard(e:React.MouseEvent<HTMLButtonElement, MouseEvent>, card: Card) {
    e.stopPropagation();
    setData(d => d.filter(c => c.fileName !== card.fileName));
    setP(new Date().getTime());
  }
  function updateSortingScore(e: React.KeyboardEvent<HTMLInputElement>, card: Card) {
    e.stopPropagation();
    if (e.code === 'Enter') {
      card.sortingScore = parseFloat(e.currentTarget.value);
      console.log('Updated SortingScore');
    }
  }
  function selectedCardsEl(card: Card) {
    return (
      <div style={{...imgStyleDiv}}>
        <img style={imgStyle} alt="" src={card.imgB64} />
        {
          (data.filter(c => c.selected).length > 0) ?
            card.dependencies.compulsory?.map(c => c.fileName).join(' | ')
          : 'No Dependencies yet'
        }
      </div>
    )
  }
  async function initialMetaData() {
    const path = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    const chosenPath = path.filePaths[0] as string;
    const updatedChosenPath = `./nftImages${chosenPath.split('/nftImages')[1]}`;
    alert(updatedChosenPath);
    return;
    await bootUp(chosenPath);
    alert('ready');
  }
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
          dependencies: {}
        }));
      dataObj = dataObj.concat(names);
    });
    
    fs.writeFileSync(folderLoc+'/meta-data.json', JSON.stringify(dataObj));
  }
  async function updateBulkSortingScore(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.code === 'Enter') {
      const score = event.currentTarget.value;
      setData(data => data.map(c => {
        if (! c.selected) return c;
        c.sortingScore = parseFloat(score);
        return c;
      }));
      alert('Done');
    }
  }

  return (
    <>
    <div className="App" style={{display: showWIP ? 'none' : 'flex', flexDirection: 'column'}}>
      {! readBaseURI ? (
        <>
          <button style={{cursor: 'pointer'}} onClick={_ => settingReadBaseURI()}>Open assets</button>
          <button style={{cursor: 'pointer'}} onClick={_ => initialMetaData()}>Generate initial metadata</button>
        </>
      ) : 
      (
        <>
          <button style={{cursor: 'pointer'}} onClick={_ => generateMetaData()}>Generate metaData</button>
          <input placeholder="Bulk update sorting score" type="number" onKeyPress={e => updateBulkSortingScore(e)} />
        </>
      )
      }
      {readBaseURI}
      <br />
      {`No of slected items: ${data.filter(c => c.selected).length}`}
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
                    <p>{obj.fileName}</p>
                    {obj.selected ?  (
                      <div>
                        <button onClick={(e) => showAddDependency(e)}>Add Dependency</button>
                        {/* <button onClick={e => addSortingScore(e, obj)}>Add sortingScore</button> */}
                        <input onClick={e => e.stopPropagation()} onKeyPress={e => updateSortingScore(e, obj)} type="text" placeholder="update sorting score" />
                        <button onClick={e => deleteCard(e, obj)}>Delete item</button>
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
      {data.filter(c => c.selected).map(c => selectedCardsEl(c))}
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
              <p>{obj.fileName}</p>
              <input onClick={e => e.stopPropagation()} onChange={e => setTempSortingScores(o => {
                o[obj.fileName] = parseFloat(e.target.value);
                return {...o};
              })} type="number" value={tempSortingScores[obj.fileName]} />
            </div>
          )
        })}
      </div>
      </div>
    </>
  );
}

export default App;
