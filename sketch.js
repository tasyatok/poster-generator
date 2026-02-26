// sketch.js — Munken-ish accordion grid (2-image chain)
// Desktop/web: unchanged behavior (preloads all, same speed/quality).
// Mobile Safari: faster load (lazy-load only needed images) + faster playback (downscaled textures).
// Mobile centering stays fixed.

const POSTER_W = 650;
const POSTER_H = 910;

let cnv;

let cols = 3;
let rows = 5;

let cell = 130;
let tt = 0;
let speed = 0.01;
let amp = 0.95;

const minCell = 6;
const fadeStart = 22;
const cropMove = 220;

let saveIndex = 0;

const MOBILE = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

// Your allowed image pool (same as before)
const imgFiles = [
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
let activeAName = "05.jpg";
let activeBName = "03.jpg";

// --- Image cache (name -> p5.Image or null while loading) ---
const imgCache = new Map();

// Mobile-only time smoothing (prevents “jump”)
let dtSmooth = 1;

// -------------------- LOADING STRATEGY --------------------
// Desktop: preload ALL images (unchanged web behavior).
// Mobile: do NOT preload all (faster page load). Only start pair gets loaded immediately.

function preload() {
  if (!MOBILE) {
    // Desktop/web: preload everything (same as your previous behavior)
    for (const f of imgFiles) {
      imgCache.set(f, loadImage(f));
    }
  }
}

function setup() {
  cnv = createCanvas(POSTER_W, POSTER_H);
  cnv.parent("stage");

  pixelDensity(1);
  noStroke();
  imageMode(CORNER);

  // Mobile: stable lower FPS helps smoothness
  if (MOBILE) frameRate(24);

  // Start exactly 05–03
  applyChainPair(0);

  // Mobile: immediately request only the two needed images
  ensureImageLoaded(activeAName);
  ensureImageLoaded(activeBName);

  // Keep your mobile centering fix
  fitToScreen();
  setTimeout(fitToScreen, 80);

  window.addEventListener("orientationchange", () => setTimeout(fitToScreen, 120));
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => setTimeout(fitToScreen, 50));
  }
}

function draw() {
  background(0);

  cols = max(2, cols);
  rows = max(2, rows);

  // Timing: desktop unchanged, mobile smoothed
  if (!MOBILE) {
    tt += speed;
  } else {
    let dt = deltaTime / 16.666;
    dt = constrain(dt, 0.75, 1.35);
    dtSmooth = lerp(dtSmooth, dt, 0.10);
    tt += speed * dtSmooth;
  }

  // Get the two active images (might still be loading on mobile)
  const imgA = getImage(activeAName);
  const imgB = getImage(activeBName);

  if (!imgA || !imgB || imgA.width === 0 || imgB.width === 0) {
    // Mobile will show this briefly only for the current pair, not all 8 images
    fill(255);
    textSize(16);
    text("Loading images…", 20, 30);
    return;
  }

  renderTo(this, width, height, tt, imgA, imgB);
}

function windowResized() {
  fitToScreen();
}

// Scale & center the 650×910 canvas to viewport without changing ratio.
// iPhone Safari: absolute centering with translate(-50%, -50%).
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

  const el = cnv.elt;
  el.style.transformOrigin = "center center";

  if (isiOS) {
    el.style.position = "absolute";
    el.style.left = "50%";
    el.style.top = "50%";
    el.style.transform = `translate(-50%, -50%) scale(${scale})`;
  } else {
    el.style.position = "relative";
    el.style.left = "auto";
    el.style.top = "auto";
    el.style.transform = `scale(${scale})`;
  }
}

// ---------- Core render (used for live draw AND HQ save) ----------
function renderTo(g, W, H, tVal, imgA, imgB) {
  // row heights
  const rh = new Array(rows);
  let sumH = 0;
  for (let r = 0; r < rows; r++) {
    const s = 1 + amp * sin(tVal + r * 0.55);
    rh[r] = max(minCell, cell * s);
    sumH += rh[r];
  }
  const ky = H / sumH;
  for (let r = 0; r < rows; r++) rh[r] *= ky;

  // col widths
  const cw = new Array(cols);
  let sumW = 0;
  for (let c = 0; c < cols; c++) {
    const s = 1 + amp * sin(tVal * 0.95 + c * 0.35);
    cw[c] = max(minCell, cell * s);
    sumW += cw[c];
  }
  const kx = W / sumW;
  for (let c = 0; c < cols; c++) cw[c] *= kx;

  // draw grid using ONLY the two images
  let y = 0;
  for (let r = 0; r < rows; r++) {
    let x = 0;
    for (let c = 0; c < cols; c++) {
      const w = cw[c];
      const h = rh[r];
      const img = ((r + c) % 2 === 0) ? imgA : imgB;
      drawCropLinkedTo(g, img, x, y, w, h, r, c, W, H, tVal);
      x += w;
    }
    y += rh[r];
  }
}

// Crop without teleporting jump: clamp instead of wrap
function drawCropLinkedTo(g, img, x, y, w, h, r, c, W, H, tVal) {
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

// -------------------- IMAGE LAZY-LOAD + MOBILE DOWNSCALE --------------------

// Returns image if loaded, otherwise null
function getImage(name) {
  const im = imgCache.get(name);
  return im && im.width > 0 ? im : null;
}

// Ensure image begins loading; on mobile we also downscale once it loads
function ensureImageLoaded(name) {
  if (imgCache.has(name)) return;

  imgCache.set(name, null); // mark as loading

  loadImage(
    name,
    (im) => {
      // Mobile perf: downscale the texture once so per-frame cropping is cheaper.
      // Desktop untouched because desktop preloads via preload().
      if (MOBILE) {
        const maxW = 1200; // good compromise for speed vs detail on iPhone
        if (im.width > maxW) {
          const copy = im.get();
          copy.resize(maxW, 0);
          imgCache.set(name, copy);
          return;
        }
      }
      imgCache.set(name, im);
    },
    () => {
      // Failed load -> keep null (you'll see "Loading images…")
      imgCache.set(name, null);
    }
  );
}

// -------------------- CHAIN LOGIC --------------------

function applyChainPair(idx) {
  chainIdx = (idx + swapChain.length) % swapChain.length;
  const [aName, bName] = swapChain[chainIdx];
  activeAName = aName;
  activeBName = bName;
}

function swapNextPair() {
  applyChainPair(chainIdx + 1);
  // Mobile: only load the two we need now (fast initial page load)
  if (MOBILE) {
    ensureImageLoaded(activeAName);
    ensureImageLoaded(activeBName);
  }
}

// -------------------- UI hooks (HTML buttons) --------------------

function colsDown() { cols = max(2, cols - 1); }
function colsUp()   { cols = min(12, cols + 1); }
function rowsDown() { rows = max(2, rows - 1); }
function rowsUp()   { rows = min(12, rows + 1); }

// PNG export: keep exactly as you said (web version perfect)
function savePoster() {
  saveIndex++;

  const scale = MOBILE ? 1.5 : 2.0;
  const W = Math.round(POSTER_W * scale);
  const H = Math.round(POSTER_H * scale);

  const g = createGraphics(W, H);
  g.pixelDensity(1);
  g.noStroke();
  g.background(0);

  const imgA = getImage(activeAName) || imgCache.get(activeAName);
  const imgB = getImage(activeBName) || imgCache.get(activeBName);
  if (!imgA || !imgB || imgA.width === 0 || imgB.width === 0) return;

  renderTo(g, W, H, tt, imgA, imgB);

  saveCanvas(g, `poster_${nf(saveIndex, 5)}`, "png");
}

// Keyboard
function keyPressed() {
  if (key === "c") colsDown();
  if (key === "C") colsUp();

  if (key === "r") rowsDown();
  if (key === "R") rowsUp();

  if (key === "s" || key === "S") savePoster();
  if (key === " ") swapNextPair();
}
