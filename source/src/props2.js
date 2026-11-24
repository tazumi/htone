// ============================================================================
// props2: more procedural props (plain script, concatenated after math.js)
// ============================================================================

// ring descriptor for p2loft: y, half-sizes, centre offset, shade
const p2R = (y, rx, rz = rx, cx = 0, cz = 0, ao = 1) => ({ y, rx, rz, cx, cz, ao });
// elliptical loft through rings; caps fill the first / last ring
function p2loft(m, rings, sides = 10, capLo = true, capHi = true) {
  const idx = rings.map((r) => {
    const a = [];
    for (let s = 0; s < sides; s++) { const t = s / sides * TAU; a.push(m.v(r.cx + cos(t) * r.rx, r.y, r.cz + sin(t) * r.rz, r.ao)); }
    return a;
  });
  for (let k = 0; k < idx.length - 1; k++) for (let s = 0; s < sides; s++) { const s2 = (s + 1) % sides; m.quad(idx[k][s], idx[k][s2], idx[k + 1][s2], idx[k + 1][s]); }
  const cap = (r, lo) => {
    const c = m.v(r.cx, r.y, r.cz, r.ao), ring = (lo ? idx[0] : idx[idx.length - 1]).map((q) => m.dup(q));
    for (let s = 0; s < sides; s++) m.tri(ring[s], ring[(s + 1) % sides], c);
  };
  if (capLo) cap(rings[0], true);
  if (capHi) cap(rings[rings.length - 1], false);
}
// faceted ball from stacked rings; shade fades from aoLo at the bottom to 1 at the top
function p2ball(m, cx, cy, cz, r, n = 8, sides = 10, sy = 1, aoLo = 1) {
  const rings = [];
  for (let k = 0; k <= n; k++) {
    const a = -PI / 2 + (k + 0.5) / (n + 1) * PI;
    rings.push(p2R(cy + r * sy * sin(a), r * cos(a), r * cos(a), cx, cz, mix(aoLo, 1, (sin(a) + 1) / 2)));
  }
  p2loft(m, rings, sides);
}

const PROPS2 = {
  snowman() {
    const m = new Mesh().mat(M_TINT);
    p2ball(m, 0, 0.36, 0, 0.38, 8, 12, 1, 0.6);
    p2ball(m, 0, 0.9, 0, 0.28, 8, 12, 1, 0.7);
    p2ball(m, 0, 1.28, 0, 0.2, 7, 12, 1, 0.8);
    // bucket on the head, tilted, open end down
    m.mat(M_METAL);
    m.tube([[0, 1.4, 0], [0.025, 1.55, 0.01], [0.055, 1.7, 0.02]], (k) => [0.17, 0.155, 0.13][k], 10, 2);
    m.tube([[0.002, 1.405, 0], [0.006, 1.425, 0.001]], 0.185, 10, 0);
    // carrot
    m.mat(M_YEL).tube([[0, 1.27, 0.17], [0, 1.25, 0.46]], (k) => [0.04, 0.006][k], 6, 1);
    // coal
    m.mat(M_DARK);
    for (const s of [-1, 1]) m.box(s * 0.075 - 0.015, 1.325, 0.165, s * 0.075 + 0.015, 1.355, 0.2);
    [[0.99, -0.01], [0.9, 0.012], [0.81, -0.008], [0.72, 0.01]].forEach(([y, dx]) => {
      const z = sqrt(0.28 * 0.28 - (y - 0.9) * (y - 0.9)) * 0.96;
      m.box(dx - 0.017, y - 0.017, z - 0.02, dx + 0.017, y + 0.017, z + 0.015);
    });
    // twig arms with forked tips
    m.mat(M_BARK);
    for (const s of [-1, 1]) {
      const e = [s * 0.82, 1.3, 0.06];
      m.bar([s * 0.2, 0.96, 0], e, 0.03);
      m.bar(e, [s * 0.97, 1.46, 0.09], 0.02);
      m.bar(e, [s * 0.96, 1.18, 0.02], 0.02);
      m.bar([s * 0.56, 1.14, 0.04], [s * 0.7, 1.32, 0.07], 0.018);
    }
    return m;
  },

  tyres() {
    const m = new Mesh().mat(M_TINT);
    const Rm = 0.23, rm = 0.09, NA = 14, NB = 8, base = 0.03;
    for (let t = 0; t < 6; t++) {
      const th = t / 6 * TAU + 0.2;
      m.at(0.62 * sin(th), base, 0.62 * cos(th), th);
      const idx = [];
      for (let i = 0; i < NA; i++) {
        const a = i / NA * TAU, row = [];
        for (let j = 0; j < NB; j++) {
          const b = j / NB * TAU, rad = Rm + rm * cos(b);
          let y = rad * sin(a);
          const z = rm * 1.05 * sin(b);
          const y2 = max(y, -0.03 - base);
          row.push({ id: m.v(rad * cos(a), y2, z, clamp(0.55 + (y2 + base) / 0.3 * 0.45, 0.5, 1)), y: y2 });
        }
        idx.push(row);
      }
      for (let i = 0; i < NA; i++) for (let j = 0; j < NB; j++) {
        const a = idx[i][j], b = idx[(i + 1) % NA][j], c = idx[(i + 1) % NA][(j + 1) % NB], d = idx[i][(j + 1) % NB];
        if (max(a.y, b.y, c.y, d.y) <= -0.03 - base + 1e-6) continue;
        m.quad(a.id, b.id, c.id, d.id);
      }
    }
    return m;
  },

  vase() {
    rseed(31);
    const m = new Mesh().mat(M_CONC);
    // outer wall: short foot, belly, rim
    p2loft(m, [p2R(0, 0.22, 0.22, 0, 0, 0.55), p2R(0.1, 0.18, 0.18, 0, 0, 0.6), p2R(0.2, 0.26, 0.26, 0, 0, 0.7), p2R(0.4, 0.4, 0.4), p2R(0.55, 0.45, 0.45), p2R(0.6, 0.45, 0.45)], 12, true, false);
    // rim top and inner wall
    p2loft(m, [p2R(0.6, 0.45, 0.45), p2R(0.6, 0.38, 0.38), p2R(0.47, 0.32, 0.32, 0, 0, 0.55)], 12, false, false);
    m.mat(M_BARK);
    p2loft(m, [p2R(0.5, 0.33, 0.33, 0, 0, 0.8)], 12, false, true);
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * TAU + rr(-0.3, 0.3), r0 = rr(0.04, 0.2), h = rr(0.45, 0.85), lean = rr(0.12, 0.3);
      const p0 = [r0 * cos(a), 0.49, r0 * sin(a)];
      const p1 = [p0[0] + cos(a) * lean * 0.5, p0[1] + h * 0.55, p0[2] + sin(a) * lean * 0.5];
      const p2 = [p0[0] + cos(a) * lean, p0[1] + h, p0[2] + sin(a) * lean];
      m.bar(p0, p1, 0.016); m.bar(p1, p2, 0.012);
      m.bar(p1, [p1[0] + cos(a + 0.9) * 0.14, p1[1] + 0.16, p1[2] + sin(a + 0.9) * 0.14], 0.008);
      m.box(p2[0] - 0.015, p2[1], p2[2] - 0.015, p2[0] + 0.015, p2[1] + 0.06, p2[2] + 0.015);
    }
    return m;
  },

  arcs() {
    const m = new Mesh().mat(M_GRN);
    const R = 0.3, step = (2.4 - 2 * R) / 5;
    for (let k = 0; k < 6; k++) {
      const cx = -1.2 + R + k * step, z = k % 2 ? 0.02 : -0.02, pts = [[cx - R, -0.04, z]];
      for (let i = 0; i <= 10; i++) { const a = PI - i / 10 * PI; pts.push([cx + R * cos(a), R * sin(a), z]); }
      pts.push([cx + R, -0.04, z]);
      m.tube(pts, 0.011, 5, 0);
    }
    m.bar([-1.2, 0.08, 0], [1.2, 0.08, 0], 0.02, 0.014);
    return m;
  },

  board() { // board centre height 1.5 m, face at z = +0.03
    const m = new Mesh().mat(M_METAL);
    for (const x of [-0.5, 0.5]) m.box(x - 0.035, 0, -0.095, x + 0.035, 1.95, -0.025, 4, 0.6, 1);
    // roof: two slopes and gable ends
    m.bar([0, 1.96, -0.14], [0, 2.1, 0.06], 1.5, 0.015);
    m.bar([0, 2.1, 0.06], [0, 1.96, 0.3], 1.5, 0.015);
    for (const x of [-0.75, 0.75]) m.tri(m.v(x, 1.953, -0.14), m.v(x, 2.103, 0.06), m.v(x, 1.953, 0.3));
    // frame around the board, slightly proud
    m.box(-0.62, 1.08, -0.02, 0.62, 1.1, 0.04); m.box(-0.62, 1.9, -0.02, 0.62, 1.92, 0.04);
    m.box(-0.62, 1.1, -0.02, -0.6, 1.9, 0.04); m.box(0.6, 1.1, -0.02, 0.62, 1.9, 0.04);
    m.mat(M_TINT).box(-0.6, 1.1, -0.02, 0.6, 1.9, 0.03, 0);
    return m;
  },

  bollard() {
    const m = new Mesh().mat(M_CONC);
    const h = 0.09, t = 0.062, top = 0.7, ch = 0.62;
    const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    m.box(-h, 0, -h, h, ch, h, 8, 0.55, 1);
    for (let k = 0; k < 4; k++) {
      const [ax, az] = c[k], [bx, bz] = c[(k + 1) % 4];
      m.q4([ax * h, ch, az * h], [bx * h, ch, bz * h], [bx * t, top, bz * t], [ax * t, top, az * t]);
    }
    m.q4([-t, top, t], [t, top, t], [t, top, -t], [-t, top, -t]);
    m.mat(M_YEL).box(-h - 0.006, 0.48, -h - 0.006, h + 0.006, 0.56, h + 0.006, 12);
    return m;
  },

  pile() {
    rseed(7);
    const m = new Mesh().mat(M_TINT), N = 22, R = 7, ph = [rr(0, TAU), rr(0, TAU), rr(0, TAU)], rings = [];
    const hAt = (u, x, z) => 0.72 * pow(max(0, 1 - u * u), 0.75) * (1 + 0.1 * sin(x * 6 + ph[0]) * sin(z * 7 + ph[1]) + 0.05 * sin(x * 11 + z * 5 + ph[2]));
    const centre = m.v(0.15, hAt(0, 0.15, 0), 0, 1);
    for (let k = 1; k <= R; k++) {
      const u = k / R, row = [];
      for (let s = 0; s < N; s++) {
        const t = s / N * TAU, d = u * (1 + 0.12 * sin(t * 3 + ph[0]) + 0.08 * sin(t * 5 + ph[1]) + rr(-0.03, 0.03));
        const x = cos(t) * 1.25 * d + 0.15 * (1 - u * u), z = sin(t) * 0.7 * d;
        const y = k === R ? 0 : hAt(u, x, z);
        row.push(m.v(x, y, z, mix(0.6, 1, min(1, y / 0.3))));
      }
      rings.push(row);
    }
    for (let s = 0; s < N; s++) m.tri(centre, rings[0][s], rings[0][(s + 1) % N]);
    for (let k = 0; k < R - 1; k++) for (let s = 0; s < N; s++) { const s2 = (s + 1) % N; m.quad(rings[k][s], rings[k][s2], rings[k + 1][s2], rings[k + 1][s]); }
    return m;
  },

  bar() {
    const m = new Mesh().mat(M_METAL);
    for (const x of [-0.8, 0.8]) {
      m.tube([[x, -0.05, 0], [x, 2.4, 0]], 0.04, 8, 2, (k) => (k ? 1 : 0.6));
      for (const z of [-0.6, 0.6]) m.bar([x, 1.4, 0], [x, 0, z], 0.035, 0.035, 0.7);
    }
    m.tube([[-0.86, 2.36, 0], [0.86, 2.36, 0]], 0.022, 8, 3);
    return m;
  },

  stop() {
    const m = new Mesh().mat(M_METAL);
    // posts
    for (const x of [-1.97, -0.66, 0.66, 1.97]) m.box(x - 0.04, 0, -0.8, x + 0.04, 2.52, -0.72, 4, 0.6, 1);
    for (const x of [-1.97, 1.97]) for (const z of [0, 0.76]) m.box(x - 0.035, 0, z - 0.035, x + 0.035, z > 0.5 ? 2.42 : 2.5, z + 0.035, 4, 0.6, 1);
    // roof slab, sloping down to the front
    m.bar([0, 2.55, -0.9], [0, 2.45, 0.9], 4.2, 0.06);
    // rails on the back wall and sides
    m.box(-2, 2.2, -0.8, 2, 2.28, -0.72); m.box(-2, 0.22, -0.8, 2, 0.3, -0.72);
    for (const x of [-1.97, 1.97]) for (const [z0, z1] of [[-0.76, 0], [0, 0.76]]) {
      m.box(x - 0.03, 2.3, z0, x + 0.03, 2.38, z1, 0); m.box(x - 0.03, 0.85, z0, x + 0.03, 0.9, z1, 0);
    }
    // back panels
    m.mat(M_TINT);
    const bays = [[-1.97, -0.66], [-0.66, 0.66], [0.66, 1.97]];
    for (const [a, b] of bays) m.box(a + 0.02, 0.3, -0.775, b - 0.02, 2.2, -0.745);
    // side walls: solid lower half, glass upper half
    for (const x of [-1.97, 1.97]) for (const [z0, z1] of [[-0.76, 0], [0, 0.76]]) {
      m.mat(M_TINT).box(x - 0.012, 0.3, z0 + 0.02, x + 0.012, 0.85, z1 - 0.02);
      m.mat(M_GLASS).box(x - 0.008, 0.9, z0 + 0.02, x + 0.008, 2.3, z1 - 0.02);
    }
    // bench: slats, legs, back
    m.mat(M_BARK);
    for (const [z0, z1] of [[-0.63, -0.51], [-0.48, -0.36], [-0.33, -0.21]]) m.box(-1.7, 0.415, z0, 1.7, 0.45, z1, 0, 0.8, 1);
    for (const y of [0.66, 0.82]) m.box(-1.7, y, -0.7, 1.7, y + 0.12, -0.675, 0, 0.9, 1);
    m.mat(M_METAL);
    for (const x of [-1.6, 0, 1.6]) {
      for (const z of [-0.6, -0.24]) m.bar([x, 0, z], [x, 0.41, z], 0.045, 0.045, 0.6);
      m.bar([x, 0.4, -0.6], [x, 0.4, -0.24], 0.04, 0.03);
      m.bar([x, 0.4, -0.66], [x, 0.95, -0.69], 0.04, 0.03);
    }
    // sign: post and plate
    m.bar([2.4, 0, -0.2], [2.4, 2.28, -0.2], 0.05, 0.05, 0.6);
    m.mat(M_YEL).box(2.15, 1.85, -0.17, 2.65, 2.25, -0.155);
    return m;
  },

  sitter() { // edge at y = 0, z = 0; roof z < 0; shins and shoes are last and are the only y < 0.06 && z > 0 vertices
    const m = new Mesh().mat(M_DARK);
    m.box(-0.19, 0.005, -0.38, 0.19, 0.2, -0.08, 0, 0.6, 1); // pelvis
    for (const s of [-1, 1]) m.tube([[s * 0.1, 0.14, -0.3], [s * 0.1, 0.14, 0.08]], 0.075, 6, 3); // thighs
    // jacket and head
    m.mat(M_TINT);
    m.tube([[0, 0.12, -0.27], [0, 0.3, -0.28], [0, 0.5, -0.22], [0, 0.62, -0.13]], (k) => [0.19, 0.2, 0.2, 0.15][k], 8, 3, (k) => (k ? 1 : 0.65));
    m.tube([[0, 0.62, -0.13], [0, 0.7, -0.1]], 0.075, 8, 0);
    for (const s of [-1, 1]) {
      m.tube([[s * 0.23, 0.58, -0.14], [s * 0.27, 0.38, -0.08]], 0.052, 6, 3);
      m.tube([[s * 0.27, 0.38, -0.08], [s * 0.14, 0.26, 0.0]], 0.044, 6, 3);
    }
    m.mat(M_CONC);
    p2ball(m, 0, 0.8, -0.07, 0.1, 6, 10, 1.1);
    for (const s of [-1, 1]) m.box(s * 0.14 - 0.03, 0.22, -0.035, s * 0.14 + 0.03, 0.27, 0.025);
    m.mat(M_RED);
    p2loft(m, [p2R(0.82, 0.108, 0.108, 0, -0.075), p2R(0.88, 0.112, 0.112, 0, -0.075), p2R(0.93, 0.095, 0.095, 0, -0.075), p2R(0.97, 0.05, 0.05, 0, -0.075)], 10, false, true);
    m.box(-0.025, 0.97, -0.1, 0.025, 1.01, -0.05);
    // swinging part: everything below y = 0.06 and in front of the edge
    m.swingFrom = m.p.length / 3;
    m.mat(M_DARK);
    for (const s of [-1, 1]) {
      m.tube([[s * 0.1, 0.055, 0.08], [s * 0.1, -0.12, 0.085], [s * 0.1, -0.36, 0.09]], (k) => [0.065, 0.055, 0.045][k], 7, 3);
      m.box(s * 0.1 - 0.05, -0.43, 0.03, s * 0.1 + 0.05, -0.34, 0.28);
    }
    return m;
  },

  seated() { // seat surface y = 0.45, back toward -z
    const m = new Mesh().mat(M_TINT);
    p2loft(m, [p2R(0.5, 0.22, 0.17, 0, -0.12, 0.6), p2R(0.75, 0.22, 0.16, 0, -0.14), p2R(1, 0.21, 0.15, 0, -0.13), p2R(1.18, 0.22, 0.14, 0, -0.1), p2R(1.26, 0.11, 0.1, 0, -0.07)], 10, true, true);
    for (const s of [-1, 1]) {
      m.tube([[s * 0.24, 1.15, -0.1], [s * 0.275, 0.88, -0.12]], 0.056, 6, 3);
      m.tube([[s * 0.275, 0.88, -0.12], [s * 0.21, 0.68, -0.04]], 0.05, 6, 3);
    }
    m.mat(M_DARK);
    for (const s of [-1, 1]) {
      m.tube([[s * 0.11, 0.535, -0.12], [s * 0.11, 0.545, 0.4]], 0.08, 7, 3);
      m.tube([[s * 0.11, 0.55, 0.4], [s * 0.11, 0.1, 0.4]], (k) => [0.07, 0.055][k], 7, 3);
      m.box(s * 0.11 - 0.055, 0, 0.3, s * 0.11 + 0.055, 0.09, 0.56, 4, 0.7, 1);
    }
    m.mat(M_CONC);
    p2ball(m, 0, 1.38, -0.04, 0.095, 6, 10, 1.1);
    m.mat(M_GRN);
    p2loft(m, [p2R(1.36, 0.108, 0.108, 0, -0.06), p2R(1.42, 0.11, 0.11, 0, -0.06), p2R(1.46, 0.09, 0.09, 0, -0.06), p2R(1.49, 0.04, 0.04, 0, -0.06)], 10, false, true);
    return m;
  },

  standing() {
    const m = new Mesh().mat(M_TINT);
    p2loft(m, [p2R(0.26, 0.27, 0.2, 0, 0, 0.6), p2R(0.6, 0.24, 0.17), p2R(1, 0.205, 0.15, 0, 0.03), p2R(1.25, 0.21, 0.15, 0, 0.06), p2R(1.42, 0.22, 0.13, 0, 0.09), p2R(1.5, 0.12, 0.1, 0, 0.1), p2R(1.56, 0.1, 0.09, 0, 0.11)], 10, true, true);
    for (const s of [-1, 1]) {
      m.tube([[s * 0.23, 1.42, 0.05], [s * 0.275, 1.15, 0.01]], 0.056, 6, 3);
      m.tube([[s * 0.275, 1.15, 0.01], [s * 0.2, 0.93, 0.1]], 0.052, 6, 3);
    }
    m.mat(M_DARK);
    for (const s of [-1, 1]) {
      m.tube([[s * 0.09, 0.4, 0], [s * 0.09, 0.08, 0]], 0.065, 7, 1);
      m.box(s * 0.09 - 0.06, 0, -0.09, s * 0.09 + 0.06, 0.08, 0.2, 4, 0.7, 1);
    }
    p2loft(m, [p2R(1.6, 0.108, 0.108, 0, 0.105), p2R(1.66, 0.11, 0.11, 0, 0.105), p2R(1.72, 0.1, 0.1, 0, 0.105), p2R(1.755, 0.06, 0.06, 0, 0.105)], 10, false, true);
    m.mat(M_CONC);
    p2ball(m, 0, 1.64, 0.135, 0.095, 6, 10, 1.1);
    return m;
  },

  kennel() {
    const m = new Mesh().mat(M_BARK);
    const X = 0.45, Z = 0.4, E = 0.552, top = (x) => E + (0.769 - E) * (1 - abs(x) / X);
    // gable wall columns; zf: z of the wall, door: leave the round-top hole
    const gable = (z, door) => {
      const xs = [-X, X, 0];
      if (door) for (let i = 0; i <= 8; i++) xs.push(0.17 * cos(i / 8 * PI));
      xs.sort((a, b) => a - b);
      const arch = (x) => 0.33 + sqrt(max(0, 0.17 * 0.17 - x * x));
      for (let i = 0; i < xs.length - 1; i++) {
        const a = xs[i], b = xs[i + 1];
        if (b - a < 1e-6) continue;
        const inD = door && a > -0.17 - 1e-6 && b < 0.17 + 1e-6;
        const ya = inD ? arch(a) : 0, yb = inD ? arch(b) : 0;
        m.q4([a, ya, z], [b, yb, z], [b, top(b), z], [a, top(a), z], [0.6, 0.6, 1, 1]);
      }
    };
    gable(Z, true); gable(-Z, false);
    for (const s of [-1, 1]) m.q4([s * X, 0, -Z], [s * X, 0, Z], [s * X, E, Z], [s * X, E, -Z], [0.6, 0.6, 1, 1]);
    // dark interior seen through the door
    m.mat(M_DARK);
    m.q4([-0.43, 0.02, -0.38], [0.43, 0.02, -0.38], [0.43, 0.6, -0.38], [-0.43, 0.6, -0.38], 0.5);
    m.q4([-0.43, 0.02, -0.38], [0.43, 0.02, -0.38], [0.43, 0.02, 0.38], [-0.43, 0.02, 0.38], 0.4);
    for (const s of [-1, 1]) m.q4([s * 0.43, 0.02, -0.38], [s * 0.43, 0.02, 0.38], [s * 0.43, 0.55, 0.38], [s * 0.43, 0.55, -0.38], 0.5);
    // roof
    m.mat(M_METAL);
    for (const s of [-1, 1]) m.bar([s * 0.54, 0.52, 0], [0, 0.78, 0], 0.92, 0.025);
    return m;
  },

  planks() {
    rseed(14);
    const m = new Mesh().mat(M_BARK);
    for (const x of [-1.2, 0, 1.2]) m.box(x - 0.05, 0, -0.12, x + 0.05, 1.9, -0.02, 4, 0.6, 1);
    for (const y of [0.35, 1.35]) m.box(-1.25, y, -0.04, 1.25, y + 0.08, 0.005, 0, 0.8, 1);
    const n = 21;
    for (let k = 0; k < n; k++) {
      if (k === 5 || k === 14) continue; // missing planks
      const x = -1.2 + k * 0.12 + 0.0, h = 1.7 + rr(-0.05, 0.03);
      let lean = 0, y0 = 0.05;
      if (k === 8 || k === 17) lean = rr(0.05, 0.1) * (k === 8 ? 1 : -1);
      if (k === 11) { y0 = 0.12; }
      if (k === 2) { m.bar([x, y0, 0.011], [x, 1.2, 0.011], 0.022, 0.1, 0.8); continue; } // broken short plank
      m.bar([x, y0, 0.011], [x + lean, h, 0.011], 0.022, 0.1, 0.8);
    }
    return m;
  },

  lowbench() {
    const m = new Mesh().mat(M_CONC);
    for (const s of [-1, 1]) {
      const x = s * 0.7;
      m.box(x - 0.06, 0, -0.22, x + 0.06, 0.08, 0.22, 4, 0.55, 0.9);
      m.box(x - 0.045, 0.08, -0.17, x + 0.045, 0.34, 0.17, 0, 0.7, 1);
      m.box(x - 0.07, 0.34, -0.23, x + 0.07, 0.415, 0.23, 0, 1, 1);
    }
    m.mat(M_TINT);
    for (let k = 0; k < 4; k++) { const z0 = -0.21 + k * 0.11; m.box(-0.9, 0.42, z0, 0.9, 0.46, z0 + 0.09, 0, 0.8, 1); }
    return m;
  },
};
