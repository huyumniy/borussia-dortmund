const findBiggestArray = (arr) =>
  arr.reduce((a, b) => (b.length > a.length ? b : a), []);

const delay = (time) => new Promise(res => setTimeout(res, time * 1000));

const log = (...args) => console.debug('[auto-purchase]', ...args);

const randomChoice = arr => arr[Math.floor(Math.random() * arr.length)];

export { delay, findBiggestArray, log, randomChoice};