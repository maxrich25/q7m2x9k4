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
export const CONTACT_NAMES = ["DEZ", "MARI", "KILO", "NIA", "JUNO"];
export const MORE_NAMES = ["ACE", "BREE", "CAM", "DRE", "EZ", "FAY", "GIO", "HANA", "IZZY", "JAY"];
export const INTRO_TEXT = "You just quit your garbage job. You saved enough for a first re-up, and you know people.";
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

export const SHOP_X = 175;
export const DUMPSTER_X = 493;
export const CAR_X = 220;
export const BUYER_COUNT = 5;
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

export const GREEN_TIERS = [
  { id: "half", label: "1/2 OZ", grams: 14, cost: 100, minRep: 0 },
  { id: "oz", label: "OZ", grams: 28, cost: 180, minRep: 2 },
  { id: "qp", label: "QP", grams: 112, cost: 650, minRep: 4 },
  { id: "hp", label: "1/2 P", grams: 224, cost: 1200, minRep: 6 },
  { id: "p", label: "P", grams: 448, cost: 2200, minRep: 8 },
];
export const WHITE_TIERS = [
  { id: "eighth", label: "8TH", grams: 3.5, cost: 140, minRep: 0 },
  { id: "quad", label: "7G", grams: 7, cost: 260, minRep: 2 },
  { id: "half", label: "1/2 OZ", grams: 14, cost: 500, minRep: 3 },
  { id: "oz", label: "OZ", grams: 28, cost: 950, minRep: 5 },
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
