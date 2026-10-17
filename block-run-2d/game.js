/* BLOCK RUN — classic night-street cart. NES 256×224, hard pixels. */
const ASSET_V = "21";
const BUILD_LABEL = "v21";
/** Sidewalk belt only — no up/down depth walk this pass. */
const SIDEWALK_Z = 0.28;
const RUN_MULT = 1.55;
const RIM_SET = "5spoke-option1-MAIN/silver";
const RIM_DIST = 4.6;
const STEP = 1 / 60;
const SAVE_KEY = "block-run-2d-v3";
const HERO_SRC_W = 40;
const HERO_SRC_H = 40;
const NES_W = 256;
const NES_H = 224;
/** Classic ground from block-run/map/street.png: tan sidewalk y=171–179, road below. */
const GROUND_Y = 179;
const SIDEWALK_BACK = 171;
const SIDEWALK_CURB = 179;
const ROAD_Y = 186;
const FACADE_Y = 86;
const STREET_SRC_W = 398;
const STREET_SRC_H = 224;
const SLICE_X = [0, 99, 190, 275, 398];
/** Baked lowrider in street.png — wipe a fat patch so no half-car ghosts remain. */
const CAR_ERASE = { x: 2, y: 148, w: 100, h: 42 };
const GEARS = ["P", "R", "N", "D"];
const WALK_FPS = 8;
/** Hero walk: walk14 (locked Oct 15 2026), 12 frames at 12.5 fps, native 40px. */
const HERO_WALK_FPS = 12.5;
/** Native px per frame so feet plant: 2.08 × 12.5 fps ≈ 26 px/s. */
const STRIDE_NATIVE = 2.08;
/** Frames live in sprites/walk14.js (data URIs, loaded before this script). */
const HERO_WALK_FRAMES = window.WALK14_FRAMES || [];
/** Chain overlay layer (sprites/chain24.js): drawn over each walk14 frame. Variants: pendant | plain. */
const HERO_CHAIN_VARIANT = "pendant";
const HERO_CHAIN_FRAMES = (window.WALK_CHAIN_FRAMES || {})[HERO_CHAIN_VARIANT] || [];
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
  { id: "taco", label: "TACO", t: 0.58 },
  { id: "motel", label: "MOTEL", t: 0.72 },
  { id: "alley", label: "ALLEY", t: 0.34 },
  { id: "park", label: "PARK", t: 0.66 },
];
const PLUG = { id: "plug", label: "PLUG", t: 0.40 };
const CRIB = { id: "crib", label: "CRIB", t: 0.26 };
const Z_WALK_MIN = 0.20;
const Z_WALK_MAX = 0.40;
const Z_STREET_MIN = 0.52;
const Z_STREET_MAX = 0.92;
const Z_CAR_PARK = 0.58;
const Z_CAR_DRIVE = 0.74;
const TURN_SPEED = 26;
const INTERSECT_REACH = 44;
const AXIS_LEN = 720;
const IX_T = [0.18, 0.50, 0.82];
const EW_STREETS = [
  { id: "sunset", name: "SUNSET", row: 0, style: "sunset" },
  { id: "santa_monica", name: "SANTA MONICA", row: 1, style: "blvd" },
  { id: "melrose", name: "MELROSE", row: 2, style: "shop" },
];
const NS_STREETS = [
  { id: "western", name: "WESTERN", col: 0, style: "ave" },
  { id: "normandie", name: "NORMANDIE", col: 1, style: "ave" },
  { id: "vermont", name: "VERMONT", col: 2, style: "ave" },
];
const LEFT_OF = { E: "N", N: "W", W: "S", S: "E" };
const RIGHT_OF = { E: "S", S: "W", W: "N", N: "E" };
/** 4-block grid: 3 east-west × 3 north-south. */
const STREET_DEFS = [
  ...EW_STREETS.map((ew) => ({
    id: ew.id, name: ew.name, axis: "ew", row: ew.row, style: ew.style,
    spots: ew.id === "sunset", length: AXIS_LEN,
    intersections: NS_STREETS.map((ns, i) => ({
      id: `${ew.id}-${ns.id}`, t: IX_T[i], cross: ns.id, crossName: ns.name, row: ew.row, col: ns.col,
    })),
  })),
  ...NS_STREETS.map((ns) => ({
    id: ns.id, name: ns.name, axis: "ns", col: ns.col, style: ns.style,
    spots: false, length: AXIS_LEN,
    intersections: EW_STREETS.map((ew, i) => ({
      id: `${ew.id}-${ns.id}`, t: IX_T[i], cross: ew.id, crossName: ew.name, row: ew.row, col: ns.col,
    })),
  })),
];
function walkSpeed() {
  return STRIDE_NATIVE * HERO_WALK_FPS * spriteScale;
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
let worldZoom = 1;
let worldY0 = 0;
let WORLD = 398 * 4;
let longStreet = null;
let streets = {};
let streetId = "sunset";
let heading = "E";
let turnLock = 0;
let prevTurnZ = 0;
let prevTurnX = 0;
let crossSpawnT = 5;
let art = null;
let mode = "title";
let ui = null;
let player = { x: 70, z: 0.28, vx: 0, vz: 0, facing: 1, anim: 0, moveDir: "side" };
let car = { x: 140, z: Z_CAR_PARK, vx: 0, facing: 1, gear: "P", parked: true, pullOverT: 0, shiftHint: 0, street: "sunset" };
let inCar = false;
let cash = START_CASH;
let grams = 0;
let stash = 0;
let rep = 0;
let hi = 0;
let order = null;
let phoneT = 0;
let pops = [];
let toast = { text: "", life: 0 };
let peds = [];
let traffic = [];
let cam = 0;
let blink = 0;
let buyerAnim = 0;
let hasSave = false;
let inbox = [];
const keys = new Set();
const holds = new Set();
let pulses = { act: false, jump: false, start: false, car: false, phone: false, crib: false, pullover: false, uturn: false, accept: false, stall: false, save: false, stash: false, gear: null, turn: null };
let rimFrames = [];
let trafficSheets = [];
let carOdo = 0;
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
function currentStreet() {
  return streets[streetId] || null;
}
function streetHasSpots() {
  return !!(currentStreet()?.spots);
}
function at(def) {
  if (!streetHasSpots()) return -1e9;
  return def.t * WORLD;
}
function meetById(id) {
  return MEETS.find((m) => m.id === id) || MEETS[0];
}
function speedNow() {
  return Math.abs(inCar ? car.vx : player.vx);
}
function alongMin() { return 0; }
function alongMax() { return Math.max(1, WORLD); }
/** Loop the block like classic / 2.5D — no hard left/right wall. */
function clampAlong(x) {
  return wrap(Number(x) || 0, Math.max(1, WORLD));
}
function applyHeading(h) {
  heading = h;
  const face = (h === "E" || h === "N") ? 1 : -1;
  player.facing = face;
  car.facing = face;
}
function syncHeadingFromFacing() {
  const st = currentStreet();
  const face = inCar ? car.facing : player.facing;
  if (st?.axis === "ns") heading = face > 0 ? "N" : "S";
  else heading = face > 0 ? "E" : "W";
}
function neighbor(ix, h) {
  if (!ix) return null;
  if (h === "E") return ix.col < 2 ? { street: EW_STREETS[ix.row].id, heading: "E" } : null;
  if (h === "W") return ix.col > 0 ? { street: EW_STREETS[ix.row].id, heading: "W" } : null;
  if (h === "N") return ix.row > 0 ? { street: NS_STREETS[ix.col].id, heading: "N" } : null;
  if (h === "S") return ix.row < 2 ? { street: NS_STREETS[ix.col].id, heading: "S" } : null;
  return null;
}
function exitsAt(ix, h) {
  if (!ix) return [];
  const out = [];
  const pack = (dir, nh) => {
    const n = neighbor(ix, nh);
    if (!n) return;
    const dest = streets[n.street];
    out.push({
      dir,
      street: n.street,
      heading: n.heading,
      label: dest ? dest.name : n.street,
      same: n.street === streetId,
    });
  };
  pack("straight", h);
  pack("left", LEFT_OF[h]);
  pack("right", RIGHT_OF[h]);
  return out;
}
function liveExits() {
  return exitsAt(nearIntersection(), heading);
}
function nearIntersection() {
  const st = currentStreet();
  if (!st) return null;
  const x = inCar ? car.x : player.x;
  let best = null;
  let bestD = INTERSECT_REACH;
  for (const ix of st.intersections) {
    const d = Math.abs(x - ix.x);
    if (d <= bestD) {
      bestD = d;
      best = ix;
    }
  }
  return best;
}
function enterStreet(id, x, viaCar, nextHeading, quiet) {
  const dest = streets[id];
  if (!dest) return false;
  streetId = id;
  WORLD = dest.length;
  longStreet = dest.strip;
  if (nextHeading) applyHeading(nextHeading);
  else syncHeadingFromFacing();
  const nx = clampAlong(Number(x) || alongMin());
  if (viaCar || inCar) {
    car.street = id;
    car.x = nx;
    car.vx = 0;
    player.x = nx;
    player.vx = 0;
  } else {
    player.x = nx;
    player.vx = 0;
  }
  spawnPeds();
  spawnTraffic();
  cam = Math.max(0, Math.min(Math.max(0, WORLD - nesW), player.x - nesW * 0.42));
  turnLock = quiet ? 0 : 0.45;
  if (!quiet) {
    addPop(player.x, player.z, dest.name);
    if (typeof BRAudio !== "undefined") BRAudio.sfx.shift();
  }
  return true;
}
function tryTurn(dir) {
  if (!dir || turnLock > 0) return false;
  if (dir === "up") dir = "straight";
  if (dir === "down") {
    const ex = liveExits();
    dir = ex.find((e) => e.dir === "straight") ? "straight" : (ex[0]?.dir || "");
  }
  const ix = nearIntersection();
  if (!ix) return false;
  if (speedNow() > TURN_SPEED) {
    addPop(player.x, player.z, "SLOW DOWN");
    return false;
  }
  const exit = exitsAt(ix, heading).find((e) => e.dir === dir);
  if (!exit) return false;
  const bump = (exit.heading === "E" || exit.heading === "N") ? 36 : -36;
  if (exit.same) {
    applyHeading(exit.heading);
    const nx = clampAlong((inCar ? car.x : player.x) + bump);
    player.x = nx;
    if (inCar) car.x = nx;
    turnLock = 0.4;
    addPop(player.x, player.z, "STRAIGHT");
    return true;
  }
  const dest = streets[exit.street];
  const destIx = dest.intersections.find((i) => i.id === ix.id) || dest.intersections[0];
  return enterStreet(exit.street, destIx.x + bump, inCar, exit.heading);
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
    paths.map((src) => loadImage(src.startsWith("data:") ? src : `${src}?v=${ASSET_V}`)),
  )).filter(Boolean);
  return frames.length ? frames : null;
}
async function loadLayeredFrames(base, over) {
  const [b, o] = await Promise.all([loadFrameList(base), over.length ? loadFrameList(over) : null]);
  if (!b || !o) return b;
  return b.map((img, i) => {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    if (o[i % o.length]) g.drawImage(o[i % o.length], 0, 0);
    return c;
  });
}
async function loadSheet(name, base = `../block-run/sprites/`) {
  return loadFrameList([1, 2, 3, 4].map((i) => `${base}${name}-${i}.png`));
}
/** Future belt-scroller facing sheets. Missing files stay null. */
async function loadDirSheet(name) {
  // No front/back art yet; skip the fetch so the console stays clean (no 404s).
  void name;
  return null;
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
      streetId, heading, carX: car.x, carZ: car.z, carFacing: car.facing, carStreet: car.street, order, inbox,
    }));
    hasSave = true;
  } catch { /* ignore */ }
}
function addPop(_x, _z, s) {
  toast = { text: String(s || ""), life: 0.95 };
}
function spawnPeds() {
  const n = streetHasSpots() ? 8 : 4;
  peds = Array.from({ length: n }, (_, i) => ({
    x: wrap((WORLD / n) * i + 24, WORLD),
    z: SIDEWALK_Z,
    facing: i % 2 ? -1 : 1,
    look: i % 2,
    anim: Math.random(),
    speed: 18 + (i % 3) * 6,
    mode: "walk",
    wantCross: false,
    crossT: 0,
    sheet: i % 2,
  }));
}
function alongDist(a, b) {
  return Math.abs(wrapDelta(a, b, Math.max(1, WORLD)));
}
function carComingNear(x) {
  const cars = [];
  if (car.street === streetId) cars.push(car);
  for (const t of traffic) cars.push(t);
  for (const c of cars) {
    const d = wrapDelta(x, c.x, Math.max(1, WORLD));
    const spd = Math.abs(c.vx);
    if (spd > 8 && ((c.vx > 0 && d > 0 && d < 110) || (c.vx < 0 && d < 0 && d > -110))) return true;
    if (spd > 4 && Math.abs(d) < 30) return true;
  }
  return false;
}
function carBlocksPed(x) {
  if (car.street === streetId && alongDist(car.x, x) < 48) return true;
  for (const t of traffic) {
    if (alongDist(t.x, x) < 48) return true;
  }
  return false;
}
function updatePeds(dt) {
  for (const ped of peds) {
    ped.anim += dt;
    ped.z = SIDEWALK_Z;
    /* No curb-crossing this pass — belt walkers only. Pass through each other. */
    if (carComingNear(ped.x) || carBlocksPed(ped.x)) {
      ped.mode = "wait";
      continue;
    }
    ped.mode = "walk";
    ped.x = clampAlong(ped.x + ped.facing * ped.speed * dt);
    if (Math.random() < 0.0012) ped.facing *= -1;
  }
}
function carClearOf(x, ignore) {
  const gap = 112;
  if (car.street === streetId && (!ignore || ignore !== car) && alongDist(car.x, x) < gap) return false;
  for (const t of traffic) {
    if (t === ignore) continue;
    if (alongDist(t.x, x) < gap) return false;
  }
  return true;
}
function updateTraffic(dt) {
  for (const t of traffic) {
    t.justTurned = Math.max(0, (t.justTurned || 0) - dt);
    const nx = t.x + t.vx * dt;
    if (!carClearOf(nx, t)) {
      t.vx *= Math.exp(-2.4 * dt);
      continue;
    }
    t.x = clampAlong(nx);
    t.odo = (t.odo || 0) + Math.abs(t.vx) * dt;
  }
  if (traffic.length > 2) traffic.length = 2;
  crossSpawnT -= dt;
  if (crossSpawnT <= 0) {
    crossSpawnT = 12 + Math.random() * 10;
    if (traffic.length < 2) {
      const dir = heading === "W" || heading === "S" ? -1 : 1;
      const x = clampAlong(car.x + dir * (220 + Math.random() * 80));
      if (carClearOf(x)) {
        traffic.push({
          x,
          z: Z_CAR_DRIVE,
          facing: dir,
          vx: dir * (34 + Math.random() * 14),
          justTurned: 0,
          odo: Math.random() * 40,
          tint: traffic.length % Math.max(1, trafficSheets.length),
        });
      }
    }
  }
}
function spawnTraffic() {
  traffic = [];
  const dir = heading === "W" || heading === "S" ? -1 : 1;
  const mid = clampAlong(car.x + dir * 180);
  if (carClearOf(mid)) {
    traffic.push({
      x: mid,
      z: Z_CAR_DRIVE,
      facing: dir,
      vx: dir * 40,
      justTurned: 0,
      odo: 0,
      tint: 0,
    });
  }
}
function fresh() {
  streetId = "sunset";
  heading = "E";
  WORLD = streets.sunset?.length || WORLD;
  longStreet = streets.sunset?.strip || longStreet;
  player = { x: at(CRIB) + 18, z: SIDEWALK_Z, vx: 0, vz: 0, facing: 1, anim: 0, moveDir: "side" };
  car = { x: at(CRIB) + 86, z: Z_CAR_PARK, vx: 0, facing: 1, gear: "P", parked: true, pullOverT: 0, shiftHint: 0, street: "sunset" };
  carOdo = 0;
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
  cam = Math.max(0, Math.min(Math.max(0, WORLD - nesW), player.x - nesW * 0.42));
  addPop(player.x, player.z, "COP A PACK");
}
function continueSave(s) {
  streetId = streets[s.streetId] ? s.streetId : "sunset";
  heading = ["E", "W", "N", "S"].includes(s.heading) ? s.heading : "E";
  WORLD = currentStreet()?.length || WORLD;
  longStreet = currentStreet()?.strip || longStreet;
  player = {
    x: clampAlong(s.x || at(CRIB)),
    z: clampWalkZ(s.z ?? 0.28),
    vx: 0, vz: 0,
    facing: s.facing === -1 ? -1 : 1,
    anim: 0, moveDir: "side",
  };
  car = {
    x: clampAlong(s.carX || at(CRIB) + 86),
    z: s.carZ ?? Z_CAR_PARK,
    vx: 0,
    facing: s.carFacing === -1 ? -1 : 1,
    gear: "P", parked: true, pullOverT: 0, shiftHint: 0,
    street: streets[s.carStreet] ? s.carStreet : streetId,
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
  cam = Math.max(0, Math.min(Math.max(0, WORLD - nesW), player.x - nesW * 0.42));
}
function closeTo(x) {
  return alongDist(inCar ? car.x : player.x, x) <= REACH;
}
function onWalk() {
  return true;
}
function nearCar() {
  return !inCar && car.street === streetId && alongDist(player.x, car.x) < 36;
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
  player.z = SIDEWALK_Z;
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
  player.z = SIDEWALK_Z;
  player.vx = 0;
  player.vz = 0;
  player.facing = car.facing;
  return true;
}
function tryShift(to, brakeOn) {
  if (!to || !GEARS.includes(to) || to === car.gear) return false;
  if (car.pullOverT > 0) return false;
  /* Mirror 2.5D: every gear change needs brake held. */
  if (!brakeOn) {
    car.shiftHint = 1.35;
    return false;
  }
  if (to === "P" && Math.abs(car.vx) > 18) {
    car.vx = 0;
    addPop(car.x, car.z, "CLUNK");
    BRAudio.sfx.hit();
  }
  const from = car.gear;
  if ((from === "R" && to === "D") || (from === "D" && to === "R")) {
    if (Math.abs(car.vx) > 22) {
      car.vx *= 0.28;
      addPop(car.x, car.z, "CLUNK");
      BRAudio.sfx.hit();
    }
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
  if (inCar) {
    if (carIsParked()) return leaveCar();
    return startPullOver();
  }
  if (nearCar()) return enterCar();
  return false;
}
function doUturn() {
  if (!inCar || car.gear !== "D" || car.pullOverT > 0) return false;
  if (Math.abs(car.vx) > 28) {
    addPop(car.x, car.z, "SLOW DOWN");
    return false;
  }
  car.facing *= -1;
  syncHeadingFromFacing();
  car.vx = 0;
  addPop(car.x, car.z, "U-TURN");
  BRAudio.sfx.shift();
  return true;
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
  if (keys.has("ArrowLeft") || keys.has("KeyA") || holds.has("left")) x -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD") || holds.has("right")) x += 1;
  return { x: Math.max(-1, Math.min(1, x)), z: 0 };
}
function runHeld() {
  return holds.has("run") || keys.has("ShiftLeft") || keys.has("KeyZ");
}
function gasHeld() {
  return testGas || holds.has("gas") || keys.has("KeyK") || keys.has("ShiftRight");
}
function brakeHeld() {
  return testBrake || holds.has("brake") || keys.has("KeyL") || keys.has("Slash") || keys.has("Space");
}

function streetDestY(srcY) {
  return Math.round((srcY - worldY0) * worldZoom);
}
function snapView() {
  const vw = Math.max(160, viewEl?.clientWidth || 375);
  const vh = Math.max(140, viewEl?.clientHeight || 400);
  spriteScale = 1;
  nesW = NES_W;
  cssScale = Math.max(0.5, vw / NES_W);
  nesH = Math.max(NES_H, Math.round(vh / cssScale));
  worldY0 = 12;
  const roadPad = 34;
  worldZoom = (nesH - roadPad) / Math.max(1, SIDEWALK_CURB - worldY0);
  if (nes.width !== nesW || nes.height !== nesH) {
    nes.width = nesW;
    nes.height = nesH;
  }
  canvas.width = nesW;
  canvas.height = nesH;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
}

function depthY(z) {
  const u = (clampWalkZ(z) - Z_WALK_MIN) / Math.max(0.001, Z_WALK_MAX - Z_WALK_MIN);
  return streetDestY(SIDEWALK_BACK + u * (SIDEWALK_CURB - SIDEWALK_BACK));
}
function sidewalkTop() {
  return streetDestY(SIDEWALK_BACK);
}
function sidewalkCurb() {
  return streetDestY(SIDEWALK_CURB);
}
function carGroundY() {
  return streetDestY((car.parked || car.gear === "P") ? SIDEWALK_CURB + 4 : ROAD_Y);
}
function clampWalkZ(z) {
  return Math.max(Z_WALK_MIN, Math.min(Z_WALK_MAX, Number(z) || Z_WALK_MIN));
}
function worldToScreen(wx) {
  return wrap(wx - cam, Math.max(1, WORLD));
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
function heroFrame(sheet) {
  if (!sheet || !sheet.length) return null;
  const fps = sheet === art.idle ? WALK_FPS : HERO_WALK_FPS;
  return sheet[Math.floor(player.anim * fps) % sheet.length];
}
function heroSheet() {
  const moving = Math.abs(player.vx) > 6 || Math.abs(player.vz) > 6;
  if (!moving) return art.idle;
  return pickWalkSheet(player.moveDir);
}

function blitFacing(img, sx, sy, dw, dh, facing) {
  nctx.save();
  nctx.translate(Math.round(sx), sy);
  nctx.scale(facing < 0 ? -1 : 1, 1);
  nctx.drawImage(img, -Math.round(dw / 2), -dh, dw, dh);
  nctx.restore();
}
function drawSprite(img, wx, z, w, h, facing, footPad = 0, yLock) {
  if (!img) return;
  const sy = (yLock != null ? yLock : depthY(z)) + Math.round(footPad);
  const dw = Math.round(w);
  const dh = Math.round(h);
  const sx = worldToScreen(wx);
  for (const x of [sx, sx - WORLD, sx + WORLD]) {
    if (x < -dw || x > nesW + dw) continue;
    blitFacing(img, x, sy, dw, dh, facing);
  }
}
function rimIndex(dist) {
  if (!rimFrames.length) return 0;
  const u = Math.abs(dist) / RIM_DIST;
  return Math.floor(u) % rimFrames.length;
}
function drawCarWithRims(base, wx, z, w, h, facing, yLock, odo) {
  drawSprite(base, wx, z, w, h, facing, 0, yLock);
  if (!rimFrames.length) return;
  const frame = rimFrames[rimIndex(odo)];
  if (!frame) return;
  drawSprite(frame, wx, z, w, h, facing, 0, yLock);
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

function px(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function mkCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  return { c, g };
}
function sliceW(i) {
  return SLICE_X[i + 1] - SLICE_X[i];
}
function eraseBakedCar(g, img, dx) {
  const { x, y, w, h } = CAR_ERASE;
  /* Patch from clean sidewalk / road samples so the baked car doesn't ghost. */
  const patchY = Math.min(y + h, STREET_SRC_H);
  g.drawImage(img, 110, 148, w, 23, dx + x, y, w, 23);
  g.drawImage(img, 110, 171, w, 9, dx + x, 171, w, 9);
  g.drawImage(img, 110, 180, w, Math.max(8, patchY - 180), dx + x, 180, w, Math.max(8, patchY - 180));
  g.drawImage(img, 200, 156, Math.min(24, w), 20, dx + x, 156, Math.min(24, w), 20);
}
function tintBuildings(canvas, mr, mg, mb) {
  if (mr === 1 && mg === 1 && mb === 1) return canvas;
  const g = canvas.getContext("2d");
  const id = g.getImageData(0, 0, canvas.width, canvas.height);
  const d = id.data;
  const w = canvas.width;
  for (let i = 0; i < d.length; i += 4) {
    const y = ((i >> 2) / w) | 0;
    if (y < FACADE_Y || y >= 171) continue;
    if (d[i + 3] < 10) continue;
    d[i] = Math.max(0, Math.min(255, d[i] * mr + 0.5));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] * mg + 0.5));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] * mb + 0.5));
  }
  g.putImageData(id, 0, 0);
  return canvas;
}
/*
 * Classic world inventory (block-run/ is not modified):
 *   map/street.png — sky, moon, skyline, brick, stucco, CALI wall, sidewalk, road, baked car
 *   sprites/car.png — purple lowrider
 * Classic blit from block-run/game.js Fe():
 *   drawImage(street, e, 0, 256, 224, 0, 0, 256, 224)
 *   if (e+256>o) drawImage(street, 0, 0, t, 224, 256-t, 0, t, 224)
 */
function blitClassic(g, src, e, sy, sh, dy) {
  if (!src) return;
  const o = src.width;
  const dw = nesW;
  const srcY = sy == null ? 0 : sy;
  const srcH = sh == null ? src.height : sh;
  const destY = dy == null ? streetDestY(srcY) : dy;
  const destH = Math.max(1, Math.round(srcH * worldZoom));
  const x = Math.max(0, Math.min(Math.max(0, o - dw), Math.round(e)));
  g.drawImage(src, x, srcY, dw, srcH, 0, destY, dw, destH);
  if (x + dw > o) {
    const t = x + dw - o;
    g.drawImage(src, 0, srcY, t, srcH, dw - t, destY, t, destH);
  }
}
function drawNightSky() {
  const src = art?.street;
  const top = streetDestY(FACADE_Y);
  if (!src) {
    nctx.fillStyle = "#0c011f";
    nctx.fillRect(0, 0, nesW, Math.max(1, top));
    return;
  }
  blitClassic(nctx, src, Math.round(cam * 0.14), worldY0, 56 - worldY0);
}
function drawClassicSkylineBand(scroll) {
  const src = art?.street;
  if (!src) return;
  blitClassic(nctx, src, scroll, 40, FACADE_Y - 40);
}
function drawDowntownSkyline() {
  const src = art?.street;
  drawClassicSkylineBand(Math.round(cam * 0.2) + 18);
  if (!src) return;
  const towers = [[18, 7, 22], [74, 6, 18], [140, 9, 16], [210, 5, 20], [300, 8, 14]];
  for (const [sx, tw, lift] of towers) {
    const dx = (sx * 2 + 36 + Math.round(cam * 0.2)) % Math.max(1, nesW);
    const dy = streetDestY(Math.max(18, 48 - lift));
    const dh = Math.round((38 + Math.min(14, lift)) * worldZoom);
    nctx.drawImage(src, sx, 48, tw, 38, dx, dy, tw, dh);
  }
}
function hillHeight(x, seed, baseH, amp1, amp2) {
  const t = x + seed;
  return Math.round(
    baseH
    + Math.sin(t * 0.027 + seed * 0.11) * amp1
    + Math.sin(t * 0.061 + 1.8) * amp2
    + Math.sin(t * 0.11 + seed * 0.4) * amp2 * 0.28,
  );
}
function drawHillLayer(base, seed, baseH, amp1, amp2, fill, shade, ridge) {
  for (let x = 0; x < nesW; x++) {
    const ht = Math.max(4, Math.round(hillHeight(x, seed, baseH, amp1, amp2) * worldZoom));
    const top = base - ht;
    for (let y = Math.max(0, top); y < base; y++) {
      const depth = y - top;
      let c = fill;
      if (depth <= 1) c = ridge;
      else if (depth <= 4 && ((x + y * 3) & 3) === 0) c = shade;
      else if (depth > ht * 0.62 && ((x + (y >> 1)) & 3) === 0) c = shade;
      px(nctx, x, y, 1, 1, c);
    }
  }
}
function drawHillsSkyline() {
  const base = streetDestY(FACADE_Y);
  const scroll = Math.round(cam * 0.08);
  drawHillLayer(base, scroll + 90, 26, 9, 4, "#160828", "#0c0418", "#2a1848");
  drawHillLayer(base, scroll + 40, 38, 12, 5, "#1c0a38", "#140828", "#3a2870");
  drawHillLayer(base, scroll + 8, 48, 14, 6, "#241040", "#1a0a34", "#5a4478");
  const lights = [
    [20, 12], [46, 18], [70, 11], [98, 20], [128, 14], [158, 19], [188, 13], [216, 17], [242, 12],
  ];
  for (const [lx, drop] of lights) {
    const x = ((lx + scroll) % nesW + nesW) % nesW;
    const ht = Math.round(hillHeight(x, scroll + 8, 48, 14, 6) * worldZoom);
    const y = base - ht + Math.round(drop * worldZoom * 0.35);
    if (y < 4 || y >= base - 3) continue;
    px(nctx, x, y, 1, 1, "#c8a830");
    if ((lx + drop) % 2 === 0) px(nctx, x + 3, y + 2, 1, 1, "#aca190");
  }
}
function drawWestSkyline() {
  drawClassicSkylineBand(Math.round(cam * 0.16) + 220);
}
function drawSouthSkyline() {
  drawClassicSkylineBand(Math.round(cam * 0.18) + 90);
  const y0 = streetDestY(58);
  nctx.fillStyle = "rgba(10,2,32,0.28)";
  nctx.fillRect(0, y0, nesW, Math.max(1, streetDestY(FACADE_Y) - y0));
}
function drawHeadingSky() {
  if (heading === "N") {
    const src = art?.street;
    nctx.fillStyle = "#0c011f";
    nctx.fillRect(0, 0, nesW, streetDestY(FACADE_Y));
    if (src) blitClassic(nctx, src, Math.round(cam * 0.1), 0, 36);
    drawHillsSkyline();
  } else {
    drawNightSky();
    if (heading === "E") drawDowntownSkyline();
    else if (heading === "W") drawWestSkyline();
    else drawSouthSkyline();
  }
}
function streetTint(style) {
  if (style === "blvd") return [0.92, 0.97, 1.08];
  if (style === "shop") return [1.08, 0.94, 0.90];
  if (style === "ave") return [0.86, 0.84, 0.96];
  return [1, 1, 1];
}
function streetPattern(def) {
  /* Longer strip + start/end on the same slice so the loop seam is less ugly. */
  if (def.id === "sunset") return [1, 2, 3, 1, 2, 0, 3, 1, 2, 3, 1, 2, 0, 3, 1];
  if (def.id === "santa_monica") return [1, 3, 0, 2, 3, 1, 0, 2, 1, 3, 0, 2, 1];
  if (def.id === "melrose") return [2, 0, 3, 1, 2, 3, 0, 1, 2, 0, 3, 1, 2];
  if (def.id === "western") return [3, 1, 0, 3, 1, 2, 3, 1, 0, 3, 1];
  if (def.id === "normandie") return [0, 3, 1, 2, 0, 3, 1, 2, 0, 3, 0];
  return [1, 0, 3, 2, 1, 0, 3, 2, 1];
}
function buildStreetStrip(def, streetImg) {
  const pattern = streetPattern(def);
  let width = 0;
  for (const i of pattern) width += sliceW(i);
  const { c, g } = mkCanvas(width, STREET_SRC_H);
  let x = 0;
  for (const i of pattern) {
    const sx = SLICE_X[i];
    const sw = sliceW(i);
    g.drawImage(streetImg, sx, 0, sw, STREET_SRC_H, x, 0, sw, STREET_SRC_H);
    if (i === 0) eraseBakedCar(g, streetImg, x);
    x += sw;
  }
  const tint = streetTint(def.style);
  tintBuildings(c, tint[0], tint[1], tint[2]);
  return c;
}
function bakeStreets(streetImg) {
  streets = {};
  for (const def of STREET_DEFS) {
    const strip = buildStreetStrip(def, streetImg);
    const length = strip.width;
    streets[def.id] = {
      ...def,
      strip,
      length,
      intersections: def.intersections.map((ix) => ({ ...ix, x: Math.round(ix.t * length) })),
    };
  }
}

function drawCurrentStreet() {
  nctx.imageSmoothingEnabled = false;
  const src = currentStreet()?.strip || longStreet || art?.street;
  nctx.fillStyle = "#0c011f";
  nctx.fillRect(0, 0, nesW, nesH);
  if (!src) return;
  const e = Math.max(0, Math.min(Math.max(0, src.width - nesW), Math.round(cam)));
  if (heading === "E" && streetId === "sunset") {
    blitClassic(nctx, src, e, worldY0, STREET_SRC_H - worldY0);
  } else {
    drawHeadingSky();
    blitClassic(nctx, src, e, FACADE_Y, STREET_SRC_H - FACADE_Y);
  }
}

function drawSignText(s, x, y, color) {
  nctx.font = "8px 'Press Start 2P', monospace";
  nctx.fillStyle = color;
  nctx.textAlign = "left";
  nctx.textBaseline = "top";
  nctx.fillText(s, Math.round(x), Math.round(y));
}
function signBladeWidth(name) {
  nctx.font = "8px 'Press Start 2P', monospace";
  const w = nctx.measureText(name).width;
  return Math.max(40, Math.ceil(w || name.length * 8) + 10);
}
function drawStreetSigns() {
  const st = currentStreet();
  const ix = nearIntersection();
  if (!st || !ix) return;
  nctx.imageSmoothingEnabled = false;
  nctx.font = "8px 'Press Start 2P', monospace";
  const blades = [
    { name: st.name, fill: "#2d8a4a" },
    { name: ix.crossName || "", fill: "#1f6a38" },
  ].filter((b) => b.name);
  const bw = Math.max(...blades.map((b) => signBladeWidth(b.name)));
  const baseY = streetDestY(SIDEWALK_CURB);
  const poleH = Math.round(40 * worldZoom);
  const heroSx = worldToScreen(inCar ? car.x : player.x);
  const heroL = heroSx - 40;
  const heroR = heroSx + 40;
  const clearOfHero = (left, right) => right < heroL - 4 || left > heroR + 4;
  const onScreen = (left, right) => left >= 2 && right <= nesW - 2;
  const candidates = [];
  for (const side of [-1, 1]) {
    const pole = Math.round(worldToScreen(ix.x + side * 36));
    const growLeft = side < 0;
    const bx = growLeft ? pole - bw : pole + 3;
    const sx = growLeft ? bx + bw : bx - 3;
    const left = Math.min(sx, bx);
    const right = Math.max(sx + 2, bx + bw);
    candidates.push({ sx, bx, left, right, ok: onScreen(left, right) && clearOfHero(left, right) });
  }
  let pick = candidates.find((c) => c.ok);
  if (!pick) {
    const roomLeft = heroL - 6;
    const roomRight = nesW - 2 - (heroR + 6);
    if (roomLeft >= bw && roomLeft >= roomRight) {
      pick = { sx: Math.round(heroL - 6), bx: Math.round(heroL - 6 - bw) };
    } else {
      pick = { sx: Math.round(heroR + 6), bx: Math.round(heroR + 9) };
    }
    pick.bx = Math.max(2, Math.min(nesW - 2 - bw, pick.bx));
    pick.sx = pick.bx < pick.sx ? pick.bx + bw : pick.bx - 3;
  }
  const { sx, bx } = pick;
  nctx.fillStyle = "#3a3844";
  nctx.fillRect(sx, baseY - poleH, 2, poleH);
  nctx.fillStyle = "#8a8894";
  nctx.fillRect(sx, baseY - poleH, 1, poleH);
  blades.forEach((blade, i) => {
    const by = baseY - poleH + 2 + i * 11;
    nctx.fillStyle = "#0a180c";
    nctx.fillRect(bx - 1, by - 1, bw + 2, 11);
    nctx.fillStyle = blade.fill;
    nctx.fillRect(bx, by, bw, 9);
    drawSignText(blade.name, bx + 4, by + 1, "#f8f4e8");
  });
}

function drawParallax() {
  drawCurrentStreet();
}

function drawActors() {
  const actors = [];
  if (art) {
    if (streetHasSpots()) {
      const plugImg = art.thug[0];
      actors.push({ z: SIDEWALK_Z - 0.02, draw: () => drawPerson(plugImg, at(PLUG), SIDEWALK_Z, 1) });
    }
    for (const ped of peds) {
      const sheet = ped.look ? art.runner : art.thug;
      const img = sheet[Math.floor(ped.anim * WALK_FPS) % sheet.length];
      actors.push({ z: SIDEWALK_Z, draw: () => drawPerson(img, ped.x, SIDEWALK_Z, ped.facing) });
    }
    if (streetHasSpots() && order && order.phase === "active") {
      const spot = meetById(order.spot);
      const sheet = NAMES.indexOf(order.name) % 2 === 0 ? art.thug : art.runner;
      const img = sheet[Math.floor(buyerAnim * WALK_FPS) % sheet.length];
      const face = wrapDelta(player.x, at(spot), WORLD) >= 0 ? 1 : -1;
      actors.push({ z: SIDEWALK_Z, draw: () => drawPerson(img, at(spot), SIDEWALK_Z, face) });
    }
    const ride = art.car;
    const carW = (ride?.naturalWidth || ride?.width || 95) * spriteScale;
    const carH = (ride?.naturalHeight || ride?.height || 29) * spriteScale;
    for (const t of traffic) {
      const body = trafficSheets[t.tint|0] || ride;
      actors.push({
        z: 0.9,
        draw: () => drawCarWithRims(body, t.x, t.z, carW, carH, t.facing, streetDestY(ROAD_Y), t.odo || 0),
      });
    }
    if (car.street === streetId) {
      actors.push({
        z: 0.85,
        draw: () => {
          drawCarWithRims(ride, car.x, car.z, carW, carH, car.facing, carGroundY(), carOdo);
          if (inCar && art.driver) drawSprite(art.driver, car.x, car.z, carW, carH, car.facing, 0, carGroundY());
        },
      });
    }
    if (!inCar) {
      const sheet = heroSheet();
      const img = heroFrame(sheet);
      actors.push({
        z: SIDEWALK_Z + 0.01,
        draw: () => {
          drawPerson(img, player.x, SIDEWALK_Z, player.facing);
          if (grams > 0) drawSprite(art.pack, player.x, SIDEWALK_Z, 12 * spriteScale, 12 * spriteScale, 1);
        },
      });
    }
  }
  actors.sort((a, b) => a.z - b.z);
  for (const a of actors) a.draw();
  if (mode === "play" && streetHasSpots() && !inCar) {
    const near = (wx) => alongDist(player.x, wx) < 54;
    if (near(at(CRIB))) drawLabel(at(CRIB), 0.12, "CRIB", "#e81818");
    if (near(at(PLUG))) drawLabel(at(PLUG), 0.12, "PLUG", "#f0c430");
    if (order && order.phase === "active") {
      const m = meetById(order.spot);
      if (m) drawLabel(at(m), 0.12, m.label, "#38d8f8");
    }
  }
}

function syncHud() {
  padFoot.classList.toggle("hidden", mode === "play" && inCar);
  padCar.classList.toggle("hidden", !(mode === "play" && inCar));
  phoneEl.classList.toggle("hidden", ui !== "phone");
  cribEl.classList.toggle("hidden", ui !== "crib");
  muteBtn.classList.toggle("off", BRAudio.isMuted());
  muteBtn.setAttribute("aria-label", BRAudio.isMuted() ? "sound off" : "sound on");
  document.querySelectorAll(".gear").forEach((el) => el.classList.toggle("on", el.dataset.gear === car.gear));
  shiftHint.classList.toggle("show", inCar && car.shiftHint > 0);
  const carLabel = document.getElementById("btn-car-label");
  if (carLabel) carLabel.textContent = nearCar() ? "CAR" : "CAR";
  const exitLabel = document.getElementById("btn-exit-label");
  if (exitLabel) exitLabel.textContent = carIsParked() ? "EXIT" : "PULL";
  const uturnBtn = document.getElementById("btn-uturn");
  const uturnOk = !!(inCar && car.gear === "D" && Math.abs(car.vx) < 28 && car.pullOverT <= 0);
  if (uturnBtn) {
    uturnBtn.classList.toggle("off", !uturnOk);
    uturnBtn.disabled = !uturnOk;
  }
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
  if (role === "run") return runHeld();
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
  const uturnPulse = pulses.uturn;
  const gearPulse = pulses.gear;
  const acceptPulse = pulses.accept;
  const stallPulse = pulses.stall;
  const savePulse = pulses.save;
  const stashPulse = pulses.stash;
  pulses = { act: false, jump: false, start: false, car: false, phone: false, crib: false, pullover: false, uturn: false, accept: false, stall: false, save: false, stash: false, gear: null, turn: null };

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
  if (uturnPulse) doUturn();
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
      if (ax.x < 0) { car.facing = -1; syncHeadingFromFacing(); }
      if (ax.x > 0) { car.facing = 1; syncHeadingFromFacing(); }
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
    const prevX = car.x;
    car.x = clampAlong(car.x + car.vx * dt);
    carOdo += alongDist(prevX, car.x);
    if (!car.parked && car.gear !== "P") car.z = Z_CAR_DRIVE;
    player.x = car.x;
    player.z = SIDEWALK_Z;
    player.vx = car.vx;
    player.facing = car.facing;
    BRAudio.setEngine("drive", Math.abs(car.vx) / CAR_MAX);
  } else {
    BRAudio.setEngine("off");
    if (ax.x < 0) player.facing = -1;
    if (ax.x > 0) player.facing = 1;
    if (ax.x) syncHeadingFromFacing();
    const spd = walkSpeed() * (runHeld() ? RUN_MULT : 1);
    player.vx = ax.x * spd;
    player.vz = 0;
    player.moveDir = "side";
    let nx = clampAlong(player.x + player.vx * dt);
    /* Soft body vs parked whip — slide past, don't eat the sprite. */
    if (car.street === streetId && carIsParked() && alongDist(nx, car.x) < 34) {
      const side = Math.sign(wrapDelta(car.x, nx, WORLD) || player.facing || 1);
      nx = clampAlong(car.x + side * 34);
    }
    player.x = nx;
    player.z = SIDEWALK_Z;
    if (Math.abs(ax.x) > 0) player.anim += dt * (runHeld() ? RUN_MULT : 1);
    else player.anim = 0;
  }

  buyerAnim += dt;
  updatePeds(dt);
  updateTraffic(dt);
  if (!order && grams > 0) {
    phoneT -= dt;
    if (phoneT <= 0) rollOrder();
  }
  if (toast.life > 0) toast.life -= dt;
  if (toast.life <= 0) toast.text = "";
  const follow = inCar ? car.x : player.x;
  const target = clampAlong(follow - nesW * 0.42);
  cam = clampAlong(cam + wrapDelta(cam, target, WORLD) * (1 - Math.exp(-7 * dt)));
}

function renderNes() {
  nctx.imageSmoothingEnabled = false;
  drawParallax();
  /* Street-sign popups shelved — not the look we want. */
  if (mode === "play") drawActors();
  nctx.font = "8px 'Press Start 2P', monospace";
  if (mode === "play") {
    text(nctx, "$" + String(Math.floor(cash)).padStart(4, "0"), 8, 6, "#f0c430");
    text(nctx, fmtG(grams) + "G", Math.round(nesW * 0.36), 6, grams > 0 ? "#38f070" : "#8a8696");
    text(nctx, BUILD_LABEL, Math.round(nesW * 0.52), 6, "#8a8696");
    text(nctx, "R" + rep, nesW - 22, 6, "#f8f8f8");
  }
  if (toast.life > 0 && toast.text) {
    const msg = toast.text;
    const tw = Math.min(nesW - 20, msg.length * 8 + 14);
    const tx = Math.round((nesW - tw) / 2);
    const ty = Math.min(nesH - 16, streetDestY(ROAD_Y) + 6);
    nctx.fillStyle = "rgba(7,6,12,0.78)";
    nctx.fillRect(tx, ty, tw, 13);
    text(nctx, msg, nesW / 2, ty + 3, "#f8f8f8", "center");
  }
  if (mode === "title") {
    nctx.fillStyle = "rgba(7,6,12,0.78)";
    nctx.fillRect(0, 0, nesW, nesH);
    nctx.font = "16px 'Press Start 2P', monospace";
    text(nctx, "BLOCK", nesW / 2, nesH * 0.28, "#f8f8f8", "center");
    text(nctx, "RUN", nesW / 2, nesH * 0.28 + 22, "#e81818", "center");
    nctx.font = "8px 'Press Start 2P', monospace";
    text(nctx, "DRIVE THE BLOCK", nesW / 2, nesH * 0.28 + 52, "#38d8f8", "center");
    if (Math.floor(blink * 2) % 2 === 0) {
      text(nctx, hasSave ? "TAP TO CONTINUE" : "PRESS START", nesW / 2, nesH * 0.28 + 84, "#f0c430", "center");
    }
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
  if (role === "uturn") pulses.uturn = true;
  if (role === "accept") pulses.accept = true;
  if (role === "stall") pulses.stall = true;
  if (role === "gear") pulses.gear = extra || null;
  if (role === "turn") pulses.turn = extra || null;
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
/** pointerId → role so brake stays held while the other thumb taps gears. */
const holdPointers = new Map();
function gearFromClientY(clientY) {
  const track = document.getElementById("shift-track");
  if (!track) return null;
  const r = track.getBoundingClientRect();
  if (r.height <= 0) return null;
  const u = Math.max(0, Math.min(0.999, (clientY - r.top) / r.height));
  return GEARS[Math.floor(u * GEARS.length)] || null;
}
function rebuildHolds() {
  holds.clear();
  for (const role of holdPointers.values()) {
    if (role && role !== "shifter" && role !== "gear") holds.add(role);
    if (role === "brake" || role === "gas") holds.add(role);
  }
}
const shifterDrag = new Map();
document.getElementById("app").addEventListener("pointerdown", (e) => {
  let role = roleOf(e.target);
  if (!role) {
    if (e.target.closest("#game") && mode === "title") pulses.start = true;
    return;
  }
  let gear = e.target.dataset.gear || null;
  if (role === "shifter" || role === "gear") {
    gear = gearFromClientY(e.clientY) || gear;
    holdPointers.set(e.pointerId, "shifter");
    shifterDrag.set(e.pointerId, { gear, moved: false, startY: e.clientY });
    /* Tap a letter = commit now; slide commits on release. */
    if (role === "gear" && gear) pulses.gear = gear;
  } else {
    holdPointers.set(e.pointerId, role);
    pulseFromRole(role, gear || e.target.dataset.dir);
  }
  rebuildHolds();
  try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* ignore */ }
  e.preventDefault();
});
document.getElementById("app").addEventListener("pointermove", (e) => {
  const drag = shifterDrag.get(e.pointerId);
  if (!drag) return;
  if (Math.abs(e.clientY - drag.startY) > 6) drag.moved = true;
  drag.gear = gearFromClientY(e.clientY) || drag.gear;
});
function endPointer(e) {
  const drag = shifterDrag.get(e.pointerId);
  if (drag) {
    const gear = gearFromClientY(e.clientY) || drag.gear;
    if (drag.moved && gear) pulses.gear = gear;
    shifterDrag.delete(e.pointerId);
  }
  holdPointers.delete(e.pointerId);
  rebuildHolds();
}
document.getElementById("app").addEventListener("pointerup", endPointer);
document.getElementById("app").addEventListener("pointercancel", endPointer);
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
    streetId,
    streetName: currentStreet()?.name || "",
    heading,
    plugX: streetHasSpots() ? at(PLUG) : 0,
    cribX: streetHasSpots() ? at(CRIB) : 0,
    orderX: order && streetHasSpots() ? at(meetById(order.spot)) : 0,
    intersectX: currentStreet()?.intersections[0]?.x || 0,
    intersectIds: (currentStreet()?.intersections || []).map((i) => i.id),
    exits: liveExits().map((e) => e.dir + ":" + e.label),
    canTurn: !!(nearIntersection() && speedNow() <= TURN_SPEED && turnLock <= 0),
    hasStreet: !!currentStreet()?.strip,
    hasCar: !!art?.car,
  }),
  start: () => beginPlay(false),
  finishIntro: () => { if (mode === "title") beginPlay(false); },
  setInCar: (on) => { if (on) { player.x = car.x; player.z = Math.max(player.z, Z_STREET_MIN); enterCar(true); } else leaveCar(); },
  setGear: (g) => { if (GEARS.includes(g)) car.gear = g; },
  tryShift: (g, brake) => tryShift(g, !!brake),
  setPlayerX: (x) => { player.x = clampAlong(Number(x) || 0); },
  setCarX: (x) => { car.x = clampAlong(Number(x) || 0); },
  setHeading: (h) => { if (["E", "W", "N", "S"].includes(h)) applyHeading(h); },
  setDepth: (z) => { player.z = inCar ? Math.max(Z_STREET_MIN, Math.min(Z_STREET_MAX, Number(z) || 0)) : clampWalkZ(z); },
  ground: () => {
    const sheet = art ? heroSheet() : null;
    const img = sheet ? heroFrame(sheet) : null;
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
  tryTurn,
  setStreet: (id, x, h) => enterStreet(id, x ?? player.x, inCar, h, true),
  setIntersect: (id) => {
    const ix = currentStreet()?.intersections.find((i) => i.id === id) || currentStreet()?.intersections[0];
    if (!ix) return null;
    player.x = ix.x;
    if (inCar) car.x = ix.x;
    return ix.id;
  },
  ready: false,
};

function tintCar(img, color) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = "source-over";
  return c;
}
async function loadRimFrames() {
  const sets = window.RIM_ALTERNATES?.sets || {};
  const list = sets[RIM_SET] || sets.current || Object.values(sets)[0];
  if (!list?.length) return [];
  const frames = await Promise.all(list.map((src) => loadImage(src)));
  return frames.filter(Boolean);
}

Promise.all([
  loadSheet("idle"),
  loadSheet("walk"),
  loadLayeredFrames(HERO_WALK_FRAMES, HERO_CHAIN_FRAMES),
  loadSheet("thug"),
  loadSheet("runner"),
  loadDirSheet("walk-front"),
  loadDirSheet("walk-back"),
  loadImage(`../block-run/sprites/pack.png?v=${ASSET_V}`),
  loadImage(`sprites/car.png?v=${ASSET_V}`),
  loadImage(`map/street.png?v=${ASSET_V}`),
  window.DRIVER_OVERLAY ? loadImage(window.DRIVER_OVERLAY) : null,
  loadRimFrames(),
]).then(([idle, walk, walkNew, thug, runner, walkFront, walkBack, pack, carImg, streetImg, driverImg, rims]) => {
  if (!idle || !thug || !runner || !pack || !carImg || !streetImg) return;
  bakeStreets(streetImg);
  streetId = "sunset";
  heading = "E";
  longStreet = streets.sunset.strip;
  WORLD = streets.sunset.length;
  rimFrames = rims || [];
  trafficSheets = [
    tintCar(carImg, "rgba(40, 90, 140, 0.45)"),
    tintCar(carImg, "rgba(140, 50, 40, 0.42)"),
    tintCar(carImg, "rgba(40, 110, 70, 0.40)"),
    tintCar(carImg, "rgba(120, 120, 40, 0.38)"),
  ];
  art = {
    idle, walk: walkNew || walk, walkNew: walkNew || walk, thug, runner, pack,
    walkFront, walkBack,
    car: carImg,
    sedan: carImg,
    street: streetImg,
    driver: driverImg,
  };
  window.__br.ready = true;
});
requestAnimationFrame(frame);
