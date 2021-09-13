const fs = require('fs');

const existingRules = JSON.parse(fs.readFileSync('rules.json'));
const newRulesObj = {};
Object.keys(existingRules).forEach(keyVal => {
  newRulesObj[keyVal.toLowerCase()] = existingRules[keyVal];
});
fs.writeFileSync('rules.json', JSON.stringify(newRulesObj));
