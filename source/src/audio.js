// ============================================================================
// audio: the night outside, synthesised (no sample files)
// ============================================================================
// A fixed Web Audio graph, built on the first click / key / touch and driven by a 10 Hz timer, not the frame loop.
// Layers: wind (follows the gusts, whistles in the strong ones), the hum of the town, the highway (tyres, and the
// engines of the trucks and buses), the trains (rumble, wheels over the rail joints, horn; the freight train heavier
// and slower), an aeroplane high up, the buzz of the failing lamp, the creak of the swing; and the sounds of the yard
// placed where they come from (world.js lists them in Wd.snd): music in two cars by the doors, radios and cooking and
// televisions behind some windows, people whistling on the roofs, dogs in the private houses, the hum of the
// transformer and of the lift machinery, the creak of the roundabout, a janitor's scraper, a taxi idling, a car alarm,
// somebody drunk singing on his way, crows, the church bell, the bell of the level crossing, drips off the icicles; and
// a salute far away, heard late. In the room the window glass muffles all of it and a clock ticks.
let AC, OUT, muted = false;
const VOL = 0.8; // master level
function mkSound(ac) {
  const sr = ac.sampleRate;
  // node of class C with options o, connected to every node / param in `to`; sources start at once
  // (while a placed sound is being woken up, every node made goes on its list, to be stopped when it is put to sleep)
  let made = null;
  const N = (C, o, ...to) => { const n = new C(ac, o); for (const d of to) n.connect(d); if (n.start) n.start(); if (made) made.push(n); return n; };
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
  // (the wind, its whistle and the blizzard's moan go through one soft lowpass, closed down in a blizzard so the storm
  // is a muffled roar round the house, not a hiss in the ears)
  const storm = BQ('lowpass', 6000, 0.5, glass);
  const wind = G(0, storm), windF = BQ('bandpass', 400, 0.6, wind), low = G(0.09, glass), whis = G(0, storm), whisF = BQ('bandpass', 1100, 24, whis);
  src(nw, 1, windF, whisF); src(nb, 1, BQ('lowpass', 170, 0.7, low)); lfo(0.07, 0.05, low.gain); lfo(0.19, 0.25, G(60, whisF.frequency));
  // the town: far traffic and machinery, too low to place
  // a blizzard moans round the corners
  const howl = G(0, storm), howlF = BQ('bandpass', 360, 1.6, howl); src(nb, 1.9, howlF); lfo(0.11, 120, howlF.frequency);
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
  const KIND = { tvroom: [2.5, 40, 0], music: [7, 70, 0.25], radio: [5, 40, 0.2], cook: [3.5, 25, 0.1], tv: [4, 30, 0.15], whistle: [14, 120, 0.6], dog: [45, 400, 1.4],
    hum: [3, 30, 0], creak: [7, 70, 0.7], scrape: [10, 90, 0.6], idle: [5, 45, 0.2], alarm: [35, 300, 1], drunk: [12, 110, 0.6], crow: [25, 220, 1], bell: [160, 700, 1.6],
    xing: [30, 300, 0.8], drip: [2.5, 18, 0.3], lift: [3.5, 30, 0.2], club: [22, 320, 0.5], chat: [4.5, 45, 0.15], flag: [7, 60, 0.3],
    // riding with the actors of life.js
    tyres: [6, 80, 0.15], engine: [8, 110, 0.2], plough: [12, 160, 0.4], siren: [45, 500, 1.1], tram: [12, 180, 0.4], steps: [2.5, 22, 0], bark: [45, 400, 1.4],
    // the new places, and the flat (heard from inside it: see IN)
    fire: [3, 30, 0.1], rinkmusic: [16, 230, 0.7], kids: [10, 120, 0.5], fridge: [1.6, 12, 0], tap: [1.4, 10, 0], neigh: [3, 18, 0], liftin: [3, 20, 0], kettle: [1.8, 14, 0] };
  // what is in the flat: through the room's bus, muffled from outside
  const IN = ['tvroom', 'fridge', 'tap', 'neigh', 'liftin', 'kettle'];
  const note = (m) => 440 * 2 ** ((m - 69) / 12);
  // an envelope on a gain: up in a, down over d
  const env = (p, t, a, v, d) => { p.setValueAtTime(0.0001, t); p.linearRampToValueAtTime(v, t + a); p.exponentialRampToValueAtTime(0.0001, t + a + d); };
  // a short voice: oscillator of type `ty` at f through `to`, enveloped, stopping by itself
  const tone = (ty, f, t, a, v, d, to, f2) => { const g = G(0, to), o = N(OscillatorNode, { type: ty, frequency: f }, g); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d); env(g.gain, t, a, v, d); o.stop(t + a + d + 0.05); return o; };
  const burst = (f, q, t, v, d, to, type = 'bandpass') => { const g = G(0, to), s = N(AudioBufferSourceNode, { buffer: nw, playbackRate: 1 }, BQ(type, f, q, g)); s.stop(t + d + 0.05); env(g.gain, t, 0.002, v, d); };
  // the sounds of the world (Wd.snd: kind, x, y, z, a walker, which television), then those riding with an actor (ASND).
  // There are some two hundred of them; were all their voices running at once, the audio thread would have no time left
  // and the sound would break up. So each one's nodes are made only when it comes within hearing (wake) and stopped
  // and let go when it goes out of it (sleep).
  const S = Wd.snd.concat(ASND.map(([kind, a]) => [kind, 0, 0, 0, 0, -1, a])).map(([kind, x, y, z, w, tv = -1, a = 0], i) => {
    const [R, far, wv] = KIND[kind];
    return { kind, x, y, z, w, tv, a, R, far, wv, i, nodes: null, next: 0, step: 0, seed: i * 7.31 + 1, on: 0, px: 0, pz: 0, v: 0 };
  });
  const sleep = (o, t) => {
    const L = o.nodes; o.nodes = null; o.next = 0; o.lvl.gain.setTargetAtTime(0, t, 0.03);
    setTimeout(() => { for (const n of L) { try { if (n.stop) n.stop(); } catch (e) { /* already stopped */ } n.disconnect(); } }, 250);
  };
  const wake = (o) => {
    made = [];
    const { kind, i } = o, p = (o.p = IN.includes(kind) ? pan(room) : pan(glass, G(o.wv, wet))), lvl = (o.lvl = G(0, p));
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
    } else if (kind === 'hum') {
      // the transformer: the mains hum and its harmonics, a little buzz
      for (const [f, v] of [[100, 0.12], [200, 0.06], [300, 0.02]]) OSC('sine', f, G(v, lvl));
      OSC('sawtooth', 100, BQ('bandpass', 1800, 4, G(0.015, lvl)));
    } else if (kind === 'lift') {
      // the lift motor under its roof: a low drone that rises while the car moves
      o.mg = G(0.05, lvl); OSC('sawtooth', 50, BQ('lowpass', 160, 1, o.mg)); o.wh = G(0, lvl); OSC('sine', 330, o.wh);
    } else if (kind === 'idle') {
      // an engine idling: a low throb
      o.f = BQ('lowpass', 150, 1, lvl); const e = OSC('sawtooth', 31, G(0.3, o.f)); lfo(0.37, 1.2, e.frequency);
      const am = G(0.15, o.f); src(nb, 1.6, am); lfo(15.5, 0.2, am.gain);
    } else if (kind === 'alarm') {
      o.ag = G(0, lvl); o.ao = OSC('square', 800, BQ('bandpass', 1400, 1.5, o.ag));
    } else if (kind === 'club') {
      // the club: the music through its walls, only the low end gets out unless one stands at the door
      o.f = BQ('lowpass', 260, 1.1, lvl);
    } else if (kind === 'chat') {
      // people talking outside: two voices taking turns, now and then a laugh
      o.f = BQ('bandpass', 900, 0.6, lvl);
      o.v = [140, 220].map((f) => { const g = G(0, o.f), vo = OSC('sawtooth', f, BQ('bandpass', 600, 5, g), BQ('bandpass', 1500, 7, g)); return { g, vo }; }); o.who = 0;
    } else if (kind === 'tyres' || kind === 'engine' || kind === 'plough') {
      // tyres on the wet street; a diesel under them for the bus and the plough, the blade scraping for the plough
      o.f = BQ('bandpass', 520, 0.7, lvl); src(nw, 0.77 + i * 0.003, G(kind === 'tyres' ? 0.5 : 0.35, o.f));
      if (kind !== 'tyres') { const e = OSC('sawtooth', kind === 'engine' ? 38 : 33, BQ('lowpass', 170, 1.2, G(0.7, lvl))); lfo(0.5 + i * 0.01, 2, e.frequency); }
      if (kind === 'plough') { const sc = G(0.25, lvl); src(nw, 1.21, BQ('bandpass', 1300, 1.5, sc)); lfo(0.9, 0.12, sc.gain); }
    } else if (kind === 'siren') {
      // the ambulance's two tones
      o.sg = G(0, lvl); o.so = OSC('square', 650, BQ('bandpass', 1100, 1.2, o.sg));
    } else if (kind === 'tram') {
      // the rumble of the bogies, the whine of the motors with the speed, the wheels over the joints
      o.rg = G(0, lvl); src(nb, 1.05, BQ('lowpass', 260, 0.8, o.rg)); o.wg = G(0, lvl); o.wo = OSC('sawtooth', 200, BQ('bandpass', 700, 4, o.wg));
    } else if (kind === 'fire') {
      // the fire in the barrel: a soft roar, the wood cracking
      src(nb, 1.4, BQ('lowpass', 380, 0.7, G(0.6, lvl)));
    } else if (kind === 'rinkmusic') {
      // a horn loudspeaker on a pole: a narrow, rattling band
      o.f = BQ('bandpass', 1300, 1.1, lvl); o.band = N(WaveShaperNode, { curve: new Float32Array([...Array(64).keys()].map((k) => Math.tanh((k / 31.5 - 1) * 2.5))) }, o.f);
    } else if (kind === 'fridge') {
      o.hg = G(0, lvl); for (const [f, v] of [[50, 0.5], [100, 0.3], [150, 0.08]]) OSC('sine', f, G(v, o.hg)); OSC('sawtooth', 100, BQ('bandpass', 2300, 6, G(0.02, o.hg)));
    } else if (kind === 'neigh' || kind === 'liftin') {
      // through the wall: only what is low gets in
      o.f = BQ('lowpass', 380, 0.8, lvl); o.vg = G(0, o.f); o.vo = OSC('sawtooth', 120, (o.f1 = BQ('bandpass', 500, 5, o.vg)), (o.f2 = BQ('bandpass', 1100, 6, o.vg)));
      o.dg = G(0, o.f); OSC('sawtooth', 115, BQ('bandpass', 240, 3, o.dg)); o.mg = G(0, o.f); OSC('sawtooth', 48, BQ('lowpass', 140, 1, o.mg));
    } else if (kind === 'kettle') {
      // the water heating up, then the whistle
      o.hg = G(0, lvl); src(nw, 0.62, BQ('bandpass', 900, 0.9, o.hg)); o.wg = G(0, lvl); o.wo = OSC('sine', 2250, o.wg); lfo(6.5, 22, o.wo.frequency);
    } else if (kind === 'drunk') {
      // a man's voice through two formants, slurring from note to note
      o.vg = G(0, lvl); o.vo = OSC('sawtooth', 110, (o.f1 = BQ('bandpass', 600, 5, o.vg)), (o.f2 = BQ('bandpass', 1100, 7, o.vg)));
    }
    o.nodes = made; made = null;
  };
  // whistled phrases: a pentatonic walk, the same few motifs coming back
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
  let dogT = ac.currentTime + 8, forT = ac.currentTime + 5;
  // the salute: the same bursts as the sky shader draws (h33 there), heard d / 340 s later from the north-west
  const h33 = (x, y, z) => {
    let a = fract(x * 0.1031), b = fract(y * 0.1030), c = fract(z * 0.0973); const d = a * (b + 33.33) + b * (a + 33.33) + c * (c + 33.33); a += d; b += d; c += d;
    return [fract((a + a) * c), fract((a + b) * b), fract((b + a) * a)];
  };
  const salP = pan(glass, G(1.2, wet)), salG = G(0.5, salP); let salDone = -1;

  let lt = ac.currentTime, tClk = 0, tHorn = -1, tCr = lt + 2, tTick = lt + 1, nTick = 0, was = 0, wasK = 0;
  out.gain.setTargetAtTime(VOL, lt, 1.5);
  return () => {
    const now = ac.currentTime, t = now + 0.05;
    if (now <= lt) return;
    lt = now;
    const gu = F[GUST], inr = F[INR], cx = F[CX], cy = F[CY], cz = F[CZ], rx = cos(F[YAW]), rz = sin(F[YAW]);
    const side = (dx, dz) => clamp((dx * rx + dz * rz) / (hypot(dx, dz) + 1e-3), -1, 1);
    glass.frequency.setTargetAtTime(mix(16000, 420, inr), t, 0.12); room.frequency.setTargetAtTime(mix(500, 16000, inr), t, 0.12); pane.gain.setTargetAtTime(mix(1, 0.6, inr), t, 0.12);
    // a blizzard is heard soft: the gale at under a third of what the wind would make it (bq), its gusts swelling slowly
    // instead of striking, its band kept low, the thin whistle all but gone, the moan low and broad, all of it muffled
    const bl = F[BLZ], bq = 1 - 0.72 * bl;
    storm.frequency.setTargetAtTime(mix(6000, 1300, bl), t, 0.8);
    wind.gain.setTargetAtTime((0.1 + 0.8 * gu * gu) * bq, t, 0.4 + 0.9 * bl); windF.frequency.setTargetAtTime(240 + 760 * gu * (1 - 0.5 * bl), t, 0.5 + 0.5 * bl);
    whis.gain.setTargetAtTime(0.5 * sstep(0.5, 0.95, gu) * (1 - 0.85 * bl), t, 0.3 + 0.6 * bl); howl.gain.setTargetAtTime(0.35 * bl, t, 0.8); whisF.frequency.setTargetAtTime(880 + 520 * gu, t, 0.5);
    cars.forEach((c, k) => {
      const o = RC + k * 4, dz = ROADZ + 1.8 * F[o + 1] - cz, dx = F[o] - cx, d = hypot(dx, dz), on = F[o + 2], big = F[o + 3] > 4 ? 1 : 0, heavy = F[o + 3] === 5 || F[o + 3] === 6 || F[o + 3] === 8 || F[o + 3] > 9;
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
      if (o.w) { const p = walkAt(o.w, F[TIME]); o.x = p[0]; o.z = p[1]; }
      let gate = o.tv >= 0 ? (FLAT.tv[o.tv] ? 1 : 0) : 1;
      if (o.a) {
        const k = o.a * 8, nx = ACT[k], nz = ACT[k + 2]; gate = ACT[k + 1] > -50 && ACT[k + 7] > 0.5 ? 1 : 0;
        o.v = mix(o.v, min(hypot(nx - o.px, nz - o.pz) / 0.1, 30), 0.3); o.px = nx; o.pz = nz; o.x = nx; o.y = ACT[k + 1] + 1; o.z = nz;
      }
      const dx = o.x - cx, dy = o.y - cy, dz = o.z - cz, d = hypot(dx, dy, dz), lv = gate / (1 + (d / o.R) ** 2), near = d < o.far && gate > 0;
      // asleep until within hearing, put to sleep a little beyond it (so one standing on the edge does not flip it)
      if (!o.nodes) { if (!near) continue; wake(o); }
      else if (!gate || d > o.far * 1.15) { sleep(o, t); continue; }
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
        // the flat's televisions play what their channel shows: music for the concert and the film, talk for the rest
        const ch = o.kind === 'tvroom' ? FLAT.tv[o.tv] : -1;
        if (ch >= 0) { const p = ch === 2 || ch === 4 ? 0 : 1; if (p !== o.prog || ch !== o.ch) { o.prog = p; o.ch = ch; o.step = 0; o.next = t; } }
        else if (t > o.progT) { o.prog = o.kind !== 'radio' ? 1 : rnd() < 0.6 ? 0 : 1; o.progT = t + rr(25, 60); o.step = 0; }
        if (o.prog === 0) {
          // a waltz; the concert is a quicker song in four
          const bt = o.ch === 2 ? 4 : 3, st = 60 / (o.ch === 2 ? 150 : 132);
          for (; o.next < ahead; o.next += st, o.step++) {
            const b = o.step % bt, bar = (o.step / bt | 0) % 8, r = 50 + (o.ch === 2 ? [0, 0, 5, 5, 7, 7, 3, 5] : [0, 5, 7, 0, 5, 7, 2, 0])[bar];
            if (o.ch === 2 && (b === 0 || b === 2)) burst(b ? 1800 : 160, b ? 0.9 : 1.2, o.next, b ? 0.08 : 0.16, 0.12, o.band);
            o.vg.gain.setTargetAtTime(0, o.next, 0.05);
            tone(b ? 'triangle' : 'sawtooth', note(b ? r + 7 + (b === 2 ? 5 : 0) : r - 12), o.next, 0.005, b ? 0.06 : 0.12, st * 0.7, o.band);
            if (rnd() < 0.8) tone('triangle', note(62 + PENTA[(o.step * 5 + bar * 3 + (rnd() * 3 | 0)) % 8]), o.next, 0.02, 0.09, st * rr(0.8, 2), o.band);
          }
        } else {
          // syllables: the formants jump, the voice gates in and out, pauses between phrases
          for (; o.next < ahead; o.step++) {
            const a = o.next, dur = rr(0.09, 0.22), pause = o.step % 9 === 8 ? rr(0.3, 0.9) : 0;
            o.f1.frequency.setTargetAtTime(rr(300, 850), a, 0.02); o.f2.frequency.setTargetAtTime(rr(900, 2300), a, 0.02); o.vo.frequency.setTargetAtTime((o.ch === 3 ? ((o.step / 9 | 0) & 1 ? 205 : 112) : o.seed % 2 > 1 ? 190 : 115) * rr(0.9, 1.15), a, 0.04);
            o.vg.gain.setTargetAtTime(pause ? 0 : rr(0.25, 0.5), a, 0.015); o.vg.gain.setTargetAtTime(0.02, a + dur * 0.8, 0.02);
            o.next = a + dur + pause;
          }
        }
      } else if (o.kind === 'cook') {
        for (; o.next < ahead; o.next += 0.02) if (rnd() < 0.35) { o.sz.gain.setValueAtTime(rr(0.15, 0.45), o.next); o.sz.gain.setTargetAtTime(0.08, o.next + 0.005, 0.01); }
        if (rnd() < 0.012) tone('sine', rr(1800, 3400), t + 0.1, 0.002, 0.15, 0.5, o.lvl);
      } else if (o.kind === 'creak') {
        // the roundabout: a groan of its bearing when the wind shoves it
        if (rnd() < 0.05 * sstep(0.3, 0.9, gu)) { const f = rr(380, 620); tone('triangle', f, t + 0.05, 0.08, 0.5, rr(0.4, 0.9), BQ('bandpass', 900, 3, o.lvl), f * rr(0.7, 1.3)); }
      } else if (o.kind === 'scrape') {
        // a scraper pushed over the asphalt: strokes, and a pause to throw the snow aside
        for (; o.next < ahead; o.step++) {
          const a = o.next; if (o.step % 6 === 5) { o.next = a + rr(1.5, 3.5); continue; }
          burst(rr(900, 1600), 1.2, a, 0.35, rr(0.45, 0.8), o.lvl); burst(300, 1, a, 0.25, 0.5, o.lvl, 'lowpass'); o.next = a + rr(0.9, 1.3);
        }
      } else if (o.kind === 'idle') {
        o.f.frequency.setTargetAtTime(120 + 300 / (1 + d * 0.3), t, 0.3);
      } else if (o.kind === 'alarm') {
        const on = F[EVL] > 0; o.ag.gain.setTargetAtTime(on ? 0.35 : 0, t, 0.02);
        if (on) for (let k = 0; k < 2; k++) { const a = t + k * 0.05; o.ao.frequency.setValueAtTime(700, a); o.ao.frequency.linearRampToValueAtTime(1500, a + 0.045); }
      } else if (o.kind === 'lift') {
        if (rnd() < 0.006) {
          const a = t + 0.05, n = rr(6, 14); o.mg.gain.setTargetAtTime(0.16, a, 0.6); o.mg.gain.setTargetAtTime(0.05, a + n, 0.6); o.wh.gain.setTargetAtTime(0.02, a, 0.8); o.wh.gain.setTargetAtTime(0, a + n, 0.5);
          burst(200, 1, a, 0.6, 0.12, o.lvl, 'lowpass'); burst(220, 1, a + n, 0.6, 0.12, o.lvl, 'lowpass');
        }
      } else if (o.kind === 'tyres' || o.kind === 'engine' || o.kind === 'plough') {
        o.f.frequency.setTargetAtTime(300 + 40 * o.v + 6e3 / (d + 15), t, 0.3);
      } else if (o.kind === 'siren') {
        for (; o.next < ahead; o.next += 0.62) { o.step ^= 1; o.so.frequency.setValueAtTime(o.step ? 950 : 650, o.next); o.sg.gain.setTargetAtTime(0.4, o.next, 0.01); }
      } else if (o.kind === 'tram') {
        o.rg.gain.setTargetAtTime(0.15 + 0.09 * o.v, t, 0.3); o.wg.gain.setTargetAtTime(0.012 * o.v, t, 0.3); o.wo.frequency.setTargetAtTime(160 + 70 * o.v, t, 0.3);
        if (o.v > 1) for (; o.next < ahead; o.next += 12.5 / max(o.v, 1)) for (const dt of [0, 0.09]) burst(rr(300, 500), 1.3, o.next + dt, 0.5, 0.05, o.lvl);
        else o.next = t;
        // the bell as it moves off
        if (o.v > 0.4 && !o.on) { for (const dt of [0, 0.35]) { tone('sine', 1560, t + dt, 0.002, 0.3, 0.9, o.lvl); tone('sine', 3900, t + dt, 0.002, 0.08, 0.4, o.lvl); } }
        o.on = o.v > 0.4 ? 1 : o.v < 0.1 ? 0 : o.on;
      } else if (o.kind === 'steps') {
        // footsteps in the snow, two to a stride
        const k = o.a * 8, r = ACT[k + 4] / PI;
        if (r > 0.1) for (; o.next < ahead; o.next += 1 / r) { burst(rr(1800, 3000), 1.2, o.next, 0.3, 0.07, o.lvl); burst(rr(300, 500), 1, o.next, 0.25, 0.06, o.lvl, 'lowpass'); }
        else o.next = t;
      } else if (o.kind === 'fire') {
        for (; o.next < ahead; o.next += rr(0.04, 0.4)) burst(rr(1500, 5000), 1.5, o.next, rr(0.08, 0.5), rr(0.005, 0.02), o.lvl);
      } else if (o.kind === 'rinkmusic') {
        // an old waltz off a record, round and round
        const st = 60 / 150;
        for (; o.next < ahead; o.next += st, o.step++) {
          const b = o.step % 3, bar = (o.step / 3 | 0) % 16, r = 52 + [0, 0, 5, 5, 7, 7, 0, 0, 2, 2, 7, 7, 5, 4, 2, 0][bar], m = [12, 16, 19, 16, 14, 12, 11, 12][(o.step / 3 | 0) % 8];
          tone(b ? 'triangle' : 'sawtooth', note(b ? r + 4 + (b === 2 ? 3 : 0) : r - 12), o.next, 0.006, b ? 0.08 : 0.16, st * 0.7, o.band);
          if (b === 0 || rnd() < 0.4) tone('square', note(r + m), o.next, 0.02, 0.07, st * (b ? 0.9 : 2.4), o.band);
        }
      } else if (o.kind === 'kids') {
        // children shouting and laughing now and then
        if (rnd() < 0.05) for (let k = 0, a = t + 0.05; k < 2 + (rnd() * 4 | 0); k++, a += rr(0.12, 0.3)) { const f = rr(520, 900); tone('sawtooth', f, a, 0.02, rr(0.1, 0.25), rr(0.1, 0.3), BQ('bandpass', 1600, 2.5, o.lvl), f * rr(0.7, 1.3)); }
      } else if (o.kind === 'fridge') {
        // the compressor: on for a while, then off, with a shudder each time
        const on = fract(F[TIME] / 75 + o.seed) < 0.6; o.hg.gain.setTargetAtTime(on ? 0.22 : 0, t, on ? 0.6 : 0.2);
        if (on !== !!o.on) { burst(160, 1, t + 0.05, 0.5, 0.25, o.lvl, 'lowpass'); o.on = on ? 1 : 0; }
      } else if (o.kind === 'neigh') {
        // the neighbours: somebody upstairs walking about, a quarrel, a drill, a television through the wall
        if (t > o.step) {
          const e = rnd(); o.step = t + rr(14, 40); o.ev = e < 0.3 ? 1 : e < 0.55 ? 2 : e < 0.75 ? 3 : 4; o.end = t + rr(4, 12);
        }
        if (o.ev && t < o.end) for (; o.next < ahead;) {
          const a = o.next;
          if (o.ev === 1) { burst(rr(70, 110), 1, a, 0.9, 0.12, o.f, 'lowpass'); o.next = a + rr(0.45, 0.7); }
          else if (o.ev === 2 || o.ev === 4) { const dur = rr(0.1, 0.25); o.vo.frequency.setTargetAtTime((o.ev === 2 ? rr(160, 260) : rr(100, 150)), a, 0.03); o.f1.frequency.setTargetAtTime(rr(300, 800), a, 0.02); o.vg.gain.setTargetAtTime(o.ev === 2 ? rr(0.4, 0.9) : 0.3, a, 0.02); o.vg.gain.setTargetAtTime(0.03, a + dur * 0.8, 0.02); o.next = a + dur + (rnd() < 0.1 ? rr(0.3, 1) : 0); }
          else { o.dg.gain.setTargetAtTime(0.6, a, 0.05); o.dg.gain.setTargetAtTime(0, a + rr(1.5, 3), 0.05); o.next = a + rr(3, 4.5); }
        }
        else { o.vg.gain.setTargetAtTime(0, t, 0.1); o.dg.gain.setTargetAtTime(0, t, 0.1); o.ev = 0; o.next = t; }
      } else if (o.kind === 'liftin') {
        // the lift behind the front door: the motor runs, the doors bang; somebody going up the stairs
        if (rnd() < 0.005) { const a = t + 0.05, n = rr(6, 12); o.mg.gain.setTargetAtTime(0.5, a, 0.5); o.mg.gain.setTargetAtTime(0, a + n, 0.5); burst(180, 1, a, 0.9, 0.15, o.f, 'lowpass'); burst(200, 1, a + n + 0.4, 0.9, 0.15, o.f, 'lowpass'); }
        if (rnd() < 0.004) for (let k = 0; k < 10; k++) burst(rr(90, 140), 1, t + 0.1 + k * 0.5, 0.6 * sin((k + 1) / 11 * PI), 0.08, o.f, 'lowpass');
      } else if (o.kind === 'kettle') {
        const boil = FLAT.kettle === 2 ? F[TIME] - FLAT.boil : -1;
        o.hg.gain.setTargetAtTime(FLAT.kettle ? 0.04 + 0.3 * F[KET] * F[KET] : 0, t, 0.5);
        o.wg.gain.setTargetAtTime(boil > 21 ? 0.12 * sstep(21, 24, boil) : 0, t, 0.15);
      } else if (o.kind === 'drip' || o.kind === 'tap') {
        for (; o.next < ahead;) { const a = o.next, f = rr(1600, 3200); tone('sine', f, a, 0.001, rr(0.1, 0.3), 0.06, o.lvl, f * 0.8); o.next = a + rr(0.4, 2.8); }
      } else if (o.kind === 'crow') {
        if (o.step < t && rnd() < 0.03) {
          for (let k = 0, a = t + 0.1; k < 2 + (rnd() * 3 | 0); k++, a += rr(0.35, 0.6)) { const f = rr(330, 420); tone('sawtooth', f, a, 0.02, 0.4, 0.28, BQ('bandpass', 1300, 2.5, o.lvl), f * 0.75); burst(1600, 1, a, 0.25, 0.25, o.lvl); }
          o.step = t + rr(15, 45);
        }
      } else if (o.kind === 'bell') {
        // the church bell: a few strikes every few minutes, inharmonic partials, a long ring
        if (o.next < t + 0.1) {
          if (o.step > 0) {
            for (const [m, v, dd] of [[1, 0.5, 4.5], [2, 0.3, 3], [2.4, 0.22, 2.5], [3, 0.15, 2], [4.2, 0.1, 1.4], [0.5, 0.25, 5]]) tone('sine', 196 * m, t + 0.05, 0.003, v, dd, o.lvl);
            o.step--; o.next = t + 2.2;
          } else { o.step = 5 + (rnd() * 8 | 0); o.next = t + rr(120, 240); }
        }
      } else if (o.kind === 'xing') {
        if (F[EVX] > 0) for (; o.next < ahead; o.next += 0.5) { tone('sine', 1250, o.next, 0.002, 0.5, 0.35, o.lvl); tone('sine', 2650, o.next, 0.002, 0.2, 0.2, o.lvl); }
        else o.next = 0;
      } else if (o.kind === 'club') {
        // four to the floor, a bass on the off-beats, open hats, a chord every two bars
        o.f.frequency.setTargetAtTime(240 + 2600 / (1 + d * 0.35), t, 0.3);
        const st = 60 / 126 / 4;
        for (; o.next < ahead; o.next += st, o.step++) {
          const s = o.step & 15, bar = (o.step >> 4) & 7, r = 33 + [0, 0, 3, 3, 5, 5, -2, -2][bar], a = o.next;
          if (!(s & 3)) tone('sine', 150, a, 0.002, 1.1, 0.22, o.f, 40);
          if ((s & 3) === 2) { tone('sawtooth', note(r), a, 0.004, 0.35, st * 1.7, o.f); burst(9000, 0.7, a, 0.07, 0.06, o.f, 'highpass'); }
          if (s === 4 || s === 12) burst(1800, 0.9, a, 0.3, 0.12, o.f);
          if (s === 0 && !(bar & 1)) for (const iv of [24, 27, 31]) tone('square', note(r + iv), a, 0.01, 0.05, st * 6, o.f);
        }
      } else if (o.kind === 'chat') {
        for (; o.next < ahead; o.step++) {
          const a = o.next, v = o.v[o.who];
          // they talk for a while, then stand quiet
          if (o.step > (o.len || 30)) { v.g.gain.setTargetAtTime(0, a, 0.05); o.step = 0; o.len = 25 + (rnd() * 70 | 0); o.next = a + rr(3, 15); continue; }
          if (o.step % 7 === 6) { v.g.gain.setTargetAtTime(0, a, 0.03); o.who ^= 1; o.next = a + rr(0.2, 0.9); continue; }
          if (rnd() < 0.04) { // a laugh: short bursts falling in pitch
            for (let k = 0; k < 4; k++) { const b = a + k * 0.16; v.vo.frequency.setValueAtTime(v.vo.frequency.value * 1.3 * (1 - k * 0.06), b); v.g.gain.setValueAtTime(0.45, b); v.g.gain.setTargetAtTime(0.02, b + 0.08, 0.02); }
            o.next = a + 0.7; continue;
          }
          const dur = rr(0.08, 0.2); v.vo.frequency.setTargetAtTime((o.who ? 215 : 125) * rr(0.88, 1.18), a, 0.03);
          v.g.gain.setTargetAtTime(rr(0.18, 0.4), a, 0.015); v.g.gain.setTargetAtTime(0.03, a + dur * 0.8, 0.02); o.next = a + dur;
        }
      } else if (o.kind === 'flag') {
        // the cloth flapping and cracking in the gusts
        for (; o.next < ahead; o.next += 0.06) if (rnd() < 0.15 + 0.6 * gu) burst(rr(250, 650), 1.2, o.next, 0.08 + 0.5 * gu * gu, rr(0.04, 0.1), o.lvl);
      } else if (o.kind === 'drunk') {
        // phrases of a song, slurred, then a pause
        for (; o.next < ahead; o.step++) {
          const a = o.next;
          if (o.step % 12 === 11) { o.vg.gain.setTargetAtTime(0, a, 0.1); o.next = a + rr(3, 9); continue; }
          const m = 45 + [0, 3, 5, 7, 5, 3, 0, -2][(o.step + (o.seed | 0)) % 8] + (rnd() < 0.2 ? rr(-1, 1) : 0), dur = rr(0.35, 0.8);
          o.vo.frequency.setTargetAtTime(note(m), a, 0.08); o.f1.frequency.setTargetAtTime(rr(450, 800), a, 0.05); o.f2.frequency.setTargetAtTime(rr(900, 1500), a, 0.05);
          o.vg.gain.setTargetAtTime(rr(0.3, 0.55), a, 0.05); o.vg.gain.setTargetAtTime(0.12, a + dur * 0.8, 0.08); o.next = a + dur;
        }
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
    // the salute: each burst a thump and a crackle, late by the distance
    const sq = F[TIME] + 140, sp = sq - floor(sq / SALP) * SALP;
    if (sp < SALT + 8) {
      const D = 1500 / 340; salP.pan.setTargetAtTime(side(-0.55, -0.83), t, 0.3);
      for (let b = salDone + 1; b < 16; b++) {
        const hb = h33(b, 9.3, 1.1), a = t + (b * 1.45 + hb[0] * 0.6 + D - sp);
        if (a >= ahead) break;
        salDone = b; if (a < t) continue;
        burst(180, 0.8, a, 0.5, 0.6, salG, 'lowpass'); for (let k = 0; k < 18; k++) burst(rr(2000, 6000), 2, a + 0.3 + rr(0, 1.1), rr(0.04, 0.12), 0.02, salG);
      }
    } else salDone = -1;
    // the forest: in among the trees now and then a wolf howls far off, an owl calls, a fox screams, a branch cracks
    if (t > forT) {
      const ci = clamp(floor((cx - OX) / CELLW), 2, CELLS - 3), cj = clamp(floor((cz - OZ) / CELLW), 2, CELLS - 3); let n = 0;
      for (let j = cj - 2; j <= cj + 2; j++) for (let i = ci - 2; i <= ci + 2; i++) n += FORG[i + CELLS * j];
      const fz = sstep(20, 70, n);
      if (rnd() < fz) {
        const p = pan(glass, G(1.2, wet)); p.pan.value = rr(-0.9, 0.9); const e = rnd(), a = t + 0.1;
        if (e < 0.3) {
          // a wolf, maybe two: a long voice rising and hanging
          for (let w = 0; w < 1 + (rnd() < 0.5); w++) {
            const b = a + w * rr(0.8, 2), f0 = rr(300, 380) * (w ? 1.12 : 1), dur = rr(3, 4.6), g = G(0, p), o1 = N(OscillatorNode, { type: 'sawtooth', frequency: f0 }, BQ('bandpass', 800, 4, g), BQ('bandpass', 1500, 6, g));
            N(OscillatorNode, { frequency: 4.5 }, G(5, o1.frequency)).stop(b + dur + 0.1);
            o1.frequency.setValueAtTime(f0, b); o1.frequency.linearRampToValueAtTime(f0 * 1.5, b + 0.9); o1.frequency.setValueAtTime(f0 * 1.5, b + dur * 0.65); o1.frequency.linearRampToValueAtTime(f0 * 0.95, b + dur);
            g.gain.setValueAtTime(0, b); g.gain.linearRampToValueAtTime(0.18, b + 0.6); g.gain.setValueAtTime(0.18, b + dur * 0.7); g.gain.linearRampToValueAtTime(0, b + dur); o1.stop(b + dur + 0.1);
          }
        } else if (e < 0.6) {
          // an owl: hoo ... hoo-hoo-hooo
          for (const [dt, dd] of [[0, 0.5], [0.9, 0.18], [1.15, 0.18], [1.4, 0.7]]) tone('sine', rr(360, 400), a + dt, 0.06, 0.25, dd, BQ('lowpass', 900, 0.7, p), 330);
        } else if (e < 0.75) {
          // a fox: a harsh scream, two or three times
          for (let k = 0; k < 2 + (rnd() < 0.5); k++) tone('sawtooth', rr(850, 1000), a + k * 0.7, 0.02, 0.22, 0.4, BQ('bandpass', 1400, 2, p), 520);
        } else {
          // a branch cracking under its snow, and the snow sliding off it
          burst(rr(500, 1100), 0.8, a, 0.5, 0.05, p); burst(1500, 0.5, a + 0.06, 0.25, 0.9, p, 'lowpass');
        }
      }
      forT = t + rr(4, 11);
    }
    // dogs: now and then one howls or barks, and another may answer
    if (t > dogT) {
      const dogs = S.filter((o) => (o.kind === 'dog' || o.kind === 'bark') && o.nodes && hypot(o.x - cx, o.z - cz) < o.far);
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
        // one starts, and others answer it, the nearer ones first
        const o = pick(dogs); fire(o, t + 0.1);
        let a = t + rr(1.2, 3); for (const q of dogs.filter((q) => q !== o).sort((p, q) => hypot(p.x - o.x, p.z - o.z) - hypot(q.x - o.x, q.z - o.z)).slice(0, 3)) { if (rnd() < 0.55) { fire(q, a); a += rr(1, 3); } }
      }
      dogT = t + rr(12, 40);
    }
  };
}
// the click of a switch in the flat
function click() {
  if (!AC || muted) return;
  const t = AC.currentTime, b = new AudioBuffer({ length: 1200, numberOfChannels: 1, sampleRate: AC.sampleRate }), d = b.getChannelData(0);
  for (let i = 0; i < 1200; i++) d[i] = (rnd() * 2 - 1) * exp(-i / 90) * 0.6;
  const s = new AudioBufferSourceNode(AC, { buffer: b }), f = new BiquadFilterNode(AC, { type: 'bandpass', frequency: 2600, Q: 1.2 }); s.connect(f); f.connect(OUT); s.start(t);
}
// called on every click / key / touch: builds the graph once and resumes it when the browser allows
function sound() {
  if (!AC) { AC = new AudioContext({ latencyHint: 'playback' }); setInterval(mkSound(AC), 100); }
  if (AC.state === 'suspended' && !document.hidden) AC.resume();
}
const mute = () => { if (!AC) return; muted = !muted; OUT.gain.setTargetAtTime(muted ? 0 : VOL, AC.currentTime, 0.08); };
document.addEventListener('visibilitychange', () => { if (AC) document.hidden ? AC.suspend() : AC.resume(); });
