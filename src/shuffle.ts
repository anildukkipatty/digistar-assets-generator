export function shuffle<T>(objs: T[], seed: string) {
  let randomPointer;
  // Starts at the end of the array and moves to the start
  let pointer = objs.length;

  // While there remain elements to shuffle...
  while (pointer != 0) {

    // Pick a remaining element...
    randomPointer = getRandom(seed, pointer);
    pointer--;

    // And swap it with the current element.
    [objs[pointer], objs[randomPointer]] = [
      objs[randomPointer], objs[pointer]];
  }

  return objs;
}
function xmur3(str: string) {
  for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  return function() {
      h = Math.imul(h ^ h >>> 16, 2246822507);
      h = Math.imul(h ^ h >>> 13, 3266489909);
      return (h ^= h >>> 16) >>> 0;
  }
}

function randomGenerator(a: any) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
export function getRandom(seed: string, pointer: number) {
  return Math.floor(randomGenerator(xmur3(seed)())() * pointer) + 1; 
}