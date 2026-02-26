// Munken-ish accordion grid + image fragments
// Put 05.jpg and 03.jpg into /assets (or change paths below)

let cols = 3, rows = 5;
let cell = 130, tt = 0, speed = 0.01, amp = 0.95;

let imgA, imgB;

let minCell = 6;
let fadeStart = 22;
let cropMove = 220;

function preload() {
  // If your images are in /assets, keep this.
  // If they're in the project root, change to "05.jpg" etc.
  imgA = loadImage("assets/05.jpg");
  imgB = loadImage("assets/03.jpg");
}

function setup() {
  const cnv = createCanvas(650, 910);
  cnv.parent("sketch-holder");
  pixelDensity(window.devicePixelRatio || 1);
  noStroke();
}

function draw() {
  background(0);
  tt += speed;

  if (!imgA || !imgB) {
    fill(255, 0, 0);
    textSize(16);
    text("Missing images.\nPut 05.jpg and 03.jpg into /assets.", 20, 30);
    return;
  }

  cols = max(2, cols);
  rows = max(2, rows);

  // --- row heights ---
  let rh = new Array(rows);
  let sumH = 0;
  for (let r = 0; r < rows; r++) {
    let s = 1 + amp * sin(tt + r * 0.55);
    rh[r] = max(minCell, cell * s);
    sumH += rh[r];
  }
  let ky = height / sumH;
  for (let r = 0; r < rows; r++) rh[r] *= ky;

  // --- col widths ---
  let cw = new Array(cols);
  let sumW = 0;
  for (let c = 0; c < cols; c++) {
    let s = 1 + amp * sin(tt * 0.95 + c * 0.35);
    cw[c] = max(minCell, cell * s);
    sumW += cw[c];
  }
  let kx = width / sumW;
  for (let c = 0; c < cols; c++) cw[c] *= kx;

  // --- draw grid ---
  let y = 0;
  for (let r = 0; r < rows; r++) {
    let x = 0;
    for (let c = 0; c < cols; c++) {
      let w = cw[c], h = rh[r];
      let img = ((r + c) % 2 === 0) ? imgA : imgB;
      drawCropLinked(img, x, y, w, h, r, c);
      x += w;
    }
    y += rh[r];
  }
}

function drawCropLinked(img, x, y, w, h, r, c) {
  if (!img) return;

  let tiny = min(w, h);
  if (tiny <= minCell + 0.5) return;

  let a = 255;
  if (tiny < fadeStart) a = map(tiny, minCell, fadeStart, 0, 255);
  tint(255, a);

  let swf = constrain(map(w, 0, width, 40, img.width * 0.55), 20, img.width);
  let shf = constrain(map(h, 0, height, 40, img.height * 0.55), 20, img.height);

  let ax = frac(sin((c + 1) * 12.9898 + (r + 1) * 78.233) * 43758.5453);
  let ay = frac(sin((c + 1) * 93.9898 + (r + 1) * 67.345) * 24634.6345);

  let phase = tt + r * 0.55 + c * 0.35;
  let mx = cropMove * sin(phase) * (1.0 - constrain(w / (cell * 2.0), 0, 1));
  let my = cropMove * cos(phase) * (1.0 - constrain(h / (cell * 2.0), 0, 1));

  let baseX = ax * (img.width - swf);
  let baseY = ay * (img.height - shf);

  let sxf = wrap(baseX + mx, img.width - swf);
  let syf = wrap(baseY + my, img.height - shf);

  let sx = int(sxf), sy = int(syf);
  let sw = max(1, int(swf)), sh = max(1, int(shf));

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
