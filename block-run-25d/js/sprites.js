import * as THREE from "three";
import {
  pixelCanvas, derivePose, paintLook, paintWalkLook, paintCopFig, paintPlugFig, PED_LOOKS,
  WALK_POSES, WALK_CYCLE_POSES, RUN_CYCLE_POSES, IDLE_POSES, JUMP_POSES, SHOOT_POSES, WAVE_POSES,
  paintClassicHeroSet, classicWithoutHat,
} from "./paint.js?v=91";

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

function texturizeSoft(source) {
  const tex = source instanceof HTMLCanvasElement
    ? new THREE.CanvasTexture(source)
    : new THREE.Texture(source);
  if (!(source instanceof HTMLCanvasElement)) tex.needsUpdate = true;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  const w = source.width || source.naturalWidth || 64;
  const h = source.height || source.naturalHeight || 64;
  const flipped = pixelCanvas(w, h, (g) => {
    g.imageSmoothingEnabled = true;
    g.translate(w, 0);
    g.scale(-1, 1);
    g.drawImage(source, 0, 0);
  });
  const flipTex = new THREE.CanvasTexture(flipped);
  flipTex.magFilter = THREE.LinearFilter;
  flipTex.minFilter = THREE.LinearFilter;
  flipTex.colorSpace = THREE.SRGBColorSpace;
  flipTex.generateMipmaps = false;
  flipTex.needsUpdate = true;
  tex.userData.flipped = flipTex;
  return tex;
}

const HERO_VIEW_NAMES = ["side", "front34", "front", "back34", "back"];

async function loadHeroViews() {
  const base = new URL("../sprites/", import.meta.url);
  const out = {};
  await Promise.all(HERO_VIEW_NAMES.map(async (name) => {
    const img = await loadImage(new URL(`hero-${name}.png`, base).href);
    if (img) out[name] = texturizeSoft(img);
  }));
  if (!out.side || !out.front || !out.back) return null;
  return out;
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

  function finishSet(set) {
    const tex = (c) => texturize(c, true);
    return {
      idle: set.idle.map(tex),
      walk: set.walk.map(tex),
      run: (set.run || set.walk).map(tex),
      jump: set.jump.map(tex),
      shoot: set.shoot.map(tex),
      turn: (set.turn || set.idle).map(tex),
      sit: (set.sit || set.idle).map(tex),
    };
  }

  // Classic pixel sheets from block-run/sprites/ (read-only) as billboard frames.
  const idleSrc = idleImgs.filter(Boolean);
  const walkSrc = walkImgs.filter(Boolean);
  const shootSrc = shootImgs.filter(Boolean);
  let playerHat;
  let playerBare;
  if (idleSrc.length) {
    const idleC = idleSrc.map(toCanvas);
    const walkC = (walkSrc.length ? walkSrc : idleSrc).map(toCanvas);
    const shootC = (shootSrc.length ? shootSrc : idleSrc).map(toCanvas);
    const frames = (canvases, hatOn) => canvases.map((c) => texturize(hatOn ? c : classicWithoutHat(c), true));
    const idleHat = frames(idleC, true);
    const walkHat = frames(walkC, true);
    const shootHat = frames(shootC, true);
    const idleBare = frames(idleC, false);
    const walkBare = frames(walkC, false);
    const shootBare = frames(shootC, false);
    playerHat = {
      idle: idleHat,
      walk: walkHat,
      run: walkHat,
      jump: JUMP_POSES.map((p) => texturize(derivePose(idleC[0], p), true)),
      shoot: shootHat,
      turn: idleHat,
      sit: idleHat,
    };
    playerBare = {
      idle: idleBare,
      walk: walkBare,
      run: walkBare,
      jump: JUMP_POSES.map((p) => texturize(derivePose(classicWithoutHat(idleC[0]), p), true)),
      shoot: shootBare,
      turn: idleBare,
      sit: idleBare,
    };
  } else {
    playerHat = finishSet(paintClassicHeroSet({ hat: "beanie", top: "hoodie", bottom: "jeans", shoes: "reds" }));
    playerBare = finishSet(paintClassicHeroSet({ hat: "none", top: "hoodie", bottom: "jeans", shoes: "reds" }));
  }
  const player = playerHat;
  const outfits = [playerHat];
  const hero = { beanie: playerHat, none: playerBare };

  const thugBase = toCanvas(thugImgs[0] || fallbackFrame("thug", 0));
  const runnerBase = toCanvas(runnerImgs[0] || fallbackFrame("runner", 0));
  const thugOrig = thugImgs.filter(Boolean).map((img) => texturize(img, true));
  const runnerOrig = runnerImgs.filter(Boolean).map((img) => texturize(img, true));
  const thug = setFromOriginal(thugBase, { idle: thugOrig.length ? thugOrig : null, walk: thugOrig.length ? thugOrig : null });
  const runner = setFromOriginal(runnerBase, { idle: runnerOrig.length ? runnerOrig : null, walk: runnerOrig.length ? runnerOrig : null });

  const cop = setFromOriginal(paintCopFig());
  function softTex(c) {
    return texturize(c, true);
  }
  const buyers = PED_LOOKS.map((_, i) => {
    const src = paintLook(i);
    const walks = paintWalkLook(i, WALK_CYCLE_POSES).map(softTex);
    const runs = paintWalkLook(i, RUN_CYCLE_POSES).map(softTex);
    const idles = IDLE_POSES.map((p) => softTex(paintLook(i, p)));
    const set = setFromOriginal(src, { walk: walks, idle: idles });
    set.run = runs;
    return set;
  });
  const plug = setFromOriginal(paintPlugFig());

  const bossFrames = bossImgs.filter(Boolean).map((img) => texturize(img, true));
  const boss = {
    idle: bossFrames.length ? bossFrames : [texturize(fallbackFrame("boss", 0), true)],
    walk: bossFrames.length ? bossFrames : [texturize(fallbackFrame("boss", 0), true)],
  };

  const [shot, boom, pack, cash, dumpster, heroViews] = await Promise.all([
    loadSheet("shot", 4),
    loadSheet("boom", 4),
    loadOne("pack.png", "pack"),
    loadOne("cash.png", "cash"),
    loadOne("dumpster.png", "dumpster"),
    loadHeroViews(),
  ]);

  return {
    idle: player.idle,
    walk: player.walk,
    run: player.run,
    jump: player.jump,
    shoot: player.shoot,
    player,
    hero,
    outfits,
    thug,
    runner,
    cop,
    boss,
    buyers,
    peds: buyers,
    plug,
    shot, boom, pack, cash, dumpster,
    heroViews,
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
    depthTest: true,
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
