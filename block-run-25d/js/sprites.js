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

function texturize(source) {
  const tex = source instanceof HTMLCanvasElement
    ? new THREE.CanvasTexture(source)
    : new THREE.Texture(source);
  if (!(source instanceof HTMLCanvasElement)) tex.needsUpdate = true;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  return tex;
}

function fallbackFrame(kind, frame) {
  return pixelCanvas(32, 40, (g) => {
    const pal = {
      idle: ["#f4f0e8", "#e21b7a"],
      walk: ["#f4f0e8", "#e21b7a"],
      shoot: ["#f4f0e8", "#3de0ff"],
      thug: ["#c45cff", "#2a1020"],
      runner: ["#3de0ff", "#142030"],
      boss: ["#7a3cff", "#1a1028"],
      cop: ["#3d6cff", "#0c1830"],
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
    frames.push(texturize(img || fallbackFrame(name, i)));
  }
  return frames;
}

async function loadOne(file, kind) {
  const img = await loadImage(new URL(file, SPRITE_BASE).href);
  return texturize(img || fallbackFrame(kind, 0));
}

export async function loadSprites() {
  const [idle, walk, shoot, thug, runner, boss, shot, boom, pack, cash, dumpster] = await Promise.all([
    loadSheet("idle", 4),
    loadSheet("walk", 4),
    loadSheet("shoot", 4),
    loadSheet("thug", 4),
    loadSheet("runner", 4),
    loadSheet("boss", 4),
    loadSheet("shot", 4),
    loadSheet("boom", 4),
    loadOne("pack.png", "pack"),
    loadOne("cash.png", "cash"),
    loadOne("dumpster.png", "dumpster"),
  ]);
  return { idle, walk, shoot, thug, runner, boss, shot, boom, pack, cash, dumpster };
}

export function makeBillboard(texture, height = 1.7) {
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.15,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  const img = texture.image;
  const w = img?.naturalWidth || img?.width || 32;
  const h = img?.naturalHeight || img?.height || 40;
  sprite.center.set(0.5, 0);
  sprite.scale.set((w / h) * height, height, 1);
  sprite.userData.height = height;
  sprite.userData.baseW = (w / h) * height;
  return sprite;
}

export function setBillboardFrame(sprite, texture) {
  if (sprite.material.map === texture) return;
  sprite.material.map = texture;
  sprite.material.needsUpdate = true;
  const img = texture.image;
  const w = img?.naturalWidth || img?.width || 32;
  const h = img?.naturalHeight || img?.height || 40;
  const height = sprite.userData.height || 1.7;
  sprite.scale.set((w / h) * height, height, 1);
}

export function frameAt(frames, anim, rate) {
  const i = Math.floor(Math.abs(anim) * rate) % frames.length;
  return frames[i];
}
