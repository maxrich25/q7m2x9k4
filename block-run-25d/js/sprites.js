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

function makeBillboardGeo(flipX) {
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.translate(0, 0.5, 0);
  if (flipX) {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
    uv.needsUpdate = true;
  }
  return geo;
}

// PNG characters face right. Negative mesh.scale.x does not visually
// mirror on a camera-quat billboard (winding + DoubleSide cancel it).
const GEO_FACE_RIGHT = makeBillboardGeo(false);
const GEO_FACE_LEFT = makeBillboardGeo(true);

function textureSize(texture) {
  const img = texture?.image;
  return {
    w: img?.naturalWidth || img?.width || 32,
    h: img?.naturalHeight || img?.height || 40,
  };
}

/** Camera-facing plane. Art faces right; setBillboardFacing swaps UV-flipped geometry. */
export function makeBillboard(texture, height = 1.7) {
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.12,
    depthWrite: false,
    opacity: 1,
    side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(GEO_FACE_RIGHT, mat);
  const { w, h } = textureSize(texture);
  mesh.userData.height = height;
  mesh.userData.baseW = (w / h) * height;
  mesh.userData.billboard = true;
  mesh.scale.set(mesh.userData.baseW, height, 1);
  return mesh;
}

export function setBillboardFrame(mesh, texture) {
  if (mesh.material.map === texture) return;
  mesh.material.map = texture;
  mesh.material.needsUpdate = true;
  const { w, h } = textureSize(texture);
  const height = mesh.userData.height || 1.7;
  mesh.userData.baseW = (w / h) * height;
  mesh.scale.x = mesh.userData.baseW;
  mesh.scale.y = height;
}

export function setBillboardFacing(mesh, facing) {
  const w = mesh.userData.baseW || Math.abs(mesh.scale.x) || 1;
  mesh.scale.x = w;
  mesh.geometry = facing < 0 ? GEO_FACE_LEFT : GEO_FACE_RIGHT;
}

export function orientBillboard(mesh, camera) {
  mesh.quaternion.copy(camera.quaternion);
}

export function frameAt(frames, anim, rate) {
  const i = Math.floor(Math.abs(anim) * rate) % frames.length;
  return frames[i];
}
