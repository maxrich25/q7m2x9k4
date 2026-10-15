/* Chiptune SFX + loop. Sound on by default. */
(function (global) {
  const MUTE_KEY = "block-run-2d-muted";
  let ctx = null;
  let master = null;
  let sfxGain = null;
  let musicGain = null;
  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch { muted = false; }
  let unlocked = false;
  let musicTimer = null;
  let hookBound = false;
  let engine = null;
  let step = 0;

  function makeCtx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    try { return new AC({ latencyHint: "interactive" }); } catch { return new AC(); }
  }
  function ensure() {
    if (ctx) return ctx;
    ctx = makeCtx();
    master = ctx.createGain();
    sfxGain = ctx.createGain();
    musicGain = ctx.createGain();
    sfxGain.gain.value = 0.85;
    musicGain.gain.value = 0.26;
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
    } catch { /* ignore */ }
  }
  function unlock() {
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
      } catch { /* ignore */ }
    }
    if (ctx.state === "running") {
      unlocked = true;
      startMusic();
    }
  }
  function bindUnlock() {
    if (hookBound) return;
    hookBound = true;
    const go = () => { unlock(); startMusic(); };
    const opts = { capture: true, passive: true };
    document.addEventListener("pointerdown", go, opts);
    document.addEventListener("touchstart", go, opts);
    document.addEventListener("keydown", go, opts);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && ctx && ctx.state !== "running") {
        try { ctx.resume(); } catch { /* ignore */ }
      }
    });
  }
  function setMuted(on) {
    muted = !!on;
    try { localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch { /* ignore */ }
    if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
    if (!muted) unlock();
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
      try { ac.resume().then(play); } catch { /* ignore */ }
      return;
    }
    play();
  }
  const sfx = {
    start() { tone({ freq: 392, dur: 0.12, vol: 0.24 }); tone({ freq: 523, dur: 0.14, vol: 0.22 }); tone({ freq: 784, dur: 0.2, vol: 0.22 }); },
    jump() { tone({ freq: 520, dur: 0.1, vol: 0.18, slide: 180 }); },
    buy() { tone({ freq: 440, dur: 0.1, vol: 0.2 }); tone({ freq: 660, dur: 0.14, vol: 0.18 }); tone({ freq: 880, dur: 0.16, vol: 0.16 }); },
    pickup() { tone({ freq: 660, dur: 0.08, vol: 0.18 }); tone({ freq: 990, dur: 0.1, vol: 0.16 }); },
    drop() { tone({ freq: 330, dur: 0.1, vol: 0.2 }); tone({ freq: 520, dur: 0.14, vol: 0.18 }); tone({ freq: 780, dur: 0.18, vol: 0.16 }); },
    ping() { tone({ freq: 880, dur: 0.07, vol: 0.16 }); tone({ freq: 1320, dur: 0.1, vol: 0.14 }); },
    hit() { tone({ freq: 220, dur: 0.09, vol: 0.26, noise: true }); },
    honk() { tone({ freq: 310, dur: 0.16, vol: 0.22 }); tone({ freq: 380, dur: 0.18, vol: 0.16 }); },
    shift() { tone({ freq: 180, dur: 0.06, vol: 0.14, type: "square" }); },
  };
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
    engine = { osc, filt, g };
    return engine;
  }
  function setEngine(kind, speed = 0) {
    try {
      const e = ensureEngine();
      if (!e || !ctx || ctx.state !== "running") return;
      const t = ctx.currentTime;
      if (!kind || kind === "off") {
        e.g.gain.setTargetAtTime(0.0001, t, 0.05);
        return;
      }
      const u = Math.max(0, Math.min(1, speed));
      e.osc.frequency.setTargetAtTime(110 + u * 160, t, 0.06);
      e.filt.frequency.setTargetAtTime(360 + u * 420, t, 0.06);
      e.g.gain.setTargetAtTime(0.07 + u * 0.07, t, 0.05);
    } catch { /* ignore */ }
  }
  const BASS = [98, 98, 130.8, 98, 87.3, 87.3, 110, 98];
  const LEAD = [392, 0, 523, 392, 349, 0, 329, 392];
  function stopMusic() {
    if (musicTimer != null) {
      clearTimeout(musicTimer);
      musicTimer = null;
    }
  }
  function startMusic() {
    if (musicTimer != null) return;
    ensure();
    const tick = () => {
      if (!ctx) {
        musicTimer = window.setTimeout(tick, 170);
        return;
      }
      if (muted) {
        musicTimer = window.setTimeout(tick, 170);
        return;
      }
      if (ctx.state !== "running") {
        try { ctx.resume(); } catch { /* ignore */ }
        musicTimer = window.setTimeout(tick, 170);
        return;
      }
      const t = ctx.currentTime;
      const n = BASS[step % BASS.length];
      const l = LEAD[step % LEAD.length];
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.32, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      g.connect(musicGain);
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = n;
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 0.16);
      osc.onended = () => { osc.disconnect(); g.disconnect(); };
      if (l) {
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.14, t);
        g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        g2.connect(musicGain);
        const o2 = ctx.createOscillator();
        o2.type = "square";
        o2.frequency.value = l;
        o2.connect(g2);
        o2.start(t);
        o2.stop(t + 0.12);
        o2.onended = () => { o2.disconnect(); g2.disconnect(); };
      }
      step += 1;
      musicTimer = window.setTimeout(tick, 170);
    };
    tick();
  }

  global.BRAudio = {
    bindUnlock,
    unlock,
    startMusic,
    stopMusic,
    setMuted,
    toggleMute() { setMuted(!muted); return muted; },
    isMuted() { return muted; },
    isUnlocked() { return unlocked && !!ctx && ctx.state === "running"; },
    setEngine,
    sfx,
  };
})(window);
