// ============================================================================
// world: the layout of the yard and everything generated from it
// ============================================================================
// North is -z, the viewer's house stands in the south and looks north. All of it is authored in metres below; the
// meshes, the instance lists and the baked maps are generated from these tables at load time.
const FH = 2.8, RAILZ = -185, RAILY = 2.5, ROADZ = -140;
// building types: bay width, plinth height, bays per section on the yard side / the back, bays of the end walls
//   w window, b balcony, s stairwell (door at the bottom), n blank
const BT = [
  { bw: 2.9, base: 1.1, front: 'wbwswbw', back: 'wwbwbww', side: 'nwwn', mat: M_BRICK, top: 0.7 }, // brick five-storey
  { bw: 3.2, base: 0.9, front: 'wbbwwsw', back: 'bwwbwwb', side: 'wnbwn', mat: M_PANEL, top: 1.3 }, // panel nine-storey
  { bw: 3.4, base: 0.5, front: 'wnwsnwnwnw', back: 'nwnnwnnwnn', side: 'nwwn', mat: M_BRICK, top: 0.3, fh: 3.6 }, // low brick shed
];
// x, z (centre), yaw (0: the yard side faces south), type, floors, sections, palette of doors and balconies, seed (< .5 pale brick)
const BLD = [
  [4, 48, PI, 0, 5, 4, 10, 0.21], // V: the viewer's house
  [-34, -13, PI / 2, 0, 5, 4, 9, 0.13], // A: along the west side of the yard
  [6, -72, 0, 1, 9, 1, 11, 0.4], // B: the tower at the end of the car park
  [62, -112, 0, 1, 9, 2, 10, 0.3], // C
  [92, -30, -PI / 2, 0, 5, 3, 11, 0.33], // D
  [66, 6, PI / 2, 2, 1, 1, 9, 0.7], // E: the low building east of the playground
  [-84, -84, PI / 2, 1, 9, 2, 10, 0.45], [-86, 14, PI / 2, 0, 5, 4, 11, 0.17], [-66, -112, 0, 0, 5, 3, 9, 0.6], // the far ring
  [136, -96, 0, 1, 9, 1, 11, 0.35], [140, 30, -PI / 2, 0, 5, 4, 10, 0.24], [-50, 98, 0, 0, 5, 4, 9, 0.66], [70, 104, 0, 1, 9, 2, 10, 0.4],
].map(([x, z, yaw, t, fl, sec, pal, sd]) => {
  const T = BT[t], L = T.front.length * sec * T.bw, D = T.side.length * T.bw, [cx, cz] = rotY(-L / 2, -D / 2, yaw), fh = T.fh || FH;
  return { x: x + cx, z: z + cz, yaw, t, fl, sec, pal, sd, T, L, D, fh, H: T.base + fl * fh + T.top, cx: x, cz: z };
});
// a wall of building b (0 yard side, 1 back, 2 / 3 ends) has its own frame: u along it, y up, z out of it
const FS = (b, s) => (s === 0 ? [0, b.D, 0] : s === 1 ? [b.L, 0, PI] : s === 2 ? [b.L, b.D, PI / 2] : [0, 0, -PI / 2]);
// wall frame -> world: [x, y, z, yaw of the outward normal]
const toW = (b, s, u, y, z, dy = 0) => { const [ox, oz, a] = FS(b, s), [lx, lz] = rotY(u, z, a), [wx, wz] = rotY(ox + lx, oz + lz, b.yaw); return [b.x + wx, y, b.z + wz, a + b.yaw + dy]; };
const patOf = (b, s) => (s > 1 ? b.T.side : (s ? b.T.back : b.T.front).repeat(b.sec));

// the room behind the viewer's window: section, bay and floor in house V, then its box in the wall frame and in the world
const RSEC = 2, RBAY = 0, RFL = 3, RU = (RSEC * 7 + RBAY + 0.5) * BLD[0].T.bw, RY = BLD[0].T.base + RFL * FH, RW = 1.7, RD0 = -0.42, RD1 = -4.9;
const boxW = (u0, y0, z0, u1, y1, z1) => { const a = toW(BLD[0], 0, u0, y0, z0), b = toW(BLD[0], 0, u1, y1, z1); return [min(a[0], b[0]), y0, min(a[2], b[2]), max(a[0], b[0]), y1, max(a[2], b[2])]; };
const ROOM = boxW(RU - RW, RY, RD1, RU + RW, RY + 2.62, RD0);
const TUN = boxW(RU - 0.62, RY + 1.05, RD0 - 0.9, RU + 0.62, RY + 2.35, 0.6); // the way out through the window
const WINB = boxW(RU - 0.725, RY + 0.95, -0.3, RU + 0.725, RY + 2.45, -0.1); // the glass of that window
const EYE = toW(BLD[0], 0, RU + 0.15, RY + 1.66, -2);

// street lamps: x, z, yaw of the arm, kind (0 cold LED, 1 old sodium), then the bulbs over the doors are added
const POLES = [[10.8, 10, PI, 0], [10.8, -22, PI, 0], [-4, -52.5, -PI / 2, 0], [22, -57, PI / 2, 0], [-13, -60, PI, 0], [57, -48, PI, 0],
  [46, 23.4, PI / 2, 0], [-44, 38, 0, 1], [-23, -96, 0, 1], [40, -90, PI / 2, 1], [80, -68, 0, 0], [78.5, 24, 0, 1]];
const FLICK = 5; // this one is on its way out
const NL = 24, LAMPS = POLES.map(([x, z, a, k], i) => { const [dx, dz] = rotY(1.6, 0, a); return { x: x + dx, y: 8.72, z: z + dz, r: 40, c: k ? [250, 128, 40] : [200, 224, 262], t: i }; });
BLD.slice(0, 5).forEach((b) => { if (LAMPS.length < NL) for (let i = 0; i < b.sec && LAMPS.length < NL; i++) { const u = (i * b.T.front.length + b.T.front.indexOf('s') + 0.5) * b.T.bw, p = toW(b, 0, u, 2.32, 0.95); LAMPS.push({ x: p[0], y: p[1], z: p[2], r: 9, c: [13, 7.6, 3.4], t: -1 }); } });

// lawns: x0, z0, x1, z1, kerb (1: a kerb all round); everything else is asphalt. Each is a slab a little higher
// than the one before, so the tops never fight
const LAWN = [
  [10.2, -50, 56, 22, 1], [-12, -46, -6, -16, 1], // the playground lawn, the island in the car park
  [-13.5, -128, -5.2, -64, 1], [17.2, -128, 56.2, -64, 1], [-5.2, -128, 17.2, -79.7, 0], [30, -64, 56.2, -52, 1], // around the tower
  [56.2, -128, 79, 40, 0], [98, -128, 192, 192, 0], [86, -128, 98, -61, 0], [86, 0.2, 98, 192, 0], // east
  [-192, 53.8, 86, 192, 0], [44.8, 40, 56.2, 53.8, 0], [-192, -128, -39.8, 53.8, 0], [-39.8, -128, -22.2, -54, 0], // south, west
  [-192, -178, 192, -146, 0], // the waste ground between the road and the railway
];
const lawnAt = (x, z) => { for (let i = 0; i < LAWN.length; i++) { const l = LAWN[i]; if (x > l[0] && x < l[2] && z > l[1] && z < l[3]) return i; } return -1; };
const lawnY = (i) => 0.12 + i * 0.004;
// trodden paths across the lawns (polylines)
const PATHS = [[[10, 2, 0], [24, -6, 0], [40, -14, 0], [57, -22, 0]], [[12, 20, 0], [22, 6, 0], [24, -6, 0]], [[30, -50, 0], [26, -30, 0], [24, -6, 0]], [[56, 10, 0], [40, 14, 0], [22, 6, 0]]];
// rows of parked cars: x, z of the first, step x, step z, count, yaw (0: nose east)
const PARK = [[7.7, 13, 0, -2.75, 13, 0], [-3.5, -19, 0, -2.8, 6, PI], [-20.3, 10.5, 0, -2.8, 4, PI], [-16.4, 35.9, 2.8, 0, 6, -PI / 2],
  [14, 24.4, 2.8, 0, 8, PI / 2], [-2, -61.6, 2.8, 0, 6, PI / 2], [83.6, -44, 0, 2.8, 6, 0], [-20.4, -70, 0, -2.8, 4, PI]];
// trees: x, z, kind (0 tall, 1 spreading, 2 birch, 3 young), size
const TREES = [[50, -41, 1, 1.25], [-9, -20, 3, 1], [-9, -27, 3, 1.15], [-9, -34, 3, 0.9], [-9, -41, 3, 1.1], [-25.6, 18, 3, 1.2], [-25.8, -4, 2, 0.8], [-25.6, -30, 3, 1.3],
  [-25.8, -45, 2, 0.9], [-9.5, -58, 1, 0.9], [-10, -74, 0, 1], [24, -72, 2, 1], [34, -60, 1, 1], [44, -70, 0, 1.1], [38, -36, 2, 1.05], [47, 6, 1, 0.95], [52, -14, 2, 1], [30, 16, 3, 1.3],
  [62, -30, 0, 1], [70, -46, 1, 1.1], [74, 30, 2, 1], [-46, 20, 1, 1.1], [-52, -10, 0, 1.1], [-48, -40, 2, 1], [-60, -62, 1, 1], [-30, -70, 1, 0.9], [-32, -100, 0, 1], [12, -96, 2, 1], [4, -110, 1, 1],
  [30, -100, 0, 1], [-4, 62, 1, 1], [30, 66, 2, 1], [-30, 64, 0, 1], [60, 60, 1, 1], [104, -70, 0, 1], [106, -10, 1, 1.1], [110, 40, 2, 1], [-110, -40, 0, 1.1], [-116, 30, 1, 1], [-70, 60, 2, 1]];
// bare bushes: x, z, radius
const BUSH = [[-25.7, 10, 1.1], [-25.7, 3, 0.9], [-25.9, -12, 1.2], [-25.6, -22, 1], [-25.8, -38, 1.2], [-8, 40.4, 1], [14, 40.4, 1.1], [26, 40.3, 0.9], [-22, 40.4, 1], [-10.5, -16.8, 0.8], [12, -48, 1.2], [54, 20, 1.3], [-4, -63, 1]];
const cellOf = (x, z) => clamp(floor((x - OX) / CELLW), 0, CELLS - 1) + CELLS * clamp(floor((z - OZ) / CELLW), 0, CELLS - 1);

// ---------------------------------------------------------------- buildings
// The walls are cut into bays, every bay a vertical strip with its window holes and their reveals. Returns the mesh
// (in the building's own frame, origin at a corner) and the list of window panes for the window shader.
function meshBuilding(b, room) {
  const m = new Mesh(), T = b.T, bw = T.bw, fh = b.fh, W = [], panel = T.mat === M_PANEL, ww = panel ? 1.8 : 1.45, wh = panel ? 1.45 : 1.5, RD = 0.22, H = b.H;
  // strip of wall u0..u1 from y0 to the top with holes [a0, a1, b0, b1, depth], bottom to top
  const strip = (u0, u1, y0, holes) => {
    let y = y0;
    for (const [a0, a1, b0, b1, rd] of holes) {
      m.q4([u0, y, 0], [u1, y, 0], [u1, b0, 0], [u0, b0, 0], y ? 1 : [0.5, 0.5, 1, 1]);
      m.q4([u0, b0, 0], [a0, b0, 0], [a0, b1, 0], [u0, b1, 0]); m.q4([a1, b0, 0], [u1, b0, 0], [u1, b1, 0], [a1, b1, 0]);
      const s = [1, 0.4, 0.4, 1];
      m.q4([a0, b0, 0], [a0, b0, -rd], [a0, b1, -rd], [a0, b1, 0], s); m.q4([a1, b1, 0], [a1, b1, -rd], [a1, b0, -rd], [a1, b0, 0], s);
      m.q4([a0, b1, 0], [a0, b1, -rd], [a1, b1, -rd], [a1, b1, 0], s); m.q4([a1, b0, 0], [a1, b0, -rd], [a0, b0, -rd], [a0, b0, 0], [1, 0.6, 0.6, 1]);
      y = b1;
    }
    m.q4([u0, y, 0], [u1, y, 0], [u1, H, 0], [u0, H, 0], y ? 1 : [0.5, 0.5, 1, 1]);
  };
  for (let s = 0; s < 4; s++) {
    const [ox, oz, a] = FS(b, s), pat = patOf(b, s);
    m.at(ox, 0, oz, a);
    for (let i = 0; i < pat.length; i++) {
      const u0 = i * bw, u1 = u0 + bw, uc = u0 + bw / 2, k = pat[i], holes = [], hb = bw / 2 - 0.3, dep = 1.15;
      const mine = room && s === 0 && i === RSEC * 7 + RBAY;
      if (k === 's') {
        // door, steps, canopy on two posts; the stair windows sit half a floor off the others
        holes.push([uc - 0.7, uc + 0.7, 0.13, 2.25, RD]);
        for (let f = 1; f < b.fl; f++) { const y = T.base + f * fh - 0.8; holes.push([uc - 0.6, uc + 0.6, y, y + 1.2, RD]); W.push([s, uc, y + 0.6, -RD, 1.2, 1.2, 2, 0]); }
        m.mat(M_TINT).q4([uc - 0.7, 0.13, -RD], [uc + 0.7, 0.13, -RD], [uc + 0.7, 2.25, -RD], [uc - 0.7, 2.25, -RD], 0.7);
        m.mat(M_CONC).box(uc - 1.6, 2.5, 0, uc + 1.6, 2.64, 1.6, 0, 0.4, 1); m.box(uc - 1.6, 0, 0, uc + 1.6, 0.13, 1.7, 4, 0.7, 1);
        m.mat(M_METAL); m.bar([uc - 1.5, 0.13, 1.5], [uc - 1.5, 2.5, 1.5], 0.06); m.bar([uc + 1.5, 0.13, 1.5], [uc + 1.5, 2.5, 1.5], 0.06);
      } else {
        m.mat(M_CONC).q4([u0, 0, 0], [u1, 0, 0], [u1, T.base, 0], [u0, T.base, 0], [0.5, 0.5, 0.9, 0.9]);
        for (let f = 0; f < b.fl; f++) {
          const y0 = T.base + f * fh, yc = y0 + 0.95 + wh / 2;
          if (k === 'w' || (k === 'b' && !f)) {
            holes.push([uc - ww / 2, uc + ww / 2, y0 + 0.95, y0 + 0.95 + wh, mine && f === RFL ? -RD0 : RD]);
            if (!(mine && f === RFL)) W.push([s, uc, yc, -RD, ww, wh, 0, 0]);
            m.mat(M_CONC).box(uc - ww / 2 - 0.05, y0 + 0.91, -0.04, uc + ww / 2 + 0.05, y0 + 0.95, 0.07, 16); // sill
            if (ihash(i, f, s + b.fl * 7) < 0.07 && !mine) m.mat(M_CONC).box(uc - 0.4, y0 + 0.3, 0.02, uc + 0.4, y0 + 0.85, 0.34, 16, 0.6, 1); // air conditioner
          } else if (k === 'b') {
            // balcony: slab, parapet, then glazing all round (most of them) or the open air and the window behind
            const glazed = ihash(i, f, s + 31) < 0.72;
            m.mat(M_CONC).box(uc - hb, y0 - 0.14, 0, uc + hb, y0, dep, 16, 0.45, 0.8);
            m.mat(panel ? M_PANEL : M_TINT).box(uc - hb, y0, dep - 0.06, uc + hb, y0 + 1, dep, 0, 0.7, 1);
            m.box(uc - hb, y0, 0, uc - hb + 0.06, y0 + 1, dep - 0.06, 16 | 32, 0.7, 1); m.box(uc + hb - 0.06, y0, 0, uc + hb, y0 + 1, dep - 0.06, 16 | 32, 0.7, 1);
            if (glazed) {
              W.push([s, uc, y0 + 1.72, dep - 0.03, hb * 2, 1.44, 1, 0], [s, uc - hb + 0.03, y0 + 1.72, dep / 2, dep, 1.44, 1, -PI / 2], [s, uc + hb - 0.03, y0 + 1.72, dep / 2, dep, 1.44, 1, PI / 2]);
            } else W.push([s, uc, y0 + 1.6, 0.03, 2, 1.7, 0, 0]);
            if (f === b.fl - 1) m.mat(M_METAL).box(uc - hb - 0.06, y0 + 2.44, 0, uc + hb + 0.06, y0 + 2.5, dep + 0.08, 16);
          }
        }
      }
      m.mat(T.mat);
      strip(u0, u1, k === 's' ? 0 : T.base, holes);
    }
    // downpipes at the section joints of the long walls
    if (s < 2) for (let i = 0; i <= b.sec; i++) { const u = clamp(i * b.L / b.sec, 0.25, b.L - 0.25); m.mat(M_METAL).tube([[u, H - 0.2, 0.12], [u, 0.5, 0.12], [u, 0.18, 0.4]], 0.06, 5, 0); }
  }
  m.at(0, 0, 0);
  if (b.t === 2) {
    // pitched roof with eaves, gables in brick
    const r = H + 2.7, e = 0.5;
    m.mat(M_METAL).q4([-e, H - 0.12, -e], [b.L + e, H - 0.12, -e], [b.L + e, r, b.D / 2], [-e, r, b.D / 2], 0.9); m.q4([b.L + e, H - 0.12, b.D + e], [-e, H - 0.12, b.D + e], [-e, r, b.D / 2], [b.L + e, r, b.D / 2], 0.9);
    m.mat(T.mat); for (const x of [0, b.L]) m.tri(m.v(x, H, 0), m.v(x, H, b.D), m.v(x, r - 0.08, b.D / 2));
  } else {
    m.mat(M_DARK).q4([0, H - 0.35, 0], [0, H - 0.35, b.D], [b.L, H - 0.35, b.D], [b.L, H - 0.35, 0], 0.8);
    rseed(300 + b.fl + b.sec * 9 + (b.L | 0));
    for (let i = 0; i < b.sec; i++) {
      const x = (i + 0.5) * b.L / b.sec;
      if (panel) m.mat(M_PANEL).box(x - 3.2, H - 0.35, b.D / 2 - 2.6, x + 3.2, H + 2.5, b.D / 2 + 2.6, 4, 0.6, 1); // lift machinery
      else { m.mat(M_BRICK).box(x - 2.4, H - 0.35, b.D / 2 - 0.45, x - 1.5, H + 1.1, b.D / 2 + 0.45, 4, 0.6, 1); m.mat(M_METAL).box(x + 3, H - 0.35, 2.5, x + 3.5, H + 0.35, 3, 4); }
      // old aerials
      const ax = x + rr(-5, 5), az = rr(2, b.D - 2), ah = rr(2.5, 4.5); m.mat(M_METAL).bar([ax, H - 0.35, az], [ax, H + ah, az], 0.035);
      for (let k = 0; k < 4; k++) { const y = H + ah - 0.2 - k * 0.28, w = 0.55 - k * 0.08; m.bar([ax - w, y, az], [ax + w, y, az], 0.02); }
    }
  }
  if (room) {
    // the viewer's room: walls facing in, the inner side of the outer wall, the window frame, sill, radiator, a few things
    const [ox, oz, a] = FS(b, 0); m.at(ox, 0, oz, a);
    const u0 = RU - RW, u1 = RU + RW, y0 = RY, y1 = RY + 2.62, s0 = RY + 0.95, s1 = s0 + wh, d = 0.4;
    m.mat(M_BARK).q4([u0, y0, RD1], [u1, y0, RD1], [u1, y0, RD0], [u0, y0, RD0], [d, d, 0.8, 0.8]);
    m.mat(M_CONC).q4([u0, y1, RD0], [u1, y1, RD0], [u1, y1, RD1], [u0, y1, RD1], d);
    m.q4([u0, y0, RD1], [u0, y0, RD0], [u0, y1, RD0], [u0, y1, RD1], [d, 0.7, 0.7, d]); m.q4([u1, y0, RD0], [u1, y0, RD1], [u1, y1, RD1], [u1, y1, RD0], [0.7, d, d, 0.7]);
    m.q4([u1, y0, RD1], [u0, y0, RD1], [u0, y1, RD1], [u1, y1, RD1], d);
    const h0 = RU - ww / 2, h1 = RU + ww / 2;
    m.q4([u0, y0, RD0], [u1, y0, RD0], [u1, s0, RD0], [u0, s0, RD0], 0.6); m.q4([u0, s1, RD0], [u1, s1, RD0], [u1, y1, RD0], [u0, y1, RD0], 0.6);
    m.q4([u0, s0, RD0], [h0, s0, RD0], [h0, s1, RD0], [u0, s1, RD0], 0.6); m.q4([h1, s0, RD0], [u1, s0, RD0], [u1, s1, RD0], [h1, s1, RD0], 0.6);
    const fz = -0.3, fb = (p, q) => m.bar([p[0], p[1], fz], [q[0], q[1], fz], 0.045, 0.06, 0.9);
    fb([h0, s0 + 0.03], [h1, s0 + 0.03]); fb([h0, s1 - 0.03], [h1, s1 - 0.03]); fb([h0 + 0.03, s0], [h0 + 0.03, s1]); fb([h1 - 0.03, s0], [h1 - 0.03, s1]);
    fb([RU - 0.1, s0], [RU - 0.1, s1]); fb([RU - 0.1, s1 - 0.42], [h1, s1 - 0.42]);
    m.box(h0 - 0.12, s0 - 0.05, -0.72, h1 + 0.12, s0, fz, 0, 0.6, 1); // sill
    m.mat(M_METAL); for (let k = 0; k < 9; k++) m.box(RU - 0.5 + k * 0.11, y0 + 0.16, -0.62, RU - 0.42 + k * 0.11, y0 + 0.74, -0.5, 0, 0.4, 0.8); // radiator
    m.tube([[RU - 0.62, y0, -0.56], [RU - 0.62, y0 + 0.24, -0.56], [RU - 0.5, y0 + 0.24, -0.56]], 0.015, 4, 0);
    m.mat(M_TINT).tube([[RU + 0.45, s0, -0.52], [RU + 0.45, s0 + 0.1, -0.52]], 0.042, 8, 2); // a mug
    m.tube([[RU - 0.46, s0, -0.52], [RU - 0.46, s0 + 0.11, -0.52]], (k) => 0.06 + k * 0.02, 8, 0);
    m.mat(M_GRN).tube([[RU - 0.46, s0 + 0.1, -0.52], [RU - 0.46, s0 + 0.22, -0.52], [RU - 0.455, s0 + 0.3, -0.52]], (k) => [0.035, 0.04, 0.012][k], 6, 2);
    m.tube([[RU - 0.43, s0 + 0.18, -0.52], [RU - 0.38, s0 + 0.2, -0.52], [RU - 0.37, s0 + 0.27, -0.52]], 0.018, 5, 2);
    // a curtain pulled to the side
    m.mat(M_TINT); for (let k = 0; k < 9; k++) { const c = (j) => [u0 + 0.06 + j * 0.085, -0.5 + 0.045 * sin(j * 2.2)]; const p = c(k), q = c(k + 1); m.q4([p[0], y0 + 0.12, p[1]], [q[0], y0 + 0.12, q[1]], [q[0], y1 - 0.08, q[1]], [p[0], y1 - 0.08, p[1]], 0.75); }
  }
  return { m, W };
}

// ---------------------------------------------------------------- cars
// side outline per kind (nose bottom, nose top, windscreen base, windscreen top, roof end, rear glass base, tail top, tail
// bottom), then width, sill height, wheel radius, wheelbase
const CARS = [
  [[[2.2, 0.5], [2.15, 0.72], [0.9, 0.95], [0.25, 1.42], [-0.9, 1.42], [-1.55, 1.02], [-2.15, 0.96], [-2.2, 0.55]], 1.72, 0.24, 0.31, 2.6],
  [[[2.05, 0.5], [2.03, 0.78], [0.78, 0.86], [0.46, 1.37], [-0.72, 1.37], [-1.12, 0.88], [-2.03, 0.85], [-2.05, 0.5]], 1.62, 0.26, 0.3, 2.42],
  [[[1.95, 0.5], [1.9, 0.72], [0.8, 0.93], [0.2, 1.46], [-1.3, 1.44], [-1.8, 0.99], [-1.92, 0.9], [-1.95, 0.5]], 1.7, 0.24, 0.3, 2.46],
  [[[2.15, 0.58], [2.1, 0.9], [0.95, 1.08], [0.3, 1.63], [-1.5, 1.61], [-2, 1.12], [-2.12, 1.05], [-2.15, 0.58]], 1.82, 0.32, 0.36, 2.66],
  [[[2.25, 0.5], [2.2, 0.85], [1.55, 1.04], [1.05, 1.84], [-2.1, 1.84], [-2.2, 1.12], [-2.24, 1], [-2.25, 0.5]], 1.76, 0.28, 0.33, 2.8],
];
function meshCar(t) {
  const [P, W, sill, wr, wb] = CARS[t], m = new Mesh(), hw = W / 2, hr = hw - 0.19, L = P[0][0];
  const tap = (x) => hw * (1 - 0.1 * sstep(L * 0.72, L, abs(x))); // the body narrows to nose and tail
  for (let k = 0; k < 7; k++) {
    // skin across the car between two points of the outline; the points 3 and 4 are the roof, narrower than the body
    const p = P[k], q = P[k + 1], wp = k === 3 || k === 4 ? hr : tap(p[0]), wq = k === 2 || k === 3 ? hr : tap(q[0]);
    m.mat(k === 2 || k === 4 ? M_GLASS : k === 0 || k === 6 ? M_DARK : M_PAINT);
    m.q4([p[0], p[1], wp], [q[0], q[1], wq], [q[0], q[1], -wq], [p[0], p[1], -wp], k === 0 || k === 6 ? 0.7 : 1);
  }
  for (const z of [-1, 1]) {
    // sides: body up to the belt line, glass above it, pillars over the glass
    const belt = (x) => (x > P[2][0] ? mix(P[2][1], P[1][1], (x - P[2][0]) / (P[1][0] - P[2][0])) : x < P[5][0] ? mix(P[5][1], P[6][1], (P[5][0] - x) / (P[5][0] - P[6][0])) : mix(P[5][1], P[2][1], (x - P[5][0]) / (P[2][0] - P[5][0])));
    const xs = [P[7][0], P[6][0], P[5][0], P[4][0], P[3][0], P[2][0], P[1][0], P[0][0]];
    m.mat(M_PAINT);
    for (let k = 0; k < 7; k++) { const a = xs[k], c = xs[k + 1]; m.q4([a, sill, z * tap(a)], [c, sill, z * tap(c)], [c, belt(c), z * tap(c)], [a, belt(a), z * tap(a)], [0.6, 0.6, 1, 1]); }
    // greenhouse: quarter light, door glass either side of the middle pillar, the rear pillar
    const bx = (P[3][0] + P[4][0]) / 2 + 0.12, top = (x) => mix(P[3][1], P[4][1], (P[3][0] - x) / (P[3][0] - P[4][0]));
    const pane = (x0, x1, mt) => m.mat(mt).q4([x0, belt(x0), z * hw], [x1, belt(x1), z * hw], [x1, top(x1), z * hr], [x0, top(x0), z * hr]);
    m.mat(M_GLASS).tri(m.v(P[2][0], P[2][1], z * hw), m.v(P[3][0], belt(P[3][0]), z * hw), m.v(P[3][0], P[3][1], z * hr));
    pane(P[3][0], bx + 0.05, M_GLASS); pane(bx + 0.05, bx - 0.05, M_PAINT); pane(bx - 0.05, P[4][0], t === 4 ? M_PAINT : M_GLASS);
    m.mat(t > 1 && t < 4 ? M_GLASS : M_PAINT).tri(m.v(P[4][0], belt(P[4][0]), z * hw), m.v(P[5][0], P[5][1], z * hw), m.v(P[4][0], P[4][1], z * hr));
    // pillars either side of the windscreen and the rear glass, just proud of them
    m.mat(M_PAINT); for (const [p, q] of [[P[2], P[3]], [P[5], P[4]]]) m.q4([p[0], p[1] + 0.008, z * hw], [q[0], q[1] + 0.008, z * hr], [q[0], q[1] + 0.008, z * (hr - 0.07)], [p[0], p[1] + 0.008, z * (hw - 0.07)]);
    m.box(P[2][0] - 0.02, P[2][1] + 0.03, z * (hw + 0.01), P[2][0] + 0.07, P[2][1] + 0.11, z * (hw + 0.13)); // mirror
    // wheels with arches behind them
    for (const x of [wb / 2 - 0.08, -wb / 2 - 0.08]) {
      m.mat(M_DARK).tube([[x, wr, z * (hw - 0.2)], [x, wr, z * (hw + 0.015)]], wr, 12, 2);
      m.tube([[x, wr + 0.03, z * (hw - 0.3)], [x, wr + 0.03, z * (hw + 0.004)]], wr + 0.07, 12, 2);
      m.mat(M_METAL).tube([[x, wr, z * (hw + 0.016)], [x, wr, z * (hw + 0.028)]], wr * 0.58, 10, 2);
    }
    // lights
    m.mat(M_LENS).box(P[1][0] - 0.03, P[1][1] - 0.2, z * (tap(L) - 0.42), P[1][0] + 0.012, P[1][1] - 0.05, z * (tap(L) - 0.03));
    m.mat(M_RED).box(P[6][0] - 0.03, P[6][1] - 0.22, z * (tap(L) - 0.36), P[6][0] - 0.07, P[6][1] - 0.06, z * (tap(L) - 0.03));
    if (t === 3) m.mat(M_DARK).bar([P[3][0] - 0.1, P[3][1] + 0.035, z * (hr - 0.1)], [P[4][0] + 0.1, P[4][1] + 0.035, z * (hr - 0.1)], 0.03); // roof rails
  }
  m.mat(M_DARK).q4([L, sill, hw * 0.9], [-L, sill, hw * 0.9], [-L, sill, -hw * 0.9], [L, sill, -hw * 0.9], 0.3);
  m.box(P[1][0] - 0.02, P[1][1] - 0.2, -0.38, P[1][0] + 0.014, P[1][1] - 0.06, 0.38); // grille
  m.mat(M_CONC).box(P[0][0] - 0.02, 0.36, -0.26, P[0][0] + 0.03, 0.47, 0.26); m.box(P[7][0] + 0.02, 0.5, -0.26, P[7][0] - 0.03, 0.61, 0.26); // plates
  return m;
}

// ---------------------------------------------------------------- trees
// Recursive branching; every vertex carries a sway weight (0 at the trunk, 1 at the twig tips) in its shade bits.
function meshTree(kind, lo) {
  rseed(200 + kind); const m = new Mesh().mat(M_BARK), MAXD = kind === 3 ? 4 : 5;
  const H = [11, 9, 9.5, 4.2][kind], R = [0.3, 0.34, 0.2, 0.07][kind], spread = [0.42, 0.85, 0.6, 0.7][kind], droop = kind === 2 ? 0.5 : 0.12;
  const grow = (p, d, len, r, dep) => {
    const n = dep ? 3 : 5, pts = [p]; let q = p, dir = d;
    for (let k = 1; k <= n; k++) {
      // wander, with thin branches sagging and thick ones reaching up
      dir = [dir[0] + rr(-0.16, 0.16), dir[1] + rr(-0.1, 0.1) - (dep > 2 ? droop * 0.3 : -0.06 * dep), dir[2] + rr(-0.16, 0.16)];
      const l = hypot(...dir); dir = dir.map((c) => c / l); q = [q[0] + dir[0] * len / n, q[1] + dir[1] * len / n, q[2] + dir[2] * len / n]; pts.push(q);
    }
    const w0 = dep ? (dep - 0.6) / MAXD : 0, w1 = (dep + 0.4) / MAXD, sides = lo ? (dep < 2 ? 5 : 3) : dep === 0 ? 8 : dep === 1 ? 6 : dep === 2 ? 5 : 3;
    m.tube(pts, (k) => r * (1 - 0.38 * k / n) * (dep || k ? 1 : 1.5), sides, dep === MAXD ? 2 : 0, (k) => clamp(mix(w0, w1, k / n), 0, 1));
    if (dep === MAXD) return;
    const kids = dep === 0 ? (kind === 0 ? 7 : 5) : lo && dep > 2 ? 2 : 2 + (rnd() < 0.65);
    for (let c = 0; c < kids; c++) {
      // boughs leave the trunk along its upper half, later branches fork from the ends
      const at = dep === 0 ? pts[min(n, 2 + (c * 3 / kids | 0) + (c & 1))] : c ? pts[n - (rnd() < 0.4)] : q, an = rr(0, TAU), sp = spread * rr(0.6, 1.25);
      const ax = [cos(an), 0, sin(an)], nd = [dir[0] * (1 - sp * 0.5) + ax[0] * sp, max(dir[1], 0.2) * (1 - sp * 0.5) + (kind ? 0.12 : 0.5), dir[2] * (1 - sp * 0.5) + ax[2] * sp], l = hypot(...nd);
      grow(at, nd.map((v) => v / l), len * rr(0.55, 0.78), r * (dep ? rr(0.5, 0.62) : 0.42), dep + 1);
    }
  };
  grow([0, -0.1, 0], [0, 1, 0], H * (kind === 0 ? 0.5 : 0.45), R, 0);
  return m;
}

// ---------------------------------------------------------------- street furniture and the rest of the props
const PROPS = {
  lamp() { // origin at the foot, arm along +x
    const m = new Mesh().mat(M_METAL); m.tube([[0, 0, 0], [0, 4, 0], [0, 8.2, 0], [0.25, 8.75, 0], [1.3, 8.86, 0]], (k) => [0.1, 0.08, 0.065, 0.055, 0.05][k], 6, 0);
    m.box(-0.15, 0, -0.15, 0.15, 0.55, 0.15, 4); m.box(1.22, 8.79, -0.15, 1.98, 8.92, 0.15, 4);
    m.mat(M_LAMP).q4([1.26, 8.787, -0.12], [1.94, 8.787, -0.12], [1.94, 8.787, 0.12], [1.26, 8.787, 0.12]); return m;
  },
  bulb() { const m = new Mesh().mat(M_LAMP); m.box(-0.06, -0.08, -0.06, 0.06, 0.06, 0.06); return m; },
  bench() {
    const m = new Mesh().mat(M_TINT); for (const z of [-0.14, 0, 0.14]) m.bar([-0.8, 0.45, z], [0.8, 0.45, z], 0.04, 0.11); for (const y of [0.68, 0.84]) m.bar([-0.8, y, -0.25], [0.8, y, -0.25], 0.1, 0.035);
    m.mat(M_METAL); for (const x of [-0.65, 0.65]) { m.bar([x, 0, 0.16], [x, 0.43, 0.16], 0.045); m.bar([x, 0, -0.22], [x, 0.92, -0.27], 0.045); m.bar([x, 0.42, -0.22], [x, 0.42, 0.18], 0.045); } return m;
  },
  urn() { const m = new Mesh().mat(M_METAL); m.tube([[0, 0.12, 0], [0, 0.55, 0]], (k) => 0.15 + k * 0.04, 8, 1); m.bar([0, 0, 0], [0, 0.14, 0], 0.05); return m; },
  slide() {
    const m = new Mesh().mat(M_YEL);
    for (const z of [-0.3, 0.3]) { m.bar([0, 0, z], [0, 2.35, z], 0.05); m.bar([-0.75, 0, z], [0, 1.5, z], 0.05); m.bar([0, 2.3, z], [0.5, 2.3, z], 0.04); m.bar([0.5, 2.3, z], [0.5, 1.5, z], 0.04); m.sweep([[0.5, 1.72, z], [2, 0.72, z], [2.9, 0.3, z], [3.4, 0.27, z]], 0.035, 0.2); }
    for (let k = 1; k < 6; k++) m.bar([-0.75 + k * 0.125, k * 0.25, -0.3], [-0.75 + k * 0.125, k * 0.25, 0.3], 0.035);
    m.box(0, 1.46, -0.3, 0.5, 1.5, 0.3); m.bar([3.2, 0, 0], [3.2, 0.24, 0], 0.05);
    m.mat(M_METAL).sweep([[0.5, 1.5, 0], [2, 0.6, 0], [2.9, 0.2, 0], [3.4, 0.17, 0]], 0.56, 0.02); return m;
  },
  swing() {
    const m = new Mesh().mat(M_TINT); for (const x of [-1.5, 1.5]) for (const z of [-0.9, 0.9]) m.bar([x, 2.15, 0], [x * 1.08, 0, z], 0.055);
    m.bar([-1.5, 2.15, 0], [1.5, 2.15, 0], 0.06); return m;
  },
  seat() { // hangs from y = 2.15; the vertex shader swings it about that axis
    const m = new Mesh().mat(M_METAL); for (const x of [-0.22, 0.22]) m.bar([x, 2.15, 0], [x, 0.5, 0], 0.015);
    m.mat(M_TINT).box(-0.25, 0.46, -0.1, 0.25, 0.5, 0.1); return m;
  },
  carousel() {
    const m = new Mesh().mat(M_TINT); m.tube([[0, 0.3, 0], [0, 0.38, 0]], 1.15, 12, 3); m.mat(M_METAL).bar([0, 0, 0], [0, 0.95, 0], 0.07);
    for (let k = 0; k < 4; k++) { const c = cos(k * PI / 2), s = sin(k * PI / 2); m.sweep([[c, 0.38, s], [c, 0.95, s], [0, 0.95, 0]], 0.03, 0.03); } return m;
  },
  mushroom() { // sandbox under a tin toadstool
    const m = new Mesh().mat(M_METAL); m.bar([0, 0, 0], [0, 1.9, 0], 0.08);
    m.mat(M_RED).tube([[0, 1.75, 0], [0, 1.95, 0], [0, 2.2, 0]], (k) => [1.25, 0.8, 0.02][k], 10, 0);
    m.mat(M_TINT); for (let k = 0; k < 4; k++) { const c = cos(k * PI / 2), s = sin(k * PI / 2); m.bar([c * 1.2 - s * 1.2, 0.14, s * 1.2 + c * 1.2], [c * 1.2 + s * 1.2, 0.14, s * 1.2 - c * 1.2], 0.05, 0.26); } return m;
  },
  tpole() { const m = new Mesh().mat(M_METAL); m.bar([0, 0, 0], [0, 2.05, 0], 0.05); m.bar([-0.7, 2.05, 0], [0.7, 2.05, 0], 0.04); return m; },
  frame() { const m = new Mesh().mat(M_METAL); m.sweep([[-1.3, 0, 0], [-1.3, 2.1, 0], [1.3, 2.1, 0], [1.3, 0, 0]], 0.05, 0.05); m.bar([-1.3, 1.5, 0], [1.3, 1.5, 0], 0.035); return m; },
  bin() {
    const m = new Mesh().mat(M_GRN); m.box(-0.6, 0.12, -0.45, 0.6, 1.05, 0.45, 0, 0.6, 1);
    m.mat(M_DARK).q4([-0.63, 1.05, 0.48], [0.63, 1.05, 0.48], [0.63, 1.2, -0.48], [-0.63, 1.2, -0.48]); for (const x of [-0.5, 0.5]) for (const z of [-0.38, 0.38]) m.box(x - 0.05, 0, z - 0.05, x + 0.05, 0.12, z + 0.05); return m;
  },
  pen() { const m = new Mesh().mat(M_METAL); m.box(-2.6, 0, -1.2, 2.6, 1.9, -1.14, 0, 0.6, 1); m.box(-2.6, 0, -1.2, -2.54, 1.9, 1, 0, 0.6, 1); m.box(2.54, 0, -1.2, 2.6, 1.9, 1, 0, 0.6, 1); return m; },
  garage() {
    const m = new Mesh().mat(M_TINT); m.box(-1.6, 0, -2.9, 1.6, 2.1, 2.9, 4 | 8, 0.55, 1);
    m.mat(M_METAL).q4([-1.75, 2.08, -3], [-1.75, 2.08, 3], [0, 2.5, 3], [0, 2.5, -3]); m.q4([0, 2.5, -3], [0, 2.5, 3], [1.75, 2.08, 3], [1.75, 2.08, -3]);
    for (const z of [-2.9, 2.9]) m.tri(m.v(-1.6, 2.1, z), m.v(1.6, 2.1, z), m.v(0, 2.48, z)); m.bar([0, 0.1, 2.92], [0, 2.05, 2.92], 0.03); return m;
  },
  booth() { // transformer substation
    const m = new Mesh().mat(M_BRICK); m.box(-2.6, 0, -2, 2.6, 3.3, 2, 4 | 8, 0.55, 1); m.mat(M_CONC).box(-2.9, 3.3, -2.3, 2.9, 3.5, 2.3, 0, 0.6, 1);
    m.mat(M_METAL).box(-1.1, 0.1, 2, 1.1, 2.3, 2.03, 16, 0.6, 1); m.mat(M_YEL).box(-0.16, 1.5, 2.03, 0.16, 1.82, 2.04, 16); return m;
  },
  fence() { // 2 m of low railing along +x
    const m = new Mesh().mat(M_GRN); for (const y of [0.16, 0.52]) m.bar([0, y, 0], [2, y, 0], 0.03); m.bar([0, 0, 0], [0, 0.6, 0], 0.045);
    for (let k = 1; k < 8; k++) m.bar([k * 0.25, 0.16, 0], [k * 0.25, 0.52, 0], 0.018); return m;
  },
  manhole() { const m = new Mesh().mat(M_METAL); m.tube([[0, 0, 0], [0, 0.014, 0]], 0.34, 12, 2); return m; },
  mast() { // lattice radio mast
    const m = new Mesh().mat(M_METAL), H = 72, w = (y) => 3.2 * (1 - y / H) + 0.35, c = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let s = 0; s < 4; s++) for (let k = 0; k < 12; k++) {
      const y0 = k * 6, y1 = y0 + 6, a = c[s], b = c[(s + 1) % 4];
      m.bar([a[0] * w(y0), y0, a[1] * w(y0)], [a[0] * w(y1), y1, a[1] * w(y1)], 0.16);
      m.bar([a[0] * w(y1), y1, a[1] * w(y1)], [b[0] * w(y1), y1, b[1] * w(y1)], 0.09);
      m.bar([a[0] * w(y0), y0, a[1] * w(y0)], [b[0] * w(y1), y1, b[1] * w(y1)], 0.08);
    }
    m.bar([0, H, 0], [0, H + 6, 0], 0.1); return m;
  },
  stack() { // boiler-house chimney with its shed
    const m = new Mesh().mat(M_CONC); m.tube([[0, 0, 0], [0, 20, 0], [0, 40, 0], [0, 58, 0]], (k) => 2.5 - k * 0.3, 12, 2);
    m.mat(M_RED); for (const y of [44, 52]) m.tube([[0, y, 0], [0, y + 3.5, 0]], 1.95 - (y - 44) * 0.018, 12, 0);
    m.mat(M_BRICK).box(4, 0, -7, 24, 7.5, 7, 4, 0.5, 1); m.mat(M_DARK).box(3.7, 7.5, -7.3, 24.3, 7.7, 7.3); return m;
  },
  wagon() { // one car of the night train; the window band is lit (a pattern in the shader)
    const m = new Mesh().mat(M_TINT); m.box(-11.4, 1.1, -1.5, 11.4, 3.7, 1.5, 0, 0.7, 1);
    m.mat(M_METAL).tube([[-11.4, 2.6, 0], [11.4, 2.6, 0]], 1.52, 12, 3);
    m.mat(M_LAMP); for (const z of [-1.51, 1.51]) m.q4([-10.6, 2.25, z], [10.6, 2.25, z], [10.6, 3.15, z], [-10.6, 3.15, z]);
    m.mat(M_DARK); for (const x of [-7.5, 7.5]) m.box(x - 1.6, 0.25, -1.2, x + 1.6, 1.1, 1.2); return m;
  },
  rail() { // track, sleepers left to the dark; masts and the contact wire over it
    const m = new Mesh().mat(M_METAL); for (const z of [-0.76, 0.76]) m.bar([-192, 0.1, z], [192, 0.1, z], 0.08, 0.16);
    for (let x = -180; x <= 180; x += 45) { m.bar([x, 0, -3.2], [x, 7.2, -3.2], 0.22); m.bar([x, 6.6, -3.2], [x, 6.6, 0.3], 0.1); }
    m.bar([-192, 6.1, 0], [192, 6.1, 0], 0.03); return m;
  },
};

// ---------------------------------------------------------------- the world: instances, windows, grass, sprites, baked maps
function makeWorld() {
  const nCells = CELLS * CELLS, meshes = [], id = {}, inst = [];
  // registers a mesh under a name; solid() places instances of it: 12 floats = pos + scale, quaternion, palette, seed, tex scale, animation
  const reg = (name, m, o = {}) => { const b = m.build(); b.name = name; b.noSh = o.noSh; id[name] = meshes.length; meshes.push(b); inst.push([]); return b; };
  const solid = (name, x, y, z, yaw = 0, pal = 0, seed = 0, ts = 1, an = 0, sc = 1) => { const q = qYaw(yaw); inst[id[name]].push(x, y, z, sc, q[0], q[1], q[2], q[3], pal, seed, ts, an); };
  const wins = [], boxes = [], rects = []; // rects: footprints for the ground map [cx, cz, hx, hz, yaw, weight]
  const blades = Array.from({ length: nCells }, () => []);
  const glare = [], steam = [], paper = [];

  for (const k in PROPS) reg(k, PROPS[k](), { noSh: k === 'wagon' || k === 'bulb' });

  // --- buildings; the ones of one kind and size share a mesh
  const made = {};
  BLD.forEach((b, i) => {
    const key = i ? 'b' + b.t + b.fl + b.sec : 'home';
    if (!made[key]) { made[key] = meshBuilding(b, !i); reg(key, made[key].m); }
    solid(key, b.x, 0, b.z, b.yaw, b.pal, b.sd, b.T.bw);
    for (const [s, u, y, z, w, h, ty, dy] of made[key].W) { const p = toW(b, s, u, y, z, dy); wins.push(p[0], p[1], p[2], p[3], w, h, ihash(wins.length, i, 7), ty); }
    // somebody smokes on an open balcony of the house across the yard: the ember of the cigarette
    if (i === 1) { const o = made[key].W.find((e) => e[3] === 0.03 && e[2] > 9 && !e[0]), p = toW(b, 0, o[1] + 0.45, o[2] - 0.12, 0.98); glare.push(p[0], p[1], p[2], 0.07, 3.2, 0.8, 0.15, 2); }
    const c0 = toW(b, 0, 0, 0, 0), c1 = toW(b, 1, 0, 0, 0);
    boxes.push([min(c0[0], c1[0]), min(c0[2], c1[2]), max(c0[0], c1[0]), max(c0[2], c1[2]), b.H + 3]);
    rects.push([b.cx, b.cz, b.L / 2, b.D / 2, b.yaw, 1]);
  });

  // --- ground: one asphalt sheet, the lawns as slabs on it, kerbs, the railway bank
  {
    const m = new Mesh().mat(M_ASPH); m.q4([-192, 0, -192], [-192, 0, 192], [192, 0, 192], [192, 0, -192]);
    LAWN.forEach((l, i) => {
      const y = lawnY(i); m.mat(M_SOIL).box(l[0], 0, l[1], l[2], y, l[3], 4, 0.6, 1);
      if (l[4]) { const e = 0.07, h = y + 0.05; m.mat(M_CONC); m.box(l[0] - e, 0, l[1] - e, l[2] + e, h, l[1] + e, 4, 0.6, 1); m.box(l[0] - e, 0, l[3] - e, l[2] + e, h, l[3] + e, 4, 0.6, 1); m.box(l[0] - e, 0, l[1] + e, l[0] + e, h, l[3] - e, 4 | 16 | 32, 0.6, 1); m.box(l[2] - e, 0, l[1] + e, l[2] + e, h, l[3] - e, 4 | 16 | 32, 0.6, 1); }
    });
    m.mat(M_SOIL).q4([-192, 0, RAILZ + 11], [192, 0, RAILZ + 11], [192, RAILY, RAILZ + 6], [-192, RAILY, RAILZ + 6], 0.8); m.q4([-192, RAILY, RAILZ + 6], [192, RAILY, RAILZ + 6], [192, RAILY, -192], [-192, RAILY, -192]);
    reg('ground', m); solid('ground', 0, 0, 0);
  }

  // --- front gardens: a strip of lawn with a low railing between the doors of the houses round the yard
  const yards = [];
  BLD.slice(0, 2).forEach((b, bi) => {
    const n = b.T.front.length, m = new Mesh(), dep = 3.7;
    for (let s = 0; s <= b.sec; s++) {
      const u0 = s ? ((s - 1) * n + b.T.front.indexOf('s') + 1) * b.T.bw + 0.9 : 0.3, u1 = s < b.sec ? (s * n + b.T.front.indexOf('s')) * b.T.bw - 0.9 : b.L - 0.3;
      const a = toW(b, 0, u0, 0, 0.5), c = toW(b, 0, u1, 0, dep), y = 0.11 + bi * 0.003;
      m.mat(M_SOIL).box(min(a[0], c[0]), 0, min(a[2], c[2]), max(a[0], c[0]), y, max(a[2], c[2]), 4, 0.6, 1);
      yards.push([min(a[0], c[0]), min(a[2], c[2]), max(a[0], c[0]), max(a[2], c[2]), y]);
      for (let u = u0; u < u1 - 1.9; u += 2) { const p = toW(b, 0, u, 0, dep + 0.04); solid('fence', p[0], 0, p[2], p[3]); }
    }
    reg('yard' + bi, m); solid('yard' + bi, 0, 0, 0);
  });
  const grassY = (x, z) => { for (const y of yards) if (x > y[0] && x < y[2] && z > y[1] && z < y[3]) return y[4]; const l = lawnAt(x, z); return l < 0 ? -1 : lawnY(l); };
  const inBld = (x, z, mar = 0.6) => boxes.some((b) => x > b[0] - mar && x < b[2] + mar && z > b[1] - mar && z < b[3] + mar);

  // --- props
  POLES.forEach(([x, z, a], i) => { solid('lamp', x, 0, z, a, 0, i); boxes.push([x - 0.2, z - 0.2, x + 0.2, z + 0.2, 9]); });
  LAMPS.forEach((l, i) => {
    if (l.t < 0) solid('bulb', l.x, l.y + 0.12, l.z, 0, 0, i);
    // glare: a cold star on the street lamps, a small warm dot on the bulbs
    glare.push(l.x, l.y - (l.t < 0 ? 0 : 0.06), l.z, l.t < 0 ? 0.5 : 1.5, 0, 0, 0, 10 + i);
  });
  for (let x = -176; x <= 176; x += 44) { solid('lamp', x, 0, ROADZ + 7.5, PI / 2, 0, -1); glare.push(x, 8.7, ROADZ + 5.9, 2.4, 2.2, 1.05, 0.3, 0); }
  const bench = (x, z, a) => { solid('bench', x, grassY(x, z) < 0 ? 0 : grassY(x, z), z, a, 8, x); const [dx, dz] = rotY(1.25, 0.1, a); solid('urn', x + dx, max(grassY(x + dx, z + dz), 0), z + dz); };
  bench(27, -4.5, 0.3); bench(31.5, 6, -2.4); bench(24, -13, 2.6); bench(38, -3, -1.2); bench(18.5, 14, PI);
  BLD.slice(0, 2).forEach((b) => { for (let i = 0; i < b.sec; i++) { const u = (i * 7 + 3.5) * b.T.bw + 2.3, p = toW(b, 0, u, 0, 1.2); solid('bench', p[0], 0, p[2], p[3] - PI / 2, 8, u); } });
  const ly = lawnY(0);
  solid('slide', 15.5, ly, -4.5, -0.5); solid('swing', 20.5, ly, 3.2, 0.25, 5); for (const d of [-0.75, 0.75]) { const [dx, dz] = rotY(d, 0, 0.25); solid('seat', 20.5 + dx, ly, 3.2 + dz, 0.25, 14, d + 2, 1, 3); }
  solid('carousel', 23, ly, -19, 0, 11); solid('mushroom', 13.8, ly, 5.5, 0.4, 15); solid('frame', 34, ly, 16, 0.2);
  for (const x of [19, 25.5]) solid('tpole', x, ly, 11.5, PI / 2);
  solid('pen', -33.6, 0, 34.5, PI / 2); for (const z of [32.6, 34.4, 36.2]) solid('bin', -34.2, 0, z, PI / 2 + rr(-0.1, 0.1));
  boxes.push([-35.2, 31.8, -33, 37.2, 2]);
  [[47, 36.2, 9], [50.6, 36.3, 6], [54.2, 36.1, 11], [-52, 44, 9], [-55.6, 44.1, 12]].forEach(([x, z, p]) => { solid('garage', x, max(grassY(x, z), 0), z, 0, p, x); boxes.push([x - 1.7, z - 3, x + 1.7, z + 3, 2.6]); rects.push([x, z, 1.7, 3, 0, 1]); });
  solid('booth', -31, lawnY(13), -62, PI / 2, 0, 0.8, 2.9); boxes.push([-33.2, -64.8, -28.8, -59.2, 3.6]); rects.push([-31, -62, 2.2, 2.8, 0, 1]);
  [[-17, -8], [-3, 4], [2.5, -40], [-17.5, -66], [30, 30], [4, 30.5], [-10, 20]].forEach(([x, z]) => solid('manhole', x, 0, z, x));
  solid('mast', -78, 0, -156); solid('stack', 124, 0, -124, 0, 0, 0.75, 2.9); solid('rail', 0, RAILY, RAILZ);
  for (const y of [24, 48, 72, 78]) glare.push(-78, y, -156, 0.55, 2.6, 0.12, 0.08, y === 78 ? 1 : 0);
  for (const y of [57.5, 40]) for (const a of [0, 2.1, 4.2]) glare.push(124 + 2.3 * cos(a), y, -124 + 2.3 * sin(a), 0.5, 2.4, 0.11, 0.07, y > 50 ? 1 : 0);
  for (let k = 0; k < 10; k++) solid('wagon', k * 23.6, RAILY, RAILZ, 0, 12, k, 1, 2);
  glare.push(0, 0, 0, 2.6, 4, 3.6, 3, 50); for (let k = 0; k < 4; k++) glare.push(0, 0, 0, 1.5, 0, 0, 0, 40 + k, 0, 0, 0, 0.9, 0, 0, 0, 44 + k);

  // --- cars
  CARS.forEach((c, t) => reg('car' + t, meshCar(t)));
  rseed(5);
  for (const [x0, z0, dx, dz, n, yaw] of PARK) for (let k = 0; k < n; k++) {
    if (rnd() < 0.17) continue;
    const t = pick([0, 0, 1, 1, 2, 2, 3, 3, 3, 4]), x = x0 + dx * k + rr(-0.12, 0.12), z = z0 + dz * k + rr(-0.12, 0.12), a = yaw + rr(-0.05, 0.05) + (rnd() < 0.25 ? PI : 0);
    solid('car' + t, x, 0, z, a, pick([0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 5, 6, 7]), rnd(), 1, 0);
    rects.push([x, z, 2.1, 0.86, a, 0.8]); boxes.push([x - 1.3, z - 1.3, x + 1.3, z + 1.3, 1.5]);
  }

  // --- trees, then the wires
  for (let k = 0; k < 4; k++) reg('tree' + k, meshTree(k, LV > 1));
  rseed(6);
  for (const [x, z, k, s] of TREES) { solid('tree' + k, x, max(grassY(x, z), 0) - 0.05, z, rr(0, TAU), k === 2 ? 1 : 0, rnd(), 1, 1, s * rr(0.92, 1.08)); if (k < 3) boxes.push([x - 0.3, z - 0.3, x + 0.3, z + 0.3, 3]); }
  for (let i = 0; i < 46; i++) { // the outskirts
    const x = rr(-185, 185), z = rr(-125, 185); if (hypot(x, z + 10) < 95 || lawnAt(x, z) < 0 || inBld(x, z, 4)) continue;
    solid('tree' + (rnd() * 3 | 0), x, lawnY(lawnAt(x, z)) - 0.05, z, rr(0, TAU), rnd() < 0.3 ? 1 : 0, rnd(), 1, 1, rr(0.8, 1.25));
  }
  {
    // wires sag between the lamp posts and from the posts to the houses; the shade bits weigh the sway
    const m = new Mesh().mat(M_DARK), span = (a, b, sag) => { const p = []; for (let k = 0; k <= 10; k++) { const t = k / 10; p.push([mix(a[0], b[0], t), mix(a[1], b[1], t) - sag * 4 * t * (1 - t), mix(a[2], b[2], t)]); } m.tube(p, 0.018, 3, 0, (k) => sin(k / 10 * PI)); };
    const P = (i) => [POLES[i][0], 8.1, POLES[i][1]];
    span(P(0), P(1), 0.9); span(P(1), [-4, 8.1, -52.5], 1.1); span(P(2), P(4), 0.5); span(P(2), P(3), 0.9); span(P(0), P(6), 1.2); span(P(3), P(5), 1.1);
    span(P(0), [9, 13.6, 42.2], 0.8); span(P(4), [-28.2, 14.8, -50], 0.6); span(P(1), [50, 8, -41], 1.3);
    for (const z of [-0.5, 0, 0.5]) span([19, 2.05, 11.5 + z], [25.5, 2.05, 11.5 + z], 0.12);
    reg('wires', m, { noSh: 1 }); solid('wires', 0, 0, 0, 0, 0, 0, 1, 1);
  }

  // --- grass, weeds and bushes: blades of 12 numbers = root, length, yaw, tilt, width, snow, type, two seeds, bend
  rseed(7);
  const leaf = (x, y, z, len, yaw, tilt, wid, sn, type, s1, s2, bend) => blades[cellOf(x, z)].push(x, y, z, len, yaw, tilt, wid, sn, type, s1, s2, bend);
  const wear = (x, z) => { let d = 9; for (const p of PATHS) for (let k = 0; k < p.length - 1; k++) { const a = p[k], b = p[k + 1], ex = b[0] - a[0], ez = b[1] - a[1], t = clamp(((x - a[0]) * ex + (z - a[1]) * ez) / (ex * ex + ez * ez), 0, 1); d = min(d, hypot(x - a[0] - ex * t, z - a[1] - ez * t)); } return d; };
  const tuft = (x, z, y) => {
    const n = fbm(x * 0.21, 3, z * 0.21, 2), tall = rnd() < 0.035 * sstep(0.45, 0.7, n);
    if (tall) for (let k = 0; k < 3; k++) leaf(x + rr(-0.1, 0.1), y, z + rr(-0.1, 0.1), rr(0.45, 1.15), rr(0, TAU), rr(0.03, 0.3), rr(0.014, 0.022), 0, 1, rnd(), rnd(), rr(0.3, 0.6)); // weeds
    else for (let k = 0; k < 3; k++) leaf(x + rr(-0.06, 0.06), y, z + rr(-0.06, 0.06), rr(0.09, 0.26) * (0.6 + n), rr(0, TAU), rr(0.15, 0.9), rr(0.012, 0.02), rnd(), 0, rnd(), rnd(), rr(0.3, 0.9));
  };
  const sow = (x0, z0, x1, z1, dens) => { for (let n = (x1 - x0) * (z1 - z0) * dens / THIN | 0; n--;) { const x = rr(x0, x1), z = rr(z0, z1), y = grassY(x, z); if (y < 0 || inBld(x, z) || wear(x, z) < 0.6) continue; tuft(x, z, y); } };
  sow(-40, -128, 86, 54, 5.5); // dense around the yard
  sow(-110, -128, -40, 100, 1.2); sow(86, -128, 140, 100, 1.2); sow(-40, 54, 86, 110, 1.2); sow(-110, -178, 140, -146, 0.8);
  for (const [x, z, r] of BUSH) { const y = max(grassY(x, z), 0); for (let k = 0; k < 150 / THIN; k++) { const a = rr(0, TAU), d = rr(0, 0.3) * r; leaf(x + cos(a) * d, y, z + sin(a) * d, rr(0.7, 1.7) * r, a + rr(-0.5, 0.5), rr(0.1, 0.95), rr(0.012, 0.02), 0, 2, rnd(), rnd(), rr(0.35, 0.6)); } }
  const pack = (L) => {
    let n = 0; const start = new Uint32Array(nCells + 1);
    for (let c = 0; c < nCells; c++) { start[c] = n; n += L[c].length / 12; }
    start[nCells] = n;
    const buf = new ArrayBuffer(max(n, 1) * 36), f = new Float32Array(buf), u8 = new Uint8Array(buf), lo = new Float32Array(nCells).fill(1e9), hi = new Float32Array(nCells).fill(-1e9);
    let k = 0;
    for (let c = 0; c < nCells; c++) { const a = L[c]; for (let i = 0; i < a.length; i += 12, k++) {
      for (let j = 0; j < 8; j++) f[k * 9 + j] = a[i + j];
      u8[k * 36 + 32] = a[i + 8]; u8[k * 36 + 33] = a[i + 9] * 255; u8[k * 36 + 34] = a[i + 10] * 255; u8[k * 36 + 35] = a[i + 11] * 255;
      const y = a[i + 1], l = a[i + 3]; if (y - 0.2 < lo[c]) lo[c] = y - 0.2; if (y + l > hi[c]) hi[c] = y + l;
    } }
    return { buf, n, start, lo, hi };
  };

  // --- ground map, 512 x 512 over the world: r = openness (dark and dry under cars and by the walls), g = snow cover,
  //     b = worn path, a = puddles
  const gm = new Uint8Array(512 * 512 * 4), occ = new Float32Array(512 * 512), tmp = new Float32Array(512 * 512);
  for (const [cx, cz, hx, hz, yaw, w] of rects) {
    const r = hypot(hx, hz), i0 = max(0, floor((cx - r - OX) / 0.75)), i1 = min(511, floor((cx + r - OX) / 0.75)), j0 = max(0, floor((cz - r - OZ) / 0.75)), j1 = min(511, floor((cz + r - OZ) / 0.75));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const [lx, lz] = rotY((i + 0.5) * 0.75 + OX - cx, (j + 0.5) * 0.75 + OZ - cz, -yaw); if (abs(lx) < hx + 0.3 && abs(lz) < hz + 0.3) occ[i + 512 * j] = max(occ[i + 512 * j], w); }
  }
  for (let pass = 0; pass < 2; pass++) { // blur
    for (let j = 0; j < 512; j++) for (let i = 0; i < 512; i++) { const o = i + 512 * j; tmp[o] = (occ[max(o - 1, 0)] + 2 * occ[o] + occ[min(o + 1, 262143)]) * 0.25; }
    for (let j = 0; j < 512; j++) for (let i = 0; i < 512; i++) { const o = i + 512 * j; occ[o] = (tmp[max(o - 512, 0)] + 2 * tmp[o] + tmp[min(o + 512, 262143)]) * 0.25; }
  }
  for (let j = 0; j < 512; j++) for (let i = 0; i < 512; i++) {
    const x = (i + 0.5) * 0.75 + OX, z = (j + 0.5) * 0.75 + OZ, o = (i + 512 * j) * 4, oc = occ[i + 512 * j];
    gm[o] = (1 - 0.8 * sstep(0, 0.7, oc)) * 255;
    gm[o + 1] = clamp(sstep(0.36, 0.62, fbm(x * 0.045, 1, z * 0.045, 3) * 0.7 + fbm(x * 0.21, 5, z * 0.21, 2) * 0.3) * (1 - sstep(0.05, 0.45, oc)), 0, 1) * 255;
    gm[o + 2] = (1 - sstep(0.5, 1.8, wear(x, z))) * 255;
    gm[o + 3] = sstep(0.5, 0.68, fbm(x * 0.07 + 9, 2, z * 0.07, 3)) * 255;
  }

  // --- which lamps light what: a 64 x 64 grid over the world with the 8 strongest lamps of each 6 m square (two texels)
  const lg = new Uint8Array(128 * 64 * 4).fill(255);
  for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) {
    const x = (i + 0.5) * 6 + OX, z = (j + 0.5) * 6 + OZ, c = [];
    LAMPS.forEach((l, k) => { const d = max(hypot(x - l.x, z - l.z) - 4.3, 0); if (d < l.r) c.push([l.c[1] * (1 - d * d / (l.r * l.r)) ** 2 / (d * d + 30), k]); });
    c.sort((a, b) => b[0] - a[0]).slice(0, 8).forEach((e, k) => { lg[(i + 64 * j) * 8 + k] = e[1]; });
  }

  // --- sprites: snow, steam, scraps of paper
  rseed(8);
  const snow = new Float32Array(NSNOW * 4); for (let i = 0; i < snow.length; i++) snow[i] = rnd();
  for (let k = 0; k < 26; k++) steam.push(124, 58, -124, rr(5, 9), rnd(), rr(0.035, 0.05), 46, rr(0.6, 1.4)); // chimney: x, y, z, size, phase, speed, rise, spread
  for (let k = 0; k < 9; k++) steam.push(-17, 0.05, -8, rr(0.35, 0.6), rnd(), rr(0.2, 0.3), 3.2, rr(0.5, 1.2));
  // paper: lane origin x, z, seed, size; lane length, width, axis (0 along z, 1 along x), speed
  const LANES = [[-21.5, -50, 72, 7, 0], [-21, 27, 60, 5, 1], [-5, -14, 34, 8, 0], [-12, -58.5, 40, 6, 1]];
  for (let k = 0; k < 64; k++) { const l = LANES[k % 4]; paper.push(l[0], l[1], rnd(), rr(0.05, 0.11), l[2], l[3], l[4], rr(0.5, 1.4)); }

  const data = [], ranges = []; let n = 0;
  for (const a of inst) { ranges.push([n, a.length / 12]); n += a.length / 12; for (const v of a) data.push(v); }
  return { meshes, id, ranges, data: new Float32Array(data), wins: new Float32Array(wins), grass: pack(blades), gm, lg, snow, boxes,
    glare: new Float32Array(glare), steam: new Float32Array(steam), paper: new Float32Array(paper) };
}
