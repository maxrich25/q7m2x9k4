/* BLOCK RUN — classic night-street cart. NES 256×224, hard pixels. */
const ASSET_V = "25";
const BUILD_LABEL = "v25";
/** Sidewalk belt only — no up/down depth walk this pass. */
const SIDEWALK_Z = 0.28;
const RUN_MULT = 2.45;
const RIM_SET = "5spoke-option1-MAIN/silver";
const RIM_DIST = 4.6;
/**
 * US right-hand traffic (side view, sidewalk above the road):
 * facing east (+) → near/bottom lane; facing west (−) → far/top lane.
 * Park sits in the street gutter — never up on the sidewalk.
 */
const Z_LANE_NEAR = 0.88;
const Z_LANE_FAR = 0.72;
const Z_CURB_NEAR = 0.80;
const Z_CURB_FAR = 0.66;
/** Classic car.png / rim sheets face LEFT; draw with this flip vs logical facing. */
const CAR_ART_FACE = -1;
const CAR_TURN_TIME = 1.0;
const PULL_OVER_T = 1.15;
const PULL_OUT_T = 0.85;
/** Auto park climb D→N→R→P after curb settle (mirrors 2.5D). */
const PARK_SHIFT_T = 0.55;
function laneZ(facing) {
  return (facing >= 0 ? Z_LANE_NEAR : Z_LANE_FAR);
}
function curbZ(facing) {
  return (facing >= 0 ? Z_CURB_NEAR : Z_CURB_FAR);
}
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
const CAR_CREEP = 22; /* auto creep in D/R when off the brake — like 2.5D / real life */
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
const pauseEl = document.getElementById("pause");
const menuBtn = document.getElementById("btn-menu");
const soundBtn = document.getElementById("btn-sound");
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
/** Static sky + skyline (does not scroll). */
let skyBg = null;
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
let car = {
  x: 140, z: curbZ(1), vx: 0, facing: 1, gear: "P", parked: true,
  pullOverT: 0, pullOutT: 0, shiftT: 0, shiftHint: 0, street: "sunset",
  turnT: 0, turnFrom: 1, turnTo: -1, pendingPullOut: null,
};
let inCar = false;
let cash = START_CASH;
let grams = 0;
let white = 0;
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
let carOdo = 0;
/** Unwrapped scroll so moon/skyline don't jump when the block loops. */
let camScroll = 0;
/** Live shifter position while the thumb slides (visual only until commit). */
let shiftPreview = null;
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
      cash, grams, white, stash, rep, hi, x: player.x, z: player.z, facing: player.facing,
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
  if (car.street === streetId && !carIsParked() && Math.abs(car.vx) > 20) cars.push(car);
  for (const t of traffic) {
    if (Math.abs(t.vx) > 20) cars.push(t);
  }
  for (const c of cars) {
    const d = wrapDelta(x, c.x, Math.max(1, WORLD));
    /* Only freeze when a car is actually bearing down on this ped. */
    if ((c.vx > 0 && d > 0 && d < 90) || (c.vx < 0 && d < 0 && d > -90)) return true;
  }
  return false;
}
function carBlocksPed(x) {
  for (const t of traffic) {
    if (Math.abs(t.vx) > 24 && alongDist(t.x, x) < 28) return true;
  }
  if (car.street === streetId && !carIsParked() && Math.abs(car.vx) > 24 && alongDist(car.x, x) < 28) {
    return true;
  }
  return false;
}
function updatePeds(dt) {
  for (const ped of peds) {
    ped.anim += dt;
    ped.z = SIDEWALK_Z;
    if (carComingNear(ped.x) || carBlocksPed(ped.x)) {
      ped.mode = "wait";
      continue;
    }
    ped.mode = "walk";
    ped.x = clampAlong(ped.x + ped.facing * ped.speed * dt);
    /* Rare turnarounds — constant flipping looked like a glitch. */
    if (Math.random() < 0.00025) ped.facing *= -1;
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
function trafficDir() {
  /* Cruise with the player's nose — never spawn head-on ambushes. */
  return car.facing >= 0 ? 1 : -1;
}
function updateTraffic(dt) {
  /* No clone whip while you're on foot / parked. */
  if (!inCar || carIsParked() || car.gear === "P") {
    traffic = [];
    crossSpawnT = 10;
    return;
  }
  const dir = trafficDir();
  for (let i = traffic.length - 1; i >= 0; i--) {
    const t = traffic[i];
    t.justTurned = Math.max(0, (t.justTurned || 0) - dt);
    const want = t.cruise || dir * 44;
    t.facing = Math.sign(want) || dir;
    t.vx += (want - t.vx) * Math.min(1, dt * 1.4);
    const nx = t.x + t.vx * dt;
    if (!carClearOf(nx, t)) {
      /* Stuck on the player = despawn, don't camp as a parked clone. */
      if (alongDist(t.x, car.x) < 160) {
        traffic.splice(i, 1);
        continue;
      }
      t.vx *= Math.exp(-1.6 * dt);
      continue;
    }
    t.x = clampAlong(nx);
    t.odo = (t.odo || 0) + Math.abs(t.vx) * dt;
    /* Drifted off-screen behind — recycle later. */
    if (alongDist(t.x, car.x) > WORLD * 0.45) traffic.splice(i, 1);
  }
  if (traffic.length > 1) traffic.length = 1;
  crossSpawnT -= dt;
  if (crossSpawnT <= 0) {
    crossSpawnT = 22 + Math.random() * 16;
    if (traffic.length < 1 && Math.abs(car.vx) > 20) {
      /* Ahead, cruising their own speed — not stalking from behind. */
      const x = clampAlong(car.x + dir * (420 + Math.random() * 180));
      if (carClearOf(x) && alongDist(x, car.x) > 300) {
        const spd = dir * (38 + Math.random() * 16);
        traffic.push({
          x,
          z: laneZ(dir),
          facing: dir,
          vx: spd,
          cruise: spd,
          justTurned: 0,
          odo: Math.random() * 40,
        });
      }
    }
  }
}
function spawnTraffic() {
  traffic = [];
  crossSpawnT = 8 + Math.random() * 6;
}
function fresh() {
  streetId = "sunset";
  heading = "E";
  WORLD = streets.sunset?.length || WORLD;
  longStreet = streets.sunset?.strip || longStreet;
  player = { x: at(CRIB) + 18, z: SIDEWALK_Z, vx: 0, vz: 0, facing: 1, anim: 0, moveDir: "side" };
  car = {
    x: at(CRIB) + 86, z: curbZ(1), vx: 0, facing: 1, gear: "P", parked: true,
    pullOverT: 0, pullOutT: 0, shiftT: 0, shiftHint: 0, street: "sunset",
    turnT: 0, turnFrom: 1, turnTo: -1, pendingPullOut: null,
  };
  carOdo = 0;
  inCar = false;
  cash = START_CASH;
  grams = 0;
  white = 0;
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
  const face = s.carFacing === -1 ? -1 : 1;
  car = {
    x: clampAlong(s.carX || at(CRIB) + 86),
    z: curbZ(face),
    vx: 0,
    facing: face,
    gear: "P", parked: true, pullOverT: 0, pullOutT: 0, shiftT: 0, shiftHint: 0,
    street: streets[s.carStreet] ? s.carStreet : streetId,
    turnT: 0, turnFrom: 1, turnTo: -1, pendingPullOut: null,
  };
  inCar = false;
  cash = s.cash;
  grams = s.grams || 0;
  white = s.white || 0;
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
  car.z = curbZ(car.facing);
  car.turnT = 0;
  car.pullOverT = 0;
  car.pullOutT = 0;
  car.shiftT = 0;
  car.pendingPullOut = null;
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
  car.z = curbZ(car.facing);
  car.pendingPullOut = null;
  car.pullOutT = 0;
  car.shiftT = 0;
  player.x = car.x;
  player.z = SIDEWALK_Z;
  player.vx = 0;
  player.vz = 0;
  player.facing = car.facing;
  return true;
}
function tryShift(to, brakeOn) {
  if (!to || !GEARS.includes(to) || to === car.gear) return false;
  if (car.pullOverT > 0 || car.pullOutT > 0 || car.shiftT > 0 || car.turnT > 0) return false;
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
  car.pendingPullOut = null;
  const onCurb = Math.abs(car.z - curbZ(car.facing)) < 0.08 || car.parked;
  if ((to === "D" || to === "R") && onCurb) {
    /* Leave the curb after brake release — no snap into the lane. */
    car.parked = false;
    car.pendingPullOut = to;
  } else if (to !== "P") {
    car.parked = false;
  } else if (Math.abs(car.vx) < CAR_STOP) {
    car.parked = true;
    car.z = curbZ(car.facing);
  }
  BRAudio.sfx.shift();
  return true;
}
function startPullOver() {
  if (!inCar || car.parked || car.pullOverT > 0 || car.pullOutT > 0 || car.shiftT > 0 || car.turnT > 0) {
    return false;
  }
  if (car.gear !== "D") {
    addPop(car.x, car.z, "DRIVE");
    return false;
  }
  car.pullOverT = PULL_OVER_T;
  car.pendingPullOut = null;
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
  if (!inCar || car.gear !== "D" || car.pullOverT > 0 || car.shiftT > 0 || car.turnT > 0) return false;
  if (Math.abs(car.vx) > 48) {
    addPop(car.x, car.z, "SLOW DOWN");
    return false;
  }
  car.turnT = CAR_TURN_TIME;
  car.turnFrom = car.facing >= 0 ? 1 : -1;
  car.turnTo = -car.turnFrom;
  car.parked = false;
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
  /* Locked NES 256×224 — never stretch the world to the phone height. */
  const rect = viewEl?.getBoundingClientRect?.();
  const style = viewEl ? getComputedStyle(viewEl) : null;
  const padX = style
    ? (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0)
    : 0;
  const padY = style
    ? (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0)
    : 0;
  const vw = Math.max(160, (rect?.width || viewEl?.clientWidth || 375) - padX);
  const vh = Math.max(140, (rect?.height || viewEl?.clientHeight || 400) - padY);
  spriteScale = 1;
  nesW = NES_W;
  nesH = NES_H;
  worldY0 = 0;
  worldZoom = 1;
  cssScale = Math.min(vw / nesW, vh / nesH);
  if (nes.width !== nesW || nes.height !== nesH) {
    nes.width = nesW;
    nes.height = nesH;
  }
  if (canvas.width !== nesW || canvas.height !== nesH) {
    canvas.width = nesW;
    canvas.height = nesH;
  }
  const dw = Math.max(1, Math.floor(nesW * cssScale));
  const dh = Math.max(1, Math.floor(nesH * cssScale));
  canvas.style.width = dw + "px";
  canvas.style.height = dh + "px";
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
function roadSrcY(facing, parked) {
  const face = facing >= 0 ? 1 : -1;
  if (parked) {
    /* Street gutter on asphalt — below the tan sidewalk belt (171–179). */
    return face > 0 ? 188 : 186;
  }
  /* US right-hand: eastbound near/bottom, westbound far/top of the road. */
  return face > 0 ? 204 : 194;
}
function carGroundY() {
  const face = car.facing >= 0 ? 1 : -1;
  const parkY = roadSrcY(face, true);
  const driveY = roadSrcY(face, false);
  if (car.shiftT > 0) return streetDestY(parkY);
  if (car.pullOutT > 0) {
    const u = 1 - Math.min(1, car.pullOutT / PULL_OUT_T);
    const s = u * u * (3 - 2 * u);
    return streetDestY(parkY + (driveY - parkY) * s);
  }
  if (car.pullOverT > 0) {
    const u = 1 - Math.min(1, car.pullOverT / PULL_OVER_T);
    const s = u * u * (3 - 2 * u);
    return streetDestY(driveY + (parkY - driveY) * s);
  }
  if (car.turnT > 0) {
    const u = 1 - Math.min(1, car.turnT / CAR_TURN_TIME);
    const s = u * u * (3 - 2 * u);
    const fromY = roadSrcY(car.turnFrom, false);
    const toY = roadSrcY(car.turnTo, false);
    const bob = Math.sin(u * Math.PI) * 4;
    return streetDestY(fromY + (toY - fromY) * s - bob);
  }
  return streetDestY((car.parked || car.gear === "P") ? parkY : driveY);
}
function trafficGroundY(facing) {
  return streetDestY(roadSrcY(facing, false));
}
function clampWalkZ(z) {
  return Math.max(Z_WALK_MIN, Math.min(Z_WALK_MAX, Number(z) || Z_WALK_MIN));
}
function worldToScreen(wx) {
  /* Signed offset from camera left-edge, wrapped to nearest copy. */
  return wrapDelta(cam, wx, Math.max(1, WORLD));
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
function rimIndex(dist, facing) {
  if (!rimFrames.length) return 0;
  let u = Math.floor(Math.abs(dist) / RIM_DIST) % rimFrames.length;
  /* Sheets authored for left-moving cars; reverse sequence when nose is right. */
  if (facing > 0) u = (rimFrames.length - 1 - u + rimFrames.length) % rimFrames.length;
  return u;
}
function carDrawFace(facing) {
  return (facing >= 0 ? 1 : -1) * CAR_ART_FACE;
}
function drawCarWithRims(base, wx, z, w, h, facing, yLock, odo) {
  const artFace = carDrawFace(facing);
  /* Composite rims inside the car alpha so nothing reads as a black slab / smog. */
  const bw = base.naturalWidth || base.width || 95;
  const bh = base.naturalHeight || base.height || 29;
  const { c, g } = mkCanvas(bw, bh);
  g.drawImage(base, 0, 0);
  if (rimFrames.length) {
    const frame = rimFrames[rimIndex(odo, facing)];
    if (frame) {
      g.globalCompositeOperation = "source-atop";
      g.drawImage(frame, 0, 0);
      g.globalCompositeOperation = "source-over";
    }
  }
  drawSprite(c, wx, z, w, h, artFace, 0, yLock);
}
/** Drop near-black junk outside the wheel hubs so overlays can't read as hood smog. */
function cleanRimFrame(img) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return img;
  const { c, g } = mkCanvas(w, h);
  g.drawImage(img, 0, 0);
  let id;
  try { id = g.getImageData(0, 0, w, h); } catch { return img; }
  const d = id.data;
  const hubs = [[14, 22], [69, 22]];
  const r2 = 10 * 10;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] < 8) continue;
      let inHub = false;
      for (const [hx, hy] of hubs) {
        const dx = x - hx;
        const dy = y - hy;
        if (dx * dx + dy * dy <= r2) { inHub = true; break; }
      }
      if (!inHub || y < 17) d[i + 3] = 0;
    }
  }
  g.putImageData(id, 0, 0);
  return c;
}
/** Soften the flat black roof/underbody slab so the whip isn't a glorified rectangle. */
function cleanCarSheet(img) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return img;
  const { c, g } = mkCanvas(w, h);
  g.drawImage(img, 0, 0);
  let id;
  try { id = g.getImageData(0, 0, w, h); } catch { return img; }
  const d = id.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = d[i + 3];
      if (a < 10) continue;
      const sum = d[i] + d[i + 1] + d[i + 2];
      /* Top slab / underbody void — punch out pure black that isn't purple body. */
      if (sum < 36 && (y <= 3 || y >= h - 2)) {
        d[i + 3] = 0;
        continue;
      }
      if (sum < 42 && y <= 5) {
        /* Lift near-black roof toward deep purple so it doesn't read as smog. */
        d[i] = Math.max(d[i], 48);
        d[i + 1] = Math.max(d[i + 1], 28);
        d[i + 2] = Math.max(d[i + 2], 72);
      }
    }
  }
  g.putImageData(id, 0, 0);
  return c;
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
  let x = Math.round(e);
  x = ((x % o) + o) % o;
  const first = Math.min(dw, o - x);
  g.drawImage(src, x, srcY, first, srcH, 0, destY, first, destH);
  if (first < dw) {
    g.drawImage(src, 0, srcY, dw - first, srcH, first, destY, dw - first, destH);
  }
}
function drawStaticSky() {
  /* Sky + skyline + moon stay put — we're not circling the city. */
  const top = FACADE_Y;
  if (!skyBg) {
    nctx.fillStyle = "#0c011f";
    nctx.fillRect(0, 0, nesW, top);
    return;
  }
  /* Fixed crop: one moon, no wrap. Clamp so we never sample past the edge. */
  const sx = Math.max(0, Math.min(skyBg.width - nesW, 40));
  nctx.drawImage(skyBg, sx, 0, nesW, top, 0, 0, nesW, top);
}
function drawNightSky() { drawStaticSky(); }
function drawClassicSkylineBand() { /* skyline is inside static skyBg */ }
function drawDowntownSkyline() { drawStaticSky(); }
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
  const scroll = Math.round(camScroll * 0.08);
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
function drawWestSkyline() { drawStaticSky(); }
function drawSouthSkyline() { drawStaticSky(); }
function drawHeadingSky() {
  if (heading === "N") {
    drawStaticSky();
    /* Soft hills sit under the static skyline — also non-scrolling. */
    const base = FACADE_Y;
    drawHillLayer(base, 40, 26, 9, 4, "#160828", "#0c0418", "#2a1848");
    drawHillLayer(base, 12, 38, 12, 5, "#1c0a38", "#140828", "#3a2870");
  } else {
    drawStaticSky();
  }
}
function streetTint(style) {
  if (style === "blvd") return [0.92, 0.97, 1.08];
  if (style === "shop") return [1.08, 0.94, 0.90];
  if (style === "ave") return [0.86, 0.84, 0.96];
  return [1, 1, 1];
}
function patchCali(g, streetImg, dx) {
  /* CALI stamp sits ~x180–240 on street.png — cover with a clean brick slice. */
  g.drawImage(streetImg, 250, 92, 100, 68, dx + 170, 92, 100, 68);
}
/** Punch sky/skyline above the facade so palm tops can scroll over a static backdrop. */
function punchBackdropTops(canvas, top) {
  const g = canvas.getContext("2d");
  const id = g.getImageData(0, 0, canvas.width, top);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 10) continue;
    const r = d[i];
    const gv = d[i + 1];
    const b = d[i + 2];
    /* Never keep moon / stars — those stay on the static skyBg only. */
    const bright = r + gv + b > 480;
    const pale = Math.max(r, gv, b) - Math.min(r, gv, b) < 50 && Math.max(r, gv, b) > 160;
    if (bright || pale) {
      d[i + 3] = 0;
      continue;
    }
    /* Keep palm fronds + warm roof tips; drop sky + distant skyline. */
    const palm = gv > r + 8 && gv > b + 5 && gv > 40;
    const warm = r > gv + 15 && r > b + 10 && r > 70 && gv > 35 && r < 200;
    if (!(palm || warm)) d[i + 3] = 0;
  }
  g.putImageData(id, 0, 0);
}
function buildStreetStrip(def, streetImg) {
  /*
   * Foreground (facade + palms + sidewalk + road), tiled.
   * Sky/skyline live in skyBg and never scroll; palm tops stay in this strip.
   */
  const copies = def.id === "sunset" ? 10 : 7;
  const width = STREET_SRC_W * copies;
  const { c, g } = mkCanvas(width, STREET_SRC_H);
  for (let i = 0; i < copies; i++) {
    const x = i * STREET_SRC_W;
    g.drawImage(streetImg, 0, 0, STREET_SRC_W, STREET_SRC_H, x, 0, STREET_SRC_W, STREET_SRC_H);
    eraseBakedCar(g, streetImg, x);
    /* One CALI wall is enough — cover the stamp on every tiled copy. */
    patchCali(g, streetImg, x);
  }
  const tint = streetTint(def.style);
  tintBuildings(c, tint[0], tint[1], tint[2]);
  punchBackdropTops(c, FACADE_Y);
  return c;
}
function bakeSkyBg(streetImg) {
  const { c, g } = mkCanvas(STREET_SRC_W, FACADE_Y);
  g.drawImage(streetImg, 0, 0, STREET_SRC_W, FACADE_Y, 0, 0, STREET_SRC_W, FACADE_Y);
  return c;
}
function bakeStreets(streetImg) {
  skyBg = bakeSkyBg(streetImg);
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
  drawHeadingSky();
  if (!src) return;
  /* Full strip: transparent tops over static sky so palms don't chop. */
  blitClassic(nctx, src, Math.round(cam), 0, STREET_SRC_H);
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
      actors.push({
        z: t.z,
        draw: () => drawCarWithRims(ride, t.x, t.z, carW, carH, t.facing, trafficGroundY(t.facing), t.odo || 0),
      });
    }
    if (car.street === streetId) {
      actors.push({
        z: 0.85,
        draw: () => {
          drawCarWithRims(ride, car.x, car.z, carW, carH, car.facing, carGroundY(), carOdo);
          if (inCar && art.driver) {
            drawSprite(art.driver, car.x, car.z, carW, carH, carDrawFace(car.facing), 0, carGroundY());
          }
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
  const driving = mode === "play" && inCar;
  const onTitle = mode === "title";
  const paused = mode === "paused";
  document.body.classList.toggle("title-open", onTitle);
  document.getElementById("pad")?.classList.toggle("title-hide", onTitle || paused);
  document.getElementById("pad")?.classList.toggle("driving", driving && !paused);
  padFoot.classList.toggle("hidden", driving || onTitle || paused);
  padCar.classList.toggle("hidden", !driving || onTitle || paused);
  phoneEl.classList.toggle("hidden", ui !== "phone" || paused);
  cribEl.classList.toggle("hidden", ui !== "crib" || paused);
  pauseEl?.classList.toggle("hidden", !paused);
  if (soundBtn) {
    soundBtn.textContent = BRAudio.isMuted() ? "SOUND OFF" : "SOUND ON";
    soundBtn.classList.toggle("off", BRAudio.isMuted());
    soundBtn.setAttribute("aria-label", BRAudio.isMuted() ? "sound off" : "sound on");
  }
  if (menuBtn) {
    menuBtn.classList.toggle("hidden", onTitle);
    menuBtn.textContent = paused ? "MENU" : "MENU";
  }
  const meta = document.getElementById("pause-meta");
  if (meta) meta.textContent = BUILD_LABEL;
  const showGear = (driving && shiftPreview) || car.gear;
  document.querySelectorAll(".gear").forEach((el) => el.classList.toggle("on", el.dataset.gear === showGear));
  if (shiftHint) {
    shiftHint.classList.toggle("hidden", !(driving && car.shiftHint > 0));
    shiftHint.classList.toggle("show", driving && car.shiftHint > 0);
  }
  const carLabel = document.getElementById("btn-car-label");
  const actLabel = document.getElementById("btn-action-label");
  const bLabel = document.getElementById("btn-b-label");
  const actBtn = document.getElementById("btn-action");
  const bBtn = document.getElementById("btn-b");
  const uturnOk = !!(driving && car.gear === "D" && Math.abs(car.vx) < 48
    && car.pullOverT <= 0 && car.pullOutT <= 0 && car.shiftT <= 0
    && car.turnT <= 0 && !car.pendingPullOut);
  if (driving) {
    if (carLabel) carLabel.textContent = carIsParked() ? "EXIT" : "PULL";
    if (bLabel) bLabel.textContent = "";
    if (bBtn) {
      bBtn.classList.add("off");
      bBtn.dataset.role = "run";
    }
    if (actLabel) actLabel.textContent = uturnOk ? "U-TN" : "";
    if (actBtn) {
      actBtn.dataset.role = "uturn";
      actBtn.classList.toggle("off", !uturnOk);
    }
  } else {
    if (carLabel) carLabel.textContent = "CAR";
    if (bLabel) bLabel.textContent = "RUN";
    if (bBtn) {
      bBtn.classList.remove("off");
      bBtn.dataset.role = "run";
    }
    if (actLabel) actLabel.textContent = "ACT";
    if (actBtn) {
      actBtn.dataset.role = "act";
      actBtn.classList.remove("off");
    }
  }
  const knob = document.getElementById("shift-knob");
  const rail = document.getElementById("shift-rail");
  if (knob && rail) {
    const idx = Math.max(0, GEARS.indexOf(showGear));
    const rh = Math.max(1, rail.clientHeight - 12);
    knob.style.top = `${(idx / Math.max(1, GEARS.length - 1)) * rh}px`;
    knob.classList.toggle("preview", !!(driving && shiftPreview && shiftPreview !== car.gear));
  }
  document.getElementById("phone-cash").textContent = "CASH $" + String(Math.floor(cash)).padStart(4, "0");
  document.getElementById("phone-inv").textContent =
    "GRN " + fmtG(grams) + "  WHT " + fmtG(white) + "  STASH $" + Math.floor(stash);
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
  document.querySelectorAll("#pad [data-role]").forEach((el) => {
    const role = el.dataset.role;
    if (role === "gas") el.classList.toggle("on", gasHeld());
    else if (role === "brake") el.classList.toggle("on", brakeHeld());
    else el.classList.toggle("on", held.has(role) || keysHasRole(role));
  });
}
function keysHasRole(role) {
  if (role === "left") return keys.has("ArrowLeft") || keys.has("KeyA");
  if (role === "right") return keys.has("ArrowRight") || keys.has("KeyD");
  if (role === "run") return runHeld();
  return false;
}

function togglePause() {
  if (mode === "play") {
    mode = "paused";
    ui = null;
    BRAudio.setEngine("off");
    return true;
  }
  if (mode === "paused") {
    mode = "play";
    return true;
  }
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

  if (mode === "paused") {
    BRAudio.setEngine("off");
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
    if (car.pendingPullOut && !brake && car.pullOverT <= 0 && car.pullOutT <= 0
      && car.shiftT <= 0 && car.turnT <= 0) {
      car.pullOutT = PULL_OUT_T;
      car.pendingPullOut = null;
      car.parked = false;
    }
    if (car.shiftT > 0) {
      /* Brake on, stick climbs D → N → R → P like 2.5D. */
      car.shiftT = Math.max(0, car.shiftT - dt);
      car.vx = 0;
      car.parked = true;
      car.z = curbZ(car.facing);
      const seq = ["D", "N", "R", "P"];
      const u = 1 - car.shiftT / PARK_SHIFT_T;
      car.gear = seq[Math.min(seq.length - 1, Math.floor(u * seq.length))];
      gas = false;
      brake = true;
      if (car.shiftT <= 0) {
        car.gear = "P";
        car.parked = true;
        addPop(car.x, car.z, "PARKED");
      }
    } else if (car.turnT > 0) {
      car.turnT = Math.max(0, car.turnT - dt);
      const u = 1 - car.turnT / CAR_TURN_TIME;
      /* Hold old nose through the first half, then show the new one. */
      car.facing = u < 0.55 ? car.turnFrom : car.turnTo;
      const along = Math.cos(u * Math.PI) * car.turnFrom;
      car.vx = along * 36;
      gas = false;
      brake = false;
      if (car.turnT <= 0) {
        car.facing = car.turnTo;
        car.vx = car.facing * Math.max(18, Math.abs(car.vx));
        syncHeadingFromFacing();
        car.z = laneZ(car.facing);
      } else {
        const fromZ = laneZ(car.turnFrom);
        const toZ = laneZ(car.turnTo);
        car.z = fromZ + (toZ - fromZ) * (u * u * (3 - 2 * u));
      }
    } else if (car.pullOutT > 0) {
      car.pullOutT = Math.max(0, car.pullOutT - dt);
      const u = 1 - car.pullOutT / PULL_OUT_T;
      const s = u * u * (3 - 2 * u);
      const dir = (car.gear === "R" ? -1 : 1) * (car.facing >= 0 ? 1 : -1);
      car.vx = dir * (10 + 28 * Math.sin(Math.min(1, u) * Math.PI));
      gas = false;
      car.z = curbZ(car.facing) + (laneZ(car.facing) - curbZ(car.facing)) * s;
      if (car.pullOutT <= 0) {
        car.z = laneZ(car.facing);
        car.vx = dir * Math.max(20, Math.abs(car.vx));
      }
    } else if (car.pullOverT > 0) {
      /* Hold brake mid-pull to freeze; release continues with creep into the gutter. */
      if (brake) {
        car.vx = 0;
        gas = false;
        const uHold = 1 - car.pullOverT / PULL_OVER_T;
        const s = uHold * uHold * (3 - 2 * uHold);
        car.z = laneZ(car.facing) + (curbZ(car.facing) - laneZ(car.facing)) * s;
      } else {
        car.pullOverT = Math.max(0, car.pullOverT - dt);
        const u = 1 - car.pullOverT / PULL_OVER_T;
        const s = u * u * (3 - 2 * u);
        car.z = laneZ(car.facing) + (curbZ(car.facing) - laneZ(car.facing)) * s;
        gas = false;
        brake = u > 0.55;
        const driveDir = car.facing >= 0 ? 1 : -1;
        const pullCreep = 28 * Math.sin(Math.min(1, u) * Math.PI);
        const want = driveDir * pullCreep;
        car.vx += (want - car.vx) * Math.min(1, dt * 3);
        if (car.pullOverT <= 0) {
          car.vx = 0;
          car.parked = true;
          car.z = curbZ(car.facing);
          car.gear = "D";
          car.shiftT = PARK_SHIFT_T;
        }
      }
    } else if (car.gear === "P") {
      car.vx = 0;
      if (ax.x < 0) { car.facing = -1; syncHeadingFromFacing(); car.z = curbZ(car.facing); }
      if (ax.x > 0) { car.facing = 1; syncHeadingFromFacing(); car.z = curbZ(car.facing); }
    } else if (car.gear === "N") {
      car.vx *= Math.exp(-1.2 * dt);
      if (brake) car.vx *= Math.exp(-4 * dt);
    } else if (car.gear === "D" || car.gear === "R") {
      if (car.pendingPullOut) {
        /* Still holding brake after shifting out of P — stay on the curb. */
        car.vx = 0;
      } else {
        /* Nose direction = facing. D = forward along nose, R = opposite. */
        const forward = car.facing >= 0 ? 1 : -1;
        const dir = car.gear === "D" ? forward : -forward;
        const creep = dir * CAR_CREEP * (car.gear === "R" ? 0.7 : 1);
        if (gas) car.vx += dir * CAR_ACCEL * (car.gear === "R" ? 0.72 : 1) * dt;
        else if (!brake) {
          const diff = creep - car.vx;
          car.vx += Math.sign(diff) * Math.min(Math.abs(diff), CAR_ACCEL * 0.55 * dt);
        }
        if (brake) car.vx *= Math.exp(-4 * dt);
        if (gas && car.vx * dir < 0) car.vx = 0;
      }
    }
    car.vx = Math.max(-CAR_MAX, Math.min(CAR_MAX, car.vx));
    if (brake && Math.abs(car.vx) < CAR_STOP) car.vx = 0;
    const prevX = car.x;
    car.x = clampAlong(car.x + car.vx * dt);
    carOdo += alongDist(prevX, car.x);
    if (car.turnT <= 0 && car.pullOverT <= 0 && car.pullOutT <= 0 && car.shiftT <= 0) {
      const wantZ = (!car.parked && car.gear !== "P") ? laneZ(car.facing) : curbZ(car.facing);
      car.z += (wantZ - car.z) * Math.min(1, dt * 2.4);
    }
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
    /* Walk freely past the parked whip — it is not a wall. */
    player.x = clampAlong(player.x + player.vx * dt);
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
  const step = wrapDelta(cam, target, WORLD) * (1 - Math.exp(-7 * dt));
  cam = clampAlong(cam + step);
  camScroll += step;
}

function renderNes() {
  nctx.imageSmoothingEnabled = false;
  drawParallax();
  /* Street-sign popups shelved — not the look we want. */
  if (mode === "play" || mode === "paused") drawActors();
  nctx.font = "8px 'Press Start 2P', monospace";
  if (mode === "play" || mode === "paused") {
    /* Left cluster only — quit/sound live in the MENU pause sheet. */
    let hx = 6;
    const gap = 6;
    const cashS = "$" + String(Math.floor(cash)).padStart(4, "0");
    const grnS = "GRN " + fmtG(grams);
    const whtS = "WHT " + fmtG(white);
    text(nctx, cashS, hx, 6, "#f0c430");
    hx += Math.ceil(nctx.measureText(cashS).width) + gap;
    text(nctx, grnS, hx, 6, grams > 0 ? "#38f070" : "#2a8a48");
    hx += Math.ceil(nctx.measureText(grnS).width) + gap;
    text(nctx, whtS, hx, 6, white > 0 ? "#f4f0e8" : "#9a9690");
    hx += Math.ceil(nctx.measureText(whtS).width) + gap;
    text(nctx, BUILD_LABEL, hx, 6, "#8a8696");
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
    text(nctx, "DRIVE THE BLOCK  " + BUILD_LABEL, nesW / 2, nesH * 0.28 + 52, "#38d8f8", "center");
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
  if (role === "pause" || role === "resume") {
    togglePause();
    return;
  }
  if (role === "mute") {
    BRAudio.toggleMute();
    syncHud();
    return;
  }
  if (mode === "paused") return;
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
  if (e.code === "Escape") {
    togglePause();
    syncHud();
    e.preventDefault();
    return;
  }
  if (mode === "paused") return;
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
    if (gear) shiftPreview = gear;
    /* Tap a letter = commit now; slide commits on release (knob follows while dragging). */
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
  if (drag.gear) shiftPreview = drag.gear;
});
function endPointer(e) {
  const drag = shifterDrag.get(e.pointerId);
  if (drag) {
    const gear = gearFromClientY(e.clientY) || drag.gear;
    if (drag.moved && gear) pulses.gear = gear;
    shifterDrag.delete(e.pointerId);
    if (!shifterDrag.size) shiftPreview = null;
  }
  holdPointers.delete(e.pointerId);
  rebuildHolds();
}
document.getElementById("app").addEventListener("pointerup", endPointer);
document.getElementById("app").addEventListener("pointercancel", endPointer);
soundBtn?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  BRAudio.toggleMute();
  syncHud();
});
menuBtn?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  togglePause();
  syncHud();
});
pauseEl?.querySelector('[data-role="resume"]')?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (mode === "paused") togglePause();
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
if (BRAudio.isMuted()) soundBtn?.classList.add("off");

window.__br = {
  getState: () => ({
    mode, inCar, cash, grams, white, stash, rep, order, ui,
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
    trafficN: traffic.length,
    rims: rimFrames.length,
    camScroll,
    carDrawFace: carDrawFace(car.facing),
  }),
  start: () => beginPlay(false),
  finishIntro: () => { if (mode === "title") beginPlay(false); },
  pause: () => { if (mode === "play") togglePause(); },
  resume: () => { if (mode === "paused") togglePause(); },
  setInCar: (on) => { if (on) { player.x = car.x; player.z = Math.max(player.z, Z_STREET_MIN); enterCar(true); } else leaveCar(); },
  setGear: (g) => { if (GEARS.includes(g)) car.gear = g; },
  tryShift: (g, brake) => tryShift(g, !!brake),
  startPullOver,
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

async function loadRimFrames() {
  const sets = window.RIM_ALTERNATES?.sets || {};
  const list = sets[RIM_SET] || sets.current || Object.values(sets)[0];
  if (!list?.length) return [];
  const frames = await Promise.all(list.map((src) => loadImage(src)));
  return frames.filter(Boolean).map(cleanRimFrame);
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
  const cleanCar = cleanCarSheet(carImg);
  art = {
    idle, walk: walkNew || walk, walkNew: walkNew || walk, thug, runner, pack,
    walkFront, walkBack,
    car: cleanCar,
    sedan: cleanCar,
    street: streetImg,
    driver: driverImg,
  };
  window.__br.ready = true;
});
requestAnimationFrame(frame);
