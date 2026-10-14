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
  { legDx: 3, armDx: -2, bob: 0, legDy: 0 },
  { legDx: 2, armDx: -1, bob: 1, legDy: -1 },
  { legDx: 0, armDx: 0, bob: 0, legDy: 0 },
  { legDx: -3, armDx: 2, bob: 0, legDy: 0 },
  { legDx: -2, armDx: 1, bob: 1, legDy: -1 },
  { legDx: 1, armDx: -1, bob: 0, legDy: 0 },
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
];

export function paintPerson(g, look) {
  g.clearRect(0, 0, 32, 40);
  g.fillStyle = look.pants;
  g.fillRect(10, 26, 5, 10);
  g.fillRect(17, 26, 5, 10);
  g.fillStyle = look.shoes;
  g.fillRect(9, 35, 6, 4);
  g.fillRect(17, 35, 6, 4);
  g.fillStyle = look.shirt;
  g.fillRect(9, 16, 14, 11);
  g.fillStyle = look.accent;
  g.fillRect(9, 16, 14, 2);
  g.fillStyle = look.skin;
  g.fillRect(6, 17, 4, 8);
  g.fillRect(22, 17, 4, 8);
  g.fillRect(11, 6, 10, 10);
  g.fillRect(13, 16, 6, 2);
  if (look.chain) {
    g.fillStyle = "#f0c430";
    g.fillRect(13, 17, 6, 1);
    g.fillRect(15, 18, 2, 2);
  }
  if (look.hat === "beanie") {
    g.fillStyle = look.hair;
    g.fillRect(11, 4, 10, 4);
    g.fillStyle = look.accent;
    g.fillRect(11, 7, 10, 2);
  } else if (look.hat === "cap") {
    g.fillStyle = "#2a4a8a";
    g.fillRect(11, 4, 10, 4);
    g.fillRect(20, 7, 6, 2);
    g.fillStyle = look.hair;
    g.fillRect(11, 8, 3, 4);
  } else if (look.hat === "durag") {
    g.fillStyle = "#2a1a28";
    g.fillRect(10, 4, 12, 5);
    g.fillRect(20, 8, 5, 2);
    g.fillStyle = look.accent;
    g.fillRect(12, 5, 8, 2);
  } else if (look.hat === "afro") {
    g.fillStyle = look.hair;
    g.fillRect(8, 2, 16, 8);
    g.fillRect(9, 9, 3, 4);
    g.fillRect(20, 9, 3, 4);
  } else {
    g.fillStyle = look.hair;
    g.fillRect(11, 4, 10, 4);
    g.fillRect(10, 7, 3, 4);
  }
}

export function paintLook(i) {
  const look = PED_LOOKS[i % PED_LOOKS.length];
  return pixelCanvas(32, 40, (g) => paintPerson(g, look));
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
