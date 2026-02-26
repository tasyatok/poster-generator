const BASE_W = 650;
const BASE_H = 910;

let MARGIN = 50;
let scaleK = 1;

let cols = 3, rows = 5;
let cell = 130, t = 0, speed = 0.03, amp = 0.95;

let focusCol = [];
let imgA, imgB;

let minCell = 2;
let fadeStart = 18;
let cropMove = 220;

function preload() {
  // Put 05.jpg and 03.jpg next to index.html (same folder)
  imgA = loadImage("05.jpg");
  imgB = loadImage("03.jpg");
}

function setup() {
  createCanvas(BASE_W, BASE_H);
  pixelDensity(window.devicePixelRatio || 1);
  noStroke();

  for (let r = 0; r < rows; r++) focusCol[r] = r % cols;

  applyCanvasScale();
}

function windowResized() {
  applyCanvasScale();
}

function applyCanvasScale() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // optional: slightly smaller margin on tiny screens
  const m = (vw < 700 || vh < 700) ? 20 : MARGIN;

  const availW = Math.max(1, vw - 2 * m);
  const availH = Math.max(1, vh - 2 * m);

  scaleK = Math.min(availW / BASE_W, availH / BASE_H, 1);

  const left = Math.max(m, (vw - BASE_W * scaleK) / 2);
  const top  = Math.max(m, (vh - BASE_H * scaleK) / 2);

  const c = document.querySelector("canvas");
  if (!c) return;

  c.style.transform = `scale(${scaleK})`;
  c.style.left = `${left}px`;
  c.style.top = `${top}px`;
}

function draw() {
  background(0);
  t += speed;

  if (!imgA || !imgB || imgA.width === 0 || imgB.width === 0) {
    fill(255);
    textSize(16);
    text("Missing images.\nPut 05.jpg and 03.jpg next to index.html.", 20, 30);
    return;
  }

  // --- Y accordion (row heights) ---
  let rh = new Array(rows);
  let sumH = 0;
  for (let r = 0; r < rows; r++) {
    const s = 1 + amp * Math.sin(t + r * 0.55);
    rh[r] = Math.max(minCell, cell * s);
    sumH += rh[r];
  }
  const ky = height / sumH;
  for (let r = 0; r < rows; r++) rh[r] *= ky;

  // draw rows
  let y = 0;
  for (let r = 0; r < rows; r++) {
    drawRow(r, y, rh[r]);
    y += rh[r];
  }
}

function drawRow(r, y, h) {
  const fc = focusCol[r];

  const s = 1 + amp * Math.sin(t + r * 0.55);
  let wFocus = Math.max(minCell, cell * s);
  let wOther = Math.max(minCell, (width - wFocus) / (cols - 1));

  // normalize widths
  const total = wFocus + (cols - 1) * wOther;
  const k = width / total;
  wFocus *= k;
  wOther *= k;

  let x = 0;
  for (let c = 0; c < cols; c++) {
    const w = (c === fc) ? wFocus : wOther;
    const img = ((r + c) % 2 === 0) ? imgA : imgB;
    drawCropLinked(img, x, y, w, h, r, c);
    x += w;
  }
}

function drawCropLinked(img, x, y, w, h, r, c) {
  const tiny = Math.min(w, h);
  if (tiny <= minCell + 0.5) return;

  let a = 255;
  if (tiny < fadeStart) a = map(tiny, minCell, fadeStart, 0, 255);
  tint(255, a);

  const swf = constrain(map(w, 0, width, 40, img.width * 0.55), 20, img.width);
  const shf = constrain(map(h, 0, height, 40, img.height * 0.55), 20, img.height);

  const ax = frac(Math.sin((c + 1) * 12.9898 + (r + 1) * 78.233) * 43758.5453);
  const ay = frac(Math.sin((c + 1) * 93.9898 + (r + 1) * 67.345) * 24634.6345);

  const phase = t + r * 0.55 + c * 0.35;
  const mx = cropMove * Math.sin(phase) * (1.0 - constrain(w / (cell * 2.0), 0, 1));
  const my = cropMove * Math.cos(phase) * (1.0 - constrain(h / (cell * 2.0), 0, 1));

  const baseX = ax * (img.width - swf);
  const baseY = ay * (img.height - shf);

  const sxf = wrap(baseX + mx, img.width - swf);
  const syf = wrap(baseY + my, img.height - shf);

  const sx = Math.floor(sxf), sy = Math.floor(syf);
  const sw = Math.max(1, Math.floor(swf)), sh = Math.max(1, Math.floor(shf));

  image(img, x, y, w, h, sx, sy, sx + sw, sy + sh);
  noTint();
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
  if (key === "w") speed += 0.005;
  if (key === "s") speed = Math.max(0, speed - 0.005);
  if (key === "d") amp = Math.min(0.99, amp + 0.05);
  if (key === "a") amp = Math.max(0.05, amp - 0.05);
  if (key === "r") for (let i = 0; i < rows; i++) focusCol[i] = Math.floor(Math.random() * cols);
}
