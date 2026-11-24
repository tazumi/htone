// ============================================================================
// props3: vehicles, rolling stock, buildings and a spruce (plain script, concatenated after props2.js)
// ============================================================================

// ground-proximity shade: dark near the ground, 1 above
const p3ao = (y) => mix(0.55, 1, sstep(0.3, 1.6, y));

// planar face from 4 points, wound so that the normal points along hint
function p3face(m, pts, hint, ao = 1) {
  const [a, b, c] = pts;
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const d = (uy * vz - uz * vy) * hint[0] + (uz * vx - ux * vz) * hint[1] + (ux * vy - uy * vx) * hint[2];
  const P = d < 0 ? pts.slice().reverse() : pts;
  m.q4(P[0], P[1], P[2], P[3], ao);
}

// convex CCW polygon in xy extruded along z from z0 to z1 (z0 < z1); shade by height
function p3ext(m, poly, z0, z1, ao = p3ao) {
  const n = poly.length;
  for (let k = 0; k < n; k++) {
    const a = poly[k], b = poly[(k + 1) % n];
    m.q4([a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1], [ao(a[1]), ao(b[1]), ao(b[1]), ao(a[1])]);
  }
  let cx = 0, cy = 0; for (const p of poly) { cx += p[0] / n; cy += p[1] / n; }
  const c1 = m.v(cx, cy, z1, ao(cy)), c0 = m.v(cx, cy, z0, ao(cy));
  const r1 = poly.map((p) => m.v(p[0], p[1], z1, ao(p[1]))), r0 = poly.map((p) => m.v(p[0], p[1], z0, ao(p[1])));
  for (let k = 0; k < n; k++) { m.tri(c1, r1[k], r1[(k + 1) % n]); m.tri(c0, r0[(k + 1) % n], r0[k]); }
}

// loft through rings of equal vertex count (each ring is an array of [x, y, z]); caps at both ends
function p3loft(m, rings, ao = p3ao) {
  const idx = rings.map((r) => r.map((p) => m.v(p[0], p[1], p[2], ao(p[1]))));
  const n = rings[0].length;
  for (let k = 0; k < rings.length - 1; k++) for (let s = 0; s < n; s++) {
    const s2 = (s + 1) % n, a = rings[k][s], b = rings[k][s2], c = rings[k + 1][s2], d = rings[k + 1][s];
    m.q4(a, d, c, b, [ao(a[1]), ao(d[1]), ao(c[1]), ao(b[1])]);
  }
  for (const [ri, flip] of [[0, true], [rings.length - 1, false]]) {
    const r = rings[ri], c = [0, 0, 0]; for (const p of r) for (let a = 0; a < 3; a++) c[a] += p[a] / n;
    const cv = m.v(c[0], c[1], c[2], ao(c[1])), q = r.map((p) => m.v(p[0], p[1], p[2], ao(p[1])));
    for (let s = 0; s < n; s++) { if (flip) m.tri(cv, q[(s + 1) % n], q[s]); else m.tri(cv, q[s], q[(s + 1) % n]); }
  }
}

// road wheel on side s (+1 / -1) of a body of half-width hw, sitting in a dark arch
function p3wheelArch(m, x, r, hw, s, inner = 0.2) {
  m.mat(M_DARK).tube([[x, r + 0.06, s * (hw - 0.3)], [x, r + 0.06, s * (hw + 0.006)]], r + 0.06, 12, 2);
  m.tube([[x, r, s * (hw - inner)], [x, r, s * (hw + 0.025)]], r, 12, 2);
  m.mat(M_METAL).tube([[x, r, s * (hw + 0.026)], [x, r, s * (hw + 0.04)]], r * 0.55, 10, 2);
}
// free-standing road wheel between z = za and zb
function p3wheel(m, x, r, za, zb) {
  const s = zb > za ? 1 : -1;
  m.mat(M_DARK).tube([[x, r, za], [x, r, zb]], r, 12, 2);
  m.mat(M_METAL).tube([[x, r, zb], [x, r, zb + s * 0.014]], r * 0.55, 10, 2);
}

// wall plane facing +z at z = zf with real rectangular holes (recess rec behind it); local coordinates
function p3wall(m, x0, x1, y0, y1, zf, holes = [], rec = 0.12, ao = p3ao) {
  const xs = [x0, x1], ys = [y0, y1];
  for (const h of holes) { xs.push(h[0], h[2]); ys.push(h[1], h[3]); }
  xs.sort((a, b) => a - b); ys.sort((a, b) => a - b);
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
    const xa = xs[i], xb = xs[i + 1], ya = ys[j], yb = ys[j + 1];
    if (xb - xa < 1e-6 || yb - ya < 1e-6) continue;
    const cx = (xa + xb) / 2, cy = (ya + yb) / 2;
    if (holes.some((h) => cx > h[0] && cx < h[2] && cy > h[1] && cy < h[3])) continue;
    m.q4([xa, ya, zf], [xb, ya, zf], [xb, yb, zf], [xa, yb, zf], [ao(ya), ao(ya), ao(yb), ao(yb)]);
  }
  const z0 = zf - rec, z1 = zf, q = 0.6;
  for (const [a, b, c, d] of holes) {
    m.q4([a, b, z1], [a, b, z0], [a, d, z0], [a, d, z1], q); // left edge, faces +x
    m.q4([c, b, z0], [c, b, z1], [c, d, z1], [c, d, z0], q); // right edge, faces -x
    m.q4([a, b, z0], [c, b, z0], [c, b, z1], [a, b, z1], q); // sill, faces +y
    m.q4([a, d, z1], [c, d, z1], [c, d, z0], [a, d, z0], q); // head, faces -y
  }
}

// rail wheels: bogie centred at x = cx with axles at offsets ax; rail top is y = 0
function p3bogie(m, cx, ax) {
  m.mat(M_DARK);
  for (const a of ax) {
    const x = cx + a;
    m.mat(M_DARK).tube([[x, 0.48, -1.02], [x, 0.48, 1.02]], 0.07, 6, 3);
    for (const s of [-1, 1]) {
      m.mat(M_DARK).tube([[x, 0.48, s * 0.695], [x, 0.48, s * 0.825]], 0.48, 14, 3);
      m.mat(M_METAL).tube([[x, 0.48, s * 0.826], [x, 0.48, s * 0.84]], 0.17, 8, 2);
      m.mat(M_DARK).box(x - 0.15, 0.36, s * 0.94 - 0.07, x + 0.15, 0.62, s * 0.94 + 0.07, 4, 0.6, 0.9);
    }
  }
  const lo = ax[0] - 0.3, hi = ax[ax.length - 1] + 0.3;
  for (const s of [-1, 1]) m.box(cx + lo, 0.62, s * 0.94 - 0.06, cx + hi, 0.8, s * 0.94 + 0.06, 0, 0.6, 0.9);
  m.box(cx - 0.4, 0.8, -1.0, cx + 0.4, 1.0, 1.0, 0, 0.6, 0.9);
}
// buffers at both ends of a rail vehicle of length L (tips reach exactly +-L/2)
function p3buffers(m, L, y = 1.06) {
  m.mat(M_METAL);
  for (const e of [-1, 1]) for (const z of [-0.88, 0.88]) {
    const h = L / 2;
    m.tube([[e * (h - 0.4), y, z], [e * (h - 0.12), y, z], [e * h, y, z]], (k) => [0.08, 0.09, 0.19][k], 10, 2);
  }
}
// underframe of a wagon: sill beam, end beams
function p3frame(m, L, deck = 1.3) {
  const h = L / 2 - 0.25;
  m.mat(M_DARK).box(-h, deck - 0.3, -0.55, h, deck, 0.55, 4, 0.5, 0.8);
  for (const e of [-1, 1]) m.box(e * h - 0.05, deck - 0.4, -1.25, e * h + 0.05, deck - 0.05, 1.25, 4, 0.55, 0.9);
}

const PROPS3 = {
  // ------------------------------------------------------------ highway vehicles
  truck() { // length 8.0
    const m = new Mesh(), hw = 1.1;
    m.mat(M_DARK).box(-3.95, 0.6, -0.5, 3.8, 1.05, 0.5, 4, 0.45, 0.8);
    m.box(-4, 0.5, -1.0, -3.88, 0.8, 1.0, 0, 0.5, 0.8); m.box(3.82, 0.45, -1.05, 4, 0.85, 1.05, 0, 0.5, 0.8);
    // cab
    m.mat(M_PAINT); p3ext(m, [[1.95, 0.95], [3.85, 0.95], [3.85, 1.55], [3.4, 2.6], [1.95, 2.6]], -hw, hw);
    const n = [1.05 / 1.142, 0.45 / 1.142, 0], e = [3.85, 1.55], d = [-0.45, 1.05];
    const at = (t, o) => [e[0] + d[0] * t + n[0] * o, e[1] + d[1] * t + n[1] * o];
    m.mat(M_GLASS);
    { const a = at(0.12, 0.006), b = at(0.88, 0.006); p3face(m, [[a[0], a[1], -0.95], [a[0], a[1], 0.95], [b[0], b[1], 0.95], [b[0], b[1], -0.95]], n); }
    for (const s of [-1, 1]) {
      p3face(m, [[2.3, 1.7, s * (hw + 0.006)], [3.5, 1.7, s * (hw + 0.006)], [3.3, 2.45, s * (hw + 0.006)], [2.3, 2.45, s * (hw + 0.006)]], [0, 0, s]);
      m.mat(M_DARK).box(3.45, 1.9, s * 1.12 - 0.03, 3.55, 2.3, s * 1.12 + 0.03, 0, 1, 1); // mirror
      m.mat(M_LENS).box(3.84, 1.05, s * 0.8 - 0.15, 3.86, 1.27, s * 0.8 + 0.15);
      m.mat(M_RED).box(-3.98, 1.1, s * 1.1 - 0.08, -3.95, 1.4, s * 1.1 + 0.08);
      for (const x of [2.9]) p3wheel(m, x, 0.5, s * 0.78, s * 1.1);
      for (const x of [-1.5, -2.8]) p3wheel(m, x, 0.5, s * 0.86, s * 1.18);
    }
    m.mat(M_DARK).box(3.846, 1.0, -0.5, 3.862, 1.3, 0.5);
    // box body
    m.mat(M_TINT).box(-3.95, 1.05, -1.2, 1.9, 4.25, 1.2, 0, 0.6, 1);
    m.mat(M_DARK).box(-3.96, 1.0, -1.15, -3.94, 1.18, 1.15); // rear sill strip
    m.mat(M_METAL).box(-3.955, 1.2, -0.02, -3.945, 4.1, 0.02); // door seam rod
    return m;
  },

  semi() { // length 16.6
    const m = new Mesh(), hw = 1.25;
    // tractor chassis, fifth wheel
    m.mat(M_DARK).box(3.3, 0.88, -0.55, 8.1, 1.1, 0.55, 4, 0.45, 0.8);
    m.box(8.15, 0.5, -1.2, 8.3, 0.9, 1.2, 0, 0.5, 0.8);
    m.tube([[4.5, 1.1, 0], [4.5, 1.26, 0]], 0.58, 12, 3);
    // cab-over
    m.mat(M_PAINT); p3ext(m, [[6.0, 1.0], [8.2, 1.0], [8.2, 1.9], [7.95, 3.1], [7.7, 3.6], [6.0, 3.6]], -hw, hw);
    p3ext(m, [[6.0, 3.605], [7.2, 3.605], [6.05, 3.95], [6.0, 3.95]], -1.05, 1.05); // roof spoiler
    const n = [1.2 / 1.226, 0.25 / 1.226, 0], e = [8.2, 1.9], d = [-0.25, 1.2];
    const at = (t, o) => [e[0] + d[0] * t + n[0] * o, e[1] + d[1] * t + n[1] * o];
    m.mat(M_GLASS);
    { const a = at(0.08, 0.006), b = at(0.92, 0.006); p3face(m, [[a[0], a[1], -1.1], [a[0], a[1], 1.1], [b[0], b[1], 1.1], [b[0], b[1], -1.1]], n); }
    for (const s of [-1, 1]) {
      m.mat(M_GLASS); const z = s * (hw + 0.006);
      p3face(m, [[6.7, 2.0, z], [8.1, 2.0, z], [7.95, 3.0, z], [6.7, 3.0, z]], [0, 0, s]);
      m.mat(M_LENS).box(8.19, 1.1, s * 0.85 - 0.18, 8.215, 1.38, s * 0.85 + 0.18);
      m.mat(M_METAL).tube([[5.85, 1.15, s * 1.15], [5.85, 4.3, s * 1.15]], 0.07, 8, 2); // exhaust stack
      m.tube([[4.8, 0.85, s * 0.98], [5.8, 0.85, s * 0.98]], 0.3, 10, 3); // fuel tank
      m.mat(M_DARK).box(7.2, 1.7, s * 1.3 - 0.03, 7.35, 2.1, s * 1.3 + 0.03, 0, 1, 1); // mirror
      for (const x of [7.3]) p3wheel(m, x, 0.52, s * 0.95, s * 1.25);
      for (const x of [4.5]) { p3wheel(m, x, 0.52, s * 0.9, s * 1.25); }
    }
    m.mat(M_DARK).box(8.19, 1.0, -0.5, 8.2, 1.4, 0.5);
    // semitrailer
    m.mat(M_TINT).box(-8.28, 1.3, -1.275, 5.5, 3.9, 1.275, 0, 0.6, 1);
    m.mat(M_DARK);
    for (const s of [-1, 1]) {
      m.box(-8.0, 1.0, s * 0.55 - 0.06, 5.5, 1.3, s * 0.55 + 0.06, 4, 0.45, 0.8);
      m.mat(M_RED).box(-8.3, 1.4, s * 1.1 - 0.12, -8.28, 1.65, s * 1.1 + 0.12);
      m.mat(M_DARK);
      for (const x of [-4.3, -5.7, -7.1]) p3wheel(m, x, 0.5, s * 0.95, s * 1.25);
      m.mat(M_METAL).bar([3.1, 0.35, s * 1.0], [3.1, 1.0, s * 1.0], 0.07); // landing leg
      m.bar([-3.6, 0.6, s * 1.22], [3.1, 0.6, s * 1.22], 0.05); // side guard
      m.bar([-8.1, 0.6, s * 0.95], [-8.1, 1.3, s * 0.95], 0.06);
    }
    m.mat(M_METAL).bar([-8.1, 0.6, -1.1], [-8.1, 0.6, 1.1], 0.06, 0.1); // underride bar
    m.mat(M_DARK).box(-8.3, 0.95, -1.0, -8.2, 1.3, 1.0);
    return m;
  },

  rv() { // motorhome, length 7.6
    const m = new Mesh(), hwC = 1.1, hwB = 1.15;
    m.mat(M_PAINT); p3ext(m, [[1.6, 0.45], [3.68, 0.45], [3.78, 0.9], [3.78, 1.3], [3.2, 2.1], [1.6, 2.1]], -hwC, hwC);
    const n = [0.8, 0.6, 0], e = [3.78, 1.3], d = [-0.58, 0.8];
    const at = (t, o) => [e[0] + d[0] * t + n[0] * o, e[1] + d[1] * t + n[1] * o];
    m.mat(M_GLASS);
    { const a = at(0.1, 0.006), b = at(0.9, 0.006); p3face(m, [[a[0], a[1], -0.95], [a[0], a[1], 0.95], [b[0], b[1], 0.95], [b[0], b[1], -0.95]], n); }
    m.mat(M_TINT);
    m.box(-3.72, 0.6, -hwB, 1.9, 3.1, hwB, 0, 0.6, 1);
    p3ext(m, [[1.9, 2.2], [3.55, 2.2], [3.65, 2.5], [3.55, 3.0], [3.3, 3.1], [1.9, 3.1]], -hwB, hwB); // alcove over the cab
    for (const s of [-1, 1]) {
      m.mat(M_GLASS); const z = s * (hwB + 0.006), zc = s * (hwC + 0.006);
      p3face(m, [[2.0, 1.45, zc], [3.0, 1.45, zc], [3.0, 2.05, zc], [2.0, 2.05, zc]], [0, 0, s]);
      for (const x of s > 0 ? [-3.0, -1.8] : [-3.0, -1.8, 0.5]) p3face(m, [[x - 0.35, 1.75, z], [x + 0.35, 1.75, z], [x + 0.35, 2.4, z], [x - 0.35, 2.4, z]], [0, 0, s]);
      p3face(m, [[-0.2 - 0.35, 1.75, z], [-0.2 + 0.35, 1.75, z], [-0.2 + 0.35, 2.4, z], [-0.2 - 0.35, 2.4, z]], [0, 0, s]);
      m.mat(M_LENS).box(3.77, 0.85, s * 0.75 - 0.15, 3.795, 1.02, s * 0.75 + 0.15);
      m.mat(M_RED).box(-3.76, 0.75, s * 1.0 - 0.07, -3.72, 1.15, s * 1.0 + 0.07);
      p3wheelArch(m, 2.6, 0.38, hwC, s); p3wheelArch(m, -2.0, 0.38, hwB, s, 0.25);
    }
    // door and its frame on the kerb side
    m.mat(M_DARK);
    for (const x of [0.75, 1.65]) m.box(x - 0.025, 0.7, hwB, x + 0.025, 2.7, hwB + 0.012);
    m.box(0.725, 2.7, hwB, 1.675, 2.75, hwB + 0.012); m.box(0.725, 0.65, hwB, 1.675, 0.7, hwB + 0.012);
    m.mat(M_GLASS); p3face(m, [[0.85, 1.55, hwB + 0.013], [1.55, 1.55, hwB + 0.013], [1.55, 2.5, hwB + 0.013], [0.85, 2.5, hwB + 0.013]], [0, 0, 1]);
    m.mat(M_DARK).box(3.5, 0.45, -1.1, 3.8, 0.65, 1.1, 0, 0.5, 0.8); // bumpers
    m.box(-3.8, 0.45, -1.0, -3.72, 0.7, 1.0, 0, 0.5, 0.8);
    m.mat(M_DARK).box(3.77, 0.75, -0.5, 3.79, 1.1, 0.5);
    // ladder at the back
    m.mat(M_METAL);
    for (const z of [-0.25, 0.25]) m.box(-3.8, 0.8, z - 0.025, -3.74, 3.0, z + 0.025, 0, 1, 1);
    for (let k = 0; k < 8; k++) m.box(-3.79, 0.95 + k * 0.28, -0.25, -3.75, 0.98 + k * 0.28, 0.25, 0, 1, 1);
    return m;
  },

  bus() { // small Soviet bus, length 7.2
    const m = new Mesh().mat(M_PAINT), yb = 0.6;
    const ring = (x, hw, yt, ch) => {
      const r = [[x, yb, -hw], [x, yb, hw]];
      for (const a of [0, 1, 2, 3]) { const t = a / 3 * PI / 2; r.push([x, yt - ch + ch * sin(t), hw - ch + ch * cos(t)]); }
      for (const a of [3, 2, 1, 0]) { const t = a / 3 * PI / 2; r.push([x, yt - ch + ch * sin(t), -(hw - ch + ch * cos(t))]); }
      return r;
    };
    const S = [[-3.585, 1.12, 2.9, 0.35], [-3.4, 1.2, 3.0, 0.3], [2.7, 1.2, 3.0, 0.3], [3.3, 1.18, 2.0, 0.3], [3.585, 1.05, 1.4, 0.2]];
    p3loft(m, S.map((s) => ring(...s)));
    const hwAt = (x) => (x < 2.7 ? 1.2 : mix(1.2, 1.18, (x - 2.7) / 0.6));
    // split windscreen
    const sl = [0.6, -1.0], nn = [1.0 / 1.166, 0.6 / 1.166, 0], P = (t, o) => [2.7 + sl[0] * t + nn[0] * o, 3.0 + sl[1] * t + nn[1] * o];
    m.mat(M_GLASS);
    for (const s of [-1, 1]) {
      const a = P(0.1, 0.008), b = P(0.9, 0.008);
      p3face(m, [[a[0], a[1], s * 0.07], [a[0], a[1], s * 0.82], [b[0], b[1], s * 0.8], [b[0], b[1], s * 0.07]], nn);
    }
    for (const s of [-1, 1]) {
      m.mat(M_LAMP);
      for (const x of [-2.6, -1.6, -0.6, 0.4, 1.4]) { const z = s * (1.2 + 0.006); p3face(m, [[x - 0.4, 1.5, z], [x + 0.4, 1.5, z], [x + 0.4, 2.35, z], [x - 0.4, 2.35, z]], [0, 0, s]); }
      if (s > 0) { // front door with glass
        m.mat(M_GLASS);
        const g = (x, y) => [x, y, hwAt(x) + 0.006];
        p3face(m, [g(2.2, 0.95), g(2.95, 0.95), g(2.95, 2.1), g(2.2, 2.1)], [0, 0, 1]);
        m.mat(M_DARK);
        for (const x of [2.15, 3.0]) m.box(x - 0.025, 0.75, hwAt(x) + 0.002, x + 0.025, 2.15, hwAt(x) + 0.014);
        m.box(2.125, 2.15, hwAt(2.15) + 0.002, 3.025, 2.2, hwAt(3.0) + 0.014); m.box(2.125, 0.7, hwAt(2.15) + 0.002, 3.025, 0.75, hwAt(3.0) + 0.014);
      }
      m.mat(M_LENS).box(3.58, 0.85, s * 0.78 - 0.13, 3.6, 1.05, s * 0.78 + 0.13);
      m.mat(M_RED).box(-3.6, 0.9, s * 0.85 - 0.1, -3.58, 1.1, s * 0.85 + 0.1);
      p3wheelArch(m, 2.5, 0.4, 1.2, s); p3wheelArch(m, -1.3, 0.4, 1.2, s, 0.25);
    }
    m.mat(M_GLASS); p3face(m, [[-3.59, 1.6, -0.7], [-3.59, 1.6, 0.7], [-3.59, 2.5, 0.7], [-3.59, 2.5, -0.7]], [-1, 0, 0]);
    m.mat(M_DARK).box(3.52, 0.4, -1.1, 3.6, 0.65, 1.1, 0, 0.5, 0.8);
    m.box(-3.6, 0.4, -1.1, -3.52, 0.65, 1.1, 0, 0.5, 0.8);
    m.box(3.585, 0.8, -0.4, 3.597, 1.1, 0.4);
    return m;
  },

  // ------------------------------------------------------------ rolling stock (rail top = y 0)
  loco() { // diesel locomotive, length 18
    const m = new Mesh();
    p3bogie(m, -5.2, [-1.9, 0, 1.9]); p3bogie(m, 5.2, [-1.9, 0, 1.9]);
    m.mat(M_DARK).box(-8.6, 0.95, -1.3, 8.6, 1.12, 1.3, 4, 0.5, 0.8);
    for (const s of [-1, 1]) m.box(-3, 0.75, s * 1.0 - 0.45, 3, 1.0, s * 1.0 + 0.45, 4, 0.5, 0.8); // fuel tanks
    for (const e of [-1, 1]) m.box(e * 8.7 - 0.05, 0.8, -1.4, e * 8.7 + 0.05, 1.25, 1.4, 0, 0.55, 0.9);
    p3buffers(m, 18);
    // hood and cab
    m.mat(M_PAINT);
    m.box(-8.75, 1.12, -1.45, 5.2, 3.4, 1.45, 4, 0.6, 1);
    p3ext(m, [[5.2, 1.12], [8.75, 1.12], [8.75, 4.0], [8.6, 4.25], [5.2, 4.25]], -1.5, 1.5);
    m.mat(M_GLASS);
    for (const s of [-1, 1]) {
      p3face(m, [[8.756, 2.4, s * 0.08], [8.756, 2.4, s * 1.3], [8.756, 3.3, s * 1.3], [8.756, 3.3, s * 0.08]], [1, 0, 0]);
      const z = s * 1.506;
      p3face(m, [[6.0, 2.4, z], [8.3, 2.4, z], [8.3, 3.4, z], [6.0, 3.4, z]], [0, 0, s]);
    }
    m.mat(M_DARK).box(8.75, 3.45, -0.25, 8.93, 3.8, 0.25); // headlight housing
    m.mat(M_LENS).box(8.93, 3.47, -0.2, 9.0, 3.78, 0.2);
    m.mat(M_RED).box(-8.78, 3.0, -0.2, -8.75, 3.25, 0.2);
    m.mat(M_DARK).box(8.746, 1.4, -1.3, 8.756, 1.9, 1.3);
    // roof fans, hood louvres
    for (const x of [-6.2, -3.7, -1.2]) {
      m.mat(M_METAL).tube([[x, 3.4, 0], [x, 3.62, 0]], 0.85, 10, 2);
      m.mat(M_DARK).tube([[x, 3.625, 0], [x, 3.633, 0]], 0.62, 10, 2);
    }
    for (const s of [-1, 1]) {
      m.mat(M_DARK);
      for (const x of [-7.4, -5.9, -4.4, -2.9, -1.4, 0.1, 1.6, 3.1]) m.box(x - 0.45, 1.9, s > 0 ? 1.455 : -1.462, x + 0.45, 3.1, s > 0 ? 1.462 : -1.455);
      // walkway and handrails
      m.mat(M_METAL).box(-8.6, 1.28, s * 1.45 - 0.0 + (s > 0 ? 0 : -0.3), 5.2, 1.32, s * 1.45 + (s > 0 ? 0.3 : 0), 0, 0.7, 1);
      for (let k = 0; k <= 8; k++) m.bar([-8.5 + k * 1.7, 1.32, s * 1.72], [-8.5 + k * 1.7, 2.3, s * 1.72], 0.04);
      m.tube([[-8.5, 2.3, s * 1.72], [5.2, 2.3, s * 1.72]], 0.025, 5, 3);
      m.tube([[-8.5, 1.8, s * 1.72], [5.2, 1.8, s * 1.72]], 0.02, 5, 3);
      for (let k = 0; k < 3; k++) m.box(5.4 + k * 0.0 - 0.0, 0.5 + k * 0.28, s * 1.5 - 0.02 + (s > 0 ? 0.0 : -0.3), 5.9, 0.56 + k * 0.28, s * 1.5 + (s > 0 ? 0.3 : 0.02)); // cab steps
    }
    return m;
  },

  tank() { // tank wagon, length 12.5
    const m = new Mesh();
    p3bogie(m, -4.05, [-0.9, 0.9]); p3bogie(m, 4.05, [-0.9, 0.9]);
    p3frame(m, 12.5); p3buffers(m, 12.5);
    // tank with domed ends
    m.mat(M_TINT).tube([[-5.65, 2.6, 0], [-5.5, 2.6, 0], [-5.2, 2.6, 0], [5.2, 2.6, 0], [5.5, 2.6, 0], [5.65, 2.6, 0]], (k) => [0.7, 1.3, 1.5, 1.5, 1.3, 0.7][k], 12, 3);
    m.mat(M_DARK);
    for (const x of [-3.9, -1.3, 1.3, 3.9]) m.tube([[x, 2.6, 0], [x + 0.1, 2.6, 0]], 1.515, 12, 0);
    for (const x of [-4.05, 4.05]) m.box(x - 0.6, 1.1, -0.7, x + 0.6, 1.3, 0.7, 4, 0.5, 0.8); // saddles
    // dome and lid
    m.mat(M_TINT).tube([[0, 4.0, 0], [0, 4.45, 0]], 0.45, 8, 2);
    m.mat(M_METAL).tube([[0, 4.451, 0], [0, 4.48, 0]], 0.5, 8, 2);
    m.mat(M_DARK).tube([[0, 4.481, 0], [0, 4.5, 0]], 0.1, 6, 2);
    // ladder on the +z side at one end, and a top walkway
    m.mat(M_METAL);
    for (const x of [4.95, 5.35]) m.bar([x, 1.3, 1.62], [x, 3.7, 1.62], 0.05);
    for (let k = 0; k < 9; k++) m.bar([4.95, 1.5 + k * 0.28, 1.62], [5.35, 1.5 + k * 0.28, 1.62], 0.035);
    m.bar([-5.0, 4.2, 0], [5.0, 4.2, 0], 0.5, 0.03);
    for (const x of [-5.0, 0.0, 5.0]) m.bar([x, 4.0, 0], [x, 4.2, 0], 0.04);
    return m;
  },

  box() { // covered goods wagon, length 15
    const m = new Mesh();
    p3bogie(m, -5.3, [-0.9, 0.9]); p3bogie(m, 5.3, [-0.9, 0.9]);
    p3frame(m, 15); p3buffers(m, 15);
    const hx = 7.0, hw = 1.45, top = 4.15;
    m.mat(M_TINT).box(-hx, 1.3, -hw, hx, top, hw, 8, 0.6, 1);
    // ribs
    for (const s of [-1, 1]) for (let x = -6.6; x <= 6.61; x += 0.75) {
      if (abs(x) < 1.45) continue;
      m.box(x - 0.04, 1.35, s > 0 ? hw : -hw - 0.03, x + 0.04, top - 0.05, s > 0 ? hw + 0.03 : -hw, 4 | 8 | (s > 0 ? 16 : 32), 0.6, 1);
    }
    // sliding door, rail, handle
    for (const s of [-1, 1]) {
      const z0 = s > 0 ? hw : -hw - 0.07, z1 = s > 0 ? hw + 0.07 : -hw;
      m.mat(M_TINT).box(-1.2, 1.4, z0, 1.2, 4.0, z1, 16 * (s > 0) + 32 * (s < 0));
      m.mat(M_DARK).box(-1.25, 1.35, z0, 1.25, 1.4, z1 + (s > 0 ? 0.01 : -0.01), 4 | (s > 0 ? 16 : 32)); m.box(-1.25, 4.0, z0, 3.6, 4.07, z1 + (s > 0 ? 0.01 : -0.01), 4 | (s > 0 ? 16 : 32));
      m.mat(M_METAL).box(0.9, 2.3, s > 0 ? z1 : z0 - 0.04, 1.0, 2.9, s > 0 ? z1 + 0.04 : z0, 0);
      m.mat(M_DARK).box(-0.02, 1.4, s > 0 ? z1 : z0, 0.02, 4.0, s > 0 ? z1 + 0.012 : z0 - 0.012, 4 | 8 | (s > 0 ? 16 : 32));
    }
    // curved roof and filled end caps
    const pts = []; for (let k = 0; k <= 8; k++) { const z = -1.5 + k * 0.375; pts.push([z, top + 0.45 * (1 - (z / 1.5) * (z / 1.5))]); }
    m.mat(M_METAL);
    for (let k = 0; k < 8; k++) {
      const a = pts[k], b = pts[k + 1], hn = [0, (b[0] - a[0] > 0 ? 1 : 1), 0];
      p3face(m, [[-hx - 0.05, a[1] + 0.012, a[0]], [hx + 0.05, a[1] + 0.012, a[0]], [hx + 0.05, b[1] + 0.012, b[0]], [-hx - 0.05, b[1] + 0.012, b[0]]], hn);
      p3face(m, [[-hx - 0.05, a[1], a[0]], [hx + 0.05, a[1], a[0]], [hx + 0.05, b[1], b[0]], [-hx - 0.05, b[1], b[0]]], [0, -1, 0]);
    }
    m.mat(M_TINT);
    for (const e of [-1, 1]) {
      const x = e * hx;
      for (let k = 0; k < 8; k++) m.tri(m.v(x, top, 0), m.v(x, pts[k][1], pts[k][0]), m.v(x, pts[k + 1][1], pts[k + 1][0]));
    }
    m.mat(M_METAL);
    for (const z of [-0.6, 0.6]) m.bar([-hx + 0.3, top + 0.45, z * 0.2], [hx - 0.3, top + 0.465, z * 0.2], 0.03, 0.02);
    return m;
  },

  gondola() { // open wagon with coal, length 13.5
    const m = new Mesh();
    p3bogie(m, -4.55, [-0.9, 0.9]); p3bogie(m, 4.55, [-0.9, 0.9]);
    p3frame(m, 13.5); p3buffers(m, 13.5);
    const hx = 6.5, hw = 1.45, top = 3.3;
    m.mat(M_TINT);
    for (const s of [-1, 1]) m.box(-hx, 1.3, s * hw - 0.03, hx, top, s * hw + 0.03, 0, 0.6, 1);
    for (const e of [-1, 1]) m.box(e * hx - 0.03, 1.3, -hw, e * hx + 0.03, top, hw, 0, 0.6, 1);
    m.box(-hx, 1.25, -hw, hx, 1.3, hw, 8, 0.5, 0.7);
    for (const s of [-1, 1]) for (let x = -6.3; x <= 6.31; x += 0.9) m.box(x - 0.04, 1.32, s > 0 ? hw + 0.03 : -hw - 0.07, x + 0.04, top - 0.02, s > 0 ? hw + 0.07 : -hw - 0.03, 4 | 16 * (s > 0) | 32 * (s < 0) | 0, 0.7, 1);
    for (const s of [-1, 1]) m.bar([-hx - 0.04, top + 0.03, s * hw], [hx + 0.04, top + 0.03, s * hw], 0.12, 0.05); // top angle
    // heaped coal
    rseed(88); m.mat(M_DARK);
    const NX = 28, NZ = 6, g = [];
    for (let i = 0; i <= NX; i++) {
      const row = [];
      for (let j = 0; j <= NZ; j++) {
        const u = i / NX * 2 - 1, w = j / NZ * 2 - 1, hh = (1 - u * u * u * u) * (1 - w * w);
        const y = 2.45 + 1.15 * hh + (i && i < NX && j && j < NZ ? rr(-0.14, 0.14) : 0) + 0.08 * sin(u * 9 + w * 3);
        row.push(m.v(u * (hx - 0.1), y, w * (hw - 0.08), 0.75 + 0.25 * hh));
      }
      g.push(row);
    }
    for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) m.quad(g[i][j], g[i][j + 1], g[i + 1][j + 1], g[i + 1][j]);
    return m;
  },

  flat() { // flat wagon with a 40 ft container, length 14
    const m = new Mesh();
    p3bogie(m, -4.8, [-0.9, 0.9]); p3bogie(m, 4.8, [-0.9, 0.9]);
    p3frame(m, 14); p3buffers(m, 14);
    m.mat(M_DARK).box(-6.75, 1.3, -1.45, 6.75, 1.35, 1.45, 4, 0.6, 0.9);
    // container: core, corrugated sides, doors at the -x end
    const hx = 6.1, hw = 1.22, y0 = 1.36, y1 = 3.96;
    m.mat(M_TINT).box(-hx, y0, -hw + 0.04, hx, y1, hw - 0.04, 4, 0.7, 1);
    const NT = 80, p = 2 * hx / NT;
    for (const s of [-1, 1]) for (let k = 0; k < NT * 2; k++) {
      const xa = -hx + k * p / 2, xb = xa + p / 2, za = s * (hw - ((k & 1) ? 0.04 : 0)), zb = s * (hw - ((k & 1) ? 0 : 0.04));
      p3face(m, [[xa, y0, za], [xb, y0, zb], [xb, y1, zb], [xa, y1, za]], [0, 0, s], [0.7, 0.7, 1, 1]);
    }
    for (const e of [-1, 1]) for (const s of [-1, 1]) for (const t of [0, 1]) m.mat(M_DARK).box(e * hx - (e > 0 ? 0.16 : 0), t ? y1 - 0.16 : y0, s * hw - (s > 0 ? 0.16 : 0), e * hx + (e < 0 ? 0.16 : 0), t ? y1 : y0 + 0.16, s * hw + (s < 0 ? 0.16 : 0), 0);
    m.mat(M_METAL);
    for (const z of [-0.85, -0.3, 0.3, 0.85]) m.tube([[-hx - 0.04, y0 + 0.14, z], [-hx - 0.04, y1 - 0.14, z]], 0.025, 6, 3);
    for (const z of [-0.85, -0.3, 0.3, 0.85]) for (const y of [y0 + 0.2, y1 - 0.2]) m.box(-hx - 0.06, y - 0.04, z - 0.07, -hx - 0.02, y + 0.04, z + 0.07, 0);
    m.mat(M_DARK).box(-hx - 0.012, y0 + 0.16, -0.012, -hx, y1 - 0.16, 0.012);
    return m;
  },

  // ------------------------------------------------------------ buildings
  cottage(v = 0) {
    rseed(400 + v);
    const [W, D, eave, rise, sg, xd] = [[7, 6, 3.25, 2.2, 1, 2.6], [7.4, 5.6, 3.1, 2.6, -1, 2.65], [6.6, 6.4, 3.3, 2.0, 1, 2.4]][v % 3];
    const FX = [[-2.6, -0.9, 0.8], [-0.8, 0.9, 2.6], [-2.4, -0.8, 0.8]][v % 3];
    const m = new Mesh(), Wn = [], FL = 0.5, wy0 = 1.4, wh = 1.2, ww = 1.0, rec = 0.12;
    m.mat(M_CONC).box(-W / 2 - 0.05, 0, -D / 2 - 0.05, W / 2 + 0.05, FL, D / 2 + 0.05, 4, 0.55, 1);
    const walls = [
      { yaw: 0, hx: W / 2, zf: D / 2, wx: FX, door: xd },
      { yaw: PI / 2, hx: D / 2, zf: W / 2, wx: [1.5, -1.5] },
      { yaw: PI, hx: W / 2, zf: D / 2, wx: [] },
      { yaw: -PI / 2, hx: D / 2, zf: W / 2, wx: [1.5, -1.5] },
    ];
    for (const w of walls) {
      m.at(0, 0, 0, w.yaw).mat(M_BARK);
      const holes = w.wx.map((x) => [x - ww / 2, wy0, x + ww / 2, wy0 + wh]);
      p3wall(m, -w.hx, w.hx, FL, eave, w.zf, holes, rec);
      // log ridges, broken around frames and the door
      const blocks = w.wx.map((x) => [x - ww / 2 - 0.2, x + ww / 2 + 0.2, wy0 - 0.15, wy0 + wh + 0.3]);
      if (w.door !== undefined) blocks.push([w.door - 0.7, w.door + 0.7, 0, 2.8]);
      for (let y = FL + 0.14; y < eave - 0.1; y += 0.28) {
        let segs = [[-w.hx, w.hx]];
        for (const b of blocks) if (y + 0.05 > b[2] && y - 0.05 < b[3]) segs = segs.flatMap(([a, c]) => (b[1] <= a || b[0] >= c ? [[a, c]] : [[a, min(c, b[0])], [max(a, b[1]), c]].filter(([p, q]) => q - p > 0.05)));
        for (const [a, c] of segs) m.box(a, y - 0.05, w.zf, c, y + 0.05, w.zf + 0.04, 16, 0.8, 1);
      }
      // nalichniki
      m.mat(M_TINT);
      for (const x of w.wx) {
        const x0 = x - ww / 2, x1 = x + ww / 2, fw = 0.13;
        m.box(x0 - fw, wy0, w.zf, x0, wy0 + wh, w.zf + 0.06, 16, 0.9, 1); m.box(x1, wy0, w.zf, x1 + fw, wy0 + wh, w.zf + 0.06, 16, 0.9, 1);
        m.box(x0 - fw, wy0 + wh, w.zf, x1 + fw, wy0 + wh + 0.18, w.zf + 0.06, 16 | 4, 1, 1);
        m.box(x0 - fw - 0.04, wy0 + wh + 0.18, w.zf, x1 + fw + 0.04, wy0 + wh + 0.24, w.zf + 0.1, 16, 1, 1);
        m.box(x0 - fw - 0.04, wy0 - 0.1, w.zf, x1 + fw + 0.04, wy0, w.zf + 0.1, 16, 1, 1);
        const [px, pz] = rotY(x, w.zf - rec, w.yaw);
        Wn.push([px, wy0 + wh / 2, pz, w.yaw, ww, wh]);
      }
      if (w.door !== undefined) {
        const d = w.door;
        m.mat(M_TINT).box(d - 0.5, FL, w.zf, d + 0.5, 2.55, w.zf + 0.05, 16, 0.9, 1);
        m.box(d - 0.62, FL, w.zf, d - 0.5, 2.55, w.zf + 0.07, 16, 0.9, 1); m.box(d + 0.5, FL, w.zf, d + 0.62, 2.55, w.zf + 0.07, 16, 0.9, 1);
        m.box(d - 0.62, 2.55, w.zf, d + 0.62, 2.75, w.zf + 0.07, 16 | 4, 1, 1);
        m.mat(M_METAL).box(d + (sg > 0 ? -0.4 : 0.35), 1.4, w.zf + 0.05, d + (sg > 0 ? -0.35 : 0.4), 1.55, w.zf + 0.08, 0);
        // porch with steps and a shed roof
        const pw = 0.82, pz = w.zf;
        m.mat(M_CONC).box(d - pw, 0, pz, d + pw, 0.46, pz + 1.3, 16, 0.55, 1);
        m.mat(M_BARK).box(d - pw - 0.02, 0.46, pz, d + pw + 0.02, 0.5, pz + 1.34, 16);
        m.box(d - 0.7, 0, pz + 1.34, d + 0.7, 0.33, pz + 1.64, 4 | 16, 0.55, 1); m.box(d - 0.7, 0, pz + 1.64, d + 0.7, 0.17, pz + 1.94, 4 | 16, 0.55, 1);
        for (const s of [-1, 1]) m.bar([d + s * (pw - 0.04), 0.5, pz + 1.25], [d + s * (pw - 0.04), 2.85, pz + 1.25], 0.1);
        m.mat(M_METAL).bar([d, 3.0, pz], [d, 2.78, pz + 1.5], pw * 2 + 0.3, 0.04);
      }
    }
    // roof in its own frame: ridge along local x
    m.at(0, 0, 0, v === 2 ? PI / 2 : 0);
    const len = v === 2 ? D : W, span = v === 2 ? W : D, d2 = span / 2, hs = d2 + 0.4, sl = rise / d2, yE = (z) => eave + rise - sl * abs(z);
    m.mat(M_BARK);
    for (const e of [-1, 1]) {
      const x = e * len / 2;
      m.tri(m.v(x, eave, -d2), m.v(x, eave, d2), m.v(x, eave + rise, 0));
      for (let yb = eave + 0.28; yb < eave + rise - 0.2; yb += 0.3) {
        const hf = d2 * (1 - (yb - eave) / rise) - 0.03, xo = x + e * 0.02;
        m.box(min(xo, xo + e * 0.03), yb, -hf, max(xo, xo + e * 0.03), yb + 0.05, hf, 0, 1, 1);
      }
    }
    m.mat(M_METAL);
    for (const s of [-1, 1]) {
      m.bar([0, eave + rise + 0.012, 0], [0, yE(hs) + 0.012, s * hs], len + 0.7, 0.05);
      for (let x = -len / 2 - 0.3; x <= len / 2 + 0.31; x += 0.4) m.bar([x, eave + rise + 0.055, 0], [x, yE(hs) + 0.055, s * hs], 0.035, 0.03);
    }
    m.bar([-len / 2 - 0.35, eave + rise + 0.09, 0], [len / 2 + 0.35, eave + rise + 0.09, 0], 0.3, 0.06);
    // chimney, brick with a concrete cap
    const cx = (v === 1 ? 1 : -1) * len * 0.22;
    m.mat(M_BRICK).box(cx - 0.3, eave + rise - 0.5, -0.3, cx + 0.3, eave + rise + 0.95, 0.3, 4, 1, 1);
    m.mat(M_CONC).box(cx - 0.38, eave + rise + 0.95, -0.38, cx + 0.38, eave + rise + 1.03, 0.38, 4, 1, 1);
    m.at(0, 0, 0, 0);
    return { m, W: Wn };
  },

  pavilion(w = 10, d = 7) { // one-storey shop pavilion, height 3.6
    const m = new Mesh().mat(M_CONC), H = 3.6, rec = 0.15, hx = w / 2, hd = d / 2;
    const main = [-hx + 0.6, 0.4, hx - 2.2, 2.9], door = [hx - 1.9, 0.05, hx - 0.9, 2.2];
    p3wall(m, -hx, hx, 0, H, hd, [main, door], rec);
    m.at(0, 0, 0, PI / 2); p3wall(m, -hd, hd, 0, H, hx); m.at(0, 0, 0, PI); p3wall(m, -hx, hx, 0, H, hd); m.at(0, 0, 0, -PI / 2); p3wall(m, -hd, hd, 0, H, hx);
    m.at(0, 0, 0, 0);
    m.box(-hx + 0.02, 3.25, -hd + 0.02, hx - 0.02, 3.35, hd - 0.02, 0, 1, 1); // roof slab behind the parapet
    m.box(-hx + 0.1, 0, -hd + 0.1, hx - 0.1, 0.05, hd - 0.1, 4 | 1 | 2 | 16 | 32, 0.6, 0.6); // floor
    p3face(m, [[-hx + 0.05, 0.05, -hd + 0.2], [hx - 0.05, 0.05, -hd + 0.2], [hx - 0.05, 3.3, -hd + 0.2], [-hx + 0.05, 3.3, -hd + 0.2]], [0, 0, 1], 0.8);
    m.mat(M_DARK).box(-hx, 3.0, hd + 0.006, hx, 3.55, hd + 0.02, 0, 1, 1); // sign fascia
    // metal frame and mullions inside the recess
    m.mat(M_METAL);
    const zb = hd - rec, f = 0.05;
    const frame = (h) => {
      m.box(h[0], h[1], zb + 0.01, h[0] + f, h[3], zb + 0.07, 0, 1, 1); m.box(h[2] - f, h[1], zb + 0.01, h[2], h[3], zb + 0.07, 0, 1, 1);
      m.box(h[0] + f, h[1], zb + 0.01, h[2] - f, h[1] + f, zb + 0.07, 0, 1, 1); m.box(h[0] + f, h[3] - f, zb + 0.01, h[2] - f, h[3], zb + 0.07, 0, 1, 1);
    };
    frame(main); frame(door);
    const n = max(1, Math.round((main[2] - main[0]) / 1.5));
    for (let k = 1; k < n; k++) { const x = main[0] + (main[2] - main[0]) * k / n; m.box(x - 0.03, main[1], zb + 0.01, x + 0.03, main[3], zb + 0.07, 0, 1, 1); }
    m.box(main[0] + f, 2.2, zb + 0.01, main[2] - f, 2.25, zb + 0.07, 0, 1, 1);
    m.box(door[2] - 0.2, 1.0, zb + 0.07, door[2] - 0.17, 1.15, zb + 0.14, 0, 1, 1); // door handle
    return m;
  },

  kiosk() { // 24/7 kiosk, 4.5 x 3 x 2.8
    const m = new Mesh().mat(M_TINT), hx = 2.25, hd = 1.5, H = 2.72, rec = 0.1;
    const disp = [-2.0, 0.7, 1.0, 2.3], hatch = [1.4, 0.925, 1.8, 1.275];
    p3wall(m, -hx, hx, 0, H, hd, [disp, hatch], rec);
    m.at(0, 0, 0, PI / 2); p3wall(m, -hd, hd, 0, H, hx); m.at(0, 0, 0, PI); p3wall(m, -hx, hx, 0, H, hd); m.at(0, 0, 0, -PI / 2); p3wall(m, -hd, hd, 0, H, hx);
    m.at(0, 0, 0, 0);
    m.mat(M_METAL).box(-hx - 0.2, H, -hd - 0.2, hx + 0.2, 2.8, hd + 0.2, 4, 1, 1); // roof slab
    m.mat(M_CONC).box(-hx + 0.1, 0, -hd + 0.1, hx - 0.1, 0.1, hd - 0.1, 4 | 1 | 2 | 16 | 32, 0.6, 0.6);
    p3face(m, [[-hx + 0.05, 0.1, -1.3], [hx - 0.05, 0.1, -1.3], [hx - 0.05, H - 0.02, -1.3], [-hx + 0.05, H - 0.02, -1.3]], [0, 0, 1], 0.8);
    m.mat(M_DARK).box(-hx, 2.35, hd + 0.006, hx, 2.75, hd + 0.02, 0, 1, 1); // sign fascia
    m.mat(M_METAL);
    const zb = hd - rec, f = 0.04;
    m.box(disp[0], disp[1], zb + 0.01, disp[0] + f, disp[3], zb + 0.06, 0, 1, 1); m.box(disp[2] - f, disp[1], zb + 0.01, disp[2], disp[3], zb + 0.06, 0, 1, 1);
    m.box(disp[0] + f, disp[1], zb + 0.01, disp[2] - f, disp[1] + f, zb + 0.06, 0, 1, 1); m.box(disp[0] + f, disp[3] - f, zb + 0.01, disp[2] - f, disp[3], zb + 0.06, 0, 1, 1);
    m.box(-0.5 - 0.025, disp[1] + f, zb + 0.01, -0.5 + 0.025, disp[3] - f, zb + 0.06, 0, 1, 1);
    m.box(hatch[0], hatch[1], zb, hatch[2], hatch[3], zb + 0.012, 0, 1, 1); // shutter plate
    m.box(1.55, 1.07, zb + 0.012, 1.65, 1.1, zb + 0.03, 0, 1, 1); // shutter handle
    // side door on +x
    m.at(0, 0, 0, PI / 2);
    m.mat(M_METAL).box(-0.4, 0.1, hx + 0.004, 0.4, 2.1, hx + 0.03, 16, 0.8, 1);
    m.mat(M_DARK).box(-0.46, 0.1, hx + 0.004, -0.4, 2.14, hx + 0.045, 16); m.box(0.4, 0.1, hx + 0.004, 0.46, 2.14, hx + 0.045, 16); m.box(-0.46, 2.1, hx + 0.004, 0.46, 2.14, hx + 0.045, 16 | 4);
    m.box(0.25, 1.0, hx + 0.03, 0.3, 1.2, hx + 0.06, 0);
    m.at(0, 0, 0, 0);
    return m;
  },

  // ------------------------------------------------------------ tree
  spruce(lo = false) { // shade = sway weight (0 trunk, 1 tips), as in meshTree
    rseed(300); const m = new Mesh().mat(M_BARK), HT = 9;
    const tw = (y) => clamp(y / HT, 0, 1) * 0.15; // trunk weight
    const tp = []; for (let k = 0; k <= 7; k++) tp.push([0, -0.1 + (HT - 0.1) * k / 7, 0]);
    m.tube(tp, (k) => 0.24 * (1 - k / 7) + 0.02, 6, 2, (k) => tw(tp[k][1]));
    const NW = 20;
    for (let w = 0; w < NW; w++) {
      const t = w / (NW - 1), y = 1.1 + 7.6 * t, nb = max(2, Math.round(mix(7, 3, t) / (lo ? 2 : 1))), a0 = w * 2.4 + rr(0, 1);
      const Lb = 2.3 * Math.pow(1 - t, 0.85) + 0.3, w0 = tw(y);
      for (let b = 0; b < nb; b++) {
        const an = a0 + b / nb * TAU + rr(-0.25, 0.25), L = Lb * rr(0.85, 1.1), dx = cos(an), dz = sin(an), px = -dz, pz = dx;
        const drop = L * (0.3 - 0.18 * t), P = (f, dy) => [dx * L * f, y + dy, dz * L * f];
        const pts = [[0, y, 0], P(0.5, L * 0.03), P(1, -drop)];
        const wt = (k) => mix(w0, 1, k / 2);
        m.mat(M_BARK).tube(pts, (k) => [0.045, 0.03, 0.012][k] * (1.3 - t * 0.6), 4, 0, wt);
        m.mat(M_GRN);
        const nt = lo ? 4 : 6;
        for (let q = 0; q < nt; q++) {
          const f = [0.35, 0.35, 0.65, 0.65, 0.95, 0.95][q] , sd = q & 1 ? 1 : -1, lt = (0.35 + 0.3 * (1 - t)) * (f < 0.9 ? 1 : 0.8);
          const bf = f <= 0.5 ? mix(0, L * 0.03, f / 0.5) : mix(L * 0.03, -drop, (f - 0.5) / 0.5);
          const o = [dx * L * f, y + bf, dz * L * f];
          const dir = [dx * 0.7 + px * sd * 0.6, -0.3, dz * 0.7 + pz * sd * 0.6], dl = hypot(...dir);
          const e = [o[0] + dir[0] / dl * lt, o[1] + dir[1] / dl * lt, o[2] + dir[2] / dl * lt];
          m.tube([o, e], (k) => [0.035, 0.006][k], 3, 0, (k) => mix(mix(w0, 1, f), 1, k));
        }
        // needle card hanging under the branch
        const c0 = P(0.2, L * 0.02 - 0.03), c1 = P(1.03, -drop - 0.12), wd = 0.2 * L + 0.1, cm = P(0.55, L * 0.03 - 0.1);
        m.q4(c0, [cm[0] + px * wd, cm[1], cm[2] + pz * wd], c1, [cm[0] - px * wd, cm[1], cm[2] - pz * wd], [mix(w0, 1, 0.2), 0.7, 1, 0.7]);
      }
    }
    return m;
  },
};
