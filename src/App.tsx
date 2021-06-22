import './App.css';
// import * as imgs from './images.js';
import { useEffect, useState } from 'react';
// import React from 'react';
const dialog = window.require('electron').remote.dialog;
const fs = window.require('electron').remote.require('fs');
const {spawn} = window.require('electron').remote.require('child_process');

interface Card {
  folder: string;
  imgB64: string;
  fileLink: string;
  selected: boolean;
}

function App() {
  let [readBaseURI, setReadBaseURI] = useState<string | null>(null);
  // let [writeBaseURI, setWriteBaseURI] = useState(null);
  let [showWIP, setShowWIP] = useState(false);
  let [output, setOutput] = useState('');
  let [outputImages, setOutputImages] = useState<string[]>([]);
  let [noOfImagesdGenerated, setNoOfImagesGenerated] = useState(0);
  let folderNames = [
    'backgrounds', 'jackets', 'heads', 'chains', 'glasses', 'caps'
  ]
  useEffect(() => {
    init();
  }, []);
  async function init() {
    
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

  async function settingReadBaseURI() {
    const path = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    setReadBaseURI(path.filePaths[0]);
    let dataObj: Card[] = [];
    folderNames.forEach(folder => {
      const names = fs.readdirSync(`${path.filePaths[0]}/${folder}`)
        .filter(filterJunkFiles)
        .map((name: string) => ({
          folder,
          imgB64: `data:image/jpeg;base64, ${fs.readFileSync(`${path.filePaths[0]}/${folder}/${name}`).toString('base64')}`,
          fileLink: `${path.filePaths[0]}/${folder}/${name}`,
          selected: false
        }));
      dataObj = dataObj.concat(names);
      setData(dataObj);
    });

    function filterJunkFiles(name: string) {
      return name != '.DS_Store'
    }
  }

  async function generateImages() {
    const files: Card[][] = []
    folderNames.map((folder, i: number) => {
      const files_selected = data.filter(obj => obj.folder === folder && obj.selected)
      if (files_selected.length > 0)
        files[i] = files_selected;
    })
    let finalOutput: string[][] = [];
    recurbaby(0, files, [], finalOutput);

    const res = JSON.stringify({
      generatedPath: `${readBaseURI}/outputs`,
      files: finalOutput
    });
    fs.writeFileSync('./composer.json', res);
    setNoOfImagesGenerated(finalOutput.length)
    setShowWIP(true);
    const python = spawn("./compose", [readBaseURI]);

    python.stdout.on("data", (data: any) => {
        console.log(`stdout: ${data}`);
        setOutput((x) => `${x} \n ${data.toString()}`);
        try {
          setOutputImages(oldArr => [...oldArr, `data:image/jpeg;base64, ${fs.readFileSync(data.toString().trim()).toString('base64')}`])
        } catch (error) {
          console.log('Error loading output file: ', data.toString());
        }
    });

    python.stderr.on("data", (data: any) => {
        console.log(`stderr: ${data}`);
        setOutput(`${output} \n ${JSON.stringify(data)}`);
    });

    python.on('error', (error: any) => {
        console.log(`error: ${error.message}`);
        setOutput(`${output} \n ${error.message}`);
    });

    python.on("close", (code: any) => {
        console.log(`child process exited with code ${code}`);
        setOutput((x) => `${x} \n ${code}`);
    });
  }

  function recurbaby(position: number, files: Card[][], temp: string[], finalOutput: string[][]){
    if (position >= files.length)
      return
    for (let file of files[position]) {
      recurbaby(position+1, files, [...temp, file.fileLink], finalOutput)
      if (position === files.length - 1){
        finalOutput.push([...temp, file.fileLink])
      }
    }
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
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
    <div style={{display: showWIP ? 'flex' : 'none', flexDirection: 'column'}}>
      <p>No of images to be generated: {noOfImagesdGenerated}</p>
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
