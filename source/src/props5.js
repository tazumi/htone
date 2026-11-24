// ============================================================================
// props5: vehicles, people, animals, plants and far buildings (plain script, concatenated after props4.js)
// ============================================================================

// planar face (3 or 4 points) wound so that its normal points along hint; ao: one shade or one per point
function p5face(m, pts, hint, ao = 1) {
  const [a, b, c] = pts;
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const d = (uy * vz - uz * vy) * hint[0] + (uz * vx - ux * vz) * hint[1] + (ux * vy - uy * vx) * hint[2];
  const rev = d < 0, P = rev ? pts.slice().reverse() : pts, A = ao.length ? (rev ? ao.slice().reverse() : ao) : pts.map(() => ao);
  if (P.length === 3) m.tri(m.v(P[0][0], P[0][1], P[0][2], A[0]), m.v(P[1][0], P[1][1], P[1][2], A[1]), m.v(P[2][0], P[2][1], P[2][2], A[2]));
  else m.q4(P[0], P[1], P[2], P[3], A);
}
// rectangular frustum from y0 (half sizes hx0, hz0) to y1 (hx1, hz1) about (cx, cz); hx1 = 0 gives a pyramid
function p5frus(m, cx, cz, y0, hx0, hz0, y1, hx1, hz1, a0 = 1, a1 = 1, top = true) {
  const S = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const lo = S.map(([i, j]) => [cx + i * hx0, y0, cz + j * hz0]), hi = S.map(([i, j]) => [cx + i * hx1, y1, cz + j * hz1]);
  for (let k = 0; k < 4; k++) {
    const a = lo[k], b = lo[(k + 1) % 4], c = hi[(k + 1) % 4], d = hi[k];
    p5face(m, [a, b, c, d], [(a[0] + b[0]) / 2 - cx, 0, (a[2] + b[2]) / 2 - cz], [a0, a0, a1, a1]);
  }
  if (top && hx1 > 0) p5face(m, hi, [0, 1, 0], a1);
}
// onion dome: height H, max radius R, base at y0
function p5onion(m, cx, cz, y0, H, R, sides = 12) {
  const P = [[0, 0.45], [0.08, 0.38], [0.22, 0.72], [0.4, 1], [0.58, 0.9], [0.75, 0.6], [0.9, 0.26], [1, 0.02]];
  p2loft(m, P.map(([h, r]) => p2R(y0 + H * h, R * r, R * r, cx, cz, mix(0.6, 1, h))), sides, true, true);
}
// cross of height H on a base at (cx, y0, cz)
function p5cross(m, cx, y0, cz, H) {
  m.box(cx - 0.07, y0, cz - 0.07, cx + 0.07, y0 + H, cz + 0.07, 4);
  m.box(cx - 0.4 * H / 2.4, y0 + H * 0.5, cz - 0.05, cx + 0.4 * H / 2.4, y0 + H * 0.5 + 0.12, cz + 0.05, 0);
  m.box(cx - 0.2 * H / 2.4, y0 + H * 0.75, cz - 0.05, cx + 0.2 * H / 2.4, y0 + H * 0.75 + 0.1, cz + 0.05, 0);
}
// square lattice tower between y0 and y1 in n panels, half width hw0 -> hw1, bar thickness w
function p5lattice(m, y0, y1, n, hw0, hw1, w, cx = 0, cz = 0, aoLo = 0.6) {
  const C = (k, i) => { const h = mix(hw0, hw1, k / n); return [cx + (i === 0 || i === 3 ? -h : h), mix(y0, y1, k / n), cz + (i < 2 ? -h : h)]; };
  for (let k = 0; k <= n; k++) {
    const ao = mix(aoLo, 1, k / n);
    for (let i = 0; i < 4; i++) {
      m.bar(C(k, i), C(k, (i + 1) % 4), w, w, ao);
      if (k < n) {
        m.bar(C(k, i), C(k + 1, i), w, w, ao);
        if ((k + i) % 2) m.bar(C(k, i), C(k + 1, (i + 1) % 4), w * 0.8, w * 0.8, ao); else m.bar(C(k, (i + 1) % 4), C(k + 1, i), w * 0.8, w * 0.8, ao);
      }
    }
  }
}
// wall plane facing +z with window holes, placed by yaw about (ox, oz); win: [cx, cy, w, h] panes appended to Wn
function p5wall(m, Wn, s, rec = 0.12) {
  const ox = s.ox || 0, oz = s.oz || 0, win = s.win || [];
  const hs = win.map(([cx, cy, w, h]) => [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]).concat(s.holes || []);
  m.at(ox, 0, oz, s.yaw);
  p3wall(m, -s.hx, s.hx, s.y0, s.y1, s.zf, hs, rec, s.ao || p3ao);
  if (s.after) s.after();
  m.at(0, 0, 0, 0);
  for (const [cx, cy, w, h] of win) { const [px, pz] = rotY(cx, s.zf - rec, s.yaw); Wn.push([px + ox, cy, pz + oz, s.yaw, w, h]); }
}
// arched head for a rectangular hole [x0, y0, x1, y1] in a wall at z = zf (local frame): brick spandrels over the top corners
function p5arch(m, h, zf, ao = 1) {
  const r = (h[2] - h[0]) / 2, cx = (h[0] + h[2]) / 2, ys = h[3] - r, N = 5;
  for (const s of [-1, 1]) {
    const corner = [cx + s * r, h[3], zf];
    for (let k = 0; k < N; k++) {
      const a0 = k / N * PI / 2, a1 = (k + 1) / N * PI / 2;
      p5face(m, [corner, [cx + s * r * cos(a0), ys + r * sin(a0), zf], [cx + s * r * cos(a1), ys + r * sin(a1), zf]], [0, 0, 1], ao);
    }
  }
}
// half cylinder facing -x about (cx, cz), radius r, from y0 to y1, with a half cone roof to apex height ya
function p5apse(m, cx, cz, r, y0, y1, ya, n = 8) {
  for (let k = 0; k < n; k++) {
    const a = PI / 2 + k / n * PI, b = PI / 2 + (k + 1) / n * PI, c = (a + b) / 2;
    const pa = [cx + r * cos(a), 0, cz + r * sin(a)], pb = [cx + r * cos(b), 0, cz + r * sin(b)];
    p5face(m, [[pa[0], y0, pa[2]], [pb[0], y0, pb[2]], [pb[0], y1, pb[2]], [pa[0], y1, pa[2]]], [cos(c), 0, sin(c)], [0.55, 0.55, 1, 1]);
    m.mat(M_GRN);
    p5face(m, [[pa[0], y1, pa[2]], [pb[0], y1, pb[2]], [cx - 0.3, ya, cz]], [cos(c), 1, sin(c)], 1);
    m.mat(M_BRICK);
  }
}

// ---------------------------------------------------------------- people helpers
// two leg tubes (left x < 0, right x > 0) plus boots; the only geometry below y 0.45. Vertex ranges are kept in m._legs
function p5legs(m, hip = 1.0, sp = 0.09, thick = 1) {
  const legs = [];
  for (const s of [-1, 1]) {
    const a = m.p.length / 3;
    m.mat(M_DARK); m.tube([[s * sp, hip, 0], [s * sp, 0.5, 0.012], [s * sp, 0.1, 0]], (k) => [0.075, 0.066, 0.056][k] * thick, 7, 3);
    m.box(s * sp - 0.06, 0, -0.09, s * sp + 0.06, 0.09, 0.2, 4, 0.7, 1);
    legs.push([a, m.p.length / 3]);
  }
  m._legs = legs;
}
// head (pale ball) with a fur hat; (hy, hz): head centre, back: how far the hat is pushed back
function p5head(m, hy, hz, hatMat = M_BARK, back = 0, hx = 0) {
  m.mat(M_CONC); p2ball(m, hx, hy, hz, 0.095, 6, 10, 1.1);
  m.mat(hatMat);
  p2loft(m, [p2R(hy - 0.045, 0.108, 0.108, hx, hz), p2R(hy + 0.015, 0.113, 0.113, hx, hz - back * 0.3), p2R(hy + 0.075, 0.1, 0.1, hx, hz - back * 0.7), p2R(hy + 0.115, 0.06, 0.06, hx, hz - back)], 10, false, true);
}
// arm: shoulder -> elbow -> hand, plus a glove
function p5arm(m, a, b, c, r = 0.054) {
  m.mat(M_TINT); m.tube([a, b], r, 6, 3); m.tube([b, c], r * 0.95, 6, 3);
  m.mat(M_DARK); p2ball(m, c[0], c[1] - 0.02, c[2], 0.045, 3, 6);
}
// linear lookup of an elliptic ring list at height y
function p5ring(R, y) {
  let k = 0; while (k < R.length - 2 && y > R[k + 1].y) k++;
  const a = R[k], b = R[k + 1], t = clamp((y - a.y) / (b.y - a.y), 0, 1);
  return { rx: mix(a.rx, b.rx, t), rz: mix(a.rz, b.rz, t), cx: mix(a.cx, b.cx, t), cz: mix(a.cz, b.cz, t) };
}
// short dog: s scales everything (1 = 0.8 m long along z, head at +z)
function p5dog(m, s) {
  const P = (x, y, z) => [x * s, y * s, z * s];
  m.mat(M_TINT);
  m.tube([P(0, 0.52, -0.28), P(0, 0.54, -0.1), P(0, 0.54, 0.14), P(0, 0.56, 0.22)], (k) => [0.07, 0.115, 0.12, 0.09][k] * s, 8, 3);
  m.tube([P(0, 0.58, 0.18), P(0, 0.66, 0.29), P(0, 0.64, 0.34)], (k) => [0.08, 0.075, 0.07][k] * s, 7, 3);
  m.tube([P(0, 0.62, 0.32), P(0, 0.6, 0.4)], (k) => [0.06, 0.04][k] * s, 6, 3);
  m.tube([P(0, 0.55, -0.27), P(0, 0.5, -0.36), P(0, 0.4, -0.4)], (k) => [0.03, 0.025, 0.014][k] * s, 5, 2);
  for (const x of [-1, 1]) {
    m.tube([P(x * 0.07, 0.47, 0.1), P(x * 0.065, 0.02, 0.11)], 0.03 * s, 5, 3);
    m.tube([P(x * 0.075, 0.47, -0.2), P(x * 0.08, 0.26, -0.26), P(x * 0.07, 0.02, -0.2)], (k) => [0.045, 0.03, 0.026][k] * s, 5, 3);
    m.box(x * 0.05 * s - 0.012 * s, 0.68 * s, 0.25 * s, x * 0.05 * s + 0.012 * s, 0.76 * s, 0.29 * s, 4);
  }
  m.mat(M_DARK); m.box(-0.02 * s, 0.585 * s, 0.395 * s, 0.02 * s, 0.625 * s, 0.415 * s);
}

const PROPS5 = {
  // ------------------------------------------------------------ vehicles
  uaz() { // 4.4 x 2.1 x 1.9 van, nose +x; blue light bar on the roof, glass box centre (0.15, 2.06, 0), size 0.6 x 0.12 x 1.0
    const m = new Mesh(), hw = 0.95;
    m.mat(M_DARK); m.box(-2.1, 0.35, -0.7, 2.1, 0.55, 0.7, 4, 0.4, 0.7);
    m.box(2.1, 0.38, -0.9, 2.2, 0.62, 0.9, 0, 0.5, 0.8); m.box(-2.2, 0.38, -0.9, -2.1, 0.62, 0.9, 0, 0.5, 0.8);
    m.mat(M_PAINT); p3ext(m, [[-2.1, 0.5], [2.1, 0.5], [2.1, 1.15], [2.02, 1.32], [1.55, 1.4], [1.27, 2.0], [-2.0, 2.0], [-2.1, 1.9]], -hw, hw);
    m.mat(M_GLASS);
    { const n = [0.906, 0.423, 0], a = [1.55 - 0.0277 + n[0] * 0.006, 1.4 + 0.06 + n[1] * 0.006], b = [1.27 + 0.0277 + n[0] * 0.006, 2.0 - 0.06 + n[1] * 0.006];
      p3face(m, [[a[0], a[1], -0.8], [a[0], a[1], 0.8], [b[0], b[1], 0.8], [b[0], b[1], -0.8]], n); }
    p3face(m, [[-2.106, 1.4, -0.7], [-2.106, 1.4, 0.7], [-2.106, 1.88, 0.7], [-2.106, 1.88, -0.7]], [-1, 0, 0]);
    for (const s of [-1, 1]) {
      const z = s * (hw + 0.006);
      m.mat(M_GLASS);
      p3face(m, [[0.2, 1.45, z], [1.2, 1.45, z], [1.3, 1.92, z], [0.2, 1.92, z]], [0, 0, s]);
      p3face(m, [[-1.9, 1.45, z], [-0.1, 1.45, z], [-0.1, 1.92, z], [-1.9, 1.92, z]], [0, 0, s]);
      m.mat(M_LENS); m.box(2.09, 0.9, s * 0.72 - 0.13, 2.115, 1.1, s * 0.72 + 0.13);
      m.mat(M_RED); m.box(-2.115, 0.86, s * 0.8 - 0.06, -2.1, 1.15, s * 0.8 + 0.06);
      m.mat(M_DARK); m.box(1.35, 1.55, s * 1.0 - 0.02, 1.45, 1.8, s * 1.1); // mirror
      for (const x of [1.35, -1.25]) p3wheelArch(m, x, 0.4, hw, s);
    }
    m.mat(M_DARK); m.box(2.095, 0.68, -0.6, 2.108, 1.08, 0.6);
    m.box(-0.2, 2.0, -0.55, 0.5, 2.03, 0.55);
    m.mat(M_GLASS); m.box(-0.15, 2.03, -0.5, 0.45, 2.12, 0.5);
    return m;
  },

  ambulance() { // 5.5 x 2.5 van, nose +x; two blue lamps on the cab roof, centres (1.55, 2.11, +-0.55), size 0.3 x 0.12 x 0.3
    const m = new Mesh(), hwB = 1.0, hwC = 0.95;
    m.mat(M_DARK); m.box(-2.65, 0.4, -0.7, 2.6, 0.6, 0.7, 4, 0.4, 0.7);
    m.box(2.65, 0.42, -0.95, 2.75, 0.7, 0.95, 0, 0.5, 0.8); m.box(-2.75, 0.42, -0.95, -2.65, 0.7, 0.95, 0, 0.5, 0.8);
    m.mat(M_CONC); m.box(-2.7, 0.55, -hwB, 1.35, 2.5, hwB, 4, 0.6, 1);
    p3ext(m, [[1.3, 0.55], [2.7, 0.55], [2.7, 1.1], [2.58, 1.3], [2.2, 1.42], [1.85, 2.05], [1.3, 2.05]], -hwC, hwC);
    m.mat(M_GLASS);
    { const n = [0.874, 0.486, 0], a = [2.2 - 0.035 + 0.005, 1.42 + 0.063 + 0.003], b = [1.85 + 0.035 + 0.005, 2.05 - 0.063 + 0.003];
      p3face(m, [[a[0], a[1], -0.85], [a[0], a[1], 0.85], [b[0], b[1], 0.85], [b[0], b[1], -0.85]], n); }
    for (const s of [-1, 1]) {
      m.mat(M_GLASS); p3face(m, [[1.4, 1.4, s * (hwC + 0.006)], [2.05, 1.4, s * (hwC + 0.006)], [1.88, 1.98, s * (hwC + 0.006)], [1.4, 1.98, s * (hwC + 0.006)]], [0, 0, s]);
      m.mat(M_RED);
      p3face(m, [[-2.7, 1.0, s * (hwB + 0.006)], [1.3, 1.0, s * (hwB + 0.006)], [1.3, 1.25, s * (hwB + 0.006)], [-2.7, 1.25, s * (hwB + 0.006)]], [0, 0, s]);
      p3face(m, [[1.3, 1.0, s * (hwC + 0.006)], [2.45, 1.0, s * (hwC + 0.006)], [2.45, 1.25, s * (hwC + 0.006)], [1.3, 1.25, s * (hwC + 0.006)]], [0, 0, s]);
      m.box(-2.715, 0.8, s * 0.85 - 0.05, -2.7, 1.5, s * 0.85 + 0.05);
      m.mat(M_LENS); m.box(2.685, 0.8, s * 0.7 - 0.12, 2.71, 1.0, s * 0.7 + 0.12);
      m.mat(M_GLASS); m.box(1.4, 2.05, s * 0.55 - 0.15, 1.7, 2.17, s * 0.55 + 0.15);
      m.mat(M_DARK); m.box(1.7, 1.6, s * 1.05 - 0.02, 1.8, 1.85, s * 1.15);
      p3wheelArch(m, 1.9, 0.4, hwC, s); p3wheelArch(m, -1.4, 0.4, hwB, s);
    }
    m.mat(M_DARK); m.box(-2.705, 0.7, -0.01, -2.7, 2.4, 0.01); m.box(2.695, 0.7, -0.5, 2.708, 1.05, 0.5);
    m.mat(M_METAL); m.box(-0.4, 2.5, -0.4, 0.4, 2.56, 0.4); // roof vent
    return m;
  },

  plow() { // 9.2 m truck, nose +x; orange beacon box centre (3.2, 3.33, 0); blade (moldboard) spans x 5.15..6.35, z +-1.95, y 0..1.15, push arms from the front bumper
    const m = new Mesh(), hw = 1.25;
    m.mat(M_DARK); m.box(-4.5, 0.6, -0.55, 4.3, 1.05, 0.55, 4, 0.45, 0.8);
    m.box(4.3, 0.5, -1.15, 4.6, 0.85, 1.15, 0, 0.5, 0.8); m.box(-4.6, 0.5, -1.0, -4.45, 0.8, 1.0, 0, 0.5, 0.8);
    m.mat(M_PAINT); p3ext(m, [[2.4, 1.0], [4.3, 1.0], [4.3, 1.9], [4.1, 3.0], [3.85, 3.25], [2.4, 3.25]], -hw, hw);
    p5frus(m, -1.125, 0, 1.15, 3.3, 0.85, 2.6, 3.325, 1.25, 0.6, 1, true);
    m.mat(M_GLASS);
    { const n = [0.984, 0.179, 0], a = [4.3 - 0.02 + n[0] * 0.006, 1.9 + 0.11 + n[1] * 0.006], b = [4.3 - 0.18 + n[0] * 0.006, 1.9 + 0.99 + n[1] * 0.006];
      p3face(m, [[a[0], a[1], -1.1], [a[0], a[1], 1.1], [b[0], b[1], 1.1], [b[0], b[1], -1.1]], n); }
    for (const s of [-1, 1]) {
      const z = s * (hw + 0.006);
      m.mat(M_GLASS); p3face(m, [[2.8, 1.9, z], [4.1, 1.9, z], [3.95, 3.0, z], [2.8, 3.0, z]], [0, 0, s]);
      m.mat(M_LENS); m.box(4.29, 1.1, s * 0.85 - 0.2, 4.31, 1.35, s * 0.85 + 0.2);
      m.mat(M_RED); m.box(-4.615, 0.55, s * 0.8 - 0.1, -4.6, 0.75, s * 0.8 + 0.1);
      m.mat(M_DARK); m.box(3.9, 1.8, s * 1.38 - 0.03, 4.0, 2.4, s * 1.38 + 0.03); // mirror
      p3wheel(m, 3.4, 0.55, s * 0.9, s * 1.25);
      for (const x of [-1.9, -3.3]) p3wheel(m, x, 0.55, s * 0.95, s * 1.28);
      m.mat(M_DARK);
      const bx = (zz) => 5.2 + (1.9 - zz) / 3.8 * 1.1;
      m.bar([4.6, 0.7, s * 0.6], [bx(s * 0.6) - 0.05, 0.65, s * 0.6], 0.14, 0.14, 0.6);
    }
    m.mat(M_DARK); m.box(3.846 + 0.46, 1.0, -0.5, 4.31, 1.3, 0.5);
    p4cyl(m, -4.6, 0.9, 0, 0.45, 0.06, 10, 0.6); // spreader disc
    m.mat(M_YEL); m.box(3.05, 3.25, -0.3, 3.35, 3.4, 0.3);
    m.mat(M_METAL);
    m.bar([6.3, 0.62, -1.9], [5.2, 0.62, 1.9], 0.1, 1.0, 0.8);
    m.bar([6.33, 1.17, -1.9], [5.23, 1.17, 1.9], 0.2, 0.05, 1);
    m.mat(M_DARK); m.bar([6.3, 0.05, -1.9], [5.2, 0.05, 1.9], 0.13, 0.1, 0.5);
    return m;
  },

  tractor() { // 4.8 m Belarus-style tractor, nose +x (blade tip at x 2.4); orange beacon box centre (-0.95, 2.75, 0)
    const m = new Mesh();
    m.mat(M_DARK); m.box(-2.4, 0.9, -0.18, 2.0, 1.1, 0.18, 4, 0.5, 0.8);
    m.box(1.0, 0.45, -0.7, 1.4, 0.55, 0.7, 4, 0.5, 0.8);
    m.mat(M_PAINT);
    p3ext(m, [[-0.2, 0.9], [1.65, 0.9], [1.65, 1.5], [1.45, 1.75], [-0.2, 1.75]], -0.4, 0.4); // hood
    m.mat(M_DARK); m.box(1.65, 0.95, -0.3, 1.68, 1.55, 0.3);
    m.mat(M_LENS); m.box(1.65, 1.35, -0.38, 1.68, 1.5, -0.2); m.box(1.65, 1.35, 0.2, 1.68, 1.5, 0.38);
    // cab: glass box with paint pillars and roof
    m.mat(M_GLASS); m.box(-1.75, 1.4, -0.62, -0.2, 2.6, 0.62, 4 | 8, 0.8, 1);
    m.mat(M_PAINT);
    for (const x of [-1.75, -0.28]) for (const z of [-0.62, 0.54]) m.box(x, 1.4, z, x + 0.08, 2.6, z + 0.08, 0, 0.7, 1);
    m.box(-1.85, 2.6, -0.72, -0.1, 2.67, 0.72, 0, 1, 1);
    m.box(-1.8, 1.25, -0.66, -0.15, 1.4, 0.66, 0, 0.6, 0.9);
    m.mat(M_YEL); m.box(-1.1, 2.67, -0.15, -0.8, 2.85, 0.15);
    m.mat(M_DARK); m.tube([[0.9, 1.7, 0.2], [0.9, 2.35, 0.2]], 0.045, 6, 3);
    for (const s of [-1, 1]) {
      p3wheel(m, -1.2, 0.75, s * 0.78, s * 1.2);
      p3wheel(m, 1.25, 0.5, s * 0.62, s * 0.92);
      m.mat(M_PAINT); m.box(-1.95, 1.52, s > 0 ? 0.7 : -1.3, -0.45, 1.58, s > 0 ? 1.3 : -0.7, 0, 0.8, 1); // rear fenders
      m.mat(M_RED); m.box(-1.93, 1.4, s * 1.05 - 0.07, -1.9, 1.52, s * 1.05 + 0.07);
      m.mat(M_DARK); m.bar([1.25, 0.5, s * 0.1], [1.25, 0.5, s * 0.62], 0.08, 0.08, 0.6);
      m.bar([1.7, 0.6, s * 0.5], [2.3, 0.6, s * 0.55], 0.1, 0.1, 0.6);
    }
    m.mat(M_DARK); m.bar([-1.2, 0.75, -0.8], [-1.2, 0.75, 0.8], 0.14, 0.14, 0.6);
    m.bar([-2.4, 0.65, -0.3], [-1.5, 0.95, 0.3], 0.07, 0.07, 0.7); // drawbar
    m.mat(M_METAL); m.bar([2.35, 0.62, -1.4], [2.4, 0.62, 1.4], 0.08, 0.8, 0.7);
    m.mat(M_DARK); m.bar([2.33, 0.2, -1.4], [2.38, 0.2, 1.4], 0.1, 0.1, 0.5);
    return m;
  },

  // ------------------------------------------------------------ people (walking ones: only the legs go below y 0.45)
  walker() { // man in a winter coat, 1.76 m, facing +z; legs (x < 0 / x > 0) are the only vertices below y 0.45, coat hem at 0.62
    const m = new Mesh().mat(M_TINT);
    p2loft(m, [p2R(0.62, 0.26, 0.19, 0, 0, 0.6), p2R(0.95, 0.215, 0.15, 0, 0.02), p2R(1.25, 0.21, 0.15, 0, 0.05), p2R(1.42, 0.22, 0.13, 0, 0.08), p2R(1.5, 0.12, 0.1, 0, 0.09), p2R(1.56, 0.1, 0.09, 0, 0.1)], 10, true, true);
    p5arm(m, [-0.23, 1.42, 0.05], [-0.26, 1.15, 0.13], [-0.22, 0.95, 0.27]);
    p5arm(m, [0.23, 1.42, 0.05], [0.26, 1.15, -0.06], [0.22, 0.95, -0.17]);
    p5head(m, 1.64, 0.12);
    p5legs(m, 1.0);
    return m;
  },

  walkerW() { // woman in a long coat (hem 0.5), scarf, shoulder bag at her left (x < 0); legs below 0.45 only
    const m = new Mesh().mat(M_TINT);
    p2loft(m, [p2R(0.5, 0.33, 0.26, 0, 0, 0.55), p2R(0.8, 0.29, 0.21, 0, 0.01, 0.7), p2R(1.0, 0.23, 0.16, 0, 0.02), p2R(1.25, 0.2, 0.145, 0, 0.05), p2R(1.42, 0.21, 0.135, 0, 0.08), p2R(1.5, 0.115, 0.1, 0, 0.09), p2R(1.54, 0.09, 0.085, 0, 0.1)], 10, true, true);
    p5arm(m, [-0.22, 1.42, 0.05], [-0.25, 1.17, -0.02], [-0.21, 0.97, -0.12], 0.05);
    p5arm(m, [0.22, 1.42, 0.05], [0.25, 1.17, 0.12], [0.21, 0.97, 0.24], 0.05);
    m.mat(M_RED);
    p2loft(m, [p2R(1.42, 0.14, 0.125, 0, 0.085), p2R(1.5, 0.13, 0.12, 0, 0.09), p2R(1.56, 0.1, 0.095, 0, 0.1)], 10, false, false);
    m.box(-0.12, 1.3, 0.12, 0.12, 1.42, 0.2, 4); // scarf knot hanging
    p5head(m, 1.65, 0.125, M_BARK);
    m.mat(M_BARK); m.box(-0.41, 0.74, -0.12, -0.3, 1.1, 0.14, 0, 0.7, 1); // bag
    m.bar([-0.2, 1.46, 0.04], [-0.34, 1.1, 0.0], 0.04, 0.012);
    p5legs(m, 0.95, 0.085, 0.95);
    return m;
  },

  janitor() { // janitor in padded jacket (hem 0.8) and orange vest, pushing a 0.9 m scraper at z 0.9 (its blade and handle foot are below 0.45 by design); legs as in walker
    const m = new Mesh().mat(M_TINT);
    const J = [[0.8, 0.27, 0.2, 0.02, 0.6], [0.95, 0.31, 0.22, 0.04, 0.7], [1.08, 0.27, 0.19, 0.05, 0.8], [1.2, 0.31, 0.21, 0.07, 0.9], [1.32, 0.275, 0.19, 0.09], [1.43, 0.24, 0.15, 0.1], [1.5, 0.12, 0.1, 0.12], [1.56, 0.1, 0.09, 0.13]];
    const R = J.map(([y, rx, rz, cz, ao = 1]) => ({ y, rx, rz, cx: 0, cz, ao }));
    p2loft(m, R, 10, true, true);
    m.mat(M_YEL);
    p2loft(m, R.filter((r) => r.y >= 0.95 && r.y <= 1.43).map((r) => p2R(r.y, r.rx + 0.012, r.rz + 0.012, 0, r.cz, 1)), 10, false, false);
    m.mat(M_CONC);
    { const a = p5ring(R, 1.12), b = p5ring(R, 1.17); p2loft(m, [p2R(1.12, a.rx + 0.016, a.rz + 0.016, 0, a.cz), p2R(1.17, b.rx + 0.016, b.rz + 0.016, 0, b.cz)], 10, false, false); }
    p5arm(m, [-0.25, 1.42, 0.1], [-0.28, 1.2, 0.3], [-0.2, 1.02, 0.5], 0.06);
    p5arm(m, [0.25, 1.42, 0.1], [0.28, 1.2, 0.3], [0.2, 1.02, 0.5], 0.06);
    p5head(m, 1.65, 0.17, M_DARK);
    // scraper: long handle to the hands, wide blade on the ground at z 0.9
    m.mat(M_BARK); m.bar([0, 1.1, 0.42], [0, 0.26, 0.9], 0.04, 0.04);
    m.bar([-0.2, 1.0, 0.5], [0.2, 1.0, 0.5], 0.04, 0.04);
    m.mat(M_METAL); m.bar([-0.45, 0.14, 0.9], [0.45, 0.14, 0.9], 0.05, 0.24, 0.6);
    for (const s of [-1, 1]) m.bar([s * 0.43, 0.02, 0.9], [s * 0.05, 0.26, 0.9], 0.03, 0.03, 0.6);
    m.mat(M_DARK); m.bar([-0.45, 0.02, 0.9], [0.45, 0.02, 0.9], 0.06, 0.03, 0.5);
    m._scr = m.p.length / 3; // everything from the scraper on is not part of the person
    p5legs(m, 1.0, 0.095, 1.1);
    return m;
  },

  courier() { // courier on a bicycle, bicycle along +z (1.7 m), rider seated, 0.45 m yellow box over the rear wheel
    const m = new Mesh();
    // wheels
    for (const z of [-0.5, 0.5]) {
      m.mat(M_DARK); m.tube(p4circ([0, 0.34, z], 0.32, 14, 'yz'), 0.025, 5, 0);
      m.mat(M_METAL); m.tube([[-0.02, 0.34, z], [0.02, 0.34, z]], 0.05, 8, 3);
      m.bar([0, 0.34, z - 0.3], [0, 0.34, z + 0.3], 0.01, 0.012, 0.8); m.bar([0, 0.04, z], [0, 0.64, z], 0.01, 0.012, 0.8);
    }
    // frame
    m.mat(M_METAL);
    const BB = [0, 0.3, 0], ST = [0, 0.9, -0.18], HT = [0, 1.0, 0.4];
    m.bar(BB, ST, 0.03, 0.03); m.bar(ST, HT, 0.03, 0.03); m.bar(BB, HT, 0.035, 0.035);
    m.bar(BB, [0, 0.34, -0.5], 0.025, 0.025); m.bar(ST, [0, 0.34, -0.5], 0.02, 0.02);
    m.bar(HT, [0, 0.34, 0.5], 0.03, 0.03);
    m.bar([-0.22, 1.06, 0.42], [0.22, 1.06, 0.42], 0.025, 0.025);
    m.mat(M_DARK); m.box(-0.07, 0.9, -0.28, 0.07, 0.95, -0.06);
    m.mat(M_METAL); m.bar([-0.15, 0.68, -0.5], [-0.15, 0.9, -0.88], 0.02, 0.02); m.bar([0.15, 0.68, -0.5], [0.15, 0.9, -0.88], 0.02, 0.02);
    // box
    m.mat(M_YEL); m.box(-0.225, 0.92, -0.9, 0.225, 1.37, -0.45, 4, 0.8, 1);
    m.mat(M_DARK); m.box(-0.23, 1.2, -0.905, 0.23, 1.24, -0.445, 0);
    // rider
    m.mat(M_TINT);
    p2loft(m, [p2R(0.93, 0.2, 0.15, 0, -0.2, 0.6), p2R(1.12, 0.2, 0.13, 0, -0.13, 0.8), p2R(1.34, 0.22, 0.13, 0, -0.03), p2R(1.5, 0.21, 0.11, 0, 0.06), p2R(1.57, 0.08, 0.08, 0, 0.1)], 10, true, true);
    p5arm(m, [-0.22, 1.46, 0.03], [-0.27, 1.22, 0.28], [-0.22, 1.07, 0.46]);
    p5arm(m, [0.22, 1.46, 0.03], [0.27, 1.22, 0.28], [0.22, 1.07, 0.46]);
    p5head(m, 1.67, 0.17, M_DARK);
    m.mat(M_DARK);
    m.tube([[-0.1, 0.95, -0.2], [-0.13, 0.98, 0.2], [-0.12, 0.45, 0.05]], 0.07, 6, 3);
    m.tube([[0.1, 0.95, -0.2], [0.13, 0.85, 0.15], [0.12, 0.22, 0.0]], 0.07, 6, 3);
    m.box(-0.18, 0.4, -0.04, -0.06, 0.46, 0.14); m.box(0.06, 0.17, -0.06, 0.18, 0.23, 0.12);
    return m;
  },

  drunk() { // man with an open coat (hem 0.55), hat pushed back, leaning to +x, right arm out; legs below 0.45 only
    const m = new Mesh().mat(M_TINT);
    const L = (y) => 0.1 * (y / 1.5) * (y / 1.5);
    const R = [[0.55, 0.28, 0.2, 0.0, 0.55], [0.9, 0.235, 0.16, 0.0, 0.8], [1.25, 0.215, 0.15, 0.05], [1.42, 0.225, 0.135, 0.08], [1.5, 0.12, 0.1, 0.09], [1.56, 0.1, 0.09, 0.1]].map(([y, rx, rz, cz, ao = 1]) => ({ y, rx, rz, cx: L(y), cz, ao }));
    p2loft(m, R, 10, true, true);
    // open front: dark sweater strip, lapels and flaring hem flaps
    m.mat(M_DARK);
    { const a = p5ring(R, 0.7), b = p5ring(R, 1.4);
      p3face(m, [[a.cx - 0.05, 0.7, a.cz + a.rz * 0.955 + 0.004], [a.cx + 0.05, 0.7, a.cz + a.rz * 0.955 + 0.004], [b.cx + 0.05, 1.4, b.cz + b.rz * 0.955 + 0.004], [b.cx - 0.05, 1.4, b.cz + b.rz * 0.955 + 0.004]], [0, 0, 1], 0.9); }
    m.mat(M_TINT);
    for (const s of [-1, 1]) {
      const a = p5ring(R, 0.58), b = p5ring(R, 1.38);
      m.bar([a.cx + s * 0.07, 0.58, a.cz + a.rz * 0.95], [a.cx + s * 0.2, 0.56, a.cz + a.rz * 0.95 + 0.07], 0.12, 0.012, 0.6);
      m.bar([b.cx + s * 0.06, 1.38, b.cz + b.rz * 0.95 + 0.01], [b.cx + s * 0.13, 1.2, b.cz + b.rz * 0.95 + 0.03], 0.05, 0.012, 1);
    }
    p5arm(m, [L(1.42) - 0.23, 1.4, 0.05], [L(1.2) - 0.26, 1.15, 0.08], [L(1.0) - 0.22, 0.92, 0.12]);
    p5arm(m, [L(1.42) + 0.23, 1.42, 0.05], [L(1.4) + 0.55, 1.38, 0.1], [L(1.3) + 0.88, 1.28, 0.2]);
    p5head(m, 1.63, 0.1, M_BARK, 0.14, L(1.63));
    p5legs(m, 0.98, 0.1, 1);
    return m;
  },

  // ------------------------------------------------------------ animals
  dog() { // stray dog standing, 0.8 m along z, head at +z, 0.7 m high
    const m = new Mesh(); p5dog(m, 1); return m;
  },

  dogLying() { // dog lying curled, 0.7 m along z, head at +z, 0.3 m high
    const m = new Mesh().mat(M_TINT);
    p2loft(m, [p2R(0.02, 0.14, 0.28, 0, -0.03, 0.55), p2R(0.1, 0.19, 0.3, 0, -0.03, 0.7), p2R(0.2, 0.16, 0.26, 0, -0.04), p2R(0.27, 0.07, 0.15, 0, -0.06)], 10, true, true);
    p2ball(m, 0.03, 0.13, 0.27, 0.085, 4, 8, 0.95, 0.7);
    m.tube([[0.03, 0.1, 0.33], [0.03, 0.08, 0.4]], (k) => [0.06, 0.04][k], 6, 3);
    m.tube([[0.1, 0.09, -0.28], [0.22, 0.07, -0.18], [0.2, 0.05, 0.05], [0.12, 0.05, 0.2]], (k) => [0.035, 0.032, 0.028, 0.02][k], 5, 3);
    for (const x of [0, 0.1]) m.box(x - 0.03, 0, 0.3, x + 0.02, 0.05, 0.35, 4, 0.6, 1);
    m.box(-0.04, 0.2, 0.2, -0.01, 0.26, 0.24, 4); m.box(0.06, 0.2, 0.2, 0.09, 0.26, 0.24, 4);
    m.mat(M_DARK); m.box(0.01, 0.075, 0.395, 0.05, 0.1, 0.415);
    return m;
  },

  dogSmall() { // small dog on a lead, 0.45 m along z, head at +z; lead (M_DARK) from its collar to the hand at (-0.55, 0.85, -0.6)
    const m = new Mesh(); p5dog(m, 0.56);
    m.mat(M_DARK); m.bar([0, 0.34, 0.1], [-0.55, 0.85, -0.6], 0.008, 0.008);
    m.box(-0.58, 0.83, -0.62, -0.52, 0.87, -0.58);
    return m;
  },

  // ------------------------------------------------------------ birds and plants
  crow() { // sitting crow, 0.46 m along z, head at +z, 0.37 m high
    const m = new Mesh().mat(M_DARK);
    m.tube([[0, 0.17, -0.12], [0, 0.2, 0.0], [0, 0.27, 0.1]], (k) => [0.045, 0.075, 0.055][k], 7, 3);
    p2ball(m, 0, 0.31, 0.15, 0.05, 4, 7);
    m.tube([[0, 0.3, 0.18], [0, 0.285, 0.26]], (k) => [0.028, 0.008][k], 5, 3);
    m.bar([0, 0.18, -0.1], [0, 0.12, -0.19], 0.09, 0.015);
    for (const s of [-1, 1]) {
      m.bar([s * 0.06, 0.26, 0.06], [s * 0.065, 0.17, -0.16], 0.025, 0.1);
      m.bar([s * 0.03, 0, 0], [s * 0.03, 0.15, 0.0], 0.014, 0.014, 0.7);
    }
    return m;
  },

  bird() { // bullfinch, 0.13 m along z, head at +z, 0.12 m high; grey body, red breast, dark cap
    const m = new Mesh().mat(M_TINT);
    m.tube([[0, 0.065, -0.045], [0, 0.075, 0.0], [0, 0.085, 0.035]], (k) => [0.022, 0.036, 0.032][k], 6, 3);
    p2ball(m, 0, 0.1, 0.045, 0.026, 3, 6);
    m.mat(M_RED); p2ball(m, 0, 0.068, 0.034, 0.033, 3, 6, 0.9);
    m.mat(M_DARK);
    p2ball(m, 0, 0.108, 0.042, 0.021, 3, 6, 0.8);
    m.box(-0.004, 0.092, 0.064, 0.004, 0.1, 0.07);
    m.bar([0, 0.07, -0.04], [0, 0.058, -0.065], 0.02, 0.005);
    for (const s of [-1, 1]) m.bar([s * 0.012, 0, 0], [s * 0.012, 0.05, 0.0], 0.005, 0.005);
    return m;
  },

  rowan() { // bare rowan 4 m, bark M_BARK, red berries; shade = sway weight (0 trunk, 1 tips); m.perches = 5 bird perch points on twig tips
    rseed(701);
    const m = new Mesh().mat(M_BARK), tips = [];
    const nrm = (d) => { const l = hypot(d[0], d[1], d[2]) || 1; return [d[0] / l, d[1] / l, d[2] / l]; };
    const cluster = (p) => {
      m.mat(M_RED);
      for (let i = 0; i < 3; i++) { const q = [p[0] + rr(-0.05, 0.05), p[1] + rr(-0.06, 0.0) - i * 0.015, p[2] + rr(-0.05, 0.05)], s = 0.04; m.box(q[0] - s, q[1] - s, q[2] - s, q[0] + s, q[1] + s, q[2] + s, 4, 1, 1); }
      m.mat(M_BARK);
    };
    // branch: start p, direction d, length, radius, sway weight w0 -> w1, depth
    const br = (p, d, len, rad, w0, w1, depth) => {
      const n = depth === 0 ? 4 : depth === 1 ? 3 : 2, pts = [p];
      let q = p, dd = nrm(d);
      for (let k = 0; k < n; k++) {
        dd = nrm([dd[0] + rr(-0.25, 0.25), dd[1] + rr(-0.12, 0.2), dd[2] + rr(-0.25, 0.25)]);
        q = [q[0] + dd[0] * len / n, q[1] + dd[1] * len / n, q[2] + dd[2] * len / n]; pts.push(q);
      }
      m.tube(pts, (k) => rad * (1 - 0.65 * k / n), 5, 2, (k) => mix(w0, w1, k / n));
      if (depth >= 2) { tips.push(q); cluster(q); return; }
      const subs = depth === 0 ? 3 : 2;
      for (let s = 0; s < subs; s++) {
        const t = depth === 0 ? 0.4 + s * 0.28 : 0.45 + s * 0.45, k = min(n, max(1, Math.round(t * n))), b = pts[k];
        const a = rr(0, TAU), up = depth === 0 ? rr(0.2, 0.7) : rr(0.2, 0.9);
        br(b, [cos(a), up, sin(a)], len * rr(0.55, 0.75), rad * 0.5, mix(w0, w1, k / n), min(1, mix(w0, w1, k / n) + 0.35), depth + 1);
      }
      tips.push(q);
    };
    const trunk = [[0, 0, 0], [0.04, 0.6, 0.02], [-0.02, 1.2, 0.0], [0.06, 1.75, 0.04]];
    m.tube(trunk, (k) => [0.1, 0.085, 0.07, 0.055][k], 7, 2, (k) => k * 0.05);
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU + rr(-0.3, 0.3);
      br(trunk[2 + (i & 1)], [cos(a) * 0.7, rr(0.8, 1.2), sin(a) * 0.7], rr(1.15, 1.4), 0.04, 0.12, 0.45, 0);
    }
    br(trunk[3], [0.1, 1, 0], 1.5, 0.045, 0.14, 0.5, 0);
    const pick5 = tips.slice().sort((a, b) => b[1] - a[1]), out = [];
    for (const t of pick5) if (out.length < 5 && out.every((o) => hypot(o[0] - t[0], o[1] - t[1], o[2] - t[2]) > 0.8)) out.push(t);
    m.perches = out;
    return m;
  },

  oldTree() { // discarded New Year spruce lying on its side, 1.8 m along x (butt at -x), 0.55 m high, a few tinsel strands
    rseed(702);
    const m = new Mesh().mat(M_BARK), A = [];
    m.tube([[-0.95, 0.2, 0], [0.9, 0.2, 0.0]], (k) => [0.035, 0.012][k], 6, 3);
    m.mat(M_GRN);
    for (let k = 0; k < 9; k++) {
      const t = k / 8, x = mix(-0.75, 0.82, t), R = mix(0.5, 0.1, t), nb = k < 6 ? 7 : 5;
      for (let b = 0; b < nb; b++) {
        const a = b / nb * TAU + k * 0.7 + rr(-0.2, 0.2), r = R * rr(0.85, 1.1);
        const tip = [x + 0.12 + rr(-0.03, 0.03), max(0.03, 0.2 + sin(a) * r * 0.9 - 0.06), cos(a) * r];
        m.bar([x, 0.2, 0], tip, 0.07 + 0.2 * r, 0.03, 0.55 + 0.4 * t);
        A.push(tip);
      }
    }
    m.tube([[0.86, 0.2, 0], [1.0, 0.24, 0.0]], (k) => [0.02, 0.003][k], 4, 2);
    m.mat(M_YEL);
    for (let i = 0; i < 4; i++) { const a = A[(rnd() * (A.length - 4)) | 0], b = A[((rnd() * (A.length - 4)) | 0) + 3]; m.bar([a[0], a[1] + 0.02, a[2]], [(a[0] + b[0]) / 2, min(a[1], b[1]) + 0.03, (a[2] + b[2]) / 2], 0.012, 0.01); m.bar([(a[0] + b[0]) / 2, min(a[1], b[1]) + 0.03, (a[2] + b[2]) / 2], [b[0], b[1] + 0.02, b[2]], 0.012, 0.01); }
    return m;
  },

  tent() { // ice-fishing tent, 1.7 m square, walls 1.5 m, pyramid to 1.95 m; door flap open on +z (x +-0.32); stool at (-0.5, 0, 1.4), dark hole disc at (0.35, 0.016, 1.45)
    const m = new Mesh().mat(M_TINT), h = 0.85;
    m.box(-h, 0, -h, h, 1.5, h - 0.02, 4 | 32, 0.6, 1);
    p3wall(m, -h, h, 0, 1.5, h, [[-0.32, 0, 0.32, 1.25]], 0.3);
    p5frus(m, 0, 0, 1.5, 0.9, 0.9, 1.95, 0, 0, 1, 1, false);
    m.box(-0.33, 1.25, h - 0.3, 0.33, 1.5, h - 0.02, 4 | 8 | 32);
    // open flap, hinged at the right edge, swung out 60 degrees
    const a = PI / 3, fx = 0.32 + 0.64 * cos(a), fz = h + 0.64 * sin(a), nf = [-sin(a), 0, cos(a)];
    for (const s of [1, -1]) p5face(m, [[0.32, 0, h], [fx, 0, fz], [fx, 1.25, fz], [0.32, 1.25, h]], [nf[0] * s, 0, nf[2] * s], 0.7);
    m.mat(M_DARK);
    p5face(m, [[-0.32, 0.0, h - 0.3], [0.32, 0.0, h - 0.3], [0.32, 1.25, h - 0.3], [-0.32, 1.25, h - 0.3]], [0, 0, 1], 0.4);
    p5face(m, [[-0.32, 0.01, h - 0.3], [0.32, 0.01, h - 0.3], [0.32, 0.01, h], [-0.32, 0.01, h]], [0, 1, 0], 0.4);
    p4cyl(m, 0.35, 0.006, 1.45, 0.13, 0.012, 10);
    m.mat(M_BARK); m.box(-0.65, 0.28, 1.25, -0.35, 0.32, 1.55);
    for (const x of [-0.62, -0.38]) for (const z of [1.28, 1.52]) m.bar([x, 0, z], [x, 0.28, z], 0.025, 0.025, 0.7);
    return m;
  },

  // ------------------------------------------------------------ far buildings
  church() { // Orthodox church: main block x +-5, z +-6, 9 m; apse at -x (r 3); bell tower x 5..9 (z +-2, 16.3 m); {m, W, tops}; tops = [main dome apex (0, 21.75, 0), tower dome apex (7, 15, 0)]
    const m = new Mesh(), Wn = [], rec = 0.12, ao = (y) => mix(0.55, 1, sstep(0, 5, y));
    m.mat(M_BRICK); m.box(-5, 0, -6, 5, 9, 6, 1 | 2 | 4 | 16 | 32);
    const wy0 = 2.8, wy1 = 6.4, ww = 1.2, arch = (x) => [x - ww / 2, wy0, x + ww / 2, wy1];
    const spec = (yaw, hx, zf, xs, extra = {}) => ({ yaw, hx, zf, y0: 0, y1: 9, ao, win: xs.map((x) => [x, (wy0 + wy1) / 2, ww, wy1 - wy0]), ...extra });
    const archAfter = (zf, xs) => () => { m.mat(M_BRICK); for (const x of xs) p5arch(m, arch(x), zf - 0.0, 0.8); };
    const walls = [[0, 5, 6, [-3.5, 3.5], [[-1.2, 0, 1.2, 3.4]]], [PI, 5, 6, [-3.5, 0, 3.5], []], [PI / 2, 6, 5, [-4, 4], []], [-PI / 2, 6, 5, [-4, 4], []]];
    for (const [yaw, hx, zf, xs, holes] of walls) {
      m.mat(M_BRICK);
      p5wall(m, Wn, spec(yaw, hx, zf, xs, { holes: holes.map((h) => h.slice()), rec: 0.12, after: () => { archAfter(zf, xs)(); if (holes.length) { m.mat(M_DARK); p5face(m, [[-1.2, 0, zf - 0.3], [1.2, 0, zf - 0.3], [1.2, 3.4, zf - 0.3], [-1.2, 3.4, zf - 0.3]], [0, 0, 1], 0.4); } } }), rec);
    }
    m.at(0, 0, 0, 0).mat(M_CONC); m.box(-1.7, 0, 6, 1.7, 0.35, 7.1, 4 | 16, 0.6, 1);
    m.mat(M_BRICK);
    p5apse(m, -5, 0, 3, 0, 6.2, 7.8);
    // hip roof, drum, onion dome, cross
    m.mat(M_GRN); p5frus(m, 0, 0, 9, 5.3, 6.3, 11.2, 2.6, 2.6, 0.8, 1, true);
    m.mat(M_CONC); p2loft(m, [p2R(11.2, 2.4, 2.4, 0, 0, 0.7), p2R(15.2, 2.4, 2.4)], 8, false, false);
    p2loft(m, [p2R(15.2, 2.65, 2.65), p2R(15.45, 2.65, 2.65), p2R(15.45, 2.2, 2.2)], 8, false, true);
    m.mat(M_DARK);
    for (const j of [0, 2, 4, 6]) { const t = (j + 0.5) * PI / 4, r = 2.4 * cos(PI / 8); m.at(r * cos(t), 12.2, r * sin(t), PI / 2 - t); m.box(-0.3, 0, -0.03, 0.3, 1.9, 0.04); }
    m.at(0, 0, 0, 0);
    m.mat(M_YEL); p5onion(m, 0, 0, 15.45, 6.3, 3.0); p5cross(m, 0, 21.75, 0, 2.55);
    // bell tower
    m.mat(M_BRICK); m.box(5, 0, -2, 9, 11, 2, 1 | 4);
    m.mat(M_CONC); m.box(4.85, 10.8, -2.15, 9.15, 11.2, 2.15, 4);
    m.mat(M_DARK);
    p5face(m, [[9.01, 8, -0.8], [9.01, 8, 0.8], [9.01, 10.3, 0.8], [9.01, 10.3, -0.8]], [1, 0, 0], 0.4);
    p5face(m, [[9.01, 4, -0.2], [9.01, 4, 0.2], [9.01, 6, 0.2], [9.01, 6, -0.2]], [1, 0, 0], 0.5);
    for (const s of [-1, 1]) {
      p5face(m, [[6.2, 8, s * 2.01], [7.8, 8, s * 2.01], [7.8, 10.3, s * 2.01], [6.2, 10.3, s * 2.01]], [0, 0, s], 0.4);
      p5face(m, [[6.8, 4, s * 2.01], [7.2, 4, s * 2.01], [7.2, 6, s * 2.01], [6.8, 6, s * 2.01]], [0, 0, s], 0.5);
    }
    m.mat(M_GRN); p5frus(m, 7, 0, 11.2, 2.2, 2.2, 13, 0.35, 0.35, 0.8, 1, true);
    m.mat(M_CONC); p2loft(m, [p2R(13, 0.42, 0.42, 7, 0), p2R(13.6, 0.42, 0.42, 7, 0)], 8, false, true);
    m.mat(M_YEL); p5onion(m, 7, 0, 13.6, 1.4, 0.62, 10); p5cross(m, 7, 15, 0, 1.3);
    return { m, W: Wn, tops: [[0, 21.75, 0], [7, 15, 0]] };
  },

  factory() { // 40 x 18 x 12 m block (x +-20, z +-9), annex x 20..30; chimneys 45 m at (-26, -5), (-32, -5); flare 35 m at (36, 4); {m, W, tips} tips = [chimney 1 top, chimney 2 top, flare head]
    const m = new Mesh(), Wn = [], hx = 20, hz = 9, H = 12, ao = (y) => mix(0.55, 1, sstep(0, 6, y));
    m.mat(M_PANEL); m.box(-hx, 0, -hz, hx, H, hz, 4 | 16 | 32, 0.6, 1);
    const xs = []; for (let i = 0; i < 12; i++) xs.push(-16.5 + 3 * i);
    const win = []; for (const cy of [3.7, 8.0]) for (const x of xs) win.push([x, cy, 1.8, 2.6]);
    p5wall(m, Wn, { yaw: 0, hx, zf: hz, y0: 0, y1: H, win, ao });
    p5wall(m, Wn, { yaw: PI, hx, zf: hz, y0: 0, y1: H, win, ao });
    m.mat(M_CONC);
    for (const s of [-1, 1]) m.box(-hx, H, s * hz - 0.15, hx, H + 0.6, s * hz + 0.15, 4, 1, 1);
    m.mat(M_PANEL); m.box(-14, H, -3, 14, H + 1.6, 3, 4, 1, 1);
    m.mat(M_DARK); m.box(-13.5, H + 0.5, -3.02, 13.5, H + 1.3, 3.02, 4 | 8, 1, 1);
    // annex with a roller door
    m.mat(M_PANEL); m.box(hx, 0, -6, 30, 6.5, 6, 1 | 4, 0.6, 1);
    m.mat(M_DARK);
    p5face(m, [[30.01, 0, -2.5], [30.01, 0, 2.5], [30.01, 4.5, 2.5], [30.01, 4.5, -2.5]], [1, 0, 0], 0.4);
    m.mat(M_CONC); m.box(hx, 6.5, -6.2, 30.2, 6.9, 6.2, 4, 1, 1);
    // pipes between the block and the chimneys
    m.mat(M_METAL); m.bar([-hx, 9.5, -5], [-26, 9.5, -5], 0.5, 0.5, 0.8); m.bar([-26, 9.5, -5], [-26, 6, -5], 0.5, 0.5, 0.7);
    // chimneys
    const tips = [];
    for (const cx of [-26, -32]) {
      const r = (y) => mix(1.9, 1.0, y / 45), cz = -5;
      m.mat(M_CONC); p2loft(m, [p2R(0, r(0), r(0), cx, cz, 0.55), p2R(20, r(20), r(20), cx, cz, 0.8), p2R(45, r(45), r(45), cx, cz, 1)], 12, true, false);
      m.mat(M_RED);
      for (const y of [36, 40]) p2loft(m, [p2R(y, r(y) + 0.04, r(y) + 0.04, cx, cz), p2R(y + 2, r(y + 2) + 0.04, r(y + 2) + 0.04, cx, cz)], 12, false, false);
      m.mat(M_DARK); p2loft(m, [p2R(45.0, r(45) - 0.2, r(45) - 0.2, cx, cz, 0.5)], 12, false, true);
      m.mat(M_CONC); m.box(cx - 2.2, 0, cz - 2.2, cx + 2.2, 1.0, cz + 2.2, 4, 0.55, 1);
      tips.push([cx, 45, cz]);
    }
    // flare stack with a flame head
    const fx = 36, fz = 4;
    m.mat(M_METAL); m.tube([[fx, 0, fz], [fx, 35, fz]], (k) => [0.45, 0.25][k], 8, 3, (k) => [0.6, 1][k]);
    m.box(fx - 0.9, 29.8, fz - 0.9, fx + 0.9, 30, fz + 0.9, 0, 1, 1);
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) m.bar([fx + dx * 6, 0, fz + dz * 6], [fx + dx * 0.25, 28, fz + dz * 0.25], 0.06, 0.06, 0.6);
    m.mat(M_YEL); p2loft(m, [p2R(35, 0.3, 0.3, fx, fz), p2R(35.8, 0.36, 0.36, fx, fz), p2R(36.7, 0.2, 0.2, fx, fz), p2R(37.6, 0.0, 0.0, fx, fz)], 8, true, true);
    tips.push([fx, 36, fz]);
    return { m, W: Wn, tips };
  },

  pylon() { // 30 m lattice "christmas tree" pylon, arms along +-z at y 18.5 / 22.5 / 26.5 (half length 6.2 / 5 / 3.8); {m, arms} arms = 6 wire points (insulator bottoms) [x, y, z]
    const m = new Mesh().mat(M_METAL), arms = [];
    p5lattice(m, 0, 30, 10, 2.1, 0.35, 0.12);
    const hwAt = (y) => mix(2.1, 0.35, y / 30);
    for (const [y, L] of [[18.5, 6.2], [22.5, 5.0], [26.5, 3.8]]) {
      const h = hwAt(y);
      for (const s of [-1, 1]) {
        m.mat(M_METAL);
        m.bar([0, y, s * h], [0, y + 0.25, s * L], 0.14, 0.14, 0.9);
        m.bar([0, y + 1.3, s * h], [0, y + 0.25, s * L], 0.12, 0.12, 1);
        m.bar([0, y, s * h], [0, y + 1.3, s * h], 0.12, 0.12, 0.9);
        m.bar([0, y + 0.1, s * (h + L) / 2], [0, y + 0.95, s * (h + (L - h) * 0.35)], 0.08, 0.08, 1);
        m.mat(M_LENS); m.tube([[0, y + 0.25, s * L], [0, y - 2.1, s * L]], 0.07, 6, 3);
        arms.push([0, y - 2.1, s * L]);
      }
    }
    m.mat(M_METAL); m.bar([0, 29.7, 0], [0, 31.0, 0], 0.1, 0.1, 1);
    return { m, arms };
  },

  overpass() { // 120 m road bridge along x (x +-60), deck 12 m wide (z +-6), deck top at y 7; lamp posts every 30 m on both sides; {m, lamps} lamps = head centres (x, 15, +-4.3)
    const m = new Mesh(), lamps = [];
    m.mat(M_CONC); m.box(-60, 5.8, -6, 60, 6.95, 6, 0, 0.55, 0.9);
    m.mat(M_ASPH); m.box(-60, 6.95, -5.55, 60, 7.0, 5.55, 4 | 1 | 2, 1, 1);
    m.mat(M_CONC);
    for (const s of [-1, 1]) m.box(-60, 7.0, s * 5.7 - 0.2, 60, 8.0, s * 5.7 + 0.2, 0, 0.8, 1);
    for (let x = -60; x <= 60; x += 20) {
      m.mat(M_CONC); m.box(x - 0.6, 4.9, -4.8, x + 0.6, 5.8, 4.8, 0, 0.5, 0.8);
      for (const z of [-3.2, 3.2]) { m.tube([[x, 0, z], [x, 4.9, z]], 0.6, 10, 3, () => 0.55); m.box(x - 0.8, 0, z - 0.8, x + 0.8, 0.4, z + 0.8, 4, 0.5, 0.8); }
    }
    for (const e of [-1, 1]) m.box(e * 60 - (e > 0 ? 0 : 3), 0, -6, e * 60 + (e > 0 ? 3 : 0), 5.8, 6, 0, 0.5, 0.8);
    for (let x = -60; x <= 60; x += 30) for (const s of [-1, 1]) {
      m.mat(M_METAL);
      m.tube([[x, 8.0, s * 5.75], [x, 14.8, s * 5.75]], (k) => [0.12, 0.08][k], 6, 3, (k) => [0.7, 1][k]);
      m.bar([x, 14.8, s * 5.75], [x, 15.2, s * 4.4], 0.07, 0.07, 1);
      m.box(x - 0.45, 14.9, s * 4.3 - 0.2, x + 0.45, 15.1, s * 4.3 + 0.2, 0, 1, 1);
      lamps.push([x, 15.0, s * 4.3]);
    }
    return { m, lamps };
  },

  crane() { // tower crane: mast 2 x 2 m, 45 m; jib 40 m along +x at y 46..47.8, counter-jib 12 m along -x; {m, lights} = [jib tip (40, 47.2, 0), mast top (0, 53.4, 0)]
    const m = new Mesh().mat(M_YEL);
    m.mat(M_CONC); m.box(-2.4, 0, -2.4, 2.4, 1.2, 2.4, 4, 0.55, 0.9);
    m.mat(M_YEL);
    p5lattice(m, 1.2, 45, 12, 1, 1, 0.13);
    m.box(-1.3, 45, -1.3, 1.3, 45.9, 1.3, 0, 0.8, 1);
    // jib and counter-jib trusses
    const truss = (x0, x1, n) => {
      m.bar([x0, 46, -0.6], [x1, 46, -0.6], 0.14, 0.14); m.bar([x0, 46, 0.6], [x1, 46, 0.6], 0.14, 0.14); m.bar([x0, 47.8, 0], [x1, 47.8, 0], 0.14, 0.14);
      for (let k = 0; k <= n; k++) {
        const x = mix(x0, x1, k / n), xn = mix(x0, x1, (k + 1) / n);
        m.bar([x, 46, -0.6], [x, 46, 0.6], 0.08, 0.08); m.bar([x, 46, -0.6], [x, 47.8, 0], 0.08, 0.08); m.bar([x, 46, 0.6], [x, 47.8, 0], 0.08, 0.08);
        if (k < n) { const o = k % 2 ? 1 : -1; m.bar([x, 46, o * 0.6], [xn, 47.8, 0], 0.07, 0.07); m.bar([x, 47.8, 0], [xn, 46, -o * 0.6], 0.07, 0.07); }
      }
    };
    truss(0, 40, 16); truss(-12, 0, 6);
    // tower head and pendants
    for (const [x, z] of [[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]]) m.bar([x, 45.9, z], [0, 53, 0], 0.12, 0.12);
    m.bar([0, 53, 0], [0, 54.6, 0], 0.08, 0.08);
    for (const [x, y] of [[14, 47.8], [32, 47.8], [-10, 47.8]]) m.bar([0, 53, 0], [x, y, 0], 0.05, 0.05);
    // counterweights, cab, trolley and hook
    m.mat(M_CONC); for (let k = 0; k < 3; k++) m.box(-11.7 + k * 1.2, 44.4, -0.9, -10.6 + k * 1.2, 46, 0.9, 0, 0.7, 1);
    m.mat(M_YEL); m.box(1.1, 42.6, -1.0, 3.3, 45.0, 1.0, 0, 0.6, 1);
    m.mat(M_GLASS); p5face(m, [[3.306, 43.4, -0.8], [3.306, 43.4, 0.8], [3.306, 44.6, 0.8], [3.306, 44.6, -0.8]], [1, 0, 0]);
    m.mat(M_DARK); m.box(23.5, 45.2, -0.4, 24.5, 46, 0.4); m.bar([24, 45.2, 0], [24, 14, 0], 0.04, 0.04); m.box(23.75, 13, -0.25, 24.25, 14, 0.25);
    return { m, lights: [[40, 47.2, 0], [0, 53.4, 0]] };
  },

  frameBld() { // unfinished 9-storey frame building, 30 x 12 m (x +-15, z +-6), slabs every 2.8 m (top at 25.2), lift core at x -4.5..-1.5, stairs in the +x end bay
    rseed(703);
    const m = new Mesh(), H = 2.8, N = 9;
    m.mat(M_CONC); m.box(-15.5, 0, -6.5, 15.5, 0.3, 6.5, 4, 0.6, 1);
    for (let k = 1; k <= N; k++) m.box(-15, k * H - 0.25, -6, 15, k * H, 6, 0, 0.7, 1);
    for (let x = -15; x <= 15.01; x += 6) for (const z of [-6, 0, 6]) {
      const x0 = min(max(x, -14.8), 14.8), z0 = min(max(z, -5.8), 5.8);
      m.box(x0 - 0.2, 0.3, z0 - 0.2, x0 + 0.2, N * H + 1, z0 + 0.2, 4, 0.6, 1);
      if (rnd() < 0.5) { m.mat(M_METAL); for (const [dx, dz] of [[-0.1, -0.1], [0.1, 0.1]]) m.bar([x0 + dx, N * H + 1, z0 + dz], [x0 + dx, N * H + 2.2, z0 + dz], 0.025, 0.025); m.mat(M_CONC); }
    }
    // lift core with dark openings
    m.box(-4.5, 0.3, -1.5, -1.5, N * H + 2.8, 1.5, 4, 0.6, 1);
    m.mat(M_DARK);
    for (let k = 0; k < N; k++) p5face(m, [[-3.6, k * H + 0.3, 1.51], [-2.4, k * H + 0.3, 1.51], [-2.4, k * H + 2.4, 1.51], [-3.6, k * H + 2.4, 1.51]], [0, 0, 1], 0.4);
    // stairs: one flight per storey in the end bay
    m.mat(M_CONC);
    for (let k = 0; k < N; k++) { const z0 = k % 2 ? -1 : -5, z1 = k % 2 ? -5 : -1; m.bar([13.5, k * H + 0.3, z0], [13.5, (k + 1) * H, z1], 1.2, 0.2, 0.8); }
    // walls of the lower floors: front, back and the two ends; some bays left open
    const wall = (ox, oz, yaw, bays, f) => {
      for (const cx of bays) {
        if (rnd() > (f < 3 ? 0.92 : f < 5 ? 0.5 : f < 6 ? 0.25 : 0.06)) continue;
        const y0 = f * H + (f ? 0 : 0.3), y1 = (f + 1) * H - 0.25;
        m.mat(f < 4 ? M_PANEL : M_CONC);
        const win = rnd() < 0.7 ? [[-1.3, y0 + 0.9, -0.3, y0 + 2.1]] : [];
        const hole = rnd() < 0.5 ? [[0.4, y0 + 0.9, 1.4, y0 + 2.1]] : [];
        m.at(ox + cx * cos(yaw), 0, oz - cx * sin(yaw), yaw);
        p3wall(m, -2.9, 2.9, y0, y1, 0.0, win.concat(hole), 0.12);
      }
      m.at(0, 0, 0, 0);
    };
    const bx = [-12, -6, 0, 6, 12];
    for (let f = 0; f < N; f++) {
      wall(0, 6.05, 0, bx, f); wall(0, -6.05, PI, bx.map((x) => -x), f);
      wall(15.05, 0, PI / 2, [-3, 3], f); wall(-15.05, 0, -PI / 2, [-3, 3], f);
    }
    return m;
  },

  watertower() { // 26 m brick water tower: shaft r 2.5 -> 2 (to y 16), flare to the 9 m x 5 m tank (y 18..23), cone roof to 26 m
    const m = new Mesh().mat(M_BRICK), rS = (y) => mix(2.5, 2.0, y / 16);
    p2loft(m, [p2R(0, 2.5, 2.5, 0, 0, 0.55), p2R(8, rS(8), rS(8), 0, 0, 0.8), p2R(16, 2.0, 2.0)], 12, true, false);
    m.mat(M_CONC); p2loft(m, [p2R(16, 2.0, 2.0), p2R(16.5, 2.3, 2.3), p2R(18, 4.2, 4.2)], 12, false, false);
    // narrow windows up the shaft, spiralling
    m.mat(M_DARK);
    for (let k = 0; k < 6; k++) {
      const y = 2.5 + k * 2.3, j = (k * 5) % 12;
      const ang = (j + 0.5) * TAU / 12, r = rS(y) * cos(PI / 12);
      m.at(r * cos(ang), y, r * sin(ang), PI / 2 - ang); m.box(-0.25, 0, -0.03, 0.25, 0.9, 0.05);
    }
    m.at(0, 0, 0, 0);
    // door
    m.at(2.4, 0, 0, PI / 2); m.box(-0.6, 0, -0.02, 0.6, 2.2, 0.06); m.at(0, 0, 0, 0);
    // tank, bands, walkway, roof
    m.mat(M_TINT); p2loft(m, [p2R(18, 4.5, 4.5, 0, 0, 0.7), p2R(23, 4.5, 4.5)], 16, true, false);
    p2loft(m, [p2R(23, 4.5, 4.5), p2R(23, 4.7, 4.7), p2R(24.0, 3.3, 3.3), p2R(26, 0.25, 0.25)], 16, false, true);
    m.mat(M_METAL);
    for (const y of [19.5, 21.5]) p2loft(m, [p2R(y, 4.52, 4.52, 0, 0, 1), p2R(y + 0.12, 4.52, 4.52, 0, 0, 1)], 16, false, false);
    p2loft(m, [p2R(18, 4.4, 4.4), p2R(18, 5.0, 5.0), p2R(18.06, 5.0, 5.0)], 16, false, false);
    for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; m.bar([5.0 * cos(a), 18, 5.0 * sin(a)], [5.0 * cos(a), 19.1, 5.0 * sin(a)], 0.05, 0.05); }
    m.tube([[0, 26, 0], [0, 27, 0]], 0.04, 4, 2);
    return m;
  },

  school() { // three-storey school 60 x 15 x 11 m (x +-30, z +-7.5), front +z with porch at x 0; {m, W}; windows 2.2 x 1.8 every 3 m, floors at y 0.9 / 4.4 / 7.9
    const m = new Mesh(), Wn = [], H = 10.5, ao = (y) => mix(0.55, 1, sstep(0, 5, y)), zf = 7.5;
    m.mat(M_BRICK); m.box(-30, 0, -7.5, 30, H, 7.5, 4 | 16 | 32, 0.6, 1);
    const xs = []; for (let i = 0; i < 20; i++) xs.push(-28.5 + 3 * i);
    const win = (front) => { const w = []; for (const y0 of [0.9, 4.4, 7.9]) for (const x of xs) { if (front && abs(x) < 2.2 && y0 < 4) continue; w.push([x, y0 + 0.9, 2.2, 1.8]); } return w; };
    p5wall(m, Wn, { yaw: 0, hx: 30, zf, y0: 0, y1: H, win: win(true), holes: [[-1.2, 0.5, 1.2, 3.0]], ao, after: () => { m.mat(M_DARK); p5face(m, [[-1.2, 0.5, zf - 0.3], [1.2, 0.5, zf - 0.3], [1.2, 3.0, zf - 0.3], [-1.2, 3.0, zf - 0.3]], [0, 0, 1], 0.4); m.mat(M_BRICK); } });
    p5wall(m, Wn, { yaw: PI, hx: 30, zf, y0: 0, y1: H, win: win(false), ao });
    m.mat(M_CONC);
    m.box(-30.1, 0, -7.6, 30.1, 0.6, 7.6, 4, 0.6, 1);
    for (const q of [[-30, H, -7.5, 30, H + 0.5, -7.2], [-30, H, 7.2, 30, H + 0.5, 7.5], [-30, H, -7.2, -29.7, H + 0.5, 7.2], [29.7, H, -7.2, 30, H + 0.5, 7.2]]) m.box(...q, 0, 1, 1);
    // porch: platform, two pillars, canopy
    m.box(-2.6, 0, zf, 2.6, 0.5, zf + 2.4, 4 | 16, 0.55, 1);
    for (const x of [-2.2, 2.2]) m.box(x - 0.25, 0.5, zf + 2.0, x + 0.25, 3.7, zf + 2.5, 0, 0.7, 1);
    m.box(-3.0, 3.7, zf - 0.05, 3.0, 4.0, zf + 2.9, 16, 0.8, 1);
    m.box(-1.5, 0, zf + 2.4, 1.5, 0.35, zf + 2.9, 4 | 16, 0.55, 1);
    return { m, W: Wn };
  },

  kinder() { // two-storey kindergarten 40 x 14 x 7 m (x +-20, z +-7), front +z, three open verandas 6 x 4 centred at (x -12 / 0 / 12, z 19); {m, W}; windows 1.8 x 1.5 every 3 m, floors at y 0.9 / 4.1
    const m = new Mesh(), Wn = [], H = 6.8, ao = (y) => mix(0.55, 1, sstep(0, 4, y)), zf = 7;
    m.mat(M_BRICK); m.box(-20, 0, -7, 20, H, 7, 4 | 16 | 32, 0.6, 1);
    const xs = []; for (let i = 0; i < 13; i++) xs.push(-18 + 3 * i);
    const win = (front) => { const w = []; for (const y0 of [0.9, 4.1]) for (const x of xs) { if (front && x === 0 && y0 < 2) continue; w.push([x, y0 + 0.75, 1.8, 1.5]); } return w; };
    p5wall(m, Wn, { yaw: 0, hx: 20, zf, y0: 0, y1: H, win: win(true), holes: [[-0.9, 0.3, 0.9, 2.3]], ao, after: () => { m.mat(M_DARK); p5face(m, [[-0.9, 0.3, zf - 0.3], [0.9, 0.3, zf - 0.3], [0.9, 2.3, zf - 0.3], [-0.9, 2.3, zf - 0.3]], [0, 0, 1], 0.4); m.mat(M_BRICK); } });
    p5wall(m, Wn, { yaw: PI, hx: 20, zf, y0: 0, y1: H, win: win(false), ao });
    m.mat(M_CONC); m.box(-20.1, 0, -7.1, 20.1, 0.5, 7.1, 4, 0.6, 1);
    m.box(-20, H, -7.2, 20, H + 0.4, 7.2, 4, 1, 1);
    m.mat(M_TINT); m.box(-1.8, 2.5, zf, 1.8, 2.7, zf + 1.6, 16 | 4, 1, 1);
    for (const x of [-1.6, 1.6]) m.box(x - 0.06, 0, zf + 1.4, x + 0.06, 2.5, zf + 1.54, 0, 0.7, 1);
    m.mat(M_CONC); m.box(-1.8, 0, zf, 1.8, 0.3, zf + 1.7, 4 | 16, 0.6, 1);
    // verandas: floor slab, back wall (towards the building), low side walls, flat metal roof on front posts
    for (const cx of [-12, 0, 12]) {
      const z0 = 17, z1 = 21;
      m.mat(M_CONC); m.box(cx - 3.1, 0, z0 - 0.1, cx + 3.1, 0.15, z1 + 0.1, 4, 0.6, 1);
      m.mat(M_TINT); m.box(cx - 3, 0.15, z0, cx + 3, 2.6, z0 + 0.15, 0, 0.7, 1);
      for (const s of [-1, 1]) m.box(cx + s * 3 - 0.08, 0.15, z0, cx + s * 3 + 0.08, 1.0, z1, 0, 0.7, 1);
      for (const s of [-1, 1]) m.box(cx + s * 3 - 0.07, 0.15, z1 - 0.14, cx + s * 3 + 0.07, 2.6, z1, 0, 0.7, 1);
      m.mat(M_METAL); m.box(cx - 3.3, 2.6, z0 - 0.2, cx + 3.3, 2.7, z1 + 0.3, 4, 1, 1);
    }
    return { m, W: Wn };
  },

  celltower() { // 40 m telecom tower, lattice 4 m -> 1 m up to y 38 then a pole; antenna platform at y 36; {m, top} top = (0, 40, 0)
    const m = new Mesh().mat(M_METAL);
    p5lattice(m, 0, 38, 14, 2.0, 0.5, 0.1);
    m.tube([[0, 38, 0], [0, 40, 0]], 0.07, 6, 3);
    m.box(-0.85, 35.95, -0.85, 0.85, 36.05, 0.85, 0, 0.8, 1);
    for (const [a, b] of [[[-1.6, -1.6], [1.6, -1.6]], [[1.6, -1.6], [1.6, 1.6]], [[1.6, 1.6], [-1.6, 1.6]], [[-1.6, 1.6], [-1.6, -1.6]]]) {
      m.bar([a[0], 36, a[1]], [b[0], 36, b[1]], 0.1, 0.1, 0.9);
      m.bar([a[0], 36.95, a[1]], [b[0], 36.95, b[1]], 0.06, 0.06, 1);
      m.bar([a[0], 36, a[1]], [a[0], 36.95, a[1]], 0.06, 0.06, 1);
    }
    m.bar([-1.6, 36, 0], [-0.4, 36, 0], 0.08, 0.08); m.bar([1.6, 36, 0], [0.4, 36, 0], 0.08, 0.08); m.bar([0, 36, -1.6], [0, 36, -0.4], 0.08, 0.08); m.bar([0, 36, 1.6], [0, 36, 0.4], 0.08, 0.08);
    m.mat(M_CONC);
    for (let k = 0; k < 3; k++) {
      const yaw = k / 3 * TAU + 0.4, r = 1.55;
      for (const o of [-0.5, 0.5]) { const x = r * sin(yaw) + o * cos(yaw), z = r * cos(yaw) - o * sin(yaw); m.at(x, 35.9, z, yaw); m.box(-0.15, 0, -0.04, 0.15, 1.7, 0.06, 0, 0.8, 1); }
    }
    m.at(0, 0, 0, 0);
    m.mat(M_CONC); m.at(0, 36.5, 1.75, 0); m.tube([[0, 0, 0], [0, 0, 0.2]], 0.4, 12, 3); m.at(0, 0, 0, 0);
    return { m, top: [0, 40, 0] };
  },
};
