import * as THREE from "three";
import {
  WORLD, GROUND_Y, STREET_LEN, SHOP_X, DUMPSTER_X, COLORS,
  wrap, wrapDelta, gameToWorldX, gameToWorldY, nearestWorldX,
  BLOCK_LEN, PLUG_X, HOME_X, LIGHT_COUNT, lightGameX, restLat, DAY_NIGHT_ENABLED,
  INTER_METERS, BOARD_T, CAM_ZOOM_MIN, CAM_ZOOM_MED, CAM_ZOOM_MAX,
} from "./config.js?v=65";
import { makeBillboard, setBillboardFrame, orientBillboard, frameAt } from "./sprites.js?v=65";

function canvasTex(w, h, paint) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  paint(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function brickTex(color, accent) {
  return canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    g.fillStyle = accent;
    for (let y = 0; y < h; y += 8) {
      const off = (y / 8) % 2 ? 8 : 0;
      for (let x = -8; x < w; x += 16) {
        g.fillRect(x + off, y, 14, 6);
      }
    }
    g.fillStyle = "rgba(0,0,0,0.18)";
    for (let i = 0; i < 40; i++) g.fillRect((i * 17) % w, (i * 13) % h, 2, 1);
  });
}

function asphaltTex() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = "#1a1822";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#24202c";
    for (let i = 0; i < 220; i++) g.fillRect((i * 37) % w, (i * 53) % h, 2, 2);
    g.fillStyle = "#2e2a36";
    for (let i = 0; i < 90; i++) g.fillRect((i * 19) % w, (i * 29) % h, 1, 1);
  });
}

function sidewalkTex() {
  return canvasTex(64, 32, (g, w, h) => {
    g.fillStyle = "#8a8694";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#5a5664";
    g.lineWidth = 2;
    for (let x = 0; x < w; x += 16) g.strokeRect(x + 0.5, 1, 15, h - 2);
    g.fillStyle = "#b8b4c0";
    g.fillRect(0, 0, w, 3);
    g.fillStyle = "#6a6674";
    g.fillRect(0, h - 3, w, 3);
  });
}

function windowTex(lit, seed = 11) {
  return canvasTex(32, 48, (g, w, h) => {
    g.fillStyle = "#141018";
    g.fillRect(0, 0, w, h);
    const cols = 3;
    const rows = 6;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const n = (r * 5 + c * 3 + seed) % 7;
        const on = lit && n > 1;
        g.fillStyle = on ? (n % 2 ? "#ffe06a" : "#7af0ff") : "#1a1424";
        g.fillRect(3 + c * 10, 2 + r * 7.5, 7, 6);
        if (on) {
          g.fillStyle = "rgba(255,255,255,0.25)";
          g.fillRect(4 + c * 10, 3 + r * 7.5, 3, 2);
        }
      }
    }
  });
}

const WIN_LIT = windowTex(true, 11);
const WIN_DIM = windowTex(false, 11);
const winMat = new THREE.MeshBasicMaterial({ map: WIN_LIT });
const winMatFar = new THREE.MeshBasicMaterial({ map: WIN_LIT, fog: false });
const lampHeadMat = new THREE.MeshBasicMaterial({ color: 0xf0c430 });
const lampGlowMat = new THREE.SpriteMaterial({
  map: (() => {
    const tex = canvasTex(64, 64, (g, w, h) => {
      const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
      grd.addColorStop(0, "#f0c430");
      grd.addColorStop(0.4, "#f0c43099");
      grd.addColorStop(1, "#f0c43000");
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    });
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  })(),
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  opacity: 0.85,
});

function graffitiTex() {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = "#6a6258";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#5a5248";
    for (let y = 0; y < h; y += 10) {
      const off = (y / 10) % 2 ? 9 : 0;
      for (let x = -9; x < w; x += 18) g.fillRect(x + off, y, 16, 8);
    }
    g.fillStyle = "#2a2430";
    g.font = "bold 18px sans-serif";
    g.globalAlpha = 0.45;
    g.fillText("BLOCK", 12, 28);
    g.fillText("RUN", 170, 118);
    g.globalAlpha = 1;
    g.font = "bold 64px Impact, Arial Black, sans-serif";
    g.strokeStyle = "#07060c";
    g.lineWidth = 10;
    g.strokeText("CALI", 28, 88);
    g.strokeStyle = "#e21b7a";
    g.lineWidth = 6;
    g.strokeText("CALI", 28, 88);
    g.fillStyle = "#f4f0e8";
    g.fillText("CALI", 28, 88);
    g.fillStyle = "#3de0ff";
    g.font = "bold 20px sans-serif";
    g.fillText("LA NIGHTS", 70, 112);
    g.strokeStyle = "#3de0ff";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(18, 40);
    g.quadraticCurveTo(80, 10, 140, 36);
    g.stroke();
  });
}

function neonTex(text, color) {
  return canvasTex(256, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = "bold 28px 'Press Start 2P', monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.shadowColor = color;
    g.shadowBlur = 18;
    g.fillStyle = color;
    g.fillText(text, w / 2, h / 2 + 2);
    g.shadowBlur = 0;
    g.fillStyle = "#ffffff";
    g.fillText(text, w / 2, h / 2);
  });
}

function hexRgba(hex, a) {
  const n = parseInt(String(hex).replace("#", ""), 16);
  if (!Number.isFinite(n)) return `rgba(255,255,255,${a})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

function glowSprite(color, size) {
  const tex = canvasTex(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const grd = g.createRadialGradient(32, 32, 1, 32, 32, 30);
    grd.addColorStop(0, hexRgba(color, 1));
    grd.addColorStop(0.28, hexRgba(color, 0.72));
    grd.addColorStop(0.55, hexRgba(color, 0.22));
    grd.addColorStop(1, hexRgba(color, 0));
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    opacity: 0.9,
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(size, size, 1);
  s.renderOrder = 4;
  return s;
}

function makePalm() {
  const trunkSrc = document.createElement("canvas");
  trunkSrc.width = 48;
  trunkSrc.height = 140;
  const tg = trunkSrc.getContext("2d");
  tg.imageSmoothingEnabled = false;
  for (let y = 0; y < 140; y++) {
    const t = y / 140;
    const x = 22 + Math.round(Math.sin(t * 1.05) * 2.0);
    const ring = y % 9 === 0;
    tg.fillStyle = ring ? "#5a3824" : "#7a5438";
    tg.fillRect(x, y, 4, 1);
    tg.fillStyle = "#4a2c1c";
    tg.fillRect(x, y, 1, 1);
    tg.fillStyle = ring ? "#6a4430" : "#8a6448";
    tg.fillRect(x + 3, y, 1, 1);
  }
  function trunkSlice(y0, y1) {
    const tex = canvasTex(48, y1 - y0, (g) => {
      g.drawImage(trunkSrc, 0, y0, 48, y1 - y0, 0, 0, 48, y1 - y0);
    });
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }
  const baseTex = trunkSlice(105, 140);
  const lowerTex = trunkSlice(70, 105);
  const midTex = trunkSlice(35, 70);
  const tipTex = trunkSlice(0, 35);
  const crownTex = canvasTex(96, 88, (g) => {
    g.clearRect(0, 0, 96, 88);
    const cx = 48;
    const cy = 44;
    const blades = [
      { a: -1.57, len: 22, w: 4.6, col: "#344830" },
      { a: -2.15, len: 24, w: 4.4, col: "#283a28" },
      { a: -1.00, len: 24, w: 4.4, col: "#283a28" },
      { a: -2.65, len: 26, w: 4.6, col: "#223224" },
      { a: -0.48, len: 26, w: 4.6, col: "#223224" },
      { a: 3.22, len: 27, w: 4.2, col: "#1c2c20" },
      { a: -0.02, len: 27, w: 4.2, col: "#1c2c20" },
      { a: 2.75, len: 22, w: 3.8, col: "#283a28" },
      { a: 0.38, len: 22, w: 3.8, col: "#283a28" },
    ];
    for (const f of blades) {
      g.fillStyle = f.col;
      for (let i = 0; i <= f.len; i++) {
        const t = i / f.len;
        const droop = t * t * 10;
        const x = cx + Math.cos(f.a) * i;
        const y = cy + Math.sin(f.a) * i + droop;
        const half = Math.max(1, Math.round(f.w * (1 - t * 0.72)));
        const nx = -Math.sin(f.a);
        const ny = Math.cos(f.a);
        for (let k = -half; k <= half; k++) {
          g.fillRect(Math.round(x + nx * k * 0.55), Math.round(y + ny * k * 0.55), 2, 2);
        }
      }
    }
    g.fillStyle = "#2e422c";
    for (let dy = -7; dy <= 7; dy++) {
      for (let dx = -6; dx <= 6; dx++) {
        if (dx * dx + dy * dy < 34) g.fillRect(cx + dx, cy + dy, 1, 1);
      }
    }
  });
  crownTex.wrapS = THREE.ClampToEdgeWrapping;
  crownTex.wrapT = THREE.ClampToEdgeWrapping;
  function trunkSpr(map, h) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false }));
    s.center.set(0.5, 0);
    s.scale.set(1.15, h, 1);
    return s;
  }
  const segH = 1.05;
  const baseHold = new THREE.Group();
  baseHold.name = "palmBase";
  baseHold.add(trunkSpr(baseTex, segH));
  const lowerHold = new THREE.Group();
  lowerHold.name = "palmLower";
  lowerHold.position.y = segH;
  lowerHold.add(trunkSpr(lowerTex, segH));
  const midHold = new THREE.Group();
  midHold.name = "palmMid";
  midHold.position.y = segH;
  midHold.add(trunkSpr(midTex, segH));
  const tipHold = new THREE.Group();
  tipHold.name = "palmTip";
  tipHold.position.y = segH;
  tipHold.add(trunkSpr(tipTex, segH));
  const crownHold = new THREE.Group();
  crownHold.name = "palmCrown";
  crownHold.position.y = segH;
  const crown = new THREE.Sprite(new THREE.SpriteMaterial({ map: crownTex, transparent: true, depthWrite: false }));
  crown.center.set(0.5, 0.52);
  crown.scale.set(2.55, 2.35, 1);
  crownHold.add(crown);
  tipHold.add(crownHold);
  midHold.add(tipHold);
  lowerHold.add(midHold);
  baseHold.add(lowerHold);
  const g = new THREE.Group();
  g.add(baseHold);
  g.userData.palm = true;
  g.userData.palmPhase = Math.random() * Math.PI * 2;
  return g;
}

function makeBuilding(w, h, d, facade) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ map: facade, color: 0xffffff }),
  );
  body.position.y = h / 2;
  g.add(body);
  const windows = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.86, h * 0.72),
    winMat,
  );
  windows.position.set(0, h * 0.52, d / 2 + 0.02);
  g.add(windows);
  const ledge = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.12, 0.08, d + 0.12),
    new THREE.MeshLambertMaterial({ color: 0x1a1620 }),
  );
  ledge.position.y = h + 0.02;
  g.add(ledge);
  return g;
}

function chromeRim(x, z, radius = 0.22, hubcap = false) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.2, 16),
    new THREE.MeshLambertMaterial({ color: 0x0a0a0c }),
  );
  tire.rotation.z = Math.PI / 2;
  tire.rotation.y = Math.PI / 2;
  g.add(tire);
  const dishR = radius * (hubcap ? 0.62 : 0.56);
  const dish = new THREE.Mesh(
    new THREE.CylinderGeometry(dishR, dishR, 0.055, 16),
    new THREE.MeshLambertMaterial({ color: 0x8a9098 }),
  );
  dish.rotation.z = Math.PI / 2;
  dish.rotation.y = Math.PI / 2;
  dish.position.z = z > 0 ? 0.03 : -0.03;
  g.add(dish);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(dishR * 0.72, 0.016, 8, 18),
    new THREE.MeshLambertMaterial({ color: 0xb4b8c0 }),
  );
  ring.rotation.y = Math.PI / 2;
  ring.position.z = z > 0 ? 0.04 : -0.04;
  g.add(ring);
  const slotMat = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
  const slots = hubcap ? 5 : 4;
  for (let i = 0; i < slots; i++) {
    const a = (i / slots) * Math.PI * 2;
    const slot = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, radius * 0.16, 0.018),
      slotMat,
    );
    slot.position.set(Math.cos(a) * dishR * 0.38, Math.sin(a) * dishR * 0.38, z > 0 ? 0.05 : -0.05);
    slot.rotation.z = a;
    g.add(slot);
  }
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.12, radius * 0.12, 0.07, 10),
    new THREE.MeshLambertMaterial({ color: 0x6a7078 }),
  );
  cap.rotation.z = Math.PI / 2;
  cap.rotation.y = Math.PI / 2;
  cap.position.z = z > 0 ? 0.04 : -0.04;
  g.add(cap);
  g.position.set(x, radius, z);
  return g;
}

function headBeamTex() {
  const tex = canvasTex(160, 96, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0, "rgba(255,250,220,1)");
    grd.addColorStop(0.18, "rgba(255,240,190,0.72)");
    grd.addColorStop(0.55, "rgba(255,228,160,0.28)");
    grd.addColorStop(1, "rgba(255,230,160,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(0, h * 0.34);
    g.lineTo(0, h * 0.66);
    g.lineTo(w, h * 0.96);
    g.lineTo(w, h * 0.04);
    g.closePath();
    g.fill();
  });
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function headSpotTex() {
  const tex = canvasTex(192, 112, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const grd = g.createRadialGradient(w * 0.32, h * 0.5, 8, w * 0.48, h * 0.5, h * 0.5);
    grd.addColorStop(0, "rgba(255,252,230,1)");
    grd.addColorStop(0.2, "rgba(255,244,200,0.9)");
    grd.addColorStop(0.48, "rgba(255,230,160,0.5)");
    grd.addColorStop(0.78, "rgba(255,220,140,0.16)");
    grd.addColorStop(1, "rgba(255,220,140,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.ellipse(w * 0.46, h * 0.5, w * 0.48, h * 0.4, 0, 0, Math.PI * 2);
    g.fill();
    const fade = g.createLinearGradient(0, 0, w, 0);
    fade.addColorStop(0, "rgba(0,0,0,0)");
    fade.addColorStop(0.62, "rgba(0,0,0,0)");
    fade.addColorStop(1, "rgba(0,0,0,1)");
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = fade;
    g.fillRect(0, 0, w, h);
  });
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function addHeadBeams(car, bumperX, lampZ = 0.42, lampY = 0.52) {
  const shaftTex = headBeamTex();
  const spotTex = headSpotTex();
  const group = new THREE.Group();
  group.name = "headBeam";
  const shaftMat = new THREE.MeshBasicMaterial({
    map: shaftTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.82,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const spotMat = new THREE.MeshBasicMaterial({
    map: spotTex,
    transparent: true,
    depthWrite: false,
    opacity: 1,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  for (const side of [-1, 1]) {
    const z = side * lampZ;
    const hold = new THREE.Group();
    hold.position.set(bumperX + 0.04, lampY, z);
    hold.rotation.y = side * 0.16;
    hold.rotation.z = -0.2;
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.15), shaftMat);
    shaft.position.x = 2.55;
    hold.add(shaft);
    group.add(hold);
  }
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 2.85), spotMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(bumperX + 3.15, 0.035, 0);
  group.add(pool);
  const pool2 = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.9), spotMat);
  pool2.rotation.x = -Math.PI / 2;
  pool2.position.set(bumperX + 2.35, 0.04, 0);
  group.add(pool2);
  car.add(group);
  return group;
}

function addCarDoors(car, paint, tint, zSide = 0.66) {
  const seamMat = new THREE.MeshLambertMaterial({ color: 0x1a0c08 });
  const chrome = new THREE.MeshPhongMaterial({ color: 0xd8dee6, specular: 0xffffff, shininess: 140 });
  for (const side of [1, -1]) {
    const z = side * zSide;
    const front = new THREE.Group();
    front.name = side > 0 ? "doorNear" : "doorFar";
    front.position.set(0.62, 0.52, z);
    const fPanel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.05), paint);
    fPanel.position.set(-0.45, 0, 0);
    const fGlass = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.2, 0.06), tint);
    fGlass.position.set(-0.4, 0.22, 0);
    const fSeam = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.46, 0.07), seamMat);
    fSeam.position.set(-0.02, 0, 0);
    front.add(fPanel);
    front.add(fGlass);
    front.add(fSeam);
    car.add(front);

    const rear = new THREE.Group();
    rear.position.set(-0.28, 0.52, z);
    const rPanel = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.5, 0.05), paint);
    rPanel.position.set(-0.43, 0, 0);
    const rGlass = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.2, 0.06), tint);
    rGlass.position.set(-0.38, 0.22, 0);
    const rSeam = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.46, 0.07), seamMat);
    rSeam.position.set(-0.02, 0, 0);
    rear.add(rPanel);
    rear.add(rGlass);
    rear.add(rSeam);
    car.add(rear);

    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.62, 0.08), seamMat);
    pillar.position.set(0.08, 0.7, z);
    car.add(pillar);
    const cPillar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.07), seamMat);
    cPillar.position.set(-0.72, 0.58, z);
    car.add(cPillar);
    const aSeam = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.48, 0.07), seamMat);
    aSeam.position.set(0.82, 0.5, z);
    car.add(aSeam);

    const hFront = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.055), chrome);
    hFront.position.set(0.34, 0.58, z + side * 0.02);
    car.add(hFront);
    const hRear = hFront.clone();
    hRear.position.x = -0.4;
    car.add(hRear);
  }
}

function makeLuxuryCar() {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: 0x121214 });
  const chrome = new THREE.MeshBasicMaterial({ color: 0xe8eef4 });
  const tint = new THREE.MeshBasicMaterial({ color: 0x152028 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.25, 0.38, 1.32), paint);
  body.position.y = 0.4;
  body.name = "body";
  g.add(body);
  const rocker = new THREE.Mesh(new THREE.BoxGeometry(4.05, 0.1, 1.36), paint);
  rocker.position.y = 0.24;
  g.add(rocker);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.12, 1.2), paint);
  hood.position.set(1.22, 0.62, 0);
  hood.rotation.z = -0.16;
  g.add(hood);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 1.2), paint);
  deck.position.set(-1.35, 0.6, 0);
  deck.rotation.z = 0.12;
  g.add(deck);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.42, 1.16),
    new THREE.MeshLambertMaterial({ color: 0x0c0c10 }),
  );
  cabin.position.set(-0.22, 0.86, 0);
  g.add(cabin);
  const wind = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.28, 1.12), tint);
  wind.position.set(0.62, 0.8, 0);
  wind.rotation.z = -0.52;
  g.add(wind);
  const backGlass = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.26, 1.12), tint);
  backGlass.position.set(-0.92, 0.78, 0);
  backGlass.rotation.z = 0.42;
  g.add(backGlass);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 1.1), tint);
  glass.position.set(-0.16, 0.86, 0);
  g.add(glass);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.04, 1.2), chrome);
  belt.position.set(-0.16, 0.64, 0);
  g.add(belt);
  const doorLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.36, 1.34),
    new THREE.MeshLambertMaterial({ color: 0x08080c }),
  );
  doorLine.position.set(0.38, 0.42, 0);
  g.add(doorLine);
  const doorLineB = doorLine.clone();
  doorLineB.position.x = -0.62;
  g.add(doorLineB);
  const sideGlassL = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.2, 0.04), tint);
  sideGlassL.position.set(-0.18, 0.92, 0.58);
  g.add(sideGlassL);
  const sideGlassR = sideGlassL.clone();
  sideGlassR.position.z = -0.58;
  g.add(sideGlassR);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.7), chrome);
  grille.position.set(2.14, 0.38, 0);
  g.add(grille);
  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 1.3), chrome);
  bumperF.position.set(2.16, 0.22, 0);
  g.add(bumperF);
  const bumperR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 1.3), chrome);
  bumperR.position.set(-2.16, 0.22, 0);
  g.add(bumperR);
  const ledF = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.05, 1.18),
    new THREE.MeshBasicMaterial({ color: 0xc8e8ff }),
  );
  ledF.position.set(2.14, 0.5, 0);
  ledF.name = "headBar";
  g.add(ledF);
  for (const [name, z] of [["headL", -0.42], ["headR", 0.42]]) {
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.08, 0.16),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0 }),
    );
    lamp.name = name;
    lamp.position.set(2.16, 0.46, z);
    g.add(lamp);
  }
  const headGlow = glowSprite("#fff2b0", 1.15);
  headGlow.name = "headGlow";
  headGlow.position.set(2.3, 0.48, 0);
  headGlow.visible = false;
  g.add(headGlow);
  const ledR = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.05, 1.16),
    new THREE.MeshBasicMaterial({ color: 0xe21b7a }),
  );
  ledR.position.set(-2.14, 0.48, 0);
  g.add(ledR);
  addHeadBeams(g, 2.16, 0.42, 0.46);
  for (const [x, z] of [[-1.28, 0.62], [-1.28, -0.62], [1.28, 0.62], [1.28, -0.62]]) {
    g.add(chromeRim(x, z, 0.3));
  }
  return g;
}

function makeBeaterCar() {
  const g = new THREE.Group();
  const COPPER = 0xc45a28;
  const paint = new THREE.MeshPhongMaterial({
    color: COPPER, specular: 0xe0a070, shininess: 62, emissive: 0x2a0c06, emissiveIntensity: 0.16,
  });
  const paintLo = new THREE.MeshPhongMaterial({
    color: 0x8a3818, specular: 0xa06038, shininess: 36, emissive: 0x140604, emissiveIntensity: 0.1,
  });
  const paintHi = new THREE.MeshPhongMaterial({
    color: 0xd46a38, specular: 0xffc8a0, shininess: 78, emissive: 0x3a1208, emissiveIntensity: 0.12,
  });
  const tint = new THREE.MeshPhongMaterial({
    color: 0x152028, specular: 0xc8e8ff, shininess: 110, transparent: true, opacity: 0.58,
  });
  const chrome = new THREE.MeshPhongMaterial({ color: 0xd0d6de, specular: 0xffffff, shininess: 130 });
  const blackTrim = new THREE.MeshPhongMaterial({ color: 0x16141a, specular: 0x4a4850, shininess: 28 });
  const glassShine = new THREE.MeshBasicMaterial({ color: 0xd8eefc, transparent: true, opacity: 0.22 });

  const rocker = new THREE.Mesh(new THREE.BoxGeometry(4.05, 0.16, 1.48), paintLo);
  rocker.position.y = 0.26;
  g.add(rocker);
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.95, 0.4, 1.42), paint);
  body.position.y = 0.52;
  body.name = "body";
  body.userData.paintHex = COPPER;
  g.add(body);
  const crease = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.03, 1.46), paintHi);
  crease.position.set(0.05, 0.46, 0);
  g.add(crease);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.1, 1.28), paintHi);
  hood.position.set(1.22, 0.74, 0);
  hood.rotation.z = -0.14;
  g.add(hood);
  const hoodBulge = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.04, 0.52), paint);
  hoodBulge.position.set(1.18, 0.8, 0);
  hoodBulge.rotation.z = -0.12;
  g.add(hoodBulge);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.1, 1.28), paint);
  deck.position.set(-1.42, 0.72, 0);
  deck.rotation.z = 0.1;
  g.add(deck);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.36, 1.28), blackTrim);
  cabin.position.set(-0.18, 0.94, 0);
  g.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.07, 1.16), paintLo);
  roof.position.set(-0.22, 1.16, 0);
  g.add(roof);
  const wind = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.34, 1.24), tint);
  wind.position.set(0.72, 0.96, 0);
  wind.rotation.z = -0.5;
  g.add(wind);
  const windHi = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 1.1), glassShine);
  windHi.position.set(0.66, 1.08, 0);
  windHi.rotation.z = -0.5;
  g.add(windHi);
  const backGlass = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 1.24), tint);
  backGlass.position.set(-1.08, 0.94, 0);
  backGlass.rotation.z = 0.4;
  g.add(backGlass);
  const sideGlassL = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.24, 0.04), tint);
  sideGlassL.position.set(-0.14, 0.98, 0.66);
  g.add(sideGlassL);
  const sideGlassR = sideGlassL.clone();
  sideGlassR.position.z = -0.66;
  g.add(sideGlassR);
  const sideShineL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.03), glassShine);
  sideShineL.position.set(-0.05, 1.06, 0.68);
  g.add(sideShineL);
  const sideShineR = sideShineL.clone();
  sideShineR.position.z = -0.68;
  g.add(sideShineR);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.03, 1.46), chrome);
  belt.position.set(-0.12, 0.74, 0);
  g.add(belt);
  const seamThru = new THREE.MeshLambertMaterial({ color: 0x1a0c08 });
  for (const sx of [0.82, 0.08, -0.6, -1.08]) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 1.46), seamThru);
    seam.position.set(sx, 0.5, 0);
    g.add(seam);
  }
  for (const z of [0.74, -0.74]) {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.18), paint);
    mirror.position.set(0.62, 0.88, z);
    g.add(mirror);
    const mGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.12), chrome);
    mGlass.position.set(0.7, 0.88, z);
    g.add(mGlass);
  }
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.78), blackTrim);
  grille.position.set(2.12, 0.46, 0);
  g.add(grille);
  for (let i = 0; i < 4; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.018, 0.7), chrome);
    bar.position.set(2.16, 0.38 + i * 0.05, 0);
    g.add(bar);
  }
  const badge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.04, 12),
    chrome,
  );
  badge.rotation.z = Math.PI / 2;
  badge.position.set(2.18, 0.52, 0);
  g.add(badge);
  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 1.42), chrome);
  bumperF.position.set(2.12, 0.22, 0);
  g.add(bumperF);
  const lowerIntake = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.7), blackTrim);
  lowerIntake.position.set(2.14, 0.16, 0);
  g.add(lowerIntake);
  const bumperR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 1.42), chrome);
  bumperR.position.set(-2.12, 0.22, 0);
  g.add(bumperR);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.32), new THREE.MeshBasicMaterial({ color: 0xf4f0e8 }));
  plate.position.set(-2.2, 0.38, 0);
  g.add(plate);
  const ledF = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.04, 0.95),
    new THREE.MeshBasicMaterial({ color: 0xc8e8ff }),
  );
  ledF.position.set(2.08, 0.62, 0);
  ledF.name = "headBar";
  g.add(ledF);
  const lampMat = new THREE.MeshPhongMaterial({
    color: 0xfff6d0, specular: 0xffffff, shininess: 140, emissive: 0xffe8a0, emissiveIntensity: 0.55,
  });
  for (const [name, z] of [["headL", -0.46], ["headR", 0.46]]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.28), lampMat);
    lamp.name = name;
    lamp.position.set(2.06, 0.54, z);
    g.add(lamp);
    const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.14), lampMat);
    wrap.position.set(1.94, 0.52, z + Math.sign(z) * 0.16);
    wrap.rotation.y = Math.sign(z) * 0.35;
    g.add(wrap);
    const amber = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.06, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xffb040 }),
    );
    amber.position.set(1.88, 0.5, z + Math.sign(z) * 0.22);
    g.add(amber);
  }
  const headGlow = glowSprite("#fff2b0", 1.05);
  headGlow.name = "headGlow";
  headGlow.position.set(2.22, 0.54, 0);
  headGlow.visible = false;
  g.add(headGlow);
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xe01428 });
  const tailInner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 1.05), tailMat);
  tailInner.position.set(-2.1, 0.54, 0);
  g.add(tailInner);
  for (const z of [-0.58, 0.58]) {
    const wrapT = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.22), tailMat);
    wrapT.position.set(-2.02, 0.54, z);
    g.add(wrapT);
  }
  const tailChrome = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 1.12), chrome);
  tailChrome.position.set(-2.12, 0.54, 0);
  g.add(tailChrome);
  addCarDoors(g, paint, tint, 0.72);
  addHeadBeams(g, 2.08, 0.46, 0.54);
  for (const [x, z] of [[-1.22, 0.68], [-1.22, -0.68], [1.22, 0.68], [1.22, -0.68]]) {
    g.add(chromeRim(x, z, 0.3, true));
  }
  return g;
}

function makeStreetCar(kind) {
  const mesh = kind === "luxury" ? makeLuxuryCar() : makeBeaterCar();
  mesh.userData.kind = kind === "luxury" ? "luxury" : "beater";
  return mesh;
}

function makeTrafficLight() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, 3.2, 6),
    new THREE.MeshLambertMaterial({ color: 0x2a2430 }),
  );
  pole.position.y = 1.6;
  g.add(pole);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.72, 0.18),
    new THREE.MeshLambertMaterial({ color: 0x141018 }),
  );
  head.position.set(0, 3.05, 0.12);
  g.add(head);
  const mk = (name, y, hex) => {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(0.08, 24),
      new THREE.MeshBasicMaterial({ color: hex, depthWrite: false }),
    );
    m.name = name;
    m.position.set(0, y, 0.22);
    m.material.side = THREE.DoubleSide;
    g.add(m);
    return m;
  };
  mk("bulbRed", 3.26, 0x3a1018);
  mk("bulbYellow", 3.05, 0x3a3010);
  mk("bulbGreen", 2.84, 0x103a18);
  const glow = glowSprite("#ff2a3a", 1.55);
  glow.name = "lightHalo";
  glow.position.set(0, 3.26, 0.32);
  g.add(glow);
  return g;
}

function makeCopCar() {
  const g = new THREE.Group();
  const white = new THREE.MeshLambertMaterial({ color: 0xe8eef4 });
  const black = new THREE.MeshLambertMaterial({ color: 0x141820 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.48, 1.12), white);
  body.position.y = 0.42;
  body.name = "body";
  g.add(body);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.16, 1.08), black);
  hood.position.set(0.95, 0.66, 0);
  g.add(hood);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.32, 1.14), black);
  door.position.set(-0.05, 0.46, 0);
  g.add(door);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 0.42, 1.02),
    new THREE.MeshLambertMaterial({ color: 0x1a2430 }),
  );
  cabin.position.set(-0.2, 0.86, 0);
  g.add(cabin);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 0.26, 0.96),
    new THREE.MeshBasicMaterial({ color: 0x152030 }),
  );
  glass.position.set(-0.18, 0.94, 0);
  g.add(glass);
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.14, 0.82),
    new THREE.MeshLambertMaterial({ color: 0x111018 }),
  );
  bar.position.set(-0.15, 1.16, 0);
  g.add(bar);
  const red = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.12, 0.34),
    new THREE.MeshBasicMaterial({ color: 0xe21b7a }),
  );
  red.position.set(-0.28, 1.22, 0.16);
  red.name = "copRed";
  g.add(red);
  const blue = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.12, 0.34),
    new THREE.MeshBasicMaterial({ color: 0x3de0ff }),
  );
  blue.position.set(-0.02, 1.22, -0.16);
  blue.name = "copBlue";
  g.add(blue);
  const chrome = new THREE.MeshBasicMaterial({ color: 0xc8d0dc });
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 1.14), chrome);
  bumper.position.set(1.56, 0.3, 0);
  g.add(bumper);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xf4f0e8 });
  let hi = 0;
  for (const z of [-0.36, 0.36]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.18), lightMat);
    lamp.position.set(1.52, 0.44, z);
    lamp.name = hi === 0 ? "headL" : "headR";
    g.add(lamp);
    hi += 1;
  }
  const headGlow = glowSprite("#fff2b0", 1.05);
  headGlow.name = "headGlow";
  headGlow.position.set(1.7, 0.46, 0);
  headGlow.visible = false;
  g.add(headGlow);
  for (const [x, z] of [[-0.95, 0.52], [-0.95, -0.52], [0.95, 0.52], [0.95, -0.52]]) {
    g.add(chromeRim(x, z, 0.2));
  }
  return g;
}

function makePin() {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.7, 4),
    new THREE.MeshBasicMaterial({ color: 0xf0c430 }),
  );
  cone.position.y = 2.55;
  cone.rotation.z = Math.PI;
  g.add(cone);
  const glow = glowSprite("#f0c430", 1.6);
  glow.position.y = 2.35;
  g.add(glow);
  return g;
}

function makeDumpsterMesh() {
  const g = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.9, 0.8),
    new THREE.MeshLambertMaterial({ color: 0x1e6a38 }),
  );
  box.position.y = 0.45;
  g.add(box);
  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.08, 0.88),
    new THREE.MeshLambertMaterial({ color: 0x145028 }),
  );
  lid.position.y = 0.94;
  g.add(lid);
  return g;
}

function makeKiosk() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.55, 2.35, 1.15),
    new THREE.MeshLambertMaterial({ color: 0x1a1428 }),
  );
  body.position.y = 1.18;
  g.add(body);
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(2.85, 0.1, 1.15),
    new THREE.MeshLambertMaterial({ color: 0x3de0ff }),
  );
  awning.position.set(0, 2.42, 0.42);
  g.add(awning);
  const awningDrop = new THREE.Mesh(
    new THREE.BoxGeometry(2.85, 0.28, 0.08),
    new THREE.MeshLambertMaterial({ color: 0x2a2038 }),
  );
  awningDrop.position.set(0, 2.28, 0.95);
  g.add(awningDrop);
  const window = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.72),
    new THREE.MeshBasicMaterial({ color: 0x3de0ff }),
  );
  window.position.set(-0.45, 1.15, 0.6);
  g.add(window);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 1.35, 0.06),
    new THREE.MeshBasicMaterial({ color: 0x141018 }),
  );
  door.position.set(0.7, 0.68, 0.6);
  g.add(door);
  const doorPane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.7),
    new THREE.MeshBasicMaterial({ color: 0x7ad8ff }),
  );
  doorPane.position.set(0.7, 0.85, 0.64);
  g.add(doorPane);
  return g;
}

function makeLamp() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.07, 3.2, 6),
    new THREE.MeshLambertMaterial({ color: 0x1a1820 }),
  );
  pole.position.y = 1.6;
  g.add(pole);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.12, 0.18),
    lampHeadMat,
  );
  head.name = "lampHead";
  head.position.set(0.12, 3.15, 0);
  g.add(head);
  const glow = new THREE.Sprite(lampGlowMat);
  glow.name = "lampGlow";
  glow.scale.set(1.8, 1.8, 1);
  glow.position.set(0.12, 3.15, 0.1);
  g.add(glow);
  return g;
}

function skylineTex() {
  const tex = canvasTex(960, 220, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#f4f0e8";
    for (let i = 0; i < 28; i++) {
      const x = (i * 97 + 21) % w;
      const y = 8 + ((i * 37) % 70);
      const s = i % 9 === 0 ? 2 : 1;
      g.fillRect(x, y, s, s);
    }
    g.fillStyle = "#c8d8ff";
    for (let i = 0; i < 10; i++) {
      g.fillRect((i * 83 + 40) % w, 12 + (i % 5) * 14, 1, 1);
    }

    function hill(pts, fill) {
      g.fillStyle = fill;
      g.beginPath();
      g.moveTo(0, h);
      g.lineTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
      g.lineTo(w, h);
      g.closePath();
      g.fill();
    }
    hill([0, 96, 80, 62, 170, 88, 260, 48, 360, 74, 470, 40, 560, 70, 660, 36, 760, 64, 860, 44, 960, 78], "#4a3060");
    hill([0, 128, 110, 102, 210, 118, 320, 88, 430, 110, 540, 82, 650, 108, 760, 90, 870, 116, 960, 124], "#5a3c6c");
    g.fillStyle = "#3a2848";
    g.fillRect(0, 168, w, 52);

    const sils = [
      { x: 40, bw: 38, bh: 58 }, { x: 88, bw: 26, bh: 42 }, { x: 130, bw: 48, bh: 72 },
      { x: 190, bw: 22, bh: 36 }, { x: 230, bw: 40, bh: 64 }, { x: 286, bw: 28, bh: 48 },
      { x: 330, bw: 52, bh: 80 }, { x: 400, bw: 24, bh: 40 }, { x: 442, bw: 36, bh: 56 },
      { x: 494, bw: 44, bh: 68 }, { x: 552, bw: 22, bh: 34 }, { x: 590, bw: 38, bh: 60 },
      { x: 644, bw: 50, bh: 76 }, { x: 710, bw: 26, bh: 44 }, { x: 752, bw: 34, bh: 52 },
      { x: 802, bw: 46, bh: 70 }, { x: 864, bw: 28, bh: 40 }, { x: 906, bw: 36, bh: 58 },
    ];
    for (let i = 0; i < sils.length; i++) {
      const b = sils[i];
      const base = 168;
      g.fillStyle = i % 3 === 0 ? "#1c1428" : i % 3 === 1 ? "#181022" : "#221830";
      g.fillRect(b.x, base - b.bh, b.bw, b.bh);
      g.fillStyle = "#f0c430";
      const cols = Math.max(2, Math.floor(b.bw / 8));
      const rows = Math.max(2, Math.floor(b.bh / 10));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (((i * 11 + r * 5 + c * 3) % 7) === 0) continue;
          g.fillRect(b.x + 3 + c * 8, base - b.bh + 4 + r * 10, 3, 4);
        }
      }
    }

    function palmSil(x, s) {
      g.fillStyle = "#100c18";
      const tx = Math.round(x);
      const top = 118 - 18 * s;
      g.fillRect(tx, top + 10 * s, 2, 36 * s);
      g.fillRect(tx - 10 * s, top + 4 * s, 10 * s, 2);
      g.fillRect(tx + 2, top + 4 * s, 10 * s, 2);
    }
    for (let i = 0; i < 10; i++) {
      palmSil(30 + i * 92 + ((i * 13) % 17), 0.7 + (i % 3) * 0.12);
    }
  });
  tex.flipY = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function makeCribRoom() {
  const g = new THREE.Group();
  g.name = "cribRoom";
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10.4, 7.2),
    new THREE.MeshLambertMaterial({ color: 0x6a4a38 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 1.4);
  g.add(floor);
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 2.6),
    new THREE.MeshLambertMaterial({ color: 0x4a2030 }),
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.4, 0.02, 1.5);
  g.add(rug);
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(10.4, 4.2, 0.18),
    new THREE.MeshLambertMaterial({ color: 0x2a2438 }),
  );
  back.position.set(0, 2.1, -2.05);
  g.add(back);
  const left = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 4.2, 7.2),
    new THREE.MeshLambertMaterial({ color: 0x241e32 }),
  );
  left.position.set(-5.1, 2.1, 1.4);
  g.add(left);
  const right = left.clone();
  right.position.x = 5.1;
  g.add(right);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 2.15, 1.05),
    new THREE.MeshBasicMaterial({ color: 0x3de0ff }),
  );
  door.position.set(-4.95, 1.1, 1.55);
  g.add(door);
  const doorPane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 1.35),
    new THREE.MeshBasicMaterial({ color: 0x7ad8ff, side: THREE.DoubleSide }),
  );
  doorPane.position.set(-4.88, 1.25, 1.55);
  doorPane.rotation.y = Math.PI / 2;
  g.add(doorPane);
  const ward = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 2.45, 0.7),
    new THREE.MeshLambertMaterial({ color: 0x3a2a18 }),
  );
  ward.position.set(3.55, 1.22, 0.15);
  g.add(ward);
  const wardDoor = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 2.15, 0.06),
    new THREE.MeshLambertMaterial({ color: 0x2a1e10 }),
  );
  wardDoor.position.set(3.22, 1.2, 0.5);
  g.add(wardDoor);
  const wardDoor2 = wardDoor.clone();
  wardDoor2.position.x = 3.88;
  g.add(wardDoor2);
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 8),
    new THREE.MeshPhongMaterial({ color: 0xf0c430, shininess: 80 }),
  );
  knob.position.set(3.48, 1.15, 0.55);
  g.add(knob);
  const mirror = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 1.55),
    new THREE.MeshPhongMaterial({ color: 0xa8d8f0, shininess: 90, specular: 0xffffff }),
  );
  mirror.position.set(2.35, 1.55, -1.92);
  g.add(mirror);
  const mirrorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(1.12, 1.72, 0.08),
    new THREE.MeshLambertMaterial({ color: 0x1a1420 }),
  );
  mirrorFrame.position.set(2.35, 1.55, -1.96);
  g.add(mirrorFrame);
  const bed = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.42, 1.55),
    new THREE.MeshLambertMaterial({ color: 0x1a2438 }),
  );
  bed.position.set(-1.4, 0.28, -0.85);
  g.add(bed);
  const pillow = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.16, 0.5),
    new THREE.MeshLambertMaterial({ color: 0xf4f0e8 }),
  );
  pillow.position.set(-2.15, 0.55, -0.85);
  g.add(pillow);
  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.55, 0.18),
    new THREE.MeshBasicMaterial({ color: 0xf0c430 }),
  );
  lamp.position.set(-3.2, 0.9, -1.55);
  g.add(lamp);
  const win = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 1.1),
    new THREE.MeshBasicMaterial({ color: 0x1a1028 }),
  );
  win.position.set(-0.2, 2.35, -1.94);
  g.add(win);
  const winGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.9),
    new THREE.MeshBasicMaterial({ color: 0x3a2048 }),
  );
  winGlow.position.set(-0.2, 2.35, -1.93);
  g.add(winGlow);
  const lampShade = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.28, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd89a }),
  );
  lampShade.position.set(-3.2, 1.28, -1.55);
  g.add(lampShade);
  const lampGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 1.4),
    new THREE.MeshBasicMaterial({ color: 0xffe2b8, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }),
  );
  lampGlow.position.set(-3.2, 1.15, -1.2);
  g.add(lampGlow);
  const ceilGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 0.08),
    new THREE.MeshBasicMaterial({ color: 0xffe8c4 }),
  );
  ceilGlow.position.set(0.2, 3.95, 1.2);
  g.add(ceilGlow);
  const cribAmb = new THREE.AmbientLight(0xffe6c4, 1.15);
  g.add(cribAmb);
  const cribHemi = new THREE.HemisphereLight(0xffe8d0, 0x4a3020, 0.85);
  g.add(cribHemi);
  const cribLight = new THREE.PointLight(0xffe2b8, 2.6, 16, 1.4);
  cribLight.position.set(0.2, 2.8, 1.6);
  g.add(cribLight);
  const bedLamp = new THREE.PointLight(0xffcc88, 2.2, 8, 1.3);
  bedLamp.position.set(-3.2, 1.55, -1.1);
  g.add(bedLamp);
  const wardLamp = new THREE.PointLight(0xffd4a0, 1.6, 7, 1.6);
  wardLamp.position.set(3.4, 2.15, 0.9);
  g.add(wardLamp);
  return g;
}

export function createWorld(canvas, sprites) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
    stencil: false,
    depth: true,
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(COLORS.bg, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0814, 0.016);
  scene.background = new THREE.Color(0x0a0716);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 180);
  camera.position.set(0, 4.6, 11.5);

  const amb = new THREE.AmbientLight(0x2a1838, 0.55);
  scene.add(amb);
  const hemi = new THREE.HemisphereLight(0x446688, 0x1a1018, 0.55);
  scene.add(hemi);
  const moonLight = new THREE.DirectionalLight(0xc8d8ff, 0.35);
  moonLight.position.set(-8, 18, 8);
  scene.add(moonLight);
  const sunLight = new THREE.DirectionalLight(0xfff2d0, 0);
  sunLight.position.set(12, 20, 8);
  scene.add(sunLight);
  const neonFill = new THREE.DirectionalLight(0xe21b7a, 0.25);
  neonFill.position.set(6, 4, 10);
  scene.add(neonFill);

  const stars = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#070614";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 80; i++) {
      g.fillStyle = i % 7 === 0 ? "#3de0ff" : "#f4f0e8";
      g.fillRect((i * 47) % w, (i * 89) % h, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
    }
  });
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 80),
    new THREE.MeshBasicMaterial({ map: stars, transparent: true, depthWrite: false }),
  );
  sky.position.set(0, 22, -70);
  scene.add(sky);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xf4f0e8, transparent: true, fog: false }),
  );
  moon.position.set(-10, 14, -30);
  scene.add(moon);
  const moonGlow = glowSprite("#f4e8c0", 6);
  moonGlow.position.copy(moon.position);
  scene.add(moonGlow);
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(1.45, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffe46a, fog: false }),
  );
  sun.position.set(10, 16, -28);
  sun.visible = false;
  scene.add(sun);
  const sunGlow = glowSprite("#ffd24a", 7.5);
  sunGlow.position.copy(sun.position);
  sunGlow.visible = false;
  scene.add(sunGlow);

  const skylineMat = new THREE.SpriteMaterial({
    map: skylineTex(),
    transparent: true,
    depthWrite: false,
    fog: false,
    depthTest: false,
  });
  const skyline = new THREE.Sprite(skylineMat);
  skyline.center.set(0.5, 0);
  skyline.scale.set(148, 18, 1);
  skyline.position.set(0, 1.35, -22);
  skyline.renderOrder = -8;
  skyline.visible = true;
  scene.add(skyline);

  function litTower(w, h, d, color, win = 0xf0c430) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ color, fog: false }),
    );
    body.position.y = h / 2;
    g.add(body);
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.82, h * 0.78),
      winMatFar,
    );
    glass.position.set(0, h * 0.52, d / 2 + 0.03);
    g.add(glass);
    g.userData.win = win;
    return g;
  }
  const dtla = new THREE.Group();
  dtla.visible = false;
  scene.add(dtla);
  const hazeTex = canvasTex(64, 32, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "rgba(180,140,220,0)");
    grd.addColorStop(0.6, "rgba(90,60,130,0.16)");
    grd.addColorStop(1, "rgba(50,32,80,0.28)");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
  hazeTex.wrapS = THREE.ClampToEdgeWrapping;
  hazeTex.wrapT = THREE.ClampToEdgeWrapping;
  const hazeBand = new THREE.Mesh(
    new THREE.PlaneGeometry(230, 7),
    new THREE.MeshBasicMaterial({ map: hazeTex, transparent: true, depthWrite: false, fog: true, depthTest: true }),
  );
  hazeBand.position.set(0, 6.4, -28);
  hazeBand.renderOrder = -6;
  hazeBand.visible = false;
  scene.add(hazeBand);
  const farPalms = [];
  for (let i = 0; i < 14; i++) {
    const palm = makePalm();
    palm.visible = false;
    palm.scale.setScalar(1.35 + (i % 3) * 0.22);
    scene.add(palm);
    farPalms.push({ mesh: palm, dx: (i - 6.5) * 10.2 + (i % 2) * 2.4, z: -9.2 - (i % 3) * 0.45 });
  }

  const city = new THREE.Group();
  const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(STREET_LEN + 4, 12.4),
    new THREE.MeshLambertMaterial({ map: asphaltTex() }),
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.set(STREET_LEN / 2, 0, 9.3);
  asphalt.material.map.repeat.set(48, 2);
  city.add(asphalt);

  const walk = new THREE.Mesh(
    new THREE.PlaneGeometry(STREET_LEN + 4, 3.4),
    new THREE.MeshLambertMaterial({ map: sidewalkTex() }),
  );
  walk.rotation.x = -Math.PI / 2;
  walk.position.set(STREET_LEN / 2, 0.03, 1.2);
  walk.material.map.repeat.set(160, 1);
  city.add(walk);

  const lots = new THREE.Mesh(
    new THREE.PlaneGeometry(STREET_LEN + 4, 16.5),
    new THREE.MeshLambertMaterial({ color: 0x1a1420 }),
  );
  lots.rotation.x = -Math.PI / 2;
  lots.position.set(STREET_LEN / 2, 0.01, -6.4);
  city.add(lots);
  const alley = new THREE.Mesh(
    new THREE.PlaneGeometry(STREET_LEN + 4, 2.4),
    new THREE.MeshLambertMaterial({ color: 0x161018 }),
  );
  alley.rotation.x = -Math.PI / 2;
  alley.position.set(STREET_LEN / 2, 0.02, -1.15);
  city.add(alley);

  const curb = new THREE.Mesh(
    new THREE.BoxGeometry(STREET_LEN + 4, 0.16, 0.28),
    new THREE.MeshLambertMaterial({ color: 0xc8c4b8 }),
  );
  curb.position.set(STREET_LEN / 2, 0.08, 2.95);
  city.add(curb);
  const curbShadow = new THREE.Mesh(
    new THREE.BoxGeometry(STREET_LEN + 4, 0.04, 0.18),
    new THREE.MeshBasicMaterial({ color: 0x2a2430 }),
  );
  curbShadow.position.set(STREET_LEN / 2, 0.02, 3.18);
  city.add(curbShadow);

  const dashTex = canvasTex(48, 8, (g) => {
    g.clearRect(0, 0, 48, 8);
    g.fillStyle = "#f0c430";
    g.fillRect(0, 1, 26, 6);
  });
  dashTex.wrapS = THREE.RepeatWrapping;
  const blockCountEarly = Math.round(STREET_LEN / BLOCK_LEN);
  for (let i = 0; i < blockCountEarly; i++) {
    const x0 = i * BLOCK_LEN + INTER_METERS / 2 + 0.35;
    const x1 = (i + 1) * BLOCK_LEN - INTER_METERS / 2 - 0.35;
    const len = x1 - x0;
    if (len < 1) continue;
    const tex = dashTex.clone();
    tex.repeat.set(Math.max(1, len / 5.8), 1);
    tex.wrapS = THREE.RepeatWrapping;
    const seg = new THREE.Mesh(
      new THREE.PlaneGeometry(len, 0.22),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
    );
    seg.rotation.x = -Math.PI / 2;
    seg.position.set((x0 + x1) / 2, 0.04, 7.55);
    city.add(seg);
  }

  const brickCache = new Map();
  function brick(col) {
    if (!brickCache.has(col)) brickCache.set(col, brickTex(col, "#1a1420"));
    return brickCache.get(col);
  }

  const THEMES = [
    { id: "liquor", neon: ["LIQUOR", "#e21b7a"], cols: ["#6a4a58", "#4a3a48", "#3a2e40"] },
    { id: "motel", neon: ["MOTEL", "#3de0ff"], cols: ["#4a3a60", "#3a4a58", "#5a3040"] },
    { id: "studio", neon: ["STUDIO", "#f0c430"], cols: ["#8a7a58", "#3a2838", "#4a3a50"], graf: true },
    { id: "taco", neon: ["TACOS", "#f0c430"], cols: ["#6a3a28", "#4a2a20", "#3a4a38"] },
    { id: "gas", neon: ["GAS", "#e21b7a"], cols: ["#2a3848", "#3a2e40", "#4a3a48"] },
    { id: "park", neon: ["PARK", "#3de0ff"], cols: ["#2a4a38", "#3a3a30", "#2a3840"], park: true },
  ];
  const facadeLayout = [
    { x: 4, w: 4.2, h: 5.2, d: 2.4 },
    { x: 9, w: 3.6, h: 4.4, d: 2.2 },
    { x: 13.2, w: 4.6, h: 6.4, d: 2.6 },
    { x: 18.4, w: 5.4, h: 3.6, d: 2.0 },
    { x: 24.2, w: 3.8, h: 5.8, d: 2.3 },
    { x: 28.6, w: 4.0, h: 4.8, d: 2.2 },
    { x: 33.4, w: 4.4, h: 6.0, d: 2.5 },
    { x: 38.6, w: 3.6, h: 4.2, d: 2.1 },
    { x: 43.2, w: 4.8, h: 5.4, d: 2.4 },
    { x: 48.4, w: 3.4, h: 4.6, d: 2.2 },
  ];

  function addNeon(text, color, x, y, z, lit = false) {
    const tex = neonTex(text, color);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 0.9),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
    );
    sign.position.set(x, y, z);
    city.add(sign);
    const glow = glowSprite(color, 3.4);
    glow.position.set(x, y, z + 0.05);
    city.add(glow);
    if (lit) {
      const hex = color === "#3de0ff" ? 0x3de0ff : color === "#f0c430" ? 0xf0c430 : 0xe21b7a;
      const light = new THREE.PointLight(hex, 2.2, 9, 2);
      light.position.set(x, y, z + 0.6);
      city.add(light);
    }
  }

  const boxGeo = new Map();
  function propBox(w, h, d, color, x, y, z) {
    const key = `${w}|${h}|${d}`;
    if (!boxGeo.has(key)) boxGeo.set(key, new THREE.BoxGeometry(w, h, d));
    const mesh = new THREE.Mesh(boxGeo.get(key), new THREE.MeshBasicMaterial({ color }));
    mesh.position.set(x, y, z);
    city.add(mesh);
    return mesh;
  }

  function stampLandmark(theme, xOff) {
    const x = xOff + 26;
    if (theme.id === "liquor") {
      propBox(5.4, 3.1, 2.0, 0x4a2030, x, 1.55, -1.55);
      propBox(5.8, 0.14, 2.5, 0xe21b7a, x, 3.2, -1.4);
      for (let i = 0; i < 4; i++) {
        const pane = new THREE.Mesh(
          new THREE.PlaneGeometry(0.72, 1.35),
          new THREE.MeshBasicMaterial({ color: i % 2 ? 0x3de0ff : 0xf0c430 }),
        );
        pane.position.set(x - 1.7 + i * 1.12, 1.55, -0.52);
        city.add(pane);
      }
    } else if (theme.id === "motel") {
      propBox(16.5, 2.5, 2.3, 0x3a3048, x + 1, 1.25, -1.85);
      propBox(16.9, 0.18, 2.7, 0x2a2438, x + 1, 2.6, -1.85);
      for (let i = 0; i < 7; i++) {
        propBox(0.72, 1.45, 0.08, 0x1a1424, x - 6.2 + i * 2.15, 0.95, -0.68);
        propBox(0.22, 0.22, 0.06, 0xf0c430, x - 5.95 + i * 2.15, 1.15, -0.64);
      }
      addNeon("VACANCY", "#3de0ff", x + 5.2, 4.15, -1.45, false);
    } else if (theme.id === "studio") {
      propBox(6.4, 2.8, 2.2, 0x8a7a58, x - 1.2, 1.4, -1.75);
      propBox(1.8, 2.1, 0.2, 0x1a1420, x - 1.2, 1.15, -0.48);
    } else if (theme.id === "taco") {
      propBox(3.6, 1.85, 1.7, 0x6a3a20, x, 0.92, -1.05);
      propBox(4.1, 0.1, 2.15, 0xf0c430, x, 1.92, -0.95);
      propBox(4.1, 0.1, 2.15, 0xe21b7a, x, 2.08, -0.95);
      propBox(1.7, 0.08, 0.85, 0x4a3020, x + 3.4, 0.52, 0.35);
      propBox(0.12, 0.5, 0.85, 0x4a3020, x + 2.7, 0.25, 0.35);
      propBox(0.12, 0.5, 0.85, 0x4a3020, x + 4.1, 0.25, 0.35);
    } else if (theme.id === "gas") {
      propBox(9.2, 0.16, 4.4, 0xe21b7a, x, 3.15, 0.15);
      propBox(0.22, 3.15, 0.22, 0x2a2430, x - 4.2, 1.57, 2.0);
      propBox(0.22, 3.15, 0.22, 0x2a2430, x + 4.2, 1.57, 2.0);
      propBox(0.75, 1.25, 0.55, 0x2a3848, x - 1.3, 0.62, 0.7);
      propBox(0.75, 1.25, 0.55, 0x2a3848, x + 1.3, 0.62, 0.7);
      propBox(0.2, 0.35, 0.2, 0xf0c430, x - 1.3, 1.38, 0.7);
      propBox(0.2, 0.35, 0.2, 0xf0c430, x + 1.3, 1.38, 0.7);
    } else if (theme.id === "park") {
      const grass = new THREE.Mesh(
        new THREE.BoxGeometry(20, 0.08, 7.2),
        new THREE.MeshLambertMaterial({ color: 0x1a4a2a }),
      );
      grass.position.set(x, 0.04, -1.1);
      city.add(grass);
      propBox(1.9, 0.08, 0.55, 0x3a2a18, x + 2.2, 0.46, 0.5);
      propBox(0.12, 0.42, 0.55, 0x3a2a18, x + 1.4, 0.21, 0.5);
      propBox(0.12, 0.42, 0.55, 0x3a2a18, x + 3.0, 0.21, 0.5);
    }
  }

  function stampTheme(theme, xOff, lit) {
    const layout = facadeLayout;
    for (let i = 0; i < layout.length; i++) {
      const b = layout[i];
      const col = theme.cols[i % theme.cols.length];
      const h = theme.park ? Math.min(b.h, 3.4) : theme.id === "motel" ? Math.min(b.h, 3.6) : b.h;
      const mesh = makeBuilding(b.w, h, b.d, brick(col));
      mesh.position.set(b.x + xOff, 0, -3.4);
      city.add(mesh);
    }
    stampLandmark(theme, xOff);
    addNeon(theme.neon[0], theme.neon[1], 24.4 + xOff, theme.park ? 3.8 : 5.05, -2.15, lit);
    if (theme.graf) {
      const grafWall = new THREE.Mesh(
        new THREE.BoxGeometry(7.2, 3.2, 0.45),
        new THREE.MeshLambertMaterial({ color: 0x6a6258 }),
      );
      grafWall.position.set(26 + xOff, 1.6, -1.35);
      city.add(grafWall);
      const graffiti = new THREE.Mesh(
        new THREE.PlaneGeometry(6.8, 3.0),
        new THREE.MeshBasicMaterial({ map: graffitiTex() }),
      );
      graffiti.position.set(26 + xOff, 1.7, -1.1);
      city.add(graffiti);
    }
    const palms = [[6.5, -2.2], [17.8, -2.15], [29.4, -2.25], [40.8, -2.2]];
    for (const [x, z] of palms) {
      const palm = makePalm();
      palm.position.set(x + xOff, 0, z);
      palm.scale.setScalar(1.85 + ((x + xOff) % 3) * 0.08);
      city.add(palm);
    }
    const lamp = makeLamp();
    lamp.position.set(16 + xOff, 0, -0.2);
    city.add(lamp);
    if (lit || (Math.round(xOff / BLOCK_LEN) % 3 === 0)) {
      const pl = new THREE.PointLight(0xf0c430, 0.85, 7, 2);
      pl.position.set(16 + xOff + 0.12, 3.1, 0.4);
      pl.userData.streetLamp = true;
      city.add(pl);
    }
  }
  const blockCount = Math.round(STREET_LEN / BLOCK_LEN);
  for (let i = 0; i < blockCount; i++) {
    stampTheme(THEMES[i % THEMES.length], i * BLOCK_LEN, i === 0);
  }
  for (let i = 0; i < blockCount * 2; i++) {
    const curbPalm = makePalm();
    curbPalm.position.set((i + 0.35) * (BLOCK_LEN / 2), 0, 0.42);
    curbPalm.scale.setScalar(1.9 + (i % 3) * 0.08);
    city.add(curbPalm);
  }

  const INTER_Z = 7.45;
  const INTER_DEPTH = 8.2;
  const interMat = new THREE.MeshLambertMaterial({ color: 0x16141c });
  const stopMat = new THREE.MeshBasicMaterial({ color: 0xf4f0e8 });
  for (let i = 0; i < blockCount; i++) {
    const x = i * BLOCK_LEN;
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(INTER_METERS, 0.05, INTER_DEPTH),
      interMat,
    );
    box.position.set(x, 0.07, INTER_Z);
    city.add(box);
    const stopL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, INTER_DEPTH - 0.3), stopMat);
    stopL.position.set(x - INTER_METERS / 2, 0.1, INTER_Z);
    city.add(stopL);
    const stopR = stopL.clone();
    stopR.position.x = x + INTER_METERS / 2;
    city.add(stopR);
    const edgeFar = new THREE.Mesh(new THREE.BoxGeometry(INTER_METERS, 0.05, 0.22), stopMat);
    edgeFar.position.set(x, 0.1, INTER_Z - INTER_DEPTH / 2);
    city.add(edgeFar);
    const edgeNear = edgeFar.clone();
    edgeNear.position.z = INTER_Z + INTER_DEPTH / 2;
    city.add(edgeNear);
  }
  function makeSafeHouse() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 2.6, 2.4),
      new THREE.MeshLambertMaterial({ color: 0x3a3048 }),
    );
    body.position.y = 1.3;
    g.add(body);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.28, 2.8),
      new THREE.MeshLambertMaterial({ color: 0x1a1424 }),
    );
    roof.position.y = 2.7;
    g.add(roof);
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 1.45, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x3de0ff }),
    );
    door.position.set(0, 0.72, 1.24);
    g.add(door);
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.05, 0.85),
      new THREE.MeshBasicMaterial({ color: 0xf0c430, side: THREE.DoubleSide }),
    );
    pane.name = "homePane";
    pane.position.set(1.2, 1.55, 1.22);
    g.add(pane);
    const stoop = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.12, 0.7),
      new THREE.MeshLambertMaterial({ color: 0x2a2438 }),
    );
    stoop.position.set(0, 0.06, 1.5);
    g.add(stoop);
    return g;
  }
  const homeHouse = makeSafeHouse();
  homeHouse.position.set(gameToWorldX(HOME_X), 0, -1.05);
  city.add(homeHouse);
  addNeon("HOME", "#3de0ff", gameToWorldX(HOME_X), 4.85, 0.85, true);
  addNeon("PLUG", "#e21b7a", gameToWorldX(PLUG_X), 2.55, 0.15, true);
  const caliX = gameToWorldX(HOME_X + 340);
  const caliPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.09, 5.4, 6),
    new THREE.MeshLambertMaterial({ color: 0x2a2430 }),
  );
  caliPole.position.set(caliX, 2.7, 0.35);
  city.add(caliPole);
  addNeon("CALI", "#f0c430", caliX, 5.7, 0.55, true);

  const shop = makeKiosk();
  shop.position.set(gameToWorldX(SHOP_X), 0, 0.12);
  city.add(shop);
  addNeon("SHOP", "#3de0ff", gameToWorldX(SHOP_X), 3.55, 1.22, true);

  const dump = makeDumpsterMesh();
  dump.position.set(gameToWorldX(DUMPSTER_X), 0, -0.45);
  city.add(dump);

  function stripLights(root) {
    const kill = [];
    root.traverse((o) => { if (o.isPointLight) kill.push(o); });
    for (const light of kill) light.parent.remove(light);
  }

  const strip = new THREE.Group();
  strip.add(city);
  const left = city.clone(true);
  left.position.x = -STREET_LEN;
  stripLights(left);
  const right = city.clone(true);
  right.position.x = STREET_LEN;
  stripLights(right);
  strip.add(left);
  strip.add(right);
  scene.add(strip);
  const lampLights = [];
  city.traverse((o) => {
    if (o.isPointLight && o.userData.streetLamp) lampLights.push(o);
  });
  const homePane = homeHouse.getObjectByName("homePane");

  const dumpSprite = makeBillboard(sprites.dumpster, 1.15);
  scene.add(dumpSprite);
  const sellLabel = makeLabel("SELL", "#f0c430");
  scene.add(sellLabel);
  const fireLabel = makeLabel("FIRE", "#f0c430");
  fireLabel.visible = false;
  scene.add(fireLabel);
  const bangPool = [];

  const playerCar = makeBeaterCar();
  const carMarker = new THREE.Group();
  const markStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.35, 6),
    new THREE.MeshBasicMaterial({ color: 0x3de0ff }),
  );
  markStem.position.y = 0.22;
  carMarker.add(markStem);
  const markHead = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.38, 4),
    new THREE.MeshBasicMaterial({ color: 0x3de0ff }),
  );
  markHead.rotation.x = Math.PI;
  markHead.position.y = -0.08;
  carMarker.add(markHead);
  scene.add(carMarker);
  scene.add(playerCar);
  const lightMeshes = [];
  for (let i = 0; i < LIGHT_COUNT; i++) {
    const g = new THREE.Group();
    const half = INTER_METERS / 2;
    const zFar = 0.55;
    const zNear = 10.6;
    function cornerLight(lx, lz, scale) {
      const t = makeTrafficLight();
      t.scale.setScalar(scale);
      t.position.set(lx, 0, lz);
      g.add(t);
    }
    cornerLight(-half, zFar, 1.28);
    cornerLight(half, zFar, 1.28);
    cornerLight(-half, zNear, 0.7);
    cornerLight(half, zNear, 0.7);
    scene.add(g);
    lightMeshes.push(g);
  }
  const pedPool = [];
  const speedStreaks = [];
  for (let i = 0; i < 4; i++) {
    const streak = new THREE.Mesh(
      new THREE.BoxGeometry(1.4 + i * 0.35, 0.05, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xf4f0e8, transparent: true, opacity: 0, depthWrite: false }),
    );
    streak.visible = false;
    scene.add(streak);
    speedStreaks.push(streak);
  }
  const buyerGlow = glowSprite("#f0c430", 3.2);
  buyerGlow.visible = false;
  scene.add(buyerGlow);
  const buyerArrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 0.95, 4),
    new THREE.MeshBasicMaterial({ color: 0xf0c430 }),
  );
  buyerArrow.rotation.z = Math.PI;
  buyerArrow.visible = false;
  scene.add(buyerArrow);
  const copCarMesh = makeCopCar();
  copCarMesh.visible = false;
  scene.add(copCarMesh);
  const trafficPool = [];
  const destPin = makePin();
  destPin.visible = false;
  scene.add(destPin);
  const plugLabel = makeLabel("PLUG", "#e21b7a");
  scene.add(plugLabel);
  const stashLabel = makeLabel("STASH", "#f0c430");
  stashLabel.scale.set(1.7, 0.4, 1);
  scene.add(stashLabel);
  const youLabel = makeLabel("YOU", "#3de0ff");
  youLabel.scale.set(1.35, 0.32, 1);
  scene.add(youLabel);
  const buyerSprite = makeBillboard(sprites.buyers[0].idle[0], 2.85);
  buyerSprite.visible = false;
  scene.add(buyerSprite);
  const plugSprite = makeBillboard((sprites.plug || sprites.buyers[0]).idle[0], 2.85);
  plugSprite.visible = false;
  scene.add(plugSprite);
  const plugGlow = glowSprite("#e21b7a", 2.8);
  plugGlow.visible = false;
  scene.add(plugGlow);
  let buyerT = 0;
  let lookFace = 1;
  let camV = 0;
  let lookAim = 0;
  let lookAimV = 0;

  const playerSprite = makeBillboard(sprites.idle[0], 3.05);
  playerSprite.material.depthTest = true;
  playerSprite.material.depthWrite = false;
  playerSprite.renderOrder = 2;
  scene.add(playerSprite);
  const packHeld = makeBillboard(sprites.pack, 0.45);
  packHeld.visible = false;
  scene.add(packHeld);

  const foePool = [];
  const lootPool = [];
  const shotPool = [];
  const boomPool = [];
  const bitPool = [];
  const shadowGeo = new THREE.CircleGeometry(0.42, 12);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false, depthTest: true });
  const playerShadow = new THREE.Mesh(shadowGeo, shadowMat);
  playerShadow.rotation.x = -Math.PI / 2;
  playerShadow.position.y = 0.025;
  playerShadow.scale.set(1.25, 1, 0.55);
  scene.add(playerShadow);

  let bossSprite = null;
  const tmp = new THREE.Vector3();
  let camX = gameToWorldX(200);
  let camTilt = 0;
  let zoomMulNow = CAM_ZOOM_MED;
  const cribRoom = makeCribRoom();
  cribRoom.visible = false;
  scene.add(cribRoom);

  function makeLabel(text, color) {
    const tex = neonTex(text, color);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const s = new THREE.Sprite(mat);
    s.scale.set(2.2, 0.55, 1);
    s.center.set(0.5, 0);
    return s;
  }

  function take(pool, make, i) {
    while (pool.length <= i) pool.push(make());
    const obj = pool[i];
    obj.visible = true;
    return obj;
  }

  function hideFrom(pool, start) {
    for (let i = start; i < pool.length; i++) pool[i].visible = false;
  }

  function lerpWrap(a, b, t, len) {
    return wrap(a + wrapDelta(a, b, len) * t, len);
  }

  function renderGameX(ent, alpha) {
    if (!ent) return 0;
    if (ent.px == null) return ent.x;
    return lerpWrap(ent.px, ent.x, alpha, WORLD);
  }

  function place(obj, gameX, gameY, cam, z = 0) {
    obj.position.x = nearestWorldX(gameX, cam);
    obj.position.y = Math.max(0, gameToWorldY(gameY));
    obj.position.z = z;
  }

  function resize() {
    const parent = canvas.parentElement;
    const w = Math.max(1, parent.clientWidth);
    const h = Math.max(1, parent.clientHeight);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w > h ? 42 : 52;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement);
  window.addEventListener("orientationchange", () => setTimeout(resize, 80));
  window.visualViewport?.addEventListener("resize", resize);

  const projector = new THREE.Vector3();

  function project(gameX, gameY, cam) {
    projector.set(nearestWorldX(gameX, cam), Math.max(0.4, gameToWorldY(gameY) + 0.4), 0);
    projector.project(camera);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    return {
      x: (projector.x * 0.5 + 0.5) * w,
      y: (-projector.y * 0.5 + 0.5) * h,
      ok: projector.z < 1,
    };
  }

  function sync(state, dt, alpha = 1) {
    const p = state.player;
    const px = renderGameX(p, alpha);
    const paused = state.mode === "paused";
    const stepDt = paused ? 0 : dt;
    camTilt += ((p.vx / 140) * 0.028 - camTilt) * Math.min(1, stepDt * 10);

    const playing = state.mode === "play" || paused;
    const portrait = camera.aspect < 1;
    const boardDur = BOARD_T;
    const boardU = 1 - Math.max(0, Math.min(1, (state.boardT || 0) / boardDur));
    const carCam = state.inCar ? boardU : (1 - boardU);
    const wantZoom = Math.max(CAM_ZOOM_MIN, Math.min(CAM_ZOOM_MAX, Number(state.camZoom) || CAM_ZOOM_MED));
    const zoomFollow = Math.min(1, stepDt * 18);
    zoomMulNow += (wantZoom - zoomMulNow) * (zoomFollow || 1);
    const zoomMul = zoomMulNow;
    const inCrib = !!state.inCrib;
    strip.visible = !inCrib;
    cribRoom.visible = inCrib;
    if (scene.fog) scene.fog.density = inCrib ? 0.001 : 0.016;
    amb.intensity = inCrib ? 1.25 : 0.55;
    amb.color.setHex(inCrib ? 0xffe6c8 : 0x2a1838);
    hemi.intensity = inCrib ? 0.9 : 0.55;
    const camZ = ((portrait ? 15.8 : 14.2) + carCam * 0.7) * zoomMul;
    const camY = ((portrait ? 2.92 : 3.15) + carCam * 0.22) * (0.92 + zoomMul * 0.08);
    const wantFace = p.facing < 0 ? -1 : 1;
    if (state.inCar) lookFace = wantFace;
    else lookFace += (wantFace - lookFace) * (1 - Math.exp(-Math.max(stepDt, 0.0001) / 0.22));
    if (playing && inCrib) {
      const cx = Number(state.cribX) || 0;
      camera.position.set(cx * 0.18, camY * 0.92, camZ * 0.82);
      tmp.set(cx, 1.15, 0.55);
      camera.lookAt(tmp);
      camera.rotation.z = 0;
    } else if (playing) {
      const dampDt = Math.min(1 / 30, Math.max(0, stepDt));
      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(0.01, camera.aspect));
      const dist = Math.max(0.8, camZ - 2.15);
      const halfWorld = dist * Math.tan(hFov / 2);
      const trail = state.inCar ? (portrait ? 0.34 : 0.38) : (portrait ? 0.42 : 0.44);
      const leadWorld = Math.min(halfWorld * 0.72, (0.5 - trail) * 2 * halfWorld);
      const face = lookFace < 0 ? -1 : 1;
      const carW = nearestWorldX(px, camX);
      let targetCam = wrap(carW + face * leadWorld, STREET_LEN);
      const err = wrapDelta(camX, targetCam, STREET_LEN);
      if (Math.abs(err) > halfWorld * 2.4) {
        camX = targetCam;
        camV = 0;
      } else if (dampDt > 0) {
        const freq = state.inCar ? 1.65 : 2.6;
        const omega = 2 * Math.PI * freq;
        const accX = omega * omega * err - 2 * omega * camV;
        camV += accX * dampDt;
        camX = wrap(camX + camV * dampDt, STREET_LEN);
      }
      const lookLeadWant = state.inCar ? (portrait ? 0.85 : 1.45) : 0.35;
      if (dampDt > 0) {
        const o2 = 2 * Math.PI * 2.1;
        const lErr = lookLeadWant - lookAim;
        lookAimV += (o2 * o2 * lErr - 2 * o2 * lookAimV) * dampDt;
        lookAim += lookAimV * dampDt;
      }
      camera.position.set(camX, camY + gameToWorldY(p.y) * 0.12, camZ);
      tmp.set(camX + face * lookAim, 1.22 + gameToWorldY(p.y) * 0.18, 2.15 + carCam * 2.15);
      camera.lookAt(tmp);
      camera.rotation.z += camTilt * 0.25;
    } else {
      camX = wrap(camX + stepDt * 1.6, STREET_LEN);
      camera.position.set(camX, 4.2, 14.2);
      camera.lookAt(camX + 1.4, 1.35, 0.6);
    }

    function setCarLights(mesh, on) {
      if (!mesh) return;
      const l = mesh.getObjectByName("headL");
      const r = mesh.getObjectByName("headR");
      const glow = mesh.getObjectByName("headGlow");
      const bar = mesh.getObjectByName("headBar");
      if (l) l.visible = on;
      if (r) r.visible = on;
      if (glow) {
        glow.visible = on;
        glow.material.opacity = on ? 0.7 : 0;
      }
      if (bar) bar.material.color.setHex(on ? 0xfff6c8 : 0x6a7080);
      const beam = mesh.getObjectByName("headBeam");
      if (beam) beam.visible = on;
    }

    moon.position.set(camX - 8.4, 14.6, -28);
    moonGlow.position.copy(moon.position);
    skyline.position.set(camX - ((camX / STREET_LEN) % 1) * 18, 1.35, -22);
    skyline.visible = !inCrib;
    hazeBand.position.set(camX, 6.4, -28);
    sky.position.set(camX, 18, -36);
    dtla.position.set(camX + 0.8, 0, -36);
    for (const t of dtla.children) {
      t.position.x = t.userData.dx || 0;
      t.position.z = 0;
    }
    const swayT = performance.now() / 1000;
    function swayPalm(o, amp = 1) {
      const s = Math.sin(swayT * 1.18 + (o.userData.palmPhase || 0));
      o.rotation.z = 0;
      const base = o.getObjectByName?.("palmBase");
      const lower = o.getObjectByName?.("palmLower");
      const mid = o.getObjectByName?.("palmMid");
      const tip = o.getObjectByName?.("palmTip");
      const crown = o.getObjectByName?.("palmCrown");
      if (base?.rotation) base.rotation.z = s * 0.07 * amp;
      if (lower?.rotation) lower.rotation.z = s * 0.12 * amp;
      if (mid?.rotation) mid.rotation.z = s * 0.18 * amp;
      if (tip?.rotation) tip.rotation.z = s * 0.26 * amp;
      if (crown?.rotation && crown?.position) {
        crown.rotation.z = s * 0.4 * amp;
        crown.position.x = s * 0.2 * amp;
      }
    }
    strip.traverse((o) => {
      if (o.userData?.palm) swayPalm(o, 1);
    });
    for (const fp of farPalms) {
      fp.mesh.visible = !inCrib;
      fp.mesh.position.set(camX + fp.dx, 0, fp.z);
      swayPalm(fp.mesh, 1.15);
    }
    const skyInfo = state.sky;
    if (skyInfo && DAY_NIGHT_ENABLED) {
      scene.background.setHex(skyInfo.top);
      renderer.setClearColor(skyInfo.top, 1);
      if (scene.fog) {
        scene.fog.color.setHex(skyInfo.fog);
        scene.fog.density = skyInfo.star > 0.55 ? 0.0044 : 0.0022;
      }
      sky.material.color.setHex(skyInfo.top);
      sky.material.opacity = skyInfo.star;
      sky.visible = skyInfo.star > 0.06;
      moon.visible = skyInfo.moon > 0.12;
      moon.material.opacity = Math.max(0.15, skyInfo.moon);
      moonGlow.visible = skyInfo.moon > 0.12;
      moonGlow.material.opacity = 0.2 + skyInfo.moon * 0.65;
      sun.visible = skyInfo.sun > 0.12;
      sunGlow.visible = skyInfo.sun > 0.12;
      sun.position.set(camX + 8.6, 12.8 + skyInfo.sun * 4.2, -28);
      sunGlow.position.copy(sun.position);
      sunGlow.material.opacity = 0.25 + skyInfo.sun * 0.6;
      hemi.intensity = 0.55 + skyInfo.light * 0.7;
      hemi.color.setHex(skyInfo.sun > 0.35 ? 0xc8e0f8 : skyInfo.top);
      moonLight.intensity = skyInfo.moon * 0.62;
      moonLight.color.setHex(0xe8f0ff);
      sunLight.intensity = skyInfo.sun * 1.45;
      sunLight.color.setHex(skyInfo.sun > 0.7 ? 0xfff4d8 : 0xffa060);
      sunLight.position.set(camX + 12, 8 + skyInfo.sun * 14, 8);
      amb.intensity = 0.7 + skyInfo.light * 0.65;
      amb.color.setHex(skyInfo.sun > 0.4 ? 0xb0c8e0 : 0x4a3068);
      neonFill.intensity = 0.08 + skyInfo.star * 0.2;
      const litWin = skyInfo.windows > 0.32;
      winMat.map = litWin ? WIN_LIT : WIN_DIM;
      winMatFar.map = litWin ? WIN_LIT : WIN_DIM;
      if (homePane) homePane.material.color.setHex(litWin ? 0xf0c430 : 0x1a1424);
      lampHeadMat.color.setHex(skyInfo.lamps > 0.35 ? 0xf0c430 : 0x2a2430);
      lampGlowMat.opacity = skyInfo.lamps > 0.35 ? 0.2 + skyInfo.lamps * 0.7 : 0;
      for (const pl of lampLights) pl.intensity = skyInfo.lamps > 0.35 ? 0.35 + skyInfo.lamps * 0.7 : 0;
      skyline.material.color.setHex(skyInfo.windows > 0.4 ? 0xffffff : 0x8aa4bc);
      skyline.material.opacity = skyInfo.windows > 0.4 ? 1 : 0.78;
    }

    buyerT += stepDt;
    const blink = state.invuln > 0 && Math.floor(state.invuln * 20) % 2 === 0;
    const boarding = (state.boardT || 0) > 0;
    playerSprite.visible = !state.inCar || boarding;
    playerSprite.material.opacity = blink ? 0.4 : 1;
    const airborne = p.y < 197.2;
    const hatId = state.wardrobe?.hat === "none" ? "none" : "beanie";
    const fit = (sprites.hero && sprites.hero[hatId]) || sprites.player || sprites;
    const spd = Math.abs(p.vx);
    const walking = spd > 8 && !boarding;
    const turning = !inCrib && !state.inCar && !boarding && !airborne && Math.abs(lookFace) < 0.62;
    const animSet = state.muzzle > 0 ? fit.shoot
      : airborne ? fit.jump
      : turning && fit.turn ? fit.turn
      : walking ? fit.walk
      : fit.idle;
    const rate = state.muzzle > 0 ? 14 : airborne ? 8 : turning ? 7 : walking ? (7.2 + spd * 0.14) : 3;
    const sprFace = lookFace < 0 ? -1 : 1;
    setBillboardFrame(playerSprite, frameAt(animSet, p.anim, rate), sprFace);
    const sidewalkZ = 1.15;
    const curbDoorZ = 2.15;
    const enter = boarding && state.inCar;
    const leave = boarding && !state.inCar;
    let boardZ = sidewalkZ;
    if (enter) boardZ = sidewalkZ + (curbDoorZ - sidewalkZ) * Math.min(1, boardU / 0.4);
    else if (leave) boardZ = curbDoorZ + (sidewalkZ - curbDoorZ) * Math.min(1, boardU / 0.45);
    const footZ = inCrib ? 1.45 : boardZ;
    if (inCrib) {
      playerSprite.visible = true;
      playerSprite.position.set(Number(state.cribX) || 0, 0, footZ);
    } else {
      place(playerSprite, px, GROUND_Y, camX, footZ);
    }
    const plantBob = walking && !airborne
      ? Math.abs(Math.sin(p.anim * rate * Math.PI)) * 0.012
      : 0;
    playerSprite.position.y = plantBob;
    let duck = 0;
    const doorAmt = !boarding ? 0
      : boardU < 0.18 ? boardU / 0.18
        : boardU < 0.7 ? 1
          : Math.max(0, (1 - boardU) / 0.3);
    const carWx = state.car ? nearestWorldX(state.car.x, camX) : playerSprite.position.x;
    const face = state.car?.facing || 1;
    if (enter) {
      const t = Math.min(1, boardU / 0.38);
      playerSprite.position.x = carWx + face * (-0.35 + 1.2 * t);
      duck = boardU < 0.38 ? 0 : boardU < 0.78 ? (boardU - 0.38) / 0.4 : 1;
    } else if (leave) {
      const t = Math.min(1, boardU / 0.45);
      playerSprite.position.x = carWx + face * (0.85 - 1.05 * t);
      duck = boardU < 0.28 ? 1 : boardU < 0.62 ? 1 - (boardU - 0.28) / 0.34 : 0;
    }
    const doorNear = playerCar.getObjectByName("doorNear");
    const doorFar = playerCar.getObjectByName("doorFar");
    const yaw = playerCar.rotation.y || 0;
    const streetDoor = Math.cos(yaw) >= 0 ? doorNear : doorFar;
    const otherDoor = streetDoor === doorNear ? doorFar : doorNear;
    if (streetDoor) streetDoor.rotation.y = doorAmt * 1.15;
    if (otherDoor) otherDoor.rotation.y = 0;
    orientBillboard(playerSprite, camera);
    const baseH = playerSprite.userData.height || 3.05;
    playerSprite.scale.x = playerSprite.userData.baseW || 1;
    playerSprite.scale.y = baseH * (1 - duck * 0.72);
    if (turning) playerSprite.rotation.y += lookFace * 0.18;
    playerSprite.material.color.set(p.flash > 0 ? 0xffffff : 0xffffff);
    if (p.flash > 0) playerSprite.material.color.setHex(0xffc8e8);
    else playerSprite.material.color.setHex(0xffffff);

    playerShadow.visible = inCrib || !state.inCar || boarding;
    playerShadow.position.x = playerSprite.position.x;
    playerShadow.position.z = playerSprite.position.z;
    playerShadow.scale.set(1.25, 1, 0.55);
    if (p.y < 198) playerShadow.scale.multiplyScalar(0.7);

    if (!state.car) {
      youLabel.visible = false;
      carMarker.visible = false;
    }
    if (state.car && !inCrib) {
      const cx = renderGameX(state.car, alpha);
      playerCar.visible = true;
      place(playerCar, cx, GROUND_Y, camX, 4.95 + (state.car.lat || 0));
      playerCar.position.y = state.car.hp > 0 ? 0 : -0.12;
      const yaw = Number.isFinite(state.car.yaw) ? state.car.yaw : (state.car.facing < 0 ? Math.PI : 0);
      playerCar.rotation.y = yaw;
      const body = playerCar.getObjectByName("body");
      if (body) {
        const live = body.userData.paintHex || 0xc45a28;
        body.material.color.setHex(state.car.hp > 0 ? live : 0x2a2438);
      }
      setCarLights(playerCar, !!(skyInfo && skyInfo.headlights));
      const beam = playerCar.getObjectByName("headBeam");
      if (beam) {
        const on = !!(skyInfo && skyInfo.headlights);
        beam.visible = on;
        beam.traverse((o) => {
          if (o.material && o.material.opacity != null && o.isMesh) {
            o.material.opacity = on ? (o.material.blending === THREE.AdditiveBlending ? 0.88 : 0.9) : 0;
          }
        });
      }
      youLabel.visible = false;
      carMarker.visible = state.car.hp > 0 && !state.inCar;
      const bob = Math.sin(performance.now() * 0.004) * 0.12;
      carMarker.position.set(playerCar.position.x, 2.35 + bob, playerCar.position.z);
      carMarker.rotation.y = camera.rotation.y;
      const speed = Math.min(1, Math.abs(state.car.vx) / 180);
      speedStreaks.forEach((streak, i) => {
        const on = state.inCar && speed > 0.35;
        streak.visible = on;
        if (!on) return;
        const back = -state.car.facing * (1.6 + i * 0.55);
        streak.position.x = playerCar.position.x + back;
        streak.position.y = 0.38 + (i % 2) * 0.12;
        streak.position.z = 4.95 + (i - 1.5) * 0.16;
        streak.rotation.y = state.car.facing < 0 ? Math.PI : 0;
        streak.material.opacity = (0.18 - i * 0.03) * speed;
      });
    } else {
      playerCar.visible = false;
      youLabel.visible = false;
      carMarker.visible = false;
      speedStreaks.forEach((streak) => { streak.visible = false; });
    }

    if (state.copCar && !inCrib) {
      copCarMesh.visible = true;
      place(copCarMesh, renderGameX(state.copCar, alpha), GROUND_Y, camX, 4.95 + (state.copCar.facing > 0 ? 3.9 : 0));
      copCarMesh.position.y = 0;
      copCarMesh.rotation.y = state.copCar.facing < 0 ? Math.PI : 0;
      const flash = Math.sin(performance.now() * 0.012) > 0;
      const red = copCarMesh.getObjectByName("copRed");
      const blue = copCarMesh.getObjectByName("copBlue");
      if (red) red.visible = flash;
      if (blue) blue.visible = !flash;
      setCarLights(copCarMesh, !!(skyInfo && skyInfo.headlights));
    } else {
      copCarMesh.visible = false;
    }

    let ti = 0;
    for (const t of (inCrib ? [] : state.traffic) || []) {
      const kind = t.kind === "luxury" ? "luxury" : "beater";
      let mesh = trafficPool[ti];
      if (!mesh || mesh.userData.kind !== kind) {
        if (mesh) {
          scene.remove(mesh);
          mesh.traverse((o) => {
            if (o.geometry) o.geometry.dispose?.();
          });
        }
        mesh = makeStreetCar(kind);
        scene.add(mesh);
        trafficPool[ti] = mesh;
      }
      mesh.visible = true;
      ti += 1;
      place(mesh, renderGameX(t, alpha), GROUND_Y, camX, 4.95 + (t.lat ?? restLat(t.facing)));
      mesh.position.y = 0;
      mesh.rotation.y = t.facing < 0 ? Math.PI : 0;
      const body = mesh.getObjectByName("body");
      if (body) {
        const hex = typeof t.color === "string" ? parseInt(String(t.color).slice(1), 16) : (t.color || 0x2a3048);
        body.material.color.setHex(hex);
      }
      setCarLights(mesh, !!(skyInfo && skyInfo.headlights));
    }
    hideFrom(trafficPool, ti);

    if (state.plugMeet && !state.order) {
      destPin.visible = true;
      place(destPin, state.plugMeet.x, GROUND_Y, camX, 1.2);
      destPin.position.y = 2.85 + Math.sin(performance.now() * 0.01) * 0.18;
    } else {
      destPin.visible = false;
    }
    if (state.order && (state.order.phase === "active" || state.order.phase === "nudge")) {
      destPin.visible = true;
      place(destPin, state.order.x, GROUND_Y, camX, 1.2);
      destPin.position.y = 2.85 + Math.sin(performance.now() * 0.01) * 0.18;
      buyerSprite.visible = true;
      const look = Math.max(0, state.order.look | 0) % sprites.buyers.length;
      const buyerSet = sprites.buyers[look];
      const face = wrapDelta(state.order.x, px, WORLD) >= 0 ? 1 : -1;
      const waveSet = buyerSet.wave || buyerSet.idle;
      setBillboardFrame(buyerSprite, frameAt(waveSet, buyerT, 8), face);
      place(buyerSprite, state.order.x, GROUND_Y, camX, 1.2);
      buyerSprite.position.y = Math.max(0, gameToWorldY(GROUND_Y));
      orientBillboard(buyerSprite, camera);
      const pulse = 0.55 + Math.sin(performance.now() * 0.012) * 0.45;
      buyerSprite.material.color.setHex(pulse > 0.7 ? 0xfff2a8 : 0xffffff);
      buyerGlow.visible = true;
      buyerGlow.position.set(buyerSprite.position.x, 1.4, 1.2);
      buyerGlow.scale.setScalar(2.6 + pulse * 1.4);
      buyerGlow.material.opacity = 0.45 + pulse * 0.4;
      buyerArrow.visible = true;
      buyerArrow.position.set(buyerSprite.position.x, 3.15 + Math.sin(performance.now() * 0.014) * 0.22, 1.2);
    } else {
      if (!state.plugMeet) destPin.visible = false;
      buyerSprite.visible = false;
      buyerGlow.visible = false;
      buyerArrow.visible = false;
    }

    packHeld.visible = state.carrying && !state.inCar;
    if (state.carrying) {
      place(packHeld, px, p.y - 34, camX, 0.85);
      packHeld.position.y = playerSprite.position.y + 1.55;
      orientBillboard(packHeld, camera);
    }

    const plugX = state.plugMeet?.x ?? PLUG_X;
    place(plugLabel, plugX, 154, camX, 1.15);
    plugLabel.position.y = 2.85;
    place(stashLabel, HOME_X, 154, camX, 1.15);
    stashLabel.position.y = 2.42;
    if (state.plugMeet) {
      plugSprite.visible = true;
      const pset = sprites.plug || sprites.buyers[0];
      const pface = wrapDelta(plugX, px, WORLD) >= 0 ? 1 : -1;
      setBillboardFrame(plugSprite, frameAt(pset.wave || pset.idle, buyerT, 7), pface);
      place(plugSprite, plugX, GROUND_Y, camX, 1.2);
      plugSprite.position.y = 0;
      orientBillboard(plugSprite, camera);
      plugGlow.visible = true;
      plugGlow.position.set(plugSprite.position.x, 1.35, 1.2);
    } else {
      plugSprite.visible = false;
      plugGlow.visible = false;
    }
    plugLabel.visible = !inCrib;
    stashLabel.visible = !inCrib;
    if (inCrib) {
      destPin.visible = false;
      buyerSprite.visible = false;
      buyerGlow.visible = false;
      buyerArrow.visible = false;
      plugSprite.visible = false;
      plugGlow.visible = false;
    }

    dumpSprite.visible = !!state.combat && !inCrib;
    if (dumpSprite.visible) {
      place(dumpSprite, DUMPSTER_X, 198, camX, -0.35);
      dumpSprite.position.y = 0;
      orientBillboard(dumpSprite, camera);
    }
    place(sellLabel, DUMPSTER_X, 154, camX, 0.7);
    sellLabel.position.y = 1.55;
    place(fireLabel, DUMPSTER_X, 154, camX, 0.7);
    fireLabel.position.y = 1.55;
    sellLabel.visible = !!(state.combat && !state.carrying && !inCrib);
    fireLabel.visible = !!(state.combat && state.carrying && !inCrib);

    const looks = sprites.peds || sprites.buyers || [];
    let pedI = 0;
    for (const ped of state.peds || []) {
      if (inCrib) break;
      const spr = take(pedPool, () => {
        const s = makeBillboard(looks[0]?.walk?.[0] || sprites.idle[0], 2.85);
        scene.add(s);
        const sh = new THREE.Mesh(shadowGeo, shadowMat.clone());
        sh.rotation.x = -Math.PI / 2;
        sh.position.y = 0.025;
        sh.scale.set(1.15, 1, 0.5);
        scene.add(sh);
        s.userData.shadow = sh;
        return s;
      }, pedI++);
      const set = looks[ped.look % looks.length] || looks[0];
      const pedSpd = Math.abs(ped.vx || 0);
      const frames = pedSpd > 2 || (ped.pushed || 0) > 0 ? (set.walk || set.idle) : (set.idle || set.walk);
      const pedRate = 7.2 + pedSpd * 0.22;
      setBillboardFrame(spr, frameAt(frames, ped.anim, pedRate), ped.facing);
      place(spr, ped.x, GROUND_Y, camX, 1.15 + (ped.side || 0));
      const pedBob = pedSpd > 2 ? Math.abs(Math.sin(ped.anim * pedRate * Math.PI)) * 0.022 : 0;
      spr.position.y = pedBob;
      orientBillboard(spr, camera);
      spr.material.color.setHex(0xffffff);
      if (spr.userData.shadow) {
        spr.userData.shadow.visible = true;
        spr.userData.shadow.position.x = spr.position.x;
        spr.userData.shadow.position.z = spr.position.z;
        spr.userData.shadow.scale.set(1.15, 1, 0.5);
      }
    }
    hideFrom(pedPool, pedI);
    for (let i = pedI; i < pedPool.length; i++) {
      if (pedPool[i].userData.shadow) pedPool[i].userData.shadow.visible = false;
    }

    (state.lights || []).forEach((L, i) => {
      const m = lightMeshes[i];
      if (!m) return;
      m.visible = !inCrib;
      if (inCrib) return;
      place(m, L.x, GROUND_Y, camX, 0);
      m.position.y = 0;
      m.traverse((o) => {
        if (o.name === "bulbRed") o.material.color.setHex(L.phase === "red" ? 0xff2a3a : 0x3a1018);
        if (o.name === "bulbYellow") o.material.color.setHex(L.phase === "yellow" ? 0xf0c430 : 0x3a3010);
        if (o.name === "bulbGreen") o.material.color.setHex(L.phase === "green" ? 0x3dff7a : 0x103a18);
        if (o.name === "lightHalo") {
          o.visible = L.phase === "red" || L.phase === "yellow";
          o.material.color.setHex(L.phase === "red" ? 0xff2a3a : 0xf0c430);
        }
      });
    });

    let fi = 0;
    let bangI = 0;
    for (const foe of state.foes) {
      const spr = take(foePool, () => {
        const s = makeBillboard(sprites.thug.walk[0], 2.2);
        scene.add(s);
        const sh = new THREE.Mesh(shadowGeo, shadowMat.clone());
        sh.rotation.x = -Math.PI / 2;
        sh.position.y = 0.03;
        scene.add(sh);
        s.userData.shadow = sh;
        return s;
      }, fi++);
      const set = foe.kind === "cop" ? sprites.cop : foe.kind === "runner" ? sprites.runner : sprites.thug;
      const frames = Math.abs(foe.vx) > 6 ? set.walk : set.idle;
      setBillboardFrame(spr, frameAt(frames, foe.anim, 11), foe.facing);
      place(spr, foe.x, foe.y, camX, 0.55);
      orientBillboard(spr, camera);
      if (foe.flash > 0) spr.material.color.setHex(0xffffff);
      else spr.material.color.setHex(0xffffff);
      if (spr.userData.shadow) {
        spr.userData.shadow.visible = true;
        spr.userData.shadow.position.x = spr.position.x;
        spr.userData.shadow.position.z = 0.55;
      }
      if (foe.telegraph > 0) {
        const bang = take(bangPool, () => {
          const s = makeLabel("!", "#e21b7a");
          s.scale.set(0.9, 0.9, 1);
          scene.add(s);
          return s;
        }, bangI++);
        bang.position.copy(spr.position);
        bang.position.y = spr.position.y + 1.85;
        bang.position.z += 0.15;
      }
    }
    hideFrom(foePool, fi);
    for (let i = fi; i < foePool.length; i++) {
      if (foePool[i].userData.shadow) foePool[i].userData.shadow.visible = false;
    }

    if (state.boss) {
      if (!bossSprite) {
        bossSprite = makeBillboard(sprites.boss.walk[0], 1.95);
        scene.add(bossSprite);
      }
      bossSprite.visible = true;
      const bossFrames = Math.abs(state.boss.vx) > 6 ? sprites.boss.walk : sprites.boss.idle;
      setBillboardFrame(bossSprite, frameAt(bossFrames, state.boss.anim, 8), state.boss.facing);
      place(bossSprite, state.boss.x, state.boss.y, camX, 1.1);
      bossSprite.position.y = 0.05;
      orientBillboard(bossSprite, camera);
      if (state.boss.flash > 0) bossSprite.material.color.setHex(0xffffff);
      else bossSprite.material.color.setHex(0xccf6ff);
      if (state.boss.telegraph > 0) {
        const bang = take(bangPool, () => {
          const s = makeLabel("!", "#e21b7a");
          s.scale.set(0.9, 0.9, 1);
          scene.add(s);
          return s;
        }, bangI++);
        bang.position.copy(bossSprite.position);
        bang.position.y = 1.9;
      }
    } else if (bossSprite) {
      bossSprite.visible = false;
    }
    hideFrom(bangPool, bangI);

    let li = 0;
    for (const item of state.loot) {
      const spr = take(lootPool, () => {
        const s = makeBillboard(sprites.pack, 0.5);
        scene.add(s);
        return s;
      }, li++);
      setBillboardFrame(spr, item.kind === "pack" ? sprites.pack : sprites.cash);
      place(spr, item.x, item.y, camX, 0.15);
      spr.position.y = 0.35 + Math.sin(item.bob * 6) * 0.08;
      orientBillboard(spr, camera);
    }
    hideFrom(lootPool, li);

    let si = 0;
    for (const shot of state.shots) {
      const spr = take(shotPool, () => {
        const s = makeBillboard(sprites.shot[0], 0.28);
        scene.add(s);
        const glow = glowSprite("#3de0ff", 0.7);
        scene.add(glow);
        s.userData.glow = glow;
        return s;
      }, si++);
      setBillboardFrame(spr, frameAt(sprites.shot, 1 - shot.life, 14), shot.vx >= 0 ? 1 : -1);
      place(spr, shot.x, shot.y, camX, 0.1);
      spr.position.y = Math.max(0.4, gameToWorldY(shot.y));
      orientBillboard(spr, camera);
      const col = shot.from === "foe" ? 0xff6a6a : 0x3de0ff;
      spr.material.color.setHex(col);
      if (spr.userData.glow) {
        spr.userData.glow.visible = true;
        spr.userData.glow.position.copy(spr.position);
        spr.userData.glow.material.color.setHex(col);
      }
    }
    hideFrom(shotPool, si);
    for (let i = si; i < shotPool.length; i++) {
      if (shotPool[i].userData.glow) shotPool[i].userData.glow.visible = false;
    }

    let bi = 0;
    for (const b of state.booms) {
      const spr = take(boomPool, () => {
        const s = makeBillboard(sprites.boom[0], 0.7);
        scene.add(s);
        return s;
      }, bi++);
      const frame = Math.min(3, Math.floor(b.t * 14));
      setBillboardFrame(spr, sprites.boom[frame]);
      place(spr, b.x, b.y + 8, camX, 0.2);
      spr.position.y = 0.9;
      orientBillboard(spr, camera);
    }
    hideFrom(boomPool, bi);

    let pi = 0;
    for (const bit of state.bits) {
      const mesh = take(bitPool, () => {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.08, 0.08),
          new THREE.MeshBasicMaterial({ color: 0xffffff }),
        );
        scene.add(m);
        return m;
      }, pi++);
      mesh.material.color.set(bit.color);
      place(mesh, bit.x, bit.y, camX, 0.2);
      mesh.position.y = Math.max(0.05, gameToWorldY(bit.y));
    }
    hideFrom(bitPool, pi);

    if (state.shake > 0) {
      const s = state.shake * state.shake;
      camera.position.x += (Math.random() * 2 - 1) * 0.12 * s;
      camera.position.y += (Math.random() * 2 - 1) * 0.08 * s;
    }

    renderer.render(scene, camera);
    return { camX, project: (gx, gy) => project(gx, gy, camX) };
  }

  function getView() {
    const dist = Math.max(0.8, Math.abs(camera.position.z - 0.55));
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const halfWorld = dist * Math.tan(hFov / 2);
    const halfGame = (halfWorld / STREET_LEN) * WORLD;
    const camGameX = wrap((camX / STREET_LEN) * WORLD, WORLD);
    const h = canvas.clientHeight || 1;
    const spriteH = playerSprite.userData.height || 1.75;
    const playerPx = (spriteH / dist) / (2 * Math.tan(vFov / 2)) * h;
    return { camGameX, halfWidth: halfGame, playerPx, dist, camV, lookAim, lookFace };
  }

  function resetCam() {
    camV = 0;
    lookAimV = 0;
  }

  function setLookFace(v) {
    lookFace = Math.max(-1, Math.min(1, Number(v) || 0));
  }

  return { sync, resize, getView, resetCam, setLookFace, renderer, camera, scene };
}
