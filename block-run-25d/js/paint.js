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
/** Calm stride: opposite arm/leg, small bob — not a slice-shift dance. */
export const PED_WALK_POSES = [
  { step: 3, bob: 0 },
  { step: 0, bob: 1 },
  { step: -3, bob: 0 },
  { step: 0, bob: 0 },
];
export const TURN_POSES = [
  { armDx: 2, legDx: 1, bob: 0 },
  { armDx: -1, legDx: 0, bob: 1 },
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
  g.clearRect(0, 0, 32, 40);
  const bob = pose.bob || 0;
  const step = pose.step || 0;
  const leftLeg = step;
  const rightLeg = -step;
  const leftArm = -step;
  const rightArm = step;
  const shirtHi = shadeHex(look.shirt, 28);
  const shirtLo = shadeHex(look.shirt, -26);
  const pantsLo = shadeHex(look.pants, -22);
  const skinLo = shadeHex(look.skin, -18);
  g.fillStyle = pantsLo;
  g.fillRect(10 + leftLeg, 26 + bob, 5, 10);
  g.fillStyle = look.pants;
  g.fillRect(17 + rightLeg, 26 + bob, 5, 10);
  g.fillStyle = look.shoes;
  g.fillRect(9 + leftLeg, 35 + bob, 6, 4);
  g.fillRect(17 + rightLeg, 35 + bob, 6, 4);
  g.fillStyle = shadeHex(look.shoes, 30);
  g.fillRect(10 + leftLeg, 35 + bob, 3, 1);
  g.fillRect(18 + rightLeg, 35 + bob, 3, 1);
  g.fillStyle = look.shirt;
  g.fillRect(9, 16 + bob, 14, 11);
  g.fillStyle = shirtHi;
  g.fillRect(10, 17 + bob, 5, 8);
  g.fillStyle = shirtLo;
  g.fillRect(20, 18 + bob, 2, 8);
  g.fillStyle = look.accent;
  g.fillRect(9, 16 + bob, 14, 2);
  g.fillStyle = look.skin;
  g.fillRect(6 + leftArm, 17 + bob, 4, 8);
  g.fillRect(22 + rightArm, 17 + bob, 4, 8);
  g.fillRect(11, 6 + bob, 10, 10);
  g.fillStyle = skinLo;
  g.fillRect(18, 8 + bob, 3, 7);
  g.fillStyle = "#f4f0e8";
  g.fillRect(13, 9 + bob, 2, 2);
  g.fillRect(17, 9 + bob, 2, 2);
  g.fillStyle = "#1a1210";
  g.fillRect(14, 9 + bob, 1, 2);
  g.fillRect(18, 9 + bob, 1, 2);
  g.fillStyle = look.skin;
  g.fillRect(13, 16 + bob, 6, 2);
  if (look.chain) {
    g.fillStyle = "#f0c430";
    g.fillRect(13, 17 + bob, 6, 1);
    g.fillRect(15, 18 + bob, 2, 2);
  }
  if (look.hat === "beanie") {
    g.fillStyle = look.hair;
    g.fillRect(11, 4 + bob, 10, 4);
    g.fillStyle = look.accent;
    g.fillRect(11, 7 + bob, 10, 2);
  } else if (look.hat === "cap") {
    g.fillStyle = "#2a4a8a";
    g.fillRect(11, 4 + bob, 10, 4);
    g.fillRect(20, 7 + bob, 6, 2);
    g.fillStyle = look.hair;
    g.fillRect(11, 8 + bob, 3, 4);
  } else if (look.hat === "durag") {
    g.fillStyle = "#2a1a28";
    g.fillRect(10, 4 + bob, 12, 5);
    g.fillRect(20, 8 + bob, 5, 2);
    g.fillStyle = look.accent;
    g.fillRect(12, 5 + bob, 8, 2);
  } else if (look.hat === "afro") {
    g.fillStyle = look.hair;
    g.fillRect(8, 2 + bob, 16, 8);
    g.fillRect(9, 9 + bob, 3, 4);
    g.fillRect(20, 9 + bob, 3, 4);
  } else {
    g.fillStyle = look.hair;
    g.fillRect(11, 4 + bob, 10, 4);
    g.fillRect(10, 7 + bob, 3, 4);
  }
}

export function paintLook(i, pose) {
  const look = PED_LOOKS[i % PED_LOOKS.length];
  return pixelCanvas(32, 40, (g) => paintPerson(g, look, pose));
}

export function paintWalkLook(i, poses = PED_WALK_POSES) {
  return poses.map((p) => paintLook(i, p));
}

export function paintPersonLook(look, pose) {
  return pixelCanvas(32, 40, (g) => paintPerson(g, look, pose));
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

/** Lift the red beanie off a classic PNG frame and fill with short hair. */
export function classicWithoutHat(src) {
  const w = src.width || src.naturalWidth || 40;
  const h = src.height || src.naturalHeight || 40;
  return pixelCanvas(w, h, (g) => {
    g.drawImage(src, 0, 0, w, h);
    const img = g.getImageData(0, 0, w, h);
    const d = img.data;
    const yHat = Math.max(8, Math.floor(h * 0.3));
    for (let y = 0; y < yHat; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = d[i];
        const gv = d[i + 1];
        const b = d[i + 2];
        const a = d[i + 3];
        if (a < 8) continue;
        const hat = r > 80 && r > gv * 1.45 && r > b * 1.25 && gv < 110 && b < 100;
        if (!hat) continue;
        const k = 0.5 + (y / yHat) * 0.35;
        d[i] = Math.round(58 * k);
        d[i + 1] = Math.round(34 * k);
        d[i + 2] = Math.round(24 * k);
      }
    }
    g.putImageData(img, 0, 0);
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

  g.fillStyle = c.outline;
  g.fillRect(13, y(3), 14, 34);

  g.fillStyle = c.jeansLo;
  g.fillRect(13 + lLeg, y(26), 6, 9);
  g.fillStyle = c.jeans;
  g.fillRect(21 + rLeg, y(26), 6, 9);
  g.fillStyle = c.jeans;
  g.fillRect(15, y(25), 10, 4);

  g.fillStyle = c.shoe;
  g.fillRect(12 + lLeg, y(34), 7, 4);
  g.fillRect(21 + rLeg, y(34), 7, 4);
  g.fillStyle = c.shoeRed;
  g.fillRect(12 + lLeg, y(34), 3, 2);
  g.fillRect(21 + rLeg, y(34), 3, 2);

  g.fillStyle = c.hoodie;
  g.fillRect(13, y(16), 14, 11);
  g.fillStyle = c.hoodieHi;
  g.fillRect(15, y(17), 5, 8);
  g.fillStyle = c.chain;
  g.fillRect(17, y(18), 6, 1);
  g.fillRect(19, y(19), 2, 2);

  g.fillStyle = c.skin;
  g.fillRect(10 + lArm, y(18), 4, 7);
  g.fillRect(26 + rArm, y(18), 4, 7);
  g.fillStyle = c.hoodie;
  g.fillRect(10 + lArm, y(17), 4, 3);
  g.fillRect(26 + rArm, y(17), 4, 3);

  g.fillStyle = c.skin;
  g.fillRect(14, y(8), 12, 9);
  g.fillStyle = c.skinLo;
  g.fillRect(22, y(10), 3, 6);
  g.fillStyle = "#f4e6d4";
  g.fillRect(16, y(11), 2, 2);
  g.fillRect(21, y(11), 2, 2);
  g.fillStyle = "#1a1210";
  g.fillRect(17, y(11), 1, 2);
  g.fillRect(22, y(11), 1, 2);
  g.fillStyle = c.skinLo;
  g.fillRect(18, y(15), 4, 1);

  if (hatOn) {
    g.fillStyle = c.hatLo;
    g.fillRect(14, y(3), 12, 6);
    g.fillStyle = c.hat;
    g.fillRect(15, y(3), 10, 5);
    g.fillRect(16, y(2), 8, 2);
  } else {
    g.fillStyle = c.hair;
    g.fillRect(14, y(3), 12, 6);
    g.fillRect(15, y(2), 10, 3);
    g.fillRect(17, y(1), 6, 2);
  }
}

export function paintClassicHeroSet(wardrobe = { hat: "beanie" }) {
  return {
    idle: IDLE_POSES.map((p) => pixelCanvas(40, 40, (g) => paintClassicHero(g, p, wardrobe))),
    walk: PED_WALK_POSES.map((p) => pixelCanvas(40, 40, (g) => paintClassicHero(g, p, wardrobe))),
    jump: JUMP_POSES.map((p) => pixelCanvas(40, 40, (g) => paintClassicHero(g, p, wardrobe))),
    shoot: SHOOT_POSES.map((p) => pixelCanvas(40, 40, (g) => paintClassicHero(g, p, wardrobe))),
  };
}

/** Subtle clothes shading only. Never touch skin/face (edge rim made it cyan). */
export function restyleFor25d(src) {
  if (!src) return src;
  const w = src.width || src.naturalWidth || 32;
  const h = src.height || src.naturalHeight || 40;
  return pixelCanvas(w, h, (g) => {
    g.drawImage(src, 0, 0);
    const img = g.getImageData(0, 0, w, h);
    const d = img.data;
    const isSkin = (r, gv, b) => {
      if (r < 70 || gv < 40) return false;
      if (r + 6 < gv) return false;
      if (b > r + 4) return false;
      if (gv < b * 0.62) return false;
      return (r - b) >= 8 && (r - gv) < 110;
    };
    const isHoodie = (r, gv, b) => (
      r > 90 && r > gv * 1.45 && r > b * 1.4 && gv < 110 && !isSkin(r, gv, b)
    );
    const isPants = (r, gv, b) => r < 50 && gv < 50 && b < 70 && (r + gv + b) < 130;
    const faceBottom = Math.round(h * 0.46);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 10) continue;
        const r = d[i];
        const gv = d[i + 1];
        const b = d[i + 2];
        if (isSkin(r, gv, b)) continue;
        if (y < faceBottom && !isHoodie(r, gv, b)) continue;
        if (isHoodie(r, gv, b) && y > h * 0.22) {
          if (x < w * 0.42) {
            d[i] = Math.min(255, r + 10);
            d[i + 1] = Math.min(255, gv + 3);
            d[i + 2] = Math.min(255, b + 2);
          } else if (x > w * 0.64) {
            d[i] = Math.max(0, r - 10);
            d[i + 1] = Math.max(0, gv - 8);
            d[i + 2] = Math.max(0, b - 8);
          }
        } else if (isPants(r, gv, b) && y > faceBottom && x < w * 0.42) {
          d[i] = Math.min(255, r + 6);
          d[i + 1] = Math.min(255, gv + 6);
          d[i + 2] = Math.min(255, b + 6);
        }
      }
    }
    g.putImageData(img, 0, 0);
  });
}

export function paintCopFig() {
  return pixelCanvas(32, 40, (g) => {
    paintPerson(g, {
      skin: "#c68642", shirt: "#1a2a58", pants: "#1a2438",
      hair: "#1a1210", accent: "#f0c430", hat: "cap", shoes: "#111018",
    });
    g.fillStyle = "#2a4a8a";
    g.fillRect(11, 4, 10, 4);
    g.fillRect(20, 7, 6, 2);
    g.fillStyle = "#f0c430";
    g.fillRect(14, 20, 4, 3);
  });
}

export function paintPlugFig() {
  return pixelCanvas(32, 40, (g) => {
    paintPerson(g, {
      skin: "#8d5524", shirt: "#1a1a22", pants: "#2a2430",
      hair: "#1a1210", accent: "#f0c430", hat: "none", shoes: "#f0c430", chain: true,
    });
    g.fillStyle = "#e21b7a";
    g.fillRect(9, 16, 14, 2);
    g.fillStyle = "#f0c430";
    g.fillRect(20, 18, 3, 4);
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
