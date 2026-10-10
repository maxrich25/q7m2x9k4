/** Game-space constants copied from BLOCK RUN, plus 3D layout. */

export const TICK = 1 / 60;
export const WORLD = 3980;
export const GROUND_Y = 198;
export const MAX_HP = 3;
export const CAR_HP = 3;
export const CAR_ACCEL = 260;
export const CAR_MAX = 220;
export const CAR_FRICTION = 1.15;
export const CAR_CREEP = 23;
export const CAR_TURN_TIME = 1.0;
export const CAR_TURN_MAX = 28;
export const CAR_TURN_ARC = 2.4;
export const CAR_STOP = 8;
export const GEARS = ["P", "R", "N", "D"];
/** Keep enemy/gun/wave code compiled; off for the dealing-loop build. */
export const COMBAT = false;
export const START_CASH = 100;
export const PACK_COST = 20;
export const PACK_PAY = 46;
export const PLUG_X = 1480;
export const HOME_X = 240;
export const PED_COUNT = 10;
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
export const CAR_X = 100;
export const BUYER_COUNT = 5;
export const COP_CAR_HP = 3;

/** 3D street length in meters. Game x maps onto this wrapping strip. */
export const STREET_LEN = 520;
export const BLOCK_LEN = 52;
export const LIGHT_COUNT = Math.round(STREET_LEN / BLOCK_LEN);

export const ORDER_SPOTS = [
  { id: "motel", label: "the motel", x: 1520 },
  { id: "studio", label: "the studio", x: 1880 },
  { id: "taco", label: "the taco stand", x: 2100 },
  { id: "gas", label: "the gas station", x: 1640 },
  { id: "park", label: "the park", x: 1960 },
  { id: "liquor", label: "the uptown liquor", x: 1760 },
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
