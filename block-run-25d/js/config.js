/** Game-space constants copied from BLOCK RUN, plus 3D layout. */

export const TICK = 1 / 60;
export const WORLD = 3980;
export const GROUND_Y = 198;
export const MAX_HP = 3;
export const CAR_HP = 3;
export const CAR_ACCEL = 160;
export const CAR_MAX = 142;
export const CAR_FRICTION = 1.15;
export const CAR_CREEP = 18;
export const CAR_TURN_TIME = 1.0;
export const CAR_TURN_MAX = 28;
export const CAR_TURN_ARC = 3.9;
export const CAR_STOP = 8;
/** US right-hand traffic: +X uses the camera-side (near) lane. */
export const CAR_LANE_NEAR = 3.9;
export const CAR_LANE_FAR = 0;
export const CAR_KINDS = {
  beater: { accel: 160, max: 142, creep: 18, color: 0x6a3a24 },
  luxury: { accel: 260, max: 220, creep: 23, color: 0x121214 },
};
export const GEARS = ["P", "R", "N", "D"];
/** Keep enemy/gun/wave code compiled; off for the dealing-loop build. */
export const COMBAT = false;
export const HALF_OZ = 14;
export const PRODUCTS = {
  GREEN: { id: "GREEN", buyHalf: 100, streetGram: 14, color: "#3dff7a" },
  WHITE: { id: "WHITE", buyHalf: 500, streetGram: 55, color: "#f4f0e8" },
};
export const START_CASH = PRODUCTS.GREEN.buyHalf + 30;
export const SALE_AMOUNTS = [20, 40, 60];
export const FLAKE_LIMIT = 3;
export const PACK_COST = 20;
export const PACK_PAY = 46;
export const PLUG_X = 1480;
export const HOME_X = 240;
export const PED_COUNT = 10;
export const TRAFFIC_MAX = 7;
export const CONTACT_NAMES = ["DEZ", "MARI", "KILO", "NIA", "JUNO"];
export const MORE_NAMES = ["ACE", "BREE", "CAM", "DRE", "EZ", "FAY", "GIO", "HANA", "IZZY", "JAY"];
export const INTRO_TEXT = "You just quit your garbage job. Cop a first pack, then hit up the people you know.";
export const SALE_POP_T = 2.4;
export const SERVE_SLOW = 36;
export const LIGHT_CYCLE = 16;
export const GRAVITY = 780;
export const JUMP_VEL = -340;
export const COYOTE = 0.22;
export const JUMP_BUFFER = 0.2;
export const MOVE_SPEED = 46;
export const TELEGRAPH = 0.4;
export const BOSS_CASH_BASE = 280;
export const BOSS_CASH_PER_WAVE = 120;
export const HI_KEY = "block-run-25d-hi";
export const SAVE_KEY = "block-run-save";

export const SHOP_X = 175;
export const DUMPSTER_X = 493;
export const CAR_X = 220;
export const BUYER_COUNT = 8;
export const COP_CAR_HP = 3;

/** 3D street length in meters. Game x maps onto this wrapping strip. */
export const STREET_LEN = 520;
export const BLOCK_LEN = 52;
export const LIGHT_COUNT = Math.round(STREET_LEN / BLOCK_LEN);

export const ORDER_SPOTS = [
  { id: "motel", label: "the motel", x: 1520 },
  { id: "studio", label: "the studio", x: 1880 },
  { id: "alley", label: "the back alley", x: 1924 },
  { id: "taco", label: "the taco stand", x: 2100 },
  { id: "gas", label: "the gas station", x: 1640 },
  { id: "park", label: "the park", x: 1960 },
  { id: "liquor", label: "the uptown liquor", x: 1760 },
];

export const MAX_REP = 16;
export const START_HOUR = 21;
/** ~24 real minutes per in-game day (24 * 60s), GTA-ish 1s = 1min. */
export const SEC_PER_HOUR = 60;

export const GREEN_TIERS = [
  { id: "half", label: "1/2 OZ", grams: 14, cost: 100, minRep: 0 },
  { id: "oz", label: "OZ", grams: 28, cost: 180, minRep: 2 },
  { id: "qp", label: "QP", grams: 112, cost: 650, minRep: 4 },
  { id: "hp", label: "1/2 P", grams: 224, cost: 1200, minRep: 6 },
  { id: "p", label: "P", grams: 448, cost: 2200, minRep: 8 },
  { id: "2p", label: "2P", grams: 896, cost: 4200, minRep: 10 },
  { id: "5p", label: "5P", grams: 2240, cost: 10000, minRep: 12 },
  { id: "10p", label: "10P", grams: 4480, cost: 19000, minRep: 14 },
];
export function nextUnlock(rep, tiers = GREEN_TIERS) {
  const n = Number(rep) || 0;
  return tiers.find((t) => (t.minRep || 0) > n) || null;
}

export const WHITE_TIERS = [
  { id: "eighth", label: "8TH", grams: 3.5, cost: 140, minRep: 0 },
  { id: "quad", label: "7G", grams: 7, cost: 260, minRep: 2 },
  { id: "half", label: "1/2 OZ", grams: 14, cost: 500, minRep: 3 },
  { id: "oz", label: "OZ", grams: 28, cost: 950, minRep: 5 },
];
export const OUTFITS = [
  { id: "red", label: "RED HOOD", hex: null, hex25: null },
  { id: "black", label: "BLK HOOD", hex: "#2a2438", hex25: "#3a3048" },
  { id: "teal", label: "TEAL HOOD", hex: "#1f6a68", hex25: "#3de0ff" },
  { id: "gold", label: "GOLD HOOD", hex: "#c8a040", hex25: "#f0c430" },
];

export const STALL_LINES = [
  "aite but don't have me waitin",
  "yo u comin or what, clock is tickin",
  "last chance bro i got others",
];

export const WEAPONS = {
  pistol: { cd: 0.2, pellets: 1, spread: 0, speed: 170, cost: 0, label: "PISTOL", next: "uzi" },
  uzi: { cd: 0.09, pellets: 1, spread: 0, speed: 190, cost: 150, label: "UZI", next: "shot" },
  shot: { cd: 0.42, pellets: 3, spread: 28, speed: 155, cost: 280, label: "SHOTTY", next: "shot" },
};

export const COLORS = {
  bg: 0x07060c,
  pink: 0xe21b7a,
  cyan: 0x3de0ff,
  gold: 0xf0c430,
  cream: 0xf4f0e8,
  night: 0x140c22,
};

export function wrapHour(h) {
  return ((Number(h) || 0) % 24 + 24) % 24;
}

export function hourOf(clock, extra = 0) {
  return wrapHour(START_HOUR + (Number(clock) || 0) / SEC_PER_HOUR + extra);
}

export function fmtHour(h) {
  const wrapped = wrapHour(h);
  const hr = Math.floor(wrapped);
  const min = Math.floor((wrapped - hr) * 60);
  const h12 = hr % 12 || 12;
  const ap = hr < 12 ? " AM" : " PM";
  return h12 + ":" + String(min).padStart(2, "0") + ap;
}

/** dawn 5-7A, day 7A-5P, dusk 5-8P, night 8P-5A */
export function dayPhase(hour) {
  const h = wrapHour(hour);
  if (h >= 5 && h < 7) return "dawn";
  if (h >= 7 && h < 17) return "day";
  if (h >= 17 && h < 20) return "dusk";
  return "night";
}

function lerpKeys(keys, hour, pick) {
  const h = wrapHour(hour);
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].h <= h) i += 1;
  const a = keys[i];
  const b = keys[Math.min(i + 1, keys.length - 1)];
  const span = Math.max(0.001, b.h - a.h);
  const t = Math.max(0, Math.min(1, (h - a.h) / span));
  return pick(a, b, t);
}

const BUSY_KEYS = [
  { h: 0, v: 0.42 },
  { h: 2, v: 0.26 },
  { h: 3, v: 0.1 },
  { h: 5, v: 0.07 },
  { h: 6.5, v: 0.36 },
  { h: 8, v: 0.88 },
  { h: 12, v: 0.96 },
  { h: 17, v: 1 },
  { h: 20, v: 0.9 },
  { h: 22, v: 0.52 },
  { h: 24, v: 0.42 },
];

/** 1 = packed sidewalks, ~0.08 = near-empty 3-5A. */
export function streetBusy(hour) {
  return lerpKeys(BUSY_KEYS, hour, (a, b, t) => a.v + (b.v - a.v) * t);
}

const ORDER_WAIT_KEYS = [
  { h: 0, v: 0.62 },
  { h: 2, v: 0.88 },
  { h: 5, v: 1.42 },
  { h: 8, v: 1.55 },
  { h: 11, v: 1.18 },
  { h: 17, v: 0.88 },
  { h: 20, v: 0.54 },
  { h: 23, v: 0.5 },
  { h: 24, v: 0.62 },
];

/** Multiplier on customer text delay. Lower = more texts (peaks 8P-2A). */
export function orderWaitMul(hour) {
  return lerpKeys(ORDER_WAIT_KEYS, hour, (a, b, t) => a.v + (b.v - a.v) * t);
}

const HEAT_KEYS = [
  { h: 0, v: 1.3 },
  { h: 5, v: 1.12 },
  { h: 8, v: 0.86 },
  { h: 17, v: 0.94 },
  { h: 20, v: 1.1 },
  { h: 22, v: 1.26 },
  { h: 24, v: 1.3 },
];

/** Late-night heat gain / cop pressure. Stays near 1 so it stays gentle. */
export function heatMul(hour) {
  return lerpKeys(HEAT_KEYS, hour, (a, b, t) => a.v + (b.v - a.v) * t);
}

/** Plug answers 10A-4A only. */
export function plugOpen(hour) {
  const h = wrapHour(hour);
  return h >= 10 || h < 4;
}

export function hexCss(n) {
  return "#" + (n >>> 0).toString(16).padStart(6, "0");
}

function lerpChan(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function lerpHex(a, b, t) {
  return (lerpChan((a >> 16) & 255, (b >> 16) & 255, t) << 16)
    | (lerpChan((a >> 8) & 255, (b >> 8) & 255, t) << 8)
    | lerpChan(a & 255, b & 255, t);
}

const SKY_KEYS = [
  { h: 0, top: 0x0a0118, bot: 0x12081e, fog: 0x10061a, star: 1, moon: 1, sun: 0, light: 0.5, windows: 0.95, lamps: 1 },
  { h: 3, top: 0x080114, bot: 0x10061a, fog: 0x0c0416, star: 1, moon: 1, sun: 0, light: 0.46, windows: 0.82, lamps: 1 },
  { h: 5, top: 0x1a1438, bot: 0x4a2858, fog: 0x2a1838, star: 0.5, moon: 0.55, sun: 0.12, light: 0.68, windows: 0.5, lamps: 0.35 },
  { h: 6, top: 0x6a5088, bot: 0xc88878, fog: 0x5a3a58, star: 0.12, moon: 0.18, sun: 0.55, light: 1.02, windows: 0.28, lamps: 0.12 },
  { h: 7, top: 0x4a90d0, bot: 0x7ab8e8, fog: 0x6aa0c8, star: 0, moon: 0, sun: 0.92, light: 1.18, windows: 0.08, lamps: 0 },
  { h: 12, top: 0x5aa8e8, bot: 0x9ad0f0, fog: 0x7ab8d8, star: 0, moon: 0, sun: 1, light: 1.32, windows: 0.05, lamps: 0 },
  { h: 16, top: 0x3a78b8, bot: 0x6aa8d8, fog: 0x5a90c0, star: 0, moon: 0, sun: 0.88, light: 1.12, windows: 0.1, lamps: 0 },
  { h: 17, top: 0xc86a40, bot: 0xe89050, fog: 0x8a4030, star: 0.06, moon: 0.08, sun: 0.62, light: 0.98, windows: 0.48, lamps: 0.18 },
  { h: 18.5, top: 0xc84a38, bot: 0xe87840, fog: 0x8a3028, star: 0.16, moon: 0.24, sun: 0.28, light: 0.86, windows: 0.78, lamps: 0.62 },
  { h: 20, top: 0x2a1040, bot: 0x1a0828, fog: 0x180820, star: 0.75, moon: 0.85, sun: 0, light: 0.62, windows: 0.95, lamps: 1 },
  { h: 21, top: 0x0c0120, bot: 0x140a28, fog: 0x120820, star: 1, moon: 1, sun: 0, light: 0.55, windows: 0.96, lamps: 1 },
  { h: 24, top: 0x0a0118, bot: 0x12081e, fog: 0x10061a, star: 1, moon: 1, sun: 0, light: 0.5, windows: 0.95, lamps: 1 },
];

export function skyTint(hour) {
  const h = wrapHour(hour);
  let i = 0;
  while (i < SKY_KEYS.length - 1 && SKY_KEYS[i + 1].h <= h) i += 1;
  const a = SKY_KEYS[i];
  const b = SKY_KEYS[Math.min(i + 1, SKY_KEYS.length - 1)];
  const span = Math.max(0.001, b.h - a.h);
  const t = Math.max(0, Math.min(1, (h - a.h) / span));
  const top = lerpHex(a.top, b.top, t);
  const bot = lerpHex(a.bot, b.bot, t);
  const fog = lerpHex(a.fog, b.fog, t);
  const star = a.star + (b.star - a.star) * t;
  const moon = a.moon + (b.moon - a.moon) * t;
  const sun = a.sun + (b.sun - a.sun) * t;
  const light = a.light + (b.light - a.light) * t;
  const windows = a.windows + (b.windows - a.windows) * t;
  const lamps = a.lamps + (b.lamps - a.lamps) * t;
  return {
    top, bot, fog, star, moon, sun, light, windows, lamps,
    headlights: lamps > 0.42,
    phase: dayPhase(h),
    cssTop: hexCss(top),
    cssBot: hexCss(bot),
    cssFog: hexCss(fog),
    wash: `rgba(${(bot >> 16) & 255},${(bot >> 8) & 255},${bot & 255},${(0.16 + (1 - star) * 0.3).toFixed(3)})`,
  };
}

export function restLat(facing) {
  return facing > 0 ? CAR_LANE_NEAR : CAR_LANE_FAR;
}

export function wrap(value, length) {
  value %= length;
  if (value < 0) value += length;
  return value;
}

export function wrapDelta(from, to, length) {
  let d = to - from;
  if (d > length / 2) d -= length;
  if (d < -length / 2) d += length;
  return d;
}

export function hitWrap(ax, ay, aw, ah, bx, by, bw, bh, length) {
  const dx = Math.abs(wrapDelta(ax, bx, length));
  const dy = Math.abs(ay - by);
  return dx < (aw + bw) / 2 && dy < (ah + bh) / 2;
}

export function gameToWorldX(gameX) {
  return (gameX / WORLD) * STREET_LEN;
}

export function gameToWorldY(gameY) {
  return (GROUND_Y - gameY) * (1.7 / 40);
}

export function nearestWorldX(gameX, camX) {
  const x0 = gameToWorldX(gameX);
  let best = x0;
  let bestD = Infinity;
  for (const x of [x0 - STREET_LEN, x0, x0 + STREET_LEN]) {
    const d = Math.abs(x - camX);
    if (d < bestD) {
      bestD = d;
      best = x;
    }
  }
  return best;
}

export function dealMeters(fromX, toX) {
  return Math.abs(wrapDelta(fromX, toX, WORLD)) * (STREET_LEN / WORLD);
}

export function dealFeet(fromX, toX) {
  return dealMeters(fromX, toX) * 3.28084;
}

export function fmtGrams(n) {
  const g = Math.max(0, Number(n) || 0);
  const r = Math.round(g * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export function streetGrams(productId, dollars) {
  const p = PRODUCTS[productId];
  if (!p || !p.streetGram) return 0;
  return (Number(dollars) || 0) / p.streetGram;
}

export function formatDeal(fromX, toX) {
  const feet = dealFeet(fromX, toX);
  if (feet >= 0.2 * 5280) return `${(feet / 5280).toFixed(1)} mi`;
  return `${Math.round(feet)} ft`;
}

export function lightGameX(index) {
  const n = Math.round(STREET_LEN / BLOCK_LEN);
  return (index % n) * (WORLD / n);
}

export function lightPhaseAt(clock, index) {
  const u = ((clock + index * 3.7) % LIGHT_CYCLE + LIGHT_CYCLE) % LIGHT_CYCLE;
  if (u < 7.5) return "green";
  if (u < 9.5) return "yellow";
  return "red";
}
