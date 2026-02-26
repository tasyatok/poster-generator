// sketch.js — Munken-ish accordion grid (2-image chain) + HQ save + mobile fixes
// Desktop look/behavior stays the same. Mobile gets smoother timing + better centering.

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
  "02.jpg",
  "03.jpg",
  "04.jpg",
  "05.jpg",
  "06.jpg",
  "08.jpg",
  "09.jpg",
  "10.jpg"
];

// Fixed chain of pairs (by filename)
const swapChain = [
  ["05.jpg", "03.jpg"],
  ["03.jpg", "09.jpg"],
  ["09.jpg", "06.jpg"],
  ["06.jpg", "04.jpg"],
  ["04.jpg", "02.jpg"],
  ["02.jpg", "08.jpg"]
];
let chainIdx = 0;

let activeA = 0; // index in imgs
let activeB = 0; // index in imgs

const minCell = 6;
const fadeStart = 22;
const cropMove = 220;

let saveIndex = 0;

// --- MOBILE ONLY smoothing (does not affect desktop) ---
const MOBILE = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
let dtSmooth = 1;

function preload() {
  for (let i = 0; i < imgFiles.length; i++) {
    imgs[i] = loadImage(imgFiles[i]);
  }
}

function setup() {
  cnv = createCanvas(POSTER_W, POSTER_H);
  cnv.parent("stage");

  // Keep desktop untouched (you already liked pixelDensity(1) performance + look)
  pixelDensity(1);
  noStroke();
  imageMode(CORNER);

  // Mobile: lower FPS target helps “smoothness” (less stutter)
  // Desktop unchanged.
  if (MOBILE) frameRate(24);

  // Start exactly: 05–03
  applyChainPair(0);

  // Better mobile centering: call fit after layout settles + on viewport changes
  fitToScreen();
  setTimeout(fitToScreen, 80);

  window.addEventListener("orientationchange", () => setTimeout(fitToScreen, 120));
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => setTimeout(fitToScreen, 50));
  }
}

function draw() {
  background(0);

  // Wait for real image dimensions
  if (!imgs.length || imgs.some(im => !im || im.width === 0)) {
    fill(255);
    textSize(16);
    text("Loading images…", 20, 30);
    return;
  }

  cols = max(2, cols);
  rows = max(2, rows);

  // Desktop stays simple & identical.
  // Mobile gets deltaTime smoothing to prevent “jumping frames”.
  if (!MOBILE) {
    tt += speed;
  } else {
    let dt = deltaTime / 16.666;      // 1.0 ~ 60fps baseline
    dt = constrain(dt, 0.75, 1.35);   // clamp spikes
    dtSmooth = lerp(dtSmooth, dt, 0.10);
    tt += speed * dtSmooth;
  }

  renderTo(this, width, height, tt);
}

function windowResized() {
  fitToScreen();
}

// Center/scale the fixed 650×910 poster to the available viewport.
// Uses visualViewport on mobile when available (Safari address bar etc).
function fitToScreen() {
  const m = windowWidth <= 700 ? 16 : 50;

  let vw = windowWidth;
  let vh = windowHeight;
  if (window.visualViewport) {
    vw = window.visualViewport.width;
    vh = window.visualViewport.height;
  }

  const s = Math.min(
    (vw - m * 2) / POSTER_W,
    (vh - m * 2) / POSTER_H
  );

  const scale = Math.min(1, Math.max(0.05, s));
  cnv.elt.style.transformOrigin = "center center";
  cnv.elt.style.transform = `scale(${scale})`;
}

// ---------- Core render (used for live draw AND HQ save) ----------
function renderTo(g, W, H, tVal) {
  // --- row heights (accordion) ---
  const rh = new Array(rows);
  let sumH = 0;
  for (let r = 0; r < rows; r++) {
    const s = 1 + amp * sin(tVal + r * 0.55);
    rh[r] = max(minCell, cell * s);
    sumH += rh[r];
  }
  const ky = H / sumH;
  for (let r = 0; r < rows; r++) rh[r] *= ky;

  // --- col widths (accordion) ---
  const cw = new Array(cols);
  let sumW = 0;
  for (let c = 0; c < cols; c++) {
    const s = 1 + amp * sin(tVal * 0.95 + c * 0.35);
    cw[c] = max(minCell, cell * s);
    sumW += cw[c];
  }
  const kx = W / sumW;
  for (let c = 0; c < cols; c++) cw[c] *= kx;

  // Draw grid (ONLY 2 images total)
  let y = 0;
  for (let r = 0; r < rows; r++) {
    let x = 0;
    for (let c = 0; c < cols; c++) {
      const w = cw[c];
      const h = rh[r];
      const img = ((r + c) % 2 === 0) ? imgs[activeA] : imgs[activeB];
      drawCropLinkedTo(g, img, x, y, w, h, r, c, W, H, tVal);
      x += w;
    }
    y += rh[r];
  }
}

// Crop without teleporting jump: clamp instead of wrap
function drawCropLinkedTo(g, img, x, y, w, h, r, c, W, H, tVal) {
  if (!img) return;

  const tiny = min(w, h);
  if (tiny <= minCell + 0.5) return;

  let a = 255;
  if (tiny < fadeStart) a = map(tiny, minCell, fadeStart, 0, 255);
  g.tint(255, a);

  const swf = constrain(map(w, 0, W, 40, img.width * 0.55), 20, img.width);
  const shf = constrain(map(h, 0, H, 40, img.height * 0.55), 20, img.height);

  const ax = frac(sin((c + 1) * 12.9898 + (r + 1) * 78.233) * 43758.5453);
  const ay = frac(sin((c + 1) * 93.9898 + (r + 1) * 67.345) * 24634.6345);

  const phase = tVal + r * 0.55 + c * 0.35;

  let mx = cropMove * sin(phase) * (1.0 - constrain(w / (cell * 2.0), 0, 1));
  let my = cropMove * cos(phase) * (1.0 - constrain(h / (cell * 2.0), 0, 1));

  const maxMoveX = max(0, (img.width - swf) * 0.5);
  const maxMoveY = max(0, (img.height - shf) * 0.5);
  mx = constrain(mx, -maxMoveX, maxMoveX);
  my = constrain(my, -maxMoveY, maxMoveY);

  const baseX = ax * (img.width - swf);
  const baseY = ay * (img.height - shf);

  const sxf = constrain(baseX + mx, 0, img.width - swf);
  const syf = constrain(baseY + my, 0, img.height - shf);

  const sx = int(sxf);
  const sy = int(syf);
  const sw = max(1, int(swf));
  const sh = max(1, int(shf));

  g.image(img, x, y, w, h, sx, sy, sx + sw, sy + sh);
  g.noTint();
}

function frac(v) { return v - floor(v); }

// --- helper: find file index safely ---
function indexOfFile(name) {
  const i = imgFiles.indexOf(name);
  return (i >= 0) ? i : 0;
}

function applyChainPair(idx) {
  chainIdx = (idx + swapChain.length) % swapChain.length;
  const [aName, bName] = swapChain[chainIdx];
  activeA = indexOfFile(aName);
  activeB = indexOfFile(bName);
}

// -------- UI functions (called by HTML buttons) --------
function colsDown() { cols = max(2, cols - 1); }
function colsUp()   { cols = min(12, cols + 1); }
function rowsDown() { rows = max(2, rows - 1); }
function rowsUp()   { rows = min(12, rows + 1); }

// Swap steps through chain
function swapNextPair() {
  applyChainPair(chainIdx + 1);
}

// ✅ Higher-quality PNG export (without touching live performance)
// Desktop: 2× export; Mobile: 1.5× to avoid memory issues
function savePoster() {
  saveIndex++;

  const scale = MOBILE ? 1.5 : 2.0;
  const W = Math.round(POSTER_W * scale);
  const H = Math.round(POSTER_H * scale);

  const g = createGraphics(W, H);
  g.pixelDensity(1);
  g.noStroke();
  g.background(0);

  // Render the same frame, but at higher resolution
  renderTo(g, W, H, tt);

  // Save the offscreen canvas
  saveCanvas(g, `poster_${nf(saveIndex, 5)}`, "png");
}

// -------- keyboard shortcuts --------
function keyPressed() {
  if (key === "c") colsDown();
  if (key === "C") colsUp();

  if (key === "r") rowsDown();
  if (key === "R") rowsUp();

  if (key === "s" || key === "S") savePoster();
  if (key === " ") swapNextPair();
}
