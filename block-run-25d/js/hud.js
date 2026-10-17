import { GEARS, PRODUCTS, fmtGrams, formatDeal, HOME_X, HEAT_ENABLED } from "./config.js?v=91";
import { paintClassicHero } from "./paint.js?v=91";
import { isUnlocked } from "./audio.js?v=91";

export function createHud(opts = {}) {
  const subtitle = opts.subtitle || "2.5D NIGHT BLOCK  v91";
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
  const carL = document.getElementById("car-left");
  const carR = document.getElementById("car-right");
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
  const ctx = document.getElementById("pad-ctx") || document.getElementById("ctx");
  const btnAction = document.getElementById("btn-action");
  const btnCar = document.getElementById("btn-car");
  const btnX = document.getElementById("btn-x");
  const btnB = document.getElementById("btn-b");
  const btnCarLabel = document.getElementById("btn-car-label");
  const btnXLabel = document.getElementById("btn-x-label");
  const btnStall = document.getElementById("btn-stall");
  const btnAccept = document.getElementById("btn-accept");
  const btnServe = document.getElementById("btn-serve");
  const btnGate = document.getElementById("btn-gate");
  const btnHit = document.getElementById("btn-hitup");
  const cartPicks = document.getElementById("cart-picks");
  const saleEl = document.getElementById("sale-pop");
  const saleWhat = document.getElementById("sale-what");
  const saleAmt = document.getElementById("sale-amt");
  const saleCash = document.getElementById("sale-cash");
  const sheetPhone = document.getElementById("sheet-phone");
  const sheetBuy = document.getElementById("sheet-buy");
  const sheetStash = document.getElementById("sheet-stash");
  const sheetCrib = document.getElementById("sheet-crib");
  const sheetOutfit = document.getElementById("sheet-outfit");
  const outfitHero = document.getElementById("outfit-hero");
  const outfitHatBtn = document.getElementById("outfit-hat");
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
  const phoneDeal = document.getElementById("phone-deal");
  const actionLabelEl = document.getElementById("btn-action-label");
  const bLabelEl = document.getElementById("btn-b-label");
  const orderStrip = document.getElementById("order-strip");
  const orderWho = document.getElementById("order-who");
  const orderAmt = document.getElementById("order-amt");
  const orderLeft = document.getElementById("order-left");
  let phoneListSig = "";

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

  function invHtml(state) {
    const g = state.inv || {};
    return `<span class="g-grn">GRN ${fmtGrams(g.GREEN)}</span> <span class="g-wht">WHT ${fmtGrams(g.WHITE)}</span>`;
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
    const listSig = [
      state.phoneTab || "texts",
      (state.inbox || []).map((m) => (m.from || "") + "\t" + (m.text || "")).join("|"),
      (state.contacts || []).map((c) => [c.id, c.name, c.kind, c.status, c.knows ? 1 : 0, c.flakes || 0].join(":")).join("|"),
    ].join("::");
    if (listSig === phoneListSig) return;
    phoneListSig = listSig;
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
              : !c.knows ? "DON'T KNOW"
                : (c.flakes ? `AROUND ${c.flakes}/3` : "AROUND");
      row.innerHTML = `<div><div class="who">${c.name}</div><div class="st">${st}</div></div>`;
      if (c.kind === "plug") {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.role = "text-plug";
        b.textContent = c.status === "meet" ? "MEET" : "TEXT";
        row.appendChild(b);
      } else if (!c.knows) {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.role = "ping-contact";
        b.dataset.id = c.id;
        b.textContent = "HIT UP";
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
        return `<button type="button" class="sheet-buy ${cls || ""}${locked ? " locked" : ""}" data-role="buy-tier" data-product="${product}" data-tier="${t.id}" ${locked ? "disabled" : ""}>${product === "WHITE" ? "WHT" : "GRN"} ${t.label} $${t.cost}${locked ? ` <span class="need-rep">REP ${t.minRep}</span>` : ""}</button>`;
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
  }

  function renderOutfit(state) {
    const hatOn = state.wardrobe?.hat !== "none";
    if (outfitHatBtn) {
      outfitHatBtn.textContent = hatOn ? "HAT ON" : "HAT OFF";
      outfitHatBtn.classList.toggle("off", !hatOn);
    }
    if (!outfitHero) return;
    const g = outfitHero.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.fillStyle = "#121018";
    g.fillRect(0, 0, outfitHero.width, outfitHero.height);
    const src = document.createElement("canvas");
    src.width = 40;
    src.height = 40;
    const pg = src.getContext("2d");
    pg.imageSmoothingEnabled = false;
    paintClassicHero(pg, { side: true, threeQ: true, bob: 0 }, state.wardrobe || {});
    const scale = 4;
    const dx = Math.round((outfitHero.width - 40 * scale) / 2);
    const dy = Math.round((outfitHero.height - 40 * scale) / 2);
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0, 40, 40, dx, dy, 40 * scale, 40 * scale);
  }

  let popNodes = [];
  let hudCanvasSig = "";
  const hudCanvas = document.getElementById("hud-top-canvas");

  function paintHudTop(state) {
    // Crisp DOM HUD (integer px, no scale/zoom). Canvas backup paints at integer DPR.
    const host = document.getElementById("hud-top");
    if (host) {
      const pad = parseFloat(getComputedStyle(host).paddingTop) || 0;
      const padR = Math.round(pad);
      if (Math.abs(pad - padR) > 0.01) host.style.paddingTop = padR + "px";
    }
    const cash = "$" + String(state.cash).padStart(4, "0");
    const g = state.inv || {};
    const grn = "GRN " + fmtGrams(g.GREEN);
    const wht = "WHT " + fmtGrams(g.WHITE);
    const rep = "REP " + Math.round(state.rep || 0);
    if (cashEl) cashEl.textContent = cash;
    if (invEl) invEl.innerHTML = invHtml(state);
    if (repEl) repEl.textContent = rep;
    if (hudTime) hudTime.textContent = "";

    // Integer-DPR canvas HUD: draw text in CSS px via setTransform so SE standalone stays sharp.
    if (!hudCanvas || !host) return;
    const cssW = Math.max(1, Math.round(host.clientWidth || window.innerWidth || 375));
    const cssH = 32;
    const dpr = Math.max(1, Math.round(Math.min(3, window.devicePixelRatio || 1)));
    const sig = [cash, grn, wht, rep, cssW, cssH, dpr].join("|");
    if (sig === hudCanvasSig && hudCanvas.width === cssW * dpr) return;
    hudCanvasSig = sig;
    hudCanvas.width = cssW * dpr;
    hudCanvas.height = cssH * dpr;
    hudCanvas.style.width = cssW + "px";
    hudCanvas.style.height = cssH + "px";
    const ctx = hudCanvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cssW, cssH);
    const fontPx = cssW < 360 ? 8 : 10;
    ctx.font = fontPx + 'px "Press Start 2P", monospace';
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    const y = Math.round(cssH / 2);
    let x = 8;
    const gap = 8;
    for (const [text, color] of [[cash, "#f0c430"], [grn, "#3dff7a"], [wht, "#f4f0e8"], [rep, "#8a8696"]]) {
      ctx.fillStyle = "#07060c";
      ctx.fillText(text, x + 1, y + 1);
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
      x += Math.ceil(ctx.measureText(text).width) + gap;
    }
    // Prefer canvas on high-DPR standalone where DOM text softens; else crisp DOM row.
    const standalone = !!(window.navigator.standalone
      || window.matchMedia("(display-mode: standalone)").matches);
    if (standalone && dpr >= 2) {
      hudCanvas.style.display = "block";
      if (document.getElementById("hud-top-row")) {
        document.getElementById("hud-top-row").style.visibility = "hidden";
      }
    } else {
      hudCanvas.style.display = "none";
      if (document.getElementById("hud-top-row")) {
        document.getElementById("hud-top-row").style.visibility = "visible";
      }
    }
  }

  function sync(state, project) {
    paintHudTop(state);
    const heatOn = !!(state.heatEnabled ?? HEAT_ENABLED);
    if (heatEl) {
      heatEl.classList.toggle("hidden", !heatOn);
      if (heatOn) pips(heatEl, 3, Math.min(3, Math.ceil(state.heat)), "heat");
    }
    if (repEl) repEl.textContent = "REP " + Math.round(state.rep || 0);
    if (hudTime) hudTime.textContent = "";
    const muted = !!state.muted;
    btnMute?.classList.toggle("off", muted);
    if (btnMute) {
      btnMute.textContent = muted ? "🔇" : "🔊";
      btnMute.setAttribute("aria-label", muted ? "sound off" : "sound on");
    }
    if (btnSound) {
      btnSound.textContent = muted ? "SOUND OFF" : "SOUND ON";
      btnSound.classList.toggle("off", muted);
    }
    edgeL?.classList.toggle("hidden", !state.edgeL);
    edgeR?.classList.toggle("hidden", !state.edgeR);
    destL?.classList.toggle("hidden", !!(state.inCrib) || state.destSide !== -1);
    destR?.classList.toggle("hidden", !!(state.inCrib) || state.destSide !== 1);
    const edge = `${state.navLabel || "HOME"} ${state.dealLabel || ""}`.trim();
    if (destL) destL.textContent = "◀ " + edge;
    if (destR) destR.textContent = edge + " ▶";
    const onFoot = !state.inCar && state.mode === "play";
    carL?.classList.toggle("hidden", !!(state.inCrib) || !(onFoot && state.carSide === -1));
    carR?.classList.toggle("hidden", !!(state.inCrib) || !(onFoot && state.carSide === 1));
    const carEdge = `CAR ${state.carLabel || ""}`.trim();
    if (carL) carL.textContent = "◀ " + carEdge;
    if (carR) carR.textContent = carEdge + " ▶";

    const driving = !!(state.inCar && state.mode === "play");
    document.getElementById("pad")?.classList.toggle("driving", driving);
    padFoot?.classList.toggle("hidden", driving);
    padCar?.classList.toggle("hidden", !driving);
    const gear = state.car?.shiftPreview || state.car?.gear || "P";
    document.querySelectorAll("#shifter .gear").forEach((el) => {
      el.classList.toggle("on", el.dataset.gear === gear);
    });
    if (driving) placeKnob(gear);
    if (state.car?.autoBrake) document.querySelector("#pad-car [data-role='brake']")?.classList.add("held");
    if (shiftHint) {
      if (driving && state.car?.pendingPullOut) {
        shiftHint.textContent = "RELEASE BRAKE";
        shiftHint.classList.remove("hidden");
      } else if (driving && (state.car?.shiftHint || 0) > 0) {
        shiftHint.textContent = "HOLD BRAKE";
        shiftHint.classList.remove("hidden");
      } else {
        shiftHint.classList.add("hidden");
      }
    }
    btnPhone?.classList.toggle("unread", !!state.unread);

    const playUi = state.mode === "play" && !state.ui;
    const offer = !!(state.offer || state.order?.phase === "offer" || state.order?.phase === "stalling");
    const showAccept = !!(offer && state.mode === "play");
    const showServe = !!(playUi && !offer && state.showServe);
    const showGate = !!(playUi && !offer && state.showGate);
    const showHit = !!(playUi && !offer && state.showHitUp);
    // Pop-up action menu removed — face-grid only.
    if (ctx) {
      ctx.classList.add("hidden");
      ctx.setAttribute("hidden", "");
      ctx.innerHTML = "";
    }

    // Face grid (no letter labels):
    //   Y blank/unlit unless CAR (near car) or EXIT (parked in car)
    //   X PHONE   A action word when available   B RUN
    const carOn = !!(state.carBtnOk && state.mode === "play" && state.faceCarLabel);
    const label = state.actionLabel || "";
    const actionOn = !!(state.actionOk && state.mode === "play" && label);

    if (btnCarLabel) btnCarLabel.textContent = carOn ? (state.faceCarLabel || "") : "";
    if (btnCar) {
      btnCar.dataset.role = "car";
      btnCar.classList.toggle("off", !carOn);
      btnCar.classList.remove("go", "arm", "pulse", "serve");
    }

    if (btnXLabel) btnXLabel.textContent = "PHONE";
    if (btnX) {
      btnX.dataset.role = "quick-phone";
      btnX.classList.toggle("off", false);
      btnX.classList.remove("go", "arm", "pulse", "serve");
    }

    if (actionLabelEl) actionLabelEl.textContent = actionOn ? label : "";
    if (btnAction) {
      btnAction.dataset.role = "action";
      btnAction.classList.toggle("off", !actionOn);
      btnAction.classList.remove("go", "arm", "pulse", "serve");
    }
    // On foot: RUN. In the whip: U-turn (no run while driving).
    if (driving) {
      const uturnOn = !!state.uturnBtnOk;
      if (bLabelEl) bLabelEl.textContent = "U-TN";
      if (btnB) {
        btnB.dataset.role = "uturn";
        btnB.classList.toggle("off", !uturnOn);
        btnB.classList.remove("go", "arm", "pulse", "serve");
      }
    } else {
      if (bLabelEl) bLabelEl.textContent = "RUN";
      if (btnB) {
        btnB.dataset.role = "run";
        btnB.classList.toggle("off", false);
        btnB.classList.remove("go", "arm", "pulse", "serve");
      }
    }

    const quickPhone = document.getElementById("quick-phone");
    const showQuick = state.ui === "quickPhone";
    quickPhone?.classList.toggle("hidden", !showQuick);
    if (showQuick) {
      const clock = document.getElementById("quick-phone-clock");
      const qCash = document.getElementById("quick-phone-cash");
      const qStash = document.getElementById("quick-phone-stash");
      const qInv = document.getElementById("quick-phone-inv");
      if (clock) clock.textContent = state.timeLabel || "9 PM";
      if (qCash) qCash.textContent = "CASH $" + String(state.cash).padStart(4, "0");
      if (qStash) qStash.textContent = "STASH $" + String(state.stash || 0);
      if (qInv) qInv.textContent = invLine(state);
    }
    if (orderStrip) {
      const liveOrder = state.order && (state.order.phase === "active" || state.order.phase === "nudge");
      const showStrip = !!(liveOrder && (state.mode === "play" || state.mode === "paused") && state.ui !== "phone");
      orderStrip.classList.toggle("hidden", !showStrip);
      if (showStrip && state.order) {
        if (orderWho) orderWho.textContent = state.order.name || "BUYER";
        if (orderAmt) orderAmt.textContent = "$" + (state.order.dollars || 0);
        if (orderLeft) {
          const sec = Math.max(0, Math.ceil(state.order.t || 0));
          orderLeft.textContent = sec >= 60
            ? Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0")
            : "0:" + String(sec).padStart(2, "0");
        }
      }
    }
    document.getElementById("gb-btns")?.classList.toggle("hidden", false);
    document.getElementById("gb-face-grid")?.classList.toggle("driving", driving);
    if (btnStall) btnStall.classList.add("hidden");
    phoneDeal?.classList.toggle("hidden", !showAccept);
    btnAccept?.classList.toggle("hidden", !showAccept);
    btnServe?.classList.toggle("hidden", !showServe);
    btnServe?.classList.toggle("pulse", showServe);
    btnGate?.classList.toggle("hidden", !showGate);
    if (btnGate && state.gate) btnGate.textContent = state.gate;
    btnHit?.classList.toggle("hidden", !showHit);
    const live = state.order && (state.order.phase === "active" || state.order.phase === "nudge");
    if (phone) {
      const offering = !!(state.order && (state.order.phase === "offer" || state.order.phase === "stalling"));
      const on = !!(offering && (state.mode === "play" || state.mode === "paused") && state.ui !== "phone");
      phone.classList.toggle("hidden", !on || state.ui === "phone");
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
      phoneActions?.classList.add("hidden");
    }
    if (dealNav) {
      dealNav.classList.add("hidden");
      const on = false;
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
      actionPrompt.classList.add("hidden");
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

    const sheetPick = document.getElementById("sheet-pick");
    const pickList = document.getElementById("pick-list");
    sheetPhone?.classList.toggle("hidden", !(state.mode === "play" && state.ui === "phone"));
    sheetBuy?.classList.toggle("hidden", !(state.mode === "play" && state.ui === "buy"));
    sheetStash?.classList.toggle("hidden", !(state.mode === "play" && state.ui === "stash"));
    sheetCrib?.classList.toggle("hidden", true);
    sheetOutfit?.classList.toggle("hidden", !(state.mode === "play" && state.ui === "outfit"));
    sheetInv?.classList.toggle("hidden", !(state.mode === "play" && state.ui === "inv"));
    sheetPick?.classList.toggle("hidden", !(state.mode === "play" && state.ui === "pick"));
    if (state.ui === "pick" && pickList) {
      pickList.innerHTML = (state.picks || []).map((p) => (
        `<button type="button" class="sheet-buy" data-role="pick" data-pick="${p.id}">${p.label}</button>`
      )).join("");
    }
    if (state.ui === "phone") renderPhone(state);
    if (state.ui === "buy") renderBuy(state);
    if (state.ui === "stash") renderStash(state);
    if (state.ui === "crib") renderCrib(state);
    if (state.ui === "outfit") renderOutfit(state);
    if (state.ui === "inv" && invRows) {
      const g = state.inv || {};
      const s = state.stashInv || {};
      const nxt = state.nextUnlock;
      const nextLine = nxt
        ? `next unlock: ${nxt.label} at REP ${nxt.minRep}`
        : "next unlock: MAX";
      invRows.innerHTML = `<div class="sheet-inv inv-rep">REP ${Math.round(state.rep || 0)}/${state.repMax || 16}</div>`
        + `<div class="sheet-inv inv-next">${nextLine}</div>`
        + `<div class="sheet-inv">CASH $${state.cash}  HOME $${state.stash || 0}</div>`
        + `<div class="sheet-inv">GRN ${fmtGrams(g.GREEN)}g / HOME ${fmtGrams(s.GREEN)}g</div>`
        + `<div class="sheet-inv">WHT ${fmtGrams(g.WHITE)}g / HOME ${fmtGrams(s.WHITE)}g</div>`;
    }

    const show = state.mode !== "play";
    overlay.classList.toggle("hidden", !show);
    overlay.classList.toggle("pause-mode", state.mode === "paused");
    overlay.classList.toggle("title-mode", state.mode === "title");
    // Title: drone + TAP TO START + MENU back to root launcher.
    cartPicks?.classList.toggle("hidden", state.mode !== "title");
    pauseActions?.classList.toggle("hidden", state.mode !== "paused");
    titleEl.classList.remove("wasted", "clear");
    bodyEl.classList.remove("tips", "intro-card");
    if (state.mode === "title") {
      titleEl.innerHTML = "BLOCK<br><span>RUN</span>";
      subEl.textContent = document.body.dataset.cartLabel || subtitle;
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
      subEl.textContent = "2.5D";
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
