// ============================================================================
// districts: the town round the estate
// ============================================================================
// Plain script, concatenated after town.js; makeWorld() calls districts() with its lists. To the west the old quarter
// of two-storey houses round their courtyards, with a bakery and a kiosk, and the cafe for the truck drivers on the
// highway; to the east the centre: the square with the monument and the New Year tree, the administration with its
// flag, the police, the fire station, the hospital, a night club; across the river a park round a frozen lake and four
// new towers; and the forest all round, where now and then a wolf, a fox, an arctic fox or a hare runs past.
// The houses themselves are in BLD (world.js), so their entrances get what every entrance gets in town.js.

// the streets: asphalt over the lawns, [x0, z0, x1, z1]
const STREETS = [
  [-256, -134, -244, 130], [-520, -66, -256, -54], [-520, 24, -256, 36], [-505, -134, -395, -104], // west, the cafe's lot
  [254, -134, 266, 160], [266, -66, 520, -54], [266, 54, 520, 66], [266, -54, 394, 54], [415, 66, 485, 104], [300, -79, 340, -66], [448, -83, 488, -66], [296, 66, 344, 72], // the centre
  [116, 280, 128, 576], [-235, 294, 420, 306], [128, 395, 400, 407], [160, 370, 400, 382], [160, 426, 400, 438], [128, 495, 330, 507], // south of the river
  [186, 88, 212, 100], [200, 50, 212, 88], [212, 50, 254, 62], // from the foot of the bridge's north ramp to the avenue
  [-520, -66, -508, 36], [508, -66, 520, 66], [400, 306, 412, 407], // the ends of the blocks joined, so the traffic goes round (life.js)
  [485, 79, 576, 91], // the hospital's road out of town to the east
  [274, -131, 295, -110], [274, 141, 295, 162], // the tram's turning loops at the ends of the avenue
];
// the bridge's north end turns east and comes down to the ground on a ramp: x0, z0, x1, z1 (the corner over the bridge's end
// and the ramp itself); nothing grows on them
const RAMPN = [116, 88, 186, 100];
const ST_Y = 0.215; // the top of the streets
const onStreet = (x, z, m = 0) => STREETS.some((s) => x > s[0] - m && x < s[2] + m && z > s[1] - m && z < s[3] + m);
// where the forest does not grow: the districts, the park, the roads, the river and the railway
const NOFOREST = [[-525, -140, -236, 140], [-512, -140, -388, -95], [200, -140, 524, 168], [-242, 286, 72, 492], [72, 316, 112, 480], [126, 286, 408, 482], [126, 482, 336, 545], [108, 212, 136, 576], [-242, 288, 425, 312]];
// the park's lake: centre and radii
const LAKE = [-90, 395, 80, 50];
// the alleys of the park (polylines): from the gate to the lake, round the lake, to the wheel and to the bandstand
const ALLEYS = [[[-20, 312], [-28, 330], [-45, 345]], [...Array(49).keys()].map((k) => [LAKE[0] + cos(k / 48 * TAU) * (LAKE[2] + 11), LAKE[1] + sin(k / 48 * TAU) * (LAKE[3] + 11)]),
  [[-2, 386], [14, 412], [22, 430]], [[-181, 380], [-198, 380]], [[-20, 312], [10, 322], [40, 338], [60, 360]]];
// where people of the district houses go (town.js leads the paths to the nearest of these)
HUBS.push([-460, -60], [-460, 30], [-415, -62], [400, -62], [430, 0], [378, 66], [395, 145], [240, -60], [360, 401], [110, 360], [110, 440], [230, 500], [-258, 70], [-258, 0], [-262, -60], [-262, 30], [-300, -60], [-450, -104], [262, 0], [262, 100], [320, -60], [320, 66], [250, 401], [130, 401], [234, 404], [-20, 306]);

// lamps: a pole of the estate's kind (0 cold, 1 sodium), an LED pole (2), a park globe (3); each records its lamp index
const DPOLES = [];
const dpole = (x, z, a, k) => {
  const head = k === 2 ? [1.5, 8.85] : k === 3 ? [0, 4.2] : [1.6, 8.72], [dx, dz] = rotY(head[0], 0, a);
  DPOLES.push([x, z, a, k, LAMPS.length]);
  LAMPS.push({ x: x + dx, y: head[1], z: z + dz, r: k === 3 ? 13 : 38, c: k === 1 ? [250, 128, 40] : k === 3 ? [16, 13, 9] : [200, 224, 262], t: k === 3 ? -1 : 99 });
};
for (let z = -118; z <= 122; z += 30) dpole(-243, z, -PI / 2 + PI, 1);
for (const x of [-290, -330, -370]) { dpole(x, -53, PI / 2, 1); dpole(x, 37, PI / 2, 1); }
for (const x of [-480, -420]) dpole(x, -103, -PI / 2, 0);
for (let z = -118; z <= 150; z += 30) dpole(267.5, z, PI, 2);
for (const x of [300, 345, 390, 435, 480]) { dpole(x, -53, PI / 2, 2); dpole(x, 67, -PI / 2, 2); }
for (const [x, z] of [[279, -45], [371, -45], [279, 45], [371, 45]]) dpole(x, z, 0, 3);
for (let z = 300; z <= 560; z += 40) dpole(129.5, z, PI, 2);
for (let x = -215; x <= 400; x += 52) if (abs(x - 122) > 12) dpole(x, 307.5, -PI / 2, 2);
for (const [x, z] of [[170, 383], [230, 383], [290, 383], [350, 383], [170, 425], [230, 425], [290, 425], [350, 425]]) dpole(x, z, PI / 2, 2);
for (const x of [160, 230, 300]) dpole(x, 508.5, PI / 2, 2);
for (const x of [-440, -490]) { dpole(x, -53, PI / 2, 1); dpole(x, 37, PI / 2, 1); }
for (const x of [140, 182]) dpole(x, 101.5, PI / 2, 2);
for (const [x, z, a] of [[213.5, 70, PI], [225, 63.5, PI / 2], [245, 63.5, PI / 2]]) dpole(x, z, a, 2);
{ // park globes along the alleys, every 24 m or so
  for (const A of ALLEYS) { let acc = 12; for (let k = 0; k < A.length - 1; k++) { const [a, b] = [A[k], A[k + 1]], L = hypot(b[0] - a[0], b[1] - a[1]); for (let s = acc; s < L; s += 24) { const t = s / L, nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L; dpole(mix(a[0], b[0], t) + nx * 2.2, mix(a[1], b[1], t) + nz * 2.2, 0, 3); acc = s + 24 - L; } if (acc >= L) acc -= L; } }
}
// lights of particular places: the monument (two floodlights at its foot), the doors, the club's coloured light
const MONU = [330, 0, -PI / 2];
for (const s of [-2.6, 2.6]) LAMPS.push({ x: MONU[0] - 3.2, y: 0.5, z: MONU[1] + s, r: 10, c: [12, 10, 7], t: -1 });
LAMPS.push({ x: 481, y: 4, z: -87, r: 10, c: [11, 9, 6], t: -1 }); // the open bay of the fire station
for (const x of [469, 475]) LAMPS.push({ x, y: 5.2, z: -82.4, r: 10, c: [11, 9, 6], t: -1 }); // and bulbs over its doors
LAMPS.push({ x: 428, y: 3.3, z: 108, r: 11, c: [9, 11, 13], t: -1 }); // the hospital's emergency entrance
LAMPS.push({ x: 450, y: 3.6, z: 109, r: 9, c: [10, 10, 10], t: -1 }); // and its main door
LAMPS.push({ x: 320, y: 3.6, z: -78.3, r: 9, c: [9, 10, 12], t: -1 }); // the police
for (const z of [-9, 9]) LAMPS.push({ x: 385, y: 1, z, r: 16, c: [14, 12, 9], t: -1 }); // floodlights on the front of the administration
const CLUBL = LAMPS.length; LAMPS.push({ x: 320, y: 3.0, z: 70.3, r: 13, c: [10, 4, 9], t: -1 }); // the club: main.js turns its colour
LAMPS.push({ x: -450, y: 3.0, z: -102, r: 10, c: [12, 7, 3], t: -1 }); // the cafe's porch
LAMPS.push({ x: -262, y: 3.0, z: 70, r: 10, c: [11, 8, 4], t: -1 }); // the bakery
for (const [x, z] of [[-320, -15], [-320, 80]]) LAMPS.push({ x, y: 5.6, z, r: 16, c: [14, 7.5, 2.8], t: -1 }); // a bulb on a post in each courtyard

// the forest: how many trees stand in each 24 m square of the culling grid (audio.js listens for the forest by it)
const FORG = new Float32Array(CELLS * CELLS);
// the animals crossing the forest now and then: kind, start x, z, heading, path length, speed
const RUNNERS = [['wolf', -300, -372, PI / 2, 220, 6.5], ['wolf', -303, -368, PI / 2, 220, 6.3], ['wolf', -40, 238, PI / 2, 150, 6.6], ['wolf', -470, 380, 2.4, 110, 7], ['fox', 430, 250, -0.6, 90, 4.5],
  ['fox', -470, -300, 0.4, 80, 4], ['arcticfox', -120, -330, PI / 2, 120, 4.2], ['arcticfox', 260, -420, -PI / 2, 100, 4], ['hare', -258, 470, 0.3, 50, 3.2], ['hare', 90, 500, -2.2, 45, 3],
  ['hare', 150, -260, 1.2, 60, 3.4], ['hare', 520, 120, PI, 55, 3.1], ['wolf', 300, -480, -PI / 2, 130, 6.8]];

function districts(o) {
  const { solid, reg, lod, wins, decals, glare, steam, snd, boxes, rects, grassY, bare } = o;
  const gy = (x, z) => (onStreet(x, z) ? ST_Y : max(grassY(x, z), abs(x) > CORE || abs(z) > CORE ? (z < RAILZ + 6 ? RAILY : 0) : 0));
  const decL = (x, z, a, lx, y, lz, w, h, md, gl, nm) => { const [wx, wz] = loc(x, z, a, lx, lz); decals.push(wx, y, wz, a, w, h, md, gl, nm); };
  const glL = (x, z, a, lx, y, lz, s, r, g, b, k) => { const [wx, wz] = loc(x, z, a, lx, lz); glare.push(wx, y, wz, s, r, g, b, k); };
  // a thing standing on the ground; box: half sizes and height for the camera, and its dark footprint on the ground
  const put = (nm, x, z, a = 0, pal = 0, sd = 0, box, an = 0, sc = 1, y) => {
    solid(nm, x, y ?? gy(x, z), z, a, pal, sd, 1, an, sc);
    if (box) { const sw = abs(sin(a)) > 0.7, hx = sw ? box[1] : box[0], hz = sw ? box[0] : box[1]; boxes.push([x - hx, z - hz, x + hx, z + hz, box[2]]); rects.push([x, z, box[0], box[1], a, 0.8]); }
  };
  const car = (t, x, z, a, pal) => { put('car' + t, x, z, a, pal, rnd()); boxes.push([x - 1.3, z - 1.3, x + 1.3, z + 1.3, 1.5]); rects.push([x, z, 2.2, 0.9, a, 0.8]); };
  const P6 = (nm) => { const r = PROPS6[nm](); reg(nm, r.build ? r : r.m); return r; };
  // a building of props6 with lit windows of a flag (10 ward, 11 office): its windows are added, its box too
  const bld = (r, nm, x, z, a, sz, fl, pal = 0) => {
    put(nm, x, z, a, pal, rnd(), sz);
    if (r.W) for (const [lx, ly, lz, la, w, h] of r.W) { const [wx, wz] = loc(x, z, a, lx, lz); wins.push(wx, gy(x, z) + ly, wz, a + la, w, h, rnd(), fl * 4); }
  };
  const at = (x, z, a, p) => { const [wx, wz] = loc(x, z, a, p[0], p[2]); return [wx, p[1], wz]; };
  const smoke = (x, y, z, n = 7, s = 0.18) => { for (let k = 0; k < n; k++) steam.push(x, y, z, rr(s * 0.7, s * 1.2), rnd(), rr(0.35, 0.5), 0.9, rr(0.4, 0.8)); };
  for (const k of ['admin', 'flag', 'monument', 'hospital', 'police', 'firestation', 'club', 'cafe', 'fuelroof', 'ferris', 'bandstand', 'fountain', 'parkgate', 'gazebo', 'parklamp', 'ledlamp', 'shed', 'woodpile', 'playset',
    'firetruck', 'policecar', 'wolf', 'fox', 'arcticfox', 'hare', 'bouncer', 'smoker', 'girl', 'talkers', 'trucker', 'skier', 'newyeartree', 'forestSpruce', 'forestBirch', 'farTree']) P6(k);
  const R6 = (nm) => PROPS6[nm]();

  // ---------------------------------------------------------------- the streets, the square, the ramp off the bridge
  {
    const m = new Mesh().mat(M_ASPH);
    for (const [x0, z0, x1, z1] of STREETS) { m.box(x0, 0, z0, x1, ST_Y, z1, 4, 0.7, 1); bare.push([x0 - 0.5, z0 - 0.5, x1 + 0.5, z1 + 0.5]); }
    // white lines down the middle of the long ones
    m.mat(M_CONC);
    for (const [x0, z0, x1, z1] of STREETS) { const w = x1 - x0, d = z1 - z0; if (min(w, d) > 14 || max(w, d) < 60) continue; if (w > d) for (let x = x0 + 2; x < x1 - 4; x += 9) m.box(x, ST_Y, (z0 + z1) / 2 - 0.06, x + 4, ST_Y + 0.005, (z0 + z1) / 2 + 0.06, 4, 1, 1); else for (let z = z0 + 2; z < z1 - 4; z += 9) m.box((x0 + x1) / 2 - 0.06, ST_Y, z, (x0 + x1) / 2 + 0.06, ST_Y + 0.005, z + 4, 4, 1, 1); }
    // the square: paving over the asphalt
    m.box(278, ST_Y, -44, 372, ST_Y + 0.03, 44, 4, 0.8, 1);
    // the ramp down from the bridge to the road south
    m.mat(M_ASPH); m.q4([116.45, 7, 220], [127.55, 7, 220], [127.55, ST_Y, 282], [116.45, ST_Y, 282]);
    m.mat(M_CONC); for (const s of [-1, 1]) { const x = 122 + s * 5.75; m.q4([x, 0, 220], [x, 0, 282], [x, ST_Y + 0.9, 282], [x, 7.9, 220], [0.6, 0.6, 1, 1]); }
    // the corner at the bridge's north end, on a pier, and the ramp east from it down to the street
    m.mat(M_CONC); m.box(116.3, 5.8, 88, 128, 6.95, 100, 32, 0.55, 0.9); m.box(120.2, 0, 92.2, 123.8, 5.8, 95.8, 0, 0.5, 0.8);
    m.box(116.3, 6.95, 88, 116.7, 8, 100, 0, 0.8, 1); m.box(116.3, 6.95, 88, 128, 8, 88.4, 0, 0.8, 1);
    m.mat(M_ASPH); m.box(116.7, 6.95, 88.4, 128, 7, 100, 4 | 16 | 32, 1, 1);
    m.q4([128, 7, 99.55], [128, 7, 88.45], [186, ST_Y, 88.45], [186, ST_Y, 99.55]);
    m.mat(M_CONC); for (const z of [88.2, 99.8]) m.q4([128, 0, z], [186, 0, z], [186, ST_Y + 0.9, z], [128, 7.9, z], [0.6, 0.6, 1, 1]);
    m.q4([128, 0, 88.2], [128, 0, 99.8], [128, 5.8, 99.8], [128, 5.8, 88.2], 0.6);
    reg('streets', m); solid('streets', 0, 0, 0);
    boxes.push([115.8, 220, 116.6, 282, 8], [127.4, 220, 128.2, 282, 8], [128, 87.8, 186, 88.6, 8], [128, 99.4, 186, 100.2, 8], [115.9, 88, 116.7, 100, 8]);
    bare.push([RAMPN[0] - 1, RAMPN[1] - 1, RAMPN[2] + 1, RAMPN[3] + 1]);
  }

  // ---------------------------------------------------------------- the old quarter: sheds, woodpiles, lindens, the bakery
  rseed(110);
  {
    // sheds and woodpiles along the back of each courtyard, a dryer, a carpet bar, a sandbox, a dog
    for (const [cx, cz] of [[-320, -15], [-320, 80]]) {
      for (let k = 0; k < 5; k++) { const x = cx - 38 + k * 3.3, z = cz - 9; put('shed', x, z, PI / 2, 0, rnd(), [1.6, 1.4, 2.8]); if (k % 2) put('woodpile', x, z + 2.6, PI / 2, 0, rnd(), [0.5, 1.3, 1.3]); }
      put('dryer', cx + 10, cz + 4, 0, 0, 0, null, 1); put('carpetbar', cx + 22, cz - 6, 0.2, 0, 0, null, 1); put('sandbox', cx - 6, cz + 6, 0.3); put('snowman', cx + 2, cz - 4, rr(0, TAU), 0, rnd());
      put('bench', cx + 16, cz + 8, PI, 8, cx); put('bench', cx - 18, cz + 8, PI, 8, cx + 1);
      put('dog', cx - 30, cz - 5.5, 1.2, pick([6, 8, 9]), rnd()); snd.push(['dog', cx - 30, 0.5, cz - 5.5]);
      for (const [dx, dz] of [[-26, 10], [28, 8], [5, -10]]) put('tree' + pick([0, 1, 2]), cx + dx, cz + dz, rr(0, TAU), 0, rnd(), [0.3, 0.3, 3], 1, rr(0.85, 1.1));
      for (let k = 0; k < 3; k++) car(pick([5, 5, 1, 0]), cx + 30 - k * 2.9, cz + 12, PI / 2, pick([4, 7, 13, 1, 8]));
      // a bulb on a wooden post in the middle of the courtyard
      solid('wpole', cx, gy(cx, cz), cz + 0.8, PI);
    }
    // lindens along the west street
    for (let z = -124; z <= 124; z += 13) for (const x of [-239, -261]) { if (onStreet(x, z, 1) || boxes.some((h) => x > h[0] - 3 && x < h[2] + 3 && z > h[1] - 3 && z < h[3] + 3)) continue; put('tree1', x + rr(-0.5, 0.5), z + rr(-1, 1), rr(0, TAU), 0, rnd(), [0.3, 0.3, 3], 1, rr(0.75, 0.95)); }
    // the bakery and the kiosk on the street
    { const [x, z, a] = [-266, 70, PI / 2]; solid('pav0', x, gy(x, z), z, a, 0, x);
      decL(x, z, a, -1.5, 1.62 + ST_Y, 3.4, 6.4, 2.3, 1, 1.15, 'breadWin'); decL(x, z, a, 0, 3.28 + ST_Y, 4.53, 4.4, 0.7, 0, 0, 'signBread'); decL(x, z, a, 5.6, 1.75 + ST_Y, 4, 0.8, 0.3, 2, 2.4, 'open');
      boxes.push([x - 4.5, z - 7, x + 4.5, z + 7, 3.7]); rects.push([x, z, 7, 4.5, a, 1]); }
    { const [x, z, a] = [-262, 0, PI / 2]; solid('kiosk', x, gy(x, z), z, a, 8, x); decL(x, z, a, -0.4, 2.55 + ST_Y, 1.53, 1.6, 0.38, 0, 0, 'beer'); decL(x, z, a, -0.5, 1.5 + ST_Y, 1.05, 3, 1.5, 0, 0, 'shutter'); boxes.push([x - 1.6, z - 2.3, x + 1.6, z + 2.3, 2.9]); }
    put('payphone', -258, 12, PI / 2, 0, 0, [0.3, 0.3, 2.2]);
    // somebody walking home along the street, a man with his dog
    solid('walkerW', -246.5, ST_Y, -110, 0, 9, 0.3, 200 + 1.0 / 10, 7); solid('walker', -253.5, ST_Y, 110, PI, 4, 0.6, 180 + 1.1 / 10, 7);
  }

  // ---------------------------------------------------------------- the cafe on the highway for the truck drivers
  rseed(111);
  {
    const [x, z, a] = [-450, -96, PI], C = R6('cafe');
    put('cafe', x, z, a, 13, 0.4, [10.5, 5.6, 6.8]);
    for (const [lx, ly, lz, la, w, h] of C.W) { const [wx, wz] = loc(x, z, a, lx, lz); decals.push(wx, ly, wz, a + la, w, h, 1, 1.1, 'cafeWin'); }
    { const p = at(x, z, a, C.sign); decals.push(p[0], p[1] + 0.1, p[2] - 0.08, a, 6, 1.2, 2, 4, 'signCafe'); }
    { const p = at(x, z, a, C.chimney); for (let k = 0; k < 10; k++) steam.push(p[0], p[1], p[2], rr(0.25, 0.45), rnd(), rr(0.2, 0.32), 4, rr(0.5, 1.1)); }
    snd.push(['radio', x, 1.5, z]);
    const F = R6('fuelroof'); put('fuelroof', -420, -118, 0, 13, 0, [6, 4, 5.6]);
    for (const p of F.lights) { const q = at(-420, -118, 0, p); LAMPSX.push(q); }
    decals.push(-420, 5.3, -113.95, 0, 3.4, 0.56, 2, 2.6, 'signFuel');
    // the lorries: two with the engine running for the heater, one cold
    for (const [tx, tz, ta, run, nm] of [[-484, -127, 0, 1, 'semi'], [-484, -116, 0, 1, 'semi'], [-458, -126.5, PI, 0, 'truck']]) {
      put(nm, tx, tz, ta, pick([1, 2, 5, 6, 7, 10]), rnd(), [nm === 'semi' ? 8.4 : 4.1, 1.3, 3.8]);
      if (run) { const [ex, ez] = loc(tx, tz, ta, 1.4, 1.35); smoke(ex, 3.6, ez, 8, 0.25); if (tz < -120) snd.push(['idle', tx + 6, 1, tz]); const [dx, dz] = loc(tx, tz, ta, 6.6, 0); glare.push(dx, 2.0, dz, 0.4, 0.35, 0.15, 0.5, 0); }
    }
    car(3, -440, -108, PI / 2, 2); car(0, -430, -108, PI / 2 + PI, 6);
    // truck drivers with their tea at the door, one smoking by his lorry
    { const T = R6('trucker'); for (const [px, pz, pa] of [[-452.5, -103.4, 0.4], [-447.6, -103.1, -0.6]]) { put('trucker', px, pz, pa + PI, pick([8, 9, 6]), rnd()); const c = at(px, pz, pa + PI, T.cup); for (let k = 0; k < 3; k++) steam.push(c[0], gy(px, pz) + c[1], c[2], rr(0.03, 0.05), rnd(), rr(0.25, 0.35), 0.35, rr(0.3, 0.6)); } }
    { const S = R6('smoker'), [px, pz, pa] = [-476, -121.6, 2.2]; put('smoker', px, pz, pa, 2, 0.3); const e = at(px, pz, pa, S.ember); glare.push(e[0], gy(px, pz) + e[1], e[2], 0.07, 3.2, 0.8, 0.15, 2); }
    snd.push(['chat', -450, 1.6, -103.3]);
    put('dog', -430, -99, 2.3, 9, 0.5); put('dogLying', -431.5, -100, 0.4, 6, 0.2);
  }

  // ---------------------------------------------------------------- the centre
  rseed(112);
  {
    // the administration with its flag, the square with the monument and the tree, the black cars at the door
    const A = R6('admin'); bld(A, 'admin', 400, 0, -PI / 2, [24.3, 8.3, 17], 11);
    decL(400, 0, -PI / 2, 0, 9.8 + ST_Y, 8.32, 6, 0.62, 0, 0, 'signAdmin');
    { const p = at(400, 0, -PI / 2, A.flag), fa = atan2(-WDZ, WDX); solid('flag', p[0], gy(400, 0) + p[1], p[2], fa, 11, 0.7, 1, 9); snd.push(['flag', p[0], p[1], p[2]]); }
    const [mx, mz, ma] = MONU, M = R6('monument'); put('monument', mx, mz, ma, 0, 0, [2.5, 2.5, 7.8]);
    decL(mx, mz, ma, 0, 2.4 + ST_Y, 1.12, 1.1, 0.55, 0, 0, 'plaque');
    for (const s of [-2.6, 2.6]) glare.push(mx - 3.2, 0.5 + ST_Y, mz + s, 0.5, 3, 2.4, 1.6, 0);
    { const T = R6('newyeartree'), [x, z] = [300, -28], y = gy(x, z); put('newyeartree', x, z, 0.3, 0, 0, [4.3, 4.3, 3]);
      for (let k = 0; k < 120; k++) { const t = k / 120, r = 5.6 * (1 - t) + 0.4, an = t * TAU * 7; glare.push(x + cos(an) * r, y + 1.2 + t * 12, z + sin(an) * r, 0.22, rnd(), 0, 0, 3); }
      glare.push(x, y + T.star[1], z, 0.9, 3, 0.4, 0.2, 0); }
    for (const [x, z] of [[279, -45], [371, -45], [279, 45], [371, 45]]) for (const d of [[-1, 0], [1, 0]]) put('bench', x + d[0] * 6, z * 0.86, d[0] > 0 ? -PI / 2 : PI / 2, 8, x + d[0]);
    for (let k = 0; k < 4; k++) car(pick([3, 0, 8]), 383, 18 + k * 3, PI, 3);
    // a few people on the square
    solid('walker', 290, ST_Y + 0.03, 30, 0.9, 8, 0.2, 60 + 1.1 / 10, 7); solid('walkerW', 360, ST_Y + 0.03, -40, -0.5, 14, 0.7, 55 + 1.0 / 10, 7); solid('girl', 333, ST_Y + 0.03, -6, -PI / 2, 5, 0.4);
    // police: the sign, two cars at the door, one with its lights going
    const PL = R6('police'); bld(PL, 'police', 320, -85, 0, [13.2, 6.2, 7.5], 11);
    { const p = at(320, -85, 0, PL.sign); decals.push(p[0], p[1] + ST_Y, p[2], 0, 3.2, 0.6, 1, 1.6, 'signPolice'); }
    { const PC = R6('policecar'); [[306, -71.5], [334, -71.5]].forEach(([x, z], k) => { put('policecar', x, z, PI / 2, 13, k, [1, 2.4, 1.6]); if (!k) for (const [j, p] of PC.bar.entries()) { const q = at(x, z, PI / 2, p); glare.push(q[0], q[1] + ST_Y, q[2], 0.55, j ? 0.8 : 0.2, 0, 0, 11); } }); }
    put('uaz', 347, -71.5, PI / 2, 10, 0.3, [1.1, 2.3, 2]);
    // the fire station: an engine in the open bay under its light, another on the apron
    const FS = R6('firestation'); bld(FS, 'firestation', 470, -90, 0, [18, 7.1, 6.5], 11);
    decL(470, -90, 0, -13, 5.4 + ST_Y, 6.04, 6, 0.75, 1, 1.4, 'signFire');
    put('firetruck', 481, -86.5, -PI / 2, 0, 0); put('firetruck', 464.8, -74, -PI / 2, 0, 1, [1.3, 4.2, 3.2]);
    // the hospital: the red cross on the roof, the emergency entrance, ambulances
    const H = R6('hospital'); bld(H, 'hospital', 450, 118, PI, [30.1, 7.1, 18], 10);
    { const p = at(450, 118, PI, H.cross); decals.push(p[0], p[1] + ST_Y, p[2], PI, 1.9, 1.9, 1, 1.3, 'redCross'); }
    decL(450, 118, PI, 0, 4.4 + ST_Y, 7.04, 6, 0.75, 1, 1.4, 'signHosp'); decL(450, 118, PI, 22, 4.1 + ST_Y, 7.04, 3.6, 0.68, 2, 3, 'signER');
    for (const [x, z, a, fl] of [[428, 104.5, 0, 1], [440, 99, PI, 0]]) { put('ambulance', x, z, a, 0, 0.4, [2.8, 1.2, 2.6]); if (fl) for (const s of [-0.55, 0.55]) glL(x, z, a, 1.55, 2.2 + ST_Y, s, 0.6, s > 0 ? 0.5 : 0, 0, 0, 4); }
    // the night club: its sign, glass blocks lit from the dance floor, coloured lights over the door, the bouncers, a queue,
    // people smoking and talking outside, the music through the walls
    const CL = R6('club'); put('club', 320, 80, PI, 2, 0.6, [12.1, 8.1, 8]);
    for (const [lx, ly, lz, w, h] of CL.strips) { const [wx, wz] = loc(320, 80, PI, lx, lz - 0.02); decals.push(wx, ly + ST_Y, wz, PI, w, h, 5, 1.6, 'glassblock'); }
    { const p = at(320, 80, PI, CL.sign); decals.push(p[0], p[1] + ST_Y, p[2] - 0.08, PI, 6, 1.25, 2, 3.2, 'signClub'); }
    for (let k = 0; k < 5; k++) glL(320, 80, PI, -2 + k, 3.05 + ST_Y, 11.2, 0.35, k / 5, 0, 0, 10);
    for (const s of [-1.3, 1.3]) put('bouncer', 320 + s, 69.4, PI, 3, rnd());
    { const S = R6('smoker'), G = R6('girl');
      for (const [x, z, a, pal] of [[331, 68.6, 2.6, 11], [332.4, 69.5, -2.2, 5]]) { put('smoker', x, z, a, pal, rnd()); const e = at(x, z, a, S.ember); glare.push(e[0], ST_Y + e[1], e[2], 0.07, 3.2, 0.8, 0.15, 2); }
      put('talkers', 307, 68.8, 1.4, 14, 0.2); put('girl', 331.6, 67.6, 0.4, 15, 0.5);
      for (let k = 0; k < 4; k++) { const x = 315.5 - k * 1.1; put(k % 2 ? 'girl' : 'walker', x, 68.2 - k * 0.15, PI + rr(-0.3, 0.3), pick([5, 11, 14, 4]), rnd()); }
      const p = at(331.6, 67.6, 0.4, G.phone); glare.push(p[0], ST_Y + p[1], p[2], 0.08, 0.5, 0.7, 1.2, 0); }
    snd.push(['club', 320, 3, 78], ['chat', 331, 1.6, 69], ['chat', 307, 1.6, 68.8]);
    // shops along the avenue: a grocery, a chemist's, flowers on the corner of the square
    for (const [x, z, a, k] of [[275, 115, -PI / 2, 0], [275, -100, -PI / 2, 1]]) {
      solid('pav' + k, x, gy(x, z), z, a, 0, x); const w = k ? 10 : 14, d = k ? 7 : 9;
      decL(x, z, a, -1.5, 1.62 + ST_Y, d / 2 - 1.1, w - 4, 2.3, 1, 1.15, k ? 'pharmWin' : 'shopWin'); decL(x, z, a, 0, 3.28 + ST_Y, d / 2 + 0.03, 4.4, 0.55, k ? 2 : 1, k ? 3 : 2.2, k ? 'signPharm' : 'signShop');
      boxes.push([x - d / 2, z - w / 2, x + d / 2, z + w / 2, 3.7]); rects.push([x, z, w / 2, d / 2, a, 1]);
    }
    { const [x, z, a] = [270, 48, -PI / 2]; solid('kiosk', x, gy(x, z), z, a, 7, x); decL(x, z, a, -0.4, 2.55 + ST_Y, 1.53, 1.6, 0.38, 2, 2.6, 'flowers'); decL(x, z, a, -0.5, 1.5 + ST_Y, 1.05, 3, 1.5, 1, 1.1, 'flowerWin'); boxes.push([x - 1.6, z - 2.3, x + 1.6, z + 2.3, 2.9]); }
    // cars along the avenue and the streets
    for (let k = 0; k < 9; k++) if (rnd() < 0.75) car(pick([0, 1, 2, 3, 6, 8]), 251.4, -110 + k * 26 + rr(-3, 3), PI / 2 + (rnd() < 0.5 ? PI : 0), pick([0, 1, 2, 3, 5, 6, 7, 11]));
    for (let k = 0; k < 8; k++) if (rnd() < 0.7 && abs(290 + k * 26 - 320) > 22) car(pick([0, 1, 2, 3, 4, 6]), 290 + k * 26, 68.6 + 0.0 * k, 0, pick([0, 1, 2, 3, 5, 6, 7, 13]));
  }

  // ---------------------------------------------------------------- south of the river: the park round the lake
  rseed(113);
  {
    const [lx, lz, ra, rb] = LAKE, y0 = gy(lx, lz);
    { // the lake: ice over the lawn, a ring of reeds left to the snow
      const m = new Mesh().mat(M_LENS), c = m.v(lx, y0 + 0.03, lz), N = 48, rim = [];
      for (let k = 0; k <= N; k++) { const an = k / N * TAU, w = 1 + 0.06 * sin(an * 3 + 1) + 0.04 * sin(an * 7); rim.push(m.v(lx + cos(an) * ra * w, y0 + 0.03, lz + sin(an) * rb * w)); }
      for (let k = 0; k < N; k++) m.tri(c, rim[k + 1], rim[k]);
      reg('lake', m); solid('lake', 0, 0, 0); bare.push([lx - ra * 1.1, lz - rb * 1.1, lx + ra * 1.1, lz + rb * 1.1]);
    }
    { // the alleys, cleared asphalt 3 m wide
      const m = new Mesh().mat(M_ASPH);
      for (const A of ALLEYS) for (let k = 0; k < A.length - 1; k++) {
        const [a, b] = [A[k], A[k + 1]], L = hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / L * 1.5, nz = (b[0] - a[0]) / L * 1.5, ya = gy(a[0], a[1]) + 0.012, yb = gy(b[0], b[1]) + 0.012;
        m.q4([a[0] - nx, ya, a[1] - nz], [a[0] + nx, ya, a[1] + nz], [b[0] + nx, yb, b[1] + nz], [b[0] - nx, yb, b[1] - nz], 0.9);
        PATHS.push([a, b]);
      }
      reg('alleys', m); solid('alleys', 0, 0, 0);
    }
    const G = R6('parkgate'); put('parkgate', -20, 312, PI, 0, 0); boxes.push([-26, 311.4, -24, 312.6, 4.6], [-16, 311.4, -14, 312.6, 4.6]);
    { const p = at(-20, 312, PI, G.sign); decals.push(p[0], gy(-20, 312) + p[1], p[2] - 0.05, PI, 4, 0.8, 0, 0, 'parkSign'); }
    put('fountain', -30, 342, 0, 0, 0, [5, 5, 3]);
    put('ferris', 26, 440, 0.4, 0, 0, [3, 11.7, 24]); snd.push(['creak', 26, 4, 440]);
    put('bandstand', -205, 380, PI / 2, 0, 0, [5, 4, 5.5]);
    put('gazebo', -186, 428, 0.3, 0, 0, [2.6, 2.6, 4.2]);
    // benches along the alleys, every other lamp
    DPOLES.forEach(([x, z, a, k], i) => { if (k === 3 && i % 2 && !onStreet(x, z)) { const dx = x - lx, dz = z - lz, an = atan2(dx, dz); put('bench', x + sin(an) * 1.4, z + cos(an) * 1.4, an + PI, 8, x); } });
    // on the ice: a fisherman's tent with its lantern, a cleared patch for skating with a snowman by it
    solid('tent', lx + 30, y0 + 0.03, lz + 10, 0.4, 14, 0.3); glare.push(lx + 30.3, y0 + 0.83, lz + 11.1, 0.3, 3, 1.8, 0.7, 0);
    put('snowman', lx - 32, lz - 30, 1.1, 0, 0.6); put('skier', -184.5, 425.6, 0.3 + PI, 0, 0);
    // trees of the park: the estate's kinds near the alleys, more of the cheap ones further in
    for (let k = 0; k < 90; k++) {
      const x = rr(-235, 68), z = rr(316, 488), e = hypot((x - lx) / (ra + 16), (z - lz) / (rb + 16));
      if (e < 1 || onStreet(x, z, 3) || boxes.some((h) => x > h[0] - 4 && x < h[2] + 4 && z > h[1] - 4 && z < h[3] + 4) || ALLEYS.some((A) => A.some((p) => hypot(p[0] - x, p[1] - z) < 5))) continue;
      if (k < 34) put('tree' + pick([0, 1, 2, 2]), x, z, rr(0, TAU), k % 3 ? 0 : 1, rnd(), [0.3, 0.3, 3], 1, rr(0.85, 1.15));
      else put(rnd() < 0.5 ? 'forestBirch' : 'forestSpruce', x, z, rr(0, TAU), 1, rnd(), [0.3, 0.3, 3], 1, rr(0.8, 1.2));
    }
    for (const [x, z] of [[-60, 330], [10, 380], [-140, 320]]) { solid('crow', x, gy(x, z) + 4.3, z, rr(0, TAU), 0, x); }
    snd.push(['crow', -60, 6, 330]);
  }

  // ---------------------------------------------------------------- the new towers: shops downstairs, a courtyard with
  // a playground, the cars of people with money
  rseed(114);
  {
    BLD.forEach((b, bi) => { if (b.t !== 4 && b.t !== 6) return;
      const side = 0, sh = [[5, 'shopWin', 'signMarket'], [6.5, 'pharmWin', 'signCoffee'], [5, 'shopWin', 'signFlowers'], [6.5, 'pharmWin', 'signMarket']][bi % 4];
      // the glass towers have their shops behind their own glass: only the sign over it, under the first floor
      const u = b.L - 7.6, w = 7.4, q = toW(b, side, u, b.t === 6 ? b.T.base - 0.55 : 4.6, 0.07);
      if (b.t === 4) { const p = toW(b, side, u, 2.5, 0.06); decals.push(p[0], p[1], p[2], p[3], w, 2.4, 1, 1.1, sh[1]); }
      decals.push(q[0], q[1], q[2], q[3], 4.2, 0.8, 2, 2.8, sh[2]);
    });
    put('playset', 234, 404, 0.2, 0, 0, [2.6, 3, 3.8]); put('sandbox', 222, 412, 0.1); put('swing', 248, 410, 0.2, 5);
    for (const [x, z, a] of [[214, 400, PI / 2], [256, 398, -PI / 2], [234, 416, PI]]) put('bench', x, z, a, 8, x);
    // the cars: crossovers, a sports car, an electric one glowing blue under its sill
    for (const zz of [376, 432]) for (let k = 0; k < 28; k++) { if (rnd() < 0.2) continue; const x = 164 + k * 8.2, t = pick([6, 6, 6, 8, 8, 3, 7, 0]); car(t, x, zz, zz < 400 ? PI / 2 : -PI / 2, pick([0, 1, 2, 3, 5, 10, 11, 13, 14])); if (t === 8 && rnd() < 0.5) glare.push(x, ST_Y + 0.15, zz, 0.6, 0.1, 0.4, 1.4, 0); }
    solid('walkerW', 160, ST_Y, 401, PI / 2, 15, 0.5, 150 + 1.0 / 10, 7); solid('dogSmall', 160.6, ST_Y, 401, PI / 2, 6, 0.5, 150 + 1.0 / 10, 7);
  }

  // ---------------------------------------------------------------- the windows of the district houses: more of them lit
  // in the evening than in the estate (flag 12: a lit room as it is), a few with a radio or a television heard
  rseed(116);
  for (let k = 0; k < o.winB.length; k++) {
    const bi = o.winB[k] >> 2, ty = wins[k * 8 + 7]; if (bi < 13 || ty > 1) continue;
    const r = rnd(), old = BLD[bi].t === 3;
    if (r < (old ? 0.24 : 0.15)) wins[k * 8 + 7] = 12 * 4 + ty;
    else if (ty === 0 && r < (old ? 0.262 : 0.158)) { const f = pick([1, 2, 3, 4, 5]); wins[k * 8 + 7] = f * 4; if (f < 4 && old && rnd() < 0.5) snd.push([['radio', 'cook', 'tv'][f - 1], wins[k * 8], wins[k * 8 + 1], wins[k * 8 + 2]]); }
  }

  // ---------------------------------------------------------------- people: walking the streets and the alleys, by the doors,
  // on the square and the benches, skating on the lake; solid() in world.js makes those standing about sway, look round and
  // breathe out into the frost
  rseed(117);
  {
    // somebody walking to and fro between two points (anim 7: tex scale = path length + speed / 10)
    const walk = (nm, x0, z0, x1, z1, v, pal, y) => { const L = hypot(x1 - x0, z1 - z0); solid(nm, x0, y ?? gy(x0, z0), z0, atan2(x1 - x0, z1 - z0), pal, rnd(), floor(L) + v / 10, 7); };
    const coat = () => pick([0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14]);
    // along the streets, near one edge or the other
    for (const [x0, z0, x1, z1] of STREETS) {
      const w = x1 - x0, d = z1 - z0, L = max(w, d), along = w > d;
      if (L < 45 || min(w, d) > 20) continue;
      for (let k = 0, n = 1 + floor(L / 40); k < n; k++) {
        const e = rnd() < 0.5 ? 0.9 : min(w, d) - 0.9, a = rr(4, L - 30), b = min(L - 4, a + rr(25, 80)), nm = rnd() < 0.5 ? 'walker' : 'walkerW', v = rr(0.9, 1.35), pal = coat();
        const P = (t, o = 0) => (along ? [x0 + t, z0 + e + o] : [x0 + e + o, z0 + t]), [ax, az] = P(a), [bx, bz] = P(b);
        if (rnd() < 0.5) walk(nm, ax, az, bx, bz, v, pal); else walk(nm, bx, bz, ax, az, v, pal);
        if (nm === 'walker' && rnd() < 0.2) { const [cx, cz] = P(a, e < 1 ? 0.6 : -0.6), [dx, dz] = P(b, e < 1 ? 0.6 : -0.6); walk('dogSmall', cx, cz, dx, dz, v, pick([6, 8, 9])); }
      }
    }
    // in the park: along the straight alleys and round the lake; skaters on the ice
    for (const A of [ALLEYS[0], ALLEYS[4], ALLEYS[2]]) for (let k = 0; k < A.length - 1; k++) if (rnd() < 0.7) walk(pick(['walker', 'walkerW']), A[k][0], A[k][1], A[k + 1][0], A[k + 1][1], rr(0.8, 1.1), coat());
    for (const k of [2, 14, 27, 38]) { const R = ALLEYS[1]; walk(pick(['walker', 'walkerW']), R[k][0], R[k][1], R[k + 3][0], R[k + 3][1], rr(0.8, 1.1), coat()); }
    { const [lx, lz] = LAKE, y = gy(lx, lz) + 0.03; for (const [x0, z0, x1, z1, v] of [[-125, 372, -95, 380, 1.6], [-120, 360, -128, 384, 1.3], [-100, 400, -70, 392, 1.8]]) walk(rnd() < 0.5 ? 'walkerW' : 'walker', x0, z0, x1, z1, v, coat(), y); }
    // by the doors of the district houses: somebody out for a smoke, two neighbours talking, a woman with her phone
    for (const [x, z, a, bi] of DOORS) {
      if (bi < 13) continue; const r = rnd(), s = rnd() < 0.5 ? -1 : 1;
      if (r < 0.22) { const [px, pz] = loc(x, z, a, s * 2.3, 1.1), nm = pick(['smoker', 'standing', 'standing', 'girl']); put(nm, px, pz, a + rr(-0.8, 0.8), coat());
        if (nm === 'smoker') { const S = R6('smoker'), e = at(px, pz, a, S.ember); glare.push(e[0], gy(px, pz) + e[1], e[2], 0.07, 3.2, 0.8, 0.15, 2); } }
      else if (r < 0.32) { const [px, pz] = loc(x, z, a, s * 2.6, 2.2); put('talkers', px, pz, a + PI / 2 + rr(-0.4, 0.4), coat()); snd.push(['chat', px, 1.6, pz]); }
    }
    // grandmothers on the benches of the old courtyards, men by the kiosk with their beer
    for (const [cx, cz] of [[-320, -15], [-320, 80]]) for (const [dx, k] of [[16, 0], [-18, 1]]) if (rnd() < 0.8) { const [px, pz] = loc(cx + dx, cz + 8, PI, (k ? -1 : 1) * 0.4, 0); put('seated', px, pz, PI, pick([2, 6, 9, 14]), rnd()); if (!k) snd.push(['chat', px, 1.2, pz]); }
    put('standing', -258.6, 1.8, PI / 2 + 0.5, 8); put('standing', -258.4, -1.6, PI / 2 - 0.4, 2); snd.push(['chat', -258.5, 1.6, 0]);
    // the square: people round the tree and the monument, a family, two talking by the benches
    for (const [x, z, a, nm] of [[305, -20, -2.2, 'girl'], [308, -33, 2.6, 'talkers'], [295, -17, 0.4, 'standing'], [296, -16, 0.9, 'walkerW'], [338, 8, -2, 'talkers'], [340, -12, 1.3, 'standing'], [285, 35, 3.6, 'talkers'], [360, 30, 2, 'girl'], [322, 4, -1.4, 'standing'], [323, 5.2, -2.1, 'walkerW'], [355, -30, 0.7, 'talkers'], [312, 22, 2.2, 'smoker'], [348, 16, -0.6, 'girl'], [290, -38, 1.9, 'standing'], [291, -39.4, 0.2, 'walker']]) {
      put(nm, x, z, a, coat()); if (nm === 'talkers') snd.push(['chat', x, 1.6, z]);
    }
    walk('walker', 282, -40, 282, 40, 1.1, coat()); walk('walkerW', 368, 38, 300, 38, 1.0, coat()); walk('walkerW', 300, -40, 360, -2, 1.05, coat()); walk('walker', 365, -36, 310, 30, 1.2, coat()); walk('walker', 330, -40, 330, -14, 0.95, coat());
    // the police, the firemen at their open bay, somebody smoking at the hospital door, a queue at the cafe door
    put('standing', 316, -76.6, 0.3, 10); put('standing', 324.5, -76.4, -0.4, 10);
    put('standing', 485, -82, -2.2, 15); put('standing', 483.6, -80.7, 0.9, 15); snd.push(['chat', 484.5, 1.6, -81.5]);
    { const S = R6('smoker'), [px, pz, pa] = [458, 107.5, 2.8]; put('smoker', px, pz, pa, 13); const e = at(px, pz, pa, S.ember); glare.push(e[0], gy(px, pz) + e[1], e[2], 0.07, 3.2, 0.8, 0.15, 2); }
    // at the shops under the towers
    BLD.forEach((b) => { if (b.t !== 4 && b.t !== 6) return; const p = toW(b, 0, b.L - 7.6 + rr(-2, 2), 0, rr(1.6, 2.6)); put(pick(['girl', 'standing', 'walkerW']), p[0], p[2], p[3] + rr(-1.2, 1.2), coat()); if (rnd() < 0.6) { const q = toW(b, 0, b.L - 12, 0, 3); put('talkers', q[0], q[2], p[3] + PI / 2, coat()); snd.push(['chat', q[0], 1.6, q[2]]); } });
  }

  // ---------------------------------------------------------------- the lamps placed above
  for (const [x, z, a, k, i] of DPOLES) solid(['lamp', 'lamp', 'ledlamp', 'parklamp'][k], x, gy(x, z), z, a, 0, i);
  for (const q of LAMPSX) glare.push(q[0], q[1], q[2], 0.5, 3, 3.2, 3.4, 0);

  // ---------------------------------------------------------------- the forest round the town
  rseed(115);
  {
    const no = (x, z) => NOFOREST.some((r) => x > r[0] && x < r[2] && z > r[1] && z < r[3]) || (abs(x) < CORE + 8 && abs(z) < CORE + 8) || (z > RAILZ - 18 && z < -128) || (z > 160 && z < 192) || onStreet(x, z, 6);
    const S = 7.5;
    for (let gz = OZ + S / 2; gz < -OZ; gz += S) for (let gx = OX + S / 2; gx < -OX; gx += S) {
      const x = gx + rr(-3, 3), z = gz + rr(-3, 3); if (no(x, z)) continue;
      const edge = sstep(330, 560, max(abs(x), abs(z))), d = fbm(x * 0.009, 3, z * 0.009, 3) + edge * 0.35;
      if (d < 0.5 || rnd() > 0.55 + edge * 0.4) continue;
      const y = z < RAILZ + 6 ? RAILY : gy(x, z), sc = rr(0.75, 1.35), a = rr(0, TAU), birch = rnd() < 0.22 * (1 - edge);
      if (birch) solid('forestBirch', x, y - 0.05, z, a, 1, rnd(), 1, 1, sc);
      else { lod(1); solid('forestSpruce', x, y - 0.05, z, a, 0, rnd(), 1, 1, sc); lod(2); solid('farTree', x, y - 0.05, z, a, 0, rnd(), 1, 1, sc); lod(0); }
      FORG[cellOf(x, z)]++;
    }
    // the animals: a runner swings its legs below its hip (the seed carries the hip in cm and the phase)
    for (const [nm, x, z, a, L, v] of RUNNERS) {
      const hip = nm === 'hare' ? 0 : R6(nm).hip, y = z < RAILZ + 6 ? RAILY : gy(x, z);
      solid(nm, x, y, z, a, nm === 'wolf' ? pick([1, 0]) : nm === 'fox' ? 15 : 0, round(hip * 100) + rnd(), L + v / 10, nm === 'hare' ? 11 : 10);
    }
  }
}
// lamps under the fuel canopy: their glare (filled in by districts())
const LAMPSX = [];
