// ============================================================================
// audio: the night outside, synthesised (no sample files)
// ============================================================================
// A fixed Web Audio graph, built on the first click / key / touch and driven by a 10 Hz timer, not the frame loop.
// Layers: wind (follows the gusts, whistles in the strong ones), the hum of the town, cars on the far road, the train
// (rumble, wheels over the rail joints, horn), the buzz of the failing lamp, the creak of the swing; and in the room
// the window glass muffles all of it and a clock ticks.
let AC, OUT, muted = false;
const VOL = 0.8; // master level
function mkSound(ac) {
  const sr = ac.sampleRate;
  // node of class C with options o, connected to every node / param in `to`; sources start at once
  const N = (C, o, ...to) => { const n = new C(ac, o); for (const d of to) n.connect(d); if (n.start) n.start(); return n; };
  const G = (gain, ...to) => N(GainNode, { gain }, ...to);
  const BQ = (type, frequency, Q, ...to) => N(BiquadFilterNode, { type, frequency, Q }, ...to);
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
  // cars on the far road: each a band of tyre noise with its own place in the stereo field
  const cars = [0, 1, 2, 3].map(() => { const p = pan(glass), g = G(0, p), f = BQ('bandpass', 600, 0.8, g); return { p, g, f }; });
  src(nw, 0.71, ...cars.map((c) => c.f));
  // the train: rumble, the wheels over the joints, the horn
  const trP = pan(glass, G(0.4, wet)), trG = G(0, trP), trF = BQ('lowpass', 300, 0.7, trG), clk = G(0, trP), horn = G(0, trP, G(1.2, wet)), hornF = BQ('lowpass', 1300, 0.7, horn);
  src(nb, 1.31, trF); src(nw, 1.13, BQ('bandpass', 480, 1.4, clk));
  for (const f of [311, 370]) N(OscillatorNode, { type: 'sawtooth', frequency: f }, hornF);
  // the failing lamp buzzes at the mains' pitch; the swing creaks; the clock in the room
  const bz = G(0, glass); N(OscillatorNode, { type: 'sawtooth', frequency: 100 }, BQ('bandpass', 2600, 2.5, bz));
  const cr = G(0, glass, G(0.7, wet)), crO = N(OscillatorNode, { type: 'triangle', frequency: 800 }, BQ('bandpass', 1500, 3, cr));
  const tick = G(0, out), tickF = BQ('bandpass', 3000, 7, tick); src(nw, 0.9, tickF);

  let lt = ac.currentTime, tClk = 0, tHorn = -1, tCr = lt + 2, tTick = lt + 1, nTick = 0, was = 0;
  out.gain.setTargetAtTime(VOL, lt, 1.5);
  return () => {
    const now = ac.currentTime, t = now + 0.05;
    if (now <= lt) return;
    lt = now;
    const gu = F[GUST], inr = F[INR], cx = F[CX], cz = F[CZ], rx = cos(F[YAW]), rz = sin(F[YAW]);
    glass.frequency.setTargetAtTime(mix(16000, 420, inr), t, 0.12); pane.gain.setTargetAtTime(mix(1, 0.6, inr), t, 0.12);
    wind.gain.setTargetAtTime(0.1 + 0.8 * gu * gu, t, 0.4); windF.frequency.setTargetAtTime(240 + 760 * gu, t, 0.5);
    whis.gain.setTargetAtTime(0.5 * sstep(0.5, 0.95, gu), t, 0.3); whisF.frequency.setTargetAtTime(880 + 520 * gu, t, 0.5);
    cars.forEach((c, k) => {
      const dx = F[RC + k * 3] - cx, dz = ROADZ - cz, d = hypot(dx, dz);
      c.g.gain.setTargetAtTime(F[RC + k * 3 + 2] * 22 / (40 + d), t, 0.3); c.f.frequency.setTargetAtTime(350 + 9e4 / (d + 60), t, 0.3); c.p.pan.setTargetAtTime(clamp((dx * rx + dz * rz) / d, -1, 1), t, 0.2);
    });
    {
      const on = F[TRON], dx = clamp(cx, F[TRX] - 11, F[TRX] + 224) - cx, dz = RAILZ - cz, d = hypot(dx, dz), L = on * 80 / (80 + d);
      trG.gain.setTargetAtTime(L * 1.5, t, 0.5); trF.frequency.setTargetAtTime(160 + 3e4 / (d + 30), t, 0.5); trP.pan.setTargetAtTime(clamp(((F[TRX] + 106 - cx) * rx + dz * rz) / hypot(F[TRX] + 106 - cx, dz), -1, 1), t, 0.3);
      if (on) {
        // two axles of two bogies per car length
        if (!was) { tClk = t; tHorn = t + 5; }
        for (; tClk < t + 0.15; tClk += 23.6 / TRAINV) for (const o of [0, 0.11, 0.62, 0.73]) { const a = tClk + o; if (a > t) { clk.gain.setValueAtTime(L * 1.3, a); clk.gain.exponentialRampToValueAtTime(0.001, a + 0.06); } }
        if (tHorn > 0 && t > tHorn) {
          // one long call on the way in, a short one later
          const n = 1.6, v = 0.05 + 0.1 * L; horn.gain.setValueAtTime(0, t); horn.gain.linearRampToValueAtTime(v, t + 0.08); horn.gain.setValueAtTime(v, t + n); horn.gain.linearRampToValueAtTime(0, t + n + 0.3);
          tHorn = -1;
        }
      }
      was = on;
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
  };
}
// called on every click / key / touch: builds the graph once and resumes it when the browser allows
function sound() {
  if (!AC) { AC = new AudioContext({ latencyHint: 'playback' }); setInterval(mkSound(AC), 100); }
  if (AC.state === 'suspended' && !document.hidden) AC.resume();
}
const mute = () => { if (!AC) return; muted = !muted; OUT.gain.setTargetAtTime(muted ? 0 : VOL, AC.currentTime, 0.08); };
document.addEventListener('visibilitychange', () => { if (AC) document.hidden ? AC.suspend() : AC.resume(); });
