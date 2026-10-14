import { unlockAudio } from "./audio.js?v=79";

const KEYS = new Set([
  "KeyA", "KeyD", "KeyW", "KeyS", "KeyB", "KeyJ", "KeyK", "KeyZ", "KeyX",
  "ShiftLeft", "ShiftRight",
  "KeyF", "KeyQ", "KeyE", "KeyU", "KeyC", "KeyH", "KeyT", "KeyO",
  "Digit1", "Digit2", "Digit3", "Digit4",
  "Space", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
  "KeyM", "Escape", "KeyP", "KeyY", "KeyN", "Comma",
  "BracketRight", "Equal",
]);

const GEAR_KEYS = {
  Digit1: "P",
  Digit2: "R",
  Digit3: "N",
  Digit4: "D",
};

const TAP_ROLES = {
  serve: "serve",
  gate: "gate",
  hitup: "hitup",
  uturn: "uturn",
  phone: "phone",
  "phone-close": "phoneClose",
  "text-plug": "textPlug",
  "buy-green": "buyGreen",
  "buy-white": "buyWhite",
  "buy-close": "buyClose",
  "stash-close": "stashClose",
  "crib-close": "cribClose",
  "crib-clothes": "cribClothes",
  "crib-sleep": "cribSleep",
  "crib-wait": "cribWait",
  "crib-save": "cribSave",
  "crib-stash": "cribStash",
  "outfit-close": "outfitClose",
  "outfit-hat": "outfitHat",
  "stash-in-cash": "stashInCash",
  "stash-out-cash": "stashOutCash",
  "stash-in-green": "stashInGreen",
  "stash-out-green": "stashOutGreen",
  "stash-in-white": "stashInWhite",
  "stash-out-white": "stashOutWhite",
  accept: "accept",
  decline: "decline",
  stall: "decline",
  action: "action",
  car: "carBtn",
  crib: "cribBtn",
  pullover: "pullover",
  "quick-phone": "quickPhone",
  "quick-phone-close": "quickPhoneClose",
  inventory: "inventory",
  "inv-close": "invClose",
  "tab-texts": "tabTexts",
  "tab-contacts": "tabContacts",
  "ping-contact": "pingContact",
  "pick-close": "pickClose",
  pick: "pick",
};

function gearFromY(clientY, root) {
  const track = root.querySelector("#shift-track");
  if (!track) return null;
  const r = track.getBoundingClientRect();
  if (r.height <= 0) return null;
  const t = (clientY - r.top) / r.height;
  if (t < 0.25) return "P";
  if (t < 0.5) return "R";
  if (t < 0.75) return "N";
  return "D";
}

function pedalAmtFromY(clientY, role, root) {
  const pedal = root.querySelector(`[data-role='${role}']`);
  if (!pedal) return 1;
  const r = pedal.getBoundingClientRect();
  if (r.height <= 0) return 1;
  return Math.max(0.12, Math.min(1, (clientY - r.top) / r.height));
}

function gasAmtFromY(clientY, root) {
  return pedalAmtFromY(clientY, "gas", root);
}

function brakeAmtFromY(clientY, root) {
  return pedalAmtFromY(clientY, "brake", root);
}

function allowScroll(target) {
  return !!target?.closest?.(".sheet, .sheet-card, #phone-texts, #phone-list");
}

export function createInput(root = document) {
  const down = new Set();
  const pointers = new Map();
  let forced = null;
  let shootWas = false;
  let jumpWas = false;
  let startWas = false;
  let muteWas = false;
  let pauseWas = false;
  let exitWas = false;
  let qWas = false;
  let eWas = false;
  const gearWas = { P: false, R: false, N: false, D: false };
  let shootPulse = false;
  let jumpPulse = false;
  let startPulse = false;
  let mutePulse = false;
  let pausePulse = false;
  let exitPulse = false;
  let acceptPulse = false;
  let declinePulse = false;
  let gearPulse = null;
  const taps = {};

  function pulseTap(key) {
    if (key) taps[key] = true;
  }

  function roleOf(target) {
    const btn = target?.closest?.("[data-role]");
    return btn?.dataset?.role || null;
  }

  function onKeyDown(e) {
    if (!KEYS.has(e.code)) return;
    e.preventDefault();
    down.add(e.code);
    unlockAudio();
    if (e.code === "Enter" || e.code === "Space") startPulse = true;
    if (e.code === "Space" || e.code === "KeyJ" || e.code === "KeyK" || e.code === "KeyZ") {
      shootPulse = true;
    }
    if (e.code === "ArrowUp" || e.code === "KeyW") jumpPulse = true;
    if (e.code === "KeyX") {
      exitPulse = true;
      pulseTap("cribBtn");
      pulseTap("gate");
    }
    if (e.code === "KeyY") pulseTap("carBtn");
    if (e.code === "KeyU") pulseTap("uturn");
    if (e.code === "Comma" || e.code === "KeyO") pulseTap("pullover");
    if (e.code === "KeyF") pulseTap("serve");
    if (e.code === "KeyH") pulseTap("hitup");
    if (e.code === "KeyC" || e.code === "KeyT") pulseTap("phone");
    if (e.code === "KeyM") mutePulse = true;
    if (e.code === "Escape" || e.code === "KeyP") pausePulse = true;
    if (e.code === "BracketRight" || e.code === "Equal") pulseTap("zoom");
    if (e.code === "KeyY") acceptPulse = true;
    if (e.code === "KeyN") declinePulse = true;
    if (GEAR_KEYS[e.code]) gearPulse = GEAR_KEYS[e.code];
  }

  function onKeyUp(e) {
    down.delete(e.code);
  }

  function onBlur() {
    down.clear();
    pointers.clear();
  }

  function fireTap(rec) {
    if (!rec?.tapKey) return;
    pulseTap(rec.tapKey);
    if (rec.tapKey === "buyTier") {
      taps.buyProduct = rec.buyProduct || null;
      taps.buyTierId = rec.buyTierId || null;
    }
    if (rec.tapKey === "pingContact") taps.pingContactId = rec.pingContactId || null;
    if (rec.tapKey === "pick") taps.pickId = rec.pickId || null;
  }

  function onPointerDown(e) {
    const role = roleOf(e.target);
    if (!role) {
      if (e.target.closest("#btn-mute, #btn-pause, #btn-phone, #pause-actions, a.menu-link, a.cart-pick, #cart-picks, .sheet, #ctx, #pad-ctx, #pad, #gb-btns, #gb-sys")) {
        return;
      }
      if (e.target.closest("#overlay.pause-mode")) return;
      // Vertical swipe zoom on any non-button area (street or crib).
      if (e.target.closest("#view, #scene, canvas, #app")) {
        unlockAudio();
        pointers.set(e.pointerId, {
          role: "zoomSwipe",
          startX: e.clientX,
          startY: e.clientY,
          curY: e.clientY,
          zoomLastY: e.clientY,
          zoomSwiped: false,
          moved: 0,
          tapKey: null,
        });
        try { e.target.setPointerCapture(e.pointerId); } catch {}
        return;
      }
      unlockAudio();
      return;
    }
    e.preventDefault();
    unlockAudio();
    let recRole = role;
    let gear = e.target.closest("[data-gear]")?.dataset?.gear || null;
    if (role === "shifter" || role === "gear") {
      recRole = "shifter";
      gear = gearFromY(e.clientY, root) || gear;
    }
    if (role !== "mute" && !TAP_ROLES[role] && role !== "phone" && role !== "pause" && role !== "run") startPulse = true;
    if (role === "fire") shootPulse = true;
    if (role === "jump") jumpPulse = true;
    if (role === "exit") exitPulse = true;
    if (role === "mute") mutePulse = true;
    if (role === "gear" && gear) gearPulse = gear;
    if (role === "pause") pausePulse = true;
    if (role === "gas") recRole = "gas";
    const gasAmt = role === "gas" ? gasAmtFromY(e.clientY, root) : 1;
    const brakeAmt = role === "brake" ? brakeAmtFromY(e.clientY, root) : 1;
    const rec = {
      role: recRole,
      gear,
      gasAmt,
      brakeAmt,
      startX: e.clientX,
      startY: e.clientY,
      curY: e.clientY,
      zoomMarkY: e.clientY,
      zoomLastY: e.clientY,
      zoomSwiped: false,
      zoomNudge: 0,
      moved: 0,
      tapKey: TAP_ROLES[role] || (role === "buy-tier" ? "buyTier" : null),
      buyProduct: e.target.closest("[data-product]")?.dataset?.product || null,
      buyTierId: e.target.closest("[data-tier]")?.dataset?.tier || null,
      pingContactId: e.target.closest("[data-id]")?.dataset?.id || null,
      pickId: e.target.closest("[data-pick]")?.dataset?.pick || null,
    };
    pointers.set(e.pointerId, rec);
    try { e.target.setPointerCapture(e.pointerId); } catch {}
    const btn = e.target.closest("[data-role]");
    if (btn && recRole !== "shifter") btn.classList.add("held");
  }

  function onPointerMove(e) {
    const rec = pointers.get(e.pointerId);
    if (!rec) return;
    rec.moved = Math.max(rec.moved || 0, Math.hypot(e.clientX - rec.startX, e.clientY - rec.startY));
    rec.curY = e.clientY;
    if (rec.role === "shifter") {
      rec.gear = gearFromY(e.clientY, root) || rec.gear;
      return;
    }
    if (rec.role === "gas") {
      rec.gasAmt = gasAmtFromY(e.clientY, root);
    }
    if (rec.role === "brake") {
      rec.brakeAmt = brakeAmtFromY(e.clientY, root);
    }
    if (rec.role === "zoom" || rec.role === "zoomSwipe") {
      rec.curY = e.clientY;
      if (Math.abs(e.clientY - rec.startY) > 8) rec.zoomSwiped = true;
    }
  }

  function onPointerUp(e) {
    const rec = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    const role = rec?.role;
    const still = [...pointers.values()].some((p) => p.role === role);
    if (!still && role && role !== "shifter" && role !== "zoomSwipe") {
      const btn = root.querySelector(`[data-role="${role}"]`);
      if (btn) btn.classList.remove("held");
    }
    // Short tap on empty view still starts / dismisses overlays.
    if (rec?.role === "zoomSwipe" && (rec.moved || 0) < 10) {
      startPulse = true;
      return;
    }
    if (rec?.role === "exit" || rec?.role === "zoom" || rec?.role === "zoomSwipe") return;
    if (rec?.tapKey && (rec.moved || 0) < 10) fireTap(rec);
  }

  function prevent(e) {
    if (e.cancelable) e.preventDefault();
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", () => { if (document.hidden) onBlur(); });
  root.addEventListener("pointerdown", onPointerDown);
  root.addEventListener("pointermove", onPointerMove);
  root.addEventListener("pointerup", onPointerUp);
  root.addEventListener("pointercancel", onPointerUp);
  root.addEventListener("contextmenu", prevent);
  document.addEventListener("gesturestart", prevent, { passive: false });
  document.addEventListener("gesturechange", prevent, { passive: false });
  document.addEventListener("touchmove", (e) => {
    if (allowScroll(e.target)) return;
    prevent(e);
  }, { passive: false });
  let lastTouchEnd = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 350 && e.cancelable) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
  document.addEventListener("dblclick", prevent, { passive: false });
  document.addEventListener("selectstart", prevent, { passive: false });

  function held(code) {
    return (forced ?? down).has(code);
  }

  function take(key) {
    const on = !!taps[key];
    taps[key] = false;
    return on;
  }

  function poll() {
    let moveX = 0;
    if (held("KeyA") || held("ArrowLeft")) moveX -= 1;
    if (held("KeyD") || held("ArrowRight")) moveX += 1;

    let shoot = false;
    let jump = false;
    let brake = held("KeyS") || held("ArrowDown");
    let gas = held("KeyW") || held("ArrowUp");
    let gasAmt = gas ? 1 : 0;
    let brakeAmt = brake ? 1 : 0;
    let run = held("KeyB") || held("ShiftLeft") || held("ShiftRight");
    let exitHeld = held("KeyX");
    let shiftGear = null;
    let uturnHeld = held("KeyU");
    let zoomNudge = 0;
    let zoomAnalog = 0;
    let zoomHeld = false;

    for (const rec of pointers.values()) {
      if (rec.role === "left") moveX -= 1;
      if (rec.role === "right") moveX += 1;
      if (rec.role === "fire") shoot = true;
      if (rec.role === "jump") jump = true;
      if (rec.role === "brake") {
        brake = true;
        brakeAmt = rec.brakeAmt ?? 1;
      }
      if (rec.role === "gas") {
        gas = true;
        gasAmt = rec.gasAmt ?? 1;
      }
      if (rec.role === "run") run = true;
      if (rec.role === "exit" || rec.role === "gate") exitHeld = true;
      if (rec.role === "uturn") uturnHeld = true;
      if (rec.role === "shifter" && rec.gear) shiftGear = rec.gear;
      if (rec.role === "zoom" || rec.role === "zoomSwipe") {
        zoomHeld = true;
        const last = rec.zoomLastY ?? rec.curY ?? rec.startY;
        const cur = rec.curY ?? rec.startY;
        // Finger down (positive dy) = zoom out; finger up = zoom in.
        zoomAnalog += cur - last;
        rec.zoomLastY = cur;
      }
    }
    if (held("BracketRight") || held("Equal")) zoomAnalog -= 2.4;

    if (held("Space") || held("KeyJ") || held("KeyK") || held("KeyZ")) shoot = true;
    if (held("KeyW") || held("ArrowUp")) jump = true;
    if (shootPulse) shoot = true;
    if (jumpPulse) jump = true;

    moveX = Math.max(-1, Math.min(1, moveX));

    const startHeld = held("Enter") || held("Space") || pointers.size > 0 || startPulse;
    const startEdge = (startHeld && !startWas) || startPulse;
    startWas = startHeld;
    startPulse = false;

    const shootEdge = (shoot && !shootWas) || shootPulse;
    shootWas = shoot;
    shootPulse = false;

    const jumpEdge = (jump && !jumpWas) || jumpPulse;
    jumpWas = jump;
    jumpPulse = false;

    const muteHeld = mutePulse || held("KeyM");
    const muteEdge = (muteHeld && !muteWas) || mutePulse;
    muteWas = muteHeld || held("KeyM");
    mutePulse = false;

    const pauseHeld = pausePulse || held("Escape") || held("KeyP");
    const pauseEdge = (pauseHeld && !pauseWas) || pausePulse;
    pauseWas = pauseHeld;
    pausePulse = false;

    const exitEdge = (exitHeld && !exitWas) || exitPulse;
    exitWas = exitHeld;
    exitPulse = false;

    let gearTap = gearPulse;
    gearPulse = null;
    for (const [code, gear] of Object.entries(GEAR_KEYS)) {
      const on = held(code);
      if (on && !gearWas[gear]) gearTap = gearTap || gear;
      gearWas[gear] = on;
    }
    const qOn = held("KeyQ");
    const eOn = held("KeyE");
    let shiftStep = 0;
    if (qOn && !qWas) shiftStep = -1;
    if (eOn && !eWas) shiftStep = 1;
    qWas = qOn;
    eWas = eOn;

    const accept = acceptPulse || take("accept");
    const decline = declinePulse || take("decline");
    acceptPulse = false;
    declinePulse = false;

    const start = startEdge;
    const mute = muteEdge;
    const pause = pauseEdge;
    const buyProduct = taps.buyProduct || null;
    const buyTierId = taps.buyTierId || null;
    const pingContactId = taps.pingContactId || null;
    const pickId = taps.pickId || null;
    taps.buyProduct = null;
    taps.buyTierId = null;
    taps.pingContactId = null;
    taps.pickId = null;

    root.querySelectorAll(".pad-btn, .ctx-btn").forEach((btn) => {
      const role = btn.dataset.role;
      const on =
        (role === "left" && moveX < 0) ||
        (role === "right" && moveX > 0) ||
        (role === "jump" && jump) ||
        (role === "fire" && shoot) ||
        (role === "brake" && brake) ||
        (role === "gas" && gas) ||
        (role === "run" && run) ||
        (role === "uturn" && uturnHeld) ||
        ((role === "exit" || role === "gate") && exitHeld);
      if (role) btn.classList.toggle("held", on);
    });

    return {
      moveX,
      steer: 0,
      brake,
      brakeAmt,
      gas,
      gasAmt,
      run,
      shoot: shootEdge,
      shootHeld: shoot,
      jump: jumpEdge,
      start,
      mute,
      pause,
      exit: exitEdge,
      accept,
      decline,
      action: take("action"),
      carBtn: take("carBtn"),
      cribBtn: take("cribBtn"),
      pullover: take("pullover"),
      shiftGear,
      gearTap,
      shiftStep,
      serve: take("serve"),
      gate: take("gate") || exitEdge,
      hitup: take("hitup"),
      uturn: take("uturn"),
      phone: take("phone"),
      phoneClose: take("phoneClose"),
      quickPhone: take("quickPhone"),
      quickPhoneClose: take("quickPhoneClose"),
      textPlug: take("textPlug"),
      pingContact: take("pingContact"),
      pingContactId,
      buyGreen: take("buyGreen"),
      buyWhite: take("buyWhite"),
      buyTier: take("buyTier"),
      buyProduct,
      buyTierId,
      buyClose: take("buyClose"),
      inventory: take("inventory"),
      invClose: take("invClose"),
      phoneTab: take("tabTexts") ? "texts" : take("tabContacts") ? "contacts" : null,
      pickClose: take("pickClose"),
      zoom: false,
      zoomNudge,
      zoomAnalog,
      zoomHeld,
      pickId,
      stashClose: take("stashClose"),
      cribClose: take("cribClose"),
      cribClothes: take("cribClothes"),
      cribSleep: take("cribSleep"),
      cribWait: take("cribWait"),
      cribSave: take("cribSave"),
      cribStash: take("cribStash"),
      outfitClose: take("outfitClose"),
      outfitHat: take("outfitHat"),
      stashInCash: take("stashInCash"),
      stashOutCash: take("stashOutCash"),
      stashInGreen: take("stashInGreen"),
      stashOutGreen: take("stashOutGreen"),
      stashInWhite: take("stashInWhite"),
      stashOutWhite: take("stashOutWhite"),
    };
  }

  function setKeys(codes) {
    forced = codes ? new Set(codes) : null;
  }

  function heldRoles() {
    const roles = new Set();
    for (const rec of pointers.values()) roles.add(rec.role);
    if (held("KeyA") || held("ArrowLeft")) roles.add("left");
    if (held("KeyD") || held("ArrowRight")) roles.add("right");
    if (held("Space") || held("KeyJ") || held("KeyK") || held("KeyZ")) roles.add("fire");
    if (held("ArrowUp") || held("KeyW")) {
      roles.add("jump");
      roles.add("gas");
    }
    if (held("KeyS") || held("ArrowDown")) roles.add("brake");
    if (held("KeyX")) roles.add("gate");
    if (held("KeyU")) roles.add("uturn");
    return roles;
  }

  return { poll, setKeys, heldRoles };
}
