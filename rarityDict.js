const fs = require('fs');

console.log(process.argv[2]);

let existingRarity = {};
let data = [];
let baseURI = process.argv[2];

try {
  const temp = fs.readFileSync(`${baseURI}/rarity.csv`)
    .toString("ascii")
    .split('\n')
    .map(l => l.trim())
    .map(l => l.split(',').map(e => e.trim()))
    .forEach(item => {
      if (!existingRarity[item[0]])
        existingRarity[item[1].toLowerCase()] = parseInt(item[2])
    });
} catch (error) {
  console.log('Couldnt load from existing rarity file');
}

try {
  data = JSON.parse(fs.readFileSync(`${baseURI}/meta-data.json`).toString('ascii'))
    .map(c => ({...c, rarity: (existingRarity[c.fileName.toLowerCase()] !== undefined ? existingRarity[c.fileName.toLowerCase()] : 0)}))
} catch (error) {
  console.error(`Couldnt load/find the meta-data file`);
}

const resStringified = data.map(c => `${c.folder},${c.fileName},${c.rarity}`).join('\n');
fs.writeFileSync(`${baseURI}/rarity.csv`, resStringified);
