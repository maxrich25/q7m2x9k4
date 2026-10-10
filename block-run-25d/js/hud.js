import { GEARS } from "./config.js?v=22";
import { isUnlocked } from "./audio.js?v=22";

const TITLE_TIPS = [
  "BUY PACKS AT THE PLUG",
  "ACCEPT DEALS ON YOUR PHONE",
  "HIT UP PEDS ON THE BLOCK",
  "STASH CASH AT HOME",
  "REDS AND HEAT BRING 5-0",
];

const CONTROL_TIPS = [
  "ON FOOT: L / JUMP / R",
  "NEAR A PED: HIT UP",
  "IN CAR: STEER  BRAKE  GAS  P-R-N-D",
  "HOLD BRAKE TO SHIFT",
  "EXIT IN PARK",
];

export function createHud() {
  const cashEl = document.getElementById("hud-cash");
  const packsEl = document.getElementById("hud-packs");
  const heatEl = document.getElementById("hud-heat");
  const repEl = document.getElementById("hud-rep");
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
  const phoneActions = document.getElementById("phone-actions");
  const actionPrompt = document.getElementById("prompt");
  const dealNav = document.getElementById("deal-nav");
  const dealDist = document.getElementById("deal-dist");
  const dealMe = document.getElementById("deal-me");
  const dealPin = document.getElementById("deal-pin");
  const status = document.getElementById("status");
  const padFoot = document.getElementById("pad-foot");
  const padCar = document.getElementById("pad-car");
  const shiftKnob = document.getElementById("shift-knob");
  const shiftHint = document.getElementById("shift-hint");
  const padExit = document.querySelector('[data-role="exit"]');
  const padJump = document.querySelector('[data-role="jump"]');

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

  function placeKnob(gear) {
    if (!shiftKnob) return;
    const btn = document.querySelector(`.gear[data-gear="${gear}"]`);
    const rail = document.getElementById("shift-rail");
    if (btn && rail) {
      const mid = btn.getBoundingClientRect().top + btn.getBoundingClientRect().height / 2;
      const top = mid - rail.getBoundingClientRect().top - shiftKnob.offsetHeight / 2;
      shiftKnob.style.top = `${Math.max(2, top)}px`;
      return;
    }
    const i = Math.max(0, GEARS.indexOf(gear));
    shiftKnob.style.top = `${4 + i * 28}px`;
  }

  let popNodes = [];

  function sync(state, project) {
    cashEl.textContent = "$" + String(state.cash).padStart(4, "0");
    if (packsEl) packsEl.textContent = (state.packs || 0) + " PK";
    pips(heatEl, 3, Math.min(3, Math.ceil(state.heat)), "heat");
    if (repEl) repEl.textContent = "R" + Math.round(state.rep || 0);
    edgeL?.classList.toggle("hidden", !state.edgeL);
    edgeR?.classList.toggle("hidden", !state.edgeR);
    destL?.classList.toggle("hidden", state.destSide !== -1);
    destR?.classList.toggle("hidden", state.destSide !== 1);

    const driving = !!(state.inCar && state.mode === "play");
    document.getElementById("pad")?.classList.toggle("driving", driving);
    padFoot?.classList.toggle("hidden", driving);
    padCar?.classList.toggle("hidden", !driving);
    const gear = state.car?.gear || "P";
    document.querySelectorAll("#shifter .gear").forEach((el) => {
      el.classList.toggle("on", el.dataset.gear === gear);
    });
    if (driving) placeKnob(gear);
    shiftHint?.classList.toggle("hidden", !(driving && (state.car?.shiftHint || 0) > 0));
    padExit?.classList.toggle("off", driving && !state.exitOk);
    if (padJump) {
      padJump.textContent = state.hitUp ? "HIT UP" : (state.prompt === "BUY $20" || state.prompt === "NEED $"
        ? "BUY"
        : state.prompt === "STASH" || state.prompt === "HOME"
          ? "HOME"
          : "JUMP");
    }

    const offer = state.order?.phase === "offer";
    const live = state.order && (state.order.phase === "active" || state.order.phase === "nudge");
    if (phone) {
      const on = !!(state.order && (state.mode === "play" || state.mode === "paused"));
      phone.classList.toggle("hidden", !on);
      if (on) {
        phoneMsg.textContent = state.order.text;
        const timed = live;
        phoneTimer.classList.toggle("hidden", !timed);
        if (timed) {
          const sec = Math.max(0, Math.ceil(state.order.t));
          phoneTimer.textContent = sec >= 60
            ? Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0")
            : "0:" + String(sec).padStart(2, "0");
        }
        phone.classList.toggle("urgent", state.order.phase === "nudge" || (live && state.order.t < 8));
      }
      phoneActions?.classList.toggle("hidden", !offer || state.mode !== "play");
    }
    if (dealNav) {
      const on = !!(live && (state.mode === "play" || state.mode === "paused"));
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
      promptEl.textContent = isUnlocked() ? "TAP TO START" : "TAP TO START";
    } else if (state.mode === "paused") {
      titleEl.textContent = "PAUSED";
      subEl.textContent = "";
      bodyEl.classList.add("tips");
      bodyEl.innerHTML = tipsHtml(CONTROL_TIPS, ["ESC OR P TO PAUSE"]);
      hiEl.textContent = "CASH $" + state.cash + "  STASH $" + (state.stash || 0);
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
      hiEl.textContent = "";
      promptEl.textContent = "TAP TO CONTINUE";
    }

    if (status) {
      status.textContent = `${state.mode}  $${state.cash}  ${state.packs || 0} pk  r${state.rep || 0}`;
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
