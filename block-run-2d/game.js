/* BLOCK RUN — flat SNES belt-scroller. Hard pixels, no 3D. */
const ASSET_V = "5";
const STEP = 1 / 60;
const SAVE_KEY = "block-run-2d-v2";
const HERO_SRC_W = 40;
const HERO_SRC_H = 40;
/** 2.5D on-foot hero is ~87 CSS px tall on a 375x667 SE. 2× source = 80px. */
const TARGET_HERO_PX = 86;
const GEARS = ["P", "R", "N", "D"];
const WALK_FPS = 8;
const STRIDE_NATIVE = 4.5;
/** Hero walk sheet. Swap this list (any length) when the revised frames land. */
const HERO_WALK_FRAMES = [
  "sprites/walk-new-1.png",
  "sprites/walk-new-2.png",
  "sprites/walk-new-3.png",
  "sprites/walk-new-4.png",
];
const WALK_Z = 52;
const REACH = 28;
const HALF_G = 14;
const HALF_COST = 100;
const START_CASH = 130;
const GRAM_PAY = 14;
const MAX_G = 56;
const SALES = [20, 40, 60];
const CAR_ACCEL = 210;
const CAR_MAX = 230;
const CAR_CREEP = 34;
const CAR_STOP = 10;
const NAMES = ["DEZ", "MARI", "KILO", "NIA", "JUNO"];
const MEETS = [
  { id: "taco", label: "TACO", t: 0.56 },
  { id: "motel", label: "MOTEL", t: 0.8 },
  { id: "alley", label: "ALLEY", t: 0.36 },
  { id: "park", label: "PARK", t: 0.94 },
];
const PLUG = { id: "plug", label: "PLUG", t: 0.2 };
const CRIB = { id: "crib", label: "CRIB", t: 0.06 };
const Z_WALK_MIN = 0.08;
const Z_WALK_MAX = 0.38;
const Z_STREET_MIN = 0.52;
const Z_STREET_MAX = 0.92;
const Z_CAR_PARK = 0.58;
const Z_CAR_DRIVE = 0.74;
const PALETTE = [
  [7, 6, 12], [12, 8, 28], [20, 12, 40], [32, 18, 56], [48, 28, 72],
  [8, 8, 8], [20, 20, 24], [40, 40, 44], [64, 64, 72],
  [232, 24, 24], [200, 16, 16], [168, 8, 8], [104, 8, 8],
  [248, 184, 104], [232, 152, 80], [200, 112, 56],
  [24, 72, 152], [16, 56, 128], [8, 40, 104], [8, 24, 72],
  [248, 248, 248], [216, 216, 220], [168, 168, 176],
  [200, 72, 24], [168, 56, 16], [104, 32, 8], [224, 104, 48],
  [56, 216, 248], [240, 196, 48], [56, 240, 112],
  [90, 74, 104], [138, 134, 150], [184, 176, 164], [120, 112, 104],
  [26, 36, 28], [20, 56, 32], [40, 88, 48], [72, 120, 56],
];
function walkSpeed() {
  return STRIDE_NATIVE * WALK_FPS * spriteScale;
}

const canvas = document.getElementById("game");
const viewEl = document.getElementById("view");
const padFoot = document.getElementById("pad-foot");
const padCar = document.getElementById("pad-car");
const phoneEl = document.getElementById("phone");
const cribEl = document.getElementById("crib");
const muteBtn = document.getElementById("btn-mute");
const shiftHint = document.getElementById("shift-hint");
const ctx = canvas.getContext("2d");
const nes = document.createElement("canvas");
const nctx = nes.getContext("2d");

let nesW = 256;
let nesH = 224;
let cssScale = 1;
let spriteScale = 2;
let WORLD = 398 * 3;
let art = null;
let mode = "title";
let ui = null;
let player = { x: 70, z: 0.22, vx: 0, vz: 0, facing: 1, anim: 0, moveDir: "side" };
let car = { x: 140, z: Z_CAR_PARK, vx: 0, facing: 1, gear: "P", parked: true, pullOverT: 0, shiftHint: 0 };
let inCar = false;
let cash = START_CASH;
let grams = 0;
let stash = 0;
let rep = 0;
let hi = 0;
let order = null;
let phoneT = 0;
let pops = [];
let peds = [];
let traffic = [];
let cam = 0;
let blink = 0;
let buyerAnim = 0;
let hasSave = false;
let inbox = [];
const keys = new Set();
const holds = new Set();
let pulses = { act: false, jump: false, start: false, car: false, phone: false, crib: false, pullover: false, accept: false, stall: false, save: false, stash: false, gear: null };
let testGas = false;
let testBrake = false;

function wrap(x, w) {
  x %= w;
  if (x < 0) x += w;
  return x;
}
function wrapDelta(a, b, w) {
  let d = b - a;
  if (d > w / 2) d -= w;
  if (d < -w / 2) d += w;
  return d;
}
function fmtG(n) {
  const r = Math.round(Math.max(0, n) * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}
function at(def) {
  return def.t * WORLD;
}
function meetById(id) {
  return MEETS.find((m) => m.id === id) || MEETS[0];
}
function palHex(rgb) {
  return "#" + rgb.map((n) => n.toString(16).padStart(2, "0")).join("");
}
function nearestPal(r, g, b) {
  let best = PALETTE[0];
  let bestD = Infinity;
  for (const p of PALETTE) {
    const d = (p[0] - r) * (p[0] - r) + (p[1] - g) * (p[1] - g) + (p[2] - b) * (p[2] - b);
    if (d < bestD) { bestD = d; best = p; }
  }
  return palHex(best);
}
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth ? img : null);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
async function loadFrameList(paths) {
  const frames = (await Promise.all(
    paths.map((src) => loadImage(`${src}?v=${ASSET_V}`)),
  )).filter(Boolean);
  return frames.length ? frames : null;
}
async function loadSheet(name, base = `../block-run/sprites/`) {
  return loadFrameList([1, 2, 3, 4].map((i) => `${base}${name}-${i}.png`));
}
/** Future belt-scroller facing sheets. Missing files stay null. */
async function loadDirSheet(name) {
  return loadSheet(name);
}
function paintSedan(body, rust) {
  const w = 64;
  const h = 24;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  const shade = rust ? "#681808" : "#141418";
  const mid = body;
  const hi = rust ? "#e87838" : "#787888";
  const deep = rust ? "#401004" : "#0a0a0c";
  const rustSpot = rust ? "#8a3010" : "#202028";
  g.fillStyle = "#080808";
  g.fillRect(8, 16, 12, 8);
  g.fillRect(42, 16, 12, 8);
  g.fillStyle = "#2a2a30";
  g.fillRect(10, 18, 8, 4);
  g.fillRect(44, 18, 8, 4);
  g.fillStyle = "#585860";
  g.fillRect(12, 19, 3, 2);
  g.fillRect(46, 19, 3, 2);
  g.fillStyle = "#a8a8b0";
  g.fillRect(13, 19, 1, 1);
  g.fillRect(47, 19, 1, 1);
  g.fillStyle = "#3a3a40";
  g.fillRect(6, 20, 16, 2);
  g.fillRect(40, 20, 16, 2);
  g.fillStyle = deep;
  g.fillRect(2, 13, 60, 6);
  g.fillStyle = shade;
  g.fillRect(3, 12, 58, 6);
  g.fillStyle = mid;
  g.fillRect(4, 10, 56, 6);
  g.fillStyle = hi;
  g.fillRect(5, 10, 54, 2);
  g.fillStyle = rustSpot;
  g.fillRect(8, 13, 4, 2);
  g.fillRect(28, 14, 5, 2);
  g.fillRect(50, 12, 3, 2);
  g.fillStyle = "#181820";
  g.fillRect(17, 3, 28, 8);
  g.fillStyle = shade;
  g.fillRect(17, 3, 28, 2);
  g.fillRect(17, 3, 2, 8);
  g.fillRect(43, 3, 2, 8);
  g.fillStyle = hi;
  g.fillRect(19, 3, 24, 1);
  g.fillStyle = "#0c2848";
  g.fillRect(20, 5, 9, 5);
  g.fillRect(32, 5, 10, 5);
  g.fillStyle = "#1a4870";
  g.fillRect(20, 8, 9, 2);
  g.fillRect(32, 8, 10, 2);
  g.fillStyle = "#5a88a8";
  g.fillRect(21, 5, 4, 2);
  g.fillRect(33, 5, 4, 2);
  g.fillStyle = "#d0e8f0";
  g.fillRect(21, 5, 2, 1);
  g.fillRect(33, 5, 2, 1);
  g.fillStyle = "#c8c8d0";
  g.fillRect(58, 12, 4, 3);
  g.fillStyle = "#f0f0f8";
  g.fillRect(59, 12, 2, 1);
  g.fillStyle = "#e81818";
  g.fillRect(2, 12, 4, 3);
  g.fillStyle = "#f86848";
  g.fillRect(3, 12, 2, 1);
  g.fillStyle = "#f0c430";
  g.fillRect(4, 15, 2, 1);
  g.fillRect(56, 15, 2, 1);
  return c;
}

function readSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (!s || typeof s.cash !== "number") return null;
    return s;
  } catch {
    return null;
  }
}
function persist() {
  if (cash > hi) hi = cash;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash, grams, stash, rep, hi, x: player.x, z: player.z, facing: player.facing,
      carX: car.x, carZ: car.z, carFacing: car.facing, order, inbox,
    }));
    hasSave = true;
  } catch { /* ignore */ }
}
function addPop(x, z, s) {
  pops.push({ x, z, text: s, life: 0.9 });
}
function spawnPeds() {
  peds = [0, 1, 2, 3, 4, 5].map((i) => ({
    x: wrap((WORLD / 6) * i + 40, WORLD),
    z: 0.14 + (i % 3) * 0.07,
    facing: i % 2 ? -1 : 1,
    look: i % 2,
    anim: Math.random(),
    speed: 18 + (i % 3) * 6,
  }));
}
function spawnTraffic() {
  const colors = ["#184898", "#282828", "#a80808", "#082868"];
  traffic = [0, 1, 2, 3].map((i) => ({
    x: wrap((WORLD / 4) * i + 220, WORLD),
    z: 0.66 + (i % 2) * 0.1,
    facing: i % 2 ? -1 : 1,
    vx: (i % 2 ? -1 : 1) * (70 + i * 12),
    color: colors[i % colors.length],
    img: paintSedan(colors[i % colors.length], false),
  }));
}
function fresh() {
  player = { x: at(CRIB) + 18, z: 0.22, vx: 0, vz: 0, facing: 1, anim: 0, moveDir: "side" };
  car = { x: at(CRIB) + 86, z: Z_CAR_PARK, vx: 0, facing: 1, gear: "P", parked: true, pullOverT: 0, shiftHint: 0 };
  inCar = false;
  cash = START_CASH;
  grams = 0;
  stash = 0;
  rep = 0;
  order = null;
  phoneT = 0;
  pops = [];
  inbox = [];
  ui = null;
  spawnPeds();
  spawnTraffic();
  cam = wrap(player.x - nesW * 0.42, WORLD);
  addPop(player.x, player.z, "COP A PACK");
}
function continueSave(s) {
  player = {
    x: wrap(s.x || at(CRIB), WORLD),
    z: Math.max(Z_WALK_MIN, Math.min(Z_STREET_MAX, s.z ?? 0.22)),
    vx: 0, vz: 0,
    facing: s.facing === -1 ? -1 : 1,
    anim: 0, moveDir: "side",
  };
  car = {
    x: wrap(s.carX || at(CRIB) + 86, WORLD),
    z: s.carZ ?? Z_CAR_PARK,
    vx: 0,
    facing: s.carFacing === -1 ? -1 : 1,
    gear: "P", parked: true, pullOverT: 0, shiftHint: 0,
  };
  inCar = false;
  cash = s.cash;
  grams = s.grams || 0;
  stash = s.stash || 0;
  rep = s.rep || 0;
  hi = s.hi || s.cash;
  order = s.order && s.order.spot ? s.order : null;
  inbox = Array.isArray(s.inbox) ? s.inbox : [];
  phoneT = order ? 0 : 3;
  pops = [];
  ui = null;
  spawnPeds();
  spawnTraffic();
  cam = wrap(player.x - nesW * 0.42, WORLD);
}
function closeTo(x) {
  return Math.abs(wrapDelta(inCar ? car.x : player.x, x, WORLD)) <= REACH;
}
function onWalk() {
  return player.z <= Z_WALK_MAX + 0.04;
}
function nearCar() {
  return !inCar && Math.abs(wrapDelta(player.x, car.x, WORLD)) < 30 && player.z >= Z_STREET_MIN - 0.08;
}
function nearCrib() {
  return !inCar && closeTo(at(CRIB)) && onWalk();
}
function nearPlug() {
  return !inCar && closeTo(at(PLUG)) && onWalk();
}
function carIsParked() {
  return !!(car.parked || (car.gear === "P" && Math.abs(car.vx) < CAR_STOP));
}

function rollOrder() {
  const spot = MEETS[Math.floor(Math.random() * MEETS.length)];
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const band = rep < 2 ? 0 : rep < 5 ? 1 : 2;
  const pay = SALES[Math.floor(Math.random() * (band + 1))];
  order = { name, spot: spot.id, label: spot.label, pay, grams: pay / GRAM_PAY, phase: "offer", stalls: 0 };
  phoneT = 0;
  inbox.unshift({ from: name, text: "yo need $" + pay + " at " + spot.label, unread: true });
  addPop(player.x, player.z, name);
  BRAudio.sfx.ping();
}
function tryBuy() {
  if (cash < HALF_COST) return addPop(at(PLUG), 0.2, "NEED $" + HALF_COST);
  if (grams + HALF_G > MAX_G + 0.01) return addPop(at(PLUG), 0.2, "FULL");
  cash -= HALF_COST;
  grams += HALF_G;
  addPop(at(PLUG), 0.2, "+" + HALF_G + "G");
  BRAudio.sfx.buy();
  if (!order) phoneT = 2.2;
  persist();
}
function tryServe() {
  if (!order || inCar) return;
  if (order.phase === "offer") return acceptOrder();
  if (!closeTo(at(meetById(order.spot)))) return;
  if (grams + 0.05 < order.grams) return addPop(player.x, player.z, "SHORT");
  grams = Math.max(0, Math.round((grams - order.grams) * 10) / 10);
  cash += order.pay;
  rep += 1;
  addPop(player.x, player.z, "+$" + order.pay);
  BRAudio.sfx.drop();
  order = null;
  phoneT = 4 + Math.random() * 3;
  persist();
}
function acceptOrder() {
  if (!order || (order.phase !== "offer" && order.phase !== "stalling")) return false;
  order.phase = "active";
  BRAudio.sfx.ping();
  return true;
}
function stallOrder() {
  if (!order || (order.phase !== "offer" && order.phase !== "stalling")) return false;
  order.stalls = (order.stalls || 0) + 1;
  if (order.stalls >= 3) {
    addPop(player.x, player.z, "NO SHOW");
    order = null;
    rep = Math.max(0, rep - 1);
    phoneT = 6;
    return true;
  }
  order.phase = "stalling";
  inbox.unshift({ from: order.name, text: "u comin or what", unread: true });
  BRAudio.sfx.ping();
  return true;
}
function enterCar(force) {
  if (!force && !nearCar() && !inCar) return false;
  if (!carIsParked()) return false;
  inCar = true;
  car.gear = "P";
  car.vx = 0;
  car.parked = true;
  car.z = Z_CAR_PARK;
  player.x = car.x;
  player.z = car.z;
  player.facing = car.facing;
  player.vx = 0;
  player.vz = 0;
  ui = null;
  return true;
}
function leaveCar() {
  if (!carIsParked()) {
    addPop(car.x, car.z, "PULL OVER FIRST");
    return false;
  }
  inCar = false;
  car.gear = "P";
  car.vx = 0;
  car.parked = true;
  car.z = Z_CAR_PARK;
  player.x = car.x;
  player.z = Math.min(Z_WALK_MAX, car.z - 0.12);
  player.vx = 0;
  player.vz = 0;
  player.facing = car.facing;
  return true;
}
function tryShift(to, brakeHeld) {
  if (!to || !GEARS.includes(to) || to === car.gear) return false;
  if (car.pullOverT > 0) return false;
  if (car.gear === "P" && !brakeHeld) {
    car.shiftHint = 1.15;
    return false;
  }
  if (to === "P" && Math.abs(car.vx) > 18) {
    car.vx = 0;
    addPop(car.x, car.z, "CLUNK");
    BRAudio.sfx.hit();
  }
  car.gear = to;
  car.shiftHint = 0;
  if (to !== "P") {
    car.parked = false;
    car.z = Z_CAR_DRIVE;
  } else if (Math.abs(car.vx) < CAR_STOP) {
    car.parked = true;
    car.z = Z_CAR_PARK;
  }
  BRAudio.sfx.shift();
  return true;
}
function startPullOver() {
  if (!inCar || car.parked || car.pullOverT > 0) return false;
  car.pullOverT = 0.7;
  return true;
}
function doCarBtn() {
  if (inCar) return carIsParked() ? leaveCar() : (addPop(car.x, car.z, "PULL OVER FIRST"), false);
  if (nearCar()) return enterCar();
  return false;
}
function doAct() {
  if (ui === "phone") return acceptOrder();
  if (nearPlug()) return tryBuy();
  if (order && (order.phase === "offer" || order.phase === "stalling")) return acceptOrder();
  if (order && order.phase === "active" && closeTo(at(meetById(order.spot)))) return tryServe();
  if (nearCrib()) { ui = "crib"; return true; }
  if (nearCar()) return enterCar();
  if (order) addPop(player.x, player.z, order.name + " " + order.label);
  else addPop(player.x, player.z, grams > 0 ? "WAITING" : "PLUG");
  return false;
}
function beginPlay(fromSave) {
  const s = fromSave ? readSave() : null;
  if (s) continueSave(s);
  else fresh();
  mode = "play";
  BRAudio.unlock();
  BRAudio.startMusic();
  BRAudio.sfx.start();
}

function moveAxes() {
  let x = 0;
  let z = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA") || holds.has("left")) x -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD") || holds.has("right")) x += 1;
  if (keys.has("ArrowUp") || keys.has("KeyW") || holds.has("up")) z -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS") || holds.has("down")) z += 1;
  return { x: Math.max(-1, Math.min(1, x)), z: Math.max(-1, Math.min(1, z)) };
}
function gasHeld() {
  return testGas || holds.has("gas") || keys.has("KeyK") || keys.has("ShiftRight");
}
function brakeHeld() {
  return testBrake || holds.has("brake") || keys.has("KeyL") || keys.has("Slash") || keys.has("Space");
}

function snapView() {
  const vw = Math.max(160, viewEl?.clientWidth || 375);
  const vh = Math.max(140, viewEl?.clientHeight || 400);
  spriteScale = Math.max(1, Math.round(TARGET_HERO_PX / HERO_SRC_H));
  const heroAt1 = HERO_SRC_H * spriteScale;
  cssScale = 1;
  if (vw >= 700 && heroAt1 * 2 <= TARGET_HERO_PX + 28) cssScale = 2;
  nesW = Math.max(160, Math.floor(vw / cssScale));
  nesH = Math.max(140, Math.floor(vh / cssScale));
  if (nes.width !== nesW || nes.height !== nesH) {
    nes.width = nesW;
    nes.height = nesH;
  }
  canvas.width = nesW;
  canvas.height = nesH;
  canvas.style.width = (nesW * cssScale) + "px";
  canvas.style.height = (nesH * cssScale) + "px";
}

function depthY(z) {
  const top = Math.round(nesH * 0.62);
  const bot = nesH - 10;
  return Math.round(top + Math.max(0, Math.min(1, z)) * (bot - top));
}
function worldToScreen(wx) {
  return wrapDelta(cam, wx, WORLD);
}

function pickWalkSheet(dir) {
  // Slots for future front/back walk frames (sprites/walk-front-*.png, walk-back-*.png).
  if (dir === "front" && art.walkFront) return art.walkFront;
  if (dir === "back" && art.walkBack) return art.walkBack;
  return art.walkNew || art.walk;
}
function heroSheet() {
  const moving = Math.abs(player.vx) > 6 || Math.abs(player.vz) > 6;
  if (!moving) return art.idle;
  return pickWalkSheet(player.moveDir);
}

function drawSprite(img, wx, z, w, h, facing) {
  if (!img) return;
  const sx = worldToScreen(wx);
  const sy = depthY(z);
  const dw = Math.round(w);
  const dh = Math.round(h);
  if (sx < -dw || sx > nesW + dw) return;
  nctx.save();
  nctx.translate(Math.round(sx), sy);
  nctx.scale(facing < 0 ? -1 : 1, 1);
  nctx.drawImage(img, -Math.round(dw / 2), -dh, dw, dh);
  nctx.restore();
}
function drawLabel(wx, z, s, color) {
  const sx = worldToScreen(wx);
  if (sx < -48 || sx > nesW + 48) return;
  nctx.font = "8px 'Press Start 2P', monospace";
  text(nctx, s, sx, depthY(z) - 12 - HERO_SRC_H * spriteScale, color, "center");
}
function text(c, s, x, y, color, align) {
  c.fillStyle = color;
  c.textAlign = align || "left";
  c.textBaseline = "top";
  c.fillText(s, Math.round(x), Math.round(y));
}

function drawPalm(x, baseY, h) {
  const trunkX = x + 5;
  nctx.fillStyle = "#2a1810";
  nctx.fillRect(trunkX, baseY - h, 5, h);
  nctx.fillStyle = "#5a3820";
  nctx.fillRect(trunkX, baseY - h, 3, h);
  nctx.fillStyle = "#8a5830";
  nctx.fillRect(trunkX, baseY - h, 1, h);
  nctx.fillStyle = "#3a2014";
  for (let y = baseY - h + 4; y < baseY - 2; y += 5) nctx.fillRect(trunkX, y, 5, 1);
  nctx.fillStyle = "#c07038";
  nctx.fillRect(trunkX + 1, baseY - h + 2, 2, 2);
  nctx.fillRect(trunkX + 1, baseY - h + 8, 2, 2);
  const top = baseY - h;
  nctx.fillStyle = "#104028";
  nctx.fillRect(x - 8, top - 2, 12, 4);
  nctx.fillRect(x + 8, top - 2, 12, 4);
  nctx.fillRect(x - 2, top - 10, 16, 6);
  nctx.fillStyle = "#1c6840";
  nctx.fillRect(x - 10, top, 10, 3);
  nctx.fillRect(x + 8, top, 12, 3);
  nctx.fillRect(x - 4, top - 8, 20, 4);
  nctx.fillRect(x + 2, top - 14, 10, 5);
  nctx.fillStyle = "#38a058";
  nctx.fillRect(x - 8, top, 8, 2);
  nctx.fillRect(x + 10, top, 8, 2);
  nctx.fillRect(x, top - 8, 14, 3);
  nctx.fillRect(x + 3, top - 13, 8, 3);
  nctx.fillStyle = "#70d878";
  nctx.fillRect(x + 2, top - 8, 6, 2);
  nctx.fillRect(x + 4, top - 12, 4, 2);
  nctx.fillStyle = "#c07028";
  nctx.fillRect(trunkX - 1, top + 2, 2, 2);
  nctx.fillRect(trunkX + 4, top + 3, 2, 2);
}

function drawParallax() {
  const skyH = Math.round(nesH * 0.54);
  const skyBands = ["#08061a", "#100828", "#1c0c3c", "#2a1050", "#3c1864", "#582070", "#6e2874"];
  const bandH = Math.ceil(skyH / skyBands.length);
  for (let i = 0; i < skyBands.length; i++) {
    nctx.fillStyle = skyBands[i];
    nctx.fillRect(0, i * bandH, nesW, bandH + 1);
    if (i < skyBands.length - 1) {
      nctx.fillStyle = skyBands[i + 1];
      for (let x = (i % 2); x < nesW; x += 2) nctx.fillRect(x, (i + 1) * bandH - 1, 1, 1);
    }
  }
  nctx.fillStyle = "#8a3878";
  nctx.fillRect(0, skyH - 8, nesW, 4);
  nctx.fillStyle = "#a44880";
  nctx.fillRect(0, skyH - 4, nesW, 4);
  const starShift = Math.round(cam * 0.05);
  for (let i = 0; i < 36; i++) {
    const x = wrap((i * 47 + 9) - starShift, nesW);
    const y = 6 + ((i * 17) % Math.max(10, skyH - 48));
    nctx.fillStyle = i % 6 === 0 ? "#fff8e0" : i % 3 === 0 ? "#f0e8ff" : "#a8a0d0";
    nctx.fillRect(x, y, i % 8 === 0 ? 2 : 1, i % 8 === 0 ? 2 : 1);
  }
  const moonX = nesW - 48;
  nctx.fillStyle = "#f8ecd0";
  nctx.fillRect(moonX, 14, 14, 14);
  nctx.fillStyle = "#e8d4a0";
  nctx.fillRect(moonX + 2, 16, 10, 10);
  nctx.fillStyle = "#d0b878";
  nctx.fillRect(moonX + 4, 18, 4, 4);
  nctx.fillRect(moonX + 9, 21, 3, 3);
  nctx.fillStyle = "#6e2874";
  nctx.fillRect(moonX + 11, 15, 3, 3);
  const hillShift = Math.round(cam * 0.12);
  for (let i = 0; i < 14; i++) {
    const x = wrap(i * 38 - hillShift, nesW + 40) - 12;
    const h = 18 + (i % 4) * 8;
    nctx.fillStyle = "#20103a";
    nctx.fillRect(x, skyH - h, 32 + (i % 3) * 6, h);
    nctx.fillStyle = "#2c1848";
    nctx.fillRect(x, skyH - h, 32 + (i % 3) * 6, 4);
  }
  const midShift = Math.round(cam * 0.2);
  const midTones = ["#2a1844", "#241840", "#301c48"];
  for (let i = 0; i < 10; i++) {
    const x = wrap(i * 46 + 6 - midShift, nesW + 50) - 10;
    const h = 28 + (i % 5) * 9;
    nctx.fillStyle = midTones[i % midTones.length];
    nctx.fillRect(x, skyH - h, 28 + (i % 2) * 10, h);
    nctx.fillStyle = "#3a2460";
    nctx.fillRect(x, skyH - h, 28 + (i % 2) * 10, 3);
    for (let wy = 6; wy < h - 8; wy += 7) {
      for (let wx = 4; wx < 22; wx += 7) {
        const on = ((i * 3 + wy + wx) % 5) !== 2;
        nctx.fillStyle = on ? ((i + wy) % 4 === 0 ? "#f0c430" : "#48d0e8") : "#140c28";
        nctx.fillRect(x + wx, skyH - h + wy, 3, 3);
        if (on) {
          nctx.fillStyle = "#fff4b0";
          nctx.fillRect(x + wx, skyH - h + wy, 1, 1);
        }
      }
    }
  }
  if (art?.street) {
    const sw = art.street.naturalWidth;
    nctx.globalAlpha = 0.22;
    let covered = 0;
    let worldX = cam * 0.22;
    while (covered < nesW) {
      const srcX = Math.floor(wrap(worldX, sw));
      const span = Math.max(1, Math.min(nesW - covered, sw - srcX));
      nctx.drawImage(art.street, srcX, 70, span, 50, covered, skyH - 50, span, 50);
      covered += span;
      worldX += span;
    }
    nctx.globalAlpha = 1;
  }
  const palmShift = Math.round(cam * 0.32);
  for (let i = 0; i < 7; i++) {
    drawPalm(wrap(i * 78 + 18 - palmShift, nesW + 56) - 12, skyH, 28 + (i % 3) * 5);
  }
  const walkY = depthY(0.18);
  const streetY = depthY(0.55);
  const wallH = 58;
  const wallY = walkY - wallH;
  const wallShift = Math.round(cam);
  const facades = [
    { body: "#6a3858", shade: "#3a2034", brick: "#8a4c70", hi: "#b86890", awn: "#e21b7a", trim: "#f0c430" },
    { body: "#385870", shade: "#203848", brick: "#4c7894", hi: "#70a0b8", awn: "#38d8f8", trim: "#f8f8f8" },
    { body: "#8a5030", shade: "#4a2818", brick: "#b86840", hi: "#e09058", awn: "#f0c430", trim: "#38d8f8" },
    { body: "#385048", shade: "#203028", brick: "#4c7064", hi: "#78a890", awn: "#38f070", trim: "#f0c430" },
    { body: "#584070", shade: "#302448", brick: "#7860a0", hi: "#a088c8", awn: "#c060ff", trim: "#f8f8f8" },
  ];
  for (let i = -1; i < Math.ceil(nesW / 56) + 1; i++) {
    const x = i * 56 - wrap(wallShift, 56);
    const f = facades[(i + 40) % facades.length];
    nctx.fillStyle = f.shade;
    nctx.fillRect(x, wallY, 54, wallH);
    nctx.fillStyle = f.body;
    nctx.fillRect(x, wallY, 54, 5);
    nctx.fillStyle = f.hi;
    nctx.fillRect(x, wallY, 54, 2);
    nctx.fillStyle = f.trim;
    nctx.fillRect(x, wallY + 5, 54, 1);
    nctx.fillStyle = f.brick;
    for (let by = wallY + 8; by < walkY - 18; by += 6) {
      const odd = ((by / 6) | 0) % 2;
      for (let bx = x + 2 + odd * 4; bx < x + 50; bx += 8) {
        nctx.fillStyle = f.brick;
        nctx.fillRect(bx, by, 6, 4);
        nctx.fillStyle = f.hi;
        nctx.fillRect(bx, by, 6, 1);
        nctx.fillStyle = f.shade;
        nctx.fillRect(bx + 5, by + 1, 1, 3);
      }
    }
    nctx.fillStyle = "#100814";
    nctx.fillRect(x + 52, wallY, 4, wallH);
    const lit = (i + Math.floor(cam / 56)) % 4 !== 1;
    nctx.fillStyle = "#18101c";
    nctx.fillRect(x + 6, wallY + 14, 14, 14);
    nctx.fillRect(x + 24, wallY + 14, 14, 14);
    nctx.fillStyle = f.trim;
    nctx.fillRect(x + 6, wallY + 14, 14, 2);
    nctx.fillRect(x + 24, wallY + 14, 14, 2);
    nctx.fillStyle = lit ? "#f8d848" : "#1a2438";
    nctx.fillRect(x + 8, wallY + 17, 10, 9);
    nctx.fillRect(x + 26, wallY + 17, 10, 9);
    if (lit) {
      nctx.fillStyle = "#fff6b0";
      nctx.fillRect(x + 8, wallY + 17, 4, 3);
      nctx.fillRect(x + 26, wallY + 17, 4, 3);
      nctx.fillStyle = "#c8a020";
      nctx.fillRect(x + 8, wallY + 23, 10, 3);
      nctx.fillRect(x + 26, wallY + 23, 10, 3);
    }
    nctx.fillStyle = f.awn;
    nctx.fillRect(x + 4, wallY + 10, 16, 3);
    nctx.fillRect(x + 22, wallY + 10, 16, 3);
    nctx.fillStyle = f.hi;
    nctx.fillRect(x + 4, wallY + 10, 16, 1);
    nctx.fillRect(x + 22, wallY + 10, 16, 1);
    nctx.fillStyle = f.shade;
    nctx.fillRect(x + 10, walkY - 16, 12, 16);
    nctx.fillStyle = "#201018";
    nctx.fillRect(x + 12, walkY - 14, 8, 14);
    nctx.fillStyle = f.trim;
    nctx.fillRect(x + 16, walkY - 8, 2, 2);
    nctx.fillStyle = f.awn;
    nctx.fillRect(x + 8, walkY - 18, 16, 3);
  }
  const nearPalm = Math.round(cam * 0.82);
  for (let i = 0; i < 4; i++) {
    drawPalm(wrap(i * 130 + 50 - nearPalm, nesW + 80) - 18, walkY, 40);
  }
  for (let i = 0; i < 5; i++) {
    const lx = wrap(i * 96 + 20 - Math.round(cam * 0.9), nesW + 20);
    nctx.fillStyle = "#2a2018";
    nctx.fillRect(lx, walkY - 36, 3, 36);
    nctx.fillStyle = "#5a4030";
    nctx.fillRect(lx, walkY - 36, 1, 36);
    nctx.fillStyle = "#f0c430";
    nctx.fillRect(lx - 3, walkY - 40, 9, 5);
    nctx.fillStyle = "#fff2a0";
    nctx.fillRect(lx - 1, walkY - 39, 3, 3);
  }
  nctx.fillStyle = "#7a7680";
  nctx.fillRect(0, walkY, nesW, streetY - walkY);
  nctx.fillStyle = "#b0a8b0";
  nctx.fillRect(0, walkY, nesW, 3);
  nctx.fillStyle = "#9a929a";
  nctx.fillRect(0, walkY + 3, nesW, 1);
  nctx.fillStyle = "#5a5660";
  for (let x = -Math.round(cam % 16); x < nesW; x += 16) {
    nctx.fillRect(x, walkY + 5, 1, streetY - walkY - 8);
  }
  nctx.fillStyle = "#6a6268";
  for (let y = walkY + 12; y < streetY - 8; y += 10) {
    for (let x = -Math.round(cam % 16); x < nesW; x += 16) nctx.fillRect(x + 1, y, 14, 1);
  }
  nctx.fillStyle = "#8a8288";
  for (let x = -Math.round(cam % 16); x < nesW; x += 16) {
    nctx.fillRect(x + 2, walkY + 7, 4, 2);
  }
  nctx.fillStyle = "#3a3640";
  nctx.fillRect(0, streetY - 6, nesW, 2);
  nctx.fillStyle = "#d8d0c4";
  nctx.fillRect(0, streetY - 4, nesW, 4);
  nctx.fillStyle = "#f0e8dc";
  nctx.fillRect(0, streetY - 4, nesW, 1);
  nctx.fillStyle = "#8a8074";
  nctx.fillRect(0, streetY - 1, nesW, 1);
  nctx.fillStyle = "#18161e";
  nctx.fillRect(0, streetY, nesW, nesH - streetY);
  nctx.fillStyle = "#221e28";
  nctx.fillRect(0, streetY, nesW, 3);
  nctx.fillStyle = "#2a2630";
  for (let i = 0; i < 55; i++) {
    const x = wrap((i * 27 + Math.floor(cam)) % (nesW + 10), nesW);
    nctx.fillRect(x, streetY + 6 + (i % 8) * 6, 3, 1);
  }
  nctx.fillStyle = "#100e14";
  for (let i = 0; i < 18; i++) {
    const x = wrap((i * 41 + Math.floor(cam * 0.5)) % (nesW + 12), nesW);
    nctx.fillRect(x, streetY + 10 + (i % 5) * 8, 5, 2);
  }
  const dash = Math.round(cam % 26);
  const laneY = depthY(0.74);
  nctx.fillStyle = "#a08018";
  for (let x = -dash; x < nesW; x += 26) nctx.fillRect(x, laneY, 14, 2);
  nctx.fillStyle = "#f0c430";
  for (let x = -dash; x < nesW; x += 26) nctx.fillRect(x, laneY - 1, 14, 2);
  nctx.fillStyle = "#fff0a0";
  for (let x = -dash; x < nesW; x += 26) nctx.fillRect(x, laneY - 1, 14, 1);
}

function drawActors() {
  const carW = 64 * spriteScale;
  const carH = 24 * spriteScale;
  const actors = [];
  if (art) {
    actors.push({ z: 0.16, draw: () => drawSprite(art.dumpster, at(PLUG), 0.16, 32 * spriteScale, 32 * spriteScale, 1) });
    for (const ped of peds) {
      const sheet = ped.look ? art.runner : art.thug;
      const img = sheet[Math.floor(ped.anim * 8) % sheet.length];
      actors.push({ z: ped.z, draw: () => drawSprite(img, ped.x, ped.z, 30 * spriteScale, 38 * spriteScale, ped.facing) });
    }
    if (order && order.phase === "active") {
      const spot = meetById(order.spot);
      const sheet = NAMES.indexOf(order.name) % 2 === 0 ? art.thug : art.runner;
      const img = sheet[Math.floor(buyerAnim * 8) % sheet.length];
      const face = wrapDelta(at(spot), player.x, WORLD) >= 0 ? 1 : -1;
      actors.push({ z: 0.2, draw: () => drawSprite(img, at(spot), 0.2, 30 * spriteScale, 38 * spriteScale, face) });
    }
    for (const t of traffic) {
      actors.push({ z: t.z, draw: () => drawSprite(t.img, t.x, t.z, carW, carH, t.facing) });
    }
    actors.push({
      z: car.z + 0.04,
      draw: () => drawSprite(art.sedan, car.x, car.z, carW, carH, car.facing),
    });
    if (!inCar) {
      const sheet = heroSheet();
      const img = sheet[Math.floor(player.anim * WALK_FPS) % sheet.length];
      const nw = (img.naturalWidth || img.width || HERO_SRC_W) * spriteScale;
      const nh = (img.naturalHeight || img.height || HERO_SRC_H) * spriteScale;
      actors.push({
        z: player.z,
        draw: () => {
          drawSprite(img, player.x, player.z, nw, nh, player.facing);
          if (grams > 0) drawSprite(art.pack, player.x, player.z, 12 * spriteScale, 12 * spriteScale, 1);
        },
      });
    }
  }
  actors.sort((a, b) => a.z - b.z);
  for (const a of actors) a.draw();
  if (mode === "play") {
    drawLabel(at(CRIB), 0.12, "CRIB", "#e81818");
    drawLabel(at(PLUG), 0.12, "PLUG", "#f0c430");
    for (const m of MEETS) {
      const here = order && order.spot === m.id && order.phase === "active";
      drawLabel(at(m), 0.12, m.label, here ? "#38d8f8" : "#8a8696");
    }
  }
}

function syncHud() {
  padFoot.classList.toggle("hidden", mode === "play" && inCar);
  padCar.classList.toggle("hidden", !(mode === "play" && inCar));
  phoneEl.classList.toggle("hidden", ui !== "phone");
  cribEl.classList.toggle("hidden", ui !== "crib");
  muteBtn.textContent = BRAudio.isMuted() ? "SND OFF" : "SND ON";
  muteBtn.classList.toggle("off", BRAudio.isMuted());
  document.querySelectorAll(".gear").forEach((el) => el.classList.toggle("on", el.dataset.gear === car.gear));
  shiftHint.classList.toggle("show", inCar && car.shiftHint > 0);
  const carBtn = document.getElementById("btn-car");
  if (carBtn) carBtn.textContent = nearCar() ? "CAR" : "CAR";
  document.getElementById("phone-cash").textContent = "CASH $" + String(Math.floor(cash)).padStart(4, "0");
  document.getElementById("phone-inv").textContent = "GRN " + fmtG(grams) + "   STASH $" + Math.floor(stash);
  document.getElementById("crib-meta").textContent = "CASH $" + Math.floor(cash) + "  STASH $" + Math.floor(stash);
  const texts = document.getElementById("phone-texts");
  texts.innerHTML = inbox.slice(0, 4).map((m) => (
    `<div class="txt"><div class="who">${m.from}</div>${m.text}</div>`
  )).join("") || `<div class="txt">NO TEXTS</div>`;
  document.getElementById("phone-deal").classList.toggle(
    "hidden",
    !(order && (order.phase === "offer" || order.phase === "stalling")),
  );
  const held = holds;
  padFoot.querySelectorAll("[data-role]").forEach((el) => {
    el.classList.toggle("on", held.has(el.dataset.role) || keysHasRole(el.dataset.role));
  });
  padCar.querySelectorAll("[data-role='gas'],[data-role='brake']").forEach((el) => {
    el.classList.toggle("on", el.dataset.role === "gas" ? gasHeld() : brakeHeld());
  });
}
function keysHasRole(role) {
  if (role === "left") return keys.has("ArrowLeft") || keys.has("KeyA");
  if (role === "right") return keys.has("ArrowRight") || keys.has("KeyD");
  if (role === "up") return keys.has("ArrowUp") || keys.has("KeyW");
  if (role === "down") return keys.has("ArrowDown") || keys.has("KeyS");
  return false;
}

function update(dt) {
  const ax = moveAxes();
  const act = pulses.act;
  const start = pulses.start;
  const jump = pulses.jump;
  const carPulse = pulses.car;
  const phonePulse = pulses.phone;
  const cribPulse = pulses.crib;
  const pullPulse = pulses.pullover;
  const gearPulse = pulses.gear;
  const acceptPulse = pulses.accept;
  const stallPulse = pulses.stall;
  const savePulse = pulses.save;
  const stashPulse = pulses.stash;
  pulses = { act: false, jump: false, start: false, car: false, phone: false, crib: false, pullover: false, accept: false, stall: false, save: false, stash: false, gear: null };

  blink += dt;
  if (mode === "title") {
    if (start || act) {
      beginPlay(!!readSave() && !jump);
    } else if (jump) {
      try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
      hasSave = false;
      beginPlay(false);
    }
    return;
  }

  if (phonePulse) ui = ui === "phone" ? null : "phone";
  if (acceptPulse) acceptOrder();
  if (stallPulse) stallOrder();

  if (ui === "crib") {
    if (savePulse) { persist(); addPop(player.x, player.z, "SAVED"); BRAudio.sfx.pickup(); ui = null; }
    if (stashPulse) {
      if (cash > 0) { stash += cash; addPop(player.x, player.z, "IN $" + cash); cash = 0; persist(); BRAudio.sfx.drop(); }
      ui = null;
    }
    if (cribPulse || start) ui = null;
    return;
  }
  if (cribPulse && nearCrib()) ui = "crib";
  if (ui === "phone") {
    if (act) acceptOrder();
    return;
  }

  if (carPulse) doCarBtn();
  if (act) doAct();
  if (acceptPulse) acceptOrder();

  if (inCar) {
    if (gearPulse) tryShift(gearPulse, brakeHeld());
    if (pullPulse) startPullOver();
    car.shiftHint = Math.max(0, car.shiftHint - dt);
    let brake = brakeHeld();
    let gas = gasHeld();
    if (car.pullOverT > 0) {
      car.pullOverT = Math.max(0, car.pullOverT - dt);
      gas = false;
      brake = true;
      car.vx *= Math.exp(-4.2 * dt);
      if (Math.abs(car.vx) < CAR_STOP || car.pullOverT <= 0) {
        car.vx = 0;
        car.gear = "P";
        car.parked = true;
        car.z = Z_CAR_PARK;
        car.pullOverT = 0;
        addPop(car.x, car.z, "PARKED");
      }
    } else if (car.gear === "P") {
      car.vx = 0;
      if (ax.x < 0) car.facing = -1;
      if (ax.x > 0) car.facing = 1;
    } else if (car.gear === "N") {
      car.vx *= Math.exp(-1.2 * dt);
      if (brake) car.vx *= Math.exp(-4 * dt);
    } else if (car.gear === "D") {
      const dir = car.facing;
      if (gas) car.vx += dir * CAR_ACCEL * dt;
      else if (!brake) {
        const creep = dir * CAR_CREEP;
        if (Math.abs(car.vx) < Math.abs(creep)) car.vx += (creep - car.vx) * Math.min(1, dt * 4);
      }
      if (brake) car.vx *= Math.exp(-4 * dt);
    } else if (car.gear === "R") {
      const dir = -car.facing;
      if (gas) car.vx += dir * CAR_ACCEL * 0.72 * dt;
      else if (!brake) {
        const creep = dir * CAR_CREEP * 0.7;
        if (Math.abs(car.vx) < Math.abs(creep)) car.vx += (creep - car.vx) * Math.min(1, dt * 4);
      }
      if (brake) car.vx *= Math.exp(-4 * dt);
    }
    car.vx = Math.max(-CAR_MAX, Math.min(CAR_MAX, car.vx));
    if (brake && Math.abs(car.vx) < CAR_STOP) car.vx = 0;
    car.x = wrap(car.x + car.vx * dt, WORLD);
    if (!car.parked && car.gear !== "P") car.z = Z_CAR_DRIVE;
    player.x = car.x;
    player.z = car.z;
    player.vx = car.vx;
    player.facing = car.facing;
    BRAudio.setEngine("drive", Math.abs(car.vx) / CAR_MAX);
  } else {
    BRAudio.setEngine("off");
    if (ax.x < 0) player.facing = -1;
    if (ax.x > 0) player.facing = 1;
    const spd = walkSpeed();
    player.vx = ax.x * spd;
    player.vz = ax.z * (spd * 0.62);
    if (Math.abs(ax.z) > Math.abs(ax.x) + 0.1) player.moveDir = ax.z > 0 ? "front" : "back";
    else player.moveDir = "side";
    player.x = wrap(player.x + player.vx * dt, WORLD);
    player.z = Math.max(Z_WALK_MIN, Math.min(Z_STREET_MAX, player.z + (player.vz / 80) * dt));
    if (Math.abs(ax.x) > 0 || Math.abs(ax.z) > 0) player.anim += dt;
    else player.anim = 0;
    if (jump && player.z < Z_STREET_MIN) {
      /* jump reserved; belt-scroller stays grounded */
    }
  }

  buyerAnim += dt;
  for (const ped of peds) {
    ped.x = wrap(ped.x + ped.facing * ped.speed * dt, WORLD);
    ped.anim += dt;
    if (Math.random() < 0.002) ped.facing *= -1;
  }
  for (const t of traffic) {
    t.x = wrap(t.x + t.vx * dt, WORLD);
  }
  if (!order && grams > 0) {
    phoneT -= dt;
    if (phoneT <= 0) rollOrder();
  }
  for (const p of pops) p.life -= dt;
  pops = pops.filter((p) => p.life > 0);
  const follow = inCar ? car.x : player.x;
  const target = wrap(follow - nesW * 0.42, WORLD);
  cam = wrap(cam + wrapDelta(cam, target, WORLD) * (1 - Math.exp(-7 * dt)), WORLD);
}

function renderNes() {
  nctx.imageSmoothingEnabled = false;
  drawParallax();
  if (mode === "play") drawActors();
  nctx.font = "8px 'Press Start 2P', monospace";
  for (const p of pops) text(nctx, p.text, worldToScreen(p.x), depthY(p.z) - 48, "#f8f8f8", "center");
  if (mode === "play" && order) {
    nctx.fillStyle = "#121018";
    nctx.fillRect(4, 18, Math.min(200, nesW - 8), 26);
    nctx.strokeStyle = "#38d8f8";
    nctx.strokeRect(5, 19, Math.min(198, nesW - 10), 24);
    text(nctx, order.name, 10, 22, "#38d8f8");
    text(nctx, (order.phase === "active" ? order.label : "TXT") + " $" + order.pay, 10, 32, "#f8f8f8");
  }
  nctx.fillStyle = "#07060c";
  nctx.fillRect(0, 0, nesW, 16);
  nctx.font = "8px 'Press Start 2P', monospace";
  text(nctx, "$" + String(Math.floor(cash)).padStart(4, "0"), 4, 4, "#f0c430");
  text(nctx, fmtG(grams) + "G", Math.round(nesW * 0.38), 4, grams > 0 ? "#38f070" : "#8a8696");
  text(nctx, "REP " + rep, nesW - 64, 4, "#f8f8f8");
  if (mode === "title") {
    nctx.fillStyle = "rgba(7,6,12,0.72)";
    nctx.fillRect(0, 16, nesW, nesH - 16);
    nctx.font = "16px 'Press Start 2P', monospace";
    text(nctx, "BLOCK", nesW / 2, nesH * 0.22, "#f8f8f8", "center");
    text(nctx, "RUN", nesW / 2, nesH * 0.22 + 22, "#e81818", "center");
    nctx.font = "8px 'Press Start 2P', monospace";
    text(nctx, "DRIVE THE BLOCK", nesW / 2, nesH * 0.22 + 52, "#38d8f8", "center");
    if (Math.floor(blink * 2) % 2 === 0) {
      text(nctx, hasSave ? "TAP TO CONTINUE" : "PRESS START", nesW / 2, nesH * 0.22 + 84, "#f0c430", "center");
    }
    if (hasSave) text(nctx, "JUMP FOR A NEW BLOCK", nesW / 2, nesH * 0.22 + 104, "#8a8696", "center");
  }
}

function render() {
  snapView();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#07060c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  renderNes();
  ctx.drawImage(nes, 0, 0);
  syncHud();
}

function pulseFromRole(role, extra) {
  if (role === "act") pulses.act = true;
  if (role === "car") pulses.car = true;
  if (role === "phone") pulses.phone = true;
  if (role === "phone-close") ui = ui === "phone" ? null : ui;
  if (role === "crib") pulses.crib = true;
  if (role === "crib-close") ui = null;
  if (role === "crib-save") pulses.save = true;
  if (role === "crib-stash") pulses.stash = true;
  if (role === "pullover") pulses.pullover = true;
  if (role === "accept") pulses.accept = true;
  if (role === "stall") pulses.stall = true;
  if (role === "gear") pulses.gear = extra || null;
  if (role === "nes" || role === "act") pulses.start = true;
}

window.addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
  if (e.code === "Enter" || e.code === "Space") { pulses.start = true; pulses.act = true; }
  if (e.code === "KeyJ" || e.code === "KeyZ") pulses.act = true;
  if (e.code === "KeyY") pulses.car = true;
  if (e.code === "KeyC" || e.code === "KeyT") pulses.phone = true;
  if (e.code === "KeyX") pulses.crib = true;
  if (e.code === "Comma" || e.code === "KeyO") pulses.pullover = true;
  if (e.code === "KeyM") {
    BRAudio.toggleMute();
    syncHud();
  }
  const gk = { Digit1: "P", Digit2: "R", Digit3: "N", Digit4: "D" };
  if (gk[e.code]) pulses.gear = gk[e.code];
});
window.addEventListener("keyup", (e) => keys.delete(e.code));

function roleOf(el) {
  return el?.closest?.("[data-role]")?.dataset?.role || null;
}
document.getElementById("app").addEventListener("pointerdown", (e) => {
  const role = roleOf(e.target);
  if (!role) {
    if (e.target.closest("#game") && mode === "title") pulses.start = true;
    return;
  }
  holds.add(role);
  pulseFromRole(role, e.target.dataset.gear);
  try { e.target.setPointerCapture?.(e.pointerId); } catch { /* ignore */ }
  e.preventDefault();
});
document.getElementById("app").addEventListener("pointerup", (e) => {
  const role = roleOf(e.target);
  if (role) holds.delete(role);
});
document.getElementById("app").addEventListener("pointercancel", (e) => {
  const role = roleOf(e.target);
  if (role) holds.delete(role);
});
muteBtn.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  BRAudio.toggleMute();
  syncHud();
});
canvas.addEventListener("pointerdown", () => {
  if (mode === "title") pulses.start = true;
});

let last = performance.now();
let acc = 0;
function frame(now) {
  const raw = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += raw;
  while (acc >= STEP) {
    update(STEP);
    acc -= STEP;
  }
  render();
  requestAnimationFrame(frame);
}

if (new URLSearchParams(location.search).get("fresh") === "wipe") {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
hasSave = !!readSave();
BRAudio.bindUnlock();
if (BRAudio.isMuted()) muteBtn.classList.add("off");

window.__br = {
  getState: () => ({
    mode, inCar, cash, grams, stash, rep, order, ui,
    player: { ...player },
    car: { ...car },
    heroPx: HERO_SRC_H * spriteScale * cssScale,
    nesW, nesH, cssScale, spriteScale,
  }),
  start: () => beginPlay(false),
  finishIntro: () => { if (mode === "title") beginPlay(false); },
  setInCar: (on) => { if (on) { player.x = car.x; player.z = Math.max(player.z, Z_STREET_MIN); enterCar(true); } else leaveCar(); },
  setGear: (g) => { if (GEARS.includes(g)) car.gear = g; },
  tryShift: (g, brake) => tryShift(g, !!brake),
  setPlayerX: (x) => { player.x = wrap(Number(x) || 0, WORLD); },
  setCarX: (x) => { car.x = wrap(Number(x) || 0, WORLD); },
  setDepth: (z) => { player.z = Math.max(Z_WALK_MIN, Math.min(Z_STREET_MAX, Number(z) || 0)); },
  setGas: (on) => { testGas = !!on; },
  setBrake: (on) => { testBrake = !!on; },
  setHold: (role, on) => { if (on) holds.add(role); else holds.delete(role); },
  setMuted: (on) => BRAudio.setMuted(!!on),
  giveCash: (n) => { cash = Math.max(0, n); },
  setGrams: (n) => { grams = Math.max(0, n); },
  spawnOrder: () => rollOrder(),
  acceptOrder,
  persist,
  ready: false,
};

Promise.all([
  loadSheet("idle"),
  loadSheet("walk"),
  loadFrameList(HERO_WALK_FRAMES),
  loadSheet("thug"),
  loadSheet("runner"),
  loadDirSheet("walk-front"),
  loadDirSheet("walk-back"),
  loadImage(`../block-run/sprites/pack.png?v=${ASSET_V}`),
  loadImage(`../block-run/sprites/dumpster.png?v=${ASSET_V}`),
  loadImage(`../block-run/map/street.png?v=${ASSET_V}`),
]).then(([idle, walk, walkNew, thug, runner, walkFront, walkBack, pack, dumpster, street]) => {
  if (!idle || !thug || !runner || !pack || !dumpster) return;
  art = {
    idle, walk: walkNew || walk, walkNew: walkNew || walk, thug, runner, pack, dumpster, street,
    walkFront, walkBack,
    sedan: paintSedan("#c84818", true),
  };
  if (street) WORLD = street.naturalWidth * 3;
  window.__br.ready = true;
});
requestAnimationFrame(frame);
