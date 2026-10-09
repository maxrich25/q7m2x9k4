import { WEAPONS, CAR_HP } from "./config.js?v=17";
import { isMuted, isUnlocked } from "./audio.js?v=17";

const TITLE_TIPS = [
  "JUMP TO DODGE",
  "SELL PACKS",
  "BUY GUNS",
  "DRIVE DEALS",
  "HEAT CALLS COPS",
];

const CONTROL_TIPS = [
  "ON FOOT: L / JUMP / R / FIRE",
  "IN CAR: BRAKE / EXIT / GAS / SHOOT",
  "JUMP TURNS THE CAR",
];

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
  const pauseActions = document.getElementById("pause-actions");
  const popsEl = document.getElementById("pops");
  const edgeL = document.getElementById("edge-left");
  const edgeR = document.getElementById("edge-right");
  const destL = document.getElementById("dest-left");
  const destR = document.getElementById("dest-right");
  const phone = document.getElementById("phone");
  const phoneMsg = document.getElementById("phone-msg");
  const phoneTimer = document.getElementById("phone-timer");
  const actionPrompt = document.getElementById("prompt");
  const dealNav = document.getElementById("deal-nav");
  const dealDist = document.getElementById("deal-dist");
  const dealMe = document.getElementById("deal-me");
  const dealPin = document.getElementById("deal-pin");
  const status = document.getElementById("status");
  const padLeft = document.querySelector('[data-role="left"]');
  const padJump = document.querySelector('[data-role="jump"]');
  const padRight = document.querySelector('[data-role="right"]');
  const padFire = document.querySelector('[data-role="fire"]');

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

  function tipsHtml(lines, extra = []) {
    return [...lines, ...extra].map((line, i) => {
      const dim = extra.includes(line) || i >= lines.length ? " class=\"tip-dim\"" : "";
      return `<p${dim}>${line}</p>`;
    }).join("");
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

    const driving = !!(state.inCar && state.mode === "play");
    if (padLeft) padLeft.textContent = driving ? "BRAKE" : "L";
    if (padRight) padRight.textContent = driving ? "GAS" : "R";
    if (padFire) padFire.textContent = driving ? "SHOOT" : "FIRE";
    if (padJump) {
      if (!driving) padJump.textContent = "JUMP";
      else padJump.textContent = Math.abs(state.car?.vx || 0) < 36 ? "EXIT" : "TURN";
    }
    document.getElementById("pad")?.classList.toggle("driving", driving);

    if (phone) {
      const on = !!(state.order && (state.mode === "play" || state.mode === "paused"));
      phone.classList.toggle("hidden", !on);
      if (on) {
        phoneMsg.textContent = state.order.text;
        const sec = Math.max(0, Math.ceil(state.order.t));
        phoneTimer.textContent = sec >= 60
          ? Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0")
          : "0:" + String(sec).padStart(2, "0");
        phone.classList.toggle("urgent", state.order.t < 8);
      }
    }
    if (dealNav) {
      const on = !!(state.order && (state.mode === "play" || state.mode === "paused"));
      dealNav.classList.toggle("hidden", !on);
      if (on && dealDist) {
        const arrow = state.dealDir < 0 ? "<<" : ">>";
        dealDist.textContent = `DEAL ${state.dealLabel || (state.dealM + " ft")} ${arrow}`;
      }
      if (on && dealMe) dealMe.style.left = `${Math.max(0, Math.min(100, state.dealMe * 100))}%`;
      if (on && dealPin) dealPin.style.left = `${Math.max(0, Math.min(100, state.dealAt * 100))}%`;
    }
    if (actionPrompt) {
      const show = !!(state.prompt && state.mode === "play");
      actionPrompt.classList.toggle("hidden", !show);
      if (show) actionPrompt.textContent = state.prompt;
    }

    const show = state.mode !== "play";
    overlay.classList.toggle("hidden", !show);
    overlay.classList.toggle("pause-mode", state.mode === "paused");
    pauseActions?.classList.toggle("hidden", state.mode !== "paused");
    titleEl.classList.remove("wasted", "clear");
    bodyEl.classList.remove("tips");
    if (state.mode === "title") {
      titleEl.innerHTML = "BLOCK<br><span>RUN</span>";
      subEl.textContent = "2.5D NIGHT BLOCK";
      bodyEl.classList.add("tips");
      bodyEl.innerHTML = tipsHtml(TITLE_TIPS, CONTROL_TIPS);
      hiEl.textContent = "HI $" + state.hi;
      promptEl.textContent = isUnlocked() ? "PRESS START" : "TAP FOR SOUND";
    } else if (state.mode === "paused") {
      titleEl.textContent = "PAUSED";
      subEl.textContent = "";
      bodyEl.classList.add("tips");
      bodyEl.innerHTML = tipsHtml(CONTROL_TIPS, ["ESC OR P TO PAUSE"]);
      hiEl.textContent = "CASH $" + state.cash;
      promptEl.textContent = "";
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
