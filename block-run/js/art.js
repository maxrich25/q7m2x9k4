import {
  pixelCanvas, paintLook, paintCopFig, paintPlugFig, PED_LOOKS,
  setFromCanvases, flipCanvas,
} from "../../block-run-25d/js/paint.js?v=29";

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

function paintCarFallback(cop = false) {
  return pixelCanvas(95, 29, (g) => {
    g.fillStyle = cop ? "#e8eef4" : "#2a1840";
    g.fillRect(8, 12, 80, 11);
    g.fillStyle = cop ? "#1a2430" : "#1a1028";
    g.fillRect(28, 5, 36, 9);
    g.fillStyle = "#3a4868";
    g.fillRect(32, 7, 12, 6);
    g.fillRect(48, 7, 12, 6);
    g.fillStyle = "#111018";
    g.fillRect(16, 20, 12, 9);
    g.fillRect(64, 20, 12, 9);
    g.fillStyle = "#d0d4dc";
    g.fillRect(19, 23, 6, 3);
    g.fillRect(67, 23, 6, 3);
    if (cop) {
      g.fillStyle = "#e21b7a";
      g.fillRect(36, 2, 8, 3);
      g.fillStyle = "#3de0ff";
      g.fillRect(46, 2, 8, 3);
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

function carFrom(img, cop = false) {
  const src = img ? toCanvas(img) : paintCarFallback(cop);
  const facingRight = flipCanvas(src);
  if (!cop) return facingRight;
  const w = facingRight.width;
  const h = facingRight.height;
  return pixelCanvas(w, h, (g) => {
    g.drawImage(facingRight, 0, 0);
    const data = g.getImageData(0, 0, w, h);
    const d = data.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) continue;
      const r = d[i];
      const b = d[i + 2];
      if (b > r + 8 && b > 40) {
        d[i] = Math.min(255, r + 150);
        d[i + 1] = Math.min(255, d[i + 1] + 150);
        d[i + 2] = Math.min(255, b + 110);
      }
    }
    g.putImageData(data, 0, 0);
    g.fillStyle = "#e21b7a";
    g.fillRect(40, 1, 8, 3);
    g.fillStyle = "#3de0ff";
    g.fillRect(50, 1, 8, 3);
  });
}

export async function loadArt() {
  const [idleImgs, walkImgs, shootImgs, packImg, cashImg, dumpImg, streetImg, carImg] = await Promise.all([
    Promise.all([1, 2, 3, 4].map((i) => loadRaw(`idle-${i}.png`))),
    Promise.all([1, 2, 3, 4].map((i) => loadRaw(`walk-${i}.png`))),
    Promise.all([1, 2, 3, 4].map((i) => loadRaw(`shoot-${i}.png`))),
    loadRaw("pack.png"),
    loadRaw("cash.png"),
    loadRaw("dumpster.png"),
    loadImage(new URL("../map/street.png", import.meta.url).href),
    loadRaw("car.png"),
  ]);

  const idleBase = toCanvas(idleImgs[0] || fallback("idle"));
  const walkBase = toCanvas(walkImgs[0] || idleBase);
  const playerIdle = withFlip((idleImgs.every(Boolean) ? idleImgs : [idleBase]).map((img) => toCanvas(img)));
  const playerWalkOrig = walkImgs.filter(Boolean).map((img) => toCanvas(img));
  const derived = setFromCanvases(walkBase);
  const playerWalk = withFlip(playerWalkOrig.length
    ? [
      playerWalkOrig[0],
      derived.walk[1],
      playerWalkOrig[1] || derived.walk[2],
      playerWalkOrig[2] || derived.walk[3],
      playerWalkOrig[3] || derived.walk[4],
      derived.walk[5],
    ]
    : derived.walk);
  const playerShoot = withFlip((shootImgs.every(Boolean) ? shootImgs : derived.shoot).map((img) => (
    img instanceof HTMLCanvasElement ? img : toCanvas(img)
  )));
  const player = {
    idle: playerIdle,
    walk: playerWalk,
    jump: withFlip(derived.jump),
    shoot: playerShoot,
  };

  const buyers = PED_LOOKS.map((_, i) => sheetFrom(paintLook(i)));
  const plug = sheetFrom(paintPlugFig());
  const cop = sheetFrom(paintCopFig());

  return {
    player,
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
    car: withFlip([carFrom(carImg, false)])[0],
    copCar: withFlip([carFrom(carImg, true)])[0],
  };
}
