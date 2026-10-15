/* BLOCK RUN — classic night-street cart. NES 256×224, hard pixels. */
const ASSET_V = "10";
const STEP = 1 / 60;
const SAVE_KEY = "block-run-2d-v2";
const HERO_SRC_W = 40;
const HERO_SRC_H = 40;
const NES_W = 256;
const NES_H = 224;
/** Classic ground line from block-run (sprite feet at y=198 on the 224 canvas). */
const GROUND_Y = 198;
const SIDEWALK_BACK = 186;
const SIDEWALK_CURB = 198;
const ROAD_Y = 208;
const GEARS = ["P", "R", "N", "D"];
const WALK_FPS = 8;
const STRIDE_NATIVE = 4.5;
/** Hero walk sheet. One path list, any length. Standing still uses classic idle. */
const HERO_WALK_FRAMES = [
  "sprites/walk4-1.png",
  "sprites/walk4-2.png",
  "sprites/walk4-3.png",
  "sprites/walk4-4.png",
];
const WALK_Z = 52;
const REACH = 28;
const HALF_G = 14;
const HALF_COST = 100;
const START_CASH = 130;
const GRAM_PAY = 14;
const MAX_G = 56;
const SALES = [20, 40, 60];
const CAR_ACCEL = 140;
const CAR_MAX = 120;
const CAR_CREEP = 22;
const CAR_STOP = 8;
const NAMES = ["DEZ", "MARI", "KILO", "NIA", "JUNO"];
const MEETS = [
  { id: "taco", label: "TACO", t: 0.56 },
  { id: "motel", label: "MOTEL", t: 0.8 },
  { id: "alley", label: "ALLEY", t: 0.36 },
  { id: "park", label: "PARK", t: 0.94 },
];
const PLUG = { id: "plug", label: "PLUG", t: 0.2 };
const CRIB = { id: "crib", label: "CRIB", t: 0.06 };
const Z_WALK_MIN = 0.20;
const Z_WALK_MAX = 0.40;
const Z_STREET_MIN = 0.52;
const Z_STREET_MAX = 0.92;
const Z_CAR_PARK = 0.58;
const Z_CAR_DRIVE = 0.74;
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

let nesW = NES_W;
let nesH = NES_H;
let cssScale = 1;
let spriteScale = 1;
let WORLD = 398 * 4;
let longStreet = null;
let art = null;
let mode = "title";
let ui = null;
let player = { x: 70, z: 0.28, vx: 0, vz: 0, facing: 1, anim: 0, moveDir: "side" };
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
    z: clampWalkZ(0.22 + (i % 3) * 0.06),
    facing: i % 2 ? -1 : 1,
    look: i % 2,
    anim: Math.random(),
    speed: 18 + (i % 3) * 6,
  }));
}
function spawnTraffic() {
  traffic = [0, 1].map((i) => ({
    x: wrap((WORLD / 3) * (i + 1) + 180, WORLD),
    z: Z_CAR_DRIVE,
    facing: i % 2 ? -1 : 1,
    vx: (i % 2 ? -1 : 1) * 48,
  }));
}
function fresh() {
  player = { x: at(CRIB) + 18, z: 0.28, vx: 0, vz: 0, facing: 1, anim: 0, moveDir: "side" };
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
    z: clampWalkZ(s.z ?? 0.28),
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
  return player.z <= Z_WALK_MAX + 0.02;
}
function nearCar() {
  return !inCar && Math.abs(wrapDelta(player.x, car.x, WORLD)) < 36;
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
  player.z = Z_WALK_MAX;
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
  nesW = NES_W;
  nesH = NES_H;
  spriteScale = 1;
  // Classic letterbox: fit 256×224 into the view, hard pixels, same framing as block-run/.
  cssScale = Math.max(0.5, Math.min(vw / NES_W, vh / NES_H));
  if (nes.width !== NES_W || nes.height !== NES_H) {
    nes.width = NES_W;
    nes.height = NES_H;
  }
  canvas.width = NES_W;
  canvas.height = NES_H;
  canvas.style.width = Math.round(NES_W * cssScale) + "px";
  canvas.style.height = Math.round(NES_H * cssScale) + "px";
}

function depthY(z) {
  const u = (clampWalkZ(z) - Z_WALK_MIN) / Math.max(0.001, Z_WALK_MAX - Z_WALK_MIN);
  return Math.round(SIDEWALK_BACK + u * (SIDEWALK_CURB - SIDEWALK_BACK));
}
function sidewalkTop() {
  return SIDEWALK_BACK;
}
function sidewalkCurb() {
  return SIDEWALK_CURB;
}
function carGroundY() {
  return (car.parked || car.gear === "P") ? SIDEWALK_CURB : ROAD_Y;
}
function clampWalkZ(z) {
  return Math.max(Z_WALK_MIN, Math.min(Z_WALK_MAX, Number(z) || Z_WALK_MIN));
}
function worldToScreen(wx) {
  return wrapDelta(cam, wx, WORLD);
}

const footPadCache = new WeakMap();
function opaqueFootPad(img) {
  if (!img) return 0;
  if (footPadCache.has(img)) return footPadCache.get(img);
  const w = img.naturalWidth || img.width || HERO_SRC_W;
  const h = img.naturalHeight || img.height || HERO_SRC_H;
  let pad = 0;
  try {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.drawImage(img, 0, 0);
    const data = g.getImageData(0, 0, w, h).data;
    let last = 0;
    for (let y = h - 1; y >= 0; y--) {
      let hit = false;
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 12) { hit = true; break; }
      }
      if (hit) { last = y; break; }
    }
    pad = h - 1 - last;
  } catch { pad = 0; }
  footPadCache.set(img, pad);
  return pad;
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

function drawSprite(img, wx, z, w, h, facing, footPad = 0, yLock) {
  if (!img) return;
  const sx = worldToScreen(wx);
  const sy = (yLock != null ? yLock : depthY(z)) + Math.round(footPad);
  const dw = Math.round(w);
  const dh = Math.round(h);
  if (sx < -dw || sx > nesW + dw) return;
  nctx.save();
  nctx.translate(Math.round(sx), sy);
  nctx.scale(facing < 0 ? -1 : 1, 1);
  nctx.drawImage(img, -Math.round(dw / 2), -dh, dw, dh);
  nctx.restore();
}
function drawPerson(img, wx, z, facing) {
  if (!img) return;
  const nw = (img.naturalWidth || img.width || HERO_SRC_W) * spriteScale;
  const nh = (img.naturalHeight || img.height || HERO_SRC_H) * spriteScale;
  drawSprite(img, wx, z, nw, nh, facing, opaqueFootPad(img) * spriteScale);
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

/** Classic street blit, copied from block-run/: wrap a 256×224 window of the strip. */
function drawClassicStreet() {
  const src = longStreet || art?.street;
  if (!src) {
    nctx.fillStyle = "#0c011f";
    nctx.fillRect(0, 0, NES_W, NES_H);
    return;
  }
  const o = src.width || src.naturalWidth || 398;
  let e = Math.round(cam);
  e = ((e % o) + o) % o;
  nctx.imageSmoothingEnabled = false;
  nctx.drawImage(src, e, 0, NES_W, NES_H, 0, 0, NES_W, NES_H);
  if (e + NES_W > o) {
    const t = e + NES_W - o;
    nctx.drawImage(src, 0, 0, t, NES_H, NES_W - t, 0, t, NES_H);
  }
}

/** Tile classic building slices in varied order so the strip is long, not a single copy-paste. */
function buildLongStreet(src) {
  const sw = src.naturalWidth || src.width;
  const sh = src.naturalHeight || src.height || NES_H;
  const pieces = [[0, 99], [99, 190], [190, 275], [275, sw]];
  const pattern = [
    [0, 1, 2, 3],
    [2, 0, 3, 1],
    [3, 2, 1, 0],
    [1, 3, 0, 2],
  ];
  const seq = pattern.flat();
  let total = 0;
  for (const i of seq) total += pieces[i][1] - pieces[i][0];
  const c = document.createElement("canvas");
  c.width = total;
  c.height = NES_H;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  let x = 0;
  for (const i of seq) {
    const [a, b] = pieces[i];
    g.drawImage(src, a, 0, b - a, sh, x, 0, b - a, NES_H);
    x += b - a;
  }
  return c;
}

function drawParallax() {
  drawClassicStreet();
}

function drawActors() {
  const actors = [];
  if (art) {
    {
      const plugSheet = art.thug;
      const plugImg = plugSheet[0];
      actors.push({ z: Z_WALK_MIN + 0.04, draw: () => drawPerson(plugImg, at(PLUG), clampWalkZ(0.26), 1) });
    }
    for (const ped of peds) {
      const sheet = ped.look ? art.runner : art.thug;
      const img = sheet[Math.floor(ped.anim * WALK_FPS) % sheet.length];
      actors.push({ z: ped.z, draw: () => drawPerson(img, ped.x, ped.z, ped.facing) });
    }
    if (order && order.phase === "active") {
      const spot = meetById(order.spot);
      const sheet = NAMES.indexOf(order.name) % 2 === 0 ? art.thug : art.runner;
      const img = sheet[Math.floor(buyerAnim * WALK_FPS) % sheet.length];
      const face = wrapDelta(at(spot), player.x, WORLD) >= 0 ? 1 : -1;
      const bz = clampWalkZ(0.30);
      actors.push({ z: bz, draw: () => drawPerson(img, at(spot), bz, face) });
    }
    const ride = art.car;
    const carW = (ride?.naturalWidth || ride?.width || 95) * spriteScale;
    const carH = (ride?.naturalHeight || ride?.height || 29) * spriteScale;
    for (const t of traffic) {
      actors.push({
        z: 0.9,
        draw: () => drawSprite(ride, t.x, t.z, carW, carH, t.facing, 0, ROAD_Y),
      });
    }
    actors.push({
      z: 0.85,
      draw: () => drawSprite(ride, car.x, car.z, carW, carH, car.facing, 0, carGroundY()),
    });
    if (!inCar) {
      const sheet = heroSheet();
      const img = sheet[Math.floor(player.anim * WALK_FPS) % sheet.length];
      actors.push({
        z: player.z,
        draw: () => {
          drawPerson(img, player.x, player.z, player.facing);
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
  muteBtn.textContent = BRAudio.isMuted() ? "SOUND: OFF" : "SOUND: ON";
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
    player.z = clampWalkZ(player.z + (player.vz / 80) * dt);
    if (Math.abs(ax.x) > 0 || Math.abs(ax.z) > 0) player.anim += dt;
    else player.anim = 0;
    if (jump && player.z < Z_STREET_MIN) {
      /* jump reserved; belt-scroller stays grounded */
    }
  }

  buyerAnim += dt;
  for (const ped of peds) {
    ped.x = wrap(ped.x + ped.facing * ped.speed * dt, WORLD);
    ped.z = clampWalkZ(ped.z);
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

{
  const freshFlag = new URLSearchParams(location.search).get("fresh");
  if (freshFlag === "wipe" || freshFlag === "clear") {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  }
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
    world: WORLD,
    plugX: at(PLUG),
    cribX: at(CRIB),
    orderX: order ? at(meetById(order.spot)) : 0,
    hasStreet: !!(longStreet || art?.street),
    hasCar: !!art?.car,
  }),
  start: () => beginPlay(false),
  finishIntro: () => { if (mode === "title") beginPlay(false); },
  setInCar: (on) => { if (on) { player.x = car.x; player.z = Math.max(player.z, Z_STREET_MIN); enterCar(true); } else leaveCar(); },
  setGear: (g) => { if (GEARS.includes(g)) car.gear = g; },
  tryShift: (g, brake) => tryShift(g, !!brake),
  setPlayerX: (x) => { player.x = wrap(Number(x) || 0, WORLD); },
  setCarX: (x) => { car.x = wrap(Number(x) || 0, WORLD); },
  setDepth: (z) => { player.z = inCar ? Math.max(Z_STREET_MIN, Math.min(Z_STREET_MAX, Number(z) || 0)) : clampWalkZ(z); },
  ground: () => {
    const sheet = art ? heroSheet() : null;
    const img = sheet ? sheet[Math.floor(player.anim * WALK_FPS) % sheet.length] : null;
    const pad = img ? opaqueFootPad(img) * spriteScale : 0;
    return {
      z: player.z,
      walkY: sidewalkTop(),
      curbY: sidewalkCurb(),
      streetY: depthY(0.55),
      footY: depthY(player.z),
      footPad: pad,
      zMin: Z_WALK_MIN,
      zMax: Z_WALK_MAX,
    };
  },
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
  loadImage(`map/street.png?v=${ASSET_V}`),
  loadImage(`sprites/car.png?v=${ASSET_V}`),
]).then(([idle, walk, walkNew, thug, runner, walkFront, walkBack, pack, street, carImg]) => {
  if (!idle || !thug || !runner || !pack || !street || !carImg) return;
  longStreet = buildLongStreet(street);
  WORLD = longStreet.width;
  art = {
    idle, walk: walkNew || walk, walkNew: walkNew || walk, thug, runner, pack, street,
    walkFront, walkBack,
    car: carImg,
    sedan: carImg,
  };
  window.__br.ready = true;
});
requestAnimationFrame(frame);
