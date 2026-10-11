import {
  WORLD, GROUND_Y, wrap, wrapDelta, HOME_X, PLUG_X,
  CAR_LANE_NEAR, CAR_LANE_FAR,
} from "../../block-run-25d/js/config.js?v=54";
import { frameAt } from "../../block-run-25d/js/paint.js?v=54";

const STREET_CROP = 168;
const STREET_W = 398;

export function createWorld(canvas, art) {
  let VW = 256;
  let VH = 224;
  let ground = 198;
  const buf = document.createElement("canvas");
  buf.width = VW;
  buf.height = VH;
  const g = buf.getContext("2d");
  const out = canvas.getContext("2d");
  let camX = 80;
  let lookFace = 1;
  let dest = { x: 0, y: 0, w: VW, h: VH };

  function resize() {
    const parent = canvas.parentElement;
    const w = Math.max(1, parent.clientWidth);
    const h = Math.max(1, parent.clientHeight);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    VW = 256;
    VH = 224;
    ground = VH - 36;
    buf.width = VW;
    buf.height = VH;
    const portrait = h > w * 1.15;
    const padReserve = portrait ? 214 : 8;
    const padTop = Math.max(140, (h - padReserve) * dpr);
    if (portrait) {
      const cropTop = 72;
      const viewH = VH - cropTop;
      const scale = padTop / viewH;
      dest = {
        x: Math.round((canvas.width - VW * scale) / 2),
        y: Math.round(-cropTop * scale),
        w: Math.round(VW * scale),
        h: Math.round(VH * scale),
        cssW: w,
        cssH: h,
        cssX: (w - VW * (scale / dpr)) / 2,
        cssY: -cropTop * (scale / dpr),
        cssScale: scale / dpr,
        scale: scale / dpr,
      };
    } else {
      const scale = canvas.width / VW;
      const y = Math.max(0, Math.round((canvas.height - VH * scale) / 2));
      dest = {
        x: 0,
        y,
        w: canvas.width,
        h: Math.round(VH * scale),
        cssW: w,
        cssH: h,
        cssX: 0,
        cssY: y / dpr,
        cssScale: scale / dpr,
        scale: scale / dpr,
      };
    }
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement);
  window.addEventListener("orientationchange", () => setTimeout(resize, 80));
  window.visualViewport?.addEventListener("resize", resize);

  function sx(gameX) {
    return wrapDelta(camX, gameX, WORLD) + VW / 2;
  }

  function sy(gameY) {
    return ground - (GROUND_Y - gameY);
  }

  function drawImg(img, x, y, facing = 1, w, h) {
    if (!img) return;
    const src = facing < 0 && img.flipped ? img.flipped : img;
    if (!src) return;
    const iw = w || src.width || src.naturalWidth || 32;
    const ih = h || src.height || src.naturalHeight || 40;
    try {
      g.drawImage(src, Math.round(x - iw / 2), Math.round(y - ih), iw, ih);
    } catch {}
  }

  function drawWrapped(drawAt) {
    drawAt(0);
    drawAt(WORLD);
    drawAt(-WORLD);
  }

  function text(str, x, y, color, align = "center") {
    g.font = "8px 'Press Start 2P', monospace";
    g.fillStyle = color;
    g.textAlign = align;
    g.textBaseline = "top";
    g.fillText(str, Math.round(x), Math.round(y));
  }

  function drawSky(sky) {
    const night = (sky?.star ?? 1) > 0.35;
    g.fillStyle = night ? "#0a0120" : (sky?.cssTop || "#4a90d0");
    g.fillRect(0, 0, VW, VH);
    const starA = sky?.star ?? 1;
    if (starA > 0.08) {
      g.fillStyle = "#e8e0d0";
      for (let i = 0; i < 22; i++) {
        const x = (i * 47 + 11) % VW;
        const y = 8 + ((i * 17) % 40);
        g.fillRect(x, y, 1, 1);
      }
    }
  }

  function backdropDest() {
    const destH = Math.max(168, Math.min(ground + 14, 204));
    const destY = ground - 26 - destH;
    return { destH, destY };
  }

  function bannerSafeY() {
    const cssH = Math.max(1, dest.cssH || 1);
    const bannerBottom = Math.round(148 * (VH / cssH));
    const { destH, destY } = backdropDest();
    const skylineTop = destY + destH * (50 / 168);
    return Math.min(bannerBottom + 16, Math.round(skylineTop - 20));
  }

  function drawSun(sky) {
    const sun = sky?.sun ?? 0;
    if (sun <= 0.12) return;
    const y = bannerSafeY();
    const x = VW - 22;
    const drop = Math.round((1 - sun) * 14);
    const cy = y + drop;
    const r = 8;
    g.fillStyle = "#ffe46a";
    g.fillRect(x - r + 1, cy - r + 1, r * 2 - 2, r * 2 - 2);
    g.fillStyle = "#fff6b0";
    g.fillRect(x - 3, cy - 3, 4, 4);
  }

  function drawMoon(sky) {
    const moon = sky?.moon ?? 0;
    if (moon <= 0.12) return;
    const y = bannerSafeY();
    const x = 22;
    const drop = Math.round((1 - moon) * 10);
    const cy = y + drop;
    g.fillStyle = "#e8e0d0";
    g.fillRect(x - 3, cy - 6, 6, 1);
    g.fillRect(x - 5, cy - 5, 10, 2);
    g.fillRect(x - 6, cy - 3, 12, 6);
    g.fillRect(x - 5, cy + 3, 10, 2);
    g.fillRect(x - 3, cy + 5, 6, 1);
    g.fillStyle = "#f4f0e8";
    g.fillRect(x - 3, cy - 3, 6, 6);
    g.fillStyle = "#b8b0a0";
    g.fillRect(x - 1, cy - 1, 2, 2);
    g.fillRect(x + 2, cy + 1, 2, 2);
  }

  const streetLayer = document.createElement("canvas");
  const sl = streetLayer.getContext("2d");

  function drawBackdrop(cam, sky) {
    const street = art.street;
    if (!street || !(street.naturalWidth || street.width)) return;
    const sw = street.naturalWidth || street.width || STREET_W;
    const sh = Math.min(STREET_CROP, street.naturalHeight || street.height || STREET_CROP);
    const { destH, destY } = backdropDest();
    const shift = wrap(cam, sw);
    if (streetLayer.width !== VW || streetLayer.height !== VH) {
      streetLayer.width = VW;
      streetLayer.height = VH;
    }
    sl.clearRect(0, 0, VW, VH);
    sl.imageSmoothingEnabled = false;
    for (let x = -shift; x < VW + sw; x += sw) {
      sl.drawImage(street, 0, 0, sw, sh, Math.round(x), destY, sw, destH);
    }
    g.drawImage(streetLayer, 0, 0);
  }

  function drawStreet(cam) {
    const walk = ground - 22;
    g.fillStyle = "#c4b49a";
    g.fillRect(0, walk, VW, 22);
    g.fillStyle = "#a89880";
    for (let x = -((cam | 0) % 18); x < VW; x += 18) g.fillRect(x, walk, 1, 22);
    g.fillStyle = "#d8c8b0";
    g.fillRect(0, walk, VW, 3);
    g.fillStyle = "#8a7a68";
    g.fillRect(0, ground - 2, VW, 3);

    g.fillStyle = "#2c2c34";
    g.fillRect(0, ground + 1, VW, VH - (ground + 1));
    g.fillStyle = "#1a1a22";
    g.fillRect(0, ground + 1, VW, 2);
    g.fillStyle = "#e8c030";
    const dash = wrap(cam, 28);
    for (let x = -dash; x < VW; x += 28) g.fillRect(Math.round(x), ground + 14, 14, 2);
  }

  function drawPalm(x) {
    const px = Math.round(x);
    const y = ground - 22;
    g.fillStyle = "#6a4430";
    g.fillRect(px - 1, y - 46, 3, 46);
    g.fillStyle = "#2a6a38";
    g.fillRect(px - 10, y - 50, 21, 6);
    g.fillRect(px - 14, y - 46, 10, 4);
    g.fillRect(px + 5, y - 46, 10, 4);
    g.fillStyle = "#3a8a48";
    g.fillRect(px - 6, y - 54, 13, 5);
  }

  function windowColor(sky, lit) {
    const on = lit && (sky?.windows ?? 1) > 0.32;
    return on ? "#f0c430" : "#1a1424";
  }

  function drawFacade(x, sky, seed) {
    const h = 34 + (seed % 2) * 6;
    const w = 36 + (seed % 2) * 8;
    const y = ground - 22 - h;
    const cols = ["#c4b49a", "#8a8a90", "#2a2430", "#b8a888"];
    const px = Math.round(x);
    g.fillStyle = cols[seed % cols.length];
    g.fillRect(px - w / 2, y, w, h);
    g.fillStyle = "#1a1420";
    g.fillRect(px - w / 2, y, w, 2);
    g.fillStyle = "#6a5a50";
    g.fillRect(px - 3, y + h - 12, 6, 12);
    const rows = 2;
    const ccount = 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < ccount; c++) {
        const lit = ((r + c + seed) % 3) !== 0;
        g.fillStyle = windowColor(sky, lit);
        g.fillRect(px - w / 2 + 5 + c * 14, y + 6 + r * 10, 6, 6);
      }
    }
  }

  function drawLamp(x, sky) {
    const px = Math.round(x);
    const y = ground - 22;
    g.fillStyle = "#2a2430";
    g.fillRect(px - 1, y - 40, 2, 40);
    const on = (sky?.lamps ?? 0) > 0.35;
    g.fillStyle = on ? "#f0c430" : "#2a2430";
    g.fillRect(px - 4, y - 44, 9, 5);
  }

  function drawHouse(x, sky) {
    const px = Math.round(x);
    const y = ground - 56;
    g.fillStyle = "#c4b49a";
    g.fillRect(px - 22, y, 44, 34);
    g.fillStyle = "#2a2430";
    g.fillRect(px - 24, y - 4, 48, 5);
    g.fillStyle = "#3de0ff";
    g.fillRect(px - 4, y + 16, 8, 18);
    g.fillStyle = windowColor(sky, true);
    g.fillRect(px + 8, y + 6, 8, 8);
    g.fillRect(px - 16, y + 6, 8, 8);
    g.fillStyle = "#141018";
    g.fillRect(px - 26, y - 24, 52, 18);
    g.fillStyle = "#3de0ff";
    g.fillRect(px - 26, y - 24, 52, 2);
    text("HOME", x, y - 20, "#3de0ff");
    text("STASH", x, y - 10, "#f0c430");
  }

  function drawStore(x) {
    const px = Math.round(x);
    const y = ground - 56;
    g.fillStyle = "#8a8a90";
    g.fillRect(px - 22, y, 44, 34);
    g.fillStyle = "#2a2430";
    g.fillRect(px - 24, y - 4, 48, 5);
    g.fillStyle = "#e21b7a";
    g.fillRect(px - 6, y + 16, 12, 18);
    g.fillStyle = "#f0c430";
    g.fillRect(px + 8, y + 6, 8, 8);
    g.fillRect(px - 16, y + 6, 8, 8);
    text("PLUG", x, y - 14, "#e21b7a");
  }

  function drawHeadlights(x, facing, carY, on) {
    if (!on) return;
    const dir = facing < 0 ? -1 : 1;
    const nose = Math.round(x + dir * 28);
    g.fillStyle = "#fff6c0";
    g.fillRect(nose - 1, Math.round(carY - 8), 3, 2);
  }

  function drawPixelCar(x, carY, facing, color, lights) {
    const spr = art.car;
    if (spr) {
      drawImg(spr, x, carY, facing, 64, 20);
      drawHeadlights(x, facing, carY - 2, lights);
      return;
    }
    g.fillStyle = color || "#5a3a88";
    g.fillRect(Math.round(x) - 30, carY - 14, 60, 12);
    g.fillStyle = "#2a2038";
    g.fillRect(Math.round(x) - 10, carY - 22, 22, 9);
    g.fillStyle = "#111018";
    g.fillRect(Math.round(x) - 22, carY - 4, 10, 5);
    g.fillRect(Math.round(x) + 12, carY - 4, 10, 5);
    drawHeadlights(x, facing, carY - 4, lights);
  }

  function drawLight(x, phase) {
    const y = ground - 50;
    g.fillStyle = "#2a2430";
    g.fillRect(Math.round(x) - 1, y, 3, 38);
    g.fillStyle = "#141018";
    g.fillRect(Math.round(x) - 6, y - 18, 12, 20);
    g.fillStyle = phase === "red" ? "#ff2a3a" : "#3a1018";
    g.fillRect(Math.round(x) - 4, y - 16, 8, 5);
    g.fillStyle = phase === "yellow" ? "#f0c430" : "#3a3010";
    g.fillRect(Math.round(x) - 4, y - 9, 8, 5);
    g.fillStyle = phase === "green" ? "#3dff7a" : "#103a18";
    g.fillRect(Math.round(x) - 4, y - 2, 8, 5);
    g.fillStyle = "#f4f0e8";
    g.fillRect(Math.round(x) - 18, ground + 2, 4, 28);
    g.fillStyle = "#e8e0d0";
    for (let i = 0; i < 5; i++) {
      g.fillRect(Math.round(x) - 12 + i * 8, ground + 4, 5, 18);
    }
  }

  function actorFrame(set, anim, moving, waving) {
    if (!set) return null;
    if (waving && set.wave) return frameAt(set.wave, anim, 8);
    if (moving && set.walk) return frameAt(set.walk, anim, 9);
    return frameAt(set.idle || set.walk, anim, 5);
  }

  function project(gameX, gameY) {
    const xLog = sx(gameX);
    const yLog = sy(gameY);
    const sc = dest.cssScale || (dest.cssW / VW);
    return {
      x: (dest.cssX || 0) + xLog * sc,
      y: (dest.cssY || 0) + yLog * sc,
      ok: xLog > -20 && xLog < VW + 20,
    };
  }

  function lerpWrap(a, b, t) {
    return wrap(a + wrapDelta(a, b, WORLD) * t, WORLD);
  }

  function renderGameX(ent, alpha) {
    if (!ent) return 0;
    if (ent.px == null) return ent.x;
    return lerpWrap(ent.px, ent.x, alpha);
  }

  function sync(state, dt, alpha = 1) {
    try {
      return syncInner(state, dt, alpha);
    } catch (err) {
      console.error(err);
      return { camX, project };
    }
  }

  function syncInner(state, dt, alpha = 1) {
    const p = state.player;
    const px = renderGameX(p, alpha);
    const paused = state.mode === "paused";
    const stepDt = paused ? 0 : dt;
    const playing = state.mode === "play" || paused;
    const wantFace = p.facing < 0 ? -1 : 1;
    lookFace += (wantFace - lookFace) * (1 - Math.exp(-1.7 * Math.max(stepDt, 0.0001)));
    if (playing) {
      const lead = state.inCar ? 18 : 24;
      const look = wrap(px + lookFace * lead, WORLD);
      const dx = wrapDelta(camX, look, WORLD);
      const follow = state.inCar ? 3.0 : 2.2;
      camX = wrap(camX + dx * (1 - Math.exp(-follow * Math.max(stepDt, 0.0001))), WORLD);
    } else {
      camX = wrap(camX + stepDt * 12, WORLD);
    }

    g.imageSmoothingEnabled = false;
    drawSky(state.sky);
    drawMoon(state.sky);
    drawSun(state.sky);
    drawBackdrop(camX, state.sky);
    drawStreet(camX);

    drawWrapped((off) => {
      for (let i = 0; i < 8; i++) {
        const gx = i * (WORLD / 8) + 70;
        if (Math.abs(wrapDelta(gx, HOME_X, WORLD)) < 110) continue;
        if (Math.abs(wrapDelta(gx, PLUG_X, WORLD)) < 110) continue;
        const x = sx(gx + off);
        if (x > -30 && x < VW + 30) drawFacade(x, state.sky, i);
      }
      for (let i = 0; i < 10; i++) {
        const gx = i * (WORLD / 10) + 18;
        const x = sx(gx + off);
        if (x > -16 && x < VW + 16) drawLamp(x, state.sky);
      }
      const hx = sx(HOME_X + off);
      if (hx > -30 && hx < VW + 30) drawHouse(hx, state.sky);
      const plugX = sx((state.plugMeet?.x ?? PLUG_X) + off);
      if (plugX > -40 && plugX < VW + 40) drawStore(plugX);
      (state.lights || []).forEach((L) => {
        const x = sx(L.x + off);
        if (x > -80 && x < VW + 80) drawLight(x, L.phase);
      });
    });

    const looks = art.peds || art.buyers || [];
    const feet = sy(GROUND_Y);
    for (const ped of state.peds || []) {
      const set = looks[ped.look % looks.length];
      const fr = actorFrame(set, ped.anim, Math.abs(ped.vx || 0) > 2, false);
      drawWrapped((off) => {
        const x = sx(ped.x + off);
        if (x > -20 && x < VW + 20) drawImg(fr, x, feet - 1, ped.facing, 40, 50);
      });
    }

    if (state.plugMeet && art.plug) {
      const fr = actorFrame(art.plug, state.clock || 1, false, true);
      drawWrapped((off) => {
        const x = sx(state.plugMeet.x + off);
        if (x > -20 && x < VW + 20) drawImg(fr, x, feet - 1, 1, 40, 50);
      });
    }

    const live = state.order && (state.order.phase === "active" || state.order.phase === "nudge");
    if (live) {
      const look = Math.max(0, state.order.look | 0) % looks.length;
      const fr = actorFrame(looks[look], 1, false, true);
      drawWrapped((off) => {
        const x = sx(state.order.x + off);
        if (x < -20 || x > VW + 20) return;
        g.fillStyle = "#f0c430";
        g.fillRect(Math.round(x) - 1, feet - 58, 3, 10);
        g.fillRect(Math.round(x) - 3, feet - 50, 7, 3);
        drawImg(fr, x, feet - 1, wrapDelta(state.order.x, px, WORLD) >= 0 ? 1 : -1, 40, 50);
      });
    }

    const nightLights = !!(state.sky?.headlights);

    function laneY(lat, facing) {
      const nearY = ground + 22;
      const farY = ground + 10;
      const span = CAR_LANE_NEAR - CAR_LANE_FAR || 1;
      const u = Math.max(0, Math.min(1, ((lat ?? (facing > 0 ? CAR_LANE_NEAR : CAR_LANE_FAR)) - CAR_LANE_FAR) / span));
      return farY + (nearY - farY) * u;
    }

    for (const t of state.traffic || []) {
      const cx = renderGameX(t, alpha);
      const facing = t.facing < 0 ? -1 : 1;
      const carY = laneY(t.lat, facing);
      drawWrapped((off) => {
        const x = sx(cx + off);
        if (x < -50 || x > VW + 50) return;
        drawPixelCar(x, carY, facing, t.color || (t.kind === "luxury" ? "#121214" : "#5a3a88"), nightLights);
      });
    }

    if (state.car) {
      const cx = renderGameX(state.car, alpha);
      const yaw = Number.isFinite(state.car.yaw) ? state.car.yaw : (state.car.facing < 0 ? Math.PI : 0);
      let facing = Math.cos(yaw) < 0 ? -1 : 1;
      const carY = laneY(state.car.lat, facing);
      drawWrapped((off) => {
        const x = sx(cx + off);
        if (x < -50 || x > VW + 50) return;
        if (art.car) drawImg(art.car, x, carY, facing, 72, 22);
        else drawPixelCar(x, carY, facing, "#5a3a88", nightLights);
        drawHeadlights(x, facing, carY - 4, nightLights);
        g.fillStyle = "#3de0ff";
        g.fillRect(Math.round(x) - 3, carY - 28, 6, 3);
        text("YOU", x, carY - 40, "#3de0ff");
      });
    }

    if (state.copCar && art.copCar) {
      const cx = renderGameX(state.copCar, alpha);
      const facing = state.copCar.facing < 0 ? -1 : 1;
      const carY = facing > 0 ? ground + 24 : ground + 8;
      drawWrapped((off) => {
        const x = sx(cx + off);
        if (x < -50 || x > VW + 50) return;
        drawImg(art.copCar, x, carY, facing, 100, 30);
        drawHeadlights(x, facing, carY - 8, nightLights);
      });
    }

    const boarding = (state.boardT || 0) > 0;
    if (!state.inCar || boarding) {
      const blink = state.mode === "play" && state.invuln > 0.4 && Math.floor(state.invuln * 20) % 2 === 0;
      if (!blink) {
        const airborne = p.y < 197.2;
        const fit = (art.outfits && art.outfits[state.outfit | 0]) || art;
        const set = state.muzzle > 0 ? fit.shoot
          : airborne ? fit.jump
            : Math.abs(p.vx) > 8 ? fit.walk
              : fit.idle;
        const running = Math.abs(p.vx) > 55;
        const rate = state.muzzle > 0 ? 14 : airborne ? 8 : running ? 16 : Math.abs(p.vx) > 8 ? 12 : 5;
        const fr = frameAt(set, p.anim, rate);
        const spinW = Math.max(0.18, Math.abs(lookFace));
        const boardU = 1 - Math.max(0, Math.min(1, (state.boardT || 0) / 0.38));
        const sink = boarding ? (state.inCar ? boardU * 10 : (1 - boardU) * 8) : 0;
        drawWrapped((off) => {
          const x = sx(px + off);
          if (x > -20 && x < VW + 20) {
            g.save();
            if (boarding) g.globalAlpha = state.inCar ? (1 - boardU) : boardU;
            drawImg(fr, x, sy(p.y) + sink, lookFace < 0 ? -1 : 1, Math.round(48 * spinW), 48);
            g.restore();
          }
        });
      }
    }

    if (art.dumpster && state.combat) {
      drawWrapped((off) => {
        const x = sx(493 + off);
        if (x > -20 && x < VW + 20) drawImg(art.dumpster, x, feet, 1, 36, 36);
      });
    }

    out.imageSmoothingEnabled = false;
    out.fillStyle = state.sky?.cssTop || "#0c0120";
    out.fillRect(0, 0, canvas.width, canvas.height);
    if (state.shake > 0) {
      const s = state.shake * state.shake;
      out.save();
      out.translate((Math.random() * 2 - 1) * 4 * s, (Math.random() * 2 - 1) * 3 * s);
    }
    out.drawImage(buf, dest.x, dest.y, dest.w, dest.h);
    if (state.shake > 0) out.restore();

    return { camX, project };
  }

  function getView() {
    return { camGameX: camX, halfWidth: VW / 2 };
  }

  return { sync, resize, getView };
}
