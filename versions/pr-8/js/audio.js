let ctx = null;
let master = null;
let sfxGain = null;
let musicGain = null;
let muted = false;
let unlocked = false;
let musicTimer = null;
let musicStep = 0;
let hookBound = false;

const BASS = [98, 98, 130.8, 98, 87.3, 87.3, 110, 98];
const LEAD = [392, 0, 523, 392, 349, 0, 329, 392];

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
  musicGain.gain.value = 0.34;
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
        if (ctx && ctx.state === "running") unlocked = true;
      });
    } catch {}
  }
  if (ctx.state === "running") unlocked = true;
}

export function bindAudioUnlock() {
  if (hookBound) return;
  hookBound = true;
  const go = () => unlockAudio();
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
  muted = on;
  if (master && ctx) master.gain.setTargetAtTime(on ? 0 : 1, ctx.currentTime, 0.02);
  if (!on) unlockAudio();
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
};

export function stopMusic() {
  if (musicTimer != null) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
}

export function startMusic() {
  stopMusic();
  ensure();
  musicStep = 0;
  const step = () => {
    if (!ctx) {
      musicTimer = window.setTimeout(step, 170);
      return;
    }
    if (muted) {
      musicTimer = window.setTimeout(step, 170);
      return;
    }
    if (ctx.state !== "running") {
      try { ctx.resume(); } catch {}
      musicTimer = window.setTimeout(step, 170);
      return;
    }
    const t = ctx.currentTime;
    const bass = BASS[musicStep % BASS.length];
    const lead = LEAD[musicStep % LEAD.length];
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.36, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    g.connect(musicGain);
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = bass;
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 0.16);
    osc.onended = () => { osc.disconnect(); g.disconnect(); };
    if (lead) {
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.16, t);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      g2.connect(musicGain);
      const o2 = ctx.createOscillator();
      o2.type = "square";
      o2.frequency.value = lead;
      o2.connect(g2);
      o2.start(t);
      o2.stop(t + 0.12);
      o2.onended = () => { o2.disconnect(); g2.disconnect(); };
    }
    musicStep += 1;
    musicTimer = window.setTimeout(step, 170);
  };
  step();
}
