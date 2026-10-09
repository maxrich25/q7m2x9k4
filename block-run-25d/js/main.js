import { TICK } from "./config.js?v=20";
import { bindAudioUnlock, unlockAudio, setMuted, isMuted } from "./audio.js?v=20";
import { createInput } from "./input.js?v=20";
import { createGame } from "./game.js?v=20";
import { loadSprites } from "./sprites.js?v=20";
import { createWorld } from "./world.js?v=20";
import { createHud } from "./hud.js?v=20";

const canvas = document.getElementById("scene");
const muteBtn = document.getElementById("btn-mute");
const pauseBtn = document.getElementById("btn-pause");
const resumeBtn = document.getElementById("btn-resume");
const restartBtn = document.getElementById("btn-restart");

bindAudioUnlock();

const input = createInput(document.getElementById("app"));
const game = createGame();
const hud = createHud();

function stopHudClick(e) {
  e.preventDefault();
  e.stopPropagation();
}

muteBtn.addEventListener("pointerdown", (e) => {
  stopHudClick(e);
  setMuted(!isMuted());
  muteBtn.textContent = isMuted() ? "OFF" : "ON";
});

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

restartBtn?.addEventListener("pointerdown", (e) => {
  stopHudClick(e);
  game.restart();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) game.pause();
});

let world = null;
let acc = 0;
let last = performance.now();
let running = true;
let lastProject = null;
let view = { camGameX: 80, halfWidth: 90 };

try {
  const sprites = await loadSprites();
  world = createWorld(canvas, sprites);
} catch (err) {
  const status = document.getElementById("status");
  if (status) status.textContent = String(err && err.message ? err.message : err);
  console.error(err);
}

function frame(now) {
  if (!running) return;
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += dt;
  const inp = input.poll();
  let first = true;
  while (acc >= TICK) {
    const step = first ? inp : {
      ...inp,
      shoot: false, jump: false, start: false, mute: false, pause: false,
      exit: false, gearTap: null, shiftStep: 0,
    };
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
  pause: () => game.pause(),
  resume: () => game.resume(),
  restart: () => game.restart(),
  setKeys: (codes) => input.setKeys(codes),
  giveCash: (n) => game.giveCash(n),
  setGun: (name) => game.setGun(name),
  setCarrying: (on) => game.setCarrying(on),
  setHeat: (h) => game.setHeat(h),
  spawnOrder: (id, opts) => game.spawnOrder(id, opts),
  setInCar: (on) => game.setInCar(on),
  setGear: (name) => game.setGear(name),
  tryShift: (name, brake) => game.tryShift(name, brake),
  setPlayerX: (x) => game.setPlayerX(x),
  setFacing: (dir) => game.setFacing(dir),
  getView: () => world?.getView?.() || view,
  unlockAudio,
};

window.__controlsTest = {
  getX: () => game.getState().player.x,
  getSpeed: () => Math.abs(game.getState().player.vx),
  setKeys: (codes) => input.setKeys(codes),
};
