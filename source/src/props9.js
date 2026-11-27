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
