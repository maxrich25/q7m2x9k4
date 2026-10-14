import { unlockAudio } from "./audio.js?v=24";

const KEYS = new Set([
  "KeyA", "KeyD", "KeyW", "KeyS", "KeyJ", "KeyK", "KeyZ", "KeyX",
  "KeyF", "KeyQ", "KeyE", "KeyU", "KeyC", "KeyH", "KeyT",
  "Digit1", "Digit2", "Digit3", "Digit4",
  "Space", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
  "KeyM", "Escape", "KeyP", "KeyY", "KeyN",
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
  exit: "gate",
  hitup: "hitup",
  uturn: "uturn",
  phone: "phone",
  "phone-close": "phoneClose",
  "text-plug": "textPlug",
  "buy-green": "buyGreen",
  "buy-white": "buyWhite",
  "buy-close": "buyClose",
  "stash-close": "stashClose",
  "stash-in-cash": "stashInCash",
  "stash-out-cash": "stashOutCash",
  "stash-in-green": "stashInGreen",
  "stash-out-green": "stashOutGreen",
  "stash-in-white": "stashInWhite",
  "stash-out-white": "stashOutWhite",
  accept: "accept",
  decline: "decline",
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
      pulseTap("gate");
    }
    if (e.code === "KeyU") pulseTap("uturn");
    if (e.code === "KeyF") pulseTap("serve");
    if (e.code === "KeyH") pulseTap("hitup");
    if (e.code === "KeyC" || e.code === "KeyT") pulseTap("phone");
    if (e.code === "KeyM") mutePulse = true;
    if (e.code === "Escape" || e.code === "KeyP") pausePulse = true;
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

  function onPointerDown(e) {
    const role = roleOf(e.target);
    if (!role) {
      if (e.target.closest("#btn-mute, #btn-pause, #pause-actions, a.menu-link, .sheet, #ctx")) return;
      if (e.target.closest("#overlay.pause-mode")) return;
      if (e.target.closest("#view")) startPulse = true;
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
    pointers.set(e.pointerId, { role: recRole, gear });
    if (role !== "mute" && !TAP_ROLES[role] && role !== "phone") startPulse = true;
    if (role === "fire") shootPulse = true;
    if (role === "jump") jumpPulse = true;
    if (role === "exit") exitPulse = true;
    if (role === "mute") mutePulse = true;
    if (role === "gear" && gear) gearPulse = gear;
    if (TAP_ROLES[role]) pulseTap(TAP_ROLES[role]);
    try { e.target.setPointerCapture(e.pointerId); } catch {}
    const btn = e.target.closest("[data-role]");
    if (btn && recRole !== "shifter") btn.classList.add("held");
  }

  function onPointerMove(e) {
    const rec = pointers.get(e.pointerId);
    if (!rec || rec.role !== "shifter") return;
    rec.gear = gearFromY(e.clientY, root) || rec.gear;
  }

  function onPointerUp(e) {
    const rec = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    const role = rec?.role;
    const still = [...pointers.values()].some((p) => p.role === role);
    if (!still && role && role !== "shifter") {
      const btn = root.querySelector(`[data-role="${role}"]`);
      if (btn) btn.classList.remove("held");
    }
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
  document.addEventListener("touchmove", prevent, { passive: false });

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
    let exitHeld = held("KeyX");
    let shiftGear = null;
    let uturnHeld = held("KeyU");

    for (const rec of pointers.values()) {
      if (rec.role === "left") moveX -= 1;
      if (rec.role === "right") moveX += 1;
      if (rec.role === "fire") shoot = true;
      if (rec.role === "jump") jump = true;
      if (rec.role === "brake") brake = true;
      if (rec.role === "gas") gas = true;
      if (rec.role === "exit" || rec.role === "gate") exitHeld = true;
      if (rec.role === "uturn") uturnHeld = true;
      if (rec.role === "shifter" && rec.gear) shiftGear = rec.gear;
    }

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

    const accept = acceptPulse;
    const decline = declinePulse;
    acceptPulse = false;
    declinePulse = false;

    const start = startEdge;
    const mute = muteEdge;
    const pause = pauseEdge;

    root.querySelectorAll(".pad-btn, .ctx-btn").forEach((btn) => {
      const role = btn.dataset.role;
      const on =
        (role === "left" && moveX < 0) ||
        (role === "right" && moveX > 0) ||
        (role === "jump" && jump) ||
        (role === "fire" && shoot) ||
        (role === "brake" && brake) ||
        (role === "gas" && gas) ||
        (role === "uturn" && uturnHeld) ||
        ((role === "exit" || role === "gate") && exitHeld);
      if (role) btn.classList.toggle("held", on);
    });

    return {
      moveX,
      steer: 0,
      brake,
      gas,
      shoot: shootEdge,
      shootHeld: shoot,
      jump: jumpEdge,
      start,
      mute,
      pause,
      exit: exitEdge,
      accept,
      decline,
      shiftGear,
      gearTap,
      shiftStep,
      serve: take("serve"),
      gate: take("gate") || exitEdge,
      hitup: take("hitup"),
      uturn: take("uturn"),
      phone: take("phone"),
      phoneClose: take("phoneClose"),
      textPlug: take("textPlug"),
      buyGreen: take("buyGreen"),
      buyWhite: take("buyWhite"),
      buyClose: take("buyClose"),
      stashClose: take("stashClose"),
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
