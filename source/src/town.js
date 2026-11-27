// ============================================================================
// town: the small things of the estate and the town round it, and the paths from every door
// ============================================================================
// Plain script, concatenated after world.js; makeWorld() calls town() with its lists. Everything here is placed from
// the tables below and the layout of world.js (BLD, DOORS, LAWN): the yard props of props4.js, the people, animals,
// vehicles and far buildings of props5.js, notices that flutter, garlands, the doors made each its own, and the
// walkways and trodden paths that lead from every entrance somewhere of its own.

// a second bulb over a door that is failing (main.js flickers it), see FLICK in world.js
const FLICK2 = 17;
// the hockey box: centre x, z and yaw; its floodlight is a lamp with a shadow tile of its own (12)
const RINK = [67, -80, PI / 2];
{ const [x, z] = loc(RINK[0], RINK[1], RINK[2], 15.3, -7.8); LAMPS.push({ x, y: 6.95, z, r: 34, c: [150, 166, 196], t: 12 }); }
// the open garage at the end of the west row, its bulb
const GOPEN = [-62.8, 44];
LAMPS.push({ x: GOPEN[0], y: 1.9, z: GOPEN[1] + 0.5, r: 7, c: [9, 5.4, 2.4], t: -1 });
// the little shops by the highway and at the east gate: x, z, yaw (0: the front faces +z), what they sell
const KIOSKS = [[-40, -124.5, PI, 'press'], [-57, -124.5, PI, 'beer'], [50, -125.6, PI, 'shaw'], [64, 47, PI / 2, 'flowers']];
for (const [x, z, a, k] of KIOSKS) if (k === 'shaw' || k === 'flowers') { const [lx, lz] = loc(x, z, a, 1.6, 2.3); LAMPS.push({ x: lx, y: 2.45, z: lz, r: 9, c: k === 'shaw' ? [10, 6, 2.5] : [8, 5, 7], t: -1 }); }
// somebody walking to and fro: [x, z, yaw, path length, speed, phase]; where they are at time t, the same as anim 7 in
// the solid vertex shader (audio.js follows the singing drunk with it)
const walkAt = (w, t) => { const u = fract(t * w[4] / (2 * w[3]) + w[5]), s = w[3] * (u < 0.5 ? u * 2 : 2 - u * 2); return [w[0] + sin(w[2]) * s, w[1] + cos(w[2]) * s]; };
// where people from the doors go: the bus stop, the shops, the kiosks, the garages, the hockey box, the school, the
// kindergarten, the private houses, the church
// the trodden path from each door (DOORS index) to its place: [[x, z], ...] from the step out (life.js walks people along it)
const DPATH = [];
const HUBS = [[-2, -127], [-20, -117], [28, -119], [50, -122], [-40, -121], [-57, -121], [106, -40], [-100, 141], [49, 33], [-60, 48], [67, -63], [62, 47], [-140, -58], [-30, 127], [-150, 145], [158, 108], [150, -137]];

function town(o) {
  const { solid, wins, winB, made, decals, glare, steam, snd, boxes, rects, grassY, thaw, bare } = o;
  const g0 = (x, z) => max(grassY(x, z), 0);
  // a prop standing on the ground at x, z; box: half sizes and height for the camera to bump into
  const put = (nm, x, z, a = 0, pal = 0, sd = 0, box, y = 0, an = 0, sc = 1) => {
    solid(nm, x, g0(x, z) + y, z, a, pal, sd, 1, an, sc);
    if (box) { boxes.push([x - box[0], z - box[1], x + box[0], z + box[1], box[2]]); rects.push([x, z, box[0], box[1], 0, 0.8]); }
  };
  const dec = (p, w, h, md, gl, nm) => decals.push(p[0], p[1], p[2], p[3], w, h, md, gl, nm);
  const decL = (x, z, a, lx, y, lz, w, h, md, gl, nm) => { const [wx, wz] = loc(x, z, a, lx, lz); decals.push(wx, y, wz, a, w, h, md, gl, nm); };
  const glL = (x, z, a, lx, y, lz, s, r, g, b, k) => { const [wx, wz] = loc(x, z, a, lx, lz); glare.push(wx, y, wz, s, r, g, b, k); };
  // a walker: anim 7 carries it along its +z and back
  const walker = (nm, w, pal, y = 0) => solid(nm, w[0], y, w[1], w[2], pal, w[5], w[3] + w[4] / 10, 7);
  // a notice with tear-off strips on a wall: p = toW-style point [x, y, z, yaw] at the notice's centre
  const notice = (x, y, z, a) => {
    const k = rnd() * 14 | 0, [tx, tz] = rotY(1, 0, a), nz = [sin(a) * 0.012, cos(a) * 0.012];
    decals.push(x + nz[0], y, z + nz[1], a + rr(-0.03, 0.03), 0.3, 0.252, 8, 0, 'tear' + k);
    for (let j = 0; j < 7; j++) { if (rnd() < 0.3) continue; const s = (j - 3) * 0.041; decals.push(x + tx * s + nz[0] * 1.1, y - 0.126 - 0.068, z + tz * s + nz[1] * 1.1, a, 0.036, 0.136, 4, 0, 'tab' + (k % 3)); }
  };
  // a garland of bulbs that sags between two points
  const garland = (a, b, sag, step = 0.3) => { const L = hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = max(2, round(L / step)); for (let k = 0; k <= n; k++) { const t = k / n; glare.push(mix(a[0], b[0], t), mix(a[1], b[1], t) - sag * 4 * t * (1 - t), mix(a[2], b[2], t), 0.16, rnd(), 0, 0, 3); } };

  // ---------------------------------------------------------------- every entrance its own
  // a door of its own colour, a wreath on some, icicles on the canopy, notices that flutter, a garland, something left
  // by the door; a walkway out over the lawn and a trodden path to wherever the people of that entrance go
  rseed(90);
  const walks = new Mesh().mat(M_ASPH), houses = boxes.slice(0, BLD.length);
  // does the way from a to b (only its first fraction f) cross a house?
  const blocked = (a, b, f) => { for (let k = 1; k <= 24; k++) { const t = k / 24 * f, x = mix(a[0], b[0], t), z = mix(a[1], b[1], t); if (houses.some((h) => x > h[0] - 2 && x < h[2] + 2 && z > h[1] - 2 && z < h[3] + 2)) return true; } return false; };
  DOORS.forEach(([x, z, a, bi, sec, uc], di) => {
    const b = BLD[bi], at = (u, y, zz) => toW(b, 0, u, y, zz), yardSide = bi < 2;
    dec(at(uc, 1.19, -0.212), 1.4, 2.12, 0, 0, 'door' + ((di * 3 + bi) % 8));
    if (rnd() < 0.22) dec(at(uc - 0.12, 1.72, -0.2), 0.4, 0.4, 0, 0, 'wreath');
    if (rnd() < 0.8) { const p = at(uc - 1.6 + rr(-0.1, 0.1), 2.5, 1.62); solid('icicles', p[0], p[1], p[2], p[3], 0, di, 1, 0, rr(0.8, 1.05)); if (rnd() < 0.35) snd.push(['drip', p[0], 2, p[2]]); }
    for (let k = 0; k < 1 + (rnd() < 0.5); k++) { const p = at(uc + (k ? -1 : 1) * rr(1.05, 1.45), rr(1.35, 1.6), 0); notice(p[0], p[1], p[2], p[3]); }
    if (rnd() < 0.3) garland(at(uc - 1.55, 2.47, 1.62), at(uc + 1.55, 2.47, 1.62), 0.12, 0.26);
    // and the rest of what an entrance collects: an official notice taped up, a sign or two, the code scrawled by the
    // intercom, a stencil, scratches on the door; every door its own mix
    { const sd = rnd() < 0.5 ? -1 : 1;
      if (rnd() < 0.55) dec(at(uc + sd * rr(1.0, 1.35), rr(1.45, 1.75), 0.014), 0.21, 0.29, 8, 0, 'offic' + (rnd() * 4 | 0));
      if (rnd() < 0.35) dec(at(uc - sd * 0.95, 1.9, 0.013), 0.17, 0.23, 0, 0, 'sNoSmoke');
      if (rnd() < 0.3) dec(at(uc + rr(-0.5, 0.5), 2.95, 0.013), 0.32, 0.28, 0, 0, 'sIcicle');
      if (rnd() < 0.3) dec(at(uc + 0.45, 1.06, -0.2), 0.14, 0.05, 0, 0, 'sCode');
      if (rnd() < 0.25) dec(at(uc - sd * rr(1.4, 2.0), rr(0.5, 0.9), 0.012), 0.62, 0.16, 0, 0, 'sNoAds');
      if (rnd() < 0.7) dec(at(uc + rr(-0.15, 0.15), rr(0.6, 1.3), -0.206), 0.5, 0.75, 0, 0, 'scr' + (rnd() * 3 | 0)); }
    // what stands by the door: a pram is too much; a bicycle, a sled, a broom, a grit bin, a shovel in the snow, a cat
    const side = yardSide ? -1 : rnd() < 0.5 ? -1 : 1;
    const things = ['bike', 'sled', 'broom', 'sandbin', 'shovel', 'cat', 'bucket', 'sled', 'broom'];
    for (let k = 0, n = 1 + (rnd() < 0.55); k < n; k++) {
      const nm = pick(things), u = uc + side * (2.05 + k * 0.9 + rr(0, 0.3));
      if (nm === 'bucket') { const p = at(u, 1.1, 0); solid('bucket', p[0], p[1], p[2], p[3], 0, di); continue; }
      const p = at(u, 0, nm === 'broom' ? 0.05 : nm === 'cat' ? 1.3 : 0.45), ya = nm === 'cat' ? p[3] + rr(-0.6, 0.6) : nm === 'bike' ? p[3] + PI : p[3];
      solid(nm, p[0], 0.12 * (nm === 'cat'), p[2], ya, nm === 'cat' ? pick([3, 6, 8, 9]) : pick([5, 4, 11, 1]), di, 1, 0);
    }
    // the far houses get a bench and a bin by every door, and a bulb over it without a lamp
    if (bi >= 2 && b.t !== 2) {
      const p = at(uc - side * 2.6, 0, 1.4); solid('bench', p[0], g0(p[0], p[2]), p[2], p[3] - PI / 2, 8, uc);
      const q = at(uc - side * 3.6, 0, 1.4); solid('urn', q[0], g0(q[0], q[2]), q[2]);
      // a bulb over the door: most burn, some stutter, a few are dead
      if (!LAMPS.some((l) => l.t === -1 && hypot(l.x - x, l.z - z) < 2)) { const p2 = at(uc, 2.32, 0.95), st = rnd(), dead = st < 0.14, bad = st > 0.75;
        solid('bulb', p2[0], p2[1] + 0.12, p2[2], 0, 0, dead ? -2 : bad ? -3 : -1); if (!dead) glare.push(p2[0], p2[1] + 0.12, p2[2], 0.45, 3.2, 1.9, 0.9, bad ? 13 : 0); }
    }
    // the walkway: over the lawn only, a strip of asphalt straight out from the steps
    const nx = sin(a), nz = cos(a), Lw = rr(5.5, 9);
    const yw = grassY(x + nx * 4, z + nz * 4);
    if (yw >= 0) { walks.at(x, 0, z, a); walks.box(-0.75, 0, 1.75, 0.75, yw + 0.014, Lw, 16, 0.7, 1); const p = loc(x, z, a, -0.9, 1.6), q = loc(x, z, a, 0.9, Lw + 0.1); bare.push([min(p[0], q[0]), min(p[1], q[1]), max(p[0], q[0]), max(p[1], q[1])]); }
    // the trodden path: to one of the three nearest places it can reach without going through a house, wandering a
    // little, at most 85 m of it
    const E = [x + nx * (Lw + 0.5), z + nz * (Lw + 0.5)];
    const hs = HUBS.map((h) => [hypot(h[0] - E[0], h[1] - E[1]), h]).sort((p, q) => p[0] - q[0]).filter((e) => !blocked(E, e[1], min(1, 85 / e[0])));
    if (!hs.length) return;
    const [dh, H] = hs[min(hs.length - 1, rnd() < 0.5 ? 0 : rnd() < 0.6 ? 1 : 2)];
    const f = min(1, 85 / dh), dx = (H[0] - E[0]) * f, dz = (H[1] - E[1]) * f, px = -dz / (dh * f + 1e-3), pz = dx / (dh * f + 1e-3), j = min(7, dh * 0.12);
    const P = [[x + nx * 1.8, z + nz * 1.8], E];
    for (const t of [0.33, 0.66]) { const s = rr(-1, 1) * j; P.push([E[0] + dx * t + px * s, E[1] + dz * t + pz * s]); }
    P.push([E[0] + dx, E[1] + dz]);
    PATHS.push(P); DPATH[di] = P;
    // and now and then a shortcut to the next door along the house
    const nd = DOORS[di + 1];
    if (nd && nd[3] === bi && rnd() < 0.5) PATHS.push([E, [(E[0] + nd[0] + sin(nd[2]) * 6) / 2 + rr(-1.5, 1.5), (E[1] + nd[1] + cos(nd[2]) * 6) / 2 + rr(-1.5, 1.5)], [nd[0] + sin(nd[2]) * 6, nd[1] + cos(nd[2]) * 6]]);
  });
  o.reg('walks', walks); solid('walks', 0, 0, 0);
  // notices taped round the lamp posts of the estate and the town, at eye height, flapping in the wind
  for (const [x, z, , k] of POLES.concat(DPOLES)) { if (k === 3 || rnd() > 0.4) continue; const a = rr(0, TAU), [dx, dz] = rotY(0, 0.1, a); decals.push(x + dx, g0(x, z) + rr(1.45, 1.7), z + dz, a, 0.24, 0.2, 8, 0, 'tear' + (rnd() * 14 | 0)); if (rnd() < 0.4) decals.push(x - dx * 0.9, g0(x, z) + rr(1.2, 1.4), z - dz * 0.9, a + PI, 0.2, 0.28, 8, 0, 'offic' + (rnd() * 4 | 0)); }

  // ---------------------------------------------------------------- the houses: dishes, fire ladders, roof things,
  // things on the open balconies, somebody smoking, garlands behind the balcony glass, pigeons, the lift motors
  rseed(91);
  const junk = [0, 1, 2].map((v) => {
    const m = new Mesh();
    if (v === 0) { m.mat(M_TINT); for (const x of [-0.5, -0.38]) m.bar([x, 0, 0.15], [x + 0.05, 1.75, 0.08], 0.07, 0.02); m.mat(M_GLASS); for (let k = 0; k < 4; k++) m.tube([[0.1 + k * 0.14, 0, 0.3], [0.1 + k * 0.14, 0.2, 0.3]], 0.055, 6, 2); }
    if (v === 1) { m.mat(M_METAL).tube([[0, 0, 0.4], [0, 0.3, 0.4]], (k) => 0.14 + k * 0.03, 8, 1); m.mat(M_GRN).tube([[0, 0.25, 0.4], [0, 0.7, 0.4], [0, 1.3, 0.4]], (k) => [0.32, 0.22, 0.01][k], 7, 2); m.mat(M_BARK).box(0.4, 0, 0.1, 0.8, 0.35, 0.5, 0, 0.6, 1); }
    if (v === 2) { m.mat(M_BARK); m.box(-0.6, 0, 0.1, -0.1, 0.4, 0.5, 0, 0.6, 1); m.box(-0.55, 0.4, 0.15, -0.15, 0.7, 0.45, 0, 0.7, 1); m.mat(M_TINT).box(0.1, 0, 0.2, 0.6, 0.9, 0.28, 0, 0.6, 1); m.mat(M_METAL).tube([[0.3, 0, 0.55], [0.3, 0.45, 0.55]], 0.16, 8, 2); }
    o.reg('bjunk' + v, m); return 'bjunk' + v;
  });
  BLD.forEach((b, i) => {
    const key = i ? 'b' + b.t + b.fl + b.sec : 'home', W = made[key].W, mine = (s, u, y) => !i && s === 0 && abs(u - RU) < 2 && abs(y - RY - 1.6) < 2;
    for (const e of W) {
      const [s, u, y, zz, w, h, ty] = e;
      if (s > 1 || mine(s, u, y)) continue;
      // an open balcony: junk on it, now and then somebody smoking
      if (ty === 0 && zz === 0.03 && h > 1.6) {
        const y0 = y - 1.6;
        if (rnd() < 0.45) { const p = toW(b, s, u + rr(-0.5, 0.5), y0, 0.08); solid(pick(junk), p[0], p[1], p[2], p[3], pick([1, 5, 11, 13, 4]), rnd()); }
        else if (rnd() < 0.12) { const p = toW(b, s, u + 0.3, y0, 0.75); solid('standing', p[0], p[1], p[2], p[3] + PI + rr(-0.4, 0.4), pick([2, 8, 9]), rnd()); const c = toW(b, s, u + 0.5, y0 + 1.25, 0.95); glare.push(c[0], c[1], c[2], 0.07, 3.2, 0.8, 0.15, 2); }
      }
      // a garland behind balcony glass
      if (ty === 1 && zz > 0.5 && rnd() < 0.07) garland(toW(b, s, u - w / 2 + 0.15, y + 0.62, zz - 0.06), toW(b, s, u + w / 2 - 0.15, y + 0.62, zz - 0.06), 0.06, 0.22);
      // a grille over a window of the ground floor (more of them on some houses than others)
      if (ty === 0 && zz < 0 && y < 4 && rnd() < ihash(i, 3, 17) * 0.9) { const p = toW(b, s, u, y - h / 2 - 0.02, 0); solid(w > 1.6 ? 'grille1' : 'grille0', p[0], p[1], p[2], p[3]); }
      // a satellite dish beside a window
      if (ty === 0 && zz < 0 && rnd() < 0.08 && y > 3) { const p = toW(b, s, u + w / 2 + 0.45, y + 0.2, 0); solid('dish', p[0], p[1], p[2], p[3], 0, rnd()); }
    }
    if (b.t === 0) { const p = toW(b, rnd() < 0.5 ? 2 : 3, b.D * rr(0.25, 0.75), 0, 0); solid('ladder', p[0], 0, p[2], p[3]); }
    if (b.t < 2 || b.t === 4) {
      // on the roof: vent shafts, aerials, pigeons along the parapet; the lift motor hums under the panel houses' huts
      const roof = (x, zz) => { const [wx, wz] = rotY(x, zz, b.yaw); return [b.x + wx, b.z + wz]; };
      for (let k = 0; k < b.sec; k++) {
        const xc = (k + 0.5) * b.L / b.sec;
        for (const dx of [-5.5, 5.2]) { const [x, z] = roof(xc + dx + rr(-1, 1), b.D * rr(0.25, 0.75)); solid('vent', x, b.H - 0.35, z, b.yaw + rr(-0.1, 0.1)); }
        if (rnd() < 0.6) { const [x, z] = roof(xc + rr(-7, 7), b.D * rr(0.2, 0.8)); solid('aerial', x, b.H - 0.35, z, rr(0, TAU)); }
        if (b.t === 1 || b.t === 4) { const [x, z] = roof(xc, b.D / 2); snd.push(['lift', x, b.H + 1, z]); }
      }
      if (i === 1 || i === 2 || i === 4) for (let k = 0; k < 5; k++) { const p = toW(b, 0, b.L * 0.3 + k * 0.4 + rr(-0.1, 0.1), b.H, -0.12); solid('pigeon', p[0], p[1], p[2], p[3] + PI / 2 + rr(-0.5, 0.5), pick([1, 0, 9]), k); }
    }
  });
  // the street and the number of every house on its corner, by the yard side
  BLD.forEach((b, i) => { if (b.t === 2) return; dec(toW(b, 0, b.L - 0.9, b.T.base + 2.2, 0.02), 0.62, 0.39, 0, 0, 'hnum' + (i * 5 % 6)); });
  // the clock on the end wall of the tower C, lit
  { const b = BLD[3], p = toW(b, 2, b.D / 2, 21, 0.02); dec(p, 1.6, 1.6, 1, 0.55, 'clockBig'); }

  // ---------------------------------------------------------------- windows with something going on
  // a cat on the sill, a garland round the window, the fridge open in a dark kitchen, a flat being done up, an aquarium,
  // a computer; a few in the houses the kitchen looks at, the rest anywhere
  {
    rseed(92); const near = [], far = [];
    for (let k = 0; k < winB.length; k++) {
      const bi = winB[k] >> 2, y = wins[k * 8 + 1];
      if (wins[k * 8 + 7] !== 0 || (winB[k] & 3) > 1 || y < 3 || hypot(wins[k * 8] - EYE[0], wins[k * 8 + 2] - EYE[2]) < 8) continue;
      if (bi < 13) ([1, 2].includes(bi) ? near : far).push(k);
    }
    const take = (L, fl) => { const k = L.splice(rnd() * L.length | 0, 1)[0]; wins[k * 8 + 7] = fl * 4; };
    for (const [fl, nn, nf] of [[4, 2, 4], [5, 2, 6], [6, 1, 3], [7, 1, 2], [8, 1, 2], [9, 2, 4]]) { for (let j = 0; j < nn; j++) take(near, fl); for (let j = 0; j < nf; j++) take(far, fl); }
  }

  // ---------------------------------------------------------------- the yard and the courtyards round it
  rseed(93);
  // the hockey box with its ice, a stick and a puck left on it, the ice slide beside it
  {
    const [x, z, a] = RINK, y = g0(x, z); solid('rink', x, y, z, a, 4, 0.3);
    const m = new Mesh().mat(M_LENS); m.box(x - 7.3, y, z - 14.8, x + 7.3, y + 0.05, z + 14.8, 4, 1, 1); o.reg('ice', m); solid('ice', 0, 0, 0); bare.push([x - 8, z - 16, x + 8, z + 16]);
    put('stick', x + 2, z + 4, 1.1, 0, 0, null, 0.05); put('stick', x - 3, z - 6, -0.4, 0, 1, null, 0.05);
    put('iceslide', x + 1, z + 23, PI / 2, 0, 0, [1, 4, 2.6]);
    boxes.push([x - 7.6, z - 15.1, x + 7.6, z - 14.9, 1.2], [x - 7.6, z + 14.9, x + 7.6, z + 15.1, 1.2], [x - 7.6, z - 15, x - 7.4, z + 15, 1.2], [x + 7.4, z - 15, x + 7.6, z + 15, 1.2]);
  }
  // playground things
  put('rocket', 48, -24, 0.4, 0, 0, [1.4, 1.4, 5.5]); put('seesaw', 20, -36, 0.9, 0, 1); put('sandbox', 13, -14, 0.2);
  put('domino', 44, 12, 0.3, 0, 0, [1.4, 1.2, 2.4]);
  // the courtyard of house 7 (west) and the one of house 10 (east): washing, a carpet, a sandbox, a seesaw, a fort
  put('dryer', -55, -28, PI / 2, 0, 0, null, 0, 1); put('carpetbar', -55, -6, PI / 2, 0, 0, null, 0, 1);
  put('sandbox', -58, 18, 0.3); put('seesaw', -62, 28, -0.4); put('fort', -56, 8, 2.4, 13); put('snowman', -60, -16, 1.4, 0, 3);
  put('dryer', 114, 18, -PI / 2, 0, 1, null, 0, 1); put('carpetbar', 114, 44, -PI / 2, 0, 1, null, 0, 1); put('fort', 118, 32, 0.6, 13, 1); put('snowman', 117, 4, -1.2, 0, 4);
  put('sandbox', 112, -4, 0.1); put('domino', 118, 58, -PI / 2);
  // garages: the west row runs on, one is open with a bulb, a man and a radio in it; an old car under snow, a motorcycle
  [-59.2, -66.4].forEach((x, k) => { solid('garage', x, g0(x, 44), 44, 0, [6, 9, 11][k], x); boxes.push([x - 1.7, 41, x + 1.7, 47, 2.6]); rects.push([x, 44, 1.7, 3, 0, 1]); });
  { const [x, z] = GOPEN; solid('garageOpen', x, g0(x, z), z, 0, 12, -1); boxes.push([x - 1.7, z - 3, x + 1.7, z + 3, 2.6]); rects.push([x, z, 1.7, 3, 0, 1]); solid('standing', x + 0.6, g0(x, z), z + 3.4, 2.6, 8, 4); snd.push(['radio', x, 1.5, z + 1]); glare.push(x, 1.95, z + 0.5, 0.35, 3, 1.8, 0.8, 0); }
  { const [x, z] = [-75, 40]; solid('car1', x, -0.06, z, 0.3, 3, 0.8, 1, 0); solid('carSnow', x, -0.06, z, 0.3, 13, 0); boxes.push([x - 1.4, z - 1.4, x + 1.4, z + 1.4, 1.5]); rects.push([x, z, 2.1, 0.86, 0.3, 0.8]); }
  put('moto', -48.2, 47, PI / 2, 10, 0, [0.5, 1, 1.1]);
  // dovecote with its birds, the heating main with cats on it and steam from a joint
  put('dovecote', -58, -74, 0.5, 6, 0, [1.3, 1.3, 4.2]);
  for (let k = 0; k < 4; k++) solid('pigeon', -58 + rr(-0.8, 0.8), 4.15, -74 + rr(-0.6, 0.6), rr(0, TAU), 1, k);
  solid('heatpipe', -70, g0(-70, -52), -52, 0, 0, 0);
  boxes.push([-70, -52.7, -46, -51.3, 1.3]);
  solid('catLying', -64, g0(-64, -52) + 1.07, -52.3, 0.2, 6); solid('cat', -61.5, g0(-61, -52) + 1.05, -51.7, -0.5, 3); solid('catLying', -50, g0(-50, -52) + 1.07, -52.2, 2.8, 9);
  for (let k = 0; k < 6; k++) steam.push(-66, 1.1, -52, rr(0.15, 0.28), rnd(), rr(0.3, 0.45), 1.8, rr(0.4, 0.9));
  // cats on the bins and on the warm manhole, its snow melted round it
  solid('cat', -34.2, 1.2, 34.4, PI / 2 + 0.4, 3, 1); solid('catLying', -17.4, 0.02, -7.2, 1.9, 8); solid('catLying', -16.4, 0.02, -8.8, 0.3, 6);
  thaw.push([-17, -8, 1.8], [2.5, -40, 1.4]);
  // the transformer hums, and the sign on its door
  snd.push(['hum', -31, 1.5, -62]); decals.push(-28.95, 2.05, -62, PI / 2, 0.36, 0.3, 0, 0, 'danger');
  // the carousel turns a little in the wind and creaks
  snd.push(['creak', 23, 0.6, -19]);
  // a barrier on the way in from the highway, a bicycle at a fence, a shovel stuck in a pile
  put('barrier', -23.5, -96, 0); put('bike', 30.5, 39.5, 0.05, 0, 2); put('shovel', 8.6, 18.6, 0.8);
  // things on the trees: a feeder, a starling box, a bag caught in the twigs; the New Year tree and a garland
  solid('feeder', 52.2, 2.4, -13.8); solid('birdhouse', 38, 3.6, -35.75, 0); solid('birdhouse', -9.5, 3.2, -57.7, 0);
  solid('bag', 47.6, 4.1, 6.4, 0, 0, 0, 1, 1); solid('bag', -45.5, 3.4, 20.3, 0, 0, 1, 1, 1);
  {
    const [x, z] = [29, -33], y = g0(x, z); solid('tree4', x, y, z, 0.3, 1, 0.5, 1, 1, 0.62);
    for (let k = 0; k < 46; k++) { const t = k / 46, r = 2.2 * (1 - t) + 0.25, an = t * TAU * 4.5; glare.push(x + cos(an) * r, y + 0.6 + t * 6.3, z + sin(an) * r, 0.18, rnd(), 0, 0, 3); }
    glare.push(x, y + 7.2, z, 0.5, 2.8, 0.3, 0.15, 0);
  }
  garland([-9, 2.6, -20], [-9, 2.6, -27], 0.25); garland([-9, 2.6, -27], [-9, 2.6, -34], 0.25);
  // rowans with bullfinches; crows on the lamp heads and a garage roof
  const perch = PROPS5.rowan().perches;
  for (const [x, z] of [[54, 17.5], [-46, -47], [110, 8], [-48, 60]]) {
    const s = rr(0.9, 1.1), a = rr(0, TAU), y = g0(x, z); solid('rowan', x, y, z, a, 0, rnd(), 1, 1, s);
    for (const p of perch) if (rnd() < 0.6) { const [bx, bz] = loc(x, z, a, p[0] * s, p[2] * s); solid('bird', bx, y + p[1] * s - 0.02, bz, rr(0, TAU), pick([1, 0, 13]), rnd()); }
  }
  for (const [k, cr] of [[0, 1], [3, 0], [8, 1], [10, 0]]) { const [x, z, a] = POLES[k], [dx, dz] = rotY(1.5, 0, a); solid('crow', x + dx, 8.93, z + dz, a + rr(-1, 1), 0, k); if (cr) snd.push(['crow', x + dx, 9, z + dz]); }
  solid('crow', 50.6, 2.48, 36.3, 2.2, 0, 7); solid('crow', 51.4, 2.46, 36.6, 0.4, 0, 8);
  // an old Christmas tree thrown out on a pile
  put('oldTree', -27.5, -1.5, 0.6); put('oldTree', 61, -58, 2.1);
  // the snowmen and forts in the far corners, a sled left out
  put('snowman', 98, 24, 0.5, 0, 5); put('sled', 100, 22, 1.2, 11, 0); put('fort', -32, 70, 0.4, 13, 2);

  // ---------------------------------------------------------------- the street: kiosks, a payphone, an ATM, signs,
  // a billboard, a zebra with a blinking light, a taxi waiting, a car with its alarm going, an ambulance at a door
  for (const [x, z, a, k] of KIOSKS) {
    solid('kiosk', x, 0, z, a, { press: 11, beer: 8, shaw: 5, flowers: 7 }[k], x);
    const c0 = loc(x, z, a, -2.3, -1.6), c1 = loc(x, z, a, 2.3, 1.6); boxes.push([min(c0[0], c1[0]), min(c0[1], c1[1]), max(c0[0], c1[0]), max(c0[1], c1[1]), 2.9]); rects.push([x, z, 2.3, 1.6, a, 1]);
    const open = k === 'shaw' || k === 'flowers';
    decL(x, z, a, -0.4, 2.55, 1.53, 1.6, 0.38, open ? 2 : 0, open ? 2.6 : 0, k);
    decL(x, z, a, -0.5, 1.5, 1.05, 3, 1.5, open ? 1 : 0, open ? 1.1 : 0, open ? (k === 'shaw' ? 'shawWin' : 'flowerWin') : 'shutter');
    if (k === 'shaw') {
      const [sx, sz] = loc(x, z, a, 1.2, 0), [cx, cz] = loc(x, z, a, 0, 1.6);
      for (let j = 0; j < 8; j++) steam.push(sx, 2.9, sz, rr(0.2, 0.35), rnd(), rr(0.25, 0.4), 2.5, rr(0.4, 0.9));
      snd.push(['cook', cx, 1.4, cz]);
    }
    { const [ux, uz] = loc(x, z, a, 2.8, 1.9); solid('urn', ux, 0, uz); }
  }
  put('payphone', -9.5, -123.8, PI, 0, 0, [0.3, 0.3, 2.2]); put('payphone', 60, 49, PI / 2, 0, 1, [0.3, 0.3, 2.2]);
  decals.push(33.03, 1.3, -124.5, PI / 2, 0.6, 0.9, 1, 1.1, 'atm');
  // the post office in the low house E: its sign and a post box by the door
  { const d = DOORS.find((e) => e[3] === 5), b = BLD[5]; dec(toW(b, 0, d[5], 2.85, 0.02), 1.6, 0.32, 0, 0, 'post'); const p = toW(b, 0, d[5] + 1.5, 1.0, 0); solid('postbox', p[0], p[1], p[2], p[3], 11); }
  // road signs: children, a speed hump, the crossing, no entry, parking
  for (const [x, z, a, nm] of [[-26, -61, PI, 'rsKids'], [-26.5, -100, PI, 'rsBump'], [-7, -134.2, 0, 'rsPed'], [3, -145.8, PI, 'rsPed'], [83.3, -126, PI, 'rsStop'], [12.5, 30, PI / 2, 'rsPark'], [-27, 28, 0, 'rsKids']]) {
    put('roadsign', x, z, a); const [px, pz] = loc(x, z, a, 0, 0.035); decals.push(px, g0(x, z) + 2.25, pz, a, 0.66, 0.66, 0, 0, nm);
  }
  // the zebra over the highway and its two lights blinking yellow
  { const m = new Mesh().mat(M_CONC); for (let k = 0; k < 7; k++) { const zz = ROADZ - 3.3 + k * 1.1; m.box(-4, 0, zz, 0, 0.007, zz + 0.55, 4, 1, 1); } o.reg('zebra', m); solid('zebra', 0, 0, 0); }
  for (const [x, z, a] of [[1.5, -134.3, 0], [-5.5, -145.7, PI]]) { put('tlight', x, z, a, 0, 0, [0.2, 0.2, 3.6]); glL(x, z, a, 0, 3.05, 0.33, 0.6, 0, 0, 0, 6); }
  // a billboard on the waste ground facing the estate, another to the west; their lights
  for (const [x, z, nm, md] of [[38, -152, 'advert0', 2], [-128, -150, 'advert1', 1]]) {
    put('billboard', x, z, 0, 0, 0, [3, 0.5, 7.8]); decals.push(x, g0(x, z) + 5.5, z + 0.16, 0, 6, 3, md, 0.8, nm);
    for (const lx of [-1.5, 1.5]) glare.push(x + lx, g0(x, z) + 7.6, z + 1.12, 0.5, 2.6, 2.4, 2, 0);
  }
  // a taxi waiting at a door of the tower C with its engine running
  { const d = DOORS.find((e) => e[3] === 3), [x, z] = loc(d[0], d[1], d[2], -3.2, 4.2), a = d[2] + PI / 2;
    solid('car0', x, 0, z, a, 15, 0.21, 1, 0); boxes.push([x - 1.4, z - 1.4, x + 1.4, z + 1.4, 1.5]); rects.push([x, z, 2.1, 0.86, a, 0.8]);
    for (const s of [0.002, -0.002]) { const [tx, tz] = loc(x, z, a, -0.3, s); decals.push(tx, 1.62, tz, a + (s > 0 ? 0 : PI), 0.44, 0.17, 1, 1.4, 'taxi'); }
    const [ex, ez] = loc(x, z, a, -2.25, 0.4); for (let k = 0; k < 7; k++) steam.push(ex, 0.3, ez, rr(0.12, 0.2), rnd(), rr(0.35, 0.5), 0.9, rr(0.4, 0.8));
    snd.push(['idle', x, 0.8, z]); }
  // a car whose alarm goes off now and then: its hazard lights blink with it
  { const [x, z, a] = [-20.3, -0.7, PI]; solid('car2', x, 0, z, a, 6, 0.6, 1, 0); boxes.push([x - 1.3, z - 1.3, x + 1.3, z + 1.3, 1.5]); rects.push([x, z, 2.1, 0.86, a, 0.8]);
    for (const [lx, lz] of [[1.92, 0.6], [1.92, -0.6], [-1.9, 0.6], [-1.9, -0.6]]) glL(x, z, a, lx, 0.72, lz, 0.4, 0, 0, 0, 8);
    snd.push(['alarm', x, 1, z]); }

  // the ambulance at a door of house 11, its blue lights flashing while the event is on
  { const d = DOORS.filter((e) => e[3] === 11)[1], [x, z] = loc(d[0], d[1], d[2], 3.5, 5.5), a = d[2] + PI / 2;
    solid('ambulance', x, 0, z, a, 0, 0.4); boxes.push([x - 2.8, z - 2.8, x + 2.8, z + 2.8, 2.6]); rects.push([x, z, 2.75, 1.15, a, 0.8]);
    for (const s of [-0.55, 0.55]) glL(x, z, a, 1.55, 2.2, s, 0.6, s > 0 ? 0.5 : 0, 0, 0, 4); }

  // ---------------------------------------------------------------- people and animals
  // a man with a little dog, somebody drunk singing along house V, a courier on a bicycle, the janitor at his scraping,
  // a woman from the bus stop, a man in the west courtyard; a couple more waiting at the stop; a pack of stray dogs
  {
    const W = [[2.3, 27, PI, 44, 1.05, 0.1, 'walker', 2], [-24, 37.6, PI / 2, 52, 0.7, 0.4, 'drunk', 8], [83, -118, 0, 150, 4.6, 0.7, 'courier', 7],
      [9, 39.4, PI / 2, 5, 0.35, 0.2, 'janitor', 9], [-16.5, -124, 0, 58, 1.2, 0.55, 'walkerW', 14], [-66, -46, 0, 78, 1.1, 0.85, 'walker', 9], [110, -20, 0, 70, 1.0, 0.3, 'walkerW', 4]];
    for (const [x, z, a, L, v, ph, nm, pal] of W) walker(nm, [x, z, a, L, v, ph], pal, nm === 'courier' ? 0 : 0.02);
    walker('dogSmall', [2.3 + 0.6, 27, PI, 44, 1.05, 0.1], 6, 0.02);
    snd.push(['drunk', -24, 1.6, 37.6, [-24, 37.6, PI / 2, 52, 0.7, 0.4]], ['scrape', 11.5, 0.3, 39.4]);
    for (const [lx, lz, a, pal] of [[-1.6, 1.3, -0.4, 11], [-1.05, 1.45, 2.6, 5]]) { const [px, pz] = loc(STOP[0], STOP[1], STOP[2], lx, lz); solid('standing', px, 0, pz, STOP[2] + a, pal, lx); }
    for (const [x, z, nm, a] of [[-114, -152, 'dog', 0.4], [-111.5, -150.5, 'dogLying', 2], [-116.5, -149, 'dogLying', 4.1], [-113, -147, 'dog', 2.8], [57, 40.5, 'dogLying', 1.2]]) solid(nm, x, g0(x, z), z, a, pick([6, 8, 9, 0]), x);
    snd.push(['dog', -113, 0.5, -150]);
  }

  // ---------------------------------------------------------------- round the town: the railway, the river, the
  // school, the kindergarten, the church, the works, a building site, a water tower, a telecom tower, the power line
  // the level crossing: a road from the highway up the bank, barriers, the lamps and the bell; signals along the line
  {
    const m = new Mesh().mat(M_ASPH), x0 = XING - 4, x1 = XING + 4, y = lawnY(14) + 0.015;
    m.box(x0, 0, RAILZ + 11, x1, y, ROADZ - 4.6, 16 | 32, 0.7, 1);
    m.q4([x0, y, RAILZ + 11], [x1, y, RAILZ + 11], [x1, RAILY + 0.03, RAILZ + 6], [x0, RAILY + 0.03, RAILZ + 6]);
    m.box(x0, RAILY - 0.2, -191.5, x1, RAILY + 0.03, RAILZ + 6, 0, 0.7, 1);
    o.reg('xroad', m); solid('xroad', 0, 0, 0);
    for (const [x, z, a] of [[x0 - 0.7, RAILZ + 5.6, 0], [x1 + 0.7, -191, PI]]) { solid('xbar', x, RAILY, z, a); }
    for (const [x, z, a] of [[x0 - 1.6, RAILZ + 5.4, 0], [x1 + 1.6, -190.8, PI]]) { solid('xsig', x, RAILY, z, a); for (const s of [-0.25, 0.25]) glL(x, z, a, s, RAILY + 2.4, 0.12, 0.45, s > 0 ? 0.5 : 0, 0, 0, 7); }
    snd.push(['xing', XING, 4, RAILZ + 4]);
    for (const [x, col] of [[-112, [0.2, 2.2, 0.5]], [64, [2.6, 0.1, 0.05]], [-176, [0.2, 2.2, 0.5]]]) { solid('rsignal', x, RAILY, RAILZ + 3.6, 0); glare.push(x, RAILY + 4.6, RAILZ + 3.75, 0.5, ...col, 0); }
  }
  // the river along the south edge, frozen; fishermen's tents on it with a lantern each
  {
    const m = new Mesh().mat(M_LENS); m.box(-576, 0, 166, 576, 0.3, 186, 4, 1, 1); o.reg('river', m); solid('river', 0, 0, 0);
    for (const [x, z, pal] of [[18, 176, 11], [26.5, 180.5, 5], [-44, 173, 14], [72, 177, 4], [-120, 179, 15], [-330, 176, 4], [380, 178, 11]]) { solid('tent', x, 0.3, z, rr(-0.5, 0.5), pal, x); glare.push(x + 0.3, 1.0, z + 1.1, 0.3, 3, 1.8, 0.7, 0); }
  }
  // school, kindergarten, church, works, building site, water tower, telecom tower
  const farB = (nm, x, z, a, pal, sz) => {
    const r = PROPS5[nm](); o.reg(nm, r.m); solid(nm, x, g0(x, z), z, a, pal, rnd());
    const sw = abs(sin(a)) > 0.7, hx = sw ? sz[1] : sz[0], hz = sw ? sz[0] : sz[1]; boxes.push([x - hx, z - hz, x + hx, z + hz, sz[2]]); rects.push([x, z, hx, hz, 0, 1]); if (r.W) for (const [lx, ly, lz, la, w, h] of r.W) { const [wx, wz] = loc(x, z, a, lx, lz); wins.push(wx, g0(x, z) + ly, wz, a + la, w, h, rnd(), 0); } return r; };
  {
    rseed(94);
    const S = farB('school', -150, -55, PI / 2, 0, [30, 7.5, 11.5]); decL(-150, -55, PI / 2, 0, 9.6, 7.62, 4.2, 0.62, 0, 0, 'school');
    { const [fx, fz] = loc(-150, -55, PI / 2, 9, 12); put('flagpole', fx, fz, PI / 2, 0, 0, null, 0, 1); }
    farB('kinder', -30, 140, PI, 0, [20, 7, 8]); decL(-30, 140, PI, 0, 5.7, 7.12, 4.4, 0.66, 0, 0, 'kinder');
    const C = farB('church', 160, 112, -PI / 2, 0, [11, 7, 24]); for (const p of C.tops) { const [wx, wz] = loc(160, 112, -PI / 2, p[0], p[2]); glare.push(wx, p[1] + 0.5, wz, 1.4, 1.2, 0.9, 0.45, 0); }
    snd.push(['bell', 160, 18, 112]);
    const F = farB('factory', 174, 14, -PI / 2, 0, [20, 9, 12]);
    F.tips.forEach((p, k) => { const [wx, wz] = loc(174, 14, -PI / 2, p[0], p[2]); if (k < 2) { glare.push(wx, p[1] + 0.5, wz, 0.6, 2.6, 0.12, 0.08, 1); for (let j = 0; j < 20; j++) steam.push(wx, p[1], wz, rr(3, 6), rnd(), rr(0.03, 0.05), 34, rr(0.6, 1.4)); } else glare.push(wx, p[1] + 0.6, wz, 2.6, 3, 1.3, 0.25, 9); });
    { const r = PROPS5.crane(); o.reg('crane', r.m); solid('crane', -136, g0(-136, 22), 22, 0.5, 0); for (const p of r.lights) { const [wx, wz] = loc(-136, 22, 0.5, p[0], p[2]); glare.push(wx, p[1] + 0.3, wz, 0.6, 2.6, 0.12, 0.08, 1); } }
    put('frameBld', -156, 40, PI / 2, 0, 0, [6.5, 15.5, 26]);
    for (let k = 0; k < 4; k++) glare.push(-150 + rr(-1, 1), 3 + k * 5.6, 30 + k * 6, 0.5, 3, 2.4, 1.6, 0);
    put('watertower', -172, -112, 0, 9, 0, [3, 3, 26]);
    { const r = PROPS5.celltower(); o.reg('celltower', r.m); solid('celltower', 174, g0(174, -82), -82, 0); boxes.push([172, -84, 176, -80, 40]); glare.push(174, r.top[1] + 0.4, -82, 0.6, 2.6, 0.12, 0.08, 1); }
  }
  // the power line over the waste ground: pylons and the sagging wires between their arms
  {
    const r = PROPS5.pylon(); o.reg('pylon', r.m); const X = [-176, -128, -32, 16, 64, 112, 176], z = -160, m = new Mesh().mat(M_DARK);
    for (const x of X) solid('pylon', x, g0(x, z), z, 0);
    for (let k = 0; k < X.length - 1; k++) for (const a of r.arms) {
      const p = [X[k] + a[0], a[1], z + a[2]], q = [X[k + 1] + a[0], a[1], z + a[2]], P = [];
      for (let j = 0; j <= 12; j++) { const t = j / 12; P.push([mix(p[0], q[0], t), mix(p[1], q[1], t) - 4 * t * (1 - t) * 3.5, p[2]]); }
      m.tube(P, 0.03, 3, 0, (j) => sin(j / 12 * PI) * 0.6);
    }
    o.reg('hvwires', m, { noSh: 1 }); solid('hvwires', 0, 0, 0, 0, 0, 0, 1, 1);
  }
  // the road bridge over the river to the south-east, its lamps
  { const r = PROPS5.overpass(); o.reg('overpass', r.m); solid('overpass', 122, g0(122, 160), 160, PI / 2); for (const p of r.lamps) { const [wx, wz] = loc(122, 160, PI / 2, p[0], p[2]); glare.push(wx, p[1], wz, 1.6, 2.6, 1.3, 0.4, 0); } }
  // the forest on the far edge: spruces in a ragged band along the south and east
  for (let k = 0; k < 70; k++) {
    const e = rnd() < 0.55, x = e ? rr(180, 190) : rr(-190, 190), z = e ? rr(-120, 160) : rr(188, 191);
    if (abs(x - 122) < 10 && z > 150 || boxes.some((h) => x > h[0] - 3 && x < h[2] + 3 && z > h[1] - 3 && z < h[3] + 3)) continue;
    solid('tree5', x, 0.15, z, rr(0, TAU), 1, rnd(), 1, 1, rr(0.9, 1.5));
  }
}
