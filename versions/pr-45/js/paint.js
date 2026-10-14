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
  { side: true, rFoot: 2, lFoot: -1.5, rLift: 0, lLift: 1.5, arm: 2, bob: 0 },
  { side: true, rFoot: 0.5, lFoot: -0.5, rLift: 0, lLift: 2, arm: 1.5, bob: 0.5 },
  { side: true, rFoot: -1, lFoot: 1, rLift: 0.5, lLift: 1.5, arm: 0.5, bob: 0 },
  { side: true, rFoot: -1.5, lFoot: 2, rLift: 1, lLift: 0.5, arm: -1.5, bob: 0 },
  { side: true, lFoot: 2, rFoot: -1.5, lLift: 0, rLift: 1.5, arm: -2, bob: 0 },
  { side: true, lFoot: 0.5, rFoot: -0.5, lLift: 0, rLift: 2, arm: -1.5, bob: 0.5 },
  { side: true, lFoot: -1, rFoot: 1, lLift: 0.5, rLift: 1.5, arm: -0.5, bob: 0 },
  { side: true, lFoot: -1.5, rFoot: 2, lLift: 1, rLift: 0.5, arm: 1.5, bob: 0 },
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
 * ~8px plant travel on 40px / 3.05m ≈ 0.61m ≈ 4.7 game units.
 */
export const STRIDE_CYCLE = 6;
/** Run cycle length in game-x (longer plant travel). */
export const RUN_STRIDE_CYCLE = 10;
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

function fillOval(g, cx, cy, rx, ry, color) {
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}

function fillLimb(g, x0, y0, x1, y1, w0, w1, color) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.max(0.001, Math.hypot(dx, dy));
  const nx = -dy / len;
  const ny = dx / len;
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x0 + nx * w0, y0 + ny * w0);
  g.lineTo(x1 + nx * w1, y1 + ny * w1);
  g.lineTo(x1 - nx * w1, y1 - ny * w1);
  g.lineTo(x0 - nx * w0, y0 - ny * w0);
  g.closePath();
  g.fill();
  fillOval(g, x0, y0, w0, w0, color);
  fillOval(g, x1, y1, w1, w1, color);
}

function paintHand(g, x, y, skin, side = false) {
  fillOval(g, x, y, side ? 1.35 : 1.55, side ? 1.2 : 1.45, skin);
  fillOval(g, x + (side ? 0.7 : 0), y + 0.55, 0.7, 0.55, skin);
}

/** Shared refined figure used by the hero and every pedestrian. */
export function paintPerson(g, look, pose = {}) {
  g.clearRect(0, 0, 40, 40);
  const sit = !!pose.sit;
  const side = !!pose.side || !!pose.threeQ;
  const run = !!pose.run;
  const lean = pose.lean || (run ? 2 : 0);
  const bob = pose.bob || 0;
  const y = (n) => n + bob + (sit ? 3 : 0);
  const gait = gaitFromPose(pose);
  const shirtHi = look.hoodieHi || shadeHex(look.shirt, 28);
  const shirtLo = shadeHex(look.shirt, -30);
  const pantsLo = look.jeansLo || shadeHex(look.pants, -24);
  const pantsHi = shadeHex(look.pants, 18);
  const skinLo = look.skinLo || shadeHex(look.skin, -22);
  const skinHi = shadeHex(look.skin, 16);
  const hairLo = shadeHex(look.hair, -18);
  const outline = "#140010";
  const cx = 20 + lean * 0.55;

  if (sit) {
    fillOval(g, cx, y(22), 7.2, 4.6, look.pants);
    fillLimb(g, cx - 2.5, y(22), cx - 6.5, y(30), 2.0, 1.4, pantsLo);
    fillLimb(g, cx + 2.5, y(22), cx + 7.5, y(30), 2.0, 1.4, look.pants);
    fillOval(g, cx - 6.5, y(31), 2.8, 1.5, look.shoes);
    fillOval(g, cx + 7.5, y(31), 2.8, 1.5, look.shoes);
    if (look.shoeRed) {
      fillOval(g, cx - 7.2, y(31), 1.0, 1.0, look.shoeRed);
      fillOval(g, cx + 6.8, y(31), 1.0, 1.0, look.shoeRed);
    }
    fillOval(g, cx, y(16.5), 6.6, 6.2, look.shirt);
    fillOval(g, cx - 1.8, y(14.5), 2.6, 3.8, shirtHi);
    fillOval(g, cx + 2.4, y(15.5), 2.0, 3.6, shirtLo);
    g.fillStyle = look.accent;
    g.fillRect(cx - 5.5, y(11.5), 11, 1.6);
    fillLimb(g, cx - 5.5, y(15), cx - 8.5, y(21.5), 1.8, 1.3, look.shirt);
    fillLimb(g, cx + 5.5, y(15), cx + 8.5, y(21.5), 1.8, 1.3, look.shirt);
    paintHand(g, cx - 8.5, y(22.5), look.skin);
    paintHand(g, cx + 8.5, y(22.5), look.skin);
  } else if (side) {
    // True profile: narrow torso, knees under hips, short fore/aft stride.
    const hipY = y(23.5);
    const hipX = cx;
    const backX = hipX + Math.min(gait.lFoot, gait.rFoot);
    const frontX = hipX + Math.max(gait.lFoot, gait.rFoot);
    const backLift = gait.lFoot <= gait.rFoot ? gait.lLift : gait.rLift;
    const frontLift = gait.lFoot > gait.rFoot ? gait.lLift : gait.rLift;
    const kneeBack = (hipX + backX) * 0.5;
    const kneeFront = (hipX + frontX) * 0.5;
    fillLimb(g, hipX, hipY, kneeBack, 30 - backLift * 0.4, 1.9, 1.45, pantsLo);
    fillLimb(g, kneeBack, 30 - backLift * 0.4, backX, 36.2 - backLift, 1.45, 1.15, pantsLo);
    fillOval(g, backX + 1.2, 37.2 - backLift, 2.8, 1.25, look.shoes);
    fillOval(g, hipX, hipY - 0.4, 2.5, 2.8, look.pants);
    fillLimb(g, hipX, hipY, kneeFront, 30 - frontLift * 0.4, 1.9, 1.45, look.pants);
    fillLimb(g, kneeFront, 30 - frontLift * 0.4, frontX, 36.2 - frontLift, 1.45, 1.15, look.pants);
    fillOval(g, frontX + 1.2, 37.2 - frontLift, 2.8, 1.25, look.shoes);
    if (look.shoeRed) {
      fillOval(g, backX + 0.4, 37.2 - backLift, 0.85, 0.85, look.shoeRed);
      fillOval(g, frontX + 0.4, 37.2 - frontLift, 0.85, 0.85, look.shoeRed);
    }
    const torsoY = y(15.5);
    const tx = hipX + lean * 0.2;
    fillOval(g, tx, torsoY, 2.9, 7.0, look.shirt);
    fillOval(g, tx - 0.7, torsoY - 1.2, 1.5, 4.4, shirtHi);
    fillOval(g, tx + 1.0, torsoY, 1.25, 4.6, shirtLo);
    fillOval(g, tx, y(11.2), 3.2, 2.0, look.shirt);
    g.fillStyle = look.accent;
    g.fillRect(tx - 2.6, y(10.8), 5.2, 1.4);
    const armSwing = gait.rArm;
    const elbow = hipX + armSwing * 0.45;
    fillLimb(g, hipX + 0.3, y(13.5), elbow, y(18), 1.55, 1.25, look.shirt);
    fillLimb(g, elbow, y(18), hipX + armSwing, y(22.5), 1.25, 1.0, look.shirt);
    paintHand(g, hipX + armSwing, y(23.4), look.skin, true);
  } else {
    const hipY = y(24.5);
    const stance = 1.35;
    const lKneeX = cx - stance + gait.lFoot * 0.12;
    const rKneeX = cx + stance + gait.rFoot * 0.12;
    fillLimb(g, cx - stance, hipY, lKneeX, 30.5 - gait.lLift * 0.35, 1.9, 1.4, pantsLo);
    fillLimb(g, lKneeX, 30.5 - gait.lLift * 0.35, lKneeX, 36.2 - gait.lLift, 1.4, 1.1, pantsLo);
    fillLimb(g, cx + stance, hipY, rKneeX, 30.5 - gait.rLift * 0.35, 1.9, 1.4, look.pants);
    fillLimb(g, rKneeX, 30.5 - gait.rLift * 0.35, rKneeX, 36.2 - gait.rLift, 1.4, 1.1, look.pants);
    fillOval(g, lKneeX, 37.2 - gait.lLift, 2.5, 1.25, look.shoes);
    fillOval(g, rKneeX, 37.2 - gait.rLift, 2.5, 1.25, look.shoes);
    if (look.shoeRed) {
      fillOval(g, lKneeX - 0.5, 37.2 - gait.lLift, 0.85, 0.85, look.shoeRed);
      fillOval(g, rKneeX - 0.35, 37.2 - gait.rLift, 0.85, 0.85, look.shoeRed);
    }
    fillOval(g, cx, hipY - 0.8, 3.8, 2.7, look.pants);
    fillOval(g, cx - 1.0, hipY - 1.6, 1.5, 1.5, pantsHi);
    // Soft torso + sloping shoulders (no cube body).
    fillOval(g, cx, y(15.5), 5.4, 7.0, look.shirt);
    fillOval(g, cx - 1.8, y(13.8), 2.4, 4.4, shirtHi);
    fillOval(g, cx + 2.2, y(14.6), 1.9, 4.4, shirtLo);
    fillOval(g, cx - 4.6, y(12.4), 2.6, 2.0, look.shirt);
    fillOval(g, cx + 4.6, y(12.4), 2.6, 2.0, look.shirt);
    fillOval(g, cx, y(11.2), 4.8, 1.8, look.shirt);
    g.fillStyle = look.accent;
    g.fillRect(cx - 5, y(10.8), 10, 1.5);
    const lHandX = cx - 7.2 + gait.lArm * 0.3;
    const rHandX = cx + 7.2 + gait.rArm * 0.3;
    fillLimb(g, cx - 4.8, y(13.2), cx - 6.2 + gait.lArm * 0.15, y(17.5), 1.7, 1.3, look.shirt);
    fillLimb(g, cx - 6.2 + gait.lArm * 0.15, y(17.5), lHandX, y(22.2), 1.3, 1.0, look.shirt);
    fillLimb(g, cx + 4.8, y(13.2), cx + 6.2 + gait.rArm * 0.15, y(17.5), 1.7, 1.3, look.shirt);
    fillLimb(g, cx + 6.2 + gait.rArm * 0.15, y(17.5), rHandX, y(22.2), 1.3, 1.0, look.shirt);
    paintHand(g, lHandX, y(23.2), look.skin);
    paintHand(g, rHandX, y(23.2), look.skin);
  }

  if (look.chain && !side) {
    g.fillStyle = look.chain === true ? "#f0c430" : look.chain;
    g.fillRect(cx - 2.5, y(13.5), 5, 1);
    g.fillRect(cx - 0.8, y(14.5), 1.6, 1.8);
  }

  // Soft neck + rounded head (never a cube).
  fillOval(g, cx + (side ? lean * 0.25 : 0), y(9.6), side ? 1.6 : 2.2, 1.4, look.skin);
  const headX = cx + (side ? lean * 0.35 : 0);
  const headY = y(6.4);
  fillOval(g, headX, headY, side ? 4.2 : 5.5, side ? 5.2 : 5.8, look.skin);
  fillOval(g, headX - (side ? 0.7 : 1.7), headY - 0.9, side ? 1.5 : 2.2, side ? 2.4 : 3.0, skinHi);
  fillOval(g, headX + (side ? 1.2 : 2.0), headY + 0.2, side ? 1.2 : 1.8, side ? 2.2 : 2.6, skinLo);
  if (side) {
    fillOval(g, headX + 2.9, headY + 0.5, 1.25, 1.05, look.skin);
    g.fillStyle = "#1a1210";
    g.fillRect(headX + 1.2, headY - 0.5, 1.3, 1.3);
    g.fillStyle = "#f4e6d4";
    g.fillRect(headX + 1.3, headY - 0.4, 0.6, 0.6);
    g.fillStyle = skinLo;
    g.fillRect(headX + 0.6, headY + 2.1, 1.9, 0.8);
  } else {
    g.fillStyle = "#f4e6d4";
    g.fillRect(headX - 2.6, headY - 0.4, 1.7, 1.7);
    g.fillRect(headX + 0.9, headY - 0.4, 1.7, 1.7);
    g.fillStyle = "#1a1210";
    g.fillRect(headX - 2.0, headY - 0.15, 1.05, 1.2);
    g.fillRect(headX + 1.4, headY - 0.15, 1.05, 1.2);
    g.fillStyle = skinLo;
    g.fillRect(headX - 1.2, headY + 2.6, 2.4, 0.85);
  }

  const hatKind = look.hat || "none";
  if (hatKind === "beanie") {
    fillOval(g, headX, headY - 2.8, side ? 4.8 : 5.6, 3.2, outline);
    fillOval(g, headX, headY - 3.0, side ? 4.1 : 4.9, 2.7, look.accent);
    fillOval(g, headX - 0.9, headY - 3.7, side ? 2.6 : 3.1, 1.4, shadeHex(look.accent, 28));
    g.fillStyle = look.hair;
    if (!side) {
      g.fillRect(headX - 4.4, headY + 0.8, 1.7, 1.7);
      g.fillRect(headX + 2.7, headY + 0.8, 1.7, 1.7);
    } else {
      g.fillRect(headX - 3.5, headY + 0.8, 1.7, 1.7);
    }
  } else if (hatKind === "cap") {
    fillOval(g, headX, headY - 2.6, side ? 4.6 : 5.4, 2.5, "#2a4a8a");
    g.fillStyle = "#1a2a58";
    if (side) g.fillRect(headX + 1.8, headY - 1.3, 4.4, 1.4);
    else g.fillRect(headX + 1.8, headY - 1.0, 4.4, 1.4);
    g.fillStyle = look.hair;
    g.fillRect(headX - (side ? 3.5 : 4.4), headY + 0.8, 1.7, 1.7);
  } else if (hatKind === "durag") {
    fillOval(g, headX, headY - 2.5, side ? 4.8 : 5.6, 3.0, "#2a1a28");
    g.fillStyle = look.accent;
    g.fillRect(headX - 2.6, headY - 2.7, 5.2, 1.3);
    if (side) {
      g.fillStyle = "#1a1018";
      g.fillRect(headX + 2.6, headY, 2.6, 1.7);
    }
  } else if (hatKind === "afro") {
    fillOval(g, headX, headY - 1.8, side ? 6.2 : 7.2, side ? 5.4 : 6.2, look.hair);
    fillOval(g, headX - 2.6, headY - 0.9, 2.2, 3.0, hairLo);
    fillOval(g, headX + 2.6, headY - 0.9, 2.2, 3.0, hairLo);
  } else {
    fillOval(g, headX, headY - 3.0, side ? 4.4 : 5.2, 2.5, look.hair);
    fillOval(g, headX - 1.3, headY - 3.4, 1.9, 1.2, shadeHex(look.hair, 24));
    g.fillStyle = hairLo;
    if (!side) {
      g.fillRect(headX - 4.4, headY + 0.4, 1.7, 1.7);
      g.fillRect(headX + 2.7, headY + 0.4, 1.7, 1.7);
    } else {
      g.fillRect(headX - 3.5, headY + 0.4, 1.7, 1.7);
    }
  }
}

/** Logical figure space is 40×40; paint at 3× with smoothing so ovals read round. */
export const PERSON_SCALE = 3;
export const PERSON_SIZE = 40 * PERSON_SCALE;

function paintPersonHi(g, look, pose) {
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  g.save();
  g.scale(PERSON_SCALE, PERSON_SCALE);
  paintPerson(g, look, pose);
  g.restore();
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
