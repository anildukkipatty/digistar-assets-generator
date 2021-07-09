import {Card, DependencyManager, filterJunkFiles, FSCardLoader, InitialDataLoader, MetaDataGenerator, RelativePath} from '../cards';

test('InitialDataLoader', () => {
  const fs = {
    readdirSync: () => ['1.png']
  }
  const loader = new InitialDataLoader(new RelativePath('/users/test-loc/gogo', '/test-loc'), fs);
  loader.run();
  expect(loader.getData().filter(c => c.folder === 'heads')[0].fileName).toBe('1.png');
  expect(loader.getData().filter(c => c.folder === 'heads')[0].fileLink).toBe('./test-loc/gogo/heads/1.png');
  expect(loader.getDataString() == JSON.stringify(loader.getData()));
});

test('RelativePath', () => {
  const relativePath = new RelativePath('/users/anil/nftImages/lulu-lemons');
  expect(relativePath.getPath()).toEqual('./nftImages/lulu-lemons');
});

test('FSCardLoader', () => {
  const mockCard: Card = {fileName: 'test', fileLink: './test-loc/test', selected: false, folder: 'heads', dependencies: {}};
  const fs = {
    readdirSync: () => ['1.png'],
    readFileSync: () => JSON.stringify([mockCard, mockCard])
  }
  const loader = new FSCardLoader({path: '/test', fs});
  loader.load();
  expect(loader.getCards()[0].folder).toEqual(mockCard.folder);
  expect(loader.getCards()[0].fileLink).toEqual(mockCard.fileLink);
  expect(loader.getCards()[0].fileName).toEqual(mockCard.fileName);
  expect(loader.getCards()[0].selected).toEqual(mockCard.selected);
  
});

test('DependencyManager', () => {
  const mockCard: Card = {fileName: 'test', fileLink: './test-loc/test', selected: false, folder: 'jackets', dependencies: {}};
  const mockCard2: Card = {fileName: 'test-2', fileLink: './test-loc/test-2', selected: false, folder: 'jackets', dependencies: {}};
  const dm = new DependencyManager([mockCard], {});
  dm.addDependency(mockCard2);
  if (mockCard.dependencies.compulsory)
    expect(mockCard.dependencies.compulsory[0].fileName).toEqual(mockCard2.fileName);
  else
    throw new Error('MockCard incomplete');
});

test('MetaDataGenerator', () => {
  const mockCard: Card = {fileName: 'test', fileLink: './test-loc/test', selected: false, folder: 'jackets', dependencies: {}};
  const mockCard2: Card = {fileName: 'test-2', fileLink: './test-loc/test-2', selected: false, folder: 'jackets', dependencies: {}};
  const dm = new DependencyManager([mockCard], {});
  dm.addDependency(mockCard2);

  const generator = new MetaDataGenerator([mockCard]);
  generator.run();
  const c = generator.getMetaData()[0];

  if (c.dependencies && c.dependencies.compulsory) {
    expect(generator.getMetaData()[0].selected).toBeUndefined();
    expect(c.dependencies.compulsory[0].selected).toBeUndefined();
  }
  else
    throw new Error('Mocking problem');
});

test('filterJunkFiles', () => {
  const testArr = ['1.png', '2.png', '.DS_Store']
  expect(testArr.filter(filterJunkFiles).length).toBe(2);
});
