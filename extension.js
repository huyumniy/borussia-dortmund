const canvas = document.querySelector('canvas[class="leaflet-zoom-animated"]')
const canvasContext = canvas.getContext("2d");
const boundRect = canvas.getBoundingClientRect();

const getPixelColor = (x, y) => {
  const imgData = canvasContext.getImageData(x,y,1,1).data
  const rgb = [imgData[0], imgData[1], imgData[2] ]
  return rgb;
};

const colorFound = [];

const ignoreColor = [
  "190,190,190",
  "191,191,191",
  "192,192,192",
  "193,193,193",
  "194,194,194",
  "195,195,195",
  "196,196,196",
  "197,197,197",
  "198,198,198",
  "199,199,199",
  "200,200,200",
  "201,201,201",
  "202,202,202",
  "203,203,203",
  "204,204,204",
  "205,205,205",
  "206,206,206",
  "207,207,207",
  "208,208,208",
  "209,209,209",
  "210,210,210",
]
const coords = []

const yScale = canvas.height / boundRect.height
const xScale = canvas.width / boundRect.width

for (let y = 0; y <= canvas.height; y++) {
  for (let x = 0; x<= canvas.width; x++) {
    const color = getPixelColor(x, y);
    if (color[0] + color[1] + color[2] > 0 && !ignoreColor.includes(color.join(','))) {
      // colorFound.push(`found at x,y (${x},${y}) rgb(${color.join(',')})`)
      colorFound.push(`rgb(${color.join(',')})`)
      coords.push([x, y])
    }
  }
}
canvasContext.fillStyle = "red";
coords.forEach(([x, y]) => {
  canvasContext.fillRect(x/xScale ,y/yScale, 1,1)
})

console.log('colorFound =>', colorFound.length)
console.log(coords)