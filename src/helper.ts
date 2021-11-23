// import fs from 'fs';
import { assetNamesDict, folderNamesDict} from './dict';

const tees = [
  '53', '54',
  '55', '56',
  '57', '58',
  '59', '73',
  '28'
];
const otherworldlyClassificationParams = [
  40, 43, 75, 78, 162,  136, 138, 139, 140, 141, 142, 143, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157 
];
interface Attribute {
  trait_type: string;
  value: any;
}

// const FOLDER_LOCATION = "./src/st-juste";
// const PLAYER = "St Juste"
async function run(fs: any, FOLDER_LOCATION: string, PLAYER: string) {
  // await createConnection(dbConnection);
  // const nftMetaDataRepository = getRepository(NFTMetaDataEntity);

  const jsonFileNames = fs.readdirSync(FOLDER_LOCATION).filter((fileName: string) => fileName.indexOf('.json') >= 0);
  const metaDataArr = [];
  let tokenId = 0;

  for (const fileName of jsonFileNames) {
    // let isSpecialDrip: boolean = false;
    let metaDataFile = JSON.parse(fs.readFileSync(`${FOLDER_LOCATION}/${fileName}`).toString('ascii'));
    const jsonFileName: string = metaDataFile.name;

    // isSpecialDrip = checkIfSpecialDrip(metaDataFile);
    // metaDataFile.name = PLAYER;
    delete metaDataFile.name;
    metaDataFile.image = `ipfs://QmQdqUQhinEHxmiiYf3Xxk72P1McYosrCLdMhm87nrVvQH/${jsonFileName}.jpg`;
    metaDataFile.attributes = renameAttributes(metaDataFile.attributes);
    metaDataFile.attributes = removeExtraDrip(metaDataFile.attributes);
    metaDataFile.attributes.push({"trait_type": "Hero", "value": PLAYER});
    metaDataFile.attributes = calculateClassification(metaDataFile.attributes);

    metaDataFile.attributes = metaDataFile.attributes.filter((attr: Attribute) => attr.value.indexOf(" patch") < 0)

    // if (isSpecialDrip) metaDataFile.attributes.push({"trait_type": "Shard Type", "value": "Special"});
    delete metaDataFile.fileLink;


    // await nftMetaDataRepository.save({urlId: tokenId, metaData: JSON.stringify(metaDataFile)});
    fs.writeFileSync(`${FOLDER_LOCATION}/ipfs/${jsonFileName}.json`, JSON.stringify(metaDataFile));

    metaDataArr.push(metaDataFile);
    console.log(`Inserted tokenId: ${tokenId}`);
    tokenId++;
  }
  console.log('Done');
  
  
}
function renameAttributes(attrs: any[]) {
  type FolderNamesType = ('backgrounds' | 'chains' | 'jackets' | 'caps' | 'masks' | 'glasses');
  return attrs.map(attr => {
    const attributeName: FolderNamesType = Object.keys(attr)[0] as FolderNamesType;
    if (! folderNamesDict[attributeName]) {
      return null;
    }
    const x: any = {};
    x["trait_type"] = folderNamesDict[attributeName];
    x["value"] = (assetNamesDict as any)[attr[attributeName]];
    return x;
  }).filter(x => x !== null);
}
// function checkIfSpecialDrip(metaData): boolean {
//   return metaData.attributes.filter(attr => specialDrips.indexOf(attr[Object.keys(attr)[0]]) >= 0).length > 0;
// }
function removeExtraDrip(attributes: Attribute[]) {
  const hasDuplicateDrip = (attributes.filter((attr: Attribute) => attr.trait_type == 'Drip').length >= 2);
  if (! hasDuplicateDrip) return attributes;
  return attributes.filter((attr: Attribute) => tees.map(n => (assetNamesDict as any)[n]).indexOf(attr.value) < 0);
}
function calculateClassification(attributes: Attribute[]) {
  const drip = attributes.filter((attr: Attribute) => attr.trait_type === 'Drip')[0];
  if (! drip) return attributes;

  if (drip.value === assetNamesDict[144]) {
    attributes.push({"trait_type": 'Classification', "value": "Genesis"});
    return attributes;
  }
  if (otherworldlyClassificationParams.map(n => (assetNamesDict as any)[n]).indexOf(drip.value) >=0 ) {
    attributes.push({"trait_type": 'Classification', "value": "Otherworldly"});
    return attributes;
  }
  attributes.push({"trait_type": 'Classification', "value": "Aesthetic"});
  return attributes;
}

export {run};
