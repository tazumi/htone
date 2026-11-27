// ============================================================================
// extras: the snow heaped up round the town, and the places added to it later (plain script, after districts.js)
// ============================================================================
// makeWorld() calls extras() after districts() with its lists. What has to be known before the world is made (the lamps
// for the uniform block, the places the forest keeps out of) is set up here at the top level, like districts.js does.

// ---------------------------------------------------------------- the places added: where they are, their lights
// the fires whose light main.js makes flicker (the watchman's barrel is added by life.js)
const FIRES = [];
// the cottage settlement on the forest's edge south of the river: a lane off the park street, five houses each its own:
// kind (PROPS9B), x, z, yaw (0: the front to +z)
const SETTLE = [['chalet', -415, 216, 0], ['cube', -378, 262, PI], ['manor', -345, 213, 0], ['tudor', -308, 260, PI], ['barn', -272, 209, 0]];
STREETS.push([-440, 235, -236, 245], [-246, 245, -236, 294]);
NOFOREST.push([-452, 194, -226, 292]);
const COTT = SETTLE.map(([k]) => PROPS9B[k]());
SETTLE.forEach(([, x, z, a], i) => { for (const [lx, ly, lz] of COTT[i].lamps) { const [wx, wz] = loc(x, z, a, lx, lz); LAMPS.push({ x: wx, y: ly, z: wz, r: 9, c: [9, 6, 3], t: -1 }); } });
// the party in the marquee behind the white house: its warm light and the grill's
const PARTY = (() => { const [, x, z, a] = SETTLE[1], [mx, mz] = loc(x, z, a, 0, -14); return [mx, mz, a + PI]; })();
LAMPS.push({ x: PARTY[0], y: 2.2, z: PARTY[1], r: 11, c: [9, 6, 3.2], t: -1, nb: 1 });
{ const [gx, gz] = loc(PARTY[0], PARTY[1], PARTY[2], 5.2, 3); FIRES.push(LAMPS.length); LAMPS.push({ x: gx, y: 1.1, z: gz, r: 5, c: [7, 3, 0.8], t: -1, nb: 1 }); }
// the forester's lodge in the north-west forest, his snowmobiles
const LODGE = [-505, -425, 0.3];
NOFOREST.push([-528, -446, -478, -398]);
{ const [x, z] = loc(LODGE[0], LODGE[1], LODGE[2], 0, 4.4); LAMPS.push({ x, y: 2.75, z, r: 10, c: [10, 7, 3.5], t: -1, nb: 1 }); }
// the fire in the south-east forest and the nine sitting round it
const CAMP = [480, 255];
NOFOREST.push([462, 237, 498, 273]);
const CAMPL = LAMPS.length; LAMPS.push({ x: CAMP[0], y: 0.8, z: CAMP[1], r: 15, c: [16, 6.5, 1.8], t: -1, nb: 1 }); FIRES.push(CAMPL);
// the lorry broken down on the north shoulder of the highway, nose to the west; its work lamp
const WRECK = [-250, ROADZ - 6.6, PI];
{ const [x, z] = loc(WRECK[0], WRECK[1], WRECK[2], 3.75, 2.6); LAMPS.push({ x, y: 1.85, z, r: 9, c: [10, 11, 13], t: -1, nb: 1 }); }
// the house of culture across the street from the park, facing it; floodlights on its front, globes round its square
const DK = [40, 262, 0];
NOFOREST.push([10, 236, 70, 296]);
for (const s of [-8, 8]) LAMPS.push({ x: DK[0] + s, y: 1.0, z: DK[1] + 21, r: 22, c: [16, 14, 10], t: -1, nb: 1 });
for (const x of [18, 62]) dpole(x, 290, 0, 3);
// the Christmas market on the square, its warm lights, the coffee van
for (const x of [304, 350]) LAMPS.push({ x, y: 2.9, z: 28.6, r: 10, c: [9, 6.5, 3.5], t: -1, nb: 1 });
LAMPS.push({ x: 285.4, y: 2.0, z: 15, r: 7, c: [8, 6, 3.5], t: -1, nb: 1 });
// the travellers by the fire: neck height and mouth, as the people standing about have them (world.js), for each of the nine
for (let k = 0; k < 9; k++) { const s = k >= 5 ? 0.66 : k === 4 ? 0.8 : k === 0 || k === 3 ? 1.04 : 1, hy = 0.4 + 0.98 * s; PPL['fellow' + k] = [hy - 0.11 * s, [0, hy - 0.03 * s, 0.06 * s, 0]]; }

function extras(o) {
  const { solid, reg, boxes, rects, grassY } = o;
  const gy = (x, z) => (onStreet(x, z) ? ST_Y : max(grassY(x, z), abs(x) > CORE || abs(z) > CORE ? (z < RAILZ + 6 ? RAILY : 0) : 0));
  const hit = (x, z, r, from = 0) => { for (let i = from; i < boxes.length; i++) { const h = boxes[i]; if (x > h[0] - r && x < h[2] + r && z > h[1] - r && z < h[3] + r) return true; } return false; };
  const houses = BLD.length;

  const { decals, glare, steam, snd, wins } = o;
  const put = (nm, x, z, a = 0, pal = 0, sd = 0, box, an = 0, sc = 1, y, ts = 1) => {
    solid(nm, x, y ?? gy(x, z), z, a, pal, sd, ts, an, sc);
    if (box) { const sw = abs(sin(a)) > 0.7, hx = sw ? box[1] : box[0], hz = sw ? box[0] : box[1]; boxes.push([x - hx, z - hz, x + hx, z + hz, box[2]]); rects.push([x, z, box[0], box[1], a, 0.8]); }
  };
  const L = (x, z, a, lx, lz) => loc(x, z, a, lx, lz);
  const decL = (x, z, a, lx, y, lz, w, h, md, gl, nm) => { const [wx, wz] = L(x, z, a, lx, lz); decals.push(wx, y, wz, a, w, h, md, gl, nm); };
  const winsOf = (W, x, y0, z, a, lit) => { for (const [lx, ly, lz, la, w, h] of W) { const [wx, wz] = L(x, z, a, lx, lz); wins.push(wx, y0 + ly, wz, a + la, w, h, rnd(), rnd() < lit ? 12 * 4 : 0); } };
  const smoke = (x, y, z, n = 8, s = 0.3) => { for (let k = 0; k < n; k++) steam.push(x, y, z, rr(s * 0.7, s * 1.2), rnd(), rr(0.2, 0.32), 4, rr(0.5, 1.1)); };
  const coat = () => pick([0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14]);
  for (const k of Object.keys(PROPS9B)) { if (k === 'fellow' || SETTLE.some((e) => e[0] === k)) continue; const r = PROPS9B[k](); reg(k, r.build ? r : r.m); }
  for (let k = 0; k < 9; k++) reg('fellow' + k, PROPS9B.fellow(k));
  SETTLE.forEach(([k], i) => reg(k, COTT[i].m));
  rseed(171);

  // ---------------------------------------------------------------- the cottage settlement: five houses behind their railings,
  // a car or two at each door, lights along the drives, spruces with garlands; at the white house a party in the garden
  {
    const m = new Mesh().mat(M_ASPH);
    decL(-238, 247, -PI / 2, 0, 2.2, -0.2, 3.2, 0.8, 0, 0, 'settleSign');
    SETTLE.forEach(([k, x, z, a], i) => {
      const C = COTT[i], y = 0;
      solid(k, x, y, z, a, 0, [0.3, 7.2, 0.7, 0.4, 5.6][i], C.led ? 2 : 1);
      winsOf(C.W, x, y, z, a, 0.6);
      boxes.push([x - 9, z - 9, x + 9, z + 9, 9]); rects.push([x, z, 9, 9, 0, 1]);
      const north = a === 0, f0 = north ? 196 : 246, f1 = north ? 234 : 288, xs = x - 16, xe = x + 16, [dx] = L(x, z, a, C.door[0], C.door[1]), front = north ? f1 : f0, back = north ? f0 : f1;
      // the railings round the lot, the gate open on the lane
      for (let fx = xs; fx < xe - 0.1; fx += 3) { if (abs(fx + 1.5 - dx) < 3.2) continue; solid('railing', fx, y, front, 0, 0, fx); }
      for (let fz = f0; fz < f1 - 0.1; fz += 3) for (const fx of [xs, xe]) solid('railing', fx, y, fz, -PI / 2, 0, fz + fx);
      for (let fx = xs; fx < xe - 0.1; fx += 3) solid('railing', fx, y, back, 0, 0, fx + 1);
      boxes.push([xs, front - 0.3, dx - 3.2, front + 0.3, 1.6], [dx + 3.2, front - 0.3, xe, front + 0.3, 1.6], [xs - 0.3, f0, xs + 0.3, f1, 1.6], [xe - 0.3, f0, xe + 0.3, f1, 1.6], [xs, back - 0.3, xe, back + 0.3, 1.6]);
      // the drive from the lane to the door, the cars on either side of it, lights along it
      const zd = north ? z + 9 : z - 9;
      m.box(dx - 2.5, 0, min(zd, front), dx + 2.5, 0.03, max(zd, front), 4, 0.8, 1);
      const cars = [[9, 12], [12, 11], [11, 10], [10, 9], [12, 9]][i];
      for (let c = 0; c < 2; c++) {
        // nose to the lane on the deep lots to the north, along the lane on the shallow ones to the south
        const t = cars[c], cx = dx + (c ? -5.4 : 5.4) + rr(-0.3, 0.3), cz = north ? front - 5 : front + 3.3, ca = (north ? -PI / 2 : 0) + rr(-0.08, 0.08) + (rnd() < 0.4 ? PI : 0), hx = north ? 1.4 : 2.6, hz = north ? 2.6 : 1.4;
        solid('car' + t, cx, y, cz, ca, pick([3, 3, 13, 13, 4, 1, 14, 2]), rnd()); boxes.push([cx - hx, cz - hz, cx + hx, cz + hz, 1.7]); rects.push([cx, cz, 2.3, 0.95, ca, 0.8]);
      }
      for (const s of [-1, 1]) for (const t of [0.3, 0.7]) { const zz = mix(front, zd, t); glare.push(dx + s * 2.8, 0.55, zz, 0.3, 2.4, 1.8, 1.0, 0); solid('bollard', dx + s * 2.8, y, zz, 0, 0, s); }
      // two spruces in the garden, one hung with lights
      for (const s of [-1, 1]) {
        const tx = x + s * 12.5, tz = (f0 + f1) / 2 + rr(-4, 4); solid('tree4', tx, y, tz, rr(0, TAU), 1, rnd(), 1, 1, rr(0.7, 0.9)); boxes.push([tx - 0.4, tz - 0.4, tx + 0.4, tz + 0.4, 3]);
        if (s > 0) for (let k = 0; k < 40; k++) { const t = k / 40, r = 2.6 * (1 - t) + 0.2, an = t * TAU * 5; glare.push(tx + cos(an) * r * 0.8, 0.8 + t * 6.5, tz + sin(an) * r * 0.8, 0.16, rnd(), 0, 0, 3); }
      }
      // smoke from a chimney here and there
      if (i === 0 || i === 2 || i === 3) { const [cx, cz] = L(x, z, a, i === 0 ? 4.95 : i === 2 ? 5 : 3.6, i === 0 ? -1.05 : 0); smoke(cx, i === 0 ? 9.7 : i === 2 ? 10.5 : 11.6, cz, 10, 0.35); }
    });
    reg('drives', m); solid('drives', 0, 0, 0);
    // the party: the marquee, its string of lights, the heaters, the grill and its smoke, the guests, the music
    {
      const [x, z, a] = PARTY, P = PROPS9B.marquee(), y = 0;
      solid('marquee', x, y, z, a, 0, 0.3, 5); boxes.push([x - 4.2, z - 2.7, x + 4.2, z - 2.3, 3.6], [x - 4.2, z - 2.7, x - 3.8, z + 2.7, 3.6], [x + 3.8, z - 2.7, x + 4.2, z + 2.7, 3.6]);
      for (let k = 0; k <= 24; k++) { const t = k / 24, [gx, gz] = L(x, z, a, -4 + 8 * t, 2.6); glare.push(gx, 2.35 - 0.25 * 4 * t * (1 - t), gz, 0.16, rnd(), 0, 0, 3); }
      for (let k = 0; k <= 16; k++) { const t = k / 16, [gx, gz] = L(x, z, a, -4 + 8 * t, 0); glare.push(gx, 3.45, gz, 0.14, 2.6, 1.8, 0.9, 0); }
      for (const h of P.heaters) { const [hx, hz] = L(x, z, a, h[0], h[2]); glare.push(hx, h[1], hz, 0.35, 3, 1.1, 0.25, 9); }
      { const [gx, gz] = L(x, z, a, P.grill[0], P.grill[2]); smoke(gx, 1.0, gz, 10, 0.25); for (let k = 0; k < 3; k++) glare.push(gx + rr(-0.1, 0.1), 0.95, gz + rr(-0.1, 0.1), 0.3, 3, 1.2, 0.3, 9); }
      const S = PROPS6.smoker();
      for (const [lx, lz, la, nm] of [[-2.7, 1.2, 2.2, 'girl'], [-1.7, 0.1, -0.9, 'standing'], [0.4, 2.0, PI, 'talkers'], [1.0, 0.7, -2.2, 'smoker'], [2.9, 0.8, -1.9, 'girl'], [1.9, -0.4, 0.9, 'standing'], [0, -1.35, 0, 'standing'], [4.3, 3.6, 2.2, 'trucker'], [-3.0, 3.4, 0.3, 'smoker']]) {
        const [px, pz] = L(x, z, a, lx, lz), inside = abs(lz) < 2.5 && abs(lx) < 4; solid(nm, px, y + (inside ? 0.08 : 0), pz, a + la, coat(), rnd());
        if (nm === 'smoker') { const [ex, ez] = L(px, pz, a + la, S.ember[0], S.ember[2]); glare.push(ex, S.ember[1] + (inside ? 0.08 : 0), ez, 0.07, 3.2, 0.8, 0.15, 2); }
      }
      snd.push(['music', x, 1.5, z], ['chat', x - 1, 1.6, z + 1], ['chat', x + 2, 1.6, z]);
    }
  }

  // ---------------------------------------------------------------- the forester's lodge: smoke from the pipe, a lamp on the
  // porch, two snowmobiles and their tracks out into the forest, the woodpile, the shed, his dog
  {
    const [x, z, a] = LODGE, R = PROPS9B.lodge(), y = gy(x, z);
    put('lodge', x, z, a, 0, 0.3, [5, 4.2, 6]); winsOf(R.W, x, y, z, a, 1);
    { const [px, pz] = L(x, z, a, R.pipe[0], R.pipe[2]); smoke(px, y + R.pipe[1], pz, 12, 0.3); }
    { const [px, pz] = L(x, z, a, R.porch[0], R.porch[2]); glare.push(px, y + R.porch[1], pz, 0.5, 3.2, 1.9, 0.9, 0); }
    for (const [lx, lz, la, pal] of [[3.6, 8, 0.9, 11], [6.2, 7.2, 1.3, 14]]) { const [px, pz] = L(x, z, a, lx, lz); put('snowmobile', px, pz, a + la, pal, rnd(), [1.6, 0.7, 1.3]); }
    { const [px, pz] = L(x, z, a, -7, -0.5); put('woodpile', px, pz, a + PI / 2, 0, 0.4, [0.5, 1.3, 1.3]); }
    { const [px, pz] = L(x, z, a, 7, -4); put('shed', px, pz, a - PI / 2, 0, 0.6, [1.25, 1.5, 2.8]); }
    { const [px, pz] = L(x, z, a, -5, 6); put('kennel', px, pz, a + 0.4, 0, 0.3); put('dog', px + 1.2, pz + 0.6, a + 2.2, 8, 0.6); snd.push(['dog', px, 0.5, pz]); }
    // the tracks: from the snowmobiles off through the trees in long curves
    for (const [lx, lz, h0, len, ph] of [[3.6, 10, 0.5, 160, 0], [6.5, 9.5, 1.4, 120, 2]]) {
      let [px, pz] = L(x, z, a, lx, lz), hd = a + h0;
      for (let s = 0; s < len; s += 1) { hd += 0.025 * sin(s * 0.045 + ph); px += sin(hd); pz += cos(hd); decals.push(px, gy(px, pz) + 0.012, pz, hd, 0.95, 1.05, 7, 0, 'sledTrack'); }
    }
  }

  // ---------------------------------------------------------------- the fire in the forest: logs round it, packs left
  // behind them, the kettle on its tripod; nine travellers sit round it, warming their hands
  {
    const [x, z] = CAMP, y = gy(x, z);
    put('campfire', x, z, 0, 0, 0.4); solid('flames', x, y, z, 0, 0, CAMPL, 1, 1);
    boxes.push([x - 0.7, z - 0.7, x + 0.7, z + 0.7, 1.2]);
    for (let k = 0; k < 6; k++) glare.push(x + rr(-0.2, 0.2), y + rr(0.2, 0.7), z + rr(-0.2, 0.2), rr(0.35, 0.6), 3, 1.1, 0.25, 9);
    for (let k = 0; k < 12; k++) steam.push(x, y + 1.0, z, rr(0.2, 0.4), rnd(), rr(0.25, 0.4), 5, rr(0.4, 1.0));
    snd.push(['fire', x, 1, z], ['chat', x, 1.2, z]);
    // who sits where: [log angle, offset along it, kind]
    const SEATS = [[0.2, -0.4, 0], [0.2, 0.55, 5], [1.45, -0.3, 4], [1.45, 0.5, 6], [2.6, -0.45, 2], [2.6, 0.5, 7], [3.9, 0, 3], [5.1, -0.35, 1], [5.1, 0.45, 8]];
    for (const [la, off, k] of SEATS) {
      const r = 2.38, px = x + cos(la) * r - sin(la) * off, pz = z + sin(la) * r + cos(la) * off, yaw = atan2(x - px, z - pz);
      solid('fellow' + k, px, y, pz, yaw, [1, 2, 3, 7, 9, 7, 8, 6, 9][k], 0.13 * k + 0.05);
      if (k === 6) { const [ex, ez] = L(px, pz, yaw, 0.07, 0.15); glare.push(ex, y + 0.4 + 0.98 * 0.66 - 0.05, ez, 0.06, 3.2, 0.9, 0.2, 2); }
      boxes.push([px - 0.3, pz - 0.3, px + 0.3, pz + 0.3, 1.4]);
    }
  }

  // ---------------------------------------------------------------- the lorry broken down by the highway: the cab tipped
  // forward, a man bent over the engine under a work lamp, the hazard lights blinking, the triangle set out behind
  {
    const [x, z, a] = WRECK, y = gy(x, z);
    put('brokenTruck', x, z, a, pick([1, 6, 10]), 0.3, [4.2, 1.3, 4.3]);
    for (const [lx, ly, lz] of [[-3.99, 1.25, 1.1], [-3.99, 1.25, -1.1], [3.0, 0.75, 1.15], [3.0, 0.75, -1.15]]) { const [gx, gz] = L(x, z, a, lx, lz); glare.push(gx, y + ly, gz, 0.4, 0, 0, 0, 14); }
    { const [px, pz] = L(x, z, a, 2.75, 1.8); solid('mechanic', px, y, pz, a + PI / 2, 9, 0.4); boxes.push([px - 0.4, pz - 0.4, px + 0.4, pz + 0.4, 1.8]); }
    { const [px, pz] = L(x, z, a, 3.75, 2.6); solid('workLamp', px, y, pz, a + PI / 2 + 0.5, 0, 0.2, 2); glare.push(px, y + 1.62, pz, 0.6, 3, 3.2, 3.6, 0); }
    { const [px, pz] = L(x, z, a, -22, 0.8); solid('warnTriangle', px, gy(px, pz), pz, 0, 0, 0.1); }
  }

  // ---------------------------------------------------------------- the house of culture: its square, posters, the
  // floodlights, a column of posters, benches, people going in to the concert
  {
    const [x, z, a] = DK, R = PROPS9B.culture(), y = gy(x, z);
    put('culture', x, z, a, 13, 0.4, [20.5, 11.5, 15]); boxes.push([x - 12.5, z + 11, x + 12.5, z + 16, 1.0]);
    for (const [lx, ly, lz, la, w, h] of R.W) { const [wx, wz] = L(x, z, a, lx, lz); wins.push(wx, y + ly, wz, a + la, w, h, rnd(), rnd() < 0.5 ? 11 * 4 : ly < 5 && abs(lx) < 5 ? 12 * 4 : 0); }
    decL(x, z, a, R.sign[0], y + R.sign[1], R.sign[2] + 0.02, 13, 1.2, 0, 0, 'dkSign');
    { const m = new Mesh().mat(M_CONC); m.box(x - 25, 0, z + 18, x + 25, 0.04, z + 32, 4, 0.8, 1); reg('dkSquare', m); solid('dkSquare', 0, y, 0); }
    R.posters.forEach(([lx, , lz], k) => { const [px, pz] = L(x, z, a, lx, lz); put('posterBoard', px, pz, a, 0, 0.3, [0.85, 0.2, 2.8]); decals.push(px, y + 1.65, pz + 0.06, a, 1.3, 1.85, 0, 0, 'afisha' + k); });
    { const px = x + 20, pz = z + 28; put('posterColumn', px, pz, 0, 6, 0.4, [0.65, 0.65, 3.5]); for (let k = 0; k < 4; k++) { const an = k * PI / 2 + 0.4; decals.push(px + sin(an) * 0.57, y + 1.6, pz + cos(an) * 0.57, an, 0.78, 1.1, 0, 0, 'afisha' + k); } }
    for (const s of [-1, 1]) { put('bench', x + s * 20, z + 24, PI, 8, s); glare.push(x + s * 8, y + 1.0, z + 21, 0.6, 3, 2.6, 1.8, 0); }
    for (const [lx, lz, la, nm] of [[-12, 19.5, PI + 0.3, 'talkers'], [13.5, 18.6, PI, 'girl'], [14.4, 19.2, -2.5, 'standing'], [-3, 25, 0.4, 'standing'], [20.5, 27.2, -0.5, 'walkerW']]) put(nm, x + lx, z + lz, la, coat());
    for (const [x0, z0, x1, z1] of [[x - 2, z + 31, x - 1.5, z + 17], [x + 3, z + 32, x + 2, z + 17.2], [x + 18, z + 31, x + 4, z + 17.5]]) { const Ln = hypot(x1 - x0, z1 - z0); solid(rnd() < 0.5 ? 'walker' : 'walkerW', x0, y, z0, atan2(x1 - x0, z1 - z0), coat(), rnd(), floor(Ln) + 1.0 / 10, 7); }
    snd.push(['chat', x - 12, 1.6, z + 19]);
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) put('tree1', x + s * (28 + k * 0.5), z - 8 + k * 9, rr(0, TAU), 0, rnd(), [0.3, 0.3, 3], 1, rr(0.8, 1));
  }

  // ---------------------------------------------------------------- the school's ground: goals in the snow, bars, a bench
  {
    for (const [gx, gz, ga] of [[-123, -73, 0], [-123, -37, PI]]) put('goal', gx, gz, ga, 0, 0.2, [2.6, 0.8, 2.1]);
    put('bar', -110, -48, PI / 2); put('bench', -112, -60, -PI / 2, 8, 1); put('snowman', -128, -55, 1.2, 0, 0.7);
  }

  // ---------------------------------------------------------------- the square: the Christmas market along its south side,
  // arches of light, deer of light by the tree, the coffee van, the map of the town, a column of posters
  {
    const zs = 30.5;
    for (const sx of [292, 304, 316, 344, 356]) put('stall', sx, zs, PI, 0, rnd(), [1.6, 1.1, 3.2], 0, 1, undefined, 5);
    { let px = 286; const pz = zs - 1.1; for (const sx of [298, 310, 322, 338, 350, 362]) { for (let k = 1; k <= 12; k++) { const t = k / 12; glare.push(mix(px, sx, t), 3.15 - 0.3 * 4 * t * (1 - t) + ST_Y, pz, 0.15, rnd(), 0, 0, 3); } px = sx; } }
    put('lightArch', 330, 36, 0, 0, 0, null, 0, 1, undefined, 5); decals.push(330, ST_Y + 4.55, 36.02, 0, 3.4, 0.64, 2, 2.4, 'marketSign');
    for (let k = 0; k < 5; k++) put('lightArch', 360, -38 + k * 6, 0, 0, 0, null, 0, 1, undefined, 5);
    for (const [dx, dz, da] of [[291, -19, 0.8], [309, -37, 2.4], [289, -38, -0.6]]) put('deer', dx, dz, da, 0, 0, [0.6, 0.6, 2], 0, 1, undefined, 2);
    {
      put('foodTruck', 282.5, 15, PI / 2, 14, 0.3, [2.6, 1.1, 2.6], 0, 1, undefined, 5); decL(282.5, 15, PI / 2, -0.5, 2.45 + ST_Y, 1.01, 2.2, 0.55, 1, 1.2, 'coffeeVan');
      const [cx, cz] = L(282.5, 15, PI / 2, -0.5, 1.3); for (let k = 0; k < 5; k++) steam.push(cx + rr(-0.6, 0.6), 1.25 + ST_Y, cz, rr(0.03, 0.05), rnd(), rr(0.25, 0.35), 0.35, rr(0.3, 0.6));
      for (const [lx, lz, la] of [[-0.8, 2.6, PI], [0.3, 3.2, PI + 0.4]]) { const [px, pz] = L(282.5, 15, PI / 2, lx, lz); put('standing', px, pz, PI / 2 + la, coat()); }
    }
    put('cityMap', 283, -41, PI / 2, 0, 0, [0.15, 0.75, 2.4]); decL(283, -41, PI / 2, 0, 1.5 + ST_Y, 0.08, 1.2, 1.55, 1, 0.9, 'cityMapImg');
    put('posterColumn', 366, -42, 0, 6, 0.4, [0.65, 0.65, 3.5]); for (let k = 0; k < 4; k++) { const an = k * PI / 2 + 0.8; decals.push(366 + sin(an) * 0.57, ST_Y + 1.6, -42 + cos(an) * 0.57, an, 0.78, 1.1, 0, 0, 'afisha' + ((k + 2) % 4)); }
    for (const [px, pz, pa, nm] of [[293, 28.4, 0.2, 'girl'], [305, 28.2, -0.3, 'standing'], [315.5, 28.5, 0.1, 'talkers'], [345, 28.3, 0.4, 'standing'], [356.4, 28.4, -0.2, 'girl'], [357.2, 28.0, 0.5, 'walkerW']]) put(nm, px, pz, pa, coat());
    snd.push(['chat', 305, 1.6, 28], ['chat', 350, 1.6, 28], ['radio', 316, 2, 30]);
  }

  // ---------------------------------------------------------------- snow: drifts against the walls, the plough's banks
  // along the streets, heaps where the yards were cleared
  rseed(170);
  {
    const DR = [[5, 1.7, 0.65], [9, 2.2, 0.85], [3.5, 1.4, 0.5], [13, 2.6, 1.0], [7, 2, 1.15]], BM = [[8, 1.8, 0.8], [14, 2.2, 1.0], [6, 1.6, 0.65]];
    DR.forEach(([L, W, H], k) => reg('drift' + k, PROPS9.drift(L, W, H, k)));
    BM.forEach(([L, W, H], k) => reg('berm' + k, PROPS9.berm(L, W, H, k)));
    const along = (x, z, a, L, r) => { const [dx, dz] = rotY(1, 0, a); for (let s = -L / 2; s <= L / 2; s += 1.5) if (hit(x + dx * s, z + dz * s, r, houses) || nearDoor(x + dx * s, z + dz * s, 2.6)) return true; return false; };
    // against the walls: the long walls get a few, the ends one now and then; never in front of a door
    BLD.forEach((b, bi) => {
      if (b.t === 2) return;
      for (let s = 0; s < 4; s++) {
        const len = s < 2 ? b.L : b.D;
        for (let u = rr(1, 6); u < len - 2; ) {
          const k = rnd() * DR.length | 0, L = DR[k][0];
          if (u + L > len - 0.5) break;
          const p = toW(b, s, u + L / 2, 0, 0.02);
          if (rnd() < (s < 2 ? 0.5 : 0.35) && !along(p[0], p[2], p[3], L, 0.3)) solid('drift' + k, p[0], gy(p[0], p[2]) - 0.02, p[2], p[3], SNOWPAL, rnd());
          u += L + rr(2, 9);
        }
      }
    });
    // the plough's banks along the streets of the town, on both sides, broken where something stands or a way crosses
    for (const [x0, z0, x1, z1] of STREETS) {
      const w = x1 - x0, d = z1 - z0, Ls = max(w, d), wide = w > d; if (Ls < 40 || min(w, d) > 14) continue;
      for (const side of [-1, 1]) for (let t = rr(3, 12); t < Ls - 6; ) {
        const k = rnd() * BM.length | 0, L = BM[k][0], W = BM[k][1];
        const c = t + L / 2, e = side < 0 ? -W / 2 - 0.25 : (wide ? d : w) + W / 2 + 0.25, x = wide ? x0 + c : x0 + e, z = wide ? z0 + e : z0 + c, a = wide ? 0 : PI / 2;
        const [dx, dz] = rotY(1, 0, a);
        let ok = rnd() < 0.55 && !along(x, z, a, L, 0.6);
        for (let s = -L / 2; ok && s <= L / 2; s += 1) if (onStreet(x + dx * s, z + dz * s, 0.3)) ok = false;
        if (ok) solid('berm' + k, x, gy(x, z) - 0.03, z, a + (rnd() < 0.5 ? PI : 0), SNOWPAL, rnd());
        t += L + rr(1.5, 10);
      }
    }
    // heaps where the yards and car parks were cleared: the estate's own spots, then the ends of its car rows
    const heap = (x, z, sc) => { if (hit(x, z, 1.4 * sc) || nearDoor(x, z, 3)) return; solid('pile', x, gy(x, z) - 0.02, z, rr(0, TAU), SNOWPAL, rnd(), 1, 0, sc); boxes.push([x - 0.9 * sc, z - 0.5 * sc, x + 0.9 * sc, z + 0.5 * sc, 0.6 * sc]); };
    for (const [x0, z0, dx, dz, n] of PARK) { heap(x0 - dx * 1.4 - (dx ? 0 : 0) + (dz ? 0 : 0), z0 - dz * 1.4, rr(1.3, 1.9)); heap(x0 + dx * (n + 0.5), z0 + dz * (n + 0.5), rr(1.2, 2.2)); }
    for (const [x, z, sc] of [[-36, 28, 1.6], [60, -60, 2], [-15, -100, 2.3], [86, -110, 1.8], [-62, 36, 1.5], [116, -20, 1.7], [-300, -30, 2], [-300, 65, 1.8], [-440, -25, 1.9], [-440, 70, 1.7], [300, -60, 2.2], [430, 60, 2], [170, 388, 2.1], [380, 420, 1.9]]) heap(x, z, sc);
  }
}
