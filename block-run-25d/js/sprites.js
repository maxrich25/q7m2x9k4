import * as THREE from "three";
import {
  pixelCanvas, derivePose, paintLook, paintCopFig, paintPlugFig, PED_LOOKS,
  WALK_POSES, PED_WALK_POSES, IDLE_POSES, JUMP_POSES, SHOOT_POSES, WAVE_POSES,
  remapHoodie,
} from "./paint.js?v=48";
import { OUTFITS } from "./config.js?v=48";

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

async function loadRaw(file) {
  return loadImage(new URL(file, SPRITE_BASE).href);
}

async function loadSheet(name, count) {
  const frames = [];
  for (let i = 1; i <= count; i++) {
    const img = await loadRaw(`${name}-${i}.png`);
    frames.push(texturize(img || fallbackFrame(name, i), true));
  }
  return frames;
}

async function loadOne(file, kind) {
  const img = await loadRaw(file);
  return texturize(img || fallbackFrame(kind, 0));
}

function toCanvas(img) {
  const w = img.naturalWidth || img.width || 32;
  const h = img.naturalHeight || img.height || 40;
  return pixelCanvas(w, h, (g) => g.drawImage(img, 0, 0));
}

function texPose(src, pose) {
  return texturize(derivePose(src, pose), true);
}

function walkFrom(src) {
  return WALK_POSES.map((p) => texPose(src, p));
}

function idleFrom(src) {
  return IDLE_POSES.map((p) => texPose(src, p));
}

function jumpFrom(src) {
  return JUMP_POSES.map((p) => texPose(src, p));
}

function shootFrom(src) {
  return SHOOT_POSES.map((p) => texPose(src, p));
}

function waveFrom(src) {
  return WAVE_POSES.map((p) => texPose(src, p));
}

function setFromOriginal(base, extras = {}) {
  return {
    idle: extras.idle || idleFrom(base),
    walk: extras.walk || walkFrom(base),
    jump: extras.jump || jumpFrom(base),
    shoot: extras.shoot || shootFrom(base),
    wave: extras.wave || waveFrom(base),
  };
}

export async function loadSprites() {
  const [idleImgs, walkImgs, shootImgs, thugImgs, runnerImgs, bossImgs] = await Promise.all([
    Promise.all([1, 2, 3, 4].map((i) => loadRaw(`idle-${i}.png`))),
    Promise.all([1, 2, 3, 4].map((i) => loadRaw(`walk-${i}.png`))),
    Promise.all([1, 2, 3, 4].map((i) => loadRaw(`shoot-${i}.png`))),
    Promise.all([1, 2, 3, 4].map((i) => loadRaw(`thug-${i}.png`))),
    Promise.all([1, 2, 3, 4].map((i) => loadRaw(`runner-${i}.png`))),
    Promise.all([1, 2, 3, 4].map((i) => loadRaw(`boss-${i}.png`))),
  ]);

  const idleBase = toCanvas(idleImgs[0] || fallbackFrame("idle", 0));
  const walkBase = toCanvas(walkImgs[0] || idleBase);

  function makePlayer(hex) {
    const rec = (img) => {
      const c = img instanceof HTMLCanvasElement ? img : toCanvas(img);
      return hex ? remapHoodie(c, hex) : c;
    };
    const tintIdle = rec(idleBase);
    const tintWalk = rec(walkBase);
    const playerIdle = idleImgs.every(Boolean)
      ? idleImgs.map((img) => texturize(rec(img), true))
      : idleFrom(tintIdle);
    const walkOrig = walkImgs.filter(Boolean).map((img) => texturize(rec(img), true));
    const playerWalk = walkOrig.length
      ? [
        walkOrig[0],
        texPose(tintWalk, { legDx: 2, armDx: -1, bob: 1, legDy: -1 }),
        walkOrig[1] || texPose(tintWalk, { legDx: 0 }),
        walkOrig[2] || texPose(tintWalk, { legDx: -2, armDx: 2 }),
        walkOrig[3] || texPose(tintWalk, { legDx: -1, bob: 1 }),
        texPose(tintWalk, { legDx: 1, armDx: 1, bob: 0 }),
      ]
      : walkFrom(tintWalk);
    const playerShoot = shootImgs.every(Boolean)
      ? shootImgs.map((img) => texturize(rec(img), true))
      : shootFrom(tintIdle);
    return {
      idle: playerIdle,
      walk: playerWalk,
      jump: jumpFrom(tintIdle),
      shoot: playerShoot,
    };
  }

  const player = makePlayer(null);
  const outfits = OUTFITS.map((o) => (o.hex25 ? makePlayer(o.hex25) : player));

  const thugBase = toCanvas(thugImgs[0] || fallbackFrame("thug", 0));
  const runnerBase = toCanvas(runnerImgs[0] || fallbackFrame("runner", 0));
  const thugOrig = thugImgs.filter(Boolean).map((img) => texturize(img, true));
  const runnerOrig = runnerImgs.filter(Boolean).map((img) => texturize(img, true));
  const thug = setFromOriginal(thugBase, { idle: thugOrig.length ? thugOrig : null, walk: thugOrig.length ? thugOrig : null });
  const runner = setFromOriginal(runnerBase, { idle: runnerOrig.length ? runnerOrig : null, walk: runnerOrig.length ? runnerOrig : null });

  const cop = setFromOriginal(paintCopFig());
  const buyers = PED_LOOKS.map((_, i) => {
    const src = paintLook(i);
    return setFromOriginal(src, { walk: PED_WALK_POSES.map((p) => texPose(src, p)) });
  });
  const plug = setFromOriginal(paintPlugFig());

  const bossFrames = bossImgs.filter(Boolean).map((img) => texturize(img, true));
  const boss = {
    idle: bossFrames.length ? bossFrames : [texturize(fallbackFrame("boss", 0), true)],
    walk: bossFrames.length ? bossFrames : [texturize(fallbackFrame("boss", 0), true)],
  };

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
    outfits,
    thug,
    runner,
    cop,
    boss,
    buyers,
    peds: buyers,
    plug,
    shot, boom, pack, cash, dumpster,
  };
}

const BILLBOARD_GEO = new THREE.PlaneGeometry(1, 1);
BILLBOARD_GEO.translate(0, 0.5, 0);

function textureSize(texture) {
  const img = texture?.image;
  return {
    w: img?.naturalWidth || img?.width || 32,
    h: img?.naturalHeight || img?.height || 40,
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
  const dx = camera.position.x - mesh.position.x;
  const dz = camera.position.z - mesh.position.z;
  mesh.rotation.set(0, Math.atan2(dx, dz), 0);
}

export function frameAt(frames, anim, rate) {
  if (!frames || !frames.length) return frames;
  const i = Math.floor(Math.abs(anim) * rate) % frames.length;
  return frames[i];
}
