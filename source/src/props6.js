// ============================================================================
// props6: civic and commercial buildings, park furniture, lamps and playground (plain script, concatenated after props5.js)
// ============================================================================

// convex polygon of (z, y) points extruded along x from x0 to x1 (outward faces, flat caps)
function p6prism(m, poly, x0, x1, ao = 1) {
  const n = poly.length;
  let cz = 0, cy = 0; for (const p of poly) { cz += p[0] / n; cy += p[1] / n; }
  for (let k = 0; k < n; k++) {
    const a = poly[k], b = poly[(k + 1) % n];
    p5face(m, [[x0, a[1], a[0]], [x1, a[1], a[0]], [x1, b[1], b[0]], [x0, b[1], b[0]]], [0, (a[1] + b[1]) / 2 - cy, (a[0] + b[0]) / 2 - cz], ao);
  }
  for (const [x, s] of [[x0, -1], [x1, 1]]) for (let k = 1; k < n - 1; k++) {
    p5face(m, [[x, poly[0][1], poly[0][0]], [x, poly[k][1], poly[k][0]], [x, poly[k + 1][1], poly[k + 1][0]]], [s, 0, 0], ao);
  }
}
// thin open-ended rod between two points (4 sides by default)
function p6rod(m, a, b, r, sides = 4, ao = 1) { m.tube([a, b], r, sides, 0, ao === 1 ? null : () => ao); }
// wall plane facing +z at z = zf, x in [x0, x1], y in [y0, y1], with window holes (merged into row bands, so few triangles).
// win: [cx, cy, w, h] panes appended to Wn like p5wall; holes: [x0, y0, x1, y1] without a pane; edges: bit mask of reveal faces (1 left, 2 right, 4 sill, 8 head)
function p6wall(m, Wn, s) {
  const ox = s.ox || 0, oz = s.oz || 0, yaw = s.yaw || 0, rec = s.rec === undefined ? 0.12 : s.rec, ao = s.ao || p3ao, zf = s.zf, edges = s.edges === undefined ? 15 : s.edges;
  const win = s.win || [];
  const hs = win.map(([cx, cy, w, h]) => [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]).concat(s.holes || []);
  m.at(ox, 0, oz, yaw);
  const ys = [s.y0, s.y1];
  for (const h of hs) ys.push(h[1], h[3]);
  ys.sort((a, b) => a - b);
  for (let j = 0; j < ys.length - 1; j++) {
    const ya = ys[j], yb = ys[j + 1];
    if (yb - ya < 1e-6) continue;
    const cov = hs.filter((h) => h[1] <= ya + 1e-6 && h[3] >= yb - 1e-6).sort((a, b) => a[0] - b[0]);
    const quad = (xa, xb) => m.q4([xa, ya, zf], [xb, ya, zf], [xb, yb, zf], [xa, yb, zf], [ao(ya), ao(ya), ao(yb), ao(yb)]);
    let x = s.x0;
    for (const h of cov) { if (h[0] > x + 1e-6) quad(x, h[0]); x = max(x, h[2]); }
    if (s.x1 > x + 1e-6) quad(x, s.x1);
  }
  const z0 = zf - rec, z1 = zf, q = 0.6;
  for (const [a, b, c, d] of hs) {
    if (edges & 1) m.q4([a, b, z1], [a, b, z0], [a, d, z0], [a, d, z1], q);
    if (edges & 2) m.q4([c, b, z0], [c, b, z1], [c, d, z1], [c, d, z0], q);
    if (edges & 4) m.q4([a, b, z0], [c, b, z0], [c, b, z1], [a, b, z1], q);
    if (edges & 8) m.q4([a, d, z1], [c, d, z1], [c, d, z0], [a, d, z0], q);
  }
  if (s.after) s.after();
  m.at(0, 0, 0, 0);
  for (const [cx, cy, w, h] of win) { const [px, pz] = rotY(cx, zf - rec, yaw); Wn.push([px + ox, cy, pz + oz, yaw, w, h]); }
}
// four parapet walls of thickness t from y0 to y1 around the rectangle (x0, z0)-(x1, z1); skip: faces of the front (+z) wall not wanted as in Mesh.box
function p6parapet(m, x0, z0, x1, z1, y0, y1, t = 0.2) {
  m.box(x0, y0, z0, x1, y1, z0 + t, 4);
  m.box(x0, y0, z1 - t, x1, y1, z1, 4);
  m.box(x0, y0, z0 + t, x0 + t, y1, z1 - t, 4);
  m.box(x1 - t, y0, z0 + t, x1, y1, z1 - t, 4);
}
// dark door panel recessed in a hole of the front wall
function p6door(m, x0, y0, x1, y1, z, mat = M_DARK) { m.mat(mat); p5face(m, [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], [0, 0, 1], 0.4); }

// ---- helpers for vehicles, animals, people and trees (appended pass)
// ring of a loft along z: ellipse (rx, ry) in x/y centred at (cx, cy) at depth z
const p6Z = (z, cy, rx, ry, cx = 0, ao = 1) => ({ z, cy, rx, ry, cx, ao });
// smooth loft along +z through the rings (outward faces, fan caps)
function p6zloft(m, rings, sides = 8, capLo = true, capHi = true) {
  const idx = rings.map((r) => {
    const a = [];
    for (let s = 0; s < sides; s++) { const t = s / sides * TAU; a.push(m.v(r.cx + cos(t) * r.rx, r.cy + sin(t) * r.ry, r.z, r.ao)); }
    return a;
  });
  for (let k = 0; k < idx.length - 1; k++) for (let s = 0; s < sides; s++) { const s2 = (s + 1) % sides; m.quad(idx[k][s], idx[k][s2], idx[k + 1][s2], idx[k + 1][s]); }
  const cap = (r, ring, lo) => {
    const c = m.v(r.cx, r.cy, r.z, r.ao), q = ring.map((v) => m.dup(v));
    for (let s = 0; s < sides; s++) { const s2 = (s + 1) % sides; if (lo) m.tri(q[s2], q[s], c); else m.tri(q[s], q[s2], c); }
  };
  if (capLo) cap(rings[0], idx[0], true);
  if (capHi) cap(rings[rings.length - 1], idx[idx.length - 1], false);
}
// wheel with its axis along z: tyre (dark tube from z0 to z1, capped at z1) and a metal hub just proud of z1
function p6wheel(m, x, y, z0, z1, r, sides, hubR, hubSides, hubT = 0.012) {
  m.mat(M_DARK).tube([[x, y, z0], [x, y, z1]], r, sides, 2);
  m.mat(M_METAL).tube([[x, y, z1 + (z1 > z0 ? 0.001 : -0.001)], [x, y, z1 + (z1 > z0 ? hubT : -hubT)]], hubR, hubSides, 2);
}
// small pyramid (ear) with a square foot of half size r from y0 to the tip at y1
function p6ear(m, cx, cz, y0, y1, r) { p5frus(m, cx, cz, y0, r, r * 0.7, y1, 0.004, 0.004, 0.8, 1, false); }
// sway weight of a tree vertex: height and distance from the trunk axis
const p6sway = (y, r, H, R) => clamp(y / H, 0, 1) * 0.5 + clamp(r / R, 0, 1) * 0.5;
// drooping cone skirt: apex at y1 over the axis, rim ring at y0 of radius R, and a dished underside; shade = sway weight
function p6cone(m, y0, R, y1, sides, rot, H, Rmax, under = true) {
  const wa = p6sway(y1, 0, H, Rmax), wr = p6sway(y0, R, H, Rmax), wc = p6sway(y0 + 0.4, 0, H, Rmax), ring = [];
  for (let s = 0; s <= sides; s++) { const a = rot + s / sides * TAU; ring.push([cos(a) * R, y0, sin(a) * R]); }
  for (let s = 0; s < sides; s++) {
    const a = ring[s], b = ring[s + 1];
    p5face(m, [[0, y1, 0], a, b], [(a[0] + b[0]) / 2, 0.6 * R, (a[2] + b[2]) / 2], [wa, wr, wr]);
    if (under) p5face(m, [a, b, [0, y0 + 0.4, 0]], [0, -1, 0], [wr, wr, wc]);
  }
}
// person parts: head ball (skin, M_CONC) and an arm of two tubes ending in a small skin hand
function p6head(m, x, y, z, r = 0.095, sides = 8, n = 4) { m.mat(M_CONC); p2ball(m, x, y, z, r, n, sides, 1.1); }
function p6arm(m, a, b, c, sleeve, r = 0.054, hand = 0.045) {
  m.mat(sleeve); m.tube([a, b], r, 6, 3); m.tube([b, c], r * 0.95, 6, 3);
  m.mat(M_CONC); p2ball(m, c[0], c[1] - 0.02, c[2], hand, 2, 6);
}

const PROPS6 = {
  admin() { // three-storey administration 48 x 16 x 11 m (x +-24, z +-8), front +z; {m, W, flag}; flag = (0.07, 16.7, 0) top of the pole where the cloth's pole edge starts (cloth hangs to +x); portico of 6 columns to z 13 (steps), pediment apex y 11.1; windows 1.6 x 2.0 every 3 m, floors y 1.0 / 4.6 / 8.2
    const m = new Mesh(), Wn = [], ao = (y) => mix(0.55, 1, sstep(0, 3, y));
    const xs = []; for (let i = 0; i < 16; i++) xs.push(-22.5 + 3 * i);
    const win = (front) => {
      const w = [];
      for (const y0 of [1.0, 4.6, 8.2]) for (const x of xs) {
        if (front && abs(x) < 3 && y0 < 2) continue;
        if (front && y0 > 8 && abs(x) < 8) continue;
        w.push([x, y0 + 1.0, 1.6, 2.0]);
      }
      return w;
    };
    m.mat(M_CONC); m.box(-24, 0, -8, 24, 10.6, 8, 4 | 16 | 32, 0.6, 1);
    p6wall(m, Wn, { yaw: 0, x0: -24, x1: 24, zf: 8, y0: 0, y1: 10.6, ao, win: win(true), holes: [[-1.4, 0, 1.4, 3.6]], after: () => { p6door(m, -1.4, 0, 1.4, 3.6, 7.7); m.mat(M_CONC); } });
    p6wall(m, Wn, { yaw: PI, x0: -24, x1: 24, zf: 8, y0: 0, y1: 10.6, ao, win: win(false) });
    // brick plinth in two parts, open at the door
    m.mat(M_BRICK);
    m.box(-24.1, 0, -8.1, -1.5, 0.9, 8.1, 4, 0.6, 1); m.box(1.5, 0, -8.1, 24.1, 0.9, 8.1, 4, 0.6, 1);
    m.mat(M_CONC);
    m.box(-24.3, 10.6, -8.3, 24.3, 11.0, 8.3, 4, 1, 1);
    p6parapet(m, -24.2, -8.2, 24.2, 8.2, 11.0, 11.4, 0.2);
    // portico: podium, steps, columns, entablature, pediment
    m.box(-9, 0, 8, 9, 1.2, 11, 4, 0.6, 1);
    m.box(-9, 0, 11, 9, 0.8, 12, 4, 0.6, 1);
    m.box(-10, 0, 11, 10, 0.8, 12, 4 | 1 | 2, 0.6, 1);
    m.box(-9.5, 0, 12, 9.5, 0.4, 13, 4, 0.6, 1);
    for (let k = 0; k < 6; k++) {
      const x = -7.5 + 3 * k, z = 10.3;
      m.box(x - 0.6, 1.2, z - 0.6, x + 0.6, 1.5, z + 0.6, 4, 0.7, 1);
      m.tube([[x, 1.5, z], [x, 7.7, z]], (j) => [0.45, 0.4][j], 12, 0, (j) => [0.75, 1][j]);
      m.box(x - 0.62, 7.7, z - 0.62, x + 0.62, 8.0, z + 0.62, 4, 1, 1);
    }
    m.box(-8.8, 8.0, 8, 8.8, 9.0, 11.1, 4 | 16, 1, 1);
    m.box(-9.1, 9.0, 8, 9.1, 9.25, 11.4, 4 | 16, 1, 1);
    p3ext(m, [[-9, 9.25], [9, 9.25], [0, 11.1]], 8, 11.4, () => 1);
    // flagpole on the roof centre
    m.mat(M_METAL);
    m.tube([[0, 11.0, 0], [0, 17.0, 0]], 0.07, 6, 3);
    p2ball(m, 0, 17.12, 0, 0.13, 2, 6);
    m.box(-0.2, 11.0, -0.2, 0.2, 11.3, 0.2, 4);
    return { m, W: Wn, flag: [0.07, 16.7, 0] };
  },

  flag() { // flag cloth 2.4 x 1.6 m, pole edge at x 0, top edge at y 0, hangs down to y -1.6, z 0, no thickness; upper half M_CONC, lower half M_TINT, 8 x 4 quads
    const m = new Mesh(), nx = 8, ny = 4;
    for (let j = 0; j < ny; j++) {
      m.mat(j < ny / 2 ? M_CONC : M_TINT);
      for (let i = 0; i < nx; i++) {
        const x0 = i * 2.4 / nx, x1 = (i + 1) * 2.4 / nx, y0 = -j * 1.6 / ny, y1 = -(j + 1) * 1.6 / ny;
        m.q4([x0, y1, 0], [x1, y1, 0], [x1, y0, 0], [x0, y0, 0], 1);
      }
    }
    return m;
  },

  monument() { // monument: granite base 5 x 5 (0.35) and 3.8 x 3.8 (0.35), plinth 2.2 x 2.2 x 3.6 to y 4.3, bronze figure 3.4 m (head top y 7.7, raised hand to y 7.9) facing +z; {m, top}; top = (0, 7.7, 0) top of the head
    const m = new Mesh();
    m.mat(M_DARK); m.box(-2.5, 0, -2.5, 2.5, 0.35, 2.5, 4, 0.6, 1); m.box(-1.9, 0.35, -1.9, 1.9, 0.7, 1.9, 4, 0.7, 1);
    m.mat(M_CONC); m.box(-1.1, 0.7, -1.1, 1.1, 4.3, 1.1, 4, 0.7, 1);
    m.box(-1.2, 4.1, -1.2, 1.2, 4.3, 1.2, 4, 1, 1);
    const s = 2.0, b = 4.3, P = (x, y, z) => [x * s, b + y * s, z * s];
    m.mat(M_METAL);
    const C = [[0.3, 0.3, 0.23, 0, 0.8], [0.7, 0.27, 0.2, 0, 0.85], [1.1, 0.24, 0.17, 0, 0.9], [1.3, 0.25, 0.16, 0.02, 1], [1.4, 0.22, 0.14, 0.03, 1], [1.47, 0.1, 0.09, 0.04, 1]];
    p2loft(m, C.map(([y, rx, rz, cz, a]) => p2R(b + y * s, rx * s, rz * s, 0, cz * s, a)), 10, true, true);
    for (const x of [-0.12, 0.12]) m.box((x - 0.1) * s, b, -0.1 * s, (x + 0.1) * s, b + 0.3 * s, 0.22 * s, 4, 0.8, 1);
    p2ball(m, 0, b + 1.6 * s, 0.05 * s, 0.1 * s, 4, 8, 1.1);
    m.tube([P(0.26, 1.4, 0.04), P(0.34, 1.55, 0.3), P(0.3, 1.78, 0.5)], (k) => [0.07, 0.06, 0.055][k] * s, 6, 3);
    p2ball(m, 0.3 * s, b + 1.82 * s, 0.52 * s, 0.05 * s, 2, 6);
    m.tube([P(-0.26, 1.4, 0), P(-0.3, 1.1, 0.05), P(-0.27, 0.86, 0.12)], (k) => [0.07, 0.06, 0.055][k] * s, 6, 3);
    p2ball(m, -0.27 * s, b + 0.88 * s, 0.17 * s, 0.1 * s, 2, 8, 0.45);
    return { m, top: [0, b + 1.7 * s, 0] };
  },

  hospital() { // five-storey hospital 60 x 14 x 17 m (x +-30, z +-7), front +z; {m, W, cross, canopy}; cross = (0, 17.8, 7.02) centre of the 2 m sign on the front parapet block (block rises to y 18.8 over x +-1.6); canopy = (22, 3.38, 10) under the emergency canopy (8 x 6, x 18..26, z 7..13, underside 3.4); windows 1.8 x 1.5 every 3 m, floors y 1.0 + 3.2 k; main door x +-1.5, emergency door x 20..24
    const m = new Mesh(), Wn = [], ao = (y) => mix(0.55, 1, sstep(0, 4, y)), H = 16.6;
    const xs = []; for (let i = 0; i < 20; i++) xs.push(-28.5 + 3 * i);
    const win = (front) => {
      const w = [];
      for (let k = 0; k < 5; k++) for (const x of xs) {
        if (front && k === 0 && (abs(x) < 3 || x === 19.5 || x === 22.5)) continue;
        w.push([x, 1.0 + 3.2 * k + 0.75, 1.8, 1.5]);
      }
      return w;
    };
    m.mat(M_PANEL); m.box(-30, 0, -7, 30, H, 7, 4 | 16 | 32, 0.6, 1);
    p6wall(m, Wn, { yaw: 0, x0: -30, x1: 30, zf: 7, y0: 0, y1: H, ao, win: win(true), holes: [[-1.5, 0.3, 1.5, 3.0], [20, 0.3, 24, 3.0]], after: () => { p6door(m, -1.5, 0.3, 1.5, 3.0, 6.7, M_GLASS); p6door(m, 20, 0.3, 24, 3.0, 6.7, M_GLASS); m.mat(M_PANEL); } });
    p6wall(m, Wn, { yaw: PI, x0: -30, x1: 30, zf: 7, y0: 0, y1: H, ao, win: win(false) });
    m.mat(M_CONC);
    m.box(-30.1, 0, -7.1, 30.1, 0.3, 7.1, 4, 0.6, 1);
    p6parapet(m, -30.1, -7.1, 30.1, 7.1, H, 17.0, 0.25);
    m.mat(M_PANEL); m.box(-1.6, H, 6.7, 1.6, 18.8, 7.0, 4 | 16, 1, 1);
    // main entrance: steps and canopy
    m.mat(M_CONC);
    m.box(-3, 0, 7, 3, 0.3, 7.8, 4, 0.6, 1); m.box(-3, 0, 7.8, 3, 0.15, 8.5, 4, 0.6, 1);
    m.mat(M_TINT);
    m.box(-3.6, 3.4, 7, 3.6, 3.65, 9.6, 4, 1, 1);
    m.mat(M_METAL);
    for (const x of [-3.3, 3.3]) m.box(x - 0.1, 0, 9.3, x + 0.1, 3.4, 9.5, 4, 0.7, 1);
    // emergency entrance: wide flat canopy on 4 posts, ramp
    m.mat(M_RED); m.box(18, 3.4, 7, 26, 3.7, 13, 4, 1, 1);
    m.mat(M_DARK); p5face(m, [[18, 3.4, 7], [26, 3.4, 7], [26, 3.4, 13], [18, 3.4, 13]], [0, -1, 0], 0.7);
    m.mat(M_METAL);
    for (const x of [18.3, 25.7]) for (const z of [8.2, 12.6]) m.box(x - 0.15, 0, z - 0.15, x + 0.15, 3.4, z + 0.15, 4, 0.6, 1);
    m.mat(M_CONC); p6prism(m, [[7, 0], [11, 0], [7, 0.3]], 19.5, 24.5, 0.7);
    return { m, W: Wn, cross: [0, 17.8, 7.02], canopy: [22, 3.38, 10] };
  },

  police() { // two-storey police station 26 x 12 x 7.5 m (x +-13, z +-6), brick, front +z; {m, W, sign}; sign = (0, 3.35, 6.02) centre of the 3.2 x 0.6 sign over the entrance, 2 cm in front of the wall; windows 1.6 x 1.6 every 3 m, floors y 1.0 / 4.4; door x +-0.9; canopy z 6..7.4 at y 2.8
    const m = new Mesh(), Wn = [], ao = (y) => mix(0.55, 1, sstep(0, 3, y));
    const xs = []; for (let i = 0; i < 8; i++) xs.push(-10.5 + 3 * i);
    const win = (front) => {
      const w = [];
      for (const y0 of [1.0, 4.4]) for (const x of xs) { if (front && y0 < 2 && abs(x) < 3) continue; w.push([x, y0 + 0.8, 1.6, 1.6]); }
      return w;
    };
    m.mat(M_BRICK); m.box(-13, 0, -6, 13, 7.1, 6, 4 | 16 | 32, 0.6, 1);
    p6wall(m, Wn, { yaw: 0, x0: -13, x1: 13, zf: 6, y0: 0, y1: 7.1, ao, win: win(true), holes: [[-0.9, 0.35, 0.9, 2.6]], after: () => { p6door(m, -0.9, 0.35, 0.9, 2.6, 5.75); m.mat(M_BRICK); } });
    p6wall(m, Wn, { yaw: PI, x0: -13, x1: 13, zf: 6, y0: 0, y1: 7.1, ao, win: win(false) });
    m.mat(M_CONC);
    m.box(-13.2, 7.1, -6.2, 13.2, 7.5, 6.2, 4, 1, 1);
    m.box(-13.1, 0, -6.1, 13.1, 0.4, 6.1, 4, 0.6, 1);
    m.box(-1.6, 0, 6, 1.6, 0.35, 6.8, 4, 0.6, 1); m.box(-1.6, 0, 6.8, 1.6, 0.18, 7.4, 4, 0.6, 1);
    m.mat(M_TINT); m.box(-1.8, 2.8, 6, 1.8, 3.0, 7.4, 4, 1, 1);
    m.mat(M_METAL); for (const x of [-1.7, 1.7]) m.box(x - 0.05, 0, 7.25, x + 0.05, 2.8, 7.35, 4, 0.7, 1);
    m.mat(M_TINT); m.box(-1.6, 3.05, 6.0, 1.6, 3.65, 6.02, 0, 1, 1);
    return { m, W: Wn, sign: [0, 3.35, 6.02] };
  },

  firestation() { // fire station, front +z: office block x -20..-6 (z +-6, 7.5 m), garage hall x -6..16 (z +-7, 6.5 m) with bay doors 4 x 4.4 m at x -1 / 5 / 11, tower 4 x 4 x 18 m at x -20..-16, z -6..-2; {m, W, bays, open, inside}; bays = 3 door centres at the wall plane (z 7, y 2.2); open = 2 (dark interior box, hall x 9..13); inside = (11, 4, 3) under the ceiling of the open bay
    const m = new Mesh(), Wn = [], ao = (y) => mix(0.55, 1, sstep(0, 3, y));
    const bx = [-1, 5, 11];
    // office block
    m.mat(M_BRICK); m.box(-20, 0, -6, -6, 7.1, 6, 4 | 16 | 32, 0.6, 1);
    const ow = (front) => { const w = []; for (const y0 of [1.0, 4.2]) for (const x of front ? (y0 < 2 ? [-18, -15, -12] : [-18, -15, -12, -9]) : [-18, -15, -12, -9]) w.push([front ? x : -x, y0 + 0.7, 1.6, 1.4]); return w; };
    p6wall(m, Wn, { yaw: 0, x0: -20, x1: -6, zf: 6, y0: 0, y1: 7.1, ao, win: ow(true), holes: [[-9.5, 0.2, -8.1, 2.3]], after: () => { p6door(m, -9.5, 0.2, -8.1, 2.3, 5.75); m.mat(M_BRICK); } });
    p6wall(m, Wn, { yaw: PI, x0: 6, x1: 20, zf: 6, y0: 0, y1: 7.1, ao, win: ow(false) });
    m.mat(M_CONC); m.box(-20.1, 7.1, -6.1, -5.9, 7.5, 6.1, 4, 1, 1); m.box(-10.2, 0, 6, -7.4, 0.2, 6.8, 4 | 16, 0.6, 1);
    // garage hall
    m.mat(M_PANEL); m.box(-6, 0, -7, 16, 6.1, 7, 4 | 32, 0.6, 1);
    p6wall(m, Wn, { yaw: 0, x0: -6, x1: 16, zf: 7, y0: 0, y1: 6.1, ao, rec: 0.15, holes: bx.map((x) => [x - 2, 0, x + 2, 4.4]), after: () => {
      // closed roll-up doors 0 and 1 with horizontal ribs
      m.mat(M_RED);
      for (const x of [bx[0], bx[1]]) {
        m.box(x - 2, 0, 6.84, x + 2, 4.4, 6.88, 1 | 2 | 4 | 16, 0.6, 1);
        for (let k = 0; k < 11; k++) m.box(x - 2, 0.15 + k * 0.4, 6.88, x + 2, 0.25 + k * 0.4, 6.93, 1 | 2 | 4 | 16, 0.7, 1);
      }
      // open bay 2: dark interior box open towards +z
      m.mat(M_DARK);
      const x0 = bx[2] - 2, x1 = bx[2] + 2, zb = -1;
      p5face(m, [[x0, 0.02, 7], [x1, 0.02, 7], [x1, 0.02, zb], [x0, 0.02, zb]], [0, 1, 0], 0.3);
      p5face(m, [[x0, 4.4, 7], [x1, 4.4, 7], [x1, 4.4, zb], [x0, 4.4, zb]], [0, -1, 0], 0.5);
      p5face(m, [[x0, 0, 7], [x0, 4.4, 7], [x0, 4.4, zb], [x0, 0, zb]], [1, 0, 0], 0.4);
      p5face(m, [[x1, 0, 7], [x1, 4.4, 7], [x1, 4.4, zb], [x1, 0, zb]], [-1, 0, 0], 0.4);
      p5face(m, [[x0, 0, zb], [x1, 0, zb], [x1, 4.4, zb], [x0, 4.4, zb]], [0, 0, 1], 0.3);
      m.mat(M_PANEL);
    } });
    m.mat(M_CONC); m.box(-6.1, 6.1, -7.1, 16.1, 6.5, 7.1, 4, 1, 1);
    // hose drying tower
    m.mat(M_BRICK); m.box(-20, 7.1, -6, -16, 17.6, -2, 1 | 2 | 4 | 16 | 32, 1, 1);
    const tw = [];
    for (const y of [9.5, 12.5, 15.5]) tw.push([0, y, 0.6, 1.0]);
    for (const yaw of [0, PI, PI / 2, -PI / 2]) p6wall(m, Wn, { yaw, ox: -18, oz: -4, x0: -2, x1: 2, zf: 2, y0: 7.1, y1: 17.6, ao: () => 1, rec: 0.1, win: tw });
    m.mat(M_CONC); m.box(-20.1, 17.6, -6.1, -15.9, 18.0, -1.9, 4, 1, 1);
    return { m, W: Wn, bays: bx.map((x) => [x, 2.2, 7]), open: 2, inside: [11, 4, 3] };
  },

  club() { // night club hall 24 x 16 x 7 m (x +-12, z +-8), front +z, no windows; {m, door, strips, sign, canopy}; door = (0, 1.3, 8) centre of the black door (2 x 2.6) at the wall plane; strips = 3 x [x, y, z, w, h] glass strips (z 7.88 = recessed pane plane): (-6.5, 4.4, w 6, h 0.5), (6.5, 4.4, 6, 0.5), (0, 5.8, 15, 0.5); sign = (0, 8.0, 8.03) centre of the 6 x 1.2 sign 3 cm in front of the frame (frame y 7.2..8.8, front plane z 8); canopy = (0, 3.15, 9.5) under the 5 x 3 canopy (x +-2.5, z 8..11, underside 3.2); chrome posts at (+-1.6, 0, 9.5) with a red rope
    const m = new Mesh(), Wn = [], ao = (y) => mix(0.55, 1, sstep(0, 4, y));
    const strips = [[-6.5, 4.4, 7.88, 6, 0.5], [6.5, 4.4, 7.88, 6, 0.5], [0, 5.8, 7.88, 15, 0.5]];
    m.mat(M_PANEL); m.box(-12, 0, -8, 12, 6.8, 8, 4 | 32, 0.6, 1);
    p6wall(m, Wn, { yaw: 0, x0: -12, x1: 12, zf: 8, y0: 0, y1: 6.8, ao, holes: strips.map(([x, y, , w, h]) => [x - w / 2, y - h / 2, x + w / 2, y + h / 2]).concat([[-1, 0.18, 1, 2.6]]), after: () => { p6door(m, -1, 0.18, 1, 2.6, 7.7); m.mat(M_GLASS); for (const [x, y, , w, h] of strips) p5face(m, [[x - w / 2, y - h / 2, 7.86], [x + w / 2, y - h / 2, 7.86], [x + w / 2, y + h / 2, 7.86], [x - w / 2, y + h / 2, 7.86]], [0, 0, 1], 0.8); m.mat(M_PANEL); } });
    m.mat(M_CONC);
    m.box(-12.1, 6.8, -8.1, 12.1, 7.0, 8.1, 4, 1, 1);
    m.box(-12.1, 7.0, -8.1, 12.1, 7.4, -7.9, 4); m.box(-12.1, 7.0, 7.9, -3.4, 7.4, 8.1, 4); m.box(3.4, 7.0, 7.9, 12.1, 7.4, 8.1, 4);
    m.box(-12.1, 7.0, -7.9, -11.9, 7.4, 7.9, 4); m.box(11.9, 7.0, -7.9, 12.1, 7.4, 7.9, 4);
    m.box(-12.1, 0, -8.1, 12.1, 0.3, 8.1, 4, 0.6, 1);
    m.box(-1.5, 0, 8, 1.5, 0.18, 8.8, 4 | 16, 0.6, 1);
    // deep canopy, hangers and rope barrier
    m.mat(M_DARK); m.box(-2.5, 3.2, 8, 2.5, 3.45, 11, 0, 0.9, 1);
    m.mat(M_METAL);
    for (const x of [-2.4, 2.4]) m.box(x - 0.05, 0, 10.85, x + 0.05, 3.2, 10.95, 4, 0.7, 1);
    for (const x of [-1.6, 1.6]) {
      m.tube([[x, 0, 9.5], [x, 0.95, 9.5]], 0.035, 6, 3, (k) => [0.6, 1][k]);
      p4cyl(m, x, 0, 9.5, 0.14, 0.03, 8, 0.6);
      p2ball(m, x, 0.98, 9.5, 0.06, 2, 6);
    }
    m.mat(M_RED);
    { const pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push([-1.6 + 3.2 * t, 0.9 - 0.2 * sin(PI * t), 9.5]); } m.tube(pts, 0.022, 4, 3); }
    // sign frame above the entrance (stands on the roof edge, front plane z 8.0)
    m.mat(M_METAL);
    m.box(-3.2, 7.2, 7.9, 3.2, 7.3, 8.0, 0, 1, 1); m.box(-3.2, 8.7, 7.9, 3.2, 8.8, 8.0, 0, 1, 1);
    m.box(-3.2, 7.3, 7.9, -3.1, 8.7, 8.0, 0, 1, 1); m.box(3.1, 7.3, 7.9, 3.2, 8.7, 8.0, 0, 1, 1);
    for (const x of [-3.0, 3.0]) m.box(x - 0.06, 7.0, 7.9, x + 0.06, 7.2, 8.0, 0, 1, 1);
    return { m, door: [0, 1.3, 8], strips, sign: [0, 8.0, 8.03], canopy: [0, 3.15, 9.5] };
  },

  cafe() { // roadside cafe 20 x 10 m (x +-10, z +-5), siding walls 3.2 m, metal gable roof (ridge along x, y 5.2), front +z; {m, W, chimney, sign}; chimney = (6, 6.5, -2) top; sign = (0, 6.1, 0.07) centre of the 5 x 1 sign on the frame over the ridge (frame y 5.4..6.8), facing +z; windows 2.4 x 1.4 at x -7.5 / -4.5 / 4.5 / 7.5, y 1.6; glass door x +-0.9
    const m = new Mesh(), Wn = [], ao = (y) => mix(0.6, 1, sstep(0, 2, y));
    const wx = [-7.5, -4.5, 4.5, 7.5], win = wx.map((x) => [x, 1.6, 2.4, 1.4]);
    const holes = win.map(([cx, cy, w, h]) => [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]).concat([[-0.9, 0.12, 0.9, 2.3]]);
    m.mat(M_TINT); m.box(-10, 0, -5, 10, 3.2, 5, 4 | 16 | 32, 0.6, 1);
    p6wall(m, Wn, { yaw: 0, x0: -10, x1: 10, zf: 5, y0: 0, y1: 3.2, ao, win, holes: [[-0.9, 0.12, 0.9, 2.3]], after: () => { p6door(m, -0.9, 0.12, 0.9, 2.3, 4.75, M_GLASS); m.mat(M_TINT); } });
    p6wall(m, Wn, { yaw: PI, x0: -10, x1: 10, zf: 5, y0: 0, y1: 3.2, ao });
    // vertical siding ribs (front, back, both ends); segments below the sill and over the head where a hole is
    m.mat(M_TINT);
    const rib = (x, ya, yb, face) => { // face 0 +z, 1 -z, 2 +x, 3 -x
      if (face === 0) m.box(x - 0.025, ya, 5, x + 0.025, yb, 5.03, 1 | 2 | 4 | 8 | 16, 0.8, 1);
      else if (face === 1) m.box(x - 0.025, ya, -5.03, x + 0.025, yb, -5, 1 | 2 | 4 | 8 | 32, 0.8, 1);
      else if (face === 2) m.box(10, ya, x - 0.025, 10.03, yb, x + 0.025, 1 | 4 | 8 | 16 | 32, 0.8, 1);
      else m.box(-10.03, ya, x - 0.025, -10, yb, x + 0.025, 2 | 4 | 8 | 16 | 32, 0.8, 1);
    };
    for (let i = 0; i <= 40; i++) {
      const x = -10 + 0.5 * i + 0.25 * 0;
      if (x > 9.9 || x < -9.9) continue;
      const hit = holes.find((h) => x > h[0] - 0.03 && x < h[2] + 0.03);
      if (!hit) { rib(x, 0, 3.2, 0); } else { if (hit[1] > 0.3) rib(x, 0, hit[1], 0); rib(x, hit[3], 3.2, 0); }
      rib(x, 0, 3.2, 1);
    }
    for (let i = 0; i < 20; i++) { const z = -4.75 + 0.5 * i; rib(z, 0, 3.2, 2); rib(z, 0, 3.2, 3); }
    // gable triangles and metal roof
    m.mat(M_TINT); p6prism(m, [[-5, 3.2], [5, 3.2], [0, 5.2]], -10, 10, 0.9);
    m.mat(M_METAL);
    p6prism(m, [[-5.5, 3.0], [0, 5.3], [0, 5.18], [-5.5, 2.88]], -10.4, 10.4, 1);
    p6prism(m, [[0, 5.3], [5.5, 3.0], [5.5, 2.88], [0, 5.18]], -10.4, 10.4, 1);
    m.box(-10.4, 5.3, -0.12, 10.4, 5.4, 0.12, 4, 1, 1);
    // porch roof over the door
    m.mat(M_METAL); m.box(-2.2, 2.7, 5, 2.2, 2.82, 7.0, 4, 1, 1);
    m.mat(M_BARK); for (const x of [-2.0, 2.0]) m.box(x - 0.06, 0, 6.8, x + 0.06, 2.7, 6.92, 4, 0.7, 1);
    m.mat(M_CONC); m.box(-1.8, 0, 5, 1.8, 0.12, 6.4, 4 | 16, 0.6, 1);
    // chimney
    m.mat(M_BRICK); m.box(5.6, 3.6, -2.4, 6.4, 6.4, -1.6, 4, 0.9, 1);
    m.mat(M_CONC); m.box(5.5, 6.4, -2.5, 6.5, 6.5, -1.5, 4, 1, 1);
    // sign frame on the ridge above the door
    m.mat(M_METAL);
    m.box(-2.7, 5.4, -0.05, 2.7, 5.48, 0.05, 0, 1, 1); m.box(-2.7, 6.72, -0.05, 2.7, 6.8, 0.05, 0, 1, 1);
    m.box(-2.7, 5.48, -0.05, -2.62, 6.72, 0.05, 0, 1, 1); m.box(2.62, 5.48, -0.05, 2.7, 6.72, 0.05, 0, 1, 1);
    for (const x of [-2.4, 2.4]) m.box(x - 0.05, 5.3, -0.05, x + 0.05, 5.4, 0.05, 0, 1, 1);
    return { m, W: Wn, chimney: [6, 6.5, -2], sign: [0, 6.1, 0.07] };
  },

  fuelroof() { // fuel station canopy 12 x 8 m (x +-6, z +-4) slab y 5.0..5.6 on 4 posts (x +-5, z +-3), two pump islands at x +-3; {m, lights}; lights = 4 points (+-3, 4.6, +-2) under the canopy
    const m = new Mesh();
    m.mat(M_CONC); m.box(-6, 5.0, -4, 6, 5.6, 4, 4, 1, 1);
    m.mat(M_DARK); p5face(m, [[-6, 5.0, -4], [6, 5.0, -4], [6, 5.0, 4], [-6, 5.0, 4]], [0, -1, 0], 0.8);
    m.mat(M_RED); m.box(-6.02, 5.15, -4.02, 6.02, 5.3, 4.02, 4 | 8, 1, 1);
    m.mat(M_CONC); for (const x of [-5, 5]) for (const z of [-3, 3]) m.box(x - 0.2, 0, z - 0.2, x + 0.2, 5.0, z + 0.2, 4, 0.6, 1);
    for (const x of [-3, 3]) {
      m.mat(M_CONC); m.box(x - 1.5, 0, -0.4, x + 1.5, 0.2, 0.4, 4, 0.6, 1);
      m.mat(M_TINT); m.box(x - 0.45, 0.2, -0.25, x + 0.45, 2.0, 0.25, 4, 0.6, 1);
      m.mat(M_DARK);
      for (const s of [-1, 1]) m.box(x - 0.3, 1.2, s * 0.25, x + 0.3, 1.7, s * 0.253 + s * 0.002, 0, 1, 1);
    }
    return { m, lights: [[-3, 4.6, -2], [3, 4.6, -2], [-3, 4.6, 2], [3, 4.6, 2]] };
  },

  ferris() { // ferris wheel, diameter 22 m, axle (0, 13, 0) along x, wheel plane x = 0, double rim at x +-0.6, 16 spokes, 16 gondolas hanging straight down (lowest point y ~0.35), A-frames at x +-1.2 and +-2.4 with legs to z +-7, ticket booth at (5, 0, 8); {m, rim}; rim = 16 gondola hanging points (0, 13 + 11 cos a, 11 sin a), a = k * 22.5 deg
    const m = new Mesh(), R = 11, Y = 13, rim = [];
    m.mat(M_METAL);
    for (const x of [-0.6, 0.6]) m.tube(p4circ([x, Y, 0], R, 32, 'yz'), 0.07, 4, 0);
    m.tube([[-3, Y, 0], [3, Y, 0]], 0.2, 8, 3);
    for (const x of [-0.6, 0.6]) m.tube([[x, Y, 0], [x + Math.sign(x) * 0.2, Y, 0]], 0.7, 8, 3);
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * TAU, p = [0, Y + R * cos(a), R * sin(a)];
      rim.push(p);
      for (const x of [-0.6, 0.6]) p6rod(m, [x, Y, 0], [x, p[1], p[2]], 0.04, 4);
      p6rod(m, [-0.6, p[1], p[2]], [0.6, p[1], p[2]], 0.05, 4);
    }
    // gondolas
    for (const p of rim) {
      m.mat(M_DARK); p6rod(m, p, [p[0], p[1] - 0.55, p[2]], 0.03, 4);
      m.mat(M_TINT);
      m.box(-0.7, p[1] - 1.65, p[2] - 0.5, 0.7, p[1] - 0.55, p[2] + 0.5, 8, 0.7, 1);
      p5frus(m, 0, p[2], p[1] - 0.55, 0.85, 0.65, p[1] - 0.4, 0.3, 0.2, 1, 1, true);
    }
    // A-frame supports
    m.mat(M_METAL);
    for (const x of [-2.4, -1.2, 1.2, 2.4]) {
      for (const z of [-7, 7]) m.bar([x, 0, z], [x, Y, 0], 0.22, 0.22, 0.8);
      m.bar([x, 2.5, -2.7], [x, 2.5, 2.7], 0.12, 0.12, 0.8);
    }
    // ticket booth
    m.mat(M_TINT); m.box(4.2, 0, 7.2, 5.8, 2.4, 8.8, 4, 0.6, 1);
    m.mat(M_GLASS); m.box(4.5, 1.2, 8.8, 5.5, 2.0, 8.82, 0, 1, 1);
    m.mat(M_DARK); m.box(4.0, 2.4, 7.0, 6.0, 2.55, 9.2, 4, 1, 1);
    return { m, rim };
  },

  bandstand() { // park bandstand, stage 10 x 6 m (x +-5, z +-3, 0.9 high) with a quarter-sphere shell (opening at z 3 facing +z, top y 5.5), steps to z 4.8
    const m = new Mesh();
    m.mat(M_CONC); m.box(-5, 0, -3, 5, 0.9, 3, 4, 0.6, 1);
    m.mat(M_BARK); p5face(m, [[-4.9, 0.91, -2.9], [4.9, 0.91, -2.9], [4.9, 0.91, 2.9], [-4.9, 0.91, 2.9]], [0, 1, 0], 0.9);
    m.mat(M_CONC); m.box(-2.5, 0, 3, 2.5, 0.6, 3.9, 4, 0.6, 1); m.box(-2.5, 0, 3.9, 2.5, 0.3, 4.8, 4, 0.6, 1);
    const cy = 0.9, cz = 3, NF = 12, NT = 5, th = 0.1, RX = 5, RY = 4.6, RZ = 6;
    const P = (f, t, g) => { const ph = f / NF * PI, el = t / NT * PI / 2, ex = RX - g, ey = RY - g, ez = RZ - g; return [ex * cos(el) * cos(ph), cy + ey * sin(el), cz - ez * cos(el) * sin(ph)]; };
    const dir = (a, c, s) => [s * ((a[0] + c[0]) / 2), s * ((a[1] + c[1]) / 2 - cy), s * ((a[2] + c[2]) / 2 - cz)];
    for (const [g, s, mt] of [[0, 1, M_TINT], [th, -1, M_CONC]]) {
      m.mat(mt);
      for (let f = 0; f < NF; f++) for (let t = 0; t < NT; t++) {
        const a = P(f, t, g), b = P(f + 1, t, g), c = P(f + 1, t + 1, g), d = P(f, t + 1, g);
        p5face(m, t === NT - 1 ? [a, b, c] : [a, b, c, d], dir(a, c, s), mix(0.75, 1, t / NT));
      }
    }
    m.mat(M_CONC);
    for (const f of [0, NF]) for (let t = 0; t < NT; t++) p5face(m, [P(f, t, 0), P(f, t + 1, 0), P(f, t + 1, th), P(f, t, th)], [0, 0, 1], 1);
    return m;
  },

  fountain() { // round fountain basin r 5 (wall 0.6 high, 0.3 thick, M_CONC), frozen M_LENS surface at y 0.45, central column with two bowls (r 1.6 rim at y 1.4, r 0.8 rim at y 2.4), top y ~2.9
    const m = new Mesh(), N = 24;
    m.mat(M_CONC);
    for (let k = 0; k < N; k++) {
      const a = k / N * TAU, b = (k + 1) / N * TAU, ca = cos(a), sa = sin(a), cb = cos(b), sb = sin(b), c = (a + b) / 2;
      p5face(m, [[5 * ca, 0, 5 * sa], [5 * cb, 0, 5 * sb], [5 * cb, 0.6, 5 * sb], [5 * ca, 0.6, 5 * sa]], [cos(c), 0, sin(c)], [0.6, 0.6, 1, 1]);
      p5face(m, [[5 * ca, 0.6, 5 * sa], [5 * cb, 0.6, 5 * sb], [4.7 * cb, 0.6, 4.7 * sb], [4.7 * ca, 0.6, 4.7 * sa]], [0, 1, 0], 1);
      p5face(m, [[4.7 * ca, 0, 4.7 * sa], [4.7 * cb, 0, 4.7 * sb], [4.7 * cb, 0.6, 4.7 * sb], [4.7 * ca, 0.6, 4.7 * sa]], [-cos(c), 0, -sin(c)], [0.5, 0.5, 0.9, 0.9]);
    }
    m.mat(M_LENS);
    { const c = m.v(0, 0.45, 0, 1), ring = []; for (let k = 0; k < N; k++) { const a = k / N * TAU; ring.push(m.v(4.7 * cos(a), 0.45, 4.7 * sin(a), 0.9)); } for (let k = 0; k < N; k++) m.tri(c, ring[(k + 1) % N], ring[k]); }
    m.mat(M_CONC);
    p2loft(m, [p2R(0, 0.9, 0.9, 0, 0, 0.6), p2R(0.45, 0.7, 0.7, 0, 0, 0.7), p2R(0.8, 0.3, 0.3)], 12, false, false);
    m.tube([[0, 0.8, 0], [0, 2.1, 0]], 0.28, 8, 0);
    p2loft(m, [p2R(0.95, 0.25), p2R(1.15, 1.0, 1.0, 0, 0, 0.9), p2R(1.4, 1.6)], 16, false, true);
    p2loft(m, [p2R(2.0, 0.2), p2R(2.2, 0.55), p2R(2.4, 0.8)], 12, false, true);
    m.mat(M_LENS); p2ball(m, 0, 2.7, 0, 0.3, 3, 8, 1.2);
    return m;
  },

  parkgate() { // park entrance: brick pillars 1 x 1 x 4.5 m at x +-5 with ball tops (top y ~5.3), metal arch springing at y 3.8 peaking at y 6.2, 3 m fence stubs (1.4 m) from x +-5.5 to +-8.5; {m, sign}; sign = (0, 5.1, 0) centre of the 4 x 0.8 sign hanging under the arch top (top edge y 5.5)
    const m = new Mesh();
    for (const s of [-1, 1]) {
      m.mat(M_BRICK); m.box(s * 5 - 0.5, 0, -0.5, s * 5 + 0.5, 4.5, 0.5, 4, 0.6, 1);
      m.mat(M_CONC); m.box(s * 5 - 0.65, 4.5, -0.65, s * 5 + 0.65, 4.65, 0.65, 4, 1, 1); m.box(s * 5 - 0.6, 0, -0.6, s * 5 + 0.6, 0.3, 0.6, 4, 0.6, 1);
      p2ball(m, s * 5, 4.95, 0, 0.36, 3, 6);
    }
    m.mat(M_METAL);
    const Rr = (4.5 * 4.5 + 2.4 * 2.4) / (2 * 2.4), arc = (g, n) => { const o = []; for (let k = 0; k <= n; k++) { const x = -4.5 + 9 * k / n; o.push([x, 6.2 - g - (Rr - sqrt(Rr * Rr - x * x)), 0]); } return o; };
    m.tube(arc(0, 12), 0.06, 4, 3); m.tube(arc(0.45, 12), 0.05, 4, 3);
    for (let k = 1; k < 12; k += 2) { const x = -4.5 + 9 * k / 12, y = 6.2 - (Rr - sqrt(Rr * Rr - x * x)); p6rod(m, [x, y - 0.45, 0], [x, y, 0], 0.025, 4); }
    m.bar([-4.5, 3.78, 0], [4.5, 3.78, 0], 0.05, 0.05);
    for (const x of [-1.8, 1.8]) { const y = 6.2 - (Rr - sqrt(Rr * Rr - x * x)); p6rod(m, [x, 5.5, 0], [x, y - 0.45, 0], 0.015, 4); }
    m.mat(M_DARK);
    for (const s of [-1, 1]) {
      const xa = s * 5.5, xb = s * 8.5;
      m.bar([xa, 0.3, 0], [xb, 0.3, 0], 0.05, 0.05); m.bar([xa, 1.2, 0], [xb, 1.2, 0], 0.05, 0.05);
      for (let k = 1; k <= 5; k++) p6rod(m, [xa + (xb - xa) * k / 6, 0, 0], [xa + (xb - xa) * k / 6, 1.4, 0], 0.02, 4, 0.7);
      m.box(xb - 0.07, 0, -0.07, xb + 0.07, 1.5, 0.07, 4, 0.7, 1);
    }
    return { m, sign: [0, 5.1, 0] };
  },

  gazebo() { // round wooden gazebo r 2.4: octagonal floor 0.3 m, 8 posts to y 2.6 at radius 2.2 (opening towards +z), rails, bench ring, octagonal cone roof to y 4.2
    const m = new Mesh(), N = 8, pa = (k) => (22.5 + 45 * k) * PI / 180, pp = (k, r) => [r * cos(pa(k)), r * sin(pa(k))];
    m.mat(M_BARK); p2loft(m, [p2R(0, 2.4, 2.4, 0, 0, 0.6), p2R(0.3, 2.4, 2.4, 0, 0, 1)], 8, false, true);
    for (let k = 0; k < N; k++) { const [x, z] = pp(k, 2.2); m.box(x - 0.08, 0.3, z - 0.08, x + 0.08, 2.6, z + 0.08, 4, 0.8, 1); }
    for (let k = 0; k < N; k++) {
      const [x0, z0] = pp(k, 2.2), [x1, z1] = pp((k + 1) % N, 2.2), [xi0, zi0] = pp(k, 1.85), [xi1, zi1] = pp((k + 1) % N, 1.85);
      m.bar([x0, 2.55, z0], [x1, 2.55, z1], 0.14, 0.14);
      if (k === 1) continue; // opening to +z between posts 1 and 2 (angles 67.5 and 112.5 deg)
      m.bar([x0, 1.0, z0], [x1, 1.0, z1], 0.06, 0.05); m.bar([x0, 0.55, z0], [x1, 0.55, z1], 0.05, 0.05);
      m.bar([xi0, 0.78, zi0], [xi1, 0.78, zi1], 0.42, 0.06);
    }
    m.mat(M_METAL);
    const ring = []; for (let k = 0; k < N; k++) { const [x, z] = pp(k, 2.75); ring.push([x, 2.55, z]); }
    for (let k = 0; k < N; k++) p5face(m, [ring[k], ring[(k + 1) % N], [0, 4.2, 0]], [cos(pa(k) + PI / 8), 1.2, sin(pa(k) + PI / 8)], 1);
    m.mat(M_BARK); p5face(m, ring, [0, -1, 0], 0.7);
    return m;
  },

  parklamp() { // park lamp: 4 m cast-iron post with a flared base, glowing globe r 0.25 centred at (0, 4.2, 0), finial to y 4.65
    const m = new Mesh().mat(M_DARK);
    p2loft(m, [p2R(0, 0.3, 0.3, 0, 0, 0.55), p2R(0.25, 0.2, 0.2, 0, 0, 0.7), p2R(0.4, 0.12, 0.12, 0, 0, 0.9), p2R(0.6, 0.08, 0.08)], 6, true, false);
    m.tube([[0, 0.6, 0], [0, 3.85, 0]], (k) => [0.075, 0.05][k], 6, 0);
    p2loft(m, [p2R(3.8, 0.12, 0.12), p2R(3.93, 0.2, 0.2)], 6, false, true);
    m.mat(M_LAMP); p2ball(m, 0, 4.2, 0, 0.25, 2, 7);
    m.mat(M_DARK); p2loft(m, [p2R(4.43, 0.15, 0.15), p2R(4.5, 0.18, 0.18), p2R(4.6, 0.03, 0.03)], 6, true, false);
    return m;
  },

  ledlamp() { // modern street light: 9 m tapered grey pole, arm along +x, flat LED head 1.4 x 0.4 centred at (1.5, 8.9, 0), M_LAMP face on its underside (y 8.9)
    const m = new Mesh().mat(M_METAL);
    m.tube([[0, 0, 0], [0, 9.0, 0]], (k) => [0.12, 0.06][k], 8, 2);
    p4cyl(m, 0, 0, 0, 0.2, 0.25, 8, 0.6);
    m.tube([[0, 8.7, 0], [0.4, 9.0, 0], [0.9, 9.0, 0]], 0.04, 6, 3);
    m.box(0.8, 8.9, -0.2, 2.2, 9.1, 0.2, 4, 1, 1);
    m.mat(M_LAMP); p5face(m, [[0.85, 8.9, -0.17], [2.15, 8.9, -0.17], [2.15, 8.9, 0.17], [0.85, 8.9, 0.17]], [0, -1, 0], 1);
    return m;
  },

  shed() { // old wooden shed 3 x 2.5 m (x +-1.5, z +-1.25), plank walls 2.1 m, tar roof ridge along x at y 2.8, door with padlock on +z (x +-0.4)
    const m = new Mesh(), hx = 1.5, hz = 1.25;
    m.mat(M_BARK); m.box(-hx, 0, -hz, hx, 2.1, hz, 4, 0.6, 1);
    const pl = (x, ya, yb, f) => { // plank rib on face f: 0 +z, 1 -z, 2 +x, 3 -x
      if (f === 0) m.box(x - 0.015, ya, hz, x + 0.015, yb, hz + 0.02, 1 | 2 | 4 | 16, 0.7, 1);
      else if (f === 1) m.box(x - 0.015, ya, -hz - 0.02, x + 0.015, yb, -hz, 1 | 2 | 4 | 32, 0.7, 1);
      else if (f === 2) m.box(hx, ya, x - 0.015, hx + 0.02, yb, x + 0.015, 1 | 4 | 16 | 32, 0.7, 1);
      else m.box(-hx - 0.02, ya, x - 0.015, -hx, yb, x + 0.015, 2 | 4 | 16 | 32, 0.7, 1);
    };
    for (let i = 0; i < 12; i++) { const x = -1.375 + i * 0.25; if (abs(x) > 0.45) pl(x, 0, 2.1, 0); pl(x, 0, 2.1, 1); }
    for (let i = 0; i < 10; i++) { const z = -1.125 + i * 0.25; pl(z, 0, 2.1, 2); pl(z, 0, 2.1, 3); }
    m.box(-0.4, 0, hz, 0.4, 1.9, hz + 0.04, 1 | 2 | 4 | 16, 0.7, 1);
    m.mat(M_DARK);
    m.bar([-0.4, 0.25, hz + 0.05], [0.4, 0.25, hz + 0.05], 0.8, 0.08); m.bar([-0.4, 1.6, hz + 0.05], [0.4, 1.6, hz + 0.05], 0.8, 0.08);
    m.bar([-0.35, 0.3, hz + 0.055], [0.35, 1.55, hz + 0.055], 0.07, 0.01);
    m.mat(M_BARK);
    p6prism(m, [[-hz, 2.1], [hz, 2.1], [0, 2.76]], -hx, hx, 0.9);
    m.mat(M_DARK);
    p6prism(m, [[-1.5, 1.96], [0, 2.8], [0, 2.72], [-1.5, 1.88]], -1.7, 1.7, 1);
    p6prism(m, [[0, 2.8], [1.5, 1.96], [1.5, 1.88], [0, 2.72]], -1.7, 1.7, 1);
    m.mat(M_METAL); m.box(0.28, 0.95, hz + 0.06, 0.38, 1.05, hz + 0.1, 0, 1, 1); m.box(0.25, 1.0, hz + 0.06, 0.4, 1.12, hz + 0.065, 0, 1, 1);
    m.mat(M_DARK); m.box(0.1, 1.0, hz + 0.055, 0.3, 1.04, hz + 0.065, 0, 1, 1);
    return m;
  },

  woodpile() { // firewood stack 2.6 m along x (x +-1.3), 0.9 m deep (z +-0.45), 1.3 m high, log ends facing +z (r 0.19, 4 rows), M_METAL roofing sheet on top (y 1.25..1.3)
    const m = new Mesh();
    m.mat(M_DARK); m.box(-1.3, 0, -0.45, 1.3, 1.25, -0.4, 4 | 16, 0.5, 1);
    m.mat(M_BARK);
    for (let r = 0; r < 4; r++) {
      const n = r % 2 ? 5 : 6, x0 = r % 2 ? -0.82 : -1.025, y = 0.19 + 0.3 * r;
      for (let i = 0; i < n; i++) { const x = x0 + 0.41 * i; m.tube([[x, y, 0.45], [x, y, -0.4]], 0.19, 6, 1, () => 0.55 + 0.45 * r / 3); }
    }
    m.mat(M_METAL); m.box(-1.3, 1.25, -0.5, 1.3, 1.3, 0.5, 4, 1, 1);
    return m;
  },

  playset() { // playground set: tower 2 x 2 m (deck y 1.5, red pyramid roof to y 3.8) at the origin, tube slide to +x ending at x ~4.9, climbing net to -x (to x -2.6), rope bridge along -z to a small tower 1.4 x 1.4 m (deck y 1.2) centred at (0, 0, -4)
    const m = new Mesh();
    const tower = (cx, cz, h, deckY, top, roof) => {
      m.mat(M_GRN); m.box(cx - h, deckY - 0.1, cz - h, cx + h, deckY, cz + h, 0, 0.8, 1);
      m.mat(M_METAL);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) m.box(cx + sx * (h - 0.06) - 0.06, 0, cz + sz * (h - 0.06) - 0.06, cx + sx * (h - 0.06) + 0.06, top, cz + sz * (h - 0.06) + 0.06, 4, 0.6, 1);
      m.mat(M_YEL); m.box(cx - h, deckY, cz + h - 0.05, cx + h, deckY + 0.9, cz + h, 4, 1, 1);
      m.box(cx - h, deckY, cz - h, cx - h + 0.05, deckY + 0.9, cz + h, 4, 1, 1);
      m.mat(M_RED); p5frus(m, cx, cz, top, h + 0.15, h + 0.15, top + roof, 0, 0, 0.9, 1, false);
    };
    tower(0, 0, 1, 1.5, 2.9, 0.9);
    // second, smaller tower
    tower(0, -4, 0.7, 1.2, 2.3, 0.7);
    // tube slide curving down to +x
    const sl = [[1.0, 1.9], [1.7, 1.9], [2.4, 1.6], [3.1, 0.95], [3.8, 0.5], [4.4, 0.4], [4.9, 0.4]].map(([x, y]) => [x, y, 0]);
    m.mat(M_YEL); m.tube(sl, 0.35, 8, 0);
    m.mat(M_METAL);
    for (const [x, y] of [[2.4, 1.6], [3.8, 0.5]]) for (const z of [-0.3, 0.3]) p6rod(m, [x, 0, z], [x, y - 0.3, z], 0.04, 4, 0.7);
    // climbing net to -x: ropes along the slope and across it
    m.mat(M_GRN);
    for (let k = 0; k < 7; k++) { const z = -0.9 + 0.3 * k; p6rod(m, [-1.0, 1.5, z], [-2.6, 0.0, z], 0.025, 3); }
    for (let k = 1; k <= 5; k++) { const t = k / 6, x = -1.0 - 1.6 * t, y = 1.5 - 1.5 * t; p6rod(m, [x, y, -0.9], [x, y, 0.9], 0.025, 3); }
    m.mat(M_METAL); p6rod(m, [-1.0, 1.5, -0.9], [-1.0, 1.5, 0.9], 0.04, 4);
    // rope bridge: slats and rope rails
    m.mat(M_BARK);
    const bz0 = -1.0, bz1 = -3.3;
    for (let k = 0; k < 8; k++) { const t = (k + 0.5) / 8, z = mix(bz0, bz1, t), y = mix(1.5, 1.2, t) - 0.05 - 0.08 * sin(PI * t); m.box(-0.4, y - 0.02, z - 0.1, 0.4, y + 0.02, z + 0.1, 4, 0.8, 1); }
    m.mat(M_RED);
    for (const x of [-0.45, 0.45]) {
      const pts = []; for (let k = 0; k <= 6; k++) { const t = k / 6; pts.push([x, mix(1.5, 1.2, t) + 0.9 - 0.1 * sin(PI * t), mix(bz0, bz1, t)]); }
      m.tube(pts, 0.025, 4, 3);
      for (let k = 1; k < 6; k += 2) { const p = pts[k]; p6rod(m, [x, p[1] - 0.85, p[2]], p, 0.015, 3); }
    }
    return m;
  },
  firetruck() { // Russian fire engine 8.2 x 2.5 m (x +-4.1, z +-1.25), cab-over 3 m high in front (x 2.4..4.0), nose +x; red body, white stripe, 8 ribbed roller shutters, roof ladder x -3.9..2.2 at y 3.1, 6 wheels (front axle x 3.0, rear axles x -2.2 and -3.4); {m, beacons: [[3.6, 3.12, -0.55], [3.6, 3.12, 0.55]]} the two blue lamp boxes on the cab roof (M_LENS boxes, tops y 3.19)
    const m = new Mesh(), zz = [-1, 1];
    m.mat(M_DARK).box(-4.0, 0.45, -1.0, 4.0, 0.85, 1.0, 4, 0.4, 0.6);
    m.mat(M_RED);
    m.box(2.4, 0.75, -1.25, 4.0, 3.0, 1.25, 4 | 1, 0.55, 1); // cab
    m.box(-4.08, 0.8, -1.25, 2.4, 2.95, 1.25, 4 | 2, 0.55, 1); // body
    m.mat(M_METAL).box(4.0, 0.55, -1.25, 4.1, 0.85, 1.25, 4 | 1, 0.5, 0.8); // bumper
    m.mat(M_DARK).box(-4.1, 0.9, -1.1, -4.08, 1.1, 1.1, 0, 0.6, 0.6); // rear step panel
    m.mat(M_RED).box(-4.1, 1.3, -1.2, -4.08, 1.5, -0.9); m.box(-4.1, 1.3, 0.9, -4.08, 1.5, 1.2); // tail lamps
    // cab front: windscreen, grille, headlamps, white band
    m.mat(M_GLASS); p5face(m, [[4.005, 1.75, -1.1], [4.005, 1.75, 1.1], [4.005, 2.75, 1.1], [4.005, 2.75, -1.1]], [1, 0, 0], [0.7, 0.7, 1, 1]);
    m.mat(M_DARK); p5face(m, [[4.005, 0.9, -0.7], [4.005, 0.9, 0.7], [4.005, 1.15, 0.7], [4.005, 1.15, -0.7]], [1, 0, 0], 0.5);
    m.mat(M_LENS); m.box(4.0, 0.9, 0.85, 4.03, 1.1, 1.15); m.box(4.0, 0.9, -1.15, 4.03, 1.1, -0.85);
    m.mat(M_CONC); p5face(m, [[4.006, 1.2, -1.25], [4.006, 1.2, 1.25], [4.006, 1.35, 1.25], [4.006, 1.35, -1.25]], [1, 0, 0], 0.8);
    for (const s of zz) {
      const z = s * 1.256, zr = s * 1.262;
      m.mat(M_GLASS); p5face(m, [[2.7, 1.75, z], [3.85, 1.75, z], [3.85, 2.7, z], [2.7, 2.7, z]], [0, 0, s], [0.7, 0.7, 1, 1]);
      m.mat(M_CONC); p5face(m, [[-4.08, 1.2, z], [4.0, 1.2, z], [4.0, 1.35, z], [-4.08, 1.35, z]], [0, 0, s], 0.8); // white stripe along cab and body
      // wheel arches (dark patches behind the wheels)
      m.mat(M_DARK); for (const x of [3.0, -2.2, -3.4]) p5face(m, [[x - 0.62, 0.8, z], [x + 0.62, 0.8, z], [x + 0.62, 1.1, z], [x - 0.62, 1.1, z]], [0, 0, s], 0.4);
      // ribbed roller shutters
      for (const [x0, x1] of [[-3.9, -2.55], [-2.45, -1.1], [-1.0, 0.35], [0.45, 2.3]]) {
        m.mat(M_METAL); p5face(m, [[x0, 1.45, zr], [x1, 1.45, zr], [x1, 2.65, zr], [x0, 2.65, zr]], [0, 0, s], 0.75);
        m.mat(M_DARK); for (let j = 0; j < 6; j++) { const y = 1.5 + j * 0.2; p5face(m, [[x0 + 0.04, y, zr + s * 0.004], [x1 - 0.04, y, zr + s * 0.004], [x1 - 0.04, y + 0.035, zr + s * 0.004], [x0 + 0.04, y + 0.035, zr + s * 0.004]], [0, 0, s], 0.6); }
      }
      // wheels: front axle and two rear axles
      for (const x of [3.0, -2.2, -3.4]) p6wheel(m, x, 0.5, s * 0.98, s * 1.28, 0.5, 10, 0.28, 8, 0.015);
    }
    // roof ladder with two rails, rungs and three saddles
    m.mat(M_DARK); for (const x of [-3.5, -0.8, 1.8]) m.box(x - 0.05, 2.95, -0.45, x + 0.05, 3.06, 0.45, 4);
    m.mat(M_METAL);
    for (const s of zz) m.bar([-3.9, 3.1, s * 0.38], [2.2, 3.1, s * 0.38], 0.05, 0.09);
    for (let x = -3.7; x < 2.15; x += 0.45) p6rod(m, [x, 3.1, -0.38], [x, 3.1, 0.38], 0.018, 3);
    // blue beacons on the cab roof
    m.mat(M_DARK).box(3.35, 3.0, -0.85, 3.85, 3.05, 0.85, 4, 0.8, 1);
    m.mat(M_LENS).box(3.45, 3.05, -0.725, 3.75, 3.19, -0.375); m.box(3.45, 3.05, 0.375, 3.75, 3.19, 0.725);
    return { m, beacons: [[3.6, 3.12, -0.55], [3.6, 3.12, 0.55]] };
  },

  policecar() { // modern police saloon 4.7 x 1.8 x 1.45 m (x +-2.35), nose +x; M_PAINT body, white (M_CONC) band along the doors, light bar 1.2 x 0.3 x 0.12 on the roof (x -0.35..-0.05, y 1.45..1.57, M_DARK housing with an M_LENS half each side); {m, bar: [[-0.2, 1.52, -0.31], [-0.2, 1.52, 0.31]]} the left (z < 0) and right half centres
    const m = new Mesh(), zz = [-1, 1];
    m.mat(M_PAINT).box(-2.3, 0.3, -0.9, 2.3, 0.88, 0.9, 4, 0.5, 0.95); // lower body
    m.mat(M_GLASS); p5frus(m, -0.2, 0, 0.88, 1.35, 0.88, 1.4, 0.95, 0.78, 0.8, 1, false); // glasshouse
    m.mat(M_PAINT); p5frus(m, -0.2, 0, 1.4, 0.95, 0.78, 1.45, 0.9, 0.75, 1, 1, true); // roof slab
    m.mat(M_DARK).box(2.3, 0.3, -0.88, 2.35, 0.45, 0.88, 4 | 1); m.box(-2.35, 0.3, -0.88, -2.3, 0.45, 0.88, 4 | 2); // bumpers
    m.box(2.3, 0.5, -0.4, 2.345, 0.6, 0.4, 1 | 4); // grille
    m.mat(M_LENS).box(2.3, 0.62, 0.5, 2.35, 0.74, 0.86, 1); m.box(2.3, 0.62, -0.86, 2.35, 0.74, -0.5, 1);
    m.mat(M_RED).box(-2.35, 0.62, 0.5, -2.3, 0.74, 0.86, 2); m.box(-2.35, 0.62, -0.86, -2.3, 0.74, -0.5, 2);
    m.mat(M_CONC).box(2.3, 0.4, -0.22, 2.34, 0.5, 0.22, 1 | 4); m.box(-2.34, 0.45, -0.22, -2.3, 0.55, 0.22, 2 | 4); // plates
    for (const s of zz) {
      const z = s * 0.902;
      m.mat(M_CONC); p5face(m, [[-1.0, 0.66, z], [1.0, 0.66, z], [1.0, 0.82, z], [-1.0, 0.82, z]], [0, 0, s], 0.9); // door band
      m.mat(M_DARK); for (const x of [1.45, -1.45]) p5face(m, [[x - 0.45, 0.3, z], [x + 0.45, 0.3, z], [x + 0.45, 0.62, z], [x - 0.45, 0.62, z]], [0, 0, s], 0.4);
      m.box(0.7, 0.98, s * 0.86, 0.82, 1.06, s * 0.99); // mirror
      for (const x of [1.45, -1.45]) p6wheel(m, x, 0.33, s * 0.7, s * 0.915, 0.33, 12, 0.19, 10, 0.012);
    }
    m.mat(M_DARK).box(-0.35, 1.45, -0.6, -0.05, 1.57, 0.6, 4);
    m.mat(M_LENS).box(-0.34, 1.47, -0.58, -0.06, 1.575, -0.04, 4); m.box(-0.34, 1.47, 0.04, -0.06, 1.575, 0.58, 4);
    return { m, bar: [[-0.2, 1.52, -0.31], [-0.2, 1.52, 0.31]] };
  },

  wolf() { // grey wolf 1.3 m nose to tail end along z (nose z 0.69, tail end z -0.61), 0.82 m at the shoulder, head +z, M_TINT fur, dark nose; four thin legs (x +-0.1, front z ~0.35, back z ~-0.35) are the only geometry below y 0.42, everything else stays above; {m, hip: 0.42}
    const m = new Mesh().mat(M_TINT);
    p6zloft(m, [p6Z(-0.52, 0.6, 0.09, 0.1, 0, 0.8), p6Z(-0.4, 0.62, 0.14, 0.17, 0, 0.85), p6Z(-0.1, 0.63, 0.13, 0.16), p6Z(0.2, 0.63, 0.16, 0.19), p6Z(0.38, 0.62, 0.13, 0.17), p6Z(0.46, 0.64, 0.1, 0.12)], 8, true, false);
    p6zloft(m, [p6Z(0.4, 0.69, 0.1, 0.11), p6Z(0.52, 0.73, 0.105, 0.105), p6Z(0.58, 0.71, 0.06, 0.06), p6Z(0.66, 0.69, 0.035, 0.035)], 6, false, true);
    p6ear(m, 0.07, 0.5, 0.78, 0.92, 0.035); p6ear(m, -0.07, 0.5, 0.78, 0.92, 0.035);
    m.tube([[0, 0.66, -0.48], [0, 0.6, -0.54], [0, 0.52, -0.58]], (k) => [0.035, 0.055, 0.03][k], 6, 2);
    m.mat(M_DARK); p2ball(m, 0, 0.69, 0.665, 0.022, 2, 6);
    m.mat(M_TINT);
    const ao = (k) => [0.8, 0.65, 0.55, 0.5][k];
    for (const [x, z] of [[0.1, 0.31], [-0.1, 0.39]]) m.tube([[x, 0.58, z], [x, 0.3, z + 0.01], [x, 0, z + 0.03]], (k) => [0.045, 0.032, 0.025][k], 6, 2, (k) => [0.8, 0.6, 0.5][k]);
    for (const [x, z] of [[0.1, -0.37], [-0.1, -0.33]]) m.tube([[x, 0.62, z + 0.02], [x, 0.38, z + 0.05], [x, 0.17, z - 0.02], [x, 0, z]], (k) => [0.07, 0.05, 0.03, 0.025][k], 6, 2, ao);
    return { m, hip: 0.42 };
  },

  fox() { // red fox 0.95 m long (nose z 0.5, rump z -0.45) plus a big bushy tail to z -0.9 (white tip), 0.39 m at the shoulder, head +z, M_TINT fur, white chest and tail tip (M_CONC), dark ears, nose and lower legs (M_DARK); thin legs (x +-0.06, front z 0.17, back z -0.22) are the only geometry below y 0.2; {m, hip: 0.2}
    const m = new Mesh().mat(M_TINT);
    p6zloft(m, [p6Z(-0.42, 0.28, 0.055, 0.06, 0, 0.8), p6Z(-0.3, 0.295, 0.08, 0.085, 0, 0.85), p6Z(-0.05, 0.29, 0.075, 0.075), p6Z(0.15, 0.3, 0.085, 0.09), p6Z(0.26, 0.29, 0.07, 0.08)], 8, true, false);
    p6zloft(m, [p6Z(0.22, 0.32, 0.06, 0.065), p6Z(0.3, 0.33, 0.065, 0.065), p6Z(0.4, 0.31, 0.03, 0.03), p6Z(0.5, 0.3, 0.015, 0.015)], 6, false, true);
    m.tube([[0, 0.31, -0.42], [0, 0.34, -0.58], [0, 0.32, -0.72]], (k) => [0.035, 0.075, 0.075][k], 7, 0);
    m.mat(M_CONC); m.tube([[0, 0.32, -0.72], [0, 0.29, -0.82], [0, 0.26, -0.9]], (k) => [0.075, 0.06, 0.02][k], 7, 2);
    p2ball(m, 0, 0.27, 0.22, 0.06, 3, 6);
    m.mat(M_DARK); p6ear(m, 0.04, 0.3, 0.37, 0.46, 0.03); p6ear(m, -0.04, 0.3, 0.37, 0.46, 0.03); p2ball(m, 0, 0.3, 0.5, 0.014, 2, 5);
    for (const [x, z] of [[0.06, 0.17], [-0.06, 0.17], [0.06, -0.22], [-0.06, -0.22]]) {
      m.mat(M_TINT).tube([[x, 0.29, z], [x, 0.2, z]], 0.032, 5, 0, () => 0.8);
      m.mat(M_DARK).tube([[x, 0.2, z], [x, 0.1, z + 0.005], [x, 0, z + 0.015]], (k) => [0.03, 0.022, 0.02][k], 5, 2, (k) => [0.7, 0.55, 0.5][k]);
    }
    return { m, hip: 0.2 };
  },

  arcticfox() { // white arctic fox, 0.8 m long (nose z 0.45, rump z -0.35) plus a fluffy tail to z -0.7, 0.3 m at the shoulder, head +z, round and short eared, all M_CONC, dark eyes and nose (M_DARK); thin legs (x +-0.05, front z 0.13, back z -0.17) are the only geometry below y 0.16; {m, hip: 0.16}
    const m = new Mesh().mat(M_CONC);
    p6zloft(m, [p6Z(-0.35, 0.235, 0.06, 0.065, 0, 0.85), p6Z(-0.25, 0.245, 0.105, 0.08), p6Z(-0.02, 0.245, 0.1, 0.075), p6Z(0.13, 0.25, 0.105, 0.085), p6Z(0.24, 0.245, 0.085, 0.075)], 8, true, false);
    p6zloft(m, [p6Z(0.18, 0.27, 0.07, 0.07), p6Z(0.27, 0.28, 0.075, 0.07), p6Z(0.36, 0.265, 0.035, 0.035), p6Z(0.45, 0.255, 0.016, 0.016)], 6, false, true);
    m.tube([[0, 0.25, -0.33], [0, 0.26, -0.5], [0, 0.22, -0.67]], (k) => [0.04, 0.085, 0.05][k], 7, 2);
    p6ear(m, 0.045, 0.2, 0.33, 0.38, 0.03); p6ear(m, -0.045, 0.2, 0.33, 0.38, 0.03);
    m.mat(M_DARK); p2ball(m, 0, 0.255, 0.455, 0.013, 2, 5);
    p2ball(m, 0.04, 0.29, 0.3, 0.009, 2, 5); p2ball(m, -0.04, 0.29, 0.3, 0.009, 2, 5);
    m.mat(M_CONC);
    for (const [x, z] of [[0.05, 0.13], [-0.05, 0.13], [0.05, -0.17], [-0.05, -0.17]]) m.tube([[x, 0.23, z], [x, 0.1, z + 0.004], [x, 0, z + 0.012]], (k) => [0.032, 0.022, 0.02][k], 5, 2, (k) => [0.8, 0.6, 0.5][k]);
    return { m, hip: 0.16 };
  },

  hare() { // white mountain hare crouched mid-hop, 0.5 m long (z -0.25..0.26), 0.3 m high, head +z, ears 0.13 m laid back with dark tips (M_DARK), big folded hind legs, M_CONC body and M_DARK eyes; returns the Mesh
    const m = new Mesh().mat(M_CONC);
    p6zloft(m, [p6Z(-0.22, 0.12, 0.07, 0.08, 0, 0.8), p6Z(-0.12, 0.15, 0.12, 0.13), p6Z(0.05, 0.14, 0.1, 0.11), p6Z(0.14, 0.15, 0.08, 0.09)], 8, true, false);
    p6zloft(m, [p6Z(0.1, 0.19, 0.06, 0.07), p6Z(0.2, 0.2, 0.065, 0.07), p6Z(0.26, 0.18, 0.025, 0.03)], 7, false, true);
    for (const s of [-1, 1]) {
      m.mat(M_CONC).tube([[s * 0.04, 0.25, 0.18], [s * 0.05, 0.285, 0.09]], 0.02, 3, 1);
      m.mat(M_DARK).tube([[s * 0.05, 0.285, 0.09], [s * 0.055, 0.3, 0.055]], 0.02, 3, 2);
      m.mat(M_CONC); p2ball(m, s * 0.1, 0.1, -0.12, 0.08, 3, 7, 0.9, 0.6); // folded haunch
      m.box(s * 0.1 - 0.03, 0, -0.22, s * 0.1 + 0.03, 0.035, -0.02, 4, 0.6, 1); // hind foot
      m.tube([[s * 0.05, 0.12, 0.13], [s * 0.05, 0.01, 0.16]], 0.025, 4, 2, (k) => [0.9, 0.6][k]);
      m.mat(M_DARK); p2ball(m, s * 0.052, 0.215, 0.235, 0.011, 2, 5);
    }
    m.mat(M_CONC); p2ball(m, 0, 0.14, -0.22, 0.03, 2, 6);
    return m;
  },

  bouncer() { // big security man 1.9 m, shoulders 0.76 m wide, black bomber jacket and trousers (M_DARK), arms crossed over the chest, shaved head with neck and hands as separate M_CONC skin parts, facing +z; returns the Mesh
    const m = new Mesh().mat(M_DARK);
    p2loft(m, [p2R(0.78, 0.27, 0.2, 0, 0, 0.6), p2R(1.05, 0.29, 0.21), p2R(1.32, 0.37, 0.22, 0, 0.01), p2R(1.5, 0.38, 0.2, 0, 0.01), p2R(1.6, 0.2, 0.13), p2R(1.65, 0.1, 0.09)], 10, true, true);
    m.mat(M_CONC); p6rod(m, [0, 1.62, 0], [0, 1.72, 0.01], 0.07, 6);
    p6head(m, 0, 1.785, 0.02, 0.1, 10, 5);
    p6arm(m, [0.38, 1.48, 0], [0.36, 1.2, 0.16], [-0.14, 1.33, 0.26], M_DARK, 0.075, 0.05);
    p6arm(m, [-0.38, 1.48, 0], [-0.36, 1.2, 0.22], [0.14, 1.36, 0.31], M_DARK, 0.075, 0.05);
    p5legs(m, 0.95, 0.11, 1.25);
    return m;
  },

  smoker() { // man standing 1.78 m in a short winter jacket (M_TINT) and dark beanie, right hand (x > 0) raised to the mouth with a cigarette, left hand in the jacket pocket, facing +z; {m, ember: [0.035, 1.555, 0.275]} the cigarette tip (small M_RED stub)
    const m = new Mesh().mat(M_TINT);
    p2loft(m, [p2R(0.84, 0.25, 0.19, 0, 0, 0.6), p2R(1.05, 0.235, 0.17), p2R(1.28, 0.225, 0.16), p2R(1.42, 0.24, 0.15), p2R(1.5, 0.16, 0.12), p2R(1.55, 0.07, 0.07)], 8, true, true);
    m.mat(M_CONC); p6rod(m, [0, 1.53, 0], [0, 1.6, 0.03], 0.055, 6);
    p6head(m, 0, 1.665, 0.07);
    m.mat(M_DARK); p2loft(m, [p2R(1.62, 0.1, 0.1, 0, 0.07), p2R(1.68, 0.104, 0.104, 0, 0.06), p2R(1.76, 0.085, 0.085, 0, 0.05), p2R(1.785, 0.04, 0.04, 0, 0.05)], 8, false, true);
    p6arm(m, [0.22, 1.4, 0], [0.3, 1.2, 0.1], [0.08, 1.47, 0.2], M_TINT);
    p6arm(m, [-0.22, 1.4, 0], [-0.27, 1.15, 0.01], [-0.21, 0.93, 0.12], M_TINT);
    m.mat(M_CONC); p6rod(m, [0.07, 1.505, 0.2], [0.035, 1.55, 0.265], 0.008, 3);
    m.mat(M_RED); p6rod(m, [0.035, 1.55, 0.265], [0.03, 1.555, 0.275], 0.01, 3);
    p5legs(m, 1.0);
    return { m, ember: [0.035, 1.555, 0.275] };
  },

  girl() { // young woman 1.68 m, short puffy jacket (M_TINT, hem y 0.88), tight dark trousers, long hair down the back (M_BARK), both hands holding a phone at chest height (M_DARK body with a small M_LAMP screen facing back at her, -z), facing +z; {m, phone: [0, 1.24, 0.293]} the screen centre
    const m = new Mesh().mat(M_TINT);
    p2loft(m, [p2R(0.88, 0.21, 0.16, 0, 0, 0.6), p2R(0.98, 0.225, 0.17), p2R(1.08, 0.2, 0.15), p2R(1.18, 0.22, 0.16), p2R(1.3, 0.2, 0.15), p2R(1.4, 0.2, 0.14), p2R(1.47, 0.1, 0.09)], 8, true, true);
    m.mat(M_CONC); p6rod(m, [0, 1.43, 0], [0, 1.5, 0.02], 0.05, 6);
    p6head(m, 0, 1.57, 0.06, 0.09);
    m.mat(M_BARK); p2loft(m, [p2R(1.675, 0.07, 0.07, 0, 0.05), p2R(1.62, 0.105, 0.105, 0, 0.02), p2R(1.54, 0.108, 0.11, 0, 0.0), p2R(1.44, 0.1, 0.075, 0, -0.1), p2R(1.33, 0.075, 0.045, 0, -0.13)], 8, false, true);
    p6arm(m, [0.19, 1.37, 0], [0.24, 1.12, 0.1], [0.05, 1.2, 0.31], M_TINT, 0.05, 0.04);
    p6arm(m, [-0.19, 1.37, 0], [-0.24, 1.12, 0.08], [-0.05, 1.19, 0.29], M_TINT, 0.05, 0.04);
    m.mat(M_DARK).box(-0.035, 1.17, 0.295, 0.035, 1.31, 0.305);
    m.mat(M_LAMP); p5face(m, [[-0.028, 1.18, 0.294], [0.028, 1.18, 0.294], [0.028, 1.3, 0.294], [-0.028, 1.3, 0.294]], [0, 0, -1], 1);
    p5legs(m, 0.93, 0.085, 0.85);
    return { m, phone: [0, 1.24, 0.293] };
  },

  talkers() { // two people face to face 1 m apart, about 1050 tris: a man (1.78 m, jacket, short dark hair) at z -0.5 facing +z gesturing with his right hand raised, and a woman (1.65 m, long coat hem 0.55, hair up) at z +0.5 facing -z with both hands at her waist; M_TINT clothes; returns the Mesh
    const m = new Mesh();
    // man
    m.at(0, 0, -0.5, 0).mat(M_TINT);
    p2loft(m, [p2R(0.8, 0.26, 0.19, 0, 0, 0.6), p2R(1.05, 0.235, 0.17), p2R(1.3, 0.225, 0.16), p2R(1.43, 0.25, 0.15), p2R(1.52, 0.15, 0.11), p2R(1.56, 0.07, 0.07)], 8, true, true);
    m.mat(M_CONC); p6rod(m, [0, 1.54, 0], [0, 1.62, 0.03], 0.055, 6);
    p6head(m, 0, 1.68, 0.06);
    m.mat(M_DARK); p2loft(m, [p2R(1.68, 0.1, 0.1, 0, 0.04), p2R(1.76, 0.085, 0.085, 0, 0.03), p2R(1.79, 0.04, 0.04, 0, 0.03)], 8, false, true);
    p6arm(m, [0.23, 1.42, 0], [0.32, 1.2, 0.15], [0.2, 1.46, 0.38], M_TINT);
    p6arm(m, [-0.23, 1.42, 0], [-0.27, 1.12, 0.04], [-0.24, 0.88, 0.12], M_TINT);
    p5legs(m, 1.0);
    // woman
    m.at(0, 0, 0.5, PI).mat(M_TINT);
    p2loft(m, [p2R(0.55, 0.27, 0.21, 0, 0, 0.6), p2R(0.95, 0.2, 0.15, 0, 0.0), p2R(1.2, 0.19, 0.14, 0, 0.02), p2R(1.34, 0.2, 0.13, 0, 0.02), p2R(1.42, 0.1, 0.09), p2R(1.46, 0.05, 0.05)], 8, true, true);
    m.mat(M_CONC); p6rod(m, [0, 1.44, 0], [0, 1.52, 0.02], 0.045, 6);
    p6head(m, 0, 1.58, 0.05, 0.088);
    m.mat(M_BARK); p2loft(m, [p2R(1.68, 0.06, 0.06, 0, 0.0), p2R(1.62, 0.1, 0.1, 0, 0.0), p2R(1.55, 0.103, 0.105, 0, -0.03), p2R(1.5, 0.07, 0.06, 0, -0.1), p2R(1.46, 0.05, 0.05, 0, -0.12)], 8, false, true);
    p6arm(m, [0.19, 1.35, 0], [0.25, 1.1, 0.04], [0.22, 0.86, 0.1], M_TINT, 0.05, 0.04);
    p6arm(m, [-0.19, 1.35, 0], [-0.24, 1.1, 0.1], [-0.06, 1.04, 0.26], M_TINT, 0.05, 0.04);
    p5legs(m, 0.85, 0.085, 0.9);
    m.at(0, 0, 0, 0);
    return m;
  },

  trucker() { // heavy man 1.8 m: sheepskin vest (M_TINT) over a check shirt (M_RED, shows in the front opening and the sleeves), dark cap with a brim, holding a paper cup (M_CONC) at (0.2, 1.23, 0.37) in his right hand (x > 0), facing +z; {m, cup: [0.2, 1.29, 0.37]} top of the cup
    const m = new Mesh().mat(M_RED);
    const R = [p2R(0.85, 0.3, 0.24, 0, 0, 0.6), p2R(1.05, 0.33, 0.26), p2R(1.25, 0.33, 0.24), p2R(1.42, 0.35, 0.2), p2R(1.52, 0.17, 0.13), p2R(1.56, 0.08, 0.08)];
    p2loft(m, R, 8, true, true);
    const V = [p2R(0.9, 0.325, 0.265, 0, 0, 0.6), p2R(1.05, 0.355, 0.285), p2R(1.25, 0.355, 0.265), p2R(1.44, 0.37, 0.225)];
    m.mat(M_TINT); p2loft(m, V, 8, false, false);
    m.mat(M_RED);
    for (let k = 0; k < V.length - 1; k++) {
      const a = V[k], b = V[k + 1], fz = (r) => r.cz + r.rz * sqrt(1 - (0.07 / r.rx) ** 2) + 0.012;
      p5face(m, [[-0.07, a.y, fz(a)], [0.07, a.y, fz(a)], [0.07, b.y, fz(b)], [-0.07, b.y, fz(b)]], [0, 0, 1], [a.ao, a.ao, b.ao, b.ao]);
    }
    m.mat(M_CONC); p6rod(m, [0, 1.54, 0], [0, 1.63, 0.03], 0.075, 6);
    p6head(m, 0, 1.68, 0.06, 0.105);
    m.mat(M_DARK); p2loft(m, [p2R(1.7, 0.118, 0.118, 0, 0.05), p2R(1.76, 0.108, 0.108, 0, 0.05), p2R(1.8, 0.06, 0.06, 0, 0.05)], 8, false, true);
    p5face(m, [[-0.09, 1.725, 0.16], [0.09, 1.725, 0.16], [0.075, 1.725, 0.26], [-0.075, 1.725, 0.26]], [0, 1, 0], 0.9);
    p6arm(m, [0.31, 1.42, 0], [0.37, 1.15, 0.12], [0.2, 1.21, 0.36], M_RED, 0.065, 0.048);
    p6arm(m, [-0.31, 1.42, 0], [-0.35, 1.15, 0.04], [-0.31, 0.9, 0.1], M_RED, 0.065, 0.048);
    m.mat(M_CONC); p5frus(m, 0.2, 0.37, 1.19, 0.03, 0.03, 1.29, 0.04, 0.04, 0.9, 1, true);
    p5legs(m, 1.0, 0.1, 1.2);
    return { m, cup: [0.2, 1.29, 0.37] };
  },

  skier() { // pair of skis 1.78 m (M_TINT, each 0.07 wide, x -0.06 and 0.06) standing on y 0 leaning on a wall at z = 0 (feet z 0.14, tops z 0.045 and tips up to y 1.78), bindings (M_DARK), and two poles (M_METAL, baskets and grips M_DARK) at x 0.22 and 0.28 reaching y 1.42; returns the Mesh
    const m = new Mesh();
    for (const x of [-0.06, 0.06]) {
      m.mat(M_TINT).bar([x, 0, 0.14], [x, 1.62, 0.045], 0.015, 0.07, 0.8);
      m.bar([x, 1.62, 0.045], [x, 1.78, 0.075], 0.015, 0.07, 1);
      m.mat(M_DARK).box(x - 0.03, 0.78, 0.082, x + 0.03, 0.9, 0.11);
    }
    for (const x of [0.22, 0.28]) {
      m.mat(M_METAL); p6rod(m, [x, 0, 0.17], [x, 1.42, 0.04], 0.008, 3);
      m.mat(M_DARK); p5frus(m, x, 0.165, 0.05, 0.06, 0.06, 0.075, 0.012, 0.012, 0.5, 0.8, false);
      m.tube([[x, 1.28, 0.053], [x, 1.42, 0.04]], 0.015, 4, 3);
    }
    return m;
  },

  newyeartree() { // the town's New Year spruce, 14 m with the star: 9 stacked drooping tiers (M_GRN octagonal skirts with a jagged 16-point rim, rim radius 3.7 down to 0.65, rims y 0.7..10.7, apex y 13.1) on a bark trunk, a low octagonal fence (M_METAL, radius 4.2, height 1.0) and a 5-point star (M_RED, outer radius 0.5, 0.12 thick) at the top; {m, star: [0, 13.45, 0]}
    const m = new Mesh();
    m.mat(M_BARK).tube([[0, 0, 0], [0, 13.2, 0]], (k) => [0.4, 0.05][k], 6, 0, (k) => [0.5, 0.9][k]);
    m.mat(M_GRN);
    for (let i = 0; i < 9; i++) {
      const u = i / 8, R = mix(3.7, 0.65, pow(u, 0.85)), y0 = mix(0.7, 10.7, u), y1 = y0 + 2.4, rot = (i % 2) * PI / 8 + i * 0.2, ao = mix(0.5, 0.9, u), ring = [];
      for (let j = 0; j <= 16; j++) {
        const a = rot + j / 16 * TAU, tip = j % 2 === 0, r = tip ? R : R * 0.8;
        ring.push([cos(a) * r, y0 + (tip ? -0.18 : 0.12), sin(a) * r]);
      }
      for (let j = 0; j < 16; j++) {
        const a = ring[j], b = ring[j + 1];
        p5face(m, [[0, y1, 0], a, b], [(a[0] + b[0]) / 2, 0.8, (a[2] + b[2]) / 2], [1, ao, ao]);
        p5face(m, [a, b, [0, y0 + 0.9, 0]], [0, -1, 0], [0.35, 0.35, 0.3]);
      }
    }
    // fence
    m.mat(M_METAL);
    const post = []; for (let k = 0; k < 8; k++) { const a = k * PI / 4; post.push([cos(a) * 4.2, sin(a) * 4.2]); }
    for (const [x, z] of post) m.box(x - 0.05, 0, z - 0.05, x + 0.05, 1.0, z + 0.05, 4, 0.6, 1);
    for (let k = 0; k < 8; k++) { const a = post[k], b = post[(k + 1) % 8]; for (const y of [0.35, 0.9]) p6rod(m, [a[0], y, a[1]], [b[0], y, b[1]], 0.025, 3, y < 0.5 ? 0.7 : 1); }
    // star
    m.mat(M_RED);
    const st = []; for (let k = 0; k < 10; k++) { const a = PI / 2 + k * PI / 5, r = k % 2 === 0 ? 0.5 : 0.2; st.push([cos(a) * r, 13.45 + sin(a) * r]); }
    for (let k = 0; k < 10; k++) {
      const a = st[k], b = st[(k + 1) % 10];
      p5face(m, [[0, 13.45, 0.06], [a[0], a[1], 0.06], [b[0], b[1], 0.06]], [0, 0, 1], 1);
      p5face(m, [[0, 13.45, -0.06], [a[0], a[1], -0.06], [b[0], b[1], -0.06]], [0, 0, -1], 1);
      p5face(m, [[a[0], a[1], -0.06], [b[0], b[1], -0.06], [b[0], b[1], 0.06], [a[0], a[1], 0.06]], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 13.45, 0], 1);
    }
    return { m, star: [0, 13.45, 0] };
  },

  forestSpruce() { // cheap forest spruce for thousands of copies, 10 m, axis x = z = 0: 5-sided bark trunk (y 0..9) and 6 stacked drooping M_BARK cone skirts (7 sides, rim radius 2.4 down to 0.6, rims y 1.8..7.4, each apex 2.6 above its rim, top apex y 10.0) with dished undersides; shade of every vertex = sway weight clamp(y / 10) * 0.5 + clamp(r / 2.4) * 0.5 (0 at the trunk base); returns the Mesh
    const m = new Mesh(), H = 10, RM = 2.4, trunk = [[0, 0, 0], [0, 4, 0], [0, 9, 0]];
    m.mat(M_BARK).tube(trunk, (k) => [0.22, 0.15, 0.06][k], 5, 0, (k) => p6sway(trunk[k][1], 0, H, RM));
    m.mat(M_BARK);
    for (let i = 0; i < 6; i++) { const u = i / 5; p6cone(m, mix(1.8, 7.4, u), mix(2.4, 0.6, u), mix(1.8, 7.4, u) + 2.6, 7, i * 0.9, H, RM); }
    return m;
  },

  forestBirch() { // cheap bare birch for thousands of copies, 9 m: 5-sided white-bark trunk (M_BARK) swaying slightly, 7 three-sided boughs (y 3.4..7.9) up and out in a spiral, 5 twigs on the bough tips; shade = sway weight clamp(y / 9) * 0.5 + clamp(r / 3.2) * 0.5 (0 at the base, 1 at the twig tips); returns the Mesh
    const m = new Mesh().mat(M_BARK), H = 9, RM = 3.2;
    const w = (p) => p6sway(p[1], hypot(p[0], p[2]), H, RM);
    const trunk = [[0, 0.01, 0], [0.12, 2.2, 0.05], [-0.05, 4.6, 0.1], [0.1, 6.9, -0.05], [0.02, 9, 0]];
    m.tube(trunk, (k) => [0.15, 0.12, 0.09, 0.06, 0.02][k], 5, 0, (k) => w(trunk[k]));
    const at = (y) => { const k = min(3, y / 2.3 | 0), t = (y - k * 2.3) / 2.3; return [mix(trunk[k][0], trunk[k + 1][0], t), mix(trunk[k][2], trunk[k + 1][2], t)]; };
    const tips = [];
    for (let i = 0; i < 7; i++) {
      const y = 3.4 + i * 0.75, a = i * 2.4, len = 1.9 - i * 0.18, [sx, sz] = at(y);
      const p = [[sx, y, sz], [sx + cos(a) * len, y + len * 0.95, sz + sin(a) * len]];
      m.tube(p, (k) => [0.045, 0.018][k], 3, 0, (k) => w(p[k]));
      tips.push([p[1], a]);
    }
    for (const i of [0, 2, 3, 5, 6]) {
      const [t, a] = tips[i], p = [t, [t[0] + cos(a + 0.9) * 0.7, t[1] + 0.35, t[2] + sin(a + 0.9) * 0.7]];
      m.tube(p, (k) => [0.02, 0.008][k], 3, 0, (k) => w(p[k]));
    }
    return m;
  },

  farTree() { // far version of forestSpruce, 10 m: 3-sided bark stub trunk (y 0..2.5) and two stacked 6-sided M_BARK cones (rims y 1.6 / 4.8, radius 2.2 / 1.5, apexes y 6.4 / 10.0) with undersides; shade = sway weight clamp(y / 10) * 0.5 + clamp(r / 2.4) * 0.5; returns the Mesh
    const m = new Mesh(), H = 10, RM = 2.4, trunk = [[0, 0, 0], [0, 2.5, 0]];
    m.mat(M_BARK).tube(trunk, 0.25, 3, 0, (k) => p6sway(trunk[k][1], 0, H, RM));
    m.mat(M_BARK);
    p6cone(m, 1.6, 2.2, 6.4, 6, 0.3, H, RM); p6cone(m, 4.8, 1.5, 10, 6, 0, H, RM);
    return m;
  },
};
