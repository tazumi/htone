// ============================================================================
// props9: snow on the ground, the new places of the town and their people (plain script, after props8.js)
// ============================================================================
// Each entry returns a Mesh, or { m, ...anchor points }. The comment on each says its size, origin and front.
// Palette 16 on a tinted surface (M_TINT) is snow: the solid shader paints it white all over, not only on top.
const SNOWPAL = 16;

// a field of heights over a rectangle: f(u, v) with u, v in 0..1 gives the height; the edges lie on the ground
function p9field(m, x0, z0, x1, z1, nu, nv, f, H) {
  const id = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = i / nu, v = j / nv, h = i && j && i < nu && j < nv ? f(u, v) : 0;
    id.push(m.v(mix(x0, x1, u), h, mix(z0, z1, v), mix(0.55, 1, min(1, h / max(H * 0.6, 0.05)))));
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i; m.quad(a, a + nu + 1, a + nu + 2, a + 1); }
}

const PROPS9 = {
  // a drift blown against a wall: L long along x (centred), W deep along +z from the wall at z 0, H high; it leans on
  // the wall with a steep face there and runs out in a long tail
  drift(L = 8, W = 2, H = 0.55, sd = 1) {
    rseed(900 + sd); const m = new Mesh().mat(M_TINT), ph = [rr(0, TAU), rr(0, TAU), rr(0, TAU), rr(0, TAU)];
    const f = (u, v) => {
      const along = pow(sin(PI * u), 0.55) * (0.8 + 0.2 * sin(u * 9 + ph[0]) + 0.1 * sin(u * 23 + ph[1]));
      const across = v < 0.18 ? sstep(0, 0.18, v) * 0.85 + 0.15 * v / 0.18 : pow((1 - v) / 0.82, 1.35);
      return H * along * across * (1 + 0.12 * sin(u * 31 + v * 7 + ph[2]) * sin(v * 11 + ph[3]));
    };
    p9field(m, -L / 2, 0, L / 2, W, max(8, round(L * 2.2)), 10, f, H);
    return m;
  },
  // the bank the plough leaves along a street: L along x (centred), W across z (centred), H high, lumpy and broken
  berm(L = 10, W = 2, H = 0.9, sd = 1) {
    rseed(950 + sd); const m = new Mesh().mat(M_TINT), ph = [rr(0, TAU), rr(0, TAU), rr(0, TAU)];
    const f = (u, v) => {
      const along = pow(sin(PI * u), 0.4) * (0.75 + 0.25 * sin(u * 7 + ph[0]) * sin(u * 13 + ph[1]));
      const across = pow(sin(PI * v), 0.7);
      return H * along * across * (1 + 0.18 * sin(u * 37 + ph[2]) * sin(v * 9 + u * 5) + 0.08 * sin(u * 61 + v * 17));
    };
    p9field(m, -L / 2, -W / 2, L / 2, W / 2, max(8, round(L * 2.4)), 9, f, H);
    // a few broken lumps of packed snow on it
    for (let k = 0; k < L / 2.5; k++) { const x = rr(-L * 0.4, L * 0.4), u = x / L + 0.5, z = rr(-W * 0.2, W * 0.2), v = z / W + 0.5; p4mound(m, x, f(u, v) * 0.85, z, rr(0.15, 0.35), rr(0.12, 0.3), rr(0.12, 0.25), { sides: 6, rows: 2, lump: 0.3 }); }
    return m;
  },
};

// ---------------------------------------------------------------- more for the viewer's flat (looked up by name in PROPS7)
Object.assign(PROPS7, {
  bookcase() { // open bookcase 0.8 wide (x -0.4..0.4), 2.0 high, 0.32 deep (z 0..0.32), back against z = 0, five shelves of books,
    // a few things in front of them: a clock, a china figure, a photo, a box
    const m = new Mesh().mat(M_BARK), D = 0.32, ys = [0.06, 0.44, 0.8, 1.16, 1.52, 1.88];
    m.box(-0.4, 0, 0, -0.38, 2, D, 0, 0.6, 1); m.box(0.38, 0, 0, 0.4, 2, D, 0, 0.6, 1); m.box(-0.4, 1.98, 0, 0.4, 2, D, 0, 1, 1);
    m.box(-0.38, 0, 0, 0.38, 2, 0.01, 0, 0.5, 0.8);
    for (const y of ys) m.box(-0.38, y - 0.02, 0, 0.38, y, D, 0, 0.7, 1);
    ys.slice(0, 5).forEach((y, k) => p7books(m, -0.37 + (k & 1 ? 0.12 : 0), k === 2 ? 0.1 : 0.37, y, 0.02, D - 0.04, 0.3, k * 5 + 1));
    m.mat(M_YEL).box(0.16, 0.8, 0.12, 0.3, 0.92, 0.22, 4); m.mat(M_CONC); p7ring(m, 0.23, 0.17, [[0.92, 0.035], [0.95, 0.03]], 8); // a small clock
    m.mat(M_CONC); p7ring(m, -0.28, 0.2, [[0.44, 0.03], [0.5, 0.035], [0.56, 0.02], [0.6, 0.025], [0.63, 0.001]], 8); // a china dancer
    m.mat(M_BARK).box(0.18, 1.52, 0.18, 0.32, 1.7, 0.2, 4, 1, 1); m.mat(M_CONC).box(0.195, 1.535, 0.2, 0.305, 1.685, 0.203, 4); // a photo in a frame
    m.mat(M_RED).box(-0.36, 1.16, 0.06, -0.2, 1.24, 0.26, 4); // a box of letters
    return m;
  },
  guitar() { // an acoustic guitar leaning back against a wall at z = 0: the foot at the origin, 1.0 tall, 0.4 wide, face to +z
    const m = new Mesh(), tl = 0.16, P = (x, y, z) => [x, y * cos(tl), z - y * sin(tl) + 0.2];
    const bodyRing = (cy, r) => { const pts = []; for (let k = 0; k <= 14; k++) { const a = k / 14 * TAU; pts.push([cos(a) * r, cy + sin(a) * r]); } return pts; };
    // the body: two rounds side by side in depth (z), a soundhole on the front, the neck and the head
    for (const [cy, r] of [[0.2, 0.19], [0.44, 0.145]]) {
      m.mat(M_BARK); const R = bodyRing(cy, r);
      for (let k = 0; k < 14; k++) { const a = R[k], b = R[k + 1]; m.q4(P(a[0], a[1], -0.05), P(b[0], b[1], -0.05), P(b[0], b[1], 0.05), P(a[0], a[1], 0.05), 0.8); }
      m.mat(M_YEL); const c = m.v(...P(0, cy, 0.05)); const rim = R.map(([x, y]) => m.v(...P(x, y, 0.05))); for (let k = 0; k < 14; k++) m.tri(c, rim[k], rim[k + 1]);
      m.mat(M_DARK); const c2 = m.v(...P(0, cy, -0.05)); const rim2 = R.map(([x, y]) => m.v(...P(x, y, -0.05))); for (let k = 0; k < 14; k++) m.tri(c2, rim2[k + 1], rim2[k]);
    }
    m.mat(M_DARK); const h = bodyRing(0.37, 0.045).map(([x, y]) => m.v(...P(x, y, 0.052))), hc = m.v(...P(0, 0.37, 0.052)); for (let k = 0; k < 14; k++) m.tri(hc, h[k], h[k + 1]);
    m.mat(M_BARK); m.bar(P(0, 0.58, 0.03), P(0, 0.92, 0.03), 0.05, 0.03); m.mat(M_DARK).bar(P(0, 0.92, 0.025), P(0, 1.02, 0.02), 0.07, 0.025);
    m.mat(M_METAL); for (let k = -2; k <= 2; k++) m.bar(P(k * 0.007, 0.12, 0.055), P(k * 0.004, 0.92, 0.047), 0.0015, 0.0015);
    return m;
  },
  slippers() { // a pair of felt slippers on the floor, toes to +z, 0.3 long
    const m = new Mesh().mat(M_RED);
    for (const x of [-0.07, 0.07]) { m.box(x - 0.045, 0, -0.14, x + 0.045, 0.025, 0.14, 0, 0.7, 1); m.mat(M_TINT); p2loft(m, [p2R(0.025, 0.045, 0.07, x, 0.06), p2R(0.06, 0.035, 0.05, x, 0.07), p2R(0.07, 0.01, 0.01, x, 0.09)], 8, false, true); m.mat(M_RED); }
    return m;
  },
  sideboard() { // kitchen sideboard 1.2 wide (x -0.6..0.6), 0.85 high, 0.45 deep (z 0..0.45), back against z = 0; on it a microwave,
    // a bread bin, a radio, jars of grain; a shelf over it with plates standing
    const m = new Mesh().mat(M_TINT), D = 0.45;
    m.box(-0.6, 0.06, 0, 0.6, 0.85, D, 16, 0.5, 1); m.mat(M_DARK).box(-0.58, 0, 0.02, 0.58, 0.06, D - 0.03, 16);
    m.mat(M_CONC).box(-0.62, 0.85, 0, 0.62, 0.88, D + 0.02, 0, 1, 1);
    for (const x of [-0.3, 0.3]) { m.mat(M_TINT); p7panel(m, x - 0.28, 0.1, x + 0.28, 0.8, D); m.mat(M_METAL).box(x + (x < 0 ? 0.2 : -0.22), 0.6, D + 0.006, x + (x < 0 ? 0.22 : -0.2), 0.7, D + 0.02); }
    // the microwave
    m.mat(M_CONC).box(0.05, 0.88, 0.05, 0.55, 1.17, 0.4, 0, 0.7, 1); m.mat(M_GLASS).box(0.08, 0.92, 0.4, 0.4, 1.13, 0.404, 16); m.mat(M_DARK).box(0.43, 0.92, 0.4, 0.52, 1.13, 0.403, 16);
    m.mat(M_LAMP).box(0.45, 1.09, 0.403, 0.5, 1.11, 0.405, 16);
    // the bread bin with a loaf showing, the radio, the jars
    m.mat(M_RED).box(-0.55, 0.88, 0.08, -0.2, 1.06, 0.36, 0, 0.7, 1); m.mat(M_BARK); p2ball(m, -0.37, 1.07, 0.22, 0.08, 4, 8, 0.5);
    m.mat(M_BARK).box(-0.15, 0.88, 0.25, 0.02, 0.98, 0.32, 0, 0.7, 1); m.mat(M_DARK).box(-0.13, 0.9, 0.32, -0.04, 0.96, 0.322, 16); m.mat(M_METAL).bar([-0.13, 0.98, 0.29], [-0.18, 1.12, 0.27], 0.004);
    for (let k = 0; k < 3; k++) { const x = 0.28 + k * 0.095; m.mat(M_LENS); p7ring(m, x, 0.13, [[1.4, 0.04], [1.55, 0.04], [1.56, 0.03]], 8); m.mat(M_YEL); p7ring(m, x, 0.13, [[1.56, 0.033], [1.585, 0.033]], 8); }
    // the shelf on the wall above, plates on edge along its back
    m.mat(M_BARK).box(-0.6, 1.38, 0, 0.6, 1.4, 0.24, 0, 0.7, 1); for (const x of [-0.5, 0.5]) m.box(x - 0.01, 1.28, 0, x + 0.01, 1.38, 0.18, 0, 0.6, 1);
    m.mat(M_CONC); for (let k = 0; k < 5; k++) { const x = -0.2 + k * 0.1; m.tube([[x, 1.53, 0.04], [x, 1.53, 0.06]], 0.12, 12, 3); }
    return m;
  },
});

Object.assign(PROPS9, {
  // a window grille of the ground floor, the sun rising from the sill: W wide, H high, centred on x, from y 0 (the sill)
  // up, standing 0.06 off the wall at z 0
  grille(W = 1.55, H = 1.55) {
    const m = new Mesh().mat(M_METAL), z = 0.06, r = 0.012;
    m.sweep([[-W / 2, 0, z], [-W / 2, H, z], [W / 2, H, z], [W / 2, 0, z]], 0.025, 0.025, () => [0, 0, 1], true);
    m.bar([-W / 2, 0, z], [W / 2, 0, z], 0.025, 0.025);
    const c = [0, 0.02, z], R = H * 0.33;
    const arc = []; for (let k = 0; k <= 10; k++) { const a = k / 10 * PI; arc.push([cos(a) * R, 0.02 + sin(a) * R, z]); } m.tube(arc, r, 4, 0);
    for (let k = 1; k < 10; k++) {
      const a = k / 10 * PI, dx = cos(a), dy = sin(a), tx = dx > 0 ? (W / 2) / dx : dx < 0 ? (-W / 2) / dx : 1e9, ty = (H - 0.02) / dy, t = min(tx, ty);
      m.tube([[c[0] + dx * R, c[1] + dy * R, z], [c[0] + dx * t, c[1] + dy * t, z]], r, 4, 0);
    }
    for (const y of [H * 0.66]) m.tube([[-W / 2, y, z], [W / 2, y, z]], r, 4, 0);
    for (const x of [-W / 2, W / 2]) for (const y of [0.1, H - 0.1]) m.bar([x, y, 0], [x, y, z], 0.02, 0.02);
    return m;
  },
});
