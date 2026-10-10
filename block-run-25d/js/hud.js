import { GEARS, PRODUCTS, fmtGrams, formatDeal, HOME_X } from "./config.js?v=34";
import { isUnlocked } from "./audio.js?v=34";

export function createHud(opts = {}) {
  const subtitle = opts.subtitle || "2.5D NIGHT BLOCK";
  const cashEl = document.getElementById("hud-cash");
  const invEl = document.getElementById("hud-inv") || document.getElementById("hud-packs");
  const heatEl = document.getElementById("hud-heat");
  const repEl = document.getElementById("hud-rep");
  const overlay = document.getElementById("overlay");
  const titleEl = document.getElementById("overlay-title");
  const subEl = document.getElementById("overlay-sub");
  const bodyEl = document.getElementById("overlay-body");
  const hiEl = document.getElementById("overlay-hi");
  const promptEl = document.getElementById("overlay-prompt");
  const pauseActions = document.getElementById("pause-actions");
  const btnMute = document.getElementById("btn-mute");
  const btnSound = document.getElementById("btn-sound");
  const popsEl = document.getElementById("pops");
  const edgeL = document.getElementById("edge-left");
  const edgeR = document.getElementById("edge-right");
  const destL = document.getElementById("dest-left");
  const destR = document.getElementById("dest-right");
  const phone = document.getElementById("phone");
  const phoneFrom = document.getElementById("phone-from");
  const phoneMsg = document.getElementById("phone-msg");
  const phoneTimer = document.getElementById("phone-timer");
  const phoneActions = document.getElementById("phone-actions");
  const actionPrompt = document.getElementById("prompt");
  const dealNav = document.getElementById("deal-nav");
  const dealDist = document.getElementById("deal-dist");
  const dealMe = document.getElementById("deal-me");
  const dealPin = document.getElementById("deal-pin");
  const dealHome = document.getElementById("deal-home");
  const status = document.getElementById("status");
  const padFoot = document.getElementById("pad-foot");
  const padCar = document.getElementById("pad-car");
  const shiftKnob = document.getElementById("shift-knob");
  const shiftHint = document.getElementById("shift-hint");
  const padUturn = document.querySelector('[data-role="uturn"]');
  const ctx = document.getElementById("ctx");
  const btnServe = document.getElementById("btn-serve");
  const btnGate = document.getElementById("btn-gate");
  const btnHit = document.getElementById("btn-hitup");
  const saleEl = document.getElementById("sale-pop");
  const saleWhat = document.getElementById("sale-what");
  const saleAmt = document.getElementById("sale-amt");
  const saleCash = document.getElementById("sale-cash");
  const sheetPhone = document.getElementById("sheet-phone");
  const sheetBuy = document.getElementById("sheet-buy");
  const sheetStash = document.getElementById("sheet-stash");
  const sheetCrib = document.getElementById("sheet-crib");
  const cribClock = document.getElementById("crib-clock");
  const cribTime = document.getElementById("crib-time");
  const cribRep = document.getElementById("crib-rep");
  const cribFit = document.getElementById("crib-fit");
  const hudTime = document.getElementById("hud-time");
  const phoneInv = document.getElementById("phone-inv");
  const phoneList = document.getElementById("phone-list");
  const phoneHomeDist = document.getElementById("phone-home-dist");
  const buyCash = document.getElementById("buy-cash");
  const buyGreenList = document.getElementById("buy-green-list");
  const buyWhiteList = document.getElementById("buy-white-list");
  const stashRows = document.getElementById("stash-rows");
  const invRows = document.getElementById("inv-rows");
  const sheetInv = document.getElementById("sheet-inv");
  const btnPhone = document.getElementById("btn-phone");
  const phoneTexts = document.getElementById("phone-texts");
  const tabTexts = document.getElementById("tab-texts");
  const tabContacts = document.getElementById("tab-contacts");
  const phoneHomeRow = document.getElementById("phone-home-row");
  const brakeShift = document.getElementById("brake-shift");

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

  function invLine(state) {
    const g = state.inv || {};
    return `GRN ${fmtGrams(g.GREEN)}g  WHT ${fmtGrams(g.WHITE)}g`;
  }

  function renderPhone(state) {
    if (phoneInv) phoneInv.textContent = `CASH $${state.cash}  ${invLine(state)}`;
    if (phoneHomeDist) {
      phoneHomeDist.textContent = formatDeal(state.player.x, HOME_X) + " HOME";
    }
    const textsOn = state.phoneTab !== "contacts";
    tabTexts?.classList.toggle("on", textsOn);
    tabContacts?.classList.toggle("on", !textsOn);
    phoneTexts?.classList.toggle("on", textsOn);
    phoneList?.classList.toggle("hidden", textsOn);
    phoneHomeRow?.classList.toggle("hidden", textsOn);
    if (phoneTexts) {
      phoneTexts.innerHTML = (state.inbox || []).map((m) => (
        `<div class="txt-row"><div class="who">${m.from || "TXT"}</div>${m.text || ""}</div>`
      )).join("") || `<div class="txt-row">NO TEXTS YET</div>`;
    }
    if (!phoneList) return;
    phoneList.innerHTML = "";
    for (const c of state.contacts || []) {
      const row = document.createElement("div");
      row.className = "contact" + (c.kind === "plug" ? " plug-row" : "");
      const st = c.kind === "plug"
        ? (c.status === "meet" ? "AT THE SPOT" : "RE-UP")
        : c.status === "offering" ? "TEXTED"
          : c.status === "waiting" ? "WAITING"
            : c.status === "nudge" ? "WHERE U AT"
              : (c.flakes ? `AROUND ${c.flakes}/3` : "AROUND");
      row.innerHTML = `<div><div class="who">${c.name}</div><div class="st">${st}</div></div>`;
      if (c.kind === "plug") {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.role = "text-plug";
        b.textContent = c.status === "meet" ? "MEET" : "TEXT";
        row.appendChild(b);
      }
      phoneList.appendChild(row);
    }
  }

  function renderBuy(state) {
    if (buyCash) buyCash.textContent = `CASH $${state.cash}  ${invLine(state)}`;
    const rep = state.rep || 0;
    function fill(el, tiers, product, cls) {
      if (!el) return;
      el.innerHTML = (tiers || []).map((t) => {
        const locked = rep < (t.minRep || 0);
        return `<button type="button" class="sheet-buy ${cls || ""}" data-role="buy-tier" data-product="${product}" data-tier="${t.id}" ${locked ? "disabled" : ""}>${product === "WHITE" ? "WHT" : "GRN"} ${t.label} $${t.cost}${locked ? " R" + t.minRep : ""}</button>`;
      }).join("");
    }
    fill(buyGreenList, state.greenTiers || [], "GREEN", "");
    fill(buyWhiteList, state.whiteTiers || [], "WHITE", "white");
  }

  function renderStash(state) {
    if (!stashRows) return;
    const g = state.inv || {};
    const s = state.stashInv || {};
    stashRows.innerHTML = [
      ["CASH", `YOU $${state.cash}`, `HOME $${state.stash || 0}`, "stash-in-cash", "stash-out-cash"],
      ["GREEN", `YOU ${fmtGrams(g.GREEN)}g`, `HOME ${fmtGrams(s.GREEN)}g`, "stash-in-green", "stash-out-green"],
      ["WHITE", `YOU ${fmtGrams(g.WHITE)}g`, `HOME ${fmtGrams(s.WHITE)}g`, "stash-in-white", "stash-out-white"],
    ].map(([lab, you, home, inn, out]) => (
      `<div class="stash-row"><div>${lab}<br>${you}<br>${home}</div>`
      + `<button type="button" class="stash-btn" data-role="${inn}">IN</button>`
      + `<button type="button" class="stash-btn" data-role="${out}">OUT</button></div>`
    )).join("");
  }

  function renderCrib(state) {
    const clock = state.timeLabel || "9 PM";
    const repLine = "REP " + Math.round(state.rep || 0);
    if (cribTime) cribTime.textContent = clock;
    if (cribRep) cribRep.textContent = repLine;
    else if (cribClock) cribClock.textContent = clock + "   " + repLine;
    if (cribFit) {
      const cur = (state.outfits || [])[state.outfit | 0];
      cribFit.textContent = cur ? cur.label : "RED HOOD";
    }
  }

  let popNodes = [];

  function sync(state, project) {
    cashEl.textContent = "$" + String(state.cash).padStart(4, "0");
    if (invEl) invEl.textContent = invLine(state);
    pips(heatEl, 3, Math.min(3, Math.ceil(state.heat)), "heat");
    if (repEl) repEl.textContent = "REP " + Math.round(state.rep || 0);
    if (hudTime) hudTime.textContent = state.timeLabel || "9 PM";
    const muted = !!state.muted;
    btnMute?.classList.toggle("off", muted);
    if (btnMute) {
      btnMute.textContent = muted ? "X" : "SP";
      btnMute.setAttribute("aria-label", muted ? "sound off" : "sound on");
    }
    if (btnSound) {
      btnSound.textContent = muted ? "SOUND OFF" : "SOUND ON";
      btnSound.classList.toggle("off", muted);
    }
    edgeL?.classList.toggle("hidden", !state.edgeL);
    edgeR?.classList.toggle("hidden", !state.edgeR);
    destL?.classList.toggle("hidden", state.destSide !== -1);
    destR?.classList.toggle("hidden", state.destSide !== 1);
    if (destL) destL.textContent = "◀ " + (state.navLabel || "DEAL");
    if (destR) destR.textContent = (state.navLabel || "DEAL") + " ▶";

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
    padUturn?.classList.toggle("off", driving && !state.turnOk);
    padUturn?.classList.toggle("hidden", !state.turnOk);
    brakeShift?.classList.toggle("hidden", !(driving && state.stopped));
    if (brakeShift && driving && state.stopped) {
      brakeShift.querySelectorAll("[data-gear]").forEach((el) => {
        el.classList.toggle("on", el.dataset.gear === gear);
      });
    }
    btnPhone?.classList.toggle("unread", !!state.unread);

    const playUi = state.mode === "play" && !state.ui;
    if (ctx) {
      const any = playUi && (state.showServe || state.showGate || state.showHitUp);
      ctx.classList.toggle("hidden", !any);
    }
    btnServe?.classList.toggle("hidden", !(playUi && state.showServe));
    btnGate?.classList.toggle("hidden", !(playUi && state.showGate));
    if (btnGate && state.gate) btnGate.textContent = state.gate;
    btnHit?.classList.toggle("hidden", !(playUi && state.showHitUp));

    const offer = state.order?.phase === "offer" || state.order?.phase === "stalling";
    const live = state.order && (state.order.phase === "active" || state.order.phase === "nudge");
    if (phone) {
      const on = !!(state.order && (state.mode === "play" || state.mode === "paused") && state.ui !== "phone");
      phone.classList.toggle("hidden", !on);
      if (on) {
        if (phoneFrom) phoneFrom.textContent = (state.order.name || "TXT") + " TXT";
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
      phoneActions?.classList.toggle("hidden", !offer || state.mode !== "play" || !!state.ui);
    }
    if (dealNav) {
      const on = state.mode === "play" || state.mode === "paused";
      dealNav.classList.toggle("hidden", !on || !!state.ui);
      if (on && dealDist) {
        const arrow = state.dealDir < 0 ? "<<" : ">>";
        dealDist.textContent = `${state.navLabel || "HOME"} ${state.dealLabel || (state.dealM + " ft")} ${arrow}`;
      }
      if (on && dealMe) dealMe.style.left = `${Math.max(0, Math.min(100, state.dealMe * 100))}%`;
      if (on && dealPin) {
        dealPin.style.left = `${Math.max(0, Math.min(100, state.dealAt * 100))}%`;
        dealPin.style.display = state.liveDeal || state.plugMeet ? "block" : "none";
      }
      if (on && dealHome) dealHome.style.left = `${Math.max(0, Math.min(100, (state.homeAt || 0) * 100))}%`;
    }
    if (actionPrompt) {
      const show = !!(state.prompt && playUi && !state.showServe && !state.showGate && !state.showHitUp);
      actionPrompt.classList.toggle("hidden", !show);
      if (show) actionPrompt.textContent = state.prompt;
    }

    if (saleEl) {
      const pop = state.salePop;
      saleEl.classList.toggle("hidden", !pop);
      if (pop) {
        if (saleWhat) saleWhat.textContent = "SOLD " + pop.product;
        if (saleAmt) saleAmt.textContent = "$" + pop.dollars;
        if (saleCash) saleCash.textContent = "CASH +$" + pop.dollars;
      }
    }

    sheetPhone?.classList.toggle("hidden", !(state.mode === "play" && state.ui === "phone"));
    sheetBuy?.classList.toggle("hidden", !(state.mode === "play" && state.ui === "buy"));
    sheetStash?.classList.toggle("hidden", !(state.mode === "play" && state.ui === "stash"));
    sheetCrib?.classList.toggle("hidden", !(state.mode === "play" && state.ui === "crib"));
    sheetInv?.classList.toggle("hidden", !(state.mode === "play" && state.ui === "inv"));
    if (state.ui === "phone") renderPhone(state);
    if (state.ui === "buy") renderBuy(state);
    if (state.ui === "stash") renderStash(state);
    if (state.ui === "crib") renderCrib(state);
    if (state.ui === "inv" && invRows) {
      const g = state.inv || {};
      const s = state.stashInv || {};
      invRows.innerHTML = `<div class="sheet-inv">CASH $${state.cash}  HOME $${state.stash || 0}</div>`
        + `<div class="sheet-inv">GRN ${fmtGrams(g.GREEN)}g / HOME ${fmtGrams(s.GREEN)}g</div>`
        + `<div class="sheet-inv">WHT ${fmtGrams(g.WHITE)}g / HOME ${fmtGrams(s.WHITE)}g</div>`;
    }

    const show = state.mode !== "play";
    overlay.classList.toggle("hidden", !show);
    overlay.classList.toggle("pause-mode", state.mode === "paused");
    pauseActions?.classList.toggle("hidden", state.mode !== "paused");
    titleEl.classList.remove("wasted", "clear");
    bodyEl.classList.remove("tips", "intro-card");
    if (state.mode === "title") {
      titleEl.innerHTML = "BLOCK<br><span>RUN</span>";
      subEl.textContent = subtitle;
      bodyEl.innerHTML = "";
      hiEl.textContent = "";
      promptEl.textContent = isUnlocked() ? "TAP TO START" : "TAP TO START";
    } else if (state.mode === "intro") {
      titleEl.innerHTML = "";
      subEl.textContent = "";
      bodyEl.classList.add("intro-card");
      bodyEl.textContent = state.introText || "";
      hiEl.textContent = "";
      promptEl.textContent = "TAP";
    } else if (state.mode === "paused") {
      titleEl.textContent = "PAUSED";
      subEl.textContent = "";
      bodyEl.innerHTML = "";
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
      status.textContent = `${state.mode}  $${state.cash}  ${invLine(state)}  r${state.rep || 0}`;
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
