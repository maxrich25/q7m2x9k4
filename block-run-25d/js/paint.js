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
/** Planted stride: visible step, opposite arm, heel on the floor. */
export const PED_WALK_POSES = [
  { step: 3, bob: 0 },
  { step: 2, bob: 1 },
  { step: 0, bob: 0 },
  { step: -3, bob: 0 },
  { step: -2, bob: 1 },
  { step: 0, bob: 0 },
];
/** PNG stride: clear swing, planted heel, opposite arm, not bow-legged. */
export const STRIDE_POSES = [
  { leftDx: 2, leftDy: 0, rightDx: -1, rightDy: -6, bob: 0, arm: 4 },
  { leftDx: 1, leftDy: 0, rightDx: 0, rightDy: -3, bob: 1, arm: 2 },
  { leftDx: 0, leftDy: -2, rightDx: 0, rightDy: 0, bob: 0, arm: 0 },
  { leftDx: -1, leftDy: -6, rightDx: 2, rightDy: 0, bob: 0, arm: -4 },
  { leftDx: 0, leftDy: -3, rightDx: 1, rightDy: 0, bob: 1, arm: -2 },
  { leftDx: 0, leftDy: 0, rightDx: 0, rightDy: -2, bob: 0, arm: 0 },
];
export const TURN_POSES = [
  { threeQ: true, bob: 0 },
  { threeQ: true, bob: 1 },
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

export function paintPerson(g, look, pose = {}) {
  g.clearRect(0, 0, 40, 40);
  const bob = pose.bob || 0;
  const step = pose.step || 0;
  const y = (n) => n + bob;
  const lLeg = Math.round(step);
  const rLeg = -Math.round(step);
  const lArm = -Math.round(step * 0.7);
  const rArm = Math.round(step * 0.7);
  const lLift = step >= 0 ? 0 : Math.min(4, Math.abs(step) + 1);
  const rLift = step <= 0 ? 0 : Math.min(4, Math.abs(step) + 1);
  const shirtHi = shadeHex(look.shirt, 28);
  const shirtLo = shadeHex(look.shirt, -32);
  const pantsLo = shadeHex(look.pants, -24);
  const pantsHi = shadeHex(look.pants, 18);
  const skinLo = shadeHex(look.skin, -22);
  const skinHi = shadeHex(look.skin, 16);
  const hairLo = shadeHex(look.hair, -18);
  const outline = "#140010";

  g.fillStyle = outline;
  g.fillRect(13, y(3), 14, 34);

  g.fillStyle = pantsLo;
  g.fillRect(15 + lLeg, y(26) - lLift, 5, 10 + lLift);
  g.fillStyle = look.pants;
  g.fillRect(20 + rLeg, y(26) - rLift, 5, 10 + rLift);
  g.fillStyle = pantsHi;
  g.fillRect(16 + lLeg, y(27) - lLift, 1, 7);
  g.fillRect(21 + rLeg, y(27) - rLift, 1, 7);
  g.fillStyle = look.pants;
  g.fillRect(16, y(25), 8, 4);

  g.fillStyle = look.shoes;
  g.fillRect(14 + lLeg, 36 - lLift, 6, 4);
  g.fillRect(20 + rLeg, 36 - rLift, 6, 4);
  g.fillStyle = shadeHex(look.shoes, 40);
  g.fillRect(15 + lLeg, 36 - lLift, 3, 1);
  g.fillRect(21 + rLeg, 36 - rLift, 3, 1);
  g.fillStyle = shadeHex(look.shoes, -36);
  g.fillRect(14 + lLeg, 38 - lLift, 2, 2);
  g.fillRect(20 + rLeg, 38 - rLift, 2, 2);

  g.fillStyle = look.shirt;
  g.fillRect(13, y(16), 14, 11);
  g.fillStyle = shirtHi;
  g.fillRect(15, y(17), 5, 8);
  g.fillStyle = shirtLo;
  g.fillRect(23, y(17), 3, 8);
  g.fillStyle = look.accent;
  g.fillRect(13, y(16), 14, 2);
  g.fillStyle = shirtLo;
  g.fillRect(13, y(25), 14, 1);
  g.fillStyle = shadeHex(look.shirt, 40);
  g.fillRect(18, y(17), 1, 8);
  g.fillRect(16, y(21), 4, 1);

  if (look.chain) {
    g.fillStyle = "#f0c430";
    g.fillRect(17, y(18), 6, 1);
    g.fillRect(19, y(19), 2, 2);
  }

  g.fillStyle = look.skin;
  g.fillRect(10 + lArm, y(18), 4, 7);
  g.fillRect(26 + rArm, y(18), 4, 7);
  g.fillStyle = look.shirt;
  g.fillRect(10 + lArm, y(17), 4, 3);
  g.fillRect(26 + rArm, y(17), 4, 3);

  g.fillStyle = look.skin;
  g.fillRect(14, y(8), 12, 9);
  g.fillStyle = skinHi;
  g.fillRect(15, y(9), 4, 6);
  g.fillStyle = skinLo;
  g.fillRect(22, y(10), 3, 6);
  g.fillStyle = "#f4e6d4";
  g.fillRect(16, y(11), 2, 2);
  g.fillRect(21, y(11), 2, 2);
  g.fillStyle = "#1a1210";
  g.fillRect(17, y(11), 1, 2);
  g.fillRect(22, y(11), 1, 2);
  g.fillStyle = skinLo;
  g.fillRect(18, y(15), 4, 1);

  if (look.hat === "beanie") {
    g.fillStyle = outline;
    g.fillRect(14, y(3), 12, 6);
    g.fillStyle = look.accent;
    g.fillRect(15, y(3), 10, 5);
    g.fillStyle = shadeHex(look.accent, 28);
    g.fillRect(16, y(3), 8, 2);
    g.fillStyle = look.hair;
    g.fillRect(15, y(7), 2, 2);
    g.fillRect(23, y(7), 2, 2);
  } else if (look.hat === "cap") {
    g.fillStyle = outline;
    g.fillRect(14, y(3), 12, 5);
    g.fillStyle = "#2a4a8a";
    g.fillRect(15, y(3), 10, 4);
    g.fillStyle = shadeHex("#2a4a8a", 36);
    g.fillRect(16, y(3), 6, 2);
    g.fillStyle = "#1a2a58";
    g.fillRect(24, y(6), 5, 2);
    g.fillStyle = look.hair;
    g.fillRect(15, y(7), 2, 3);
  } else if (look.hat === "durag") {
    g.fillStyle = outline;
    g.fillRect(13, y(3), 14, 6);
    g.fillStyle = "#2a1a28";
    g.fillRect(14, y(3), 12, 5);
    g.fillStyle = look.accent;
    g.fillRect(16, y(4), 8, 2);
    g.fillStyle = "#1a1018";
    g.fillRect(24, y(7), 4, 2);
  } else if (look.hat === "afro") {
    g.fillStyle = look.hair;
    g.fillRect(12, y(2), 16, 8);
    g.fillStyle = hairLo;
    g.fillRect(12, y(3), 3, 6);
    g.fillRect(25, y(3), 3, 6);
    g.fillStyle = shadeHex(look.hair, 22);
    g.fillRect(18, y(3), 4, 2);
  } else {
    g.fillStyle = look.hair;
    g.fillRect(16, y(6), 8, 3);
    g.fillRect(15, y(7), 10, 2);
    g.fillStyle = hairLo;
    g.fillRect(14, y(8), 2, 2);
    g.fillRect(24, y(8), 2, 2);
    g.fillStyle = shadeHex(look.hair, 24);
    g.fillRect(17, y(6), 3, 1);
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
    walk: PED_WALK_POSES.map((p) => paintPersonLook(look, p)),
    jump: JUMP_POSES.map((p) => paintPersonLook(look, p)),
    shoot: SHOOT_POSES.map((p) => paintPersonLook(look, p)),
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

function hairTone(nx, edge) {
  if (edge) return [0x24, 0x14, 0x10];
  if (nx * nx > 0.45) return [0x2a, 0x18, 0x10];
  return [0x3a, 0x22, 0x18];
}

/**
 * Hat-off: never touch a pixel below the beanie brim.
 * Short modern cut (low fade / short waves), not a filled beanie silhouette.
 */
export function classicWithoutHat(src) {
  const w = src.width || src.naturalWidth || 40;
  const h = src.height || src.naturalHeight || 40;
  return pixelCanvas(w, h, (g) => {
    g.drawImage(src, 0, 0, w, h);
    const img = g.getImageData(0, 0, w, h);
    const d = img.data;
    let brimY = -1;
    let hatMinX = w;
    let hatMaxX = 0;
    const scanMax = Math.max(8, Math.floor(h * 0.42));
    for (let y = 0; y < scanMax; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 16) continue;
        const r = d[i];
        const gv = d[i + 1];
        const b = d[i + 2];
        if (!isHatPixel(r, gv, b)) continue;
        if (y > brimY) brimY = y;
        if (x < hatMinX) hatMinX = x;
        if (x > hatMaxX) hatMaxX = x;
      }
    }
    if (brimY < 2 || hatMaxX <= hatMinX) return;
    const mid = (hatMinX + hatMaxX) * 0.5;
    const hw = Math.max(2.0, (hatMaxX - hatMinX) * 0.38);
    const hairTop = Math.max(0, brimY - 3);
    for (let y = 0; y <= brimY; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = d[i];
        const gv = d[i + 1];
        const b = d[i + 2];
        const a = d[i + 3];
        const hat = a >= 16 && isHatPixel(r, gv, b);
        const nx = (x - mid) / (hw + 0.35);
        const ny = (brimY - y) / 3.15;
        const inCut = y >= hairTop && nx * nx + ny * ny <= 1.04 && Math.abs(nx) < 1.08;
        if (y < hairTop) {
          if (hat) {
            d[i] = 0;
            d[i + 1] = 0;
            d[i + 2] = 0;
            d[i + 3] = 0;
          }
          continue;
        }
        if (!inCut) {
          if (hat) {
            d[i] = 0;
            d[i + 1] = 0;
            d[i + 2] = 0;
            d[i + 3] = 0;
          }
          continue;
        }
        if (!hat && a >= 16) continue;
        const fade = Math.abs(nx) > 0.62 || y === brimY;
        const [hr, hg, hb] = hairTone(nx, fade);
        d[i] = hr;
        d[i + 1] = hg;
        d[i + 2] = hb;
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    g.fillStyle = "#5a4030";
    g.fillRect(Math.round(mid - 1), Math.max(0, brimY - 2), 3, 1);
    g.fillStyle = "#2a1810";
    g.fillRect(Math.round(mid - hw + 0.4), brimY - 1, 2, 1);
    g.fillRect(Math.round(mid + hw - 1.4), brimY - 1, 2, 1);
  });
}

/** 3/4 turn frame: squash-free body rotation, far-side shade, near shoulder. */
export function threeQuarter(src, pose = {}) {
  const w = src.width || src.naturalWidth || 40;
  const h = src.height || src.naturalHeight || 40;
  const bob = pose.bob || 0;
  return pixelCanvas(w, h, (g) => {
    g.clearRect(0, 0, w, h);
    const nw = Math.max(8, Math.round(w * 0.82));
    const ox = Math.round((w - nw) * 0.55);
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0, w, h, ox, bob, nw, h);
    const img = g.getImageData(0, 0, w, h);
    const d = img.data;
    const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 10) continue;
        const u = (x - ox) / Math.max(1, nw);
        let lift = 0;
        if (u < 0.28) lift -= 28 * (0.28 - u) / 0.28;
        else if (u > 0.62) lift += 14 * (u - 0.62) / 0.38;
        d[i] = clamp(d[i] + lift);
        d[i + 1] = clamp(d[i + 1] + lift * 0.92);
        d[i + 2] = clamp(d[i + 2] + lift * 0.85);
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

export function paintClassicHero(g, pose = {}, wardrobe = {}) {
  g.clearRect(0, 0, 40, 40);
  const bob = pose.bob || 0;
  const step = pose.step || 0;
  const hatOn = (wardrobe.hat ?? "beanie") !== "none";
  const c = CLASSIC_HERO;
  const y = (n) => n + bob;
  const lLeg = Math.round(step);
  const rLeg = -Math.round(step);
  const lArm = -Math.round(step * 0.6);
  const rArm = Math.round(step * 0.6);

  const threeQ = !!pose.threeQ;
  const ox = threeQ ? 2 : 0;
  g.fillStyle = c.outline;
  g.fillRect(13 + ox, y(3), threeQ ? 12 : 14, 34);

  const lLift = step >= 0 ? 0 : Math.min(4, Math.abs(lLeg) + 1);
  const rLift = step <= 0 ? 0 : Math.min(4, Math.abs(rLeg) + 1);

  g.fillStyle = c.jeansLo;
  g.fillRect(15 + ox + lLeg, y(26) - lLift, 5, 10 + lLift);
  g.fillStyle = c.jeans;
  g.fillRect(20 + ox + rLeg, y(26) - rLift, 5, 10 + rLift);
  g.fillStyle = c.jeans;
  g.fillRect(16 + ox, y(25), 8, 4);

  g.fillStyle = c.shoe;
  g.fillRect(14 + ox + lLeg, 36 - lLift, 6, 4);
  g.fillRect(20 + ox + rLeg, 36 - rLift, 6, 4);
  g.fillStyle = c.shoeRed;
  g.fillRect(14 + ox + lLeg, 37 - lLift, 2, 2);
  g.fillRect(20 + ox + rLeg, 37 - rLift, 2, 2);
  g.fillStyle = "#f4f0e8";
  g.fillRect(18 + ox + lLeg, 36 - lLift, 2, 1);
  g.fillRect(24 + ox + rLeg, 36 - rLift, 2, 1);

  g.fillStyle = c.hoodie;
  g.fillRect(13 + ox, y(16), threeQ ? 12 : 14, 11);
  g.fillStyle = c.hoodieHi;
  g.fillRect(15 + ox, y(17), threeQ ? 4 : 5, 8);
  g.fillStyle = c.chain;
  g.fillRect(17 + ox, y(18), 6, 1);
  g.fillRect(19 + ox, y(19), 2, 2);

  g.fillStyle = c.skin;
  if (!threeQ) g.fillRect(10 + lArm, y(18), 4, 7);
  g.fillRect(26 + ox + rArm, y(18), 4, 7);
  g.fillStyle = c.hoodie;
  if (!threeQ) g.fillRect(10 + lArm, y(17), 4, 3);
  g.fillRect(26 + ox + rArm, y(17), 4, 3);

  g.fillStyle = c.skin;
  g.fillRect(14 + ox, y(8), threeQ ? 10 : 12, 9);
  g.fillStyle = c.skinLo;
  g.fillRect((threeQ ? 21 : 22) + ox, y(10), 3, 6);
  g.fillStyle = "#f4e6d4";
  g.fillRect(16 + ox, y(11), 2, 2);
  if (!threeQ) g.fillRect(21, y(11), 2, 2);
  g.fillStyle = "#1a1210";
  g.fillRect(17 + ox, y(11), 1, 2);
  if (!threeQ) g.fillRect(22, y(11), 1, 2);
  g.fillStyle = c.skinLo;
  g.fillRect(18 + ox, y(15), threeQ ? 3 : 4, 1);

  if (hatOn) {
    g.fillStyle = c.hatLo;
    g.fillRect(14 + ox, y(3), threeQ ? 10 : 12, 6);
    g.fillStyle = c.hat;
    g.fillRect(15 + ox, y(3), threeQ ? 8 : 10, 5);
    g.fillRect(16 + ox, y(2), threeQ ? 6 : 8, 2);
  } else {
    g.fillStyle = c.hair;
    g.fillRect(16 + ox, y(6), 8, 3);
    g.fillRect(15 + ox, y(7), 10, 2);
    g.fillStyle = "#2a1810";
    g.fillRect(14 + ox, y(8), 2, 2);
    g.fillRect(24 + ox, y(8), 2, 2);
    g.fillStyle = "#5a4030";
    g.fillRect(17 + ox, y(6), 3, 1);
  }
}

export function paintClassicHeroSet(wardrobe = { hat: "beanie" }) {
  return {
    idle: IDLE_POSES.map((p) => pixelCanvas(40, 40, (g) => paintClassicHero(g, p, wardrobe))),
    walk: PED_WALK_POSES.map((p) => pixelCanvas(40, 40, (g) => paintClassicHero(g, p, wardrobe))),
    jump: JUMP_POSES.map((p) => pixelCanvas(40, 40, (g) => paintClassicHero(g, p, wardrobe))),
    shoot: SHOOT_POSES.map((p) => pixelCanvas(40, 40, (g) => paintClassicHero(g, p, wardrobe))),
    turn: TURN_POSES.map((p) => pixelCanvas(40, 40, (g) => paintClassicHero(g, p, wardrobe))),
  };
}

/** 2.5D lighting pass used by peds and the hero: left fill, right shade, ground weight. */
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
