/* BLOCK RUN on foot. Original sprites only. No 2.5D import. */
const NES_W = 256;
const NES_H = 224;
const STEP = 1 / 60;
const GROUND = 198;
const SAVE_KEY = "block-run-2d-v1";
const GRAVITY = 820;
const JUMP_V = -268;
const WALK = 92;
const REACH = 26;
const HALF_G = 14;
const HALF_COST = 100;
const START_CASH = 130;
const GRAM_PAY = 14;
const MAX_G = 56;
const SALES = [20, 40, 60];
const NAMES = ["DEZ", "MARI", "KILO", "NIA", "JUNO"];
const MEETS = [
  { id: "taco", label: "TACO", t: 0.56 },
  { id: "motel", label: "MOTEL", t: 0.8 },
  { id: "alley", label: "ALLEY", t: 0.36 },
  { id: "park", label: "PARK", t: 0.94 },
];
const PLUG = { id: "plug", label: "PLUG", t: 0.2 };
const CRIB = { id: "crib", label: "CRIB", t: 0.06 };

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const nes = document.createElement("canvas");
nes.width = NES_W;
nes.height = NES_H;
const nctx = nes.getContext("2d");

function wrap(x, w) {
  x %= w;
  if (x < 0) x += w;
  return x;
}
function wrapDelta(a, b, w) {
  let d = b - a;
  if (d > w / 2) d -= w;
  if (d < -w / 2) d += w;
  return d;
}
function fmtG(n) {
  const r = Math.round(Math.max(0, n) * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth ? img : null);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
async function loadSheet(name) {
  const frames = (await Promise.all([1, 2, 3, 4].map((i) => loadImage(`../block-run/sprites/${name}-${i}.png`)))).filter(Boolean);
  return frames.length ? frames : null;
}

let art = null;
let WORLD = 398 * 3;
let mode = "title";
let player = { x: 70, y: GROUND, vx: 0, vy: 0, facing: 1, anim: 0 };
let cash = START_CASH;
let grams = 0;
let rep = 0;
let hi = 0;
let order = null;
let phoneT = 0;
let pops = [];
let cam = 0;
let blink = 0;
let buyerAnim = 0;
let hasSave = false;
const keys = new Set();
const pointers = new Map();
let shootEdge = false;
let jumpEdge = false;
let startEdge = false;

function at(def) {
  return def.t * WORLD;
}
function meetById(id) {
  return MEETS.find((m) => m.id === id) || MEETS[0];
}
function readSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (!s || typeof s.cash !== "number") return null;
    return s;
  } catch {
    return null;
  }
}
function persist() {
  if (cash > hi) hi = cash;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ cash, grams, rep, hi, x: player.x, facing: player.facing, order }));
    hasSave = true;
  } catch { /* ignore */ }
}
function addPop(x, y, s) {
  pops.push({ x, y, text: s, life: 0.9 });
}
function fresh() {
  player = { x: at(CRIB), y: GROUND, vx: 0, vy: 0, facing: 1, anim: 0 };
  cash = START_CASH;
  grams = 0;
  rep = 0;
  order = null;
  phoneT = 0;
  pops = [];
  cam = wrap(player.x - NES_W * 0.42, WORLD);
  addPop(player.x, GROUND - 52, "COP A PACK");
}
function continueSave(s) {
  player = { x: wrap(s.x || at(CRIB), WORLD), y: GROUND, vx: 0, vy: 0, facing: s.facing === -1 ? -1 : 1, anim: 0 };
  cash = s.cash;
  grams = s.grams || 0;
  rep = s.rep || 0;
  hi = s.hi || s.cash;
  order = s.order && s.order.spot ? s.order : null;
  phoneT = order ? 0 : 3;
  pops = [];
  cam = wrap(player.x - NES_W * 0.42, WORLD);
}
function closeTo(x) {
  return Math.abs(wrapDelta(player.x, x, WORLD)) <= REACH;
}
function rollOrder() {
  const spot = MEETS[Math.floor(Math.random() * MEETS.length)];
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const band = rep < 2 ? 0 : rep < 5 ? 1 : 2;
  const pay = SALES[Math.floor(Math.random() * (band + 1))];
  order = { name, spot: spot.id, label: spot.label, pay, grams: pay / GRAM_PAY };
  phoneT = 0;
  addPop(player.x, GROUND - 56, name);
}
function tryBuy() {
  if (cash < HALF_COST) return addPop(at(PLUG), GROUND - 48, "NEED $" + HALF_COST);
  if (grams + HALF_G > MAX_G + 0.01) return addPop(at(PLUG), GROUND - 48, "FULL");
  cash -= HALF_COST;
  grams += HALF_G;
  addPop(at(PLUG), GROUND - 48, "+" + HALF_G + "G");
  if (!order) phoneT = 2.2;
  persist();
}
function tryServe() {
  if (!order || !closeTo(at(meetById(order.spot)))) return;
  if (grams + 0.05 < order.grams) return addPop(player.x, GROUND - 52, "SHORT");
  grams = Math.max(0, Math.round((grams - order.grams) * 10) / 10);
  cash += order.pay;
  rep += 1;
  addPop(player.x, GROUND - 52, "+$" + order.pay);
  order = null;
  phoneT = 4 + Math.random() * 3;
  persist();
}

function layout() {
  const w = canvas.width;
  const h = canvas.height;
  const s = Math.max(0.75, Math.min(w / NES_W, h / NES_H));
  const nesW = NES_W * s;
  const nesH = NES_H * s;
  const box = { x: (w - nesW) / 2, y: (h - nesH) / 2, w: nesW, h: nesH };
  const by = h - 108;
  const col = Math.max(52, Math.min(72, (w - 110) / 3));
  return {
    nes: box,
    left: { x: 10, y: by + 40, w: col, h: 50 },
    jump: { x: 10 + col + 6, y: by + 8, w: col, h: 82 },
    right: { x: 10 + (col + 6) * 2, y: by + 40, w: col, h: 50 },
    act: { x: w - 88, y: by + 8, w: 78, h: 82 },
  };
}
function hit(r, x, y) {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}
function roleAt(x, y) {
  const L = layout();
  const r = canvas.getBoundingClientRect();
  const px = ((x - r.left) / r.width) * canvas.width;
  const py = ((y - r.top) / r.height) * canvas.height;
  if (hit(L.act, px, py)) return "act";
  if (hit(L.jump, px, py)) return "jump";
  if (hit(L.left, px, py)) return "left";
  if (hit(L.right, px, py)) return "right";
  return "nes";
}
function moveX() {
  let x = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA") || [...pointers.values()].includes("left")) x -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD") || [...pointers.values()].includes("right")) x += 1;
  return Math.max(-1, Math.min(1, x));
}

window.addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (e.code === "Enter" || e.code === "Space") startEdge = true;
  if (e.code === "KeyJ" || e.code === "KeyZ" || e.code === "Space") shootEdge = true;
  if (e.code === "ArrowUp" || e.code === "KeyW") jumpEdge = true;
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture?.(e.pointerId);
  const role = roleAt(e.clientX, e.clientY);
  pointers.set(e.pointerId, role);
  if (role === "act" || role === "nes") {
    shootEdge = true;
    startEdge = true;
  }
  if (role === "jump") jumpEdge = true;
});
canvas.addEventListener("pointerup", (e) => pointers.delete(e.pointerId));
canvas.addEventListener("pointercancel", (e) => pointers.delete(e.pointerId));

function text(c, s, x, y, color, align) {
  c.fillStyle = color;
  c.textAlign = align || "left";
  c.textBaseline = "top";
  c.fillText(s, Math.round(x), Math.round(y));
}
function worldToScreen(wx) {
  return wrapDelta(cam, wx, WORLD);
}
function drawSprite(img, wx, y, w, h, facing) {
  const sx = worldToScreen(wx);
  const paint = (x) => {
    nctx.save();
    nctx.translate(Math.round(x), Math.round(y));
    nctx.scale(facing, 1);
    nctx.drawImage(img, -Math.round(w / 2), -h, w, h);
    nctx.restore();
  };
  if (sx > -w && sx < NES_W + w) paint(sx);
}
function drawLabel(wx, y, s, color) {
  const sx = worldToScreen(wx);
  nctx.font = "8px 'Press Start 2P', monospace";
  if (sx > -48 && sx < NES_W + 48) text(nctx, s, sx, y, color, "center");
}

function update(dt) {
  const mx = moveX();
  const act = shootEdge;
  const jump = jumpEdge;
  const start = startEdge;
  shootEdge = false;
  jumpEdge = false;
  startEdge = false;

  if (mode === "title") {
    if (jump) {
      try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
      hasSave = false;
      fresh();
      mode = "play";
    } else if (start || act) {
      const s = readSave();
      if (s) continueSave(s);
      else fresh();
      mode = "play";
    }
    blink += dt;
    return;
  }

  if (mx < 0) player.facing = -1;
  if (mx > 0) player.facing = 1;
  player.vx = mx * WALK;
  player.x = wrap(player.x + player.vx * dt, WORLD);
  if (jump && player.y >= GROUND - 0.5) player.vy = JUMP_V;
  player.vy += GRAVITY * dt;
  player.y += player.vy * dt;
  if (player.y > GROUND) {
    player.y = GROUND;
    player.vy = 0;
  }
  player.anim += dt;
  buyerAnim += dt;
  blink += dt;

  if (act) {
    if (closeTo(at(PLUG))) tryBuy();
    else if (order && closeTo(at(meetById(order.spot)))) tryServe();
    else if (order) addPop(player.x, GROUND - 52, order.name + " " + order.label);
    else addPop(player.x, GROUND - 52, grams > 0 ? "WAITING" : "PLUG");
  }
  if (!order && grams > 0) {
    phoneT -= dt;
    if (phoneT <= 0) rollOrder();
  }
  for (const p of pops) {
    p.life -= dt;
    p.y -= 16 * dt;
  }
  pops = pops.filter((p) => p.life > 0);
  const target = wrap(player.x - NES_W * 0.42, WORLD);
  cam = wrap(cam + wrapDelta(cam, target, WORLD) * (1 - Math.exp(-7 * dt)), WORLD);
}

function renderNes() {
  nctx.imageSmoothingEnabled = false;
  nctx.fillStyle = "#07060c";
  nctx.fillRect(0, 0, NES_W, NES_H);
  const sw = art?.street?.naturalWidth || 0;
  if (art?.street && sw > 0) {
    let covered = 0;
    let worldX = cam;
    while (covered < NES_W) {
      const srcX = Math.floor(wrap(worldX, sw));
      const span = Math.max(1, Math.min(NES_W - covered, sw - srcX));
      nctx.drawImage(art.street, srcX, 0, span, NES_H, covered, 0, span, NES_H);
      covered += span;
      worldX += span;
    }
  }
  if (mode === "play" && art) {
    drawLabel(at(CRIB), GROUND - 58, "CRIB", "#e21b7a");
    drawLabel(at(PLUG), GROUND - 58, "PLUG", "#f0c430");
    drawSprite(art.dumpster, at(PLUG), GROUND, 32, 32, 1);
    for (const m of MEETS) {
      const here = order && order.spot === m.id;
      drawLabel(at(m), GROUND - 58, m.label, here ? "#3de0ff" : "#8a8696");
      if (here) {
        const sheet = NAMES.indexOf(order.name) % 2 === 0 ? art.thug : art.runner;
        const img = sheet[Math.floor(buyerAnim * 8) % sheet.length];
        const face = wrapDelta(at(m), player.x, WORLD) >= 0 ? 1 : -1;
        drawSprite(img, at(m), GROUND, 30, 38, face);
      }
    }
    const sheet = Math.abs(player.vx) > 8 ? art.walk : art.idle;
    const img = sheet[Math.floor(player.anim * 8) % sheet.length];
    drawSprite(img, player.x, player.y, 32, 40, player.facing);
    if (grams > 0) drawSprite(art.pack, player.x, player.y - 36, 12, 12, 1);
    nctx.font = "8px 'Press Start 2P', monospace";
    for (const p of pops) text(nctx, p.text, worldToScreen(p.x), p.y, "#f4f0e8", "center");
    if (order) {
      nctx.fillStyle = "#121018";
      nctx.fillRect(4, 18, 188, 26);
      nctx.strokeStyle = "#3de0ff";
      nctx.strokeRect(5, 19, 186, 24);
      text(nctx, order.name, 10, 22, "#3de0ff");
      text(nctx, order.label + " $" + order.pay, 10, 32, "#f4f0e8");
    }
  }
  nctx.fillStyle = "#07060c";
  nctx.fillRect(0, 0, NES_W, 16);
  nctx.font = "8px 'Press Start 2P', monospace";
  text(nctx, "$" + String(Math.floor(cash)).padStart(4, "0"), 4, 4, "#f0c430");
  text(nctx, fmtG(grams) + "G", 92, 4, grams > 0 ? "#3dff7a" : "#8a8696");
  text(nctx, "REP " + rep, 168, 4, "#f4f0e8");
  if (mode === "title") {
    nctx.fillStyle = "rgba(7,6,12,0.72)";
    nctx.fillRect(0, 16, NES_W, NES_H - 16);
    nctx.font = "16px 'Press Start 2P', monospace";
    text(nctx, "BLOCK", NES_W / 2, 48, "#f4f0e8", "center");
    text(nctx, "RUN", NES_W / 2, 70, "#e21b7a", "center");
    nctx.font = "8px 'Press Start 2P', monospace";
    text(nctx, "ON FOOT", NES_W / 2, 100, "#3de0ff", "center");
    text(nctx, "PLUG THEN PHONE", NES_W / 2, 118, "#f4f0e8", "center");
    text(nctx, "ORIGINAL SPRITE", NES_W / 2, 136, "#8a8696", "center");
    if (Math.floor(blink * 2) % 2 === 0) {
      text(nctx, hasSave ? "TAP TO CONTINUE" : "PRESS START", NES_W / 2, 164, "#f0c430", "center");
    }
    if (hasSave) text(nctx, "JUMP FOR A NEW BLOCK", NES_W / 2, 184, "#8a8696", "center");
  }
}

function drawPad(r, label, on, accent) {
  ctx.fillStyle = on ? (accent ? "#3de0ff" : "#f4f0e8") : accent ? "#124048" : "#1a1a22";
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = "#3a3644";
  ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  ctx.font = "8px 'Press Start 2P', monospace";
  text(ctx, label, r.x + r.w / 2, r.y + r.h / 2 - 5, on ? "#07060c" : accent ? "#3de0ff" : "#8a8696", "center");
}

function render() {
  const vv = window.visualViewport;
  const w = Math.max(256, Math.floor(vv?.width || window.innerWidth));
  const h = Math.max(224, Math.floor(vv?.height || window.innerHeight));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const L = layout();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#07060c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  renderNes();
  ctx.drawImage(nes, L.nes.x, L.nes.y, L.nes.w, L.nes.h);
  const held = new Set(pointers.values());
  if (keys.has("ArrowLeft") || keys.has("KeyA")) held.add("left");
  if (keys.has("ArrowRight") || keys.has("KeyD")) held.add("right");
  drawPad(L.left, "L", held.has("left"), false);
  drawPad(L.right, "R", held.has("right"), false);
  drawPad(L.jump, "JUMP", held.has("jump") || keys.has("ArrowUp") || keys.has("KeyW"), false);
  drawPad(L.act, "ACT", held.has("act"), true);
}

let last = performance.now();
let acc = 0;
function frame(now) {
  const raw = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += raw;
  while (acc >= STEP) {
    update(STEP);
    acc -= STEP;
  }
  render();
  requestAnimationFrame(frame);
}

hasSave = !!readSave();
Promise.all([
  loadSheet("idle"),
  loadSheet("walk"),
  loadSheet("thug"),
  loadSheet("runner"),
  loadImage("../block-run/sprites/pack.png"),
  loadImage("../block-run/sprites/dumpster.png"),
  loadImage("../block-run/map/street.png"),
]).then(([idle, walk, thug, runner, pack, dumpster, street]) => {
  if (!idle || !walk || !thug || !runner || !pack || !dumpster || !street) return;
  art = { idle, walk, thug, runner, pack, dumpster, street };
  WORLD = street.naturalWidth * 3;
});
requestAnimationFrame(frame);
