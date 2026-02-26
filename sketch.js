// Munken-ish accordion grid
// Canvas keeps fixed ratio (650 x 910), scaled via CSS

const BASE_W = 650;
const BASE_H = 910;

let cols = 3, rows = 5;
let cell = 130;
let t = 0;
let speed = 0.01;
let amp = 0.95;

let imgA, imgB;

let minCell = 6;
let fadeStart = 22;
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
  t += speed;

  if(!imgA || !imgB){
    fill(255,0,0);
    textSize(16);
    text("Images missing.\nPut 05.jpg and 03.jpg into /assets.", 20, 30);
    return;
  }

  // --- row heights ---
  let rh = [];
  let sumH = 0;
  for(let r=0;r<rows;r++){
    let s = 1 + amp * sin(t + r*0.55);
    let h = max(minCell, cell * s);
    rh.push(h);
    sumH += h;
  }
  let ky = height / sumH;
  rh = rh.map(v => v * ky);

  // --- column widths ---
  let cw = [];
  let sumW = 0;
  for(let c=0;c<cols;c++){
    let s = 1 + amp * sin(t*0.95 + c*0.35);
    let w = max(minCell, cell * s);
    cw.push(w);
    sumW += w;
  }
  let kx = width / sumW;
  cw = cw.map(v => v * kx);

  // --- draw grid ---
  let y = 0;
  for(let r=0;r<rows;r++){
    let x = 0;
    for(let c=0;c<cols;c++){
      let w = cw[c];
      let h = rh[r];
      let img = ((r+c)%2===0) ? imgA : imgB;
      drawCrop(img, x, y, w, h, r, c);
      x += w;
    }
    y += rh[r];
  }
}

function drawCrop(img, x, y, w, h, r, c){
  let tiny = min(w,h);
  if(tiny <= minCell+0.5) return;

  let alpha = 255;
  if(tiny < fadeStart){
    alpha = map(tiny, minCell, fadeStart, 0, 255);
  }
  tint(255, alpha);

  // Crop window always valid
  let sw = constrain(w / width * img.width * 1.4, 40, img.width);
  let sh = constrain(h / height * img.height * 1.4, 40, img.height);

  let ax = frac(sin((c+1)*12.9898 + (r+1)*78.233) * 43758.5453);
  let ay = frac(sin((c+1)*93.9898 + (r+1)*67.345) * 24634.6345);

  let phase = t + r*0.55 + c*0.35;
  let mx = cropMove * sin(phase) * (1.0 - constrain(w/(cell*2),0,1));
  let my = cropMove * cos(phase) * (1.0 - constrain(h/(cell*2),0,1));

  let bx = ax * (img.width - sw);
  let by = ay * (img.height - sh);

  let sx = wrap(bx + mx, img.width - sw);
  let sy = wrap(by + my, img.height - sh);

  image(img, x, y, w, h, sx, sy, sx+sw, sy+sh);
  noTint();
}

function wrap(v, maxv){
  if(maxv<=0) return 0;
  v%=maxv;
  if(v<0) v+=maxv;
  return v;
}

function frac(v){
  return v - floor(v);
}
