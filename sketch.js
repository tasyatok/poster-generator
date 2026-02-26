// Keys: SPACE pause/play, p save png
// Put images in: assets/05.jpg and assets/03.jpg

let cols = 5, rows = 3;
let cell = 130;
let t = 0;
let speed = 0.01;
let amp = 0.65;          // how much the accordion breathes
let minStrip = 10;       // never disappear fully
let cropMove = 220;      // crop slide amount

let imgA, imgB;
let paused = false;

function preload() {
  imgA = loadImage("assets/05.jpg");
  imgB = loadImage("assets/03.jpg");
}

function setup() {
  createCanvas(650, 910);
  pixelDensity(window.devicePixelRatio || 1);
  noStroke();
}

function draw() {
  if (!paused) t += speed;
  background(0);

  // build row heights (accordion)
  let rh = new Array(rows);
  let sumH = 0;
  for (let r = 0; r < rows; r++) {
    let s = 1 + amp * Math.sin(t + r * 0.55);
    rh[r] = Math.max(minStrip, cell * s);
    sumH += rh[r];
  }
  // normalize to fit height
  let ky = height / sumH;
  for (let r = 0; r < rows; r++) rh[r] *= ky;

  // draw rows
  let y = 0;
  for (let r = 0; r < rows; r++) {
    drawRow(r, y, rh[r]);
    y += rh[r];
  }
}

function drawRow(r, y, h) {
  // build column widths (accordion)
  let cw = new Array(cols);
  let sumW = 0;
  for (let c = 0; c < cols; c++) {
    let s = 1 + amp * Math.sin(t + r * 0.55 + c * 0.25);
    cw[c] = Math.max(minStrip, cell * s);
    sumW += cw[c];
  }
  // normalize to fit width
  let kx = width / sumW;
  for (let c = 0; c < cols; c++) cw[c] *= kx;

  let x = 0;
  for (let c = 0; c < cols; c++) {
    let w = cw[c];
    let img = (r + c) % 2 === 0 ? imgA : imgB;
    drawCropLinked(img, x, y, w, h, r, c);
    x += w;
  }
}

function drawCropLinked(img, x, y, w, h, r, c) {
  // deterministic anchor per cell
  let ax = frac(Math.sin((c + 1) * 12.9898 + (r + 1) * 78.233) * 43758.5453);
  let ay = frac(Math.sin((c + 1) * 93.9898 + (r + 1) * 67.345) * 24634.6345);

  // crop window size linked to cell size
  let sw = constrain(map(w, 0, width, 40, img.width * 0.55), 40, img.width);
  let sh = constrain(map(h, 0, height, 40, img.height * 0.55), 40, img.height);

  // motion-linked shift (more when skinny)
  let phase = t + r * 0.55 + c * 0.35;
  let skinnyX = 1 - constrain(w / (cell * 2.0), 0, 1);
  let skinnyY = 1 - constrain(h / (cell * 2.0), 0, 1);
  let mx = cropMove * Math.sin(phase) * skinnyX;
  let my = cropMove * Math.cos(phase) * skinnyY;

  // base + slide, wrapped
  let baseX = ax * (img.width - sw);
  let baseY = ay * (img.height - sh);
  let sx = wrap(baseX + mx, img.width - sw);
  let sy = wrap(baseY + my, img.height - sh);

  image(img, x, y, w, h, sx, sy, sx + sw, sy + sh);

  // dark overlay (full cell)
  fill(0, 120);
  rect(x, y, w, h);
}

function wrap(v, maxv) {
  if (maxv <= 1) return 0;
  v = v % maxv;
  if (v < 0) v += maxv;
  return v;
}

function frac(v) {
  return v - Math.floor(v);
}

function keyPressed() {
  if (key === " ") paused = !paused;
  if (key === "p") saveCanvas("poster", "png");
}
