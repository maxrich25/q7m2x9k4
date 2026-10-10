import {
  WORLD, GROUND_Y, wrap, wrapDelta, HOME_X, PLUG_X, LIGHT_COUNT, lightGameX,
} from "../../block-run-25d/js/config.js?v=25";
import { frameAt } from "../../block-run-25d/js/paint.js?v=25";

const VW = 256;
const VH = 224;

export function createWorld(canvas, art) {
  const buf = document.createElement("canvas");
  buf.width = VW;
  buf.height = VH;
  const g = buf.getContext("2d");
  const out = canvas.getContext("2d");
  let camX = 80;
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
    const scale = Math.max(w / VW, h / VH);
    const dw = VW * scale;
    const dh = VH * scale;
    dest = {
      x: (w - dw) / 2 * dpr,
      y: (h - dh) / 2 * dpr,
      w: dw * dpr,
      h: dh * dpr,
      cssW: w,
      cssH: h,
      scale: scale * dpr,
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

  function drawImg(img, x, y, facing = 1, w, h) {
    if (!img) return;
    const src = facing < 0 && img.flipped ? img.flipped : img;
    const iw = w || src.width || src.naturalWidth || 32;
    const ih = h || src.height || src.naturalHeight || 40;
    g.drawImage(src, Math.round(x - iw / 2), Math.round(y - ih), iw, ih);
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

  function drawSky() {
    g.fillStyle = "#07060c";
    g.fillRect(0, 0, VW, VH);
    g.fillStyle = "#140c22";
    g.fillRect(0, 0, VW, 120);
    g.fillStyle = "#1a1430";
    g.fillRect(0, 100, VW, 40);
    g.fillStyle = "#f4f0e8";
    g.beginPath();
    g.arc(28, 28, 7, 0, Math.PI * 2);
    g.fill();
  }

  function drawParallax(cam) {
    const shift = wrap(cam * 0.22, 220);
    for (let i = -1; i < 4; i++) {
      const bx = i * 88 - (shift % 88);
      const h = 46 + ((i + 8) % 3) * 10;
      g.fillStyle = i % 2 ? "#1e1830" : "#241c38";
      g.fillRect(Math.round(bx), 118 - h, 70, h);
      g.fillStyle = "#ffe06a";
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
          if ((i + r + c) % 3 === 0) continue;
          g.fillRect(Math.round(bx) + 8 + c * 18, 118 - h + 8 + r * 10, 6, 5);
        }
      }
    }
  }

  function drawStreet(cam) {
    g.fillStyle = "#8a8694";
    g.fillRect(0, 164, VW, 18);
    g.fillStyle = "#6a6674";
    for (let x = -((cam | 0) % 16); x < VW; x += 16) g.fillRect(x, 164, 1, 18);
    g.fillStyle = "#b8b4c0";
    g.fillRect(0, 164, VW, 2);

    g.fillStyle = "#1a1822";
    g.fillRect(0, 182, VW, 42);
    g.fillStyle = "#f0c430";
    const dash = wrap(cam, 28);
    for (let x = -dash; x < VW; x += 28) g.fillRect(Math.round(x), 200, 12, 2);

    if (art.street && art.street.naturalWidth) {
      const sw = art.street.naturalWidth;
      const t = wrap(cam * 0.35, sw);
      g.globalAlpha = 0.28;
      g.drawImage(art.street, t, 40, 180, 120, 0, 40, 180, 88);
      if (t + 180 > sw) {
        const extra = t + 180 - sw;
        g.drawImage(art.street, 0, 40, extra, 120, 180 - extra, 40, extra, 88);
      }
      g.globalAlpha = 1;
    }
  }

  function drawPalm(x, y) {
    g.fillStyle = "#6a4430";
    g.fillRect(Math.round(x) - 1, y - 22, 3, 22);
    g.fillStyle = "#2f8a4a";
    g.fillRect(Math.round(x) - 8, y - 28, 16, 8);
    g.fillStyle = "#3dff7a";
    g.fillRect(Math.round(x) - 6, y - 26, 3, 2);
  }

  function drawCali(x) {
    g.fillStyle = "#6a6258";
    g.fillRect(Math.round(x) - 28, 132, 56, 32);
    g.fillStyle = "#e21b7a";
    g.font = "10px 'Press Start 2P', monospace";
    g.textAlign = "center";
    g.fillText("CALI", Math.round(x), 142);
    g.fillStyle = "#3de0ff";
    g.font = "6px 'Press Start 2P', monospace";
    g.fillText("LA NIGHTS", Math.round(x), 154);
  }

  function drawHouse(x) {
    g.fillStyle = "#3a3048";
    g.fillRect(Math.round(x) - 18, 136, 36, 28);
    g.fillStyle = "#1a1424";
    g.fillRect(Math.round(x) - 20, 132, 40, 6);
    g.fillStyle = "#3de0ff";
    g.fillRect(Math.round(x) - 5, 148, 10, 16);
    g.fillStyle = "#f0c430";
    g.fillRect(Math.round(x) + 8, 142, 7, 7);
    text("HOME", x, 122, "#3de0ff");
  }

  function drawLight(x, phase) {
    g.fillStyle = "#2a2430";
    g.fillRect(Math.round(x) - 1, 140, 3, 24);
    g.fillStyle = "#141018";
    g.fillRect(Math.round(x) - 4, 132, 8, 16);
    g.fillStyle = phase === "red" ? "#ff2a3a" : "#3a1018";
    g.fillRect(Math.round(x) - 2, 133, 4, 4);
    g.fillStyle = phase === "yellow" ? "#f0c430" : "#3a3010";
    g.fillRect(Math.round(x) - 2, 138, 4, 4);
    g.fillStyle = phase === "green" ? "#3dff7a" : "#103a18";
    g.fillRect(Math.round(x) - 2, 143, 4, 4);
  }

  function actorFrame(set, anim, moving, waving) {
    if (!set) return null;
    if (waving && set.wave) return frameAt(set.wave, anim, 8);
    if (moving && set.walk) return frameAt(set.walk, anim, 9);
    return frameAt(set.idle || set.walk, anim, 5);
  }

  function project(gameX, gameY) {
    const xLog = sx(gameX);
    const yLog = gameY;
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
    const p = state.player;
    const px = renderGameX(p, alpha);
    const paused = state.mode === "paused";
    const stepDt = paused ? 0 : dt;
    const playing = state.mode === "play" || paused;
    if (playing) {
      const lead = state.inCar ? 18 : 24;
      const look = wrap(px + p.facing * lead, WORLD);
      const dx = wrapDelta(camX, look, WORLD);
      const follow = state.inCar ? 10 : 7;
      camX = wrap(camX + dx * (1 - Math.exp(-follow * Math.max(stepDt, 0.0001))), WORLD);
    } else {
      camX = wrap(camX + stepDt * 12, WORLD);
    }

    g.imageSmoothingEnabled = false;
    drawSky();
    drawParallax(camX);

    drawWrapped((off) => {
      const cali = sx(HOME_X + 180 + off);
      if (cali > -40 && cali < VW + 40) drawCali(cali);
      for (let i = 0; i < 8; i++) {
        const gx = i * (WORLD / 8) + 40;
        const x = sx(gx + off);
        if (x > -20 && x < VW + 20) drawPalm(x, 164);
      }
    });

    drawStreet(camX);

    drawWrapped((off) => {
      const hx = sx(HOME_X + off);
      if (hx > -30 && hx < VW + 30) drawHouse(hx);
      const plugX = sx((state.plugMeet?.x ?? PLUG_X) + off);
      if (plugX > -30 && plugX < VW + 30) text("PLUG", plugX, 122, "#e21b7a");
      (state.lights || []).forEach((L) => {
        const x = sx(L.x + off);
        if (x > -10 && x < VW + 10) drawLight(x, L.phase);
      });
    });

    const looks = art.peds || art.buyers || [];
    for (const ped of state.peds || []) {
      const set = looks[ped.look % looks.length];
      const fr = actorFrame(set, ped.anim, Math.abs(ped.vx || 0) > 2, false);
      drawWrapped((off) => {
        const x = sx(ped.x + off);
        if (x > -20 && x < VW + 20) drawImg(fr, x, GROUND_Y, ped.facing);
      });
    }

    if (state.plugMeet && art.plug) {
      const fr = actorFrame(art.plug, state.clock || 1, false, true);
      drawWrapped((off) => {
        const x = sx(state.plugMeet.x + off);
        if (x > -20 && x < VW + 20) drawImg(fr, x, GROUND_Y, 1);
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
        g.moveTo(x, 148);
        g.lineTo(x - 4, 156);
        g.lineTo(x + 4, 156);
        g.fill();
        drawImg(fr, x, GROUND_Y, wrapDelta(state.order.x, px, WORLD) >= 0 ? 1 : -1);
      });
    }

    if (state.car && art.car) {
      const cx = renderGameX(state.car, alpha);
      const facing = state.car.facing;
      const turning = (state.car.turnT || 0) > 0;
      drawWrapped((off) => {
        const x = sx(cx + off);
        if (x < -40 || x > VW + 40) return;
        g.save();
        g.translate(Math.round(x), GROUND_Y);
        if (turning) {
          const u = 1 - state.car.turnT;
          g.scale(Math.cos(u * Math.PI), 1);
        }
        const img = facing < 0 && art.car.flipped ? art.car.flipped : art.car;
        g.drawImage(img, -28, -22);
        g.restore();
      });
    }

    if (state.copCar && art.copCar) {
      const cx = renderGameX(state.copCar, alpha);
      drawWrapped((off) => {
        const x = sx(cx + off);
        if (x < -40 || x > VW + 40) return;
        drawImg(art.copCar, x, GROUND_Y + 2, state.copCar.facing, 56, 24);
      });
    }

    if (!state.inCar) {
      const blink = state.invuln > 0 && Math.floor(state.invuln * 20) % 2 === 0;
      if (!blink) {
        const airborne = p.y < 197.2;
        const set = state.muzzle > 0 ? art.shoot
          : airborne ? art.jump
            : Math.abs(p.vx) > 8 ? art.walk
              : art.idle;
        const rate = state.muzzle > 0 ? 14 : airborne ? 8 : Math.abs(p.vx) > 8 ? 11 : 5;
        const fr = frameAt(set, p.anim, rate);
        drawWrapped((off) => {
          const x = sx(px + off);
          if (x > -20 && x < VW + 20) drawImg(fr, x, p.y, p.facing);
        });
      }
    }

    if (art.dumpster) {
      drawWrapped((off) => {
        const x = sx(493 + off);
        if (x > -20 && x < VW + 20) drawImg(art.dumpster, x, GROUND_Y, 1, 36, 36);
      });
    }

    out.imageSmoothingEnabled = false;
    out.fillStyle = "#07060c";
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
