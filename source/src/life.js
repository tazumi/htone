// ============================================================================
// life: what moves about the town on its own (plain script, concatenated after districts.js)
// ============================================================================
// Every actor has a slot of eight numbers that main.js copies into the uniform block every frame (G.act, two vec4):
// the position and the yaw, then the gait (how fast the legs step, 0 on wheels), the lights (0 / 1), a door's angle and
// whether its sound plays. A slot with y below -50 is hidden; slot 0 stays hidden with its door shut. The instances of
// an actor stand at the origin with animation 14 and the slot in the tex scale; the vertex shader carries them (shaders.js);
// a door leaf (animation 15) swings on its hinge by its slot's angle; a glare of kind 1000 + slot * 8 + mode rides along.
// Everything is a function of the scene time, so the picture and the sound (audio.js reads the slots) agree.
const NACT = 128, ACT = new Float32Array(NACT * 8), ACTF = [], HIDE = -100;
ACT[1] = HIDE;
// the glare modes of an actor's lights: 0 plain, 1 a headlight (bright looked at from ahead), 2 a blue flasher, 3 an
// amber beacon, 4 the spark of a tram's pantograph
const GL_PLAIN = 0, GL_HEAD = 1, GL_BLUE = 2, GL_AMBER = 3, GL_SPARK = 4;
// sounds riding with an actor (audio.js): [kind, slot]
const ASND = [];
// the slot that opens each entrance door (DOORS index), if any
const DSLOT = [];
// the ways the people and the dogs of life() walk, for their footprints in the snow (world.js): [path, paws]
const TRAILS = [];
// what can be used in the flat: [x, y, z] p, reach r, kind (light, door, tv, kettle), which one; makeWorld fills it
const USE = [];
// the state of the flat (main.js changes it): the lights (by ALAMP, the kitchen's off), the televisions (kitchen, living
// room), the kettle (0 off, 1 simmering, 2 put on to boil: since FLAT.boil), the doors ({ slot, open angle, doorway, wanted open })
const FLAT = { light: ALAMP.map((l, i) => (i === 7 ? 0 : 1)), tv: [1, 1], kettle: 1, boil: 0, doors: [] };
let NSLOT = 1;
const slot = (f) => { ACTF[NSLOT] = f; ACT[NSLOT * 8 + 1] = HIDE; return NSLOT++; };

// ---------------------------------------------------------------- paths
// A path through points [x, z, y, lane]: y the ground there (the top of the streets by default), lane how far to the
// right of the way it runs from that point on. The corners are rounded (radius r), then it is resampled every metre or
// so: X, Y, Z and the length L. Closed paths come back to their start.
function mkPath(pts, { closed = false, lane = 0, r = 6 } = {}) {
  const n = pts.length, P = pts.map((p) => [p[0], p[2] ?? ST_Y, p[1], p[3] ?? lane]);
  const dir = (i) => { const a = P[(i + n) % n], b = P[(i + 1) % n], dx = b[0] - a[0], dz = b[2] - a[2], l = hypot(dx, dz) || 1; return [dx / l, dz / l]; };
  // the offset lines of the segments meet at the corners (the right of (dx, dz) is (-dz, dx))
  const Q = [];
  for (let i = 0; i < n; i++) {
    const hi = closed || i > 0, ho = closed || i < n - 1, d1 = dir(hi ? i - 1 : i), d2 = ho ? dir(i) : d1, l1 = P[hi ? (i - 1 + n) % n : i][3], l2 = P[i][3];
    const ax = P[i][0] - d1[1] * l1, az = P[i][2] + d1[0] * l1, bx = P[i][0] - d2[1] * l2, bz = P[i][2] + d2[0] * l2, cr = d1[0] * d2[1] - d1[1] * d2[0];
    if (abs(cr) < 1e-3) Q.push([bx, P[i][1], bz]);
    else { const s = ((bx - ax) * d2[1] - (bz - az) * d2[0]) / cr; Q.push([ax + d1[0] * s, P[i][1], az + d1[1] * s]); }
  }
  // round the corners: a quadratic curve from a point before the corner to one after it
  const D = [];
  for (let i = 0; i < n; i++) {
    const V = Q[i];
    if (!closed && (i === 0 || i === n - 1)) { D.push(V); continue; }
    const A = Q[(i - 1 + n) % n], B = Q[(i + 1) % n], la = hypot(V[0] - A[0], V[2] - A[2]) || 1, lb = hypot(B[0] - V[0], B[2] - V[2]) || 1;
    const u = [(V[0] - A[0]) / la, (V[2] - A[2]) / la], w = [(B[0] - V[0]) / lb, (B[2] - V[2]) / lb], c = clamp(u[0] * w[0] + u[1] * w[1], -1, 1);
    if (c > 0.9995) { D.push(V); continue; }
    const d = min(r * tan(Math.acos(c) / 2), la * 0.45, lb * 0.45), ka = 1 - d / la, kb = d / lb;
    const P0 = [V[0] - u[0] * d, mix(A[1], V[1], ka), V[2] - u[1] * d], P1 = [V[0] + w[0] * d, mix(V[1], B[1], kb), V[2] + w[1] * d];
    for (let k = 0; k <= 8; k++) { const t = k / 8, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), e = t * t; D.push([a * P0[0] + b * V[0] + e * P1[0], a * P0[1] + b * V[1] + e * P1[1], a * P0[2] + b * V[2] + e * P1[2]]); }
  }
  if (closed) D.push(D[0]);
  const cum = [0]; for (let i = 1; i < D.length; i++) cum.push(cum[i - 1] + hypot(D[i][0] - D[i - 1][0], D[i][2] - D[i - 1][2]));
  const L = cum[cum.length - 1], N = max(2, Math.ceil(L) + 1), X = new Float32Array(N), Y = new Float32Array(N), Z = new Float32Array(N);
  for (let k = 0, j = 0; k < N; k++) {
    const s = k / (N - 1) * L; while (j < D.length - 2 && cum[j + 1] < s) j++;
    const f = clamp((s - cum[j]) / max(cum[j + 1] - cum[j], 1e-6), 0, 1);
    X[k] = mix(D[j][0], D[j + 1][0], f); Y[k] = mix(D[j][1], D[j + 1][1], f); Z[k] = mix(D[j][2], D[j + 1][2], f);
  }
  return { X, Y, Z, L, N, closed };
}
// puts slot o at distance s along path P, facing along it: fz for figures that face +z, else (vehicles) +x
function pose(P, s, o, fz, dy = 0) {
  if (P.closed) { s %= P.L; if (s < 0) s += P.L; } else s = clamp(s, 0, P.L);
  const u = s / P.L * (P.N - 1); let i = floor(u); if (i > P.N - 2) i = P.N - 2;
  const f = u - i, a = max(i - 1, 0), b = min(i + 2, P.N - 1), dx = P.X[b] - P.X[a], dz = P.Z[b] - P.Z[a];
  const k = o * 8; ACT[k] = mix(P.X[i], P.X[i + 1], f); ACT[k + 1] = mix(P.Y[i], P.Y[i + 1], f) + dy; ACT[k + 2] = mix(P.Z[i], P.Z[i + 1], f);
  if (dx * dx + dz * dz > 1e-8) ACT[k + 3] = fz ? atan2(dx, dz) : atan2(-dz, dx);
}
const hideSlot = (o) => { ACT[o * 8 + 1] = HIDE; };
const setB = (o, gait, lights, door, sound) => { const k = o * 8 + 4; ACT[k] = gait; ACT[k + 1] = lights; ACT[k + 2] = door; ACT[k + 3] = sound; };
// distance after tau seconds along a way of length L at speed V, speeding up over the first 3 s (a) and slowing down
// over the last 3 s (b); and the time the whole way takes: [s, T]
const DRV = [0, 0];
function drive(L, V, tau, a, b) {
  const ta = a ? 3 : 0, tb = b ? 3 : 0, T = (L - (ta + tb) * V / 2) / V + ta + tb; let s;
  if (tau < ta) s = V * tau * tau / 6; else if (tau < T - tb) s = ta * V / 2 + V * (tau - ta); else { const r = max(T - tau, 0); s = L - (b ? V * r * r / 6 : V * r); }
  DRV[0] = clamp(s, 0, L); DRV[1] = T; return DRV;
}
// main.js: every frame
function lifeTick(t) { for (let i = 1; i < NSLOT; i++) ACTF[i](t); }

// ---------------------------------------------------------------- the routes of the town's traffic
// The cars go round one long loop: from the centre over the bridge, round the streets of the new towers, back over the
// bridge and round the blocks of the centre. Each street is driven one way only, so nobody meets on the same lane; the
// avenue keeps its middle for the tram. The plough goes round the old quarter with whoever is stuck behind it, the
// ambulance leaves the hospital by its own road east now and then and comes back later.
const GRAND = [[206, 56], [206, 94], [186, 94], [128, 94, 7], [122, 94, 7], [122, 220, 7], [122, 282], [122, 401], [406, 401], [406, 300], [122, 300], [122, 282], [122, 220, 7],
  [122, 94, 7], [128, 94, 7], [186, 94], [206, 94], [206, 56], [260, 56, ST_Y, 4.2], [260, -60], [514, -60], [514, 60], [260, 60]];
const WLOOP = [[-250, -60], [-514, -60], [-514, 30], [-250, 30]];
const AMBR = [[428, 104.5], [432, 92], [450, 85], [620, 85]];
// the tram: two tracks down the middle of the avenue (the one going north on the east side), turning round at each end
// on a loop of track over a paved patch; it stops at the square both ways and waits at the ends
const TRAMP = [[258.4, -100], [258.4, 159], [292.5, 159], [292.5, 143], [261.6, 143], [261.6, -129.5], [292.5, -129.5], [292.5, -112.5], [258.4, -112.5]];
// the north waste ground the stray dogs go round
const PACKR = [[-120, -232], [-40, -262], [40, -246], [70, -300], [-10, -345], [-140, -322], [-200, -286]];

// the places life() fills and their lights: the rink on the lake in the park (its floodlight masts: x, z off its centre,
// yaw) and the ice slide on the shore; the garages and the yard of a works north of the railway with the watchman's
// fire in a barrel (it flickers: main.js); the all-night kiosk at the filling station
const PRINK = [-112, 393], RINKM = [[-8, -10.8, 0], [8, 10.8, PI]], PSLIDE = [-80, 450, PI / 2], WORKS = [-252, -258, -178, -206], FIRE = [-240.5, -203.2], KIOSK = [-406, -108, -PI / 2];
NOFOREST.push([-346, -268, -168, -194]);
for (const [lx, lz, a] of RINKM) { const [dx, dz] = rotY(0, 1.6, a); LAMPS.push({ x: PRINK[0] + lx + dx, y: 10.9, z: PRINK[1] + lz + dz, r: 30, c: [150, 166, 196], t: 99 }); }
LAMPS.push({ x: PRINK[0] + 15.3, y: 7.3, z: PRINK[1] - 7.8, r: 26, c: [120, 133, 157], t: 99 });
const FIREL = LAMPS.length; LAMPS.push({ x: FIRE[0], y: RAILY + 1.25, z: FIRE[1], r: 9, c: [13, 5.2, 1.4], t: -1, nb: 1 });
LAMPS.push({ x: -246.5, y: RAILY + 10.8, z: -212.6, r: 30, c: [150, 160, 180], t: 99 }); // the works' floodlight over its gate
LAMPS.push({ x: -205, y: RAILY + 2.9, z: -229.7, r: 9, c: [10, 9, 7], t: -1 }); // and the bulb over the hangar's door
{ const [x, z] = loc(KIOSK[0], KIOSK[1], KIOSK[2], -0.5, 1.7); LAMPS.push({ x, y: 2.3, z, r: 9, c: [9, 8.5, 7.5], t: -1, nb: 1 }); }

// ---------------------------------------------------------------- placing the actors (makeWorld calls it last)
function life(W) {
  const { solid, glare, snd, boxes, grassY, reg } = W;
  rseed(130);
  const gy = (x, z) => (onStreet(x, z) ? ST_Y : max(grassY(x, z), abs(x) > CORE || abs(z) > CORE ? (z < RAILZ + 6 ? RAILY : 0) : 0));
  const blocked = (a, b) => boxes.some((h) => { // does the straight line a -> b pass through a house's box (2 m short of each end)?
    const L = hypot(b[0] - a[0], b[1] - a[1]); for (let s = 2; s < L - 2; s += 1) { const x = mix(a[0], b[0], s / L), z = mix(a[1], b[1], s / L); if (x > h[0] - 0.3 && x < h[2] + 0.3 && z > h[1] - 0.3 && z < h[3] + 0.3 && h[4] > 1.2) return true; } return false; });
  // an actor's mesh, and its lights: [x, y, z (local), size, r, g, b, mode]
  const body = (nm, o, pal, lights = [], sc = 1, sd) => { solid(nm, 0, 0, 0, 0, pal, sd ?? rnd(), o, 14, sc); for (const [x, y, z, s, r, g, b, m] of lights) glare.push(x, y, z, s, r, g, b, 1000 + o * 8 + m); };
  const carLights = (hl, h = 0.72, w = 0.62) => [[hl + 0.02, h, -w, 0.7, 3.4, 3.2, 2.8, GL_HEAD], [hl + 0.02, h, w, 0.7, 3.4, 3.2, 2.8, GL_HEAD], [-hl - 0.02, h + 0.1, -w, 0.45, 1.6, 0.06, 0.03, GL_PLAIN], [-hl - 0.02, h + 0.1, w, 0.45, 1.6, 0.06, 0.03, GL_PLAIN]];

  // --- the traffic of the grand loop: cars, a bus, a taxi, all at one speed and evenly spaced
  {
    const P = mkPath(GRAND, { closed: true, lane: 2.4, r: 7 }), V = 9.5, K = ['car0', 'car1', 'car2', 'car3', 'car4', 'car6', 'car8', 'bus', 'car0', 'car3', 'car1', 'car6', 'car2', 'car4'], n = K.length;
    K.forEach((nm, k) => {
      const s0 = k / n * P.L + rr(-10, 10), o = slot((t) => { pose(P, s0 + V * t, o, false); setB(o, 0, 1, 0, 1); });
      const t = +nm.slice(3) || 0, hl = nm === 'bus' ? 3.6 : CARS[t][0][0][0];
      body(nm, o, nm === 'bus' ? pick([14, 15]) : pick([0, 1, 2, 3, 4, 5, 6, 7, 13]), carLights(hl, nm === 'bus' ? 0.9 : 0.72, nm === 'bus' ? 0.85 : 0.62));
      if (k === 10 && W.has('taxiSign')) solid('taxiSign', -0.3, CARS[1][0][3][1], 0, 0, 0, rnd(), o, 14);
      ASND.push([nm === 'bus' ? 'engine' : 'tyres', o]);
    });
  }
  // --- the plough round the old quarter, two cars crawling behind it
  {
    const P = mkPath(WLOOP, { closed: true, lane: 2.4, r: 8 }), V = 4.2, s0 = rr(0, P.L);
    const pl = slot((t) => { pose(P, s0 + V * t, pl, false); setB(pl, 0, 1, 0, 1); });
    body('plow', pl, 15, [...carLights(4.6, 1.2, 0.9), [3.2, 3.5, 0, 0.8, 2.4, 1.0, 0.1, GL_AMBER]]); ASND.push(['plough', pl]);
    for (const [d, nm] of [[-17, 'car1'], [-27.5, 'car3']]) { const c = slot((t) => { pose(P, s0 + d + V * t, c, false); setB(c, 0, 1, 0, 0); }); body(nm, c, pick([0, 2, 4, 6]), carLights(CARS[+nm.slice(3)][0][0][0])); }
  }
  // --- the ambulance: out by its road with the blue lights going, back a few minutes later, parked with them going a while
  {
    const P = mkPath(AMBR, { lane: 2.4, r: 6 }), Q = mkPath(AMBR.slice().reverse(), { lane: 2.4, r: 6 }), PER = 300, V = 13;
    const Ta = drive(P.L, V, 0, 1, 0)[1], Tb = drive(Q.L, V, 0, 0, 1)[1];
    const am = slot((t) => {
      const c = ((t + 40) % PER + PER) % PER;
      if (c < 6) { pose(P, 0, am, false); setB(am, 0, 1, 0, 1); }                                   // the lights come on
      else if (c < 6 + Ta) { pose(P, drive(P.L, V, c - 6, 1, 0)[0], am, false); setB(am, 0, 1, 0, 1); } // and away
      else if (c < 200) { hideSlot(am); setB(am, 0, 0, 0, 0); }
      else if (c < 200 + Tb) { pose(Q, drive(Q.L, V, c - 200, 0, 1)[0], am, false); setB(am, 0, 1, 0, 1); }
      else { pose(Q, Q.L, am, false); setB(am, 0, c < 240 ? 1 : 0, 0, 0); }
    });
    const l = [[1.55, 2.2, -0.55, 0.6, 0.15, 0.35, 3, GL_BLUE], [1.55, 2.2, 0.55, 0.6, 0.15, 0.35, 3, GL_BLUE], [2.8, 0.75, -0.75, 0.6, 3.4, 3.2, 2.8, GL_HEAD], [2.8, 0.75, 0.75, 0.6, 3.4, 3.2, 2.8, GL_HEAD]];
    body('ambulance', am, 0, l); ASND.push(['siren', am]);
  }
  // --- the tram: two cars half a round apart; the saloon lit, now and then a spark off the wire
  {
    const P = mkPath(TRAMP, { closed: true, r: 9 }), V = 8, T8 = PROPS8.tram();
    const near = (x, z) => { let b = 0, bd = 1e9; for (let i = 0; i < P.N; i++) { const d = hypot(P.X[i] - x, P.Z[i] - z); if (d < bd) { bd = d; b = i; } } return b / (P.N - 1) * P.L; };
    // the stops: by the square going south and going north (a short wait), the far side of each loop (a long one)
    const ST = [[near(258.4, -6), 14], [near(292.5, 151), 26], [near(261.6, 6), 14], [near(292.5, -121), 26]].sort((a, b) => a[0] - b[0]);
    const legs = ST.map(([s0, w], k) => { const s1 = k < ST.length - 1 ? ST[k + 1][0] : ST[0][0] + P.L; return [s0, s1 - s0, drive(s1 - s0, V, 0, 1, 1)[1], w]; });
    const C = legs.reduce((a, l) => a + l[2] + l[3], 0);
    const at = (tau) => { let tt = ((tau % C) + C) % C; for (const [s0, L, T, w] of legs) { if (tt < w) return s0; tt -= w; if (tt < T) return s0 + drive(L, V, tt, 1, 1)[0]; tt -= T; } return 0; };
    for (const ph of [0, C / 2]) {
      const o = slot((t) => { pose(P, at(t + ph), o, false); setB(o, 0, 1, 0, 1); });
      body('tram', o, pick([14, 5]), [...T8.head.map(([x, y, z]) => [x, y, z, 0.6, 3.4, 3.2, 2.8, GL_HEAD]), ...T8.tail.map(([x, y, z]) => [x, y, z, 0.45, 1.6, 0.06, 0.03, GL_PLAIN]), [0, T8.pan[1] + 0.04, 0, 1.1, 0.9, 1.3, 3.4, GL_SPARK]]);
      ASND.push(['tram', o]);
    }
    // the rails, a pair to each track and flush with the street; the wire over them, on poles beside the way (outside it)
    const m = new Mesh(), along = (d, y, step) => { const a = []; for (let i = 0; i < P.N; i += step) { const j = min(i + 1, P.N - 1), k = max(j - 1, 0), dx = P.X[j] - P.X[k], dz = P.Z[j] - P.Z[k], l = hypot(dx, dz) || 1; a.push([P.X[i] - dz / l * d, y, P.Z[i] + dx / l * d]); } a.push(a[0]); return a; };
    m.mat(M_METAL); for (const d of [-0.76, 0.76]) m.tube(along(d, ST_Y + 0.012, 2), 0.035, 3, 0);
    m.mat(M_DARK); m.tube(along(0, 5.62, 3), 0.014, 3, 0);
    reg('tramway', m, { noSh: 1 }); solid('tramway', 0, 0, 0);
    for (let i = 0; i < TRAMP.length; i++) {
      const a = TRAMP[i], b = TRAMP[(i + 1) % TRAMP.length], L = hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, n = max(1, round(L / 26));
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n, x = mix(a[0], b[0], t), z = mix(a[1], b[1], t), avenue = z > -100 && z < 135 && abs(uz) > 0.5, c = avenue ? [260, z] : z < 0 ? [276, -121] : [276, 151];
        if (avenue && abs((((z + 103) % 30) + 30) % 30 - 15) < 6) continue; // not where a street lamp stands
        const s1 = [x - uz * 3.4, z + ux * 3.4], s2 = [x + uz * 3.4, z - ux * 3.4], p = hypot(s1[0] - c[0], s1[1] - c[1]) > hypot(s2[0] - c[0], s2[1] - c[1]) ? s1 : s2;
        solid('tramPole', p[0], ST_Y, p[1], atan2(-(z - p[1]), x - p[0]));
      }
    }
  }

  // --- people going between the entrances: a door opens, somebody comes out, walks the trodden path to its end and on
  //     to the door of a neighbour, which opens to let them in; a while later they come back the same way
  const coat = () => pick([0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14]);
  const gw = (x, z) => gy(x, z) + 0.02;
  const inside = (di, d = -1.3) => { const [, , , bi, , uc] = DOORS[di], p = toW(BLD[bi], 0, uc, 0.13, d); return [p[0], p[2], p[1]]; };
  const fromDoor = (di) => [inside(di), inside(di, 0.3), ...DPATH[di].map(([x, z]) => [x, z, gw(x, z)])];
  const doorOpen = (o, v) => { ACT[o * 8 + 6] = v; };
  const used = new Set();
  const doorSlot = (di) => { used.add(di); return (DSLOT[di] = slot(() => 0)); };
  {
    const ends = []; DPATH.forEach((P, di) => { if (P) ends.push([di, P[P.length - 1]]); });
    const pairs = [];
    for (const [a, ea] of ends) for (const [b, eb] of ends) if (a < b && DOORS[a][3] !== DOORS[b][3] && hypot(ea[0] - eb[0], ea[1] - eb[1]) < 24 && !blocked(ea, eb)) pairs.push([a, b, DOORS[a][3] < 13 && DOORS[b][3] < 13 ? 0 : 1]);
    const take = (kind0, n) => { for (const [a, b, kind] of pairs) { if (!n) break; if (kind !== kind0 || used.has(a) || used.has(b)) continue; n--;
      const pts = [...fromDoor(a), ...fromDoor(b).reverse()], P = mkPath(pts, { r: 1.2 }), R = mkPath(pts.slice().reverse(), { r: 1.2 }), v = rr(1, 1.3), L = P.L, C = L / v + rr(35, 90), ph = rr(0, 2 * C);
      const dA = doorSlot(a), dB = doorSlot(b), nm = pick(['walker', 'walkerW']);
      const o = slot((t) => {
        const q = t + ph, cy = floor(q / C), back = cy & 1, s = (q - cy * C) * v - 1.6, r = L - s;
        if (s >= 0 && s <= L) { pose(back ? R : P, s, o, true); setB(o, 4.4 * v, 0, 0, 1); } else { hideSlot(o); setB(o, 0, 0, 0, 0); }
        doorOpen(back ? dB : dA, 1.25 * sstep(-1.4, -0.4, s) * (1 - sstep(2.6, 3.8, s))); doorOpen(back ? dA : dB, 1.25 * sstep(3.8, 2.6, r) * (1 - sstep(-0.4, -1.4, r)));
      });
      body(nm, o, coat()); ASND.push(['steps', o]); TRAILS.push([P, 0]);
    } };
    take(0, 5); take(1, 5);
  }
  // the club lets out a few at a time: they go off together to one of the houses round about
  {
    const hub = [320, 65], tg = [];
    DPATH.forEach((P, di) => { if (!P || used.has(di) || DOORS[di][3] < 13) return; const e = P[P.length - 1]; if (hypot(e[0] - hub[0], e[1] - hub[1]) < 90 && !blocked(hub, e)) tg.push(di); });
    const T = tg.sort((a, b) => hypot(DOORS[a][0] - 320, DOORS[a][1] - 66) - hypot(DOORS[b][0] - 320, DOORS[b][1] - 66)).slice(0, 3);
    if (T.length) {
      const C = 160, ph = rr(0, C), dS = T.map(doorSlot), v = 1.15;
      const ways = T.map((di) => [-0.55, 0, 0.6].map((ln) => mkPath([[320, 72.4, ST_Y], [hub[0], hub[1], ST_Y], ...fromDoor(di).reverse()], { r: 1.5, lane: ln })));
      for (let k = 0; k < 3; k++) {
        const o = slot((t) => {
          const q = t + ph, cy = floor(q / C), i = cy % T.length, P = ways[i][k], s = (q - cy * C) * v - k * 0.8;
          if (s >= 0 && s <= P.L) { pose(P, s, o, true); setB(o, 4.4 * v, 0, 0, 1); } else { hideSlot(o); setB(o, 0, 0, 0, 0); }
          // the last of them shuts the door
          if (k === 2) T.forEach((di, j) => { const r = ways[j][1].L - ((q - cy * C) * v - 0.8); doorOpen(dS[j], j === i ? 1.25 * sstep(4.6, 3.4, r) * (1 - sstep(-1.2, -2.2, r)) : 0); });
        });
        body(k === 1 ? 'walkerW' : 'walker', o, coat()); ASND.push([k ? 'steps' : 'chat', o]); TRAILS.push([ways[0][k], 0]);
      }
    }
  }
  // the janitor of the house across the yard: out with the scraper, up and down the path along the house, back in
  {
    const di = DOORS.findIndex((d, i) => d[3] === 1 && DPATH[i] && !used.has(i));
    if (di >= 0) {
      const a = DOORS[di][2], P0 = fromDoor(di).slice(0, 4), E = P0[3], ax = cos(a), az = -sin(a), w = (k) => [E[0] + ax * k, E[1] + az * k, gw(E[0] + ax * k, E[1] + az * k)];
      const pts = [...P0, w(-6), w(9), w(-6), w(9), w(0), ...P0.slice().reverse()], P = mkPath(pts, { r: 0.7 }), v = 0.55, C = P.L / v + 150, ph = rr(0, C), d = doorSlot(di);
      const s0 = mkPath(P0, { r: 0.7 }).L, s1 = P.L - s0;
      const o = slot((t) => {
        const q = ((t + ph) % C + C) % C, s = q * v - 1.6, r = P.L - s;
        if (s >= 0 && s <= P.L) { pose(P, s, o, true); setB(o, 4.4 * v, 0, 0, s > s0 && s < s1 ? 1 : 0); } else { hideSlot(o); setB(o, 0, 0, 0, 0); }
        doorOpen(d, max(1.25 * sstep(-1.4, -0.4, s) * (1 - sstep(2.6, 3.8, s)), 1.25 * sstep(3.8, 2.6, r) * (1 - sstep(-0.4, -1.4, r))));
      });
      body('janitor', o, 15); ASND.push(['scrape', o]); TRAILS.push([P, 0]);
    }
  }
  // a pack of stray dogs going round the waste ground north of the railway, the leader barking now and then
  {
    const pts = PACKR.map(([x, z]) => [x, z, gy(x, z)]), v = 1.9, s0 = rr(0, 2000);
    for (let k = 0; k < 4; k++) {
      const Q = mkPath(pts, { closed: true, r: 14, lane: [0, 0.9, -0.8, 0.3][k] }), d = [0, 2.2, 3.6, 5.9][k];
      const o = slot((t) => { pose(Q, s0 + v * t - d + 0.6 * sin(t * 0.7 + k * 2), o, true); setB(o, 10.5, 0, 0, 1); });
      body('dog', o, pick([6, 8, 9, 0]), [], k === 3 ? 0.68 : rr(0.85, 1.05));
      if (!k) ASND.push(['bark', o]);
      TRAILS.push([Q, 1]);
    }
  }
  // --- the rink on the lake in the park: boards, floodlights, a loudspeaker playing, skaters going round; the ice slide
  //     on the shore with children going up the ladder, down on their sleds and back round
  {
    const [x, z] = PRINK, y = gy(x, z) + 0.03, F8 = PROPS8.floodlight();
    solid('rink', x, y, z, 0, 11, 0.6);
    W.boxes.push([x - 15.2, z - 7.7, x + 15.2, z - 7.3, 1.2], [x - 15.2, z + 7.3, x + 15.2, z + 7.7, 1.2]);
    for (const [lx, lz, a] of RINKM) { solid('floodlight', x + lx, y, z + lz, a); for (const h of F8.heads) { const [hx, hz] = rotY(h[0], h[2], a); glare.push(x + lx + hx, y + h[1], z + lz + hz, 1.1, 3.2, 3.5, 4, 0); } }
    { const [lx, lz] = [16.6, 5.5]; solid('loudspeaker', x + lx, y, z + lz, PI / 2); snd.push(['rinkmusic', x + lx, 5.5, z + lz]); }
    // skaters, each on a ring of its own, round and round
    for (let k = 0; k < 7; k++) {
      const rx = 11.5 - k * 0.95, rz = 5 - k * 0.55, P = mkPath([...Array(28).keys()].map((j) => { const a = -j / 28 * TAU; return [x + cos(a) * rx, z + sin(a) * rz, y]; }), { closed: true, r: 3 }), v = rr(2.2, 3.6), s0 = rr(0, P.L);
      const o = slot((t) => { pose(P, s0 + v * t, o, true); setB(o, 2.6, 0, 0, 0); });
      body(k > 4 ? 'kid' : pick(['walker', 'walkerW']), o, coat());
    }
    snd.push(['kids', x, 1, z]);
  }
  {
    const [x, z, a] = PSLIDE, y = gy(x, z), W2 = (lx, ly, lz) => { const [wx, wz] = loc(x, z, a, lx, lz); return [wx, wz, y + ly]; };
    solid('iceslide', x, y, z, a); W.boxes.push([x - 1, z - 1, x + 1, z + 1, 2.6]);
    const up = mkPath([W2(-1.9, 0, 0.9), W2(-1.6, 0, 0), W2(-1.15, 0, 0), W2(-0.5, 1.9, 0), W2(0.2, 1.9, 0)], { r: 0.2 });
    const down = mkPath([...Array(11).keys()].map((k) => { const t = k / 10; return W2(0.55 + 5.6 * t, 0.06 + 1.8 * pow(1 - t, 1.6), 0); }).concat([W2(9, 0.03, 0.2), W2(12.5, 0.03, 0.6)]), { r: 0.5 });
    const back = mkPath([W2(12.5, 0.03, 0.6), W2(11, 0.03, 2.2), W2(2, 0, 2.1), W2(-1.9, 0, 0.9)], { r: 1.5 });
    const vu = 0.55, vb = 1.1, Tu = up.L / vu, Td = 3.4, Tb = back.L / vb, C = Tu + Td + Tb + 2.5;
    for (let k = 0; k < 3; k++) {
      const ph = k * C / 3 + rr(0, 2), w = slot(() => 0), sl = slot((t) => {
        const q = ((t + ph) % C + C) % C;
        if (q < Tu) { pose(up, q * vu, w, true); setB(w, 4.4 * vu, 0, 0, 0); hideSlot(sl); }
        else if (q < Tu + Td) { const u = (q - Tu) / Td; pose(down, down.L * (u < 0.5 ? 1.75 * u * u : 0.4375 + (u - 0.5) * (1 - (u - 0.5)) * 2.25), sl, true); hideSlot(w); setB(w, 0, 0, 0, 0); }
        else if (q < Tu + Td + Tb) { pose(back, (q - Tu - Td) * vb, w, true); setB(w, 4.4 * vb, 0, 0, 0); hideSlot(sl); }
        else { pose(back, back.L, w, true); setB(w, 0, 0, 0, 0); hideSlot(sl); }
      });
      body('kid', w, coat()); body('kidSled', sl, coat());
    }
    snd.push(['kids', x + 4, 1, z]);
  }

  // --- the garages north of the railway, one open with a bulb and a radio; beside them the yard of a works behind its
  //     concrete fence: a hangar, containers, the watchman's hut at the gate, the watchman warming his hands at a fire
  //     in a barrel, his dog
  {
    const Y = RAILY;
    for (let k = 0; k < 15; k++) for (const [z, a] of [[-219, 0], [-200.5, PI]]) {
      const x = -338 + k * 3.45; if (k === 9 && a === 0) { solid('garageOpen', x, Y, z, a, 12, -1); solid('standing', x + 0.6, Y, z + 3.4, 2.6, 8, 4); snd.push(['radio', x, Y + 1.5, z + 1]); glare.push(x, Y + 1.95, z + 0.5, 0.35, 3, 1.8, 0.8, 0); }
      else solid('garage', x, Y, z, a, pick([9, 6, 11, 12, 10]), x + z);
      W.boxes.push([x - 1.7, z - 3, x + 1.7, z + 3, Y + 2.6]);
    }
    const [x0, z0, x1, z1] = WORKS, fen = (ax, az, bx, bz, gap) => { const L = hypot(bx - ax, bz - az), n = round(L / 4), ya = atan2(-(bz - az), bx - ax); for (let k = 0; k < n; k++) { const t = k / n; if (gap && abs(mix(ax, bx, t) + 2 - gap) < 4) continue; solid('fenceSlab', mix(ax, bx, t), Y, mix(az, bz, t), ya, 0, k); } W.boxes.push([min(ax, bx) - 0.2, min(az, bz) - 0.2, max(ax, bx) + 0.2, max(az, bz) + 0.2, Y + 2.6]); };
    fen(x0, z1, x1, z1, -244); fen(x1, z1, x1, z0); fen(x1, z0, x0, z0); fen(x0, z0, x0, z1);
    const H = PROPS8.hangar(); solid('hangar', -212, Y, -236, 0, 10, 0.3); W.boxes.push([-224, -242, -200, -230, Y + 9]);
    for (const [lx, ly, lz, la, w, h] of H.W) W.wins.push(-212 + lx, Y + ly, -236 + lz, la, w, h, rnd(), 12 * 4 * (rnd() < 0.5));
    for (const [x, z, a, pal] of [[-240, -246, 0.1, 4], [-240, -243.4, 0.1, 14], [-188, -216, PI / 2, 11], [-240, -244.7, 0.12, 7]]) solid('container', x, Y + (pal === 7 ? 2.59 : 0), z, a, pal, x);
    W.boxes.push([-243.5, -247.6, -236.5, -242, Y + 5.2], [-189.5, -219.5, -186.5, -212.5, Y + 2.6]);
    const B = PROPS8.watchBooth(), [bx, bz, ba] = [-236, -210, PI]; solid('watchBooth', bx, Y, bz, ba, 0, 0.4); W.boxes.push([bx - 1.1, bz - 1, bx + 1.1, bz + 1, Y + 2.6]);
    for (const [lx, ly, lz, la, w, h] of B.W) { const [wx, wz] = loc(bx, bz, ba, lx, lz); W.wins.push(wx, Y + ly, wz, ba + la, w, h, 0.37, 12 * 4); }
    { const [px, pz] = loc(bx, bz, ba, B.pipe[0], B.pipe[2]); for (let k = 0; k < 6; k++) W.steam.push(px, Y + B.pipe[1], pz, rr(0.15, 0.25), rnd(), rr(0.25, 0.35), 2.4, rr(0.4, 0.8)); }
    { const R = PROPS8.floodlight(); solid('floodlight', -246.5, Y, -211, PI); for (const h of R.heads) { const [hx, hz] = rotY(h[0], h[2], PI); glare.push(-246.5 + hx, Y + h[1], -211 + hz, 1.1, 3.2, 3.5, 4, 0); } }
    const [fx, fz] = FIRE, Fb = PROPS8.fireBarrel(); solid('fireBarrel', fx, Y, fz, 0.4);
    for (let k = 0; k < 10; k++) W.steam.push(fx, Y + Fb.fire[1] + 0.3, fz, rr(0.18, 0.32), rnd(), rr(0.3, 0.45), 2.6, rr(0.4, 0.9));
    for (let k = 0; k < 3; k++) glare.push(fx + rr(-0.12, 0.12), Y + Fb.fire[1] + rr(0.05, 0.3), fz + rr(-0.12, 0.12), rr(0.35, 0.5), 3, 1.1, 0.25, 9);
    snd.push(['fire', fx, Y + 1, fz]);
    solid('standing', fx + 1.05, Y, fz + 0.3, -PI / 2 - 0.25, 8); solid('smoker', fx - 0.9, Y, fz - 0.6, PI / 2 + 0.5, 2);
    solid('dog', -232.5, Y, -211.5, -2.2, 9, 0.4); solid('dogLying', -233, Y, -213.5, 1.4, 6, 0.6); snd.push(['dog', -233, Y + 0.5, -212]);
  }
  // --- the filling station's all-night kiosk: its window lit, a queue at it, a car at a pump with its driver
  {
    const [x, z, a] = KIOSK, Y = 0, dL = (lx, y, lz, w, h, md, gl, nm) => { const [wx, wz] = loc(x, z, a, lx, lz); W.decals.push(wx, y, wz, a, w, h, md, gl, nm); };
    solid('kiosk', x, Y, z, a, 11, x); W.boxes.push([x - 2.3, z - 1.6, x + 2.3, z + 1.6, 2.9]);
    dL(-0.5, 1.5, 1.05, 3, 1.5, 1, 1.1, 'kioskWinA'); dL(-0.4, 2.55, 1.53, 1.6, 0.4, 2, 3, 'sign24a'); dL(-1.55, 2.05, 1.3, 0.6, 0.22, 2, 2.4, 'open');
    for (let k = 0; k < 3; k++) { const [px, pz] = loc(x, z, a, -0.5 + rr(-0.2, 0.2), 1.9 + k * 0.85); solid(k === 1 ? 'smoker' : 'standing', px, Y, pz, a + PI + rr(-0.3, 0.3), coat()); }
    snd.push(['chat', x - 3, 1.6, z]);
    solid('car0', -423, 0, -116.2, 0.02, 3, 0.4); W.boxes.push([-425.5, -117.5, -420.5, -115, 1.5]);
    solid('trucker', -420.6, 0, -114.6, -2.6, 2);
  }
}

