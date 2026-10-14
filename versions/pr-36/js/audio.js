let ctx = null;
let master = null;
let sfxGain = null;
let musicGain = null;
const MUTE_KEY = "block-run-muted";
function loadMuted() {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}
function saveMuted(on) {
  try { localStorage.setItem(MUTE_KEY, on ? "1" : "0"); } catch {}
}
let muted = loadMuted();
let unlocked = false;
let musicTimer = null;
let hookBound = false;

const BPM = 92;
const STEP = 60 / BPM / 4;

function makeCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  try {
    return new AC({ latencyHint: "interactive" });
  } catch {
    return new AC();
  }
}

function ensure() {
  if (ctx) return ctx;
  ctx = makeCtx();
  master = ctx.createGain();
  sfxGain = ctx.createGain();
  musicGain = ctx.createGain();
  sfxGain.gain.value = 0.85;
  musicGain.gain.value = 0.28;
  master.gain.value = muted ? 0 : 1;
  sfxGain.connect(master);
  musicGain.connect(master);
  master.connect(ctx.destination);
  ctx.addEventListener("statechange", () => {
    if (ctx && ctx.state === "running") unlocked = true;
  });
  return ctx;
}

function beep() {
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0004, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
    osc.frequency.value = 220;
    osc.type = "square";
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch {}
}

export function unlockAudio() {
  ensure();
  beep();
  if (ctx.state !== "running") {
    try {
      ctx.resume().then(() => {
        if (ctx && ctx.state === "running") {
          unlocked = true;
          startMusic();
        }
      });
    } catch {}
  }
  if (ctx.state === "running") {
    unlocked = true;
    startMusic();
  }
}

export function bindAudioUnlock() {
  if (hookBound) return;
  hookBound = true;
  const go = () => {
    unlockAudio();
    startMusic();
  };
  const opts = { capture: true, passive: true };
  document.addEventListener("pointerdown", go, opts);
  document.addEventListener("touchstart", go, opts);
  document.addEventListener("keydown", go, opts);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && ctx && ctx.state !== "running") {
      try { ctx.resume(); } catch {}
    }
  });
}

export function isUnlocked() {
  return unlocked && !!ctx && ctx.state === "running";
}

export function isMuted() {
  return muted;
}

export function setMuted(on) {
  muted = !!on;
  saveMuted(muted);
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
  if (!muted) unlockAudio();
}

export function toggleMute() {
  setMuted(!muted);
  return muted;
}

function tone(opts) {
  const ac = ensure();
  const play = () => {
    if (!ctx || ctx.state !== "running") return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(opts.vol ?? 0.28, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
    g.connect(sfxGain);
    if (opts.noise) {
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * opts.dur), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = "bandpass";
      filt.frequency.value = opts.freq;
      src.connect(filt);
      filt.connect(g);
      src.start(t);
      src.stop(t + opts.dur);
      src.onended = () => { src.disconnect(); filt.disconnect(); g.disconnect(); };
      return;
    }
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? "square";
    osc.frequency.setValueAtTime(opts.freq, t);
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, opts.freq + opts.slide), t + opts.dur);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + opts.dur);
    osc.onended = () => { osc.disconnect(); g.disconnect(); };
  };
  if (ac.state !== "running") {
    try { ac.resume().then(play); } catch {}
    return;
  }
  play();
}

let engine = null;

function ensureEngine() {
  ensure();
  if (engine || !ctx) return engine;
  const osc = ctx.createOscillator();
  const filt = ctx.createBiquadFilter();
  const g = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.value = 70;
  filt.type = "lowpass";
  filt.frequency.value = 420;
  g.gain.value = 0.0001;
  osc.connect(filt);
  filt.connect(g);
  g.connect(sfxGain);
  osc.start();
  engine = { osc, filt, g, kind: "off" };
  return engine;
}

export function setEngine(kind, speed = 0) {
  try {
    const e = ensureEngine();
    if (!e || !ctx || ctx.state !== "running") return;
    const t = ctx.currentTime;
    if (!kind || kind === "off") {
      e.g.gain.setTargetAtTime(0.0001, t, 0.05);
      e.kind = "off";
      return;
    }
    if (kind === "rev") {
      e.osc.frequency.setTargetAtTime(270, t, 0.04);
      e.filt.frequency.setTargetAtTime(780, t, 0.05);
      e.g.gain.setTargetAtTime(0.15, t, 0.04);
    } else {
      const u = Math.max(0, Math.min(1, speed));
      e.osc.frequency.setTargetAtTime(110 + u * 160, t, 0.06);
      e.filt.frequency.setTargetAtTime(360 + u * 420, t, 0.06);
      e.g.gain.setTargetAtTime(0.08 + u * 0.07, t, 0.05);
    }
    e.kind = kind;
  } catch {}
}

export const sfx = {
  shoot() { tone({ freq: 880 + Math.random() * 40, dur: 0.08, vol: 0.22, slide: -420, type: "square" }); },
  hit() { tone({ freq: 220, dur: 0.09, vol: 0.26, noise: true }); tone({ freq: 140, dur: 0.12, vol: 0.16, slide: -80 }); },
  pickup() { tone({ freq: 660, dur: 0.08, vol: 0.18 }); tone({ freq: 990, dur: 0.1, vol: 0.16 }); },
  drop() { tone({ freq: 330, dur: 0.1, vol: 0.2 }); tone({ freq: 520, dur: 0.14, vol: 0.18 }); tone({ freq: 780, dur: 0.18, vol: 0.16 }); },
  hurt() { tone({ freq: 160, dur: 0.22, vol: 0.3, slide: -90, type: "sawtooth" }); },
  boom() { tone({ freq: 90, dur: 0.38, vol: 0.32, slide: -50 }); tone({ freq: 180, dur: 0.3, vol: 0.22, noise: true }); },
  start() { tone({ freq: 392, dur: 0.12, vol: 0.24 }); tone({ freq: 523, dur: 0.14, vol: 0.22 }); tone({ freq: 784, dur: 0.2, vol: 0.22 }); },
  dead() { tone({ freq: 220, dur: 0.18, vol: 0.26, slide: -80 }); tone({ freq: 130, dur: 0.4, vol: 0.26, slide: -60 }); },
  jump() { tone({ freq: 520, dur: 0.1, vol: 0.18, slide: 180 }); },
  buy() { tone({ freq: 440, dur: 0.1, vol: 0.2 }); tone({ freq: 660, dur: 0.14, vol: 0.18 }); tone({ freq: 880, dur: 0.16, vol: 0.16 }); },
  siren() { tone({ freq: 740, dur: 0.18, vol: 0.2, slide: 220 }); },
  ping() { tone({ freq: 880, dur: 0.07, vol: 0.16 }); tone({ freq: 1320, dur: 0.1, vol: 0.14 }); },
  honk() { tone({ freq: 310, dur: 0.16, vol: 0.22, type: "square" }); tone({ freq: 380, dur: 0.18, vol: 0.16, type: "square" }); },
};

function noiseBuf(dur) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function drumKick(t) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(118, t);
  osc.frequency.exponentialRampToValueAtTime(42, t + 0.16);
  g.gain.setValueAtTime(0.55, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  osc.connect(g);
  g.connect(musicGain);
  osc.start(t);
  osc.stop(t + 0.22);
  osc.onended = () => { osc.disconnect(); g.disconnect(); };
}

function drumSnare(t) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf(0.12);
  const filt = ctx.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = 1800;
  filt.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.28, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  src.connect(filt);
  filt.connect(g);
  g.connect(musicGain);
  src.start(t);
  src.stop(t + 0.12);
  const osc = ctx.createOscillator();
  const g2 = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = 196;
  g2.gain.setValueAtTime(0.12, t);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
  osc.connect(g2);
  g2.connect(musicGain);
  osc.start(t);
  osc.stop(t + 0.08);
  src.onended = () => { src.disconnect(); filt.disconnect(); g.disconnect(); };
  osc.onended = () => { osc.disconnect(); g2.disconnect(); };
}

function drumHat(t, roll) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf(roll ? 0.05 : 0.03);
  const filt = ctx.createBiquadFilter();
  filt.type = "highpass";
  filt.frequency.value = 7000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(roll ? 0.1 : 0.07, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (roll ? 0.05 : 0.03));
  src.connect(filt);
  filt.connect(g);
  g.connect(musicGain);
  src.start(t);
  src.stop(t + 0.05);
  src.onended = () => { src.disconnect(); filt.disconnect(); g.disconnect(); };
}

function bass808(t, freq) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(28, freq * 0.72), t + 0.28);
  g.gain.setValueAtTime(0.34, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  osc.connect(g);
  g.connect(musicGain);
  osc.start(t);
  osc.stop(t + 0.32);
  osc.onended = () => { osc.disconnect(); g.disconnect(); };
}

function leadStab(t, freq) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.08, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  osc.connect(g);
  g.connect(musicGain);
  osc.start(t);
  osc.stop(t + 0.18);
  osc.onended = () => { osc.disconnect(); g.disconnect(); };
}

const KICK = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0];
const SNARE = [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
const HAT = [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1];
const BASS = [41.2, 0, 0, 41.2, 0, 0, 49, 0, 36.7, 0, 0, 41.2, 0, 36.7, 0, 0];
const LEAD = [0, 0, 311.1, 0, 0, 246.9, 0, 0, 207.7, 0, 246.9, 0, 0, 185, 0, 0];

export function stopMusic() {
  if (musicTimer != null) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
}

export function startMusic() {
  if (musicTimer != null) return;
  ensure();
  let next = 0;
  const bar = () => {
    if (!ctx) {
      musicTimer = window.setTimeout(bar, 200);
      return;
    }
    if (muted) {
      musicTimer = window.setTimeout(bar, 200);
      return;
    }
    if (ctx.state !== "running") {
      try { ctx.resume(); } catch {}
      musicTimer = window.setTimeout(bar, 200);
      return;
    }
    const now = ctx.currentTime;
    if (next < now + 0.04) next = now + 0.05;
    for (let i = 0; i < 16; i++) {
      const t = next + i * STEP;
      if (KICK[i]) drumKick(t);
      if (SNARE[i]) drumSnare(t);
      if (HAT[i]) drumHat(t, i >= 13);
      if (BASS[i]) bass808(t, BASS[i]);
      if (LEAD[i]) leadStab(t, LEAD[i]);
    }
    next += 16 * STEP;
    musicTimer = window.setTimeout(bar, 16 * STEP * 1000 - 60);
  };
  bar();
}
