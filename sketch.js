// Keep poster "design size" constant:
const POSTER_W = 650;
const POSTER_H = 910;

// Layout margin in CSS is 50px desktop, 16px mobile.
// We'll read the actual padding from the stage element.
let stageEl, cnv;
let imgA, imgB;

let cols = 3, rows = 5;
let cell = 130, tt = 0, speed = 0.01, amp = 0.95;

let minCell = 6;
let fadeStart = 22;
let cropMove = 220;

function preload(){
  // Put images either in root ("/05.jpg") or assets ("/assets/05.jpg") — be consistent.
  imgA = loadImage("05.jpg");
  imgB = loadImage("03.jpg");
}

function setup(){
  cnv = createCanvas(POSTER_W, POSTER_H);
  // attach canvas into our stage container
  stageEl = document.getElementById("stage");
  cnv.parent(stageEl);

  pixelDensity(window.devicePixelRatio || 1);
  noStroke();

  fitCanvasToViewport();
}

function windowResized(){
  fitCanvasToViewport();
}

function fitCanvasToViewport(){
  // Compute available space inside stage padding (CSS margins)
  const rect = stageEl.getBoundingClientRect();

  // available drawing area inside padding is rect.width/height already includes padding,
  // but since stage uses padding and box-sizing border-box, it’s safe:
  const availW = rect.width;
  const availH = rect.height;

  // scale so entire 650x910 fits, preserving aspect ratio
  const s = Math.min(availW / POSTER_W, availH / POSTER_H);

  // Apply visual scale without changing internal canvas resolution
  cnv.elt.style.transform = `scale(${s})`;
}

function draw(){
  background(0);
  tt += speed;

  if(!imgA || !imgB){
    fill(255, 0, 0);
    textSize(16);
    text("Missing images: 05.jpg and 03.jpg", 20, 30);
    return;
  }

  cols = Math.max(2, cols);
  rows = Math.max(2, rows);

  // --- row heights ---
  let rh = new Array(rows);
  let sumH = 0;
  for(let r=0; r<rows; r++){
    let s = 1 + amp * Math.sin(tt + r*0.55);
    rh[r] = Math.max(minCell, cell * s);
    sumH += rh[r];
  }
  let ky = height / sumH;
  for(let r=0; r<rows; r++) rh[r] *= ky;

  // --- col widths ---
  let cw = new Array(cols);
  let sumW = 0;
  for(let c=0; c<cols; c++){
    let s = 1 + amp * Math.sin(tt*0.95 + c*0.35);
    cw[c] = Math.max(minCell, cell * s);
    sumW += cw[c];
  }
  let kx = width / sumW;
  for(let c=0; c<cols; c++) cw[c] *= kx;

  // --- draw grid ---
  let y = 0;
  for(let r=0; r<rows; r++){
    let x = 0;
    for(let c=0; c<cols; c++){
      let w = cw[c], h = rh[r];
      let img = ((r+c)%2===0) ? imgA : imgB;
      drawCropLinked(img, x, y, w, h, r, c);
      x += w;
    }
    y += rh[r];
  }
}

// deterministic crop linked to same motion — and always fills the entire cell
function drawCropLinked(img, x, y, w, h, r, c){
  const tiny = Math.min(w, h);
  if(tiny <= minCell + 0.5) return;

  let a = 255;
  if(tiny < fadeStart) a = map(tiny, minCell, fadeStart, 0, 255);

  // This is your "dark overlay vibe" but without leaving bright seams:
  // draw image normally, then overlay a full-size translucent rect.
  // (No tint seams, and it always covers the full cell.)
  // --- compute crop window ---
  const swf = constrain(map(w, 0, width, 40, img.width*0.55), 20, img.width);
  const shf = constrain(map(h, 0, height, 40, img.height*0.55), 20, img.height);

  const ax = frac(Math.sin((c+1)*12.9898 + (r+1)*78.233) * 43758.5453);
  const ay = frac(Math.sin((c+1)*93.9898 + (r+1)*67.345) * 24634.6345);

  const phase = tt + r*0.55 + c*0.35;
  const mx = cropMove * Math.sin(phase) * (1.0 - constrain(w / (cell*2.0), 0, 1));
  const my = cropMove * Math.cos(phase) * (1.0 - constrain(h / (cell*2.0), 0, 1));

  const baseX = ax * (img.width  - swf);
  const baseY = ay * (img.height - shf);

  const sxf = wrap(baseX + mx, img.width  - swf);
  const syf = wrap(baseY + my, img.height - shf);

  const sx = Math.floor(sxf), sy = Math.floor(syf);
  const sw = Math.max(1, Math.floor(swf)), sh = Math.max(1, Math.floor(shf));

  // draw cropped image into cell
  push();
  // fade only when tiny; alpha applied via tint is safe here because we DON'T stack overlays with it
  tint(255, a);
  image(img, x, y, w, h, sx, sy, sx+sw, sy+sh);
  noTint();

  // overlay to darken — ALWAYS full cell (no seams)
  fill(0, 70);
  rect(x, y, w, h);
  pop();
}

function wrap(v, maxv){
  if(maxv <= 1) return 0;
  v = v % maxv;
  if(v < 0) v += maxv;
  return v;
}

function frac(v){
  return v - Math.floor(v);
}

// ---------- BUTTON CONTROLS ----------

function colsDown(){
  cols = max(2, cols - 1);
}

function colsUp(){
  cols = min(12, cols + 1);
}

function rowsDown(){
  rows = max(2, rows - 1);
}

function rowsUp(){
  rows = min(12, rows + 1);
}

function savePoster(){
  saveCanvas('poster', 'png');
}
