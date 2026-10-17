import * as THREE from "three";
import {
  WORLD, GROUND_Y, STREET_LEN, SHOP_X, DUMPSTER_X, COLORS,
  wrap, wrapDelta, gameToWorldX, gameToWorldY, nearestWorldX,
  BLOCK_LEN, PLUG_X, HOME_X, LIGHT_COUNT, lightGameX, restLat, DAY_NIGHT_ENABLED,
  INTER_METERS, BOARD_T, CAM_ZOOM_MIN, CAM_ZOOM_MED, CAM_ZOOM_MAX,
} from "./config.js?v=103";
import { makeBillboard, setBillboardFrame, orientBillboard, frameAt } from "./sprites.js?v=103";
import { STRIDE_CYCLE, RUN_STRIDE_CYCLE } from "./paint.js?v=103";

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
    g.fillStyle = "rgba(0,0,0,0.16)";
    for (let i = 0; i < 40; i++) g.fillRect((i * 17) % w, (i * 13) % h, 2, 1);
    g.fillStyle = "rgba(255,255,255,0.08)";
    for (let i = 0; i < 28; i++) g.fillRect((i * 11) % w, (i * 19) % h, 1, 1);
    g.strokeStyle = "rgba(0,0,0,0.22)";
    g.lineWidth = 1;
    for (let y = 0; y < h; y += 8) {
      g.beginPath();
      g.moveTo(0, y + 0.5);
      g.lineTo(w, y + 0.5);
      g.stroke();
    }
  });
}

function stuccoTex(color) {
  return canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(0,0,0,0.12)";
    for (let i = 0; i < 90; i++) g.fillRect((i * 13) % w, (i * 17) % h, 2, 2);
    g.fillStyle = "rgba(255,255,255,0.07)";
    for (let i = 0; i < 50; i++) g.fillRect((i * 19) % w, (i * 23) % h, 1, 1);
  });
}

function asphaltTex() {
  return canvasTex(128, 128, (g, w, h) => {
    // Rough night asphalt — grit only, no lane pinstripes (dashes are separate meshes).
    g.fillStyle = "#32303a";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#3c3a44";
    for (let i = 0; i < 300; i++) g.fillRect((i * 37) % w, (i * 53) % h, 2, 2);
    g.fillStyle = "#24222c";
    for (let i = 0; i < 160; i++) g.fillRect((i * 19) % w, (i * 29) % h, 2, 1);
    g.fillStyle = "rgba(255,255,255,0.06)";
    for (let i = 0; i < 80; i++) g.fillRect((i * 41) % w, (i * 17) % h, 1, 1);
    // Soft tire wear patches, not stripes.
    g.fillStyle = "rgba(0,0,0,0.26)";
    for (let i = 0; i < 10; i++) {
      g.beginPath();
      g.ellipse((i * 23) % w, (i * 31) % h, 18, 4, 0.2, 0, Math.PI * 2);
      g.fill();
    }
  });
}

function sidewalkTex() {
  return canvasTex(64, 32, (g, w, h) => {
    g.fillStyle = "#9a96a2";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#8a8694";
    for (let i = 0; i < 40; i++) g.fillRect((i * 13) % w, (i * 7) % h, 2, 1);
    g.strokeStyle = "#5a5664";
    g.lineWidth = 2;
    for (let x = 0; x < w; x += 16) g.strokeRect(x + 0.5, 1, 15, h - 2);
    g.fillStyle = "#c4c0cc";
    g.fillRect(0, 0, w, 3);
    g.fillStyle = "#6a6674";
    g.fillRect(0, h - 3, w, 3);
  });
}

function grassTex() {
  return canvasTex(64, 64, (g, w, h) => {
    // Dark green night turf (readable, not black) — Lambert lifts under lamps.
    g.fillStyle = "#2a4a30";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#356840";
    for (let i = 0; i < 120; i++) {
      g.fillRect((i * 17 + 5) % w, (i * 23 + 3) % h, 2, 3);
    }
    g.fillStyle = "#1e3a24";
    for (let i = 0; i < 90; i++) {
      g.fillRect((i * 29 + 11) % w, (i * 13 + 7) % h, 1, 2);
    }
    g.fillStyle = "#4a7850";
    for (let i = 0; i < 55; i++) {
      g.fillRect((i * 41) % w, (i * 19) % h, 1, 1);
    }
  });
}

function bushTex(hex) {
  return canvasTex(32, 32, (g, w, h) => {
    g.fillStyle = hex;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(0,0,0,0.28)";
    for (let i = 0; i < 28; i++) {
      g.fillRect((i * 11) % w, (i * 17) % h, 2, 2);
    }
    g.fillStyle = "rgba(90,160,80,0.22)";
    for (let i = 0; i < 18; i++) {
      g.fillRect((i * 13 + 4) % w, (i * 7 + 2) % h, 1, 1);
    }
    g.fillStyle = "rgba(0,30,0,0.35)";
    g.fillRect(0, h - 4, w, 4);
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
const winMat = new THREE.MeshBasicMaterial({
  map: WIN_LIT,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
});
const winMatFar = new THREE.MeshBasicMaterial({
  map: WIN_LIT,
  fog: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
});
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
    // Prefer pixel font when loaded; monospace fallback still draws legible SHOP/LIQUOR.
    g.font = "bold 26px 'Press Start 2P', 'Courier New', monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.shadowColor = color;
    g.shadowBlur = 14;
    g.fillStyle = color;
    g.fillText(text, w / 2, h / 2 + 2);
    g.shadowBlur = 0;
    g.fillStyle = "#ffffff";
    g.fillText(text, w / 2, h / 2);
    // If the glyph path was empty (font race), stamp a block label so facade signs never vanish.
    const sample = g.getImageData(w / 2 - 4, h / 2 - 4, 8, 8).data;
    let lit = 0;
    for (let i = 3; i < sample.length; i += 4) if (sample[i] > 20) lit += 1;
    if (lit < 4) {
      g.fillStyle = color;
      g.fillRect(24, 16, w - 48, h - 32);
      g.fillStyle = "#07060c";
      g.font = "bold 22px monospace";
      g.fillText(text, w / 2, h / 2 + 1);
      g.fillStyle = "#ffffff";
      g.fillText(text, w / 2, h / 2);
    }
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

function bezPt(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}
function paintPalmFrame(g, w, h, bend, frondBend = 0) {
  g.clearRect(0, 0, w, h);
  g.imageSmoothingEnabled = true;
  const baseX = w * 0.48;
  const baseY = h - 4;
  const height = h * 0.56;
  // Trunk stays nearly still. The breeze is in the fronds.
  const trunkBend = 0.22 + bend * 0.03;
  const p0x = baseX;
  const p0y = baseY;
  const p1x = baseX + trunkBend * 3;
  const p1y = baseY - height * 0.34;
  const p2x = baseX + trunkBend * 5;
  const p2y = baseY - height * 0.7;
  const p3x = baseX + trunkBend * 6;
  const p3y = baseY - height;
  g.lineCap = "round";
  g.lineJoin = "round";
  const rings = 9;
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const y0 = bezPt(t, p0y, p1y, p2y, p3y);
    const x0 = bezPt(t, p0x, p1x, p2x, p3x);
    const y1 = bezPt(Math.min(1, t + 0.08), p0y, p1y, p2y, p3y);
    const thick = 11 * (1 - t * 0.62);
    g.strokeStyle = i % 2 === 0 ? "#5c3a24" : "#3e2818";
    g.lineWidth = thick;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x0, y1);
    g.stroke();
  }
  g.strokeStyle = "#7a5a3c";
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(p0x - 1, p0y);
  g.bezierCurveTo(p1x - 1, p1y, p2x, p2y, p3x, p3y);
  g.stroke();
  const cx = p3x;
  const cy = p3y;
  // Long arching crowns: rise, then droop, with leaflets along each rib.
  const fronds = [
    { a: -2.55, len: 86, droop: 48, rib: "#1a4024", leaf: "#2d6a38" },
    { a: -2.05, len: 96, droop: 54, rib: "#1e4c2c", leaf: "#3a7a44" },
    { a: -1.55, len: 92, droop: 50, rib: "#245832", leaf: "#348044" },
    { a: -1.05, len: 78, droop: 36, rib: "#1e4c2c", leaf: "#2f743c" },
    { a: -0.55, len: 70, droop: 28, rib: "#16381f", leaf: "#2a6234" },
    { a: 2.85, len: 80, droop: 46, rib: "#1a4024", leaf: "#2d6a38" },
    { a: 2.35, len: 88, droop: 50, rib: "#16381f", leaf: "#245830" },
    { a: 3.35, len: 64, droop: 34, rib: "#1e4c2c", leaf: "#2f743c" },
  ];
  function qPoint(t, x0, y0, mx, my, ex, ey) {
    const u = 1 - t;
    return {
      x: u * u * x0 + 2 * u * t * mx + t * t * ex,
      y: u * u * y0 + 2 * u * t * my + t * t * ey,
    };
  }
  for (const f of fronds) {
    const a = f.a + frondBend * 0.16;
    const reach = f.len;
    const ex = cx + Math.cos(a) * reach;
    const ey = cy + Math.sin(a) * reach * 0.22 + f.droop + frondBend * 4;
    const mx = cx + Math.cos(a) * reach * 0.52;
    const my = cy - 16 + Math.sin(a) * reach * 0.08 + frondBend * 2;
    g.strokeStyle = f.rib;
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(cx, cy);
    g.quadraticCurveTo(mx, my, ex, ey);
    g.stroke();
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      const t = i / (steps + 0.4);
      const p = qPoint(t, cx, cy, mx, my, ex, ey);
      const prev = qPoint(Math.max(0, t - 0.08), cx, cy, mx, my, ex, ey);
      const ang = Math.atan2(p.y - prev.y, p.x - prev.x);
      const leafLen = 14 * (1.05 - t * 0.45);
      for (const side of [-1, 1]) {
        const la = ang + side * (1.05 - t * 0.25);
        const tipX = p.x + Math.cos(la) * leafLen;
        const tipY = p.y + Math.sin(la) * leafLen * 0.55 + 4 + t * 3;
        g.strokeStyle = side < 0 ? f.leaf : f.rib;
        g.lineWidth = 1.35;
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.quadraticCurveTo(
          p.x + Math.cos(la) * leafLen * 0.55,
          p.y + Math.sin(la) * leafLen * 0.2 + 1,
          tipX,
          tipY,
        );
        g.stroke();
      }
    }
  }
  g.fillStyle = "#1a3a24";
  g.beginPath();
  g.ellipse(cx, cy + 2, 8, 6, 0, 0, Math.PI * 2);
  g.fill();
}

const PALM_FRAMES = 7;
const PALM_TEX = [];
for (let i = 0; i < PALM_FRAMES; i++) {
  const u = i / (PALM_FRAMES - 1) - 0.5;
  const bend = 0.4 + u * 0.04;
  const frondBend = u * 1.05;
  const tex = canvasTex(120, 240, (g, w, h) => paintPalmFrame(g, w, h, bend, frondBend));
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  PALM_TEX.push(tex);
}

function makePalm() {
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: PALM_TEX[3],
    transparent: true,
    depthWrite: false,
    depthTest: true,
  }));
  spr.center.set(0.5, 0);
  spr.scale.set(2.85, 5.7, 1);
  spr.name = "palmSpr";
  const g = new THREE.Group();
  g.add(spr);
  g.userData.palm = true;
  g.userData.palmPhase = Math.random() * Math.PI * 2;
  return g;
}

function makeBuilding(w, h, d, facade, { door = true } = {}) {
  const g = new THREE.Group();
  const roofH = 0.28;
  const wallH = Math.max(1.2, h - roofH);
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, wallH, d),
    new THREE.MeshLambertMaterial({ map: facade, color: 0xffffff }),
  );
  body.position.y = wallH / 2;
  g.add(body);
  const winH = wallH * 0.42;
  const windows = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.78, winH),
    winMat,
  );
  windows.position.set(0, wallH * 0.55, d / 2 + 0.04);
  windows.renderOrder = 1;
  g.add(windows);
  if (door && w > 2.2 && wallH > 2.4) {
    const doorW = Math.min(1.05, w * 0.28);
    const doorH = Math.min(2.05, wallH * 0.48);
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(doorW + 0.12, doorH + 0.1, 0.08),
      new THREE.MeshLambertMaterial({ color: 0x2a2430 }),
    );
    frame.position.set(-w * 0.22, doorH * 0.5, d / 2 + 0.05);
    g.add(frame);
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(doorW, doorH, 0.06),
      new THREE.MeshLambertMaterial({ color: 0x3a2a22 }),
    );
    slab.position.set(-w * 0.22, doorH * 0.5, d / 2 + 0.09);
    g.add(slab);
    const knob = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.06, 0.08),
      new THREE.MeshLambertMaterial({ color: 0xc8a060 }),
    );
    knob.position.set(-w * 0.22 + doorW * 0.32, doorH * 0.5, d / 2 + 0.14);
    g.add(knob);
  }
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.28, roofH, d + 0.28),
    new THREE.MeshLambertMaterial({ color: 0x16121c }),
  );
  roof.position.y = wallH + roofH / 2;
  g.add(roof);
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.12, 0.08, d + 0.12),
    new THREE.MeshLambertMaterial({ color: 0x0e0c12 }),
  );
  cap.position.y = wallH + roofH + 0.03;
  g.add(cap);
  return g;
}

function chromeRim(x, z, radius = 0.22, hubcap = false) {
  // Black tire circle + solid gray hubcap disk (+ tiny center). No spokes/lines.
  const g = new THREE.Group();
  const towardCam = z >= 0 ? 1 : -1;
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.2, 28),
    new THREE.MeshBasicMaterial({ color: 0x050508 }),
  );
  tire.rotation.z = Math.PI / 2;
  tire.rotation.y = Math.PI / 2;
  g.add(tire);
  // Flat disks face the camera so the hub reads as a solid circle, not gray lines.
  const dishR = radius * (hubcap ? 0.62 : 0.55);
  const dish = new THREE.Mesh(
    new THREE.CircleGeometry(dishR, 28),
    new THREE.MeshBasicMaterial({ color: 0x9aa0a8, side: THREE.DoubleSide }),
  );
  dish.position.z = towardCam * 0.11;
  g.add(dish);
  const cap = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.16, 16),
    new THREE.MeshBasicMaterial({ color: 0x6a7078, side: THREE.DoubleSide }),
  );
  cap.position.z = towardCam * 0.115;
  g.add(cap);
  g.position.set(x, radius, z);
  return g;
}

function headSpotTex() {
  const tex = canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const cx = w * 0.5;
    const cy = h * 0.5;
    const grd = g.createRadialGradient(cx, cy, 0, cx, cy, w * 0.5);
    grd.addColorStop(0, "rgba(255,252,230,0.88)");
    grd.addColorStop(0.22, "rgba(255,244,200,0.5)");
    grd.addColorStop(0.48, "rgba(255,230,160,0.22)");
    grd.addColorStop(0.72, "rgba(255,220,140,0.07)");
    grd.addColorStop(0.9, "rgba(255,220,140,0.015)");
    grd.addColorStop(1, "rgba(255,220,140,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function addHeadBeams(car, bumperX, lampZ = 0.42, lampY = 0.52) {
  const spotTex = headSpotTex();
  const group = new THREE.Group();
  group.name = "headBeam";
  const spotMat = new THREE.MeshBasicMaterial({
    map: spotTex,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    opacity: 1,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  for (const side of [-1, 1]) {
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 3.5), spotMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(bumperX + 1.95, 0.034, side * lampZ * 0.38);
    group.add(pool);
  }
  const center = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 3.9), spotMat);
  center.rotation.x = -Math.PI / 2;
  center.position.set(bumperX + 2.2, 0.032, 0);
  group.add(center);
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
    const fInner = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.46, 0.03),
      new THREE.MeshLambertMaterial({ color: 0x4a2018 }),
    );
    fInner.position.set(-0.45, 0, side > 0 ? -0.04 : 0.04);
    const fGlass = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.2, 0.06), tint);
    fGlass.position.set(-0.4, 0.22, 0);
    const fSeam = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.46, 0.07), seamMat);
    fSeam.position.set(-0.02, 0, 0);
    front.add(fPanel);
    front.add(fInner);
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
    const rim = chromeRim(x, z, 0.3, true);
    if (x > 0) rim.name = z > 0 ? "wheelFR" : "wheelFL";
    g.add(rim);
  }
  return g;
}

function makeHatchCar() {
  const g = makeBeaterCar();
  // Shorter hatch: pull the deck forward and raise a stubby rear.
  g.traverse((o) => {
    if (!o.isMesh) return;
    if (o.geometry?.type === "BoxGeometry" && o.position.x < -1.1 && o.position.y > 0.6) {
      o.scale.x *= 0.72;
      o.position.x += 0.28;
      o.position.y += 0.08;
    }
  });
  g.userData.kind = "hatch";
  return g;
}

function makeSuvCar() {
  const g = makeBeaterCar();
  g.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name === "body") {
      o.scale.y = 1.35;
      o.position.y += 0.12;
    }
    if (o.position.y > 0.85) {
      o.position.y += 0.22;
      o.scale.y *= 1.15;
    }
  });
  g.userData.kind = "suv";
  return g;
}

function makeVanCar() {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: 0x3a4a38 });
  const tint = new THREE.MeshBasicMaterial({ color: 0x152028 });
  const chrome = new THREE.MeshBasicMaterial({ color: 0xd0d6de });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.05, 1.55), paint);
  body.position.y = 0.85;
  body.name = "body";
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 1.5), paint);
  cabin.position.set(1.1, 1.55, 0);
  g.add(cabin);
  const wind = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 1.4), tint);
  wind.position.set(1.7, 1.5, 0);
  wind.rotation.z = -0.35;
  g.add(wind);
  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 1.5), chrome);
  bumperF.position.set(2.25, 0.35, 0);
  g.add(bumperF);
  const bumperR = bumperF.clone();
  bumperR.position.x = -2.25;
  g.add(bumperR);
  for (const [name, z] of [["headL", -0.48], ["headR", 0.48]]) {
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.1, 0.22),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0 }),
    );
    lamp.name = name;
    lamp.position.set(2.22, 0.55, z);
    g.add(lamp);
  }
  const headBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.04, 1.0),
    new THREE.MeshBasicMaterial({ color: 0xc8e8ff }),
  );
  headBar.name = "headBar";
  headBar.position.set(2.2, 0.68, 0);
  g.add(headBar);
  const headGlow = glowSprite("#fff2b0", 1.1);
  headGlow.name = "headGlow";
  headGlow.position.set(2.35, 0.55, 0);
  headGlow.visible = false;
  g.add(headGlow);
  addHeadBeams(g, 2.22, 0.48, 0.55);
  for (const [x, z] of [[-1.35, 0.72], [-1.35, -0.72], [1.35, 0.72], [1.35, -0.72]]) {
    g.add(chromeRim(x, z, 0.32, true));
  }
  g.userData.kind = "van";
  return g;
}

function makeStreetCar(kind) {
  if (kind === "luxury") return makeLuxuryCar();
  if (kind === "hatch") return makeHatchCar();
  if (kind === "suv") return makeSuvCar();
  if (kind === "van") return makeVanCar();
  return makeBeaterCar();
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
  // Dark awning shelf — neon SHOP sits on this, so the awning itself is not a floating cyan bar.
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(2.85, 0.12, 1.15),
    new THREE.MeshLambertMaterial({ color: 0x2a2038 }),
  );
  awning.position.set(0, 2.42, 0.42);
  g.add(awning);
  const awningDrop = new THREE.Mesh(
    new THREE.BoxGeometry(2.85, 0.28, 0.08),
    new THREE.MeshLambertMaterial({ color: 0x1a1420 }),
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

function makeLamp(overZ = 1.1) {
  // Cobra-head street lamp: pole + arm, fixture aimed down over the curb/street.
  const g = new THREE.Group();
  const metal = new THREE.MeshLambertMaterial({ color: 0x2a2832 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 3.6, 6), metal);
  pole.position.y = 1.8;
  g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, Math.abs(overZ) + 0.15), metal);
  arm.position.set(0, 3.55, overZ * 0.5);
  g.add(arm);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.14, 0.28),
    lampHeadMat,
  );
  head.name = "lampHead";
  head.position.set(0, 3.42, overZ);
  // Tip the head downward so it reads as a street fixture, not a stadium flood.
  head.rotation.x = overZ >= 0 ? 0.35 : -0.35;
  g.add(head);
  const glow = new THREE.Sprite(lampGlowMat);
  glow.name = "lampGlow";
  // Keep glow tight — oversized sprites read as stadium floods.
  glow.scale.set(0.95, 0.65, 1);
  glow.position.set(0, 3.28, overZ);
  g.add(glow);
  // Soft ground pool disc (visible even when shadow maps are off).
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(2.15, 12),
    new THREE.MeshBasicMaterial({
      color: 0xffe08a,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, 0.05, overZ * 0.9);
  pool.name = "lampPool";
  g.add(pool);
  return g;
}

function addStreetLamp(city, x, z, overZ, lampAnchors, base = 1.6) {
  // Visual pole + fake ground pool only — no per-pole GPU lights (kills iPhone).
  const lamp = makeLamp(overZ);
  lamp.position.set(x, 0, z);
  city.add(lamp);
  if (lampAnchors) {
    lampAnchors.push({ x, y: 3.2, z: z + overZ * 0.85, base });
  }
  return lamp;
}

function skylineTex() {
  // Clean layered silhouettes: hills, then blocky downtown, no palm clutter.
  const tex = canvasTex(1280, 220, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    function band(amp, baseY, fill, phase) {
      g.fillStyle = fill;
      g.beginPath();
      g.moveTo(0, h);
      g.lineTo(0, baseY);
      for (let x = 0; x <= w; x += 10) {
        g.lineTo(x, baseY - Math.sin((x / w) * Math.PI * 1.1 + phase) * amp);
      }
      g.lineTo(w, h);
      g.closePath();
      g.fill();
    }
    band(10, 70, "#2a3348", 0.2);
    band(8, 100, "#1a2234", 1.1);
    band(5, 128, "#121820", 0.5);
    const cityBase = 168;
    g.fillStyle = "#0e121a";
    g.fillRect(0, cityBase, w, h - cityBase);
    for (let i = 0; i < 18; i++) {
      const x = 20 + i * 70 + ((i * 11) % 18);
      const bw = 16 + (i % 4) * 7;
      const bh = 22 + ((i * 13) % 48);
      g.fillStyle = i % 3 === 0 ? "#161c28" : "#10161f";
      g.fillRect(x, cityBase - bh, bw, bh);
      if (i % 2 === 0) {
        g.fillStyle = i % 4 === 0 ? "#3a4a28" : "#2a3848";
        for (let n = 0; n < 3; n++) {
          g.fillRect(x + 3 + (n % 2) * 5, cityBase - bh + 5 + n * 8, 2, 2);
        }
      }
    }
  });
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
    new THREE.BoxGeometry(10.4, 6.6, 0.18),
    new THREE.MeshBasicMaterial({ color: 0x1e1830 }),
  );
  back.position.set(0, 3.3, -2.05);
  g.add(back);
  const left = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 6.6, 7.2),
    new THREE.MeshBasicMaterial({ color: 0x1a1428 }),
  );
  left.position.set(-5.1, 3.3, 1.4);
  g.add(left);
  const right = left.clone();
  right.position.x = 5.1;
  g.add(right);
  // Exit door faces the camera on the back wall (left) — clear doorway, not a mystery box.
  const exitX = -2.65;
  const doorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 4.45, 0.18),
    new THREE.MeshLambertMaterial({ color: 0x1a2430 }),
  );
  doorFrame.position.set(exitX, 2.22, -1.95);
  g.add(doorFrame);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.38, 4.05, 0.12),
    new THREE.MeshLambertMaterial({ color: 0x2a4050 }),
  );
  door.position.set(exitX, 2.05, -1.88);
  g.add(door);
  const doorPane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.12, 3.2),
    new THREE.MeshBasicMaterial({ color: 0x143040, side: THREE.DoubleSide }),
  );
  doorPane.position.set(exitX, 2.15, -1.81);
  g.add(doorPane);
  const doorKnob = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xf0c430 }),
  );
  doorKnob.position.set(exitX + 0.48, 1.7, -1.76);
  g.add(doorKnob);
  const exitPlate = neonTex("EXIT", "#3de0ff");
  exitPlate.wrapS = THREE.ClampToEdgeWrapping;
  exitPlate.wrapT = THREE.ClampToEdgeWrapping;
  const exitOnDoor = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 0.6),
    new THREE.MeshBasicMaterial({ map: exitPlate, transparent: true, side: THREE.DoubleSide }),
  );
  exitOnDoor.position.set(exitX, 3.15, -1.77);
  g.add(exitOnDoor);
  const exitSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 0.5),
    new THREE.MeshBasicMaterial({ map: exitPlate, transparent: true, side: THREE.DoubleSide }),
  );
  exitSign.position.set(exitX, 4.55, -1.76);
  g.add(exitSign);
  const exitMat = neonTex("EXIT", "#3de0ff");
  const exitFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.42),
    new THREE.MeshBasicMaterial({ map: exitMat, transparent: true, side: THREE.DoubleSide }),
  );
  exitFloor.rotation.x = -Math.PI / 2;
  exitFloor.position.set(exitX, 0.03, -1.1);
  g.add(exitFloor);
  const ward = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 2.45, 0.7),
    new THREE.MeshLambertMaterial({ color: 0x3a2a18 }),
  );
  ward.position.set(3.55, 1.22, 0.15);
  g.add(ward);
  const wardTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.12, 0.8),
    new THREE.MeshLambertMaterial({ color: 0x2a1e10 }),
  );
  wardTop.position.set(3.55, 2.5, 0.15);
  g.add(wardTop);
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
  const mirrorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(1.12, 1.72, 0.08),
    new THREE.MeshLambertMaterial({ color: 0x1a1420 }),
  );
  mirrorFrame.position.set(2.35, 1.55, -1.96);
  g.add(mirrorFrame);
  // Static glass + soft sheen (no live reflection — avoids flicker while walking).
  const mirror = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 1.55),
    new THREE.MeshBasicMaterial({ color: 0x5a7a90 }),
  );
  mirror.position.set(2.35, 1.55, -1.91);
  g.add(mirror);
  const mirrorSheen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 1.4),
    new THREE.MeshBasicMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  mirrorSheen.position.set(2.05, 1.55, -1.905);
  g.add(mirrorSheen);
  const mirrorSheen2 = new THREE.Mesh(
    new THREE.PlaneGeometry(0.12, 0.9),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, depthWrite: false }),
  );
  mirrorSheen2.position.set(2.55, 1.7, -1.904);
  g.add(mirrorSheen2);
  // Bed on the right wall so the EXIT door path at x≈-2.65 stays clear.
  const bed = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.42, 1.55),
    new THREE.MeshLambertMaterial({ color: 0x1a2438 }),
  );
  bed.position.set(1.55, 0.28, -0.85);
  g.add(bed);
  const pillow = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.14, 0.42),
    new THREE.MeshLambertMaterial({ color: 0xe8d8c8 }),
  );
  pillow.position.set(2.15, 0.58, -0.95);
  g.add(pillow);
  const blanket = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.08, 1.2),
    new THREE.MeshLambertMaterial({ color: 0x2a3048 }),
  );
  blanket.position.set(1.25, 0.52, -0.85);
  g.add(blanket);
  // Bedside lamp on the inner side of the bed — never next to EXIT.
  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.45, 0.18),
    new THREE.MeshBasicMaterial({ color: 0xc4a878 }),
  );
  lamp.position.set(0.45, 0.85, -1.55);
  g.add(lamp);
  const win = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 1.1),
    new THREE.MeshBasicMaterial({ color: 0x1a1028 }),
  );
  win.position.set(0.6, 4.15, -1.94);
  g.add(win);
  const winGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.9),
    new THREE.MeshBasicMaterial({ color: 0x3a2048 }),
  );
  winGlow.position.set(0.6, 4.15, -1.93);
  g.add(winGlow);
  const lampShade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.28, 0.22, 10),
    new THREE.MeshBasicMaterial({ color: 0xffd89a }),
  );
  lampShade.position.set(-0.35, 1.18, -1.55);
  g.add(lampShade);
  const lampGlow = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 16),
    new THREE.MeshBasicMaterial({ color: 0xffe2b8, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }),
  );
  lampGlow.position.set(-0.35, 1.15, -1.35);
  g.add(lampGlow);
  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(18, 0.5, 18),
    new THREE.MeshBasicMaterial({ color: 0x0c0a12 }),
  );
  ceiling.position.set(0, 6.7, 2);
  g.add(ceiling);
  // Fill outside the room so zoom never shows whitish ceiling seams / skyline.
  const voidFill = new THREE.Mesh(
    new THREE.BoxGeometry(60, 60, 2),
    new THREE.MeshBasicMaterial({ color: 0x07060c }),
  );
  voidFill.position.set(0, 2, -5.2);
  g.add(voidFill);
  const voidTop = new THREE.Mesh(
    new THREE.BoxGeometry(60, 2, 40),
    new THREE.MeshBasicMaterial({ color: 0x07060c }),
  );
  voidTop.position.set(0, 9.2, 0);
  g.add(voidTop);
  const voidBot = new THREE.Mesh(
    new THREE.BoxGeometry(60, 2, 40),
    new THREE.MeshBasicMaterial({ color: 0x07060c }),
  );
  voidBot.position.set(0, -1.2, 0);
  g.add(voidBot);
  const cribAmb = new THREE.AmbientLight(0xffe6c4, 1.15);
  g.add(cribAmb);
  const cribHemi = new THREE.HemisphereLight(0xffe8d0, 0x4a3020, 0.85);
  g.add(cribHemi);
  const cribLight = new THREE.PointLight(0xffe2b8, 2.6, 16, 1.4);
  cribLight.position.set(0.2, 4.4, 1.6);
  g.add(cribLight);
  const bedLamp = new THREE.PointLight(0xffcc88, 2.2, 8, 1.3);
  bedLamp.position.set(0.45, 1.45, -1.1);
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
  // Cap DPR at 2 — 3x + lots of lights froze iPhone standalone.
  renderer.setPixelRatio(Math.max(1, Math.min(2, window.devicePixelRatio || 1)));
  renderer.setClearColor(0x0c1428, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x101628, 0.014);
  scene.background = new THREE.Color(0x0c1428);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 180);
  camera.far = 240;
  camera.position.set(0, 4.6, 11.5);

  // Slightly brighter ambient than v101 — pools are MeshBasic, not GPU lights.
  const amb = new THREE.AmbientLight(0x2a1838, 0.48);
  scene.add(amb);
  const hemi = new THREE.HemisphereLight(0x446688, 0x1a1018, 0.48);
  scene.add(hemi);
  const moonLight = new THREE.DirectionalLight(0xc8d8ff, 0.32);
  moonLight.position.set(-8, 18, 8);
  scene.add(moonLight);
  const sunLight = new THREE.DirectionalLight(0xfff2d0, 0);
  sunLight.position.set(12, 20, 8);
  scene.add(sunLight);
  const neonFill = new THREE.DirectionalLight(0xe21b7a, 0.25);
  neonFill.position.set(6, 4, 10);
  scene.add(neonFill);

  // Texture aspect matches the sky plane so dots stay round, not stretched lines.
  const STAR_W = 440;
  const STAR_H = 160;
  function paintStars(g, w, h, phase = 0) {
    // Sparse — city light pollution, not a planetarium.
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) {
      const x = ((i * 97 + 23) % (w - 12)) + 6;
      const y = ((i * 53 + 17) % (h - 28)) + 10;
      const tw = 0.35 + 0.35 * Math.abs(Math.sin(phase * 2.1 + i * 1.1));
      const r = i % 6 === 0 ? 1.6 : 1.1;
      g.fillStyle = `rgba(220,230,255,${(0.35 * tw).toFixed(2)})`;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  }
  const STAR_FRAMES = 5;
  const STAR_TEX = [];
  for (let i = 0; i < STAR_FRAMES; i++) {
    const tex = canvasTex(STAR_W, STAR_H, (g, w, h) => paintStars(g, w, h, i / STAR_FRAMES));
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    STAR_TEX.push(tex);
  }
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 80),
    new THREE.MeshBasicMaterial({
      map: STAR_TEX[0], transparent: true, depthWrite: false, depthTest: true, fog: false,
    }),
  );
  sky.position.set(0, 28, -90);
  sky.renderOrder = -20;
  scene.add(sky);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(1.7, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0xf4f0e8, transparent: true, fog: false, depthWrite: false, depthTest: true,
    }),
  );
  moon.position.set(-12, 18, -78);
  moon.renderOrder = -30;
  scene.add(moon);
  const moonGlow = glowSprite("#f4e8c0", 7.5);
  moonGlow.position.copy(moon.position);
  moonGlow.renderOrder = -31;
  moonGlow.material.depthTest = true;
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

  const skylineMap = skylineTex();
  skylineMap.magFilter = THREE.LinearFilter;
  skylineMap.minFilter = THREE.LinearFilter;
  const skylineMat = new THREE.MeshBasicMaterial({
    map: skylineMap,
    transparent: true,
    depthWrite: false,
    fog: false,
    depthTest: true,
    side: THREE.DoubleSide,
  });
  const skyline = new THREE.Mesh(new THREE.PlaneGeometry(260, 11), skylineMat);
  skyline.position.set(0, 5.8, -52);
  skyline.renderOrder = -12;
  skyline.visible = true;
  scene.add(skyline);

  function horizonTex() {
    const tex = canvasTex(1400, 160, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const skyGlow = g.createLinearGradient(0, 0, 0, h);
      skyGlow.addColorStop(0, "rgba(14,18,40,0)");
      skyGlow.addColorStop(0.5, "rgba(22,28,48,0.55)");
      skyGlow.addColorStop(1, "rgba(10,12,18,0.95)");
      g.fillStyle = skyGlow;
      g.fillRect(0, 0, w, h);
      function lowHill(amp, base, fill, phase) {
        g.fillStyle = fill;
        g.beginPath();
        g.moveTo(0, h);
        g.lineTo(0, base);
        for (let x = 0; x <= w; x += 10) {
          g.lineTo(x, base - Math.sin((x / w) * Math.PI * 1.15 + phase) * amp);
        }
        g.lineTo(w, h);
        g.closePath();
        g.fill();
      }
      lowHill(12, 48, "#2a3348", 0.3);
      lowHill(9, 78, "#1a2234", 1.1);
      lowHill(6, 108, "#10161f", 0.4);
    });
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }
  const horizon = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 9),
    new THREE.MeshBasicMaterial({
      map: horizonTex(), transparent: true, depthWrite: false, depthTest: true, fog: false, side: THREE.DoubleSide,
    }),
  );
  horizon.position.set(0, 4.8, -34);
  horizon.renderOrder = -14;
  scene.add(horizon);

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
  hazeBand.position.set(0, 7.2, -30);
  hazeBand.renderOrder = -7;
  hazeBand.visible = true;
  scene.add(hazeBand);
  const farPalms = [];
  for (let i = 0; i < 12; i++) {
    const palm = makePalm();
    palm.visible = false;
    // Distant palms stay smaller than curb/foreground palms (~1.3–1.45).
    palm.scale.setScalar(0.48 + (i % 3) * 0.08);
    scene.add(palm);
    farPalms.push({ mesh: palm, dx: (i - 5.5) * 11.2 + (i % 2) * 2.4, z: -18.5 - (i % 3) * 1.4 });
  }

  const city = new THREE.Group();
  const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(STREET_LEN + 4, 9.2),
    new THREE.MeshLambertMaterial({ map: asphaltTex() }),
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.set(STREET_LEN / 2, 0, 7.55);
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
  // Planting strip / dark green turf between facades and the player sidewalk.
  const grassFarMap = grassTex();
  grassFarMap.repeat.set(48, 2);
  const grassFar = new THREE.Mesh(
    new THREE.PlaneGeometry(STREET_LEN + 4, 2.8),
    new THREE.MeshLambertMaterial({ map: grassFarMap }),
  );
  grassFar.rotation.x = -Math.PI / 2;
  grassFar.position.set(STREET_LEN / 2, 0.035, -0.7);
  city.add(grassFar);
  const alley = new THREE.Mesh(
    new THREE.PlaneGeometry(STREET_LEN + 4, 1.1),
    new THREE.MeshLambertMaterial({ color: 0x1a1820 }),
  );
  alley.rotation.x = -Math.PI / 2;
  alley.position.set(STREET_LEN / 2, 0.03, -1.85);
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
  const curbNear = curb.clone();
  curbNear.position.z = 12.15;
  city.add(curbNear);
  const curbNearShadow = curbShadow.clone();
  curbNearShadow.position.z = 11.92;
  city.add(curbNearShadow);

  // Near-camera sidewalk (across the street) — match player-side depth so it doesn't read thin.
  const walkNear = new THREE.Mesh(
    new THREE.PlaneGeometry(STREET_LEN + 4, 3.2),
    new THREE.MeshLambertMaterial({ map: sidewalkTex() }),
  );
  walkNear.rotation.x = -Math.PI / 2;
  // Sit just past the near curb so the strip reads above the translucent pad.
  walkNear.position.set(STREET_LEN / 2, 0.04, 13.1);
  walkNear.material.map.repeat.set(160, 1);
  city.add(walkNear);
  const grassNearMap = grassTex();
  grassNearMap.repeat.set(48, 3);
  const grassNear = new THREE.Mesh(
    new THREE.PlaneGeometry(STREET_LEN + 4, 2.8),
    // Lambert so street lights lift turf; stays dark in open night.
    new THREE.MeshLambertMaterial({ map: grassNearMap }),
  );
  grassNear.rotation.x = -Math.PI / 2;
  grassNear.position.set(STREET_LEN / 2, 0.05, 14.85);
  city.add(grassNear);
  // Dark-green hedges — MeshLambert so lamp pools read on them.
  const bushHex = ["#1a3220", "#243c28", "#16301c", "#2a4430"];
  const bushMats = bushHex.map((hex) => new THREE.MeshLambertMaterial({ map: bushTex(hex) }));
  for (let i = 0; i < 40; i++) {
    const bw = 1.2 + (i % 4) * 0.35;
    const bd = 0.85 + (i % 3) * 0.25;
    const bh = 0.55 + (i % 5) * 0.22;
    const bush = new THREE.Mesh(
      new THREE.BoxGeometry(bw, bh, bd),
      bushMats[i % bushMats.length],
    );
    bush.position.set(
      (i + 0.35) * (STREET_LEN / 40) + (i % 2) * 0.35,
      bh * 0.5,
      14.35 + (i % 3) * 0.35,
    );
    city.add(bush);
  }
  for (let i = 0; i < 12; i++) {
    const nearPalm = makePalm();
    nearPalm.position.set(
      (i + 0.5) * (STREET_LEN / 12) + (i % 2) * 1.1,
      0,
      // On the grass strip past the near sidewalk — not planted in the walk.
      15.15 + (i % 2) * 0.25,
    );
    nearPalm.scale.setScalar(1.05 + (i % 3) * 0.1);
    city.add(nearPalm);
  }

  // Void fill behind the camera.
  const nearRoofs = new THREE.Mesh(
    new THREE.PlaneGeometry(STREET_LEN + 4, 6.4),
    new THREE.MeshLambertMaterial({ color: 0x1a1622 }),
  );
  nearRoofs.rotation.x = -Math.PI / 2;
  nearRoofs.position.set(STREET_LEN / 2, -0.4, 19.8);
  city.add(nearRoofs);
  const roofColors = [0x2a2234, 0x241c2c, 0x302838, 0x1e1828, 0x282030];
  for (let i = 0; i < 28; i++) {
    const w = 6.5 + (i % 5) * 1.4;
    const d = 3.2 + (i % 3) * 0.9;
    const h = 0.55 + (i % 4) * 0.35;
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color: roofColors[i % roofColors.length] }),
    );
    roof.position.set(
      (i + 0.5) * (STREET_LEN / 28),
      h * 0.5 - 0.35,
      19.4 + (i % 2) * 1.6,
    );
    city.add(roof);
  }

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
  const stuccoCache = new Map();
  function brick(col) {
    if (!brickCache.has(col)) brickCache.set(col, brickTex(col, "#2a2030"));
    return brickCache.get(col);
  }
  function stucco(col) {
    if (!stuccoCache.has(col)) stuccoCache.set(col, stuccoTex(col));
    return stuccoCache.get(col);
  }
  function facadeFor(theme, i, col) {
    // Mix brick + stucco so blocks don't read as flat black slabs.
    if (theme.id === "motel" || theme.id === "studio") return stucco(col);
    if (i % 3 === 2) return stucco(col);
    return brick(col);
  }

  const THEMES = [
    { id: "liquor", neon: ["LIQUOR", "#e21b7a"], cols: ["#7a5a58", "#6a4a48", "#5a3e40"] },
    { id: "motel", neon: ["MOTEL", "#3de0ff"], cols: ["#6a5a70", "#5a6a68", "#7a4050"] },
    { id: "studio", neon: ["STUDIO", "#f0c430"], cols: ["#9a8a68", "#6a4a48", "#5a4a58"], graf: true },
    { id: "taco", neon: ["TACOS", "#f0c430"], cols: ["#8a4a30", "#6a3a28", "#4a5a40"] },
    { id: "gas", neon: ["GAS", "#e21b7a"], cols: ["#4a5868", "#5a4e58", "#6a5a58"] },
    { id: "park", neon: ["PARK", "#3de0ff"], cols: ["#3a5a48", "#4a4a38", "#3a4850"], park: true },
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

  function addNeon(text, color, x, y, z, lit = false, size = null) {
    const tex = neonTex(text, color);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    const w = size?.w || 3.6;
    const h = size?.h || 0.9;
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
    );
    sign.position.set(x, y, z);
    city.add(sign);
    // Glow tracks sign size so compact facade neons don't float a huge aura above the roof.
    const glow = glowSprite(color, Math.max(w * 1.05, h * 3.2));
    glow.position.set(x, y, z + 0.05);
    city.add(glow);
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
    // Keep short liquor/motel props from crowding the tall crib at HOME.
    const homeWX = gameToWorldX(HOME_X);
    if (Math.abs(x - homeWX) < 14) return;
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
      // Neon sits on the liquor facade, not floating above it.
      addNeon("LIQUOR", "#e21b7a", x, 3.55, -0.48, true);
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

  function facadeBlocked(cx, w, xOff, theme) {
    const homeWX = gameToWorldX(HOME_X);
    if (Math.abs(cx - homeWX) < (w + 4.4) / 2 + 0.45) return true;
    const shopWX = gameToWorldX(SHOP_X);
    if (Math.abs(cx - shopWX) < (w + 2.8) / 2 + 0.35) return true;
    if (theme.id === "liquor") {
      const lx = xOff + 26;
      if (Math.abs(cx - lx) < (w + 5.8) / 2 + 0.35) return true;
    }
    if (theme.id === "motel") {
      const mx = xOff + 27;
      if (Math.abs(cx - mx) < (w + 16.5) / 2 + 0.2) return true;
    }
    return false;
  }

  function stampTheme(theme, xOff, lit) {
    const layout = facadeLayout;
    for (let i = 0; i < layout.length; i++) {
      const b = layout[i];
      const col = theme.cols[i % theme.cols.length];
      const h = theme.park ? Math.min(b.h, 3.4) : theme.id === "motel" ? Math.min(b.h, 3.6) : b.h;
      const blocked = facadeBlocked(b.x + xOff, b.w, xOff, theme);
      const face = facadeFor(theme, i, col);
      if (blocked) {
        const distant = makeBuilding(b.w * 0.7, 2.8, 1.3, face, { door: false });
        distant.position.set(b.x + xOff, 0, -10.4);
        city.add(distant);
        continue;
      }
      const back = makeBuilding(b.w * 0.88, Math.max(3.0, h * 0.78), 1.5, face, { door: false });
      back.position.set(b.x + xOff, 0, -8.2);
      city.add(back);
      const mesh = makeBuilding(b.w, h, b.d, face, { door: true });
      mesh.position.set(b.x + xOff, 0, -3.4);
      city.add(mesh);
    }
    stampLandmark(theme, xOff);
    // Liquor neon is attached on the prop in stampLandmark; others sit on facade height.
    if (theme.id !== "liquor") {
      const neonY = theme.park ? 3.8 : theme.id === "motel" ? 3.55 : Math.min(4.6, 3.2 + (theme.id === "gas" ? 0.2 : 0.8));
      addNeon(theme.neon[0], theme.neon[1], 24.4 + xOff, neonY, -2.15, lit);
    }
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
    // Planting strip behind the sidewalk (not mid-walk concrete).
    const homeWX = gameToWorldX(HOME_X);
    const palms = [[5.2, -0.35], [12.4, -0.28], [19.6, -0.35], [33.8, -0.28], [42.2, -0.35]];
    for (const [x, z] of palms) {
      const px = x + xOff;
      if (Math.abs(px - homeWX) < 9.5) continue;
      const palm = makePalm();
      palm.position.set(px, 0, z);
      palm.scale.setScalar(1.28 + (px % 3) * 0.04);
      city.add(palm);
    }
  }
  const blockCount = Math.round(STREET_LEN / BLOCK_LEN);
  const lampAnchors = [];
  for (let i = 0; i < blockCount; i++) {
    stampTheme(THEMES[i % THEMES.length], i * BLOCK_LEN, i === 0);
  }
  // ~2× poles, even both curbs; still only 4 shared PointLights (perf-safe).
  const lampStep = BLOCK_LEN / 2;
  const homeWXLamps = gameToWorldX(HOME_X);
  for (let i = 0; i < blockCount * 2; i++) {
    const xFar = (i + 0.2) * lampStep;
    const xNear = (i + 0.7) * lampStep;
    // Keep poles off the crib door / stoop.
    if (Math.abs(xFar - homeWXLamps) > 7.5) {
      addStreetLamp(city, xFar, 1.05, 1.35, lampAnchors, 1.35);
    }
    if (Math.abs(xNear - homeWXLamps) > 7.5) {
      addStreetLamp(city, xNear, 12.35, -1.2, lampAnchors, 1.2);
    }
  }
  const homeWXCurb = gameToWorldX(HOME_X);
  for (let i = 0; i < blockCount * 2; i++) {
    const px = (i + 0.42) * (BLOCK_LEN / 2);
    // Keep palm fronds clear of the crib facade.
    if (Math.abs(px - homeWXCurb) < 10) continue;
    const curbPalm = makePalm();
    curbPalm.position.set(px, 0, -0.32);
    curbPalm.scale.setScalar(1.45 + (i % 3) * 0.05);
    city.add(curbPalm);
  }

  // Keep the box inside the lane asphalt — do not eat the far/near sidewalk curbs.
  const INTER_Z = 7.55;
  const INTER_DEPTH = 5.8;
  const interMat = new THREE.MeshLambertMaterial({ map: asphaltTex() });
  interMat.map.repeat.set(4, 3);
  const stopMat = new THREE.MeshBasicMaterial({ color: 0xf4f0e8 });
  const crossMat = new THREE.MeshLambertMaterial({ map: asphaltTex() });
  crossMat.map.repeat.set(2, 6);
  for (let i = 0; i < blockCount; i++) {
    const x = i * BLOCK_LEN;
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(INTER_METERS, 0.05, INTER_DEPTH),
      interMat,
    );
    box.position.set(x, 0.07, INTER_Z);
    city.add(box);
    // Visual cross-street stub (four-way read; freemove turns still later).
    const cross = new THREE.Mesh(
      new THREE.BoxGeometry(INTER_METERS * 0.72, 0.045, 13.6),
      crossMat,
    );
    cross.position.set(x, 0.055, INTER_Z);
    city.add(cross);
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
    // Crosswalk bars on the near approach.
    for (let k = 0; k < 5; k++) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.055, 2.4),
        stopMat,
      );
      bar.position.set(x - 1.4 + k * 0.7, 0.11, INTER_Z + INTER_DEPTH * 0.28);
      city.add(bar);
    }
  }
  function makeSafeHouse() {
    // Warm stucco crib set back from the curb — not a cyan slab eating the sidewalk.
    const g = new THREE.Group();
    const houseH = 9.4;
    const doorH = 2.85;
    const face = stuccoTex("#7a6a58");
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, houseH, 3.0),
      new THREE.MeshLambertMaterial({ map: face }),
    );
    body.position.y = houseH / 2;
    g.add(body);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(5.8, 0.38, 3.45),
      new THREE.MeshLambertMaterial({ color: 0x2a2220 }),
    );
    roof.position.y = houseH + 0.18;
    g.add(roof);
    const doorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, doorH + 0.22, 0.12),
      new THREE.MeshLambertMaterial({ color: 0x3a2a22 }),
    );
    doorFrame.position.set(0, doorH / 2 + 0.04, 1.52);
    g.add(doorFrame);
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1.28, doorH, 0.08),
      new THREE.MeshLambertMaterial({ color: 0x4a3228 }),
    );
    door.position.set(0, doorH / 2, 1.58);
    g.add(door);
    const knob = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.08),
      new THREE.MeshLambertMaterial({ color: 0xc8a060 }),
    );
    knob.position.set(0.42, doorH * 0.5, 1.64);
    g.add(knob);
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.05),
      new THREE.MeshBasicMaterial({ color: 0xf0c430, side: THREE.DoubleSide }),
    );
    pane.name = "homePane";
    pane.position.set(1.55, 6.4, 1.52);
    g.add(pane);
    const pane2 = pane.clone();
    pane2.name = "homePane2";
    pane2.position.set(-1.55, 6.4, 1.52);
    g.add(pane2);
    const stoop = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.16, 0.85),
      new THREE.MeshLambertMaterial({ color: 0x4a4238 }),
    );
    stoop.position.set(0, 0.08, 1.95);
    g.add(stoop);
    return g;
  }
  const homeHouse = makeSafeHouse();
  // Behind planting strip / alley so the facade doesn't poke over the sidewalk.
  homeHouse.position.set(gameToWorldX(HOME_X), 0, -2.55);
  city.add(homeHouse);
  // Small roof sign — not a floating cyan flood in front of the door.
  addNeon("HOME", "#f0c430", gameToWorldX(HOME_X), 9.85, -1.05, true, { w: 2.8, h: 0.55 });
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
  // Seat on the awning shelf (y≈2.42): compact plane whose bottom rests on the ledge.
  addNeon("SHOP", "#3de0ff", gameToWorldX(SHOP_X), 2.55, 0.78, true, { w: 2.4, h: 0.36 });

  const dump = makeDumpsterMesh();
  dump.position.set(gameToWorldX(DUMPSTER_X), 0, -0.45);
  city.add(dump);

  function stripLights(root) {
    const kill = [];
    root.traverse((o) => {
      if (o.isPointLight || o.isSpotLight) kill.push(o);
    });
    for (const light of kill) light.parent?.remove(light);
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
  // At most 4 warm fills — repositioned to nearest lamp anchors each frame.
  // Short range + soft falloff so they read as cobra pools, not stadium floods.
  const lampLights = [];
  for (let i = 0; i < 4; i++) {
    const pl = new THREE.PointLight(0xffe2a0, 0, 9.5, 2.1);
    pl.userData.streetLamp = true;
    scene.add(pl);
    lampLights.push(pl);
  }
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
    new THREE.CylinderGeometry(0.05, 0.05, 0.55, 6),
    new THREE.MeshBasicMaterial({ color: 0x3de0ff }),
  );
  markStem.position.y = 0.34;
  carMarker.add(markStem);
  const markHead = new THREE.Mesh(
    new THREE.ConeGeometry(0.38, 0.62, 4),
    new THREE.MeshBasicMaterial({ color: 0x3de0ff }),
  );
  markHead.rotation.x = Math.PI;
  markHead.position.y = -0.12;
  carMarker.add(markHead);
  carMarker.scale.setScalar(1.55);
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
  stashLabel.scale.set(2.55, 0.62, 1);
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
  let carCamNow = 0;
  let camV = 0;
  let lookAim = 0;
  let lookAimV = 0;

  // Classic PNG billboard: origin at plane bottom. ~3px empty under soles in 40px sheet.
  const PLAYER_H = 2.85;
  // Was 7/40 (too deep) — soles buried into the curb. Match the empty pad only.
  const FOOT_PAD_FRAC = 3 / 40;
  const playerSprite = makeBillboard(sprites.idle[0], PLAYER_H);
  playerSprite.userData.footPad = PLAYER_H * FOOT_PAD_FRAC;
  playerSprite.material.depthTest = true;
  playerSprite.material.depthWrite = false;
  playerSprite.renderOrder = 46;
  scene.add(playerSprite);
  const packHeld = makeBillboard(sprites.pack, 0.45);
  packHeld.visible = false;
  scene.add(packHeld);

  const foePool = [];
  const lootPool = [];
  const shotPool = [];
  const boomPool = [];
  const bitPool = [];
  const shadowGeo = new THREE.CircleGeometry(0.36, 14);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0.95,
    depthWrite: false, depthTest: false,
  });
  const playerShadow = new THREE.Mesh(shadowGeo, shadowMat);
  playerShadow.rotation.x = -Math.PI / 2;
  playerShadow.position.y = 0.06;
  playerShadow.scale.set(1.1, 1, 0.45);
  playerShadow.renderOrder = 8;
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
    const vv = window.visualViewport;
    const w = Math.max(1, parent.clientWidth || Math.round(vv?.width || window.innerWidth));
    const h = Math.max(1, parent.clientHeight || Math.round(vv?.height || window.innerHeight));
    // Cap at 2 — iPhone 3x + scene cost was freezing standalone after v101 lights.
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
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
    // Board pose stays on boardU; camera eases separately so enter/exit never snaps.
    const carCamWant = state.inCar
      ? (boardU * boardU * (3 - 2 * boardU))
      : ((1 - boardU) * (1 - boardU) * (3 - 2 * (1 - boardU)));
    if (stepDt > 0) {
      carCamNow += (carCamWant - carCamNow) * (1 - Math.exp(-stepDt / 0.42));
    } else {
      carCamNow += (carCamWant - carCamNow) * 0.2;
    }
    const carCam = carCamNow;
    const wantZoom = Math.max(CAM_ZOOM_MIN, Math.min(CAM_ZOOM_MAX, Number(state.camZoom) || CAM_ZOOM_MED));
    const zoomFollow = Math.min(1, stepDt * 18);
    zoomMulNow += (wantZoom - zoomMulNow) * (zoomFollow || 1);
    const zoomMul = zoomMulNow;
    const inCrib = !!state.inCrib;
    strip.visible = !inCrib;
    cribRoom.visible = inCrib;
    if (scene.fog) scene.fog.density = inCrib ? 0.001 : 0.016;
    amb.intensity = inCrib ? 1.25 : 0.48;
    amb.color.setHex(inCrib ? 0xffe6c8 : 0x1a1028);
    hemi.intensity = inCrib ? 0.9 : 0.38;
    const camZ = ((portrait ? 15.8 : 14.2) + carCam * 0.55) * zoomMul;
    // Keep on-foot cam lower so billboard soles don't read as floating above the curb.
    const camY = ((portrait ? 2.55 : 2.78) + carCam * 0.28) * (0.92 + zoomMul * 0.08);
    // Hold camera lead on old facing through the whole turnaround — flip after.
    const turningNow = !state.inCar && (p.turnT || 0) > 0 && p.turnFrom != null;
    const wantFace = turningNow
      ? (p.turnFrom < 0 ? -1 : 1)
      : (p.facing < 0 ? -1 : 1);
    const LOOK_FACE_T = turningNow ? 1.15 : 0.95;
    if (stepDt > 0) {
      lookFace += (wantFace - lookFace) * (1 - Math.exp(-stepDt / LOOK_FACE_T));
    }
    if (playing && inCrib) {
      const cx = Number(state.cribX) || 0;
      // Full CAM_ZOOM range: min = closer, max = pulled back so the whole room fits.
      const cribZoom = Math.max(CAM_ZOOM_MIN, Math.min(CAM_ZOOM_MAX, zoomMul));
      const t = (cribZoom - CAM_ZOOM_MIN) / Math.max(0.001, CAM_ZOOM_MAX - CAM_ZOOM_MIN);
      const cribCamY = 2.05 + t * 1.55;
      const cribCamZ = 9.2 + t * 8.6;
      camera.position.set(cx * 0.2, cribCamY, cribCamZ);
      tmp.set(cx * 0.35, 1.7, 0.2);
      camera.lookAt(tmp);
      camera.rotation.z = 0;
      camera.far = 48;
    } else if (playing) {
      const dampDt = Math.min(1 / 30, Math.max(0, stepDt));
      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(0.01, camera.aspect));
      const dist = Math.max(0.8, camZ - 2.15);
      const halfWorld = dist * Math.tan(hFov / 2);
      const trail = state.inCar ? (portrait ? 0.34 : 0.38) : (portrait ? 0.42 : 0.44);
      const leadWorld = Math.min(halfWorld * 0.72, (0.5 - trail) * 2 * halfWorld);
      // Continuous lookFace (−1…1) swings the lead smoothly instead of flipping at 0.
      const faceLead = lookFace;
      const carW = nearestWorldX(px, camX);
      let targetCam = wrap(carW + faceLead * leadWorld, STREET_LEN);
      const err = wrapDelta(camX, targetCam, STREET_LEN);
      // Only hard-teleport on huge wraps (respawn); never on a normal turnaround (~2× lead).
      if (Math.abs(err) > halfWorld * 3.6) {
        camX = targetCam;
        camV = 0;
      } else if (dampDt > 0) {
        // Softer spring while face is still easing (~0.6–0.9s settle).
        const faceEase = Math.abs(wantFace - lookFace);
        const freq = (state.inCar ? 1.15 : 1.55) * (faceEase > 0.08 ? 0.72 : 1);
        const omega = 2 * Math.PI * freq;
        const accX = omega * omega * err - 2 * omega * camV;
        camV += accX * dampDt;
        camX = wrap(camX + camV * dampDt, STREET_LEN);
      }
      const lookLeadWant = (state.inCar ? (portrait ? 0.85 : 1.45) : 0.35) * Math.max(0.15, Math.abs(faceLead));
      if (dampDt > 0) {
        const o2 = 2 * Math.PI * 1.6;
        const lErr = lookLeadWant - lookAim;
        lookAimV += (o2 * o2 * lErr - 2 * o2 * lookAimV) * dampDt;
        lookAim += lookAimV * dampDt;
      }
      camera.position.set(camX, camY + gameToWorldY(p.y) * 0.12, camZ);
      const lookY = state.inCar ? 1.22 : 0.92;
      const lookFaceSign = faceLead === 0 ? wantFace : Math.sign(faceLead);
      tmp.set(camX + lookFaceSign * lookAim, lookY + gameToWorldY(p.y) * 0.18, 2.15 + carCam * 1.65);
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
        glow.material.opacity = on ? 0.92 : 0;
        if (glow.userData.baseScale == null) {
          glow.userData.baseScale = glow.scale.x || 1;
        }
        if (on) glow.scale.setScalar(glow.userData.baseScale * 1.2);
      }
      if (bar) bar.material.color.setHex(on ? 0xfff6c8 : 0x6a7080);
      const beam = mesh.getObjectByName("headBeam");
      if (beam) beam.visible = on;
    }

    moon.position.set(camX - 2.2, 16.2, -48);
    moonGlow.position.copy(moon.position);
    moon.visible = !inCrib;
    moonGlow.visible = !inCrib;
    skyline.position.set(camX, 5.8, -52);
    skyline.visible = !inCrib;
    horizon.position.set(camX, 4.8, -34);
    horizon.visible = !inCrib;
    if (!inCrib) camera.far = 240;
    hazeBand.position.set(camX, 7.2, -34);
    hazeBand.visible = !inCrib;
    sky.position.set(camX, 28, -90);
    {
      const si = Math.floor((performance.now() / 420) % STAR_FRAMES);
      if (sky.material.map !== STAR_TEX[si]) {
        sky.material.map = STAR_TEX[si];
        sky.material.needsUpdate = true;
      }
    }
    dtla.position.set(camX + 0.8, 0, -36);
    for (const t of dtla.children) {
      t.position.x = t.userData.dx || 0;
      t.position.z = 0;
    }
    const swayT = performance.now() / 1000;
    function swayPalm(o, amp = 1) {
      // Slow few-degree breeze via frame swap — no group pendulum rotation.
      const s = Math.sin(swayT * 0.48 + (o.userData.palmPhase || 0));
      o.rotation.z = 0;
      const spr = o.getObjectByName?.("palmSpr") || o.children[0];
      if (spr?.material) {
        const u = (s * amp * 0.42 + 1) * 0.5;
        const i = Math.max(0, Math.min(PALM_FRAMES - 1, Math.round(u * (PALM_FRAMES - 1))));
        if (spr.material.map !== PALM_TEX[i]) {
          spr.material.map = PALM_TEX[i];
          spr.material.needsUpdate = true;
        }
      }
    }
    strip.traverse((o) => {
      if (o.userData?.palm) swayPalm(o, 1);
    });
    for (const fp of farPalms) {
      fp.mesh.visible = !inCrib;
      fp.mesh.position.set(camX + fp.dx, 0, fp.z);
      swayPalm(fp.mesh, 0.85);
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
      hemi.intensity = (skyInfo.sun > 0.35 ? 0.7 : 0.42) + skyInfo.light * 0.45;
      hemi.color.setHex(skyInfo.sun > 0.35 ? 0xc8e0f8 : skyInfo.top);
      moonLight.intensity = skyInfo.moon * 0.45;
      moonLight.color.setHex(0xe8f0ff);
      moonLight.position.set(camX - 8, 18, 8);
      sunLight.intensity = skyInfo.sun * 1.45;
      sunLight.color.setHex(skyInfo.sun > 0.7 ? 0xfff4d8 : 0xffa060);
      sunLight.position.set(camX + 12, 8 + skyInfo.sun * 14, 8);
      amb.intensity = skyInfo.sun > 0.35
        ? 0.7 + skyInfo.light * 0.55
        : 0.4 + skyInfo.light * 0.18;
      amb.color.setHex(skyInfo.sun > 0.4 ? 0xb0c8e0 : 0x2a1838);
      neonFill.intensity = 0.08 + skyInfo.star * 0.2;
      const litWin = skyInfo.windows > 0.32;
      winMat.map = litWin ? WIN_LIT : WIN_DIM;
      winMatFar.map = litWin ? WIN_LIT : WIN_DIM;
      if (homePane) homePane.material.color.setHex(litWin ? 0xf0c430 : 0x1a1424);
      lampHeadMat.color.setHex(skyInfo.lamps > 0.35 ? 0xf0c430 : 0x2a2430);
      lampGlowMat.opacity = skyInfo.lamps > 0.35 ? 0.14 + skyInfo.lamps * 0.28 : 0;
      // Park 4 PointLights on the nearest anchors — never one light per pole.
      const onLamps = skyInfo.lamps > 0.35;
      if (onLamps && lampAnchors.length) {
        const best = [];
        for (let i = 0; i < lampAnchors.length; i++) {
          const a = lampAnchors[i];
          const d = Math.abs(wrapDelta(a.x, camX, STREET_LEN));
          if (d > 36) continue;
          if (best.length < lampLights.length) {
            best.push({ a, d });
            best.sort((u, v) => u.d - v.d);
          } else if (d < best[best.length - 1].d) {
            best[best.length - 1] = { a, d };
            best.sort((u, v) => u.d - v.d);
          }
        }
        for (let i = 0; i < lampLights.length; i++) {
          const pl = lampLights[i];
          const hit = best[i];
          if (!hit) { pl.intensity = 0; continue; }
          pl.position.set(hit.a.x, hit.a.y, hit.a.z);
          pl.intensity = hit.a.base * (0.55 + skyInfo.lamps * 0.32);
        }
      } else {
        for (const pl of lampLights) pl.intensity = 0;
      }
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
    const sidewalkZ = 1.15;
    const enter = boarding && state.inCar;
    const leave = boarding && !state.inCar;
    const turning = !boarding && !airborne && (p.turnT || 0) > 0;
    // Hold walk cycle during turn — flipping mid-stride after a turnaround stutters.
    const walking = spd > 3 && !boarding && !state.inCar && !turning;
    const running = walking && !!(state.runHeld);
    let boardPose = null;
    if (enter) {
      if (boardU < 0.30) boardPose = "walk";
      else if (boardU < 0.52) boardPose = "turn";
      else boardPose = "sit";
    } else if (leave) {
      if (boardU < 0.22) boardPose = "sit";
      else if (boardU < 0.50) boardPose = "turn";
      else boardPose = "walk";
    }
    const animSet = state.muzzle > 0 ? fit.shoot
      : airborne ? fit.jump
      : boardPose === "sit" && fit.sit ? fit.sit
      : boardPose === "turn" && fit.turn ? fit.turn
      : boardPose === "walk" && fit.walk ? fit.walk
      : turning && fit.turn ? fit.turn
      : running && fit.run ? fit.run
      : walking ? fit.walk
      : fit.idle;
    const nWalk = (animSet && animSet.length) || 8;
    const rate = state.muzzle > 0 ? 14
      : airborne ? 8
      : boardPose === "sit" ? 4
      : boardPose === "turn" ? 6
      : boardPose === "walk" ? nWalk
      : turning ? 5
      : running ? nWalk
      : walking ? nWalk
      : 3;
    // Hold old facing for the entire turn — flip only after turnT hits 0.
    const sprFace = turning && p.turnFrom != null
      ? (p.turnFrom < 0 ? -1 : 1)
      : (p.facing < 0 ? -1 : 1);
    const carZ = 4.95 + (state.car?.lat || 0);
    const carYaw = Number.isFinite(state.car?.yaw)
      ? state.car.yaw
      : ((state.car?.facing || 1) < 0 ? Math.PI : 0);
    // Driver door is the car's left side (local -Z), not the side facing the camera.
    const driverOut = Math.cos(carYaw) >= 0 ? -1 : 1;
    const doorStandZ = carZ + driverOut * 1.05;
    const seatZ = carZ + driverOut * 0.2;
    const ease = (t) => {
      const u = Math.max(0, Math.min(1, t));
      return u * u * (3 - 2 * u);
    };
    let boardZ = sidewalkZ;
    if (enter) {
      if (boardU < 0.30) boardZ = sidewalkZ;
      else if (boardU < 0.58) {
        const t = ease((boardU - 0.30) / 0.28);
        boardZ = sidewalkZ + (doorStandZ - sidewalkZ) * t;
      } else {
        const t = ease(Math.min(1, (boardU - 0.58) / 0.22));
        boardZ = doorStandZ + (seatZ - doorStandZ) * t;
      }
    } else if (leave) {
      if (boardU < 0.20) boardZ = seatZ;
      else if (boardU < 0.55) {
        const t = ease((boardU - 0.20) / 0.35);
        boardZ = seatZ + (doorStandZ - seatZ) * t;
      } else {
        const t = ease(Math.min(1, (boardU - 0.55) / 0.45));
        boardZ = doorStandZ + (sidewalkZ - doorStandZ) * t;
      }
    }
    const views = sprites.heroViews;
    // Painted hero only when views load — turning/muzzle/jump must not flicker to NES sheets.
    const loco = !!(walking || running || boardPose === "walk");
    if (views?.side) {
      if (loco && (views.walk?.length || views.run?.length)) {
        const frames = (running && views.run?.length) ? views.run : (views.walk || views.run);
        const phase = p.stride || 0;
        const cycle = running ? RUN_STRIDE_CYCLE : STRIDE_CYCLE;
        const frameRate = frames.length / Math.max(1, cycle);
        setBillboardFrame(playerSprite, frameAt(frames, phase, frameRate), sprFace);
      } else if (turning || airborne || state.muzzle > 0) {
        setBillboardFrame(playerSprite, views.side, sprFace);
      } else {
        const viewX = inCrib ? (Number(state.cribX) || 0) : nearestWorldX(px, camX);
        const viewZ = inCrib ? 1.45 : boardZ;
        const dx = camera.position.x - viewX;
        const dz = camera.position.z - viewZ;
        const fx = sprFace < 0 ? -1 : 1;
        const camForward = fx * dx;
        const camRight = fx * dz;
        const ang = Math.abs(Math.atan2(camRight, camForward));
        let viewName = "side";
        if (ang < 0.6) viewName = "front";
        else if (ang < 1.2) viewName = "front34";
        else if (ang < 1.95) viewName = "side";
        else if (ang < 2.55) viewName = "back34";
        else viewName = "back";
        const flip = viewName === "front" || viewName === "back" ? 1 : (camRight >= 0 ? 1 : -1);
        setBillboardFrame(playerSprite, views[viewName] || views.side, flip);
      }
      playerSprite.material.alphaTest = 0.04;
      playerSprite.userData.footPad = 0.02;
    } else {
      const phase = loco ? (p.stride || 0) : (p.anim || 0);
      const frameRate = loco ? (running ? 1 / 12 : 1 / 17) : rate;
      setBillboardFrame(playerSprite, frameAt(animSet, phase, frameRate), sprFace);
      playerSprite.material.alphaTest = 0.12;
      playerSprite.userData.footPad = (playerSprite.userData.height || PLAYER_H) * FOOT_PAD_FRAC;
    }
    const footZ = inCrib ? 1.45 : boardZ;
    const footPad = playerSprite.userData.footPad
      || (playerSprite.userData.height || PLAYER_H) * FOOT_PAD_FRAC;
    playerSprite.userData.footPad = footPad;
    if (inCrib) {
      playerSprite.visible = true;
      playerSprite.position.set(Number(state.cribX) || 0, 0, footZ);
    } else {
      place(playerSprite, px, GROUND_Y, camX, footZ);
    }
    // Plant soles on the sidewalk/crib floor: sink empty pad (+ foreshortening bias) below y≈0.03.
    const groundY = 0.03 - footPad;
    playerSprite.position.y = groundY;
    // Keep contact shadow glued under the billboard even if depth fights the walk mesh.
    const doorAmt = !boarding ? 0
      : enter
        ? (boardU < 0.26 ? 0
          : boardU < 0.40 ? (boardU - 0.26) / 0.14
          : boardU < 0.80 ? 1
          : Math.max(0, (1 - boardU) / 0.20))
        : (boardU < 0.12 ? boardU / 0.12
          : boardU < 0.70 ? 1
          : Math.max(0, (1 - boardU) / 0.30));
    const carWx = state.car ? nearestWorldX(state.car.x, camX) : playerSprite.position.x;
    const face = state.car?.facing || 1;
    const hingeX = 0.62;
    let nest = 0;
    if (enter) {
      const toDoor = Math.min(1, boardU / 0.30);
      const intoSeat = Math.max(0, Math.min(1, (boardU - 0.52) / 0.30));
      nest = intoSeat;
      if (boardU < 0.30) playerSprite.position.x = carWx + face * (1.4 - 0.72 * toDoor);
      else if (boardU < 0.52) playerSprite.position.x = carWx + face * 0.68;
      else playerSprite.position.x = carWx + face * (0.68 - 0.58 * intoSeat);
      playerSprite.position.y = groundY + intoSeat * 0.08;
    } else if (leave) {
      const rise = Math.min(1, Math.max(0, (boardU - 0.18) / 0.28));
      const out = Math.min(1, Math.max(0, (boardU - 0.22) / 0.55));
      nest = 1 - rise;
      playerSprite.position.x = carWx + face * (hingeX * 0.2 + 1.15 * out);
      playerSprite.position.y = groundY + (1 - rise) * 0.08;
    }
    // No vertical bob — that read as a floating ghost over the curb.
    const doorNear = playerCar.getObjectByName("doorNear");
    const doorFar = playerCar.getObjectByName("doorFar");
    if (doorFar) doorFar.rotation.y = -doorAmt * 1.15;
    if (doorNear) doorNear.rotation.y = 0;
    orientBillboard(playerSprite, camera);
    const baseH = playerSprite.userData.height || 3.05;
    const zBlend = Math.max(0, Math.min(1, (boardZ - sidewalkZ) / Math.max(0.01, doorStandZ - sidewalkZ)));
    const zScale = 1 - zBlend * 0.5;
    const nestScale = zScale * (1 - nest * 0.22);
    playerSprite.scale.x = (playerSprite.userData.baseW || 1) * nestScale;
    playerSprite.scale.y = baseH * nestScale;
    if (enter && boardU > 0.7) {
      const fade = 1 - (boardU - 0.7) / 0.22;
      playerSprite.material.opacity = (blink ? 0.4 : 1) * Math.max(0, fade);
    } else if (leave && boardU < 0.12) {
      playerSprite.material.opacity = (blink ? 0.4 : 1) * (boardU / 0.12);
    }
    playerSprite.material.color.set(p.flash > 0 ? 0xffffff : 0xffffff);
    if (p.flash > 0) playerSprite.material.color.setHex(0xffc8e8);
    else playerSprite.material.color.setHex(0xffffff);
    playerSprite.renderOrder = Math.round(footZ * 40);

    playerShadow.visible = inCrib || !state.inCar || boarding;
    playerShadow.position.x = playerSprite.position.x;
    playerShadow.position.y = inCrib ? 0.05 : 0.06;
    // Bias slightly toward camera so the contact blob sits under foreshortened soles.
    playerShadow.position.z = playerSprite.position.z + 0.28;
    playerShadow.scale.set(1.15, 1, 0.48);
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
      playerCar.renderOrder = Math.round(playerCar.position.z * 40);
      const yaw = Number.isFinite(state.car.yaw) ? state.car.yaw : (state.car.facing < 0 ? Math.PI : 0);
      playerCar.rotation.y = yaw;
      const steer = Number(state.car.steer) || 0;
      const wheelL = playerCar.getObjectByName("wheelFL");
      const wheelR = playerCar.getObjectByName("wheelFR");
      if (wheelL) wheelL.rotation.y = steer;
      if (wheelR) wheelR.rotation.y = steer;
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
      carMarker.position.set(playerCar.position.x, 2.85 + bob, playerCar.position.z);
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
      const kind = ["luxury", "hatch", "suv", "van"].includes(t.kind) ? t.kind : "beater";
      let mesh = trafficPool[ti];
      if (!mesh || mesh.userData.kind !== kind) {
        if (mesh) {
          scene.remove(mesh);
          mesh.traverse((o) => {
            if (o.geometry) o.geometry.dispose?.();
          });
        }
        mesh = makeStreetCar(kind);
        mesh.userData.kind = kind;
        scene.add(mesh);
        trafficPool[ti] = mesh;
      }
      mesh.visible = true;
      ti += 1;
      place(mesh, renderGameX(t, alpha), GROUND_Y, camX, 4.95 + (t.lat ?? restLat(t.facing)));
      mesh.position.y = 0;
      mesh.renderOrder = Math.round(mesh.position.z * 40);
      mesh.rotation.y = t.facing < 0 ? Math.PI : 0;
      const hex = typeof t.color === "string" ? parseInt(String(t.color).slice(1), 16) : (t.color || 0x2a3048);
      const body = mesh.getObjectByName("body");
      if (body?.material?.color) body.material.color.setHex(hex);
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
      buyerSprite.renderOrder = Math.round(1.2 * 40);
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
    // Keep the STASH chip on the set-back crib facade, not mid-sidewalk.
    place(stashLabel, HOME_X, 154, camX, -1.05);
    stashLabel.position.y = 8.6;
    if (state.plugMeet) {
      plugSprite.visible = true;
      const pset = sprites.plug || sprites.buyers[0];
      const pface = wrapDelta(plugX, px, WORLD) >= 0 ? 1 : -1;
      setBillboardFrame(plugSprite, frameAt(pset.wave || pset.idle, buyerT, 7), pface);
      place(plugSprite, plugX, GROUND_Y, camX, 1.2);
      plugSprite.position.y = 0;
      plugSprite.renderOrder = Math.round(1.2 * 40);
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
        // Same billboard height / foot pad as the hero so peds share scale + contact.
        const s = makeBillboard(looks[0]?.walk?.[0] || sprites.idle[0], PLAYER_H);
        s.userData.footPad = PLAYER_H * FOOT_PAD_FRAC;
        scene.add(s);
        const sh = new THREE.Mesh(shadowGeo, shadowMat.clone());
        sh.rotation.x = -Math.PI / 2;
        sh.position.y = 0.06;
        sh.scale.set(1.05, 1, 0.42);
        sh.renderOrder = 8;
        scene.add(sh);
        s.userData.shadow = sh;
        return s;
      }, pedI++);
      const set = looks[ped.look % looks.length] || looks[0];
      const pedSpd = Math.abs(ped.vx || 0);
      const pedMoving = pedSpd > 2 || (ped.pushed || 0) > 0;
      const pedRunning = pedSpd > 22;
      const frames = pedMoving
        ? (pedRunning ? (set.run || set.walk || set.idle) : (set.walk || set.idle))
        : (set.idle || set.walk);
      const nPed = (frames && frames.length) || 8;
      const pedRate = pedMoving ? nPed : 3;
      setBillboardFrame(spr, frameAt(frames, ped.anim || 0, pedRate), ped.facing);
      const pedZ = 1.15 + (ped.lane || 0) + (ped.side || 0);
      const pedPad = spr.userData.footPad || PLAYER_H * FOOT_PAD_FRAC;
      place(spr, ped.x, GROUND_Y, camX, pedZ);
      spr.position.y = 0.03 - pedPad;
      spr.renderOrder = Math.round(pedZ * 40);
      orientBillboard(spr, camera);
      spr.material.color.setHex(0xffffff);
      if (spr.userData.shadow) {
        spr.userData.shadow.visible = true;
        spr.userData.shadow.position.x = spr.position.x;
        spr.userData.shadow.position.y = 0.06;
        spr.userData.shadow.position.z = spr.position.z + 0.28;
        spr.userData.shadow.scale.set(1.05, 1, 0.42);
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
