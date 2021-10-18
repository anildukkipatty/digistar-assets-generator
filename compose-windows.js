const fs = require('fs');
const Jimp = require('jimp');

async function compose() {
	let data;
	try {
		data = JSON.parse(fs.readFileSync('composer.json').toString());
		
		let fileIndex = 0;

		for await (filesList of data.files) {
			const bgLayer = await whiteJimpImg(2140, 2140);
			const [res, jsonFile] = await composeImageFromFiles(filesList, bgLayer, data.generatedPath, fileIndex);
			await res.img.writeAsync(res.fileLink);
			fs.writeFileSync(jsonFile.fileLink, JSON.stringify(jsonFile));
			console.log(res.fileLink);
			fileIndex++;
		}

	} catch (error) {
		// throw new Error('Error reading from composer.json');
    throw error;
	}
		
}
async function composeImageFromFiles(fileArr, bgLayer, outputPath, fileIndex) {
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
			// let name = getComposedFileName(fileArr);
			const name = `${new Date().getTime()}${fileIndex}`;
			return [{
				fileLink: `${outputPath}/${name}.png`,
				fileName: name,
				img: img
			},
			{
				name,
				description: 'LudoLabs Baby!',
				attributes: getAttributes(fileArr),
				fileLink: `${outputPath}/${name}.json`
			}
		]
}
function getAttributes(fileArr) {
	return fileArr.map(file => {
		const tokenised = file.split('/');
		const obj = {};
		obj[tokenised[tokenised.length - 2]] = tokenised[tokenised.length - 1].split('.png')[0];
		return obj
	})
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

module.exports = compose;
