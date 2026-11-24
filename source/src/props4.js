// ============================================================================
// props4: yard, street and railway props (plain script, concatenated after props3.js)
// ============================================================================

// short tube between two points (sides 6 by default), ao = one shade for the whole tube
const p4rod = (m, a, b, r, sides = 6, ao = 1) => m.tube([a, b], r, sides, 3, ao === 1 ? null : () => ao);
// upright cylinder from y0 up by h
const p4cyl = (m, x, y0, z, r, h, sides = 8, ao = 1) => p4rod(m, [x, y0, z], [x, y0 + h, z], r, sides, ao);
// closed circle of points in the plane 'xy', 'xz' or 'yz'
function p4circ(c, r, n = 10, plane = 'xy') {
  const o = [];
  for (let k = 0; k <= n; k++) {
    const a = k / n * TAU, u = cos(a) * r, w = sin(a) * r;
    o.push(plane === 'xy' ? [c[0] + u, c[1] + w, c[2]] : plane === 'xz' ? [c[0] + u, c[1], c[2] + w] : [c[0], c[1] + u, c[2] + w]);
  }
  return o;
}
// lumpy snow mound on a flat base: elliptical rings, random inward lumps, optional slope (dy per metre in x)
function p4mound(m, cx, cy, cz, rx, rz, h, o = {}) {
  const { sides = 10, rows = 3, lump = 0.12, tilt = 0, aoLo = 0.7 } = o, idx = [];
  for (let k = 0; k < rows; k++) {
    const t = k / rows, sc = cos(t * PI / 2) * (k ? 1 : 1), ring = [];
    for (let s = 0; s < sides; s++) {
      const a = s / sides * TAU, ra = 1 - rnd() * lump * (k ? 1 : 0.4);
      const x = cx + cos(a) * rx * sc * ra, z = cz + sin(a) * rz * sc * ra;
      ring.push(m.v(x, cy + h * sin(t * PI / 2) * (1 - rnd() * lump * 0.5) + tilt * (x - cx), z, mix(aoLo, 1, t)));
    }
    idx.push(ring);
  }
  for (let k = 0; k < rows - 1; k++) for (let s = 0; s < sides; s++) { const s2 = (s + 1) % sides; m.quad(idx[k][s], idx[k][s2], idx[k + 1][s2], idx[k + 1][s]); }
  const top = m.v(cx, cy + h + tilt * 0, cz, 1), last = idx[rows - 1].map((q) => m.dup(q));
  for (let s = 0; s < sides; s++) m.tri(last[s], last[(s + 1) % sides], top);
  const base = m.v(cx, cy, cz, aoLo), r0 = idx[0].map((q) => m.dup(q));
  for (let s = 0; s < sides; s++) m.tri(r0[(s + 1) % sides], r0[s], base);
}
// polyline with rounded corners (2D control points -> 3D points at depth z), straights split to <= step
function p4round(C, z, rad, step = 1) {
  const o = [], push = (x, y) => o.push([x, y, z]), seg = (a, b) => { const n = max(1, Math.ceil(hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let k = 1; k < n; k++) push(mix(a[0], b[0], k / n), mix(a[1], b[1], k / n)); };
  push(C[0][0], C[0][1]);
  let cur = C[0];
  for (let i = 1; i < C.length - 1; i++) {
    const p = C[i], q = C[i + 1], d1 = [p[0] - cur[0], p[1] - cur[1]], l1 = hypot(...d1), d2 = [q[0] - p[0], q[1] - p[1]], l2 = hypot(...d2);
    const a = [p[0] - d1[0] / l1 * rad, p[1] - d1[1] / l1 * rad], b = [p[0] + d2[0] / l2 * rad, p[1] + d2[1] / l2 * rad];
    seg(cur, a); push(a[0], a[1]);
    for (let k = 1; k < 4; k++) { const t = k / 4; push((1 - t) * (1 - t) * a[0] + 2 * t * (1 - t) * p[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * t * (1 - t) * p[1] + t * t * b[1]); }
    push(b[0], b[1]); cur = b;
  }
  const e = C[C.length - 1]; seg(cur, e); push(e[0], e[1]);
  return o;
}

const PROPS4 = {
  rink() { // hockey box 30 x 15 centred on the origin (length along x), entrance gap in the +z side; floodlight pole at (15.8, 0, -8.3), lamp head centre about (15.3, 7.2, -7.8) pointing in; no ice
    const m = new Mesh().mat(M_TINT), R = 3, hl = 15, hw = 7.5, g = 0.6, P = [[g, hw]];
    const arc = (cx, cz, a0, a1) => { for (let k = 0; k <= 4; k++) { const a = mix(a0, a1, k / 4); P.push([cx + R * cos(a), cz + R * sin(a)]); } };
    arc(hl - R, hw - R, PI / 2, 0); arc(hl - R, -(hw - R), 0, -PI / 2); arc(-(hl - R), -(hw - R), -PI / 2, -PI); arc(-(hl - R), hw - R, PI, PI / 2); P.push([-g, hw]);
    for (let k = 0; k < P.length - 1; k++) {
      const a = P[k], b = P[k + 1];
      m.bar([a[0], 0.55, a[1]], [b[0], 0.55, b[1]], 0.06, 1.1, 0.7);
      m.bar([a[0], 1.13, a[1]], [b[0], 1.13, b[1]], 0.12, 0.05);
    }
    for (const p of P) m.bar([p[0], 0, p[1]], [p[0], 1.1, p[1]], 0.1, 0.1, 0.6);
    // goals face the middle
    const goal = (gx, d) => {
      const bk = gx + d * 0.62, z = 0.915;
      m.mat(M_RED);
      for (const s of [-1, 1]) { m.bar([gx, 0, s * z], [gx, 1.22, s * z], 0.06, 0.06, 0.6); m.bar([gx, 0.03, s * z], [bk, 0.03, s * z], 0.05, 0.05, 0.6); m.bar([gx, 1.22, s * z], [bk, 0.05, s * z], 0.04, 0.04); }
      m.bar([gx, 1.22, -z], [gx, 1.22, z], 0.06, 0.06); m.bar([bk, 0.03, -z], [bk, 0.03, z], 0.05, 0.05, 0.6);
      m.mat(M_METAL);
      for (let k = -3; k <= 3; k++) m.bar([gx, 1.22, k * 0.28], [bk, 0.04, k * 0.28], 0.012, 0.012);
      for (const f of [0.35, 0.7]) m.bar([mix(gx, bk, f), mix(1.22, 0.04, f), -z], [mix(gx, bk, f), mix(1.22, 0.04, f), z], 0.012, 0.012);
      for (let k = 1; k < 6; k++) for (const s of [-1, 1]) m.bar([mix(gx, bk, k / 6), mix(1.22, 0.04, k / 6), s * z], [mix(gx, bk, k / 6), 0.03, s * z], 0.012, 0.012);
    };
    goal(-13, -1); goal(13, 1);
    // floodlight
    m.mat(M_METAL); m.tube([[15.8, 0, -8.3], [15.8, 7, -8.3]], (k) => [0.11, 0.07][k], 6, 2);
    m.bar([15.8, 6.9, -8.3], [15.35, 7.15, -7.85], 0.08, 0.08); m.at(15.3, 7.2, -7.8, -PI / 4).box(-0.4, -0.2, -0.12, 0.4, 0.2, 0.12, 0, 0.8, 1); m.at(0, 0, 0);
    return m;
  },
  stick() { // lying on the ground, shaft along x from -0.7 to 0.7, puck beside it
    const m = new Mesh().mat(M_BARK);
    m.bar([-0.7, 0.014, 0], [0.5, 0.014, 0.1], 0.026, 0.028, 0.8); m.bar([0.5, 0.02, 0.1], [0.72, 0.02, 0.22], 0.012, 0.075, 0.8);
    m.mat(M_DARK); p4cyl(m, 0.05, 0, 0.33, 0.038, 0.025, 8, 0.8); return m;
  },
  iceslide() { // platform centred on the origin, 1.9 m high, ladder at -x, slope runs down along +x to about x = 6.15
    const m = new Mesh().mat(M_BARK); m.box(-0.55, 1.84, -0.55, 0.55, 1.9, 0.55, 0, 0.8, 1);
    m.mat(M_METAL);
    for (const x of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) { m.bar([x, 0, z], [x, 1.84, z], 0.07, 0.07, 0.6); m.bar([x, 1.9, z], [x, 2.7, z], 0.04, 0.04); }
    for (const z of [-0.5, 0.5]) { m.bar([-0.5, 2.7, z], [0.5, 2.7, z], 0.04, 0.04); m.bar([-0.5, 2.3, z], [0.5, 2.3, z], 0.03, 0.03); }
    for (const z of [-1, 1]) { m.bar([-0.5, 2.7, z * 0.5], [-0.5, 2.7, z * 0.28], 0.04, 0.04); m.bar([-0.5, 2.3, z * 0.5], [-0.5, 2.3, z * 0.28], 0.03, 0.03); }
    m.bar([-0.5, 2.7, -0.5], [-0.5, 2.7, -0.28], 0.04, 0.04);
    for (const z of [-0.28, 0.28]) m.bar([-1.15, 0, z], [-0.5, 1.95, z], 0.05, 0.05, 0.6);
    for (let k = 1; k <= 7; k++) { const y = k * 0.26; m.bar([-1.15 + 0.65 * y / 1.95, y, -0.28], [-1.15 + 0.65 * y / 1.95, y, 0.28], 0.03, 0.03, 0.7); }
    const sl = (dy, z) => { const a = []; for (let k = 0; k <= 10; k++) { const t = k / 10; a.push([0.55 + 5.6 * t, 0.06 + 1.8 * pow(1 - t, 1.6) + dy, z]); } return a; };
    m.mat(M_CONC); m.sweep(sl(0, 0), 0.62, 0.06, null, true, 0.9);
    for (const z of [-0.33, 0.33]) m.sweep(sl(0.08, z), 0.04, 0.14, null, true, 0.9);
    m.mat(M_METAL);
    for (const t of [0.4, 0.75]) for (const z of [-0.3, 0.3]) m.bar([0.55 + 5.6 * t, 0, z], [0.55 + 5.6 * t, 0.06 + 1.8 * pow(1 - t, 1.6) - 0.03, z], 0.05, 0.05, 0.6);
    return m;
  },
  dryer() { // posts at x = -2 and 2, four lines at y 1.85 (z -0.45..0.45), frozen laundry hangs below; sway weights
    const m = new Mesh().mat(M_METAL), zs = [-0.45, -0.15, 0.15, 0.45];
    for (const x of [-2, 2]) { m.bar([x, 0, 0], [x, 2, 0], 0.06, 0.06, 0, 0.6); m.bar([x, 1.96, -0.55], [x, 1.96, 0.55], 0.04, 0.04, 0); for (const z of zs) m.bar([x, 1.85, z], [x, 1.96, z], 0.015, 0.015, 0); }
    m.mat(M_DARK); for (const z of zs) m.bar([-2, 1.85, z], [2, 1.85, z], 0.012, 0.012, 0);
    const sheet = (x0, x1, y0, z, mt) => { m.mat(mt).box(x0, y0, z - 0.008, x1, 1.85, z + 0.008, 0, 1, 0); };
    sheet(-1.8, -0.5, 0.55, -0.45, M_CONC); sheet(0, 1.5, 0.45, -0.45, M_CONC);
    const shirt = (x, z, mt) => {
      m.mat(mt).box(x - 0.2, 1.2, z - 0.01, x + 0.2, 1.85, z + 0.01, 0, 1, 0);
      for (const s of [-1, 1]) m.bar([x + s * 0.2, 1.82, z], [x + s * 0.38, 1.64, z], 0.02, 0.12, 0.6);
    };
    shirt(-1.4, -0.15, M_CONC); shirt(-0.4, -0.15, M_YEL); shirt(0.8, -0.15, M_RED);
    const towel = (x, z, h, w, mt) => { m.mat(mt).box(x - w / 2, 1.85 - h, z - 0.012, x + w / 2, 1.85, z + 0.012, 0, 1, 0); };
    towel(-1.5, 0.15, 0.8, 0.45, M_RED); towel(-0.7, 0.15, 0.85, 0.5, M_CONC); towel(0.2, 0.15, 0.7, 0.4, M_YEL); towel(1.2, 0.15, 0.9, 0.5, M_CONC);
    [[-1.3, M_CONC], [-1.15, M_CONC], [-0.5, M_RED], [-0.35, M_RED], [0.3, M_CONC], [0.45, M_YEL], [1.1, M_CONC], [1.25, M_CONC]].forEach(([x, mt]) => m.mat(mt).box(x - 0.035, 1.63, 0.44, x + 0.035, 1.85, 0.46, 0, 1, 0));
    return m;
  },
  carpetbar() { // posts at x = -1.3 and 1.3, top bar at y 2; the carpet hangs over it; sway weights
    const m = new Mesh().mat(M_METAL);
    for (const x of [-1.3, 1.3]) { m.bar([x, 0, 0], [x, 2.05, 0], 0.08, 0.08, 0, 0.6); for (const y of [1.55, 1.1]) m.bar([x, y, 0], [x, y, 0.3], 0.05, 0.05, 0); }
    m.bar([-1.3, 2, 0], [1.3, 2, 0], 0.06, 0.06, 0);
    for (const y of [1.55, 1.1]) m.bar([-1.3, y, 0.3], [1.3, y, 0.3], 0.05, 0.05, 0);
    m.mat(M_RED); m.box(-0.8, 2.03, -0.07, 0.8, 2.09, 0.07, 0, 0, 0);
    m.box(-0.8, 1.05, 0.05, 0.8, 2.09, 0.09, 4, 0.8, 0); m.box(-0.8, 0.95, -0.09, 0.8, 2.09, -0.05, 4, 0.8, 0);
    return m;
  },
  sandbox() { // 2 x 2 x 0.3 on the ground, closed plank lid
    const m = new Mesh().mat(M_BARK);
    m.box(-1, 0, 0.95, 1, 0.3, 1, 0, 0.6, 1); m.box(-1, 0, -1, 1, 0.3, -0.95, 0, 0.6, 1); m.box(-1, 0, -0.95, -0.95, 0.3, 0.95, 0, 0.6, 1); m.box(0.95, 0, -0.95, 1, 0.3, 0.95, 0, 0.6, 1);
    for (const x of [-1, 0.95]) for (const z of [-1, 0.95]) m.box(x - 0.01, 0, z - 0.01, x + 0.06, 0.3, z + 0.06, 0, 0.6, 1);
    for (let k = 0; k < 8; k++) m.box(-0.95 + k * 0.2375 + 0.004, 0.24, -0.95, -0.95 + (k + 1) * 0.2375 - 0.004, 0.29, 0.95, 4, 1, 1);
    for (const x of [-0.6, 0.6]) m.box(x - 0.04, 0.2, -0.9, x + 0.04, 0.24, 0.9, 4);
    return m;
  },
  seesaw() { // beam along x on a pivot 0.5 m high, tilted 10 degrees (+x end up)
    const m = new Mesh().mat(M_YEL), A = 10 * PI / 180, ty = tan(A), f = (x) => 0.55 + x * ty, c = cos(A), s = sin(A);
    m.bar([-1.7 * c, f(-1.7 * c), 0], [1.7 * c, f(1.7 * c), 0], 0.22, 0.06);
    for (const e of [-1, 1]) {
      const x = e * 1.35 * c; m.bar([x - 0.14, f(x - 0.14) + 0.05, 0], [x + 0.14, f(x + 0.14) + 0.05, 0], 0.26, 0.04);
    }
    m.mat(M_METAL);
    for (const e of [-1, 1]) { const x = e * 1.0 * c; m.sweep([[x, f(x) + 0.03, -0.1], [x, f(x) + 0.32, -0.1], [x, f(x) + 0.32, 0.1], [x, f(x) + 0.03, 0.1]], 0.03, 0.03); }
    for (const z of [-0.14, 0.14]) { m.bar([-0.4, 0, z], [0, 0.5, z], 0.04, 0.04, 0.6); m.bar([0.4, 0, z], [0, 0.5, z], 0.04, 0.04, 0.6); }
    m.bar([0, 0.5, -0.14], [0, 0.5, 0.14], 0.05, 0.05); m.bar([-0.4, 0.04, -0.14], [-0.4, 0.04, 0.14], 0.04, 0.04, 0.6); m.bar([0.4, 0.04, -0.14], [0.4, 0.04, 0.14], 0.04, 0.04, 0.6);
    return m;
  },
  rocket() { // climbing frame 5.5 m high, centred on the origin; ladder inside at z = -0.4, small platform at y 3.5
    const m = new Mesh().mat(M_METAL), rad = (y) => (y < 1.5 ? 0.85 + 0.1 * y / 1.5 : 0.95 - 0.4 * (y - 1.5) / 2.1);
    for (const y of [0.15, 1.2, 2.2, 3.2, 3.6]) m.tube(p4circ([0, y, 0], rad(y), 12, 'xz'), 0.025, 5, 0, () => (y < 1 ? 0.6 : 1));
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; m.tube([0.15, 1.2, 2.2, 3.2, 3.6].map((y) => [cos(a) * rad(y), y, sin(a) * rad(y)]), 0.02, 5, 3, (j) => (j === 0 ? 0.6 : 1)); }
    m.tube([[0, 3.6, 0], [0, 4.8, 0], [0, 5.5, 0]], 0.02, 5, 3);
    m.mat(M_RED); m.tube([[0, 3.58, 0], [0, 4.6, 0], [0, 5.5, 0]], (k) => [0.58, 0.3, 0][k], 8, 0);
    for (let k = 0; k < 3; k++) {
      const a = k / 3 * TAU + PI / 6, c = cos(a), s = sin(a), P = (x, y, z) => [x * c - z * s, y, x * s + z * c];
      const v = [P(0.9, 2.4, 0.025), P(0.9, 0.1, 0.025), P(1.9, 0.1, 0.025)], w = [P(0.9, 2.4, -0.025), P(0.9, 0.1, -0.025), P(1.9, 0.1, -0.025)];
      m.tri(m.v(...v[0], 1), m.v(...v[1], 0.7), m.v(...v[2], 0.7)); m.tri(m.v(...w[0], 1), m.v(...w[2], 0.7), m.v(...w[1], 0.7));
      m.bar(P(0.9, 2.4, 0), P(1.9, 0.1, 0), 0.05, 0.03, 0.8); m.bar(P(0.9, 0.1, 0), P(1.9, 0.1, 0), 0.05, 0.03, 0.6);
    }
    m.mat(M_METAL);
    for (const x of [-0.2, 0.2]) m.bar([x, 0, -0.4], [x, 3.7, -0.4], 0.04, 0.04, 0.6);
    for (let y = 0.3; y < 3.6; y += 0.3) m.bar([-0.2, y, -0.4], [0.2, y, -0.4], 0.03, 0.03);
    m.box(-0.35, 3.45, -0.1, 0.35, 3.5, 0.35, 0, 0.8, 1);
    return m;
  },
  domino() { // table 1.4 x 0.8 (long side along x) with two benches, under a sloping roof 3 (x) by 2.4 (z), high side at +z
    const m = new Mesh().mat(M_BARK);
    for (const x of [-1.3, 1.3]) for (const z of [-1, 1]) m.bar([x, 0, z], [x, z > 0 ? 2.35 : 2.05, z], 0.1, 0.1, 0.6);
    for (const x of [-1.3, 1.3]) m.bar([x, 2.0, -1], [x, 2.3, 1], 0.06, 0.06);
    m.box(-0.7, 0.72, -0.4, 0.7, 0.78, 0.4, 0, 0.8, 1);
    for (const x of [-0.55, 0.55]) for (const z of [-0.3, 0.3]) m.box(x - 0.04, 0, z - 0.04, x + 0.04, 0.72, z + 0.04, 0, 0.6, 1);
    for (const z of [-0.75, 0.75]) { m.box(-0.6, 0.43, z - 0.14, 0.6, 0.47, z + 0.14, 0, 0.8, 1); for (const x of [-0.5, 0.5]) m.box(x - 0.03, 0, z - 0.1, x + 0.03, 0.43, z + 0.1, 0, 0.6, 1); }
    m.mat(M_METAL).sweep([[0, 2.45, 1.3], [0, 2.1, -1.3]], 3, 0.04, null, true, 1);
    return m;
  },
  garageOpen() { // same outline as PROPS.garage (3.2 x 5.8 x 2.1, ridge 2.5 at x = 0); front is +z, leaves swung out 100 degrees, bulb centre (0, 1.95, 0.5)
    const m = new Mesh().mat(M_TINT);
    m.box(-1.6, 0, -2.9, -1.55, 2.1, 2.9, 4 | 8, 0.55, 1); m.box(1.55, 0, -2.9, 1.6, 2.1, 2.9, 4 | 8, 0.55, 1); m.box(-1.55, 0, -2.9, 1.55, 2.1, -2.85, 4 | 8 | 32, 0.55, 1);
    m.box(-1.6, 1.98, 2.86, 1.6, 2.1, 2.9, 4 | 16, 0.9, 1);
    for (const z of [-2.9, 2.9]) m.tri(m.v(-1.6, 2.1, z), m.v(1.6, 2.1, z), m.v(0, 2.48, z));
    m.mat(M_METAL).q4([-1.75, 2.08, -3], [-1.75, 2.08, 3], [0, 2.5, 3], [0, 2.5, -3]); m.q4([0, 2.5, -3], [0, 2.5, 3], [1.75, 2.08, 3], [1.75, 2.08, -3]);
    m.mat(M_DARK).box(-1.55, 0, -2.85, 1.55, 0.02, 2.9, 0, 0.6, 0.6);
    // doors
    for (const e of [-1, 1]) {
      m.at(e * 1.6, 0, 2.9, e < 0 ? -PI * 100 / 180 : -PI * 80 / 180); m.mat(M_TINT).box(0, 0.04, -0.02, 1.6, 1.98, 0.02, 0, 0.8, 1);
      m.mat(M_METAL).box(0, 0.04, 0.02, 1.6, 0.1, 0.04); m.box(0, 1.9, 0.02, 1.6, 1.98, 0.04); m.box(0.78, 0.04, 0.02, 0.82, 1.98, 0.04); m.box(1.5, 0.9, 0.02, 1.56, 1.1, 0.06);
    }
    m.at(0, 0, 0);
    // back shelf
    m.mat(M_BARK);
    for (const y of [0.8, 1.35]) m.box(-1.45, y, -2.85, 1.45, y + 0.03, -2.5, 4);
    for (const x of [-1.45, 0, 1.45]) m.box(x - 0.025, 0, -2.85, x + 0.025, 1.5, -2.8);
    rseed(4001);
    for (const y of [0.83, 1.38]) { let x = -1.4; while (x < 1.2) { const w = rr(0.2, 0.4), h = rr(0.12, 0.28); m.box(x, y, -2.84, x + w, y + h, -2.84 + rr(0.15, 0.3), 0, 0.7, 1); x += w + rr(0.05, 0.14); } }
    m.mat(M_METAL); for (let k = 0; k < 6; k++) p4cyl(m, -1.3 + k * 0.23, 0.38, -2.7 + (k & 1) * 0.1, 0.045, 0.1, 6, 0.7);
    for (let k = 0; k < 7; k++) p4cyl(m, -1.35 + k * 0.4, 1.38 + 0.0, -2.62, 0.04, rr(0.1, 0.16), 6, 0.8);
    // workbench along the left wall
    m.mat(M_BARK).box(-1.55, 0.86, -1.9, -0.95, 0.92, -0.3, 0, 0.8, 1);
    for (const z of [-1.85, -0.35]) for (const x of [-1.5, -1]) m.box(x - 0.035, 0, z - 0.035, x + 0.035, 0.86, z + 0.035, 0, 0.6, 1);
    m.box(-1.5, 0.3, -1.85, -1, 0.34, -0.35, 0, 0.6, 0.8);
    m.mat(M_METAL).box(-1.4, 0.92, -1.2, -1.2, 1.02, -1.0); p4cyl(m, -1.3, 0.92, -0.7, 0.05, 0.12, 6); m.mat(M_DARK).box(-1.5, 0.92, -1.7, -1.35, 0.95, -1.6);
    // tyres
    m.mat(M_DARK); for (let k = 0; k < 4; k++) p4cyl(m, 1.05 + (k & 1) * 0.04, k * 0.2, -1.45, 0.32, 0.2, 8, mix(0.5, 1, k / 4));
    p4cyl(m, 1.1, 0.8, -1.45, 0.3, 0.01, 8); m.mat(M_METAL); p4cyl(m, 1.1, 0.81, -1.45, 0.12, 0.01, 6);
    // bulb on a flex from the ridge
    m.mat(M_DARK).bar([0, 1.99, 0.5], [0, 2.48, 0.5], 0.012, 0.012); m.mat(M_LAMP).box(-0.04, 1.91, 0.46, 0.04, 1.99, 0.54);
    return m;
  },
  cat() { // sitting, 0.3 m tall, facing +z, tail curled to +x
    rseed(4011);
    const m = new Mesh().mat(M_TINT);
    p2loft(m, [p2R(0, 0.07, 0.1, 0, -0.02, 0.6), p2R(0.08, 0.09, 0.12, 0, -0.03, 0.7), p2R(0.17, 0.07, 0.08, 0, 0.0), p2R(0.21, 0.04, 0.05, 0, 0.03)], 8);
    p2ball(m, 0, 0.235, 0.055, 0.048, 4, 8, 0.95, 0.8);
    for (const s of [-1, 1]) { m.tube([[s * 0.03, 0.26, 0.05], [s * 0.04, 0.3, 0.05]], (k) => [0.02, 0.003][k], 4, 1); m.bar([s * 0.035, 0, 0.07], [s * 0.04, 0.15, 0.065], 0.035, 0.03, 0.7); }
    m.tube([[0.06, 0.03, -0.1], [0.13, 0.03, -0.07], [0.16, 0.03, 0.01], [0.13, 0.04, 0.08], [0.08, 0.06, 0.1]], (k) => 0.018 - k * 0.002, 5, 2);
    return m;
  },
  catLying() { // curled up, 0.4 long along x, head at -x
    const m = new Mesh().mat(M_TINT);
    p2loft(m, [p2R(0, 0.17, 0.11, 0.02, 0, 0.55), p2R(0.05, 0.2, 0.125, 0.02, 0, 0.7), p2R(0.1, 0.17, 0.1, 0.02, 0, 0.9), p2R(0.13, 0.08, 0.05, 0.02, 0)], 10);
    p2ball(m, -0.16, 0.06, 0.11, 0.05, 4, 8, 0.9, 0.7);
    for (const s of [-1, 1]) m.tube([[-0.17 + s * 0.02, 0.1, 0.12], [-0.17 + s * 0.03, 0.14, 0.12]], (k) => [0.018, 0.003][k], 4, 1);
    m.tube([[0.15, 0.025, 0.09], [0.04, 0.025, 0.14], [-0.08, 0.025, 0.15], [-0.15, 0.03, 0.13]], (k) => 0.018 - k * 0.003, 5, 2, () => 0.8);
    return m;
  },
  dovecote() { // hut on four legs, centred on the origin, front (+z) with openings and a landing at y 2; ladder at the front, x = +-0.2
    const m = new Mesh().mat(M_BARK);
    for (const x of [-0.85, 0.85]) for (const z of [-0.85, 0.85]) m.bar([x, 0, z], [x, 2, z], 0.1, 0.1, 0.6);
    for (const y of [0.9]) { for (const z of [-0.85, 0.85]) m.bar([-0.85, y, z], [0.85, y, z], 0.04, 0.04, 0.7); for (const x of [-0.85, 0.85]) m.bar([x, y, -0.85], [x, y, 0.85], 0.04, 0.04, 0.7); }
    m.box(-1.05, 1.96, -1.05, 1.05, 2, 1.05, 0, 0.6, 0.8);
    m.mat(M_TINT).box(-1, 2, -1, 1, 3.6, 1, 4, 0.7, 1);
    for (const z of [-1, 1]) m.tri(m.v(-1, 3.6, z), m.v(1, 3.6, z), m.v(0, 4.05, z));
    m.mat(M_METAL).q4([-1.2, 3.55, -1.2], [-1.2, 3.55, 1.2], [0, 4.15, 1.2], [0, 4.15, -1.2]); m.q4([0, 4.15, -1.2], [0, 4.15, 1.2], [1.2, 3.55, 1.2], [1.2, 3.55, -1.2]);
    m.mat(M_DARK); for (const x of [-0.6, -0.2, 0.2, 0.6]) m.box(x - 0.1, 2.35, 1, x + 0.1, 2.6, 1.012);
    m.box(-0.2, 3.1, 1, 0.2, 3.4, 1.012);
    m.mat(M_BARK);
    for (const x of [-0.6, -0.2, 0.2, 0.6]) m.bar([x, 2.3, 1], [x, 2.3, 1.15], 0.03, 0.03);
    m.box(-0.95, 2, 1, 0.95, 2.04, 1.4);
    for (const x of [-0.95, -0.8, -0.65, -0.5, -0.35, 0.35, 0.5, 0.65, 0.8, 0.95]) m.bar([x, 2.04, 1.38], [x, 2.5, 1.38], 0.02, 0.02);
    m.bar([-0.95, 2.5, 1.38], [-0.35, 2.5, 1.38], 0.03, 0.03); m.bar([0.35, 2.5, 1.38], [0.95, 2.5, 1.38], 0.03, 0.03);
    for (const x of [-0.95, 0.95]) m.bar([x, 2.5, 1], [x, 2.5, 1.38], 0.03, 0.03);
    for (const x of [-0.2, 0.2]) m.bar([x, 0, 2], [x, 2.02, 1.38], 0.045, 0.045, 0.6);
    for (let k = 1; k <= 8; k++) { const t = k / 9.2, z = mix(2, 1.38, t), y = mix(0, 2.02, t); m.bar([-0.2, y, z], [0.2, y, z], 0.03, 0.03, 0.7); }
    return m;
  },
  heatpipe() { // two pipes along x from 0 to 24 at y 0.8 (z = -0.38, +0.38); expansion bend over x 10..14 rising to y 4.0 (pipe centre 3.75)
    rseed(4013);
    const m = new Mesh().mat(M_METAL);
    for (const z of [-0.38, 0.38]) {
      const pts = p4round([[0, 0.8], [10, 0.8], [10, 3.75], [14, 3.75], [14, 0.8], [24, 0.8]], z, 0.8, 1), rd = pts.map(() => 0.25 + rr(-0.012, 0.018));
      m.tube(pts, (k) => rd[k], 7, 3);
    }
    m.mat(M_CONC);
    for (const x of [1, 5, 9, 15, 19, 23]) for (const z of [-0.38, 0.38]) m.box(x - 0.15, 0, z - 0.17, x + 0.15, 0.6, z + 0.17, 0, 0.55, 1);
    for (const x of [1, 5, 9, 15, 19, 23]) m.box(x - 0.15, 0, -0.6, x + 0.15, 0.1, 0.6, 0, 0.55, 0.8);
    m.mat(M_METAL); for (const x of [3, 7, 17, 21]) m.bar([x, 0.82, -0.63], [x, 0.82, 0.63], 0.04, 0.5);
    return m;
  },
  bike() { // 1.7 m long along x (wheels at x = +-0.51, r 0.33), leaning toward +z by about 11 degrees
    const m = new Mesh(), a = 0.2, P = (x, y, z = 0) => [x, y * cos(a) - z * sin(a), y * sin(a) + z * cos(a)];
    m.mat(M_DARK);
    for (const x of [-0.51, 0.51]) m.tube(p4circ([x, 0.33, 0], 0.31, 14, 'xy').map((p) => P(...p)), 0.025, 5, 0);
    m.mat(M_METAL);
    for (const x of [-0.51, 0.51]) p4rod(m, P(x, 0.33, -0.04), P(x, 0.33, 0.04), 0.018, 5);
    const T = (...pts) => m.tube(pts.map((p) => P(...p)), 0.014, 5, 3);
    T([0, 0.3], [-0.2, 0.88]); T([0, 0.3], [0.38, 0.78]); T([-0.2, 0.88], [0.38, 0.78]); T([-0.2, 0.88], [-0.51, 0.33]); T([0, 0.3], [-0.51, 0.33]); T([0.38, 0.78], [0.51, 0.33]); T([0.36, 0.84], [0.42, 1.0]);
    m.tube([P(0.42, 1.0, -0.2), P(0.42, 1.0, 0.2)], 0.012, 5, 3); T([-0.2, 0.88], [-0.22, 0.98]);
    m.mat(M_DARK); m.tube([P(-0.34, 1.0), P(-0.18, 1.02)], 0.035, 6, 3);
    return m;
  },
  feeder() { // origin at the top of the string; carton hangs from y -0.25 to -0.45
    const m = new Mesh().mat(M_CONC);
    m.box(-0.045, -0.45, -0.045, 0.045, -0.25, 0.045, 0, 0.7, 1);
    m.q4([-0.045, -0.25, 0.045], [0.045, -0.25, 0.045], [0.045, -0.25, 0], [-0.045, -0.25, 0]); m.q4([-0.045, -0.25, 0], [0.045, -0.25, 0], [0.045, -0.25, -0.045], [-0.045, -0.25, -0.045]);
    m.q4([-0.045, -0.25, 0.045], [0.045, -0.25, 0.045], [0.045, -0.2, 0.0], [-0.045, -0.2, 0.0]); m.q4([-0.045, -0.2, 0], [0.045, -0.2, 0], [0.045, -0.25, -0.045], [-0.045, -0.25, -0.045]);
    m.tri(m.v(-0.045, -0.25, 0.045), m.v(-0.045, -0.2, 0), m.v(-0.045, -0.25, -0.045)); m.tri(m.v(0.045, -0.25, -0.045), m.v(0.045, -0.2, 0), m.v(0.045, -0.25, 0.045));
    m.mat(M_DARK).box(-0.03, -0.4, 0.045, 0.03, -0.32, 0.0475);
    m.bar([0, 0, 0], [-0.02, -0.2, 0], 0.004, 0.004); m.bar([0, 0, 0], [0.02, -0.2, 0], 0.004, 0.004);
    return m;
  },
  birdhouse() { // origin at the back of the board (board x +-0.12, y -0.1..0.5); box 0.2 x 0.32 x 0.2 in +z at y 0..0.32
    const m = new Mesh().mat(M_BARK);
    m.box(-0.12, -0.1, 0, 0.12, 0.5, 0.02, 0, 0.8, 1); m.box(-0.1, 0, 0.02, 0.1, 0.32, 0.22, 4 | 16, 0.7, 1);
    m.q4([-0.12, 0.31, 0.01], [-0.12, 0.38, 0.01], [-0.12, 0.33, 0.27], [-0.12, 0.32, 0.27]); m.q4([0.12, 0.32, 0.27], [0.12, 0.33, 0.27], [0.12, 0.38, 0.01], [0.12, 0.31, 0.01]);
    m.q4([-0.12, 0.38, 0.01], [0.12, 0.38, 0.01], [0.12, 0.33, 0.27], [-0.12, 0.33, 0.27]); m.q4([-0.12, 0.31, 0.01], [0.12, 0.31, 0.01], [0.12, 0.32, 0.27], [-0.12, 0.32, 0.27], 0.8);
    m.mat(M_DARK).tube([[0, 0.2, 0.221], [0, 0.2, 0.226]], 0.03, 8, 3);
    m.mat(M_BARK).bar([0, 0.1, 0.22], [0, 0.1, 0.29], 0.015, 0.015);
    return m;
  },
  shovel() { // tip in the ground at the origin, leaning 20 degrees toward +x; blade buried about 0.12 m; handle top near y 1.4
    const m = new Mesh().mat(M_METAL), a = 20 * PI / 180, u = [sin(a), cos(a), 0], at = (t) => [u[0] * t, -0.12 + u[1] * t, 0];
    m.bar(at(0), at(0.4), 0.5, 0.012, 0.6); for (const z of [-0.25, 0.25]) m.bar([at(0)[0], at(0)[1], z], [at(0.4)[0], at(0.4)[1], z], 0.012, 0.045, 0.7);
    m.mat(M_BARK).tube([at(0.35), at(1.65)], 0.017, 6, 3);
    const g = at(1.65); m.bar([g[0], g[1], -0.1], [g[0], g[1], 0.1], 0.04, 0.035);
    return m;
  },
  barrier() { // post at the origin, arm along +x at y about 1.05 from x -0.7 to 4.0, counterweight at -x
    const m = new Mesh().mat(M_METAL);
    m.box(-0.15, 0, -0.15, 0.15, 1, 0.15, 0, 0.6, 1); m.box(-0.12, 1, -0.12, 0.12, 1.04, 0.12);
    for (let k = 0; k < 8; k++) { m.mat(k & 1 ? M_CONC : M_RED); m.bar([k * 0.5, 1.1, 0], [k * 0.5 + 0.5, 1.1, 0], 0.1, 0.1); }
    m.mat(M_METAL).bar([-0.7, 1.1, 0], [0, 1.1, 0], 0.1, 0.1); m.mat(M_DARK).box(-1, 0.98, -0.1, -0.55, 1.22, 0.1, 0, 0.8, 1);
    return m;
  },
  carSnow() { // car 4.4 long along x, nose +x; roof cap centred x -0.3 at y 1.42, bonnet x 0.9..2.0 at y ~0.95, boot x -2.1..-1.5 at y ~0.98, width 1.4
    rseed(4019);
    const m = new Mesh().mat(M_TINT);
    p4mound(m, -0.3, 1.42, 0, 0.65, 0.7, 0.1, { sides: 12, rows: 3, lump: 0.1 });
    p4mound(m, 1.45, 0.95, 0, 0.55, 0.65, 0.07, { sides: 10, rows: 3, lump: 0.1, tilt: -0.07 });
    p4mound(m, -1.8, 0.98, 0, 0.3, 0.65, 0.07, { sides: 10, rows: 3, lump: 0.1 });
    return m;
  },
  moto() { // motorcycle under a tarpaulin: 2 m along x (-1..1), 1.1 high, hem at y 0.22 so the wheel bottoms show
    rseed(4020);
    const m = new Mesh().mat(M_TINT), st = [[-1, 0.5, 0.12], [-0.8, 0.8, 0.26], [-0.5, 0.95, 0.3], [-0.1, 0.9, 0.28], [0.2, 1.02, 0.3], [0.55, 1.1, 0.4], [0.8, 0.9, 0.3], [1, 0.55, 0.12]], N = 10, rings = [];
    for (const [x, h, w] of st) {
      const yc = (0.22 + h) / 2, ry = (h - 0.22) / 2, r = [];
      for (let s = 0; s < N; s++) { const a = s / N * TAU, ca = cos(a), sa = sin(a), l = 1 - rnd() * 0.08; r.push(m.v(x, yc + ry * Math.sign(sa) * pow(abs(sa), 0.7) * l, w * Math.sign(ca) * pow(abs(ca), 0.8) * l, mix(0.6, 1, (sa + 1) / 2))); }
      rings.push(r);
    }
    for (let k = 0; k < rings.length - 1; k++) for (let s = 0; s < N; s++) { const s2 = (s + 1) % N; m.quad(rings[k][s], rings[k][s2], rings[k + 1][s2], rings[k + 1][s]); }
    for (const [k, x, h] of [[0, -1, 0.5], [rings.length - 1, 1, 0.55]]) { const c = m.v(x, (0.22 + h) / 2, 0, 0.8), r = rings[k].map((q) => m.dup(q)); for (let s = 0; s < N; s++) m.tri(r[s], r[(s + 1) % N], c); }
    m.mat(M_DARK); for (const x of [-0.65, 0.65]) m.tube(p4circ([x, 0.32, 0], 0.25, 10, 'xy'), 0.07, 6, 0, () => 0.7);
    return m;
  },
  sled() { // 0.9 long along x (x -0.45..0.47), runners at z = +-0.17, back rest at -x
    const m = new Mesh().mat(M_METAL);
    for (const z of [-0.17, 0.17]) { m.tube([[-0.45, 0.04, z], [0.25, 0.03, z], [0.4, 0.05, z], [0.47, 0.13, z], [0.43, 0.22, z]], 0.012, 5, 3); for (const x of [-0.35, 0, 0.3]) m.bar([x, 0.04, z], [x, 0.13, z], 0.02, 0.02); m.bar([-0.4, 0.13, z], [-0.46, 0.52, z], 0.025, 0.025); m.bar([-0.4, 0.13, z], [0.35, 0.13, z], 0.02, 0.02); }
    m.mat(M_BARK);
    for (let k = 0; k < 6; k++) { const x = -0.34 + k * 0.12; m.bar([x, 0.15, -0.2], [x, 0.15, 0.2], 0.09, 0.025, 0.8); }
    for (const y of [0.26, 0.36, 0.46]) { const x = -0.41 - (y - 0.13) * 0.15; m.bar([x, y, -0.19], [x, y, 0.19], 0.025, 0.07); }
    return m;
  },
  fort() { // ring wall of snow blocks, centreline radius 1.35, 0.8 high, gap toward +z; snowball pile outside near (0.9, 0, 1.9)
    rseed(4022);
    const m = new Mesh().mat(M_TINT), N = 12;
    for (let c = 0; c < 3; c++) for (let k = 0; k < N; k++) {
      const t = (k + 0.5 * (c & 1)) / N * TAU + rr(-0.03, 0.03);
      if (abs(((t - PI / 2 + PI * 3) % TAU) - PI) < 0.3) continue;
      const rx = 1.35 + rr(-0.06, 0.06), len = rr(0.36, 0.42), dp = rr(0.14, 0.18), h = rr(0.12, 0.14);
      m.at(rx * cos(t), c * 0.265 + rr(-0.01, 0.015), rx * sin(t), atan2(-cos(t), -sin(t)) + rr(-0.06, 0.06));
      m.box(-len, 0, -dp, len, h * 2 + 0.01, dp, c ? 4 : 0, mix(0.6, 0.9, c / 2), 1);
    }
    m.at(0, 0, 0);
    [[0, 0], [0.2, 0], [0.1, 0.18], [-0.1, 0.17], [0.1, 0.06]].forEach(([dx, dz], k) => p2ball(m, 0.9 + dx, k < 4 ? 0.09 : 0.24, 1.9 + dz, 0.09, 3, 7, 1, k < 4 ? 0.6 : 0.9));
    return m;
  },
  bag() { // origin at the top where it hangs, 0.3 long; sway weight 0.3 at the top to 1 at the bottom
    rseed(4023);
    const m = new Mesh().mat(M_CONC), N = 7, ys = [0, -0.05, -0.12, -0.2, -0.26, -0.3], rs = [0.012, 0.05, 0.085, 0.075, 0.04, 0.012], rings = [];
    ys.forEach((y, k) => { const r = []; for (let s = 0; s < N; s++) { const a = s / N * TAU, l = 1 + rr(-0.25, 0.25) * (k > 0 && k < 5); r.push(m.v(cos(a) * rs[k] * l * 1.1, y, sin(a) * rs[k] * l * 0.7, mix(0.3, 1, -y / 0.3))); } rings.push(r); });
    for (let k = 0; k < rings.length - 1; k++) for (let s = 0; s < N; s++) { const s2 = (s + 1) % N; m.quad(rings[k][s], rings[k][s2], rings[k + 1][s2], rings[k + 1][s]); }
    m.tri(m.v(0.03, -0.24, 0.0, 0.9), m.v(0.09, -0.3, 0.02, 1), m.v(0.02, -0.29, 0.03, 1)); m.tri(m.v(-0.03, -0.25, 0.0, 0.9), m.v(-0.08, -0.29, -0.02, 1), m.v(-0.02, -0.3, -0.03, 1));
    return m;
  },
  icicles() { // row along x from 0 to 3.2, hanging from y = 0 (z about 0)
    rseed(4024);
    const m = new Mesh().mat(M_LENS);
    for (let k = 0; k < 27; k++) {
      const x = 0.04 + k * 0.118 + rr(-0.025, 0.025), z = rr(-0.02, 0.02), L = rnd() < 0.22 ? rr(0.35, 0.55) : rr(0.08, 0.3), r0 = rr(0.02, 0.045) * (L > 0.3 ? 1 : 0.85), bend = rr(-0.01, 0.01);
      m.tube([[x, 0, z], [x + bend, -L * 0.5, z], [x + bend * 2, -L, z]], (j) => [r0, r0 * 0.55, 0][j], 5, 0, (j) => [1, 0.95, 0.9][j]);
    }
    return m;
  },
  dish() { // origin at the wall point; dish centre about (0, 0.05, 0.5), faces +z tilted a little down (-0.2) and sideways (+x 0.25)
    const m = new Mesh().mat(M_METAL), n = (() => { const v = [0.25, -0.2, 1], l = hypot(...v); return v.map((q) => q / l); })();
    const e1 = (() => { const v = [n[2], 0, -n[0]], l = hypot(...v); return v.map((q) => q / l); })(), e2 = [n[1] * e1[2] - n[2] * e1[1], n[2] * e1[0] - n[0] * e1[2], n[0] * e1[1] - n[1] * e1[0]];
    const C = [0, 0.05, 0.5];
    m.box(-0.06, -0.08, 0, 0.06, 0.08, 0.02); p4rod(m, [0, 0, 0.02], [0, 0.04, 0.46], 0.02, 6);
    m.mat(M_CONC);
    const Pt = (r, a, d) => [C[0] + n[0] * d + r * (cos(a) * e1[0] + sin(a) * e2[0]), C[1] + n[1] * d + r * (cos(a) * e1[1] + sin(a) * e2[1]), C[2] + n[2] * d + r * (cos(a) * e1[2] + sin(a) * e2[2])];
    const S = 10, rings = [[0, 0.02, 0.5], [0.15, 0.05, 0.75], [0.3, 0.1, 1]].map(([r, d, ao]) => { const q = []; for (let s = 0; s < S; s++) q.push(m.v(...Pt(r, s / S * TAU, d * 0.7), ao)); return q; });
    const c = m.v(...Pt(0, 0, 0), 0.5);
    for (let s = 0; s < S; s++) m.tri(rings[0][s], rings[0][(s + 1) % S], c);
    for (let k = 0; k < 2; k++) for (let s = 0; s < S; s++) { const s2 = (s + 1) % S; m.quad(rings[k][s], rings[k][s2], rings[k + 1][s2], rings[k + 1][s]); }
    m.mat(M_METAL); const f = [C[0] + n[0] * 0.38, C[1] + n[1] * 0.38, C[2] + n[2] * 0.38]; m.bar(C, f, 0.015, 0.015); m.box(f[0] - 0.03, f[1] - 0.03, f[2] - 0.03, f[0] + 0.03, f[1] + 0.03, f[2] + 0.03);
    return m;
  },
  ladder() { // fire escape on the wall z = 0, rails at x = +-0.3 and z = 0.25, from y 2.4 to 16, brackets every 2 m, hoop cage from y 4.5
    const m = new Mesh().mat(M_METAL);
    for (const x of [-0.3, 0.3]) m.bar([x, 2.4, 0.25], [x, 16, 0.25], 0.04, 0.06);
    for (let y = 2.55; y < 16; y += 0.3) p4rod(m, [-0.3, y, 0.25], [0.3, y, 0.25], 0.012, 5);
    for (let y = 2.5; y <= 16; y += 2) for (const x of [-0.3, 0.3]) { m.bar([x, y, 0], [x, y, 0.25], 0.04, 0.04); m.box(x - 0.04, y - 0.05, 0, x + 0.04, y + 0.05, 0.01); }
    for (let y = 4.5; y <= 16.01; y += 0.9) {
      m.tube(Array.from({ length: 7 }, (_, k) => { const a = k / 6 * PI; return [-0.45 * cos(a), y, 0.25 + 0.45 * sin(a)]; }), 0.012, 5, 3);
    }
    for (const a of [0.25, 0.5, 0.75]) { const t = a * PI; m.tube([[-0.45 * cos(t), 4.5, 0.25 + 0.45 * sin(t)], [-0.45 * cos(t), 16, 0.25 + 0.45 * sin(t)]], 0.012, 5, 3); }
    return m;
  },
  pigeon() { // sitting, 0.28 long along x (x -0.125..0.15), facing +x
    const m = new Mesh().mat(M_TINT);
    m.tube([[-0.11, 0.09, 0], [-0.04, 0.09, 0], [0.04, 0.1, 0], [0.085, 0.125, 0]], (k) => [0.025, 0.07, 0.065, 0.035][k], 7, 3, (k) => [1, 0.85, 1, 1][k]);
    p2ball(m, 0.09, 0.16, 0, 0.038, 4, 7, 1, 0.9); m.bar([-0.1, 0.1, 0], [-0.125, 0.085, 0], 0.05, 0.012, 0.9);
    m.mat(M_DARK).tube([[0.125, 0.162, 0], [0.15, 0.155, 0]], (k) => [0.012, 0.004][k], 5, 1);
    for (const z of [-0.025, 0.025]) m.bar([0, 0, z], [0, 0.03, z], 0.01, 0.01);
    return m;
  },
  vent() { // roof shaft 0.8 x 0.8 footprint, 1.3 high including the cap; louvres on all four faces at y 0.62..0.92
    const m = new Mesh().mat(M_CONC); m.box(-0.4, 0, -0.4, 0.4, 1, 0.4, 4, 0.6, 1);
    m.mat(M_DARK);
    for (let f = 0; f < 4; f++) { m.at(0, 0, 0, f * PI / 2); m.box(-0.3, 0.62, 0.4, 0.3, 0.92, 0.402); m.mat(M_CONC); for (let k = 0; k < 4; k++) m.bar([-0.32, 0.65 + k * 0.08, 0.41], [0.32, 0.65 + k * 0.08, 0.41], 0.05, 0.02); m.mat(M_DARK); }
    m.at(0, 0, 0); m.mat(M_METAL);
    const a = [-0.52, 1, -0.52], b = [0.52, 1, -0.52], c = [0.52, 1, 0.52], d = [-0.52, 1, 0.52], t = [0, 1.3, 0];
    for (const [p, q] of [[d, c], [c, b], [b, a], [a, d]]) m.tri(m.v(...p, 0.7), m.v(...q, 0.7), m.v(...t));
    return m;
  },
  aerial() { // mast 3.5 m at the origin, boom along x at the top (x -0.8..0.8), eight V elements in the horizontal plane
    const m = new Mesh().mat(M_METAL); m.tube([[0, 0, 0], [0, 3.5, 0]], 0.025, 6, 3);
    m.bar([-0.8, 3.45, 0], [0.8, 3.45, 0], 0.03, 0.03);
    for (let k = 0; k < 8; k++) { const x = -0.76 + k * 0.215, w = mix(0.62, 0.2, k / 7); for (const s of [-1, 1]) m.bar([x, 3.45, 0], [x + 0.14, 3.45, s * w], 0.012, 0.012); }
    return m;
  },
  flagpole() { // pole 7 m at the origin; flag 1.5 x 1 along +x from the pole at y 5.95..6.95; sway weights
    const m = new Mesh().mat(M_METAL); m.tube([[0, 0, 0], [0, 7, 0]], (k) => [0.06, 0.03][k], 6, 3); p2ball(m, 0, 7.04, 0, 0.04, 3, 6);
    const cols = [M_CONC, M_PAINT, M_RED], N = 4;
    cols.forEach((mt, r) => { m.mat(mt); const y1 = 6.95 - r / 3, y0 = 6.95 - (r + 1) / 3; for (let k = 0; k < N; k++) { const x0 = 0.04 + k / N * 1.5, x1 = 0.04 + (k + 1) / N * 1.5; m.q4([x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0], [k / N, (k + 1) / N, (k + 1) / N, k / N]); } });
    return m;
  },
  payphone() { // post 2.2 m at the origin; hood half shell (open to +z) centred at z = 0.12, phone on the post
    const m = new Mesh().mat(M_METAL); m.tube([[0, 0, 0], [0, 2.2, 0]], (k) => [0.06, 0.045][k], 6, 3);
    m.box(-0.1, 0, -0.1, 0.1, 0.06, 0.1, 4, 0.6, 1);
    m.mat(M_CONC);
    const N = 7, lo = [], hi = [];
    for (let k = 0; k <= N; k++) { const a = PI + k / N * PI; lo.push(m.v(0.3 * cos(a), 1.42, 0.12 + 0.3 * sin(a), 0.7)); hi.push(m.v(0.3 * cos(a), 2.18, 0.12 + 0.3 * sin(a), 1)); }
    for (let k = 0; k < N; k++) m.quad(lo[k], lo[k + 1], hi[k + 1], hi[k]);
    const cen = m.v(0, 2.18, 0.12, 1), h2 = hi.map((q) => m.dup(q)); for (let k = 0; k < N; k++) m.tri(h2[k], h2[k + 1], cen);
    m.mat(M_DARK).box(-0.12, 1.5, 0.04, 0.12, 1.95, 0.16, 0, 0.8, 1); m.bar([-0.16, 1.65, 0.19], [-0.16, 1.9, 0.19], 0.05, 0.05); m.bar([-0.16, 1.9, 0.19], [-0.1, 1.9, 0.1], 0.04, 0.04);
    m.mat(M_METAL).box(-0.07, 1.55, 0.16, 0.07, 1.7, 0.17);
    return m;
  },
  billboard() { // posts at x = +-2.2, panel x +-3, y 4..7, face plane z = +0.15; lamp boxes centred (-1.5, 7.65, 1.12) and (1.5, 7.65, 1.12)
    const m = new Mesh().mat(M_METAL);
    for (const x of [-2.2, 2.2]) { m.tube([[x, 0, -0.35], [x, 7.2, -0.35]], 0.11, 6, 3, (k) => (k === 0 ? 0.6 : 1)); for (const y of [4.5, 6.5]) m.bar([x, y, -0.35], [x, y, -0.1], 0.1, 0.1); }
    m.box(-3, 4, -0.12, 3, 7, 0.14, 0, 0.8, 1);
    m.box(-3.08, 3.92, -0.2, 3.08, 4, 0.17); m.box(-3.08, 7, -0.2, 3.08, 7.08, 0.17); m.box(-3.08, 4, -0.2, -3, 7, 0.17); m.box(3, 4, -0.2, 3.08, 7, 0.17);
    m.q4([-3, 4, 0.15], [3, 4, 0.15], [3, 7, 0.15], [-3, 7, 0.15]);
    for (const x of [-1.5, 1.5]) { m.sweep([[x, 7.05, 0], [x, 7.5, 0.3], [x, 7.75, 1.0]], 0.05, 0.05, null, true, 1); m.bar([x, 7.78, 1.22], [x, 7.52, 1.0], 0.4, 0.12); }
    m.bar([-1.5, 7.05, 0], [1.5, 7.05, 0], 0.05, 0.05);
    return m;
  },
  roadsign() { // post 2.6 m at z = -0.04; plate 0.7 x 0.7 face at z = +0.03, centre (0, 2.25, 0.03)
    const m = new Mesh().mat(M_METAL); m.tube([[0, 0, -0.04], [0, 2.6, -0.04]], 0.03, 6, 3, (k) => (k ? 1 : 0.6));
    m.bar([-0.1, 2.1, -0.01], [0.1, 2.1, -0.01], 0.02, 0.03); m.bar([-0.1, 2.4, -0.01], [0.1, 2.4, -0.01], 0.02, 0.03);
    m.mat(M_CONC).box(-0.35, 1.9, -0.005, 0.35, 2.6, 0.03, 0, 1, 1);
    return m;
  },
  tlight() { // pole 3.6 m at the origin, head at z 0.05..0.3; lens centres (0, 3.3, 0.305), (0, 3.05, 0.305), (0, 2.8, 0.305)
    const m = new Mesh().mat(M_METAL); m.tube([[0, 0, 0], [0, 3.6, 0]], (k) => [0.07, 0.05][k], 6, 3, (k) => (k ? 1 : 0.6));
    m.bar([0, 2.7, 0], [0, 2.7, 0.08], 0.05, 0.05); m.bar([0, 3.4, 0], [0, 3.4, 0.08], 0.05, 0.05);
    m.mat(M_DARK).box(-0.16, 2.64, 0.05, 0.16, 3.46, 0.3, 0, 0.8, 1);
    for (const y of [3.3, 3.05, 2.8]) {
      m.mat(M_GLASS); m.tube([[0, y, 0.3], [0, y, 0.31]], 0.095, 8, 3);
      m.mat(M_DARK); m.bar([0, y + 0.105, 0.3], [0, y + 0.105, 0.43], 0.22, 0.015);
      for (const s of [-1, 1]) m.bar([s * 0.105, y + 0.04, 0.3], [s * 0.105, y + 0.04, 0.4], 0.012, 0.1);
    }
    return m;
  },
  postbox() { // origin at the wall, box 0.4 x 0.5 x 0.25 in +z; slot on the front face
    const m = new Mesh().mat(M_TINT); m.box(-0.2, 0, 0, 0.2, 0.3, 0.25, 16 | 8, 0.6, 1);
    const N = 6, lo = [], hi = [];
    for (let k = 0; k <= N; k++) { const a = k / N * PI; lo.push(m.v(0.2 * cos(a), 0.3 + 0.2 * sin(a), 0, 1)); hi.push(m.v(0.2 * cos(a), 0.3 + 0.2 * sin(a), 0.25, 1)); }
    for (let k = 0; k < N; k++) m.quad(lo[k], hi[k], hi[k + 1], lo[k + 1]);
    const c = m.v(0, 0.3, 0.25, 1), r = hi.map((q) => m.dup(q)); for (let k = 0; k < N; k++) m.tri(r[k + 1], r[k], c);
    m.mat(M_DARK).box(-0.1, 0.33, 0.25, 0.1, 0.355, 0.254); m.mat(M_METAL).box(-0.13, 0.04, 0.25, 0.13, 0.17, 0.254);
    return m;
  },
  sandbin() { // grit bin 1.2 x 0.6 footprint, front wall 0.6 high, back wall 0.7, sloping lid
    const m = new Mesh().mat(M_BARK);
    m.box(-0.6, 0, 0.26, 0.6, 0.6, 0.3, 0, 0.6, 1); m.box(-0.6, 0, -0.3, 0.6, 0.7, -0.26, 0, 0.6, 1);
    for (const x of [-0.6, 0.56]) { m.box(x, 0, -0.26, x + 0.04, 0.6, 0.26, 0, 0.6, 1); m.tri(m.v(x, 0.6, -0.26), m.v(x, 0.7, -0.26), m.v(x, 0.6, 0.26)); m.tri(m.v(x + 0.04, 0.6, 0.26), m.v(x + 0.04, 0.7, -0.26), m.v(x + 0.04, 0.6, -0.26)); }
    m.box(-0.58, 0, -0.26, 0.58, 0.02, 0.26, 0, 0.5, 0.5);
    m.mat(M_TINT).sweep([[0, 0.72, -0.31], [0, 0.63, 0.34]], 1.28, 0.04, null, true, 1);
    m.mat(M_METAL); for (const x of [-0.4, 0.4]) m.bar([x, 0.66, -0.3], [x, 0.74, -0.3], 0.05, 0.03);
    return m;
  },
  broom() { // wall at z = -0.05; handle foot on the ground at z 0.45, top touching the wall at y about 1.2; twigs at the bottom
    rseed(4037);
    const m = new Mesh().mat(M_BARK), k = 0.48 / 1.208, zf = (y) => 0.45 - k * y;
    m.tube([[0, 0.3, zf(0.3)], [0, 1.209, zf(1.209)]], 0.0125, 6, 3);
    for (let i = 0; i < 14; i++) m.tube([[rr(-0.015, 0.015), 0.34, zf(0.34)], [rr(-0.1, 0.1), 0.01, 0.45 + rr(-0.05, 0.08)]], 0.008, 4, 0, (j) => (j ? 0.6 : 1));
    m.bar([-0.02, 0.28, zf(0.28)], [0.02, 0.28, zf(0.28)], 0.03, 0.025);
    return m;
  },
  bucket() { // wall at z = 0; bucket tip at (0, 0, 0.02), rim centre (0, 0.33, 0.17) (tilted 24 degrees out), hook at (0, 0.55, 0)
    const m = new Mesh().mat(M_RED), a = [0, 0.33, 0.15], l = hypot(...a), ax = a.map((q) => q / l), e2 = [0, -ax[2], ax[1]], C = [0, 0.35, 0.17];
    m.tube([[0, 0.02, 0.02], C], (k) => [0.03, 0.14][k], 8, 1, (k) => [0.6, 1][k]);
    m.mat(M_METAL);
    m.tube(Array.from({ length: 11 }, (_, k) => { const t = k / 10 * TAU; return [C[0] + 0.145 * cos(t), C[1] + 0.145 * sin(t) * e2[1], C[2] + 0.145 * sin(t) * e2[2]]; }), 0.01, 5, 0);
    m.tube([[-0.145, C[1], C[2]], [-0.1, C[1] + 0.1, C[2] - 0.02], [0, C[1] + 0.15, C[2] - 0.02], [0.1, C[1] + 0.1, C[2] - 0.02], [0.145, C[1], C[2]]], 0.006, 4, 3);
    m.tube([[0, 0.56, 0], [0, 0.57, 0.1], [0, 0.52, 0.15]], 0.01, 4, 3);
    return m;
  },
  xbar() { // post 1.2 m at the origin; arm in the plane z = 0.22, pivot (0.25, 1.1, 0.22), raised to 80 degrees, 5 m long
    const m = new Mesh().mat(M_METAL), A = 80 * PI / 180, d = [cos(A), sin(A)], P = [0.25, 1.1];
    m.box(-0.15, 0, -0.15, 0.15, 1.2, 0.15, 0, 0.6, 1); m.bar([0.1, 1.1, 0.15], [0.25, 1.1, 0.22], 0.08, 0.1);
    for (let k = 0; k < 10; k++) { m.mat(k & 1 ? M_CONC : M_RED); m.bar([P[0] + d[0] * k * 0.5, P[1] + d[1] * k * 0.5, 0.22], [P[0] + d[0] * (k + 1) * 0.5, P[1] + d[1] * (k + 1) * 0.5, 0.22], 0.1, 0.08); }
    m.mat(M_METAL).bar([P[0], P[1], 0.22], [P[0] - d[0] * 0.8, P[1] - d[1] * 0.8, 0.22], 0.06, 0.06); m.mat(M_DARK).bar([P[0] - d[0] * 0.65, P[1] - d[1] * 0.65, 0.22], [P[0] - d[0] * 0.85, P[1] - d[1] * 0.85, 0.22], 0.2, 0.2);
    return m;
  },
  xsig() { // post 3.2 m at z = -0.06; board front z 0.06; lens centres (-0.25, 2.4, 0.08) and (0.25, 2.4, 0.08); crossbuck X centred (0, 2.98, 0.015)
    const m = new Mesh().mat(M_METAL); m.tube([[0, 0, -0.06], [0, 3.2, -0.06]], (k) => [0.06, 0.045][k], 6, 3, (k) => (k ? 1 : 0.6));
    m.mat(M_DARK).box(-0.5, 2.15, -0.02, 0.5, 2.65, 0.06, 0, 0.8, 1);
    for (const x of [-0.25, 0.25]) {
      m.mat(M_GLASS); m.tube([[x, 2.4, 0.06], [x, 2.4, 0.08]], 0.12, 8, 3);
      m.mat(M_DARK); m.bar([x, 2.535, 0.06], [x, 2.535, 0.22], 0.26, 0.015); for (const s of [-1, 1]) m.bar([x + s * 0.13, 2.45, 0.06], [x + s * 0.13, 2.45, 0.2], 0.012, 0.16);
    }
    m.mat(M_CONC); m.bar([-0.5, 2.76, 0.015], [0.5, 3.2, 0.015], 0.02, 0.1); m.bar([-0.5, 3.2, 0.015], [0.5, 2.76, 0.015], 0.02, 0.1);
    m.mat(M_METAL).bar([0, 2.65, -0.06], [0, 3.0, 0.0], 0.04, 0.04);
    return m;
  },
  rsignal() { // mast 5 m at z = -0.1 with a ladder behind; head front z 0.1, lens centres (0, 4.6, 0.12), (0, 4.3, 0.12), (0, 4.0, 0.12)
    const m = new Mesh().mat(M_METAL); m.tube([[0, 0, -0.1], [0, 5, -0.1]], (k) => [0.09, 0.06][k], 6, 3, (k) => (k ? 1 : 0.6));
    m.box(-0.2, 0, -0.3, 0.2, 0.1, 0.1, 0, 0.5, 0.8);
    m.mat(M_DARK).box(-0.2, 3.78, -0.02, 0.2, 4.82, 0.1, 0, 0.8, 1);
    for (const y of [4.6, 4.3, 4.0]) { m.mat(M_GLASS); m.tube([[0, y, 0.1], [0, y, 0.12]], 0.1, 8, 3); m.mat(M_DARK); m.bar([0, y + 0.11, 0.1], [0, y + 0.11, 0.27], 0.24, 0.015); for (const s of [-1, 1]) m.bar([s * 0.115, y + 0.04, 0.1], [s * 0.115, y + 0.04, 0.24], 0.012, 0.12); }
    m.mat(M_METAL);
    for (const x of [-0.2, 0.2]) m.bar([x, 0.3, -0.34], [x, 4.4, -0.34], 0.035, 0.035, 0.7);
    for (let y = 0.5; y < 4.4; y += 0.3) p4rod(m, [-0.2, y, -0.34], [0.2, y, -0.34], 0.012, 5, 0.8);
    for (const y of [0.8, 2.2, 3.6]) for (const x of [-0.2, 0.2]) m.bar([x, y, -0.34], [x * 0.3, y, -0.1], 0.03, 0.03);
    return m;
  },
};
