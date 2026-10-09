/** Game-space constants copied from BLOCK RUN, plus 3D layout. */

export const TICK = 1 / 60;
export const WORLD = 796;
export const GROUND_Y = 198;
export const MAX_HP = 3;
export const CAR_HP = 3;
export const CAR_ACCEL = 240;
export const CAR_MAX = 220;
export const CAR_FRICTION = 1.15;
export const GRAVITY = 780;
export const JUMP_VEL = -340;
export const COYOTE = 0.22;
export const JUMP_BUFFER = 0.2;
export const MOVE_SPEED = 80;
export const TELEGRAPH = 0.4;
export const BOSS_CASH_BASE = 280;
export const BOSS_CASH_PER_WAVE = 120;
export const HI_KEY = "block-run-25d-hi";

export const SHOP_X = Math.floor(WORLD * 0.22);
export const DUMPSTER_X = Math.floor(WORLD * 0.62);
export const CAR_X = 56;

/** 3D street length in meters. Game x maps onto this wrapping strip. */
export const STREET_LEN = 104;

export const ORDER_SPOTS = [
  { id: "liquor", label: "the liquor store", x: Math.floor(WORLD * 0.11) },
  { id: "motel", label: "the motel", x: Math.floor(WORLD * 0.36) },
  { id: "shop", label: "the shop", x: SHOP_X },
  { id: "cali", label: "the CALI wall", x: Math.floor(WORLD * 0.50) },
  { id: "dump", label: "the alley", x: DUMPSTER_X },
  { id: "corner", label: "the far corner", x: Math.floor(WORLD * 0.88) },
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
