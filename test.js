const fs = require('fs');

const playerName = 'Dahoud';

fs.readdirSync(`./nftImages/${playerName}/cap patches`)
.forEach(x => {
  if (x.toLowerCase().indexOf('patch') >= 0) {
    const nameWithoutPatch = x.replace(' patch', '');
    fs.renameSync(`./nftImages/${playerName}/cap patches/${x}`, `./nftImages/${playerName}/cap patches/${nameWithoutPatch}`);
    console.log(`Name change for: ${x}`);
  }
});
