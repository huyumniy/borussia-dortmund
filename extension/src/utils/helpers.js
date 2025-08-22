const findBiggestArray = (arr) =>
  arr.reduce((a, b) => (b.length > a.length ? b : a), []);

const delay = (time) => new Promise(res => setTimeout(res, time * 1000));

const log = (...args) => console.debug('[auto-purchase]', ...args);

const randomChoice = arr => arr[Math.floor(Math.random() * arr.length)];

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export { delay, findBiggestArray, log, randomChoice, shuffleArray };