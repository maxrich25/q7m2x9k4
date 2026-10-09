import { unlockAudio } from "./audio.js?v=10";

const KEYS = new Set([
  "KeyA", "KeyD", "KeyW", "KeyJ", "KeyK", "KeyZ", "KeyX",
  "Space", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "KeyM",
]);

export function createInput(root = document) {
  const down = new Set();
  const pointers = new Map();
  let forced = null;
  let shootWas = false;
  let jumpWas = false;
  let startWas = false;
  let muteWas = false;
  let shootPulse = false;
  let jumpPulse = false;
  let startPulse = false;
  let mutePulse = false;

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
    if (e.code === "Space" || e.code === "KeyJ" || e.code === "KeyK" || e.code === "KeyZ") shootPulse = true;
    if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "KeyX") jumpPulse = true;
    if (e.code === "KeyM") mutePulse = true;
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
      if (e.target.closest("#btn-mute")) return;
      if (e.target.closest("#view")) startPulse = true;
      unlockAudio();
      return;
    }
    e.preventDefault();
    unlockAudio();
    pointers.set(e.pointerId, role);
    startPulse = role !== "mute";
    if (role === "fire") shootPulse = true;
    if (role === "jump") jumpPulse = true;
    if (role === "mute") mutePulse = true;
    try { e.target.setPointerCapture(e.pointerId); } catch {}
    const btn = e.target.closest("[data-role]");
    if (btn) btn.classList.add("held");
  }

  function onPointerUp(e) {
    const role = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    const still = [...pointers.values()].includes(role);
    if (!still) {
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
  root.addEventListener("pointerup", onPointerUp);
  root.addEventListener("pointercancel", onPointerUp);
  root.addEventListener("contextmenu", prevent);
  document.addEventListener("gesturestart", prevent, { passive: false });
  document.addEventListener("touchmove", prevent, { passive: false });

  function held(code) {
    return (forced ?? down).has(code);
  }

  function poll() {
    let moveX = 0;
    if (held("KeyA") || held("ArrowLeft")) moveX -= 1;
    if (held("KeyD") || held("ArrowRight")) moveX += 1;

    let shoot = false;
    let jump = false;
    let start = false;
    let mute = false;

    for (const role of pointers.values()) {
      if (role === "left") moveX -= 1;
      if (role === "right") moveX += 1;
      if (role === "fire") shoot = true;
      if (role === "jump") jump = true;
    }

    if (held("Space") || held("KeyJ") || held("KeyK") || held("KeyZ")) shoot = true;
    if (held("ArrowUp") || held("KeyW") || held("KeyX")) jump = true;
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

    start = startEdge;
    mute = muteEdge;

    root.querySelectorAll(".pad-btn").forEach((btn) => {
      const role = btn.dataset.role;
      const on =
        (role === "left" && moveX < 0) ||
        (role === "right" && moveX > 0) ||
        (role === "jump" && jump) ||
        (role === "fire" && shoot);
      btn.classList.toggle("held", on);
    });

    return { moveX, shoot: shootEdge, shootHeld: shoot, jump: jumpEdge, start, mute };
  }

  function setKeys(codes) {
    forced = codes ? new Set(codes) : null;
  }

  function heldRoles() {
    const roles = new Set(pointers.values());
    if (held("KeyA") || held("ArrowLeft")) roles.add("left");
    if (held("KeyD") || held("ArrowRight")) roles.add("right");
    if (held("Space") || held("KeyJ") || held("KeyK") || held("KeyZ")) roles.add("fire");
    if (held("ArrowUp") || held("KeyW") || held("KeyX")) roles.add("jump");
    return roles;
  }

  return { poll, setKeys, heldRoles };
}
