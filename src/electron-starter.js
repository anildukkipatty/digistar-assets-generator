const fs = require('fs');
const electron = require('electron');
const { fstat } = require('fs');
const remote = electron.remote;
console.log(remote);
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');
const Jimp = require('jimp');
const { ipcMain } = require('electron');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({width: 800, height: 600, webPreferences: { nodeIntegration: true,
        enableRemoteModule: true,
        contextIsolation: false,
        nodeIntegrationInWorker: true,
        nodeIntegrationInSubFrames: true }});

    // and load the index.html of the app.
    // const startUrl = process.env.ELECTRON_START_URL || url.format({
    const startUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : url.format({
            pathname: path.join(__dirname, '/../build/index.html'),
            protocol: 'file:',
            slashes: true
        });
    mainWindow.loadURL(startUrl, {});
    mainWindow.electron = electron;
    // Open the DevTools.
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })
}

electron.ipcMain.on('jimp-concat', async (event, arg) => {
	let data;
	try {
		data = JSON.parse(fs.readFileSync('composer.json').toString());
		console.log(data);
		
		for await (filesList of data.files) {
			const bgLayer = await whiteJimpImg(2140, 2140);
			const res = await composeImageFromFiles(filesList, bgLayer, data.generatedPath);
			await res.img.writeAsync(res.fileLink);
			console.log(`Completed image: ${res.fileName}`);
			mainWindow.webContents.send('jimp-reply', res.fileLink);
		}

	} catch (error) {
		throw new Error('Error reading from composer.json');
	}
		
})
async function composeImageFromFiles(fileArr, bgLayer, outputPath) {
  if (fileArr.length <= 0) return;
			let img = Object.create(bgLayer);
			for await (file of fileArr) {
				const newImg = await Jimp.read(file);
				if (!img) {
					img = newImg;
					continue;
				}
				img = await img.composite(newImg, 0, 0);
			}
			let name = getComposedFileName(fileArr);
			return {
				fileLink: `${outputPath}/${name}.png`,
				fileName: name,
				img: img
			}
}
async function whiteJimpImg(width, height) {
	return new Promise((resolve, reject) => {
		new Jimp(width, height, '#ffffff', (err, bgImg) => {
			if (err) return reject(err);
			resolve(bgImg);
		});
	});
}
function getComposedFileName(filesList) {
	return filesList.map(filePath => {
		return filePath.split('/')[filePath.split('/').length - 1].split('.')[0];
	}).join('_');
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
