import {
  pixelCanvas, setFromCanvases, flipCanvas, remapHoodie,
} from "../../block-run-25d/js/paint.js?v=33";
import { OUTFITS } from "../../block-run-25d/js/config.js?v=33";

const SPRITE_BASE = new URL("../sprites/", import.meta.url);

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

function toCanvas(img) {
  const w = img?.naturalWidth || img?.width || 32;
  const h = img?.naturalHeight || img?.height || 40;
  return pixelCanvas(w, h, (g) => {
    if (img) g.drawImage(img, 0, 0);
  });
}

function fallback(kind, frame = 0) {
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

function withFlip(frames) {
  return frames.map((c) => {
    c.flipped = flipCanvas(c);
    return c;
  });
}

function sheetFrom(src, extras) {
  const set = setFromCanvases(src, extras);
  return {
    idle: withFlip(set.idle),
    walk: withFlip(set.walk),
    jump: withFlip(set.jump),
    shoot: withFlip(set.shoot),
    wave: withFlip(set.wave),
  };
}

function paintBeater(cop = false) {
  return pixelCanvas(96, 30, (g) => {
    g.clearRect(0, 0, 96, 30);
    g.fillStyle = cop ? "#d8dee8" : "#6a3a24";
    g.fillRect(10, 12, 76, 10);
    g.fillRect(8, 15, 80, 6);
    g.fillStyle = cop ? "#1a2430" : "#4a2818";
    g.fillRect(28, 6, 34, 8);
    g.fillStyle = "#2a3848";
    g.fillRect(32, 8, 12, 5);
    g.fillRect(46, 8, 12, 5);
    if (!cop) {
      g.fillStyle = "#8a5a30";
      g.fillRect(14, 14, 8, 3);
      g.fillRect(58, 16, 10, 2);
      g.fillStyle = "#3a2010";
      g.fillRect(70, 13, 6, 4);
    }
    g.fillStyle = "#111018";
    g.fillRect(18, 20, 12, 9);
    g.fillRect(64, 20, 12, 9);
    g.fillStyle = "#8a8070";
    g.fillRect(21, 23, 6, 3);
    g.fillRect(67, 23, 6, 3);
    if (cop) {
      g.fillStyle = "#e21b7a";
      g.fillRect(38, 2, 8, 3);
      g.fillStyle = "#3de0ff";
      g.fillRect(48, 2, 8, 3);
    } else {
      g.fillStyle = "#c8a060";
      g.fillRect(82, 16, 5, 3);
      g.fillStyle = "#e21b7a";
      g.fillRect(10, 16, 3, 3);
    }
  });
}

function cleanStreet(street) {
  if (!street || !street.naturalWidth) return street;
  const w = street.naturalWidth;
  const h = 168;
  return pixelCanvas(w, h, (g) => {
    g.drawImage(street, 0, 0, w, Math.min(h, street.naturalHeight), 0, 0, w, h);
    g.drawImage(street, 0, 142, 110, 6, 0, 148, 110, 20);
  });
}

function carFrom(_img, cop = false) {
  return paintBeater(cop);
}

export async function loadArt() {
  const [idleImgs, walkImgs, shootImgs, packImg, cashImg, dumpImg, streetImg, thugImgs, runImgs, bossImgs] = await Promise.all([
    Promise.all([1, 2, 3, 4].map((i) => loadRaw(`idle-${i}.png`))),
    Promise.all([1, 2, 3, 4].map((i) => loadRaw(`walk-${i}.png`))),
    Promise.all([1, 2, 3, 4].map((i) => loadRaw(`shoot-${i}.png`))),
    loadRaw("pack.png"),
    loadRaw("cash.png"),
    loadRaw("dumpster.png"),
    loadImage(new URL("../map/street.png", import.meta.url).href),
    Promise.all([1, 2, 3, 4].map((i) => loadRaw(`thug-${i}.png`))),
    Promise.all([1, 2, 3, 4].map((i) => loadRaw(`runner-${i}.png`))),
    Promise.all([1, 2, 3, 4].map((i) => loadRaw(`boss-${i}.png`))),
  ]);

  const idleBase = toCanvas(idleImgs[0] || fallback("idle"));
  const walkBase = toCanvas(walkImgs[0] || idleBase);

  function makePlayer(hex) {
    const rec = (img) => {
      const c = img instanceof HTMLCanvasElement ? img : toCanvas(img);
      return hex ? remapHoodie(c, hex) : c;
    };
    const srcIdle = idleImgs.every(Boolean) ? idleImgs : [idleBase];
    const srcWalk = walkImgs.filter(Boolean);
    const srcShoot = shootImgs.every(Boolean) ? shootImgs : null;
    const tintWalk = rec(walkBase);
    const derived = setFromCanvases(tintWalk);
    const playerIdle = withFlip(srcIdle.map((img) => rec(img)));
    const walkOrig = srcWalk.map((img) => rec(img));
    const playerWalk = withFlip(walkOrig.length
      ? [
        walkOrig[0],
        derived.walk[1],
        walkOrig[1] || derived.walk[2],
        walkOrig[2] || derived.walk[3],
        walkOrig[3] || derived.walk[4],
        derived.walk[5],
      ]
      : derived.walk);
    const playerShoot = withFlip((srcShoot || derived.shoot).map((img) => rec(img)));
    return {
      idle: playerIdle,
      walk: playerWalk,
      jump: withFlip(derived.jump),
      shoot: playerShoot,
    };
  }

  const player = makePlayer(null);
  const outfits = OUTFITS.map((o) => (o.hex ? makePlayer(o.hex) : player));

  function sheetFromImgs(imgs, fallbackSrc) {
    const live = imgs.filter(Boolean).map((img) => toCanvas(img));
    if (!live.length) return sheetFrom(fallbackSrc);
    return {
      idle: withFlip(live),
      walk: withFlip(live),
      jump: withFlip(live),
      shoot: withFlip(live),
      wave: withFlip(live),
    };
  }
  const thugSheet = sheetFromImgs(thugImgs, toCanvas(idleImgs[0] || fallback("idle")));
  const runSheet = sheetFromImgs(runImgs, toCanvas(walkImgs[0] || fallback("idle")));
  const bossSheet = sheetFromImgs(bossImgs, toCanvas(idleImgs[0] || fallback("idle")));
  const buyers = [thugSheet, runSheet, bossSheet, thugSheet, runSheet];
  const plug = bossSheet;
  const cop = thugSheet;

  return {
    player,
    outfits,
    idle: player.idle,
    walk: player.walk,
    jump: player.jump,
    shoot: player.shoot,
    buyers,
    peds: buyers,
    plug,
    cop,
    pack: toCanvas(packImg || fallback("pack")),
    cash: toCanvas(cashImg || fallback("cash")),
    dumpster: toCanvas(dumpImg || fallback("dumpster")),
    street: cleanStreet(streetImg),
    car: withFlip([carFrom(null, false)])[0],
    copCar: withFlip([carFrom(null, true)])[0],
  };
}
