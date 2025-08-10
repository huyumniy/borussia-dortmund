const findBiggestArray = (arr) =>
  arr.reduce((a, b) => (b.length > a.length ? b : a), []);

const delay = (time) => new Promise(res => setTimeout(res, time * 1000));

export { delay, findBiggestArray };