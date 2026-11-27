// ============================================================================
// props9b: the new places of the town (plain script, after props9.js): five cottages of a rich settlement and a party in
// a marquee behind one of them, the forester's lodge with snowmobiles, a fire in the forest with nine travellers round it,
// a lorry broken down by the highway, the house of culture, the Christmas market and lights of the square
// ============================================================================
// The cottages return { m, W, lamps, door }: W the window panes [x, y, z, yaw, w, h] in their own frame, lamps the points
// of their lights outside, door the point in front of the front door. Front: +z unless said otherwise.

// walls of a box x0..x1, z0..z1 from y0 to y1; win: [face, centre along the face, centre y, w, h], face 0 +z, 1 +x, 2 -z,
// 3 -x (along a face its own x runs left to right seen from outside); the panes go to W
function p9walls(m, x0, z0, x1, z1, y0, y1, win, W, rec = 0.15, ao) {
  const F = [[(x0 + x1) / 2, z1, 0, (x1 - x0) / 2], [x1, (z0 + z1) / 2, PI / 2, (z1 - z0) / 2], [(x0 + x1) / 2, z0, PI, (x1 - x0) / 2], [x0, (z0 + z1) / 2, -PI / 2, (z1 - z0) / 2]];
  F.forEach(([ox, oz, a, hx], f) => {
    const ws = win.filter((w) => w[0] === f), holes = ws.map(([, u, y, w, h]) => [u - w / 2, y - h / 2, u + w / 2, y + h / 2]);
    m.at(ox, 0, oz, a); p3wall(m, -hx, hx, y0, y1, 0, holes, rec, ao || p3ao);
    for (const [, u, y, w, h] of ws) { const [px, pz] = rotY(u, -rec, a); W.push([ox + px, y, oz + pz, a, w, h]); }
  });
  m.at(0, 0, 0, 0);
}
// a gable roof over x0..x1 (ridge along x), z0..z1 from the eaves at y0 rising by r, overhanging by o; slab thickness t
function p9gable(m, x0, z0, x1, z1, y0, r, o = 0.5, t = 0.2) {
  const zc = (z0 + z1) / 2, k = r / ((z1 - z0) / 2), ye = y0 - o * k;
  for (const s of [-1, 1]) {
    const ze = s > 0 ? z1 + o : z0 - o;
    m.q4([x0 - o, ye, ze], [x1 + o, ye, ze], [x1 + o, y0 + r, zc], [x0 - o, y0 + r, zc].map((v) => v), 0.9);
    m.q4([x1 + o, ye - t, ze], [x0 - o, ye - t, ze], [x0 - o, y0 + r - t, zc], [x1 + o, y0 + r - t, zc], 0.6);
    m.q4([x0 - o, ye - t, ze], [x1 + o, ye - t, ze], [x1 + o, ye, ze], [x0 - o, ye, ze], 0.8);
  }
  for (const x of [x0 - o, x1 + o]) { m.q4([x, y0 - o * k - t, z0 - o], [x, y0 - o * k - t, z1 + o], [x, y0 - o * k, z1 + o], [x, y0 - o * k, z0 - o], 0.8); }
}
// the triangle of a gable end at x, from the eaves at y0 to y0 + r, z0..z1
function p9gableEnd(m, x, z0, z1, y0, r) { m.tri(m.v(x, y0, z0), m.v(x, y0, z1), m.v(x, y0 + r, (z0 + z1) / 2)); }
// merge a mesh built on its own into m, every vertex through f([x, y, z]) -> [x, y, z]
function p9merge(m, src, f) {
  const o = m.p.length / 3;
  for (let k = 0; k < src.p.length; k += 3) { const q = f([src.p[k], src.p[k + 1], src.p[k + 2]]); m.p.push(q[0], q[1], q[2]); }
  m.aux.push(...src.aux); for (const i of src.i) m.i.push(i + o);
}

const PROPS9B = {
  // ---------------------------------------------------------------- the cottages
  chalet() { // an alpine chalet 14 x 11: a stone ground floor, timber above, a wide low roof, a balcony across the gable (+z)
    const m = new Mesh(), W = [];
    m.mat(M_CONC).box(-7.2, 0, -5.7, 7.2, 0.5, 5.7, 4, 0.55, 1);
    m.mat(M_BRICK); p9walls(m, -7, -5.5, 7, 5.5, 0.5, 3.4, [[0, -4.5, 1.9, 2.2, 2.2], [0, 0, 1.9, 2.2, 2.2], [0, 4.5, 1.9, 2.2, 2.2], [1, -2, 1.9, 1.4, 1.4], [1, 2, 1.9, 1.4, 1.4], [3, 0, 1.9, 1.4, 1.4], [2, -3, 1.9, 1.4, 1.4]], W);
    m.mat(M_BARK); p9walls(m, -7, -5.5, 7, 5.5, 3.4, 6.0, [[0, -3, 4.7, 1.8, 1.8], [0, 0, 4.7, 1.8, 1.8], [0, 3, 4.7, 1.8, 1.8], [1, 0, 4.7, 1.4, 1.4], [3, 0, 4.7, 1.4, 1.4], [2, 3, 4.7, 1.4, 1.4]], W);
    // boards up the timber walls
    for (let x = -6.8; x < 7; x += 0.4) { m.box(x, 3.4, 5.5, x + 0.05, 6.0, 5.53, 16, 0.8, 1); m.box(x, 3.4, -5.53, x + 0.05, 6.0, -5.5, 32, 0.8, 1); }
    // the roof: ridge across, so the gables face +z and -z
    m.at(0, 0, 0, PI / 2).mat(M_DARK); p9gable(m, -5.5, -7, 5.5, 7, 6.0, 2.4, 1.4, 0.25); m.mat(M_BARK); for (const x of [-5.5, 5.5]) p9gableEnd(m, x, -7, 7, 6.0, 2.4); m.at(0, 0, 0, 0);
    // the balcony across the front, its wooden rail, its posts, the stair to the door
    m.mat(M_BARK).box(-6.8, 3.3, 5.5, 6.8, 3.45, 7.0, 0, 0.6, 1);
    for (let x = -6.7; x <= 6.75; x += 0.25) m.bar([x, 3.45, 6.95], [x, 4.4, 6.95], 0.06, 0.03);
    m.bar([-6.8, 4.45, 6.95], [6.8, 4.45, 6.95], 0.12, 0.08); for (const x of [-6.6, 0, 6.6]) m.bar([x, 0.5, 6.9], [x, 3.3, 6.9], 0.22, 0.22);
    m.mat(M_CONC).box(-1.4, 0, 5.5, 1.4, 0.5, 7.2, 4, 0.6, 1);
    m.mat(M_BRICK).box(4.5, 6.5, -1.5, 5.4, 9.6, -0.6, 4, 1, 1);
    return { m, W, lamps: [[-1.6, 2.6, 5.7], [1.6, 2.6, 5.7]], door: [0, 7.5] };
  },
  cube() { // a house of white boxes 16 x 10: the upper one runs out over a terrace, glass from floor to ceiling, a strip of
    // light under the overhang; the terrace and the garden at the back (-z)
    const m = new Mesh(), W = [];
    m.mat(M_PANEL); p9walls(m, -8, -5, 4, 5, 0, 3.4, [[0, -3.5, 1.65, 4.2, 2.9], [0, 2.8, 1.7, 1.2, 2.7], [2, -2, 1.65, 6.5, 2.9], [3, 0, 1.65, 3, 2.9], [1, -2, 1.9, 1.4, 1.4]], W, 0.12);
    m.box(-8.1, 3.4, -5.1, 4.1, 3.7, 5.1, 0, 0.7, 1);
    p9walls(m, -6, -5, 8, 4, 3.7, 6.8, [[0, -2, 5.25, 7, 2.6], [0, 5, 5.25, 2.4, 2.6], [1, 0, 5.25, 4.5, 2.6], [2, 3, 5.25, 6, 2.6], [3, 1.5, 5.25, 2, 2.6]], W, 0.12);
    m.box(-6.1, 6.8, -5.1, 8.1, 7.1, 4.1, 0, 0.7, 1);
    // under the overhang: the soffit with its line of light, a slender post
    m.box(4, 3.4, -5, 8, 3.7, 4, 8, 0.6, 1); m.mat(M_METAL).bar([7.6, 0, 3.6], [7.6, 3.4, 3.6], 0.12, 0.12);
    m.mat(M_LAMP).box(4.1, 3.38, 3.9, 7.9, 3.4, 4.0, 0); m.box(-6.0, 6.78, 3.95, 8.0, 6.8, 4.05, 0);
    m.mat(M_CONC).box(-9, 0, -9, 8, 0.15, -5, 4, 0.7, 1); // the terrace at the back
    m.mat(M_LENS).box(-8.9, 0.15, -8.95, 7.9, 1.1, -8.9, 0, 1, 1);
    return { m, W, lamps: [[2.8, 3.1, 5.3], [6, 3.2, 2]], door: [2.8, 6.5], led: 1 };
  },
  manor() { // a brick manor 16 x 12, two storeys, a hipped roof, a portico of four white columns with a pediment (+z)
    const m = new Mesh(), W = [], win = [];
    for (const y of [1.7, 4.9]) for (const x of [-6, -3.6, 3.6, 6]) win.push([0, x, y, 1.3, 1.9]);
    win.push([0, 0, 4.9, 1.3, 1.9]); for (const y of [1.7, 4.9]) for (const x of [-4, 0, 4]) { win.push([2, x, y, 1.3, 1.9]); } for (const f of [1, 3]) for (const y of [1.7, 4.9]) for (const x of [-3, 3]) win.push([f, x, y, 1.3, 1.9]);
    m.mat(M_CONC).box(-8.2, 0, -6.2, 8.2, 0.6, 6.2, 4, 0.55, 1);
    m.mat(M_BRICK); p9walls(m, -8, -6, 8, 6, 0.6, 6.4, win, W);
    m.mat(M_CONC); m.box(-8.1, 3.25, -6.1, 8.1, 3.4, 6.1, 0, 0.8, 1); m.box(-8.25, 6.25, -6.25, 8.25, 6.5, 6.25, 0, 0.8, 1);
    for (const [, x, y, w, h] of win.filter((e) => e[0] === 0)) m.box(x - w / 2 - 0.12, y + h / 2, 6, x + w / 2 + 0.12, y + h / 2 + 0.25, 6.12, 16, 1, 1);
    // the hipped roof
    m.mat(M_DARK); const R = 3.2, A = [-8.6, 6.5, -6.6], B = [8.6, 6.5, -6.6], C = [8.6, 6.5, 6.6], D = [-8.6, 6.5, 6.6], P = [-2.2, 6.5 + R, 0], Q = [2.2, 6.5 + R, 0];
    m.q4(D, C, Q, P, 0.9); m.q4(B, A, P, Q, 0.9); m.tri(m.v(...C), m.v(...B), m.v(...Q)); m.tri(m.v(...A), m.v(...D), m.v(...P));
    // the portico: steps, columns, the pediment
    m.mat(M_CONC).box(-2.8, 0, 6, 2.8, 0.6, 9.2, 4, 0.6, 1); m.box(-2.4, 0, 9.2, 2.4, 0.3, 9.8, 4, 0.6, 1);
    for (const x of [-2.2, -0.75, 0.75, 2.2]) { m.tube([[x, 0.6, 8.7], [x, 6.0, 8.7]], (k) => [0.24, 0.2][k], 12, 0); m.box(x - 0.3, 0.6, 8.4, x + 0.3, 0.8, 9.0, 0, 0.7, 1); m.box(x - 0.3, 5.9, 8.4, x + 0.3, 6.1, 9.0, 0, 1, 1); }
    m.box(-2.8, 6.1, 6, 2.8, 6.5, 9.2, 0, 0.8, 1); p3ext(m, [[-2.9, 6.5], [2.9, 6.5], [0, 8.0]], 6, 9.25, () => 0.9);
    m.mat(M_BARK).box(-0.7, 0.6, 6.0, 0.7, 2.9, 6.08, 16, 0.8, 1);
    m.mat(M_BRICK); for (const x of [-5, 5]) m.box(x - 0.4, 7.5, -0.4, x + 0.4, 10.4, 0.4, 4, 1, 1);
    return { m, W, lamps: [[-1.3, 2.6, 6.3], [1.3, 2.6, 6.3], [-2.6, 1.0, 9.7], [2.6, 1.0, 9.7]], door: [0, 11] };
  },
  barn() { // a barnhouse 18 x 8: one long steep gable of black boards, no eaves, a wall of glass in the gable end (+z)
    const m = new Mesh(), W = [];
    const win = [[1, -5, 1.6, 2.6, 2.2], [1, 3, 1.6, 1.2, 2.2], [3, 5, 1.6, 2.6, 2.2], [3, -2, 1.6, 1.2, 2.2], [2, 0, 1.6, 2.4, 2.4]];
    m.mat(M_CONC).box(-4.1, 0, -9.1, 4.1, 0.3, 9.1, 4, 0.55, 1);
    m.mat(M_PANEL); p9walls(m, -4, -9, 4, 9, 0.3, 3.4, win.concat([[0, 0, 1.85, 7.2, 3.0]]), W, 0.1);
    // the gables: the back one closed, the front one round a window over the glass wall (its edges follow the roof's
    // slope: at y the gable is 4 * (6.9 - y) / 3.5 wide either side)
    m.mat(M_PANEL); m.tri(m.v(4, 3.4, -9), m.v(-4, 3.4, -9), m.v(0, 6.9, -9));
    const gx = (y) => 4 * (6.9 - y) / 3.5, Z = 9, ha = 1.5, hb = 3.6, ht = 5.4;
    m.q4([-4, 3.4, Z], [-ha, 3.4, Z], [-ha, ht, Z], [-gx(ht), ht, Z]); m.q4([ha, 3.4, Z], [4, 3.4, Z], [gx(ht), ht, Z], [ha, ht, Z]);
    m.q4([-ha, 3.4, Z], [ha, 3.4, Z], [ha, hb, Z], [-ha, hb, Z]); m.tri(m.v(-gx(ht), ht, Z), m.v(gx(ht), ht, Z), m.v(0, 6.9, Z));
    p3wall(m, -ha, ha, hb, ht, Z, [[-ha + 0.001, hb + 0.001, ha - 0.001, ht - 0.001]], 0.12); W.push([0, (hb + ht) / 2, Z - 0.12, 0, ha * 2, ht - hb]);
    m.mat(M_METAL); m.bar([-4, 3.4, Z + 0.02], [4, 3.4, Z + 0.02], 0.12, 0.08);
    m.mat(M_DARK); for (const s of [-1, 1]) { m.q4([s * 4.05, 3.38, 9.05], [s * 4.05, 3.38, -9.05], [0, 6.95, -9.05], [0, 6.95, 9.05].map((v) => v), 0.9); }
    m.mat(M_DARK); for (let z = -8.9; z < 9; z += 0.3) for (const s of [-1, 1]) m.box(s * 4 - 0.02 + (s > 0 ? 0 : -0.01), 0.3, z, s * 4 + 0.02, 3.38, z + 0.05, s > 0 ? 1 : 2, 0.8, 1);
    m.mat(M_BARK).box(-4, 0, 9, 4, 0.25, 12, 4, 0.6, 1); // a deck of larch before the glass
    return { m, W, lamps: [[-3.5, 0.6, 11.8], [3.5, 0.6, 11.8]], door: [0, 12.5] };
  },
  tudor() { // a half-timbered house 13 x 10: white plaster crossed by dark beams, a steep roof, a gabled porch and a turret
    const m = new Mesh(), W = [], win = [];
    for (const x of [-4.4, -1.6, 2.4, 4.6]) win.push([0, x, 1.6, 1.1, 1.5]); for (const x of [-4, 0, 4]) win.push([0, x, 4.5, 1.1, 1.3]);
    for (const f of [1, 3]) for (const x of [-2.5, 2.5]) win.push([f, x, 1.6, 1.1, 1.5]); for (const x of [-3, 3]) win.push([2, x, 1.6, 1.1, 1.5]);
    m.mat(M_CONC).box(-6.7, 0, -5.2, 6.7, 0.4, 5.2, 4, 0.55, 1);
    m.mat(M_TINT); p9walls(m, -6.5, -5, 6.5, 5, 0.4, 5.6, win, W, 0.12, () => 1);
    // the timbers on the front: posts, rails, braces
    m.mat(M_BARK);
    for (const x of [-6.45, -3.0, -0.3, 1.0, 3.3, 6.45]) m.box(x - 0.1, 0.4, 5, x + 0.1, 5.6, 5.08, 16, 0.8, 1);
    for (const y of [0.45, 2.75, 3.25, 5.5]) m.box(-6.5, y, 5, 6.5, y + 0.14, 5.08, 16, 0.8, 1);
    for (const [a, b] of [[-6.4, -3.1], [3.4, 6.4]]) { m.bar([a, 3.4, 5.06], [b, 5.5, 5.06], 0.14, 0.08); m.bar([b, 3.4, 5.06], [a, 5.5, 5.06], 0.14, 0.08); }
    m.mat(M_RED); p9gable(m, -6.5, -5, 6.5, 5, 5.6, 4.6, 0.6, 0.2); m.mat(M_TINT); for (const x of [-6.5, 6.5]) p9gableEnd(m, x, -5, 5, 5.6, 4.6);
    // the porch with its own small gable; the turret at the corner with a cone roof
    m.mat(M_TINT).box(-1.0, 0.4, 5, 1.0, 3.2, 6.6, 16, 0.8, 1); m.mat(M_BARK).box(-0.6, 0.4, 6.6, 0.6, 2.6, 6.66, 0, 0.8, 1);
    m.at(0, 0, 0, -PI / 2).mat(M_RED); p9gable(m, 5, -1.2, 6.7, 1.2, 3.2, 1.3, 0.2, 0.15); m.mat(M_TINT); p9gableEnd(m, 6.7, -1.0, 1.0, 3.2, 1.1); m.at(0, 0, 0, 0);
    m.mat(M_TINT); p7ring(m, -6.2, 4.7, [[0.4, 1.5], [7.2, 1.5]], 12, false, false); W.push([-6.2, 6.0, 6.2, 0, 0.8, 1.2]);
    m.mat(M_RED); p7ring(m, -6.2, 4.7, [[7.1, 1.75], [10.6, 0.02]], 12, true, false);
    m.mat(M_BRICK).box(3.2, 8.5, -0.5, 4.0, 11.5, 0.5, 4, 1, 1);
    return { m, W, lamps: [[-1.3, 2.4, 6.7], [1.3, 2.4, 6.7]], door: [0, 7.5] };
  },
  // ---------------------------------------------------------------- the party in the garden
  marquee() { // a white marquee 8 x 5 with a peak roof to 3.6 on poles, its front (+z) open; tall tables, two patio heaters
    // (their heads at (+-3.4, 2.3, 1.6)), a grill outside at (5.2, 0, 3)
    const m = new Mesh(), hx = 4, hz = 2.5;
    m.mat(M_METAL); for (const x of [-hx, 0, hx]) for (const z of [-hz, hz]) m.bar([x, 0, z], [x, 2.4, z], 0.06, 0.06);
    m.mat(M_CONC);
    for (const s of [-1, 1]) m.q4([-hx - 0.1, 2.4, s * (hz + 0.1)], [hx + 0.1, 2.4, s * (hz + 0.1)], [hx + 0.1, 3.6, 0], [-hx - 0.1, 3.6, 0], 0.9);
    for (const x of [-hx - 0.1, hx + 0.1]) m.tri(m.v(x, 2.4, -hz - 0.1), m.v(x, 2.4, hz + 0.1), m.v(x, 3.6, 0));
    // valance scallops along the front, the back wall and the sides closed, the front open
    for (let x = -hx; x < hx; x += 0.5) m.q4([x, 2.4, hz + 0.1], [x + 0.5, 2.4, hz + 0.1], [x + 0.5, 2.15, hz + 0.1], [x + 0.25, 2.05, hz + 0.1], 0.8);
    m.q4([-hx, 0, -hz], [hx, 0, -hz], [hx, 2.4, -hz], [-hx, 2.4, -hz], 0.8); for (const x of [-hx, hx]) m.q4([x, 0, -hz], [x, 0, hz], [x, 2.4, hz], [x, 2.4, -hz], 0.8);
    m.mat(M_BARK).box(-hx, 0, -hz, hx, 0.08, hz, 4, 0.6, 1); // a wooden floor
    // tall tables with white cloths, a long bar at the back with bottles
    for (const [x, z] of [[-2.2, 0.6], [0.4, 1.2], [2.4, 0.2]]) { m.mat(M_METAL); m.bar([x, 0.08, z], [x, 1.05, z], 0.05, 0.05); m.mat(M_CONC); p7ring(m, x, z, [[0.75, 0.34], [1.08, 0.36], [1.1, 0.36]], 12, false, true); m.mat(M_LENS); for (const d of [-0.1, 0.12]) p7ring(m, x + d, z + 0.08, [[1.1, 0.03], [1.25, 0.03], [1.3, 0.01]], 6); }
    m.mat(M_BARK).box(-3, 0.08, -2.3, 3, 1.05, -1.7, 0, 0.6, 1); m.mat(M_CONC).box(-3.05, 1.05, -2.35, 3.05, 1.1, -1.65, 0, 1, 1);
    m.mat(M_GLASS); for (let k = 0; k < 9; k++) p7ring(m, -2.6 + k * 0.62, -2.05, [[1.1, 0.04], [1.32, 0.04], [1.4, 0.015], [1.45, 0.015]], 6);
    // patio heaters: a pole on a round foot, a reflector hat
    for (const x of [-3.4, 3.4]) { m.mat(M_METAL); p7ring(m, x, 1.6, [[0.08, 0.25], [0.12, 0.2], [0.14, 0.05]], 10); m.bar([x, 0.1, 1.6], [x, 2.2, 1.6], 0.06, 0.06); p7ring(m, x, 1.6, [[2.2, 0.08], [2.4, 0.5], [2.42, 0.48]], 12, true, false); }
    // the grill: a kettle on three legs with a lid half open
    m.mat(M_DARK); p7ring(m, 5.2, 3, [[0.62, 0.05], [0.72, 0.28], [0.9, 0.3]], 12, true, false); for (let k = 0; k < 3; k++) { const a = k * TAU / 3; m.bar([5.2 + cos(a) * 0.2, 0.7, 3 + sin(a) * 0.2], [5.2 + cos(a) * 0.32, 0, 3 + sin(a) * 0.32], 0.03, 0.03); }
    m.mat(M_LAMP); p7ring(m, 5.2, 3, [[0.88, 0.26], [0.9, 0.26]], 12, true, true);
    return { m, heaters: [[-3.4, 2.3, 1.6], [3.4, 2.3, 1.6]], grill: [5.2, 0.95, 3] };
  },
  // ---------------------------------------------------------------- the forester's lodge and his snowmobiles
  lodge() { // a log lodge 9 x 7 with a porch on +z, a stove pipe; {m, W, porch, pipe}
    const m = new Mesh(), W = [], rec = 0.15;
    m.mat(M_CONC).box(-4.7, 0, -3.7, 4.7, 0.5, 3.7, 4, 0.55, 1);
    m.mat(M_BARK); p9walls(m, -4.5, -3.5, 4.5, 3.5, 0.5, 3.4, [[0, -2.6, 1.9, 1.1, 1.1], [0, 2.4, 1.9, 1.1, 1.1], [1, 0, 1.9, 1.1, 1.1], [3, -1, 1.9, 1.1, 1.1]], W, rec);
    // the logs: round ends at the corners, a ridge every course
    // (each course along a wall, broken where a window [along, y0, y1] or the door cuts it)
    const cut = { z1: [[-2.6, 0.55], [2.4, 0.55], [0, 0.5]], z0: [], x1: [[0, 0.55]], x0: [[-1, 0.55]] }, ys = { '-2.6': [1.3, 2.5], '2.4': [1.3, 2.5], '0': [1.3, 2.5], '-1': [1.3, 2.5] };
    const course = (a, b, y, holes, P) => { let segs = [[a, b]]; for (const [c, r] of holes) { const yy = c === 0 && holes === cut.z1 && r === 0.5 ? [0.5, 2.7] : ys[String(c)]; if (y + 0.15 < yy[0] || y - 0.15 > yy[1]) continue; segs = segs.flatMap(([p, q]) => [[p, min(q, c - r)], [max(p, c + r), q]].filter(([e, f]) => f - e > 0.1)); } for (const [p, q] of segs) m.tube([P(p), P(q)], 0.15, 6, 3); };
    for (let y = 0.65; y < 3.4; y += 0.3) {
      course(-4.75, 4.75, y, cut.z1, (u) => [u, y, 3.6]); course(-4.75, 4.75, y, cut.z0, (u) => [u, y, -3.6]);
      course(-3.75, 3.75, y + 0.15, cut.x1, (u) => [4.6, y + 0.15, -u]); course(-3.75, 3.75, y + 0.15, cut.x0, (u) => [-4.6, y + 0.15, u]);
    }
    m.mat(M_DARK); p9gable(m, -4.5, -3.5, 4.5, 3.5, 3.4, 2.4, 0.7, 0.18); m.mat(M_BARK); for (const x of [-4.5, 4.5]) p9gableEnd(m, x, -3.5, 3.5, 3.4, 2.4);
    // the door, the porch roof on two posts, the bench, the stove pipe
    m.mat(M_BARK).box(-0.5, 0.5, 3.5, 0.5, 2.6, 3.58, 16, 0.8, 1); m.box(-1.4, 0.5, 3.5, 1.4, 0.6, 5.2, 4, 0.6, 1);
    for (const x of [-1.3, 1.3]) m.bar([x, 0.6, 5.1], [x, 2.9, 5.1], 0.14, 0.14);
    m.mat(M_METAL).bar([0, 3.2, 3.5], [0, 2.85, 5.4], 3.0, 0.06);
    m.mat(M_BARK).box(1.6, 0.5, 3.75, 3.6, 0.95, 4.15, 0, 0.7, 1);
    m.mat(M_METAL).tube([[-2.5, 4.2, -1], [-2.5, 6.6, -1]], 0.12, 8, 2);
    // antlers over the door
    m.mat(M_CONC); for (const s of [-1, 1]) { m.tube([[0, 2.95, 3.6], [s * 0.3, 3.15, 3.65], [s * 0.45, 3.45, 3.65]], 0.025, 4, 2); m.tube([[s * 0.3, 3.15, 3.65], [s * 0.45, 3.2, 3.67]], 0.018, 4, 2); }
    return { m, W, porch: [0, 2.75, 4.6], pipe: [-2.5, 6.6, -1] };
  },
  snowmobile() { // 3.1 long along x (nose +x), 1.2 wide, 1.25 high: two skis in front, the track under the body, a seat, a
    // windscreen, handlebars; the body in the instance's colour
    const m = new Mesh();
    m.mat(M_METAL); for (const s of [-1, 1]) { m.sweep([[0.3, 0.06, s * 0.5], [1.4, 0.04, s * 0.5], [1.6, 0.1, s * 0.5], [1.7, 0.3, s * 0.5]], 0.12, 0.03, () => [0, 1, 0]); m.bar([0.9, 0.06, s * 0.5], [0.85, 0.5, s * 0.38], 0.05, 0.05); }
    m.mat(M_DARK); m.sweep([[-1.4, 0.18, 0], [-1.45, 0.06, 0], [0.1, 0.06, 0], [0.3, 0.3, 0]], 0.5, 0.18, () => [0, 0, 1]);
    m.mat(M_PAINT); p3ext(m, [[-1.35, 0.35], [0.4, 0.35], [1.2, 0.48], [1.45, 0.6], [1.0, 0.85], [0.4, 0.95], [-0.2, 0.75], [-1.35, 0.72]], -0.55, 0.55, () => 1);
    m.mat(M_DARK).box(-1.3, 0.72, -0.3, -0.05, 0.9, 0.3, 0, 0.8, 1); m.box(-1.45, 0.4, -0.5, -1.3, 0.75, 0.5, 0, 0.6, 1);
    m.mat(M_GLASS); p5face(m, [[0.35, 0.95, -0.3], [0.35, 0.95, 0.3], [0.1, 1.25, 0.28], [0.1, 1.25, -0.28]], [-1, 1, 0]);
    m.mat(M_METAL).bar([0.05, 1.0, -0.38], [0.05, 1.0, 0.38], 0.03, 0.03); m.bar([0.2, 0.9, 0], [0.05, 1.0, 0], 0.04, 0.04);
    m.mat(M_LENS).box(1.38, 0.62, -0.18, 1.42, 0.72, 0.18);
    return m;
  },
  // ---------------------------------------------------------------- the fire in the forest and the nine round it
  campfire() { // a ring of stones 1.4 across, logs to sit on round it at radius 2.3, packs and bedrolls, a kettle on a tripod
    const m = new Mesh();
    m.mat(M_CONC); for (let k = 0; k < 11; k++) { const a = k / 11 * TAU; p2ball(m, cos(a) * 0.62, 0.07, sin(a) * 0.62, 0.13, 3, 6, 0.7); }
    m.mat(M_DARK); p7ring(m, 0, 0, [[0.01, 0.55], [0.03, 0.5]], 12, false, true);
    m.mat(M_BARK); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + 0.3; m.tube([[cos(a) * 0.55, 0.06, sin(a) * 0.55], [cos(a) * 0.08, 0.32, sin(a) * 0.08]], 0.06, 6, 3); }
    // the logs and stumps to sit on, round the fire
    for (const [a, l] of [[0.2, 2.2], [1.45, 1.8], [2.6, 2.4], [3.9, 2.0], [5.1, 1.7]]) { const c = [cos(a) * 2.3, sin(a) * 2.3], t = [-sin(a), cos(a)]; m.tube([[c[0] - t[0] * l / 2, 0.2, c[1] - t[1] * l / 2], [c[0] + t[0] * l / 2, 0.2, c[1] + t[1] * l / 2]], 0.2, 8, 3); }
    // packs and bedrolls left behind the logs
    for (const [a, r] of [[0.8, 3.3], [2.1, 3.4], [3.3, 3.2], [4.6, 3.3], [5.7, 3.1]]) { const x = cos(a) * r, z = sin(a) * r; m.mat(M_GRN).box(x - 0.25, 0, z - 0.18, x + 0.25, 0.55, z + 0.18, 4, 0.6, 1); m.mat(M_RED).tube([[x - 0.3, 0.62, z], [x + 0.3, 0.62, z]], 0.1, 8, 3); }
    m.mat(M_METAL); for (let k = 0; k < 3; k++) { const a = k * TAU / 3; m.bar([cos(a) * 0.7, 0, sin(a) * 0.7], [0, 1.25, 0], 0.03, 0.03); } m.bar([0, 1.25, 0], [0, 0.85, 0], 0.01, 0.01);
    m.mat(M_DARK); p7ring(m, 0, 0, [[0.62, 0.1], [0.72, 0.13], [0.82, 0.11], [0.85, 0.06]], 10);
    return m;
  },
  flames() { // the fire itself, 0.9 high: twisted tongues of light (lit by the lamp whose index is the instance's seed), their
    // shade bits the sway weight, so they lean and flicker with the wind (anim 1)
    const m = new Mesh().mat(M_LAMP);
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * TAU, r = k ? 0.2 : 0, h = k ? 0.45 + 0.15 * (k % 3) : 0.9, x = cos(a) * r, z = sin(a) * r, P = [];
      for (let j = 0; j <= 4; j++) { const t = j / 4; P.push([x * (1 - t * 0.7) + 0.05 * sin(t * 6 + k), 0.12 + t * h, z * (1 - t * 0.7) + 0.05 * cos(t * 5 + k)]); }
      m.tube(P, (j) => [0.17, 0.14, 0.1, 0.05, 0.01][j] * (k ? 0.8 : 1.2), 6, 2, (j) => j / 4);
    }
    return m;
  },
  // nine travellers: kind 0 an old man in grey with a pointed hat and a staff, 1 a warrior in a fur cloak with a round shield
  // and a horn, 2 a ranger in a dark hooded cloak with a sword, 3 a tall fair-haired archer with a bow, 4 a stout bearded
  // warrior with an axe and a helmet, 5-8 four small folk in cloaks; all sitting on a log at y 0.4, facing +z, the
  // breath and the head (anim 12) above the neck
  fellow(kind = 0) {
    const m = new Mesh(), small = kind >= 5, dwarf = kind === 4, s = small ? 0.66 : dwarf ? 0.8 : kind === 0 || kind === 3 ? 1.04 : 1;
    const S = (p) => [p[0] * s * (dwarf ? 1.25 : 1), p[1] * s, p[2] * s];
    const cloak = kind === 0 ? M_TINT : kind === 2 ? M_DARK : kind === 3 ? M_GRN : small ? (kind & 1 ? M_GRN : M_TINT) : M_TINT;
    // the body sitting: the seat at 0.4 / s so all scale together
    const y0 = 0.4 / s, sit = [];
    m.mat(cloak); p2loft(m, [p2R(y0, 0.24, 0.2, 0, -0.08), p2R(y0 + 0.3, 0.23, 0.17, 0, -0.1), p2R(y0 + 0.55, 0.21, 0.15, 0, -0.08), p2R(y0 + 0.78, 0.22, 0.14, 0, -0.05), p2R(y0 + 0.86, 0.11, 0.1, 0, -0.03)].map((r) => ({ ...r, y: r.y * s, rx: r.rx * s * (dwarf ? 1.25 : 1), rz: r.rz * s, cz: r.cz * s })), 10, true, true);
    // the cloak falls behind and down to the ground
    m.q4(S([-0.26, y0 + 0.8, -0.12]), S([0.26, y0 + 0.8, -0.12]), S([0.34, 0.02 / s, -0.42]), S([-0.34, 0.02 / s, -0.42]), 0.7);
    // thighs forward, shins down, boots (bare big feet on the small folk)
    for (const x of [-0.11, 0.11]) {
      m.mat(kind === 0 ? M_TINT : M_DARK); m.tube([S([x, y0 + 0.08, -0.05]), S([x, y0 + 0.1, 0.38])], 0.075 * s, 7, 3); m.tube([S([x, y0 + 0.08, 0.38]), S([x, 0.08 / s, 0.42])], 0.06 * s, 7, 3);
      m.mat(small ? M_CONC : M_BARK).box(...S([x - 0.06, 0, 0.32]), ...S([x + 0.06, 0.09 / s, 0.58]), 4, 0.7, 1);
    }
    // the arms: forearms resting on the knees, hands held out to the fire
    for (const sx of [-1, 1]) { m.mat(cloak); m.tube([S([sx * 0.22, y0 + 0.78, -0.05]), S([sx * 0.25, y0 + 0.5, 0.1]), S([sx * 0.12, y0 + 0.45, 0.42])], 0.055 * s, 6, 3); m.mat(M_CONC); p2ball(m, ...S([sx * 0.1, y0 + 0.45, 0.46]), 0.04 * s, 3, 6); }
    const hy = (y0 + 0.98) * s, hz = -0.03 * s, hr = 0.1 * s;
    m.mat(M_CONC); p2ball(m, 0, hy, hz, hr, 6, 10, 1.1);
    if (kind === 0) {
      // the grey wizard: a long white beard, the wide brim and the tall crooked point of his hat, the staff by his side
      m.mat(M_CONC); p2loft(m, [p2R(hy - 0.03, 0.08, 0.05, 0, hz + 0.08), p2R(hy - 0.2, 0.09, 0.05, 0, hz + 0.1), p2R(hy - 0.42, 0.04, 0.03, 0, hz + 0.12)], 8, false, true);
      m.mat(M_TINT); p7ring(m, 0, hz, [[hy + 0.06, 0.3], [hy + 0.08, 0.3]], 14); m.tube([[0, hy + 0.08, hz], [0, hy + 0.3, hz - 0.02], [0.02, hy + 0.5, hz - 0.08], [0.08, hy + 0.62, hz - 0.16]], (j) => [0.11, 0.08, 0.04, 0.005][j], 8, 2);
      m.mat(M_BARK).tube([[0.42, 0, 0.3], [0.4, 1.0, 0.25], [0.36, 1.9, 0.18]], 0.025, 6, 2); p2ball(m, 0.36, 1.92, 0.18, 0.05, 3, 6);
    } else if (kind === 1) {
      // the warrior: a fur collar, the round shield leant against his log, a white horn on his belt, a sword
      m.mat(M_BARK); p7ring(m, 0, hz - 0.04, [[hy - 0.2, 0.26], [hy - 0.1, 0.22], [hy - 0.06, 0.12]], 10);
      m.mat(M_BARK); p2ball(m, 0, hy + 0.04, hz - 0.03, hr * 1.05, 4, 10, 1.05);
      m.at(-0.55, 0, 0.1, 0.3).mat(M_RED); m.tube([[0, 0.42, -0.02], [0, 0.42, 0.04]], 0.38, 16, 3); m.mat(M_YEL); m.tube([[0, 0.42, 0.04], [0, 0.42, 0.06]], 0.08, 10, 2); m.at(0, 0, 0, 0);
      m.mat(M_CONC); m.tube([[0.26, 0.62, 0], [0.3, 0.55, 0.12], [0.26, 0.52, 0.24]], (j) => [0.035, 0.03, 0.02][j], 6, 2);
      m.mat(M_METAL).bar([-0.28, 0.1, 0.2], [-0.3, 1.0, 0.05], 0.05, 0.015);
    } else if (kind === 2) {
      // the ranger: the hood down on his shoulders, dark hair, a sword across his back
      m.mat(M_DARK); p2ball(m, 0, hy + 0.03, hz - 0.03, hr * 1.06, 4, 10, 1.1); p7ring(m, 0, hz - 0.1, [[hy - 0.18, 0.2], [hy - 0.08, 0.16]], 10);
      m.mat(M_METAL).bar([-0.22, 0.6, -0.2], [0.24, 1.5, -0.18], 0.06, 0.015); m.mat(M_BARK).bar([0.24, 1.5, -0.18], [0.3, 1.62, -0.17], 0.04, 0.04);
    } else if (kind === 3) {
      // the archer: long fair hair down his back, the bow standing beside him, a quiver of arrows on his back
      m.mat(M_YEL); p2ball(m, 0, hy + 0.02, hz - 0.03, hr * 1.06, 4, 10, 1.1); m.q4([-0.09, hy + 0.02, hz - 0.08], [0.09, hy + 0.02, hz - 0.08], [0.1, hy - 0.4, hz - 0.18], [-0.1, hy - 0.4, hz - 0.18], 0.9);
      const B = []; for (let j = 0; j <= 8; j++) { const t = j / 8 - 0.5; B.push([0.5 + 0.12 * cos(t * PI), 0.95 + t * 1.6, 0.2]); } m.mat(M_BARK).tube(B, 0.018, 5, 3); m.mat(M_CONC).bar([0.5, 0.15, 0.2], [0.5, 1.75, 0.2], 0.004, 0.004);
      m.mat(M_BARK).tube([[-0.12, 0.7, -0.22], [0.12, 1.35, -0.2]], 0.06, 8, 3); m.mat(M_CONC); for (let k = 0; k < 4; k++) m.bar([0.08 + k * 0.012, 1.3, -0.2], [0.12 + k * 0.015, 1.45, -0.2], 0.01, 0.01);
    } else if (kind === 4) {
      // the stout one: a great braided beard, a helmet, the double-headed axe leant on the log
      m.mat(M_BARK); p2loft(m, [p2R(hy - 0.02, 0.12, 0.07, 0, hz + 0.08), p2R(hy - 0.2, 0.15, 0.08, 0, hz + 0.12), p2R(hy - 0.4, 0.07, 0.05, 0, hz + 0.14), p2R(hy - 0.48, 0.02, 0.02, 0, hz + 0.14)], 8, false, true);
      m.mat(M_METAL); p2loft(m, [p2R(hy + 0.02, 0.13, 0.13, 0, hz), p2R(hy + 0.12, 0.12, 0.12, 0, hz), p2R(hy + 0.2, 0.02, 0.02, 0, hz)], 10, true, true);
      m.mat(M_BARK).bar([0.55, 0, 0.2], [0.45, 0.95, 0.15], 0.045, 0.045); m.mat(M_METAL); for (const sx of [-1, 1]) m.q4([0.46, 0.75, 0.15], [0.46 + sx * 0.25, 0.65, 0.15], [0.46 + sx * 0.25, 1.0, 0.15], [0.46, 0.92, 0.15], 1);
    } else {
      // the small folk: curly hair, a cloak with a clasp; one with a pipe, one holding a stick with a sausage over the fire
      m.mat(M_BARK); for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; p2ball(m, cos(a) * hr * 0.85, hy + 0.05 + 0.03 * sin(k * 2), hz + sin(a) * hr * 0.85 - 0.02, hr * 0.35, 3, 6); }
      m.mat(M_YEL); p2ball(m, 0, hy - 0.16, hz + 0.1, 0.02, 3, 6);
      if (kind === 6) { m.mat(M_BARK).tube([[0.02, hy - 0.06, hz + 0.08], [0.06, hy - 0.1, hz + 0.18], [0.07, hy - 0.05, hz + 0.22]], 0.01, 4, 2); }
      if (kind === 7) { m.mat(M_BARK).bar([0.07, 0.3, 0.3], [0.1, 0.55, 1.2], 0.015, 0.015); m.mat(M_RED).tube([[0.1, 0.55, 1.17], [0.105, 0.56, 1.27]], 0.025, 6, 3); }
    }
    return m;
  },
  // ---------------------------------------------------------------- the lorry broken down by the highway
  brokenTruck() { // the box lorry of props3 (8 long, nose +x) with its cab tipped forward over the engine
    const m = new Mesh(), C = new Mesh(), hw = 1.1, a = 0.85, c = cos(a), s = sin(a), px = 3.85, py = 0.95;
    m.mat(M_DARK).box(-3.95, 0.6, -0.5, 3.8, 1.05, 0.5, 4, 0.45, 0.8);
    m.box(-4, 0.5, -1.0, -3.88, 0.8, 1.0, 0, 0.5, 0.8); m.box(3.82, 0.45, -1.05, 4, 0.85, 1.05, 0, 0.5, 0.8);
    // the cab, built on its own and turned about the axis at its front bottom
    C.mat(M_PAINT); p3ext(C, [[1.95, 0.95], [3.85, 0.95], [3.85, 1.55], [3.4, 2.6], [1.95, 2.6]], -hw, hw);
    { const n = [1.05 / 1.142, 0.45 / 1.142, 0], e = [3.85, 1.55], d = [-0.45, 1.05], at = (t, o) => [e[0] + d[0] * t + n[0] * o, e[1] + d[1] * t + n[1] * o];
      C.mat(M_GLASS); const A = at(0.12, 0.006), B = at(0.88, 0.006); p3face(C, [[A[0], A[1], -0.95], [A[0], A[1], 0.95], [B[0], B[1], 0.95], [B[0], B[1], -0.95]], n); }
    for (const sd of [-1, 1]) {
      C.mat(M_GLASS); p3face(C, [[2.3, 1.7, sd * (hw + 0.006)], [3.5, 1.7, sd * (hw + 0.006)], [3.3, 2.45, sd * (hw + 0.006)], [2.3, 2.45, sd * (hw + 0.006)]], [0, 0, sd]);
      C.mat(M_DARK).box(3.45, 1.9, sd * 1.12 - 0.03, 3.55, 2.3, sd * 1.12 + 0.03, 0, 1, 1); C.mat(M_LENS).box(3.84, 1.05, sd * 0.8 - 0.15, 3.86, 1.27, sd * 0.8 + 0.15);
      m.mat(M_RED).box(-3.98, 1.1, sd * 1.1 - 0.08, -3.95, 1.4, sd * 1.1 + 0.08);
      p3wheel(m, 2.9, 0.5, sd * 0.78, sd * 1.1); for (const x of [-1.5, -2.8]) p3wheel(m, x, 0.5, sd * 0.86, sd * 1.18);
    }
    C.mat(M_DARK).box(3.846, 1.0, -0.5, 3.862, 1.3, 0.5);
    p9merge(m, C, ([x, y, z]) => { const dx = x - px, dy = y - py; return [px + dx * c + dy * s, py - dx * s + dy * c, z]; });
    m.mat(M_TINT).box(-3.95, 1.05, -1.2, 1.9, 4.25, 1.2, 0, 0.6, 1); m.mat(M_DARK).box(-3.96, 1.0, -1.15, -3.94, 1.18, 1.15); m.mat(M_METAL).box(-3.955, 1.2, -0.02, -3.945, 4.1, 0.02);
    // the engine laid open under where the cab was
    m.mat(M_DARK).box(2.1, 0.9, -0.55, 3.4, 1.65, 0.55, 0, 0.5, 1); m.mat(M_METAL).box(2.3, 1.65, -0.4, 3.2, 1.8, 0.4, 0, 0.6, 1);
    for (let k = 0; k < 4; k++) m.tube([[2.5 + k * 0.2, 1.8, -0.3], [2.5 + k * 0.2, 1.95, -0.3]], 0.04, 6, 2);
    m.mat(M_DARK).box(2.0, 0.9, -1.0, 2.5, 1.5, -0.6, 0, 0.6, 1); // the battery box
    return m;
  },
  warnTriangle() { // the red warning triangle on its stand, 0.5 high, facing +x
    const m = new Mesh().mat(M_RED), h = 0.43, w = 0.25;
    m.sweep([[0, 0.05, -w], [0, 0.05 + h, 0], [0, 0.05, w], [0, 0.05, -w]], 0.05, 0.02, () => [1, 0, 0]);
    m.mat(M_METAL).bar([-0.15, 0, 0], [0.02, 0.05, 0], 0.02, 0.02);
    return m;
  },
  mechanic() { // a man in overalls bent over the engine, his head and hands in it, facing +x; 1.75 tall standing
    const m = new Mesh(), b = 0.75;
    const R = (x, y) => [x * cos(b) + (y - 0.95) * sin(b), 0.95 - x * sin(b) + (y - 0.95) * cos(b)];
    m.mat(M_DARK); for (const z of [-0.11, 0.11]) { m.tube([[0, 0.95, z], [0.02, 0.5, z], [0, 0.08, z]], (k) => [0.08, 0.068, 0.058][k], 7, 3); m.box(-0.08, 0, z - 0.06, 0.2, 0.09, z + 0.06, 4, 0.7, 1); }
    m.mat(M_TINT); const L = [[0.95, 0.22], [1.25, 0.21], [1.42, 0.22], [1.5, 0.12]].map(([y, r]) => { const [x, yy] = R(0, y); return p2R(yy, r, 0.15, x, 0); });
    // the trunk bent forward: a loft along the bent axis, built as rings at the bent heights
    for (let k = 0; k < L.length - 1; k++) { const [x0, y0] = R(0, [0.95, 1.25, 1.42, 1.5][k]), [x1, y1] = R(0, [0.95, 1.25, 1.42, 1.5][k + 1]); m.tube([[x0, y0, 0], [x1, y1, 0]], (j) => [[0.21, 0.2], [0.2, 0.21], [0.21, 0.12]][k][j], 10, k ? 0 : 1); }
    const [hx, hy] = R(0, 1.63); m.mat(M_CONC); p2ball(m, hx, hy, 0, 0.095, 5, 8, 1.1); m.mat(M_DARK); p2ball(m, hx - 0.02, hy + 0.03, 0, 0.1, 4, 8, 1);
    const [sx, sy] = R(0, 1.42); for (const z of [-0.22, 0.22]) { m.mat(M_TINT).tube([[sx, sy, z], [sx + 0.3, sy - 0.25, z * 0.9], [sx + 0.55, sy - 0.25, z * 0.6]], 0.05, 6, 3); m.mat(M_CONC); p2ball(m, sx + 0.57, sy - 0.25, z * 0.6, 0.045, 3, 6); }
    return m;
  },
  workLamp() { // a work lamp on a tripod stand, its head at (0, 1.6, 0) pointing +x
    const m = new Mesh().mat(M_METAL);
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3; m.bar([cos(a) * 0.35, 0, sin(a) * 0.35], [0, 0.6, 0], 0.025, 0.025); }
    m.bar([0, 0.6, 0], [0, 1.6, 0], 0.03, 0.03); m.mat(M_YEL).box(-0.08, 1.5, -0.12, 0.08, 1.72, 0.12, 0, 0.8, 1); m.mat(M_LAMP).box(0.08, 1.53, -0.09, 0.09, 1.69, 0.09);
    m.mat(M_RED).box(0.25, 0, 0.3, 0.75, 0.25, 0.55, 4, 0.7, 1); // a toolbox
    return m;
  },
  // ---------------------------------------------------------------- the house of culture
  culture() { // the house of culture: 40 x 22, 15 high, a portico of eight columns with a pediment on +z, wide steps,
    // tall windows; {m, W, sign, posters} sign = the centre of the frieze over the columns, posters = boards beside the steps
    const m = new Mesh(), W = [], win = [];
    for (const x of [-17, -14, -11, 11, 14, 17]) for (const y of [3, 8.5]) win.push([0, x, y, 1.8, 3.4]);
    for (const x of [-7.5, -2.5, 2.5, 7.5]) win.push([0, x, 8.5, 2.2, 3.4]);
    for (const f of [1, 3]) for (const x of [-7, 0, 7]) for (const y of [3, 8.5]) win.push([f, x, y, 1.8, 3.4]);
    for (const x of [-15, -9, -3, 3, 9, 15]) win.push([2, x, 8.5, 1.8, 3.4]);
    m.mat(M_CONC).box(-20.3, 0, -11.3, 20.3, 1.0, 11.3, 4, 0.55, 1);
    m.mat(M_TINT); p9walls(m, -20, -11, 20, 11, 1.0, 13.5, win, W, 0.3, () => 1);
    m.mat(M_CONC); m.box(-20.4, 13.2, -11.4, 20.4, 14.2, 11.4, 0, 0.8, 1); m.box(-20.5, 14.2, -11.5, 20.5, 15.0, 11.5, 0, 0.9, 1); m.box(-20.15, 5.7, -11.15, 20.15, 6.0, 11.15, 0, 0.8, 1);
    // pilasters on the long walls
    for (let x = -18.5; x <= 18.6; x += 3) for (const z of [11, -11]) m.box(x - 0.3, 1, z > 0 ? z : z - 0.15, x + 0.3, 13.2, z > 0 ? z + 0.15 : z, 0, 0.8, 1);
    // the portico: steps all along, eight columns, the entablature and the pediment
    for (let k = 0; k < 6; k++) m.box(-12 - k * 0.3, 0, 11, 12 + k * 0.3, 1.0 - k * 0.17, 16 + k * 0.45, 0, 0.7, 1);
    for (let k = 0; k < 8; k++) { const x = -10.5 + k * 3; m.tube([[x, 1.0, 15], [x, 6, 15], [x, 11.6, 15]], (j) => [0.62, 0.58, 0.5][j], 16, 0); m.box(x - 0.75, 1.0, 14.25, x + 0.75, 1.3, 15.75, 0, 0.7, 1); m.box(x - 0.7, 11.6, 14.3, x + 0.7, 12.0, 15.7, 0, 1, 1); }
    m.box(-12, 12, 11, 12, 13.4, 15.9, 0, 0.9, 1);
    p3ext(m, [[-12.2, 13.4], [12.2, 13.4], [0, 17.2]], 11, 16.0, () => 0.9);
    // the doors in the shade of the portico: three, tall, of glass
    for (const x of [-4, 0, 4]) W.push([x, 3.6, 10.85, 0, 2.4, 3.8]);
    m.mat(M_DARK).box(-6, 1.0, 10.9, 6, 6.2, 10.95, 0, 0.6, 0.8);
    return { m, W: W.map((w) => [...w]), sign: [0, 12.7, 15.95], posters: [[-14, 2.2, 17], [14, 2.2, 17]] };
  },
  posterBoard() { // a board for the posters on two legs, 1.4 x 2, its face +z at z 0.05, the poster centred at (0, 1.65, 0.06)
    const m = new Mesh().mat(M_METAL);
    for (const x of [-0.75, 0.75]) m.bar([x, 0, 0], [x, 2.7, 0], 0.07, 0.07);
    m.mat(M_DARK).box(-0.8, 0.6, -0.04, 0.8, 2.7, 0.04, 0, 0.8, 1); m.mat(M_METAL).box(-0.85, 2.7, -0.15, 0.85, 2.78, 0.2, 0, 1, 1);
    return m;
  },
  posterColumn() { // a round poster column 1.1 across, 3 high, a little dome on top; posters as decals round it
    const m = new Mesh().mat(M_TINT);
    p7ring(m, 0, 0, [[0, 0.62, 0.6], [0.3, 0.6], [0.32, 0.55], [2.8, 0.55], [2.85, 0.65], [2.95, 0.65], [3.3, 0.35], [3.5, 0.05]], 16);
    m.mat(M_METAL); p2ball(m, 0, 3.55, 0, 0.08, 3, 8);
    return m;
  },
  // ---------------------------------------------------------------- the square: the market, the lights
  stall() { // a market hut 3 x 2, its counter open to +z under a lifted shutter, a pitched roof; lit inside
    const m = new Mesh(), hx = 1.5, hz = 1;
    m.mat(M_BARK); m.box(-hx, 0, -hz, hx, 0.15, hz, 4, 0.6, 1);
    p3wall(m, -hx, hx, 0.15, 2.4, hz, [[-1.3, 1.0, 1.3, 2.2]], 0.05); m.at(0, 0, 0, PI); p3wall(m, -hx, hx, 0.15, 2.4, hz); m.at(0, 0, 0, PI / 2); p3wall(m, -hz, hz, 0.15, 2.4, hx); m.at(0, 0, 0, -PI / 2); p3wall(m, -hz, hz, 0.15, 2.4, hx); m.at(0, 0, 0, 0);
    for (let x = -1.45; x < 1.5; x += 0.25) { m.box(x, 0.15, hz, x + 0.03, 1.0, hz + 0.02, 16, 0.8, 1); m.box(x, 0.15, -hz - 0.02, x + 0.03, 2.4, -hz, 32, 0.8, 1); }
    m.box(-1.4, 0.95, hz - 0.05, 1.4, 1.05, hz + 0.35, 0, 0.8, 1); // the counter
    m.mat(M_RED); m.q4([-hx - 0.3, 2.4, hz + 0.3], [hx + 0.3, 2.4, hz + 0.3], [hx + 0.3, 3.2, 0], [-hx - 0.3, 3.2, 0], 0.9); m.q4([hx + 0.3, 2.4, -hz - 0.3], [-hx - 0.3, 2.4, -hz - 0.3], [-hx - 0.3, 3.2, 0], [hx + 0.3, 3.2, 0], 0.9);
    m.mat(M_BARK); for (const x of [-hx, hx]) p9gableEnd(m, x, -hz, hz, 2.4, 0.8);
    m.mat(M_BARK).bar([-1.4, 2.2, hz], [1.4, 2.25, hz + 0.9], 2.8, 0.04); // the shutter held up
    // goods on the counter: jars of honey, mittens, gingerbread
    m.mat(M_YEL); for (let k = 0; k < 5; k++) p7ring(m, -1.1 + k * 0.22, hz + 0.15, [[1.05, 0.05], [1.17, 0.05], [1.19, 0.03]], 6);
    m.mat(M_RED); for (let k = 0; k < 3; k++) m.box(0.2 + k * 0.32, 1.05, hz + 0.05, 0.42 + k * 0.32, 1.1, hz + 0.25, 4);
    m.mat(M_LAMP).box(-1.3, 2.25, 0, 1.3, 2.3, 0.1, 0);
    return m;
  },
  lightArch() { // an arch of lights over a walk, 5 wide, 4.2 high: a frame of thin tubes that glows (LED, see the solid shader)
    const m = new Mesh().mat(M_LAMP), P = [];
    for (let k = 0; k <= 16; k++) { const a = k / 16 * PI; P.push([cos(a) * 2.5, 1.2 + sin(a) * 3.0, 0]); }
    m.tube([[2.5, 0, 0]].concat(P, [[-2.5, 0, 0]]), 0.03, 4, 0);
    const Q = P.map(([x, y]) => [x * 0.86, 1.2 + (y - 1.2) * 0.86, 0]); m.tube(Q, 0.02, 4, 0);
    for (let k = 1; k < 16; k += 2) m.bar(P[k], Q[k], 0.02, 0.02);
    return m;
  },
  deer() { // a deer drawn in lines of light, 1.9 high, facing +x
    const m = new Mesh().mat(M_LAMP), r = 0.022, L = (pts) => m.tube(pts, r, 4, 0);
    L([[-0.6, 1.0, 0], [0.4, 1.05, 0], [0.62, 1.4, 0], [0.75, 1.55, 0], [0.95, 1.5, 0], [0.75, 1.42, 0]]); L([[-0.6, 1.0, 0], [-0.55, 0.75, 0], [0.4, 0.78, 0], [0.4, 1.05, 0]]);
    for (const [x, z] of [[-0.5, -0.12], [-0.45, 0.12], [0.3, -0.12], [0.35, 0.12]]) L([[x, 0.76, z * 0.5], [x + 0.03, 0.4, z], [x, 0, z]]);
    for (const s of [-1, 1]) { L([[0.72, 1.56, s * 0.04], [0.66, 1.75, s * 0.12], [0.6, 1.92, s * 0.2]]); L([[0.66, 1.75, s * 0.12], [0.78, 1.85, s * 0.18]]); L([[0.63, 1.85, s * 0.16], [0.52, 1.95, s * 0.22]]); }
    L([[-0.6, 1.0, 0], [-0.7, 1.1, 0]]);
    return m;
  },
  foodTruck() { // a small van selling hot drinks, 5 long (nose +x), its side hatch open on +z with an awning; lit inside
    const m = new Mesh();
    m.mat(M_DARK).box(-2.4, 0.3, -0.95, 2.4, 0.6, 0.95, 4, 0.5, 0.8);
    for (const x of [1.6, -1.6]) for (const z of [-0.85, 0.85]) p3wheel(m, x, 0.36, z, z + (z > 0 ? 0.2 : -0.2));
    m.mat(M_PAINT); p3ext(m, [[-2.5, 0.55], [2.2, 0.55], [2.5, 0.9], [2.5, 1.2], [1.8, 2.0], [-2.5, 2.4]], -1.0, 1.0, () => 1);
    m.mat(M_GLASS); p5face(m, [[2.2, 1.25, -0.85], [2.2, 1.25, 0.85], [1.75, 1.95, 0.8], [1.75, 1.95, -0.8]], [1, 0.7, 0]);
    // the hatch: the opening lit, the counter, the awning held out on struts
    m.mat(M_LAMP).box(-1.8, 1.05, 1.0, 0.8, 2.0, 1.005, 0); m.mat(M_CONC).box(-1.8, 1.0, 1.0, 0.8, 1.06, 1.35, 0, 0.8, 1);
    m.mat(M_RED); for (let k = 0; k < 6; k++) m.q4([-1.9 + k * 0.48, 2.2, 1.0], [-1.42 + k * 0.48, 2.2, 1.0], [-1.42 + k * 0.48, 2.0, 1.9], [-1.9 + k * 0.48, 2.0, 1.9], 0.9);
    m.mat(M_METAL); for (const x of [-1.8, 0.8]) m.bar([x, 1.6, 1.0], [x, 2.0, 1.9], 0.02, 0.02);
    m.mat(M_CONC); for (let k = 0; k < 4; k++) p7ring(m, -1.4 + k * 0.25, 1.2, [[1.06, 0.035], [1.17, 0.04]], 8, true, false);
    return m;
  },
  cityMap() { // a stand with the map of the town, 1.3 wide, lit from inside; the map centred at (0, 1.5, 0.08) facing +z
    const m = new Mesh().mat(M_METAL);
    m.box(-0.7, 0, -0.1, 0.7, 2.3, 0.07, 0, 0.6, 1); m.box(-0.75, 2.3, -0.15, 0.75, 2.38, 0.12, 0, 1, 1);
    return m;
  },
  goal() { // a football goal in the snow, 5 wide, 2 high, the net back to -z
    const m = new Mesh().mat(M_CONC);
    m.bar([-2.5, 0, 0], [-2.5, 2, 0], 0.08, 0.08); m.bar([2.5, 0, 0], [2.5, 2, 0], 0.08, 0.08); m.bar([-2.5, 2, 0], [2.5, 2, 0], 0.08, 0.08);
    m.mat(M_METAL); for (const x of [-2.5, 2.5]) { m.bar([x, 2, 0], [x, 0, -1.4], 0.03, 0.03); m.bar([x, 0, -1.4], [x, 0, 0], 0.03, 0.03); } m.bar([-2.5, 0, -1.4], [2.5, 0, -1.4], 0.03, 0.03);
    for (let x = -2.3; x < 2.4; x += 0.4) m.bar([x, 2, 0], [x, 0, -1.4], 0.006, 0.006);
    return m;
  },
  railing() { // a park railing of black iron, 3 m along +x, 1.4 high, a stone post at x = 0
    const m = new Mesh().mat(M_CONC); m.box(-0.2, 0, -0.2, 0.2, 1.6, 0.2, 4, 0.6, 1); m.box(-0.25, 1.6, -0.25, 0.25, 1.7, 0.25, 0, 1, 1);
    m.mat(M_DARK); for (const y of [0.15, 1.3]) m.bar([0.2, y, 0], [3, y, 0], 0.04, 0.04);
    for (let x = 0.35; x < 3; x += 0.15) { m.bar([x, 0, 0], [x, 1.42, 0], 0.02, 0.02); m.box(x - 0.02, 1.42, -0.02, x + 0.02, 1.48, 0.02, 0, 1, 1); }
    return m;
  },
};
