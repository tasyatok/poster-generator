const BASE_W = 650;
const BASE_H = 910;

let cols = 3, rows = 5;
let cell = 130;
let t = 0;
let speed = 0.01;
let amp = 0.95;

let imgA, imgB;

let minCell = 2;
let fadeStart = 14;
let minAlpha = 180;   // stronger floor so “thin strips” are still visible
let cropMove = 220;

function preload(){
  imgA = loadImage("assets/05.jpg");
  imgB = loadImage("assets/03.jpg");
}

function setup(){
  const c = createCanvas(BASE_W, BASE_H);
  c.parent("frame");
  pixelDensity(window.devicePixelRatio || 1);
  noStroke();
}

function draw(){
  background(0);

  // visual proof you’re running the new build
  fill(255, 120);
  textSize(12);
  text("SKETCH v3 (new files loaded)", 12, 18);

  t += speed;

  if(!imgA || !imgB){
    fill(255, 0, 0);
    textSize(16);
    text("Missing images.\nPut 05.jpg and 03.jpg into /assets", 20, 40);
    return;
  }

  // rows
  const rh = new Array(rows);
  let sumH = 0;
  for(let r=0;r<rows;r++){
    const s = 1 + amp * Math.sin(t + r*0.55);
    rh[r] = Math.max(minCell, cell * s);
    sumH += rh[r];
  }
  const ky = height / sumH;
  for(let r=0;r<rows;r++) rh[r] *= ky;

  // cols
  const cw = new Array(cols);
  let sumW = 0;
  for(let c=0;c<cols;c++){
    const s = 1 + amp * Math.sin(t*0.95 + c*0.35);
    cw[c] = Math.max(minCell, cell * s);
    sumW += cw[c];
  }
  const kx = width / sumW;
  for(let c=0;c<cols;c++) cw[c] *= kx;

  // draw
  let y = 0;
  for(let r=0;r<rows;r++){
    let x = 0;
    for(let c=0;c<cols;c++){
      const w = cw[c], h = rh[r];
      const img = ((r+c)%2===0) ? imgA : imgB;
      drawCrop(img, x, y, w, h, r, c);
      x += w;
    }
    y += rh[r];
  }
}

function drawCrop(img, x, y, w, h, r, c){
  const tiny = Math.min(w, h);

  let a = 255;
  if(tiny < fadeStart){
    a = map(tiny, minCell, fadeStart, minAlpha, 255);
    a = constrain(a, minAlpha, 255);
  }
  tint(255, a);

  // crop window proportional to cell — but never collapses
  let sw = (w / width)  * img.width  * 1.6;
  let sh = (h / height) * img.height * 1.6;
  sw = constrain(sw, 20, img.width);
  sh = constrain(sh, 20, img.height);

  const ax = frac(Math.sin((c+1)*12.9898 + (r+1)*78.233) * 43758.5453);
  const ay = frac(Math.sin((c+1)*93.9898 + (r+1)*67.345) * 24634.6345);

  const phase = t + r*0.55 + c*0.35;
  const mx = cropMove * Math.sin(phase) * (1 - constrain(w/(cell*2), 0, 1));
  const my = cropMove * Math.cos(phase) * (1 - constrain(h/(cell*2), 0, 1));

  const maxX = Math.max(1, img.width  - sw);
  const maxY = Math.max(1, img.height - sh);

  const baseX = ax * maxX;
  const baseY = ay * maxY;

  const sx = wrap(baseX + mx, maxX);
  const sy = wrap(baseY + my, maxY);

  image(img, x, y, w, h, sx, sy, sx+sw, sy+sh);
  noTint();
}

function wrap(v, maxv){
  if(maxv <= 1) return 0;
  v = v % maxv;
  if(v < 0) v += maxv;
  return v;
}
function frac(v){ return v - Math.floor(v); }
