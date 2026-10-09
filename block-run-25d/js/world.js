import * as THREE from "three";
import {
  WORLD, STREET_LEN, SHOP_X, DUMPSTER_X, COLORS,
  wrap, wrapDelta, gameToWorldX, gameToWorldY, nearestWorldX,
} from "./config.js";
import { makeBillboard, setBillboardFrame, setBillboardFacing, orientBillboard, frameAt } from "./sprites.js";

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
    g.fillStyle = "#2a2434";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#322a3c";
    for (let i = 0; i < 200; i++) g.fillRect((i * 37) % w, (i * 53) % h, 2, 2);
    g.fillStyle = "#3a3444";
    for (let i = 0; i < 80; i++) g.fillRect((i * 19) % w, (i * 29) % h, 1, 1);
  });
}

function sidewalkTex() {
  return canvasTex(64, 32, (g, w, h) => {
    g.fillStyle = "#5a5664";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#3a3644";
    g.lineWidth = 1;
    for (let x = 0; x < w; x += 16) g.strokeRect(x, 0, 16, h);
    g.fillStyle = "#7a7684";
    g.fillRect(0, 0, w, 2);
  });
}

function windowTex(lit) {
  return canvasTex(32, 48, (g, w, h) => {
    g.fillStyle = "#141018";
    g.fillRect(0, 0, w, h);
    const cols = 3;
    const rows = 4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const on = lit && Math.random() > 0.35;
        g.fillStyle = on ? (Math.random() > 0.5 ? "#ffe06a" : "#7af0ff") : "#1a1424";
        g.fillRect(3 + c * 10, 4 + r * 11, 7, 8);
        if (on) {
          g.fillStyle = "rgba(255,255,255,0.25)";
          g.fillRect(4 + c * 10, 5 + r * 11, 3, 2);
        }
      }
    }
  });
}

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
    new THREE.MeshBasicMaterial({ map: windowTex(true), transparent: false }),
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

function makeCar() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.55, 1.05),
    new THREE.MeshLambertMaterial({ color: 0x5a3cff }),
  );
  body.position.y = 0.48;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.4, 0.95),
    new THREE.MeshLambertMaterial({ color: 0x2a1a50 }),
  );
  cabin.position.set(-0.15, 0.9, 0);
  g.add(cabin);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xf0c430 });
  for (const z of [-0.35, 0.35]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.18), lightMat);
    lamp.position.set(1.18, 0.48, z);
    g.add(lamp);
  }
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111018 });
  for (const [x, z] of [[-0.75, 0.5], [-0.75, -0.5], [0.75, 0.5], [0.75, -0.5]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.16, 8), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(x, 0.18, z);
    g.add(wheel);
  }
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
    new THREE.MeshBasicMaterial({ color: 0xf0c430 }),
  );
  head.position.set(0.12, 3.15, 0);
  g.add(head);
  g.add(glowSprite("#f0c430", 1.8));
  g.children[g.children.length - 1].position.set(0.12, 3.15, 0.1);
  return g;
}

function skylineTex() {
  return canvasTex(512, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#0b0814";
    const heights = [40, 70, 55, 90, 48, 110, 62, 80, 44, 96, 58, 74, 88, 50, 100, 66];
    let x = 0;
    for (let i = 0; i < heights.length; i++) {
      const bw = 28 + (i % 3) * 8;
      const bh = heights[i];
      g.fillRect(x, h - bh, bw, bh);
      g.fillStyle = i % 2 ? "#3de0ff" : "#f0c430";
      for (let wy = h - bh + 6; wy < h - 6; wy += 8) {
        for (let wx = x + 4; wx < x + bw - 4; wx += 6) {
          if (Math.random() > 0.45) g.fillRect(wx, wy, 2, 3);
        }
      }
      g.fillStyle = "#0b0814";
      x += bw + 4;
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
  scene.fog = new THREE.FogExp2(0x120820, 0.016);
  scene.background = new THREE.Color(0x140a28);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 180);
  camera.position.set(0, 4.6, 11.5);

  scene.add(new THREE.AmbientLight(0x4a3068, 1.05));
  const hemi = new THREE.HemisphereLight(0x7aa0d8, 0x2a1828, 0.85);
  scene.add(hemi);
  const moonLight = new THREE.DirectionalLight(0xe8f0ff, 0.7);
  moonLight.position.set(-8, 18, 8);
  scene.add(moonLight);
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
    new THREE.MeshBasicMaterial({ map: stars }),
  );
  sky.position.set(0, 22, -70);
  scene.add(sky);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(1.8, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xf4f0e8 }),
  );
  moon.position.set(-10, 12, -28);
  scene.add(moon);
  const moonGlow = glowSprite("#f4e8c0", 8);
  moonGlow.position.copy(moon.position);
  scene.add(moonGlow);

  const skyline = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 18),
    new THREE.MeshBasicMaterial({ map: skylineTex(), transparent: true }),
  );
  skyline.position.set(0, 8.4, -26);
  scene.add(skyline);

  const city = new THREE.Group();
  const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(STREET_LEN + 4, 14),
    new THREE.MeshLambertMaterial({ map: asphaltTex() }),
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.set(STREET_LEN / 2, 0, 2.4);
  asphalt.material.map.repeat.set(8, 2);
  city.add(asphalt);

  const walk = new THREE.Mesh(
    new THREE.PlaneGeometry(STREET_LEN + 4, 3.2),
    new THREE.MeshLambertMaterial({ map: sidewalkTex() }),
  );
  walk.rotation.x = -Math.PI / 2;
  walk.position.set(STREET_LEN / 2, 0.02, -1.1);
  walk.material.map.repeat.set(24, 1);
  city.add(walk);

  const curb = new THREE.Mesh(
    new THREE.BoxGeometry(STREET_LEN + 4, 0.12, 0.18),
    new THREE.MeshLambertMaterial({ color: 0x4a4654 }),
  );
  curb.position.set(STREET_LEN / 2, 0.06, 0.45);
  city.add(curb);

  const dashTex = canvasTex(32, 8, (g) => {
    g.fillStyle = "#f0c430";
    g.fillRect(0, 2, 18, 4);
  });
  dashTex.repeat.set(22, 1);
  dashTex.wrapS = THREE.RepeatWrapping;
  const dashes = new THREE.Mesh(
    new THREE.PlaneGeometry(STREET_LEN, 0.12),
    new THREE.MeshBasicMaterial({ map: dashTex, transparent: true }),
  );
  dashes.rotation.x = -Math.PI / 2;
  dashes.position.set(STREET_LEN / 2, 0.03, 3.6);
  city.add(dashes);

  const facades = [
    { x: 4, w: 4.2, h: 4.4, d: 2.4, col: "#6a4a58" },
    { x: 9, w: 3.6, h: 3.8, d: 2.2, col: "#4a3a48" },
    { x: 13.2, w: 4.6, h: 5.2, d: 2.6, col: "#3a2e40" },
    { x: 18.4, w: 5.4, h: 3.2, d: 2.0, col: "#8a7a58" },
    { x: 24.2, w: 3.8, h: 4.8, d: 2.3, col: "#4a3a60" },
    { x: 28.6, w: 4.0, h: 4.0, d: 2.2, col: "#3a4a58" },
    { x: 33.4, w: 4.4, h: 5.0, d: 2.5, col: "#5a3040" },
    { x: 38.6, w: 3.6, h: 3.6, d: 2.1, col: "#4a3a50" },
    { x: 43.2, w: 4.8, h: 4.6, d: 2.4, col: "#3a2838" },
    { x: 48.4, w: 3.4, h: 3.9, d: 2.2, col: "#2a3848" },
  ];
  for (const b of facades) {
    const mesh = makeBuilding(b.w, b.h, b.d, brickTex(b.col, "#1a1420"));
    mesh.position.set(b.x, 0, -3.4);
    city.add(mesh);
  }

  const grafWall = new THREE.Mesh(
    new THREE.BoxGeometry(7.2, 3.2, 0.45),
    new THREE.MeshLambertMaterial({ color: 0x6a6258 }),
  );
  grafWall.position.set(gameToWorldX(200), 1.6, -1.35);
  city.add(grafWall);
  const graffiti = new THREE.Mesh(
    new THREE.PlaneGeometry(6.8, 3.0),
    new THREE.MeshBasicMaterial({ map: graffitiTex() }),
  );
  graffiti.position.set(gameToWorldX(200), 1.7, -1.1);
  city.add(graffiti);

  function addNeon(text, color, x, y, z, lit = false) {
    const tex = neonTex(text, color);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 0.7),
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
  addNeon("LIQUOR", "#e21b7a", 9.2, 4.6, -2.15, true);
  addNeon("MOTEL", "#3de0ff", 24.4, 5.2, -2.15, true);
  addNeon("OPEN", "#f0c430", 33.6, 4.8, -2.15, false);
  addNeon("BLOCK", "#e21b7a", 43.4, 4.2, -2.15, false);

  const palms = [
    [6.5, -2.5], [17.8, -5.8], [21.2, -2.3],
    [29.5, -6.2], [40.8, -2.6], [47.2, -5.4],
  ];
  for (const [x, z] of palms) {
    const palm = makePalm();
    palm.position.set(x, 0, z);
    palm.scale.setScalar(0.85 + (x % 3) * 0.1);
    city.add(palm);
  }

  for (const x of [16, 36]) {
    const lamp = makeLamp();
    lamp.position.set(x, 0, -0.2);
    city.add(lamp);
    const pl = new THREE.PointLight(0xf0c430, 1.0, 7, 2);
    pl.position.set(x + 0.12, 3.1, 0.4);
    city.add(pl);
  }

  const parked = makeCar();
  parked.position.set(5.5, 0, 2.2);
  parked.rotation.y = Math.PI * 0.02;
  city.add(parked);

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

  const dumpSprite = makeBillboard(sprites.dumpster, 1.15);
  scene.add(dumpSprite);
  const sellLabel = makeLabel("SELL", "#f0c430");
  scene.add(sellLabel);
  const fireLabel = makeLabel("FIRE", "#f0c430");
  fireLabel.visible = false;
  scene.add(fireLabel);
  const bangPool = [];

  const playerSprite = makeBillboard(sprites.idle[0], 2.35);
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
    camera.fov = w > h ? 46 : 64;
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

  function sync(state, dt) {
    const p = state.player;
    camTilt += ((p.vx / 96) * 0.04 - camTilt) * Math.min(1, dt * 8);

    const playing = state.mode === "play";
    const portrait = camera.aspect < 1;
    const camZ = portrait ? 30 : 18;
    const camY = portrait ? 4.8 : 3.6;
    if (playing) {
      const leadGame = portrait ? 42 : 36;
      const lookX = nearestWorldX(wrap(p.x + p.facing * leadGame, WORLD), camX);
      const dx = wrapDelta(camX, lookX, STREET_LEN);
      camX = wrap(camX + dx * (1 - Math.exp(-4.2 * dt)), STREET_LEN);
      camera.position.set(camX, camY + gameToWorldY(p.y) * 0.1, camZ);
      tmp.set(camX + p.facing * 1.4, 1.35 + gameToWorldY(p.y) * 0.25, -0.8);
      camera.lookAt(tmp);
      camera.rotation.z += camTilt;
    } else {
      camX = wrap(camX + dt * 0.35, STREET_LEN);
      camera.position.set(camX, camY + 0.3, camZ + 3);
      camera.lookAt(camX, 1.7, -1.4);
    }

    moon.position.set(camX - 4.5, 7.8, -11);
    moonGlow.position.copy(moon.position);
    skyline.position.set(camX + 2, 5.6, -16);
    sky.position.set(camX, 14, -22);

    const blink = state.invuln > 0 && Math.floor(state.invuln * 20) % 2 === 0;
    playerSprite.visible = true;
    playerSprite.material.opacity = blink ? 0.4 : 1;
    const animSet = state.muzzle > 0 ? sprites.shoot : Math.abs(p.vx) > 8 ? sprites.walk : sprites.idle;
    const rate = state.muzzle > 0 ? 12 : 8;
    setBillboardFrame(playerSprite, frameAt(animSet, p.anim, rate));
    place(playerSprite, p.x, p.y, camX, 0.55);
    orientBillboard(playerSprite, camera);
    setBillboardFacing(playerSprite, p.facing);
    playerSprite.material.color.set(p.flash > 0 ? 0xffffff : 0xffffff);
    if (p.flash > 0) playerSprite.material.color.setHex(0xffc8e8);
    else playerSprite.material.color.setHex(0xffffff);

    playerShadow.position.x = playerSprite.position.x;
    playerShadow.position.z = 0.55;
    playerShadow.scale.setScalar(p.y < 198 ? 0.7 : 1);

    packHeld.visible = state.carrying;
    if (state.carrying) {
      place(packHeld, p.x, p.y - 34, camX, 0.2);
      packHeld.position.y = playerSprite.position.y + 1.55;
      orientBillboard(packHeld, camera);
    }

    place(dumpSprite, DUMPSTER_X, 198, camX, -0.35);
    dumpSprite.position.y = 0;
    orientBillboard(dumpSprite, camera);
    place(sellLabel, DUMPSTER_X, 154, camX, 0.7);
    sellLabel.position.y = 1.55;
    place(fireLabel, DUMPSTER_X, 154, camX, 0.7);
    fireLabel.position.y = 1.55;
    sellLabel.visible = !state.carrying;
    fireLabel.visible = state.carrying;

    let fi = 0;
    let bangI = 0;
    for (const foe of state.foes) {
      const spr = take(foePool, () => {
        const s = makeBillboard(sprites.thug[0], 2.2);
        scene.add(s);
        const sh = new THREE.Mesh(shadowGeo, shadowMat.clone());
        sh.rotation.x = -Math.PI / 2;
        sh.position.y = 0.03;
        scene.add(sh);
        s.userData.shadow = sh;
        return s;
      }, fi++);
      const set = foe.kind === "runner" ? sprites.runner : sprites.thug;
      setBillboardFrame(spr, frameAt(set, foe.anim, 8));
      place(spr, foe.x, foe.y, camX, 0.55);
      orientBillboard(spr, camera);
      setBillboardFacing(spr, foe.facing);
      spr.material.color.setHex(foe.kind === "cop" ? 0x7aa0ff : foe.flash > 0 ? 0xffffff : 0xffffff);
      if (foe.kind === "cop") spr.material.color.setHex(0x6690ff);
      if (foe.flash > 0) spr.material.color.setHex(0xffffff);
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
        bossSprite = makeBillboard(sprites.boss[0], 1.8);
        scene.add(bossSprite);
      }
      bossSprite.visible = true;
      setBillboardFrame(bossSprite, frameAt(sprites.boss, state.boss.anim, 6));
      place(bossSprite, state.boss.x, state.boss.y, camX, 1.1);
      bossSprite.position.y = 0.05;
      orientBillboard(bossSprite, camera);
      setBillboardFacing(bossSprite, state.boss.facing);
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
      setBillboardFrame(spr, frameAt(sprites.shot, 1 - shot.life, 14));
      place(spr, shot.x, shot.y, camX, 0.1);
      spr.position.y = Math.max(0.4, gameToWorldY(shot.y));
      orientBillboard(spr, camera);
      setBillboardFacing(spr, shot.vx >= 0 ? 1 : -1);
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
    return { camGameX, halfWidth: halfGame };
  }

  return { sync, resize, getView, renderer, camera, scene };
}
