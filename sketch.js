// sketch.js — Munken-ish accordion grid (images only) + UI hooks
// True poster size stays 650x910. The page scales it via CSS transform.

const POSTER_W = 650;
const POSTER_H = 910;

let cnv;

let cols = 3;
let rows = 5;

let cell = 130;
let tt = 0;
let speed = 0.01;
let amp = 0.95;

let imgs = [];
let imgFiles = [
  "01.jpg",
  "02.jpg",
  "03.jpg",
  "04.jpg",
  "05.jpg",
  "06.jpg",
  "07.jpg",
  "08.jpg",
  "09.jpg",
  "10.jpg"
];

// --- TWO-IMAGE MODE (dominant pair) ---
let activeA = 0; // index in imgs
let activeB = 0; // index in imgs

const minCell = 6;
const fadeStart = 22;
const cropMove = 220;

let saveIndex = 0;

function preload() {
  for (let i = 0; i < imgFiles.length; i++) {
    imgs[i] = loadImage(imgFiles[i]);
  }
}

function setup() {
  cnv = createCanvas(POSTER_W, POSTER_H);
  cnv.parent("stage");

  // Helps consistency + performance across browsers
  pixelDensity(1);
  noStroke();

  // Start pair: 03 + 05 (as requested)
  activeA = indexOfFile("03.jpg");
  activeB = indexOfFile("05.jpg");

  fitToScreen();
}

function draw() {
  background(0);

  // Wait until all images have real dimensions
  if (!imgs.length || imgs.some(im => !im || im.width === 0)) {
    fill(255);
    textSize(16);
    text("Loading images…", 20, 30);
    return;
  }

  cols = max(2, cols);
  rows = max(2, rows);

  tt += speed;

  // --- row heights (accordion) ---
  const rh = new Array(rows);
  let sumH = 0;
  for (let r = 0; r < rows; r++) {
    const s = 1 + amp * sin(tt + r * 0.55);
    rh[r] = max(minCell, cell * s);
    sumH += rh[r];
  }
  const ky = height / sumH;
  for (let r = 0; r < rows; r++) rh[r] *= ky;

  // --- col widths (accordion) ---
  const cw = new Array(cols);
  let sumW = 0;
  for (let c = 0; c < cols; c++) {
    const s = 1 + amp * sin(tt * 0.95 + c * 0.35);
    cw[c] = max(minCell, cell * s);
    sumW += cw[c];
  }
  const kx = width / sumW;
  for (let c = 0; c < cols; c++) cw[c] *= kx;

  // --- draw grid (ONLY 2 images total) ---
  let y = 0;
  for (let r = 0; r < rows; r++) {
    let x = 0;
    for (let c = 0; c < cols; c++) {
      const w = cw[c];
      const h = rh[r];

      const img = ((r + c) % 2 === 0) ? imgs[activeA] : imgs[activeB];
      drawCropLinked(img, x, y, w, h, r, c);

      x += w;
    }
    y += rh[r];
  }
}

function windowResized() {
  fitToScreen();
}

// Scale the 650x910 canvas to fit viewport + margins without changing ratio.
function fitToScreen() {
  const m = windowWidth <= 700 ? 16 : 50;
  const s = Math.min(
    (windowWidth - m * 2) / POSTER_W,
    (windowHeight - m * 2) / POSTER_H
  );
  const scale = Math.min(1, Math.max(0.05, s));
  cnv.elt.style.transformOrigin = "center center";
  cnv.elt.style.transform = `scale(${scale})`;
}

// --- deterministic crop linked to the same motion ---
function drawCropLinked(img, x, y, w, h, r, c) {
  if (!img) return;

  const tiny = min(w, h);
  if (tiny <= minCell + 0.5) return;

  let a = 255;
  if (tiny < fadeStart) a = map(tiny, minCell, fadeStart, 0, 255);
  tint(255, a);

  const swf = constrain(map(w, 0, width, 40, img.width * 0.55), 20, img.width);
  const shf = constrain(map(h, 0, height, 40, img.height * 0.55), 20, img.height);

  const ax = frac(sin((c + 1) * 12.9898 + (r + 1) * 78.233) * 43758.5453);
  const ay = frac(sin((c + 1) * 93.9898 + (r + 1) * 67.345) * 24634.6345);

  const phase = tt + r * 0.55 + c * 0.35;
  const mx = cropMove * sin(phase) * (1.0 - constrain(w / (cell * 2.0), 0, 1));
  const my = cropMove * cos(phase) * (1.0 - constrain(h / (cell * 2.0), 0, 1));

  const baseX = ax * (img.width - swf);
  const baseY = ay * (img.height - shf);

  const sxf = wrap(baseX + mx, img.width - swf);
  const syf = wrap(baseY + my, img.height - shf);

  const sx = int(sxf);
  const sy = int(syf);
  const sw = max(1, int(swf));
  const sh = max(1, int(shf));

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
  return v - floor(v);
}

// --- helper: find file index safely ---
function indexOfFile(name) {
  const i = imgFiles.indexOf(name);
  return (i >= 0) ? i : 0;
}

// -------- UI functions for your HTML buttons --------
function colsDown() { cols = max(2, cols - 1); }
function colsUp()   { cols = min(12, cols + 1); }
function rowsDown() { rows = max(2, rows - 1); }
function rowsUp()   { rows = min(12, rows + 1); }

function savePoster() {
  saveIndex++;
  saveCanvas(`poster_${nf(saveIndex, 5)}`, "png");
}

// -------- THE BUTTON FEATURE (two-image swap chain) --------
// Keeps exactly 2 images on canvas.
// (A, B) -> (B, randomNewNotEqualToB)
function swapRandomCellImage() {
  if (!imgs.length) return;

  const oldA = activeA;
  const oldB = activeB;

  activeA = oldB;

  let next = floor(random(imgs.length));
  if (imgs.length > 1) {
    while (next === activeA) next = floor(random(imgs.length));
  }
  activeB = next;

  // optional: if you *never* want the same image to appear again immediately
  // (prevents A->B->A bounce), uncomment:
  // if (imgs.length > 2) {
  //   while (activeB === activeA || activeB === oldA) activeB = floor(random(imgs.length));
  // }
}

// -------- keyboard shortcuts --------
function keyPressed() {
  if (key === "c") colsDown();
  if (key === "C") colsUp();

  if (key === "r") rowsDown();
  if (key === "R") rowsUp();

  if (key === "s" || key === "S") savePoster();

  // nice shortcut: space swaps the pair too
  if (key === " ") swapRandomCellImage();
}
