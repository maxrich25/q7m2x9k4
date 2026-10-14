import {
  WORLD, GROUND_Y, MAX_HP, CAR_HP, COP_CAR_HP, CAR_ACCEL, CAR_MAX, CAR_FRICTION,
  CAR_CREEP, CAR_TURN_TIME, CAR_TURN_MAX, CAR_TURN_ARC, CAR_STOP, GEARS,
  GRAVITY, JUMP_VEL, COYOTE, JUMP_BUFFER, BUYER_COUNT,
  MOVE_SPEED, TELEGRAPH, BOSS_CASH_BASE, BOSS_CASH_PER_WAVE, HI_KEY,
  SHOP_X, DUMPSTER_X, CAR_X, ORDER_SPOTS, WEAPONS, wrap, wrapDelta, hitWrap,
  formatDeal, dealFeet, COMBAT, START_CASH, PACK_COST, PACK_PAY,
  PLUG_X, HOME_X, PED_COUNT, PED_SPACE, TRAFFIC_MAX, LIGHT_COUNT, lightGameX, lightPhaseAt, stopLineGameX,
  PRODUCTS, HALF_OZ, SALE_AMOUNTS, FLAKE_LIMIT, CONTACT_NAMES, MORE_NAMES,
  INTRO_TEXT, SALE_POP_T, SERVE_SLOW, fmtGrams, streetGrams,
  restLat, parkLat, CAR_KINDS, GREEN_TIERS, WHITE_TIERS, STALL_LINES,
  OUTFITS, DEFAULT_WARDROBE, START_HOUR, SEC_PER_HOUR, MAX_REP, wrapHour, fmtHour, skyTint,
  nextUnlock, dayPhase, streetBusy, orderWaitMul, heatMul, plugOpen, SAVE_KEY,
  HEAT_ENABLED, ORDER_T_MIN, ORDER_T_MAX, LIGHT_STOP_LEAD, PASS_MIN_SPEED,
  BOARD_T, ENTER_LOCK, PULL_OVER_T, ZOOM_KEY, ZOOM_MED_KEY, ZOOM_CONT_KEY,
  CAM_ZOOM_MIN, CAM_ZOOM_MED, CAM_ZOOM_MAX, CAM_ZOOM_MUL, STREET_LEN,
  CAR_NOSE_GAME,
} from "./config.js?v=78";
import { sfx, startMusic, stopMusic, isMuted, setMuted, unlockAudio, setEngine } from "./audio.js?v=78";

function loadHi() {
  try { return Number(localStorage.getItem(HI_KEY) || "0") || 0; } catch { return 0; }
}

function saveHi(value) {
  try { localStorage.setItem(HI_KEY, String(value)); } catch {}
}

const ORDER_LINES = [
  (dollars, product, spot) => `yo need $${dollars} ${product.toLowerCase()}, by ${spot}`,
  (dollars, product, spot) => `u up? $${dollars} ${product.toLowerCase()} at ${spot} rn`,
  (dollars, product, spot) => `bring $${dollars} ${product.toLowerCase()} to ${spot}`,
];

function emptyInv() {
  return { GREEN: 0, WHITE: 0 };
}

export function createGame() {
  let mode = "title";
  const player = {
    x: 80, px: 80, y: GROUND_Y, vx: 0, vy: 0, facing: 1, turnT: 0, turnFrom: 1,
    hp: MAX_HP, anim: 0, stride: 0, flash: 0,
  };
  const car = {
    x: CAR_X, px: CAR_X, vx: 0, facing: 1, hp: CAR_HP,
    gear: "P", yaw: 0, turnT: 0, turnFrom: 0, turnTo: 0, shiftHint: 0, lat: parkLat(1),
    kind: "beater", parked: true, pullOverT: 0, pullFromLat: parkLat(1),
  };
  let inCar = false;
  let inCrib = false;
  let cribX = -3.0;
  let revU = 0;
  let boughtOnce = false;
  let textedPlug = false;
  let repTipSent = false;
  let inbox = [];
  let phoneTab = "texts";
  let wreckT = 0;
  let order = null;
  let orderCd = 6;
  let needPackT = 0;
  let copCar = null;
  let invuln = 0;
  let shootCd = 0;
  let carrying = false;
  let cash = START_CASH;
  let stash = 0;
  let packs = 0;
  let inv = emptyInv();
  let stashInv = emptyInv();
  let contacts = [];
  let plugMeet = null;
  let ui = null;
  let salePop = null;
  let usedNames = new Set();
  let rep = 1;
  let outfit = 0;
  let wardrobe = { ...DEFAULT_WARDROBE };
  let timeHours = START_HOUR;
  let fromCrib = false;
  let boardT = 0;
  let frozen = false;
  let enterLock = 0;
  let camZoom = CAM_ZOOM_MED;
  let zoomMigratedNow = false;
  try {
    if (!localStorage.getItem(ZOOM_CONT_KEY)) {
      camZoom = CAM_ZOOM_MED;
      localStorage.setItem(ZOOM_CONT_KEY, "1");
      localStorage.setItem(ZOOM_MED_KEY, "1");
      localStorage.setItem(ZOOM_KEY, String(CAM_ZOOM_MED));
      zoomMigratedNow = true;
    } else {
      const z = Number(localStorage.getItem(ZOOM_KEY));
      if (Number.isFinite(z)) {
        if (z === 0 || z === 1 || z === 2) camZoom = CAM_ZOOM_MUL[z] || CAM_ZOOM_MED;
        else camZoom = Math.max(CAM_ZOOM_MIN, Math.min(CAM_ZOOM_MAX, z));
      }
    }
  } catch {
    camZoom = CAM_ZOOM_MED;
  }
  let holdLight = false;
  let holdCar = false;
  let runHeld = false;
  let hi = loadHi();
  let wave = 1;
  let gun = "pistol";
  let heat = 0;
  let peds = [];
  let traffic = [];
  let ranReds = new Set();
  let atHome = false;
  let foes = [];
  let shots = [];
  let loot = [];
  let pops = [];
  let bits = [];
  let booms = [];
  let boss = null;
  let bossFired = false;
  let waveCashStart = 0;
  let spawnCd = 0;
  let copCd = 0;
  let shake = 0;
  let hitstop = 0;
  let clock = 0;
  let muzzle = 0;
  let coyote = 0;
  let jumpBuf = 0;
  let lastView = null;
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function sense() {
    const nearCar = !inCrib && !inCar && car.hp > 0 && Math.abs(wrapDelta(player.x, car.x, WORLD)) < 30 && player.y >= 197.5;
    const nearPlug = !inCrib && Math.abs(wrapDelta(player.x, plugMeet?.x ?? PLUG_X, WORLD)) < 28;
    const nearHome = !inCrib && !inCar && Math.abs(wrapDelta(player.x, HOME_X, WORLD)) < 28 && player.y >= 197.5;
    const nearPed = !inCrib && !inCar && peds.some((p) => Math.abs(wrapDelta(player.x, p.x, WORLD)) < 18);
    const nearCribDoor = !!(inCrib && cribX < -2.55);
    const nearWardrobe = !!(inCrib && cribX > 2.15);
    const parked = !!(car.parked || (car.gear === "P" && Math.abs((car.lat ?? 0) - parkLat(car.facing)) < 0.7));
    const pullOverOk = !!(inCar && !car.parked && (car.pullOverT || 0) <= 0 && car.turnT <= 0);
    const exitOk = (inCar && parked) || nearCribDoor;
    // On foot: Enter Car when near. In car: always tappable (exit if parked, else pull over → park).
    const carBtnOk = !!(!inCrib && (
      (inCar && (car.pullOverT || 0) <= 0 && car.turnT <= 0)
      || (!inCar && nearCar)
    ));
    // On foot: Enter/Exit Crib. In car: dedicated Pull Over.
    const cribBtnOk = !!(inCar ? pullOverOk : (nearCribDoor || (!inCar && !inCrib && nearHome)));
    const liveDeal = !!(order && (order.phase === "active" || order.phase === "nudge"));
    const nearDeal = !!(liveDeal && !inCar && Math.abs(wrapDelta(player.x, order.x, WORLD)) < 36);
    const slowEnough = Math.abs(player.vx) < SERVE_SLOW * 1.6;
    const canServe = !!(mode === "play" && !ui && nearDeal);
    const canBuy = !!(plugMeet && nearPlug && slowEnough);
    const offer = !!(order && (order.phase === "offer" || order.phase === "stalling"));
    let prompt = "";
    let gate = "";
    if (mode === "play" && !ui) {
      if (inCrib && nearWardrobe) gate = "CLOTHES";
      else if (exitOk) gate = "EXIT";
      else if (nearCar && nearHome) {
        const dCar = Math.abs(wrapDelta(player.x, car.x, WORLD));
        const dHome = Math.abs(wrapDelta(player.x, HOME_X, WORLD));
        gate = dCar <= dHome ? "ENTER CAR" : "ENTER CRIB";
      } else if (nearCar) gate = "ENTER CAR";
      else if (nearHome) gate = "ENTER CRIB";
      else if (canBuy) gate = "BUY";
      if (canServe) prompt = "SERVE";
      else if (gate) prompt = gate;
      else if (nearPlug && !plugMeet) prompt = "TEXT";
      else if (nearPed && !nearCar && !nearHome) prompt = "HIT UP";
    }
    // Face-grid ACT: crib enter/exit near door, plus interact/sell/buy/text.
    let actionLabel = "ACT";
    let actionOk = false;
    let actionKind = "";
    if (mode === "play" && !ui) {
      if (inCrib && nearWardrobe) { actionLabel = "CLOTHES"; actionOk = true; actionKind = "clothes"; }
      else if (nearCribDoor) { actionLabel = "EXIT"; actionOk = true; actionKind = "crib"; }
      else if (!inCar && !inCrib && nearHome) { actionLabel = "CRIB"; actionOk = true; actionKind = "crib"; }
      else if (canServe) { actionLabel = "SERVE"; actionOk = true; actionKind = "serve"; }
      else if (canBuy) { actionLabel = "BUY"; actionOk = true; actionKind = "buy"; }
      else if (nearPlug && !plugMeet) { actionLabel = "TEXT"; actionOk = true; actionKind = "text"; }
      else if (nearPed && !nearCar && !nearHome && !canBuy) { actionLabel = "HIT UP"; actionOk = true; actionKind = "talk"; }
    }
    const carLabel = inCar ? "EXIT" : "CAR";
    // Slot X: Pull Over while driving; reserved (grey) on foot.
    const xLabel = inCar ? "PULL" : "—";
    const xBtnOk = !!(inCar && pullOverOk);
    const cribLabel = xLabel;
    const uturnBtnOk = !!(inCar && car.gear === "D" && car.turnT <= 0 && (car.pullOverT || 0) <= 0);
    return {
      nearCar, nearPlug, nearHome, nearPed, nearCribDoor, nearWardrobe, exitOk, liveDeal, nearDeal, slowEnough,
      canServe, canBuy, offer, prompt, gate, actionLabel, actionOk, actionKind, picks: [],
      parked, carBtnOk, cribBtnOk: xBtnOk, carLabel, cribLabel, xLabel, xBtnOk,
      pullOverOk, uturnBtnOk,
    };
  }

  function snapshot() {
    let edgeL = false;
    let edgeR = false;
    let destSide = 0;
    if (lastView && mode === "play") {
      for (const f of foes) {
        const side = edgeSide(f.x, lastView);
        if (side < 0) edgeL = true;
        if (side > 0) edgeR = true;
      }
      if (boss) {
        const side = edgeSide(boss.x, lastView);
        if (side < 0) edgeL = true;
        if (side > 0) edgeR = true;
      }
      if (order && (order.phase === "active" || order.phase === "nudge")) {
        destSide = edgeSide(order.x, lastView);
      } else if (order && (order.phase === "offer" || order.phase === "stalling")) {
        destSide = 0;
      } else if (plugMeet) {
        destSide = edgeSide(plugMeet.x, lastView);
      } else {
        destSide = edgeSide(HOME_X, lastView);
      }
    }
    const {
      nearCar, nearPlug, nearHome, nearPed, nearCribDoor, nearWardrobe, exitOk, liveDeal, nearDeal, slowEnough,
      canServe, canBuy, offer, prompt, gate, actionLabel, actionOk, actionKind, picks,
      parked, carBtnOk, cribBtnOk, carLabel: faceCarLabel, cribLabel: faceCribLabel,
      xLabel, xBtnOk, pullOverOk, uturnBtnOk,
    } = sense();
    const hour = wrapHour(timeHours);
    const dealD = liveDeal ? wrapDelta(player.x, order.x, WORLD) : 0;
    const navTarget = liveDeal ? order.x : (plugMeet ? plugMeet.x : HOME_X);
    const navLabel = liveDeal ? "DEAL" : (plugMeet ? "PLUG" : "HOME");
    const navD = wrapDelta(player.x, navTarget, WORLD);
    const lights = [];
    for (let i = 0; i < LIGHT_COUNT; i++) {
      lights.push({ x: lightGameX(i), phase: lightPhaseAt(clock, i) });
    }
    return {
      mode, cash, stash, packs, inv: { ...inv }, stashInv: { ...stashInv },
      contacts: contacts.map((c) => ({ ...c })),
      plugMeet: plugMeet ? { ...plugMeet } : null,
      ui, salePop: salePop ? { ...salePop } : null,
      introText: INTRO_TEXT, products: PRODUCTS, halfOz: HALF_OZ,
      rep, hi, hp: player.hp, carrying, wave, gun,
      heat: HEAT_ENABLED ? heat : 0, heatEnabled: HEAT_ENABLED, muted: isMuted(), combat: COMBAT,
      player: { ...player },
      car: { ...car },
      inCar, inCrib, cribX, atHome, nearCribDoor, nearWardrobe,
      order: order ? { ...order } : null,
      peds: peds.map((p) => ({ ...p })),
      lights,
      copCar: copCar ? { ...copCar } : null,
      prompt, gate, destSide, hitUp: prompt === "HIT UP" || prompt === "TALK",
      canServe, canBuy, nearHome, nearCar, nearPlug, nearPed, exitOk,
      showServe: canServe,
      slowToServe: false,
      showGate: !!(gate && mode === "play" && !ui && !canServe),
      showHitUp: prompt === "HIT UP" || prompt === "TALK",
      actionLabel, actionOk, actionKind, picks, offer: !!offer,
      carBtnOk, cribBtnOk, faceCarLabel, faceCribLabel, xLabel, xBtnOk, parked,
      pullOverOk: !!pullOverOk,
      uturnBtnOk: !!uturnBtnOk,
      turnOk: inCar && car.gear === "D" && car.turnT <= 0 && (car.pullOverT || 0) <= 0,
      holdLight, holdCar,
      stopped: inCar && Math.abs(car.vx) < CAR_STOP,
      boughtOnce, textedPlug,
      carSide: !inCar && car.hp > 0 && lastView ? edgeSide(car.x, lastView) : 0,
      carLabel: !inCar && car.hp > 0 ? formatDeal(player.x, car.x) : "",
      unread: inbox.some((m) => m.unread) || !!(order && (order.phase === "offer" || order.phase === "stalling")),
      inbox: inbox.map((m) => ({ ...m })),
      phoneTab,
      greenTiers: GREEN_TIERS,
      whiteTiers: WHITE_TIERS,
      repMax: MAX_REP,
      nextUnlock: (() => {
        const nxt = nextUnlock(rep);
        return nxt ? { label: nxt.label, minRep: nxt.minRep } : null;
      })(),
      dealM: Math.round(dealFeet(player.x, navTarget)),
      dealLabel: formatDeal(player.x, navTarget),
      dealDir: navD >= 0 ? 1 : -1,
      dealMe: player.x / WORLD,
      dealAt: navTarget / WORLD,
      homeAt: HOME_X / WORLD,
      navLabel,
      liveDeal: !!liveDeal,
      hour,
      timeLabel: fmtHour(hour),
      phase: dayPhase(hour),
      streetBusy: streetBusy(hour),
      plugOpen: plugOpen(hour),
      traffic: traffic.map((t) => ({ ...t })),
      outfit,
      wardrobe: { ...wardrobe },
      outfits: [{ id: wardrobe.hat || "beanie", label: wardrobe.hat === "none" ? "HAT OFF" : "HAT ON" }],
      sky: skyTint(hour),
      foes: foes.map((f) => ({ ...f })),
      shots: shots.map((s) => ({ ...s })),
      loot: loot.map((l) => ({ ...l })),
      pops: pops.map((p) => ({ ...p })),
      bits: bits.map((b) => ({ ...b })),
      booms: booms.map((b) => ({ ...b })),
      boss: boss ? { ...boss } : null,
      shake, muzzle, invuln, boardT, enterLock, camZoom,
      runHeld,
      edgeL, edgeR, viewHalf: lastView?.halfWidth || 0,
    };
  }

  function pop(x, y, text) {
    pops.push({ x, y, text, life: 0.8 });
  }

  function burst(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 20 + Math.random() * 70;
      bits.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 20,
        life: 0.25 + Math.random() * 0.25,
        color,
      });
    }
  }

  function maybeHi() {
    const worth = cash + stash;
    if (worth > hi) {
      hi = worth;
      saveHi(hi);
    }
  }

  function resetCar() {
    car.x = CAR_X;
    car.px = CAR_X;
    car.vx = 0;
    car.facing = 1;
    car.hp = CAR_HP;
    car.gear = "P";
    car.yaw = 0;
    car.turnT = 0;
    car.turnFrom = 0;
    car.turnTo = 0;
    car.shiftHint = 0;
    car.kind = "beater";
    car.lat = parkLat(1);
    car.passT = 0;
    car.turnLatFrom = 0;
    car.turnLatTo = 0;
    car.parked = true;
    car.pullOverT = 0;
    car.pullFromLat = parkLat(1);
    inCar = false;
    inCrib = false;
    cribX = -3.0;
    revU = 0;
    wreckT = 0;
    copCar = null;
  }

  function carIsParked() {
    return !!(car.parked || (car.gear === "P" && Math.abs((car.lat ?? 0) - parkLat(car.facing)) < 0.7));
  }

  function startPullOver() {
    if (!inCar || car.parked || (car.pullOverT || 0) > 0 || car.turnT > 0) return false;
    car.pullFromLat = car.lat ?? restLat(car.facing);
    car.pullOverT = PULL_OVER_T;
    car.passT = 0;
    car.turnT = 0;
    return true;
  }

  function persistZoom() {
    try { localStorage.setItem(ZOOM_KEY, String(camZoom)); } catch {}
  }

  function clampZoom(z) {
    return Math.max(CAM_ZOOM_MIN, Math.min(CAM_ZOOM_MAX, Number(z) || CAM_ZOOM_MED));
  }

  function cycleZoom() {
    camZoom = clampZoom(camZoom + 0.12);
    persistZoom();
    return camZoom;
  }

  function nudgeZoom(dir) {
    camZoom = clampZoom(camZoom + (dir < 0 ? -0.04 : 0.04));
    persistZoom();
    return camZoom;
  }

  function analogZoom(pixels) {
    if (!pixels) return camZoom;
    camZoom = clampZoom(camZoom + pixels * 0.0032);
    persistZoom();
    return camZoom;
  }

  function setZoom(z) {
    camZoom = clampZoom(z);
    persistZoom();
    return camZoom;
  }

  function enterCar() {
    if (enterLock > 0) return false;
    if (!carIsParked()) {
      // Snap into a parked car only — pull over first if still in a lane.
      if (car.gear !== "P") return false;
    }
    inCar = true;
    boardT = BOARD_T;
    revU = 0;
    car.gear = "P";
    car.vx = 0;
    car.shiftHint = 0;
    car.turnT = 0;
    car.yaw = car.facing < 0 ? Math.PI : 0;
    car.lat = parkLat(car.facing);
    car.parked = true;
    car.pullOverT = 0;
    car.passT = 0;
    player.x = car.x;
    player.y = GROUND_Y;
    player.vy = 0;
    player.vx = 0;
    player.facing = car.facing;
    return true;
  }

  function leaveCar() {
    if (!carIsParked()) {
      pop(car.x, 150, "PULL OVER");
      return false;
    }
    inCar = false;
    boardT = BOARD_T;
    enterLock = ENTER_LOCK;
    car.gear = "P";
    car.vx = 0;
    car.parked = true;
    car.lat = parkLat(car.facing);
    player.x = car.x;
    player.px = car.x;
    player.vx = 0;
    player.y = GROUND_Y;
    player.vy = 0;
    player.facing = car.facing;
    return true;
  }

  function tryShift(to, brakeHeld) {
    if (!to || !GEARS.includes(to) || to === car.gear) return false;
    if ((car.pullOverT || 0) > 0) return false;
    const from = car.gear;
    if (from === "P" && !brakeHeld) {
      car.shiftHint = 1.15;
      return false;
    }
    if (to === "P" && Math.abs(car.vx) > 18) {
      car.vx = 0;
      pop(car.x, 150, "CLUNK");
      sfx.hit();
    }
    const crossingDrive = (from === "R" && to === "D") || (from === "D" && to === "R");
    if (crossingDrive && Math.abs(car.vx) > 22) {
      car.vx *= 0.28;
      pop(car.x, 150, "CLUNK");
      sfx.hit();
    }
    car.gear = to;
    car.shiftHint = 0;
    if (to !== "P") {
      car.parked = false;
      if (Math.abs((car.lat ?? 0) - parkLat(car.facing)) < 0.9) {
        // Ease off the curb into the travel lane when leaving park.
        car.lat = restLat(car.facing);
      }
    } else if (Math.abs((car.lat ?? 0) - parkLat(car.facing)) < 0.7) {
      car.parked = true;
      car.lat = parkLat(car.facing);
    }
    return true;
  }

  function requestTurn(dir, opts = {}) {
    if (!dir || car.turnT > 0 || (car.pullOverT || 0) > 0) return false;
    if (dir === car.facing) return false;
    if (!opts.force && Math.abs(car.vx) > CAR_TURN_MAX) return false;
    car.turnT = CAR_TURN_TIME;
    const fromYaw = car.facing < 0 ? Math.PI : 0;
    car.turnFrom = fromYaw;
    car.turnTo = fromYaw + Math.PI;
    car.turnLatFrom = restLat(car.facing);
    car.turnLatTo = restLat(dir);
    car.facing = dir;
    car.parked = false;
    return true;
  }

  function doUTurn() {
    if (!inCar || car.turnT > 0 || (car.pullOverT || 0) > 0) return false;
    if (car.gear !== "D") {
      pop(car.x, 150, "DRIVE");
      return false;
    }
    const destLat = restLat(-car.facing);
    if (laneBusyNow(destLat, car.x, 128)) {
      pop(car.x, 150, "WAIT");
      return false;
    }
    return requestTurn(-car.facing, { force: true });
  }

  function laneBusyNow(lat, x, span = 72) {
    for (const o of traffic) {
      if (Math.abs((o.lat ?? restLat(o.facing)) - lat) < 1.8
        && Math.abs(wrapDelta(x, o.x, WORLD)) < span) return true;
    }
    return false;
  }

  const TRAFFIC_COLS = [
    "#2a3048", "#6a3a24", "#1a3a48", "#4a2030", "#3a3a38", "#204028", "#5a4030",
    "#8a2a2a", "#2a5a3a", "#3a2a68", "#a07030", "#1a1a22", "#486878", "#704028",
    "#c45a28", "#2a4868", "#5a2048", "#3a6848", "#8a6a20", "#284060", "#6a2828",
    "#405060", "#984830", "#1c3040",
  ];
  const TRAFFIC_KINDS = ["beater", "luxury", "hatch", "suv", "van"];

  function makePed(i) {
    return {
      x: wrap((WORLD / Math.max(1, PED_COUNT)) * ((i ?? 0) % PED_COUNT) + Math.random() * 90, WORLD),
      facing: (i ?? 0) % 2 === 0 ? 1 : -1,
      look: (i ?? 0) % BUYER_COUNT,
      anim: Math.random(),
      wait: Math.random() < 0.3 ? 0.8 + Math.random() * 2 : 0,
      speed: 9 + Math.random() * 8,
      hitCd: 0,
      vx: 0,
      side: 0,
      lane: ((i ?? 0) % 5) * 0.22 - 0.18,
      stride: Math.random() * 8,
      pushed: 0,
    };
  }

  function makeTrafficCar(i) {
    const facing = i % 2 === 0 ? 1 : -1;
    const x = wrap((WORLD / Math.max(1, TRAFFIC_MAX)) * (i % TRAFFIC_MAX) + Math.random() * 140, WORLD);
    const spd = facing * (42 + Math.random() * 44);
    return {
      x,
      px: x,
      facing,
      vx: spd,
      cruise: spd,
      lat: restLat(facing),
      passT: 0,
      kind: TRAFFIC_KINDS[i % TRAFFIC_KINDS.length],
      color: TRAFFIC_COLS[i % TRAFFIC_COLS.length],
      yaw: facing < 0 ? Math.PI : 0,
    };
  }

  let trafficLock = false;
  function syncCrowd() {
    const busy = streetBusy(timeHours);
    const nPed = Math.max(0, Math.round(PED_COUNT * busy));
    const nCar = Math.max(0, Math.round(TRAFFIC_MAX * busy));
    while (peds.length < nPed) peds.push(makePed(peds.length));
    if (peds.length > nPed) peds.length = nPed;
    if (trafficLock) return;
    while (traffic.length < nCar) traffic.push(makeTrafficCar(traffic.length));
    if (traffic.length > nCar) traffic.length = nCar;
  }

  function spawnPeds() {
    peds = [];
    traffic = [];
    syncCrowd();
  }

  function nextOrderWait() {
    const base = Math.max(5, 18 - rep * 1.3) + Math.random() * 5;
    return base * orderWaitMul(timeHours);
  }

  function bumpHeat(n) {
    if (!HEAT_ENABLED) return;
    heat = Math.min(3, heat + n * heatMul(timeHours));
  }

  function seedContacts() {
    const n = 3 + Math.floor(Math.random() * 3);
    usedNames = new Set();
    contacts = [];
    for (let i = 0; i < n; i++) {
      const name = CONTACT_NAMES[i] || MORE_NAMES[i];
      usedNames.add(name);
      contacts.push({
        id: "c" + i,
        name,
        kind: "customer",
        status: "idle",
        knows: false,
        flakes: 0,
        look: i % BUYER_COUNT,
      });
    }
    contacts.push({
      id: "plug",
      name: "PLUG",
      kind: "plug",
      status: "idle",
      flakes: 0,
      look: 0,
    });
  }

  function findContact(id) {
    return contacts.find((c) => c.id === id);
  }

  function sendRepTip() {
    if (repTipSent) return;
    repTipSent = true;
    const plug = findContact("plug");
    inbox.unshift({
      from: plug?.name || "PLUG",
      text: "every sale = +2 rep, flake = -2. more rep = more custies + bigger weight",
      t: clock,
      unread: true,
    });
    inbox.unshift({
      from: "PHONE",
      text: "they don't know you got work yet. CONTACTS → HIT UP when you're holding",
      t: clock,
      unread: true,
    });
    sfx.ping();
  }

  function loseContact(c, why) {
    if (!c || c.kind === "plug") return;
    pop(player.x, 150, "LOST " + c.name);
    contacts = contacts.filter((x) => x.id !== c.id);
    if (order && order.contactId === c.id) order = null;
    if (why) sfx.hit();
  }

  function markFlake(c) {
    if (!c || c.kind === "plug") return;
    c.flakes = (c.flakes || 0) + 1;
    c.status = "idle";
    if (c.flakes >= FLAKE_LIMIT) loseContact(c, true);
  }

  function pickNewName() {
    const pool = [...CONTACT_NAMES, ...MORE_NAMES].filter((n) => !usedNames.has(n));
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function addContact(name, look, opts = {}) {
    const n = name || pickNewName();
    if (!n) return null;
    usedNames.add(n);
    const c = {
      id: "c" + Date.now().toString(36) + Math.floor(Math.random() * 99),
      name: n,
      kind: "customer",
      status: "idle",
      knows: !!opts.knows,
      flakes: 0,
      look: look ?? (contacts.length % BUYER_COUNT),
    };
    contacts.splice(contacts.findIndex((x) => x.kind === "plug"), 0, c);
    pop(player.x, 148, "NEW " + n);
    sfx.ping();
    return c;
  }

  function gramsOf(id) {
    return Math.max(0, inv[id] || 0);
  }

  function setUi(name) {
    ui = name || null;
  }

  function togglePhone() {
    ui = ui === "phone" ? null : "phone";
    if (ui === "phone") {
      inbox.forEach((m) => { m.unread = false; });
    }
    return ui === "phone";
  }

  function setPhoneTab(tab) {
    phoneTab = tab === "contacts" ? "contacts" : "texts";
    if (phoneTab === "texts") inbox.forEach((m) => { m.unread = false; });
  }

  function textPlug() {
    const plug = findContact("plug");
    if (!plug) return false;
    if (!plugOpen(timeHours)) {
      const already = inbox.some((m) => m.from === (plug.name || "PLUG") && m.text === "hit me later");
      textedPlug = true;
      if (!already) {
        inbox.unshift({
          from: plug.name || "PLUG",
          text: "hit me later",
          t: clock,
          unread: true,
        });
      }
      ui = "phone";
      phoneTab = "texts";
      sfx.ping();
      pop(player.x, 150, "LATER");
      return false;
    }
    textedPlug = true;
    plugMeet = { x: PLUG_X, t: 90, label: "the plug" };
    plug.status = "meet";
    ui = null;
    sfx.ping();
    pop(PLUG_X, 150, "MEET PLUG");
    return true;
  }

  function buyProduct(id, tierId) {
    const p = PRODUCTS[id];
    if (!p) return false;
    if (!plugMeet) {
      pop(player.x, 150, "TEXT PLUG");
      return false;
    }
    const tiers = id === "WHITE" ? WHITE_TIERS : GREEN_TIERS;
    const tier = tiers.find((t) => t.id === tierId) || tiers[0];
    if (!tier) return false;
    if ((rep || 0) < (tier.minRep || 0)) {
      pop(plugMeet.x, 154, "NEED REP " + tier.minRep);
      return false;
    }
    if (cash < tier.cost) {
      pop(plugMeet.x, 154, "NEED $");
      return false;
    }
    cash -= tier.cost;
    inv[id] = gramsOf(id) + tier.grams;
    packs = Math.round((gramsOf("GREEN") + gramsOf("WHITE")) / HALF_OZ);
    const firstBuy = !boughtOnce;
    boughtOnce = true;
    sfx.buy();
    pop(plugMeet.x, 150, "+" + tier.grams + "g " + id);
    if (firstBuy) {
      sendRepTip();
      orderCd = 99;
    }
    maybeHi();
    return true;
  }

  function stockedProducts() {
    const ids = [];
    if (gramsOf("GREEN") > 0.001) ids.push("GREEN");
    if (gramsOf("WHITE") > 0.001) ids.push("WHITE");
    return ids;
  }

  function pingContact(id) {
    const c = findContact(id);
    if (!c || c.kind === "plug") return false;
    if (c.knows) {
      pop(player.x, 150, "THEY KNOW");
      return false;
    }
    const stocked = stockedProducts();
    if (!textedPlug || !boughtOnce || !stocked.length) {
      pop(player.x, 150, "RE-UP FIRST");
      return false;
    }
    c.knows = true;
    c.status = "idle";
    const what = stocked.map((p) => p.toLowerCase()).join(" + ");
    inbox.unshift({
      from: "ME",
      text: "yo I'm up, got " + what,
      t: clock,
      unread: false,
    });
    inbox.unshift({
      from: c.name,
      text: "bet",
      t: clock,
      unread: true,
    });
    sfx.ping();
    pop(player.x, 150, "HIT " + c.name);
    if (!order) spawnOrder(null, { contactId: c.id });
    return true;
  }

  function transfer(kind, dir) {
    if (kind === "cash") {
      if (dir > 0) {
        if (cash <= 0) return false;
        stash += cash;
        const n = cash;
        cash = 0;
        maybeHi();
        sfx.drop();
        pop(HOME_X, 150, "IN $" + n);
        return true;
      }
      if (stash <= 0) return false;
      cash += stash;
      const n = stash;
      stash = 0;
      sfx.pickup();
      pop(HOME_X, 150, "OUT $" + n);
      return true;
    }
    const id = kind;
    if (!PRODUCTS[id]) return false;
    if (dir > 0) {
      const n = gramsOf(id);
      if (n <= 0) return false;
      stashInv[id] = (stashInv[id] || 0) + n;
      inv[id] = 0;
      sfx.drop();
      pop(HOME_X, 150, "IN " + id);
      return true;
    }
    const n = stashInv[id] || 0;
    if (n <= 0) return false;
    inv[id] = gramsOf(id) + n;
    stashInv[id] = 0;
    sfx.pickup();
    pop(HOME_X, 150, "OUT " + id);
    return true;
  }

  function acceptOrder() {
    if (!order || (order.phase !== "offer" && order.phase !== "stalling")) return false;
    const stallCut = order.stalls ? 0.62 : 1;
    order.phase = "active";
    order.t = (order.maxT || 16) * stallCut;
    const c = findContact(order.contactId);
    if (c) c.status = "waiting";
    sfx.ping();
    return true;
  }

  function declineOrder() {
    return stallOrder();
  }

  function stallOrder() {
    if (!order || (order.phase !== "offer" && order.phase !== "stalling")) return false;
    order.stalls = (order.stalls || 0) + 1;
    if (order.stalls >= 3) {
      pop(player.x, 150, "IM OUT");
      failOrder();
      return true;
    }
    order.phase = "stalling";
    order.t = 5 + order.stalls * 2;
    order.text = STALL_LINES[order.stalls - 1] || STALL_LINES[STALL_LINES.length - 1];
    inbox.unshift({
      from: order.name, text: order.text, t: clock, unread: true,
    });
    const c = findContact(order.contactId);
    if (c) c.status = "nudge";
    sfx.ping();
    pop(player.x, 150, "STALL");
    return true;
  }

  function failOrder() {
    if (!order) return;
    pop(player.x, 152, "NO SHOW");
    const c = findContact(order.contactId);
    markFlake(c);
    order = null;
    rep = Math.max(0, rep - 2);
    orderCd = nextOrderWait() + 6;
  }

  function buyPack() {
    return buyProduct("GREEN");
  }

  function stashCash() {
    return transfer("cash", 1);
  }

  function serve() {
    if (!order || (order.phase !== "active" && order.phase !== "nudge")) return false;
    const nearDeal = Math.abs(wrapDelta(player.x, order.x, WORLD)) < 36;
    if (!nearDeal || inCar) return false;
    const grams = order.grams || streetGrams(order.product, order.dollars);
    if (gramsOf(order.product) + 0.001 < grams) {
      needPackT = 1.2;
      pop(order.x, 154, "NEED " + order.product);
      return false;
    }
    inv[order.product] = gramsOf(order.product) - grams;
    packs = Math.round((gramsOf("GREEN") + gramsOf("WHITE")) / HALF_OZ);
    const pay = order.dollars;
    cash += pay;
    bumpHeat(0.18);
    rep = Math.min(MAX_REP, rep + 2);
    salePop = {
      product: order.product,
      grams,
      dollars: pay,
      life: SALE_POP_T,
    };
    pop(order.x, 150, "SOLD +$" + pay);
    sfx.drop();
    burst(order.x, 178, 14, "#f0c430");
    maybeHi();
    const c = findContact(order.contactId);
    if (c) {
      c.status = "idle";
      c.flakes = 0;
    }
    if (Math.random() < 0.38) addContact();
    order = null;
    orderCd = nextOrderWait();
    needPackT = 0;
    return true;
  }

  function solicit() {
    const ped = peds.find((p) => Math.abs(wrapDelta(player.x, p.x, WORLD)) < 18 && p.hitCd <= 0);
    if (!ped) return false;
    ped.hitCd = 4;
    bumpHeat(0.12);
    if (Math.random() < 0.55) {
      const c = addContact(null, ped.look, { knows: true });
      if (c) pop(ped.x, 150, c.name);
      else pop(ped.x, 150, "GOT U");
    } else {
      pop(ped.x, 150, "NAH");
      sfx.hit();
    }
    return true;
  }

  function openBuy() {
    if (!plugMeet) {
      ui = "phone";
      return false;
    }
    ui = "buy";
    return true;
  }

  function openStash() {
    ui = "stash";
    return true;
  }

  function enterCrib() {
    inCrib = true;
    cribX = -3.0;
    player.vx = 0;
    player.vy = 0;
    player.y = GROUND_Y;
    player.facing = 1;
    ui = null;
    fromCrib = false;
    return true;
  }

  function leaveCrib() {
    inCrib = false;
    cribX = -3.0;
    ui = null;
    fromCrib = false;
    player.x = wrap(HOME_X + 18, WORLD);
    player.px = player.x;
    player.vx = 0;
    player.y = GROUND_Y;
    player.vy = 0;
    player.facing = 1;
    return true;
  }

  function openCrib() {
    return enterCrib();
  }

  function openOutfit() {
    if (!inCrib) return false;
    ui = "outfit";
    return true;
  }

  function cycleOutfit() {
    if (ui !== "outfit" && ui !== "crib") return false;
    wardrobe.hat = wardrobe.hat === "none" ? "beanie" : "none";
    pop(HOME_X, 150, wardrobe.hat === "none" ? "HAT OFF" : "HAT ON");
    sfx.pickup();
    return true;
  }

  function sleepCrib() {
    timeHours = wrapHour(timeHours + 7);
    syncCrowd();
    player.hp = MAX_HP;
    invuln = 0.35;
    pop(HOME_X, 150, "ZZZ " + fmtHour(timeHours));
    sfx.drop();
    return true;
  }

  function waitCrib() {
    timeHours = wrapHour(timeHours + 1);
    syncCrowd();
    pop(HOME_X, 150, "WAIT " + fmtHour(timeHours));
    sfx.ping();
    return true;
  }

  function saveCrib() {
    if (mode !== "play") return false;
    const data = {
      cash, stash, inv, stashInv, rep, outfit, wardrobe, timeHours, boughtOnce, textedPlug, packs,
      contacts, inbox, playerX: player.x, carX: car.x, carFacing: car.facing,
      gear: car.gear, inCar, camZoom,
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch {}
    pop(HOME_X, 150, "SAVED");
    sfx.drop();
    return true;
  }

  function loadSave() {
    let raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch { return false; }
    if (!raw) return false;
    try {
      const s = JSON.parse(raw);
      cash = Math.max(0, Number(s.cash) || 0);
      stash = Math.max(0, Number(s.stash) || 0);
      inv = { GREEN: Math.max(0, Number(s.inv?.GREEN) || 0), WHITE: Math.max(0, Number(s.inv?.WHITE) || 0) };
      stashInv = { GREEN: Math.max(0, Number(s.stashInv?.GREEN) || 0), WHITE: Math.max(0, Number(s.stashInv?.WHITE) || 0) };
      packs = Math.max(0, Number(s.packs) || 0);
      rep = Math.max(0, Math.min(MAX_REP, Number(s.rep) || 1));
      outfit = 0;
      wardrobe = { ...DEFAULT_WARDROBE, ...(s.wardrobe || {}) };
      if (s.wardrobe?.hat !== "none" && s.wardrobe?.hat !== "beanie") wardrobe.hat = "beanie";
      if (!s.wardrobe && s.outfit) wardrobe.hat = "beanie";
      timeHours = wrapHour(s.timeHours);
      boughtOnce = !!s.boughtOnce;
      textedPlug = s.textedPlug != null ? !!s.textedPlug : boughtOnce;
      if (Array.isArray(s.contacts) && s.contacts.length) {
        contacts = s.contacts.map((c) => ({ ...c }));
        usedNames = new Set(contacts.map((c) => c.name).filter(Boolean));
      }
      if (Array.isArray(s.inbox)) inbox = s.inbox.map((m) => ({ ...m }));
      if (Number.isFinite(Number(s.playerX))) {
        player.x = wrap(Number(s.playerX), WORLD);
        player.px = player.x;
      }
      if (Number.isFinite(Number(s.carX))) {
        car.x = wrap(Number(s.carX), WORLD);
        car.px = car.x;
      }
      if (s.carFacing) car.facing = s.carFacing < 0 ? -1 : 1;
      car.yaw = car.facing < 0 ? Math.PI : 0;
      car.lat = Number.isFinite(Number(s.carLat)) ? Number(s.carLat) : parkLat(car.facing);
      car.parked = s.carParked != null ? !!s.carParked : Math.abs(car.lat - parkLat(car.facing)) < 0.7;
      car.pullOverT = 0;
      if (s.inCar && car.hp > 0) enterCar();
      else if (inCar) leaveCar();
      if (GEARS.includes(s.gear)) car.gear = s.gear;
      if (car.gear === "P" && car.parked) car.lat = parkLat(car.facing);
      if (!zoomMigratedNow && Number.isFinite(Number(s.camZoom))) {
        const z = Number(s.camZoom);
        camZoom = (z === 0 || z === 1 || z === 2) ? (CAM_ZOOM_MUL[z] || CAM_ZOOM_MED) : clampZoom(z);
        persistZoom();
      }
      syncCrowd();
      return true;
    } catch {
      return false;
    }
  }

  function runPick(id) {
    ui = null;
    if (id === "serve") return serve();
    if (id === "clothes") return openOutfit();
    if (id === "exit" || id === "car" || id === "crib" || id === "buy" || id === "gate") return useGatePick(id);
    if (id === "text") return textPlug();
    if (id === "talk") return solicit();
    return false;
  }

  function doAction() {
    const a = sense();
    if (!a.actionOk) return false;
    if (a.actionKind === "accept") return acceptOrder();
    if (a.actionKind === "serve") return serve();
    if (a.actionKind === "clothes") return openOutfit();
    if (a.actionKind === "crib") return doCribBtn();
    if (a.actionKind === "buy") return useGatePick("buy");
    if (a.actionKind === "text") return textPlug();
    if (a.actionKind === "talk") return solicit();
    return false;
  }

  function doCarBtn() {
    if (inCrib) return false;
    if (inCar) {
      // Exit only when parked; otherwise Pull Over → curb → P.
      if (carIsParked()) return leaveCar();
      return startPullOver();
    }
    if (car.hp > 0 && Math.abs(wrapDelta(player.x, car.x, WORLD)) < 30 && onGround()) {
      return enterCar();
    }
    return false;
  }

  function doCribBtn() {
    // While driving the X slot is Pull Over; on foot ACT handles crib enter/exit.
    if (inCar) return startPullOver();
    if (inCrib) {
      if (cribX < -2.55) { leaveCrib(); return true; }
      return false;
    }
    if (Math.abs(wrapDelta(player.x, HOME_X, WORLD)) < 28 && onGround()) {
      openCrib();
      return true;
    }
    return false;
  }

  function useGatePick(id) {
    if (id === "exit") {
      if (inCrib) { leaveCrib(); return true; }
      if (inCar) return leaveCar();
    }
    if (id === "car") return doCarBtn();
    if (id === "crib") return doCribBtn();
    if (id === "buy") {
      if (plugMeet && Math.abs(wrapDelta(player.x, plugMeet.x, WORLD)) < 28) {
        openBuy();
        return true;
      }
    }
    return useGate();
  }

  function useGate() {
    const nearCarNow = !inCar && car.hp > 0 && Math.abs(wrapDelta(player.x, car.x, WORLD)) < 30 && onGround();
    const nearHomeNow = !inCar && Math.abs(wrapDelta(player.x, HOME_X, WORLD)) < 28 && onGround();
    const nearPlugNow = Math.abs(wrapDelta(player.x, plugMeet?.x ?? PLUG_X, WORLD)) < 28;
    if (inCrib) {
      if (cribX < -2.55) {
        leaveCrib();
        return true;
      }
      if (cribX > 2.15) {
        openOutfit();
        return true;
      }
      return false;
    }
    if (inCar) return leaveCar();
    if (nearCarNow) return enterCar();
    if (nearHomeNow) {
      openCrib();
      return true;
    }
    if (nearPlugNow && plugMeet) {
      openBuy();
      return true;
    }
    return false;
  }

  function reset(keepWave) {
    player.x = wrap(HOME_X + 48, WORLD);
    player.px = player.x;
    player.y = GROUND_Y;
    player.vx = 0;
    player.vy = 0;
    player.facing = 1;
    player.hp = MAX_HP;
    player.anim = 0;
    player.stride = 0;
    player.flash = 0;
    invuln = 2.8;
    shootCd = 0;
    carrying = false;
    heat = 0;
    packs = 0;
    if (!keepWave) {
      inv = emptyInv();
      stashInv = emptyInv();
      plugMeet = null;
      ui = null;
      salePop = null;
      boughtOnce = false;
      textedPlug = false;
      repTipSent = false;
      inbox = [];
      phoneTab = "texts";
      outfit = 0;
      wardrobe = { ...DEFAULT_WARDROBE };
      timeHours = START_HOUR;
      fromCrib = false;
      seedContacts();
    }
    stash = keepWave ? stash : 0;
    cash = keepWave ? cash : START_CASH;
    rep = keepWave ? rep : 1;
    ranReds = new Set();
    atHome = false;
    if (!keepWave) {
      gun = "pistol";
      wave = 1;
    }
    // PR #7: guns persist across waves; boss uses cash earned this wave.
    waveCashStart = cash;
    foes = [];
    shots = [];
    loot = [];
    pops = [];
    bits = [];
    booms = [];
    boss = null;
    bossFired = false;
    spawnCd = 2.2;
    copCd = 8;
    shake = 0;
    hitstop = 0;
    clock = 0;
    muzzle = 0;
    coyote = 0;
    jumpBuf = 0;
    order = null;
    orderCd = 8;
    needPackT = 0;
    resetCar();
    spawnPeds();
  }

  function spawnFoe(kind) {
    if (foes.length >= 2 + Math.min(2, wave)) return;
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = wrap(player.x + side * (200 + Math.random() * 50), WORLD);
    const k = kind ?? (Math.random() < 0.5 ? "runner" : "thug");
    foes.push({
      x, y: GROUND_Y, vx: 0, vy: 0,
      facing: side < 0 ? 1 : -1,
      hp: k === "cop" ? 2 : k === "runner" ? 1 : 2,
      anim: Math.random(),
      flash: 0,
      shootCd: 0.4 + Math.random() * 0.6,
      telegraph: 0,
      stun: 0,
      kind: k,
    });
  }

  function spawnBoss() {
    bossFired = true;
    boss = {
      x: wrap(player.x + 180, WORLD),
      y: GROUND_Y,
      vx: 0, vy: 0, facing: -1,
      hp: 4 + wave,
      anim: 0, flash: 0, shootCd: 1.6, telegraph: 0,
    };
    pop(player.x, 148, "BOSS");
    sfx.boom();
    shake = Math.min(1, shake + 0.4);
  }

  function spawnOrder(spotId, opts = {}) {
    if (mode !== "play") return null;
    if ((!boughtOnce || !textedPlug) && !opts.force) {
      orderCd = 8;
      return null;
    }
    let spot = ORDER_SPOTS.find((s) => s.id === spotId);
    if (!spot) {
      const minFar = WORLD * 0.28;
      const far = ORDER_SPOTS.filter((s) => Math.abs(wrapDelta(player.x, s.x, WORLD)) > minFar);
      const pool = far.length ? far : ORDER_SPOTS;
      pool.sort((a, b) => Math.abs(wrapDelta(player.x, b.x, WORLD)) - Math.abs(wrapDelta(player.x, a.x, WORLD)));
      spot = pool[Math.floor(Math.random() * Math.min(3, pool.length))];
    }
    const idle = contacts.filter((c) => c.kind === "customer" && c.status === "idle" && c.knows);
    const who = opts.contactId
      ? findContact(opts.contactId)
      : idle[Math.floor(Math.random() * idle.length)];
    if (!who && !opts.force) {
      orderCd = 8;
      return null;
    }
    const stocked = stockedProducts();
    if (!opts.product && !stocked.length && !opts.force) {
      orderCd = 8;
      return null;
    }
    const product = opts.product || stocked[Math.floor(Math.random() * stocked.length)] || "GREEN";
    const dollars = opts.dollars || SALE_AMOUNTS[Math.floor(Math.random() * SALE_AMOUNTS.length)];
    const grams = opts.grams ?? streetGrams(product, dollars);
    const dist = Math.abs(wrapDelta(player.x, spot.x, WORLD));
    const line = ORDER_LINES[Math.floor(Math.random() * ORDER_LINES.length)];
    const distU = Math.max(0, Math.min(1, dist / (WORLD * 0.5)));
    const timer = opts.t ?? Math.round(ORDER_T_MIN + distU * (ORDER_T_MAX - ORDER_T_MIN));
    const look = who?.look ?? ((opts.look ?? Math.floor(Math.random() * BUYER_COUNT)) % BUYER_COUNT + BUYER_COUNT) % BUYER_COUNT;
    if (who) who.status = opts.phase === "active" || opts.phase === "nudge" ? "waiting" : "offering";
    order = {
      id: spot.id,
      contactId: who?.id || "guest",
      name: who?.name || "SOMEONE",
      x: spot.x,
      label: spot.label,
      product,
      dollars,
      grams,
      packs: 0,
      phase: opts.phase || "offer",
      t: opts.phase === "active" || opts.phase === "nudge" ? timer : 0,
      maxT: timer,
      dist,
      look,
      text: opts.text || line(dollars, product, spot.label),
    };
    orderCd = nextOrderWait();
    inbox.unshift({
      from: order.name, text: order.text, t: clock, unread: order.phase === "offer",
    });
    sfx.ping();
    return order;
  }

  function completeOrder() {
    return serve();
  }

  function hurtCar(amount = 1) {
    if (car.hp <= 0) return;
    car.hp -= amount;
    shake = Math.min(1, shake + 0.4);
    hitstop = reduced ? 0 : 4;
    sfx.hurt();
    burst(car.x, GROUND_Y - 10, 8, "#5a3cff");
    if (car.hp <= 0) {
      car.hp = 0;
      car.vx = 0;
      wreckT = 8;
      if (inCar) {
        leaveCar();
        player.vy = -80;
        pop(car.x, 148, "WRECK");
        sfx.boom();
      }
    }
  }

  function hurtPlayer() {
    if (invuln > 0 || mode !== "play") return;
    if (inCar) {
      hurtCar(1);
      invuln = 1.1;
      return;
    }
    player.hp -= 1;
    invuln = 2.1;
    player.flash = 0.2;
    shake = Math.min(1, shake + 0.45);
    hitstop = reduced ? 0 : 5;
    sfx.hurt();
    burst(player.x, player.y - 18, 8, "#e21b7a");
    if (player.hp <= 0) {
      mode = "dead";
      stopMusic();
      sfx.dead();
      maybeHi();
    }
  }

  function killFoe(foe) {
    burst(foe.x, foe.y - 16, 10, foe.kind === "cop" ? "#3de0ff" : "#f0c430");
    booms.push({ x: foe.x, y: foe.y - 16, t: 0 });
    sfx.hit();
    shake = Math.min(1, shake + 0.28);
    hitstop = reduced ? 0 : 3;
    if (foe.kind === "cop") {
      heat = Math.min(3, heat + 0.45);
      cash += 40;
      pop(foe.x, foe.y - 28, "+40");
      maybeHi();
      return;
    }
    const kind = Math.random() < 0.55 ? "pack" : "cash";
    loot.push({ x: foe.x, y: GROUND_Y, kind, bob: Math.random() * 6 });
    pop(foe.x, foe.y - 28, kind === "pack" ? "PACK" : "+25");
  }

  function fire() {
    if (!COMBAT) return;
    if (shootCd > 0) return;
    const w = WEAPONS[gun];
    shootCd = w.cd;
    muzzle = 0.18;
    const dir = inCar ? car.facing : player.facing;
    const y = inCar ? GROUND_Y - 22 : player.y - 18;
    const xOff = inCar ? 22 : 14;
    const ox = (inCar ? car.x : player.x) + dir * xOff;
    for (let i = 0; i < w.pellets; i++) {
      const spread = w.pellets === 1 ? 0 : (i - (w.pellets - 1) / 2) * w.spread;
      shots.push({
        x: ox,
        y,
        vx: dir * w.speed + spread * 0.4,
        vy: w.pellets > 1 ? (i - (w.pellets - 1) / 2) * 48 : 0,
        from: "player",
        life: 0.65,
      });
    }
    sfx.shoot();
    burst(ox, y, 3, "#3de0ff");
    heat = Math.min(3, heat + (inCar ? 0.03 : 0.012));
  }

  function buyGun() {
    const next = WEAPONS[gun].next;
    if (next === gun) {
      pop(SHOP_X, 154, "MAX");
      return true;
    }
    const cost = WEAPONS[next].cost;
    if (cash < cost) {
      pop(SHOP_X, 154, "$" + cost);
      return true;
    }
    cash -= cost;
    gun = next;
    sfx.buy();
    pop(SHOP_X, 154, WEAPONS[gun].label);
    return true;
  }

  function onGround() {
    return player.y >= 197.5;
  }

  function inView(x, view) {
    if (!view || !Number.isFinite(view.halfWidth) || view.halfWidth <= 0) return false;
    const half = Math.max(20, view.halfWidth - 16);
    return Math.abs(wrapDelta(x, view.camGameX, WORLD)) < half;
  }

  function edgeSide(x, view) {
    if (!view || !Number.isFinite(view.halfWidth)) return 0;
    const d = wrapDelta(view.camGameX, x, WORLD);
    if (Math.abs(d) <= view.halfWidth) return 0;
    return d > 0 ? 1 : -1;
  }

  function beginPlay(keepWave) {
    unlockAudio();
    reset(keepWave);
    const loaded = !keepWave && loadSave();
    mode = keepWave || loaded ? "play" : "intro";
    ui = null;
    if (!keepWave && Math.abs(wrapDelta(player.x, HOME_X, WORLD)) < 28) {
      player.x = wrap(HOME_X + 48, WORLD);
      player.px = player.x;
    }
    sfx.start();
    startMusic();
  }

  function finishIntro() {
    if (mode !== "intro") return;
    mode = "play";
    ui = null;
  }

  function separatePeople(pl, crowd) {
    const gap = PED_SPACE;
    for (const ped of crowd) {
      const d = wrapDelta(pl.x, ped.x, WORLD);
      const ad = Math.abs(d);
      if (ad >= gap || ad < 0.001) {
        ped.side = (ped.side || 0) * 0.82;
        continue;
      }
      ped.side = Math.min(0.38, (ped.side || 0) + 0.1);
    }
  }

  function separatePeds(crowd) {
    const gap = PED_SPACE * 0.55;
    for (let i = 0; i < crowd.length; i++) {
      for (let j = i + 1; j < crowd.length; j++) {
        const d = wrapDelta(crowd[i].x, crowd[j].x, WORLD);
        const ad = Math.abs(d);
        if (ad >= gap || ad < 0.001) continue;
        crowd[i].side = Math.min(0.28, (crowd[i].side || 0) + 0.04);
        crowd[j].side = Math.min(0.28, (crowd[j].side || 0) - 0.04);
      }
    }
  }

  function tick(dt, input, view) {
    if (view) lastView = view;
    if (hitstop > 0) {
      hitstop -= 1;
      return snapshot();
    }

    if (input.phoneTab) setPhoneTab(input.phoneTab);
    if (input.inventory) {
      mode = "play";
      ui = "inv";
    }
    if (input.invClose) ui = null;
    if (input.buyTier && input.buyProduct) buyProduct(input.buyProduct, input.buyTierId);
    if (input.mute) setMuted(!isMuted());
    if (input.zoomAnalog) analogZoom(input.zoomAnalog);
    if (input.pause) {
      if (mode === "play") mode = "paused";
      else if (mode === "paused") mode = "play";
    }

    if (mode === "paused" || frozen) {
      setEngine("off");
      return snapshot();
    }
    if (mode === "play") {
      timeHours = wrapHour(timeHours + dt / SEC_PER_HOUR);
      syncCrowd();
    }

    if (mode === "title") {
      if (input.start || input.shoot || input.jump) beginPlay(false);
      clock += dt;
      return snapshot();
    }
    if (mode === "intro") {
      if (input.start || input.shoot || input.jump) finishIntro();
      clock += dt;
      return snapshot();
    }
    if (mode === "dead" || mode === "clear") {
      if (input.start || input.shoot || input.jump) {
        if (mode === "clear") {
          wave += 1;
          beginPlay(true);
        } else {
          beginPlay(false);
        }
      }
      clock += dt;
      return snapshot();
    }

    player.px = player.x;
    car.px = car.x;
    if (copCar) copCar.px = copCar.x;
    for (const t of traffic) t.px = t.x;

    if (input.phone) togglePhone();
    if (input.phoneClose) ui = null;
    if (input.pickClose) ui = ui === "pick" ? null : ui;
    if (input.pickId) runPick(input.pickId);
    if (input.pingContact) pingContact(input.pingContactId);
    if (input.textPlug) textPlug();
    if (input.buyGreen) buyProduct("GREEN");
    if (input.buyWhite) buyProduct("WHITE");
    if (input.buyClose) ui = null;
    if (input.cribClose || input.outfitClose) { ui = ui === "outfit" || ui === "crib" ? null : ui; fromCrib = false; }
    if (input.cribClothes || input.outfitHat) cycleOutfit();
    runHeld = !!input.run;
    if (input.cribSleep) sleepCrib();
    if (input.cribWait) waitCrib();
    if (input.cribSave) saveCrib();
    if (input.cribStash) { fromCrib = true; openStash(); }
    if (input.stashClose) {
      ui = fromCrib ? "crib" : null;
      fromCrib = false;
    }
    if (input.stashInCash) transfer("cash", 1);
    if (input.stashOutCash) transfer("cash", -1);
    if (input.stashInGreen) transfer("GREEN", 1);
    if (input.stashOutGreen) transfer("GREEN", -1);
    if (input.stashInWhite) transfer("WHITE", 1);
    if (input.stashOutWhite) transfer("WHITE", -1);

    if (ui && ui !== "phone") {
      if (input.accept) acceptOrder();
      if (input.decline) declineOrder();
      clock += dt;
      atHome = !inCar && Math.abs(wrapDelta(player.x, HOME_X, WORLD)) < 28;
      heat = Math.max(0, heat - dt * (atHome ? 0.2 : 0.04));
      if (salePop) {
        salePop.life -= dt;
        if (salePop.life <= 0) salePop = null;
      }
      return snapshot();
    }

    let usedJump = false;
    if (inCrib) {
      if (input.gate || input.exit) useGate();
    } else if (inCar) {
      const want = input.gearTap || input.shiftGear;
      if (want) tryShift(want, !!input.brake);
      if (input.shiftStep) {
        const i = GEARS.indexOf(car.gear);
        const next = GEARS[i + input.shiftStep];
        if (next) tryShift(next, !!input.brake);
      }
      if (input.uturn) doUTurn();
      if (input.pullover) startPullOver();
      if (input.gate || input.exit) useGate();
    } else if (input.gate) {
      useGate();
    }
    if (input.carBtn) doCarBtn();
    if (input.cribBtn) doCribBtn();
    if (input.action) doAction();
    if (input.serve || (input.shoot && Math.abs(wrapDelta(player.x, order?.x ?? player.x, WORLD)) < 32 && Math.abs(player.vx) < SERVE_SLOW)) serve();
    if (input.hitup && !inCar) solicit();
    if (input.accept) acceptOrder();
    if (input.decline) declineOrder();

    if (inCar) {
      car.shiftHint = Math.max(0, car.shiftHint - dt);
      const spec = CAR_KINDS[car.kind] || CAR_KINDS.beater;
      const accel = spec.accel || CAR_ACCEL;
      const vmax = spec.max || CAR_MAX;
      const creep = spec.creep || CAR_CREEP;
      let brake = !!input.brake;
      let gas = !!input.gas;
      // Pull-over clip: steer to curb, brake out, land in P/parked.
      if ((car.pullOverT || 0) > 0) {
        car.pullOverT = Math.max(0, car.pullOverT - dt);
        const u = 1 - car.pullOverT / PULL_OVER_T;
        const s = u * u * (3 - 2 * u);
        const dest = parkLat(car.facing);
        const from = car.pullFromLat ?? (car.lat ?? restLat(car.facing));
        car.lat = from + (dest - from) * s;
        gas = false;
        brake = true;
        car.vx *= Math.exp(-3.2 * dt);
        if (Math.abs(car.vx) < 10) car.vx = 0;
        car.passT = 0;
        if (car.pullOverT <= 0) {
          car.lat = dest;
          car.vx = 0;
          car.gear = "P";
          car.parked = true;
          pop(car.x, 150, "PARKED");
        }
      }
      const gasAmt = gas ? Math.max(0.12, Math.min(1, Number(input.gasAmt) || 1)) : 0;
      const brakeAmt = brake ? Math.max(0.18, Math.min(1, Number(input.brakeAmt) || 1)) : 1;
      holdLight = false;
      holdCar = false;
      const face = car.facing || 1;
      const homeLat = restLat(face);
      const passLat = restLat(-face);
      const myLat = car.lat ?? homeLat;
      if (gas && car.parked) {
        car.parked = false;
        if (car.gear === "P") car.gear = "D";
        car.lat = homeLat;
      }

      function stopLineX(index) {
        return stopLineGameX(index, face);
      }
      function bumperX(fromX = car.x) {
        return wrap(fromX + face * CAR_NOSE_GAME, WORLD);
      }
      function snapBumperTo(line) {
        car.x = wrap(line - face * CAR_NOSE_GAME, WORLD);
        car.vx = 0;
      }
      function nearestLight(fromX, maxLook, phases) {
        let best = null;
        for (let i = 0; i < LIGHT_COUNT; i++) {
          const ph = lightPhaseAt(clock, i);
          if (phases && !phases.includes(ph)) continue;
          const d = wrapDelta(bumperX(fromX), stopLineX(i), WORLD);
          if (Math.sign(d || 1) !== Math.sign(face)) continue;
          const ad = Math.abs(d);
          if (ad < maxLook && (!best || ad < best.d)) best = { d: ad, phase: ph, i };
        }
        return best;
      }
      const spd = Math.abs(car.vx);
      const decel = Math.max(40, accel * 1.75);
      const stopNeed = (spd * spd) / (2 * decel) + 14;
      const lightAhead = nearestLight(car.x, Math.max(56, stopNeed + 22), ["red", "yellow"]);
      let redHold = !!(lightAhead && (
        lightAhead.phase === "red"
        || (lightAhead.phase === "yellow" && lightAhead.d < stopNeed + 12)
      ));
      if (redHold && lightAhead) {
        const line = stopLineX(lightAhead.i);
        const toLine = wrapDelta(bumperX(), line, WORLD);
        const going = Math.sign(car.vx || face) === Math.sign(face);
        if (going && toLine * face <= 0.2) {
          snapBumperTo(line);
        } else if (going && Math.abs(toLine) < Math.abs(car.vx) * dt + 0.35) {
          snapBumperTo(line);
        } else if (lightAhead.d < 8) {
          car.vx = 0;
        }
      }

      let aheadCar = null;
      let aheadDist = Infinity;
      const pullingOver = (car.pullOverT || 0) > 0;
      for (const t of traffic) {
        if (pullingOver) break;
        if (Math.sign(t.facing || 1) !== Math.sign(face)) continue;
        const tHome = restLat(t.facing);
        const same = Math.abs((t.lat ?? tHome) - myLat) < 1.6;
        const ahead = wrapDelta(car.x, t.x, WORLD);
        if (same && Math.sign(ahead || 1) === Math.sign(face) && Math.abs(ahead) < 90) {
          if (Math.abs(ahead) < aheadDist) {
            aheadDist = Math.abs(ahead);
            aheadCar = t;
          }
        }
      }
      const carClose = !pullingOver && !!(aheadCar && aheadDist < 36 && Math.abs(aheadCar.vx) < Math.abs(car.vx) + 12);

      function passLaneClear(oncomingSpan = 210, alongside = CAR_NOSE_GAME * 2.6) {
        for (const t of traffic) {
          const tLat = t.lat ?? restLat(t.facing);
          if (Math.abs(tLat - passLat) > 1.7) continue;
          const d = wrapDelta(car.x, t.x, WORLD);
          const oncoming = Math.sign(t.facing || 1) !== Math.sign(face);
          if (oncoming && Math.abs(d) < oncomingSpan && Math.sign(d || 1) === Math.sign(face)) return false;
          if (!oncoming && Math.abs(d) < alongside) return false;
        }
        return true;
      }
      function junctionAhead(maxLook = 72) {
        for (let i = 0; i < LIGHT_COUNT; i++) {
          const d = wrapDelta(bumperX(), lightGameX(i), WORLD);
          if (Math.sign(d || 1) !== Math.sign(face)) continue;
          if (Math.abs(d) < maxLook) return true;
        }
        return false;
      }

      const canPass = !pullingOver && !!(aheadCar && car.gear === "D" && car.turnT <= 0
        && spd >= PASS_MIN_SPEED && gas && !redHold && !junctionAhead(72)
        && passLaneClear(210));
      if (canPass) car.passT = Math.max(car.passT || 0, 1.05);
      if (redHold || (car.passT > 0 && !passLaneClear(140))) car.passT = 0;

      let carHold = carClose && !canPass && !((car.passT || 0) > 0);
      if ((redHold || carHold) && car.gear !== "P" && !pullingOver) {
        brake = true;
        gas = false;
      }
      if ((redHold || carHold) && !pullingOver) gas = false;
      holdLight = redHold;
      holdCar = carHold;
      if (pullingOver) {
        // lat/vx already handled above; keep yaw aligned.
        car.yaw = car.facing < 0 ? Math.PI : 0;
        car.x = wrap(car.x + car.vx * dt, WORLD);
        player.x = car.x;
        player.vx = car.vx;
        player.facing = car.facing;
      } else if (car.turnT > 0) {
        car.turnT = Math.max(0, car.turnT - dt);
        const u = 1 - car.turnT / CAR_TURN_TIME;
        const s = u * u * (3 - 2 * u);
        car.yaw = car.turnFrom + (car.turnTo - car.turnFrom) * s;
        const fromLat = car.turnLatFrom ?? restLat(car.turnFrom < Math.PI / 2 ? 1 : -1);
        const toLat = car.turnLatTo ?? restLat(car.facing);
        car.lat = fromLat + (toLat - fromLat) * s + Math.sin(u * Math.PI) * (CAR_TURN_ARC * 0.35);
        const oldDir = car.turnFrom < Math.PI / 2 ? 1 : -1;
        const along = Math.cos(u * Math.PI) * oldDir;
        car.x = wrap(car.x + along * 36 * dt, WORLD);
        car.vx *= Math.exp(-2.4 * dt);
        car.passT = 0;
      } else {
        car.yaw = car.facing < 0 ? Math.PI : 0;
        if (aheadCar && (car.passT || 0) > 0) {
          const d = wrapDelta(car.x, aheadCar.x, WORLD);
          if (Math.sign(d) !== Math.sign(face) && Math.abs(d) > 10) car.passT = 0;
        }
        if ((car.passT || 0) > 0 && !passLaneClear()) car.passT = 0;
        car.passT = Math.max(0, (car.passT || 0) - dt);
        const curLat = car.lat ?? homeLat;
        // Parked on the curb: stay put — never lerp back into the travel lane.
        if (car.parked || (car.gear === "P" && Math.abs(curLat - parkLat(face)) < 0.9)) {
          car.lat = parkLat(face);
          car.parked = true;
          car.passT = 0;
        } else {
          let wantLat = (car.passT || 0) > 0 ? passLat : homeLat;
          if (Math.abs(wantLat - curLat) > 0.12) {
            let blocked = false;
            for (const t of traffic) {
              const tLat = t.lat ?? restLat(t.facing);
              if (Math.abs(tLat - wantLat) > 1.6) continue;
              if (Math.abs(wrapDelta(car.x, t.x, WORLD)) < CAR_NOSE_GAME * 2.4) blocked = true;
            }
            if (blocked) wantLat = curLat;
          }
          car.lat = curLat + (wantLat - curLat) * Math.min(1, dt * 3.2);
        }
        if (car.gear === "P") {
          car.vx = 0;
        } else if (brake) {
          if (Math.abs(car.vx) > 6) {
            car.vx -= Math.sign(car.vx) * accel * 1.7 * brakeAmt * dt;
            if (Math.abs(car.vx) < 6) car.vx = 0;
          } else {
            car.vx = 0;
          }
        } else if (car.gear === "N") {
          car.vx -= car.vx * Math.min(1, CAR_FRICTION * dt);
        } else {
          const driveDir = car.gear === "D" ? car.facing : -car.facing;
          if (gas) {
            car.vx += driveDir * accel * gasAmt * dt;
          } else {
            const target = driveDir * creep;
            const diff = target - car.vx;
            car.vx += Math.sign(diff) * Math.min(Math.abs(diff), accel * 0.55 * dt);
          }
          car.vx -= car.vx * Math.min(1, CAR_FRICTION * 0.22 * dt);
        }
        if (Math.abs(car.vx) > vmax) car.vx = Math.sign(car.vx) * vmax;
        if (redHold && lightAhead && Math.abs(car.vx) * dt >= lightAhead.d) {
          snapBumperTo(stopLineX(lightAhead.i));
        } else {
          car.x = wrap(car.x + car.vx * dt, WORLD);
        }
        if (redHold && lightAhead) {
          const toLine = wrapDelta(bumperX(), stopLineX(lightAhead.i), WORLD);
          if (toLine * face <= 0.2) snapBumperTo(stopLineX(lightAhead.i));
        }
      }
      if (gas && (car.gear === "P" || car.gear === "N")) {
        revU = Math.min(1, revU + dt / 0.85);
        setEngine("accel", revU);
      } else if (gas && (car.gear === "D" || car.gear === "R")) {
        revU = Math.abs(car.vx) / vmax;
        setEngine("accel", revU);
      } else {
        revU = Math.max(0, revU - dt / 0.22);
        setEngine("off");
      }
      player.x = car.x;
      player.vx = car.vx;
      player.facing = car.facing;
      player.y = GROUND_Y;
      player.vy = 0;
      player.anim += dt;
      if (Math.abs(player.vx) > 8) player.stride = (player.stride || 0) + Math.abs(player.vx) * dt;
    } else if (inCrib) {
      holdLight = false;
      holdCar = false;
      setEngine("off");
      if (input.moveX !== 0) {
        const want = input.moveX < 0 ? -1 : 1;
        if (want !== player.facing && !(player.turnT > 0)) {
          player.turnFrom = player.facing;
          player.turnT = 0.52;
        }
        if (!(player.turnT > 0.26)) player.facing = want;
      }
      player.turnT = Math.max(0, (player.turnT || 0) - dt);
      player.vx = input.moveX * MOVE_SPEED * (input.run ? 1.55 : 1);
      cribX = Math.max(-3.55, Math.min(3.55, cribX + player.vx * dt * (STREET_LEN / WORLD)));
      player.y = GROUND_Y;
      player.vy = 0;
      player.anim += dt;
      if (Math.abs(player.vx) > 8) player.stride = (player.stride || 0) + Math.abs(player.vx) * dt;
    } else {
      holdLight = false;
      holdCar = false;
      setEngine("off");
      if (input.moveX !== 0) {
        const want = input.moveX < 0 ? -1 : 1;
        if (want !== player.facing && !(player.turnT > 0)) {
          player.turnFrom = player.facing;
          player.turnT = 0.52;
        }
        if (!(player.turnT > 0.26)) player.facing = want;
      }
      player.turnT = Math.max(0, (player.turnT || 0) - dt);
      player.vx = input.moveX * MOVE_SPEED * (input.run ? 1.85 : 1);
      player.x = wrap(player.x + player.vx * dt, WORLD);
      separatePeople(player, peds);

      coyote = onGround() ? COYOTE : Math.max(0, coyote - dt);
      jumpBuf = usedJump || !COMBAT ? 0 : (input.jump ? JUMP_BUFFER : Math.max(0, jumpBuf - dt));
      if (COMBAT && !usedJump && jumpBuf > 0 && coyote > 0) {
        player.vy = JUMP_VEL;
        jumpBuf = 0;
        coyote = 0;
        sfx.jump();
      }
      player.vy += GRAVITY * dt;
      player.y += player.vy * dt;
      if (player.y > GROUND_Y) {
        player.y = GROUND_Y;
        player.vy = 0;
      }
      player.anim += dt;
      if (Math.abs(player.vx) > 8) player.stride = (player.stride || 0) + Math.abs(player.vx) * dt;
      if (car.hp > 0) car.vx = 0;
    }

    if (car.hp <= 0) {
      wreckT -= dt;
      if (wreckT <= 0) {
        car.hp = CAR_HP;
        car.x = CAR_X;
        car.vx = 0;
        car.facing = 1;
        car.gear = "P";
        car.yaw = 0;
        car.turnT = 0;
        pop(car.x, 150, "CAR");
      }
    }

    const atShop = !inCar && hitWrap(player.x, player.y - 10, 16, 24, SHOP_X, 188, 22, 28, WORLD);
    if (COMBAT) {
      if (inCar && input.shootHeld) fire();
      else if (!inCar && input.shootHeld && atShop) {
        if (input.shoot) buyGun();
      } else if (!inCar && input.shootHeld) fire();
    }

    shootCd = Math.max(0, shootCd - dt);
    muzzle = Math.max(0, muzzle - dt);
    invuln = Math.max(0, invuln - dt);
    player.flash = Math.max(0, player.flash - dt);
    clock += dt;
    const boardingNow = boardT > 0;
    boardT = Math.max(0, boardT - dt);
    if (boardingNow && boardT === 0 && !inCar) {
      const side = car.facing < 0 ? 1 : -1;
      player.x = wrap(car.x + side * 10, WORLD);
      player.px = player.x;
    }
    enterLock = Math.max(0, enterLock - dt);
    atHome = !inCar && Math.abs(wrapDelta(player.x, HOME_X, WORLD)) < 28;
    heat = Math.max(0, heat - dt * (atHome ? 0.2 : 0.04));
    needPackT = Math.max(0, needPackT - dt);
    if (salePop) {
      salePop.life -= dt;
      if (salePop.life <= 0) salePop = null;
    }
    if (plugMeet) {
      const nearMeet = Math.abs(wrapDelta(player.x, plugMeet.x, WORLD)) < 56 || ui === "buy";
      if (nearMeet) plugMeet.t = Math.max(plugMeet.t, 18);
      if (!nearMeet) plugMeet.t -= dt;
      if (plugMeet.t <= 0 && !nearMeet) {
        plugMeet = null;
        const plug = findContact("plug");
        if (plug) plug.status = "idle";
      }
    }

    if (COMBAT) {
      spawnCd -= dt;
      if (!boss && clock > 3.2 && spawnCd <= 0) {
        spawnFoe();
        spawnCd = Math.max(1.35, 2.6 - wave * 0.12);
      }
      const earned = cash - waveCashStart;
      if (!bossFired && earned >= BOSS_CASH_BASE + (wave - 1) * BOSS_CASH_PER_WAVE) {
        spawnBoss();
      }
      copCd -= dt;
      if (HEAT_ENABLED && heat >= 1.25 && copCd <= 0 && foes.filter((f) => f.kind === "cop").length < (heat >= 2 ? 2 : 1)) {
        spawnFoe("cop");
        copCd = 7.5;
        sfx.siren();
        pop(player.x, 150, "HEAT");
      }
    }

    for (const ped of peds) {
      ped.hitCd = Math.max(0, ped.hitCd - dt);
      ped.pushed = Math.max(0, (ped.pushed || 0) - dt);
      ped.side = (ped.side || 0) * Math.exp(-dt * 2.8);
      ped.anim += dt;
      if (Math.abs(ped.vx || 0) > 2) ped.stride = (ped.stride || 0) + Math.abs(ped.vx) * dt;
      if (ped.wait > 0) {
        ped.wait -= dt;
        ped.vx = 0;
      } else {
        if (Math.random() < 0.0035) ped.wait = 0.7 + Math.random() * 2.4;
        ped.vx = ped.facing * ped.speed;
        ped.x = wrap(ped.x + ped.vx * dt, WORLD);
      }
    }
    separatePeds(peds);
    if (inbox.length > 40) inbox.length = 40;
    if (pops.length > 16) pops.splice(0, pops.length - 16);

    const carGap = CAR_NOSE_GAME * 2.55;
    const oncomingSpan = 210;
    function laneBusy(lat, x, except, span = 72) {
      if (car.hp > 0 && Math.abs((car.lat ?? restLat(car.facing)) - lat) < 1.7
        && Math.abs(wrapDelta(x, car.x, WORLD)) < span) return true;
      for (const o of traffic) {
        if (o === except) continue;
        if (Math.abs((o.lat ?? restLat(o.facing)) - lat) < 1.7
          && Math.abs(wrapDelta(x, o.x, WORLD)) < span) return true;
      }
      return false;
    }
    function oncomingInLane(t, lat, span = oncomingSpan) {
      const faceT = t.facing || 1;
      if (car.hp > 0 && Math.sign(car.facing || 1) !== Math.sign(faceT)) {
        const plat = car.lat ?? restLat(car.facing);
        const d = wrapDelta(t.x, car.x, WORLD);
        if (Math.abs(plat - lat) < 1.7 && Math.abs(d) < span
          && Math.sign(d || 1) === Math.sign(faceT)) return true;
      }
      for (const o of traffic) {
        if (o === t) continue;
        if (Math.sign(o.facing || 1) === Math.sign(faceT)) continue;
        const olat = o.lat ?? restLat(o.facing);
        if (Math.abs(olat - lat) > 1.7) continue;
        const d = wrapDelta(t.x, o.x, WORLD);
        if (Math.abs(d) < span && Math.sign(d || 1) === Math.sign(faceT)) return true;
      }
      return false;
    }
    function junctionAheadOf(x, facing, maxLook = 72) {
      const faceT = facing || 1;
      for (let i = 0; i < LIGHT_COUNT; i++) {
        const d = wrapDelta(x, lightGameX(i), WORLD);
        if (Math.sign(d || 1) !== Math.sign(faceT)) continue;
        if (Math.abs(d) < maxLook) return lightPhaseAt(clock, i);
      }
      return null;
    }
    function mergeGapClear(t, lat) {
      const faceT = t.facing || 1;
      // Need a clear slot ahead of the slower car before ending a pass.
      return !laneBusy(lat, wrap(t.x + faceT * carGap * 1.1, WORLD), t, carGap * 0.85);
    }
    for (const t of traffic) {
      const faceT = t.facing || 1;
      const cruise = faceT * Math.abs(t.cruise || t.vx || 56);
      let want = cruise;
      let redAhead = false;
      for (let i = 0; i < LIGHT_COUNT; i++) {
        if (lightPhaseAt(clock, i) !== "red") continue;
        const line = stopLineGameX(i, faceT);
        const d = wrapDelta(t.x, line, WORLD);
        if (Math.sign(d) === Math.sign(faceT) && Math.abs(d) < 70) {
          redAhead = true;
          if (Math.abs(d) < Math.abs(t.vx) * dt + 3 || d * faceT <= 3) {
            t.x = wrap(line - faceT * 3, WORLD);
            t.vx = 0;
            want = 0;
          }
        }
      }
      if (redAhead) want = 0;
      const homeLat = restLat(t.facing);
      const otherLat = restLat(-t.facing);
      const nearJunction = !!junctionAheadOf(t.x, faceT, 68);
      const oncomingClose = oncomingInLane(t, otherLat, oncomingSpan);
      const oncomingTight = oncomingInLane(t, otherLat, 130);
      // Pass slower same-way traffic (player or AI), not only the player.
      let aheadBlock = null;
      let aheadDist = Infinity;
      if (car.hp > 0) {
        const playerLat = car.lat ?? restLat(car.facing);
        const sameLane = Math.abs((t.lat ?? homeLat) - playerLat) < 1.7;
        const ahead = wrapDelta(t.x, car.x, WORLD);
        if (sameLane && Math.sign(faceT) === Math.sign(ahead || 1) && Math.abs(ahead) < 56) {
          aheadBlock = car;
          aheadDist = Math.abs(ahead);
        }
      }
      for (const o of traffic) {
        if (o === t) continue;
        if (Math.sign(o.facing || 1) !== Math.sign(faceT)) continue;
        if (Math.abs((o.lat ?? restLat(o.facing)) - (t.lat ?? homeLat)) > 1.7) continue;
        const ahead = wrapDelta(t.x, o.x, WORLD);
        if (Math.sign(ahead || 1) === Math.sign(faceT) && Math.abs(ahead) < aheadDist && Math.abs(ahead) < 56) {
          aheadBlock = o;
          aheadDist = Math.abs(ahead);
        }
      }
      const headOn = car.hp > 0
        && Math.abs((t.lat ?? homeLat) - (car.lat ?? restLat(car.facing))) < 1.7
        && Math.sign(faceT) !== Math.sign(car.facing || 1)
        && Math.abs(wrapDelta(t.x, car.x, WORLD)) < 120
        && Math.sign(wrapDelta(t.x, car.x, WORLD) || 1) === Math.sign(faceT);
      if (headOn) {
        want = 0;
        t.passT = 0;
      } else if (aheadBlock && aheadDist < 48) {
        const blockerIsPlayer = aheadBlock === car;
        const playerParkedOrStopped = blockerIsPlayer
          && (carIsParked() || car.gear === "P" || Math.abs(car.vx) < CAR_STOP);
        // Parked/stopped player: pass even near a green junction (batch 11 jam fix).
        const canStartPass = !(t.passT > 0)
          && !oncomingClose && !redAhead
          && (playerParkedOrStopped || !nearJunction)
          && !laneBusy(otherLat, t.x, t, carGap * 1.2)
          && (playerParkedOrStopped || mergeGapClear(t, otherLat));
        if (canStartPass || (playerParkedOrStopped && !(t.passT > 0) && !oncomingClose && !redAhead
          && !laneBusy(otherLat, t.x, t, carGap * 0.9))) {
          t.passT = Math.max(t.passT || 0, playerParkedOrStopped ? 1.8 : 1.45);
          want = cruise * 1.22;
        } else if (!(t.passT > 0)) {
          want = Math.min(Math.abs(want), Math.abs(aheadBlock.vx || 0) * 0.92) * Math.sign(faceT || 1);
        } else {
          want = cruise * 1.15;
        }
      }
      // Abort an active pass only when it's actually unsafe.
      if (t.passT > 0 && (oncomingTight || redAhead)) t.passT = 0;
      if (t.passT > 0 && nearJunction) {
        const ph = junctionAheadOf(t.x, faceT, 55);
        if (ph === "red" || ph === "yellow") t.passT = 0;
      }
      t.passT = Math.max(0, (t.passT || 0) - dt);
      let targetLat = t.passT > 0 ? otherLat : homeLat;
      const curLat = t.lat ?? homeLat;
      if (Math.abs(targetLat - curLat) > 0.12 && laneBusy(targetLat, t.x, t, carGap)) {
        // Hold lane; don't slide into the player or another car.
        targetLat = curLat;
        if (targetLat === homeLat) t.passT = Math.max(t.passT || 0, 0.35);
      }
      if (!(t.passT > 0) && Math.abs(targetLat - homeLat) > 0.05 && !mergeGapClear(t, homeLat)) {
        targetLat = curLat;
      }
      t.lat = curLat + (targetLat - curLat) * Math.min(1, dt * 2.6);
      t.vx += (want - t.vx) * Math.min(1, dt * 2.4);
      t.x = wrap(t.x + t.vx * dt, WORLD);
    }
    const minGap = Math.max(carGap, CAR_NOSE_GAME * 3.15);
    const laneKey = (lat) => Math.round((lat ?? 0) * 4);
    const groups = new Map();
    for (const t of traffic) {
      const k = laneKey(t.lat ?? restLat(t.facing));
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(t);
    }
    const playerLat = car.hp > 0 ? (car.lat ?? restLat(car.facing)) : null;
    const playerKey = playerLat == null ? null : laneKey(playerLat);
    for (const [k, list] of groups) {
      const base = car.hp > 0 ? car.x : list[0].x;
      const ux = (x) => wrapDelta(base, x, WORLD);
      list.sort((a, b) => ux(a.x) - ux(b.x));
      if (playerKey === k) {
        const behind = list.filter((t) => ux(t.x) < 0);
        const ahead = list.filter((t) => ux(t.x) >= 0);
        let cursor = minGap;
        for (const t of ahead) {
          if (ux(t.x) < cursor - 0.01) {
            t.x = wrap(base + cursor, WORLD);
            t.vx *= 0.2;
          }
          cursor = ux(t.x) + minGap;
        }
        // Parked/stopped player: don't pin traffic behind — they must peel off and pass.
        const playerParkedOrStopped = carIsParked() || car.gear === "P" || Math.abs(car.vx) < CAR_STOP;
        if (!playerParkedOrStopped) {
          cursor = -minGap;
          for (let i = behind.length - 1; i >= 0; i--) {
            const t = behind[i];
            if ((t.passT || 0) > 0) continue;
            if (ux(t.x) > cursor + 0.01) {
              t.x = wrap(base + cursor, WORLD);
              t.vx *= 0.2;
            }
            cursor = ux(t.x) - minGap;
          }
        }
      } else {
        for (let i = 1; i < list.length; i++) {
          const prev = ux(list[i - 1].x);
          if (ux(list[i].x) - prev < minGap) {
            list[i].x = wrap(base + prev + minGap, WORLD);
            list[i].vx *= 0.2;
          }
        }
      }
    }

    if (HEAT_ENABLED && inCar && Math.abs(car.vx) > 4) {
      for (let i = 0; i < LIGHT_COUNT; i++) {
        if (lightPhaseAt(clock, i) !== "red") continue;
        const d = wrapDelta(car.x, lightGameX(i), WORLD);
        if (Math.sign(d) !== Math.sign(car.facing || car.vx || 1)) continue;
        if (Math.abs(d) >= 34) continue;
        const key = i + ":" + Math.floor((clock + i * 3.7) / 16);
        if (ranReds.has(key)) continue;
        ranReds.add(key);
        bumpHeat(0.9);
        pop(car.x, 148, "RED +HEAT");
        sfx.honk();
      }
    }

    orderCd -= dt;
    if (!order && orderCd <= 0) spawnOrder();
    if (order) {
      if (order.phase === "offer") {
        // wait for ACCEPT / STALL
      } else if (order.phase === "stalling") {
        order.t -= dt;
        if (order.t <= 0) {
          if (order.stalls >= 2) {
            failOrder();
          } else {
            order.phase = "offer";
            order.text = "so we good or nah?";
            inbox.unshift({ from: order.name, text: order.text, t: clock, unread: true });
            sfx.ping();
          }
        }
      } else {
        const nearNow = Math.abs(wrapDelta(player.x, order.x, WORLD)) < 52;
        if (nearNow) {
          order.arrived = true;
          order.t = Math.max(order.t, 14);
        }
        if (!order.arrived) order.t -= dt;
        if (order.t <= 0) {
          if (order.phase === "active") {
            order.phase = "nudge";
            order.text = "u still comin thru?";
            order.t = Math.max(5, order.maxT * 0.38);
            order.maxT = order.t;
            inbox.unshift({ from: order.name, text: order.text, t: clock, unread: true });
            sfx.ping();
          } else {
            failOrder();
          }
        }
      }
    }

    const late = heatMul(timeHours) >= 1.18;
    if (HEAT_ENABLED && heat >= (late ? 1.42 : 1.6) && !copCar) {
      const behind = player.facing !== 0 ? -player.facing : -1;
      copCar = {
        x: wrap(player.x + behind * 150, WORLD),
        vx: 0,
        facing: -behind,
        bumpCd: 0,
        hp: COP_CAR_HP,
      };
      sfx.siren();
      pop(player.x, 146, "5-0");
    }
    if (copCar) {
      if (heat < (late ? 1.05 : 1.15)) {
        copCar = null;
      } else {
        const dx = wrapDelta(copCar.x, player.x, WORLD);
        const chase = Math.sign(dx || 1) * Math.min(CAR_MAX * 0.92, 90 + Math.abs(dx) * 0.35);
        copCar.vx += (chase - copCar.vx) * Math.min(1, dt * 2.4);
        copCar.facing = Math.abs(copCar.vx) > 8 ? Math.sign(copCar.vx) : (dx >= 0 ? 1 : -1);
        copCar.x = wrap(copCar.x + copCar.vx * dt, WORLD);
        copCar.bumpCd = Math.max(0, copCar.bumpCd - dt);
        const caught = copCar.bumpCd <= 0 && (
          (inCar && hitWrap(car.x, GROUND_Y - 8, 34, 18, copCar.x, GROUND_Y - 8, 34, 18, WORLD))
          || (!inCar && hitWrap(player.x, GROUND_Y - 8, 16, 18, copCar.x, GROUND_Y - 8, 34, 18, WORLD))
        );
        if (caught) {
          copCar.bumpCd = 1.6;
          if (gramsOf("GREEN") > 0 || gramsOf("WHITE") > 0 || cash > 0) {
            const lostP = gramsOf("GREEN") + gramsOf("WHITE");
            const lostC = cash;
            inv = emptyInv();
            packs = 0;
            cash = 0;
            pop(player.x, 146, lostP ? "LOST BAG" : "LOST $");
            sfx.siren();
            if (lostC) burst(player.x, 178, 10, "#f0c430");
          }
          if (COMBAT && inCar) {
            car.vx += Math.sign(copCar.vx || copCar.facing) * 70;
            hurtCar(1);
          }
        }
      }
    }

    for (const foe of foes) {
      const dx = wrapDelta(foe.x, player.x, WORLD);
      const ranged = foe.kind === "runner" || foe.kind === "cop";
      const dist = Math.abs(dx);
      foe.flash = Math.max(0, foe.flash - dt);
      foe.shootCd = Math.max(0, foe.shootCd - dt);
      foe.anim += dt;

      if (foe.stun > 0) {
        foe.stun -= dt;
        foe.x = wrap(foe.x + foe.vx * dt, WORLD);
        foe.vx *= Math.exp(-5 * dt);
        foe.facing = Math.abs(foe.vx) > 0.5 ? Math.sign(foe.vx) : (dx >= 0 ? 1 : -1);
        foe.telegraph = 0;
        continue;
      }

      let spd = foe.kind === "cop" ? 28 : foe.kind === "runner" ? 30 + wave : 18 + wave;
      if (ranged && dist < 100 && dist > 36) spd *= 0.15;
      foe.vx = Math.sign(dx) * spd;
      foe.x = wrap(foe.x + foe.vx * dt, WORLD);

      const visible = inView(foe.x, view);
      if (!visible) {
        foe.telegraph = 0;
        foe.facing = Math.abs(foe.vx) > 0.5 ? Math.sign(foe.vx) : (dx >= 0 ? 1 : -1);
      } else if (foe.telegraph > 0) {
        foe.facing = dx >= 0 ? 1 : -1;
        foe.telegraph -= dt;
        if (foe.telegraph <= 0) {
          shots.push({
            x: foe.x + foe.facing * 12, y: foe.y - 18,
            vx: foe.facing * 52, vy: 0, from: "foe", life: 1.05,
          });
          foe.shootCd = foe.kind === "cop" ? 1.55 : 1.95;
          sfx.shoot();
        }
      } else if (ranged && dist < 130 && dist > 28 && foe.shootCd <= 0) {
        foe.telegraph = TELEGRAPH;
        foe.facing = dx >= 0 ? 1 : -1;
      } else {
        foe.facing = Math.abs(foe.vx) > 0.5 ? Math.sign(foe.vx) : (dx >= 0 ? 1 : -1);
      }

      if (!inCar && !(player.y < 182) && invuln <= 0 && hitWrap(player.x, player.y - 14, 10, 22, foe.x, foe.y - 14, 10, 22, WORLD)) {
        hurtPlayer();
      }

      if (inCar && Math.abs(car.vx) > 50 && hitWrap(car.x, GROUND_Y - 10, 30, 20, foe.x, foe.y - 14, 12, 24, WORLD)) {
        foe.hp -= 1;
        foe.flash = 0.12;
        foe.stun = 0.4;
        foe.vx = Math.sign(car.vx) * 150;
        booms.push({ x: foe.x, y: foe.y - 16, t: 0 });
        sfx.hit();
        if (foe.hp <= 0) killFoe(foe);
      }
    }

    if (boss) {
      const dx = wrapDelta(boss.x, player.x, WORLD);
      const dist = Math.abs(dx);
      const vx = dist > 120 ? Math.sign(dx) * 28 : dist < 80 ? -Math.sign(dx) * 24 : Math.sign(dx) * 6;
      boss.vx = vx;
      boss.x = wrap(boss.x + boss.vx * dt, WORLD);
      boss.anim += dt;
      boss.flash = Math.max(0, boss.flash - dt);
      boss.shootCd = Math.max(0, boss.shootCd - dt);

      const visible = inView(boss.x, view);
      if (!visible) {
        boss.telegraph = 0;
        boss.facing = Math.abs(boss.vx) > 0.5 ? Math.sign(boss.vx) : (dx >= 0 ? 1 : -1);
      } else if (boss.telegraph > 0) {
        boss.facing = dx >= 0 ? 1 : -1;
        boss.telegraph -= dt;
        if (boss.telegraph <= 0) {
          shots.push({
            x: boss.x + boss.facing * 24, y: boss.y - 16,
            vx: boss.facing * 48, vy: 0, from: "foe", life: 1.35,
          });
          boss.shootCd = 2.45;
          sfx.shoot();
        }
      } else if (boss.shootCd <= 0) {
        boss.telegraph = TELEGRAPH;
        boss.facing = dx >= 0 ? 1 : -1;
      } else {
        boss.facing = Math.abs(boss.vx) > 0.5 ? Math.sign(boss.vx) : (dx >= 0 ? 1 : -1);
      }

      if (!inCar && !(player.y < 190) && invuln <= 0 && hitWrap(player.x, player.y - 14, 12, 26, boss.x, boss.y - 12, 50, 18, WORLD)) {
        hurtPlayer();
      }
      if (inCar && Math.abs(car.vx) > 50 && hitWrap(car.x, GROUND_Y - 10, 30, 20, boss.x, boss.y - 12, 50, 18, WORLD)) {
        boss.hp -= 1;
        boss.flash = 0.12;
        boss.x = wrap(boss.x + Math.sign(car.vx) * 18, WORLD);
        sfx.hit();
        shake = Math.min(1, shake + 0.2);
        if (boss.hp <= 0) {
          burst(boss.x, boss.y - 18, 22, "#3de0ff");
          sfx.boom();
          cash += 200;
          pop(boss.x, boss.y - 40, "+200");
          maybeHi();
          boss = null;
          mode = "clear";
          stopMusic();
        }
      }
    }

    for (const shot of shots) {
      shot.x = wrap(shot.x + shot.vx * dt, WORLD);
      shot.y += (shot.vy || 0) * dt;
      shot.life -= dt;
      if (shot.from === "player") {
        for (const foe of foes) {
          if (hitWrap(shot.x, shot.y, 6, 4, foe.x, foe.y - 16, 14, 28, WORLD)) {
            foe.hp -= 1;
            foe.flash = 0.12;
            shot.life = 0;
            booms.push({ x: shot.x, y: shot.y, t: 0 });
            sfx.hit();
            if (foe.hp <= 0) killFoe(foe);
          }
        }
        if (shot.life > 0 && copCar && hitWrap(shot.x, shot.y, 6, 4, copCar.x, GROUND_Y - 10, 36, 20, WORLD)) {
          copCar.hp -= 1;
          shot.life = 0;
          booms.push({ x: shot.x, y: shot.y, t: 0 });
          sfx.hit();
          shake = Math.min(1, shake + 0.14);
          if (copCar.hp <= 0) {
            burst(copCar.x, GROUND_Y - 12, 16, "#3de0ff");
            sfx.boom();
            cash += 50;
            pop(copCar.x, 150, "+50");
            maybeHi();
            copCar = null;
          }
        }
        if (boss && hitWrap(shot.x, shot.y, 6, 4, boss.x, boss.y - 16, 56, 24, WORLD)) {
          boss.hp -= 1;
          boss.flash = 0.12;
          shot.life = 0;
          booms.push({ x: shot.x, y: shot.y, t: 0 });
          sfx.hit();
          shake = Math.min(1, shake + 0.16);
          if (boss.hp <= 0) {
            burst(boss.x, boss.y - 18, 22, "#3de0ff");
            sfx.boom();
            cash += 200;
            pop(boss.x, boss.y - 40, "+200");
            maybeHi();
            boss = null;
            mode = "clear";
            stopMusic();
          }
        }
      } else if (invuln <= 0 && hitWrap(shot.x, shot.y, 6, 4, player.x, player.y - 16, 12, 22, WORLD)) {
        shot.life = 0;
        hurtPlayer();
      }
    }
    shots = shots.filter((s) => s.life > 0);
    foes = foes.filter((f) => f.hp > 0);

    for (const item of loot) item.bob += dt;
    for (const item of loot) {
      if (hitWrap(player.x, player.y - 10, 16, 24, item.x, item.y - 8, 12, 14, WORLD)) {
        if (item.kind === "cash" || carrying) {
          cash += 25;
          pop(item.x, item.y - 20, "+25");
          sfx.pickup();
          item.y = -999;
          maybeHi();
        } else {
          carrying = true;
          pop(item.x, item.y - 20, "HOLD");
          sfx.pickup();
          item.y = -999;
        }
      }
    }
    loot = loot.filter((l) => l.y > 0);

    if (COMBAT && !inCar && carrying && input.shoot && hitWrap(player.x, player.y - 10, 16, 24, DUMPSTER_X, 188, 22, 28, WORLD)) {
      carrying = false;
      cash += 100;
      heat = Math.min(3, heat + 0.07);
      pop(DUMPSTER_X, 158, "DROP +100");
      sfx.drop();
      burst(DUMPSTER_X, 178, 12, "#f0c430");
      maybeHi();
    }

    for (const p of pops) {
      p.life -= dt;
      p.y -= 18 * dt;
    }
    pops = pops.filter((p) => p.life > 0);
    for (const b of bits) {
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += 180 * dt;
    }
    bits = bits.filter((b) => b.life > 0);
    for (const b of booms) b.t += dt;
    booms = booms.filter((b) => b.t < 0.28);
    shake = Math.max(0, shake - dt * 1.8);

    return snapshot();
  }

  return {
    tick,
    getState: snapshot,
    start: () => beginPlay(false),
    finishIntro,
    pause() { if (mode === "play") mode = "paused"; },
    resume() { if (mode === "paused") mode = "play"; },
    setHold(on) { frozen = !!on; },
    restart() { beginPlay(false); },
    setMuted,
    toggleMute: () => setMuted(!isMuted()),
    toTitle() { mode = "title"; ui = null; reset(false); },
    giveCash(n) { cash += n; maybeHi(); },
    setGun(name) { if (WEAPONS[name]) gun = name; },
    setCarrying(on) { carrying = !!on; },
    setHeat(h) { if (HEAT_ENABLED) heat = Math.max(0, Math.min(3, h)); },
    setPacks(n) { packs = Math.max(0, n | 0); },
    setInv(id, grams) {
      if (!PRODUCTS[id]) return;
      inv[id] = Math.max(0, Number(grams) || 0);
    },
    setStashInv(id, grams) {
      if (!PRODUCTS[id]) return;
      stashInv[id] = Math.max(0, Number(grams) || 0);
    },
    setRep(n) { rep = Math.max(0, Math.min(MAX_REP, n)); },
    setStash(n) { stash = Math.max(0, n | 0); maybeHi(); },
    setClock(t) { clock = Math.max(0, Number(t) || 0); },
    setTimeHours(h) { timeHours = wrapHour(h); },
    setOutfit() { wardrobe.hat = wardrobe.hat === "none" ? "beanie" : "none"; },
    setWardrobe(slot, id) {
      if (slot === "hat") wardrobe.hat = id === "none" ? "none" : "beanie";
    },
    acceptOrder,
    declineOrder,
    stallOrder,
    setPhoneTab,
    setBoughtOnce(on) { boughtOnce = !!on; if (on) textedPlug = true; },
    buyPack,
    buyProduct,
    stashCash,
    transfer,
    solicit,
    serve,
    textPlug,
    pingContact,
    togglePhone,
    setUi,
    openBuy,
    openStash,
    openCrib,
    enterCrib,
    leaveCrib,
    openOutfit,
    cycleOutfit,
    cycleZoom,
    nudgeZoom,
    analogZoom,
    setZoom,
    sleepCrib,
    waitCrib,
    saveCrib,
    doAction,
    doCarBtn,
    doCribBtn,
    startPullOver,
    useGate,
    doUTurn,
    addContact,
    startUTurn(dir) {
      const d = dir < 0 ? -1 : 1;
      if (d === car.facing) car.facing *= -1;
      requestTurn(d);
    },
    setTurnMid() {
      if (car.turnT <= 0) requestTurn(car.facing < 0 ? 1 : -1);
      car.turnT = CAR_TURN_TIME * 0.5;
      const u = 0.5;
      car.lat = Math.sin(u * Math.PI) * CAR_TURN_ARC;
      car.yaw = car.turnFrom + (car.turnTo - car.turnFrom) * u;
    },
    clearOrder() { order = null; },
    setPedX(i, x) {
      if (peds[i]) {
        peds[i].x = wrap(x, WORLD);
        peds[i].wait = 2;
        peds[i].vx = 0;
      }
    },
    setPedLane(i, lane) {
      if (peds[i]) peds[i].lane = Number(lane) || 0;
    },
    setPedStride(i, n) {
      if (peds[i]) peds[i].stride = Number(n) || 0;
    },
    spawnOrder,
    setInCar(on) {
      if (on && car.hp > 0) {
        enterLock = 0;
        enterCar();
      } else if (inCar) {
        // Debug/helper path: force park so leaveCar is allowed.
        car.parked = true;
        car.gear = "P";
        car.vx = 0;
        car.lat = parkLat(car.facing);
        car.pullOverT = 0;
        leaveCar();
      }
    },
    setBoardT(t) {
      boardT = Math.max(0, Number(t) || 0);
    },
    setInCrib(on) {
      if (on) enterCrib();
      else if (inCrib) leaveCrib();
    },
    setCribX(x) {
      cribX = Math.max(-3.55, Math.min(3.55, Number(x) || 0));
    },
    setGear(name) {
      const g = String(name || "").toUpperCase();
      if (GEARS.includes(g)) {
        car.gear = g;
        car.shiftHint = 0;
      }
    },
    tryShift(name, brakeHeld = true) {
      return tryShift(String(name || "").toUpperCase(), !!brakeHeld);
    },
    setPlayerX(x) {
      player.x = wrap(x, WORLD);
      player.px = player.x;
      if (inCar) {
        car.x = player.x;
        car.px = car.x;
      }
    },
    setFacing(dir) {
      const d = dir < 0 ? -1 : 1;
      if (d !== player.facing) {
        player.turnFrom = player.facing;
        player.turnT = 0.52;
      }
      player.facing = d;
      if (inCar) {
        car.facing = d;
        car.yaw = d < 0 ? Math.PI : 0;
        car.turnT = 0;
        car.lat = car.parked || car.gear === "P" ? parkLat(d) : restLat(d);
        player.turnT = 0;
      }
    },
    setAnim(t) { player.anim = t; },
    setStride(t) { player.stride = Number(t) || 0; },
    setTurnT(t, from) {
      player.turnT = Math.max(0, Number(t) || 0);
      if (from != null) player.turnFrom = from < 0 ? -1 : 1;
    },
    setCarX(x) {
      car.x = wrap(x, WORLD);
      car.px = car.x;
      if (inCar) {
        player.x = car.x;
        player.px = car.x;
      }
    },
    setCarVx(n) {
      car.vx = Number(n) || 0;
      player.vx = car.vx;
    },
    setPassLane(on) {
      car.passT = on ? 1.2 : 0;
      car.lat = restLat(on ? -car.facing : car.facing);
      if (on) car.parked = false;
    },
    setCarLat(lat) {
      car.lat = Number(lat);
      car.parked = Math.abs(car.lat - parkLat(car.facing)) < 0.7 && car.gear === "P";
    },
    setParked(on) {
      if (on) {
        car.gear = "P";
        car.vx = 0;
        car.lat = parkLat(car.facing);
        car.parked = true;
        car.pullOverT = 0;
        car.passT = 0;
      } else {
        car.parked = false;
        car.lat = restLat(car.facing);
      }
    },
    placeTrafficAhead() {
      if (!traffic.length) traffic.push(makeTrafficCar(0));
      const t = traffic[0];
      t.facing = car.facing;
      t.lat = restLat(car.facing);
      t.x = wrap(car.x + (car.facing || 1) * 36, WORLD);
      t.px = t.x;
      t.vx = 18;
      t.cruise = 18;
      car.passT = 1.2;
      car.lat = restLat(-car.facing);
      return t.x;
    },
    placeCars(list) {
      trafficLock = true;
      traffic.length = 0;
      for (const spec of list || []) {
        const facing = spec.facing < 0 ? -1 : 1;
        const x = wrap(Number(spec.x) || 0, WORLD);
        const spd = spec.vx != null ? Number(spec.vx) : facing * 48;
        traffic.push({
          x,
          px: x,
          facing,
          vx: spd,
          cruise: spec.cruise != null ? Number(spec.cruise) : spd,
          lat: spec.lat != null ? Number(spec.lat) : restLat(facing),
          passT: Number(spec.passT) || 0,
          kind: spec.kind || "beater",
          color: spec.color || "#2a3048",
          yaw: facing < 0 ? Math.PI : 0,
        });
      }
      return traffic.length;
    },
  };
}
