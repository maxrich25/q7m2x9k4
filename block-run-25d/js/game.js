import {
  WORLD, GROUND_Y, MAX_HP, CAR_HP, COP_CAR_HP, CAR_ACCEL, CAR_MAX, CAR_FRICTION,
  GRAVITY, JUMP_VEL, COYOTE, JUMP_BUFFER, BUYER_COUNT,
  MOVE_SPEED, TELEGRAPH, BOSS_CASH_BASE, BOSS_CASH_PER_WAVE, HI_KEY,
  SHOP_X, DUMPSTER_X, CAR_X, ORDER_SPOTS, WEAPONS, wrap, wrapDelta, hitWrap,
  formatDeal, dealFeet,
} from "./config.js?v=18";
import { sfx, startMusic, stopMusic, isMuted, setMuted, unlockAudio } from "./audio.js?v=18";

function loadHi() {
  try { return Number(localStorage.getItem(HI_KEY) || "0") || 0; } catch { return 0; }
}

function saveHi(value) {
  try { localStorage.setItem(HI_KEY, String(value)); } catch {}
}

const ORDER_LINES = [
  (n, spot) => `yo need ${n} pack${n > 1 ? "s" : ""}, by ${spot}`,
  (n, spot) => `u up? ${n} by ${spot} rn`,
  (n, spot) => `bring ${n} to ${spot}`,
];

export function createGame() {
  let mode = "title";
  const player = {
    x: 80, px: 80, y: GROUND_Y, vx: 0, vy: 0, facing: 1,
    hp: MAX_HP, anim: 0, flash: 0,
  };
  const car = { x: CAR_X, px: CAR_X, vx: 0, facing: 1, hp: CAR_HP };
  let inCar = false;
  let wreckT = 0;
  let order = null;
  let orderCd = 6;
  let needPackT = 0;
  let copCar = null;
  let invuln = 0;
  let shootCd = 0;
  let carrying = false;
  let cash = 0;
  let hi = loadHi();
  let wave = 1;
  let gun = "pistol";
  let heat = 0;
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
      if (order) destSide = edgeSide(order.x, lastView);
    }
    const nearCar = !inCar && car.hp > 0 && Math.abs(wrapDelta(player.x, car.x, WORLD)) < 30 && player.y >= 197.5;
    const slowCar = Math.abs(car.vx) < 36;
    let prompt = "";
    if (mode === "play") {
      if (inCar && slowCar) prompt = "EXIT";
      else if (nearCar) prompt = "ENTER";
      else if (order && needPackT > 0) prompt = "NEED PACK";
    }
    const dealD = order ? wrapDelta(player.x, order.x, WORLD) : 0;
    return {
      mode, cash, hi, hp: player.hp, carrying, wave, gun,
      heat, muted: isMuted(),
      player: { ...player },
      car: { ...car },
      inCar,
      order: order ? { ...order } : null,
      copCar: copCar ? { ...copCar } : null,
      prompt, destSide,
      dealM: order ? Math.round(dealFeet(player.x, order.x)) : 0,
      dealLabel: order ? formatDeal(player.x, order.x) : "",
      dealDir: order ? (dealD >= 0 ? 1 : -1) : 0,
      dealMe: player.x / WORLD,
      dealAt: order ? order.x / WORLD : 0,
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
    if (cash > hi) {
      hi = cash;
      saveHi(hi);
    }
  }

  function resetCar() {
    car.x = CAR_X;
    car.px = CAR_X;
    car.vx = 0;
    car.facing = 1;
    car.hp = CAR_HP;
    inCar = false;
    wreckT = 0;
    copCar = null;
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
    if (!keepWave) {
      gun = "pistol";
      cash = 0;
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
    orderCd = 6;
    needPackT = 0;
    resetCar();
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
    let spot = ORDER_SPOTS.find((s) => s.id === spotId);
    if (!spot) {
      const minFar = WORLD * 0.28;
      const far = ORDER_SPOTS.filter((s) => Math.abs(wrapDelta(player.x, s.x, WORLD)) > minFar);
      const pool = far.length ? far : ORDER_SPOTS;
      pool.sort((a, b) => Math.abs(wrapDelta(player.x, b.x, WORLD)) - Math.abs(wrapDelta(player.x, a.x, WORLD)));
      spot = pool[Math.floor(Math.random() * Math.min(3, pool.length))];
    }
    const packs = opts.packs ?? (Math.random() < 0.42 ? 2 : 1);
    const dist = Math.abs(wrapDelta(player.x, spot.x, WORLD));
    const line = ORDER_LINES[Math.floor(Math.random() * ORDER_LINES.length)];
    const timer = opts.t ?? Math.max(10, Math.min(22, dist / 95));
    order = {
      id: spot.id,
      x: spot.x,
      label: spot.label,
      packs,
      t: timer,
      maxT: timer,
      dist,
      look: ((opts.look ?? Math.floor(Math.random() * BUYER_COUNT)) % BUYER_COUNT + BUYER_COUNT) % BUYER_COUNT,
      text: opts.text || line(packs, spot.label),
    };
    orderCd = 18 + Math.random() * 8;
    sfx.ping();
    return order;
  }

  function completeOrder() {
    if (!order) return;
    const pay = Math.round(160 + order.dist * 0.55 + (order.packs - 1) * 40);
    carrying = false;
    cash += pay;
    heat = Math.min(3, heat + 0.4);
    pop(order.x, 150, "SOLD +" + pay);
    sfx.drop();
    burst(order.x, 178, 14, "#f0c430");
    maybeHi();
    order = null;
    orderCd = 12 + Math.random() * 10;
    needPackT = 0;
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
        inCar = false;
        player.x = car.x;
        player.y = GROUND_Y;
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
    mode = "play";
    sfx.start();
    startMusic();
  }

  function tick(dt, input, view) {
    if (view) lastView = view;
    if (hitstop > 0) {
      hitstop -= 1;
      return snapshot();
    }

    if (input.mute) setMuted(!isMuted());
    if (input.pause) {
      if (mode === "play") mode = "paused";
      else if (mode === "paused") mode = "play";
    }

    if (mode === "paused") return snapshot();

    if (mode === "title") {
      if (input.start || input.shoot || input.jump) beginPlay(false);
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

    const nearCar = !inCar && car.hp > 0 && Math.abs(wrapDelta(player.x, car.x, WORLD)) < 30 && onGround();
    let usedJump = false;
    if (inCar) {
      if (input.jump && Math.abs(car.vx) < 36) {
        inCar = false;
        player.x = car.x;
        player.vx = 0;
        player.y = GROUND_Y;
        player.vy = 0;
        usedJump = true;
        jumpBuf = 0;
      } else if (input.jump && Math.abs(car.vx) >= 36) {
        car.facing *= -1;
        car.vx = car.facing * Math.abs(car.vx);
        usedJump = true;
        jumpBuf = 0;
      }
    } else if (nearCar && input.jump) {
      inCar = true;
      player.y = GROUND_Y;
      player.vy = 0;
      player.x = car.x;
      usedJump = true;
      jumpBuf = 0;
      coyote = 0;
    }

    if (inCar) {
      const gas = input.moveX > 0;
      const brake = input.moveX < 0;
      if (gas) car.vx += car.facing * CAR_ACCEL * dt;
      if (brake) {
        if (Math.abs(car.vx) > 14) car.vx -= Math.sign(car.vx) * CAR_ACCEL * 1.45 * dt;
        else car.vx += -car.facing * CAR_ACCEL * 0.9 * dt;
      }
      car.vx -= car.vx * Math.min(1, CAR_FRICTION * dt);
      if (Math.abs(car.vx) > CAR_MAX) car.vx = Math.sign(car.vx) * CAR_MAX;
      car.x = wrap(car.x + car.vx * dt, WORLD);
      player.x = car.x;
      player.vx = car.vx;
      player.facing = car.facing;
      player.y = GROUND_Y;
      player.vy = 0;
      player.anim += dt;
    } else {
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
        pop(car.x, 150, "CAR");
      }
    }

    const atShop = !inCar && hitWrap(player.x, player.y - 10, 16, 24, SHOP_X, 188, 22, 28, WORLD);
    if (inCar && input.shootHeld) {
      fire();
    } else if (!inCar && input.shootHeld && atShop) {
      if (input.shoot) buyGun();
    } else if (!inCar && input.shootHeld) {
      fire();
    }

    shootCd = Math.max(0, shootCd - dt);
    muzzle = Math.max(0, muzzle - dt);
    invuln = Math.max(0, invuln - dt);
    player.flash = Math.max(0, player.flash - dt);
    clock += dt;
    heat = Math.max(0, heat - dt * 0.055);
    needPackT = Math.max(0, needPackT - dt);

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

    orderCd -= dt;
    if (!order && orderCd <= 0) spawnOrder();
    if (order) {
      order.t -= dt;
      if (order.t <= 0) {
        pop(player.x, 152, "LATE");
        order = null;
        orderCd = 10 + Math.random() * 8;
      } else {
        const nearDeal = Math.abs(wrapDelta(player.x, order.x, WORLD)) < 28;
        const slow = Math.abs(player.vx) < 42;
        if (nearDeal && slow) {
          if (carrying) completeOrder();
          else if (needPackT <= 0) {
            needPackT = 1.2;
            pop(order.x, 154, "NEED PACK");
          }
        }
      }
    }

    if (heat >= 2 && !copCar) {
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
        if (inCar && copCar.bumpCd <= 0 && hitWrap(car.x, GROUND_Y - 8, 34, 18, copCar.x, GROUND_Y - 8, 34, 18, WORLD)) {
          copCar.bumpCd = 0.85;
          car.vx += Math.sign(copCar.vx || copCar.facing) * 70;
          hurtCar(1);
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

    if (!inCar && carrying && input.shoot && hitWrap(player.x, player.y - 10, 16, 24, DUMPSTER_X, 188, 22, 28, WORLD)) {
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
    pause() { if (mode === "play") mode = "paused"; },
    resume() { if (mode === "paused") mode = "play"; },
    restart() { beginPlay(false); },
    toTitle() { mode = "title"; reset(false); },
    giveCash(n) { cash += n; maybeHi(); },
    setGun(name) { if (WEAPONS[name]) gun = name; },
    setCarrying(on) { carrying = !!on; },
    setHeat(h) { heat = Math.max(0, Math.min(3, h)); },
    spawnOrder,
    setInCar(on) {
      inCar = !!on && car.hp > 0;
      if (inCar) {
        player.x = car.x;
        player.y = GROUND_Y;
        player.vy = 0;
        player.vx = car.vx;
      }
    },
    setPlayerX(x) {
      player.x = wrap(x, WORLD);
      player.px = player.x;
      if (inCar) {
        car.x = player.x;
        car.px = car.x;
      }
    },
    setFacing(dir) { player.facing = dir < 0 ? -1 : 1; },
    setAnim(t) { player.anim = t; },
  };
}
