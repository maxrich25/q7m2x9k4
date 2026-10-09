import { TICK } from "./config.js?v=3";
import { bindAudioUnlock, unlockAudio, setMuted, isMuted } from "./audio.js?v=3";
import { createInput } from "./input.js?v=3";
import { createGame } from "./game.js?v=3";
import { loadSprites } from "./sprites.js?v=3";
import { createWorld } from "./world.js?v=3";
import { createHud } from "./hud.js?v=3";

const canvas = document.getElementById("scene");
const muteBtn = document.getElementById("btn-mute");

bindAudioUnlock();

const input = createInput(document.getElementById("app"));
const game = createGame();
const hud = createHud();

muteBtn.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  setMuted(!isMuted());
  muteBtn.textContent = isMuted() ? "OFF" : "ON";
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
    const step = first ? inp : { ...inp, shoot: false, jump: false, start: false, mute: false };
    game.tick(TICK, step, view);
    acc -= TICK;
    first = false;
  }
  const state = game.getState();
  if (world) {
    const info = world.sync(state, dt);
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
  setKeys: (codes) => input.setKeys(codes),
  giveCash: (n) => game.giveCash(n),
  setGun: (name) => game.setGun(name),
  getView: () => world?.getView?.() || view,
  unlockAudio,
};

window.__controlsTest = {
  getX: () => game.getState().player.x,
  getSpeed: () => Math.abs(game.getState().player.vx),
  setKeys: (codes) => input.setKeys(codes),
};
