// ============================================================================
// extras: the snow heaped up round the town, and the places added to it later (plain script, after districts.js)
// ============================================================================
// makeWorld() calls extras() after districts() with its lists. What has to be known before the world is made (the lamps
// for the uniform block, the places the forest keeps out of) is set up here at the top level, like districts.js does.

function extras(o) {
  const { solid, reg, boxes, rects, grassY } = o;
  const gy = (x, z) => (onStreet(x, z) ? ST_Y : max(grassY(x, z), abs(x) > CORE || abs(z) > CORE ? (z < RAILZ + 6 ? RAILY : 0) : 0));
  const hit = (x, z, r, from = 0) => { for (let i = from; i < boxes.length; i++) { const h = boxes[i]; if (x > h[0] - r && x < h[2] + r && z > h[1] - r && z < h[3] + r) return true; } return false; };
  const houses = BLD.length;

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
