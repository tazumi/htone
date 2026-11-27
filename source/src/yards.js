// ============================================================================
// yards: what makes each house its own on the ground - the front gardens its people fenced off under their windows,
// what they put in them, the shell garages, the icicles along its eaves (plain script, after extras.js)
// ============================================================================
// Each house draws its own lot from its index: whether it has front gardens and of which fence, how many icicles hang
// off its roof. Placed after town() and the districts, so the paths and everything standing about are known and kept
// clear of.

const PROPS10 = {
  // a 2 m length of picket fence along x (x -1..1, the face at z 0), 0.95 high: posts, two rails, pointed pickets
  picket() {
    const m = new Mesh().mat(M_PAINT);
    for (const x of [-1, 1]) m.box(x - 0.045, 0, -0.045, x + 0.045, 0.98, 0.045, 4, 0.5, 1);
    for (const y of [0.25, 0.7]) m.box(-1, y, -0.06, 1, y + 0.07, -0.035, 0, 0.7, 1);
    for (let x = -0.9; x < 0.95; x += 0.15) {
      m.box(x - 0.035, 0.06, -0.035, x + 0.035, 0.82, -0.012, 4, 0.6, 1);
      m.q4([x - 0.035, 0.82, -0.012], [x + 0.035, 0.82, -0.012], [x, 0.9, -0.012], [x, 0.9, -0.012]);
      m.q4([x + 0.035, 0.82, -0.035], [x - 0.035, 0.82, -0.035], [x, 0.9, -0.035], [x, 0.9, -0.035]);
    }
    return m;
  },
  // a 2 m length of welded iron fence: square posts with a knob, two rails, bars with spear tips, 0.9 high
  iron() {
    const m = new Mesh().mat(M_PAINT);
    for (const x of [-1, 1]) { m.box(x - 0.03, 0, -0.03, x + 0.03, 0.9, 0.03, 4, 0.5, 1); m.tube([[x, 0.9, 0], [x, 0.98, 0]], (k) => [0.035, 0.001][k], 6, 0); }
    for (const y of [0.12, 0.78]) m.box(-1, y, -0.015, 1, y + 0.035, 0.015, 0, 0.7, 1);
    for (let x = -0.88; x < 0.9; x += 0.125) { m.bar([x, 0.02, 0], [x, 0.84, 0], 0.016); m.tube([[x, 0.84, 0], [x, 0.92, 0]], (k) => [0.022, 0.001][k], 4, 0); }
    return m;
  },
  // a 2 m length of chain-link on pipe posts, 1 m high, the diamonds of the mesh as thin wires
  net() {
    const m = new Mesh().mat(M_METAL);
    for (const x of [-1, 1]) m.tube([[x, 0, 0], [x, 1.02, 0]], 0.03, 6, 2);
    m.bar([-1, 1, 0], [1, 1, 0], 0.02); m.bar([-1, 0.05, 0], [1, 0.05, 0], 0.012);
    // the diamonds: wires up to the right and down to the right, each clipped to the panel
    for (let x = -2; x < 1; x += 0.16) {
      const t0 = max(0, (-1 - x) / 0.95), t1 = min(1, (1 - x) / 0.95);
      if (t1 - t0 < 0.02) continue;
      m.bar([x + t0 * 0.95, 0.05 + t0 * 0.95, 0.01], [x + t1 * 0.95, 0.05 + t1 * 0.95, 0.01], 0.006);
      m.bar([x + t0 * 0.95, 1 - t0 * 0.95, -0.01], [x + t1 * 0.95, 1 - t1 * 0.95, -0.01], 0.006);
    }
    return m;
  },
  // a swan cut from an old tyre and painted: the body a ring lying in the snow, the wings its cut halves raised in
  // zigzags, the neck curving up from the front, a red beak; about 0.75 long along x (head at +x), 0.6 high
  swan() {
    const m = new Mesh().mat(M_PAINT);
    const ring = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * TAU; ring.push([cos(a) * 0.3, 0.09, sin(a) * 0.2]); }
    m.tube(ring, 0.09, 7, 0);
    for (const s of [-1, 1]) {
      const pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push([0.15 - t * 0.5, 0.14 + 0.25 * sin(t * PI * 0.8) + (k & 1) * 0.06, s * (0.2 + 0.05 * t)]); }
      m.sweep(pts, 0.02, 0.1, () => [0, 0, 1]);
    }
    m.tube([[0.28, 0.12, 0], [0.36, 0.3, 0], [0.32, 0.46, 0], [0.36, 0.56, 0], [0.44, 0.58, 0]], (k) => [0.06, 0.045, 0.04, 0.045, 0.04][k], 6, 0);
    m.mat(M_RED).tube([[0.44, 0.58, 0], [0.53, 0.55, 0]], (k) => [0.03, 0.008][k], 5, 2);
    return m;
  },
  // a shell garage: a half barrel of corrugated steel over a car, 5 long along x (-2.5..2.5), 2.8 wide, 1.9 high,
  // closed at the back (-x), the front its two leaves shut with a padlock
  shell() {
    const m = new Mesh().mat(M_PAINT), N = 12, R = 1.4, H = 1.9, prof = (k) => { const a = k / N * PI; return [R * cos(a), H * sin(a)]; };
    for (let k = 0; k < N; k++) {
      const [z0, y0] = prof(k), [z1, y1] = prof(k + 1);
      m.q4([-2.5, y0, z0], [2.5, y0, z0], [2.5, y1, z1], [-2.5, y1, z1], [1, 1, 1, 1]);
      m.q4([2.5, y0, z0], [-2.5, y0, z0], [-2.5, y1, z1], [2.5, y1, z1], 0.3);
    }
    // the ends: the back closed, the front two leaves; ribs of the corrugation round the shell
    for (const [x, s] of [[-2.5, -1], [2.5, 1]]) {
      const c = m.v(x, 0, 0, 0.8);
      for (let k = 0; k < N; k++) { const [z0, y0] = prof(k), [z1, y1] = prof(k + 1); const a = m.v(x, y0, z0, 0.8), b = m.v(x, y1, z1, 0.8); if (s > 0) m.tri(c, a, b); else m.tri(c, b, a); }
    }
    m.mat(M_METAL);
    for (let x = -2.3; x < 2.4; x += 0.6) { const pts = []; for (let k = 0; k <= N; k++) { const [z, y] = prof(k); pts.push([x, y * 1.008, z * 1.008]); } m.tube(pts, 0.025, 4, 0); }
    m.bar([2.51, 0, 0], [2.51, 1.85, 0], 0.03); m.box(2.5, 0.9, 0.05, 2.58, 1.02, 0.12, 0);
    return m;
  },
};

// the board of what is new, in front of the viewer's window on the corner of the playground: x, z, yaw (its face to
// +z turned toward the window); a lamp on an arm over it lights the notices (NEWS in news.js)
const NEWSB = [13.5, 18.5, -0.46];
{ const [x, z] = loc(NEWSB[0], NEWSB[1], NEWSB[2], 0, 0.62); LAMPS.push({ x, y: 3.02, z, r: 7, c: [5, 3.6, 2], t: -1 }); }
// the board: posts 3.5 apart, a dark cork panel 3.3 x 1.75 (y 0.7..2.45, face at z 0.02), a plate for its header over
// it, a little roof, the lamp's arm and shade (the bulb glows: seed -1)
PROPS10.newsBoard = () => {
  const m = new Mesh().mat(M_METAL);
  for (const x of [-1.75, 1.75]) m.box(x - 0.05, 0, -0.05, x + 0.05, 3.05, 0.05, 4, 0.5, 1);
  m.box(-1.72, 0.66, -0.05, 1.72, 0.7, 0.05); m.box(-1.72, 2.45, -0.05, 1.72, 2.49, 0.05);
  m.box(-0.85, 2.52, -0.02, 0.85, 2.82, 0.04);
  m.bar([0, 3.0, -0.25], [0, 3.14, 0.12], 3.9, 0.02); m.bar([0, 3.14, 0.12], [0, 3.0, 0.5], 3.9, 0.02);
  for (const x of [-1.95, 1.95]) m.tri(m.v(x, 2.99, -0.25), m.v(x, 3.13, 0.12), m.v(x, 2.99, 0.5));
  m.bar([0, 3.05, 0.1], [0, 3.05, 0.62], 0.03); m.tube([[0, 3.12, 0.62], [0, 2.98, 0.62]], (k) => [0.05, 0.13][k], 10, 1);
  m.mat(M_LAMP).tube([[0, 3.0, 0.62], [0, 2.97, 0.62]], 0.08, 8, 2);
  m.mat(M_TINT).box(-1.7, 0.7, -0.03, 1.7, 2.45, 0.02, 0, 0.8, 1);
  return m;
};

// the snow lying along the top of a shell garage (its own mesh: palette 16 makes it snow)
PROPS10.shellSnow = () => {
  const m = new Mesh().mat(M_TINT), N = 12, R = 1.4, H = 1.9, prof = (k) => { const a = k / N * PI; return [R * cos(a) * 1.03, H * sin(a) * 1.03 + 0.02]; };
  for (let k = 3; k < N - 3; k++) { const [z0, y0] = prof(k), [z1, y1] = prof(k + 1), w = (q) => 0.06 * sin(q / N * PI) ** 2; m.q4([-2.45, y0 + w(k), z0], [2.45, y0 + w(k), z0], [2.45, y1 + w(k + 1), z1], [-2.45, y1 + w(k + 1), z1]); }
  return m;
};

function gardens(o) {
  const { solid, reg, glare, boxes, grassY, decals } = o;
  for (const k in PROPS10) reg(k, PROPS10[k]());
  const g0 = (x, z) => max(grassY(x, z), 0), nh = BLD.length;
  // is the ground at x, z free: on a lawn, off every walkway, path and door, clear of what stands about
  const nearPath = (x, z, r) => PATHS.some((P) => { for (let k = 1; k < P.length; k++) { const [ax, az] = P[k - 1], [bx, bz] = P[k], dx = bx - ax, dz = bz - az, t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz + 1e-6), 0, 1); if (hypot(x - ax - dx * t, z - az - dz * t) < r) return true; } return false; });
  const free = (x, z, r) => grassY(x, z) >= 0 && !nearDoor(x, z, 2.4) && !nearPath(x, z, r + 0.9) && !boxes.some((b, k) => k >= nh && x > b[0] - r && x < b[2] + r && z > b[1] - r && z < b[3] + r);
  const STY = [['picket', [7, 11, 8, 13, 15, 5]], ['iron', [3, 7, 4, 2, 9]], ['net', [0]]];

  rseed(97);
  BLD.forEach((b, i) => {
    if (i < 2 || ![0, 1, 4, 5].includes(b.t)) return;
    // icicles along the eaves of the front and the back, more on some houses than others
    const ic = ihash(i, 13, 3);
    for (const s of [0, 1]) for (let u = 0.6; u < b.L - 3.4; u += 3.3) if (rnd() < ic * 0.55) { const p = toW(b, s, u + rr(0, 0.3), b.H - 0.02, 0.06); solid('icicles', p[0], p[1], p[2], p[3], 0, i * 31 + u, 1, 0, rr(0.8, 1.15)); }
    // front gardens under the windows of the ground floor, between the doors
    if (ihash(i, 11, 3) < 0.3 || b.t === 4) return;
    const [nm, pals] = STY[ihash(i, 12, 3) * 3 | 0], pal = pals[ihash(i, 14, 3) * pals.length | 0];
    const us = DOORS.filter((d) => d[3] === i).map((d) => d[5]).sort((p, q) => p - q), segs = [];
    [-1e9, ...us, 1e9].forEach((u, k, A) => { if (k) segs.push([max(A[k - 1] + 3, 1.2), min(u - 3, b.L - 1.2)]); });
    const Z = 3.6;
    for (const [a, c] of segs) {
      const n = floor((c - a) / 2); if (n < 2 || rnd() < 0.3) continue;
      const u0 = (a + c) / 2 - n, P = (u, z) => toW(b, 0, u, 0, z);
      // all of it must be free, or none of it is built
      const pts = []; for (let k = 0; k <= n * 2; k++) pts.push(P(u0 + k, Z)); pts.push(P(u0, 2.4), P(u0 + 2 * n, 2.4));
      if (!pts.every((p) => free(p[0], p[2], 0.6))) continue;
      for (let k = 0; k < n; k++) { const p = P(u0 + 1 + 2 * k, Z); solid(nm, p[0], g0(p[0], p[2]), p[2], p[3], pal, k); }
      for (const u of [u0, u0 + 2 * n]) { const p = P(u, Z - 1); solid(nm, p[0], g0(p[0], p[2]), p[2], p[3] + PI / 2, pal, u); }
      const e0 = P(u0, Z), e1 = P(u0 + 2 * n, Z);
      boxes.push([min(e0[0], e1[0]) - 0.1, min(e0[2], e1[2]) - 0.1, max(e0[0], e1[0]) + 0.1, max(e0[2], e1[2]) + 0.1, 1]);
      // what is in it: swans cut from tyres, a painted tyre ring, a concrete vase, a little fir with lights on it
      const what = rnd();
      if (what < 0.4) { for (let k = 0; k < 1 + (rnd() < 0.6); k++) { const p = P(u0 + rr(0.8, 2 * n - 0.8), rr(1.6, Z - 0.6)); solid('swan', p[0], g0(p[0], p[2]), p[2], rr(0, TAU), pick([13, 13, 11, 0]), rnd()); } }
      else if (what < 0.6) { const p = P(u0 + rr(1, 2 * n - 1), 2.3); solid('tyres', p[0], g0(p[0], p[2]), p[2], rr(0, TAU), pick([4, 5, 11, 14, 15, 7]), rnd()); }
      else if (what < 0.75) { const p = P(u0 + rr(1, 2 * n - 1), 2.3); solid('vase', p[0], g0(p[0], p[2]), p[2]); }
      if (rnd() < 0.3) {
        const p = P(u0 + rr(1, 2 * n - 1), 2.4), y = g0(p[0], p[2]), s = rr(0.26, 0.34); solid('tree4', p[0], y, p[2], rr(0, TAU), 1, 0.5, 1, 1, s);
        for (let k = 0; k < 22; k++) { const t = k / 22, r = (2.2 * (1 - t) + 0.25) * s, an = t * TAU * 3.5; glare.push(p[0] + cos(an) * r, y + (0.6 + t * 6.3) * s, p[2] + sin(an) * r, 0.12, rnd(), 0, 0, 3); }
      }
    }
  });

  // the board of what is new: the newest notice on top in the middle, the earlier ones round it half covered
  {
    const [x, z, a] = NEWSB, y = g0(x, z), at = (u, yy, zz) => { const [wx, wz] = loc(x, z, a, u, zz); return [wx, y + yy, wz]; };
    solid('newsBoard', x, y, z, a, 8, -1); boxes.push([x - 1.2, z - 1.2, x + 1.2, z + 1.2, 3]);
    glare.push(...at(0, 2.96, 0.62), 0.35, 3, 2, 1, 0);
    { const p = at(0, 2.67, 0.05); decals.push(p[0], p[1], p[2], a, 1.6, 0.225, 0, 0, 'newsHead'); }
    const SLOT = [[0.1, 1.56], [0.62, 1.64], [-0.5, 1.52], [1.15, 1.55], [-1.12, 1.6], [0.2, 1.62]];
    NEWS.forEach((e, i) => {
      const age = NEWS.length - 1 - i; if (age >= SLOT.length) return;
      const [u, yy] = SLOT[age], p = at(u, yy, 0.025 + 0.004 * (SLOT.length - age));
      decals.push(p[0], p[1], p[2], a, 0.84, 1.05, age ? 0 : 8, 0, 'news' + i);
    });
  }

  // shell garages in a row behind some of the far houses
  rseed(98);
  for (const i of [3, 6, 9, 10, 12]) {
    const b = BLD[i], n = 2 + (rnd() * 3 | 0), u0 = rr(0.15, 0.5) * b.L;
    for (let k = 0; k < n; k++) {
      const p = toW(b, 1, u0 + k * 3.2, 0, 9.5);
      if (!free(p[0], p[2], 2.8)) continue;
      solid('shell', p[0], g0(p[0], p[2]), p[2], p[3] - PI / 2, pick([7, 11, 6, 0, 10]), rnd()); solid('shellSnow', p[0], g0(p[0], p[2]), p[2], p[3] - PI / 2, SNOWPAL);
      boxes.push([p[0] - 2.2, p[2] - 2.2, p[0] + 2.2, p[2] + 2.2, 1.9]);
    }
  }
}
