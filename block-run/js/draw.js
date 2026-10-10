import {
  WORLD, GROUND_Y, wrap, wrapDelta, HOME_X, PLUG_X,
} from "../../block-run-25d/js/config.js?v=43";
import { frameAt } from "../../block-run-25d/js/paint.js?v=43";

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
    VH = Math.max(224, Math.round(256 * h / Math.max(1, w)));
    ground = VH - 36;
    buf.width = VW;
    buf.height = VH;
    dest = {
      x: 0,
      y: 0,
      w: canvas.width,
      h: canvas.height,
      cssW: w,
      cssH: h,
      scale: canvas.width / VW,
    };
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
    const top = sky?.cssTop || "#0c0120";
    const bot = sky?.cssBot || "#140a28";
    const grd = g.createLinearGradient(0, 0, 0, Math.max(80, ground - 8));
    grd.addColorStop(0, top);
    grd.addColorStop(1, bot);
    g.fillStyle = grd;
    g.fillRect(0, 0, VW, VH);
    const starA = sky?.star ?? 1;
    if (starA > 0.08) {
      g.fillStyle = `rgba(200,192,216,${Math.min(1, starA).toFixed(2)})`;
      for (let i = 0; i < 18; i++) {
        const x = (i * 47 + 11) % VW;
        const y = 8 + ((i * 17) % 40);
        g.fillRect(x, y, 1, 1);
      }
    }
  }

  function backdropDest() {
    const destH = Math.max(120, Math.min(ground - 40, 210));
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
    g.fillStyle = `rgba(255,214,90,${Math.min(1, 0.4 + sun * 0.55).toFixed(2)})`;
    g.fillRect(x - r - 3, cy - 1, r * 2 + 6, 3);
    g.fillRect(x - 1, cy - r - 3, 3, r * 2 + 6);
    g.fillStyle = "#ffe46a";
    g.fillRect(x - r + 1, cy - r + 1, r * 2 - 2, r * 2 - 2);
    g.fillStyle = "#fff6b0";
    g.fillRect(x - 3, cy - 3, 6, 6);
  }

  function drawMoon(sky) {
    const moon = sky?.moon ?? 0;
    if (moon <= 0.12) return;
    const y = bannerSafeY();
    const x = 22;
    const drop = Math.round((1 - moon) * 10);
    const cy = y + drop;
    const a = Math.min(1, 0.62 + moon * 0.38);
    g.fillStyle = `rgba(232,224,208,${a.toFixed(2)})`;
    g.fillRect(x - 3, cy - 6, 6, 1);
    g.fillRect(x - 5, cy - 5, 10, 2);
    g.fillRect(x - 6, cy - 3, 12, 6);
    g.fillRect(x - 5, cy + 3, 10, 2);
    g.fillRect(x - 3, cy + 5, 6, 1);
    g.fillStyle = `rgba(244,240,232,${a.toFixed(2)})`;
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
    const destH = Math.max(120, Math.min(ground - 40, 210));
    const destY = ground - 26 - destH;
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
    const sun = sky?.sun ?? 0;
    if (sun > 0.08) {
      const tint = sun > 0.55 ? [210, 226, 240] : [232, 184, 152];
      const id = sl.getImageData(0, destY, VW, destH);
      const p = id.data;
      for (let i = 0; i < p.length; i += 4) {
        if (!p[i + 3]) continue;
        const sat = Math.max(p[i], p[i + 1], p[i + 2]) - Math.min(p[i], p[i + 1], p[i + 2]);
        if (sat > 80) continue;
        p[i] = (p[i] * tint[0] / 255) | 0;
        p[i + 1] = (p[i + 1] * tint[1] / 255) | 0;
        p[i + 2] = (p[i + 2] * tint[2] / 255) | 0;
      }
      sl.putImageData(id, 0, destY);
    }
    g.drawImage(streetLayer, 0, 0);
  }

  function drawStreet(cam) {
    const walk = ground - 22;
    g.fillStyle = "#9a8a7c";
    g.fillRect(0, walk, VW, 22);
    g.fillStyle = "#7a6c62";
    for (let x = -((cam | 0) % 18); x < VW; x += 18) g.fillRect(x, walk, 1, 22);
    g.fillStyle = "#c8b8a8";
    g.fillRect(0, walk, VW, 3);
    g.fillStyle = "#6a5a50";
    g.fillRect(0, ground - 2, VW, 3);

    g.fillStyle = "#1c1824";
    g.fillRect(0, ground + 1, VW, VH - (ground + 1));
    g.fillStyle = "#141018";
    g.fillRect(0, ground + 1, VW, 2);
    g.fillStyle = "#e8c44a";
    const dash = wrap(cam, 28);
    for (let x = -dash; x < VW; x += 28) g.fillRect(Math.round(x), ground + 14, 15, 3);
  }

  function drawPalm(x) {
    const y = ground - 22;
    g.fillStyle = "#6a4430";
    g.fillRect(Math.round(x) - 2, y - 42, 4, 42);
    g.fillStyle = "#1f6a38";
    g.fillRect(Math.round(x) - 14, y - 52, 28, 14);
    g.fillStyle = "#2f8a4a";
    g.fillRect(Math.round(x) - 16, y - 48, 10, 6);
    g.fillRect(Math.round(x) + 6, y - 48, 10, 6);
    g.fillStyle = "#3dff7a";
    g.fillRect(Math.round(x) - 6, y - 46, 4, 3);
  }

  function drawCali(x) {
    const y = ground - 58;
    g.fillStyle = "#c8b8a0";
    g.fillRect(Math.round(x) - 36, y, 72, 40);
    g.fillStyle = "#b0a088";
    g.fillRect(Math.round(x) - 36, y, 72, 3);
    g.fillStyle = "#f4f0e8";
    g.font = "11px 'Press Start 2P', monospace";
    g.textAlign = "center";
    g.fillText("CALI", Math.round(x), y + 12);
    g.fillStyle = "#3de0ff";
    g.font = "6px 'Press Start 2P', monospace";
    g.fillText("LA NIGHTS", Math.round(x), y + 26);
  }

  function windowColor(sky, lit) {
    const on = lit && (sky?.windows ?? 1) > 0.32;
    return on ? "#f0c430" : "#1a1424";
  }

  function drawFacade(x, sky, seed) {
    const h = 36 + (seed % 3) * 10;
    const w = 28 + (seed % 2) * 8;
    const y = ground - 22 - h;
    const cols = ["#3a3048", "#2a2438", "#403050", "#243044"];
    g.fillStyle = cols[seed % cols.length];
    g.fillRect(Math.round(x) - w / 2, y, w, h);
    g.fillStyle = "#1a1424";
    g.fillRect(Math.round(x) - w / 2, y, w, 3);
    const rows = 3 + (seed % 2);
    const ccount = 2 + (seed % 2);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < ccount; c++) {
        const lit = ((r + c + seed) % 3) !== 0;
        g.fillStyle = windowColor(sky, lit);
        g.fillRect(Math.round(x) - w / 2 + 4 + c * 10, y + 6 + r * 9, 6, 6);
      }
    }
  }

  function drawLamp(x, sky) {
    const y = ground - 22;
    g.fillStyle = "#2a2430";
    g.fillRect(Math.round(x) - 1, y - 40, 2, 40);
    const on = (sky?.lamps ?? 0) > 0.35;
    g.fillStyle = on ? "#f0c430" : "#2a2430";
    g.fillRect(Math.round(x) - 5, y - 46, 12, 7);
    if (on) {
      g.fillStyle = `rgba(240,196,48,${Math.min(0.55, 0.22 + sky.lamps * 0.35).toFixed(2)})`;
      g.beginPath();
      g.moveTo(Math.round(x) - 4, y - 39);
      g.lineTo(Math.round(x) - 16, y);
      g.lineTo(Math.round(x) + 16, y);
      g.lineTo(Math.round(x) + 4, y - 39);
      g.fill();
    }
  }

  function drawHouse(x, sky) {
    const y = ground - 50;
    g.fillStyle = "#3a3048";
    g.fillRect(Math.round(x) - 22, y, 44, 38);
    g.fillStyle = "#1a1424";
    g.fillRect(Math.round(x) - 24, y - 8, 48, 10);
    g.fillStyle = "#3de0ff";
    g.fillRect(Math.round(x) - 6, y + 16, 12, 22);
    g.fillStyle = windowColor(sky, true);
    g.fillRect(Math.round(x) + 7, y + 6, 12, 10);
    if ((sky?.windows ?? 0) > 0.32) {
      g.fillStyle = "rgba(255,230,120,0.35)";
      g.fillRect(Math.round(x) + 5, y + 4, 16, 14);
    }
    text("HOME", x, y - 14, "#3de0ff");
    text("STASH", x, y - 24, "#f0c430");
  }

  function drawHeadlights(x, facing, carY, on) {
    if (!on) return;
    const dir = facing < 0 ? -1 : 1;
    const nose = x + dir * 22;
    g.fillStyle = "rgba(255,236,170,0.55)";
    g.beginPath();
    g.moveTo(nose, carY - 10);
    g.lineTo(nose + dir * 38, carY - 4);
    g.lineTo(nose + dir * 38, carY + 6);
    g.lineTo(nose, carY - 4);
    g.fill();
    g.fillStyle = "#fff6c0";
    g.fillRect(Math.round(nose - 2), Math.round(carY - 11), 4, 3);
  }

  function drawPixelCar(x, carY, facing, color, lights) {
    const dir = facing < 0 ? -1 : 1;
    g.fillStyle = color || "#2a3048";
    g.fillRect(Math.round(x) - 36, carY - 16, 72, 16);
    g.fillStyle = "#152028";
    g.fillRect(Math.round(x) - 14, carY - 26, 28, 11);
    g.fillStyle = "#111018";
    g.fillRect(Math.round(x) - 28, carY - 4, 12, 6);
    g.fillRect(Math.round(x) + 16, carY - 4, 12, 6);
    drawHeadlights(x, dir, carY - 4, lights);
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
    return {
      x: dest.cssW / 2 + (xLog - VW / 2) * (dest.cssW / VW),
      y: dest.cssH / 2 + (yLog - VH / 2) * (dest.cssH / VH),
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
    lookFace += (wantFace - lookFace) * (1 - Math.exp(-4.2 * Math.max(stepDt, 0.0001)));
    if (playing) {
      const lead = state.inCar ? 18 : 24;
      const look = wrap(px + lookFace * lead, WORLD);
      const dx = wrapDelta(camX, look, WORLD);
      const follow = state.inCar ? 6.2 : 4.0;
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

    const CALI_X = HOME_X + 340;
    drawWrapped((off) => {
      for (let i = 0; i < 12; i++) {
        const gx = i * (WORLD / 12) + 70;
        if (Math.abs(wrapDelta(gx, HOME_X, WORLD)) < 90) continue;
        if (Math.abs(wrapDelta(gx, CALI_X, WORLD)) < 80) continue;
        const x = sx(gx + off);
        if (x > -30 && x < VW + 30) drawFacade(x, state.sky, i);
      }
      for (let i = 0; i < 8; i++) {
        const gx = i * (WORLD / 8) + 40;
        const x = sx(gx + off);
        if (x > -20 && x < VW + 20) drawPalm(x);
      }
      for (let i = 0; i < 10; i++) {
        const gx = i * (WORLD / 10) + 18;
        const x = sx(gx + off);
        if (x > -16 && x < VW + 16) drawLamp(x, state.sky);
      }
      const hx = sx(HOME_X + off);
      if (hx > -30 && hx < VW + 30) drawHouse(hx, state.sky);
      const cali = sx(CALI_X + off);
      if (cali > -50 && cali < VW + 50) drawCali(cali);
      const plugX = sx((state.plugMeet?.x ?? PLUG_X) + off);
      if (plugX > -30 && plugX < VW + 30) text("PLUG", plugX, sy(GROUND_Y) - 64, "#e21b7a");
      (state.lights || []).forEach((L) => {
        const x = sx(L.x + off);
        if (x > -10 && x < VW + 10) drawLight(x, L.phase);
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
        g.beginPath();
        g.moveTo(x, feet - 58);
        g.lineTo(x - 5, feet - 48);
        g.lineTo(x + 5, feet - 48);
        g.fill();
        drawImg(fr, x, feet - 1, wrapDelta(state.order.x, px, WORLD) >= 0 ? 1 : -1, 40, 50);
      });
    }

    const nightLights = !!(state.sky?.headlights);

    for (const t of state.traffic || []) {
      const cx = renderGameX(t, alpha);
      const facing = t.facing < 0 ? -1 : 1;
      const carY = facing > 0 ? ground + 22 : ground + 10;
      drawWrapped((off) => {
        const x = sx(cx + off);
        if (x < -50 || x > VW + 50) return;
        if (art.car) {
          drawImg(art.car, x, carY, facing, 88, 26);
          drawHeadlights(x, facing, carY - 8, nightLights);
        } else {
          drawPixelCar(x, carY, facing, t.color, nightLights);
        }
      });
    }

    if (state.car && art.car) {
      const cx = renderGameX(state.car, alpha);
      let facing = state.car.facing < 0 ? -1 : 1;
      if ((state.car.turnT || 0) > 0) {
        const u = 1 - state.car.turnT / 1;
        if (Math.cos(Math.max(0, Math.min(1, u)) * Math.PI) < 0) facing *= -1;
      }
      const carY = facing > 0 ? ground + 24 : ground + 8;
      drawWrapped((off) => {
        const x = sx(cx + off);
        if (x < -50 || x > VW + 50) return;
        drawImg(art.car, x, carY, facing, 100, 30);
        drawHeadlights(x, facing, carY - 8, nightLights);
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

    if (!state.inCar) {
      const blink = state.mode === "play" && state.invuln > 0.4 && Math.floor(state.invuln * 20) % 2 === 0;
      if (!blink) {
        const airborne = p.y < 197.2;
        const fit = (art.outfits && art.outfits[state.outfit | 0]) || art;
        const set = state.muzzle > 0 ? fit.shoot
          : airborne ? fit.jump
            : Math.abs(p.vx) > 8 ? fit.walk
              : fit.idle;
        const rate = state.muzzle > 0 ? 14 : airborne ? 8 : Math.abs(p.vx) > 8 ? 11 : 5;
        const fr = frameAt(set, p.anim, rate);
        drawWrapped((off) => {
          const x = sx(px + off);
          if (x > -20 && x < VW + 20) drawImg(fr, x, sy(p.y), lookFace < 0 ? -1 : 1, 48, 48);
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
