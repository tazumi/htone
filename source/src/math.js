// ============================================================================
// math + procedural helpers (load-time only unless noted)
// ============================================================================
const { sin, cos, sqrt, min, max, abs, floor, PI, pow, atan2, hypot, exp, round, tan } = Math;
const TAU = PI * 2;
let _seed = 20261119;
const rnd = () => {
  _seed = (_seed + 0x6D2B79F5) | 0;
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rr = (a, b) => a + (b - a) * rnd();
const pick = (a) => a[rnd() * a.length | 0];
// each generator system starts its own random stream, so the systems stay independent
const rseed = (s) => { _seed = (20261119 + Math.imul(s, 7919)) | 0; };
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const mix = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const fract = (x) => x - floor(x);

const ihash = (x, y, z) => {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const vnoise = (x, y, z) => {
  const ix = floor(x), iy = floor(y), iz = floor(z);
  let fx = x - ix, fy = y - iy, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const a = mix(mix(ihash(ix, iy, iz), ihash(ix + 1, iy, iz), fx), mix(ihash(ix, iy + 1, iz), ihash(ix + 1, iy + 1, iz), fx), fy);
  const b = mix(mix(ihash(ix, iy, iz + 1), ihash(ix + 1, iy, iz + 1), fx), mix(ihash(ix, iy + 1, iz + 1), ihash(ix + 1, iy + 1, iz + 1), fx), fy);
  return mix(a, b, fz);
};
const fbm = (x, y, z, o = 4) => {
  let a = 0.5, s = 0;
  for (let i = 0; i < o; i++) { s += a * vnoise(x, y, z); x = x * 2.03 + 17.1; y = y * 2.03 + 31.7; z = z * 2.03 + 5.3; a *= 0.5; }
  return s / (1 - 2 * a);
};

// quaternion helpers (return plain arrays; load-time only)
const qAxis = (x, y, z, a) => { const l = hypot(x, y, z) || 1, s = sin(a / 2) / l; return [x * s, y * s, z * s, cos(a / 2)]; };
const qMul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const qYaw = (a) => [0, sin(a / 2), 0, cos(a / 2)];
// turns the local point (x, z) by yaw about the vertical, the same way qYaw does
const rotY = (x, z, a) => [x * cos(a) + z * sin(a), -x * sin(a) + z * cos(a)];

// world grid: the town, 1152 m square, ground at y = 0, north is -z; the estate is the 384 m square in its middle
// (CORE: its half size), where the ground map is finer
const OX = -576, OZ = -576, WORLD = 1152, CORE = 192, WE = 570; // WE: how far the camera may go from the middle
const CELLS = 48, CELLW = 24; // culling grid over XZ
const ZW = 96, ZN_ = 12, NZONE = 1 + 3 * ZN_ * ZN_; // zones the solids are drawn by (world.js), ZW metres square
const WDX = 0.553, WDZ = 0.833; // the wind blows from the north-west
const MAPW = 1280, MAPH = 768, LGN = WORLD / 6; // the ground maps' texture; the lamp grid, 6 m squares

// material ids, stored per vertex (see Mesh.v) and switched on in the solid shader
const M_ASPH = 0, M_BRICK = 1, M_PANEL = 2, M_PAINT = 3, M_GLASS = 4, M_DARK = 5, M_BARK = 6, M_TINT = 7, M_LAMP = 8, M_METAL = 9,
  M_CONC = 10, M_RED = 11, M_SOIL = 12, M_LENS = 13, M_YEL = 14, M_GRN = 15;

// ---------------------------------------------------------------- mesh builder (solid vertex format: f32x3 pos, snorm8x4 normal+aux)
// aux packs the current material (4 bits) with a 3-bit shade: ambient occlusion, or the sway weight on trees and wires.
// at() sets a placement (offset + yaw) for the vertices that follow, so parts are written in their own coordinates.
class Mesh {
  constructor() { this.p = []; this.i = []; this.aux = []; this.m = 0; this.at(0, 0, 0); }
  at(x, y, z, yaw = 0) { this.tx = x; this.ty = y; this.tz = z; this.c = cos(yaw); this.s = sin(yaw); return this; }
  mat(m) { this.m = m; return this; }
  v(x, y, z, ao = 1) {
    this.p.push(this.tx + x * this.c + z * this.s, this.ty + y, this.tz - x * this.s + z * this.c);
    this.aux.push((this.m * 8 + round(clamp(ao, 0, 1) * 7)) / 127); return this.p.length / 3 - 1;
  }
  tri(a, b, c) { this.i.push(a, b, c); }
  quad(a, b, c, d) { this.i.push(a, b, c, a, c, d); }
  // flat quad with its own vertices (hard edges); o: shade per corner or one for all
  q4(a, b, c, d, o = 1) {
    const s = (k) => (o.length ? o[k] : o);
    this.quad(this.v(a[0], a[1], a[2], s(0)), this.v(b[0], b[1], b[2], s(1)), this.v(c[0], c[1], c[2], s(2)), this.v(d[0], d[1], d[2], s(3)));
  }
  // axis-aligned box; skip: bit mask of faces to leave out (1 -x, 2 +x, 4 -y, 8 +y, 16 -z, 32 +z); a0 / a1: shade at the bottom / top
  box(x0, y0, z0, x1, y1, z1, skip = 0, a0 = 1, a1 = 1) {
    const s = [a0, a0, a1, a1];
    if (!(skip & 1)) this.q4([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], s);
    if (!(skip & 2)) this.q4([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], s);
    if (!(skip & 4)) this.q4([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], a0);
    if (!(skip & 8)) this.q4([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], a1);
    if (!(skip & 16)) this.q4([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], s);
    if (!(skip & 32)) this.q4([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], s);
  }
  // box-section sweep along a polyline; faces get their own vertices (hard edges)
  sweep(pts, w, h, upFn, caps = true, ao = 1) {
    const rings = [];
    for (let k = 0; k < pts.length; k++) {
      const p = pts[k], a = pts[max(k - 1, 0)], b = pts[min(k + 1, pts.length - 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2]; const tl = hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      const u0 = upFn ? upFn(p, k) : abs(ty) > 0.95 ? [1, 0, 0] : [0, 1, 0];
      let sx = u0[1] * tz - u0[2] * ty, sy = u0[2] * tx - u0[0] * tz, sz = u0[0] * ty - u0[1] * tx; const sl = hypot(sx, sy, sz) || 1; sx /= sl; sy /= sl; sz /= sl;
      const ux = ty * sz - tz * sy, uy = tz * sx - tx * sz, uz = tx * sy - ty * sx;
      const ww = typeof w === 'function' ? w(k) : w, hh = typeof h === 'function' ? h(k) : h;
      const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([e, f]) => [p[0] + sx * e * ww / 2 + ux * f * hh / 2, p[1] + sy * e * ww / 2 + uy * f * hh / 2, p[2] + sz * e * ww / 2 + uz * f * hh / 2]);
      const r = [];
      for (let s = 0; s < 4; s++) { r.push(this.v(...c[s], ao), this.v(...c[(s + 1) % 4], ao)); }
      rings.push(r);
      if (caps && (k === 0 || k === pts.length - 1)) {
        const q = c.map((cc) => this.v(...cc, ao));
        if (k === 0) this.quad(q[0], q[1], q[2], q[3]); else this.quad(q[3], q[2], q[1], q[0]);
      }
    }
    for (let k = 0; k < rings.length - 1; k++) for (let s = 0; s < 4; s++) {
      const a = rings[k][s * 2], b = rings[k][s * 2 + 1], c = rings[k + 1][s * 2 + 1], d = rings[k + 1][s * 2];
      this.quad(a, d, c, b);
    }
  }
  // straight bar between two points
  bar(a, b, w, h = w, ao = 1) { this.sweep([a, b], w, h, null, true, ao); }
  // round tube along a polyline with a radius function; caps: 1 start, 2 end
  tube(pts, rad, sides = 6, caps = 2, auxFn = null) {
    const rings = [];
    let ux = 0.31, uy = 0.9, uz = 0.3;
    for (let k = 0; k < pts.length; k++) {
      const p = pts[k], a = pts[max(k - 1, 0)], b = pts[min(k + 1, pts.length - 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2]; const tl = hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      let sx = uy * tz - uz * ty, sy = uz * tx - ux * tz, sz = ux * ty - uy * tx; const sl = hypot(sx, sy, sz) || 1; sx /= sl; sy /= sl; sz /= sl;
      ux = ty * sz - tz * sy; uy = tz * sx - tx * sz; uz = tx * sy - ty * sx;
      const r = typeof rad === 'function' ? rad(k) : rad, ring = [];
      for (let s = 0; s < sides; s++) { const an = s / sides * TAU; ring.push(this.v(p[0] + (sx * cos(an) + ux * sin(an)) * r, p[1] + (sy * cos(an) + uy * sin(an)) * r, p[2] + (sz * cos(an) + uz * sin(an)) * r, auxFn ? auxFn(k) : 1)); }
      rings.push(ring);
    }
    for (let k = 0; k < rings.length - 1; k++) for (let s = 0; s < sides; s++) {
      const s2 = (s + 1) % sides; this.quad(rings[k][s], rings[k][s2], rings[k + 1][s2], rings[k + 1][s]);
    }
    const n = pts.length - 1;
    if (caps & 2) { const e = pts[n], c = this.v(e[0], e[1], e[2], auxFn ? auxFn(n) : 1), r = rings[n].map((q) => this.dup(q)); for (let s = 0; s < sides; s++) this.tri(r[s], r[(s + 1) % sides], c); }
    if (caps & 1) { const e = pts[0], c = this.v(e[0], e[1], e[2], auxFn ? auxFn(0) : 1), r = rings[0].map((q) => this.dup(q)); for (let s = 0; s < sides; s++) this.tri(r[(s + 1) % sides], r[s], c); }
  }
  // copy of vertex k (already placed), for a face that needs its own normal
  dup(k) { this.p.push(this.p[k * 3], this.p[k * 3 + 1], this.p[k * 3 + 2]); this.aux.push(this.aux[k]); return this.p.length / 3 - 1; }
  // returns {vb: ArrayBuffer, ib: Uint32Array}; normals area-weighted; aux -> normal.w
  build() {
    const n = this.p.length / 3, P = this.p, I = this.i, N = new Float32Array(n * 3);
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const k of [a, b, c]) { N[k] += nx; N[k + 1] += ny; N[k + 2] += nz; }
    }
    const vb = new ArrayBuffer(n * 16), f = new Float32Array(vb), s = new Int8Array(vb);
    for (let k = 0; k < n; k++) {
      const nx = N[k * 3], ny = N[k * 3 + 1], nz = N[k * 3 + 2], l = hypot(nx, ny, nz) || 1;
      f[k * 4] = P[k * 3]; f[k * 4 + 1] = P[k * 3 + 1]; f[k * 4 + 2] = P[k * 3 + 2];
      s[k * 16 + 12] = round(nx / l * 127); s[k * 16 + 13] = round(ny / l * 127); s[k * 16 + 14] = round(nz / l * 127); s[k * 16 + 15] = round(this.aux[k] * 127);
    }
    return { vb, ib: new Uint32Array(I), nv: n };
  }
}
