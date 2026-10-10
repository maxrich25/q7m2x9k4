import { TICK } from "../../block-run-25d/js/config.js?v=42";
import { bindAudioUnlock, unlockAudio, startMusic } from "../../block-run-25d/js/audio.js?v=42";
import { createInput } from "../../block-run-25d/js/input.js?v=42";
import { createGame } from "../../block-run-25d/js/game.js?v=42";
import { createHud } from "../../block-run-25d/js/hud.js?v=42";
import { loadArt } from "./art.js?v=42";
import { createWorld } from "./draw.js?v=42";

const canvas = document.getElementById("scene");
const pauseBtn = document.getElementById("btn-pause");
const resumeBtn = document.getElementById("btn-resume");

bindAudioUnlock();

const input = createInput(document.getElementById("app"));
const game = createGame();
const hud = createHud({ subtitle: "CLASSIC NIGHT BLOCK" });

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
  if (document.hidden) game.pause();
});

let world = null;
let acc = 0;
let last = performance.now();
let running = true;
let lastProject = null;
let view = { camGameX: 80, halfWidth: 128 };

try {
  const art = await loadArt();
  world = createWorld(canvas, art);
} catch (err) {
  const status = document.getElementById("status");
  if (status) status.textContent = String(err && err.message ? err.message : err);
  console.error(err);
}

const PULSE_KEYS = [
  "shoot", "jump", "start", "mute", "pause", "exit", "gearTap", "shiftStep",
  "accept", "decline", "serve", "gate", "hitup", "uturn", "phone", "phoneClose",
  "textPlug", "pingContact", "pingContactId", "buyGreen", "buyWhite", "buyTier", "buyProduct", "buyTierId", "buyClose", "stashClose",
  "inventory", "invClose", "phoneTab",
  "stashInCash", "stashOutCash", "stashInGreen", "stashOutGreen",
  "stashInWhite", "stashOutWhite",
  "cribClose", "cribClothes", "cribSleep", "cribWait", "cribStash",
];

function frame(now) {
  if (!running) return;
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += dt;
  const inp = input.poll();
  let first = true;
  while (acc >= TICK) {
    const step = first ? inp : Object.fromEntries(Object.entries(inp).map(([k, v]) => {
      if (PULSE_KEYS.includes(k)) return [k, k === "gearTap" || k === "shiftStep" ? (k === "gearTap" ? null : 0) : false];
      return [k, v];
    }));
    game.tick(TICK, step, view);
    acc -= TICK;
    first = false;
  }
  const state = game.getState();
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
  pause: () => game.pause(),
  resume: () => game.resume(),
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
  cycleOutfit: () => game.cycleOutfit(),
  sleepCrib: () => game.sleepCrib(),
  waitCrib: () => game.waitCrib(),
  setTimeHours: (h) => game.setTimeHours(h),
  setOutfit: (i) => game.setOutfit(i),
  useGate: () => game.useGate(),
  doUTurn: () => game.doUTurn(),
  addContact: (n, look) => game.addContact(n, look),
  startUTurn: (dir) => game.startUTurn(dir),
  setTurnMid: () => game.setTurnMid(),
  clearOrder: () => game.clearOrder(),
  setPedX: (i, x) => game.setPedX(i, x),
  spawnOrder: (id, opts) => game.spawnOrder(id, opts),
  setInCar: (on) => game.setInCar(on),
  setGear: (name) => game.setGear(name),
  tryShift: (name, brake) => game.tryShift(name, brake),
  setPlayerX: (x) => game.setPlayerX(x),
  setFacing: (dir) => game.setFacing(dir),
  getView: () => world?.getView?.() || view,
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
