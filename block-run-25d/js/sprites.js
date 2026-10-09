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

const CW = 32;
const CH = 48;

function px(g, x, y, w, h, c) {
  if (!c || w === 0 || h === 0) return;
  if (w < 0) { x += w; w = -w; }
  if (h < 0) { y += h; h = -h; }
  g.fillStyle = c;
  g.fillRect(x | 0, y | 0, w | 0, h | 0);
}

const PLAYER_PAL = {
  skin: "#e0b090", skinDk: "#c48868",
  hair: "#1a1210",
  hat: "#c81e3a", brim: "#8a1428",
  shirt: "#161018", shirtDk: "#0c0a10",
  pants: "#1c1a24",
  shoes: "#2a2434",
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
  { lf: 5, lb: -4, af: -4, ab: 5, bob: 0 },
  { lf: 3, lb: -2, af: -3, ab: 3, bob: 1 },
  { lf: 0, lb: 0, af: 0, ab: 0, bob: 0 },
  { lf: -4, lb: 5, af: 5, ab: -4, bob: 0 },
  { lf: -2, lb: 3, af: 3, ab: -3, bob: 1 },
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
  const cx = 15 + lean;
  const hipY = 31 + bob;
  const shY = 18 + bob;
  const outline = "#07060c";

  function limb(x, y, w, h, c) {
    px(g, x - 1, y, 1, h, outline);
    px(g, x, y, w, h, c);
  }

  const backLegX = cx - 1 + (pose.lb || 0);
  const frontLegX = cx + 2 + (pose.lf || 0);
  const backArmX = cx - 3 + (pose.ab || 0);
  const frontArmX = cx + 6 + (pose.af || 0);
  const legH = pose.jump ? 9 : 13;
  const footY = pose.jump ? hipY + 9 : 44;

  limb(backLegX, hipY, 3, legH, pal.pants);
  px(g, backLegX - 1, footY, 5, 3, pal.shoes);
  limb(frontLegX, hipY, 3, legH, pal.pants);
  px(g, frontLegX - 1, footY, 5, 3, pal.shoes);

  limb(backArmX, shY, 3, 11, pal.shirt);
  px(g, backArmX, shY + 11, 3, 3, pal.skin);

  const wide = pal.role === "buyer" || pal.role === "thug" || pal.hood;
  const tw = wide ? 12 : 10;
  const tx = cx - (wide ? 5 : 4);
  px(g, tx - 1, 16 + bob, 1, 16, outline);
  px(g, tx, 16 + bob, tw, 16, pal.shirt);
  px(g, tx, 16 + bob, tw, 3, pal.shirtDk);
  if (pal.role === "buyer" || pal.hood) {
    px(g, tx + 2, 24 + bob, tw - 4, 5, pal.shirtDk);
  }
  if (pal.role === "thug") {
    px(g, cx - 2, 20 + bob, 6, 2, pal.accent);
  }
  if (pal.role === "cop") {
    px(g, cx - 1, 22 + bob, 3, 3, pal.accent);
  }
  if (pal.role === "player") {
    px(g, tx + 2, 28 + bob, 3, 2, pal.accent);
  }

  if (pal.hood) {
    px(g, cx - 5, 8 + bob, 12, 8, pal.shirtDk);
  }

  px(g, cx - 4, 8 + bob, 10, 9, outline);
  px(g, cx - 3, 9 + bob, 8, 8, pal.skin);
  px(g, cx - 3, 9 + bob, 8, 2, pal.skinDk);
  px(g, cx + 2, 12 + bob, 2, 2, "#1a1210");

  if (pal.role === "runner") {
    px(g, cx - 3, 8 + bob, 8, 3, pal.hair);
    px(g, cx - 4, 10 + bob, 2, 4, pal.hair);
  } else if (pal.hair === "#e21b7a") {
    px(g, cx - 4, 6 + bob, 10, 4, pal.hair);
    px(g, cx + 5, 9 + bob, 2, 6, pal.hair);
    px(g, cx - 5, 10 + bob, 2, 5, pal.hair);
  } else {
    px(g, cx - 3, 8 + bob, 8, 3, pal.hair);
  }

  if (pal.hat) {
    if (pal.role === "cop") {
      px(g, cx - 5, 7 + bob, 12, 3, pal.hat);
      px(g, cx - 3, 4 + bob, 8, 4, pal.hat);
      px(g, cx - 5, 9 + bob, 12, 1, pal.brim || pal.hat);
    } else if (pal.hat === "#3de0ff") {
      px(g, cx - 5, 8 + bob, 12, 2, pal.hat);
      px(g, cx - 2, 5 + bob, 6, 3, pal.brim || pal.hat);
    } else {
      px(g, cx - 5, 6 + bob, 12, 4, pal.hat);
      px(g, cx - 6, 9 + bob, 14, 2, pal.brim || pal.hat);
    }
  }

  limb(frontArmX, shY + (pose.gun ? 2 : 0), 3, pose.gun ? 5 : 11, pal.shirt);
  px(g, frontArmX, shY + (pose.gun ? 6 : 11), 3, 3, pal.skin);

  if (pose.gun) {
    const gx = frontArmX + 3;
    const gy = shY + 5;
    px(g, gx, gy, 8, 2, "#2a2434");
    px(g, gx + 6, gy - 1, 3, 2, "#3de0ff");
    px(g, gx + 1, gy + 2, 2, 3, "#1a1620");
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
