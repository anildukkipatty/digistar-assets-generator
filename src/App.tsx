import './App.css';
import { useEffect, useState } from 'react';
import {Card, folderNames, InitialDataLoader, RelativePath, MetaDataGenerator, TempSortingScore, DependencyManager, FSCardLoader} from './cards';
const dialog = window.require('electron').remote.dialog;
const ipcRenderer = window.require('electron').ipcRenderer;
const fs = window.require('electron').remote.require('fs');

function App() {
  let [readBaseURI, setReadBaseURI] = useState<string | null>(null);
  let [showWIP, setShowWIP] = useState(false);
  let [output, _setOutput] = useState('');
  const [data, setData] = useState<Card[]>([])
  const [_p, setP] = useState(1)
  const [tempSortingScores, setTempSortingScores] = useState<TempSortingScore>({});
  
  useEffect(() => {
    init();
  }, []);
  async function init() {
    ipcRenderer.on('jimp-reply', (_event: any, data: string) => {
      console.log('jimp-reply', data);
    });
  }
  
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

  async function settingReadBaseURI() {
    const pathObj = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    const path = pathObj.filePaths[0] as string;
    setReadBaseURI(path);
    const dataLoader = new FSCardLoader({path, fs});
    try {
      dataLoader.load();
    } catch (error) {
      if (error.code === 'JPE') {
        alert(error.message);
      }
      alert('Loading data failed');
      console.log(error);
      
      return;
    }
    setData(dataLoader.getCards());
  }

  async function generateMetaData(cards: Card[] | undefined = undefined, metaDataPath: string|null = null) {
    if (! cards) {
      cards = data;
    }
    if (!metaDataPath) {
      metaDataPath = readBaseURI;
    }
    const metaDataGenerator = new MetaDataGenerator(cards);
    try {
      metaDataGenerator.run();
    } catch (error) {
      alert('Error generating metaData')
    }
    fs.writeFileSync(`${metaDataPath}/meta-data.json`, metaDataGenerator.getMetaDataString());
    alert('Done');
  }
  function showAddDependency(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.preventDefault();
    e.stopPropagation();
    setShowWIP(true);
    return false;
  }
  async function addDependencyToCard(c: Card) {
    const dependencyManager = new DependencyManager(data.filter(c => c.selected));
    dependencyManager.addDependency(c);
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
  async function generateInitialMetaData(path: string | undefined = undefined) {
    if (!path) {
      const pathObj = await dialog.showOpenDialog({
        properties: ['openDirectory']
      });
      path = pathObj.filePaths[0] as string;
    }
    const relativePath = new RelativePath(path);
    const fileDataLoader = new InitialDataLoader(relativePath, fs);
    try {
      fileDataLoader.run();
    } catch (error) {
      alert('Organise assets into the right folders');
      console.log(error);
      return;
    }
    fs.writeFileSync(relativePath.getPath()+'/meta-data.json', fileDataLoader.getDataString());
    alert('ready');
  }
  async function quickGenerateRules(cards: Card[] | undefined = undefined, path: string|null = null) {

    const jackets = !cards ? data.filter(c => c.folder === 'jackets') : cards.filter(c => c.folder === 'jackets');
    console.log('jackets', jackets);
    
    const whiteTshirt = jackets.filter(c => c.fileName === 't-white.png')[0];
    if (! whiteTshirt) {
      alert('White tShirt missing');
      console.log(whiteTshirt);
      
      return;
    }
    let dependencyManager = new DependencyManager(whiteTshirtApplicatnts(jackets));
    dependencyManager.addDependency({...whiteTshirt, sortingScore: 1.6});
    
    const applyPatch = prepareApplyPatch(jackets);
    jackets.filter(c => c.fileName.indexOf('patch') >= 0)
    .map(c => c.fileName)
    .forEach(applyPatch);

    const jacketsWithoutPatches = !cards ? data.filter(c => c.fileName.indexOf('patch') < 0) : cards.filter(c => c.fileName.indexOf('patch') < 0);
    
    jackets.forEach(c => {
      if (c.fileLink.indexOf('t-') >= 0) {
        c.sortingScore = 1.6;
      }
    })
    await generateMetaData(jacketsWithoutPatches, path);
  }
  function prepareApplyPatch(jackets: Card[]) {
    return function applyPatch(patchName: string) {
      if (patchName.indexOf('bomber') >= 0) {
        const patch = jackets.filter(c => c.fileName === patchName)[0];
        if (! patch) return;
        const filteredJackets = jackets.filter(c => c.fileName.indexOf('bomber') >= 0 && c.fileName.indexOf('patch') < 0)
        new DependencyManager(filteredJackets).addDependency({...patch, sortingScore: 1.5});
      }
      if (patchName.indexOf('cloak') >= 0) {
        const patch = jackets.filter(c => c.fileName === patchName)[0];
        if (! patch) return;
        const filteredJackets = jackets.filter(c => c.fileName.indexOf('cloak') >= 0 && c.fileName.indexOf('patch') < 0)
        new DependencyManager(filteredJackets).addDependency({...patch, sortingScore: 1.5});
      }
      if (patchName.indexOf('poncho') >= 0) {
        const patch = jackets.filter(c => c.fileName === patchName)[0];
        if (! patch) return;
        const filteredJackets = jackets.filter(c => c.fileName.indexOf('poncho') >= 0 && c.fileName.indexOf('patch') < 0)
        new DependencyManager(filteredJackets).addDependency({...patch, sortingScore: 1.5});
      }
      if (patchName.indexOf('vest') >= 0) {
        const patch = jackets.filter(c => c.fileName === patchName)[0];
        if (! patch) return;
        const filteredJackets = jackets.filter(c => c.fileName.indexOf('vest') >= 0 && c.fileName.indexOf('vest') < 0)
        new DependencyManager(filteredJackets).addDependency({...patch, sortingScore: 1.5});
      }
    };
  }
  function whiteTshirtApplicatnts(jackets: Card[]) {
    return jackets.filter(c => {
      return (c.fileName.indexOf('bomber') >= 0 || c.fileName.indexOf('hoodie') >= 0 || c.fileName.indexOf('leather') >= 0 ||
      c.fileName.indexOf('poncho') >= 0 || c.fileName.indexOf('vest') >= 0) && c.fileName.indexOf('patch') < 0
    })
  }
  async function express() {
    const pathObj = await dialog.showOpenDialog({
      properties: ['openDirectory', 'multiSelections']
    });
    const paths = pathObj.filePaths as string[];
    console.log(paths);
    
    paths.forEach(async path => {
      await generateInitialMetaData(path);
      const cards = loadCardData(path);
      await quickGenerateRules(cards, path);
    })
  }
  function loadCardData(path: string) {
    setReadBaseURI(path);
    const dataLoader = new FSCardLoader({path, fs});
    try {
      dataLoader.load();
    } catch (error) {
      if (error.code === 'JPE') {
        alert(error.message);
      }
      alert('Loading data failed');
      console.log(error);
      return;
    }
    const cards = dataLoader.getCards();;
    setData(cards);
    return cards;
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
          <button style={{cursor: 'pointer'}} onClick={_ => generateInitialMetaData()}>Generate initial metadata</button>
          <button style={{cursor: 'pointer'}} onClick={_ => express()}>Express</button>
        </>
      ) : 
      (
        <>
          <button style={{cursor: 'pointer'}} onClick={_ => generateMetaData()}>Generate metaData</button>
          <button style={{cursor: 'pointer'}} onClick={_ => quickGenerateRules()}>Quick generate rules</button>
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
