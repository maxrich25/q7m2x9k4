import * as THREE from "three";
import {
  WORLD, GROUND_Y, STREET_LEN, SHOP_X, DUMPSTER_X, COLORS,
  wrap, wrapDelta, gameToWorldX, gameToWorldY, nearestWorldX,
  BLOCK_LEN, PLUG_X, HOME_X, LIGHT_COUNT, lightGameX, restLat,
} from "./config.js?v=36";
import { makeBillboard, setBillboardFrame, orientBillboard, frameAt } from "./sprites.js?v=36";

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

function glowSprite(color, size) {
  const tex = canvasTex(64, 64, (g, w, h) => {
    const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    grd.addColorStop(0, color);
    grd.addColorStop(0.4, color + "99");
    grd.addColorStop(1, color + "00");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.85,
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(size, size, 1);
  return s;
}

function makePalm() {
  const tex = canvasTex(64, 96, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#6a4430";
    g.fillRect(28, 40, 8, 56);
    g.fillStyle = "#2f8a4a";
    g.beginPath(); g.ellipse(32, 36, 26, 14, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(18, 42, 16, 8, -0.6, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(46, 42, 16, 8, 0.6, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(32, 22, 18, 10, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#3dff7a";
    g.fillRect(20, 30, 4, 3);
    g.fillRect(40, 28, 4, 3);
  });
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.center.set(0.5, 0);
  s.scale.set(2.1, 3.15, 1);
  const g = new THREE.Group();
  g.add(s);
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

function chromeRim(x, z, radius = 0.22) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.16, 10),
    new THREE.MeshLambertMaterial({ color: 0x111018 }),
  );
  tire.rotation.z = Math.PI / 2;
  tire.rotation.y = Math.PI / 2;
  g.add(tire);
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, 0.18, 8),
    new THREE.MeshBasicMaterial({ color: 0xd8dee8 }),
  );
  hub.rotation.z = Math.PI / 2;
  hub.rotation.y = Math.PI / 2;
  g.add(hub);
  g.position.set(x, radius, z);
  return g;
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
  for (const [x, z] of [[-1.28, 0.62], [-1.28, -0.62], [1.28, 0.62], [1.28, -0.62]]) {
    g.add(chromeRim(x, z, 0.3));
  }
  return g;
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
      new THREE.CircleGeometry(0.07, 8),
      new THREE.MeshBasicMaterial({ color: hex }),
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
    new THREE.BoxGeometry(1.35, 1.45, 0.7),
    new THREE.MeshLambertMaterial({ color: 0x161022 }),
  );
  body.position.y = 0.72;
  g.add(body);
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.08, 0.9),
    new THREE.MeshLambertMaterial({ color: 0x3de0ff }),
  );
  awning.position.set(0, 1.5, 0.05);
  g.add(awning);
  const window = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 0.55),
    new THREE.MeshBasicMaterial({ color: 0x3de0ff }),
  );
  window.position.set(0, 0.85, 0.36);
  g.add(window);
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
  return canvasTex(960, 280, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const haze = g.createLinearGradient(0, h * 0.28, 0, h);
    haze.addColorStop(0, "rgba(200,170,230,0)");
    haze.addColorStop(0.55, "rgba(120,80,160,0.22)");
    haze.addColorStop(1, "rgba(70,48,96,0.42)");
    g.fillStyle = haze;
    g.fillRect(0, 0, w, h);

    function windows(x, y, bw, bh, gold = true) {
      g.fillStyle = gold ? "#f0c430" : "#7ad8ff";
      for (let wy = y + 8; wy < y + bh - 8; wy += 6) {
        for (let wx = x + 3; wx < x + bw - 3; wx += 5) {
          if (((wx + wy) % 9) > 3) g.fillRect(wx, wy, 2, 2);
        }
      }
    }

    function block(x, bw, bh, fill = "#4a3a68") {
      const y = h - bh;
      g.fillStyle = fill;
      g.fillRect(x, y, bw, bh);
      g.fillStyle = "#3a3058";
      g.fillRect(x, y, bw, 3);
      windows(x, y, bw, bh, (x + bw) % 5 !== 0);
      return y;
    }

    function palmSil(x, s) {
      g.fillStyle = "#161022";
      g.fillRect(Math.round(x) - 1, h - 34 * s, 3, 34 * s);
      g.beginPath();
      g.ellipse(x, h - 36 * s, 16 * s, 8 * s, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(x - 10 * s, h - 32 * s, 10 * s, 5 * s, -0.5, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(x + 10 * s, h - 32 * s, 10 * s, 5 * s, 0.5, 0, Math.PI * 2);
      g.fill();
    }

    // mid-rise row
    const mid = [
      [18, 22, 78], [48, 16, 96], [72, 28, 64], [108, 18, 110],
      [136, 24, 72], [168, 14, 88], [190, 20, 60], [218, 26, 102],
      [252, 15, 70], [276, 22, 84], [640, 20, 68], [668, 16, 92],
      [692, 28, 58], [728, 18, 80], [754, 24, 74], [786, 14, 98],
      [808, 22, 66], [838, 18, 88], [864, 26, 54], [898, 16, 76],
    ];
    for (const [x, bw, bh] of mid) block(x, bw, bh);

    // US Bank Tower — tall shaft + glass crown
    const usbX = 360;
    const usbW = 30;
    const usbH = 188;
    const usbY = block(usbX, usbW, usbH, "#5a4a80");
    g.fillStyle = "#4a3a68";
    g.fillRect(usbX - 4, usbY - 14, usbW + 8, 16);
    g.fillStyle = "#5a4a78";
    g.fillRect(usbX + 2, usbY - 24, usbW - 4, 12);
    g.fillStyle = "#3de0ff";
    g.fillRect(usbX + usbW / 2 - 1, usbY - 38, 2, 16);
    g.fillRect(usbX + 6, usbY - 10, 4, 4);
    windows(usbX, usbY, usbW, usbH, true);

    // Wilshire Grand — sail prow + tall thin spire
    const wgX = 500;
    const wgW = 38;
    const wgH = 210;
    const wgY = h - wgH;
    g.fillStyle = "#564878";
    g.fillRect(wgX, wgY + 28, wgW, wgH - 28);
    g.beginPath();
    g.moveTo(wgX - 6, wgY + 36);
    g.lineTo(wgX + wgW * 0.42, wgY - 8);
    g.lineTo(wgX + wgW + 8, wgY + 40);
    g.lineTo(wgX + wgW, wgY + 56);
    g.lineTo(wgX, wgY + 56);
    g.closePath();
    g.fill();
    g.fillStyle = "#3a3058";
    g.fillRect(wgX + wgW / 2 - 2, wgY - 62, 4, 56);
    g.fillStyle = "#f0c430";
    g.fillRect(wgX + wgW / 2 - 1, wgY - 70, 2, 10);
    windows(wgX, wgY + 28, wgW, wgH - 28, false);
    g.fillStyle = "#7ad8ff";
    g.fillRect(wgX + 8, wgY + 10, 3, 3);

    // library / extra tower
    block(430, 22, 150, "#2a2038");
    block(560, 18, 132, "#342848");

    for (let i = 0; i < 18; i++) {
      palmSil(12 + i * 54 + ((i * 17) % 11), 0.7 + (i % 3) * 0.18);
    }
  });
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
  scene.fog = new THREE.FogExp2(0x1a1030, 0.0046);
  scene.background = new THREE.Color(0x140a28);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 280);
  camera.position.set(0, 4.6, 11.5);

  const amb = new THREE.AmbientLight(0x4a3068, 1.05);
  scene.add(amb);
  const hemi = new THREE.HemisphereLight(0x7aa0d8, 0x2a1828, 0.85);
  scene.add(hemi);
  const moonLight = new THREE.DirectionalLight(0xe8f0ff, 0.7);
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
  skyline.scale.set(52, 11.5, 1);
  skyline.position.set(0, 8.8, -10);
  skyline.renderOrder = -4;
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
  const usBank = litTower(1.35, 12.4, 1.2, 0x3a2c58);
  const usCrown = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.55, 1.4),
    new THREE.MeshBasicMaterial({ color: 0x4a3c68, fog: false }),
  );
  usCrown.position.y = 12.65;
  usBank.add(usCrown);
  const usSpire = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 1.4, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x3de0ff, fog: false }),
  );
  usSpire.position.y = 13.5;
  usBank.add(usSpire);
  usBank.userData.dx = -3.2;
  const wilshire = litTower(1.7, 13.8, 1.35, 0x322850);
  const sail = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 1.3, 0.8),
    new THREE.MeshBasicMaterial({ color: 0x4a3c70, fog: false }),
  );
  sail.position.set(0.15, 14.3, 0);
  sail.rotation.z = -0.28;
  wilshire.add(sail);
  const wgSpire = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 2.8, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xf0c430, fog: false }),
  );
  wgSpire.position.y = 15.8;
  wilshire.add(wgSpire);
  wilshire.userData.dx = 1.6;
  const lib = litTower(1.15, 10.2, 1.1, 0x2e2448);
  lib.userData.dx = -6.4;
  const midA = litTower(1.4, 8.4, 1.15, 0x2a2038);
  midA.userData.dx = 4.8;
  const midB = litTower(1.05, 9.0, 1.05, 0x322848);
  midB.userData.dx = -8.6;
  for (const t of [lib, usBank, wilshire, midA, midB]) dtla.add(t);
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
    new THREE.MeshBasicMaterial({ map: hazeTex, transparent: true, depthWrite: false, fog: false, depthTest: false }),
  );
  hazeBand.position.set(0, 5.4, -11.2);
  hazeBand.renderOrder = -3;
  scene.add(hazeBand);
  const farPalms = [];
  for (let i = 0; i < 14; i++) {
    const palm = makePalm();
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
  dashTex.repeat.set(90, 1);
  dashTex.wrapS = THREE.RepeatWrapping;
  const dashes = new THREE.Mesh(
    new THREE.PlaneGeometry(STREET_LEN, 0.22),
    new THREE.MeshBasicMaterial({ map: dashTex, transparent: true }),
  );
  dashes.rotation.x = -Math.PI / 2;
  dashes.position.set(STREET_LEN / 2, 0.04, 7.55);
  city.add(dashes);

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
    { x: 4, w: 4.2, h: 4.2, d: 2.4 },
    { x: 9, w: 3.6, h: 3.6, d: 2.2 },
    { x: 13.2, w: 4.6, h: 4.8, d: 2.6 },
    { x: 18.4, w: 5.4, h: 3.3, d: 2.0 },
    { x: 24.2, w: 3.8, h: 4.4, d: 2.3 },
    { x: 28.6, w: 4.0, h: 3.7, d: 2.2 },
    { x: 33.4, w: 4.4, h: 4.6, d: 2.5 },
    { x: 38.6, w: 3.6, h: 3.5, d: 2.1 },
    { x: 43.2, w: 4.8, h: 4.3, d: 2.4 },
    { x: 48.4, w: 3.4, h: 3.6, d: 2.2 },
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
    const skip = theme.park || theme.id === "motel" || theme.id === "gas" || theme.id === "taco";
    const layout = skip ? facadeLayout.filter((_, i) => i % 3 === 0) : facadeLayout;
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
    const palms = theme.park
      ? [[8, -2.4], [16, -5.2], [22, -2.2], [30, -5.8], [38, -2.5], [46, -5.0], [12, 3.4], [34, 3.6]]
      : [[6.5, -2.5], [14.2, -4.8], [21.2, -2.3], [29.4, -5.1], [40.8, -2.6], [18, 3.5]];
    for (const [x, z] of palms) {
      const palm = makePalm();
      palm.position.set(x + xOff, 0, z);
      palm.scale.setScalar(0.85 + ((x + xOff) % 3) * 0.1);
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

  for (let i = 0; i < blockCount; i++) {
    const x = i * BLOCK_LEN;
    for (let s = 0; s < 6; s++) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.025, 3.8),
        new THREE.MeshBasicMaterial({ color: 0xf4f0e8 }),
      );
      stripe.position.set(x + (s - 2.5) * 0.72, 0.05, 5.5);
      city.add(stripe);
    }
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
  addNeon("HOME", "#3de0ff", gameToWorldX(HOME_X), 3.55, 0.35, true);
  addNeon("PLUG", "#e21b7a", gameToWorldX(PLUG_X), 2.55, 0.15, true);

  const shop = makeKiosk();
  shop.position.set(gameToWorldX(SHOP_X), 0, -1.35);
  city.add(shop);
  addNeon("SHOP", "#3de0ff", gameToWorldX(SHOP_X), 2.15, -0.95, true);

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

  const playerCar = makeLuxuryCar();
  const rustA = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.12, 0.2),
    new THREE.MeshLambertMaterial({ color: 0x8a4a20 }),
  );
  rustA.position.set(-1.1, 0.42, 0.66);
  playerCar.add(rustA);
  const rustB = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.1, 0.18),
    new THREE.MeshLambertMaterial({ color: 0x3a2010 }),
  );
  rustB.position.set(1.4, 0.38, -0.66);
  playerCar.add(rustB);
  scene.add(playerCar);
  const lightMeshes = [];
  for (let i = 0; i < LIGHT_COUNT; i++) {
    const m = makeTrafficLight();
    m.scale.setScalar(1.2);
    scene.add(m);
    lightMeshes.push(m);
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
  const buyerSprite = makeBillboard(sprites.buyers[0].idle[0], 2.2);
  buyerSprite.visible = false;
  scene.add(buyerSprite);
  const plugSprite = makeBillboard((sprites.plug || sprites.buyers[0]).idle[0], 2.25);
  plugSprite.visible = false;
  scene.add(plugSprite);
  const plugGlow = glowSprite("#e21b7a", 2.8);
  plugGlow.visible = false;
  scene.add(plugGlow);
  let buyerT = 0;

  const playerSprite = makeBillboard(sprites.idle[0], 2.65);
  scene.add(playerSprite);
  const packHeld = makeBillboard(sprites.pack, 0.45);
  packHeld.visible = false;
  scene.add(packHeld);

  const foePool = [];
  const lootPool = [];
  const shotPool = [];
  const boomPool = [];
  const bitPool = [];
  const shadowGeo = new THREE.CircleGeometry(0.38, 10);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });
  const playerShadow = new THREE.Mesh(shadowGeo, shadowMat);
  playerShadow.rotation.x = -Math.PI / 2;
  playerShadow.position.y = 0.03;
  scene.add(playerShadow);

  let bossSprite = null;
  const tmp = new THREE.Vector3();
  let camX = gameToWorldX(200);
  let camTilt = 0;

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
    camera.fov = w > h ? 40 : 52;
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
    const camZ = portrait ? (state.inCar ? 20.4 : 18.8) : (state.inCar ? 16.8 : 15.2);
    const camY = portrait ? (state.inCar ? 3.35 : 2.86) : (state.inCar ? 3.1 : 2.7);
    if (playing) {
      const leadGame = state.inCar ? (portrait ? 10 : 16) : (portrait ? 14 : 22);
      const lookX = nearestWorldX(wrap(px + p.facing * leadGame, WORLD), camX);
      const dx = wrapDelta(camX, lookX, STREET_LEN);
      const follow = state.inCar ? 10.5 : 7.2;
      camX = wrap(camX + dx * (1 - Math.exp(-follow * Math.max(stepDt, 0.0001) * (paused ? 0 : 1))), STREET_LEN);
      camera.position.set(camX, camY + gameToWorldY(p.y) * 0.08, camZ);
      tmp.set(camX + p.facing * (state.inCar ? 0.7 : 0.75), 1.48 + gameToWorldY(p.y) * 0.12, state.inCar ? 3.1 : 1.85);
      camera.lookAt(tmp);
      camera.rotation.z += camTilt;
    } else {
      camX = wrap(camX + stepDt * 0.35, STREET_LEN);
      camera.position.set(camX, camY + 0.06, camZ + 1.1);
      camera.lookAt(camX, 1.32, 1.4);
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
    }

    moon.position.set(camX - 6.2, 10.4, -16);
    moonGlow.position.copy(moon.position);
    skyline.position.set(camX + 1.4, 8.9, -10);
    hazeBand.position.set(camX, 5.2, -9.6);
    sky.position.set(camX, 15, -22);
    dtla.position.set(camX + 0.8, 0, -12.4);
    for (const t of dtla.children) {
      t.position.x = t.userData.dx || 0;
      t.position.z = 0;
    }
    for (const fp of farPalms) {
      fp.mesh.position.set(camX + fp.dx, 0, fp.z);
    }
    const skyInfo = state.sky;
    if (skyInfo) {
      scene.background.setHex(skyInfo.top);
      renderer.setClearColor(skyInfo.top, 1);
      if (scene.fog) {
        scene.fog.color.setHex(skyInfo.fog);
        scene.fog.density = skyInfo.star > 0.55 ? 0.0048 : 0.0034;
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
      sun.position.set(camX + 7.4, 6.2 + skyInfo.sun * 8.5, -16);
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
    playerSprite.visible = !state.inCar;
    playerSprite.material.opacity = blink ? 0.4 : 1;
    const airborne = p.y < 197.2;
    const fit = (sprites.outfits && sprites.outfits[state.outfit | 0]) || sprites;
    const animSet = state.muzzle > 0 ? fit.shoot
      : airborne ? fit.jump
      : Math.abs(p.vx) > 8 ? fit.walk
      : fit.idle;
    const rate = state.muzzle > 0 ? 14 : airborne ? 8 : Math.abs(p.vx) > 8 ? 11 : 5;
    setBillboardFrame(playerSprite, frameAt(animSet, p.anim, rate), p.facing);
    place(playerSprite, px, p.y, camX, 1.15);
    orientBillboard(playerSprite, camera);
    playerSprite.material.color.set(p.flash > 0 ? 0xffffff : 0xffffff);
    if (p.flash > 0) playerSprite.material.color.setHex(0xffc8e8);
    else playerSprite.material.color.setHex(0xffffff);

    playerShadow.visible = !state.inCar;
    playerShadow.position.x = playerSprite.position.x;
    playerShadow.position.z = 1.15;
    playerShadow.scale.setScalar(p.y < 198 ? 0.7 : 1);

    if (state.car) {
      const cx = renderGameX(state.car, alpha);
      playerCar.visible = true;
      place(playerCar, cx, GROUND_Y, camX, 4.95 + (state.car.lat || 0));
      playerCar.position.y = state.car.hp > 0 ? 0 : -0.12;
      const yaw = Number.isFinite(state.car.yaw) ? state.car.yaw : (state.car.facing < 0 ? Math.PI : 0);
      playerCar.rotation.y = yaw;
      const body = playerCar.getObjectByName("body");
      if (body) {
        const rust = state.car.kind === "luxury" ? 0x1a1a1e : 0x6a3a24;
        body.material.color.setHex(state.car.hp > 0 ? rust : 0x2a2438);
      }
      setCarLights(playerCar, !!(skyInfo && skyInfo.headlights));
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
    }

    if (state.copCar) {
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
    for (const t of state.traffic || []) {
      const mesh = take(trafficPool, () => {
        const m = makeLuxuryCar();
        scene.add(m);
        return m;
      }, ti++);
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

    if (state.plugMeet && !(state.order && (state.order.phase === "active" || state.order.phase === "nudge"))) {
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

    place(dumpSprite, DUMPSTER_X, 198, camX, -0.35);
    dumpSprite.position.y = 0;
    orientBillboard(dumpSprite, camera);
    place(sellLabel, DUMPSTER_X, 154, camX, 0.7);
    sellLabel.position.y = 1.55;
    place(fireLabel, DUMPSTER_X, 154, camX, 0.7);
    fireLabel.position.y = 1.55;
    sellLabel.visible = !!(state.combat && !state.carrying);
    fireLabel.visible = !!(state.combat && state.carrying);

    const looks = sprites.peds || sprites.buyers || [];
    let pedI = 0;
    for (const ped of state.peds || []) {
      const spr = take(pedPool, () => {
        const s = makeBillboard(looks[0]?.walk?.[0] || sprites.idle[0], 2.2);
        scene.add(s);
        const sh = new THREE.Mesh(shadowGeo, shadowMat.clone());
        sh.rotation.x = -Math.PI / 2;
        sh.position.y = 0.03;
        scene.add(sh);
        s.userData.shadow = sh;
        return s;
      }, pedI++);
      const set = looks[ped.look % looks.length] || looks[0];
      const frames = Math.abs(ped.vx || 0) > 2 ? (set.walk || set.idle) : (set.idle || set.walk);
      setBillboardFrame(spr, frameAt(frames, ped.anim, 9), ped.facing);
      place(spr, ped.x, GROUND_Y, camX, 1.15);
      spr.position.y = 0;
      orientBillboard(spr, camera);
      spr.material.color.setHex(0xffffff);
      if (spr.userData.shadow) {
        spr.userData.shadow.visible = true;
        spr.userData.shadow.position.x = spr.position.x;
        spr.userData.shadow.position.z = 1.15;
      }
    }
    hideFrom(pedPool, pedI);
    for (let i = pedI; i < pedPool.length; i++) {
      if (pedPool[i].userData.shadow) pedPool[i].userData.shadow.visible = false;
    }

    (state.lights || []).forEach((L, i) => {
      const m = lightMeshes[i];
      if (!m) return;
      place(m, L.x, GROUND_Y, camX, 3.05);
      m.position.y = 0;
      const red = m.getObjectByName("bulbRed");
      const yel = m.getObjectByName("bulbYellow");
      const grn = m.getObjectByName("bulbGreen");
      if (red) red.material.color.setHex(L.phase === "red" ? 0xff2a3a : 0x3a1018);
      if (yel) yel.material.color.setHex(L.phase === "yellow" ? 0xf0c430 : 0x3a3010);
      if (grn) grn.material.color.setHex(L.phase === "green" ? 0x3dff7a : 0x103a18);
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
    return { camGameX, halfWidth: halfGame, playerPx, dist };
  }

  return { sync, resize, getView, renderer, camera, scene };
}
