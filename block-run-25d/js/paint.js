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
 * 8-frame gait: contact, down, passing, up (each side).
 * Planted foot stays on the canvas floor and travels backward so it does
 * not slide when the sprite origin moves at MOVE_SPEED.
 * Opposite arm: +arm swings the left arm forward.
 */
export const WALK_CYCLE_POSES = [
  { rFoot: 10, lFoot: -7, rLift: 0, lLift: 4, arm: 6, bob: 0 },
  { rFoot: 4, lFoot: -2, rLift: 0, lLift: 8, arm: 5, bob: 2 },
  { rFoot: -2, lFoot: 5, rLift: 0, lLift: 10, arm: 2, bob: 0 },
  { rFoot: -9, lFoot: 10, rLift: 2, lLift: 3, arm: -4, bob: 0 },
  { lFoot: 10, rFoot: -7, lLift: 0, rLift: 4, arm: -6, bob: 0 },
  { lFoot: 4, rFoot: -2, lLift: 0, rLift: 8, arm: -5, bob: 2 },
  { lFoot: -2, rFoot: 5, lLift: 0, rLift: 10, arm: -2, bob: 0 },
  { lFoot: -9, rFoot: 10, lLift: 2, rLift: 3, arm: 4, bob: 0 },
];
export const PED_WALK_POSES = WALK_CYCLE_POSES;
/**
 * Game-x of one full gait cycle (both feet).
 * 20px planted-foot travel on a 40px / 3.05m billboard = 1.525m
 * = 1.525 * WORLD/STREET_LEN ≈ 11.7 game units. Keep in lockstep so
 * the planted shoe does not slide on the pavement.
 */
export const STRIDE_CYCLE = 12;
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
  { threeQ: true, bob: 0 },
  { threeQ: true, bob: 1 },
];
export const SIT_POSES = [
  { sit: true, bob: 0 },
  { sit: true, bob: 1 },
];
export const IDLE_POSES = [
  { bob: 0 },
  { bob: 1 },
  { bob: 1, armDx: 1 },
  { bob: 0 },
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

export const PED_LOOKS = [
  { skin: "#f1c27d", shirt: "#c4283a", pants: "#2a2a38", hair: "#1a1210", accent: "#8a1020", hat: "beanie", shoes: "#1a1a22" },
  { skin: "#e0ac69", shirt: "#2a8a8a", pants: "#3a3048", hair: "#2a1a10", accent: "#f0c430", hat: "none", shoes: "#f4f0e8" },
  { skin: "#c68642", shirt: "#f4f0e8", pants: "#1a1a22", hair: "#1a1210", accent: "#f0c430", hat: "cap", shoes: "#2a2430", chain: true },
  { skin: "#8d5524", shirt: "#5a2a8a", pants: "#3a3020", hair: "#1a1210", accent: "#c8a0e8", hat: "durag", shoes: "#1a1210" },
  { skin: "#d4a574", shirt: "#f0c430", pants: "#2a2438", hair: "#1a1210", accent: "#e21b7a", hat: "afro", shoes: "#c4283a" },
  { skin: "#ffdbac", shirt: "#1a3a68", pants: "#f4f0e8", hair: "#6a4430", accent: "#3de0ff", hat: "none", shoes: "#1a1a22" },
  { skin: "#a36c41", shirt: "#2a2438", pants: "#1a1a22", hair: "#1a1210", accent: "#f4f0e8", hat: "beanie", shoes: "#c4283a" },
  { skin: "#e8be8a", shirt: "#e21b7a", pants: "#3a3048", hair: "#2a1a10", accent: "#f0c430", hat: "cap", shoes: "#f4f0e8" },
  { skin: "#c68642", shirt: "#4a3020", pants: "#1c51a1", hair: "#1a1210", accent: "#c4283a", hat: "none", shoes: "#1a1a22" },
  { skin: "#f1c27d", shirt: "#3a5a38", pants: "#2a2430", hair: "#2a1a10", accent: "#f0c430", hat: "cap", shoes: "#c4283a" },
  { skin: "#8d5524", shirt: "#1a1a22", pants: "#f4f0e8", hair: "#1a1210", accent: "#e21b7a", hat: "beanie", shoes: "#f4f0e8", chain: true },
  { skin: "#d4a574", shirt: "#f4f0e8", pants: "#3a3048", hair: "#3a2218", accent: "#2a4a8a", hat: "none", shoes: "#1a1210" },
];

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

/** Shared SNES-volume figure used by the hero and every pedestrian. */
export function paintPerson(g, look, pose = {}) {
  g.clearRect(0, 0, 40, 40);
  const sit = !!pose.sit;
  const threeQ = !!pose.threeQ;
  const bob = pose.bob || 0;
  const ox = threeQ ? 2 : (sit ? 1 : 0);
  const y = (n) => n + bob + (sit ? 4 : 0);
  const gait = gaitFromPose(pose);
  const shirtHi = look.hoodieHi || shadeHex(look.shirt, 32);
  const shirtLo = shadeHex(look.shirt, -34);
  const pantsLo = look.jeansLo || shadeHex(look.pants, -26);
  const pantsHi = shadeHex(look.pants, 20);
  const skinLo = look.skinLo || shadeHex(look.skin, -24);
  const skinHi = shadeHex(look.skin, 18);
  const hairLo = shadeHex(look.hair, -18);
  const outline = "#140010";
  const bodyW = threeQ || sit ? 12 : 14;

  g.fillStyle = outline;
  g.fillRect(13 + ox, y(sit ? 6 : 3), bodyW, sit ? 22 : 34);

  if (sit) {
    g.fillStyle = look.pants;
    g.fillRect(11 + ox, y(20), 17, 6);
    g.fillStyle = pantsHi;
    g.fillRect(12 + ox, y(20), 6, 3);
    g.fillStyle = pantsLo;
    g.fillRect(12 + ox, y(25), 5, 6);
    g.fillRect(23 + ox, y(25), 5, 6);
    g.fillStyle = look.shoes;
    g.fillRect(11 + ox, y(30), 7, 4);
    g.fillRect(22 + ox, y(30), 7, 4);
    g.fillStyle = shadeHex(look.shoes, 40);
    g.fillRect(12 + ox, y(30), 3, 1);
    g.fillRect(23 + ox, y(30), 3, 1);
    if (look.shoeRed) {
      g.fillStyle = look.shoeRed;
      g.fillRect(11 + ox, y(31), 2, 2);
      g.fillRect(22 + ox, y(31), 2, 2);
    }
  } else {
    const lPlant = gait.lLift <= 0;
    const rPlant = gait.rLift <= 0;
    g.fillStyle = pantsLo;
    g.fillRect(15 + ox + gait.lFoot, y(26) - gait.lLift, 5, 10 + gait.lLift);
    g.fillStyle = look.pants;
    g.fillRect(20 + ox + gait.rFoot, y(26) - gait.rLift, 5, 10 + gait.rLift);
    g.fillStyle = pantsHi;
    g.fillRect(16 + ox + gait.lFoot, y(27) - gait.lLift, 1, 7);
    g.fillRect(21 + ox + gait.rFoot, y(27) - gait.rLift, 1, 7);
    g.fillStyle = look.pants;
    g.fillRect(16 + ox, y(25), 8, 4);

    const lShoeY = lPlant ? 36 : 36 - gait.lLift;
    const rShoeY = rPlant ? 36 : 36 - gait.rLift;
    g.fillStyle = look.shoes;
    g.fillRect(14 + ox + gait.lFoot, lShoeY, 6, 4);
    g.fillRect(20 + ox + gait.rFoot, rShoeY, 6, 4);
    g.fillStyle = shadeHex(look.shoes, 44);
    g.fillRect(15 + ox + gait.lFoot, lShoeY, 3, 1);
    g.fillRect(21 + ox + gait.rFoot, rShoeY, 3, 1);
    g.fillStyle = shadeHex(look.shoes, -40);
    g.fillRect(14 + ox + gait.lFoot, lShoeY + 2, 2, 2);
    g.fillRect(20 + ox + gait.rFoot, rShoeY + 2, 2, 2);
    if (look.shoeRed) {
      g.fillStyle = look.shoeRed;
      g.fillRect(14 + ox + gait.lFoot, lShoeY + 1, 2, 2);
      g.fillRect(20 + ox + gait.rFoot, rShoeY + 1, 2, 2);
    }
  }

  g.fillStyle = look.shirt;
  g.fillRect(13 + ox, y(16), bodyW, 11);
  g.fillStyle = shirtHi;
  g.fillRect(14 + ox, y(17), threeQ ? 4 : 5, 8);
  g.fillStyle = shadeHex(look.shirt, 48);
  g.fillRect(15 + ox, y(18), 1, 6);
  g.fillStyle = shirtLo;
  g.fillRect((threeQ ? 22 : 23) + ox, y(17), 3, 8);
  g.fillStyle = look.accent;
  g.fillRect(13 + ox, y(16), bodyW, 2);
  g.fillStyle = shirtLo;
  g.fillRect(13 + ox, y(25), bodyW, 1);
  g.fillStyle = shadeHex(look.shirt, 36);
  g.fillRect(17 + ox, y(21), 4, 1);

  if (look.chain) {
    g.fillStyle = look.chain === true ? "#f0c430" : look.chain;
    g.fillRect(17 + ox, y(18), 6, 1);
    g.fillRect(19 + ox, y(19), 2, 2);
  }

  const lArm = sit ? 0 : gait.lArm;
  const rArm = sit ? 0 : gait.rArm;
  g.fillStyle = look.skin;
  if (!threeQ) g.fillRect(10 + lArm, y(18), 4, sit ? 5 : 7);
  g.fillRect(26 + ox + rArm, y(18), 4, sit ? 5 : 7);
  g.fillStyle = look.shirt;
  if (!threeQ) g.fillRect(10 + lArm, y(17), 4, 3);
  g.fillRect(26 + ox + rArm, y(17), 4, 3);
  g.fillStyle = skinLo;
  if (!threeQ) g.fillRect(10 + lArm, y(23), 4, 1);
  g.fillRect(26 + ox + rArm, y(23), 4, 1);

  g.fillStyle = look.skin;
  g.fillRect(14 + ox, y(8), threeQ ? 10 : 12, 9);
  g.fillStyle = skinHi;
  g.fillRect(15 + ox, y(9), 4, 6);
  g.fillStyle = skinLo;
  g.fillRect((threeQ ? 21 : 22) + ox, y(10), 3, 6);
  g.fillStyle = "#f4e6d4";
  g.fillRect(16 + ox, y(11), 2, 2);
  if (!threeQ) g.fillRect(21, y(11), 2, 2);
  g.fillStyle = "#1a1210";
  g.fillRect(17 + ox, y(11), 1, 2);
  if (!threeQ) g.fillRect(22, y(11), 1, 2);
  g.fillStyle = skinLo;
  g.fillRect(18 + ox, y(15), threeQ ? 3 : 4, 1);
  g.fillStyle = skinHi;
  g.fillRect(16 + ox, y(13), 2, 1);

  const hatKind = look.hat || "none";
  if (hatKind === "beanie") {
    g.fillStyle = outline;
    g.fillRect(14 + ox, y(3), threeQ ? 10 : 12, 6);
    g.fillStyle = look.accent;
    g.fillRect(15 + ox, y(3), threeQ ? 8 : 10, 5);
    g.fillStyle = shadeHex(look.accent, 28);
    g.fillRect(16 + ox, y(3), threeQ ? 6 : 8, 2);
    g.fillStyle = look.accent;
    g.fillRect(16 + ox, y(2), threeQ ? 6 : 8, 2);
    g.fillStyle = look.hair;
    g.fillRect(15 + ox, y(7), 2, 2);
    g.fillRect(23 + ox, y(7), 2, 2);
  } else if (hatKind === "cap") {
    g.fillStyle = outline;
    g.fillRect(14 + ox, y(3), 12, 5);
    g.fillStyle = "#2a4a8a";
    g.fillRect(15 + ox, y(3), 10, 4);
    g.fillStyle = shadeHex("#2a4a8a", 36);
    g.fillRect(16 + ox, y(3), 6, 2);
    g.fillStyle = "#1a2a58";
    g.fillRect(24 + ox, y(6), 5, 2);
    g.fillStyle = look.hair;
    g.fillRect(15 + ox, y(7), 2, 3);
  } else if (hatKind === "durag") {
    g.fillStyle = outline;
    g.fillRect(13 + ox, y(3), 14, 6);
    g.fillStyle = "#2a1a28";
    g.fillRect(14 + ox, y(3), 12, 5);
    g.fillStyle = look.accent;
    g.fillRect(16 + ox, y(4), 8, 2);
    g.fillStyle = "#1a1018";
    g.fillRect(24 + ox, y(7), 4, 2);
  } else if (hatKind === "afro") {
    g.fillStyle = look.hair;
    g.fillRect(12 + ox, y(2), 16, 8);
    g.fillStyle = hairLo;
    g.fillRect(12 + ox, y(3), 3, 6);
    g.fillRect(25 + ox, y(3), 3, 6);
    g.fillStyle = shadeHex(look.hair, 22);
    g.fillRect(18 + ox, y(3), 4, 2);
  } else {
    g.fillStyle = outline;
    g.fillRect(14 + ox, y(3), 12, 6);
    g.fillStyle = look.hair;
    g.fillRect(15 + ox, y(3), 10, 5);
    g.fillStyle = shadeHex(look.hair, 28);
    g.fillRect(16 + ox, y(4), 4, 2);
    g.fillStyle = hairLo;
    g.fillRect(15 + ox, y(6), 2, 2);
    g.fillRect(23 + ox, y(6), 2, 2);
  }
}

export function paintLook(i, pose) {
  const look = PED_LOOKS[i % PED_LOOKS.length];
  return pixelCanvas(40, 40, (g) => paintPerson(g, look, pose));
}

export function paintWalkLook(i, poses = PED_WALK_POSES) {
  return poses.map((p) => paintLook(i, p));
}

export function paintPersonLook(look, pose) {
  return pixelCanvas(40, 40, (g) => paintPerson(g, look, pose));
}

export function paintPlayerSet(look) {
  return {
    idle: IDLE_POSES.map((p) => paintPersonLook(look, p)),
    walk: WALK_CYCLE_POSES.map((p) => paintPersonLook(look, p)),
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
  return {
    idle: IDLE_POSES.map((p) => paintPersonLook(look, p)),
    walk: WALK_CYCLE_POSES.map((p) => paintPersonLook(look, p)),
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
  return pixelCanvas(40, 40, (g) => {
    paintPerson(g, {
      skin: "#c68642", shirt: "#1a2a58", pants: "#1a2438",
      hair: "#1a1210", accent: "#f0c430", hat: "cap", shoes: "#111018",
    });
    g.fillStyle = "#2a4a8a";
    g.fillRect(15, 3, 10, 4);
    g.fillRect(24, 6, 6, 2);
    g.fillStyle = "#f0c430";
    g.fillRect(17, 20, 6, 3);
  });
}

export function paintPlugFig() {
  return pixelCanvas(40, 40, (g) => {
    paintPerson(g, {
      skin: "#8d5524", shirt: "#1a1a22", pants: "#2a2430",
      hair: "#1a1210", accent: "#f0c430", hat: "none", shoes: "#f0c430", chain: true,
    });
    g.fillStyle = "#e21b7a";
    g.fillRect(13, 16, 14, 2);
    g.fillStyle = "#f0c430";
    g.fillRect(24, 18, 4, 4);
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
