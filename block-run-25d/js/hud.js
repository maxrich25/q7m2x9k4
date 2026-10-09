import { WEAPONS, CAR_HP } from "./config.js?v=9";
import { isMuted, isUnlocked } from "./audio.js?v=9";

export function createHud() {
  const cashEl = document.getElementById("hud-cash");
  const gunEl = document.getElementById("hud-gun");
  const heatEl = document.getElementById("hud-heat");
  const hpEl = document.getElementById("hud-hp");
  const carEl = document.getElementById("hud-car");
  const waveEl = document.getElementById("hud-wave");
  const muteBtn = document.getElementById("btn-mute");
  const overlay = document.getElementById("overlay");
  const titleEl = document.getElementById("overlay-title");
  const subEl = document.getElementById("overlay-sub");
  const bodyEl = document.getElementById("overlay-body");
  const hiEl = document.getElementById("overlay-hi");
  const promptEl = document.getElementById("overlay-prompt");
  const popsEl = document.getElementById("pops");
  const edgeL = document.getElementById("edge-left");
  const edgeR = document.getElementById("edge-right");
  const destL = document.getElementById("dest-left");
  const destR = document.getElementById("dest-right");
  const phone = document.getElementById("phone");
  const phoneMsg = document.getElementById("phone-msg");
  const phoneTimer = document.getElementById("phone-timer");
  const actionPrompt = document.getElementById("prompt");
  const status = document.getElementById("status");

  function pips(el, count, filled, cls) {
    if (!el) return;
    while (el.children.length < count) {
      const d = document.createElement("span");
      d.className = "pip";
      el.appendChild(d);
    }
    [...el.children].forEach((n, i) => {
      n.className = "pip" + (i < filled ? ` on ${cls}` : "");
    });
  }

  let popNodes = [];

  function sync(state, project) {
    cashEl.textContent = "$" + String(state.cash).padStart(4, "0");
    if (state.carrying) {
      gunEl.textContent = "PACK";
      gunEl.classList.add("pack");
    } else {
      gunEl.textContent = WEAPONS[state.gun].label;
      gunEl.classList.remove("pack");
    }
    pips(heatEl, 3, Math.min(3, Math.ceil(state.heat)), "heat");
    pips(hpEl, 3, state.hp, "hp");
    const showCar = !!(state.inCar || (state.car && state.car.hp < CAR_HP));
    if (carEl) {
      carEl.classList.toggle("hidden", !showCar);
      if (showCar) pips(carEl, CAR_HP, Math.max(0, state.car?.hp || 0), "car");
    }
    waveEl.textContent = "W" + state.wave;
    muteBtn.textContent = isMuted() ? "OFF" : "ON";
    edgeL?.classList.toggle("hidden", !state.edgeL);
    edgeR?.classList.toggle("hidden", !state.edgeR);
    destL?.classList.toggle("hidden", state.destSide !== -1);
    destR?.classList.toggle("hidden", state.destSide !== 1);

    if (phone) {
      const on = !!(state.order && state.mode === "play");
      phone.classList.toggle("hidden", !on);
      if (on) {
        phoneMsg.textContent = state.order.text;
        const sec = Math.max(0, Math.ceil(state.order.t));
        phoneTimer.textContent = "0:" + String(sec).padStart(2, "0");
        phone.classList.toggle("urgent", state.order.t < 8);
      }
    }
    if (actionPrompt) {
      const show = !!(state.prompt && state.mode === "play");
      actionPrompt.classList.toggle("hidden", !show);
      if (show) actionPrompt.textContent = state.prompt;
    }

    const show = state.mode !== "play";
    overlay.classList.toggle("hidden", !show);
    titleEl.classList.remove("wasted", "clear");
    if (state.mode === "title") {
      titleEl.innerHTML = "BLOCK<br><span>RUN</span>";
      subEl.textContent = "2.5D NIGHT BLOCK";
      bodyEl.innerHTML = "JUMP TO DODGE<br>SELL PACKS  BUY GUNS<br>DRIVE DEALS  HEAT CALLS COPS";
      hiEl.textContent = "HI $" + state.hi;
      promptEl.textContent = isUnlocked() ? "PRESS START" : "TAP FOR SOUND";
    } else if (state.mode === "dead") {
      titleEl.textContent = "WASTED";
      titleEl.classList.add("wasted");
      subEl.textContent = "";
      bodyEl.textContent = "CASH $" + state.cash;
      hiEl.textContent = "HI $" + state.hi;
      promptEl.textContent = "TAP TO RESTART";
    } else if (state.mode === "clear") {
      titleEl.innerHTML = "STAGE<br>CLEAR";
      titleEl.classList.add("clear");
      subEl.textContent = "";
      bodyEl.textContent = "CASH $" + state.cash;
      hiEl.textContent = "GUN " + WEAPONS[state.gun].label;
      promptEl.textContent = "TAP FOR WAVE " + (state.wave + 1);
    }

    if (status) {
      status.textContent = `${state.mode}  $${state.cash}  hp ${state.hp}  ${WEAPONS[state.gun].label}`;
    }

    while (popNodes.length < state.pops.length) {
      const n = document.createElement("div");
      n.className = "pop";
      popsEl.appendChild(n);
      popNodes.push(n);
    }
    popNodes.forEach((n, i) => {
      const p = state.pops[i];
      if (!p) {
        n.style.display = "none";
        return;
      }
      n.style.display = "block";
      n.textContent = p.text;
      if (project) {
        const s = project(p.x, p.y);
        n.style.left = s.x + "px";
        n.style.top = s.y + "px";
        n.style.opacity = String(Math.max(0, p.life / 0.8));
      }
    });
  }

  return { sync };
}
