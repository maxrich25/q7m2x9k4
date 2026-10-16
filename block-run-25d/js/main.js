import { TICK } from "./config.js?v=86";
import { bindAudioUnlock, unlockAudio, startMusic } from "./audio.js?v=86";
import { createInput } from "./input.js?v=86";
import { createGame } from "./game.js?v=86";
import { loadSprites } from "./sprites.js?v=86";
import { createWorld } from "./world.js?v=86";
import { createHud } from "./hud.js?v=86";

const canvas = document.getElementById("scene");
const pauseBtn = document.getElementById("btn-pause");
const resumeBtn = document.getElementById("btn-resume");

function blockTouch(e) {
  if (e.cancelable) e.preventDefault();
}
canvas?.addEventListener("touchstart", blockTouch, { passive: false });
document.getElementById("pad")?.addEventListener("touchstart", blockTouch, { passive: false });
document.getElementById("view")?.addEventListener("touchstart", (e) => {
  if (e.target?.closest?.("#scene, #pad, canvas") && e.cancelable) e.preventDefault();
}, { passive: false });

bindAudioUnlock();

const input = createInput(document.getElementById("app"));
const game = createGame();
const hud = createHud();

function stopHudClick(e) {
  e.preventDefault();
  e.stopPropagation();
}

pauseBtn?.addEventListener("pointerdown", (e) => {
  stopHudClick(e);
  const mode = game.getState().mode;
  if (mode === "play") game.pause();
  else if (mode === "paused") game.resume();
});

resumeBtn?.addEventListener("pointerdown", (e) => {
  stopHudClick(e);
  game.resume();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    game.pause();
    return;
  }
  last = performance.now();
  acc = 0;
  world?.resetCam?.();
});

let world = null;
let acc = 0;
let last = performance.now();
let running = true;
let lastProject = null;
let view = { camGameX: 80, halfWidth: 90 };

try {
  if (document.fonts?.ready) await document.fonts.ready;
  const sprites = await loadSprites();
  world = createWorld(canvas, sprites);
} catch (err) {
  const status = document.getElementById("status");
  if (status) status.textContent = String(err && err.message ? err.message : err);
  console.error(err);
}

const PULSE_KEYS = [
  "shoot", "jump", "start", "mute", "pause", "exit", "gearTap", "shiftStep",
  "accept", "decline", "action", "carBtn", "cribBtn", "pullover",
  "serve", "gate", "hitup", "uturn", "phone", "phoneClose",
  "quickPhone", "quickPhoneClose",
  "textPlug", "pingContact", "pingContactId", "buyGreen", "buyWhite", "buyTier", "buyProduct", "buyTierId", "buyClose", "stashClose",
  "inventory", "invClose", "phoneTab",
  "stashInCash", "stashOutCash", "stashInGreen", "stashOutGreen",
  "stashInWhite", "stashOutWhite",
  "cribClose", "cribClothes", "cribSleep", "cribWait", "cribSave", "cribStash",
  "outfitClose", "outfitHat",
  "pickClose", "pickId", "zoom", "zoomNudge",
];

function frame(now) {
  if (!running) return;
  const raw = (now - last) / 1000;
  const dt = Math.min(1 / 30, Number.isFinite(raw) && raw >= 0 ? raw : 0);
  last = now;
  acc = Math.min(TICK * 4, acc + dt);
  const inp = input.poll();
  let first = true;
  let state = null;
  while (acc >= TICK) {
    const step = first ? inp : Object.fromEntries(Object.entries(inp).map(([k, v]) => {
      if (PULSE_KEYS.includes(k)) return [k, k === "gearTap" ? null : (k === "shiftStep" || k === "zoomNudge" ? 0 : false)];
      return [k, v];
    }));
    state = game.tick(TICK, step, view);
    acc -= TICK;
    first = false;
  }
  if (!state) state = game.getState();
  const alpha = state.mode === "paused" ? 1 : Math.max(0, Math.min(1, acc / TICK));
  if (world) {
    const info = world.sync(state, dt, alpha);
    lastProject = info.project;
    view = world.getView();
  }
  hud.sync(state, lastProject);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

window.__br = {
  getState: () => game.getState(),
  start: () => game.start(),
  finishIntro: () => game.finishIntro(),
  toTitle: () => game.toTitle?.(),
  pause: () => game.pause(),
  resume: () => game.resume(),
  setHold: (on) => game.setHold?.(on),
  restart: () => game.restart(),
  setKeys: (codes) => input.setKeys(codes),
  giveCash: (n) => game.giveCash(n),
  setGun: (name) => game.setGun(name),
  setCarrying: (on) => game.setCarrying(on),
  setHeat: (h) => game.setHeat(h),
  setPacks: (n) => game.setPacks(n),
  setInv: (id, g) => game.setInv(id, g),
  setStashInv: (id, g) => game.setStashInv(id, g),
  setRep: (n) => game.setRep(n),
  setStash: (n) => game.setStash(n),
  setClock: (t) => game.setClock(t),
  acceptOrder: () => game.acceptOrder(),
  stallOrder: () => game.stallOrder(),
  setBoughtOnce: (on) => game.setBoughtOnce?.(on),
  setPhoneTab: (t) => game.setPhoneTab?.(t),
  declineOrder: () => game.declineOrder(),
  buyPack: () => game.buyPack(),
  buyProduct: (id) => game.buyProduct(id),
  stashCash: () => game.stashCash(),
  transfer: (k, d) => game.transfer(k, d),
  solicit: () => game.solicit(),
  serve: () => game.serve(),
  textPlug: () => game.textPlug(),
  pingContact: (id) => game.pingContact(id),
  togglePhone: () => game.togglePhone(),
  setUi: (name) => game.setUi(name),
  openBuy: () => game.openBuy(),
  openStash: () => game.openStash(),
  openCrib: () => game.openCrib(),
  enterCrib: () => game.enterCrib?.(),
  leaveCrib: () => game.leaveCrib?.(),
  openOutfit: () => game.openOutfit?.(),
  setInCrib: (on) => game.setInCrib?.(on),
  setCribX: (x) => game.setCribX?.(x),
  cycleOutfit: () => game.cycleOutfit(),
  cycleZoom: () => game.cycleZoom?.(),
  nudgeZoom: (d) => game.nudgeZoom?.(d),
  analogZoom: (n) => game.analogZoom?.(n),
  setZoom: (z) => game.setZoom?.(z),
  setBoardT: (t) => game.setBoardT?.(t),
  setLookFace: (v) => world?.setLookFace?.(v),
  sleepCrib: () => game.sleepCrib(),
  waitCrib: () => game.waitCrib(),
  saveCrib: () => game.saveCrib(),
  doAction: () => game.doAction(),
  doCarBtn: () => game.doCarBtn?.(),
  doCribBtn: () => game.doCribBtn?.(),
  toggleQuickPhone: () => game.toggleQuickPhone?.(),
  startPullOver: () => game.startPullOver?.(),
  setTimeHours: (h) => game.setTimeHours(h),
  setOutfit: (i) => game.setOutfit(i),
  setWardrobe: (slot, id) => game.setWardrobe?.(slot, id),
  useGate: () => game.useGate(),
  doUTurn: () => game.doUTurn(),
  setCarLat: (n) => game.setCarLat?.(n),
  setParked: (on) => game.setParked?.(on),
  addContact: (n, look) => game.addContact(n, look),
  startUTurn: (dir) => game.startUTurn(dir),
  setTurnMid: () => game.setTurnMid(),
  clearOrder: () => game.clearOrder(),
  setPedX: (i, x) => game.setPedX(i, x),
  setPedLane: (i, lane) => game.setPedLane?.(i, lane),
  setPedStride: (i, n) => game.setPedStride?.(i, n),
  setStride: (t) => game.setStride?.(t),
  setTurnT: (t, from) => game.setTurnT?.(t, from),
  spawnOrder: (id, opts) => game.spawnOrder(id, opts),
  setInCar: (on) => game.setInCar(on),
  setGear: (name) => game.setGear(name),
  tryShift: (name, brake) => game.tryShift(name, brake),
  setPlayerX: (x) => game.setPlayerX(x),
  setCarX: (x) => game.setCarX?.(x),
  setFacing: (dir) => game.setFacing(dir),
  setAnim: (t) => game.setAnim(t),
  setCarVx: (n) => game.setCarVx(n),
  setPassLane: (on) => game.setPassLane(on),
  placeTrafficAhead: () => game.placeTrafficAhead(),
  placeCars: (list) => game.placeCars?.(list),
  getView: () => world?.getView?.() || view,
  resetCam: () => world?.resetCam?.(),
  unlockAudio,
  startMusic,
  setMuted: (on) => game.setMuted(on),
  toggleMute: () => game.toggleMute(),
};

window.__controlsTest = {
  getX: () => game.getState().player.x,
  getSpeed: () => Math.abs(game.getState().player.vx),
  setKeys: (codes) => input.setKeys(codes),
};
