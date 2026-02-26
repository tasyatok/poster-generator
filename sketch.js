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

let imgA, imgB;

const minCell = 6;
const fadeStart = 22;
const cropMove = 220;

let saveIndex = 0;

// small perf: allocate once, resize on demand
let cw = [];
let rh = [];
let gridDirty = true;

function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// NEW: mobile Safari timestep smoothing (prevents jumpy “teleports”)
const MOBILE = isMobile();
let dtSmooth = 1;

function preload() {
  // If your images are inside /assets, change to "assets/05.jpg" etc.
  imgA = loadImage("05.jpg");
  imgB = loadImage("03.jpg");
}

function setup() {
  cnv = createCanvas(POSTER_W, POSTER_H);
  cnv.parent("stage");

  // Keep things consistent & lighter
  pixelDensity(1);

  // NEW: mobile prefers stable 24fps over stuttery 30+
  frameRate(MOBILE ? 24 : 45);

  noStroke();
  imageMode(CORNER);

  fitToScreen();
}

function draw() {
  background(0);

  if (!imgA || !imgB || imgA.width === 0 || imgB.width === 0) {
    fill(255);
    textSize(16);
    text("Loading images…", 20, 30);
    return;
  }

  // keep at least 2x2
  cols = max(2, cols);
  rows = max(2, rows);

  // NEW: clamp + smooth deltaTime so mobile Safari can’t jump frames
  let dt = deltaTime / 16.666;          // 1.0 at ~60fps
  dt = constrain(dt, 0.75, 1.35);       // clamp spikes (prevents teleport)
  dtSmooth = lerp(dtSmooth, dt, 0.10);  // smooth jitter
  tt += speed * dtSmooth;               // stable motion

  // Ensure arrays match cols/rows only when needed
  if (gridDirty || cw.length !== cols || rh.length !== rows) {
    cw = new Array(cols);
    rh = new Array(rows);
    gridDirty = false;
  }

  // --- row heights (accordion) ---
  let sumH = 0;
  for (let r = 0; r < rows; r++) {
    const s = 1 + amp * sin(tt + r * 0.55);
    rh[r] = max(minCell, cell * s);
    sumH += rh[r];
  }
  const ky = height / sumH;
  for (let r = 0; r < rows; r++) rh[r] *= ky;

  // --- col widths (accordion) ---
  let sumW = 0;
  for (let c = 0; c < cols; c++) {
    const s = 1 + amp * sin(tt * 0.95 + c * 0.35);
    cw[c] = max(minCell, cell * s);
    sumW += cw[c];
  }
  const kx = width / sumW;
  for (let c = 0; c < cols; c++) cw[c] *= kx;

  // --- draw grid with Chrome seam fix ---
  // We snap cell boundaries to integers and force last col/row to hit the canvas edge.
  let y0f = 0, y0i = 0;

  for (let r = 0; r < rows; r++) {
    const hFloat = rh[r];
    let hInt;

    if (r === rows - 1) {
      hInt = height - y0i; // force edge
    } else {
      const y1f = y0f + hFloat;
      const y1i = Math.round(y1f);
      hInt = max(1, y1i - y0i);
      y0f = y1f;
    }

    let x0f = 0, x0i = 0;

    for (let c = 0; c < cols; c++) {
      const wFloat = cw[c];
      let wInt;

      if (c === cols - 1) {
        wInt = width - x0i; // force edge
      } else {
        const x1f = x0f + wFloat;
        const x1i = Math.round(x1f);
        wInt = max(1, x1i - x0i);
        x0f = x1f;
      }

      const img = (r + c) % 2 === 0 ? imgA : imgB;
      drawCropLinked(img, x0i, y0i, wInt, hInt, r, c);

      x0i += wInt;
    }

    y0i += hInt;
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

  // Fade out image when the cell gets very small (Munken-ish)
  let a = 255;
  if (tiny < fadeStart) a = map(tiny, minCell, fadeStart, 0, 255);
  tint(255, a);

  // Crop window size depends on cell size
  const swf = constrain(map(w, 0, width, 40, img.width * 0.55), 20, img.width);
  const shf = constrain(map(h, 0, height, 40, img.height * 0.55), 20, img.height);

  // Deterministic anchors per cell (no random jumping)
  const ax = frac(sin((c + 1) * 12.9898 + (r + 1) * 78.233) * 43758.5453);
  const ay = frac(sin((c + 1) * 93.9898 + (r + 1) * 67.345) * 24634.6345);

  // Motion-linked shift (same sine phases as grid)
  const phase = tt + r * 0.55 + c * 0.35;
  const mx = cropMove * sin(phase) * (1.0 - constrain(w / (cell * 2.0), 0, 1));
  const my = cropMove * cos(phase) * (1.0 - constrain(h / (cell * 2.0), 0, 1));

  const baseX = ax * (img.width - swf);
  const baseY = ay * (img.height - shf);

  const sxf = wrap(baseX + mx, img.width - swf);
  const syf = wrap(baseY + my, img.height - shf);

  const sx = int(sxf);
  const sy = int(syf);
  const sw = max(2, int(swf));
  const sh = max(2, int(shf));

  // Seam killer: draw 1px bigger on destination
  image(img, x, y, w + 1, h + 1, sx, sy, sx + sw, sy + sh);
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

// -------- UI functions for your HTML buttons --------
function colsDown() {
  cols = max(2, cols - 1);
  gridDirty = true;
}
function colsUp() {
  cols = min(12, cols + 1);
  gridDirty = true;
}
function rowsDown() {
  rows = max(2, rows - 1);
  gridDirty = true;
}
function rowsUp() {
  rows = min(12, rows + 1);
  gridDirty = true;
}
function savePoster() {
  saveIndex++;
  saveCanvas(`poster_${nf(saveIndex, 5)}`, "png");
}

// -------- keyboard shortcuts --------
function keyPressed() {
  if (key === "c") colsDown();
  if (key === "C") colsUp();

  if (key === "r") rowsDown();
  if (key === "R") rowsUp();

  if (key === "s" || key === "S") savePoster();
}
