import {
  WORLD, GROUND_Y, MAX_HP, GRAVITY, JUMP_VEL, COYOTE, JUMP_BUFFER,
  MOVE_SPEED, TELEGRAPH, BOSS_CASH_BASE, BOSS_CASH_PER_WAVE, HI_KEY,
  SHOP_X, DUMPSTER_X, WEAPONS, wrap, wrapDelta, hitWrap,
} from "./config.js?v=2";
import { sfx, startMusic, stopMusic, isMuted, setMuted, unlockAudio } from "./audio.js?v=2";

function loadHi() {
  try { return Number(localStorage.getItem(HI_KEY) || "0") || 0; } catch { return 0; }
}

function saveHi(value) {
  try { localStorage.setItem(HI_KEY, String(value)); } catch {}
}

export function createGame() {
  let mode = "title";
  const player = {
    x: 80, y: GROUND_Y, vx: 0, vy: 0, facing: 1,
    hp: MAX_HP, anim: 0, flash: 0,
  };
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
    }
    return {
      mode, cash, hi, hp: player.hp, carrying, wave, gun,
      heat, muted: isMuted(),
      player: { ...player },
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

  function reset(keepWave) {
    player.x = 80;
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

  function hurtPlayer() {
    if (invuln > 0 || mode !== "play") return;
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
    const y = player.y - 18;
    const dir = player.facing;
    for (let i = 0; i < w.pellets; i++) {
      const spread = w.pellets === 1 ? 0 : (i - (w.pellets - 1) / 2) * w.spread;
      shots.push({
        x: player.x + dir * 14,
        y,
        vx: dir * w.speed + spread * 0.4,
        vy: w.pellets > 1 ? (i - (w.pellets - 1) / 2) * 48 : 0,
        from: "player",
        life: 0.65,
      });
    }
    sfx.shoot();
    burst(player.x + dir * 14, y, 3, "#3de0ff");
    heat = Math.min(3, heat + 0.012);
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

    if (input.moveX < 0) player.facing = -1;
    if (input.moveX > 0) player.facing = 1;
    player.vx = input.moveX * MOVE_SPEED;
    player.x = wrap(player.x + player.vx * dt, WORLD);

    coyote = onGround() ? COYOTE : Math.max(0, coyote - dt);
    jumpBuf = input.jump ? JUMP_BUFFER : Math.max(0, jumpBuf - dt);
    if (jumpBuf > 0 && coyote > 0) {
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

    const atShop = hitWrap(player.x, player.y - 10, 16, 24, SHOP_X, 188, 22, 28, WORLD);
    if (input.shootHeld && atShop) {
      if (input.shoot) buyGun();
    } else if (input.shootHeld) {
      fire();
    }

    shootCd = Math.max(0, shootCd - dt);
    muzzle = Math.max(0, muzzle - dt);
    invuln = Math.max(0, invuln - dt);
    player.flash = Math.max(0, player.flash - dt);
    clock += dt;
    heat = Math.max(0, heat - dt * 0.055);

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

    for (const foe of foes) {
      const dx = wrapDelta(foe.x, player.x, WORLD);
      const ranged = foe.kind === "runner" || foe.kind === "cop";
      const dist = Math.abs(dx);
      let spd = foe.kind === "cop" ? 28 : foe.kind === "runner" ? 30 + wave : 18 + wave;
      if (ranged && dist < 100 && dist > 36) spd *= 0.15;
      foe.vx = Math.sign(dx) * spd;
      foe.x = wrap(foe.x + foe.vx * dt, WORLD);
      foe.anim += dt;
      foe.flash = Math.max(0, foe.flash - dt);
      foe.shootCd = Math.max(0, foe.shootCd - dt);

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

      if (!(player.y < 182) && invuln <= 0 && hitWrap(player.x, player.y - 14, 10, 22, foe.x, foe.y - 14, 10, 22, WORLD)) {
        hurtPlayer();
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

      if (!(player.y < 190) && invuln <= 0 && hitWrap(player.x, player.y - 14, 12, 26, boss.x, boss.y - 12, 50, 18, WORLD)) {
        hurtPlayer();
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

    if (carrying && input.shoot && hitWrap(player.x, player.y - 10, 16, 24, DUMPSTER_X, 188, 22, 28, WORLD)) {
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
    giveCash(n) { cash += n; maybeHi(); },
    setGun(name) { if (WEAPONS[name]) gun = name; },
  };
}
