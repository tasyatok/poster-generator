// --- poster base size (DO NOT CHANGE if you want the 650x910 ratio) ---
const POSTER_W = 650;
const POSTER_H = 910;

// grid + motion (same idea as your Munken-ish crop grid)
let cols = 3, rows = 5;
let t = 0;
let speed = 0.01;
let amp = 0.95;

let imgA, imgB;

function preload(){
  // IMPORTANT: images must be in SAME folder as index.html (or update path)
  imgA = loadImage("05.jpg");
  imgB = loadImage("03.jpg");
}

function setup(){
  const cnv = createCanvas(POSTER_W, POSTER_H);
  cnv.parent("frame");
  pixelDensity(window.devicePixelRatio || 1);
  noStroke();

  fitFrameToViewport(); // scale wrapper to fit screen
}

function windowResized(){
  fitFrameToViewport();
}

// Scale #frame (650x910) to fit available viewport with margins, no squashing
function fitFrameToViewport(){
  const frame = document.getElementById("frame");
  const stage = document.getElementById("stage");

  const rect = stage.getBoundingClientRect();
  const availW = rect.width;
  const availH = rect.height;

  const s = Math.min(availW / POSTER_W, availH / POSTER_H);
  frame.style.transform = `scale(${s})`;
}

function draw(){
  background(0);

  // if images failed to load, show a clear message instead of silent black
  if(!imgA || !imgB || imgA.width === 0 || imgB.width === 0){
    fill(255, 40, 40);
    textSize(18);
    text("Images not loaded.\nPut 05.jpg and 03.jpg next to index.html\n(or fix the paths in preload).", 24, 40);
    return;
  }

  t += speed;

  // row heights
  const rh = new Array(rows);
  let sumH = 0;
  for(let r=0; r<rows; r++){
    const s = 1 + amp * Math.sin(t + r*0.55);
    rh[r] = Math.max(6, 130 * s);
    sumH += rh[r];
  }
  const ky = height / sumH;
  for(let r=0; r<rows; r++) rh[r] *= ky;

  // col widths
  const cw = new Array(cols);
  let sumW = 0;
  for(let c=0; c<cols; c++){
    const s = 1 + amp * Math.sin(t*0.95 + c*0.35);
    cw[c] = Math.max(6, 130 * s);
    sumW += cw[c];
  }
  const kx = width / sumW;
  for(let c=0; c<cols; c++) cw[c] *= kx;

  // draw cells
  let y = 0;
  for(let r=0; r<rows; r++){
    let x = 0;
    for(let c=0; c<cols; c++){
      const w = cw[c], h = rh[r];
      const img = ((r+c)%2===0) ? imgA : imgB;

      drawCoverCrop(img, x, y, w, h, r, c);

      // subtle dark overlay (covers the WHOLE cell)
      fill(0, 70);
      rect(x, y, w, h);

      x += w;
    }
    y += rh[r];
  }
}

// --- key fix: ALWAYS fill the whole cell (no black gaps) ---
function drawCoverCrop(img, x, y, w, h, r, c){
  // deterministic anchor per cell (stable)
  const ax = frac(Math.sin((c+1)*12.9898 + (r+1)*78.233) * 43758.5453);
  const ay = frac(Math.sin((c+1)*93.9898 + (r+1)*67.345) * 24634.6345);

  // "cover" scale: source crop aspect matches cell aspect
  const cellAR = w / h;
  const imgAR  = img.width / img.height;

  let sw, sh;
  if(imgAR > cellAR){
    // image is wider -> crop width
    sh = img.height;
    sw = sh * cellAR;
  }else{
    // image is taller -> crop height
    sw = img.width;
    sh = sw / cellAR;
  }

  // motion-linked slide (subtle)
  const phase = t + r*0.55 + c*0.35;
  const mx = 0.12 * sw * Math.sin(phase);
  const my = 0.12 * sh * Math.cos(phase);

  // anchor base inside allowed crop area
  const maxX = img.width  - sw;
  const maxY = img.height - sh;

  let sx = ax * maxX + mx;
  let sy = ay * maxY + my;

  // clamp so we never go out-of-bounds (no black)
  sx = constrain(sx, 0, maxX);
  sy = constrain(sy, 0, maxY);

  image(img, x, y, w, h, sx, sy, sx+sw, sy+sh);
}

function frac(v){ return v - Math.floor(v); }
function constrain(v, a, b){ return Math.max(a, Math.min(b, v)); }
