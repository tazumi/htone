// ============================================================================
// audio: the night outside, synthesised (no sample files)
// ============================================================================
// A fixed Web Audio graph, built on the first click / key / touch and driven by a 10 Hz timer, not the frame loop.
// Layers: wind (follows the gusts, whistles in the strong ones), the hum of the town, the highway (tyres, and the
// engines of the trucks and buses), the trains (rumble, wheels over the rail joints, horn; the freight train heavier
// and slower), an aeroplane high up, the buzz of the failing lamp, the creak of the swing; and the sounds of the yard
// placed where they come from (world.js lists them in Wd.snd): music in two cars by the doors, radios and cooking and
// televisions behind some windows, people whistling on the roofs, dogs in the private houses. In the room the window
// glass muffles all of it and a clock ticks.
let AC, OUT, muted = false;
const VOL = 0.8; // master level
function mkSound(ac) {
  const sr = ac.sampleRate;
  // node of class C with options o, connected to every node / param in `to`; sources start at once
  const N = (C, o, ...to) => { const n = new C(ac, o); for (const d of to) n.connect(d); if (n.start) n.start(); return n; };
  const G = (gain, ...to) => N(GainNode, { gain }, ...to);
  const BQ = (type, frequency, Q, ...to) => N(BiquadFilterNode, { type, frequency, Q }, ...to);
  const OSC = (type, frequency, ...to) => N(OscillatorNode, { type, frequency }, ...to);
  const lfo = (frequency, depth, to) => N(OscillatorNode, { frequency }, G(depth, to));
  const pan = (...to) => N(StereoPannerNode, {}, ...to);
  const noise = (secs, f) => { const n = sr * secs | 0, b = new AudioBuffer({ length: n, numberOfChannels: 2, sampleRate: sr }); f(b.getChannelData(0), n); f(b.getChannelData(1), n); return b; };
  // seamless brown noise loop (the end cross-fades into the start), and a white one
  const nb = noise(11, (d, n) => { for (let i = 0, b = 0; i < n + 4096; i++) { b = (b + 0.02 * (rnd() * 2 - 1)) / 1.02; if (i < n) d[i] = b * 3.5; else { const k = (i - n) / 4096; d[i - n] = d[i - n] * k + b * 3.5 * (1 - k); } } });
  const nw = noise(7, (d, n) => { for (let i = 0; i < n; i++) d[i] = rnd() * 2 - 1; });
  // the yard answers: 2.5 s of noise that fades out and gets darker, with a slap off the far wall
  const ir = noise(2.5, (d, n) => { for (let i = 0, b = 0; i < n; i++) { const t = i / sr; b += (rnd() * 2 - 1 - b) * (0.05 + 0.5 * exp(-t * 3)); d[i] = b * (1 - exp(-t * 60)) * exp(-t * 2.6) * (1 + 2 * exp(-((t - 0.19) ** 2) * 9e3)) * (1 - i / n); } });

  const lim = N(DynamicsCompressorNode, { threshold: -6, knee: 6, ratio: 20, attack: 0.003, release: 0.3 }, ac.destination);
  const out = OUT = G(0, lim), pane = G(1, out), glass = BQ('lowpass', 16000, 0.5, pane), wet = N(ConvolverNode, { buffer: ir }, G(0.5, glass));
  const src = (buffer, playbackRate, ...to) => N(AudioBufferSourceNode, { buffer, loop: true, playbackRate }, ...to);
  // wind: a broad band that opens up with the gust, a low push under it, a thin whistle on top
  const wind = G(0, glass), windF = BQ('bandpass', 400, 0.6, wind), low = G(0.09, glass), whis = G(0, glass), whisF = BQ('bandpass', 1100, 24, whis);
  src(nw, 1, windF, whisF); src(nb, 1, BQ('lowpass', 170, 0.7, low)); lfo(0.07, 0.05, low.gain); lfo(0.19, 0.25, G(60, whisF.frequency));
  // the town: far traffic and machinery, too low to place
  const hum = G(0.2, glass); src(nb, 0.61, BQ('lowpass', 75, 0.7, hum)); lfo(0.031, 0.05, hum.gain);
  // the highway: each slot a band of tyre noise and an engine that only the big ones make heard
  const cars = Array.from({ length: NRC }, () => { const p = pan(glass), g = G(0, p), f = BQ('bandpass', 600, 0.8, g), eg = G(0, p), eo = OSC('sawtooth', 50, BQ('lowpass', 180, 1, eg)); return { p, g, f, eg, eo }; });
  src(nw, 0.71, ...cars.map((c) => c.f));
  // the trains: rumble, the wheels over the joints, the horn
  const trP = pan(glass, G(0.4, wet)), trG = G(0, trP), trF = BQ('lowpass', 300, 0.7, trG), clk = G(0, trP), horn = G(0, trP, G(1.2, wet)), hornF = BQ('lowpass', 1300, 0.7, horn);
  src(nb, 1.31, trF); src(nw, 1.13, BQ('bandpass', 480, 1.4, clk));
  const hornO = [311, 370].map((f) => OSC('sawtooth', f, hornF));
  // an aeroplane: a far roar, a thin whine over it
  const plP = pan(glass), plG = G(0, plP); src(nb, 0.8, BQ('lowpass', 260, 0.6, plG)); const plW = G(0, plP); OSC('sawtooth', 1900, BQ('bandpass', 1900, 30, plW));
  // the failing lamp buzzes at the mains' pitch; the swing creaks; the clock in the room
  const bz = G(0, glass); OSC('sawtooth', 100, BQ('bandpass', 2600, 2.5, bz));
  const cr = G(0, glass, G(0.7, wet)), crO = OSC('triangle', 800, BQ('bandpass', 1500, 3, cr));
  const tick = G(0, out), tickF = BQ('bandpass', 3000, 7, tick); src(nw, 0.9, tickF);

  // ---- the sounds of the yard, each with its place: a panner and a level for distance, a send to the echo
  // R: the distance (m) at which it is at half level; far: beyond it nothing is played; wv: how much echo
  // the room the viewer starts in: what plays in it is muffled from outside instead of from inside
  const room = BQ('lowpass', 16000, 0.5, out);
  const KIND = { tvroom: [2.5, 40, 0], music: [7, 70, 0.25], radio: [5, 40, 0.2], cook: [3.5, 25, 0.1], tv: [4, 30, 0.15], whistle: [14, 120, 0.6], dog: [45, 400, 1.4] };
  const note = (m) => 440 * 2 ** ((m - 69) / 12);
  // an envelope on a gain: up in a, down over d
  const env = (p, t, a, v, d) => { p.setValueAtTime(0.0001, t); p.linearRampToValueAtTime(v, t + a); p.exponentialRampToValueAtTime(0.0001, t + a + d); };
  // a short voice: oscillator of type `ty` at f through `to`, enveloped, stopping by itself
  const tone = (ty, f, t, a, v, d, to, f2) => { const g = G(0, to), o = N(OscillatorNode, { type: ty, frequency: f }, g); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d); env(g.gain, t, a, v, d); o.stop(t + a + d + 0.05); return o; };
  const burst = (f, q, t, v, d, to, type = 'bandpass') => { const g = G(0, to), s = N(AudioBufferSourceNode, { buffer: nw, playbackRate: 1 }, BQ(type, f, q, g)); s.stop(t + d + 0.05); env(g.gain, t, 0.002, v, d); };
  const S = Wd.snd.map(([kind, x, y, z], i) => {
    const [R, far, wv] = KIND[kind], p = kind === 'tvroom' ? pan(room) : pan(glass, G(wv, wet)), lvl = G(0, p), o = { kind, x, y, z, R, far, p, lvl, next: 0, step: 0, seed: i * 7.31 + 1, on: 0 };
    if (kind === 'music') {
      // inside a closed car: only the bass and the thump come through
      o.f = BQ('lowpass', 420, 1.2, lvl); o.bpm = i & 1 ? 100 : 92; o.key = i & 1 ? 45 : 43;
    } else if (kind === 'radio' || kind === 'tv' || kind === 'tvroom') {
      // a small loudspeaker behind a window: a narrow band, a little hiss
      o.f = BQ('lowpass', kind === 'tv' ? 1600 : 2600, 0.8, lvl); o.band = BQ('highpass', kind === 'tv' ? 180 : 320, 0.7, o.f);
      src(nw, 0.5 + i * 0.01, BQ('highpass', 3000, 0.5, G(kind === 'tv' ? 0.006 : 0.012, o.f)));
      // speech: a buzzing voice through two moving formants
      o.vg = G(0, o.band); o.vo = OSC('sawtooth', 120, (o.f1 = BQ('bandpass', 500, 6, o.vg)), (o.f2 = BQ('bandpass', 1500, 8, o.vg)));
      o.prog = 0; o.progT = 0;
    } else if (kind === 'cook') {
      // frying: hiss that crackles, now and then a lid or a spoon
      o.f = BQ('lowpass', 2400, 0.7, lvl); o.sz = G(0.1, o.f); src(nw, 0.83 + i * 0.01, BQ('highpass', 2200, 0.6, o.sz));
    } else if (kind === 'whistle') {
      o.wg = G(0, lvl); o.wo = OSC('sine', 1200, o.wg); lfo(5.3 + i * 0.4, 14, o.wo.frequency);
      o.br = G(0, lvl); src(nw, 1, BQ('bandpass', 1300, 12, o.br));
    }
    return o;
  });
  // whistled phrases: a pentatonic walk, the same few motifs coming back
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
  let dogT = ac.currentTime + 8;

  let lt = ac.currentTime, tClk = 0, tHorn = -1, tCr = lt + 2, tTick = lt + 1, nTick = 0, was = 0, wasK = 0;
  out.gain.setTargetAtTime(VOL, lt, 1.5);
  return () => {
    const now = ac.currentTime, t = now + 0.05;
    if (now <= lt) return;
    lt = now;
    const gu = F[GUST], inr = F[INR], cx = F[CX], cy = F[CY], cz = F[CZ], rx = cos(F[YAW]), rz = sin(F[YAW]);
    const side = (dx, dz) => clamp((dx * rx + dz * rz) / (hypot(dx, dz) + 1e-3), -1, 1);
    glass.frequency.setTargetAtTime(mix(16000, 420, inr), t, 0.12); room.frequency.setTargetAtTime(mix(500, 16000, inr), t, 0.12); pane.gain.setTargetAtTime(mix(1, 0.6, inr), t, 0.12);
    wind.gain.setTargetAtTime(0.1 + 0.8 * gu * gu, t, 0.4); windF.frequency.setTargetAtTime(240 + 760 * gu, t, 0.5);
    whis.gain.setTargetAtTime(0.5 * sstep(0.5, 0.95, gu), t, 0.3); whisF.frequency.setTargetAtTime(880 + 520 * gu, t, 0.5);
    cars.forEach((c, k) => {
      const o = RC + k * 4, dz = ROADZ - 1.8 * F[o + 1] - cz, dx = F[o] - cx, d = hypot(dx, dz), on = F[o + 2], big = F[o + 3] > 4 ? 1 : 0, heavy = F[o + 3] === 5 || F[o + 3] === 6 || F[o + 3] === 8;
      c.g.gain.setTargetAtTime(on * (big ? 34 : 22) / (40 + d), t, 0.3); c.f.frequency.setTargetAtTime((big ? 220 : 350) + 9e4 / (d + 60), t, 0.3); c.p.pan.setTargetAtTime(side(dx, dz), t, 0.2);
      c.eg.gain.setTargetAtTime(on * (heavy ? 30 : 0) / (30 + d), t, 0.3); c.eo.frequency.setTargetAtTime(heavy ? 46 + 6 * sin(now * 0.3 + k) : 50, t, 0.5);
    });
    {
      // whichever train is out: its extent along the track, speed, cars and horn
      const fr = F[FRON] > 0, on = fr ? 1 : F[TRON], d0 = fr ? F[FRD] : F[TRD], x0 = fr ? F[FRX] - (d0 > 0 ? FRL : 0) : F[TRX] - 11, x1 = fr ? F[FRX] + (d0 > 0 ? 0 : FRL) : F[TRX] + 224;
      const dx = clamp(cx, x0, x1) - cx, dz = RAILZ - cz, d = hypot(dx, dz), L = on * 80 / (80 + d), v = fr ? FREIGHTV : TRAINV, cl = fr ? 14 : 23.6, xm = (x0 + x1) / 2;
      trG.gain.setTargetAtTime(L * (fr ? 2.4 : 1.5), t, 0.5); trF.frequency.setTargetAtTime((fr ? 110 : 160) + 3e4 / (d + 30), t, 0.5); trP.pan.setTargetAtTime(side(xm - cx, dz), t, 0.3);
      if (on) {
        // two axles of two bogies per car length
        if (!was) { tClk = t; tHorn = t + 5; hornO.forEach((h, k) => h.frequency.setValueAtTime(fr ? [208, 247][k] : [311, 370][k], t)); }
        for (; tClk < t + 0.15; tClk += cl / v) for (const o of fr ? [0, 0.14, 0.9, 1.04] : [0, 0.11, 0.62, 0.73]) { const a = tClk + o; if (a > t) { clk.gain.setValueAtTime(L * (fr ? 1.8 : 1.3), a); clk.gain.exponentialRampToValueAtTime(0.001, a + (fr ? 0.09 : 0.06)); } }
        if (tHorn > 0 && t > tHorn) {
          // one long call on the way in
          const n = fr ? 2.4 : 1.6, h = 0.05 + 0.1 * L; horn.gain.setValueAtTime(0, t); horn.gain.linearRampToValueAtTime(h, t + 0.08); horn.gain.setValueAtTime(h, t + n); horn.gain.linearRampToValueAtTime(0, t + n + 0.3);
          tHorn = -1;
        }
      }
      was = on;
    }
    {
      // the aeroplane: heard well only from up high, out of the walls of the yard
      const dx = F[PLX] - cx, dz = F[PLZ] - cz, d = hypot(dx, dz, 1150), L = F[PLON] * (0.12 + 0.88 * sstep(8, 70, cy)) * 2500 / (2500 + d);
      plG.gain.setTargetAtTime(L * 1.1, t, 0.8); plW.gain.setTargetAtTime(L * 0.012, t, 0.8); plP.pan.setTargetAtTime(side(dx, dz) * 0.7, t, 0.5);
    }
    { const l = LAMPS[FLICK], d2 = (l.x - cx) ** 2 + (l.y - F[CY]) ** 2 + (l.z - cz) ** 2; bz.gain.setTargetAtTime(0.5 * (0.25 + 0.75 * F[FLK]) / (8 + d2 * 0.25), t, 0.02); }
    if (t > tCr) {
      // the swing: a squeak at each end of its arc when the wind moves it
      const d2 = (20.5 - cx) ** 2 + (3.2 - cz) ** 2, v = 0.5 * sstep(0.3, 0.8, gu) / (10 + d2 * 0.12), f = rr(650, 900);
      crO.frequency.setValueAtTime(f, t); crO.frequency.exponentialRampToValueAtTime(f * rr(1.25, 1.6), t + 0.28);
      cr.gain.setValueAtTime(0, t); cr.gain.linearRampToValueAtTime(v, t + 0.04); cr.gain.linearRampToValueAtTime(0, t + 0.3);
      tCr = t + PI / 1.95 * (rnd() < 0.2 ? 2 : 1);
    }
    if (t > tTick) { tickF.frequency.setValueAtTime(nTick++ & 1 ? 2500 : 3100, t); tick.gain.setValueAtTime(0.9 * inr, t); tick.gain.exponentialRampToValueAtTime(0.0005, t + 0.035); tTick += 1; if (tTick < t) tTick = t + 1; }

    // ---- the sounds of the yard
    const ahead = t + 0.25;
    for (const o of S) {
      const dx = o.x - cx, dy = o.y - cy, dz = o.z - cz, d = hypot(dx, dy, dz), lv = 1 / (1 + (d / o.R) ** 2), near = d < o.far;
      o.lvl.gain.setTargetAtTime(near ? lv : 0, t, 0.3); o.p.pan.setTargetAtTime(side(dx, dz) * min(1, d / 3), t, 0.2);
      if (!near) { o.next = 0; continue; }
      if (o.next < t) o.next = t;
      if (o.kind === 'music') {
        // a four-chord loop: kick, clap, hats, a bass line and a stab
        o.f.frequency.setTargetAtTime(380 + 900 / (1 + d * 0.5), t, 0.3);
        const st = 60 / o.bpm / 4, prog = [0, -4, 3, -2];
        for (; o.next < ahead; o.next += st, o.step++) {
          const s = o.step & 15, bar = (o.step >> 4) & 3, r = o.key + prog[bar], a = o.next;
          if (s === 0 || s === 8 || (s === 10 && bar === 3)) tone('sine', 130, a, 0.003, 0.9, 0.28, o.f, 42);
          if (s === 4 || s === 12) burst(1500, 0.8, a, 0.35, 0.14, o.f);
          if (!(s & 1)) burst(7000, 0.6, a, 0.05, 0.03, o.f, 'highpass');
          if ([0, 3, 6, 8, 11, 14].includes(s)) tone('sawtooth', note(r - 12), a, 0.005, 0.22, st * 1.6, o.f);
          if (s === 2 || s === 10) for (const iv of [12, 15, 19]) tone('square', note(r + iv), a, 0.005, 0.05, st * 1.2, o.f);
        }
      } else if (o.kind === 'radio' || o.kind === 'tv' || o.kind === 'tvroom') {
        // the programme changes now and then: a song (a waltz on an old station) or somebody talking
        if (t > o.progT) { o.prog = o.kind !== 'radio' ? 1 : rnd() < 0.6 ? 0 : 1; o.progT = t + rr(25, 60); o.step = 0; }
        if (o.prog === 0) {
          const st = 60 / 132;
          for (; o.next < ahead; o.next += st, o.step++) {
            const b = o.step % 3, bar = (o.step / 3 | 0) % 8, r = 50 + [0, 5, 7, 0, 5, 7, 2, 0][bar];
            o.vg.gain.setTargetAtTime(0, o.next, 0.05);
            tone(b ? 'triangle' : 'sawtooth', note(b ? r + 7 + (b === 2 ? 5 : 0) : r - 12), o.next, 0.005, b ? 0.06 : 0.12, st * 0.7, o.band);
            if (rnd() < 0.8) tone('triangle', note(62 + PENTA[(o.step * 5 + bar * 3 + (rnd() * 3 | 0)) % 8]), o.next, 0.02, 0.09, st * rr(0.8, 2), o.band);
          }
        } else {
          // syllables: the formants jump, the voice gates in and out, pauses between phrases
          for (; o.next < ahead; o.step++) {
            const a = o.next, dur = rr(0.09, 0.22), pause = o.step % 9 === 8 ? rr(0.3, 0.9) : 0;
            o.f1.frequency.setTargetAtTime(rr(300, 850), a, 0.02); o.f2.frequency.setTargetAtTime(rr(900, 2300), a, 0.02); o.vo.frequency.setTargetAtTime((o.seed % 2 > 1 ? 190 : 115) * rr(0.9, 1.15), a, 0.04);
            o.vg.gain.setTargetAtTime(pause ? 0 : rr(0.25, 0.5), a, 0.015); o.vg.gain.setTargetAtTime(0.02, a + dur * 0.8, 0.02);
            o.next = a + dur + pause;
          }
        }
      } else if (o.kind === 'cook') {
        for (; o.next < ahead; o.next += 0.02) if (rnd() < 0.35) { o.sz.gain.setValueAtTime(rr(0.15, 0.45), o.next); o.sz.gain.setTargetAtTime(0.08, o.next + 0.005, 0.01); }
        if (rnd() < 0.012) tone('sine', rr(1800, 3400), t + 0.1, 0.002, 0.15, 0.5, o.lvl);
      } else if (o.kind === 'whistle') {
        // phrases of a few notes with a glide between them, then a breath
        for (; o.next < ahead;) {
          const a = o.next;
          if (o.step % 8 === 7) { o.wg.gain.setTargetAtTime(0, a, 0.04); o.br.gain.setTargetAtTime(0, a, 0.04); o.next = a + rr(1.5, 4); o.step++; continue; }
          const m = 83 + PENTA[((o.step * 3 + (o.seed | 0)) % 8 + (rnd() * 3 | 0)) % 8], dur = pick([0.22, 0.3, 0.3, 0.45, 0.6]);
          o.wo.frequency.setTargetAtTime(note(m), a, 0.03); o.wg.gain.setTargetAtTime(0.16, a, 0.03); o.br.gain.setTargetAtTime(0.02, a, 0.03);
          o.wg.gain.setTargetAtTime(0.11, a + dur * 0.7, 0.05);
          o.next = a + dur; o.step++;
        }
      }
    }
    // dogs: now and then one howls or barks, and another may answer
    if (t > dogT) {
      const dogs = S.filter((o) => o.kind === 'dog');
      if (dogs.length) {
        const fire = (o, a) => {
          if (rnd() < 0.55) {
            // a howl: a rising voice that hangs and falls away
            const f0 = rr(420, 520), g = G(0, o.lvl), f1 = BQ('bandpass', 900, 3, g), o1 = N(OscillatorNode, { type: 'sawtooth', frequency: f0 }, f1, BQ('bandpass', 1700, 5, g)), dur = rr(1.8, 3.2);
            N(OscillatorNode, { frequency: 5.5 }, G(6, o1.frequency)).stop(a + dur + 0.1);
            o1.frequency.setValueAtTime(f0, a); o1.frequency.linearRampToValueAtTime(f0 * 1.45, a + 0.6); o1.frequency.setValueAtTime(f0 * 1.45, a + dur * 0.7); o1.frequency.linearRampToValueAtTime(f0 * 1.05, a + dur);
            g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(0.5, a + 0.4); g.gain.setValueAtTime(0.5, a + dur * 0.75); g.gain.linearRampToValueAtTime(0, a + dur); o1.stop(a + dur + 0.1);
          } else for (let k = 0, b = a; k < 2 + (rnd() * 4 | 0); k++, b += rr(0.25, 0.5)) { tone('sawtooth', rr(320, 420), b, 0.005, 0.5, 0.12, BQ('bandpass', 800, 1.5, o.lvl), 200); burst(900, 1, b, 0.4, 0.1, o.lvl); }
        };
        const o = pick(dogs); fire(o, t + 0.1);
        if (rnd() < 0.45) fire(pick(dogs), t + rr(1.5, 3.5));
      }
      dogT = t + rr(12, 40);
    }
  };
}
// called on every click / key / touch: builds the graph once and resumes it when the browser allows
function sound() {
  if (!AC) { AC = new AudioContext({ latencyHint: 'playback' }); setInterval(mkSound(AC), 100); }
  if (AC.state === 'suspended' && !document.hidden) AC.resume();
}
const mute = () => { if (!AC) return; muted = !muted; OUT.gain.setTargetAtTime(muted ? 0 : VOL, AC.currentTime, 0.08); };
document.addEventListener('visibilitychange', () => { if (AC) document.hidden ? AC.suspend() : AC.resume(); });
