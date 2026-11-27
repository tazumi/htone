// ============================================================================
// development tools: only in dev.html (npm run build:dev), never in index.html
// ============================================================================
//   G    fly the camera along the scripted path (FLY in main.js), one minute through the whole yard
//   B    the same flight as a benchmark: the resolution stays fixed, every frame is timed, the result is shown at the end
//   G, B or 1-6 during a flight stop it
// Test hooks in the address: dev.html#p=3&t=45 opens viewpoint 3 at scene time 45 s without the menu;
// cam=x,y,z,tx,ty,tz aims freely, hold=1 fixes the resolution, bench=1 starts the benchmark; window.dev exposes the state.
{
  const LOGN = 1 << 16, logFrame = new Float32Array(LOGN), logGpu = new Float32Array(LOGN);
  let flying = false, bench = false, last = 0, nFrame = 0, nGpu = 0, result = '';
  const stop = () => { flying = bench = false; dynT = 0; };
  const report = () => {
    const st = (a, n) => { const s = Array.from(a.subarray(0, n)).sort((x, y) => x - y); let sum = 0; for (const v of s) sum += v; return { n, avg: sum / n, p99: s[min(n - 1, floor(n * 0.99))], max: s[n - 1] }; };
    const fm = (o) => `avg ${o.avg.toFixed(2)}  p99 ${o.p99.toFixed(2)}  max ${o.max.toFixed(2)} ms`;
    const f = st(logFrame, nFrame);
    info.textContent = result = `Fly-through ${W}x${H}, ${f.n} frames\nframe  ${fm(f)}\nGPU    ${nGpu ? fm(st(logGpu, nGpu)) : 'timestamp-query unavailable'}`;
  };
  // frame() moves the free camera and then calls render(): step in between and put the camera on the path instead
  const draw = render;
  let follow = null;
  render = () => {
    if (follow) {
      // follow=slot,x,y,z: the camera rides with an actor (life.js) at that offset in its frame, looking at it
      const [s, ox, oy, oz] = follow, k = s * 8, a = ACT[k + 3], [dx, dz] = rotY(ox, oz, a);
      lookAt(ACT[k] + dx, ACT[k + 1] + oy, ACT[k + 2] + dz, ACT[k], ACT[k + 1] + 1, ACT[k + 2]);
    }
    if (flying) {
      const dtr = F[LAST] - last; last = F[LAST];
      F[FLT] += min(dtr / 1000, 0.1); flyAt();
      if (bench) { if (nFrame < LOGN) logFrame[nFrame++] = dtr; if (F[GPU] > 0 && nGpu < LOGN) logGpu[nGpu++] = F[GPU]; }
      if (F[FLT] >= FLYT) { if (bench) report(); stop(); }
    }
    draw();
  };
  const start = (b) => {
    flying = true; bench = b; F[FLT] = 0; last = F[LAST]; nFrame = nGpu = 0;
    // a benchmark hides the stats line and holds the resolution: dynT at -Infinity keeps frame() from tuning it
    if (bench) { hud = false; info.textContent = ''; dynT = -Infinity; }
  };
  addEventListener('keydown', (e) => {
    if (menu || e.repeat) return;
    if (e.code === 'KeyG' || e.code === 'KeyB') { if (flying) stop(); else start(e.code === 'KeyB'); } else if (/Digit[1-6]/.test(e.code)) stop();
  });
  const h = Object.fromEntries(location.hash.slice(1).split('&').filter(Boolean).map((s) => s.split('=')));
  if (location.hash) {
    menu = false; body.className = 'g';
    if (h.t) F[TIME] = +h.t;
    if (h.p) lookAt(...POSES[h.p - 1]);
    if (h.cam) lookAt(...h.cam.split(',').map(Number));
    if (h.follow) follow = h.follow.split(',').map(Number);
    if (h.hold) dynT = -Infinity;
    if (h.bench) start(true);
  }
  // Deterministic capture: dev.halt() gates requestAnimationFrame so the page's own loop dies, then every dev.step(dt, x, y, z, tx, ty, tz)
  // advances scene time by exactly dt (wind and its offsets integrate through world), aims the camera, eases INR as frame() does,
  // renders and resolves when the GPU has finished the frame; the same dt sequence always gives the same pictures.
  const raf = requestAnimationFrame; let halted = false;
  window.requestAnimationFrame = (f) => halted ? 0 : raf(f);
  const halt = async () => { halted = true; for (let i = 0; i < 3; i++) await new Promise((r) => raf(r)); };
  const step = async (dt, ...c) => {
    F[TIME] += dt; world(dt); lookAt(...c);
    F[INR] += ((inB(ROOM, F[CX], F[CY], F[CZ], -0.3) ? 1 : 0) - F[INR]) * (1 - exp(-dt * 6));
    render(); await Q.onSubmittedWorkDone();
  };
  // the flight over the town: where it passes closer than 6 m to a house's box (or under its roof)
  const tourCheck = () => { const out = [], T = tourLen / TOURV; for (let t = 0; t < T; t += 0.5) { tourAt(t); for (let i = 0; i < NBX; i++) { const o = i * 5, dx = max(BX[o] - F[CX], 0, F[CX] - BX[o + 2]), dz = max(BX[o + 1] - F[CZ], 0, F[CZ] - BX[o + 3]), dy = max(F[CY] - BX[o + 4], 0); if (hypot(dx, dz, dy) < 6) out.push([t.toFixed(1), F[CX].toFixed(0), F[CY].toFixed(0), F[CZ].toFixed(0), i, BX[o + 4].toFixed(0)].join(' ')); } } return { T, out }; };
  window.dev = { F, ACT, BX, FLAT, atlasUsed: AT.used, lookAt, tourCheck, POSES, halt, step, sound, audio: () => ({ AC, OUT }), state: () => ({ dec: nDec, W, H, pix, det, gpu: F[GPU], result, flying, tris: nI / 3, wins: nWin, grass: Wd.grass.n }) };
}
