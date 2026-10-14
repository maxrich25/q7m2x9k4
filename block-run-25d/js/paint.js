/** Shared pixel-art helpers (no Three.js). Used by 2.5D sprites and classic 2D. */

export function pixelCanvas(w, h, paint) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  paint(g, w, h);
  return c;
}

/** Recolor reddish hoodie/hat pixels on original player sheets. */
export function remapHoodie(src, hex) {
  if (!src || !hex) return src;
  const w = src.width || src.naturalWidth || 32;
  const h = src.height || src.naturalHeight || 40;
  const to = parseInt(String(hex).replace("#", ""), 16);
  if (!Number.isFinite(to)) return src;
  const tr = (to >> 16) & 255;
  const tg = (to >> 8) & 255;
  const tb = to & 255;
  return pixelCanvas(w, h, (g) => {
    g.drawImage(src, 0, 0);
    const img = g.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const gv = d[i + 1];
      const b = d[i + 2];
      const a = d[i + 3];
      if (a < 8) continue;
      const skin = gv > 78 && b > 36 && (r - gv) < 90;
      if (!skin && r > 90 && r > gv * 1.45 && r > b * 1.4 && gv < 110) {
        const lum = (r * 0.52 + gv * 0.22 + b * 0.1) / 255;
        const k = 0.42 + lum * 0.95;
        d[i] = Math.min(255, Math.round(tr * k));
        d[i + 1] = Math.min(255, Math.round(tg * k));
        d[i + 2] = Math.min(255, Math.round(tb * k));
      }
    }
    g.putImageData(img, 0, 0);
  });
}

export function derivePose(src, { bob = 0, legDx = 0, legDy = 0, armDx = 0 } = {}) {
  const w = src.width;
  const h = src.height;
  const arm0 = Math.round(h * 0.36);
  const split = Math.round(h * 0.60);
  return pixelCanvas(w, h, (g) => {
    g.drawImage(src, 0, 0, w, arm0, 0, bob, w, arm0);
    g.drawImage(src, 0, arm0, w, split - arm0, armDx, bob + arm0, w, split - arm0);
    g.drawImage(src, 0, split, w, h - split, legDx, bob + split + legDy, w, h - split);
  });
}

export function flipCanvas(src) {
  const w = src.width || src.naturalWidth || 32;
  const h = src.height || src.naturalHeight || 40;
  return pixelCanvas(w, h, (g) => {
    g.translate(w, 0);
    g.scale(-1, 1);
    g.drawImage(src, 0, 0);
  });
}

export const WALK_POSES = [
  { step: 2, bob: 0 },
  { step: 1, bob: 1 },
  { step: 0, bob: 0 },
  { step: -2, bob: 0 },
  { step: -1, bob: 1 },
  { step: 0, bob: 0 },
];
/**
 * 8-frame side gait: contact, down, passing, up (each side).
 * Narrow stance — knees under hips, short natural stride, soft bob.
 * Planted foot travels backward so it stays planted vs MOVE_SPEED.
 */
export const WALK_CYCLE_POSES = [
  { side: true, rFoot: 4, lFoot: -3, rLift: 0, lLift: 3, arm: 3, bob: 0 },
  { side: true, rFoot: 2, lFoot: -1.5, rLift: 0, lLift: 3.5, arm: 2.5, bob: 1 },
  { side: true, rFoot: 0, lFoot: 0.5, rLift: 0.5, lLift: 2.5, arm: 1, bob: 0 },
  { side: true, rFoot: -2.5, lFoot: 3.5, rLift: 2.5, lLift: 0, arm: -2, bob: 0 },
  { side: true, lFoot: 4, rFoot: -3, lLift: 0, rLift: 3, arm: -3, bob: 0 },
  { side: true, lFoot: 2, rFoot: -1.5, lLift: 0, rLift: 3.5, arm: -2.5, bob: 1 },
  { side: true, lFoot: 0, rFoot: 0.5, lLift: 0.5, rLift: 2.5, arm: -1, bob: 0 },
  { side: true, lFoot: -2.5, rFoot: 3.5, lLift: 2.5, rLift: 0, arm: 2, bob: 0 },
];
/** Run: longer stride, forward lean, higher cadence bob. */
export const RUN_CYCLE_POSES = [
  { side: true, run: true, rFoot: 4, lFoot: -2.5, rLift: 0, lLift: 3, arm: 4, bob: 0, lean: 2.5 },
  { side: true, run: true, rFoot: 1.5, lFoot: -1, rLift: 0, lLift: 3.5, arm: 3, bob: 0.5, lean: 2.5 },
  { side: true, run: true, rFoot: -1, lFoot: 2.5, rLift: 1, lLift: 2.5, arm: 0.5, bob: 0, lean: 2.5 },
  { side: true, run: true, rFoot: -3, lFoot: 4, rLift: 2.5, lLift: 0.5, arm: -3.5, bob: 0, lean: 2.5 },
  { side: true, run: true, lFoot: 4, rFoot: -2.5, lLift: 0, rLift: 3, arm: -4, bob: 0, lean: 2.5 },
  { side: true, run: true, lFoot: 1.5, rFoot: -1, lLift: 0, rLift: 3.5, arm: -3, bob: 0.5, lean: 2.5 },
  { side: true, run: true, lFoot: -1, rFoot: 2.5, lLift: 1, rLift: 2.5, arm: -0.5, bob: 0, lean: 2.5 },
  { side: true, run: true, lFoot: -3, rFoot: 4, lLift: 2.5, rLift: 0.5, arm: 3.5, bob: 0, lean: 2.5 },
];
export const PED_WALK_POSES = WALK_CYCLE_POSES;
/**
 * Game-x of one full walk cycle (both feet).
 * Longer cycle = visible planted step instead of a foot shuffle.
 */
export const STRIDE_CYCLE = 10;
/** Run cycle length in game-x (longer plant travel). */
export const RUN_STRIDE_CYCLE = 14;
/** PNG stride leftover — kept for older sheets. */
export const STRIDE_POSES = [
  { leftDx: 6, leftDy: 0, rightDx: -5, rightDy: -2, bob: 0, arm: 4 },
  { leftDx: 4, leftDy: 0, rightDx: -3, rightDy: -1, bob: 1, arm: 2 },
  { leftDx: 0, leftDy: 0, rightDx: 0, rightDy: 0, bob: 0, arm: 0 },
  { leftDx: -5, leftDy: -2, rightDx: 6, rightDy: 0, bob: 0, arm: -4 },
  { leftDx: -3, leftDy: -1, rightDx: 4, rightDy: 0, bob: 1, arm: -2 },
  { leftDx: 0, leftDy: 0, rightDx: 0, rightDy: 0, bob: 0, arm: 0 },
];
export const TURN_POSES = [
  { side: true, bob: 0 },
  { side: true, bob: 1 },
];
export const SIT_POSES = [
  { sit: true, bob: 0 },
  { sit: true, bob: 1 },
];
/** Idle keeps the last travel facing (3/4 side), never a camera-front pose. */
export const IDLE_POSES = [
  { side: true, threeQ: true, bob: 0 },
  { side: true, threeQ: true, bob: 1 },
  { side: true, threeQ: true, bob: 0, arm: 1 },
  { side: true, threeQ: true, bob: 1 },
];
export const JUMP_POSES = [{ bob: -2, legDx: -1, legDy: -3, armDx: 2 }];
export const SHOOT_POSES = [
  { armDx: 2, legDx: 1, bob: 0 },
  { armDx: 3, legDx: 1, bob: 0 },
];
export const WAVE_POSES = [
  { armDx: 1, bob: 0 },
  { armDx: 3, bob: 1 },
  { armDx: 4, bob: 0 },
  { armDx: 2, bob: 1 },
];

export function poseSheet(src, poses) {
  return poses.map((p) => derivePose(src, p));
}

export function frameAt(frames, anim, rate) {
  if (!frames || !frames.length) return frames;
  const i = Math.floor(Math.abs(anim) * rate) % frames.length;
  return frames[i];
}

/** Ped looks — same 40×40 classic pixel figure, outline, and palette family as the hero. */
export const PED_LOOKS = [
  { skin: "#fcb76c", skinLo: "#c77332", shirt: "#c4283a", pants: "#1c51a1", jeansLo: "#0b377c", hair: "#3a2218", accent: "#e31416", hat: "beanie", shoes: "#e8e4e0", shoeRed: "#c20e0e", outline: "#140010" },
  { skin: "#e0ac69", skinLo: "#b07838", shirt: "#2a8a8a", pants: "#2a2a38", jeansLo: "#1a1a28", hair: "#2a1a10", accent: "#f0c430", hat: "none", shoes: "#e8e4e0", shoeRed: "#c20e0e", outline: "#140010" },
  { skin: "#c68642", skinLo: "#8a5420", shirt: "#2d2b2e", pants: "#1a1a22", jeansLo: "#0e0e14", hair: "#1a1210", accent: "#f0c430", hat: "cap", shoes: "#e8e4e0", shoeRed: "#c20e0e", chain: true, outline: "#140010" },
  { skin: "#8d5524", skinLo: "#5a3414", shirt: "#5a2a8a", pants: "#3a3020", jeansLo: "#241c10", hair: "#1a1210", accent: "#c8a0e8", hat: "durag", shoes: "#1a1210", shoeRed: "#8a1010", outline: "#140010" },
  { skin: "#d4a574", skinLo: "#a07040", shirt: "#f0c430", pants: "#2a2438", jeansLo: "#181420", hair: "#1a1210", accent: "#e21b7a", hat: "afro", shoes: "#e8e4e0", shoeRed: "#c20e0e", outline: "#140010" },
  { skin: "#fcb76c", skinLo: "#c77332", shirt: "#1a3a68", pants: "#f4f0e8", jeansLo: "#c8c4bc", hair: "#6a4430", accent: "#3de0ff", hat: "none", shoes: "#1a1a22", shoeRed: "#8a1010", outline: "#140010" },
  { skin: "#a36c41", skinLo: "#6a4420", shirt: "#2a2438", pants: "#1c51a1", jeansLo: "#0b377c", hair: "#1a1210", accent: "#f4f0e8", hat: "beanie", shoes: "#e8e4e0", shoeRed: "#c20e0e", outline: "#140010" },
  { skin: "#e8be8a", skinLo: "#b07848", shirt: "#e21b7a", pants: "#3a3048", jeansLo: "#201828", hair: "#2a1a10", accent: "#f0c430", hat: "cap", shoes: "#e8e4e0", shoeRed: "#c20e0e", outline: "#140010" },
  { skin: "#c68642", skinLo: "#8a5420", shirt: "#4a3020", pants: "#1c51a1", jeansLo: "#0b377c", hair: "#1a1210", accent: "#c4283a", hat: "none", shoes: "#1a1a22", shoeRed: "#8a1010", outline: "#140010" },
  { skin: "#fcb76c", skinLo: "#c77332", shirt: "#3a5a38", pants: "#2a2430", jeansLo: "#161418", hair: "#2a1a10", accent: "#f0c430", hat: "cap", shoes: "#e8e4e0", shoeRed: "#c20e0e", outline: "#140010" },
  { skin: "#8d5524", skinLo: "#5a3414", shirt: "#1a1a22", pants: "#f4f0e8", jeansLo: "#c8c4bc", hair: "#1a1210", accent: "#e21b7a", hat: "beanie", shoes: "#e8e4e0", shoeRed: "#c20e0e", chain: true, outline: "#140010" },
  { skin: "#d4a574", skinLo: "#a07040", shirt: "#f4f0e8", pants: "#3a3048", jeansLo: "#201828", hair: "#3a2218", accent: "#2a4a8a", hat: "none", shoes: "#1a1210", shoeRed: "#8a1010", outline: "#140010" },
];

/** Hard 1px outline matching classic hero sheets (#140010). */
function ringOutline(g, w, h, hex = "#140010") {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const solid = new Uint8Array(w * h);
  for (let p = 0, i = 0; p < solid.length; p++, i += 4) {
    if (d[i + 3] >= 16) solid[p] = 1;
  }
  const n = parseInt(String(hex).replace("#", ""), 16);
  const or = (n >> 16) & 255;
  const og = (n >> 8) & 255;
  const ob = n & 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (solid[p]) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (solid[ny * w + nx]) { near = true; break; }
        }
      }
      if (!near) continue;
      const i = p * 4;
      d[i] = or;
      d[i + 1] = og;
      d[i + 2] = ob;
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
}

function shadeHex(hex, amt) {
  const n = parseInt(String(hex).replace("#", ""), 16);
  if (!Number.isFinite(n)) return hex;
  const k = (c) => Math.max(0, Math.min(255, Math.round(c + amt)));
  const r = k((n >> 16) & 255);
  const g = k((n >> 8) & 255);
  const b = k(n & 255);
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

function gaitFromPose(pose = {}) {
  const step = Math.round(pose.step || 0);
  const lFoot = pose.lFoot != null ? Math.round(pose.lFoot) : step;
  const rFoot = pose.rFoot != null ? Math.round(pose.rFoot) : -step;
  const lLift = pose.lLift != null ? pose.lLift : (step >= 0 ? 0 : Math.min(4, Math.abs(step) + 1));
  const rLift = pose.rLift != null ? pose.rLift : (step <= 0 ? 0 : Math.min(4, Math.abs(step) + 1));
  const arm = pose.arm != null ? Math.round(pose.arm) : -Math.round(step * 0.7);
  return {
    lFoot,
    rFoot,
    lLift,
    rLift,
    lArm: pose.lArm != null ? Math.round(pose.lArm) : arm,
    rArm: pose.rArm != null ? Math.round(pose.rArm) : -arm,
  };
}

function px(g, x, y, w, h, color) {
  if (w <= 0 || h <= 0) return;
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function dot(g, x, y, color) {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), 1, 1);
}

/**
 * Classic Block Run pixel figure (40×40), facing right.
 * Hard pixels: brimmed cap above the brow, rectangular head,
 * straight hoodie, collar chain (no chest logo), gapped jeans,
 * clean sneakers. Shared by the hero and every ped.
 */
function paintClassicPixel(g, look, pose = {}) {
  g.clearRect(0, 0, 40, 40);
  const bob = pose.bob | 0;
  const lean = pose.lean | 0;
  const sit = !!pose.sit;
  const gait = gaitFromPose(pose);
  const footF = Math.round(Math.max(gait.lFoot, gait.rFoot));
  const footB = Math.round(Math.min(gait.lFoot, gait.rFoot));
  const liftF = gait.lFoot >= gait.rFoot ? gait.lLift : gait.rLift;
  const liftB = gait.lFoot < gait.rFoot ? gait.lLift : gait.rLift;
  const arm = Math.round(pose.arm != null ? pose.arm : gait.rArm || 0);
  const hatKind = look.hat || "none";
  const shirt = look.shirt;
  const shirtHi = look.hoodieHi || shadeHex(look.shirt, 36);
  const shirtLo = shadeHex(look.shirt, -40);
  const jean = look.pants;
  const jeanLo = look.jeansLo || shadeHex(look.pants, -30);
  const skin = look.skin;
  const skinLo = look.skinLo || shadeHex(look.skin, -40);
  const skinHi = shadeHex(look.skin, 16);
  const hair = look.hair || "#2a1810";
  const hairHi = shadeHex(hair, 28);
  const hat = look.accent || "#e31416";
  const hatLo = shadeHex(hat, -58);
  const hatHi = shadeHex(hat, 42);
  const shoe = look.shoes || "#f7f4ef";
  const shoeLo = shadeHex(shoe, -18);
  const red = look.shoeRed || shadeHex(shoe, -80);
  const chain = look.chain ? (look.chain === true ? "#ffd734" : look.chain) : null;
  const hip = 14 + lean + (sit ? 1 : 0);

  function sneaker(x, y) {
    px(g, x, y, 5, 2, shoe);
    px(g, x, y + 1, 5, 1, shoeLo);
    px(g, x + 1, y, 2, 1, red);
    px(g, x + 3, y, 2, 1, shoe);
    px(g, x + 4, y - 1, 1, 1, shoe);
    px(g, x, y + 2, 5, 1, "#1a1218");
  }
  function leg(x, lift, col, edge) {
    const y = 25 + bob - Math.min(4, Math.round(lift));
    px(g, x, y, 3, 8, col);
    px(g, x, y, 1, 8, edge);
    sneaker(x, y + 8);
  }
  if (sit) {
    leg(hip + 2, -1, jeanLo, shadeHex(jean, -18));
    leg(hip + 6, -1, jean, jeanLo);
  } else {
    leg(hip - 1 + footB, liftB, jeanLo, jeanLo);
    leg(hip + 5 + footF, liftF, jean, jeanLo);
  }

  const tx = hip + (sit ? 1 : 0);
  const ty = 13 + bob + (sit ? 2 : 0);
  px(g, tx, ty, 9, 12, shirt);
  px(g, tx, ty, 1, 12, shirtLo);
  px(g, tx + 8, ty, 1, 12, shirtHi);
  px(g, tx - 1, ty, 1, 3, shirt);
  px(g, tx + 9, ty, 1, 3, shirt);
  if (chain) {
    dot(g, tx + 3, ty, chain);
    dot(g, tx + 4, ty, chain);
    dot(g, tx + 5, ty, chain);
  }
  const ax = tx + 8 + (sit ? 1 : arm);
  px(g, tx + 7, ty + 2, 2, 5, shirt);
  px(g, ax, ty + 6, 2, 4, shirtLo);
  px(g, ax, ty + 10, 2, 2, skin);

  px(g, tx + 3, ty - 2, 3, 2, skin);
  const hx = tx + 1;
  const hy = 5 + bob;
  px(g, hx, hy, 8, 7, skin);
  px(g, hx + 7, hy + 1, 1, 5, skinHi);
  px(g, hx, hy + 1, 1, 5, skinLo);
  dot(g, hx + 5, hy + 2, "#fff8ee");
  dot(g, hx + 6, hy + 2, "#1a1210");
  dot(g, hx + 5, hy + 6, "#c4845a");
  dot(g, hx + 6, hy + 6, "#a86a42");

  if (hatKind === "none") {
    const spikes = [[0, 3], [2, 2], [4, 4], [6, 2], [8, 3]];
    spikes.forEach(([dx, hgt], i) => {
      px(g, hx + dx - 1, hy - hgt, 1, hgt, i % 2 === 0 ? hair : hairHi);
    });
    dot(g, hx, hy, hair);
  } else if (hatKind === "afro") {
    px(g, hx - 2, hy - 5, 12, 7, hair);
    px(g, hx, hy - 6, 8, 2, hairHi);
  } else if (hatKind === "durag") {
    px(g, hx - 1, hy - 3, 10, 3, "#2a1a28");
    px(g, hx + 2, hy - 4, 5, 1, hat);
    px(g, hx + 8, hy, 3, 2, "#1a1018");
  } else {
    px(g, hx, hy - 5, 8, 4, hat);
    px(g, hx, hy - 5, 8, 1, hatLo);
    px(g, hx + 2, hy - 6, 4, 1, hatHi);
    px(g, hx + 6, hy - 2, 5, 2, hat);
    px(g, hx + 6, hy - 1, 5, 1, hatLo);
    dot(g, hx - 1, hy - 5, hair);
    dot(g, hx - 1, hy - 4, hair);
    dot(g, hx - 2, hy - 3, hairHi);
    dot(g, hx - 1, hy - 2, hair);
    dot(g, hx, hy, hair);
    dot(g, hx + 1, hy + 1, hair);
  }
}

/** Shared classic pixel figure used by the hero and every pedestrian. */
export function paintPerson(g, look, pose = {}) {
  paintClassicPixel(g, look, pose);
}

/** Native 40×40 pixels. Nearest-filter billboards keep the classic hard edges. */
export const PERSON_SCALE = 1;
export const PERSON_SIZE = 40;

function paintPersonHi(g, look, pose) {
  g.imageSmoothingEnabled = false;
  paintPerson(g, look, pose);
  // Double-ring so peds read the same hard classic outline as the hero PNG sheets.
  const outline = look.outline || "#140010";
  ringOutline(g, PERSON_SIZE, PERSON_SIZE, outline);
  ringOutline(g, PERSON_SIZE, PERSON_SIZE, outline);
}

export function paintLook(i, pose) {
  const look = PED_LOOKS[i % PED_LOOKS.length];
  return pixelCanvas(PERSON_SIZE, PERSON_SIZE, (g) => paintPersonHi(g, look, pose));
}

export function paintWalkLook(i, poses = PED_WALK_POSES) {
  return poses.map((p) => paintLook(i, p));
}

export function paintPersonLook(look, pose) {
  return pixelCanvas(PERSON_SIZE, PERSON_SIZE, (g) => paintPersonHi(g, look, pose));
}

export function paintPlayerSet(look) {
  return {
    idle: IDLE_POSES.map((p) => paintPersonLook(look, p)),
    walk: WALK_CYCLE_POSES.map((p) => paintPersonLook(look, p)),
    run: RUN_CYCLE_POSES.map((p) => paintPersonLook(look, p)),
    jump: JUMP_POSES.map((p) => paintPersonLook(look, p)),
    shoot: SHOOT_POSES.map((p) => paintPersonLook(look, p)),
    turn: TURN_POSES.map((p) => paintPersonLook(look, p)),
    sit: SIT_POSES.map((p) => paintPersonLook(look, p)),
  };
}

/**
 * Classic Block Run runner (front view, matching idle/walk PNG palette):
 * red beanie, tan face, black hoodie, gold chain, blue jeans, white/red kicks.
 */
export const CLASSIC_HERO = {
  skin: "#fcb76c",
  skinLo: "#c77332",
  hat: "#e31416",
  hatLo: "#9c1010",
  hair: "#3a2218",
  hoodie: "#2d2b2e",
  hoodieHi: "#3a383c",
  jeans: "#1c51a1",
  jeansLo: "#0b377c",
  shoe: "#e8e4e0",
  shoeRed: "#c20e0e",
  chain: "#ffd734",
  outline: "#140010",
};

function isHatPixel(r, gv, b) {
  const skin = gv > 78 && b > 36 && (r - gv) < 90 && r > 130;
  if (skin) return false;
  const beanie = r > 80 && r > gv * 1.45 && r > b * 1.25 && gv < 110 && b < 100;
  const spike = r > 120 && r > b + 28 && gv < 175 && b < 100 && r > gv * 1.08;
  return beanie || spike;
}

function isSkinPixel(r, gv, b, a) {
  if (a < 16) return false;
  return gv > 78 && b > 36 && (r - gv) < 90 && r > 130;
}

function hairTone(nx, ny, edge) {
  if (edge) return [0x14, 0x00, 0x10];
  if (ny > 0.72 || nx * nx > 0.62) return [0x3a, 0x22, 0x18];
  if (nx < -0.12 && ny < 0.45) return [0x7a, 0x58, 0x40];
  return [0x5c, 0x3a, 0x28];
}

/**
 * Hat-off: copy the hat-on sprite, keep every pixel below the brim,
 * paint an opaque dark-brown short crop over the whole scalp (hat
 * pixels and holes), and ring it with a hard outline. Never a 3px
 * band and never a filled beanie blob.
 */
export function classicWithoutHat(src) {
  const w = src.width || src.naturalWidth || 40;
  const h = src.height || src.naturalHeight || 40;
  return pixelCanvas(w, h, (g) => {
    g.drawImage(src, 0, 0, w, h);
    const img = g.getImageData(0, 0, w, h);
    const d = img.data;
    const scanMax = Math.max(8, Math.floor(h * 0.28));
    let brimY = -1;
    const rowMin = [];
    const rowMax = [];
    let hatBlock = false;
    for (let y = 0; y < scanMax; y++) {
      let minX = w;
      let maxX = -1;
      let n = 0;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 16) continue;
        if (isSkinPixel(d[i], d[i + 1], d[i + 2], d[i + 3])) continue;
        if (!isHatPixel(d[i], d[i + 1], d[i + 2])) continue;
        n += 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
      rowMin[y] = minX;
      rowMax[y] = maxX;
      if (n >= 5) {
        hatBlock = true;
        brimY = y;
      } else if (hatBlock) {
        break;
      }
    }
    if (brimY < 3) return;
    let hatMinX = w;
    let hatMaxX = 0;
    for (let y = Math.max(0, brimY - 2); y <= brimY; y++) {
      if (rowMax[y] >= 0) {
        if (rowMin[y] < hatMinX) hatMinX = rowMin[y];
        if (rowMax[y] > hatMaxX) hatMaxX = rowMax[y];
      }
    }
    if (hatMaxX <= hatMinX) return;
    const mid = (hatMinX + hatMaxX) * 0.5;
    const hw = Math.max(4.2, (hatMaxX - hatMinX) * 0.52);
    const hairH = 6.2;
    const hairTop = Math.max(0, brimY - hairH + 1);
    function inScalp(x, y) {
      const nx = (x - mid) / (hw + 0.15);
      const ny = (brimY + 0.35 - y) / hairH;
      return nx * nx + ny * ny * 0.92 <= 1.08 && y >= hairTop - 0.2 && y <= brimY;
    }
    for (let y = 0; y <= brimY; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = d[i];
        const gv = d[i + 1];
        const b = d[i + 2];
        const a = d[i + 3];
        const skin = isSkinPixel(r, gv, b, a);
        const hat = a >= 16 && !skin && isHatPixel(r, gv, b);
        if (inScalp(x, y)) {
          if (skin && y === brimY) continue;
          if (skin && y > brimY - 1) continue;
          const nx = (x - mid) / (hw + 0.15);
          const ny = (brimY - y) / hairH;
          const edge = Math.abs(nx) > 0.78 || ny > 0.88 || y === hairTop;
          const [hr, hg, hb] = hairTone(nx, ny, false);
          d[i] = hr;
          d[i + 1] = hg;
          d[i + 2] = hb;
          d[i + 3] = 255;
          if (edge) {
            d[i] = 0x3a;
            d[i + 1] = 0x22;
            d[i + 2] = 0x18;
          }
        } else if (hat) {
          d[i] = 0;
          d[i + 1] = 0;
          d[i + 2] = 0;
          d[i + 3] = 0;
        }
      }
    }
    for (let y = brimY + 1; y <= Math.min(h - 1, brimY + 2); y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 16) continue;
        if (isSkinPixel(d[i], d[i + 1], d[i + 2], d[i + 3])) continue;
        if (!isHatPixel(d[i], d[i + 1], d[i + 2])) continue;
        if (Math.abs(x - mid) > hw + 1.5) continue;
        d[i] = 0x3a;
        d[i + 1] = 0x22;
        d[i + 2] = 0x18;
        d[i + 3] = 255;
      }
    }
    const out = new Uint8ClampedArray(d);
    for (let y = 0; y <= brimY; y++) {
      for (let x = 0; x < w; x++) {
        if (!inScalp(x, y)) continue;
        const i = (y * w + x) * 4;
        if (d[i + 3] < 16) continue;
        const nbs = [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]];
        for (const [dx, dy] of nbs) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || xx >= w || yy < 0 || yy > brimY) continue;
          const ni = (yy * w + xx) * 4;
          if (d[ni + 3] >= 16) continue;
          if (yy === brimY && dy > 0) continue;
          out[ni] = 0x14;
          out[ni + 1] = 0x00;
          out[ni + 2] = 0x10;
          out[ni + 3] = 255;
        }
      }
    }
    img.data.set(out);
    g.putImageData(img, 0, 0);
    g.fillStyle = "#8a6248";
    g.fillRect(Math.round(mid - 1.5), Math.max(0, brimY - 4), 3, 1);
  });
}

/** 3/4 view: slight squash, far-side shade, near rim, side-facing depth. */
export function threeQuarter(src, pose = {}) {
  const w = src.width || src.naturalWidth || 40;
  const h = src.height || src.naturalHeight || 40;
  const bob = pose.bob || 0;
  return pixelCanvas(w, h, (g) => {
    g.clearRect(0, 0, w, h);
    const nw = Math.max(8, Math.round(w * 0.88));
    const ox = Math.round((w - nw) * 0.42);
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0, w, h, ox, bob, nw, h);
    const img = g.getImageData(0, 0, w, h);
    const d = img.data;
    const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
    let minX = w;
    let maxX = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 10) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
    const span = Math.max(1, maxX - minX);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 10) continue;
        const u = (x - minX) / span;
        const ny = y / Math.max(1, h - 1);
        let lift = 0;
        if (u < 0.38) lift += 42 * (0.38 - u) / 0.38;
        else if (u > 0.55) lift -= 48 * (u - 0.55) / 0.45;
        lift -= ny * 16;
        if (u > 0.86) lift -= 22;
        d[i] = clamp(d[i] + lift);
        d[i + 1] = clamp(d[i + 1] + lift * 0.9);
        d[i + 2] = clamp(d[i + 2] + lift * 0.82);
      }
    }
    g.putImageData(img, 0, 0);
  });
}

/** Slice an idle frame into a planted stride: legs under the hips, heel on the floor. */
export function plantStride(src, pose = {}) {
  const w = src.width || src.naturalWidth || 32;
  const h = src.height || src.naturalHeight || 40;
  const waist = Math.round(h * 0.58);
  const mid = Math.round(w * 0.5);
  const bob = pose.bob || 0;
  const arm = pose.arm || 0;
  const arm0 = Math.round(h * 0.34);
  const hipIn = 0;
  const armBand = Math.max(6, waist - arm0);
  const armW = Math.max(8, Math.round(w * 0.26));
  return pixelCanvas(w, h, (g) => {
    g.clearRect(0, 0, w, h);
    g.drawImage(src, 0, 0, w, arm0, 0, bob, w, arm0);
    g.drawImage(src, armW, arm0, w - armW * 2, armBand, armW, bob + arm0, w - armW * 2, armBand);
    g.drawImage(src, 0, arm0, armW, armBand, -arm, bob + arm0, armW, armBand);
    g.drawImage(src, w - armW, arm0, armW, armBand, w - armW + arm, bob + arm0, armW, armBand);
    g.drawImage(src, 0, waist, mid, h - waist, (pose.leftDx || 0) + hipIn, waist + (pose.leftDy || 0), mid, h - waist);
    g.drawImage(src, mid, waist, w - mid, h - waist, mid + (pose.rightDx || 0) - hipIn, waist + (pose.rightDy || 0), w - mid, h - waist);
    const img = g.getImageData(0, 0, w, h);
    let lowest = 0;
    const d = img.data;
    for (let y = h - 1; y >= 0; y--) {
      let hit = false;
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 16) {
          hit = true;
          break;
        }
      }
      if (hit) {
        lowest = y;
        break;
      }
    }
    if (lowest < h - 1 && lowest > 4) {
      g.putImageData(img, 0, (h - 1) - lowest);
    }
  });
}

export function classicHeroLook(wardrobe = {}) {
  const c = CLASSIC_HERO;
  const hatOn = (wardrobe.hat ?? "beanie") !== "none";
  return {
    skin: c.skin,
    skinLo: c.skinLo,
    shirt: c.hoodie,
    hoodieHi: c.hoodieHi,
    pants: c.jeans,
    jeansLo: c.jeansLo,
    hair: c.hair,
    accent: c.hat,
    hat: hatOn ? "beanie" : "none",
    shoes: c.shoe,
    shoeRed: c.shoeRed,
    chain: c.chain,
  };
}

export function paintClassicHero(g, pose = {}, wardrobe = {}) {
  paintPerson(g, classicHeroLook(wardrobe), pose);
}

export function paintClassicHeroSet(wardrobe = { hat: "beanie" }) {
  const look = classicHeroLook(wardrobe);
  // Fallback painted set (live hero prefers classic PNG billboards).
  return {
    idle: IDLE_POSES.map((p) => paintPersonLook(look, p)),
    walk: WALK_CYCLE_POSES.map((p) => paintPersonLook(look, p)),
    run: RUN_CYCLE_POSES.map((p) => paintPersonLook(look, p)),
    jump: JUMP_POSES.map((p) => paintPersonLook(look, p)),
    shoot: SHOOT_POSES.map((p) => paintPersonLook(look, p)),
    turn: TURN_POSES.map((p) => paintPersonLook(look, p)),
    sit: SIT_POSES.map((p) => paintPersonLook(look, p)),
  };
}

/** 2.5D lighting pass used by peds: left fill, right shade, ground weight. */
export function restyleFor25d(src) {
  if (!src) return src;
  const w = src.width || src.naturalWidth || 32;
  const h = src.height || src.naturalHeight || 40;
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  return pixelCanvas(w, h, (g) => {
    g.drawImage(src, 0, 0);
    const img = g.getImageData(0, 0, w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 10) continue;
        const nx = x / Math.max(1, w - 1);
        const ny = y / Math.max(1, h - 1);
        let lift = 0;
        if (nx < 0.45) lift += 16 * (0.45 - nx) / 0.45;
        else if (nx > 0.55) lift -= 20 * (nx - 0.55) / 0.45;
        lift -= ny * 10;
        d[i] = clamp(d[i] + lift);
        d[i + 1] = clamp(d[i + 1] + lift * 0.92);
        d[i + 2] = clamp(d[i + 2] + lift * 0.85);
      }
    }
    g.putImageData(img, 0, 0);
  });
}

/** Stronger 2.5D volume for the hero: rim light, body shadow, side depth. */
export function volumeHero(src) {
  if (!src) return src;
  const w = src.width || src.naturalWidth || 32;
  const h = src.height || src.naturalHeight || 40;
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  return pixelCanvas(w, h, (g) => {
    g.drawImage(src, 0, 0);
    const img = g.getImageData(0, 0, w, h);
    const d = img.data;
    let minX = w;
    let maxX = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] < 10) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
    const span = Math.max(1, maxX - minX);
    for (let y = 0; y < h; y++) {
      let rowL = w;
      let rowR = 0;
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] < 10) continue;
        if (x < rowL) rowL = x;
        if (x > rowR) rowR = x;
      }
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 10) continue;
        const u = (x - minX) / span;
        const ny = y / Math.max(1, h - 1);
        let lift = 0;
        if (u < 0.4) lift += 38 * (0.4 - u) / 0.4;
        else if (u > 0.52) lift -= 44 * (u - 0.52) / 0.48;
        lift -= ny * 14;
        if (x <= rowL + 1) lift += 18;
        if (x >= rowR - 1) lift -= 26;
        d[i] = clamp(d[i] + lift);
        d[i + 1] = clamp(d[i + 1] + lift * 0.9);
        d[i + 2] = clamp(d[i + 2] + lift * 0.8);
      }
    }
    g.putImageData(img, 0, 0);
  });
}

export function paintCopFig() {
  return pixelCanvas(PERSON_SIZE, PERSON_SIZE, (g) => {
    paintPersonHi(g, {
      skin: "#c68642", shirt: "#1a2a58", pants: "#1a2438",
      hair: "#1a1210", accent: "#f0c430", hat: "cap", shoes: "#111018",
    });
  });
}

export function paintPlugFig() {
  return pixelCanvas(PERSON_SIZE, PERSON_SIZE, (g) => {
    paintPersonHi(g, {
      skin: "#8d5524", shirt: "#1a1a22", pants: "#2a2430",
      hair: "#1a1210", accent: "#f0c430", hat: "none", shoes: "#f0c430", chain: true,
    });
  });
}

export function setFromCanvases(base, extras = {}) {
  return {
    idle: extras.idle || poseSheet(base, IDLE_POSES),
    walk: extras.walk || poseSheet(base, WALK_POSES),
    jump: extras.jump || poseSheet(base, JUMP_POSES),
    shoot: extras.shoot || poseSheet(base, SHOOT_POSES),
    wave: extras.wave || poseSheet(base, WAVE_POSES),
  };
}
