/*
  RAGDOLL CHAMBER — sound
  Every sound is made in the browser with the Web Audio API: thuds, clangs, squeaks,
  pops, rips and booms. No audio files. (Recorded squeaks can replace these later.)
*/
(function (root) {
  'use strict';
  const RC = root.RC;
  let ctx = null, master = null, out = null, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem('ragdoll-chamber.muted') === '1'; } catch (e) { /* storage blocked */ }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    out = ctx.createGain(); out.gain.value = muted ? 0 : 0.55; out.connect(ctx.destination);
    // (V0.2) the dungeon's own echo: every sound goes dry and into a stone-room reverb
    master = ctx.createGain(); master.gain.value = 1;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(out);
    master.connect(comp);
    const verb = ctx.createConvolver(), len = Math.floor(ctx.sampleRate * 1.9), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) { const t = i / len; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2) * (i < 400 ? i / 400 : 1); } }
    verb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.32;
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 3200;
    master.connect(tone); tone.connect(verb); verb.connect(wet); wet.connect(comp);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const now = () => ctx.currentTime;
  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function noise(t, dur, filterType, f0, f1, peak) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); env(g, t, 0.005, peak, dur);
    src.connect(f); f.connect(g); g.connect(master); src.start(t); src.stop(t + dur + 0.05);
  }
  function tone(t, type, f0, f1, dur, peak) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); env(g, t, 0.005, peak, dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  const S = {
    init,
    get muted() { return muted; },
    setMuted(m) { muted = m; try { localStorage.setItem('ragdoll-chamber.muted', m ? '1' : '0'); } catch (e) { /* ignore */ } if (out) out.gain.value = m ? 0 : 0.55; },
    thud(strength, kind) {
      if (!ctx || muted) return; const t = now();
      noise(t, 0.12 + strength * 0.2, 'lowpass', 250 + strength * 700, 90, 0.25 + strength * 0.6);
      tone(t, 'sine', 120 + strength * 40, 45, 0.18 + strength * 0.15, 0.3 + strength * 0.4);
      // a soft cloth slap on top: it is a stuffed toy
      noise(t, 0.06 + strength * 0.05, 'bandpass', 1400, 600, 0.12 + strength * 0.2);
      if (kind === 'anvil') { tone(t, 'square', 523, 0, 0.5, 0.12); tone(t, 'square', 789, 0, 0.35, 0.08); }
      if (kind === 'piano') { for (const f of [196, 247, 311, 370, 466]) tone(t + Math.random() * 0.04, 'triangle', f, 0, 1.2, 0.09); }
      if (kind === 'cannonball') tone(t, 'square', 330, 160, 0.12, 0.05);
    },
    squeak(pitch) { if (!ctx || muted) return; const t = now(), p = pitch || 1; tone(t, 'triangle', 700 * p, 1400 * p, 0.12, 0.18); tone(t + 0.11, 'triangle', 1300 * p, 900 * p, 0.09, 0.12); },
    pop() { if (!ctx || muted) return; const t = now(); tone(t, 'sine', 500, 1300, 0.08, 0.3); },
    pip() { if (!ctx || muted) return; const t = now(); tone(t, 'sine', 1200, 1500, 0.05, 0.15); },
    rip() { if (!ctx || muted) return; const t = now(); noise(t, 0.3, 'bandpass', 3000, 900, 0.5); },
    stitch() { if (!ctx || muted) return; const t = now(); for (let i = 0; i < 4; i++) tone(t + i * 0.07, 'square', 1800, 1600, 0.03, 0.06); },
    boom() { if (!ctx || muted) return; const t = now(); noise(t, 0.5, 'lowpass', 900, 60, 0.9); tone(t, 'sine', 90, 35, 0.5, 0.6); },
    whoosh(strength) { if (!ctx || muted) return; const t = now(); noise(t, 0.35, 'bandpass', 600, 2400, 0.15 + strength * 0.3); },
    whistle() { if (!ctx || muted) return; const t = now(); tone(t, 'sine', 1800, 500, 0.7, 0.12); },
  };
  RC.Sound = S;
})(typeof window !== 'undefined' ? window : globalThis);
