import * as THREE from "three";

const SPRITE_BASE = new URL("../../block-run/sprites/", import.meta.url);

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(null), 5000);
    img.onload = () => {
      window.clearTimeout(timer);
      finish(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      finish(null);
    };
    img.src = url;
  });
}

function pixelCanvas(w, h, paint) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  paint(g, w, h);
  return c;
}

function texturize(source, withFlip = false) {
  const tex = source instanceof HTMLCanvasElement
    ? new THREE.CanvasTexture(source)
    : new THREE.Texture(source);
  if (!(source instanceof HTMLCanvasElement)) tex.needsUpdate = true;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  if (withFlip) {
    const img = tex.image;
    const w = img?.naturalWidth || img?.width || 32;
    const h = img?.naturalHeight || img?.height || 40;
    const flipped = pixelCanvas(w, h, (g) => {
      g.translate(w, 0);
      g.scale(-1, 1);
      g.drawImage(img, 0, 0);
    });
    tex.userData.flipped = texturize(flipped, false);
  }
  return tex;
}

function fallbackFrame(kind, frame) {
  return pixelCanvas(32, 40, (g) => {
    const pal = {
      shot: ["#3de0ff", "#ffffff"],
      boom: ["#f0c430", "#e21b7a"],
      pack: ["#d4a24a", "#6a4420"],
      cash: ["#3dff7a", "#145828"],
      dumpster: ["#2a8a4a", "#0e2a16"],
    }[kind] || ["#f4f0e8", "#e21b7a"];
    g.fillStyle = pal[1];
    g.fillRect(8, 10 + (frame % 2), 16, 28);
    g.fillStyle = pal[0];
    g.fillRect(10, 12 + (frame % 2), 12, 10);
    g.fillRect(12, 6 + (frame % 2), 8, 6);
  });
}

async function loadSheet(name, count) {
  const frames = [];
  for (let i = 1; i <= count; i++) {
    const img = await loadImage(new URL(`${name}-${i}.png`, SPRITE_BASE).href);
    frames.push(texturize(img || fallbackFrame(name, i), true));
  }
  return frames;
}

async function loadOne(file, kind) {
  const img = await loadImage(new URL(file, SPRITE_BASE).href);
  return texturize(img || fallbackFrame(kind, 0));
}

const CW = 40;
const CH = 56;

function px(g, x, y, w, h, c) {
  if (!c || w === 0 || h === 0) return;
  if (w < 0) { x += w; w = -w; }
  if (h < 0) { y += h; h = -h; }
  g.fillStyle = c;
  g.fillRect(x | 0, y | 0, w | 0, h | 0);
}

const PLAYER_PAL = {
  skin: "#f0c8a0", skinDk: "#d4a078",
  hair: "#2a1810",
  hat: "#e21b7a", brim: "#8a1428",
  shirt: "#3a3048", shirtDk: "#241828",
  pants: "#2a2438",
  shoes: "#141018",
  accent: "#e21b7a",
  role: "player",
};

const THUG_PAL = {
  skin: "#5a3828", skinDk: "#3a2018",
  hair: "#141010",
  shirt: "#6a28e0", shirtDk: "#3a1478",
  pants: "#241430",
  shoes: "#111018",
  accent: "#f0c430",
  role: "thug",
};

const RUNNER_PAL = {
  skin: "#c49070", skinDk: "#a07050",
  hair: "#1a2838",
  shirt: "#148090", shirtDk: "#0c5060",
  pants: "#102028",
  shoes: "#3de0ff",
  accent: "#3de0ff",
  role: "runner",
};

const COP_PAL = {
  skin: "#d4a888", skinDk: "#b48868",
  hair: "#2a2018",
  hat: "#1a2438", brim: "#0c1420",
  shirt: "#243868", shirtDk: "#142448",
  pants: "#1a2848",
  shoes: "#111018",
  accent: "#f0c430",
  role: "cop",
};

const BOSS_PAL = {
  skin: "#3a2a22", skinDk: "#241810",
  hair: "#0a0a0c",
  shirt: "#4a2088", shirtDk: "#2a1058",
  pants: "#1a1028",
  shoes: "#111018",
  accent: "#3de0ff",
  role: "boss",
};

export const BUYER_PALS = [
  {
    skin: "#6a4030", skinDk: "#4a2818",
    hair: "#1a1210",
    hat: "#2a2434", brim: "#161018",
    shirt: "#d4a820", shirtDk: "#8a6810",
    pants: "#3a2a18",
    shoes: "#1a1210",
    accent: "#f0c430",
    role: "buyer",
  },
  {
    skin: "#f0c8a8", skinDk: "#d4a080",
    hair: "#e21b7a",
    shirt: "#1a8a88", shirtDk: "#0e5858",
    pants: "#142028",
    shoes: "#f0c430",
    accent: "#3de0ff",
    role: "buyer",
  },
  {
    skin: "#c48858", skinDk: "#a06838",
    hair: "#1a1210",
    hat: "#111018", brim: "#07060c",
    shirt: "#e86018", shirtDk: "#a4380c",
    pants: "#2a2430",
    shoes: "#111018",
    accent: "#f4f0e8",
    role: "buyer",
  },
  {
    skin: "#4a2c20", skinDk: "#2a1810",
    hair: "#2a1810",
    shirt: "#e8dcc8", shirtDk: "#b0a488",
    pants: "#3a3028",
    shoes: "#5a4030",
    accent: "#c9a227",
    role: "buyer",
    hood: true,
  },
  {
    skin: "#d4a070", skinDk: "#b08050",
    hair: "#3a2018",
    hat: "#3de0ff", brim: "#148090",
    shirt: "#2a8a4a", shirtDk: "#145828",
    pants: "#1a2430",
    shoes: "#111018",
    accent: "#3dff7a",
    role: "buyer",
  },
];

const WALK = [
  { lf: 6, lb: -5, af: -5, ab: 6, bob: 0 },
  { lf: 4, lb: -3, af: -4, ab: 4, bob: 1 },
  { lf: 0, lb: 0, af: 0, ab: 0, bob: 0 },
  { lf: -5, lb: 6, af: 6, ab: -5, bob: 0 },
  { lf: -3, lb: 4, af: 4, ab: -4, bob: 1 },
  { lf: 0, lb: 0, af: 0, ab: 0, bob: 0 },
];

const IDLE = [
  { lf: 1, lb: -1, af: 0, ab: 1, bob: 0 },
  { lf: 1, lb: -1, af: 0, ab: 1, bob: 1 },
  { lf: 1, lb: -1, af: 1, ab: 0, bob: 1 },
  { lf: 1, lb: -1, af: 0, ab: 1, bob: 0 },
];

const JUMP = [
  { lf: -3, lb: -2, af: 4, ab: -3, bob: -2, jump: true },
  { lf: -2, lb: -3, af: 3, ab: -2, bob: -1, jump: true },
];

const SHOOT = [
  { lf: 3, lb: -2, af: 7, ab: -3, bob: 0, lean: 1, gun: true },
  { lf: 3, lb: -2, af: 8, ab: -3, bob: 0, lean: 1, gun: true },
];

function paintChar(g, pose, pal) {
  const bob = pose.bob || 0;
  const lean = pose.lean || 0;
  const cx = 19 + lean;
  const hipY = 34 + bob;
  const shY = 20 + bob;
  const ink = "#07060c";

  function block(x, y, w, h, c) {
    px(g, x - 1, y, 1, h, ink);
    px(g, x + w, y, 1, h, ink);
    px(g, x - 1, y - 1, w + 2, 1, ink);
    px(g, x, y, w, h, c);
  }

  const backLegX = cx - 2 + (pose.lb || 0);
  const frontLegX = cx + 3 + (pose.lf || 0);
  const backArmX = cx - 6 + (pose.ab || 0);
  const frontArmX = cx + 8 + (pose.af || 0);
  const legH = pose.jump ? 11 : 16;
  const footY = hipY + legH - 1;

  block(backLegX, hipY, 5, legH, pal.pants);
  px(g, backLegX - 1, footY, 7, 4, pal.shoes);
  block(frontLegX, hipY, 5, legH, pal.pants);
  px(g, frontLegX - 1, footY, 7, 4, pal.shoes);

  block(backArmX, shY, 4, 13, pal.shirt);
  px(g, backArmX, shY + 13, 4, 4, pal.skin);

  const wide = pal.role === "buyer" || pal.role === "thug" || pal.hood;
  const tw = wide ? 16 : 14;
  const tx = cx - (wide ? 7 : 6);
  block(tx, 18 + bob, tw, 18, pal.shirt);
  px(g, tx, 18 + bob, tw, 4, pal.shirtDk);
  if (pal.role === "buyer" || pal.hood) {
    px(g, tx + 3, 28 + bob, tw - 6, 6, pal.shirtDk);
  }
  if (pal.role === "thug") {
    px(g, cx - 3, 24 + bob, 8, 3, pal.accent);
  }
  if (pal.role === "cop") {
    px(g, cx, 26 + bob, 4, 4, pal.accent);
  }
  if (pal.role === "player") {
    px(g, tx + 3, 32 + bob, 5, 3, pal.accent);
  }

  if (pal.hood) {
    px(g, cx - 7, 8 + bob, 16, 10, pal.shirtDk);
  }

  block(cx - 6, 8 + bob, 13, 12, pal.skin);
  px(g, cx - 6, 8 + bob, 13, 3, pal.skinDk);
  px(g, cx + 3, 13 + bob, 3, 3, "#1a1210");
  px(g, cx - 4, 16 + bob, 4, 2, pal.skinDk);

  if (pal.role === "runner") {
    px(g, cx - 6, 7 + bob, 13, 4, pal.hair);
    px(g, cx - 7, 10 + bob, 3, 6, pal.hair);
  } else if (pal.hair === "#e21b7a") {
    px(g, cx - 7, 5 + bob, 15, 5, pal.hair);
    px(g, cx + 7, 9 + bob, 3, 8, pal.hair);
    px(g, cx - 8, 10 + bob, 3, 7, pal.hair);
  } else {
    px(g, cx - 6, 7 + bob, 13, 4, pal.hair);
  }

  if (pal.hat) {
    if (pal.role === "cop") {
      px(g, cx - 7, 7 + bob, 16, 4, pal.hat);
      px(g, cx - 5, 3 + bob, 12, 5, pal.hat);
      px(g, cx - 8, 10 + bob, 18, 2, pal.brim || pal.hat);
    } else if (pal.hat === "#3de0ff") {
      px(g, cx - 8, 8 + bob, 18, 3, pal.hat);
      px(g, cx - 3, 4 + bob, 8, 4, pal.brim || pal.hat);
    } else {
      px(g, cx - 8, 5 + bob, 18, 5, pal.hat);
      px(g, cx - 9, 9 + bob, 20, 3, pal.brim || pal.hat);
    }
  }

  block(frontArmX, shY + (pose.gun ? 3 : 0), 4, pose.gun ? 6 : 13, pal.shirt);
  px(g, frontArmX, shY + (pose.gun ? 8 : 13), 4, 4, pal.skin);

  if (pose.gun) {
    const gx = frontArmX + 4;
    const gy = shY + 6;
    px(g, gx, gy, 10, 3, "#2a2434");
    px(g, gx + 8, gy - 2, 4, 3, "#3de0ff");
    px(g, gx + 1, gy + 3, 3, 4, "#1a1620");
  }
}

function framesFrom(poses, pal) {
  return poses.map((pose) => texturize(pixelCanvas(CW, CH, (g) => {
    g.clearRect(0, 0, CW, CH);
    paintChar(g, pose, pal);
  }), true));
}

function makeSet(pal) {
  return {
    idle: framesFrom(IDLE, pal),
    walk: framesFrom(WALK, pal),
    jump: framesFrom(JUMP, pal),
    shoot: framesFrom(SHOOT, pal),
  };
}

export async function loadSprites() {
  const player = makeSet(PLAYER_PAL);
  const thug = makeSet(THUG_PAL);
  const runner = makeSet(RUNNER_PAL);
  const cop = makeSet(COP_PAL);
  const boss = makeSet(BOSS_PAL);
  const buyers = BUYER_PALS.map((pal) => makeSet(pal));
  const [shot, boom, pack, cash, dumpster] = await Promise.all([
    loadSheet("shot", 4),
    loadSheet("boom", 4),
    loadOne("pack.png", "pack"),
    loadOne("cash.png", "cash"),
    loadOne("dumpster.png", "dumpster"),
  ]);
  return {
    idle: player.idle,
    walk: player.walk,
    jump: player.jump,
    shoot: player.shoot,
    player,
    thug,
    runner,
    cop,
    boss,
    buyers,
    shot, boom, pack, cash, dumpster,
  };
}

const BILLBOARD_GEO = new THREE.PlaneGeometry(1, 1);
BILLBOARD_GEO.translate(0, 0.5, 0);

function textureSize(texture) {
  const img = texture?.image;
  return {
    w: img?.naturalWidth || img?.width || 32,
    h: img?.naturalHeight || img?.height || 48,
  };
}

/**
 * Camera-facing plane. PNG art faces right.
 * Negative scale.x / UV tricks do not mirror on this billboard (camera quat
 * + DoubleSide). Baked flipped textures in texturize(..., true) do.
 */
export function makeBillboard(texture, height = 1.7) {
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.12,
    depthWrite: false,
    opacity: 1,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(BILLBOARD_GEO, mat);
  const { w, h } = textureSize(texture);
  mesh.userData.height = height;
  mesh.userData.baseW = (w / h) * height;
  mesh.userData.billboard = true;
  mesh.scale.set(mesh.userData.baseW, height, 1);
  return mesh;
}

export function setBillboardFrame(mesh, texture, facing = 1) {
  const map = facing < 0 && texture?.userData?.flipped ? texture.userData.flipped : texture;
  if (mesh.material.map === map) return;
  mesh.material.map = map;
  mesh.material.needsUpdate = true;
  const { w, h } = textureSize(map);
  const height = mesh.userData.height || 1.7;
  mesh.userData.baseW = (w / h) * height;
  mesh.scale.x = mesh.userData.baseW;
  mesh.scale.y = height;
}

export function orientBillboard(mesh, camera) {
  mesh.quaternion.copy(camera.quaternion);
}

export function frameAt(frames, anim, rate) {
  if (!frames || !frames.length) return frames;
  const i = Math.floor(Math.abs(anim) * rate) % frames.length;
  return frames[i];
}
