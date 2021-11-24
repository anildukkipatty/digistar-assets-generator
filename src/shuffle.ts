export function shuffle<T>(objs: T[]) {
  let randomPointer;
  // Starts at the end of the array and moves to the start
  let pointer = objs.length;

  // While there remain elements to shuffle...
  while (pointer != 0) {

    // Pick a remaining element...
    randomPointer = Math.floor(Math.random() * pointer);
    pointer--;

    // And swap it with the current element.
    [objs[pointer], objs[randomPointer]] = [
      objs[randomPointer], objs[pointer]];
  }

  return objs;
}