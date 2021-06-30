const fs = require('fs');
const Jimp = require('jimp');

compose();
async function compose() {
	let data;
	try {
		data = JSON.parse(fs.readFileSync('composer.json').toString());
		
		for await (filesList of data.files) {
			const bgLayer = await whiteJimpImg(2140, 2140);
			const res = await composeImageFromFiles(filesList, bgLayer, data.generatedPath);
			await res.img.writeAsync(res.fileLink);
			console.log(res.fileLink);
		}

	} catch (error) {
		// throw new Error('Error reading from composer.json');
    throw error;
	}
		
}
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