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

/** Offset legs/arms on the original pixels instead of redrawing the character. */
function derivePose(src, { bob = 0, legDx = 0, legDy = 0, armDx = 0 } = {}) {
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

function texPose(src, pose) {
  return texturize(derivePose(src, pose), true);
}

function walkFrom(src) {
  return [
    { legDx: 3, armDx: -2, bob: 0, legDy: 0 },
    { legDx: 2, armDx: -1, bob: 1, legDy: -1 },
    { legDx: 0, armDx: 0, bob: 0, legDy: 0 },
    { legDx: -3, armDx: 2, bob: 0, legDy: 0 },
    { legDx: -2, armDx: 1, bob: 1, legDy: -1 },
    { legDx: 1, armDx: -1, bob: 0, legDy: 0 },
  ].map((p) => texPose(src, p));
}

function idleFrom(src) {
  return [
    { bob: 0 },
    { bob: 1 },
    { bob: 1, armDx: 1 },
    { bob: 0 },
  ].map((p) => texPose(src, p));
}

function jumpFrom(src) {
  return [texPose(src, { bob: -2, legDx: -1, legDy: -3, armDx: 2 })];
}

function shootFrom(src) {
  return [
    texPose(src, { armDx: 2, legDx: 1, bob: 0 }),
    texPose(src, { armDx: 3, legDx: 1, bob: 0 }),
  ];
}

function hueShiftCanvas(src, deg) {
  return pixelCanvas(src.width, src.height, (g) => {
    g.drawImage(src, 0, 0);
    const img = g.getImageData(0, 0, src.width, src.height);
    const d = img.data;
    const turn = ((deg % 360) + 360) % 360;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 16) continue;
      const r = d[i] / 255;
      const gc = d[i + 1] / 255;
      const b = d[i + 2] / 255;
      const max = Math.max(r, gc, b);
      const min = Math.min(r, gc, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      if (sat < 0.22) continue;
      let h = 0;
      const del = max - min;
      if (del > 0.001) {
        if (max === r) h = ((gc - b) / del) % 6;
        else if (max === gc) h = (b - r) / del + 2;
        else h = (r - gc) / del + 4;
        h *= 60;
        if (h < 0) h += 360;
      }
      h = (h + turn) % 360;
      const c = sat * max;
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = max - c;
      let nr = 0;
      let ng = 0;
      let nb = 0;
      if (h < 60) { nr = c; ng = x; }
      else if (h < 120) { nr = x; ng = c; }
      else if (h < 180) { ng = c; nb = x; }
      else if (h < 240) { ng = x; nb = c; }
      else if (h < 300) { nr = x; nb = c; }
      else { nr = c; nb = x; }
      d[i] = Math.round((nr + m) * 255);
      d[i + 1] = Math.round((ng + m) * 255);
      d[i + 2] = Math.round((nb + m) * 255);
    }
    g.putImageData(img, 0, 0);
  });
}

function setFromOriginal(base, extras = {}) {
  return {
    idle: extras.idle || idleFrom(base),
    walk: extras.walk || walkFrom(base),
    jump: extras.jump || jumpFrom(base),
    shoot: extras.shoot || shootFrom(base),
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
  const playerIdle = idleImgs.every(Boolean)
    ? idleImgs.map((img) => texturize(img, true))
    : idleFrom(idleBase);
  const playerWalkOrig = walkImgs.filter(Boolean).map((img) => texturize(img, true));
  const playerWalk = playerWalkOrig.length
    ? [
      playerWalkOrig[0],
      texPose(walkBase, { legDx: 2, armDx: -1, bob: 1, legDy: -1 }),
      playerWalkOrig[1] || texPose(walkBase, { legDx: 0 }),
      playerWalkOrig[2] || texPose(walkBase, { legDx: -2, armDx: 2 }),
      playerWalkOrig[3] || texPose(walkBase, { legDx: -1, bob: 1 }),
      texPose(walkBase, { legDx: 1, armDx: 1, bob: 0 }),
    ]
    : walkFrom(walkBase);
  const playerShoot = shootImgs.every(Boolean)
    ? shootImgs.map((img) => texturize(img, true))
    : shootFrom(idleBase);
  const player = {
    idle: playerIdle,
    walk: playerWalk,
    jump: jumpFrom(idleBase),
    shoot: playerShoot,
  };

  const thugBase = toCanvas(thugImgs[0] || fallbackFrame("thug", 0));
  const runnerBase = toCanvas(runnerImgs[0] || fallbackFrame("runner", 0));
  const thugOrig = thugImgs.filter(Boolean).map((img) => texturize(img, true));
  const runnerOrig = runnerImgs.filter(Boolean).map((img) => texturize(img, true));
  const thug = setFromOriginal(thugBase, { idle: thugOrig.length ? thugOrig : null, walk: thugOrig.length ? thugOrig : null });
  const runner = setFromOriginal(runnerBase, { idle: runnerOrig.length ? runnerOrig : null, walk: runnerOrig.length ? runnerOrig : null });

  const copBase = hueShiftCanvas(thugBase, 200);
  const cop = setFromOriginal(copBase);

  const buyerHues = [40, 160, 20, -20, 100];
  const buyers = buyerHues.map((deg, i) => {
    const src = i % 2 === 0 ? hueShiftCanvas(thugBase, deg) : hueShiftCanvas(runnerBase, deg);
    return setFromOriginal(src);
  });

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
  mesh.quaternion.copy(camera.quaternion);
}

export function frameAt(frames, anim, rate) {
  if (!frames || !frames.length) return frames;
  const i = Math.floor(Math.abs(anim) * rate) % frames.length;
  return frames[i];
}
