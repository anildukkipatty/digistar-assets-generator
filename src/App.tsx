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
      return;
    }
    setData(dataLoader.getCards());
  }

  async function generateMetaData() {
    const metaDataGenerator = new MetaDataGenerator(data);
    try {
      metaDataGenerator.run();
    } catch (error) {
      alert('Error generating metaData')
    }
    fs.writeFileSync(`${readBaseURI}/meta-data.json`, metaDataGenerator.getMetaDataString());
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
  async function generateInitialMetaData() {
    const pathObj = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    const path = pathObj.filePaths[0] as string;
    const fileDataLoader = new InitialDataLoader(path, fs);
    try {
      fileDataLoader.run();
    } catch (error) {
      alert('Organise assets into the right folders');
      console.log(error);
    }
    const relativePath = new RelativePath(path);
    fs.writeFileSync(relativePath.getPath()+'/meta-data.json', JSON.stringify(fileDataLoader.getData()));
    alert('ready');
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
