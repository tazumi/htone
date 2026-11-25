// ============================================================================
// props7: the furniture of the viewer's flat (plain script, concatenated after props6.js)
// ============================================================================

// closed round cylinder (or any stacked-ring body) around (cx, cz): rings = [[y, r, ao], ...]
function p7ring(m, cx, cz, rings, sides = 8, capLo = true, capHi = true) {
  p2loft(m, rings.map(([y, r, ao = 1]) => p2R(y, r, r, cx, cz, ao)), sides, capLo, capHi);
}
function p7cyl(m, cx, y0, cz, r, h, sides = 8, ao = 1) { p7ring(m, cx, cz, [[y0, r, ao], [y0 + h, r, 1]], sides); }
// square-section leg between two points
function p7leg(m, a, b, w, ao = 0.7) { m.bar(a, b, w, w, ao); }
// cabinet door: a flat face only (edges are hidden by the neighbours), flush at depth zf
function p7door(m, x0, y0, x1, y1, zf) { m.box(x0 + 0.003, y0 + 0.003, zf - 0.01, x1 - 0.003, y1 - 0.003, zf, 31); }
// raised door panel (moulding)
function p7panel(m, x0, y0, x1, y1, zf, t = 0.006) { m.box(x0, y0, zf, x1, y1, zf + t, 20); }
// handle: a thin vertical brass strip, front face only
function p7handle(m, x, y, zf, h = 0.1, w = 0.012) { m.mat(M_YEL).box(x - w / 2, y - h / 2, zf, x + w / 2, y + h / 2, zf + 0.014, 16 | 4); }
// row of standing books between x0 and x1 on a shelf at height y, spine depth z1; maxH caps the height
function p7books(m, x0, x1, y, z0, z1, maxH, seed = 0) {
  const mats = [M_TINT, M_RED, M_DARK, M_GRN, M_RED, M_TINT, M_DARK];
  let x = x0, k = seed;
  while (x < x1 - 0.03) {
    const w = 0.026 + 0.018 * abs(sin(k * 1.7 + 0.3)), h = maxH * (0.62 + 0.38 * abs(sin(k * 2.9 + 1)));
    const z = z1 - 0.03 * abs(sin(k * 3.1));
    m.mat(mats[(k * 3 + seed) % mats.length]).box(x, y, z0, min(x + w, x1), y + h, z, 1 | 2 | 4 | 16);
    x += w + 0.002; k++;
  }
}

const PROPS7 = {
  sofa() { // 2.0 wide (x), 0.9 deep (z 0..0.9), 0.85 high; back against z = 0, faces +z; origin: floor, centre of the back
    const m = new Mesh();
    m.mat(M_BARK);
    for (const sx of [-1, 1]) for (const [zt, zb] of [[0.08, 0.05], [0.8, 0.84]]) p7leg(m, [sx * 0.88, 0.13, zt], [sx * 0.93, 0, zb], 0.045);
    m.mat(M_TINT);
    m.box(-1, 0.12, 0, 1, 0.26, 0.9, 4 | 16, 0.6, 1);
    m.box(-0.99, 0.26, 0, 0.99, 0.85, 0.06, 16 | 4, 0.8, 1);
    for (const sx of [-1, 1]) m.box(sx > 0 ? 0.89 : -0.99, 0.26, 0, sx > 0 ? 0.99 : -0.89, 0.6, 0.88, 16 | 4, 0.8, 1);
    const w = (1.74 - 0.02) / 3;
    for (let i = 0; i < 3; i++) {
      const x0 = -0.87 + i * (w + 0.01);
      m.box(x0, 0.26, 0.2, x0 + w, 0.42, 0.88, 4, 0.7, 1); // seat cushion
      m.box(x0, 0.42, 0.06, x0 + w, 0.82, 0.24, 4, 0.8, 1); // back cushion
    }
    m.mat(M_BARK);
    for (const sx of [-1, 1]) {
      const a = sx > 0 ? 0.87 : -1, b = sx > 0 ? 1 : -0.87;
      m.box(a, 0.6, 0, b, 0.64, 0.9, 16 | 4);          // wooden armrest top
      m.box(a, 0.26, 0.88, b, 0.6, 0.9, 16 | 4, 0.8, 1); // wooden front post
    }
    m.box(-0.99, 0.82, 0, 0.99, 0.85, 0.1, 16 | 4);   // back top rail
    // two small cushions leaning in the corners
    m.mat(M_CONC).sweep([[-0.7, 0.45, 0.34], [-0.66, 0.78, 0.22]], 0.4, 0.14, () => [0, 0, 1], true, 0.9);
    m.mat(M_RED).sweep([[0.7, 0.45, 0.34], [0.74, 0.76, 0.22]], 0.38, 0.13, () => [0, 0, 1], true, 0.9);
    return m;
  },

  armchair() { // 0.75 wide, 0.8 deep (z 0..0.8), 0.85 high; back against z = 0, faces +z
    const m = new Mesh();
    m.mat(M_BARK);
    for (const sx of [-1, 1]) for (const [zt, zb] of [[0.12, 0.06], [0.68, 0.76]]) p7leg(m, [sx * 0.3, 0.2, zt], [sx * 0.36, 0, zb], 0.035);
    m.mat(M_TINT);
    m.box(-0.375, 0.18, 0, 0.375, 0.26, 0.8, 4 | 16, 0.6, 1);
    m.box(-0.37, 0.26, 0, 0.37, 0.85, 0.06, 16 | 4, 0.8, 1);
    for (const sx of [-1, 1]) m.box(sx > 0 ? 0.285 : -0.375, 0.26, 0, sx > 0 ? 0.375 : -0.285, 0.58, 0.78, 16 | 4, 0.8, 1);
    m.box(-0.275, 0.26, 0.2, 0.275, 0.4, 0.78, 4, 0.7, 1);
    m.box(-0.275, 0.4, 0.06, 0.275, 0.82, 0.24, 4, 0.8, 1);
    m.mat(M_BARK);
    for (const sx of [-1, 1]) {
      const a = sx > 0 ? 0.275 : -0.375, b = sx > 0 ? 0.375 : -0.275;
      m.box(a, 0.58, 0, b, 0.62, 0.8, 16 | 4);
      m.box(a, 0.26, 0.78, b, 0.58, 0.8, 16 | 4, 0.8, 1);
    }
    m.box(-0.37, 0.82, 0, 0.37, 0.85, 0.1, 16 | 4);
    return m;
  },

  wallUnit() { // 3.0 wide (x -1.5..1.5), 2.3 high, 0.45 deep (z 0..0.45), back at z = 0; returns {m, tv} tv = centre of the niche floor (niche x -0.1..0.7, y 0.75..1.35)
    const m = new Mesh(), D = 0.45;
    m.mat(M_BARK);
    m.box(-1.48, 0, 0.03, 1.48, 0.08, D - 0.04, 4 | 16);                 // plinth
    m.box(-1.5, 0.08, 0, 1.5, 2.3, 0.02, 4 | 16);                        // back panel
    m.box(-1.5, 0.08, 0.02, -1.48, 2.3, D, 4 | 8);                       // sides
    m.box(1.48, 0.08, 0.02, 1.5, 2.3, D, 4 | 8);
    for (const x of [-0.8, -0.1, 0.7]) m.box(x - 0.01, 0.08, 0.02, x + 0.01, 2.28, D, 4 | 8); // partitions
    m.box(-1.5, 2.28, 0, 1.5, 2.3, D, 4 | 16);                           // top
    m.box(-1.5, 0.08, 0.02, 1.5, 0.1, D, 4 | 16);                        // base
    m.box(-1.48, 1.78, 0.02, 1.48, 1.8, D, 8 | 16);                      // shelf under the top cabinets
    m.box(-0.1, 0.73, 0.02, 0.7, 0.75, D, 16);                           // niche floor
    m.box(-0.1, 1.33, 0.02, 0.7, 1.35, D, 16);                           // niche ceiling
    m.box(0.7, 0.73, 0.02, 1.48, 0.75, D, 16);
    // A: wardrobe, two solid doors
    for (const [a, b] of [[-1.49, -1.15], [-1.15, -0.81]]) {
      m.mat(M_BARK); p7door(m, a, 0.1, b, 1.78, D);
      p7panel(m, a + 0.05, 0.2, b - 0.05, 1.68, D);
    }
    p7handle(m, -1.17, 0.95, D); p7handle(m, -1.13, 0.95, D);
    // B: lower doors, then a glass-fronted cabinet
    m.mat(M_BARK);
    for (const [a, b] of [[-0.79, -0.45], [-0.45, -0.11]]) { p7door(m, a, 0.1, b, 0.73, D); p7panel(m, a + 0.04, 0.16, b - 0.04, 0.67, D); }
    p7handle(m, -0.47, 0.55, D, 0.08); p7handle(m, -0.43, 0.55, D, 0.08);
    m.mat(M_GLASS);
    for (const y of [1.12, 1.45]) m.box(-0.79, y, 0.04, -0.11, y + 0.012, D - 0.04, 16);
    // crystal and dishes behind the glass: glasses, stacked plates on edge, a bowl
    m.mat(M_LENS);
    for (let k = 0; k < 6; k++) {
      const x = -0.7 + k * 0.05;
      m.tube([[x, 1.132, 0.3], [x, 1.232, 0.3]], (j) => [0.01, 0.026][j], 4, 1);
    }
    m.mat(M_CONC);
    for (let k = 0; k < 4; k++) m.box(-0.44 + k * 0.012, 1.132, 0.2, -0.434 + k * 0.012, 1.34, 0.4, 1 | 2 | 4 | 16);
    m.mat(M_LENS).tube([[-0.25, 1.15, 0.24], [-0.25, 1.2, 0.24], [-0.25, 1.25, 0.24]], (j) => [0.03, 0.07, 0.1][j], 6, 1);
    for (let k = 0; k < 5; k++) { const x = -0.7 + k * 0.1; m.tube([[x, 1.462, 0.3], [x, 1.58, 0.3]], (j) => [0.012, 0.035][j], 4, 1); }
    m.mat(M_CONC);
    for (let k = 0; k < 3; k++) m.box(-0.34 + k * 0.1, 1.462, 0.15, -0.3 + k * 0.1, 1.64, 0.3, 1 | 2 | 4 | 16);
    // left glass door (closed) with a wooden frame, right door swung open
    const leaf = (zf) => {
      m.mat(M_BARK);
      m.box(-0.35, 0.75, zf - 0.02, -0.32, 1.78, zf, 16 | 4 | 8);
      m.box(-0.03, 0.75, zf - 0.02, 0, 1.78, zf, 16 | 4 | 8);
      m.box(-0.32, 0.75, zf - 0.02, -0.03, 0.78, zf, 16 | 4);
      m.box(-0.32, 1.75, zf - 0.02, -0.03, 1.78, zf, 16 | 4 | 8);
      m.mat(M_GLASS);
      m.q4([-0.32, 0.78, zf - 0.005], [-0.03, 0.78, zf - 0.005], [-0.03, 1.75, zf - 0.005], [-0.32, 1.75, zf - 0.005]);
      m.q4([-0.03, 0.78, zf - 0.015], [-0.32, 0.78, zf - 0.015], [-0.32, 1.75, zf - 0.015], [-0.03, 1.75, zf - 0.015]);
    };
    m.at(-0.45, 0, 0); leaf(D); m.at(-0.115, 0, D, 1.3); leaf(0); m.at(0, 0, 0);
    // C: lower cupboard, the niche (empty), a small door row above
    m.mat(M_BARK);
    for (const [a, b] of [[-0.09, 0.3], [0.3, 0.69]]) {
      p7door(m, a, 0.1, b, 0.73, D); p7panel(m, a + 0.04, 0.16, b - 0.04, 0.67, D);
      p7door(m, a, 1.37, b, 1.78, D); p7panel(m, a + 0.04, 1.42, b - 0.04, 1.73, D);
    }
    p7handle(m, 0.28, 0.45, D, 0.08); p7handle(m, 0.32, 0.45, D, 0.08); p7handle(m, 0.28, 1.57, D, 0.08); p7handle(m, 0.32, 1.57, D, 0.08);
    // D: drop-down bar door below, open shelves with books above
    m.mat(M_BARK); p7door(m, 0.71, 0.1, 1.49, 0.73, D); p7panel(m, 0.76, 0.15, 1.44, 0.68, D);
    p7handle(m, 1.1, 0.64, D, 0.14, 0.02);
    m.mat(M_METAL).box(1.1 - 0.02, 0.4, D + 0.006, 1.1 + 0.02, 0.43, D + 0.012, 16); // lock plate
    m.mat(M_BARK);
    m.box(0.71, 1.1, 0.02, 1.48, 1.12, D, 16);
    m.box(0.71, 1.45, 0.02, 1.48, 1.47, D, 16);
    p7books(m, 0.73, 1.46, 0.75, 0.1, 0.4, 0.3, 1);
    p7books(m, 0.73, 1.1, 1.12, 0.1, 0.4, 0.27, 5);
    m.mat(M_LENS).tube([[1.35, 1.12, 0.25], [1.35, 1.2, 0.25], [1.35, 1.36, 0.25], [1.35, 1.42, 0.25]], (j) => [0.04, 0.06, 0.03, 0.04][j], 6, 1);
    p7books(m, 0.73, 1.05, 1.47, 0.1, 0.4, 0.26, 9);
    for (let k = 0; k < 3; k++) m.mat([M_RED, M_TINT, M_DARK][k]).box(1.26, 1.47 + k * 0.045, 0.1, 1.46, 1.47 + (k + 1) * 0.045, 0.38 - k * 0.02, 1 | 4 | 16);
    // top cabinets
    m.mat(M_BARK);
    for (const [a, c] of [[-1.49, -0.81], [-0.79, -0.11], [-0.09, 0.69], [0.71, 1.49]]) {
      const mid = (a + c) / 2;
      p7door(m, a, 1.82, mid, 2.28, D); p7door(m, mid, 1.82, c, 2.28, D);
      
      p7handle(m, mid - 0.04, 1.85 + 0.0, D, 0.08); p7handle(m, mid + 0.04, 1.85, D, 0.08);
    }
    return { m, tv: [0.3, 0.75, 0.235] };
  },

  tvSet() { // CRT TV 0.62 wide, 0.48 tall, 0.45 deep, centred on z; origin bottom centre of the case, screen faces +z; returns {m, screen, w, h}
    const m = new Mesh(), zf = 0.225;
    m.mat(M_BARK);
    m.box(-0.31, 0.015, -zf, 0.31, 0.48, zf, 4);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) m.box(sx * 0.26 - 0.02, 0, sz * 0.17 - 0.02, sx * 0.26 + 0.02, 0.015, sz * 0.17 + 0.02, 0, 0.6, 1);
    // bulged screen: a 5 x 4 grid of vertices, pushed out towards the middle
    const sw = 0.42, sh = 0.34, cx = -0.06, cy = 0.26, nx = 5, ny = 4, g = [];
    m.mat(M_DARK);
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      const u = i / nx * 2 - 1, v = j / ny * 2 - 1;
      g.push(m.v(cx + u * sw / 2, cy + v * sh / 2, zf + 0.002 + 0.014 * (1 - u * u) * (1 - v * v), 1));
    }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) m.quad(g[j * (nx + 1) + i], g[j * (nx + 1) + i + 1], g[(j + 1) * (nx + 1) + i + 1], g[(j + 1) * (nx + 1) + i]);
    // control panel: speaker slots, knobs, a dial
    m.box(0.15, 0.1, zf, 0.285, 0.42, zf + 0.003, 16);
    for (let k = 0; k < 5; k++) m.box(0.17, 0.3 + k * 0.025, zf + 0.003, 0.265, 0.309 + k * 0.025, zf + 0.005, 16 | 4);
    m.mat(M_METAL);
    for (const [x, y] of [[0.185, 0.2], [0.25, 0.2], [0.185, 0.13], [0.25, 0.13]]) m.tube([[x, y, zf + 0.003], [x, y, zf + 0.03]], 0.014, 6, 2);
    m.mat(M_YEL).box(0.15, 0.085, zf, 0.285, 0.09, zf + 0.004, 16 | 4);
    // rod antenna "rogatka"
    m.mat(M_DARK).box(-0.04, 0.48, -0.08, 0.04, 0.5, 0.0, 4);
    m.mat(M_METAL);
    m.tube([[0, 0.5, -0.04], [-0.24, 0.8, -0.08]], 0.004, 4, 2);
    m.tube([[0, 0.5, -0.04], [0.26, 0.76, -0.1]], 0.004, 4, 2);
    m.mat(M_DARK);
    p2ball(m, -0.24, 0.8, -0.08, 0.01, 2, 5); p2ball(m, 0.26, 0.76, -0.1, 0.01, 2, 5);
    return { m, screen: [cx, cy, zf + 0.016], w: sw, h: sh };
  },

  coffeeTable() { // 1.0 (x) x 0.55 (z) x 0.5 high, centred at the origin, free standing
    const m = new Mesh().mat(M_BARK);
    m.box(-0.5, 0.46, -0.275, 0.5, 0.5, 0.275);
    m.box(-0.45, 0.4, -0.225, 0.45, 0.46, 0.225, 8, 0.8, 1);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) p7leg(m, [sx * 0.44, 0.4, sz * 0.19], [sx * 0.47, 0, sz * 0.23], 0.04);
    m.box(-0.43, 0.12, -0.2, 0.43, 0.14, 0.2, 0, 0.6, 1);
    // doily and vase with dried flowers
    m.mat(M_CONC); p7cyl(m, -0.22, 0.5, 0, 0.17, 0.004, 12);
    m.mat(M_LENS); p7ring(m, -0.22, 0, [[0.504, 0.035], [0.54, 0.05], [0.6, 0.03], [0.64, 0.04]], 8, true, false);
    const fl = [[-0.04, 0.02, M_RED], [0.05, -0.02, M_YEL], [0.0, 0.05, M_RED], [-0.06, -0.04, M_YEL], [0.04, 0.05, M_RED]];
    fl.forEach(([dx, dz, mt], k) => {
      m.mat(M_BARK).tube([[-0.22, 0.6, 0], [-0.22 + dx * 2, 0.82 + k * 0.03, dz * 2], [-0.22 + dx * 4, 0.92 + k * 0.02, dz * 4]], 0.003, 4, 0);
      m.mat(mt).box(-0.22 + dx * 4 - 0.014, 0.92 + k * 0.02, dz * 4 - 0.014, -0.22 + dx * 4 + 0.014, 0.95 + k * 0.02, dz * 4 + 0.014, 4);
    });
    // ashtray with a butt, newspaper
    m.mat(M_GLASS); p7ring(m, 0.12, 0.14, [[0.5, 0.05], [0.52, 0.065], [0.52, 0.045]], 10, true, false);
    m.mat(M_CONC).box(0.1, 0.512, 0.13, 0.13, 0.52, 0.136, 4);
    m.at(0.27, 0, -0.04, 0.35);
    m.mat(M_CONC).box(-0.14, 0.5, -0.19, 0.14, 0.504, 0.19, 4);
    m.mat(M_DARK).box(-0.12, 0.504, 0.12, 0.12, 0.5045, 0.17, 4);
    for (let k = 0; k < 3; k++) m.box(-0.12 + k * 0.08, 0.504, -0.16, -0.06 + k * 0.08, 0.5045, 0.1, 4);
    m.at(0, 0, 0);
    return m;
  },

  floorLamp() { // "torsher" 1.6 m high, free standing at the origin; returns {m, light} light = bulb centre
    const m = new Mesh();
    m.mat(M_METAL);
    p7ring(m, 0, 0, [[0, 0.19, 0.6], [0.02, 0.19, 0.8], [0.035, 0.14, 1], [0.05, 0.03, 1]], 12, true, false);
    m.tube([[0, 0.04, 0], [0, 0.7, 0], [0, 1.2, 0]], (k) => [0.014, 0.011, 0.008][k], 6, 2);
    m.mat(M_YEL).tube([[0, 0.8, 0], [0, 0.84, 0]], 0.02, 6, 3);
    m.mat(M_METAL);
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + 0.5; m.bar([cos(a) * 0.01, 1.18, sin(a) * 0.01], [cos(a) * 0.1, 1.24, sin(a) * 0.1], 0.006, 0.006); }
    m.mat(M_TINT); p2loft(m, [p2R(1.24, 0.24), p2R(1.42, 0.17), p2R(1.6, 0.1)], 12, false, true);
    m.mat(M_LAMP);
    p2loft(m, [p2R(1.235, 0.235), p2R(1.236, 0.2)], 12, true, false);
    p2ball(m, 0, 1.33, 0, 0.045, 3, 8);
    return { m, light: [0, 1.33, 0] };
  },

  chandelier() { // hangs from y = 0 down to about -0.7, centred on x = z = 0; returns {m, light}
    const m = new Mesh();
    m.mat(M_YEL);
    p7ring(m, 0, 0, [[0, 0.09, 0.8], [-0.025, 0.09, 1], [-0.04, 0.03, 1]], 10, false, true);
    m.tube([[0, -0.03, 0], [0, -0.22, 0]], 0.012, 6, 0);
    p2ball(m, 0, -0.26, 0, 0.045, 2, 6);
    const gl = [], gm = [];
    for (let k = 0; k < 3; k++) {
      const a = k * TAU / 3 + 0.4, c = cos(a), s = sin(a);
      const P = (r, y) => [c * r, y, s * r];
      m.mat(M_YEL).tube([P(0.02, -0.26), P(0.12, -0.36), P(0.24, -0.38), P(0.3, -0.32)], (j) => [0.009, 0.008, 0.007, 0.007][j], 4, 0);
      p2ball(m, c * 0.3, -0.34, s * 0.3, 0.012, 2, 5);
      gl.push([c * 0.3, s * 0.3]);
    }
    for (const [x, z] of gl) {
      m.mat(M_GLASS); p7ring(m, x, z, [[-0.32, 0.016], [-0.26, 0.055], [-0.17, 0.075], [-0.14, 0.08]], 6, true, false);
      m.mat(M_LAMP); p7ring(m, x, z, [[-0.3, 0.012], [-0.25, 0.045], [-0.17, 0.062], [-0.155, 0.066]], 6, false, false);
      p2ball(m, x, -0.2, z, 0.022, 1, 5);
    }
    // crystal drops hung on a ring below the hub
    m.mat(M_YEL);
    p7ring(m, 0, 0, [[-0.4, 0.2], [-0.404, 0.2]], 10, false, false);
    m.tube([[0, -0.3, 0], [0, -0.58, 0]], 0.008, 5, 0);
    m.mat(M_LENS);
    for (let k = 0; k < 10; k++) {
      const a = k * TAU / 10, x = cos(a) * 0.2, z = sin(a) * 0.2, l = 0.05 + 0.02 * (k % 3);
      m.tube([[x, -0.402, z], [x, -0.402 - l, z]], (j) => [0.006, 0.001][j], 4, 0);
    }
    m.mat(M_YEL); p2ball(m, 0, -0.56, 0, 0.03, 2, 6, 1.3);
    m.mat(M_LENS).tube([[0, -0.58, 0], [0, -0.64, 0], [0, -0.7, 0]], (j) => [0.006, 0.018, 0.002][j], 6, 0);
    return { m, light: [0, -0.24, 0] };
  },

  plafond() { // flat round ceiling lamp, diameter 0.35, hangs from y = 0 to -0.135; returns {m, light}
    const m = new Mesh();
    m.mat(M_METAL);
    p7ring(m, 0, 0, [[0, 0.175], [-0.025, 0.175], [-0.035, 0.16]], 16, false, true);
    m.mat(M_LAMP);
    p2loft(m, [p2R(-0.03, 0.16), p2R(-0.06, 0.15), p2R(-0.1, 0.11), p2R(-0.125, 0.06), p2R(-0.135, 0.015)], 16, false, true);
    return { m, light: [0, -0.08, 0] };
  },

  bed() { // double bed 1.6 wide (x) x 2.0 (z 0..2.0), headboard against z = 0 (1.0 high), 0.58 to the mattress top
    const m = new Mesh();
    m.mat(M_BARK);
    m.box(-0.85, 0.2, 0, 0.85, 1.0, 0.06, 16 | 4, 0.8, 1);                   // headboard
    m.box(-0.85, 0.95, 0, 0.85, 1.02, 0.09, 16 | 4);                         // cap rail
    m.box(-0.85, 0.12, 0.06, -0.8, 0.4, 2.0, 4, 0.7, 1); m.box(0.8, 0.12, 0.06, 0.85, 0.4, 2.0, 4, 0.7, 1); // side rails
    m.box(-0.8, 0.12, 1.94, 0.8, 0.46, 2.0, 4, 0.7, 1);                      // footboard
    m.box(-0.8, 0.26, 0.06, 0.8, 0.3, 1.94, 4);                              // slats
    for (const [x, z] of [[-0.83, 0.03], [0.83, 0.03], [-0.83, 1.97], [0.83, 1.97]]) m.box(x - 0.03, 0, z - 0.03, x + 0.03, 0.12, z + 0.03, 4, 0.6, 1);
    m.mat(M_CONC).box(-0.8, 0.3, 0.06, 0.8, 0.52, 1.94, 4, 0.7, 1);        // mattress (sheet)
    m.mat(M_TINT);
    m.box(-0.8, 0.52, 0.7, 0.8, 0.58, 1.94, 4, 0.8, 1);                      // blanket
    m.box(-0.81, 0.4, 0.7, -0.8, 0.58, 1.94, 1 | 2 | 4); m.box(0.8, 0.4, 0.7, 0.81, 0.58, 1.94, 1 | 2 | 4); // drape at the sides
    m.box(-0.8, 0.4, 1.94, 0.8, 0.58, 1.95, 4 | 16);
    m.box(-0.8, 0.58, 0.62, 0.8, 0.64, 0.82, 0, 1, 1);                       // folded-over top
    // two pillows
    m.mat(M_CONC);
    for (const sx of [-1, 1]) p2loft(m, [p2R(0.52, 0.12, 0.08, sx * 0.4, 0.38), p2R(0.57, 0.25, 0.17, sx * 0.4, 0.38, 0.9), p2R(0.63, 0.27, 0.19, sx * 0.4, 0.38), p2R(0.69, 0.16, 0.11, sx * 0.4, 0.38), p2R(0.71, 0.03, 0.02, sx * 0.4, 0.38)], 10, false, true);
    // crumpled throw at the foot
    m.mat(M_RED).sweep([[-0.6, 0.64, 1.5], [-0.3, 0.68, 1.62], [0.0, 0.65, 1.52], [0.3, 0.7, 1.64], [0.6, 0.66, 1.56]], 0.3, 0.07, () => [0, 1, 0], true, 0.95);
    m.sweep([[-0.5, 0.64, 1.75], [-0.2, 0.67, 1.7], [0.2, 0.65, 1.78], [0.5, 0.68, 1.72]], 0.26, 0.06, () => [0, 1, 0], true, 0.95);
    return m;
  },

  wardrobe() { // two-door wardrobe 1.2 wide, 2.1 high (suitcase on top to 2.3), 0.6 deep (z 0..0.6), back against z = 0
    const m = new Mesh().mat(M_BARK);
    m.box(-0.59, 0, 0.02, 0.59, 0.08, 0.56, 4 | 16, 0.5, 1);                   // plinth
    m.box(-0.6, 0.08, 0, 0.6, 2.08, 0.57, 16 | 4);                           // carcass
    m.box(-0.62, 2.08, 0, 0.62, 2.12, 0.62, 16 | 4);                         // cornice
    for (const [a, b] of [[-0.595, -0.005], [0.005, 0.595]]) {
      m.box(a, 0.12, 0.57, b, 2.04, 0.6, 16 | 4);
      m.box(a + 0.05, 0.2, 0.6, b - 0.05, 1.96, 0.606, 16 | 4);
    }
    // long mirror on the left door
    m.mat(M_LENS).q4([-0.53, 0.4, 0.607], [-0.07, 0.4, 0.607], [-0.07, 1.8, 0.607], [-0.53, 1.8, 0.607]);
    m.mat(M_BARK);
    m.box(-0.55, 0.38, 0.606, -0.53, 1.82, 0.612, 16 | 4); m.box(-0.07, 0.38, 0.606, -0.05, 1.82, 0.612, 16 | 4);
    m.box(-0.53, 1.8, 0.606, -0.07, 1.82, 0.612, 16 | 4); m.box(-0.53, 0.38, 0.606, -0.07, 0.4, 0.612, 16 | 4);
    m.mat(M_YEL);
    for (const x of [-0.04, 0.04]) m.tube([[x, 1.05, 0.6], [x, 1.05, 0.64]], 0.015, 6, 2);
    // suitcase on top
    m.mat(M_DARK).box(-0.32, 2.12, 0.1, 0.32, 2.34, 0.5, 4);
    m.mat(M_METAL);
    for (const x of [-0.18, 0.18]) m.box(x - 0.02, 2.22, 0.5, x + 0.02, 2.27, 0.512, 16);
    m.tube([[-0.07, 2.34, 0.3], [-0.07, 2.37, 0.3], [0.07, 2.37, 0.3], [0.07, 2.34, 0.3]], 0.007, 4, 0);
    return m;
  },

  nightstand() { // bedside cabinet 0.45 wide x 0.4 deep (z 0..0.4) x 0.55 high with a table lamp; returns {m, light}
    const m = new Mesh().mat(M_BARK);
    m.box(-0.22, 0.06, 0, 0.22, 0.52, 0.38, 16 | 4);
    for (const sx of [-1, 1]) for (const z of [0.04, 0.34]) m.box(sx * 0.19 - 0.02, 0, z - 0.02, sx * 0.19 + 0.02, 0.06, z + 0.02, 4, 0.6, 1);
    m.box(-0.225, 0.52, 0, 0.225, 0.55, 0.4, 16 | 4);
    m.box(-0.2, 0.34, 0.38, 0.2, 0.5, 0.4, 16 | 4);
    m.box(-0.2, 0.08, 0.38, 0.2, 0.32, 0.4, 16 | 4);
    m.mat(M_YEL);
    for (const y of [0.42, 0.2]) m.tube([[0, y, 0.4], [0, y, 0.43]], 0.012, 6, 2);
    // lamp: ceramic base, stem, fabric shade lit from inside
    m.mat(M_LENS); p7ring(m, 0.1, 0.17, [[0.55, 0.05], [0.6, 0.065], [0.65, 0.04], [0.7, 0.012]], 8, true, false);
    m.mat(M_METAL).tube([[0.1, 0.7, 0.17], [0.1, 0.78, 0.17]], 0.006, 4, 0);
    m.mat(M_TINT); p2loft(m, [p2R(0.74, 0.12, 0.12, 0.1, 0.17), p2R(0.86, 0.075, 0.075, 0.1, 0.17)], 10, false, true);
    m.mat(M_LAMP); p2loft(m, [p2R(0.742, 0.115, 0.115, 0.1, 0.17), p2R(0.743, 0.07, 0.07, 0.1, 0.17)], 10, true, false); p2ball(m, 0.1, 0.8, 0.17, 0.03, 3, 6);
    // book with an alarm clock on it
    m.mat(M_RED).box(-0.19, 0.55, 0.1, -0.03, 0.575, 0.3, 4);
    m.mat(M_METAL).box(-0.16, 0.575, 0.2, -0.06, 0.665, 0.26, 4);
    m.mat(M_CONC).q4([-0.15, 0.59, 0.261], [-0.07, 0.59, 0.261], [-0.07, 0.65, 0.261], [-0.15, 0.65, 0.261]);
    m.mat(M_DARK).box(-0.112, 0.62, 0.262, -0.108, 0.65, 0.264, 16 | 4);
    m.box(-0.112, 0.62, 0.262, -0.08, 0.624, 0.264, 16 | 4);
    m.mat(M_YEL); p2ball(m, -0.135, 0.675, 0.23, 0.014, 2, 5); p2ball(m, -0.085, 0.675, 0.23, 0.014, 2, 5);
    return { m, light: [0.1, 0.8, 0.17] };
  },

  dresser() { // "trumo" dressing table 1.0 wide (x), 0.45 deep (z 0..0.45), top 0.75, three-panel mirror to 1.5; stool in front (z about 0.75)
    const m = new Mesh().mat(M_BARK);
    m.box(-0.5, 0.72, 0, 0.5, 0.75, 0.45, 16 | 4);
    for (const sx of [-1, 1]) {
      const a = sx > 0 ? 0.22 : -0.5, b = sx > 0 ? 0.5 : -0.22;
      m.box(a, 0, 0.02, b, 0.72, 0.43, 16 | 4, 0.6, 1);
      for (const [y0, y1] of [[0.52, 0.7], [0.32, 0.5], [0.1, 0.3]]) {
        m.box(a + 0.015, y0, 0.43, b - 0.015, y1, 0.44, 16 | 4);
        m.mat(M_YEL).tube([[(a + b) / 2, (y0 + y1) / 2, 0.44], [(a + b) / 2, (y0 + y1) / 2, 0.465]], 0.01, 5, 2); m.mat(M_BARK);
      }
    }
    m.box(-0.22, 0.4, 0.02, 0.22, 0.72, 0.04, 16 | 4);
    // three-panel mirror: wooden frames, glass on the front; the side wings are folded forward
    const panel = (x0, x1) => {
      m.mat(M_BARK).box(x0, 0.82, 0, x1, 1.5, 0.025, 16 | 4);
      m.mat(M_LENS).q4([x0 + 0.02, 0.85, 0.0255], [x1 - 0.02, 0.85, 0.0255], [x1 - 0.02, 1.47, 0.0255], [x0 + 0.02, 1.47, 0.0255]);
    };
    m.at(0, 0, 0.03); panel(-0.22, 0.22);
    m.at(0.23, 0, 0.03, -0.5); panel(0, 0.27);
    m.at(-0.23, 0, 0.03, 0.5); panel(-0.27, 0);
    m.at(0, 0, 0);
    m.mat(M_BARK).box(-0.22, 0.75, 0.03, 0.22, 0.82, 0.05, 16 | 4);
    // bottles and jars
    m.mat(M_GLASS);
    for (const [x, z, r, h] of [[-0.4, 0.12, 0.025, 0.12], [-0.34, 0.2, 0.02, 0.09], [0.38, 0.14, 0.03, 0.1]]) { m.tube([[x, 0.75, z], [x, 0.75 + h, z], [x, 0.75 + h + 0.03, z]], (k) => [r, r, r * 0.4][k], 6, 1); }
    m.mat(M_RED);
    for (const [x, z, r, h] of [[-0.28, 0.1, 0.018, 0.1], [0.3, 0.2, 0.022, 0.07], [0.44, 0.22, 0.016, 0.09]]) { m.tube([[x, 0.75, z], [x, 0.75 + h, z], [x, 0.75 + h + 0.025, z]], (k) => [r, r, r * 0.4][k], 6, 1); }
    m.mat(M_CONC); p7cyl(m, 0.08, 0.75, 0.2, 0.05, 0.003, 10);
    m.mat(M_LENS); p7cyl(m, 0.08, 0.753, 0.2, 0.035, 0.03, 8);
    // stool in front
    m.mat(M_TINT); p7ring(m, 0, 0.8, [[0.4, 0.17], [0.44, 0.17, 1], [0.45, 0.14]], 10, true, true);
    m.mat(M_BARK);
    for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + 0.78; p7leg(m, [cos(a) * 0.11, 0.4, 0.8 + sin(a) * 0.11], [cos(a) * 0.17, 0, 0.8 + sin(a) * 0.17], 0.03); }
    return m;
  },

  desk() { // writing desk 1.1 wide (x) x 0.6 deep (z 0..0.6) x 0.75 high, chair pushed in (x about 0.17, back at z 0.65), green lamp, books, globe
    const m = new Mesh().mat(M_BARK);
    m.box(-0.55, 0.72, 0, 0.55, 0.75, 0.6, 16 | 4);
    m.box(-0.55, 0, 0.02, -0.2, 0.72, 0.58, 16 | 4, 0.6, 1);
    for (const [y0, y1] of [[0.5, 0.7], [0.3, 0.48], [0.08, 0.28]]) {
      m.box(-0.535, y0, 0.58, -0.215, y1, 0.585, 16 | 4);
      m.mat(M_YEL).box(-0.4, (y0 + y1) / 2 - 0.01, 0.585, -0.35, (y0 + y1) / 2 + 0.01, 0.6, 16 | 4); m.mat(M_BARK);
    }
    m.box(0.5, 0, 0.54, 0.54, 0.72, 0.58, 4, 0.6, 1); m.box(0.5, 0, 0.02, 0.54, 0.72, 0.06, 4, 0.6, 1);
    m.box(-0.2, 0.4, 0.02, 0.5, 0.72, 0.04, 16 | 4);
    // chair: tinted seat and back, steel legs
    m.mat(M_TINT).box(-0.03, 0.44, 0.3, 0.37, 0.48, 0.64, 4, 0.8, 1);
    m.box(-0.03, 0.52, 0.64, 0.37, 0.82, 0.68, 0, 0.9, 1);
    m.mat(M_METAL);
    for (const [x, z] of [[0.0, 0.33], [0.34, 0.33], [0.0, 0.6], [0.34, 0.6]]) p6rod(m, [x, 0.44, z], [x, 0, z], 0.01, 4, 0.6);
    for (const x of [0.0, 0.34]) p6rod(m, [x, 0.48, 0.62], [x, 0.52, 0.66], 0.01, 4);
    // desk lamp (green shade, off)
    p7cyl(m, 0.44, 0.75, 0.1, 0.07, 0.02, 8);
    m.tube([[0.44, 0.77, 0.1], [0.42, 0.95, 0.12], [0.34, 1.04, 0.16]], 0.006, 4, 2);
    m.mat(M_GRN); p2loft(m, [p2R(0.94, 0.1, 0.1, 0.32, 0.17), p2R(0.99, 0.085, 0.085, 0.32, 0.17), p2R(1.03, 0.05, 0.05, 0.32, 0.17), p2R(1.05, 0.015, 0.015, 0.32, 0.17)], 8, false, true);
    // school books and an open exercise book
    m.mat(M_RED).box(-0.52, 0.75, 0.1, -0.28, 0.78, 0.32, 4);
    m.mat(M_TINT).box(-0.5, 0.78, 0.12, -0.3, 0.805, 0.3, 4);
    m.mat(M_DARK).box(-0.51, 0.805, 0.1, -0.31, 0.82, 0.3, 4);
    m.mat(M_CONC).box(-0.22, 0.75, 0.32, 0.02, 0.754, 0.5, 4);
    m.mat(M_DARK).box(-0.22, 0.754, 0.32, -0.21, 0.756, 0.5, 4);
    // globe
    m.mat(M_BARK); p7cyl(m, 0.17, 0.75, 0.2, 0.06, 0.015, 8);
    m.mat(M_METAL).tube([[0.17, 0.765, 0.2], [0.17, 0.82, 0.2]], 0.006, 4, 0);
    const ring = [];
    for (let k = 0; k <= 12; k++) { const a = k / 12 * TAU, x = cos(a) * 0.12, y = sin(a) * 0.12; ring.push([0.17 + x * cos(0.4) - y * sin(0.4), 0.95 + x * sin(0.4) + y * cos(0.4), 0.2]); }
    m.tube(ring, 0.004, 4, 0);
    m.mat(M_LENS); p2ball(m, 0.17, 0.95, 0.2, 0.1, 5, 8);
    return m;
  },

  piano() { // upright piano 1.45 wide (x), 1.25 high, 0.6 deep (z 0..0.6) with keys, stool at z about 1.05, back against z = 0
    const m = new Mesh().mat(M_BARK);
    m.box(-0.725, 0, 0, 0.725, 1.25, 0.5, 16, 0.6, 1);                       // body
    m.box(-0.725, 0.68, 0.5, 0.725, 0.74, 0.6, 16 | 4 | 32);                 // key bed
    m.box(-0.725, 0.4, 0.5, 0.725, 0.68, 0.52, 16, 0.6, 1);                  // lower front board
    for (const sx of [-1, 1]) m.box(sx > 0 ? 0.65 : -0.725, 0.4, 0.5, sx > 0 ? 0.725 : -0.65, 0.84, 0.6, 16, 0.7, 1); // cheek blocks
    m.box(-0.65, 0.72, 0.52, 0.65, 0.84, 0.56, 16 | 4);                      // key slip rail
    m.box(-0.65, 0.84, 0.5, 0.65, 0.88, 0.58, 16 | 4);                       // music ledge
    // keys: 28 white, black after steps 0 1 3 4 5 of each seven
    const kw = 1.22 / 28;
    m.mat(M_CONC);
    for (let i = 0; i < 28; i++) m.box(-0.61 + i * kw + 0.0015, 0.74, 0.54, -0.61 + (i + 1) * kw - 0.0015, 0.765, 0.598, 1 | 2 | 4 | 16);
    m.mat(M_DARK);
    for (let i = 0; i < 27; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) { const x = -0.61 + (i + 1) * kw; m.box(x - 0.013, 0.765, 0.54, x + 0.013, 0.788, 0.58, 4 | 16); }
    // sheet music with staff lines, brass plate, pedals
    m.mat(M_CONC).box(-0.22, 0.88, 0.5, 0.22, 1.13, 0.506, 16 | 4);
    m.mat(M_DARK);
    for (let k = 0; k < 4; k++) m.box(-0.2, 0.95 + k * 0.05, 0.506, 0.2, 0.953 + k * 0.05, 0.508, 16 | 4);
    m.mat(M_YEL).box(-0.12, 1.16, 0.5, 0.12, 1.19, 0.505, 16 | 4);
    for (const x of [-0.06, 0.06]) { m.box(x - 0.025, 0.04, 0.52, x + 0.025, 0.055, 0.6, 4); p6rod(m, [x, 0.055, 0.52], [x, 0.4, 0.52], 0.006, 4); }
    // lace runner and vase on top
    m.mat(M_CONC).box(-0.5, 1.25, 0.12, 0.5, 1.254, 0.4, 4);
    m.mat(M_LENS); p7ring(m, 0.38, 0.26, [[1.254, 0.04], [1.3, 0.06], [1.38, 0.035], [1.42, 0.05]], 8, true, false);
    m.mat(M_BARK);
    for (const [dx, dz] of [[-0.03, 0.01], [0.03, -0.02], [0, 0.04]]) m.tube([[0.38, 1.4, 0.26], [0.38 + dx * 2, 1.55, 0.26 + dz * 2], [0.38 + dx * 4, 1.64, 0.26 + dz * 4]], 0.003, 4, 0);
    m.mat(M_RED);
    for (const [dx, dz] of [[-0.03, 0.01], [0.03, -0.02], [0, 0.04]]) m.box(0.38 + dx * 4 - 0.015, 1.63, 0.26 + dz * 4 - 0.015, 0.38 + dx * 4 + 0.015, 1.66, 0.26 + dz * 4 + 0.015, 4);
    // round stool
    m.mat(M_TINT); p7ring(m, 0, 1.05, [[0.5, 0.2], [0.54, 0.2], [0.55, 0.17]], 10, true, true);
    m.mat(M_BARK);
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + 1.57; p7leg(m, [cos(a) * 0.12, 0.5, 1.05 + sin(a) * 0.12], [cos(a) * 0.2, 0, 1.05 + sin(a) * 0.2], 0.04); }
    return m;
  },

  rug() { // carpet 2.0 (x) x 3.0 (z), 0.015 thick, centred at the origin, lying on the floor; fringe at the two short ends z = +-1.5
    const m = new Mesh().mat(M_RED);
    m.box(-1, 0, -1.5, 1, 0.015, 1.5, 4, 1, 1);
    m.mat(M_DARK);
    m.box(-0.9, 0.015, -1.4, 0.9, 0.0165, -1.34, 4); m.box(-0.9, 0.015, 1.34, 0.9, 0.0165, 1.4, 4);
    m.box(-0.9, 0.015, -1.34, -0.84, 0.0165, 1.34, 4); m.box(0.84, 0.015, -1.34, 0.9, 0.0165, 1.34, 4);
    m.mat(M_YEL);
    m.q4([0, 0.0166, -0.7], [0.45, 0.0166, 0], [0, 0.0166, 0.7], [-0.45, 0.0166, 0]);
    m.mat(M_CONC);
    for (const s of [-1, 1]) {
      m.box(-1, 0, s > 0 ? 1.5 : -1.5 - 0.02, 1, 0.012, s > 0 ? 1.52 : -1.5, 4 | 16 | 32);
      for (let k = 0; k < 40; k++) {
        const x = -0.99 + k * 0.0495;
        m.q4([x, 0.012, s * 1.52], [x + 0.014, 0.012, s * 1.52], [x + 0.016, 0.004, s * 1.6], [x + 0.002, 0.004, s * 1.6]);
      }
    }
    return m;
  },

  plant() { // rubber plant (ficus) in a pot on a wooden stand, 1.3 m tall, free standing at the origin
    const m = new Mesh().mat(M_BARK);
    p7ring(m, 0, 0, [[0.36, 0.2, 1], [0.4, 0.2]], 10, true, true);
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + 0.3; p7leg(m, [cos(a) * 0.14, 0.37, sin(a) * 0.14], [cos(a) * 0.2, 0, sin(a) * 0.2], 0.03); }
    m.mat(M_TINT); p7ring(m, 0, 0, [[0.42, 0.11, 0.6], [0.5, 0.15, 0.8], [0.58, 0.17], [0.6, 0.16]], 10, true, false);
    m.mat(M_DARK); p7ring(m, 0, 0, [[0.585, 0.155], [0.586, 0.1]], 10, true, false);
    m.mat(M_BARK).tube([[0, 0.58, 0], [0.012, 0.8, 0.008], [-0.008, 1.0, 0], [0.01, 1.16, 0.006]], (k) => [0.025, 0.02, 0.014, 0.008][k], 6, 2);
    m.mat(M_GRN);
    const N = 46;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), y = 0.74 + t * 0.42, az = i * 2.399, el = -0.3 + t * 1.5;
      const L = mix(0.27, 0.16, t), W = L * 0.46, ca = cos(az), sa = sin(az), ce = cos(el), se = sin(el);
      const bx = ca * 0.02, bz = sa * 0.02, dx = ca * ce, dy = se, dz = sa * ce, sx = -sa, sz = ca;
      const B = [bx, y, bz];
      const M0 = [bx + dx * L * 0.45, y + dy * L * 0.45 + 0.012, bz + dz * L * 0.45];
      const Lp = [bx + dx * L * 0.4 - sx * W / 2, y + dy * L * 0.4, bz + dz * L * 0.4 - sz * W / 2];
      const Rp = [bx + dx * L * 0.4 + sx * W / 2, y + dy * L * 0.4, bz + dz * L * 0.4 + sz * W / 2];
      const T = [bx + dx * L, y + dy * L - 0.03, bz + dz * L];
      m.q4(B, Lp, M0, Rp); m.q4(M0, Lp, T, Rp);
    }
    return m;
  },

  bathtub() { // cast-iron bathtub 1.5 long (x -0.75..0.75) x 0.7 (z 0..0.7) x 0.6 high, long side against z = 0; mixer tap at y 0.85, shower head hooked at y 1.9, curtain rail at y 1.95
    const m = new Mesh().mat(M_LENS);
    m.box(-0.75, 0.12, 0, 0.75, 0.2, 0.7, 0, 0.5, 0.8);
    m.box(-0.75, 0.2, 0, 0.75, 0.58, 0.05, 8, 0.6, 1);
    m.box(-0.75, 0.2, 0.65, 0.75, 0.58, 0.7, 8, 0.6, 1);
    m.box(-0.75, 0.2, 0.05, -0.7, 0.58, 0.65, 8, 0.6, 1);
    m.box(0.7, 0.2, 0.05, 0.75, 0.58, 0.65, 8, 0.6, 1);
    // rounded rim
    const rim = [];
    for (const [cx, cz, a0] of [[0.675, 0.625, 0], [-0.675, 0.625, PI / 2], [-0.675, 0.075, PI], [0.675, 0.075, PI * 1.5]]) {
      for (let k = 0; k < 3; k++) { const a = a0 + k / 2 * PI / 2; rim.push([cx + cos(a) * 0.05, 0.585, cz + sin(a) * 0.05]); }
    }
    rim.push(rim[0]);
    m.tube(rim, 0.03, 6, 0);
    // lion-paw legs and the drain
    m.mat(M_DARK);
    for (const sx of [-1, 1]) for (const z of [0.1, 0.6]) p7ring(m, sx * 0.65, z, [[0, 0.025, 1], [0.04, 0.045], [0.14, 0.045, 0.7]], 5, true, true);
    m.mat(M_METAL); p7cyl(m, 0.5, 0.2, 0.35, 0.03, 0.004, 8);
    // mixer tap on the wall: body, two heads, swivel spout
    p4rod(m, [-0.1, 0.85, 0.05], [0.1, 0.85, 0.05], 0.022, 8);
    for (const sx of [-1, 1]) { p4rod(m, [sx * 0.065, 0.85, 0], [sx * 0.065, 0.85, 0.035], 0.03, 8); p4rod(m, [sx * 0.1, 0.85, 0.05], [sx * 0.12, 0.85, 0.05], 0.03, 6); m.bar([sx * 0.12, 0.85, 0.05], [sx * 0.135, 0.85, 0.05], 0.07, 0.012); }
    m.tube([[0, 0.87, 0.05], [0, 0.91, 0.1], [0, 0.91, 0.28], [0, 0.88, 0.34], [0, 0.84, 0.355]], 0.011, 6, 2);
    p4rod(m, [0, 0.87, 0.05], [0, 0.93, 0.05], 0.012, 6); // diverter button
    // shower hose up to the head hooked on the wall
    m.tube([[0.05, 0.86, 0.055], [0.12, 0.78, 0.1], [0.26, 1.2, 0.1], [0.3, 1.6, 0.09], [0.22, 1.78, 0.07]], 0.008, 5, 3);
    m.bar([0.2, 1.9, 0], [0.2, 1.9, 0.04], 0.03, 0.03); m.bar([0.2, 1.87, 0.04], [0.2, 1.93, 0.04], 0.012, 0.012);
    p7ring(m, 0.2, 0.07, [[1.77, 0.018, 0.8], [1.84, 0.03], [1.9, 0.06]], 10, true, true);
    // plastic basin in the tub, bar of soap on the rim
    m.mat(M_TINT);
    p7ring(m, -0.35, 0.36, [[0.2, 0.14, 0.6], [0.3, 0.2], [0.4, 0.23]], 8, true, false);
    p7ring(m, -0.35, 0.36, [[0.395, 0.23], [0.4, 0.2]], 8, false, true);
    m.mat(M_CONC).box(0.36, 0.615, 0.005, 0.43, 0.64, 0.05, 0, 0.9, 1);
    // curtain rail along the front edge and a curtain bunched at one end
    m.mat(M_METAL).tube([[-0.75, 1.95, 0], [-0.75, 1.95, 0.7], [0.75, 1.95, 0.7], [0.75, 1.95, 0]], 0.012, 6, 3);
    m.mat(M_TINT);
    for (let k = 0; k < 5; k++) { const x = 0.45 + k * 0.06, z = 0.69 + (k % 2) * 0.03; m.box(x, 0.5, z, x + 0.05, 1.93, z + 0.01, 4 | 8, 0.7, 1); }
    return m;
  },

  washbasin() { // ceramic washbasin 0.55 wide (x) on a pedestal, rim at 0.85, glass shelf at 1.15, mirror 0.5 x 0.6 at y 1.3..1.9; back against z = 0; returns {m, mirror} mirror = centre of the mirror face
    const m = new Mesh().mat(M_LENS);
    p2loft(m, [p2R(0.66, 0.1, 0.07, 0, 0.18, 0.7), p2R(0.78, 0.25, 0.17, 0, 0.19), p2R(0.85, 0.275, 0.2, 0, 0.2)], 12, true, false);
    p2loft(m, [p2R(0.845, 0.25, 0.175, 0, 0.2), p2R(0.77, 0.14, 0.09, 0, 0.2, 0.7)], 12, true, false);
    m.box(-0.275, 0.85, 0, 0.275, 0.93, 0.03, 8);
    p7ring(m, 0, 0.1, [[0, 0.1, 0.7], [0.03, 0.1], [0.04, 0.06], [0.64, 0.055, 0.8]], 8, true, false);
    m.mat(M_METAL);
    p4rod(m, [0, 0.93, 0.06], [0, 0.99, 0.06], 0.02, 8);
    m.tube([[0, 0.97, 0.06], [0, 1.02, 0.07], [0, 1.02, 0.14], [0, 0.98, 0.17]], 0.009, 6, 2);
    for (const sx of [-1, 1]) { p4rod(m, [sx * 0.1, 0.93, 0.04], [sx * 0.1, 0.96, 0.04], 0.014, 6); m.bar([sx * 0.1 - 0.025, 0.96, 0.04], [sx * 0.1 + 0.025, 0.96, 0.04], 0.012, 0.012); }
    // glass shelf, brackets, mug with toothbrushes, bottles
    for (const sx of [-1, 1]) m.bar([sx * 0.22, 1.12, 0.005], [sx * 0.22, 1.15, 0.1], 0.012, 0.012);
    m.mat(M_GLASS).box(-0.25, 1.15, 0, 0.25, 1.158, 0.13, 0, 1, 1);
    m.mat(M_LENS); p7ring(m, -0.16, 0.06, [[1.158, 0.03], [1.2, 0.034], [1.2, 0.028]], 8, true, false);
    m.mat(M_RED).bar([-0.165, 1.18, 0.06], [-0.155, 1.27, 0.05], 0.01, 0.006);
    m.mat(M_TINT).bar([-0.15, 1.18, 0.065], [-0.135, 1.26, 0.07], 0.01, 0.006);
    m.mat(M_GLASS); p7ring(m, -0.02, 0.06, [[1.158, 0.025], [1.24, 0.028], [1.28, 0.012], [1.31, 0.011]], 8, true, true);
    m.mat(M_RED); p7ring(m, 0.07, 0.07, [[1.158, 0.022], [1.22, 0.022], [1.24, 0.01], [1.26, 0.01]], 8, true, true);
    m.mat(M_TINT); p7ring(m, 0.16, 0.05, [[1.158, 0.02], [1.2, 0.022], [1.23, 0.02]], 8, true, true);
    // mirror with a thin steel frame, face at z = 0.017
    m.mat(M_METAL);
    m.box(-0.256, 1.294, 0, 0.256, 1.306, 0.02, 0); m.box(-0.256, 1.894, 0, 0.256, 1.906, 0.02, 0);
    m.box(-0.256, 1.306, 0, -0.244, 1.894, 0.02, 0); m.box(0.244, 1.306, 0, 0.256, 1.894, 0.02, 0);
    m.mat(M_LENS).box(-0.244, 1.306, 0.004, 0.244, 1.894, 0.017, 1 | 2 | 4 | 8 | 16, 1, 1);
    return { m, mirror: [0, 1.6, 0.017] };
  },

  washer() { // front-loading washing machine 0.6 wide (x -0.3..0.3) x 0.85 high x 0.5 deep (z 0..0.5), back against z = 0, door faces +z; folded towel on top
    const m = new Mesh().mat(M_CONC);
    const disc = (cx, cy, z, r, n) => {
      const c = m.v(cx, cy, z), ring = [];
      for (let k = 0; k < n; k++) { const a = k / n * TAU; ring.push(m.v(cx + cos(a) * r, cy + sin(a) * r, z)); }
      for (let k = 0; k < n; k++) m.tri(c, ring[k], ring[(k + 1) % n]);
    };
    m.box(-0.3, 0.03, 0, 0.3, 0.85, 0.5, 4, 0.7, 1);
    m.mat(M_DARK); for (const sx of [-1, 1]) for (const z of [0.05, 0.45]) m.box(sx * 0.26 - 0.025, 0, z - 0.025, sx * 0.26 + 0.025, 0.03, z + 0.025, 8);
    // porthole door
    m.mat(M_METAL);
    const ring = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * TAU; ring.push([cos(a) * 0.2, 0.4 + sin(a) * 0.2, 0.508]); }
    m.tube(ring, 0.016, 6, 0);
    m.mat(M_GLASS); disc(0, 0.4, 0.509, 0.19, 16);
    m.mat(M_CONC); m.box(0.17, 0.36, 0.5, 0.2, 0.44, 0.52, 1 | 16, 1, 1);
    // control panel: detergent drawer, knobs, indicator
    m.mat(M_DARK).box(-0.27, 0.69, 0.5, 0.27, 0.8, 0.504, 0);
    m.mat(M_LENS).box(-0.25, 0.7, 0.504, -0.04, 0.79, 0.512, 0);
    for (const x of [0.07, 0.15, 0.23]) p4rod(m, [x, 0.745, 0.504], [x, 0.745, 0.526], 0.022, 8);
    m.mat(M_RED).box(0.0, 0.76, 0.504, 0.015, 0.775, 0.508, 0);
    m.mat(M_METAL).box(-0.1, 0.1, 0.5, 0.1, 0.13, 0.503, 0);
    // folded towel on top
    m.mat(M_TINT);
    m.box(-0.22, 0.85, 0.08, 0.2, 0.89, 0.4, 4, 1, 1);
    m.box(-0.2, 0.89, 0.1, 0.18, 0.925, 0.38, 4, 1, 1);
    m.mat(M_CONC).box(-0.21, 0.865, 0.08, -0.15, 0.885, 0.401, 4, 1, 1);
    return m;
  },

  toilet() { // Soviet toilet: bowl on a pedestal (z 0.03..0.69), seat lid raised, high cistern at y 1.6..1.9 against z = 0; centred x = 0; side wall assumed at x = 0.46; riser pipe at (-0.35, 0.12) floor to 2.6
    const m = new Mesh().mat(M_LENS);
    p2loft(m, [p2R(0, 0.1, 0.12, 0, 0.2, 0.6), p2R(0.1, 0.09, 0.1, 0, 0.2), p2R(0.28, 0.1, 0.18, 0, 0.26)], 12, true, false);
    p2loft(m, [p2R(0.24, 0.1, 0.18, 0, 0.27, 0.7), p2R(0.36, 0.18, 0.3, 0, 0.36), p2R(0.42, 0.19, 0.33, 0, 0.36)], 12, false, false);
    p2loft(m, [p2R(0.415, 0.15, 0.27, 0, 0.38, 0.7), p2R(0.3, 0.07, 0.12, 0, 0.34, 0.5)], 12, false, true);
    // seat ring and lid raised against the wall
    m.mat(M_DARK);
    const seat = []; for (let k = 0; k <= 14; k++) { const a = k / 14 * TAU; seat.push([cos(a) * 0.16, 0.438, 0.38 + sin(a) * 0.29]); }
    m.tube(seat, 0.028, 6, 0);
    m.sweep([[0, 0.46, 0.08], [0, 0.95, 0.04]], 0.36, 0.025, () => [0, 0, 1], true, 1);
    m.box(-0.15, 0.43, 0.04, -0.1, 0.46, 0.09, 0); m.box(0.1, 0.43, 0.04, 0.15, 0.46, 0.09, 0);
    // high cistern, flush pipe, lever and chain with a handle
    m.mat(M_LENS);
    m.box(-0.2, 1.6, 0, 0.2, 1.9, 0.18, 0, 0.8, 1);
    m.box(-0.215, 1.9, 0, 0.215, 1.925, 0.2, 0, 1, 1);
    m.mat(M_METAL);
    m.tube([[0, 1.6, 0.09], [0, 1.0, 0.09], [0, 0.55, 0.1], [0, 0.46, 0.2]], 0.021, 6, 0);
    m.bar([-0.2, 1.8, 0.09], [-0.29, 1.8, 0.09], 0.012, 0.012);
    m.tube([[-0.29, 1.8, 0.09], [-0.292, 1.7, 0.092], [-0.288, 1.55, 0.088], [-0.29, 1.4, 0.09], [-0.29, 1.25, 0.09]], 0.003, 4, 0);
    m.mat(M_BARK); p7ring(m, -0.29, 0.09, [[1.12, 0.012], [1.2, 0.02], [1.26, 0.008]], 6, true, true);
    // toilet paper roll on a holder at the side wall
    m.mat(M_METAL).bar([0.46, 0.7, 0.25], [0.31, 0.7, 0.25], 0.008, 0.008);
    m.bar([0.465, 0.62, 0.25], [0.465, 0.78, 0.25], 0.04, 0.03);
    m.mat(M_CONC); p4rod(m, [0.345, 0.7, 0.25], [0.445, 0.7, 0.25], 0.055, 10);
    // sewer riser pipe, floor to ceiling, with collars
    m.mat(M_METAL);
    p7cyl(m, -0.35, 0, 0.12, 0.11, 2.6, 10);
    for (const y of [0.9, 1.7, 2.5]) p7ring(m, -0.35, 0.12, [[y, 0.125], [y + 0.04, 0.125]], 10, true, true);
    return m;
  },

  towelRail() { // heated towel rail, zigzag tube of 3 turns 0.6 wide (x -0.3..0.3) at y 0.9..1.5, 0.08 off the wall (z = 0); towel hangs over the 1.3 run
    const m = new Mesh().mat(M_METAL);
    const pts = [];
    for (let i = 0; i < 4; i++) {
      const y = 0.9 + i * 0.2, dir = i % 2 ? -1 : 1;
      pts.push([-0.2 * dir, y, 0.08], [0.2 * dir, y, 0.08]);
      if (i < 3) for (let k = 1; k < 5; k++) { const a = k / 5 * PI; pts.push([(0.2 + sin(a) * 0.1) * dir, y + 0.1 - cos(a) * 0.1, 0.08]); }
    }
    m.tube(pts, 0.014, 6, 3);
    for (const y of [0.9, 1.5]) { m.bar([-0.2, y, 0.08], [-0.2, y, 0.01], 0.026, 0.026); p4rod(m, [-0.2, y, 0.0], [-0.2, y, 0.018], 0.04, 8); }
    m.mat(M_TINT);
    m.box(-0.15, 0.78, 0.098, 0.15, 1.325, 0.106, 0, 0.7, 1);
    m.box(-0.15, 0.86, 0.054, 0.15, 1.325, 0.062, 0, 0.7, 1);
    m.box(-0.15, 1.316, 0.054, 0.15, 1.325, 0.106, 0, 1, 1);
    return m;
  },

  coatRack() { // hallway coat rack: board 1.0 wide (x -0.5..0.5) at y 1.65..1.75 with 5 hooks, hat shelf at 1.9, two winter coats and a fur coat hanging to about y 0.6; back against z = 0
    const m = new Mesh().mat(M_BARK);
    m.box(-0.5, 1.65, 0, 0.5, 1.75, 0.02, 0, 0.9, 1);
    m.box(-0.5, 1.9, 0, 0.5, 1.92, 0.22, 0, 0.8, 1);
    m.box(-0.5, 1.92, 0.21, 0.5, 1.95, 0.22, 0, 1, 1);
    for (const sx of [-1, 1]) m.bar([sx * 0.45, 1.8, 0.01], [sx * 0.45, 1.9, 0.18], 0.02, 0.015);
    m.mat(M_YEL);
    for (let k = 0; k < 5; k++) {
      const x = -0.4 + k * 0.2;
      m.tube([[x, 1.7, 0.02], [x, 1.7, 0.08], [x, 1.73, 0.105], [x, 1.78, 0.105]], 0.007, 4, 2);
    }
    // coats hanging from the hooks at x -0.4, 0 and 0.4
    const coat = (x, mt, fur) => {
      const zc = 0.115, w = fur ? 1.12 : 1;
      m.mat(mt);
      const R = (y, rx, rz, dx, ao) => p2R(y, rx * w, rz * w, x + dx, zc, ao);
      p2loft(m, [R(1.67, 0.06, 0.04, 0, 1), R(1.62, 0.17, 0.07, 0, 1), R(1.45, 0.17, 0.085, 0.006, 0.95), R(1.2, 0.18, 0.09, -0.008, 0.85), R(0.9, 0.19, 0.1, 0.01, 0.75), R(0.62, 0.205, 0.105, -0.006, 0.6)], 8, true, true);
      for (const s of [-1, 1]) m.tube([[x + s * 0.17 * w, 1.6, zc + 0.02], [x + s * 0.23 * w, 1.3, zc + 0.04], [x + s * 0.24 * w, 1.0, zc + 0.05], [x + s * 0.235 * w, 0.8, zc + 0.05]], (k) => [0.05, 0.055, 0.055, 0.045][k] * w, 5, 2, (k) => 1 - k * 0.1);
      m.mat(M_DARK).tube([[x - 0.03, 1.66, zc - 0.03], [x, 1.7, 0.06], [x + 0.03, 1.66, zc - 0.03]], 0.006, 4, 0);
    };
    coat(-0.4, M_TINT, false); coat(0, M_BARK, true); coat(0.4, M_TINT, false);
    // fur hat and scarf on the shelf
    m.mat(M_BARK);
    p2loft(m, [p2R(1.92, 0.1, 0.09, -0.3, 0.11, 0.8), p2R(1.97, 0.125, 0.115, -0.3, 0.11), p2R(2.03, 0.115, 0.105, -0.3, 0.11), p2R(2.06, 0.08, 0.075, -0.3, 0.11)], 8, true, true);
    m.mat(M_TINT);
    for (let k = 0; k < 4; k++) m.box(0.2 + k * 0.035, 1.92, 0.04 + (k % 2) * 0.03, 0.235 + k * 0.035, 1.97 + (k % 2) * 0.012, 0.19 - (k % 2) * 0.03, 4, 0.8, 1);
    m.box(0.32, 1.92, 0.05, 0.4, 1.945, 0.16, 0, 1, 1);
    return m;
  },

  shoeRack() { // low shoe cabinet 0.8 wide (x -0.4..0.4) x 0.4 high x 0.3 deep (z 0..0.3), back against z = 0; boots, slippers and felt boots on the floor in front (z 0.3..0.7)
    const m = new Mesh().mat(M_BARK);
    m.box(-0.4, 0.06, 0, 0.4, 0.4, 0.3, 0, 0.8, 1);
    for (const sx of [-1, 1]) for (const z of [0.04, 0.26]) m.box(sx * 0.37 - 0.02, 0, z - 0.02, sx * 0.37 + 0.02, 0.06, z + 0.02, 8);
    // tilted flaps
    for (let k = 0; k < 2; k++) {
      const y0 = 0.09 + k * 0.16;
      m.box(-0.38, y0, 0.3, 0.38, y0 + 0.14, 0.312, 0, 1, 1);
      m.mat(M_YEL).box(-0.025, y0 + 0.11, 0.312, 0.025, y0 + 0.125, 0.32, 0); m.mat(M_BARK);
    }
    // shoes at (x, z, yaw), toe towards +z; kind 0 boot, 1 slipper, 2 felt boot
    const shoe = (x, z, yaw, mt, kind) => {
      m.at(x, 0, z, yaw);
      const sh = kind === 1 ? 0 : kind === 2 ? 0.28 : 0.22;
      m.mat(kind === 2 ? M_CONC : M_DARK).box(-0.045, 0, -0.07, 0.045, 0.03, 0.2, 0, 0.6, 1);
      m.mat(mt);
      p5frus(m, 0, 0.065, 0.03, 0.04, 0.1, kind === 1 ? 0.07 : 0.1, 0.034, 0.08, 0.9, 1, true);
      if (sh) p7ring(m, 0, -0.01, [[0.06, 0.047, 0.8], [0.06 + sh, 0.055]], 6, false, true);
      m.at(0, 0, 0, 0);
    };
    shoe(-0.58, 0.45, 0.1, M_DARK, 0); shoe(-0.46, 0.43, -0.05, M_DARK, 0);
    shoe(-0.3, 0.52, 0.2, M_TINT, 0); shoe(-0.19, 0.44, -0.2, M_TINT, 0);
    shoe(0.0, 0.5, 0.0, M_TINT, 1); shoe(0.1, 0.5, 0.15, M_TINT, 1);
    shoe(0.3, 0.46, -0.1, M_CONC, 2); shoe(0.42, 0.45, 0.08, M_CONC, 2);
    shoe(0.6, 0.5, 0.25, M_DARK, 0); shoe(0.7, 0.43, 0.0, M_DARK, 0);
    return m;
  },

  hallMirror() { // hallway chest of drawers 0.8 wide (x -0.4..0.4) x 0.8 high x 0.35 deep (z 0..0.35) with a pier mirror 0.6 x 1.0 above (y 0.86..1.86), telephone, notebook, pen and a dish of keys on top; back against z = 0
    const m = new Mesh().mat(M_BARK);
    m.box(-0.4, 0.1, 0, 0.4, 0.78, 0.35, 0, 0.8, 1);
    m.box(-0.42, 0.78, 0, 0.42, 0.8, 0.37, 0, 1, 1);
    for (const sx of [-1, 1]) for (const z of [0.05, 0.3]) p7leg(m, [sx * 0.37, 0.1, z], [sx * 0.38, 0, z], 0.04);
    for (let k = 0; k < 3; k++) {
      const y0 = 0.14 + k * 0.215;
      p7panel(m, -0.36, y0, 0.36, y0 + 0.195, 0.35, 0.01);
      p7panel(m, -0.3, y0 + 0.03, 0.3, y0 + 0.165, 0.36, 0.005);
      m.mat(M_YEL).box(-0.04, y0 + 0.085, 0.365, 0.04, y0 + 0.105, 0.38, 0); m.mat(M_BARK);
    }
    // mirror in a wooden frame
    m.box(-0.34, 0.82, 0, 0.34, 0.86, 0.035, 0); m.box(-0.34, 1.86, 0, 0.34, 1.9, 0.035, 0);
    m.box(-0.34, 0.86, 0, -0.3, 1.86, 0.035, 0); m.box(0.3, 0.86, 0, 0.34, 1.86, 0.035, 0);
    m.mat(M_LENS).box(-0.3, 0.86, 0.008, 0.3, 1.86, 0.02, 1 | 2 | 4 | 8 | 16, 1, 1);
    // rotary telephone with handset and coiled cord
    m.mat(M_RED);
    p5frus(m, -0.16, 0.17, 0.8, 0.11, 0.1, 0.86, 0.1, 0.09, 1, 1, true);
    m.box(-0.22, 0.86, 0.095, -0.1, 0.875, 0.145, 0, 1, 1);
    m.bar([-0.26, 0.9, 0.2], [-0.06, 0.9, 0.2], 0.03, 0.02);
    m.box(-0.28, 0.875, 0.185, -0.24, 0.92, 0.22, 0, 1, 1); m.box(-0.08, 0.875, 0.185, -0.04, 0.92, 0.22, 0, 1, 1);
    m.mat(M_METAL); p4rod(m, [-0.16, 0.862, 0.17], [-0.16, 0.868, 0.17], 0.045, 10);
    m.mat(M_DARK);
    const cord = []; for (let k = 0; k < 20; k++) cord.push([-0.04 + k * 0.0026, 0.83 + cos(k * 1.5) * 0.02, 0.2 + sin(k * 1.5) * 0.02]);
    m.tube(cord, 0.003, 4, 0);
    // notebook, pen, dish with keys
    m.at(0.15, 0, 0.18, 0.35);
    m.mat(M_TINT).box(-0.065, 0.8, -0.09, 0.065, 0.815, 0.09, 4, 1, 1);
    m.mat(M_CONC).box(-0.06, 0.815, -0.085, 0.06, 0.817, 0.085, 4, 1, 1);
    m.mat(M_DARK).bar([-0.03, 0.822, -0.05], [0.04, 0.822, 0.02], 0.008, 0.008);
    m.at(0, 0, 0, 0);
    m.mat(M_LENS); p7ring(m, 0.3, 0.2, [[0.8, 0.045, 0.8], [0.82, 0.06], [0.82, 0.05], [0.805, 0.04]], 10, true, false);
    m.mat(M_METAL);
    const kr = []; for (let k = 0; k <= 8; k++) kr.push([0.3 + cos(k / 8 * TAU) * 0.012, 0.812, 0.2 + sin(k / 8 * TAU) * 0.012]);
    m.tube(kr, 0.002, 4, 0);
    m.bar([0.3, 0.812, 0.2], [0.34, 0.812, 0.215], 0.01, 0.003); m.bar([0.3, 0.812, 0.2], [0.27, 0.812, 0.228], 0.01, 0.003);
    return m;
  },

  intDoor(open = 0) { // interior door leaf 0.8 (x 0..0.8, hinged at x = 0) x 2.0 x 0.04 (z -0.02..0.02), two recessed panels (upper frosted glass); open = radians about the vertical hinge axis x = z = 0, toward +z; no frame
    const m = new Mesh().at(0, 0, 0, -open).mat(M_TINT);
    m.box(0, 0, -0.02, 0.12, 2.0, 0.02); m.box(0.68, 0, -0.02, 0.8, 2.0, 0.02);
    m.box(0.12, 0, -0.02, 0.68, 0.2, 0.02, 1 | 2); m.box(0.12, 0.95, -0.02, 0.68, 1.1, 0.02, 1 | 2); m.box(0.12, 1.88, -0.02, 0.68, 2.0, 0.02, 1 | 2);
    m.box(0.12, 0.2, -0.007, 0.68, 0.95, 0.007, 1 | 2 | 4 | 8, 0.7, 1);
    m.mat(M_LENS).box(0.12, 1.1, -0.006, 0.68, 1.88, 0.006, 1 | 2 | 4 | 8, 0.9, 1);
    // brass handles on both faces and hinges
    m.mat(M_YEL);
    for (const s of [-1, 1]) {
      p4rod(m, [0.72, 0.95, s * 0.02], [0.72, 0.95, s * 0.032], 0.024, 8);
      m.bar([0.72, 0.95, s * 0.04], [0.6, 0.95, s * 0.04], 0.016, 0.014);
      m.bar([0.72, 0.95, s * 0.032], [0.72, 0.95, s * 0.04], 0.014, 0.014);
    }
    m.mat(M_METAL);
    for (const y of [0.25, 1.0, 1.75]) p7cyl(m, 0.004, y - 0.06, 0, 0.012, 0.12, 6);
    return m;
  },

  doorFrame() { // architrave round a 0.8 x 2.0 door opening (x 0..0.8, y 0..2.0) in a 0.12 thick wall (z -0.06..0.06): casing boards 0.07 wide on both faces and the reveal lining
    const m = new Mesh().mat(M_TINT);
    for (const s of [-1, 1]) {
      const za = s > 0 ? 0.06 : -0.075, zb = s > 0 ? 0.075 : -0.06, zo = s > 0 ? 0.075 : -0.083;
      const bead = (x0, y0, x1, y1) => m.box(x0, y0, min(zo, zo + s * 0.008), x1, y1, max(zo, zo + s * 0.008), 0, 1, 1);
      const back = s > 0 ? 16 : 32;
      m.box(-0.07, 0, za, 0, 2.07, zb, back, 0.9, 1);
      m.box(0.8, 0, za, 0.87, 2.07, zb, back, 0.9, 1);
      m.box(0, 2.0, za, 0.8, 2.07, zb, back | 4, 1, 1);
      for (const x0 of [-0.07, 0.8]) m.box(x0, 0, min(za, za + s * 0.007), x0 + 0.07, 0.1, max(zb, zb + s * 0.007), 4 | back, 1, 1);
      bead(-0.055, 0.1, -0.015, 2.055); bead(0.815, 0.1, 0.855, 2.055); bead(-0.015, 2.015, 0.815, 2.055);
    }
    m.box(0, 0, -0.06, 0.015, 2.0, 0.06, 1 | 16 | 32, 1, 1);
    m.box(0.785, 0, -0.06, 0.8, 2.0, 0.06, 2 | 16 | 32, 1, 1);
    m.box(0.015, 1.985, -0.06, 0.785, 2.0, 0.06, 8 | 16 | 32, 1, 1);
    return m;
  },

  entranceDoor() { // flat entrance door from the inside: 0.9 (x -0.45..0.45) x 2.05, padded leatherette quilted with brass nails, peephole, two locks, chain latch, frame; padded face flush at z = 0, faces +z
    const m = new Mesh().mat(M_TINT);
    m.box(-0.45, 0, -0.08, 0.45, 2.05, -0.004, 16 | 32, 1, 1);
    m.q4([-0.45, 0, 0], [0.45, 0, 0], [0.45, 2.05, 0], [-0.45, 2.05, 0]);
    // quilting seams and nails on a diamond grid
    const N = [];
    for (let iy = 1; iy <= 13; iy++) for (let ix = -2; ix <= 2; ix++) if ((ix + iy) % 2 === 0) N.push([ix * 0.15, iy * 0.15]);
    m.mat(M_DARK);
    for (const [x, y] of N) for (const s of [-1, 1]) {
      const x2 = x + 0.15, y2 = y + s * 0.15;
      if (N.some(([a, b]) => abs(a - x2) < 1e-6 && abs(b - y2) < 1e-6)) m.q4([x, y - 0.002, 0.0015], [x2, y2 - 0.002, 0.0015], [x2, y2 + 0.002, 0.0015], [x, y + 0.002, 0.0015]);
    }
    m.mat(M_YEL);
    for (const [x, y] of N) m.q4([x - 0.012, y, 0.003], [x, y - 0.012, 0.003], [x + 0.012, y, 0.003], [x, y + 0.012, 0.003]);
    // frame
    m.mat(M_BARK);
    m.box(-0.52, 0, -0.1, -0.45, 2.12, 0.015); m.box(0.45, 0, -0.1, 0.52, 2.12, 0.015); m.box(-0.45, 2.05, -0.1, 0.45, 2.12, 0.015);
    // peephole, two locks, handle, chain latch
    m.mat(M_METAL);
    p4rod(m, [0, 1.6, -0.004], [0, 1.6, 0.014], 0.013, 8);
    m.mat(M_GLASS); p4rod(m, [0, 1.6, 0.014], [0, 1.6, 0.016], 0.007, 6);
    for (const [y, r] of [[1.28, 0.04], [1.0, 0.032]]) {
      m.mat(M_METAL).box(-0.34, y - 0.11, 0, -0.26, y + 0.11, 0.01, 0, 1, 1);
      p4rod(m, [-0.3, y, 0.01], [-0.3, y, 0.02], r, 10);
      m.mat(M_DARK).box(-0.304, y - 0.014, 0.02, -0.296, y + 0.01, 0.022, 0);
    }
    m.mat(M_YEL).tube([[-0.3, 1.14, 0.012], [-0.3, 1.14, 0.06], [-0.3, 1.14, 0.065]], 0.012, 6, 2);
    m.mat(M_METAL);
    m.box(-0.36, 1.5, 0, -0.26, 1.518, 0.008, 0, 1, 1);
    m.tube([[-0.36, 1.509, 0.012], [-0.4, 1.495, 0.02], [-0.44, 1.51, 0.017], [-0.452, 1.5, 0.018]], 0.0025, 4, 2);
    p4rod(m, [-0.452, 1.5, 0.012], [-0.452, 1.5, 0.02], 0.008, 6);
    return m;
  },

  ceilingBulb() { // bare bulb on a flex from the ceiling (y = 0) down to y = -0.4, centred on x = z = 0; returns {m, light} light = bulb centre
    const m = new Mesh().mat(M_CONC);
    p7cyl(m, 0, -0.025, 0, 0.045, 0.025, 12);
    m.mat(M_DARK);
    m.tube([[0, -0.025, 0], [0.004, -0.12, 0.002], [-0.003, -0.22, 0], [0, -0.26, 0]], 0.004, 5, 2);
    p7ring(m, 0, 0, [[-0.24, 0.016], [-0.25, 0.026], [-0.3, 0.026], [-0.315, 0.022]], 10, true, true);
    m.mat(M_LAMP);
    p2loft(m, [p2R(-0.31, 0.013), p2R(-0.33, 0.02), p2R(-0.36, 0.036), p2R(-0.385, 0.036), p2R(-0.4, 0.02), p2R(-0.405, 0.006)], 10, true, true);
    return { m, light: [0, -0.36, 0] };
  },

  wallLamp() { // bathroom wall lamp (bra): milk-glass globe on a chrome bracket, wall plate at the origin (z = 0), globe centre (0, 0, 0.14); returns {m, light}
    const m = new Mesh().mat(M_METAL);
    p4rod(m, [0, 0, 0], [0, 0, 0.014], 0.05, 12);
    p4rod(m, [0, 0, 0.014], [0, 0, 0.03], 0.022, 8);
    m.tube([[0, 0, 0.03], [0, 0, 0.06], [0, -0.03, 0.11], [0, -0.065, 0.14]], 0.008, 6, 2);
    p7ring(m, 0, 0.14, [[-0.1, 0.012], [-0.08, 0.034], [-0.052, 0.05]], 10, true, false);
    m.mat(M_LAMP);
    p2ball(m, 0, 0, 0.14, 0.075, 5, 12, 1.08, 0.9);
    return { m, light: [0, 0, 0.14] };
  },

  wallCarpet() { // wall carpet 2.0 wide (x -1..1) x 1.4 tall (y 0..1.4) x 0.02 (z 0..0.02) on the wall, raised border and medallion, fringe at the bottom, hung from a wooden rail along the top
    const m = new Mesh().mat(M_RED);
    m.box(-1, 0, 0, 1, 1.4, 0.02, 16, 1, 1);
    // raised border band and a thinner inner one
    const fr = (x0, y0, x1, y1, w, z0, t) => {
      m.box(x0, y0, z0, x1, y0 + w, z0 + t, 16, 1, 1); m.box(x0, y1 - w, z0, x1, y1, z0 + t, 16, 1, 1);
      m.box(x0, y0 + w, z0, x0 + w, y1 - w, z0 + t, 16 | 2, 1, 1); m.box(x1 - w, y0 + w, z0, x1, y1 - w, z0 + t, 16 | 1, 1, 1);
    };
    fr(-0.94, 0.06, 0.94, 1.34, 0.1, 0.02, 0.004);
    fr(-0.78, 0.22, 0.78, 1.18, 0.03, 0.02, 0.004);
    // stepped diamond medallion in two layers
    for (const [hw, hh, z0] of [[0.42, 0.42, 0.02], [0.24, 0.24, 0.024]]) {
      const n = 5, sh = hh / n;
      for (let k = -n; k < n; k++) {
        const w = hw * (1 - (abs(k + 0.5) - 0.5) / n) * 0.96 + 0.005;
        m.box(-w, 0.7 + k * sh, z0, w, 0.7 + (k + 1) * sh, z0 + 0.004, 16 | 4 | 8, 1, 1);
      }
    }
    // fringe
    for (let k = 0; k < 66; k++) { const x = -0.99 + k * 0.03; m.q4([x, 0, 0.012], [x + 0.014, 0, 0.012], [x + 0.016, -0.08, 0.012], [x + 0.002, -0.08, 0.012], [0.8, 0.8, 0.5, 0.5]); }
    // loops over the rail, then the rail with its brackets
    for (let k = 0; k < 8; k++) { const x = -0.9 + k * 0.257; m.box(x, 1.3, 0.057, x + 0.05, 1.46, 0.062, 16, 1, 1); m.box(x, 1.4, 0.02, x + 0.05, 1.46, 0.062, 16 | 32 | 4, 1, 1); }
    m.mat(M_BARK);
    m.tube([[-1.04, 1.41, 0.04], [1.04, 1.41, 0.04]], 0.015, 8, 3);
    for (const sx of [-1, 1]) { m.bar([sx * 0.95, 1.41, 0.04], [sx * 0.95, 1.41, 0], 0.02, 0.03); p4rod(m, [sx * 1.05, 1.41, 0.04], [sx * 1.07, 1.41, 0.04], 0.022, 8); }
    return m;
  },

  radiator() { // cast-iron radiator 10 sections, 0.8 wide (x -0.4..0.4), y 0.15..0.75, z 0.02..0.1 (0.1 off the wall at z = 0), pipes down into the floor
    const m = new Mesh().mat(M_CONC);
    for (let i = 0; i < 10; i++) {
      const a = -0.4 + i * 0.08;
      for (const dz of [0.02, 0.058]) m.box(a + 0.006, 0.17, dz, a + 0.074, 0.73, dz + 0.034, 0, 0.8, 1);
    }
    p4rod(m, [-0.4, 0.2, 0.06], [0.4, 0.2, 0.06], 0.026, 8);
    p4rod(m, [-0.4, 0.7, 0.06], [0.4, 0.7, 0.06], 0.026, 8);
    // pipes from the lower collector ends down into the floor, with rosettes
    for (const sx of [-1, 1]) {
      m.tube([[sx * 0.4, 0.2, 0.06], [sx * 0.46, 0.2, 0.06], [sx * 0.46, 0.1, 0.06], [sx * 0.46, -0.02, 0.06]], 0.016, 6, 2);
      p4rod(m, [sx * 0.46, 0.03, 0.06], [sx * 0.46, 0.0, 0.06], 0.032, 8);
    }
    m.mat(M_METAL);
    p4rod(m, [0.37, 0.7, 0.06], [0.37, 0.77, 0.06], 0.01, 6); // air vent
    for (const x of [-0.2, 0.2]) { m.bar([x, 0.55, 0.0], [x, 0.55, 0.025], 0.03, 0.02); m.bar([x, 0.35, 0.0], [x, 0.35, 0.025], 0.03, 0.02); }
    return m;
  },

  bathMat() { // small rubber bath mat 0.5 (x) x 0.8 (z), 0.01 thick with a raised rim and a grid of bumps, lying on the floor, centred at the origin
    const m = new Mesh().mat(M_TINT);
    m.box(-0.25, 0, -0.4, 0.25, 0.01, 0.4, 4, 0.8, 1);
    m.box(-0.25, 0.01, -0.4, 0.25, 0.016, -0.37, 4 | 16, 1, 1); m.box(-0.25, 0.01, 0.37, 0.25, 0.016, 0.4, 4 | 32, 1, 1);
    m.box(-0.25, 0.01, -0.37, -0.22, 0.016, 0.37, 4 | 1, 1, 1); m.box(0.22, 0.01, -0.37, 0.25, 0.016, 0.37, 4 | 2, 1, 1);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 7; j++) p7ring(m, -0.135 + i * 0.09, -0.27 + j * 0.09, [[0.01, 0.026, 0.8], [0.016, 0.022]], 6, false, true);
    return m;
  },
};
