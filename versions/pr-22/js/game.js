import {
  WORLD, GROUND_Y, MAX_HP, CAR_HP, COP_CAR_HP, CAR_ACCEL, CAR_MAX, CAR_FRICTION,
  CAR_CREEP, CAR_TURN_TIME, CAR_TURN_MAX, CAR_TURN_ARC, CAR_STOP, GEARS,
  GRAVITY, JUMP_VEL, COYOTE, JUMP_BUFFER, BUYER_COUNT,
  MOVE_SPEED, TELEGRAPH, BOSS_CASH_BASE, BOSS_CASH_PER_WAVE, HI_KEY,
  SHOP_X, DUMPSTER_X, CAR_X, ORDER_SPOTS, WEAPONS, wrap, wrapDelta, hitWrap,
  formatDeal, dealFeet, COMBAT, START_CASH, PACK_COST, PACK_PAY,
  PLUG_X, HOME_X, PED_COUNT, LIGHT_COUNT, lightGameX, lightPhaseAt,
  PRODUCTS, HALF_OZ, SALE_AMOUNTS, FLAKE_LIMIT, CONTACT_NAMES, MORE_NAMES,
  INTRO_TEXT, SALE_POP_T, SERVE_SLOW, fmtGrams, streetGrams,
  restLat, CAR_KINDS, GREEN_TIERS, WHITE_TIERS, STALL_LINES,
  OUTFITS, START_HOUR, SEC_PER_HOUR, MAX_REP, wrapHour, fmtHour, skyTint,
} from "./config.js?v=32";
import { sfx, startMusic, stopMusic, isMuted, setMuted, unlockAudio, setEngine } from "./audio.js?v=32";

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
    x: 80, px: 80, y: GROUND_Y, vx: 0, vy: 0, facing: 1,
    hp: MAX_HP, anim: 0, flash: 0,
  };
  const car = {
    x: CAR_X, px: CAR_X, vx: 0, facing: 1, hp: CAR_HP,
    gear: "P", yaw: 0, turnT: 0, turnFrom: 0, turnTo: 0, shiftHint: 0, lat: 0,
    kind: "beater",
  };
  let inCar = false;
  let boughtOnce = false;
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
  let timeHours = START_HOUR;
  let fromCrib = false;
  let hi = loadHi();
  let wave = 1;
  let gun = "pistol";
  let heat = 0;
  let peds = [];
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
      } else if (plugMeet) {
        destSide = edgeSide(plugMeet.x, lastView);
      }
    }
    const nearCar = !inCar && car.hp > 0 && Math.abs(wrapDelta(player.x, car.x, WORLD)) < 30 && player.y >= 197.5;
    const nearPlug = Math.abs(wrapDelta(player.x, plugMeet?.x ?? PLUG_X, WORLD)) < 28;
    const nearHome = !inCar && Math.abs(wrapDelta(player.x, HOME_X, WORLD)) < 28 && player.y >= 197.5;
    const nearPed = !inCar && peds.some((p) => Math.abs(wrapDelta(player.x, p.x, WORLD)) < 18);
    const exitOk = inCar && (car.gear === "P" || Math.abs(car.vx) < CAR_STOP);
    const liveDeal = order && (order.phase === "active" || order.phase === "nudge");
    const nearDeal = !!(liveDeal && Math.abs(wrapDelta(player.x, order.x, WORLD)) < 32);
    const slowEnough = Math.abs(player.vx) < SERVE_SLOW;
    const canServe = !!(mode === "play" && !ui && nearDeal && slowEnough && ( !inCar || inCar ));
    const canBuy = !!(plugMeet && nearPlug && slowEnough);
    let prompt = "";
    let gate = "";
    if (mode === "play" && !ui) {
      if (exitOk) gate = "EXIT";
      else if (nearCar) gate = "ENTER";
      else if (nearHome) gate = "ENTER";
      else if (canBuy) gate = "BUY";
      if (canServe) prompt = "SERVE";
      else if (gate) prompt = gate;
      else if (nearPlug && !plugMeet) prompt = "TEXT PLUG";
      else if (nearPed && !nearCar && !nearHome) prompt = "HIT UP";
    }
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
      heat, muted: isMuted(), combat: COMBAT,
      player: { ...player },
      car: { ...car },
      inCar, atHome,
      order: order ? { ...order } : null,
      peds: peds.map((p) => ({ ...p })),
      lights,
      copCar: copCar ? { ...copCar } : null,
      prompt, gate, destSide, hitUp: prompt === "HIT UP",
      canServe, canBuy, nearHome, nearCar, nearPlug, nearPed, exitOk,
      showServe: canServe,
      showGate: !!(gate && mode === "play" && !ui),
      showHitUp: prompt === "HIT UP",
      turnOk: inCar && car.gear === "D" && Math.abs(car.vx) > 18 && car.turnT <= 0,
      stopped: inCar && Math.abs(car.vx) < CAR_STOP,
      boughtOnce,
      unread: inbox.some((m) => m.unread) || !!(order && (order.phase === "offer" || order.phase === "stalling")),
      inbox: inbox.map((m) => ({ ...m })),
      phoneTab,
      greenTiers: GREEN_TIERS,
      whiteTiers: WHITE_TIERS,
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
      outfit,
      outfits: OUTFITS.map((o) => ({ id: o.id, label: o.label })),
      sky: skyTint(hour),
      foes: foes.map((f) => ({ ...f })),
      shots: shots.map((s) => ({ ...s })),
      loot: loot.map((l) => ({ ...l })),
      pops: pops.map((p) => ({ ...p })),
      bits: bits.map((b) => ({ ...b })),
      booms: booms.map((b) => ({ ...b })),
      boss: boss ? { ...boss } : null,
      shake, muzzle, invuln,
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
    car.lat = restLat(1);
    car.turnLatFrom = 0;
    car.turnLatTo = 0;
    inCar = false;
    wreckT = 0;
    copCar = null;
  }

  function enterCar() {
    inCar = true;
    car.gear = "P";
    car.vx = 0;
    car.shiftHint = 0;
    car.turnT = 0;
    car.yaw = car.facing < 0 ? Math.PI : 0;
    car.lat = restLat(car.facing);
    player.x = car.x;
    player.y = GROUND_Y;
    player.vy = 0;
    player.vx = 0;
    player.facing = car.facing;
  }

  function leaveCar() {
    inCar = false;
    player.x = car.x;
    player.vx = 0;
    player.y = GROUND_Y;
    player.vy = 0;
    player.facing = car.facing;
  }

  function tryShift(to, brakeHeld) {
    if (!to || !GEARS.includes(to) || to === car.gear) return false;
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
    return true;
  }

  function requestTurn(dir) {
    if (!dir || car.turnT > 0) return false;
    if (dir === car.facing) return false;
    if (Math.abs(car.vx) > CAR_TURN_MAX) return false;
    car.turnT = CAR_TURN_TIME;
    car.turnFrom = car.facing < 0 ? Math.PI : 0;
    car.turnTo = dir < 0 ? Math.PI : 0;
    car.turnLatFrom = restLat(car.facing);
    car.turnLatTo = restLat(dir);
    car.facing = dir;
    return true;
  }

  function doUTurn() {
    if (!inCar || car.turnT > 0) return false;
    if (car.gear !== "D" || Math.abs(car.vx) <= 18) return false;
    if (Math.abs(car.vx) > CAR_TURN_MAX) {
      pop(car.x, 150, "SLOW");
      return false;
    }
    return requestTurn(-car.facing);
  }

  function spawnPeds() {
    peds = [];
    for (let i = 0; i < PED_COUNT; i++) {
      peds.push({
        x: wrap((WORLD / PED_COUNT) * i + Math.random() * 90, WORLD),
        facing: i % 2 === 0 ? 1 : -1,
        look: i % BUYER_COUNT,
        anim: Math.random(),
        wait: Math.random() < 0.3 ? 0.8 + Math.random() * 2 : 0,
        speed: 9 + Math.random() * 8,
        hitCd: 0,
      });
    }
  }

  function nextOrderWait() {
    return Math.max(5, 18 - rep * 1.3) + Math.random() * 5;
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

  function addContact(name, look) {
    const n = name || pickNewName();
    if (!n) return null;
    usedNames.add(n);
    const c = {
      id: "c" + Date.now().toString(36) + Math.floor(Math.random() * 99),
      name: n,
      kind: "customer",
      status: "idle",
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
      pop(plugMeet.x, 154, "NEED R" + tier.minRep);
      return false;
    }
    if (cash < tier.cost) {
      pop(plugMeet.x, 154, "NEED $");
      return false;
    }
    cash -= tier.cost;
    inv[id] = gramsOf(id) + tier.grams;
    packs = Math.round((gramsOf("GREEN") + gramsOf("WHITE")) / HALF_OZ);
    boughtOnce = true;
    sfx.buy();
    pop(plugMeet.x, 150, "+" + tier.grams + "g " + id);
    maybeHi();
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
    const nearDeal = Math.abs(wrapDelta(player.x, order.x, WORLD)) < 32;
    const slow = Math.abs(player.vx) < SERVE_SLOW;
    if (!nearDeal || !slow) return false;
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
    heat = Math.min(3, heat + 0.18);
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
    heat = Math.min(3, heat + 0.12);
    if (Math.random() < 0.55) {
      const c = addContact(null, ped.look);
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

  function openCrib() {
    ui = "crib";
    fromCrib = false;
    return true;
  }

  function cycleOutfit() {
    outfit = (outfit + 1) % OUTFITS.length;
    pop(HOME_X, 150, OUTFITS[outfit].label);
    sfx.pickup();
    return true;
  }

  function sleepCrib() {
    timeHours = wrapHour(timeHours + 7);
    player.hp = MAX_HP;
    invuln = 0.35;
    pop(HOME_X, 150, "ZZZ " + fmtHour(timeHours));
    sfx.drop();
    return true;
  }

  function waitCrib() {
    timeHours = wrapHour(timeHours + 1);
    pop(HOME_X, 150, "WAIT " + fmtHour(timeHours));
    sfx.ping();
    return true;
  }

  function useGate() {
    const nearCarNow = !inCar && car.hp > 0 && Math.abs(wrapDelta(player.x, car.x, WORLD)) < 30 && onGround();
    const nearHomeNow = !inCar && Math.abs(wrapDelta(player.x, HOME_X, WORLD)) < 28 && onGround();
    const nearPlugNow = Math.abs(wrapDelta(player.x, plugMeet?.x ?? PLUG_X, WORLD)) < 28;
    if (inCar) {
      if (car.gear === "P" || Math.abs(car.vx) < CAR_STOP) {
        leaveCar();
        return true;
      }
      pop(car.x, 150, "PARK");
      return false;
    }
    if (nearCarNow) {
      enterCar();
      return true;
    }
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
    player.x = 80;
    player.px = 80;
    player.y = GROUND_Y;
    player.vx = 0;
    player.vy = 0;
    player.facing = 1;
    player.hp = MAX_HP;
    player.anim = 0;
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
      inbox = [];
      phoneTab = "texts";
      outfit = 0;
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
    if (!boughtOnce && !opts.force) {
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
    const idle = contacts.filter((c) => c.kind === "customer" && c.status === "idle");
    const who = opts.contactId
      ? findContact(opts.contactId)
      : idle[Math.floor(Math.random() * idle.length)];
    if (!who && !opts.force) {
      orderCd = 6;
      return null;
    }
    const product = opts.product || (Math.random() < 0.7 ? "GREEN" : "WHITE");
    const dollars = opts.dollars || SALE_AMOUNTS[Math.floor(Math.random() * SALE_AMOUNTS.length)];
    const grams = opts.grams ?? streetGrams(product, dollars);
    const dist = Math.abs(wrapDelta(player.x, spot.x, WORLD));
    const line = ORDER_LINES[Math.floor(Math.random() * ORDER_LINES.length)];
    const timer = opts.t ?? Math.max(11, Math.min(22, dist / 95));
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
    mode = keepWave ? "play" : "intro";
    if (keepWave) ui = null;
    sfx.start();
    startMusic();
  }

  function finishIntro() {
    if (mode !== "intro") return;
    mode = "play";
    ui = "phone";
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
    if (input.pause) {
      if (mode === "play") mode = "paused";
      else if (mode === "paused") mode = "play";
    }

    if (mode === "paused") {
      setEngine("off");
      return snapshot();
    }
    timeHours += dt / SEC_PER_HOUR;

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

    if (input.phone) togglePhone();
    if (input.phoneClose) ui = null;
    if (input.textPlug) textPlug();
    if (input.buyGreen) buyProduct("GREEN");
    if (input.buyWhite) buyProduct("WHITE");
    if (input.buyClose) ui = null;
    if (input.cribClose) { ui = null; fromCrib = false; }
    if (input.cribClothes) cycleOutfit();
    if (input.cribSleep) sleepCrib();
    if (input.cribWait) waitCrib();
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

    if (ui) {
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
    if (inCar) {
      const want = input.gearTap || input.shiftGear;
      if (want) tryShift(want, !!input.brake);
      if (input.shiftStep) {
        const i = GEARS.indexOf(car.gear);
        const next = GEARS[i + input.shiftStep];
        if (next) tryShift(next, !!input.brake);
      }
      if (input.uturn) doUTurn();
      if (input.gate || input.exit) useGate();
    } else if (input.gate) {
      useGate();
    }
    if (input.serve) serve();
    if (input.hitup && !inCar) solicit();
    if (input.accept) acceptOrder();
    if (input.decline) declineOrder();

    if (inCar) {
      car.shiftHint = Math.max(0, car.shiftHint - dt);
      if (car.turnT > 0) {
        car.turnT = Math.max(0, car.turnT - dt);
        const u = 1 - car.turnT / CAR_TURN_TIME;
        const s = u * u * (3 - 2 * u);
        car.yaw = car.turnFrom + (car.turnTo - car.turnFrom) * s;
        const fromLat = car.turnLatFrom ?? restLat(car.turnFrom < Math.PI / 2 ? 1 : -1);
        const toLat = car.turnLatTo ?? restLat(car.facing);
        car.lat = fromLat + (toLat - fromLat) * s + Math.sin(u * Math.PI) * (CAR_TURN_ARC * 0.35);
        const oldDir = car.turnFrom < Math.PI / 2 ? 1 : -1;
        const along = (1 - u) * oldDir + u * car.facing;
        car.x = wrap(car.x + along * 22 * dt, WORLD);
        car.vx *= Math.exp(-3.2 * dt);
      } else {
        car.yaw = car.facing < 0 ? Math.PI : 0;
        car.lat = restLat(car.facing);
      }

      const brake = !!input.brake;
      const gas = !!input.gas;
      const spec = CAR_KINDS[car.kind] || CAR_KINDS.beater;
      const accel = spec.accel || CAR_ACCEL;
      const vmax = spec.max || CAR_MAX;
      const creep = spec.creep || CAR_CREEP;
      if (car.gear === "P") {
        car.vx = 0;
      } else if (brake) {
        if (Math.abs(car.vx) > 6) {
          car.vx -= Math.sign(car.vx) * accel * 1.7 * dt;
          if (Math.abs(car.vx) < 6) car.vx = 0;
        } else {
          car.vx = 0;
        }
      } else if (car.gear === "N") {
        car.vx -= car.vx * Math.min(1, CAR_FRICTION * dt);
      } else {
        const driveDir = car.gear === "D" ? car.facing : -car.facing;
        if (gas) {
          car.vx += driveDir * accel * dt;
        } else {
          const target = driveDir * creep;
          const diff = target - car.vx;
          car.vx += Math.sign(diff) * Math.min(Math.abs(diff), accel * 0.55 * dt);
        }
        car.vx -= car.vx * Math.min(1, CAR_FRICTION * 0.22 * dt);
      }
      if (Math.abs(car.vx) > vmax) car.vx = Math.sign(car.vx) * vmax;
      if (gas && car.gear === "P") setEngine("rev");
      else if (gas && (car.gear === "D" || car.gear === "R")) setEngine("accel", Math.abs(car.vx) / vmax);
      else setEngine("off");
      car.x = wrap(car.x + car.vx * dt, WORLD);
      player.x = car.x;
      player.vx = car.vx;
      player.facing = car.facing;
      player.y = GROUND_Y;
      player.vy = 0;
      player.anim += dt;
      setEngine("off");
    } else {
      setEngine("off");
      if (input.moveX < 0) player.facing = -1;
      if (input.moveX > 0) player.facing = 1;
      player.vx = input.moveX * MOVE_SPEED;
      player.x = wrap(player.x + player.vx * dt, WORLD);

      coyote = onGround() ? COYOTE : Math.max(0, coyote - dt);
      jumpBuf = usedJump ? 0 : (input.jump ? JUMP_BUFFER : Math.max(0, jumpBuf - dt));
      if (!usedJump && jumpBuf > 0 && coyote > 0) {
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
    atHome = !inCar && Math.abs(wrapDelta(player.x, HOME_X, WORLD)) < 28;
    heat = Math.max(0, heat - dt * (atHome ? 0.2 : 0.04));
    needPackT = Math.max(0, needPackT - dt);
    if (salePop) {
      salePop.life -= dt;
      if (salePop.life <= 0) salePop = null;
    }
    if (plugMeet) {
      plugMeet.t -= dt;
      if (plugMeet.t <= 0) {
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
      if (heat >= 1.25 && copCd <= 0 && foes.filter((f) => f.kind === "cop").length < (heat >= 2 ? 2 : 1)) {
        spawnFoe("cop");
        copCd = 7.5;
        sfx.siren();
        pop(player.x, 150, "HEAT");
      }
    }

    for (const ped of peds) {
      ped.hitCd = Math.max(0, ped.hitCd - dt);
      ped.anim += dt;
      if (ped.wait > 0) {
        ped.wait -= dt;
        ped.vx = 0;
      } else {
        if (Math.random() < 0.0035) ped.wait = 0.7 + Math.random() * 2.4;
        ped.vx = ped.facing * ped.speed;
        ped.x = wrap(ped.x + ped.vx * dt, WORLD);
      }
    }

    if (inCar && Math.abs(car.vx) > 22) {
      for (let i = 0; i < LIGHT_COUNT; i++) {
        if (lightPhaseAt(clock, i) !== "red") continue;
        const d = Math.abs(wrapDelta(car.x, lightGameX(i), WORLD));
        if (d >= 16) continue;
        const key = i + ":" + Math.floor((clock + i * 3.7) / 16);
        if (ranReds.has(key)) continue;
        ranReds.add(key);
        heat = Math.min(3, heat + 0.55);
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
        order.t -= dt;
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

    if (heat >= 1.6 && !copCar) {
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
      if (heat < 1.15) {
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
    restart() { beginPlay(false); },
    toTitle() { mode = "title"; ui = null; reset(false); },
    giveCash(n) { cash += n; maybeHi(); },
    setGun(name) { if (WEAPONS[name]) gun = name; },
    setCarrying(on) { carrying = !!on; },
    setHeat(h) { heat = Math.max(0, Math.min(3, h)); },
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
    setOutfit(i) {
      const n = OUTFITS.length;
      outfit = ((Number(i) || 0) % n + n) % n;
    },
    acceptOrder,
    declineOrder,
    stallOrder,
    setPhoneTab,
    setBoughtOnce(on) { boughtOnce = !!on; },
    buyPack,
    buyProduct,
    stashCash,
    transfer,
    solicit,
    serve,
    textPlug,
    togglePhone,
    setUi,
    openBuy,
    openStash,
    openCrib,
    cycleOutfit,
    sleepCrib,
    waitCrib,
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
    spawnOrder,
    setInCar(on) {
      if (on && car.hp > 0) enterCar();
      else if (inCar) leaveCar();
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
      player.facing = d;
      if (inCar) {
        car.facing = d;
        car.yaw = d < 0 ? Math.PI : 0;
        car.turnT = 0;
        car.lat = restLat(d);
      }
    },
    setAnim(t) { player.anim = t; },
  };
}
