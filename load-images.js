const fs = require('fs');

const res = fs.readdirSync('./public/src-images')
	.filter(filterJunkFiles)
	.reduce((prev, folderName, index) => {
		if (!prev) prev = {};
		prev[folderName] = fs.readdirSync(`./public/src-images/${folderName}`).filter(filterJunkFiles);
		return prev;
	}, {})

function filterJunkFiles(name) {
	return name != '.DS_Store'
}

console.log(res);
