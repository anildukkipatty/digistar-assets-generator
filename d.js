const fs = require('fs');
const data = require('./d2.json');

const d2 = data.map(x => x.replace("000000000000000000000000", ""));
fs.writeFileSync('d2.json', JSON.stringify(d2));