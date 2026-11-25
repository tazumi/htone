// ============================================================================
// props8: a tram, street furniture, a hangar, a fence, a container, kids and small things (plain script, concatenated after props7.js)
// ============================================================================

// convex hexahedron from 8 points: 0-3 the bottom ring, 4-7 the top ring in the same order; faces get their own vertices and are
// wound outward from the centroid. skip: bit mask 1 bottom, 2 top, 4 back (ring edge 0-1), 8 edge 1-2, 16 edge 2-3, 32 edge 3-0
function p8hex(m, P, skip = 0, ao = 1) {
  let cx = 0, cy = 0, cz = 0;
  for (const p of P) { cx += p[0]; cy += p[1]; cz += p[2]; }
  cx /= 8; cy /= 8; cz /= 8;
  const F = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  for (let i = 0; i < 6; i++) {
    if ((skip >> i) & 1) continue;
    const q = F[i].map((k) => P[k]);
    const mx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, my = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4, mz = (q[0][2] + q[1][2] + q[2][2] + q[3][2]) / 4;
    p5face(m, q, [mx - cx, my - cy, mz - cz], ao);
  }
}
// box of half sizes (hx, hy, hz) about c, pitched about the x axis by angle a: local up U = (0, cos a, -sin a), local front N = (0, sin a, cos a)
// faces: 1 bottom, 2 top, 4 back (-N), 8 +x, 16 front (+N), 32 -x
function p8obox(m, c, hx, hy, hz, a, skip = 0, ao = 1) {
  const U = [0, cos(a), -sin(a)], N = [0, sin(a), cos(a)], P = [];
  for (const sy of [-1, 1]) for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    P.push([c[0] + sx * hx, c[1] + sy * hy * U[1] + sz * hz * N[1], c[2] + sy * hy * U[2] + sz * hz * N[2]]);
  }
  p8hex(m, P, skip, ao);
}
// vertical prism over a convex polygon [[x, z], ...] from y0 to y1, side faces only (optionally the top fan)
function p8prism(m, poly, y0, y1, cap = false) {
  const n = poly.length;
  let cx = 0, cz = 0;
  for (const p of poly) { cx += p[0]; cz += p[1]; }
  cx /= n; cz /= n;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    p5face(m, [[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]], [(a[0] + b[0]) / 2 - cx, 0, (a[1] + b[1]) / 2 - cz]);
  }
  if (cap) for (let i = 1; i < n - 1; i++) p5face(m, [[poly[0][0], y1, poly[0][1]], [poly[i][0], y1, poly[i][1]], [poly[i + 1][0], y1, poly[i + 1][1]]], [0, 1, 0]);
}
// pyramid on a diamond base in the plane z = z0 (centre cx, cy, half diagonal a), apex at z0 + h; 4 triangles
function p8pyr(m, cx, cy, z0, a, h) {
  const P = [[cx + a, cy], [cx, cy + a], [cx - a, cy], [cx, cy - a]];
  for (let i = 0; i < 4; i++) {
    const p = P[i], q = P[(i + 1) % 4];
    p5face(m, [[p[0], p[1], z0], [q[0], q[1], z0], [cx, cy, z0 + h]], [(p[0] + q[0]) / 2 - cx, (p[1] + q[1]) / 2 - cy, a * 0.6]);
  }
}
// removes the interval [a, b] from a list of [lo, hi] intervals
function p8cut(list, a, b) {
  const o = [];
  for (const [lo, hi] of list) {
    if (b <= lo || a >= hi) { o.push([lo, hi]); continue; }
    if (a > lo) o.push([lo, a]);
    if (b < hi) o.push([b, hi]);
  }
  return o;
}
// one horn loudspeaker pointing along +z (dirz = 1) or -z (-1) from the pole axis at y 5.5, tilted down 10 degrees
function p8horn(m, dirz) {
  const a = 10 * PI / 180, dy = -sin(a), dz = cos(a) * dirz;
  const pt = (s) => [0, 5.5 + dy * s, dz * s];
  m.mat(M_DARK); m.tube([pt(0.1), pt(0.22)], 0.065, 8, 3);
  m.mat(M_METAL); m.tube([pt(0.22), pt(0.4), pt(0.56), pt(0.72)], (k) => [0.045, 0.075, 0.14, 0.23][k], 8, 0);
  // dark throat seen inside the bell
  const c = pt(0.66), u = [0, cos(a), sin(a) * dirz], pts = [];
  for (let k = 0; k < 8; k++) { const t = k / 8 * TAU; pts.push([c[0] + cos(t) * 0.19, c[1] + sin(t) * 0.19 * u[1], c[2] + sin(t) * 0.19 * u[2]]); }
  m.mat(M_DARK);
  for (let k = 1; k < 7; k++) p5face(m, [pts[0], pts[k], pts[k + 1]], [0, dy, dz]);
}

const PROPS8 = {
  tram() { // KTM-5 style tram 15.2 x 2.6 x 3.4 (x -7.6..7.6, z +-1.3, body y 0.9..3.4, front cab at +x, doors on the +z side), pantograph up to y 5.55; {m, pan, head, tail}
    const m = new Mesh(), L = 7.6;
    const poly = (zf, e = L) => [[e, -0.8], [e, 0.8], [e - 0.25, zf - 0.15], [e - 0.6, zf], [-(e - 0.6), zf], [-(e - 0.25), zf - 0.15], [-e, 0.8], [-e, -0.8],
      [-(e - 0.25), -zf + 0.15], [-(e - 0.6), -zf], [e - 0.6, -zf], [e - 0.25, -zf + 0.15]];
    m.mat(M_TINT); p8prism(m, poly(1.3), 0.9, 1.3);
    m.mat(M_PAINT);
    p8prism(m, poly(1.3), 1.3, 1.9);
    p8prism(m, poly(1.28, L - 0.01), 1.8, 3.0);
    p8prism(m, poly(1.3), 2.9, 3.4, true);
    // window band: pillars, lit saloon quads recessed 1 cm, doors on +z
    const cell = 1.4, x0 = -6.3, doors = [1, 4, 7];
    for (let k = 0; k <= 9; k++) {
      const x = x0 + k * cell;
      m.mat(M_PAINT);
      m.box(x - 0.1, 1.9, 1.28, x + 0.1, 2.9, 1.3, 4 | 8 | 16);
      m.box(x - 0.1, 1.9, -1.3, x + 0.1, 2.9, -1.28, 4 | 8 | 32);
    }
    for (let k = 0; k < 9; k++) {
      const cx = x0 + (k + 0.5) * cell;
      m.mat(M_LAMP);
      p5face(m, [[cx - 0.6, 1.9, -1.29], [cx + 0.6, 1.9, -1.29], [cx + 0.6, 2.9, -1.29], [cx - 0.6, 2.9, -1.29]], [0, 0, -1]);
      if (doors.includes(k)) {
        m.mat(M_DARK);
        m.box(cx - 0.6, 0.95, 1.3, cx - 0.01, 3.1, 1.32, 2 | 4 | 16);
        m.box(cx + 0.01, 0.95, 1.3, cx + 0.6, 3.1, 1.32, 1 | 4 | 16);
      } else {
        m.mat(M_LAMP);
        p5face(m, [[cx - 0.6, 1.9, 1.29], [cx + 0.6, 1.9, 1.29], [cx + 0.6, 2.9, 1.29], [cx - 0.6, 2.9, 1.29]], [0, 0, 1]);
      }
    }
    // windscreens, head and tail lamps
    m.mat(M_GLASS);
    for (const s of [1, -1]) for (const z0 of [-0.7, 0.02]) p5face(m, [[s * 7.6, 1.95, z0], [s * 7.6, 1.95, z0 + 0.68], [s * 7.6, 2.95, z0 + 0.68], [s * 7.6, 2.95, z0]], [s, 0, 0]);
    m.mat(M_LENS);
    for (const z of [-0.85, 0.85]) m.box(7.52, 1.17, z - 0.07, 7.62, 1.33, z + 0.07);
    m.mat(M_RED);
    for (const z of [-0.9, 0.9]) m.box(-7.62, 1.22, z - 0.06, -7.52, 1.38, z + 0.06);
    // roof: hump, equipment, pantograph
    m.mat(M_PAINT); p5frus(m, 0, 0, 3.38, 5.6, 1.0, 3.62, 4.8, 0.85, 1, 1, true);
    m.mat(M_METAL);
    m.box(-3.6, 3.62, -0.55, -1.8, 3.78, 0.55, 4);
    m.box(1.9, 3.62, -0.55, 3.7, 3.78, 0.55, 4);
    m.mat(M_DARK);
    m.box(-0.5, 3.62, -0.45, 0.5, 3.72, 0.45, 4);
    m.mat(M_METAL);
    const B = [0, 3.72], Lk = [-0.85, 4.6], Rk = [0.85, 4.6], T = [0, 5.5];
    for (const z of [-0.3, 0.3]) for (const [a, b] of [[B, Lk], [B, Rk], [Lk, T], [Rk, T]]) m.bar([a[0], a[1], z], [b[0], b[1], z], 0.04, 0.05);
    m.bar([0, 5.525, -0.85], [0, 5.525, 0.85], 0.06, 0.05);
    // bogies: side beams, bolster, two axles with wheels
    for (const bx of [-4.2, 4.2]) {
      m.mat(M_DARK);
      for (const z of [-0.9, 0.78]) m.box(bx - 1.1, 0.42, z, bx + 1.1, 0.6, z + 0.12);
      m.box(bx - 0.3, 0.42, -0.85, bx + 0.3, 0.9, 0.85, 4);
      for (const dx of [-0.7, 0.7]) {
        m.mat(M_DARK); p6rod(m, [bx + dx, 0.34, -0.72], [bx + dx, 0.34, 0.72], 0.05, 4);
        m.mat(M_METAL);
        for (const z of [-0.72, 0.6]) m.tube([[bx + dx, 0.34, z], [bx + dx, 0.34, z + 0.12]], 0.34, 10, 3);
      }
    }
    m.mat(M_DARK); m.box(-6.4, 0.62, -1.1, 6.4, 0.9, 1.1, 4);
    return { m, pan: [0, 5.55, 0], head: [[7.62, 1.25, -0.85], [7.62, 1.25, 0.85]], tail: [[-7.62, 1.3, -0.9], [-7.62, 1.3, 0.9]] };
  },

  tramPole() { // catenary pole 7.6 m at the origin, arm along +x at y 6.3 to x 3.4, stay and hanger; {m, hang}
    const m = new Mesh();
    m.mat(M_CONC).box(-0.28, 0, -0.28, 0.28, 0.4, 0.28, 4, 0.6, 1);
    m.mat(M_METAL);
    m.tube([[0, 0.4, 0], [0, 4, 0], [0, 7.6, 0]], (k) => [0.12, 0.105, 0.09][k], 6, 2);
    p7ring(m, 0, 0, [[6.15, 0.13], [6.45, 0.13]], 6, false, false);
    m.bar([0.08, 6.3, 0], [3.4, 6.3, 0], 0.06, 0.1);
    m.bar([0.08, 7.2, 0], [3.35, 6.34, 0], 0.04, 0.04);
    m.mat(M_DARK); m.tube([[3.4, 6.28, 0], [3.4, 6.0, 0]], 0.04, 6, 3);
    m.mat(M_METAL); p6rod(m, [3.4, 6.0, 0], [3.4, 5.64, 0], 0.012, 4);
    m.box(3.37, 5.57, -0.06, 3.43, 5.65, 0.06);
    return { m, hang: [3.4, 5.6, 0] };
  },

  fireBarrel() { // 200 l drum r 0.29, y 0.07..0.95 on two bricks, open top, punched ring, charred stubs; origin: floor under the drum; {m, fire}
    const m = new Mesh(), S = 10, rc = 0.29 * cos(PI / S);
    m.mat(M_BRICK);
    for (const sx of [-1, 1]) m.box(sx * 0.15 - 0.06, 0, -0.125, sx * 0.15 + 0.06, 0.07, 0.125, 4);
    m.mat(M_METAL);
    p7ring(m, 0, 0, [[0.07, 0.27, 0.5], [0.09, 0.29, 0.7], [0.45, 0.29], [0.47, 0.298], [0.49, 0.29], [0.93, 0.29], [0.95, 0.29]], S, true, false);
    m.mat(M_DARK);
    for (let s = 0; s < S; s++) {
      const t0 = s / S * TAU, t1 = (s + 1) / S * TAU, tm = (t0 + t1) / 2;
      const c0 = cos(t0), s0 = sin(t0), c1 = cos(t1), s1 = sin(t1);
      // rim, inner wall, embers floor
      p5face(m, [[c0 * 0.29, 0.953, s0 * 0.29], [c1 * 0.29, 0.953, s1 * 0.29], [c1 * 0.262, 0.953, s1 * 0.262], [c0 * 0.262, 0.953, s0 * 0.262]], [0, 1, 0]);
      p5face(m, [[c0 * 0.262, 0.953, s0 * 0.262], [c1 * 0.262, 0.953, s1 * 0.262], [c1 * 0.25, 0.72, s1 * 0.25], [c0 * 0.25, 0.72, s0 * 0.25]], [-cos(tm), 0, -sin(tm)]);
      p5face(m, [[0, 0.72, 0], [c0 * 0.25, 0.72, s0 * 0.25], [c1 * 0.25, 0.72, s1 * 0.25]], [0, 1, 0]);
      // punched hole on the facet
      const r = rc + 0.003, px = cos(tm) * r, pz = sin(tm) * r, tx = -sin(tm) * 0.02, tz = cos(tm) * 0.02;
      p5face(m, [[px - tx, 0.13, pz - tz], [px + tx, 0.13, pz + tz], [px + tx, 0.18, pz + tz], [px - tx, 0.18, pz - tz]], [cos(tm), 0, sin(tm)]);
    }
    const stubs = [[0.0, 0.05, 0.1, -0.05, 0.12], [-0.12, -0.08, -0.04, 0.02, 0.2], [0.1, -0.1, 0.06, 0.1, 0.28], [0.12, 0.1, 0.0, -0.1, 0.2], [-0.08, 0.12, 0.1, 0.1, 0.12]];
    stubs.forEach(([bx, bz, dx, dz, h], i) => {
      m.mat(i % 2 ? M_DARK : M_BARK);
      m.tube([[bx, 0.75, bz], [bx + dx * h * 2, 0.98 + h, bz + dz * h * 2]], 0.028, 5, 2);
    });
    return { m, fire: [0, 0.98, 0] };
  },

  watchBooth() { // guard's hut 2.0 (x +-1) x 1.8 (z +-0.9) x 2.5, plank walls, roof slopes down to +z, door on +z, window on +x, stove pipe; {m, W, pipe}
    const m = new Mesh(), ya = 2.42, yb = 2.12, top = (z) => ya + (yb - ya) * (z + 0.9) / 1.8;
    m.mat(M_BARK);
    p8hex(m, [[-0.98, 0, -0.88], [0.98, 0, -0.88], [0.98, 0, 0.88], [-0.98, 0, 0.88], [-0.98, ya, -0.88], [0.98, ya, -0.88], [0.98, yb, 0.88], [-0.98, yb, 0.88]], 1 | 2);
    // vertical boards on the four walls (front face and one edge each)
    const pitch = 0.1225;
    for (let k = 0; k < 16; k++) {
      const x = -0.98 + k * pitch;
      m.box(x, 0, -0.9, x + 0.1, ya, -0.88, 2 | 4 | 8 | 32);
      if (x + 0.1 < -0.57 || x > 0.17) m.box(x, 0, 0.88, x + 0.1, yb, 0.9, 2 | 4 | 8 | 16);
    }
    for (let k = 0; k < 14; k++) {
      const z = -0.88 + k * pitch, tt = top(z + 0.05);
      m.box(-1.0, 0, z, -0.98, tt, z + 0.1, 2 | 4 | 8 | 32);
      let iv = [[0, tt]];
      if (z + 0.1 > -0.35 && z < 0.35) iv = p8cut(iv, 1.15, 1.75);
      for (const [lo, hi] of iv) m.box(0.98, lo, z, 1.0, hi, z + 0.1, 1 | 4 | 8 | 16);
    }
    // window frame on +x (the pane itself is drawn by the caller on the wall plane)
    m.mat(M_DARK);
    m.box(0.99, 1.15, -0.37, 1.025, 1.19, 0.37, 1 | 4 | 16 | 32);
    m.box(0.99, 1.71, -0.37, 1.025, 1.75, 0.37, 1 | 4 | 16 | 32);
    m.box(0.99, 1.19, -0.37, 1.025, 1.71, -0.33, 1 | 4 | 8 | 16);
    m.box(0.99, 1.19, 0.33, 1.025, 1.71, 0.37, 1 | 4 | 8 | 32);
    // door, handle, step
    m.mat(M_TINT); m.box(-0.55, 0, 0.9, 0.15, 1.85, 0.93, 4 | 16);
    m.mat(M_BARK); m.box(-0.6, 0, 0.9, -0.55, 1.9, 0.935, 1 | 4 | 16); m.box(0.15, 0, 0.9, 0.2, 1.9, 0.935, 2 | 4 | 16); m.box(-0.55, 1.85, 0.9, 0.15, 1.9, 0.935, 4 | 16);
    m.mat(M_METAL); m.box(0.05, 0.9, 0.93, 0.09, 1.02, 0.96, 4 | 16);
    m.mat(M_CONC); m.box(-0.7, 0, 0.9, 0.3, 0.1, 1.2, 4 | 16);
    // sloped tin roof with seams
    m.mat(M_METAL);
    const rz = (z) => ya + 0.02 + (yb - ya) * (z + 0.9) / 1.8;
    p8hex(m, [[-1.12, rz(-1.05) - 0.01, -1.05], [1.12, rz(-1.05) - 0.01, -1.05], [1.12, rz(1.05) - 0.01, 1.05], [-1.12, rz(1.05) - 0.01, 1.05], [-1.12, rz(-1.05) + 0.05, -1.05], [1.12, rz(-1.05) + 0.05, -1.05], [1.12, rz(1.05) + 0.05, 1.05], [-1.12, rz(1.05) + 0.05, 1.05]]);
    for (const x of [-0.8, -0.4, 0, 0.4, 0.8]) p8hex(m, [[x - 0.015, rz(-1.05) + 0.05, -1.05], [x + 0.015, rz(-1.05) + 0.05, -1.05], [x + 0.015, rz(1.05) + 0.05, 1.05], [x - 0.015, rz(1.05) + 0.05, 1.05],
      [x - 0.015, rz(-1.05) + 0.07, -1.05], [x + 0.015, rz(-1.05) + 0.07, -1.05], [x + 0.015, rz(1.05) + 0.07, 1.05], [x - 0.015, rz(1.05) + 0.07, 1.05]], 1 | 4 | 16);
    // stove pipe with a cap
    const pz = -0.4, base = rz(pz);
    m.mat(M_DARK); m.tube([[-0.5, base, pz], [-0.5, 2.82, pz]], 0.05, 6, 0);
    m.mat(M_METAL); p7ring(m, -0.5, pz, [[2.84, 0.09], [2.95, 0.012]], 6, true, true);
    return { m, W: [[1.0, 1.45, 0, PI / 2, 0.7, 0.6]], pipe: [-0.5, 2.95, -0.4] };
  },

  hangar() { // warehouse 24 (x +-12) x 12 (z +-6) x 9, brick base 1.2, ribbed walls to 7, gable roof (ridge along x), sliding gate 5 x 5 and a small door with canopy on +z; {m, W, lamp}
    const m = new Mesh(), W = [];
    m.mat(M_BRICK); m.box(-12, 0, -6, 12, 1.2, 6, 4 | 8, 0.6, 1);
    m.mat(M_CONC);
    m.box(-12.03, 1.2, 6, 12.03, 1.26, 6.03, 4); m.box(-12.03, 1.2, -6.03, 12.03, 1.26, -6, 4);
    m.box(12, 1.2, -6, 12.03, 1.26, 6, 4); m.box(-12.03, 1.2, -6, -12, 1.26, 6, 4);
    m.mat(M_METAL);
    m.box(-12, 1.2, -6, 12, 7, 6, 4 | 8);
    p5face(m, [[12, 7, -6], [12, 7, 6], [12, 8.9, 0]], [1, 0, 0]);
    p5face(m, [[-12, 7, -6], [-12, 7, 6], [-12, 8.9, 0]], [-1, 0, 0]);
    // corrugation ribs
    const winX = [-10.2, -7.8, -5.4, 5.0, 7.4, 9.8];
    for (let k = 0; k < 53; k++) {
      const x = -11.8 + k * 0.45;
      let iv = [[1.26, 7]];
      iv = p8cut(iv, 0, 5.15); if (abs(x) >= 2.7) iv = [[1.26, 7]];
      for (const wx of winX) if (abs(x - wx) < 0.9) iv = p8cut(iv, 4.7, 5.7);
      if (x > 6.3 && x < 7.7) iv = p8cut(iv, 0, 2.35);
      for (const [lo, hi] of iv) m.box(x - 0.04, lo, 6, x + 0.04, hi, 6.035, 2 | 4 | 8 | 16);
      m.box(x - 0.04, 1.26, -6.035, x + 0.04, 7, -6, 2 | 4 | 8 | 32);
    }
    for (let k = 0; k < 26; k++) {
      const z = -5.8 + k * 0.45;
      m.box(12, 1.26, z - 0.04, 12.035, 7, z + 0.04, 1 | 4 | 8 | 32);
      m.box(-12.035, 1.26, z - 0.04, -12, 7, z + 0.04, 2 | 4 | 8 | 32);
    }
    // gable roof, ridge cap
    const ty = (z) => 9 - z / 3;
    for (const s of [1, -1]) {
      const z1 = 6.4 * s;
      p8hex(m, [[-12.3, ty(0) - 0.1, 0], [12.3, ty(0) - 0.1, 0], [12.3, ty(6.4) - 0.1, z1], [-12.3, ty(6.4) - 0.1, z1], [-12.3, ty(0), 0], [12.3, ty(0), 0], [12.3, ty(6.4), z1], [-12.3, ty(6.4), z1]], 1 | 4);
    }
    m.bar([-12.3, 8.96, 0], [12.3, 8.96, 0], 0.25, 0.08);
    // high windows (frames only, panes come from W)
    m.mat(M_DARK);
    for (const wx of winX) {
      W.push([wx, 5.2, 6.0, 0, 1.6, 0.9]);
      m.box(wx - 0.85, 4.7 - 0.05, 6, wx + 0.85, 4.75, 6.05, 4 | 16);
      m.box(wx - 0.85, 5.65, 6, wx + 0.85, 5.7, 6.05, 4 | 16);
      m.box(wx - 0.85, 4.75, 6, wx - 0.8, 5.65, 6.05, 4 | 8 | 16);
      m.box(wx + 0.8, 4.75, 6, wx + 0.85, 5.65, 6.05, 4 | 32 | 16);
    }
    // sliding gate: painted panel, dark frame and brace, rail
    m.mat(M_PAINT); m.box(-2.5, 0, 6.04, 2.5, 5, 6.14, 4 | 16);
    m.mat(M_DARK);
    m.box(-2.5, 0, 6.14, -2.35, 5, 6.18, 4 | 16); m.box(2.35, 0, 6.14, 2.5, 5, 6.18, 4 | 16);
    m.box(-2.35, 4.85, 6.14, 2.35, 5, 6.18, 4 | 16); m.box(-2.35, 0, 6.14, 2.35, 0.15, 6.18, 4 | 16);
    m.box(-2.35, 2.4, 6.14, 2.35, 2.55, 6.18, 4 | 16);
    m.bar([-2.35, 0.15, 6.17], [2.35, 4.85, 6.17], 0.03, 0.1);
    m.mat(M_METAL);
    m.box(1.85, 1.0, 6.18, 1.95, 1.4, 6.23, 4 | 16);
    m.bar([-2.9, 5.18, 6.2], [3.7, 5.18, 6.2], 0.08, 0.08);
    for (const x of [-2.2, 2.2]) m.box(x - 0.05, 5, 6.1, x + 0.05, 5.14, 6.2, 4);
    for (const x of [-2.6, 0.4, 3.4]) m.box(x - 0.04, 5.14, 6.0, x + 0.04, 5.22, 6.16, 4 | 16);
    // small door with canopy and a lamp bracket
    m.mat(M_DARK); m.box(6.38, 0, 6.0, 7.62, 2.35, 6.04, 4 | 16);
    m.mat(M_PAINT); m.box(6.5, 0, 6.04, 7.5, 2.25, 6.06, 4 | 16);
    m.mat(M_METAL); m.box(7.3, 0.95, 6.06, 7.34, 1.1, 6.09, 4 | 16);
    p8hex(m, [[6.2, 2.58, 6], [7.8, 2.58, 6], [7.8, 2.38, 6.95], [6.2, 2.38, 6.95], [6.2, 2.62, 6], [7.8, 2.62, 6], [7.8, 2.42, 6.95], [6.2, 2.42, 6.95]], 4);
    for (const x of [6.3, 7.7]) m.bar([x, 2.1, 6.02], [x, 2.4, 6.9], 0.04, 0.05);
    m.mat(M_DARK);
    m.bar([7, 2.93, 6.0], [7, 2.93, 6.3], 0.04, 0.04);
    m.box(6.85, 2.95, 6.15, 7.15, 3.0, 6.45, 4);
    return { m, W, lamp: [7, 2.9, 6.3] };
  },

  fenceSlab() { // Soviet concrete fence panel x 0..4, 2.5 high, 0.16 thick (z +-0.08), diamond relief on +z, post at x = 0 (0.3 square, 2.7 high)
    const m = new Mesh().mat(M_CONC);
    m.box(0, 0, -0.08, 4, 2.5, 0.08, 4, 0.7, 1);
    m.box(-0.15, 0, -0.15, 0.15, 2.7, 0.15, 4, 0.7, 1);
    m.box(-0.17, 2.64, -0.17, 0.17, 2.7, 0.17, 4);
    // raised border
    m.box(0.16, 0.08, 0.08, 3.92, 0.13, 0.1, 16); m.box(0.16, 2.37, 0.08, 3.92, 2.42, 0.1, 16);
    m.box(0.16, 0.13, 0.08, 0.21, 2.37, 0.1, 16); m.box(3.87, 0.13, 0.08, 3.92, 2.37, 0.1, 16);
    // diamond pyramids
    for (let j = 0; j < 4; j++) for (let i = 0; i < 7; i++) p8pyr(m, 0.5 + 0.5 * i, 0.5 + 0.5 * j, 0.08, 0.25, 0.03);
    return m;
  },

  container() { // 20 ft shipping container 6.06 (x +-3.03) x 2.44 (z +-1.22) x 2.59, ribbed long sides, corner castings, double doors with lock bars at -x
    const m = new Mesh();
    m.mat(M_PAINT);
    m.box(-2.99, 0, -1.195, 2.99, 2.575, 1.195, 4);
    for (let k = 0; k < 39; k++) {
      const x = -2.85 + k * 0.15;
      m.box(x, 0.14, 1.195, x + 0.07, 2.45, 1.215, 2 | 4 | 8 | 16);
      m.box(x, 0.14, -1.215, x + 0.07, 2.45, -1.195, 2 | 4 | 8 | 32);
    }
    for (const [y0, y1] of [[0, 0.12], [2.455, 2.575]]) {
      m.box(-2.87, y0, 1.195, 2.87, y1, 1.215, 4 | 16); m.box(-2.87, y0, -1.215, 2.87, y1, -1.195, 4 | 32);
    }
    for (let k = 0; k < 12; k++) m.box(2.99, 0.14, -1.1 + k * 0.2, 3.01, 2.45, -1.03 + k * 0.2, 1 | 4 | 8 | 32);
    // double doors at -x: two leaves, corrugation, lock bars with cams and brackets
    m.box(-3.01, 0.12, -1.15, -2.99, 2.47, -0.02, 2 | 4 | 8 | 16 | 32 | 64);
    m.box(-3.01, 0.12, 0.02, -2.99, 2.47, 1.15, 2 | 4 | 8);
    for (const z0 of [-1.05, -0.8, -0.55, -0.3, -0.1, 0.1, 0.35, 0.6, 0.85, 1.05]) m.box(-3.02, 0.2, z0, -3.01, 2.4, z0 + 0.07, 2 | 4 | 8 | 32);
    m.mat(M_METAL);
    for (const z of [-0.95, -0.2, 0.2, 0.95]) {
      p6rod(m, [-3.015, 0.15, z], [-3.015, 2.45, z], 0.015, 4);
      m.box(-3.03, 1.1, z - 0.04, -3.0, 1.2, z + 0.04, 4);
      m.box(-3.03, 0.3, z - 0.025, -3.0, 0.36, z + 0.025, 4 | 2);
    }
    // corner castings
    m.mat(M_METAL);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y0 of [0, 2.43]) {
      const xa = sx > 0 ? 2.87 : -3.03, za = sz > 0 ? 1.06 : -1.22;
      m.box(xa, y0, za, xa + 0.16, y0 + 0.16, za + 0.16);
    }
    return m;
  },

  kid() { // child 1.15 m in a puffy winter suit, felt boots, knitted hat with pompom, scarf, mittens; feet together on y = 0, faces +z; {m, neck, mouth}
    const m = new Mesh();
    m.mat(M_DARK);
    for (const sx of [-1, 1]) p2loft(m, [p2R(0, 0.05, 0.085, sx * 0.065, 0.03, 0.6), p2R(0.05, 0.052, 0.08, sx * 0.065, 0.03), p2R(0.2, 0.055, 0.055, sx * 0.065, 0)], 8, true, false);
    m.mat(M_TINT);
    for (const sx of [-1, 1]) p2loft(m, [p2R(0.19, 0.058, 0.058, sx * 0.065, 0, 0.7), p2R(0.32, 0.08, 0.08, sx * 0.065, 0), p2R(0.5, 0.09, 0.09, sx * 0.065, 0)], 8, false, false);
    p2loft(m, [p2R(0.46, 0.17, 0.125, 0, 0, 0.6), p2R(0.58, 0.185, 0.14), p2R(0.72, 0.185, 0.14), p2R(0.82, 0.15, 0.115), p2R(0.86, 0.075, 0.075)], 8, true, true);
    m.mat(M_GRN);
    p2loft(m, [p2R(0.8, 0.1, 0.1, 0, 0.01), p2R(0.85, 0.105, 0.105, 0, 0.01), p2R(0.9, 0.09, 0.09, 0, 0.01)], 8, false, false);
    m.box(0.04, 0.66, 0.115, 0.1, 0.82, 0.13, 16);
    p6head(m, 0, 0.965, 0.015, 0.093, 8, 3);
    m.mat(M_RED);
    p2loft(m, [p2R(0.99, 0.1, 0.1, 0, 0.012), p2R(1.03, 0.105, 0.105, 0, 0.012), p2R(1.075, 0.085, 0.085, 0, 0.012), p2R(1.11, 0.04, 0.04, 0, 0.012)], 8, false, true);
    m.mat(M_TINT); p2ball(m, 0, 1.13, 0.012, 0.028, 1, 6);
    for (const sx of [-1, 1]) {
      m.mat(M_TINT);
      m.tube([[sx * 0.18, 0.77, 0], [sx * 0.27, 0.66, 0.04]], 0.055, 6, 0);
      m.tube([[sx * 0.27, 0.66, 0.04], [sx * 0.33, 0.55, 0.08]], 0.052, 6, 2);
      m.mat(M_RED); p2ball(m, sx * 0.335, 0.53, 0.085, 0.04, 1, 6);
    }
    return { m, neck: 0.86, mouth: [0, 0.93, 0.11] };
  },

  kidSled() { // child on a small wooden sled (runners 0.8 along z, y 0..0.12), legs forward, hands on the rope, faces +z; {m, mouth}
    const m = new Mesh();
    m.mat(M_METAL);
    for (const x of [-0.17, 0.17]) m.sweep([[x, 0.015, -0.4], [x, 0.015, 0.33], [x, 0.05, 0.42], [x, 0.09, 0.43]], 0.014, 0.03);
    m.mat(M_BARK);
    for (const x of [-0.17, 0.17]) for (const z of [-0.3, 0.2]) m.box(x - 0.015, 0.03, z - 0.015, x + 0.015, 0.105, z + 0.015, 4 | 8);
    for (let k = 0; k < 6; k++) { const z0 = -0.38 + k * 0.12; m.box(-0.21, 0.105, z0, 0.21, 0.125, z0 + 0.055, 4); }
    m.box(-0.19, 0.04, 0.28, 0.19, 0.065, 0.31);
    m.mat(M_TINT);
    for (const sx of [-1, 1]) p6rod(m, [sx * 0.19, 0.075, 0.3], [sx * 0.1, 0.3, 0.1], 0.007, 3);
    // legs forward
    for (const sx of [-1, 1]) {
      m.mat(M_TINT);
      m.tube([[sx * 0.06, 0.2, -0.14], [sx * 0.065, 0.25, 0.12]], 0.07, 6, 0);
      m.tube([[sx * 0.065, 0.25, 0.12], [sx * 0.065, 0.22, 0.3]], 0.062, 6, 0);
      m.mat(M_DARK); m.tube([[sx * 0.065, 0.215, 0.3], [sx * 0.065, 0.175, 0.43]], 0.05, 6, 3);
    }
    m.mat(M_TINT);
    p2loft(m, [p2R(0.16, 0.16, 0.13, 0, -0.13, 0.6), p2R(0.27, 0.175, 0.14, 0, -0.13), p2R(0.4, 0.175, 0.13, 0, -0.14), p2R(0.48, 0.14, 0.1, 0, -0.145), p2R(0.52, 0.07, 0.07, 0, -0.145)], 8, true, true);
    m.mat(M_GRN);
    p2loft(m, [p2R(0.45, 0.1, 0.1, 0, -0.14), p2R(0.5, 0.105, 0.105, 0, -0.14), p2R(0.55, 0.09, 0.09, 0, -0.14)], 8, false, false);
    p6head(m, 0, 0.63, -0.135, 0.09, 8, 3);
    m.mat(M_RED);
    p2loft(m, [p2R(0.655, 0.097, 0.097, 0, -0.135), p2R(0.695, 0.102, 0.102, 0, -0.135), p2R(0.737, 0.082, 0.082, 0, -0.135), p2R(0.77, 0.038, 0.038, 0, -0.135)], 8, false, true);
    m.mat(M_TINT); p2ball(m, 0, 0.795, -0.135, 0.026, 1, 6);
    for (const sx of [-1, 1]) {
      m.mat(M_TINT);
      m.tube([[sx * 0.17, 0.45, -0.14], [sx * 0.22, 0.35, -0.04]], 0.05, 6, 0);
      m.tube([[sx * 0.22, 0.35, -0.04], [sx * 0.1, 0.3, 0.1]], 0.047, 6, 2);
      m.mat(M_RED); p2ball(m, sx * 0.1, 0.285, 0.105, 0.04, 1, 6);
    }
    return { m, mouth: [0, 0.6, -0.045] };
  },

  floodlight() { // steel mast 12 m (tapered tube) at the origin, crossbar at y 11.8 with 3 floodlight heads tilted down 35 degrees towards +z; {m, heads}
    const m = new Mesh();
    m.mat(M_CONC).box(-0.4, 0, -0.4, 0.4, 0.3, 0.4, 4, 0.6, 1);
    m.mat(M_METAL);
    m.box(-0.28, 0.3, -0.28, 0.28, 0.34, 0.28, 4);
    m.tube([[0, 0.34, 0], [0, 6.2, 0], [0, 12, 0]], (k) => [0.2, 0.14, 0.085][k], 8, 2);
    m.mat(M_DARK); m.box(0.17, 0.8, -0.1, 0.3, 2.0, 0.1);
    m.mat(M_METAL);
    m.bar([-1.5, 11.8, 0], [1.5, 11.8, 0], 0.1, 0.12);
    for (const s of [-1, 1]) m.bar([0, 10.9, 0], [s * 1.1, 11.75, 0], 0.05, 0.05);
    const a = -35 * PI / 180, N = [0, sin(a), cos(a)], U = [0, cos(a), -sin(a)], heads = [];
    for (const x of [-1.05, 0, 1.05]) {
      const c = [x, 11.35, 0.38], hx = 0.38, hy = 0.27, hz = 0.1;
      m.mat(M_METAL);
      p8obox(m, c, hx, hy, hz, a);
      m.bar([x, 11.76, 0.02], [x, c[1] + 0.12, c[2] - 0.08], 0.05, 0.05);
      const f = hz + 0.004, g = (sx, sy) => [c[0] + sx * (hx - 0.03), c[1] + sy * (hy - 0.03) * U[1] + f * N[1], c[2] + sy * (hy - 0.03) * U[2] + f * N[2]];
      m.mat(M_LAMP); p5face(m, [g(-1, -1), g(1, -1), g(1, 1), g(-1, 1)], N);
      heads.push([c[0], c[1] + f * N[1], c[2] + f * N[2]]);
    }
    return { m, heads };
  },

  loudspeaker() { // wooden pole 6 m with two horn loudspeakers at y 5.5 pointing +z and -z, tilted down 10 degrees; {m, horn}
    const m = new Mesh();
    m.mat(M_BARK).tube([[0, 0, 0], [0, 6, 0]], (k) => [0.09, 0.06][k], 8, 2);
    m.mat(M_METAL); m.box(-0.07, 5.4, -0.1, 0.07, 5.6, 0.1);
    p8horn(m, 1); p8horn(m, -1);
    return { m, horn: [0, 5.5, 0] };
  },

  skis() { // pair of wooden skis 1.9 m leaning on the wall z = 0: feet at z 0.35, tips touch the wall at y 1.85, strapped together, plus two bamboo poles
    const m = new Mesh(), zl = (y) => 0.35 - 0.35 * y / 1.85;
    m.mat(M_BARK);
    for (const x of [-0.045, 0.045]) m.sweep([[x, 0.01, 0.35], [x, 0.7, zl(0.7)], [x, 1.3, zl(1.3)], [x, 1.62, 0.048], [x, 1.78, 0.014], [x, 1.85, 0]], 0.075, 0.012, () => [0, 0, 1]);
    m.mat(M_DARK);
    const a = atan2(0.35, 1.85);
    for (const y of [0.6, 1.2]) p8obox(m, [0, y, zl(y)], 0.1, 0.02, 0.022, a);
    for (const [x0, x1] of [[0.24, 0.21], [0.33, 0.29]]) {
      m.mat(M_BARK); p6rod(m, [x0, 0.012, 0.42], [x1, 1.95, 0.0], 0.012, 5);
      m.mat(M_DARK); p6rod(m, [x0, 0.012, 0.42], [x0 + 0.003, 0.06, 0.42], 0.035, 6);
      p6rod(m, [x1 - 0.003, 1.8, 0.0], [x1, 1.95, 0.0], 0.018, 5);
      p7ring(m, x0, 0.42, [[0.05, 0.06], [0.06, 0.06]], 6, true, true);
    }
    return m;
  },

  jars() { // low wooden crate 0.6 x 0.35 x 0.3 (x +-0.3, z +-0.175) with six 3 l pickle jars, a second crate end at x 0.35..0.65 with a seventh jar on top
    const m = new Mesh();
    m.mat(M_BARK);
    m.box(-0.3, 0, -0.175, 0.3, 0.03, 0.175);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) m.box(sx > 0 ? 0.26 : -0.3, 0.03, sz > 0 ? 0.135 : -0.175, sx > 0 ? 0.3 : -0.26, 0.3, sz > 0 ? 0.175 : -0.135, 4);
    for (const [y0, y1] of [[0.04, 0.14], [0.18, 0.28]]) {
      m.box(-0.26, y0, 0.155, 0.26, y1, 0.175, 1 | 2); m.box(-0.26, y0, -0.175, 0.26, y1, -0.155, 1 | 2);
      m.box(0.28, y0, -0.135, 0.3, y1, 0.135, 16 | 32); m.box(-0.3, y0, -0.135, -0.28, y1, 0.135, 16 | 32);
    }
    m.box(0.35, 0, -0.175, 0.65, 0.3, 0.175, 4);
    const jar = (x, y0, z, k) => {
      m.mat(M_LENS); p7ring(m, x, z, [[y0, 0.07, 0.7], [y0 + 0.18, 0.07], [y0 + 0.225, 0.045]], 6, true, true);
      m.mat(k % 2 ? M_RED : M_GRN); p7ring(m, x, z, [[y0 + 0.01, 0.058], [y0 + 0.17, 0.058]], 5, false, true);
      m.mat(M_METAL); p7ring(m, x, z, [[y0 + 0.225, 0.052], [y0 + 0.245, 0.052]], 5, false, true);
    };
    let k = 0;
    for (const x of [-0.18, 0, 0.18]) for (const z of [-0.085, 0.085]) jar(x, 0.03, z, k++);
    jar(0.5, 0.3, 0, k++);
    return m;
  },

  taxiSign() { // taxi roof sign 0.45 (x) x 0.14 (y 0.03..0.17) x 0.2 (z) on a base, checker band on all four faces, lit top edge; origin at the base centre
    const m = new Mesh();
    m.mat(M_METAL).box(-0.15, 0, -0.07, 0.15, 0.03, 0.07, 4);
    m.mat(M_YEL).box(-0.225, 0.03, -0.1, 0.225, 0.17, 0.1, 4);
    m.mat(M_DARK);
    const y0 = 0.055, q = 0.04, e = 0.002;
    for (let j = 0; j < 2; j++) {
      const ya = y0 + j * q, yb = ya + q;
      for (let i = 0; i < 11; i++) {
        if ((i + j) % 2) continue;
        const xa = -0.22 + i * q, xb = xa + q;
        p5face(m, [[xa, ya, 0.1 + e], [xb, ya, 0.1 + e], [xb, yb, 0.1 + e], [xa, yb, 0.1 + e]], [0, 0, 1]);
        p5face(m, [[xa, ya, -0.1 - e], [xb, ya, -0.1 - e], [xb, yb, -0.1 - e], [xa, yb, -0.1 - e]], [0, 0, -1]);
      }
      for (let i = 0; i < 5; i++) {
        if ((i + j) % 2) continue;
        const za = -0.1 + i * q, zb = za + q;
        p5face(m, [[0.225 + e, ya, za], [0.225 + e, ya, zb], [0.225 + e, yb, zb], [0.225 + e, yb, za]], [1, 0, 0]);
        p5face(m, [[-0.225 - e, ya, za], [-0.225 - e, ya, zb], [-0.225 - e, yb, zb], [-0.225 - e, yb, za]], [-1, 0, 0]);
      }
    }
    m.mat(M_LAMP);
    p5face(m, [[-0.22, 0.15, 0.1 + e], [0.22, 0.15, 0.1 + e], [0.22, 0.168, 0.1 + e], [-0.22, 0.168, 0.1 + e]], [0, 0, 1]);
    p5face(m, [[-0.22, 0.15, -0.1 - e], [0.22, 0.15, -0.1 - e], [0.22, 0.168, -0.1 - e], [-0.22, 0.168, -0.1 - e]], [0, 0, -1]);
    p5face(m, [[0.225 + e, 0.15, -0.095], [0.225 + e, 0.15, 0.095], [0.225 + e, 0.168, 0.095], [0.225 + e, 0.168, -0.095]], [1, 0, 0]);
    p5face(m, [[-0.225 - e, 0.15, -0.095], [-0.225 - e, 0.15, 0.095], [-0.225 - e, 0.168, 0.095], [-0.225 - e, 0.168, -0.095]], [-1, 0, 0]);
    m.box(-0.2, 0.17, -0.08, 0.2, 0.174, 0.08, 4);
    return m;
  },
};
