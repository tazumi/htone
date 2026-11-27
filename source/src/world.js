// ============================================================================
// world: the layout of the yard and everything generated from it
// ============================================================================
// North is -z, the viewer's house stands in the south and looks north. All of it is authored in metres below; the
// meshes, the instance lists and the baked maps are generated from these tables at load time.
const FH = 2.8, RAILZ = -185, RAILY = 2.5, ROADZ = -140;
// the highway along ROADZ: NRC slots, each sends one vehicle now and then (period, offset in s); vehicle kinds 0-4 are
// the cars, then a box truck, a tractor with a trailer, a motorhome and an old small bus: half length, speed in m/s
const NRC = 8, ROADP = [113, 173, 241, 307, 151, 199, 263, 331], ROADO = [20, 95, 150, 60, 130, 10, 200, 75];
// then a police van, a snow plough and a tractor with a blade (both slow, an orange beacon on the roof)
const VEH = [[2.2, 17], [2.05, 16], [1.95, 17], [2.15, 18], [2.25, 16], [4, 13], [8.3, 12], [3.8, 14], [3.6, 12], [2.2, 15], [4.6, 7], [2.4, 6]];
const vehKind = (h) => (h < 0.54 ? (h / 0.54 * 5) | 0 : h < 0.64 ? 5 : h < 0.74 ? 6 : h < 0.8 ? 7 : h < 0.86 ? 8 : h < 0.91 ? 9 : h < 0.96 ? 10 : 11);
// the beacon on the roof of each kind: height, colour (0 none, 1 blue, 2 orange), place along the vehicle
const VEHB = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [2.14, 1, 0.15], [3.42, 2, 3.2], [2.84, 2, -0.95]];
// the freight train: a locomotive, then the cars (kind, length); FRL is its whole length
const FREIGHT = [[0, 18]]; { rseed(41); for (let k = 0; k < 26; k++) { const c = 1 + (rnd() * 4 | 0); FREIGHT.push([c, [0, 12.5, 15, 13.5, 14][c]]); } }
const FRL = FREIGHT.reduce((a, c) => a + c[1], 0);
// building types: bay width, plinth height, bays per section on the yard side / the back, bays of the end walls
//   w window, b balcony, s stairwell (door at the bottom), n blank
const BT = [
  { bw: 2.9, base: 1.1, front: 'wbwswbw', back: 'wwbwbww', side: 'nwwn', mat: M_BRICK, top: 0.7 }, // brick five-storey
  { bw: 3.2, base: 0.9, front: 'wbbwwsw', back: 'bwwbwwb', side: 'wnbwn', mat: M_PANEL, top: 1.3 }, // panel nine-storey
  { bw: 3.4, base: 0.5, front: 'wnwsnwnwnw', back: 'nwnnwnnwnn', side: 'nwwn', mat: M_BRICK, top: 0.3, fh: 3.6, pitch: 1 }, // low brick shed
  { bw: 3.3, base: 0.9, front: 'wwsww', back: 'wwwww', side: 'wwww', mat: M_TINT, top: 0.6, fh: 3.4, pitch: 1 }, // two-storey house of the fifties, plastered
  { bw: 3.4, base: 1.2, front: 'bwbswbwb', back: 'wbwbbwbw', side: 'wbbw', mat: M_PANEL, top: 1.5, fh: 3 }, // a new tower (seed 2 and up: coloured panels)
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
  // the old quarter to the west: two-storey houses round courtyards (palette = the colour of the plaster)
  [-320, -40, 0, 3, 2, 2, 6, 0.3], [-320, 10, PI, 3, 2, 2, 0, 0.5], [-375, -15, PI / 2, 3, 2, 2, 6, 0.7], [-275, -15, -PI / 2, 3, 2, 2, 15, 0.2],
  [-320, 55, 0, 3, 2, 2, 0, 0.6], [-320, 105, PI, 3, 2, 2, 6, 0.1], [-375, 80, PI / 2, 3, 2, 2, 15, 0.8], [-295, -88, 0, 3, 2, 2, 6, 0.4], [-355, -88, 0, 3, 2, 2, 0, 0.9],
  // five-storeys on the avenue in the centre
  [222, 15, PI / 2, 0, 5, 2, 10, 0.25], [222, 95, PI / 2, 0, 5, 2, 9, 0.62],
  // the new towers south of the river
  [190, 350, 0, 4, 22, 1, 11, 2.3], [278, 350, 0, 4, 22, 1, 5, 2.7], [190, 458, PI, 4, 22, 1, 4, 3.1], [278, 458, PI, 4, 22, 1, 14, 3.6],
  // more of the old quarter: a third column of courtyards to the west, one more house on the north street
  [-440, -40, 0, 3, 3, 2, 0, 0.35], [-440, 10, PI, 3, 2, 2, 6, 0.55], [-495, -15, PI / 2, 3, 2, 2, 15, 0.75],
  [-440, 55, 0, 3, 2, 2, 15, 0.45], [-440, 105, PI, 3, 3, 2, 0, 0.15], [-495, 80, PI / 2, 3, 2, 2, 6, 0.85], [-415, -88, 0, 3, 3, 2, 0, 0.65],
  // the centre: five-storeys behind the police and the club, two panel towers behind the administration, one on the avenue
  [400, -100, 0, 0, 5, 2, 11, 0.3], [455, -20, -PI / 2, 1, 9, 1, 10, 0.5], [455, 30, -PI / 2, 1, 9, 1, 11, 0.6], [378, 95, PI, 0, 5, 2, 9, 0.7], [378, 130, 0, 0, 5, 2, 10, 0.2], [222, -60, PI / 2, 0, 5, 2, 11, 0.4],
  // south of the river: two more new towers, panel nine-storeys along the road, five-storeys on the far street
  [360, 350, 0, 4, 22, 1, 13, 2.5], [360, 458, PI, 4, 22, 1, 7, 3.3], [95, 360, PI / 2, 1, 9, 2, 10, 0.55], [95, 440, PI / 2, 1, 9, 2, 11, 0.35], [200, 530, PI, 0, 5, 2, 9, 0.5], [270, 530, PI, 0, 5, 2, 10, 0.8],
].map(([x, z, yaw, t, fl, sec, pal, sd]) => {
  const T = BT[t], L = T.front.length * sec * T.bw, D = T.side.length * T.bw, [cx, cz] = rotY(-L / 2, -D / 2, yaw), fh = T.fh || FH;
  return { x: x + cx, z: z + cz, yaw, t, fl, sec, pal, sd, T, L, D, fh, H: T.base + fl * fh + T.top, cx: x, cz: z };
});
// people standing about: the neck's height (+ 10 for the pair of talkers), then each mouth (x, y, z, heading off the figure's)
const PPL = { standing: [1.55, [0, 1.6, 0.25, 0]], walker: [1.54, [0, 1.6, 0.24, 0]], walkerW: [1.55, [0, 1.61, 0.24, 0]], smoker: [1.57, [0, 1.625, 0.19, 0]],
  girl: [1.48, [0, 1.53, 0.17, 0]], trucker: [1.58, [0, 1.64, 0.18, 0]], bouncer: [1.69, [0, 1.745, 0.14, 0]], seated: [1.29, [0, 1.34, 0.07, 0]], talkers: [11.5, [0, 1.64, -0.34, 0], [0, 1.54, 0.34, PI]] };
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
// the viewer's kitchen: the television on its shelf left of the window (as seen from the room), in the wall frame of house V
const TVU = RU + 1.22, TVY = RY + 1.72, TVZ = -0.78;

// street lamps: x, z, yaw of the arm, kind (0 cold LED, 1 old sodium), then the bulbs over the doors are added
const POLES = [[10.8, 10, PI, 0], [10.8, -22, PI, 0], [-4, -52.5, -PI / 2, 0], [22, -57, PI / 2, 0], [-13, -60, PI, 0], [57, -48, PI, 0],
  [46, 23.4, PI / 2, 0], [-44, 38, 0, 1], [-23, -96, 0, 1], [40, -90, PI / 2, 1], [80, -68, 0, 0], [78.5, 24, 0, 1]];
const FLICK = 5; // this one is on its way out
// the level crossing on the railway, east of the estate (x)
const XING = 150;
const LAMPS = POLES.map(([x, z, a, k], i) => { const [dx, dz] = rotY(1.6, 0, a); return { x: x + dx, y: 8.72, z: z + dz, r: 40, c: k ? [250, 128, 40] : [200, 224, 262], t: i }; });
BLD.slice(0, 5).forEach((b) => { if (LAMPS.length < 24) for (let i = 0; i < b.sec && LAMPS.length < 24; i++) { const u = (i * b.T.front.length + b.T.front.indexOf('s') + 0.5) * b.T.bw, p = toW(b, 0, u, 2.32, 0.95); LAMPS.push({ x: p[0], y: p[1], z: p[2], r: 9, c: [13, 7.6, 3.4], t: -1 }); } });

// shops: x, z, yaw (0: the shop front faces +z), kind (0 grocery, 1 chemist's, 2 / 3 the all-night kiosks), width, depth
const SHOPS = [[-20, -123.5, PI, 0, 14, 9], [28, -124.5, PI, 1, 10, 7], [-100, 145, -PI / 2, 2, 4.5, 3], [106, -40, -PI / 2, 3, 4.5, 3]];
// the private houses beyond the estate, along a dirt street at z = 145: x, z, yaw, variant
const PRIV = [-178, -164, -150, -136, -122].map((x, k) => [x, 136, 0, k % 3]).concat([-171, -157, -143, -129].map((x, k) => [x, 154, PI, (k + 1) % 3]));
// the bus stop by the highway: x, z, yaw (its open side faces the road)
const STOP = [-2, -131, PI];
// local point (lx, lz) of something standing at (x, z) turned by yaw, in the world
const loc = (x, z, yaw, lx, lz) => { const [a, b] = rotY(lx, lz, yaw); return [x + a, z + b]; };
// lights over the shop fronts, at the bus stop and on two poles in the private street
SHOPS.forEach(([x, z, a, k, w, d]) => { const [lx, lz] = loc(x, z, a, k > 1 ? 1.6 : -w / 2 + 1.2, d / 2 + 0.9); LAMPS.push({ x: lx, y: k > 1 ? 2.45 : 3.0, z: lz, r: 11, c: [[9, 8.5, 7.5], [3, 9, 4.5], [10, 6, 3], [6, 7, 10]][k], t: -1 }); });
{ const [x, z] = loc(STOP[0], STOP[1], STOP[2], 0, 0.3); LAMPS.push({ x, y: 2.35, z, r: 8, c: [6, 6.5, 7], t: -1 }); }
for (const x of [-157, -129]) LAMPS.push({ x, y: 5.6, z: 147.6, r: 16, c: [14, 7.5, 2.8], t: -1 });
// the glow of the kitchen television: a light that stays in the room (t = -2), its brightness flickers with the picture
const TVL = LAMPS.length;
{ const p = toW(BLD[0], 0, TVU - 0.25, TVY, TVZ - 0.5); LAMPS.push({ x: p[0], y: p[1], z: p[2], r: 5, c: [0.35, 0.5, 1.1], t: -2 }); }
// The rest of the flat behind the kitchen, in the same wall frame (u, z; the floor at RY): the rooms [u0, u1, z0, z1]
// (z0 the far side) - the kitchen, the living room, the corridor, the hall at the front door, the bedroom, the bathroom,
// the toilet; the walls between them are 12 cm.
const APT = [[RU - RW, RU + RW, RD1, RD0], [43.87, 49, -4.9, -0.42], [40.35, 46.3, -6.3, -5.02], [46.42, 49, -8.4, -5.02], [40.35, 43.5, -11.18, -6.42], [43.62, 45.4, -8.6, -6.42], [45.52, 46.3, -7.9, -6.42]];
// the doorways: in a wall across u (k 0, the wall's middle at z = c, from a to b) or across z (k 1, at u = c), and their height
const ADOOR = [[0, -4.96, 41.3, 42.1, 2.0], [0, -4.96, 47.6, 48.4, 2.0], [1, 46.36, -6.2, -5.12, 2.1], [0, -6.36, 42.5, 43.3, 2.0], [0, -6.36, 44.1, 44.8, 2.0], [0, -6.36, 45.52, 46.3, 2.0]];
// the windows besides the kitchen's: the living room's on the yard, the bedroom's at the back (wall, u along the yard side)
const AWIN = [[0, 47.85], [1, 42.05]];
// the door from the living room to the balcony of the bay next to its window (u from, to; the balcony's bay centre)
const ABAL = [44.55, 45.35, 44.95];
// the doors in the flat: u, z of the hinge, turn, seed, scale, how far open at first, its doorway (ADOOR; -1 the balcony's)
const FDOOR = [[41.3, -4.93, 0, 0.1, 1, 1.45, 0], [47.6, -4.93, 0, 0.3, 1, 1.4, 1], [43.3, -6.39, PI, 0.5, 1, 1.25, 3], [44.8, -6.39, PI, 0.7, 1, 1.15, 4], [45.52, -6.33, 0, 0.9, 0.97, 0.4, 5], [ABAL[1], -0.4, PI, 0.2, 1, 0, -1]];
const APTB = boxW(RU - RW, RY, -11.18, 49, RY + 2.62, RD0);
// the boxes the camera may be in: each room, each doorway (through the wall and a little into both rooms), in the world
const AFREE = APT.map(([u0, u1, z0, z1]) => boxW(u0, RY, z0, u1, RY + 2.62, z1)).concat(ADOOR.map(([k, c, a, b, h]) => (k ? boxW(c - 0.5, RY, a, c + 0.5, RY + h, b) : boxW(a, RY, c - 0.5, b, RY + h, c + 0.5))),
  [boxW(ABAL[0], RY, -0.9, ABAL[1], RY + 2.1, 0.3), boxW(ABAL[2] - 1.08, RY, -0.05, ABAL[2] + 1.08, RY + 2.4, 1.03)]); // the balcony door and the balcony
// the lights of the flat: they light only their own room (t = -2 - the room), and only inside the flat
const ALAMP = [[1, 46.4, RY + 2.38, -2.66, 6.5, [2.6, 1.9, 1.05]], [1, 45.8, RY + 1.0, -4.3, 4.5, [0.3, 0.45, 1.0]], [2, 43.3, RY + 2.5, -5.66, 4.5, [1.1, 0.85, 0.5]], [3, 47.7, RY + 2.2, -6.7, 4.5, [1.5, 1.1, 0.6]],
  [4, 40.52, RY + 0.8, -10.3, 4.5, [1.8, 1.1, 0.5]], [5, 45.26, RY + 2.0, -6.85, 4, [2.6, 2.5, 2.2]], [6, 45.91, RY + 2.25, -7.15, 2.5, [1.4, 1.1, 0.6]], [0, RU, RY + 2.4, -2.66, 5.5, [2.1, 1.65, 1.0]]];
const AL0 = LAMPS.length, TVL2 = AL0 + 1;
for (const [r, u, y, z, R, c] of ALAMP) { const p = toW(BLD[0], 0, u, y, z); LAMPS.push({ x: p[0], y: p[1], z: p[2], r: R, c, t: -2 - r }); }

// lawns: x0, z0, x1, z1, kerb (1: a kerb all round); everything else is asphalt. Each is a slab a little higher
// than the one before, so the tops never fight
const LAWN = [
  [10.2, -50, 56, 22, 1], [-12, -46, -6, -16, 1], // the playground lawn, the island in the car park
  [-13.5, -128, -5.2, -64, 1], [17.2, -128, 56.2, -64, 1], [-5.2, -128, 17.2, -79.7, 0], [30, -64, 56.2, -52, 1], // around the tower
  [56.2, -128, 79, 40, 0], [98, -128, 192, 192, 0], [86, -128, 98, -61, 0], [86, 0.2, 98, 192, 0], // east
  [-192, 53.8, 86, 192, 0], [44.8, 40, 56.2, 53.8, 0], [-192, -128, -39.8, 53.8, 0], [-39.8, -128, -22.2, -54, 0], // south, west
  [-192, -178, 192, -146, 0], // the waste ground between the road and the railway
  // the town round the estate (districts.js lays its streets over these)
  [-576, -134, -192, 576, 0], [192, -134, 576, 576, 0], [-192, 192, 192, 576, 0], [-576, -178, -192, -146, 0], [192, -178, 576, -146, 0],
];
const lawnAt = (x, z) => { for (let i = 0; i < LAWN.length; i++) { const l = LAWN[i]; if (x > l[0] && x < l[2] && z > l[1] && z < l[3]) return i; } return -1; };
const lawnY = (i) => 0.12 + i * 0.004;
// trodden paths across the lawns (polylines)
const PATHS = [[[10, 2, 0], [24, -6, 0], [40, -14, 0], [57, -22, 0]], [[12, 20, 0], [22, 6, 0], [24, -6, 0]], [[30, -50, 0], [26, -30, 0], [24, -6, 0]], [[56, 10, 0], [40, 14, 0], [22, 6, 0]]];
// rows of parked cars: x, z of the first, step x, step z, count, yaw (0: nose east)
const PARK = [[7.7, 13, 0, -2.75, 13, 0], [-3.5, -19, 0, -2.8, 6, PI], [-20.3, 10.5, 0, -2.8, 4, PI], [-16.4, 35.9, 2.8, 0, 6, -PI / 2],
  [14, 24.4, 2.8, 0, 8, PI / 2], [-2, -61.6, 2.8, 0, 6, PI / 2], [83.6, -44, 0, 2.8, 6, 0], [-20.4, -70, 0, -2.8, 4, PI]];
// trees: x, z, kind (0 tall, 1 spreading, 2 birch, 3 young), size
const TREES = [[50, -41, 1, 1.25], [-9, -20, 3, 1], [-9, -27, 3, 1.15], [-9, -34, 3, 0.9], [-9, -41, 3, 1.1], [-25.6, 22.5, 3, 1.2], [-25.8, -7.5, 2, 0.8], [-25.6, -30, 3, 1.3],
  [-25.8, -49, 2, 0.9], [-9.5, -58, 1, 0.9], [-10, -74, 0, 1], [24, -72, 2, 1], [34, -60, 1, 1], [44, -70, 0, 1.1], [38, -36, 2, 1.05], [47, 6, 1, 0.95], [52, -14, 2, 1], [30, 16, 3, 1.3],
  [62, -30, 0, 1], [70, -46, 1, 1.1], [74, 30, 2, 1], [-46, 20, 1, 1.1], [-52, -10, 0, 1.1], [-48, -40, 2, 1], [-60, -62, 1, 1], [-30, -70, 1, 0.9], [-32, -100, 0, 1], [54, -30, 2, 1], [16, -44, 4, 0.9], [52, 12, 4, 1], [-44, -20, 4, 1], [-44, 5, 4, 1.1], [-20, 62, 4, 1], [10, 64, 2, 1], [50, 66, 4, 1.1],
  [76, -20, 4, 1], [77, 30, 4, 1], [-9, -90, 4, 1], [20, -90, 2, 1], [12, -96, 2, 1], [4, -110, 1, 1],
  [30, -100, 0, 1], [-4, 62, 1, 1], [30, 66, 2, 1], [-30, 64, 0, 1], [60, 60, 1, 1], [104, -70, 0, 1], [106, -10, 1, 1.1], [110, 40, 2, 1], [-110, -40, 0, 1.1], [-116, 30, 1, 1], [-70, 60, 2, 1]];
// bare bushes: x, z, radius
const BUSH = [[-25.7, 10, 1.1], [-25.7, 3, 0.9], [-25.9, -12, 1.2], [-25.6, -18.5, 1], [-25.8, -38, 1.2], [-10.5, 40.4, 1], [18.5, 40.4, 1.1], [26, 40.3, 0.9], [-22, 40.4, 1], [-10.5, -16.8, 0.8], [12, -48, 1.2], [54, 20, 1.3], [-4, -63, 1], [55, -48, 1.1], [11.5, -20, 0.9], [40, 21, 1], [24, 21, 1.1], [-42, 30, 1.2], [-41, -30, 1], [70, -40, 1.2], [-8, -80, 1], [30, -110, 1.1]];
// the entrance doors of every house: [x, z, yaw of the outward normal, building, section]
const DOORS = [];
BLD.forEach((b, bi) => { const pat = patOf(b, 0); let k = 0; for (let i = 0; i < pat.length; i++) if (pat[i] === 's') { const p = toW(b, 0, (i + 0.5) * b.T.bw, 0, 0); DOORS.push([p[0], p[2], p[3], bi, k++, (i + 0.5) * b.T.bw]); } });
// nothing may grow or stand in the 7 m in front of a door
const nearDoor = (x, z, r = 1.8) => DOORS.some(([dx, dz, a]) => { const nx = sin(a), nz = cos(a), f = (x - dx) * nx + (z - dz) * nz, s = abs((x - dx) * nz - (z - dz) * nx); return f > -1 && f < 7 && s < r; });
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
      const mine = room && ((s === 0 && i === RSEC * 7 + RBAY) || AWIN.some(([ws, wu]) => ws === s && abs((s ? b.L - wu : wu) - uc) < 0.1)), bal = room && s === 0 && abs(uc - ABAL[2]) < 0.1;
      if (k === 's') {
        // door, steps, canopy on two posts; the stair windows sit half a floor off the others
        holes.push([uc - 0.7, uc + 0.7, 0.13, 2.25, RD]);
        for (let f = 1; f < b.fl; f++) { const y = T.base + f * fh - 0.8; holes.push([uc - 0.6, uc + 0.6, y, y + 1.2, RD]); W.push([s, uc, y + 0.6, -RD, 1.2, 1.2, 2, 0]); }
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
            const own = bal && f === RFL, glazed = !own && ihash(i, f, s + 31) < 0.72;
            if (own) holes.push([ABAL[0], ABAL[1], y0, y0 + 2.1, -RD0]);
            m.mat(M_CONC).box(uc - hb, y0 - 0.14, 0, uc + hb, y0, dep, 16, 0.45, 0.8);
            m.mat(panel ? M_PANEL : M_TINT).box(uc - hb, y0, dep - 0.06, uc + hb, y0 + 1, dep, 0, 0.7, 1);
            m.box(uc - hb, y0, 0, uc - hb + 0.06, y0 + 1, dep - 0.06, 16 | 32, 0.7, 1); m.box(uc + hb - 0.06, y0, 0, uc + hb, y0 + 1, dep - 0.06, 16 | 32, 0.7, 1);
            if (glazed) {
              W.push([s, uc, y0 + 1.72, dep - 0.03, hb * 2, 1.44, 1, 0], [s, uc - hb + 0.03, y0 + 1.72, dep / 2, dep, 1.44, 1, -PI / 2], [s, uc + hb - 0.03, y0 + 1.72, dep / 2, dep, 1.44, 1, PI / 2]);
            } else if (!own) W.push([s, uc, y0 + 1.6, 0.03, 2, 1.7, 0, 0]);
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
  if (T.pitch) {
    // pitched roof with eaves, gables in the wall's own material
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

// ---------------------------------------------------------------- the rest of the viewer's flat
// One mesh per room in the wall frame of house V: its floor (parquet, or tiles in the bathroom and the toilet), the
// ceiling, the walls with their doorways and windows cut out, skirting boards, a switch by each door; the kitchen's
// is only the wall to the corridor (the rest of the kitchen is in the house's own mesh). The wallpaper is the shader's
// (seed -10 - pattern, see the solid shader).
function meshRoom(r) {
  const m = new Mesh(), [u0, u1, z0, z1] = APT[r], y0 = RY, y1 = RY + 2.62, wet = r >= 5, wm = r ? M_TINT : M_CONC;
  // a wall face at fixed z (ax 0) or fixed u (ax 1) from a to b, with holes [a, b, y0, y1]
  const face = (ax, c, a, b, holes) => {
    const P = (t, y) => (ax ? [c, y, t] : [t, y, c]), ys = [y0, y1];
    for (const h of holes) ys.push(h[2], h[3]);
    ys.sort((p, q) => p - q);
    m.mat(wm);
    for (let j = 0; j < ys.length - 1; j++) {
      const ya = ys[j], yb = ys[j + 1]; if (yb - ya < 1e-4) continue;
      const cov = holes.filter((h) => h[2] <= ya + 1e-4 && h[3] >= yb - 1e-4).sort((p, q) => p[0] - q[0]);
      let t = a; const q = (ta, tb) => m.q4(P(ta, ya), P(tb, ya), P(tb, yb), P(ta, yb), [ya > y0 ? 1 : 0.6, ya > y0 ? 1 : 0.6, 1, 1]);
      for (const h of cov) { if (h[0] > t + 1e-4) q(t, h[0]); t = max(t, h[1]); }
      if (b > t + 1e-4) q(t, b);
    }
    // skirting along the floor, broken by the doorways
    if (r && !wet) {
      m.mat(M_BARK); let t = a; const sk = (ta, tb) => { const n = ax ? (c > (u0 + u1) / 2 ? -1 : 1) : (c > (z0 + z1) / 2 ? -1 : 1), A = P(ta, y0), B = P(tb, y0 + 0.07); if (ax) m.box(c, y0, ta, c + n * 0.02, y0 + 0.07, tb, 0, 0.6, 1); else m.box(ta, y0, c, tb, y0 + 0.07, c + n * 0.02, 0, 0.6, 1); };
      for (const h of holes.filter((h) => h[2] <= y0 + 0.01).sort((p, q) => p[0] - q[0])) { if (h[0] > t) sk(t, h[0]); t = max(t, h[1]); }
      if (b > t) sk(t, b);
    }
  };
  const doorsAt = (ax, c, a, b) => ADOOR.filter(([k, dc, da, db]) => k === ax && abs(dc - c) < 0.1 && da >= a - 0.01 && db <= b + 0.01).map(([k, dc, da, db, h]) => [da, db, y0, y0 + h]);
  const winsAt = (front) => AWIN.filter(([ws, wu]) => ws === (front ? 0 : 1) && wu > u0 && wu < u1).map(([ws, wu]) => [wu - 0.725, wu + 0.725, y0 + 0.95, y0 + 2.45]);
  if (r === 0) { face(0, z0, u0, u1, doorsAt(0, z0, u0, u1)); return m; }
  face(0, z0, u0, u1, doorsAt(0, z0, u0, u1).concat(z0 < -11 ? winsAt(false) : []));
  const balc = r === 1 ? [[ABAL[0], ABAL[1], y0, y0 + 2.1]] : [];
  face(0, z1, u0, u1, doorsAt(0, z1, u0, u1).concat(z1 > -0.5 ? winsAt(true) : [], balc));
  for (const [a, b] of balc) {
    m.mat(M_BARK).box(a, y0, z1, b, y0 + 0.04, 0, 0, 0.7, 1);
    m.mat(M_TINT); for (const [p0, p1] of [[a - 0.07, a], [b, b + 0.07]]) m.box(p0, y0, z1 - 0.015, p1, y0 + 2.17, z1, 0, 1, 1); m.box(a - 0.07, y0 + 2.1, z1 - 0.015, b + 0.07, y0 + 2.17, z1, 0, 1, 1);
  }
  face(1, u0, z0, z1, doorsAt(1, u0, z0, z1)); face(1, u1, z0, z1, doorsAt(1, u1, z0, z1));
  // floor and ceiling
  m.mat(wet ? M_TINT : M_BARK).q4([u0, y0, z0], [u1, y0, z0], [u1, y0, z1], [u0, y0, z1], 0.85);
  m.mat(M_CONC).q4([u0, y1, z1], [u1, y1, z1], [u1, y1, z0], [u0, y1, z0], 0.9);
  // the windows of the room: the reveal through the wall, the frame, the sill
  for (const [ws, wu] of AWIN) {
    if (wu < u0 || wu > u1 || (ws ? z0 > -11 : z1 < -0.5)) continue;
    const zi = ws ? z0 : z1, zo = ws ? -11.6 : 0, sg = ws ? -1 : 1, h0 = wu - 0.725, h1 = wu + 0.725, s0 = y0 + 0.95, s1 = s0 + 1.5;
    m.mat(M_CONC); m.q4([h0, s0, zi], [h0, s0, zo], [h0, s1, zo], [h0, s1, zi], 0.6); m.q4([h1, s0, zo], [h1, s0, zi], [h1, s1, zi], [h1, s1, zo], 0.6); m.q4([h0, s1, zi], [h0, s1, zo], [h1, s1, zo], [h1, s1, zi], 0.6);
    const fz = zo - sg * 0.3, fb = (p, q) => m.bar([p[0], p[1], fz], [q[0], q[1], fz], 0.045, 0.06, 0.9);
    fb([h0, s0 + 0.03], [h1, s0 + 0.03]); fb([h0, s1 - 0.03], [h1, s1 - 0.03]); fb([h0 + 0.03, s0], [h0 + 0.03, s1]); fb([h1 - 0.03, s0], [h1 - 0.03, s1]);
    fb([wu - 0.1, s0], [wu - 0.1, s1]); fb([wu - 0.1, s1 - 0.42], [h1, s1 - 0.42]);
    m.box(h0 - 0.12, s0 - 0.05, min(zi + sg * 0.3, fz), h1 + 0.12, s0, max(zi + sg * 0.3, fz), 0, 0.6, 1);
    // a net curtain on a rod across the window
    m.mat(M_METAL).bar([h0 - 0.3, y1 - 0.12, zi - sg * 0.1], [h1 + 0.3, y1 - 0.12, zi - sg * 0.1], 0.02);
    m.mat(M_CONC); for (let k = 0; k < 12; k++) { const c = (j) => [h0 - 0.25 + j * 0.06, zi - sg * (0.12 + 0.03 * sin(j * 2.3))]; const p = c(k), q = c(k + 1); m.q4([p[0], y0 + 0.5, p[1]], [q[0], y0 + 0.5, q[1]], [q[0], y1 - 0.14, q[1]], [p[0], y1 - 0.14, p[1]], 0.8); }
  }
  // the doorways of the room: lining through the wall, casings, the switch on the room side
  for (const [k, c, a, b, h] of ADOOR) {
    const mine = k ? (abs(c - u0) < 0.1 || abs(c - u1) < 0.1) && a >= z0 - 0.01 && b <= z1 + 0.01 : (abs(c - z0) < 0.1 || abs(c - z1) < 0.1) && a >= u0 - 0.01 && b <= u1 + 0.01;
    if (!mine) continue;
    const yh = y0 + h, side = k ? (c > (u0 + u1) / 2 ? -1 : 1) : (c > (z0 + z1) / 2 ? -1 : 1), cf = c + side * 0.06; // the room's face of the wall
    const B = (ta, ya, tb, yb, za, zb) => (k ? m.box(min(za, zb), ya, ta, max(za, zb), yb, tb, 0, 1, 1) : m.box(ta, ya, min(za, zb), tb, yb, max(za, zb), 0, 1, 1));
    m.mat(M_TINT); B(a, y0, a + 0.02, yh, c - 0.06, c); B(b - 0.02, y0, b, yh, c - 0.06, c); B(a, yh - 0.02, b, yh, c - 0.06, c);
    B(a - 0.07, y0, a, yh + 0.07, cf, cf + side * 0.015); B(b, y0, b + 0.07, yh + 0.07, cf, cf + side * 0.015); B(a - 0.07, yh, b + 0.07, yh + 0.07, cf, cf + side * 0.015);
    m.mat(M_CONC); B(b + 0.12, y0 + 0.88, b + 0.2, y0 + 0.98, cf, cf + side * 0.012);
  }
  return m;
}

// ---------------------------------------------------------------- the viewer's kitchen
// In the wall frame of house V (u along the wall, y up, z out of it; the room is z < 0): a table under the window with
// a cup of tea, the counter along one side wall with the gas stove and the kettle, wall cupboards, the fridge in the
// far corner, the television on a shelf on the other side of the window, two stools.
function meshKitchen() {
  const m = new Mesh(), u0 = RU - RW, u1 = RU + RW, y = RY;
  // the table, its oilcloth hanging over the edge, two stools
  m.mat(M_BARK); for (const [a, c] of [[RU - 0.5, -0.68], [RU + 0.5, -0.68], [RU - 0.5, -1.22], [RU + 0.5, -1.22]]) m.box(a - 0.025, y, c - 0.025, a + 0.025, y + 0.72, c + 0.025, 0, 0.5, 0.9);
  m.mat(M_RED).box(RU - 0.6, y + 0.72, -1.32, RU + 0.6, y + 0.76, -0.6, 0, 0.8, 1); m.box(RU - 0.61, y + 0.62, -1.33, RU + 0.61, y + 0.76, -1.31, 0, 0.8, 1); m.box(RU - 0.61, y + 0.62, -1.33, RU - 0.59, y + 0.76, -0.6, 0, 0.8, 1); m.box(RU + 0.59, y + 0.62, -1.33, RU + 0.61, y + 0.76, -0.6, 0, 0.8, 1);
  for (const [a, c] of [[RU - 0.25, -1.75], [RU + 0.75, -1.45]]) { m.mat(M_BARK).tube([[a, y + 0.44, c], [a, y + 0.48, c]], 0.17, 10, 3); for (let k = 0; k < 4; k++) { const an = k * PI / 2 + 0.6; m.bar([a + cos(an) * 0.11, y, c + sin(an) * 0.11], [a + cos(an) * 0.09, y + 0.44, c + sin(an) * 0.09], 0.025); } }
  // a cup of tea on its saucer, a sugar bowl
  m.mat(M_CONC).tube([[RU + 0.18, y + 0.76, -0.95], [RU + 0.18, y + 0.768, -0.95]], 0.075, 12, 3); m.tube([[RU + 0.18, y + 0.768, -0.95], [RU + 0.18, y + 0.85, -0.95]], (k) => 0.036 + k * 0.008, 12, 1);
  m.tube([[RU + 0.225, y + 0.835, -0.95], [RU + 0.255, y + 0.82, -0.95], [RU + 0.235, y + 0.79, -0.95]], 0.008, 4, 3);
  m.mat(M_BARK).tube([[RU + 0.18, y + 0.84, -0.95], [RU + 0.18, y + 0.842, -0.95]], 0.04, 12, 2);
  m.mat(M_TINT).tube([[RU - 0.3, y + 0.76, -0.85], [RU - 0.3, y + 0.84, -0.85], [RU - 0.3, y + 0.86, -0.85]], (k) => [0.05, 0.055, 0.035][k], 10, 3);
  // the counter: cupboards under it, the gas stove nearest the window, the sink, the wall cupboards over it
  const cu = u0 + 0.6;
  m.mat(M_TINT).box(u0, y, -3.2, cu, y + 0.86, -1.6, 0, 0.5, 1);
  for (let z = -3.2; z < -1.65; z += 0.4) m.mat(M_DARK).box(cu, y + 0.08, z + 0.01, cu + 0.004, y + 0.82, z + 0.02);
  m.mat(M_CONC).box(u0, y + 0.86, -3.22, cu + 0.03, y + 0.9, -1.58, 0, 1, 1);
  m.mat(M_METAL).box(u0 + 0.12, y + 0.84, -2.7, u0 + 0.48, y + 0.905, -2.25, 8); m.bar([u0 + 0.08, y + 0.9, -2.47], [u0 + 0.08, y + 1.15, -2.47], 0.02); m.bar([u0 + 0.08, y + 1.15, -2.47], [u0 + 0.26, y + 1.12, -2.47], 0.018);
  m.mat(M_TINT).box(u0, y, -1.58, cu - 0.02, y + 0.85, -0.9, 0, 0.5, 1);
  m.mat(M_DARK).box(cu - 0.02, y + 0.15, -1.5, cu - 0.015, y + 0.55, -0.98); // the oven door
  for (const [a, c] of [[u0 + 0.17, -1.07], [u0 + 0.43, -1.07], [u0 + 0.17, -1.4], [u0 + 0.43, -1.4]]) m.tube([[a, y + 0.85, c], [a, y + 0.865, c]], 0.07, 10, 2);
  for (let k = 0; k < 4; k++) m.box(cu - 0.02, y + 0.72, -1.52 + k * 0.15, cu, y + 0.77, -1.47 + k * 0.15);
  // the kettle on the near back burner
  m.mat(M_RED).tube([[u0 + 0.17, y + 0.865, -1.07], [u0 + 0.17, y + 0.95, -1.07], [u0 + 0.17, y + 1.04, -1.07], [u0 + 0.17, y + 1.06, -1.07]], (k) => [0.11, 0.12, 0.085, 0.03][k], 12, 2);
  m.mat(M_METAL).tube([[u0 + 0.24, y + 0.92, -1.07], [u0 + 0.33, y + 1.0, -1.07], [u0 + 0.36, y + 1.04, -1.07]], (k) => [0.022, 0.016, 0.012][k], 6, 2);
  m.mat(M_DARK).sweep([[u0 + 0.12, y + 1.04, -1.07], [u0 + 0.14, y + 1.14, -1.07], [u0 + 0.2, y + 1.14, -1.07], [u0 + 0.22, y + 1.04, -1.07]], 0.02, 0.025);
  m.mat(M_TINT).box(u0, y + 1.45, -3.2, u0 + 0.34, y + 2.15, -0.95, 0, 0.6, 0.9);
  for (let z = -3.2; z < -1; z += 0.45) m.mat(M_DARK).box(u0 + 0.34, y + 1.47, z + 0.01, u0 + 0.344, y + 2.13, z + 0.02);
  // the fridge in the far corner, rounded on top, a handle
  m.mat(M_TINT).box(u0 + 0.02, y, -4.85, u0 + 0.66, y + 1.5, -4.2, 0, 0.5, 1); m.tube([[u0 + 0.34, y + 1.5, -4.85], [u0 + 0.34, y + 1.5, -4.2]], 0.32, 10, 3);
  m.mat(M_METAL).box(u0 + 0.66, y + 0.9, -4.32, u0 + 0.69, y + 1.25, -4.28);
  // the television: an old box on a shelf with a bracket, turned a little to the table
  m.mat(M_BARK).box(TVU - 0.32, TVY - 0.27, TVZ - 0.36, u1, TVY - 0.24, TVZ + 0.36, 0, 0.7, 1);
  m.mat(M_DARK).bar([u1, TVY - 0.5, TVZ], [TVU - 0.15, TVY - 0.26, TVZ], 0.03);
  m.mat(M_TINT).box(TVU - 0.27, TVY - 0.24, TVZ - 0.24, u1 - 0.02, TVY + 0.16, TVZ + 0.24, 0, 0.7, 1);
  m.mat(M_DARK).box(TVU - 0.276, TVY - 0.2, TVZ - 0.2, TVU - 0.27, TVY + 0.12, TVZ + 0.17); m.bar([TVU, TVY + 0.16, TVZ], [TVU - 0.1, TVY + 0.45, TVZ - 0.15], 0.008); m.bar([TVU, TVY + 0.16, TVZ], [TVU + 0.05, TVY + 0.45, TVZ + 0.15], 0.008);
  return m;
}

// ---------------------------------------------------------------- cars
// side outline per kind (nose bottom, nose top, windscreen base, windscreen top, roof end, rear glass base, tail top, tail
// bottom), then width, sill height, wheel radius, wheelbase
const CARS = [ // 0-4: the cars of the estate; 5 an old saloon of the fifties, 6 a crossover, 7 a sports car, 8 an electric saloon
  [[[2.2, 0.5], [2.15, 0.72], [0.9, 0.95], [0.25, 1.42], [-0.9, 1.42], [-1.55, 1.02], [-2.15, 0.96], [-2.2, 0.55]], 1.72, 0.24, 0.31, 2.6],
  [[[2.05, 0.5], [2.03, 0.78], [0.78, 0.86], [0.46, 1.37], [-0.72, 1.37], [-1.12, 0.88], [-2.03, 0.85], [-2.05, 0.5]], 1.62, 0.26, 0.3, 2.42],
  [[[1.95, 0.5], [1.9, 0.72], [0.8, 0.93], [0.2, 1.46], [-1.3, 1.44], [-1.8, 0.99], [-1.92, 0.9], [-1.95, 0.5]], 1.7, 0.24, 0.3, 2.46],
  [[[2.15, 0.58], [2.1, 0.9], [0.95, 1.08], [0.3, 1.63], [-1.5, 1.61], [-2, 1.12], [-2.12, 1.05], [-2.15, 0.58]], 1.82, 0.32, 0.36, 2.66],
  [[[2.25, 0.5], [2.2, 0.85], [1.55, 1.04], [1.05, 1.84], [-2.1, 1.84], [-2.2, 1.12], [-2.24, 1], [-2.25, 0.5]], 1.76, 0.28, 0.33, 2.8],
  [[[2.4, 0.55], [2.35, 0.86], [1.0, 1.0], [0.42, 1.52], [-0.75, 1.52], [-1.4, 1.05], [-2.35, 0.95], [-2.4, 0.55]], 1.8, 0.28, 0.34, 2.7],
  [[[2.25, 0.62], [2.2, 0.98], [1.0, 1.12], [0.35, 1.68], [-1.65, 1.65], [-2.15, 1.18], [-2.22, 1.1], [-2.25, 0.62]], 1.88, 0.38, 0.38, 2.7],
  [[[2.25, 0.42], [2.2, 0.62], [0.7, 0.8], [-0.1, 1.18], [-0.9, 1.18], [-1.8, 0.9], [-2.2, 0.82], [-2.25, 0.45]], 1.9, 0.18, 0.33, 2.6],
  [[[2.35, 0.5], [2.3, 0.72], [1.2, 0.88], [0.4, 1.42], [-0.9, 1.42], [-1.9, 1.0], [-2.32, 0.92], [-2.35, 0.52]], 1.86, 0.22, 0.34, 2.85],
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
    m.mat(t > 1 && t !== 4 ? M_GLASS : M_PAINT).tri(m.v(P[4][0], belt(P[4][0]), z * hw), m.v(P[5][0], P[5][1], z * hw), m.v(P[4][0], P[4][1], z * hr));
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
    if (t === 3 || t === 6) m.mat(M_DARK).bar([P[3][0] - 0.1, P[3][1] + 0.035, z * (hr - 0.1)], [P[4][0] + 0.1, P[4][1] + 0.035, z * (hr - 0.1)], 0.03); // roof rails
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
    const m = new Mesh().mat(M_METAL); for (const z of [-0.76, 0.76]) m.bar([-576, 0.1, z], [576, 0.1, z], 0.08, 0.16);
    for (let x = -567; x <= 567; x += 45) { m.bar([x, 0, -3.2], [x, 7.2, -3.2], 0.22); m.bar([x, 6.6, -3.2], [x, 6.6, 0.3], 0.1); }
    m.bar([-576, 6.1, 0], [576, 6.1, 0], 0.03); return m;
  },
  entLeaf() { // the entrance door of a house from outside: the leaf (x 0..0.9 from its hinge, its face at z 0.05) that
    // opens, and the narrow leaf beside it that stays (x 0.905..1.4); the frame of the doorway is the house's
    const m = new Mesh().mat(M_PAINT);
    m.box(0, 0, 0, 0.9, 2.12, 0.05, 0, 0.8, 1); m.box(0.905, 0, 0, 1.4, 2.12, 0.05, 0, 0.8, 1);
    for (const [x0, x1] of [[0.1, 0.8], [1.0, 1.31]]) { m.box(x0, 0.2, 0.05, x1, 0.95, 0.07, 0, 0.7, 1); m.box(x0, 1.15, 0.05, x1, 1.95, 0.07, 0, 0.7, 1); }
    m.mat(M_METAL); m.box(0.76, 0.98, 0.05, 0.84, 1.04, 0.1, 0, 0.6, 1); m.box(0.8, 0.98, 0.1, 0.83, 1.18, 0.12, 0, 0.6, 1);
    for (const y of [0.3, 1.8]) m.box(-0.02, y, -0.01, 0.03, y + 0.14, 0.06, 0, 0.5, 1);
    return m;
  },
  entHall() { // behind the doorway: the lobby of the stairs, lit by its bulb (the shader's light, see anim 15), going 1.9 m in
    // (x 0..1.4 across the doorway, z < 0 into the house, the floor at the sill); mailboxes, the first flight up
    const m = new Mesh().mat(M_LAMP), D = -1.9, Y = 2.12;
    m.q4([0, 0, -0.01], [1.4, 0, -0.01], [1.4, 0, D], [0, 0, D], [0.55, 0.55, 0.3, 0.3]);
    m.q4([0, Y, D], [1.4, Y, D], [1.4, Y, -0.01], [0, Y, -0.01], [0.5, 0.5, 0.75, 0.75]);
    m.q4([0, 0, D], [0, 0, -0.01], [0, Y, -0.01], [0, Y, D], [0.45, 0.6, 0.85, 0.65]);
    m.q4([1.4, 0, -0.01], [1.4, 0, D], [1.4, Y, D], [1.4, Y, -0.01], [0.6, 0.45, 0.65, 0.85]);
    m.q4([1.4, 0, D], [0, 0, D], [0, Y, D], [1.4, Y, D], [0.4, 0.4, 0.8, 0.8]);
    // the flight up along the back, its steps lit on their treads; the mailboxes on the left wall; a green dado
    for (let k = 0; k < 6; k++) m.box(0.3, k * 0.16, D + 0.02, 1.4, (k + 1) * 0.16, D + 0.5 - k * 0.0, 2 | 8, 0.95 - k * 0.04, 0.5);
    for (let k = 0; k < 3; k++) m.box(0.01, 1.15 + k * 0.2, -1.35, 0.12, 1.33 + k * 0.2, -0.55, 1 | 2, 0.35, 0.55);
    return m;
  },
};

// ---------------------------------------------------------------- the world: instances, windows, grass, sprites, baked maps
function makeWorld() {
  const nCells = CELLS * CELLS, meshes = [], id = {}, inst = [], instZ = [];
  // registers a mesh under a name; solid() places instances of it: 12 floats = pos + scale, quaternion, palette, seed, tex scale, animation
  const reg = (name, m, o = {}) => {
    const b = m.build(); b.name = name; b.noSh = o.noSh; id[name] = meshes.length; meshes.push(b); inst.push([]); instZ.push([]);
    const f = new Float32Array(b.vb); let r = 0; for (let k = 0; k < b.nv; k++) r = max(r, hypot(f[k * 4], f[k * 4 + 1], f[k * 4 + 2])); b.r = r; // reach from the origin
    return b;
  };
  // every instance falls in a zone that is drawn or not as a whole (main.js): 0 is the estate and everything placed at
  // the origin, then the town in squares of ZW metres; LODM 1 / 2 puts the instances in a copy of the grid drawn only
  // near / only far (the forest: a fuller tree near, a plain one far)
  let LODM = 0;
  const zoneOf = (x, z) => (!LODM && abs(x) < CORE + 6 && abs(z) < CORE + 6 ? 0 : 1 + clamp(floor((x - OX) / ZW), 0, ZN_ - 1) + ZN_ * clamp(floor((z - OZ) / ZW), 0, ZN_ - 1) + LODM * ZN_ * ZN_);
  const solid = (name, x, y, z, yaw = 0, pal = 0, seed = 0, ts = 1, an = 0, sc = 1) => {
    // people standing about come alive (anim 12, the tex scale is the neck's height), their breath shows in the frost
    const P = !an && PPL[name];
    if (P) {
      an = 12; ts = P[0]; if (!seed) seed = rnd();
      for (let k = 1; k < P.length; k++) { const [mx, my, mz, fa] = P[k], [dx, dz] = rotY(mx * sc, mz * sc, yaw), h = (((yaw + fa) % TAU) + TAU) % TAU; steam.push(x + dx, y + my * sc, z + dz, 0.045, rnd(), rr(0.24, 0.32), -1 - h, rr(0.3, 0.4)); }
    }
    if ((an === 7 && fract(ts) < 0.3) || an === 10 || an === 11) walk7.push([x, y, z, yaw, floor(ts), /dog|wolf|fox|hare/.test(name)]);
    const q = qYaw(yaw), i = id[name]; inst[i].push(x, y, z, sc, q[0], q[1], q[2], q[3], pal, seed, ts, an); instZ[i].push(zoneOf(x, z));
  };
  const lod = (m) => { LODM = m; };
  const walk7 = []; // x, y, z, yaw, length, paws: the ways of those walking to and fro (anim 7) and of the animals (10, 11)
  const wins = [], winB = [], boxes = [], rects = [], snd = [], thaw = [], bare = []; // bare: x0, z0, x1, z1 where no grass grows // winB: building * 4 + wall of each pane; snd: sounds in the world [kind, x, y, z] // rects: footprints for the ground map [cx, cz, hx, hz, yaw, weight]
  const blades = Array.from({ length: nCells }, () => []);
  const glare = [], steam = [], paper = [], decals = []; // decals: x, y, z, yaw, w, h, mode, glow, atlas cell

  for (const k in PROPS) reg(k, PROPS[k](), { noSh: ['wagon', 'bulb', 'entHall'].includes(k) });
  for (const k in PROPS8) { const r = PROPS8[k](); reg(k, r.build ? r : r.m, { noSh: ['tram', 'kid', 'kidSled', 'taxiSign'].includes(k) }); }
  for (const k in PROPS2) reg(k, PROPS2[k]());
  // props4: the yard and street props; props5: vehicles, people and animals (walkers cast no baked shadow: they move)
  for (const k in PROPS4) reg(k, PROPS4[k](), { noSh: ['bag'].includes(k) });
  for (const k of ['uaz', 'ambulance', 'plow', 'tractor', 'walker', 'walkerW', 'janitor', 'courier', 'drunk', 'dog', 'dogLying', 'dogSmall', 'crow', 'bird', 'rowan', 'oldTree', 'tent', 'frameBld', 'watertower'])
    reg(k, PROPS5[k](), { noSh: ['walker', 'walkerW', 'janitor', 'courier', 'drunk', 'dogSmall'].includes(k) });
  for (const k of ['truck', 'semi', 'rv', 'bus', 'loco', 'tank', 'box', 'gondola', 'flat', 'kiosk']) reg(k, PROPS3[k](), { noSh: ['loco', 'tank', 'box', 'gondola', 'flat'].includes(k) });
CARS.forEach((c, t) => reg('car' + t, meshCar(t)));
  for (let k = 0; k < 4; k++) reg('tree' + k, meshTree(k, LV > 1));
  reg('tree4', PROPS3.spruce(LV > 1)); reg('tree5', PROPS3.spruce(true)); // the second for the far forest
  reg('pav0', PROPS3.pavilion(14, 9)); reg('pav1', PROPS3.pavilion(10, 7));
  { const m = new Mesh().mat(M_BARK); m.bar([0, 0, 0], [0, 6, 0], 0.2); m.bar([0, 5.8, 0], [0, 5.75, 1.2], 0.07); reg('wpole', m); }

  // --- buildings; the ones of one kind and size share a mesh
  const made = {};
  BLD.forEach((b, i) => {
    const key = i ? 'b' + b.t + b.fl + b.sec : 'home';
    if (!made[key]) { made[key] = meshBuilding(b, !i); reg(key, made[key].m); }
    solid(key, b.x, 0, b.z, b.yaw, b.pal, b.sd, b.T.bw);
    for (const [s, u, y, z, w, h, ty, dy] of made[key].W) { const p = toW(b, s, u, y, z, dy); wins.push(p[0], p[1], p[2], p[3], w, h, ihash(wins.length, i, 7), ty); winB.push(i * 4 + s); }
    // somebody smokes on an open balcony of the house across the yard: the ember of the cigarette
    if (i === 1) { const o = made[key].W.find((e) => e[3] === 0.03 && e[2] > 9 && !e[0]), p = toW(b, 0, o[1] + 0.45, o[2] - 0.12, 0.98); glare.push(p[0], p[1], p[2], 0.07, 3.2, 0.8, 0.15, 2); }
    const c0 = toW(b, 0, 0, 0, 0), c1 = toW(b, 1, 0, 0, 0);
    boxes.push([min(c0[0], c1[0]), min(c0[2], c1[2]), max(c0[0], c1[0]), max(c0[2], c1[2]), b.H + 3]);
    rects.push([b.cx, b.cz, b.L / 2, b.D / 2, b.yaw, 1]);
  });

  // a few flats are always lit and have a sound: a radio playing, somebody cooking, a family at the television
  {
    rseed(19); const cand = [];
    for (let k = 0; k < winB.length; k++) { const bi = winB[k] >> 2, y = wins[k * 8 + 1]; if (wins[k * 8 + 7] === 0 && (winB[k] & 3) < 2 && [0, 1, 2, 4].includes(bi) && y > 3 && y < 13 && hypot(wins[k * 8] - EYE[0], wins[k * 8 + 2] - EYE[2]) > 8) cand.push(k); }
    for (const [fl, kind, n] of [[1, 'radio', 5], [2, 'cook', 4], [3, 'tv', 3]]) for (let j = 0; j < n; j++) {
      const k = cand.splice(rnd() * cand.length | 0, 1)[0]; wins[k * 8 + 7] = fl * 4; snd.push([kind, wins[k * 8], wins[k * 8 + 1], wins[k * 8 + 2]]);
    }
  }

  // --- ground: one asphalt sheet, the lawns as slabs on it, kerbs, the railway bank
  {
    const m = new Mesh().mat(M_ASPH); m.q4([-576, 0, -576], [-576, 0, 576], [576, 0, 576], [576, 0, -576]);
    LAWN.forEach((l, i) => {
      const y = lawnY(i); m.mat(M_SOIL).box(l[0], 0, l[1], l[2], y, l[3], 4, 0.6, 1);
      if (l[4]) { const e = 0.07, h = y + 0.05; m.mat(M_CONC); m.box(l[0] - e, 0, l[1] - e, l[2] + e, h, l[1] + e, 4, 0.6, 1); m.box(l[0] - e, 0, l[3] - e, l[2] + e, h, l[3] + e, 4, 0.6, 1); m.box(l[0] - e, 0, l[1] + e, l[0] + e, h, l[3] - e, 4 | 16 | 32, 0.6, 1); m.box(l[2] - e, 0, l[1] + e, l[2] + e, h, l[3] - e, 4 | 16 | 32, 0.6, 1); }
    });
    m.mat(M_SOIL).q4([-576, 0, RAILZ + 11], [576, 0, RAILZ + 11], [576, RAILY, RAILZ + 6], [-576, RAILY, RAILZ + 6], 0.8); m.q4([-576, RAILY, RAILZ + 6], [576, RAILY, RAILZ + 6], [576, RAILY, -576], [-576, RAILY, -576]);
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
    if (l.t < 0 && !l.nb) solid('bulb', l.x, l.y + 0.12, l.z, 0, 0, i);
    // glare: a cold star on the street lamps, a small warm dot on the bulbs
    glare.push(l.x, l.y - (l.t < 0 ? 0 : 0.06), l.z, l.t < 0 ? 0.5 : 1.5, 0, 0, 0, 100 + i);
  });
  for (let x = -572; x <= 572; x += 44) { solid('lamp', x, 0, ROADZ + 7.5, PI / 2, 0, -1); glare.push(x, 8.7, ROADZ + 5.9, 2.4, 2.2, 1.05, 0.3, 0); }
  const bench = (x, z, a) => { solid('bench', x, grassY(x, z) < 0 ? 0 : grassY(x, z), z, a, 8, x); const [dx, dz] = rotY(1.25, 0.1, a); solid('urn', x + dx, max(grassY(x + dx, z + dz), 0), z + dz); };
  bench(27, -4.5, 0.3); bench(31.5, 6, -2.4); bench(24, -13, 2.6); bench(38, -3, -1.2); bench(18.5, 14, PI);
  BLD.slice(0, 2).forEach((b) => { for (let i = 0; i < b.sec; i++) { const u = (i * 7 + 3.5) * b.T.bw + 2.3, p = toW(b, 0, u, 0, 1.2); solid('bench', p[0], 0, p[2], p[3] - PI / 2, 8, u); } });
  const ly = lawnY(0);
  solid('slide', 15.5, ly, -4.5, -0.5); solid('swing', 20.5, ly, 3.2, 0.25, 5); for (const d of [-0.75, 0.75]) { const [dx, dz] = rotY(d, 0, 0.25); solid('seat', 20.5 + dx, ly, 3.2 + dz, 0.25, 14, d + 2, 1, 3); }
  solid('carousel', 23, ly, -19, 0, 11, 0, 1, 8); solid('mushroom', 13.8, ly, 5.5, 0.4, 15); solid('frame', 34, ly, 16, 0.2);
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
  glare.push(0, 0, 0, 2.6, 4, 3.6, 3, 50, 0, 0, 0, 2.6, 4, 3.6, 3, 51); for (let k = 0; k < NRC; k++) glare.push(0, 0, 0, 1.5, 0, 0, 0, 60 + k, 0, 0, 0, 0.9, 0, 0, 0, 70 + k, 0, 0, 0, 0.7, 0, 0, 0, 80 + k);

  // --- the viewer's kitchen: its mesh in the frame of house V, tiles, the picture on the television, a clock, steam over
  //     the cup and the kettle, the blue of the gas under it, the television's sound
  {
    const b = BLD[0], [ox, oz, a] = FS(b, 0), m = meshKitchen(), M = new Mesh();
    reg('kitchen', m); const q = rotY(ox, oz, b.yaw); solid('kitchen', b.x + q[0], 0, b.z + q[1], a + b.yaw, 13, 0.5);
    const at = (u, y, z, dy = 0) => toW(b, 0, u, y, z, dy), dec = (u, y, z, dy, w, h, md, gl, nm) => { const p = at(u, y, z, dy); decals.push(p[0], p[1], p[2], p[3], w, h, md, gl, nm); };
    dec(RU - RW + 0.006, RY + 1.17, -2.4, PI / 2, 1.6, 0.54, 0, 0, 'tiles'); dec(RU - RW + 0.006, RY + 1.17, -1.25, PI / 2, 0.7, 0.54, 0, 0, 'tiles');
    dec(TVU - 0.277, TVY - 0.04, TVZ - 0.015, -PI / 2, 0.36, 0.3, 3, 1.4, 'tvimg');
    dec(RU + RW - 0.006, RY + 2.0, -2.6, -PI / 2, 0.32, 0.32, 0, 0, 'clock');
    dec(RU + RW - 0.006, RY + 1.45, -3.6, -PI / 2, 0.36, 0.5, 0, 0, 'calendar');
    { const p = at(RU + 0.18, RY + 0.86, -0.95); for (let k = 0; k < 6; k++) steam.push(p[0], p[1], p[2], rr(0.03, 0.05), rnd(), rr(0.25, 0.35), 0.35, rr(0.3, 0.6)); }
    { const p = at(RU - RW + 0.36, RY + 1.04, -1.07); for (let k = 0; k < 9; k++) steam.push(p[0], p[1], p[2], -rr(0.035, 0.06), rnd(), rr(0.3, 0.45), 0.5, rr(0.4, 0.9)); } // the kettle's: as much as main.js says
    for (const [u, c] of [[RU - RW + 0.17, -1.07]]) { const p = at(u, RY + 0.87, c); glare.push(p[0], p[1], p[2], 0.12, 0.25, 0.45, 1.6, 12); }
    { const p = at(TVU - 0.3, TVY, TVZ); snd.push(['tvroom', p[0], p[1], p[2], 0, 0]); }

    // --- the rest of the flat: the rooms (wallpaper of a palette and a pattern each), the doors, the furniture under its
    //     lamps, the television in the wall unit with its sound
    const PAL = [13, 6, 13, 6, 10, 10, 13], PAT = [0, 2, 0, 0, 1, 3, 3];
    APT.forEach((_, r) => { reg('apt' + r, meshRoom(r)); solid('apt' + r, b.x + q[0], 0, b.z + q[1], a + b.yaw, PAL[r], -10 - PAT[r]); });
    const F7 = {}, f7 = (nm, ...arg) => { const k = 'f7' + nm + arg.join('_'); if (!F7[k]) { const r = PROPS7[nm](...arg); reg(k, r.build ? r : r.m); F7[k] = r; } return k; };
    // a piece standing at (u, z) of the wall frame, turned by dir (0: its front to the yard side, PI / 2: to +u)
    const put = (nm, u, z, dir, pal = 0, sd = 0.3, y = RY, sc = 1, ...arg) => { const k = f7(nm, ...arg), p = at(u, y, z, dir); solid(k, p[0], p[1], p[2], p[3], pal, sd, 1, 0, sc); return F7[k]; };
    const yc = RY + 2.62, L = (i) => AL0 + i;
    // the living room: the wall unit with the television, the sofa under the carpet, the table on the rug, an armchair, the piano
    { const W = put('wallUnit', 45.5, -4.9, 0, 8, 0.4), T = put('tvSet', 45.5 + W.tv[0], -4.9 + W.tv[2], 0, 0, 0.2, RY + W.tv[1]);
      dec(45.5 + W.tv[0] + T.screen[0], RY + W.tv[1] + T.screen[1], -4.9 + W.tv[2] + T.screen[2] + 0.006, 0, T.w, T.h, 6, 1.4, 'tvimg');
      const p = at(45.8, RY + 1.0, -4.4); snd.push(['tvroom', p[0], p[1], p[2], 0, 1]); }
    put('sofa', 43.87, -2.6, PI / 2, 9, 0.3); put('wallCarpet', 43.875, -2.6, PI / 2, 0, 0.5, RY + 0.95); dec(43.875 + 0.027, RY + 1.65, -2.6, PI / 2, 1.9, 1.3, 0, 0, 'carpet');
    put('rug', 45.9, -2.7, PI / 2, 0, 0.6); put('coffeeTable', 45.5, -2.6, PI / 2, 0, 0.2);
    put('armchair', 48.25, -1.5, -2.45, 9, 0.7); put('floorLamp', 44.3, -0.95, 0, 6, L(0)); put('plant', 46.55, -0.95, 0.4, 7, 0.4);
    put('piano', 49, -3.65, -PI / 2, 8, 0.8); put('radiator', 47.85, -0.42, PI, 0, 0.2); put('chandelier', 46.4, -2.66, 0, 6, L(0), yc);
    dec(48.994, RY + 1.95, -3.65, -PI / 2, 0.32, 0.32, 0, 0, 'clock');
    // the corridor: a runner, the lamp, the calendar; the hall: the front door, the coats, the boots, the mirror and the telephone
    put('rug', 43.6, -5.66, PI / 2, 0, 0.9, RY, 0.42); put('plafond', 43.3, -5.66, 0, 0, L(2), yc);
    dec(44.6, RY + 1.6, -5.026, PI, 0.64, 0.48, 0, 0, 'painting');
    put('entranceDoor', 49, -7.2, -PI / 2, 8, 0.5); put('coatRack', 47.7, -8.4, 0, 2, 0.6); put('shoeRack', 46.42, -7.85, PI / 2, 0, 0.3);
    put('hallMirror', 46.42, -6.95, PI / 2, 0, 0.5); put('ceilingBulb', 47.7, -6.7, 0, 0, L(3), yc);
    // the bedroom: the bed, the bedside lamp on, the wardrobe and the dressing table, a rug, the radiator under the window
    put('bed', 40.35, -8.9, PI / 2, 11, 0.4); put('nightstand', 40.35, -10.2, PI / 2, 6, L(4)); put('wardrobe', 43.5, -8.0, -PI / 2, 8, 0.5);
    put('dresser', 43.5, -9.9, -PI / 2, 8, 0.6); put('rug', 41.9, -8.9, 0, 0, 0.3, RY, 0.55); put('radiator', 42.05, -11.18, 0, 0, 0.7);
    // the bathroom and the toilet
    put('bathtub', 44.51, -8.6, 0, 13, 0.2); put('washbasin', 45.4, -7.25, -PI / 2, 2, 0.4); put('washer', 43.62, -7.3, PI / 2, 0, 0.3);
    put('towelRail', 43.62, -7.3, PI / 2, 11, 0.5, RY + 0.35); put('bathMat', 44.5, -7.6, 0, 7, 0.2); put('wallLamp', 45.4, -6.8, -PI / 2, 0, L(5), RY + 2.0);
    put('toilet', 45.91, -7.9, 0, 13, 0.3); put('ceilingBulb', 45.91, -7.15, 0, 0, L(6), yc);
    // the doors, open or ajar at first: each turns on its hinge by its slot (anim 16); the balcony's is shut
    const k7 = f7('intDoor', 0);
    for (const [u, z, dir, sd, sc, open, ad] of FDOOR) {
      const o = slot(() => 0), p = at(u, RY, z, dir); ACT[o * 8 + 6] = open; FLAT.doors.push({ o, open, ad, want: open > 0.05 });
      solid(k7, p[0], p[1], p[2], p[3], 13, sd, o, 16, sc);
      const q = ad < 0 ? at(ABAL[2], RY + 1.1, -0.3) : ADOOR[ad][0] ? at(ADOOR[ad][1], RY + 1.1, (ADOOR[ad][2] + ADOOR[ad][3]) / 2) : at((ADOOR[ad][2] + ADOOR[ad][3]) / 2, RY + 1.1, ADOOR[ad][1]);
      USE.push({ p: [q[0], q[1], q[2]], r: 0.55, kind: 'door', i: FLAT.doors.length - 1 });
    }
    put('plafond', RU, -2.66, 0, 0, L(7), yc);
    // the switches: one by the door of each room, on the room's side
    APT.forEach(([u0, u1, z0, z1], r) => {
      const d = ADOOR.find(([k, c, a, b]) => (k ? (abs(c - u0) < 0.1 || abs(c - u1) < 0.1) && a >= z0 - 0.01 && b <= z1 + 0.01 : (abs(c - z0) < 0.1 || abs(c - z1) < 0.1) && a >= u0 - 0.01 && b <= u1 + 0.01));
      if (!d) return; const [k, c, , b] = d, side = k ? (c > (u0 + u1) / 2 ? -1 : 1) : (c > (z0 + z1) / 2 ? -1 : 1), cf = c + side * 0.075, q = k ? at(cf, RY + 0.93, b + 0.16) : at(b + 0.16, RY + 0.93, cf);
      USE.push({ p: [q[0], q[1], q[2]], r: 0.2, kind: 'light', i: r });
    });
    // the televisions and the stove under the kettle
    { const q = at(TVU - 0.28, TVY, TVZ); USE.push({ p: [q[0], q[1], q[2]], r: 0.3, kind: 'tv', i: 0 }); }
    { const q = at(45.5, RY + 1.1, -4.6); USE.push({ p: [q[0], q[1], q[2]], r: 0.4, kind: 'tv', i: 1 }); }
    { const q = at(RU - RW + 0.3, RY + 0.98, -1.07); USE.push({ p: [q[0], q[1], q[2]], r: 0.3, kind: 'kettle', i: 0 }); }
    // what the flat sounds like: the fridge, the tap in the bathroom, the neighbours above and through the wall, the lift
    // and the stairs behind the front door, the kettle on the stove
    for (const [kind, u, y, z] of [['fridge', RU + RW - 0.35, 0.9, -4.5], ['tap', 45.2, 0.9, -7.25], ['neigh', 46, 2.9, -3], ['neigh', 49.4, 1.4, -2.4], ['liftin', 49.6, 1.2, -7.2], ['kettle', RU - RW + 0.36, 1.0, -1.07]]) { const p = at(u, RY + y, z); snd.push([kind, p[0], p[1], p[2]]); }
    // on the balcony: old skis, the jars of pickles, a sled
    for (const [nm, u, z, dir, pal] of [['skis', 44.05, 0.02, 0, 0], ['jars', 45.55, 0.3, 0.1, 0], ['sled', 45.8, 0.72, 0.2, 5]]) { const p = at(u, RY, z, dir); solid(nm, p[0], p[1], p[2], p[3], pal, 0.4); }
  }

  // --- by every door: the intercom (lit), the plate with the flat numbers, and what the youth of the yard wrote
  rseed(31);
  const TAGS = [...Array(12).keys()].map((k) => ['g' + k, 1.4, 0.52]).concat([['heart', 0.5, 0.5], ['smile', 0.45, 0.45], ['scrawl', 1, 0.42], ['stencil', 1.1, 0.28]]);
  for (const [, , , bi, sec, uc] of DOORS) {
    const b = BLD[bi], at = (u, y, z) => toW(b, 0, u, y, z), dec = (u, y, z, w, h, md, gl, nm) => { const p = at(u, y, z); decals.push(p[0], p[1], p[2], p[3], w, h, md, gl, nm); };
    dec(uc + 0.45, 1.3, -0.205, 0.16, 0.32, 1, 1.6, 'intercom');
    { const p = at(uc + 0.45, 1.38, -0.1); glare.push(p[0], p[1], p[2], 0.18, 0.05, 0.22, 0.32, 0); }
    if (b.t !== 2) dec(uc, 2.37, 0.012, 0.55, 0.2, 0, 0, 'plate' + (sec & 3));
    for (const side of [-1, 1]) {
      if (rnd() < 0.3) continue;
      const [nm, w0, h0] = pick(TAGS), sc = rr(1.15, 1.5), w = w0 * sc, h = h0 * sc, u = uc + side * (0.85 + w / 2 + rr(0, 0.7));
      dec(u, rr(0.45, 1.5 - h / 2) + h / 2, 0.012 + rnd() * 0.004, w, h, 0, 0, nm);
    }
    if (rnd() < 0.35) dec(uc + rr(-0.3, 0.1), rr(0.7, 1.4), -0.205, 0.5, 0.19, 0, 0, pick(TAGS)[0]); // on the door itself
  }
  // on the garage doors and the transformer booth
  [[47, 36.2], [50.6, 36.3], [54.2, 36.1], [-52, 44], [-55.6, 44.1]].forEach(([x, z], k) => { if (k !== 1) { const [nm, w, h] = pick(TAGS); decals.push(x + rr(-0.4, 0.4), max(grassY(x, z), 0) + 1.1, z + 2.92, 0, min(w, 2.4), min(h, 0.9), 0, 0, nm); } });
  decals.push(-28.955, 1.4, -63.95, PI / 2, 1.2, 0.45, 0, 0, 'g0', -28.955, 1.2, -60.2, PI / 2, 1.1, 0.28, 0, 0, 'stencil');

  // --- the shops: pavilions with lit windows full of goods, the two all-night kiosks
  const decL = (x, z, a, lx, y, lz, w, h, md, gl, nm) => { const [wx, wz] = loc(x, z, a, lx, lz); decals.push(wx, y, wz, a, w, h, md, gl, nm); };
  for (const [x, z, a, k, w, d] of SHOPS) {
    if (k < 2) {
      solid('pav' + k, x, 0, z, a, 0, x);
      const ow = w - 2.8, oc = -w / 2 + 0.6 + ow / 2;
      const nw = max(1, round(ow / 6.4)); for (let j = 0; j < nw; j++) decL(x, z, a, oc + (j - (nw - 1) / 2) * ow / nw, 1.62, d / 2 - 1.1, ow / nw, 2.3, 1, 1.15, k ? 'pharmWin' : 'shopWin');
      decL(x, z, a, 0, 3.28, d / 2 + 0.03, 4.4, 0.55, k ? 2 : 1, k ? 3 : 2.2, k ? 'signPharm' : 'signShop');
      if (k) decL(x, z, a, w / 2 - 1.4, 2.62, d / 2 + 0.01, 0.62, 0.62, 2, 3, 'cross');
      decL(x, z, a, w / 2 - 1.4, 1.75, d / 2 - 0.5, 0.8, 0.3, 2, 2.4, 'open');
    } else {
      solid('kiosk', x, 0, z, a, k === 2 ? 11 : 6, x);
      decL(x, z, a, -0.5, 1.5, 1.05, 3, 1.5, 1, 1.1, k === 2 ? 'kioskWinA' : 'kioskWinB');
      decL(x, z, a, -0.4, 2.55, 1.53, 1.6, 0.4, 2, 3, k === 2 ? 'sign24a' : 'sign24b');
      decL(x, z, a, -1.55, 2.05, 1.3, 0.6, 0.22, 2, 2.4, 'open');
      decL(x, z, a, 1.6, 1.32, 1.42, 0.32, 0.24, 0, 0, 'knock');
    }
    const c0 = loc(x, z, a, -w / 2, -d / 2), c1 = loc(x, z, a, w / 2, d / 2), side = abs(abs(a) - PI / 2) < 0.1;
    boxes.push([min(c0[0], c1[0]), min(c0[1], c1[1]), max(c0[0], c1[0]), max(c0[1], c1[1]), k > 1 ? 2.9 : 3.7]); rects.push([x, z, side ? d / 2 : w / 2, side ? w / 2 : d / 2, 0, 1]);
    { const [ux, uz] = loc(x, z, a, w / 2 + 0.6, d / 2 + 0.4); solid('urn', ux, 0, uz); }
  }
  // the bus stop: two people on the bench, one standing by the sign, the timetable
  {
    const [x, z, a] = STOP; solid('stop', x, 0, z, a, 10, 3);
    const P = (lx, lz) => loc(x, z, a, lx, lz);
    { const [px, pz] = P(-0.9, -0.45); solid('seated', px, 0, pz, a, 9, 1); }
    { const [px, pz] = P(0.6, -0.45); solid('seated', px, 0, pz, a + 0.15, 4, 2); }
    { const [px, pz] = P(1.7, 0.7); solid('standing', px, 0, pz, a - 0.6, 2, 3); }
    decL(x, z, a, 2.4, 2.05, -0.14, 0.32, 0.4, 0, 0, 'busSign');
    decL(x, z, a, -1.2, 1.55, -0.74, 0.5, 0.62, 0, 0, 'notice0');
    boxes.push([x - 2.2, z - 1, x + 2.7, z + 1, 2.6]);
  }
  // the private houses: a cottage with rooms behind its windows, a plank fence with a gap for the gate, a kennel with a
  // dog that howls at night, a spruce or a birch in the garden
  rseed(52);
  const cott = [0, 1, 2].map((v) => { const r = PROPS3.cottage(v); reg('cott' + v, r.m); return r.W; });
  PRIV.forEach(([x, z, a, v], hi) => {
    solid('cott' + v, x, 0, z, a, 0, rnd(), 1);
    for (const [lx, ly, lz, la, w, h] of cott[v]) { const [wx, wz] = loc(x, z, a, lx, lz); wins.push(wx, ly, wz, a + la, w, h, rnd(), hi === 2 ? 12 : hi === 6 ? 8 : 0); }
    const c0 = loc(x, z, a, -4, -3.5), c1 = loc(x, z, a, 4, 3.5);
    boxes.push([min(c0[0], c1[0]), min(c0[1], c1[1]), max(c0[0], c1[0]), max(c0[1], c1[1]), 6.8]); rects.push([x, z, 4, 3.4, 0, 1]);
    for (let fx = -6.25; fx < 6.3; fx += 2.5) { if (abs(fx - 1.25) < 0.1) continue; const [px, pz] = loc(x, z, a, fx, 6.5); solid('planks', px, 0, pz, a, 0, fx); }
    for (const sx of [-7.5, 7.5]) for (let fz = -4.75; fz < 6; fz += 2.5) { const [px, pz] = loc(x, z, a, sx, fz); solid('planks', px, 0, pz, a + PI / 2, 0, fz + sx); }
    const [kx, kz] = loc(x, z, a, hi & 1 ? -5.6 : 5.4, 4.6); solid('kennel', kx, 0, kz, a + rr(-0.4, 0.4));
    if (hi % 3 === 0) snd.push(['dog', kx, 0.4, kz]);
    const [tx, tz] = loc(x, z, a, hi & 1 ? 5 : -5.2, -1.5); solid(rnd() < 0.6 ? 'tree4' : 'tree2', tx, 0, tz, rr(0, TAU), 1, rnd(), 1, 1, rr(0.75, 1.05));
  });
  for (const x of [-157, -129]) solid('wpole', x, 0, 146.4);

  // --- the highway: every slot has one vehicle of each kind, the vertex shader shows the kind the slot sends now
  {
    const VM = ['car0', 'car1', 'car2', 'car3', 'car4', 'truck', 'semi', 'rv', 'bus', 'uaz', 'plow', 'tractor'];
    rseed(61);
    for (let k = 0; k < NRC; k++) VM.forEach((nm, kind) => solid(nm, 0, 0, 0, 0, kind === 8 ? pick([14, 15]) : kind === 9 ? 10 : kind === 10 ? 15 : kind === 11 ? pick([11, 5]) : kind > 4 ? pick([1, 2, 5, 6, 7, 8, 10, 11, 13]) : pick([0, 1, 2, 3, 4, 5, 6, 7]), k, kind, 5));
    const m = new Mesh().mat(M_CONC);
    for (let x = -576; x < 576; x += 9) m.box(x, 0, ROADZ - 0.06, x + 4, 0.006, ROADZ + 0.06, 4, 1, 1);
    for (const z of [ROADZ - 3.6, ROADZ + 3.6]) m.box(-576, 0, z - 0.06, 576, 0.006, z + 0.06, 4, 1, 1);
    m.box(-576, 0, ROADZ + 4.5, 576, 0.14, ROADZ + 4.7, 4, 0.6, 1); m.box(-576, 0, ROADZ - 4.7, 576, 0.14, ROADZ - 4.5, 4, 0.6, 1);
    reg('road', m); solid('road', 0, 0, 0);
  }
  // --- the freight train, laid out from the nose of the locomotive towards -x
  { const VM = ['loco', 'tank', 'box', 'gondola', 'flat']; let at = 0; rseed(62); for (const [k, l] of FREIGHT) { solid(VM[k], -at - l / 2, RAILY + 0.1, RAILZ, 0, k ? pick([2, 5, 6, 8, 9, 10, 12]) : 14, at, 1, 4); at += l; } }

  // --- people on the roofs with their legs over the edge, whistling
  [[2, 8.4, 3], [2, 9.3, 9], [1, 31, 12]].forEach(([bi, u, pal], k) => {
    const b = BLD[bi], p = toW(b, 0, u, b.H, 0); solid('sitter', p[0], p[1], p[2], p[3], pal, k * 1.7, 1, 6);
    if (k === 1) { const c = toW(b, 0, u + 0.18, b.H + 0.62, 0.05); glare.push(c[0], c[1], c[2], 0.07, 3.2, 0.8, 0.15, 2); } // a cigarette
    if (k !== 1) snd.push(['whistle', p[0], p[1], p[2]]);
  });
  // --- two cars by the doors with the engine running and music playing inside: exhaust, the glow of the dashboard
  [[17.2, 36.4, 0, 'car3', 4], [-22.4, -7.2, PI / 2, 'car1', 2]].forEach(([x, z, a, nm, pal]) => {
    solid(nm, x, 0, z, a, pal, 0.37, 1, 0); boxes.push([x - 2.3, z - 2.3, x + 2.3, z + 2.3, 1.5]); rects.push([x, z, 2.1, 0.86, a, 0.8]);
    const [ex, ez] = loc(x, z, a, -2.25, 0.4), [dx, dz] = loc(x, z, a, 0.55, 0);
    for (let k = 0; k < 7; k++) steam.push(ex, 0.3, ez, rr(0.12, 0.2), rnd(), rr(0.35, 0.5), 0.9, rr(0.4, 0.8));
    glare.push(dx, 1.0, dz, 0.35, 0.35, 0.12, 0.55, 0); snd.push(['music', x, 1, z]);
  });

  // --- things in the yard: snowmen, tyre flower beds, concrete vases by the doors, low arched fences, a notice board,
  //     bollards, piles of shovelled snow, horizontal bars, old benches, bins by the doors
  {
    const g0 = (x, z) => max(grassY(x, z), 0);
    solid('snowman', 29.5, g0(29.5, 2), 2, 0.6, 0, 1); solid('snowman', -31.5, g0(-31.5, 12.5), 12.5, -PI / 2 - 0.3, 0, 2);
    for (const [x, z] of [[40, 8], [16, -30], [-3, 39.5], [24.5, 39.5], [-25.5, -33]]) solid('tyres', x, g0(x, z), z, rr(0, TAU), pick([4, 5, 11, 14, 15, 7]), x);
    for (const [x, z, a, bi] of DOORS) if (bi < 2) for (const sd of [-1, 1]) { const [vx, vz] = loc(x, z, a, sd * 2.05, 1.9); solid('vase', vx, 0, vz); }
    for (let x = 11; x < 55; x += 2.4) solid('arcs', x + 1.2, 0, 22.4, 0, 0, x);
    for (let z = -48; z < 20; z += 2.4) solid('arcs', 9.9, 0, z + 1.2, PI / 2, 0, z);
    { const [bx, bz] = loc(-28.2, -2.8, PI / 2, 3.2, 1.6); solid('board', bx, 0, bz, PI / 2, 8);
      decals.push(bx + 0.035, 1.5, bz - 0.28, PI / 2, 0.42, 0.52, 0, 0, 'notice0', bx + 0.035, 1.56, bz + 0.25, PI / 2, 0.38, 0.47, 0, 0, 'notice1', bx + 0.035, 1.27, bz + 0.02, PI / 2, 0.3, 0.22, 0, 0, 'notice2'); }
    for (let k = 0; k < 6; k++) solid('bollard', 10.1, 0, -14 - k * 4.5, 0, 0, k);
    for (const [x, z, a] of [[8.5, 18.5, 0.3], [-6, -52, 1.2], [-21.5, 16, 0], [82, -50, 0.4], [-3.2, -15.5, 1.7], [12.4, 27.5, 0.1]]) solid('pile', x, 0, z, a, 0, x);
    solid('bar', 30, lawnY(0), 11.5, PI / 2); solid('bar', 42, lawnY(0), -26, 0.3);
    for (const [x, z, a] of [[44, -12, 0.2], [36, -44, -0.6], [-10.5, -46, PI / 2]]) solid('lowbench', x, g0(x, z), z, a, 8, x);
    for (const [, , , bi, , uc] of DOORS) if (bi < 2) { const b = BLD[bi], p = toW(b, 0, uc + 2.3, 0, 2.2); solid('urn', p[0], 0, p[2]); }
  }

  // --- the small things of the estate and round it, the walkways and paths from the doors (town.js)
  town({ solid, reg, wins, winB, made, decals, glare, steam, snd, boxes, rects, grassY, thaw, bare });
  // --- the town round the estate: its districts, streets, park and forest (districts.js)
  districts({ solid, reg, lod, wins, winB, made, decals, glare, steam, snd, boxes, rects, grassY, thaw, bare, paper });
  // --- the snow heaped up round the town, the new places, the far corners (extras.js)
  extras({ solid, reg, lod, wins, winB, made, decals, glare, steam, snd, boxes, rects, grassY, thaw, bare, paper, has: (n) => n in id });
  // --- what moves about on its own: the traffic, people going from door to door, the dogs (life.js)
  life({ solid, reg, glare, steam, snd, boxes, grassY, decals, wins, has: (n) => n in id });
  // --- footprints in the snow along every way somebody walks or something runs: the walkers going to and fro, the
  //     animals of the forest, the people and dogs of life.js (decal mode 7: the shader shows them where snow lies)
  {
    const fp = (x, y, z, a, paws) => { if ((x > APTB[0] && x < APTB[3] && z > APTB[2] && z < APTB[5] && y > APTB[1] - 1) || boxes.some((h) => x > h[0] && x < h[2] && z > h[1] && z < h[3] && h[4] > 2)) return; decals.push(x, y + 0.012, z, a, paws ? 0.3 : 0.42, paws ? 1 : 1.4, 7, 0, paws ? 'paws' : 'steps'); };
    for (const [x, y, z, a, L, paws] of walk7) { const st = paws ? 1 : 1.4, [dx, dz] = rotY(0, 1, a); for (let s = st / 2; s < L; s += st) { const px = x + dx * s, pz = z + dz * s; fp(px, max(y, grassY(px, pz), onStreet(px, pz) ? ST_Y : 0), pz, a, paws); } }
    for (const [P, paws] of TRAILS) { const st = paws ? 1 : 1.4; for (let s = 1.6; s < P.L - (P.closed ? 0 : 1.6); s += st) { const u = s / P.L * (P.N - 1), i = min(floor(u), P.N - 2), dx = P.X[i + 1] - P.X[i], dz = P.Z[i + 1] - P.Z[i]; fp(mix(P.X[i], P.X[i + 1], u - i), mix(P.Y[i], P.Y[i + 1], u - i), mix(P.Z[i], P.Z[i + 1], u - i), atan2(dx, dz), paws); } }
  }
  // --- every entrance door: the leaf (anim 15: life.js opens some through their slots, the rest stay shut) and the lobby
  DOORS.forEach(([, , , bi, , uc], di) => { const b = BLD[bi], p = toW(b, 0, uc - 0.7, 0.13, -0.22), o = DSLOT[di] || 0; solid('entHall', p[0], p[1], p[2], p[3], 0, di, o, 15); solid('entLeaf', p[0], p[1], p[2], p[3], b.pal, di, o, 15); });

  // --- cars
  rseed(5);
  for (const [x0, z0, dx, dz, n, yaw] of PARK) for (let k = 0; k < n; k++) {
    if (rnd() < 0.17) continue;
    const t = pick([0, 0, 1, 1, 2, 2, 3, 3, 3, 4]), x = x0 + dx * k + rr(-0.12, 0.12), z = z0 + dz * k + rr(-0.12, 0.12), a = yaw + rr(-0.05, 0.05) + (rnd() < 0.25 ? PI : 0);
    solid('car' + t, x, 0, z, a, pick([0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 5, 6, 7]), rnd(), 1, 0);
    rects.push([x, z, 2.1, 0.86, a, 0.8]); boxes.push([x - 1.3, z - 1.3, x + 1.3, z + 1.3, 1.5]);
  }

  // --- trees, then the wires
  rseed(6);
  for (const [x, z, k, s] of TREES) { if (nearDoor(x, z)) continue; solid('tree' + k, x, max(grassY(x, z), 0) - 0.05, z, rr(0, TAU), k === 2 ? 1 : 0, rnd(), 1, 1, s * rr(0.92, 1.08)); if (k < 3 || k === 4) boxes.push([x - 0.3, z - 0.3, x + 0.3, z + 0.3, 3]); }
  for (let i = 0; i < 46; i++) { // the outskirts
    const x = rr(-185, 185), z = rr(-125, 185); if (hypot(x, z + 10) < 95 || onStreet(x, z, 4) || (x > RAMPN[0] - 4 && x < RAMPN[2] + 4 && z > RAMPN[1] - 4 && z < RAMPN[3] + 4) || lawnAt(x, z) < 0 || inBld(x, z, 4) || nearDoor(x, z, 3)) continue;
    solid('tree' + [0, 1, 2, 4][rnd() * 4 | 0], x, lawnY(lawnAt(x, z)) - 0.05, z, rr(0, TAU), rnd() < 0.3 ? 1 : 0, rnd(), 1, 1, rr(0.8, 1.25));
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
  // distance to the nearest trodden path, rasterised once at the resolution of each ground map
  const WF = [[512, 0.75, -CORE, -CORE], [768, WORLD / 768, OX, OZ]].map(([N, cs, ox, oz]) => {
    const d = new Float32Array(N * N).fill(9);
    for (const p of PATHS) for (let k = 0; k < p.length - 1; k++) {
      const a = p[k], b = p[k + 1], ex = b[0] - a[0], ez = b[1] - a[1], ee = ex * ex + ez * ez + 1e-9;
      const i0 = max(0, floor((min(a[0], b[0]) - 2 - ox) / cs)), i1 = min(N - 1, floor((max(a[0], b[0]) + 2 - ox) / cs)), j0 = max(0, floor((min(a[1], b[1]) - 2 - oz) / cs)), j1 = min(N - 1, floor((max(a[1], b[1]) + 2 - oz) / cs));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const x = (i + 0.5) * cs + ox, z = (j + 0.5) * cs + oz, t = clamp(((x - a[0]) * ex + (z - a[1]) * ez) / ee, 0, 1), q = hypot(x - a[0] - ex * t, z - a[1] - ez * t); if (q < d[i + N * j]) d[i + N * j] = q; }
    }
    return { d, N, cs, ox, oz };
  });
  const wear = (x, z) => { const f = abs(x) < CORE && abs(z) < CORE ? WF[0] : WF[1]; return f.d[clamp(floor((x - f.ox) / f.cs), 0, f.N - 1) + f.N * clamp(floor((z - f.oz) / f.cs), 0, f.N - 1)]; };
  const tuft = (x, z, y) => {
    const n = fbm(x * 0.21, 3, z * 0.21, 2), tall = rnd() < 0.035 * sstep(0.45, 0.7, n);
    if (tall) for (let k = 0; k < 3; k++) leaf(x + rr(-0.1, 0.1), y, z + rr(-0.1, 0.1), rr(0.45, 1.15), rr(0, TAU), rr(0.03, 0.3), rr(0.014, 0.022), 0, 1, rnd(), rnd(), rr(0.3, 0.6)); // weeds
    else for (let k = 0; k < 3; k++) leaf(x + rr(-0.06, 0.06), y, z + rr(-0.06, 0.06), rr(0.09, 0.26) * (0.6 + n), rr(0, TAU), rr(0.15, 0.9), rr(0.012, 0.02), rnd(), 0, rnd(), rnd(), rr(0.3, 0.9));
  };
  const sow = (x0, z0, x1, z1, dens) => { for (let n = (x1 - x0) * (z1 - z0) * dens / THIN | 0; n--;) { const x = rr(x0, x1), z = rr(z0, z1), y = grassY(x, z); if (y < 0 || inBld(x, z) || wear(x, z) < 0.6 || bare.some((b) => x > b[0] && x < b[2] && z > b[1] && z < b[3])) continue; tuft(x, z, y); } };
  sow(-40, -128, 86, 54, 5.5); // dense around the yard
  sow(-110, -128, -40, 100, 1.2); sow(86, -128, 140, 100, 1.2); sow(-40, 54, 86, 110, 1.2); sow(-110, -178, 140, -146, 0.8);
  sow(-400, -80, -256, 122, 0.9); sow(150, 360, 320, 450, 0.8); sow(-235, 316, 68, 488, 0.5); sow(266, -54, 520, 160, 0.3); // the town
  for (const [x, z, r] of BUSH) { if (nearDoor(x, z)) continue; const y = max(grassY(x, z), 0); for (let k = 0; k < 150 / THIN; k++) { const a = rr(0, TAU), d = rr(0, 0.3) * r; leaf(x + cos(a) * d, y, z + sin(a) * d, rr(0.7, 1.7) * r, a + rr(-0.5, 0.5), rr(0.1, 0.95), rr(0.012, 0.02), 0, 2, rnd(), rnd(), rr(0.35, 0.6)); } }
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

  // --- ground maps: r = openness (dark and dry under cars and by the walls), g = snow cover, b = worn path, a = puddles;
  //     one MAPW x MAPH texture holds the estate's 512 x 512 (0.75 m) and the whole town's 768 x 768 (1.5 m) beside it
  const gm = new Uint8Array(MAPW * MAPH * 4);
  for (const [N, cs, ox, oz, tx0, wf] of [[512, 0.75, -CORE, -CORE, 0, WF[0]], [768, WORLD / 768, OX, OZ, 512, WF[1]]]) {
    const occ = new Float32Array(N * N), tmp = new Float32Array(N * N), NN = N * N - 1;
    for (const [cx, cz, hx, hz, yaw, w] of rects) {
      const r = hypot(hx, hz) + 0.3, i0 = max(0, floor((cx - r - ox) / cs)), i1 = min(N - 1, floor((cx + r - ox) / cs)), j0 = max(0, floor((cz - r - oz) / cs)), j1 = min(N - 1, floor((cz + r - oz) / cs));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const [lx, lz] = rotY((i + 0.5) * cs + ox - cx, (j + 0.5) * cs + oz - cz, -yaw); if (abs(lx) < hx + 0.3 && abs(lz) < hz + 0.3) occ[i + N * j] = max(occ[i + N * j], w); }
    }
    for (let pass = 0; pass < 2; pass++) { // blur
      for (let o = 0; o <= NN; o++) tmp[o] = (occ[max(o - 1, 0)] + 2 * occ[o] + occ[min(o + 1, NN)]) * 0.25;
      for (let o = 0; o <= NN; o++) occ[o] = (tmp[max(o - N, 0)] + 2 * tmp[o] + tmp[min(o + N, NN)]) * 0.25;
    }
    const melt = new Float32Array(N * N).fill(1);
    for (const [tx, tz, tr] of thaw) { const r = tr * 1.3, i0 = max(0, floor((tx - r - ox) / cs)), i1 = min(N - 1, floor((tx + r - ox) / cs)), j0 = max(0, floor((tz - r - oz) / cs)), j1 = min(N - 1, floor((tz + r - oz) / cs));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) melt[i + N * j] = min(melt[i + N * j], sstep(tr * 0.7, tr * 1.3, hypot((i + 0.5) * cs + ox - tx, (j + 0.5) * cs + oz - tz))); }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = (i + 0.5) * cs + ox, z = (j + 0.5) * cs + oz, k = i + N * j, o = (tx0 + i + MAPW * j) * 4, oc = occ[k];
      gm[o] = (1 - 0.8 * sstep(0, 0.7, oc)) * 255;
      gm[o + 1] = clamp(sstep(0.36, 0.62, fbm(x * 0.045, 1, z * 0.045, 3) * 0.7 + fbm(x * 0.21, 5, z * 0.21, 2) * 0.3) * (1 - sstep(0.05, 0.45, oc)) * melt[k], 0, 1) * 255;
      gm[o + 2] = (1 - sstep(0.5, 1.8, wf.d[k])) * 255;
      gm[o + 3] = sstep(0.5, 0.68, fbm(x * 0.07 + 9, 2, z * 0.07, 3)) * 255;
    }
  }

  // --- which lamps light what: an LGN x LGN grid over the world with the 8 strongest lamps of each 6 m square (two texels)
  const lg = new Uint8Array(LGN * 2 * LGN * 4).fill(255), cand = Array.from({ length: LGN * LGN }, () => []);
  LAMPS.forEach((l, k) => {
    if (l.t < -1.5) return; // the flat's own lights: the shader goes through them in the flat
    const r = l.r + 4.3 + 4.3, i0 = max(0, floor((l.x - r - OX) / 6)), i1 = min(LGN - 1, floor((l.x + r - OX) / 6)), j0 = max(0, floor((l.z - r - OZ) / 6)), j1 = min(LGN - 1, floor((l.z + r - OZ) / 6));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const d = max(hypot((i + 0.5) * 6 + OX - l.x, (j + 0.5) * 6 + OZ - l.z) - 4.3, 0); if (d < l.r) cand[i + LGN * j].push([l.c[1] * (1 - d * d / (l.r * l.r)) ** 2 / (d * d + 30), k]); }
  });
  cand.forEach((c, o) => c.sort((a, b) => b[0] - a[0]).slice(0, 8).forEach((e, k) => { lg[o * 8 + k] = e[1]; }));

  // --- sprites: snow, steam, scraps of paper
  rseed(8);
  const snow = new Float32Array(NSNOW * 4); for (let i = 0; i < snow.length; i++) snow[i] = rnd();
  for (let k = 0; k < 26; k++) steam.push(124, 58, -124, rr(5, 9), rnd(), rr(0.035, 0.05), 46, rr(0.6, 1.4)); // chimney: x, y, z, size, phase, speed, rise, spread
  for (let k = 0; k < 9; k++) steam.push(-17, 0.05, -8, rr(0.35, 0.6), rnd(), rr(0.2, 0.3), 3.2, rr(0.5, 1.2));  // paper: lane origin x, z, seed, size; lane length, width, axis (0 along z, 1 along x), speed
  const LANES = [[-21.5, -50, 72, 7, 0], [-21, 27, 60, 5, 1], [-5, -14, 34, 8, 0], [-12, -58.5, 40, 6, 1], [-30, 31, 72, 6, 1], [60, -66, 60, 5, 0], [-40, -137, 120, 8, 1]];
  for (let k = 0; k < 140; k++) { const l = LANES[k % LANES.length]; paper.push(l[0], l[1], rnd(), rr(0.05, 0.11), l[2], l[3], l[4], rr(0.5, 1.4)); }

  // instances of a mesh in runs by zone: ranges[mesh] = [[first, count, zone], ...]; the box of each zone (x0 y0 z0 x1 y1 z1)
  let n = 0; for (const a of inst) n += a.length / 12;
  const data = new Float32Array(n * 12), ranges = [], zb = new Float32Array(NZONE * 6);
  for (let z = 0; z < NZONE; z++) zb.set([1e9, 1e9, 1e9, -1e9, -1e9, -1e9], z * 6);
  n = 0;
  inst.forEach((a, i) => {
    const Z = instZ[i], ord = Z.map((z, k) => k).sort((p, q) => Z[p] - Z[q]), R = [], r = meshes[i].r;
    for (const k of ord) {
      const z = Z[k], o = k * 12, e = r * a[o + 3];
      data.set(a.slice(o, o + 12), n * 12);
      if (R.length && R[R.length - 1][2] === z) R[R.length - 1][1]++; else R.push([n, 1, z]);
      const b = z * 6; zb[b] = min(zb[b], a[o] - e); zb[b + 1] = min(zb[b + 1], a[o + 1] - e); zb[b + 2] = min(zb[b + 2], a[o + 2] - e); zb[b + 3] = max(zb[b + 3], a[o] + e); zb[b + 4] = max(zb[b + 4], a[o + 1] + e); zb[b + 5] = max(zb[b + 5], a[o + 2] + e);
      n++;
    }
    ranges.push(R);
  });
  return { snd, meshes, id, ranges, zb, data, wins: new Float32Array(wins), grass: pack(blades), gm, lg, snow, boxes,
    decals: [...Array(decals.length / 9).keys()].map((k) => decals.slice(k * 9, k * 9 + 9)), glare: new Float32Array(glare), steam: new Float32Array(steam), paper: new Float32Array(paper) };
}
