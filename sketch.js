// Munken-ish accordion grid (images only) + UI buttons
// Fixes:
// 1) Performance (mobile + desktop): pixelDensity + frameRate + deltaTime time-step
// 2) Chrome gaps: snap cell rects to integer pixels + force last col/row to hit edges

// ---- poster size (DO NOT CHANGE) ----
const POSTER_W = 650;
const POSTER_H = 910;

// ---- grid state ----
let cols = 3, rows = 5;
let cell = 130;
let tt = 0;
let speed = 0.01;
let amp = 0.95;

let imgA, imgB;        // originals
let imgAuse, imgBuse;  // possibly downscaled for performance

// crop/motion
let minCell = 6;
let fadeStart = 22;
let cropMove = 220;

let saveIndex = 0;

// UI
let ui;

function isMobileDevice() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function preload() {
  // IMPORTANT: your repo has images in root (03.jpg, 05.jpg)
  // If you moved them into /assets, change paths to "assets/05.jpg" etc.
  imgA = loadImage("05.jpg");
  imgB = loadImage("03.jpg");
}

function setup() {
  // Performance: phone draws fewer pixels
  const mobile = isMobileDevice();
  pixelDensity(mobile ? 1 : min(2, window.devicePixelRatio || 1));
  frameRate(mobile ? 30 : 45);

  createCanvas(POSTER_W, POSTER_H);
  noStroke();
  imageMode(CORNER);

  // Make faster image sources on mobile (same look, less work)
  imgAuse = imgA;
  imgBuse = imgB;
  if (mobile && imgA && imgB) {
    imgAuse = imgA.get();
    imgBuse = imgB.get();
    // downscale to reduce sampling cost (keeps enough detail for phone)
    imgAuse.resize(floor(imgA.width * 0.65), 0);
    imgBuse.resize(floor(imgB.width * 0.65), 0);
  }

  buildUI();
}

function draw() {
  background(0);

  if (!imgAuse || !imgBuse) {
    fill(255, 0, 0);
    textSize(16);
    text("Images not loaded.\nCheck paths: 05.jpg and 03.jpg", 20, 30);
    return;
  }

  cols = max(2, cols);
  rows = max(2, rows);

  // Smooth time step: stable motion even if FPS drops
  // 16.666ms = ~60fps baseline
  const dt = deltaTime / 16.666;
  tt += speed * dt;

  // Build row heights (float)
  let rh = new Array(rows);
  let sumH = 0;
  for (let r = 0; r < rows; r++) {
    const s = 1 + amp * sin(tt + r * 0.55);
    rh[r] = max(minCell, cell * s);
    sumH += rh[r];
  }
  const ky = height / sumH;
  for (let r = 0; r < rows; r++) rh[r] *= ky;

  // Build col widths (float)
  let cw = new Array(cols);
  let sumW = 0;
  for (let c = 0; c < cols; c++) {
    const s = 1 + amp * sin(tt * 0.95 + c * 0.35);
    cw[c] = max(minCell, cell * s);
    sumW += cw[c];
  }
  const kx = width / sumW;
  for (let c = 0; c < cols; c++) cw[c] *= kx;

  // --- Chrome seam killer: snap to integer pixels AND force edges ---
  // We compute integer x/y positions and integer w/h per cell,
  // and we force the last col/row to exactly fill to width/height.

  let y0f = 0; // float accumulator
  let y0i = 0; // integer y

  for (let r = 0; r < rows; r++) {
    const hFloat = rh[r];
    let hInt;

    if (r === rows - 1) {
      // force last row to edge
      hInt = height - y0i;
    } else {
      // snap next boundary
      const y1f = y0f + hFloat;
      const y1i = round(y1f); // snapping boundary
      hInt = max(1, y1i - y0i);
      y0f = y1f;
    }

    let x0f = 0;
    let x0i = 0;

    for (let c = 0; c < cols; c++) {
      const wFloat = cw[c];
      let wInt;

      if (c === cols - 1) {
        wInt = width - x0i; // force last col to edge
      } else {
        const x1f = x0f + wFloat;
        const x1i = round(x1f);
        wInt = max(1, x1i - x0i);
        x0f = x1f;
      }

      const img = ((r + c) % 2 === 0) ? imgAuse : imgBuse;

      drawCropLinked(img, x0i, y0i, wInt, hInt, r, c);

      // next cell
      x0i += wInt;
    }

    // next row
    y0i += hInt;
  }
}

function drawCropLinked(img, x, y, w, h, r, c) {
  // Keep the original behavior: fade a bit if tiny
  const tiny = min(w, h);
  let a = 255;
  if (tiny < fadeStart) a = map(tiny, minCell, fadeStart, 0, 255);
  a = constrain(a, 0, 255);
  tint(255, a);

  // Crop window depends on cell size
  const swf = constrain(map(w, 0, width, 40, img.width * 0.55), 20, img.width);
  const shf = constrain(map(h, 0, height, 40, img.height * 0.55), 20, img.height);

  // deterministic anchor per cell
  const ax = frac(sin((c + 1) * 12.9898 + (r + 1) * 78.233) * 43758.5453);
  const ay = frac(sin((c + 1) * 93.9898 + (r + 1) * 67.345) * 24634.6345);

  // same motion phase as grid-ish motion
  const phase = tt + r * 0.55 + c * 0.35;

  // When narrow => more crop motion
  const narrowX = 1.0 - constrain(w / (cell * 2.0), 0, 1);
  const narrowY = 1.0 - constrain(h / (cell * 2.0), 0, 1);

  const mx = cropMove * sin(phase) * narrowX;
  const my = cropMove * cos(phase) * narrowY;

  const baseX = ax * (img.width - swf);
  const baseY = ay * (img.height - shf);

  const sxf = wrap(baseX + mx, img.width - swf);
  const syf = wrap(baseY + my, img.height - shf);

  const sx = floor(sxf);
  const sy = floor(syf);
  const sw = max(2, floor(swf));
  const sh = max(2, floor(shf));

  // Draw: slightly overdraw by 1px to kill any remaining seams from sampling
  // (This does not change layout; it just prevents background peeking through.)
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

// ---------------- UI + controls ----------------

function buildUI() {
  // If you already have UI in HTML, this will still work fine.
  // We create a simple fixed panel on the right.

  ui = createDiv("");
  ui.id("ui");
  ui.style("position", "fixed");
  ui.style("right", "24px");
  ui.style("bottom", "24px");
  ui.style("display", "grid");
  ui.style("gap", "8px");
  ui.style("z-index", "10");

  const btnStyle = (b) => {
    b.style("padding", "10px 14px");
    b.style("background", "rgba(0,0,0,0.35)");
    b.style("color", "#fff");
    b.style("border", "1px solid rgba(255,255,255,0.25)");
    b.style("font-family", "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif");
    b.style("font-size", "13px");
    b.style("cursor", "pointer");
    b.style("backdrop-filter", "blur(8px)");
  };

  const b1 = createButton("− Col");
  btnStyle(b1);
  b1.parent(ui);
  b1.mousePressed(() => { cols = max(2, cols - 1); });

  const b2 = createButton("+ Col");
  btnStyle(b2);
  b2.parent(ui);
  b2.mousePressed(() => { cols = min(12, cols + 1); });

  const b3 = createButton("− Row");
  btnStyle(b3);
  b3.parent(ui);
  b3.mousePressed(() => { rows = max(2, rows - 1); });

  const b4 = createButton("+ Row");
  btnStyle(b4);
  b4.parent(ui);
  b4.mousePressed(() => { rows = min(12, rows + 1); });

  const b5 = createButton("Save PNG");
  btnStyle(b5);
  b5.parent(ui);
  b5.mousePressed(() => savePoster());
}

function savePoster() {
  saveIndex++;
  saveCanvas(`interactive_poster_${nf(saveIndex, 5)}`, "png");
}

function keyPressed() {
  // keyboard controls kept
  if (key === "c") cols = max(2, cols - 1);
  if (key === "C") cols = min(12, cols + 1);
  if (key === "r") rows = max(2, rows - 1);
  if (key === "R") rows = min(12, rows + 1);
  if (key === "s" || key === "S") savePoster();
}
