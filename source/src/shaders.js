// ============================================================================
// WGSL sources
// ============================================================================
const fl = (x) => (Number.isInteger(x) ? x + '.' : '' + x); // a JS number as a WGSL float literal
const TANL = 2.2, ZN = 1, ZF = 60; // every street lamp's shadow tile looks straight down: tan of its half angle, depth range
const GRAIN = 0.03; // film grain in the final image
const v3 = (a) => `vec3f(${a.map(fl).join(',')})`;

const W_NOISE = /*wgsl*/`
fn ss(a: f32, b: f32, x: f32) -> f32 { let t = clamp((x - a) / (b - a), 0., 1.); return t * t * (3. - 2. * t); }
fn h31(p: vec3f) -> f32 { var q = fract(p * vec3f(.1031, .1030, .0973)); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
fn h33(p: vec3f) -> vec3f { var q = fract(p * vec3f(.1031, .1030, .0973)); q += dot(q, q.yxz + 33.33); return fract((q.xxy + q.yxx) * q.zyx); }
`;

// ---------------------------------------------------------------- fullscreen helpers
const W_FS = /*wgsl*/`
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f { return vec4f(f32(i32(i & 1u) * 4 - 1), f32(i32(i >> 1u) * 4 - 1), 0., 1.); }
`;

// detail texture (tileable), the grain of every material: rg = slope, b = height, a = mottling
const W_DETAIL = W_NOISE + W_FS + /*wgsl*/`
fn hp(p: vec2f, per: f32) -> f32 { return h31(vec3f(p - per * floor(p / per), per)); }
fn tn(p: vec2f, per: f32) -> f32 {
  let i = floor(p); let f = fract(p); let u = f * f * (3. - 2. * f);
  return mix(mix(hp(i, per), hp(i + vec2f(1., 0.), per), u.x), mix(hp(i + vec2f(0., 1.), per), hp(i + vec2f(1., 1.), per), u.x), u.y);
}
fn tf(uv: vec2f, per: f32, n: i32) -> f32 { var a = .5; var s = 0.; var pr = per; for (var i = 0; i < n; i++) { s += a * tn(uv * pr + f32(i) * 7.3, pr); pr *= 2.; a *= .5; } return s / (1. - 2. * a); }
fn tw(p: vec2f, per: f32) -> vec3f {
  let i = floor(p); let f = fract(p); var d = vec2f(9.); var id = 0.;
  for (var x = -1; x <= 1; x++) { for (var y = -1; y <= 1; y++) {
    let o = vec2f(f32(x), f32(y)); let c = i + o; let cw = c - per * floor(c / per);
    let hh = h33(vec3f(cw, per)); let r = o + hh.xy - f; let l = dot(r, r);
    if (l < d.x) { d.y = d.x; d.x = l; id = hh.z; } else if (l < d.y) { d.y = l; }
  } }
  return vec3f(sqrt(d), id);
}
fn H(uv: vec2f) -> f32 {
  let wq = uv + .11 * (vec2f(tf(uv, 3., 4), tf(uv + .5, 3., 4)) - .5);
  let f = tf(wq, 3., 8);
  let r1 = 1. - abs(tf(wq + 1.7, 5., 6) * 2. - 1.);
  let cr = min(abs(tf(wq + 4.1, 4., 5) * 2. - 1.) * 7., 1.);
  let cr2 = min(abs(tf(wq.yx + 2.3, 9., 4) * 2. - 1.) * 9., 1.);
  let pt = tw(wq * 29., 29.);
  let pit = (1. - ss(.0, .34, pt.x)) * step(.62, pt.z);
  return f * .50 + r1 * r1 * .24 + cr * cr2 * .26 - pit * .07;
}
@fragment fn fs(@builtin(position) fc: vec4f) -> @location(0) vec4f {
  let uv = fc.xy / 1024.; let e = 1. / 1024.;
  let h = H(uv);
  let gx = H(uv + vec2f(e, 0.)) - H(uv - vec2f(e, 0.)); let gy = H(uv + vec2f(0., e)) - H(uv - vec2f(0., e));
  let s = clamp(vec2f(gx, gy) * 1024. * .5 * .075, vec2f(-1.), vec2f(1.));
  return vec4f(-s * .5 + .5, h, tf(uv + 3.7, 3., 5));
}
`;

// blit / mip / bloom chain
const W_BLIT = W_FS + /*wgsl*/`
@group(0) @binding(0) var t: texture_2d<f32>;
@group(0) @binding(1) var s: sampler;
fn uvOf(fc: vec4f, k: f32) -> vec2f { return fc.xy * k / vec2f(textureDimensions(t)); }
@fragment fn fsMip(@builtin(position) fc: vec4f) -> @location(0) vec4f { return textureSampleLevel(t, s, uvOf(fc, 2.), 0.); }
fn kar(c: vec3f) -> vec4f { let w = 1. / (1. + max(c.r, max(c.g, c.b))); return vec4f(c * w, w); }
@fragment fn fsDown0(@builtin(position) fc: vec4f) -> @location(0) vec4f {
  let uv = uvOf(fc, 2.); let e = 1. / vec2f(textureDimensions(t));
  let a = kar(min(textureSampleLevel(t, s, uv + e * vec2f(-1., -1.), 0.).rgb, vec3f(24.)));
  let b = kar(min(textureSampleLevel(t, s, uv + e * vec2f(1., -1.), 0.).rgb, vec3f(24.)));
  let c = kar(min(textureSampleLevel(t, s, uv + e * vec2f(-1., 1.), 0.).rgb, vec3f(24.)));
  let d = kar(min(textureSampleLevel(t, s, uv + e * vec2f(1., 1.), 0.).rgb, vec3f(24.)));
  let m = a + b + c + d;
  return vec4f(m.rgb / m.a, 1.);
}
@fragment fn fsDown(@builtin(position) fc: vec4f) -> @location(0) vec4f {
  let uv = uvOf(fc, 2.); let e = 1. / vec2f(textureDimensions(t));
  return (textureSampleLevel(t, s, uv + e * vec2f(-1., -1.), 0.) + textureSampleLevel(t, s, uv + e * vec2f(1., -1.), 0.)
        + textureSampleLevel(t, s, uv + e * vec2f(-1., 1.), 0.) + textureSampleLevel(t, s, uv + e * vec2f(1., 1.), 0.)) * .25;
}
@fragment fn fsUp(@builtin(position) fc: vec4f) -> @location(0) vec4f {
  let uv = uvOf(fc, .5); let e = .75 / vec2f(textureDimensions(t));
  return (textureSampleLevel(t, s, uv + e * vec2f(-1., -1.), 0.) + textureSampleLevel(t, s, uv + e * vec2f(1., -1.), 0.)
        + textureSampleLevel(t, s, uv + e * vec2f(-1., 1.), 0.) + textureSampleLevel(t, s, uv + e * vec2f(1., 1.), 0.)) * .25;
}
`;

// ---------------------------------------------------------------- shared scene code
// G: view-projection, camera (w = time), camera basis, resolution, mis (exposure, haze strength, draw distance, gust),
// wind (travelled offset, strength), pap (paper travel, drifting snow travel), tr (passenger train x, direction, present),
// tr2 (freight train x, direction, present), pl (aeroplane x, z, heading, present), ev (events: the ambulance's lights,
// the level crossing, seconds into a salute or -1, a car alarm), rc (vehicles on the highway: x, direction, present,
// kind), lamps (position + reach, colour + shadow tile or -1)
const S_G = /*wgsl*/`
struct Lamp { p: vec4f, c: vec4f };
struct G { vp: mat4x4f, cam: vec4f, right: vec4f, up: vec4f, fwd: vec4f, res: vec4f, mis: vec4f, wind: vec4f, pap: vec4f, tr: vec4f, tr2: vec4f, pl: vec4f, ev: vec4f, hn: vec4f, hz: array<vec4f, 12>, rc: array<vec4f, ${NRC}>, lamp: array<Lamp, ${LAMPS.length}> };
const SIG = .0105;
const FCOL = vec3f(.036, .027, .020);
const WDIR = vec3f(${WDX}, 0., ${WDZ});
const TANL = ${fl(TANL)};
const ZN = ${fl(ZN)};
const ZF = ${fl(ZF)};
const TAU = 6.2831853;
const LOW = ${LV > 1};
fn sat(x: f32) -> f32 { return clamp(x, 0., 1.); }
fn ss(a: f32, b: f32, x: f32) -> f32 { let t = clamp((x - a) / (b - a), 0., 1.); return t * t * (3. - 2. * t); }
fn ign(p: vec2f) -> f32 { return fract(52.9829189 * fract(dot(p, vec2f(.06711056, .00583715)))); }
fn hs(x: f32) -> f32 { return fract(sin(x * 127.1) * 43758.5453); }
fn h33(p: vec3f) -> vec3f { var q = fract(p * vec3f(.1031, .1030, .0973)); q += dot(q, q.yxz + 33.33); return fract((q.xxy + q.yxx) * q.zyx); }
fn hue(h: f32) -> vec3f { return .5 + .5 * cos(TAU * (h + vec3f(0., .33, .67))); }
fn fin(c: vec3f) -> vec4f { return vec4f(min(max(c, vec3f(0.)), vec3f(60.)), 1.); }
// the haze lit by the town, brightest towards the horizon
fn fogc(rd: vec3f) -> vec3f { let h = 1. - abs(rd.y); return FCOL * (.45 + .75 * h * h * h); }
`;

const S_B = S_G + /*wgsl*/`
@group(0) @binding(0) var<uniform> g: G;
@group(0) @binding(1) var sR: sampler;
@group(0) @binding(2) var sC: sampler;
@group(0) @binding(3) var sS: sampler_comparison;
@group(0) @binding(4) var tSh: texture_depth_2d;
@group(0) @binding(5) var tD: texture_2d<f32>;
@group(0) @binding(6) var tM: texture_2d<f32>;
@group(0) @binding(7) var tL: texture_2d<u32>;
@group(0) @binding(8) var tA: texture_2d<f32>;
fn fog(c: vec3f, wp: vec3f) -> vec3f { let v = wp - g.cam.xyz; let d = length(v); let T = exp(-SIG * d); return c * T + fogc(v / d) * (1. - T); }
fn qrot(q: vec4f, v: vec3f) -> vec3f { return v + 2. * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
// the viewer's flat: lamp light from outside gets into a room only through its own window (d: vector to the lamp)
fn inroom(p: vec3f) -> bool { return all(p > ${v3([APTB[0] - 0.1, APTB[1] - 0.1, WINB[2]])}) && all(p < ${v3([APTB[3] + 0.1, APTB[4] + 0.1, APTB[5] + 0.1])}); }
// which room of the flat p is in (APT in world.js), -1 in none
fn rid(p: vec3f) -> i32 {
  var R = array<vec4f, ${APT.length}>(${AFREE.slice(0, APT.length).map((b) => `vec4f(${[b[0] - 0.07, b[2] - 0.07, b[3] + 0.07, b[5] + 0.07].map(fl).join(',')})`).join(', ')});
  for (var k = 0; k < ${APT.length}; k++) { let r = R[k]; if (p.x > r.x && p.x < r.z && p.z > r.y && p.z < r.w) { return k; } }
  return -1;
}
fn through(p: vec3f, d: vec3f, r: i32) -> f32 {
  ${(() => {
    // the kitchen's, the living room's on the yard side, the bedroom's at the back: room, plane z, x0 y0 x1 y1
    const W = [[0, WINB[2], WINB]].concat(AWIN.map(([s, u], j) => { const b = s ? boxW(u - 0.725, RY + 0.95, -11.6, u + 0.725, RY + 2.45, -11.5) : boxW(u - 0.725, RY + 0.95, -0.3, u + 0.725, RY + 2.45, -0.1); return [j ? 4 : 1, s ? b[5] : b[2], b]; }));
    return W.map(([r, z, b]) => `if (r == ${r}) { if (abs(d.z) < .01) { return 0.; } let s = (${fl(z)} - p.z) / d.z; if (s < 0.) { return 0.; }
    let h = p.xy + d.xy * s; let e = min(h - vec2f(${fl(b[0])}, ${fl(b[1])}), vec2f(${fl(b[3])}, ${fl(b[4])}) - h); return ss(-.02, .04, min(e.x, e.y)); }`).join(' ');
  })()}
  return 0.;
}
// where p falls in lamp L's tile of the shadow atlas: uv, depth, 1 when it is inside the tile
fn lsuv(L: Lamp, p: vec3f) -> vec4f {
  let d = p - L.p.xyz; let dz = max(.01, 0. - d.y); let q = d.xz / (dz * TANL); let t = i32(L.c.w);
  let ok = f32(t >= 0 && t < 16 && dz > ZN && max(abs(q.x), abs(q.y)) < .985);
  return vec4f((vec2f(f32(t & 3), f32(t >> 2u)) + vec2f(q.x, 0. - q.y) * .5 + .5) * .25, ZF * (dz - ZN) / ((ZF - ZN) * dz) - .0012, ok);
}
fn lsh(L: Lamp, p: vec3f) -> f32 { let s = lsuv(L, p); if (s.w < .5) { return 1.; } return textureSampleCompareLevel(tSh, sS, s.xy, s.z); }
fn lsh4(L: Lamp, p: vec3f) -> f32 {
  let s = lsuv(L, p); if (s.w < .5) { return 1.; }
  if (LOW) { return textureSampleCompareLevel(tSh, sS, s.xy, s.z); }
  let e = 1.3 / ${SHADOW}.;
  return (textureSampleCompareLevel(tSh, sS, s.xy + vec2f(-e, -e), s.z) + textureSampleCompareLevel(tSh, sS, s.xy + vec2f(e, -e), s.z)
        + textureSampleCompareLevel(tSh, sS, s.xy + vec2f(-e, e), s.z) + textureSampleCompareLevel(tSh, sS, s.xy + vec2f(e, e), s.z)) * .25;
}
// a street lamp throws its light down in a wide cone, a bulb over a door all round; l: unit vector to the lamp
fn lcone(L: Lamp, l: vec3f) -> f32 { return select(.4 + .6 * sat(l.y * 2. + .6), ss(.05, .5, l.y), L.c.w >= 0.); }
fn lid(p: vec3f, k: i32) -> u32 { let c = vec2i(clamp((p.xz + ${fl(-OX)}) / 6., vec2f(0.), vec2f(${LGN - 1}.))); return textureLoad(tL, vec2i(c.x * 2 + (k >> 2u), c.y), 0)[k & 3]; }
// the ground maps (world.js): the estate's fine one, the town's coarse one beside it in the same texture
fn gmap(p: vec2f) -> vec4f {
  var uv = (clamp((p + ${fl(CORE)}) / ${fl(2 * CORE)} * 512., vec2f(.5), vec2f(511.5))) / vec2f(${MAPW}., ${MAPH}.);
  if (max(abs(p.x), abs(p.y)) > ${fl(CORE - 1)}) { uv = (clamp((p + ${fl(-OX)}) / ${fl(WORLD)} * 768., vec2f(.5), vec2f(767.5)) + vec2f(512., 0.)) / vec2f(${MAPW}., ${MAPH}.); }
  return textureSampleLevel(tM, sC, uv, 0.);
}
// lamp light on a surface: diffuse and specular; gl: gloss 0..1
struct LT { d: vec3f, s: vec3f };
fn lit(p: vec3f, n: vec3f, V: vec3f, gl: f32) -> LT {
  var o: LT; o.d = vec3f(0.); o.s = vec3f(0.);
  let ns = exp2(gl * 10.); let rm = inroom(p); let ri = select(-1, rid(p), rm);
  // the lamps of the grid, then in the flat its own lights (tag -2 - room: each lights only its room); those outside get
  // into the flat only through the window of the room
  for (var k = 0; k < 8 + select(0, ${ALAMP.length + 1}, rm); k++) {
    var id = 0u;
    if (k < 8) { id = lid(p, k); if (id > 253u) { k = 7; continue; } } else { id = u32(${TVL} + select(0, ${AL0 - TVL - 1}, k > 8) + k - 8); }
    let L = g.lamp[id]; let d = L.p.xyz - p; let r2 = dot(d, d); let w = sat(1. - r2 / (L.p.w * L.p.w));
    if (w <= 0. || (k >= 8 && f32(ri) != -2. - L.c.w)) { continue; }
    let l = d * inverseSqrt(r2);
    var E = L.c.rgb * (w * w / (r2 + 1.) * lcone(L, l) * select(1., lsh4(L, p + n * .07), k < 8));
    if (rm && k < 8) { E *= through(p, d, ri); }
    let ndl = sat(dot(n, l));
    o.d += E * ndl;
    let h = normalize(l + V); let fr = .04 + .96 * pow(1. - sat(dot(h, V)), 5.);
    o.s += E * (pow(sat(dot(n, h)), ns) * (ns + 8.) * .04 * fr * sat(ndl * 6.));
  }
  return o;
}
// lamp light arriving at a point in the air (snow, steam, grass tips)
fn glow(p: vec3f) -> vec3f {
  var o = vec3f(0.); let ri = select(-1, rid(p), inroom(p));
  for (var k = 0; k < 8 + select(0, ${ALAMP.length + 1}, ri >= 0); k++) {
    var id = 0u;
    if (k < 8) { id = lid(p, k); if (id > 253u) { k = 7; continue; } } else { id = u32(${TVL} + select(0, ${AL0 - TVL - 1}, k > 8) + k - 8); }
    let L = g.lamp[id]; let d = L.p.xyz - p; let r2 = dot(d, d); let w = sat(1. - r2 / (L.p.w * L.p.w));
    if (w <= 0. || (k >= 8 && f32(ri) != -2. - L.c.w)) { continue; }
    o += L.c.rgb * (w * w / (r2 + 1.) * lcone(L, d * inverseSqrt(r2)) * select(1., lsh(L, p), k < 8));
  }
  return o;
}
`;

// ---------------------------------------------------------------- solid meshes (ground, houses, cars, trees, everything built)
const W_SOLID = S_B + /*wgsl*/`
struct VI { @location(0) p: vec3f, @location(1) n: vec4f, @location(2) a: vec4f, @location(3) b: vec4f, @location(4) c: vec4f };
struct VO { @builtin(position) cp: vec4f, @location(0) wp: vec3f, @location(1) n: vec3f, @location(2) op: vec3f, @location(3) on: vec3f,
  @location(4) @interpolate(flat) m: vec4f, @location(5) @interpolate(flat) mat: i32, @location(6) ao: f32 };
@vertex fn vs(i: VI) -> VO {
  var o: VO;
  let ai = i32(round(i.n.w * 127.)); let sh = f32(ai & 7) / 7.; let an = i32(i.c.w + .5); let live = g.res.x > 0.; let t = g.cam.w;
  var p = i.p * i.a.w;
  if (an == 3 && live) {
    // a swing: turns about the bar it hangs from, harder in a gust
    let a = (.07 + .3 * g.wind.w) * sin(t * 1.95 + i.c.y * 9.); let q = p.yz - vec2f(2.15, 0.);
    p = vec3f(p.x, 2.15 + q.x * cos(a) - q.y * sin(a), q.x * sin(a) + q.y * cos(a));
  }
  if (an == 6 && live && p.y < .06 && p.z > 0.) {
    // somebody sitting on a roof edge swings the legs over the drop, one after the other
    let a = .22 * sin(t * 1.7 + i.c.y * 7. + sign(p.x) * 1.4) + .1; let q = p.yz - vec2f(.08, .05);
    p = vec3f(p.x, .08 + q.x * cos(a) - q.y * sin(a), .05 + q.x * sin(a) + q.y * cos(a));
  }
  var nl = i.n.xyz;
  if (an == 7) {
    // somebody walking to and fro along the instance's +z: tex scale = path length + speed / 10, seed = phase; on the
    // way back the figure is turned round. The legs (below .45 m, near the body) step, except on a bicycle (speed 3 and more)
    let L = floor(i.c.z); let v = fract(i.c.z) * 10.; let u = fract(t * v / (2. * L) + i.c.y); let back = u > .5;
    if (v < 3. && p.y < .45 && abs(p.z) < .3 && live) { let a = .42 * sin(t * v * 4.4 + select(0., 3.1416, p.x > 0.)); let q = p.yz - vec2f(.5, 0.); p = vec3f(p.x, .5 + q.x * cos(a) - q.y * sin(a), q.x * sin(a) + q.y * cos(a)); }
    if (back) { p = vec3f(0. - p.x, p.y, 0. - p.z); nl = vec3f(0. - nl.x, nl.y, 0. - nl.z); }
    p.z += L * select(u * 2., 2. - u * 2., back) * f32(live);
  }
  if (an == 12 && live) {
    // somebody standing about: the weight goes from foot to foot, the chest rises with the breath, the head turns to look
    // round now and then. Tex scale = the neck's height, + 10 for the two talkers (at z -.5 and +.5, face to face), who
    // take turns: the one talking nods along and the man waves his raised hand
    let pair = i.c.z > 5.; let nk = (i.c.z - select(0., 10., pair)) * i.a.w; let ph = fract(i.c.y) * 40.;
    let who = select(1., sign(p.z), pair); let pz = select(0., who * .5, pair); let ph2 = ph + who * 1.7;
    let talk = select(0., ss(.1, .5, sin(t * .37 + ph) * who), pair);
    let h = max(p.y, 0.);
    p.x += (.02 * sin(t * .5 + ph2) + .007 * sin(t * 1.3 + ph2 * 2.)) * h;
    p.y *= 1. + .005 * sin(t * 1.9 + ph2);
    if (p.y > nk) {
      let ya = .5 * sin(t * .21 + ph2 * 3.) * ss(.2, .8, sin(t * .13 + ph2)) * (1. - talk);
      var q = vec3f(p.x, p.y - nk, p.z - pz); q = vec3f(q.x * cos(ya) + q.z * sin(ya), q.y, q.z * cos(ya) - q.x * sin(ya));
      q.z -= who * q.y * .25 * talk * max(sin(t * 5.3 + ph2), 0.);
      p = vec3f(q.x, q.y + nk, q.z + pz);
    }
    if (pair && who < 0. && p.x > .2 && p.y > .9) {
      let a = talk * .3 * sin(t * 3.1 + ph); let q = p.yz - vec2f(1.42, -.5);
      p = vec3f(p.x, 1.42 + q.x * cos(a) - q.y * sin(a), -.5 + q.x * sin(a) + q.y * cos(a));
    }
  }
  if (an == 8 && live) {
    // the roundabout: pushed round a little by the wind and left to drift back
    let a = .9 * sin(t * .09 + i.c.y * 5.) + .35 * sin(t * .23); p = vec3f(p.x * cos(a) - p.z * sin(a), p.y, p.x * sin(a) + p.z * cos(a)); nl = vec3f(nl.x * cos(a) - nl.z * sin(a), nl.y, nl.x * sin(a) + nl.z * cos(a));
  }
  if (an == 9 && live) {
    // a flag on its pole (cloth along +x from the pole): hangs down in a calm, flies and ripples out in the wind
    let gu = g.wind.w; let k = p.x / 2.4; let hang = (1. - ss(.1, .6, gu)) * 1.25; let ph = i.c.y * 9.;
    let rp = sin(p.x * 2.4 - t * (4. + 6. * gu) + ph) * (.06 + .3 * gu) * k + sin(p.x * 5.1 - t * 9. + ph) * .04 * gu * k;
    p = vec3f(p.x * cos(hang), p.y - p.x * sin(hang), p.z + rp);
  }
  if ((an == 10 || an == 11) && live) {
    // an animal crossing the forest along its +z now and then (tex scale = path length + speed / 10; seed = hip height
    // in cm + phase): out of sight below the ground on the way back. A runner swings its legs (below the hip) in a
    // gallop, a hare (11) bounds along
    let L = floor(i.c.z); let v = fract(i.c.z) * 10.; let hip = floor(i.c.y) * .01; let u = fract(t * v / (2. * L) + fract(i.c.y));
    let st = t * v * select(2.6, 1.7, an == 11) + i.c.y * 7.;
    if (an == 10 && p.y < hip) { let a = .55 * sin(st + select(0., 3.1416, p.z > 0.) + select(0., .6, p.x > 0.)); let dy = p.y - hip; p = vec3f(p.x, hip + dy * cos(a), p.z + dy * sin(a)); }
    p.y += select(.05 * hip * abs(sin(st)), .32 * abs(sin(st)), an == 11) - select(0., 60., u > .5);
    p.z += 2. * L * u;
  }
  var w = i.a.xyz + qrot(i.b, p); var nw = qrot(i.b, nl);
  if (an == 4) {
    // the freight train: laid out from its nose at x = 0 towards -x, turned round when it runs the other way
    let d = g.tr2.y; w = vec3f(g.tr2.x + d * w.x, w.y - select(0., 60., g.tr2.z < .5), ${fl(RAILZ)} + d * (w.z - ${fl(RAILZ)})); nw = vec3f(d * nw.x, nw.y, d * nw.z);
  }
  if (an == 5) {
    // a vehicle on the highway: its slot (seed) carries it, and only the kind the slot sends now (tex scale) is shown
    let r = g.rc[u32(i.c.y + .5)]; let d = r.y;
    w = vec3f(r.x + d * w.x, w.y - select(0., 60., r.z < .5 || abs(r.w - i.c.z) > .5), ${fl(ROADZ)} - 1.8 * d + d * w.z); nw = vec3f(d * nw.x, nw.y, d * nw.z);
  }
  if (an == 1 && live) {
    // trees and wires: the shade bits are the sway weight, 0 at the trunk
    let ph = dot(i.a.xz, vec2f(.13, .09)) + i.c.y * 20.; let k = sh * sh; let gu = g.wind.w;
    w += WDIR * (k * (.04 + .34 * gu) * (.6 + .5 * sin(t * 1.1 + ph + w.y * .2)))
       + vec3f(sin(t * 3.7 + ph * 3. + w.y), .3 * cos(t * 4.3 + ph * 2. + w.x), cos(t * 3.1 + ph * 2.3 + w.y * 1.3)) * (k * sh * (.01 + .05 * gu));
  }
  if (an == 2) { w.x += g.tr.x; if (g.tr.z < .5) { w.y -= 60.; } }
  o.cp = g.vp * vec4f(w, 1.); o.wp = w; o.n = nw; o.op = i.p * i.a.w; o.on = i.n.xyz;
  o.m = i.c; o.mat = ai >> 3u; o.ao = select(sh, 1., an == 1);
  return o;
}
fn pal(i: f32) -> vec3f {
  var P = array<vec3f, 16>(vec3f(.50, .50, .49), vec3f(.36, .37, .38), vec3f(.09, .095, .10), vec3f(.018, .018, .02), vec3f(.03, .05, .14), vec3f(.30, .03, .035),
    vec3f(.38, .33, .24), vec3f(.03, .09, .06), vec3f(.16, .09, .05), vec3f(.11, .05, .035), vec3f(.14, .19, .24), vec3f(.08, .16, .30),
    vec3f(.04, .10, .07), vec3f(.50, .50, .47), vec3f(.35, .06, .04), vec3f(.50, .20, .03));
  return P[u32(clamp(i, 0., 15.) + .5)];
}
@fragment fn fs(i: VO, @builtin(front_facing) ff: bool) -> @location(0) vec4f {
  let fl_ = select(-1., 1., ff); let on = normalize(i.on) * fl_; let n0 = normalize(i.n) * fl_;
  let V0 = g.cam.xyz - i.wp; let dist = length(V0); let V = V0 / dist; let sd = i.m.y; let mat = i.mat;
  // wall coordinates in the object's own frame: along the wall, up
  let wu = vec2f(select(i.op.x, i.op.z, abs(on.x) > abs(on.z)), i.op.y); let fw = fwidth(wu);
  let gm = gmap(i.wp.xz);
  // three scales of the detail texture over the ground, turned against each other so no tiling shows from above
  let dA = textureSample(tD, sR, i.wp.xz * .083); let dB = textureSample(tD, sR, vec2f(i.wp.x * .8 - i.wp.z * .6, i.wp.x * .6 + i.wp.z * .8) * .27 + .37);
  let wA = textureSample(tD, sR, wu * .06 + sd); let wB = textureSample(tD, sR, wu * .8 + sd * 3.);
  let wS = textureSample(tD, sR, vec2f(wu.x * .31, wu.y * .028) + sd * 5.); let dC = textureSample(tD, sR, vec2f(i.wp.x * .6 + i.wp.z * .8, i.wp.z * .6 - i.wp.x * .8) * 1.9 + .11);
  var alb = vec3f(.2); var gl = .15; var emi = vec3f(0.); var ao = i.ao; var bump = .3; var snowK = 1.; var cov = .3 + .3 * dB.a + .3 * dC.b;
  let flt = abs(n0.y) > .7;
  switch mat {
    case 0 {
      // wet asphalt: grain, slow tone changes, cracks, puddles in the hollows
      alb = vec3f(.036, .035, .034) * mix(1., .8 + .4 * dC.b, ss(30., 5., dist)) * (.7 + .6 * dB.b) * (.75 + .5 * dA.b);
      alb *= 1. - .5 * (1. - ss(.0, .02, abs(dB.a - .52))) * ss(40., 8., dist);
      let pud = gm.a * ss(.42, .6, dA.b + dB.a * .3);
      gl = mix(mix(.42, .66, ss(.3, .7, dA.a)), .97, pud); alb *= mix(1., .5, pud); bump = mix(.35 * ss(50., 6., dist), .015, pud);
      ao *= gm.r; snowK = .1 * (1. - pud); cov = gm.g * .55 + dB.a * .35 - .2 - gm.b * .5;
    }
    case 12 {
      // lawn: dead grass, bare earth, the paths people walk
      alb = mix(vec3f(.050, .045, .022), vec3f(.075, .068, .030), dA.a) * (.5 + 1. * dC.b);
      alb = mix(alb, vec3f(.036, .029, .021) * (.6 + .8 * dB.a), max(gm.b, ss(.55, .72, dA.b) * .6));
      gl = .1; bump = 1.2; ao *= .45 + .55 * gm.r; cov = gm.g * .42 + dB.a * .34 + dC.b * .34 + (dA.b - .5) * .3 - gm.b * .6 - .04; snowK = select(.0, 1., n0.y > .5);
    }
    case 1 {
      // brick: courses of 10 cm, every other one shifted by half a brick; the pattern fades into its mean far away
      let bs = vec2f(.26, .1); let row = floor(wu.y / bs.y); let bu = wu.x / bs.x + .5 * (row - 2. * floor(row * .5));
      let f = vec2f(fract(bu), fract(wu.y / bs.y)); let fb = fw / bs; let lod = sat(1. - max(fb.x, fb.y) * 1.2);
      let mo = mix(.86, ss(.0, .05 + fb.x, min(f.x, 1. - f.x)) * ss(.0, .12 + fb.y, min(f.y, 1. - f.y)), lod);
      let bh = mix(.5, hs(floor(bu) * 3.1 + row * 17.7 + sd * 5.), lod);
      let bc = select(vec3f(.36, .33, .26), vec3f(.20, .075, .05), sd >= .5) * (.7 + .6 * bh);
      alb = mix(vec3f(.19, .18, .16), bc, mo) * (.7 + .5 * wA.a) * mix(1., .55, ss(.5, .74, wS.a)) * (.7 + .3 * ss(.0, 3., i.wp.y));
      gl = .1; bump = .5 * lod;
    }
    case 2 {
      // concrete panels: one per bay and storey, dark seams between them
      let bw = max(i.m.z, 1.); let pu = wu.x / bw; let pv = (wu.y - .9) / ${fl(FH)};
      let sx = (.5 - abs(fract(pu) - .5)) * bw; let sy = (.5 - abs(fract(pv) - .5)) * ${fl(FH)};
      let lod = sat(1. - max(fw.x, fw.y) * 6.);
      let seam = mix(.96, min(ss(.0, .03 + fw.x, sx), ss(.0, .03 + fw.y, sy)), lod);
      let ph = hs(floor(pu) * 5.3 + floor(pv) * 11.1 + sd * 9.);
      alb = vec3f(.21, .21, .20) * (.8 + .3 * ph) * (.7 + .5 * wA.b) * (.82 + .36 * wB.b) * mix(.4, 1., seam) * mix(1., .6, ss(.52, .78, wS.a));
      alb = mix(alb, alb * vec3f(.6, .78, .9), step(.86, ph));
      if (sd >= 2.) {
        // the new towers: smooth panels in bands of colour, a few odd ones out
        let C = array<vec3f, 6>(vec3f(.46, .46, .44), vec3f(.30, .31, .32), vec3f(.36, .13, .07), vec3f(.42, .31, .09), vec3f(.10, .10, .11), vec3f(.09, .22, .24));
        let band = hs(floor(pu * .5) * 3.7 + sd * 11.); let odd = step(.8, ph);
        let ci = u32(select(band * 3.99, 1.99 + ph * 3.99, odd > .5)) % 6u;
        alb = C[ci] * (.88 + .2 * wA.b) * mix(.55, 1., seam); gl = .3;
      }
      gl = max(gl, .08); bump = .4;
    }
    case 3 { alb = pal(i.m.x) * mix(.5, 1., ss(.25, .75, i.op.y)) * (.8 + .3 * dB.b); gl = .9; bump = .05; cov = fract(sd * 7.7) * .5 + dB.a * .4 + dC.b * .35 - .12; snowK = .9; }
    case 4 { alb = vec3f(.012); gl = .97; bump = .0; cov = fract(sd * 7.7) * .5 + dB.a * .4 + dC.b * .35 - .2; snowK = .8; }
    case 5 { alb = vec3f(.018) * (.6 + .8 * dB.b); gl = .25; }
    case 6 {
      // bark; birches (palette 1) are white with black scars on trunk and boughs
      alb = mix(vec3f(.030, .025, .020), vec3f(.085, .072, .058), wS.b) * (.6 + .7 * wB.b);
      let thick = ss(.75, .35, i.ao) * f32(abs(i.m.x - 1.) < .1 && i.m.w > .5);
      alb = mix(alb, mix(vec3f(.5, .5, .47), vec3f(.03), ss(.6, .7, wB.a * .6 + wS.a * .5)), thick);
      gl = .12; bump = .6; ao = select(ao, 1., i.m.w > .5); snowK = .8;
      if (sd < -9.5 && flt) {
        // the parquet of the flat (its rooms have seeds -10 and below): oak strips laid in rows, each its own tone
        let q = i.op.xz; let row = floor(q.y / .075); let qx = q.x / .42 + hs(row * 1.7); let fy = fract(q.y / .075); let fx = fract(qx);
        let seam = 1. - ss(.0, .06, min(min(fy, 1. - fy), min(fx, 1. - fx) * .18));
        alb = mix(vec3f(.085, .045, .022), vec3f(.15, .085, .04), hs(row * 3.7 + floor(qx) * 1.3)) * (.8 + .35 * wS.b) * (1. - .55 * seam);
        gl = .55; bump = .04; snowK = 0.;
      }
    }
    case 7 {
      alb = pal(i.m.x) * (.65 + .5 * wA.b) * (.8 + .3 * wB.b); gl = .3;
      if (sd < -9.5) {
        // the rooms of the flat (seed -10 - pattern): wallpaper with stripes, small flowers or a damask, or tiles
        let k = -10. - sd; let q = select(wu, i.op.xz, flt); var pt = 0.;
        if (k < .5) { pt = ss(.36, .42, abs(fract(q.x * 5.) - .5)) + .5 * ss(.1, .06, abs(fract(q.x * 5.) - .5)); }
        else if (k < 1.5) { let c1 = fract(q * 4.) - .5; let c2 = fract(q * 4. + .5) - .5; pt = 1. - ss(.04, .1, min(length(c1), length(c2) * 1.3)); }
        else if (k < 2.5) { let d = min(abs(fract((q.x + q.y) * 2.6) - .5), abs(fract((q.x - q.y) * 2.6) - .5)); let c = fract(q * 2.6) - .5; pt = (1. - ss(.02, .05, d)) * .7 + (1. - ss(.05, .09, length(c))); }
        else { let f = fract(q / .15); pt = 1. - ss(.0, .05, min(min(f.x, 1. - f.x), min(f.y, 1. - f.y))); }
        alb = pal(i.m.x) * (.92 + .16 * wA.b) * mix(1., select(.62, .45, k > 2.5), pt); gl = select(.12, mix(.85, .15, pt), k > 2.5); bump = .03; snowK = 0.;
      }
    }
    case 8 {
      // things that shine: lamp heads (in step with their lamp), the bulbs over the doors, the windows of the train
      alb = vec3f(.02); snowK = 0.;
      if (i.m.w > 1.5) {
        let f = fract(i.op.x / 1.45); let k = floor(i.op.x / 1.45) + sd * 31.;
        emi = vec3f(1.9, 1.3, .62) * (ss(.14, .2, f) * ss(.86, .8, f) * (.55 + .45 * hs(k)) * step(.12, hs(k + .5)));
      } else if (sd < -.5) { emi = vec3f(14., 6.6, 1.9); }
      else { let L = g.lamp[u32(sd + .5)]; emi = L.c.rgb * select(.09, 1.1, L.c.w < 0.); }
    }
    case 9 { alb = mix(vec3f(.16, .165, .17), vec3f(.10, .055, .03), ss(.55, .8, wS.a) * .7) * (.6 + .6 * wA.b); gl = .45; }
    case 10 { alb = select(vec3f(.30, .30, .28) * (.7 + .4 * wA.b) * (.8 + .3 * wB.b) * mix(1., .65, ss(.55, .8, wS.a)), vec3f(.4, .4, .38) * (.94 + .1 * wA.b), sd < -9.5); gl = .1; }
    case 11 { alb = vec3f(.26, .02, .02); gl = .7; }
    case 13 { alb = vec3f(.25, .26, .27); gl = .95; snowK = .3; }
    case 14 { alb = vec3f(.50, .36, .03) * (.7 + .4 * wA.b); gl = .35; }
    default { alb = vec3f(.04, .13, .06) * (.65 + .5 * wA.b); gl = .3; }
  }
  // thin, patchy November snow on whatever faces the sky
  let sn = snowK * ss(.62, .9, n0.y) * ss(.47, .6, cov) * f32(!inroom(i.wp));
  alb = mix(alb, vec3f(.80, .83, .88) * (.8 + .25 * dC.b), sn); gl = mix(gl, .3, sn); bump = mix(bump, .25, sn);
  let tg = normalize(vec3f(n0.z, 0., 0. - n0.x) + vec3f(1e-4, 0., 0.));
  let pb = select((wB.rg - .5), (dC.rg - .5), flt) * bump;
  let N = normalize(n0 + select(tg * pb.x + vec3f(0., pb.y, 0.), vec3f(pb.x, 0., pb.y), flt));
  let L = lit(i.wp, N, V, gl);
  let up = N.y * .5 + .5;
  ao *= select(1., .22, inroom(i.wp));
  var c = alb * (L.d + FCOL * 1.5 * (.35 + .65 * up) * ao) + L.s + emi;
  // glossy things mirror the glowing haze
  c += fogc(reflect(-V, N)) * (ao * gl * gl * (.03 + .97 * pow(1. - sat(dot(N, V)), 5.)) * 1.3);
  return fin(fog(c, i.wp));
}
`;

// ---------------------------------------------------------------- window panes: the frame, the glass, and a room behind it
// One quad per pane. The room is not built: the view ray is followed into a box behind the glass and what it hits is
// painted there (interior mapping). The pane's seed chooses the room: a living room (wallpaper, a carpet on the wall,
// a wall unit with books, pictures, a television, a sofa or a table, people watching), a bedroom (a wardrobe, a bed)
// or a kitchen (tiles, cupboards, a gas stove, a fridge, a table under oilcloth), then the lamp, curtains, plants and
// a radio on the sill.
// Types (low 2 bits): 0 window, 1 balcony glazing, 2 stairwell. Above them a flag set by world.js: 1 lit living room
// with a radio, 2 lit kitchen where somebody cooks, 3 lit living room with people at the television, 4 a cat on the
// sill, 5 a garland round the window, 6 a dark kitchen lit by the open fridge, 7 a flat being done up (bare walls, a
// bulb, a stepladder), 8 a dark room with a lit aquarium, 9 a dark room with somebody at a computer.
const W_WIN = S_B + /*wgsl*/`
struct WI { @location(0) a: vec4f, @location(1) b: vec4f };
struct WO { @builtin(position) cp: vec4f, @location(0) wp: vec3f, @location(1) uv: vec2f, @location(2) @interpolate(flat) nr: vec4f, @location(3) @interpolate(flat) sz: vec4f };
@vertex fn vs(@builtin(vertex_index) vi: u32, i: WI) -> WO {
  var o: WO; let q = vec2f(f32(vi & 1u), f32(vi >> 1u)) * 2. - 1.;
  let n = vec2f(sin(i.a.w), cos(i.a.w)); let r = vec2f(n.y, 0. - n.x);
  let w = i.a.xyz + vec3f(r.x, 0., r.y) * (q.x * i.b.x * .5) + vec3f(0., q.y * i.b.y * .5, 0.);
  o.cp = g.vp * vec4f(w, 1.); o.wp = w; o.uv = q; o.nr = vec4f(n, r); o.sz = i.b;
  return o;
}
// 1 inside the rectangle of half size s around c
fn rect(q: vec2f, c: vec2f, s: vec2f) -> f32 { let d = abs(q - c) - s; return step(max(d.x, d.y), 0.); }
// wallpaper: stripes, little flowers, a lattice, checks, or plain paint with a band; x along the wall, v up
fn paper(x: f32, v: f32, base: vec3f, k: f32, h: f32, pat: f32) -> vec3f {
  var m = 0.;
  if (k < .2) { m = step(.5, fract(x * (4. + 5. * h))); }
  else if (k < .4) { let f = floor(x * 6.); let c = vec2f(fract(x * 6.) - .5, fract(v * 6. + .5 * f) - .5); m = step(length(c), .16) + .6 * step(abs(c.x), .03) * step(abs(c.y + .3), .15); }
  else if (k < .6) { let c = abs(fract(vec2f(x * 3.5 + v * 2.5, x * 3.5 - v * 2.5)) - .5); m = step(.4, max(c.x, c.y)); }
  else if (k < .8) { m = (step(.82, fract(x * 5.)) + step(.82, fract(v * 5.))) * .5; }
  else { m = step(abs(v - 1.05), .05); }
  return base * (1. - .25 * m * pat) + vec3f(.06, .05, .02) * (m * pat * step(.5, h));
}
// a framed picture around c0 with half size s: a landscape, a portrait or a still life
fn picture(q0: vec2f, c0: vec2f, s: vec2f, h: f32) -> vec4f {
  let q = q0 - c0; let e = s - abs(q); if (min(e.x, e.y) < 0.) { return vec4f(0.); }
  if (min(e.x, e.y) < .04) { return vec4f(mix(vec3f(.22, .13, .05), vec3f(.42, .33, .12), step(.5, fract(h * 7.))), 1.); }
  let u = (q + s) / (2. * s); var c = vec3f(0.);
  if (h < .4) {
    c = mix(mix(vec3f(.22, .30, .14), vec3f(.10, .18, .08), u.y * 1.5), mix(vec3f(.50, .60, .72), vec3f(.85, .72, .52), u.y), step(.45 + .06 * sin(u.x * 9. + h * 20.), u.y));
    c = mix(c, vec3f(.95, .85, .55), step(length(u - vec2f(.74, .78)), .07));
  } else if (h < .7) {
    c = mix(vec3f(.30, .18, .10), vec3f(.08, .06, .05), u.y);
    c = mix(c, vec3f(.70, .50, .38), step(length((u - vec2f(.5, .6)) / vec2f(.2, .27)), 1.));
    c = mix(c, vec3f(.12, .10, .09), step(u.y, .32) * step(abs(u.x - .5), .36));
  } else {
    c = mix(vec3f(.14, .2, .28), vec3f(.08, .1, .13), u.y);
    c = mix(c, vec3f(.4, .25, .1), step(length((u - vec2f(.5, .3)) / vec2f(.35, .12)), 1.));
    c = mix(c, vec3f(.75, .15, .1), step(length(u - vec2f(.38, .42)), .13)); c = mix(c, vec3f(.85, .7, .2), step(length(u - vec2f(.6, .4)), .11));
  }
  return vec4f(c, 1.);
}
// the glow of a small light at point b seen along the ray from o in direction d, when it is in front of the hit at tm
fn spot(o: vec3f, d: vec3f, b: vec3f, tm: f32, k: f32) -> f32 { let pl = b - o; let tl = max(dot(pl, d), 0.); let dq = length(pl - d * tl); return exp(-dq * dq * k) * f32(tl < tm); }
@fragment fn fs(i: WO) -> @location(0) vec4f {
  let n = vec3f(i.nr.x, 0., i.nr.y); let r = vec3f(i.nr.z, 0., i.nr.w); let sz = i.sz.xy; let sd = i.sz.z; let tf = i32(i.sz.w + .5); let ty = tf & 3; let fl = tf >> 2u;
  let p = i.uv * sz * .5; let aa = max(fwidth(p.x), fwidth(p.y));
  let V0 = i.wp - g.cam.xyz; let dist = length(V0); let rw = V0 / dist; let t = g.cam.w;
  let dt = textureSample(tD, sR, i.wp.xy * .6 + i.wp.z * .37 + sd);
  let h1 = hs(sd * 91.3 + 1.7); let h2 = hs(sd * 37.7 + 5.1); let h3 = hs(sd * 13.3 + 9.9); let h4 = hs(sd * 57.1 + 3.3); let h5 = hs(sd * 23.9 + 4.4);
  let h6 = hs(sd * 71.9 + 2.2); let h7 = hs(sd * 19.3 + 6.1); let h8 = hs(sd * 43.7 + 8.8);
  // --- frame: the outer one, then the bars of each type
  let e = sz * .5 - abs(p); var d = min(e.x, e.y) - .05;
  if (ty == 1) { let k = sz.x / max(round(sz.x / .62), 1.); d = min(d, abs(fract(p.x / k + .5) - .5) * k - .02); }
  else if (ty == 2) { d = min(d, min(abs(p.x), abs(p.y)) - .022); }
  else if (sz.x > 1.7) { d = min(d, abs(abs(p.x) - sz.x / 6.) - .025); }
  else { let mx = -.14 * sz.x; d = min(d, abs(p.x - mx) - .028); d = min(d, max(abs(p.y - (sz.y * .5 - .42)) - .02, mx - p.x)); }
  let fm = 1. - ss(-aa, aa, d);
  let Lo = lit(i.wp, n, -rw, .93);
  // --- the room: a box in the pane's frame (x right, y up, z inwards)
  var rd = vec3f(dot(rw, r), rw.y, 0. - dot(rw, n)); rd.z = max(rd.z, .03);
  var x0 = -sz.x * .5 - .3 - 1.5 * h2; var x1 = sz.x * .5 + .3 + 1.5 * (1. - h2); var y0 = -sz.y * .5 - .95; var y1 = sz.y * .5 + .28; var z1 = 3. + 2. * h3;
  if (ty == 1) { x0 = -sz.x * .5 - .1; x1 = sz.x * .5 + .1; y0 = -sz.y * .5 - 1.; y1 = sz.y * .5 + .06; z1 = 1.1; }
  if (ty == 2) { x0 = -1.3; x1 = 1.3; y0 = -2.; y1 = 1.4; z1 = 2.6; }
  let tx = (select(x0, x1, rd.x > 0.) - p.x) / select(rd.x, 1e-5, abs(rd.x) < 1e-5);
  let tv_ = (select(y0, y1, rd.y > 0.) - p.y) / select(rd.y, 1e-5, abs(rd.y) < 1e-5);
  let tz = z1 / rd.z; let tm = min(tx, min(tv_, tz));
  let h = vec3f(p, 0.) + rd * tm; let u = (h.x - x0) / (x1 - x0); let v = h.y - y0; let xm = (x0 + x1) * .5; let o = vec3f(p, 0.);
  // --- is anyone home, what room it is, and by what light
  var on = step(h1, .075);
  on = mix(on, step(.6, hs(floor(t / (50. + 90. * h3) + h4) + sd * 7.)), step(.93, hs(sd * 71.7)));
  if (ty == 2) { on = step(.1, h1); }
  if (ty == 1) { on = step(h1, .05); }
  if (fl > 0) { on = 1.; }
  // a hospital ward (10) or an office (11): many lit late, under cold tubes
  if (fl == 10) { on = step(h1, .62); } else if (fl == 11) { on = step(h1, .3); }
  var kd = select(select(0, 1, h6 > .82), 2, h6 < .27);
  if (fl == 2 || fl == 6) { kd = 2; } else if (fl == 10) { kd = 1; } else if (fl > 0 && fl < 12) { kd = 0; }
  var lc = vec3f(1., .60, .28) * 5.;
  if (h3 > .5) { lc = vec3f(1., .78, .50) * 5.; }
  if (h3 > .8) { lc = vec3f(.8, .95, 1.1) * 4.5; }
  if (h3 < .14 && kd != 2) { lc = vec3f(1., .22, .55) * 3.2; }
  if (kd == 2) { lc = select(vec3f(1., .82, .55) * 3.4, vec3f(.85, 1., .95) * 3., h7 > .55); }
  var tv = f32(h3 >= .14 && h3 < .34 && ty == 0 && kd == 0);
  if (fl == 3 || fl == 8 || fl == 9) { tv = 1.; } else if (fl > 0 && fl < 12) { tv = 0.; }
  let tt = t * 4. + sd * 50.; var flick = .5 + .5 * mix(hs(floor(tt)), hs(floor(tt) + 1.), fract(tt));
  if (fl == 8) { flick = .8 + .1 * sin(t * 1.3 + sd); } else if (fl == 9) { flick = .75 + .05 * step(.9, hs(floor(t * .7) + sd)); }
  lc = mix(lc, select(select(vec3f(.25, .42, 1.), vec3f(.1, .55, .6), fl == 8), vec3f(.35, .45, 1.), fl == 9) * (1.3 * flick + .3), tv);
  if (fl == 6) { lc = vec3f(.8, .92, 1.1) * 2.4; }
  if (fl == 7) { lc = vec3f(1., .8, .55) * 6.5; }
  if (fl >= 10) { lc = vec3f(.85, .97, 1.1) * 4.2; }
  if (ty == 2) { lc = vec3f(.80, .85, .50) * 1.2; }
  // the gas is on in the kitchens now and then (always where somebody cooks), a radio plays in some rooms
  let gas = f32(kd == 2 && ty == 0) * max(f32(fl == 2), step(.5, hs(floor(t / 41. + h4) + sd * 3.)));
  let rad = f32(ty == 0) * max(f32(fl == 1), step(.86, h8) * f32(kd != 1));
  let pat = sat(1. - aa * 10.); let wc = .2 + .22 * hue(h4) + .12;
  var c = vec3f(0.); var em = vec3f(0.); var scr = 0.;
  if (on > .5 || ty == 1) {
    // --- what the ray hits
    var alb = vec3f(.3);
    var lp = vec3f(xm, y1 - select(.45, .65, kd == 2), z1 * .5);
    if (fl == 6) { lp = vec3f(mix(x0, x1, select(.9, .1, h5 > .5)) + select(-.4, .4, h5 > .5), y0 + 1., z1 - .6); }
    if (fl == 7) { lp = vec3f(xm, y1 - .35, z1 * .5); } let tp = vec3f(mix(x0, x1, .72), y0 + .95, z1 - .2);
    let sx = mix(x0, x1, select(.22, .7, h5 > .5)); // the stove
    if (fl == 7 && tm != tv_) {
      // bare plaster in patches, the old paper stripped, a stepladder and a bucket
      alb = vec3f(.42, .41, .38) * (.75 + .35 * dt.b) * mix(1., .75, step(.55, fract(h.x * .7 + v * .2 + h.z * .7)));
    } else if (tm == tz) {
      alb = paper(h.x, v, wc, h7, h2, pat);
      if (fl >= 10) {
        // painted walls, darker to shoulder height
        alb = select(vec3f(.44, .42, .37), vec3f(.36, .47, .42), fl == 10) * (1. - .3 * step(v, 1.3));
      } else if (ty == 0 && kd == 0) {
        if (h2 > .62) {
          // a carpet on the wall
          let cq = vec2f(h.x - xm, v - 1.6); let inC = step(abs(cq.x), .95) * step(abs(cq.y), .65);
          let orn = (.5 + .5 * cos(cq.x * 13.) * cos(cq.y * 13.)) * pat; let bor = step(.8, max(abs(cq.x) / .95, abs(cq.y) / .65));
          alb = mix(alb, mix(vec3f(.36, .05, .04), vec3f(.50, .36, .16), orn * .6 + bor * .3), inC);
        } else if (h2 < .34) {
          // the wall unit: dark doors, glass in the middle with books and the good china
          let inU = step(v, 2.05) * step(.1, u) * step(u, .9); let cx = fract(u * 5.);
          var uc = vec3f(.16, .08, .04) * (.55 + .45 * ss(.0, .05, min(cx, 1. - cx)));
          let bk = hs(floor(h.x * 28.) + floor(v * 3.) * 7.);
          uc = mix(uc, hue(bk) * (.12 + .5 * step(.14, fract(v * 3.))) * (.4 + .6 * pat), step(.4, u) * step(u, .6) * step(.7, v));
          uc = mix(uc, vec3f(.6, .58, .55) * step(.5, fract(h.x * 9.)) * step(.2, fract(v * 3.)), step(.2, u) * step(u, .38) * step(1.2, v));
          alb = mix(alb, uc, inU);
        } else {
          // pictures: a big one, and a smaller one beside it
          let pc = picture(vec2f(h.x, v), vec2f(mix(x0, x1, .3 + .4 * h1), 1.65), vec2f(.34, .25), h5);
          let pc2 = picture(vec2f(h.x, v), vec2f(mix(x0, x1, .3 + .4 * h1) + select(-.62, .62, h1 < .5), 1.75), vec2f(.14, .19), fract(h5 * 7.3));
          alb = mix(alb, pc.rgb, pc.a); alb = mix(alb, pc2.rgb, pc2.a);
        }
        // a clock
        let kq = vec2f(h.x - mix(x0, x1, .15 + .7 * h7), v - 2.1); alb = mix(alb, mix(vec3f(.7, .68, .6), vec3f(.05), step(abs(length(kq) - .1), .012)), step(length(kq), .11) * step(.5, h8));
        // the television on a low cabinet, a radio beside it
        let tq = vec2f(h.x - tp.x, v - .95);
        scr = select(rect(tq, vec2f(0.), vec2f(.42, .25)), select(rect(tq, vec2f(0., -.05), vec2f(.55, .22)), rect(tq, vec2f(0., .05), vec2f(.24, .17)), fl == 9), fl == 8) * tv;
        if (fl == 8) { let fq = vec2f(fract(h.x * 3. + t * .05 + sd), tq.y + .05 + .1 * sin(h.x * 4. + t * .3)); scr *= 1. - .7 * step(length((fq - vec2f(.5, 0.)) / vec2f(.08, .03)), 1.); }
        alb = mix(alb, vec3f(.05, .04, .035), rect(tq, vec2f(0.), vec2f(.46, .29)) * (1. - scr) * step(.14, h3) * step(h3, .34));
        alb = mix(alb, vec3f(.14, .08, .04), rect(tq, vec2f(0., -.48), vec2f(.6, .2)));
        if (rad > .5) { alb = mix(alb, vec3f(.25, .14, .07), rect(tq, vec2f(-.42, -.18), vec2f(.17, .1))); em += vec3f(1., .55, .2) * rect(tq, vec2f(-.42, -.16), vec2f(.12, .025)) * .6; }
      } else if (ty == 0 && kd == 1) {
        // the bedroom: a tall wardrobe with a mirror, a picture over the bed
        let wq = vec2f(h.x - mix(x0, x1, select(.18, .82, h4 > .5)), v);
        alb = mix(alb, mix(vec3f(.2, .11, .05), vec3f(.35, .38, .4) * (.7 + .3 * sin(h.x * 30.)), rect(wq, vec2f(0., 1.1), vec2f(.12, .75))) * (.8 + .2 * step(.02, abs(wq.x))), rect(wq, vec2f(0., 1.), vec2f(.5, 1.)));
        let pc = picture(vec2f(h.x, v), vec2f(mix(x0, x1, select(.65, .35, h4 > .5)), 1.55), vec2f(.4, .26), h5); alb = mix(alb, pc.rgb, pc.a);
      } else if (ty == 0) {
        // the kitchen: tiles to shoulder height, wall cupboards, the stove, a worktop with doors under it, the fridge
        let tq = fract(vec2f(h.x, v) / .15); let tile = select(select(vec3f(.62, .64, .60), vec3f(.45, .58, .62), h7 > .4), vec3f(.48, .58, .44), h7 > .75);
        alb = mix(alb, tile * (1. - .45 * pat * f32(min(tq.x, tq.y) < .07)), step(v, 1.45));
        let cab = rect(vec2f(h.x, v), vec2f(mix(x0, x1, .4), 1.95), vec2f((x1 - x0) * .32, .32));
        alb = mix(alb, mix(vec3f(.55, .5, .42), vec3f(.35, .3, .25), step(abs(fract((h.x - x0) * 2.) - .5), .01)) * select(1., .7, h5 > .5), cab);
        alb = mix(alb, vec3f(.45, .42, .36) * (1. - .4 * step(abs(fract((h.x - x0) * 2.) - .5), .01)), step(v, .85) * (1. - rect(vec2f(h.x, v), vec2f(sx, .42), vec2f(.27, .43))));
        alb = mix(alb, vec3f(.3, .28, .25), step(abs(v - .86), .02));
        let st = rect(vec2f(h.x, v), vec2f(sx, .43), vec2f(.26, .43)); alb = mix(alb, mix(vec3f(.75, .74, .7), vec3f(.06), rect(vec2f(h.x, v), vec2f(sx, .4), vec2f(.18, .14))), st);
        let fr = vec2f(h.x - mix(x0, x1, select(.9, .1, h5 > .5)), v);
        alb = mix(alb, vec3f(.78, .78, .74) * (1. - .5 * step(abs(fr.y - 1.15), .01)), rect(fr, vec2f(0., .85), vec2f(.3, .85)) * step(length(max(abs(fr - vec2f(0., .85)) - vec2f(.24, .79), vec2f(0.))), .06));
        // the wired radio on the wall and a calendar
        alb = mix(alb, vec3f(.5, .45, .38), rect(vec2f(h.x, v), vec2f(mix(x0, x1, .82), 1.7), vec2f(.1, .07)) * step(.4, h8));
        alb = mix(alb, mix(vec3f(.85, .83, .8), vec3f(.6, .1, .1), step(1.58, v)), rect(vec2f(h.x, v), vec2f(mix(x0, x1, .12), 1.5), vec2f(.14, .2)));
        // a kettle on the stove
        let kq = vec2f(h.x - sx - .08, v - .98);
        alb = mix(alb, select(vec3f(.6, .1, .08), vec3f(.55, .55, .55), h4 > .5), sat(step(length(kq / vec2f(.11, .1)), 1.) + step(abs(kq.x + .12), .025) * step(abs(kq.y - .02), .04)));
      } else if (ty == 2) {
        // stairwell: paint to shoulder height, whitewash above, the flight going up
        alb = mix(vec3f(.50, .50, .44), vec3f(.09, .21, .15), step(v, 1.6));
        alb = mix(alb, vec3f(.07), step(v, .25 + u * 1.5) * step(.12, fract((v - u * 1.5) * 4. + .5)) * .8);
      } else {
        // behind the balcony glass: the house wall with the door of the flat
        let dq = vec2f(h.x + .1, v - 1.1); let door = step(abs(dq.x), .55) * step(abs(dq.y), 1.05);
        alb = mix(vec3f(.2, .18, .15), vec3f(.02), door); scr = door;
      }
    } else if (tm == tx) {
      alb = paper(h.z, v, wc, h7, h2, pat) * .85;
      if (fl >= 10) { alb = select(vec3f(.44, .42, .37), vec3f(.36, .47, .42), fl == 10) * (1. - .3 * step(v, 1.3)) * .85; }
      if (ty == 2) { alb = mix(vec3f(.46, .46, .40), vec3f(.08, .19, .14), step(v, 1.6)); }
      if (ty == 0 && fl < 10) {
        if (kd == 2) { alb = mix(alb, vec3f(.6, .62, .58) * (1. - .4 * pat * f32(min(fract(h.z / .15), fract(v / .15)) < .07)), step(v, 1.45)); }
        else if (rd.x * (h4 - .5) > 0.) {
          // a bookcase or a wardrobe along the wall
          let inS = step(v, 2.1) * step(.3 * z1, h.z) * step(h.z, .85 * z1);
          var sc = vec3f(.13, .07, .04) * (.6 + .4 * step(.04, abs(fract(h.z * 1.6) - .5)));
          if (kd == 0 && h7 > .35) { let row = fract(v * 2.8); let bk = hs(floor(h.z * 30.) + floor(v * 2.8) * 13. + sd); sc = mix(vec3f(.12, .07, .04), hue(bk) * (.2 + .25 * bk) * (.5 + .5 * pat), step(.12, row) * step(row, .85) * step(.15, fract(h.z * 30.))); }
          alb = mix(alb, sc, inS);
        } else {
          let pc = picture(vec2f(h.z, v), vec2f(z1 * .55, 1.6), vec2f(.3, .22), fract(h5 * 3.1)); alb = mix(alb, pc.rgb, pc.a);
          alb = mix(alb, vec3f(.07, .04, .03), rect(vec2f(h.z, v), vec2f(z1 * .85, 1.), vec2f(.4, 1.)) * step(.6, h8)); // the door to the hall
        }
      }
    } else if (rd.y > 0.) { alb = vec3f(.60, .58, .54); }
    else {
      // the floor: parquet or linoleum, a rug
      alb = select(vec3f(.22, .13, .07) * (.8 + .3 * step(.5, fract(h.x * 4. + step(.5, fract(h.z * 2.)) * .5))), mix(vec3f(.3, .26, .2), vec3f(.18, .15, .12), step(.5, fract(floor(h.x * 3.) * .5 + floor(h.z * 3.) * .5))), kd == 2);
      let rq = (h.xz - vec2f(xm, z1 * .55)) / vec2f(1.2, .9);
      let rug = select(step(length(rq), 1.), step(max(abs(rq.x), abs(rq.y)), .9), h7 > .5) * step(.5, h4) * f32(kd != 2);
      alb = mix(alb, (.1 + .25 * hue(h1 + .4)) * (.7 + .3 * cos(length(rq) * 20. * pat)), rug);
    }
    // --- light in the room: from the lamp under the ceiling, or from the screen
    let I = mix(1.3 / (.7 + dot(h - lp, h - lp)), .8 / (.5 + dot(h - tp, h - tp)), tv);
    c = alb * lc * I * on + em;
    if (ty == 1) { c = alb * (Lo.d * .25 + FCOL) + lc * scr * on * .5; } else { c += vec3f(.4, .6, 1.) * (scr * on * 3. * (.4 + flick)); }
    if (ty == 0) {
      // the blue flames of the gas, and their light on the wall behind
      let fk = .75 + .25 * sin(t * 37. + sd * 9.) * sin(t * 23.);
      for (var b = 0; b < 2; b++) { let bp = vec3f(sx + select(-.12, .12, b == 1), y0 + .9, z1 - .25); c += vec3f(.25, .45, 1.4) * ((spot(o, rd, bp, tm, 3000.) * 2.5 + spot(o, rd, bp, tm, 200.) * .25) * gas * fk); }
      let gq = h - vec3f(sx, y0 + 1., z1); c += vec3f(.1, .2, .6) * (gas * .5 / (.2 + dot(gq, gq)) * f32(tm == tz));
      // furniture standing in the room
      let zc = z1 * .55; let tc = zc / rd.z;
      if (tc < tm) {
        let cp = vec3f(p + rd.xy * tc, zc); let q = vec2f(cp.x - mix(x0, x1, .35 + .3 * h1), cp.y - y0); var mk = 0.; var hd = 0.;
        var fc_ = mix(.06 + .16 * hue(h2 + .2), vec3f(.10, .06, .035), step(.5, h4));
        if (fl == 7) {
          // a stepladder and a bucket of paste
          mk = step(abs(q.x - .45 + q.y * .25), .03) * step(q.y, 1.7) + step(abs(q.x - .05 - q.y * .25 + .4), .03) * step(q.y, 1.7) + step(abs(fract(q.y * 3.) - .5), .06) * step(abs(q.x - .25), .25 - q.y * .1) * step(q.y, 1.6) + rect(q, vec2f(-.6, .15), vec2f(.15, .15));
          fc_ = vec3f(.3, .28, .25);
        } else if (kd == 1) {
          // a bed with its headboard
          mk = rect(q, vec2f(0., .28), vec2f(1., .2)) + rect(q, vec2f(-1., .5), vec2f(.06, .45)); fc_ = .08 + .2 * hue(h5 + .1);
        } else if (kd == 2) {
          // the kitchen table under its oilcloth, a stool, and somebody sitting at it
          mk = rect(q, vec2f(0., .68), vec2f(.58, .07)) + step(abs(abs(q.x) - .45), .025) * step(q.y, .74) + rect(q, vec2f(.75, .22), vec2f(.16, .22)) + rect(q, vec2f(.75, .44), vec2f(.18, .02));
          fc_ = select(vec3f(.5, .1, .1), vec3f(.15, .3, .5), h7 > .5) * (.6 + .4 * step(.5, fract(q.x * 6.)));
          hd = (step(length((q - vec2f(-.85, 1.18)) / vec2f(.11, .13)), 1.) + rect(q, vec2f(-.85, .8), vec2f(.2, .27))) * step(.55, h8);
        } else if (h4 < .5 || tv > .5) {
          // a sofa seen from behind, and the heads of whoever watches the television
          mk = rect(q, vec2f(0., .45), vec2f(.95, .37)) + rect(q, vec2f(0., .3), vec2f(1.05, .22));
          if (tv > .5) { hd = step(length((q - vec2f(-.35, 1.)) / vec2f(.11, .13)), 1.) + rect(q, vec2f(-.35, .84), vec2f(.2, .08)) + (step(length((q - vec2f(.3, .97)) / vec2f(.1, .12)), 1.) + rect(q, vec2f(.3, .82), vec2f(.18, .08))) * step(.4, h8); }
        } else {
          // a table with chairs, maybe an armchair
          mk = step(abs(q.x), .62) * step(abs(q.y - .74), .03) + step(abs(abs(q.x) - .52), .03) * step(q.y, .74) + step(abs(q.x - .9), .035) * step(q.y, .98) + step(abs(q.x - .74), .2) * step(abs(q.y - .46), .03);
          mk += rect(q, vec2f(-1.25, .42), vec2f(.3, .3)) * step(.7, h7);
        }
        let fi = mix(1.3 / (.7 + dot(cp - lp, cp - lp)), .45, tv);
        c = mix(c, fc_ * lc * (fi * on), sat(mk));
        c = mix(c, lc * .004, sat(hd) * on);
      }
      // the lamp itself, or the shade over the kitchen table
      let tl = max(dot(lp - o, rd), 0.); let dq = length(lp - o - rd * tl);
      c += lc * ((exp(-dq * dq * select(70., 900., fl == 7)) * 2.6 + exp(-dq * dq * 8.) * .3) * on * (1. - tv) * f32(tl < tm && fl != 6));
      // somebody stands at the window and looks out
      if (hs(sd * 3.3) > .88) {
        let k = .45 / rd.z; let q = vec2f(p.x + rd.x * k - sz.x * (h2 - .5) * .5 - .02 * sin(t * .31 + sd * 9.), p.y + rd.y * k + sz.y * .5 - .68);
        let body = max(step(length(q), .105), step(abs(q.x), .25 - .12 * sat((q.y + .34) / .16)) * step(q.y, -.13));
        c = mix(c, c * .03, body * step(.5, on));
      }
    }
  }
  if (ty == 0) {
    // things on the sill: a plant (a bush, a cactus or violets) and maybe a radio with its dial lit
    let k = .15 / rd.z; let sq = vec2f(p.x + rd.x * k, p.y + rd.y * k + sz.y * .5);
    let q = sq - vec2f(sz.x * (.3 - .6 * h4), 0.); let pk = hs(sd * 8.1); var pm = 0.; var pc = vec3f(.02, .045, .02);
    if (pk < .45) { pm = max(step(abs(q.x), .07) * step(q.y, .12), step(length(q - vec2f(0., .26)), .12 + .035 * sin(atan2(q.y - .26, q.x) * 5. + sd * 9.))); }
    else if (pk < .7) { pm = max(step(abs(q.x), .06) * step(q.y, .1), step(length((q - vec2f(0., .22)) / vec2f(.045, .14)), 1.) + step(length((q - vec2f(.06, .25)) / vec2f(.025, .06)), 1.)); }
    else { for (var j = 0; j < 3; j++) { let qq = q - vec2f(f32(j - 1) * .14, 0.); pm = max(pm, step(abs(qq.x), .045) * step(qq.y, .08) + step(length(qq - vec2f(0., .11)), .055)); pc = mix(pc, vec3f(.25, .06, .3), step(length(qq - vec2f(.02, .14)), .025)); } }
    let lt = lc * on * .12 + Lo.d * .3 + FCOL;
    c = mix(c, pc * lt * 2., sat(pm) * step(.45, hs(sd * 5.5)) * f32(fl != 4));
    // bottles on some sills
    if (hs(sd * 6.7) > .82) { for (var j = 0; j < 3; j++) { let bq = sq - vec2f(sz.x * (.18 - .1 * h2) + f32(j) * .09, 0.); let bm = rect(bq, vec2f(0., .1), vec2f(.032, .1)) + rect(bq, vec2f(0., .24), vec2f(.012, .05)); c = mix(c, select(vec3f(.03, .08, .03), vec3f(.09, .05, .02), j == 1) * lt * 3., sat(bm) * step(f32(j), 2. * h4 + .5)); } }
    if (fl == 4) {
      // a cat sitting on the sill, looking out; its tail hangs now and then twitches
      let cq = sq - vec2f(sz.x * (.25 - .5 * h2), 0.);
      let cm = step(length((cq - vec2f(0., .13)) / vec2f(.11, .14)), 1.) + step(length(cq - vec2f(.01, .3)), .075)
        + step(abs(cq.x + .055) + (cq.y - .36) * .9, .035) * step(.33, cq.y) + step(abs(cq.x - .065) + (cq.y - .36) * .9, .035) * step(.33, cq.y)
        + step(abs(cq.x - .1 - .02 * sin(t * 1.3 + sd)), .016) * step(abs(cq.y + .08), .1);
      c = mix(c, vec3f(.02, .018, .016) * lt, sat(cm));
    }
    if (rad > .5) {
      let rq = sq - vec2f(sz.x * (.3 - .6 * (1. - h4)), .07);
      c = mix(c, vec3f(.12, .06, .03) * lt * 3. + vec3f(1., .5, .15) * (rect(rq, vec2f(0., .02), vec2f(.08, .015)) * 1.2), rect(rq, vec2f(0.), vec2f(.13, .07)));
    }
    // curtains: none, net, net and drapes, drapes drawn; a short cafe curtain in kitchens
    let fold = mix(.5, .5 + .5 * sin(p.x * (34. + 20. * h2) + 2. * sin(p.y * 2.3 + h1 * 9.)), sat(1. - aa * 30.));
    let cv = select(select(0., .2 + .45 * h4, h5 > .6), 1., h5 > .85);
    let dr = step(sz.x * .5 * (1. - cv), abs(p.x) + 1e-4) * f32(cv > 0.) * f32(kd != 2);
    let net = f32(h5 > .25) * (.36 + .26 * fold) * (1. - dr) * select(1., step(p.y, -.05), kd == 2);
    c = mix(c, vec3f(.8) * (lc * .22 * on * (1. - tv * .6) + Lo.d * .3 + FCOL * .7), net);
    c = mix(c, (.18 + .4 * hue(h1 + .3)) * (.55 + .45 * fold) * (lc * .2 * on + Lo.d * .25 + FCOL * .5), dr);
  }
  if (fl == 5) {
    // a garland round the window: bulbs along the top and down the sides, their colours stepping round
    let gq = vec2f(abs(p.x), p.y); let sg = select(gq.x - sz.x * .5 + .07, gq.y - sz.y * .5 + .07 + .03 * cos(p.x * 12.), abs(p.y) < sz.y * .5 - .12);
    let pos = select(p.y, p.x, abs(p.y) >= sz.y * .5 - .12); let j = floor(pos / .13 + .5); let dq = vec2f(fract(pos / .13 + .5) - .5, sg / .13) * .13;
    let C = array<vec3f, 4>(vec3f(2., .15, .1), vec3f(.2, 1.6, .25), vec3f(.25, .5, 2.4), vec3f(2., 1.3, .15));
    let k = u32(abs(j) + floor(t * 1.3) + 400.) % 4u;
    c += C[k] * (exp(-dot(dq, dq) * 9000.) * 4. + exp(-dot(dq, dq) * 600.) * .25) * (.6 + .4 * sin(t * 2.3 + j));
  }
  // --- glass over it all: the haze and the lamps mirrored, grime
  let fres = .04 + .96 * pow(1. - sat(dot(-rw, n)), 5.);
  c = c * (1. - fres) * (.72 + .28 * dt.a) + fogc(reflect(rw, n)) * 1.5 * fres + Lo.s * 2.;
  let fa = select(vec3f(.40, .40, .38), vec3f(.10, .06, .04), h4 > .7 && ty == 0) * (.7 + .4 * dt.b);
  c = mix(c, fa * (Lo.d + FCOL * .9), fm);
  return fin(fog(c, i.wp));
}
`;

// ---------------------------------------------------------------- decals: paint and print on walls, signs that glow
// One quad per decal, its picture a cell of the atlas (atlas.js). Modes: 0 paint lit by the lamps, 1 glowing, 2 neon that
// stutters now and then.
const W_DEC = S_B + /*wgsl*/`
struct DI { @location(0) a: vec4f, @location(1) b: vec4f, @location(2) c: vec4f };
struct DO { @builtin(position) cp: vec4f, @location(0) wp: vec3f, @location(1) uv: vec2f, @location(2) @interpolate(flat) n: vec4f, @location(3) @interpolate(flat) sd: f32 };
@vertex fn vs(@builtin(vertex_index) vi: u32, i: DI) -> DO {
  var o: DO; let q = vec2f(f32(vi & 1u), f32(vi >> 1u)) * 2. - 1.;
  let n = vec2f(sin(i.a.w), cos(i.a.w)); let r = vec2f(n.y, 0. - n.x);
  var w = i.a.xyz + vec3f(r.x, 0., r.y) * (q.x * i.b.x * .5) + vec3f(0., q.y * i.b.y * .5, 0.);
  if (i.b.z > 3.5) {
    // a tear-off strip of a notice: its free end lifts off the wall and flutters, harder in a gust
    let t = g.cam.w; let ph = dot(i.a.xz, vec2f(9.1, 7.3)); let k = (.5 - q.y * .5) * i.b.y; let gu = g.wind.w;
    let f = (.15 + .85 * gu) * (.55 + .45 * sin(t * (7. + 5. * gu) + ph) * sin(t * 3.3 + ph * 2.));
    w += vec3f(n.x, 0., n.y) * (k * f * 1.1) + vec3f(r.x, 0., r.y) * (k * f * .5 * sin(t * 5.1 + ph)) + vec3f(0., k * f * f * .4, 0.);
  }
  o.cp = g.vp * vec4f(w, 1.); o.wp = w; o.uv = mix(i.c.xy, i.c.zw, vec2f(q.x * .5 + .5, .5 - q.y * .5)); o.n = vec4f(n, i.b.zw); o.sd = i.a.x * .37 + i.a.z * .11;
  return o;
}
@fragment fn fs(i: DO) -> @location(0) vec4f {
  let s = textureSample(tA, sR, i.uv); if (s.a < .004) { discard; }
  let a0 = s.rgb / s.a; let alb = a0 * a0; let n = vec3f(i.n.x, 0., i.n.y); let V = normalize(g.cam.xyz - i.wp); let md = i32(i.n.z + .5);
  var c = vec3f(0.);
  if (md == 0 || md == 4) { let L = lit(i.wp, n, V, .25); c = alb * .75 * (L.d + FCOL * 1.2) + L.s * .2; }
  else {
    var f = 1.;
    if (md == 2) { let t = g.cam.w; let sd = i.sd; // one sign stutters as a whole
      f = select(1., .12 + .3 * hs(floor(t * 23.)), fract(t / 13. + sd) > .93 && hs(floor(t * 11.) + sd) > .4); }
    // a television: the picture breathes with the scene, scan lines across it
    if (md == 3) { let t = g.cam.w; f = (.55 + .45 * hs(floor(t * 3.))) * (.85 + .15 * sin(i.uv.y * 3000.)) * (.9 + .1 * hs(floor(t * 25.))); }
    // the club's glass blocks: lit from inside by the lights of the dance floor, colours sweeping along
    if (md == 5) { let t = g.cam.w; let bt = fract(t * 2.13); return vec4f(fog(alb * hue(fract(t * .11 + i.wp.x * .02 + i.wp.z * .02)) * i.n.w * (.35 + .65 * step(bt, .5) + .8 * step(.97, hs(floor(t * 8.)))), i.wp) * s.a, s.a); }
    c = alb * (i.n.w * f);
  }
  return vec4f(fog(c, i.wp) * s.a, s.a);
}
`;

// ---------------------------------------------------------------- blades: dead grass, weeds, the twigs of bare bushes
// No mesh: each is a strip made from the vertex index, bent, leaning with the wind. Lit per vertex.
const W_LEAF = S_B + /*wgsl*/`
override ROWS: f32 = 5.;
override FAR: f32 = 70.;
struct LI { @location(0) a: vec4f, @location(1) b: vec4f, @location(2) c: vec4f };
struct LO { @builtin(position) cp: vec4f, @location(0) wp: vec3f, @location(1) col: vec3f, @location(2) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) vi: u32, i: LI) -> LO {
  var o: LO;
  let u = f32(vi & 1u) * 2. - 1.; let v = f32(vi >> 1u) / (ROWS - 1.);
  let ty = i32(i.c.x * 255. + .5); let s1 = i.c.y; let s2 = i.c.z; let t = g.cam.w; let len = i.a.w;
  let cy = cos(i.b.x); let sy = sin(i.b.x); let ct = cos(i.b.y); let st = sin(i.b.y);
  let d = vec3f(st * cy, ct, st * sy); let pe = vec3f(ct * cy, 0. - st, ct * sy); let sd = vec3f(0. - sy, 0., cy);
  let ka = max(i.c.w * 2.2, .06); let sK = sin(ka * v); let cK = cos(ka * v);
  var c = i.a.xyz + len * (d * (sK / ka) + pe * ((1. - cK) / ka));
  let gu = g.wind.w; let ph = dot(i.a.xz, vec2f(.37, .23)) + s1 * 6.; let fx = v * v * len * select(1., .45, ty == 2);
  c += WDIR * (fx * (.3 * gu + (.05 + .14 * gu) * sin(t * (2.2 + s2) + ph))) + vec3f(0. - WDIR.z, 0., WDIR.x) * (fx * .07 * sin(t * 3.1 + ph * 1.7));
  let cd = distance(c, g.cam.xyz); let far = FAR * g.mis.z;
  let w = max(i.b.z * .5 * (1. - .8 * v), cd * .0006) * (1. - ss(far * .75, far, distance(i.a.xyz, g.cam.xyz)));
  let p = c + sd * (u * w);
  o.cp = g.vp * vec4f(p, 1.); o.wp = p; o.uv = vec2f(u, v);
  var col = mix(vec3f(.115, .10, .045), vec3f(.075, .085, .035), s1) * (.55 + .6 * v);
  if (ty == 1) { col = vec3f(.12, .09, .05) * (.6 + .5 * s2); }
  if (ty == 2) { col = vec3f(.04, .032, .027) * (.7 + .5 * s2); }
  col = mix(col, vec3f(.62, .65, .7), ss(.55, 1., i.b.w) * v * f32(ty == 0) * .7);
  let lg = glow(c + vec3f(0., .05, 0.)) * .55 + FCOL * 1.3 * (.5 + .5 * v);
  // the wide blades that stand in for a tuft far away would be too bright: thin them out in colour
  o.col = col * lg * min(1., i.b.z * .5 / max(cd * .0006, 1e-5) + .35);
  return o;
}
@fragment fn fs(i: LO) -> @location(0) vec4f { return fin(fog(i.col * (.75 + .25 * abs(i.uv.x)), i.wp)); }
`;

// ---------------------------------------------------------------- sky, snow, glare, paper, steam
const W_SPR = S_B + /*wgsl*/`
const VEHL = array<f32, ${VEH.length}>(${VEH.map((v) => fl(v[0])).join(', ')});
const VEHB = array<vec3f, ${VEH.length}>(${VEHB.map((v) => 'vec3f(' + fl(v[0]) + ',' + fl(v[1]) + ',' + fl(v[2] || 0) + ')').join(', ')});
struct VO { @builtin(position) cp: vec4f, @location(0) uv: vec2f, @location(1) @interpolate(flat) pr: vec4f, @location(2) wp: vec3f };
fn quad(i: u32) -> vec2f { return vec2f(f32(i & 1u), f32(i >> 1u)) * 2. - 1.; }
// behind everything: the sky (fsB below)
@vertex fn vsB(@builtin(vertex_index) i: u32) -> VO {
  var o: VO; let p = quad(i);
  o.wp = g.cam.xyz + g.fwd.xyz + g.right.xyz * (p.x * g.right.w) + g.up.xyz * (p.y * g.up.w);
  o.cp = vec4f(p, 1e-7, 1.); o.uv = p; o.pr = vec4f(0.);
  return o;
}
// the night sky over the haze: a deck of cloud drifting on the wind and lit from below by the town, stars and the moon
// in its gaps, now and then an aeroplane's lights; towards the horizon all of it sinks into the haze
const MOON = vec3f(-.22, .27, -.94);
fn plight(rd: vec3f, p: vec3f, px: f32) -> f32 { let v = normalize(p - g.cam.xyz); let a = length(cross(rd, v)); return exp(-a * a / (px * px)) * step(0., dot(rd, v)); }
@fragment fn fsB(i: VO) -> @location(0) vec4f {
  let rd = normalize(i.wp - g.cam.xyz); let t = g.cam.w; let up = max(rd.y, 0.);
  let px = g.up.w * 2.4 / g.res.y;
  // the cloud deck: a plane far up, so it slides past slowly and shrinks towards the horizon
  let q = rd.xz / (up + .1) * .11 + vec2f(t * .0042, t * .0027) + g.wind.xz * .00015;
  let n = textureSampleLevel(tD, sR, q, 0.).a * .64 + textureSampleLevel(tD, sR, q * 2.7 + .3, 0.).a * .36 + (textureSampleLevel(tD, sR, q * 8.3 + .7, 0.).a - .5) * .16;
  let cov = ss(.43, .54, n); let thick = ss(.5, .66, n);
  let M = normalize(MOON); let ma = acos(clamp(dot(rd, M), -1., 1.));
  // clear patches: deep blue-black with stars, faint where the haze still is
  var sky = vec3f(.0026, .0034, .0062);
  let sp = rd * 230.; let ci = floor(sp); let hh = h33(ci); let dd = length(sp - (ci + .25 + .5 * hh));
  let pa = px * 230.;
  let tw = .6 + .4 * sin(t * (2. + 3. * hh.x) + hh.y * 40.);
  sky += vec3f(.9, .95, 1.1) * (exp(-dd * dd / (pa * pa * .5)) * step(.982, hh.z) * pow((hh.z - .982) / .018, 2.) * 1.6 * tw) * ss(.06, .4, rd.y);
  // the moon: a disc with its seas, a halo that spreads wider where thin cloud passes over it
  let mu = vec2f(dot(rd - M, normalize(cross(M, vec3f(0., 1., 0.)))), rd.y - M.y) / .016;
  let seas = textureSampleLevel(tD, sR, mu * .18 + .3, 0.).a;
  let disc = ss(.0168, .0152, ma) * (.2 + 1.1 * ss(.35, .65, seas));
  sky += vec3f(1., .96, .86) * (disc * .5 * (1. - .8 * thick)) + vec3f(.55, .6, .7) * (exp(-ma * ma * 900.) * .25 + exp(-ma * 9.) * .03);
  // the clouds: lit from below by the orange of the town, their edges silvered where they pass by the moon
  let cc = FCOL * (1.1 + 1.3 * thick) + vec3f(.5, .55, .65) * (exp(-ma * 7.) * .12 * (1. - thick * .6) * cov);
  sky = mix(sky, cc, cov * .92);
  // an aeroplane: red and green at the wingtips, a white double flash at the tail, a red beacon
  if (g.pl.w > .5) {
    let hd = vec3f(cos(g.pl.z), 0., sin(g.pl.z)); let sd = vec3f(0. - hd.z, 0., hd.x); let P = vec3f(g.pl.x, 1150., g.pl.y);
    let ft = fract(t * .9); let fb = fract(t * 1.15 + .3);
    var a = vec3f(1., .08, .05) * plight(rd, P - sd * 17., px) + vec3f(.1, 1., .3) * plight(rd, P + sd * 17., px);
    a += vec3f(1.3) * (plight(rd, P - hd * 18., px) * (step(ft, .03) + step(abs(ft - .1), .015)) * 3.);
    a += vec3f(1., .05, .02) * (plight(rd, P - vec3f(0., 2., 0.), px * 1.2) * step(fb, .08) * 2.);
    sky += a * (1. - .75 * cov) * ss(.02, .25, rd.y);
  }
  // a shooting star now and then in a clear patch: a short streak that brightens and is gone
  {
    let P = 53.; let c = floor(t / P); let h = h33(vec3f(c, 3.1, 7.7)); let pr = (t - c * P - 10. * h.z) / .8;
    if (h.x < .7 && pr > 0. && pr < 1.) {
      let az = h.y * TAU; let el = .45 + .5 * h.z; let S = vec3f(cos(az) * cos(el), sin(el), sin(az) * cos(el));
      let R = normalize(cross(S, vec3f(0., 1., 0.))); let U = cross(R, S); let k = dot(rd, S);
      if (k > .5) {
        let q = vec2f(dot(rd, R), dot(rd, U)) / k; let m = normalize(vec2f(cos(h.x * 40.), -.4 - .6 * h.y)) * .5;
        let A = m * max(pr - .3, 0.); let B = m * pr; let ab = B - A; let e = clamp(dot(q - A, ab) / max(dot(ab, ab), 1e-6), 0., 1.); let dq = length(q - A - ab * e);
        sky += vec3f(.9, .95, 1.2) * (exp(-dq * dq / (px * px * 1.5)) * e * e * sin(pr * 3.1416) * 2.5 * (1. - cov));
      }
    }
  }
  var col = mix(fogc(rd), sky, ss(-.02, .5, rd.y) * .9) + vec3f(1., .96, .86) * (disc * .25 * (1. - thick) * ss(.0, .2, rd.y));
  // a salute somewhere far off to the north-west: a burst every second and a half, a shell of sparks that opens,
  // sags and fades, a flash in the haze around it
  if (g.ev.z >= 0.) {
    let D = normalize(vec3f(-.55, .1, -.83)); let R = normalize(cross(D, vec3f(0., 1., 0.))); let U = cross(R, D);
    for (var b = 0; b < 16; b++) {
      let hb = h33(vec3f(f32(b), 9.3, 1.1)); let age = g.ev.z - (f32(b) * 1.45 + hb.x * .6);
      if (age < 0. || age > 2.8) { continue; }
      let C = normalize(D + R * ((hb.y - .5) * .16) + U * (hb.z * .07 - age * age * .0025));
      let k = dot(rd, C); if (k < .9) { continue; }
      let q = vec2f(dot(rd, R), dot(rd, U)) / k - vec2f(dot(C, R), dot(C, U)) / dot(C, C);
      let r = .03 * (1. - exp(-age * 2.6)) * (.7 + .6 * hb.y); let N = 22.; let an = atan2(q.y, q.x); let j = round(an * N / TAU);
      let pa = j * TAU / N; let pp = vec2f(cos(pa), sin(pa)) * r; let dq = length(q - pp);
      let fade = pow(1. - age / 2.8, 1.5) * (.6 + .4 * step(.5, hs(j + floor(age * 12.) + f32(b))));
      let bc = .4 + .6 * hue(hb.y * 3. + hb.z) ;
      col += bc * (exp(-dq * dq / (px * px * 2.)) * 3. * fade + exp(-dot(q, q) / (r * r + 1e-4)) * .04 * exp(-age * 2.)) * ss(-.02, .06, rd.y);
      col += bc * (.012 * exp(-age * 3.) * exp(-(1. - k) * 60.));
    }
  }
  return fin(col);
}
// snow: wraps around the camera in a 44 m cube, falls, drifts with the wind; bright where a lamp's cone catches it
@vertex fn vsSnow(@builtin(vertex_index) vi: u32, @location(0) a: vec4f) -> VO {
  var o: VO; let q = quad(vi); let t = g.cam.w; let B = 44.;
  let fall = .5 + .55 * a.w;
  var p = a.xyz * B + g.wind.xyz * (.55 + .5 * a.w) + vec3f(0., 0. - t * fall, 0.) + .3 * vec3f(sin(t * .7 + a.x * 60.), 0., cos(t * .6 + a.z * 70.));
  p = g.cam.xyz + (fract((p - g.cam.xyz) / B + .5) - .5) * B;
  let d = length(p - g.cam.xyz);
  let sz = .011 + .02 * a.w * a.w; let px = d * .0011; let s = max(sz, px);
  // a short streak along its fall, as a shutter would draw it
  let vel = WDIR * (.8 + 4.2 * g.wind.w) - vec3f(0., fall, 0.); let vd = normalize(vel);
  let sdv = normalize(cross(vd, p - g.cam.xyz));
  let w = p + sdv * (q.x * s) + vd * (q.y * (s + length(vel) * .012));
  o.cp = g.vp * vec4f(w, 1.); o.uv = q; o.wp = p;
  let room = all(p > vec3f(${APTB.slice(0, 3).map((v) => fl(v - 0.3)).join(',')})) && all(p < vec3f(${APTB.slice(3).map((v) => fl(v + 0.3)).join(',')}));
  let cvr = min(1., sz / px) * ss(0., .05, g.pap.z - hs(a.x * 91.7 + a.z * 13.1 + a.y * 3.3)); let fade = ss(B * .5, B * .34, d) * ss(.25, 1.2, d) * cvr * cvr * ss(.0, .3, p.y) * f32(!room);
  o.pr = vec4f((glow(p) * .5 + FCOL * 1.1) * fade, d);
  if (fade <= 0.) { o.cp = vec4f(0., 0., 2., 1.); }
  return o;
}
@fragment fn fsSnow(i: VO) -> @location(0) vec4f {
  let m = ss(1., .15, length(i.uv));
  return vec4f(min(i.pr.rgb * (m * m * exp(-SIG * i.pr.w)), vec3f(12.)), 0.);
}
// loose snow driven low over the ground in the gusts: thin streaks running with the wind in a 40 m square round the camera
@vertex fn vsDrift(@builtin(vertex_index) vi: u32, @location(0) a: vec4f) -> VO {
  var o: VO; let q = quad(vi); let t = g.cam.w; let B = 40.;
  let run = g.pap.y * (.6 + .8 * a.w);
  var c = vec3f(a.x * B, 0., a.z * B) + WDIR * run + vec3f(0. - WDIR.z, 0., WDIR.x) * sin(run * .3 + a.y * 20.) * .6;
  c = vec3f(g.cam.x + (fract((c.x - g.cam.x) / B + .5) - .5) * B, 0., g.cam.z + (fract((c.z - g.cam.z) / B + .5) - .5) * B);
  c.y = .14 + .22 * a.y * a.y * abs(sin(run * 1.7 + a.x * 30.));
  let len = .25 + .45 * a.w; let sdv = vec3f(0. - WDIR.z, 0., WDIR.x);
  let w = c + WDIR * (q.y * len) + sdv * (q.x * .012) + vec3f(0., q.x * .012, 0.);
  o.cp = g.vp * vec4f(w, 1.); o.uv = q; o.wp = c;
  let d = length(c - g.cam.xyz);
  let fade = ss(.3, .75, g.wind.w) * ss(B * .5, B * .3, d) * ss(.3, 1., d);
  o.pr = vec4f((glow(c + vec3f(0., .2, 0.)) * .35 + FCOL * 1.2) * fade * .4, d);
  if (fade <= 0.) { o.cp = vec4f(0., 0., 2., 1.); }
  return o;
}
@fragment fn fsDrift(i: VO) -> @location(0) vec4f {
  let m = (1. - abs(i.uv.x)) * ss(1., .2, abs(i.uv.y));
  return vec4f(min(i.pr.rgb * (m * exp(-SIG * i.pr.w)), vec3f(6.)), 0.);
}
// glare: the star a lamp makes in a lens, the beacons on the mast and the chimney, lights of far cars and of the train
@vertex fn vsGl(@builtin(vertex_index) vi: u32, @location(0) a: vec4f, @location(1) b: vec4f) -> VO {
  var o: VO; let q = quad(vi); let t = g.cam.w; let k = i32(b.w + .5);
  var p = a.xyz; var col = b.rgb;
  if (k >= 100) { let L = g.lamp[k - 100]; col = L.c.rgb * select(.011, .12, L.c.w < 0.); }
  if (k == 1) { col *= .12 + .88 * ss(.0, .12, fract(t * .42)) * ss(.62, .45, fract(t * .42)); }
  if (k == 2) { col *= .12 + 1.6 * pow(max(sin(t * .7), 0.), 24.); }
  // a garland bulb: its colour steps round four with its neighbours (b.r is its place on the string)
  if (k == 3) { let C = array<vec3f, 4>(vec3f(2., .15, .1), vec3f(.2, 1.6, .25), vec3f(.25, .5, 2.4), vec3f(2., 1.3, .15)); let j = u32(floor(t * 1.3) + b.r * 37.) % 4u; col = C[j] * (.6 + .4 * sin(t * 2.3 + b.r * 40.)) * .5; }
  // the ambulance's blue lights while its event is on, two of them out of step
  if (k == 4) { let f = fract(t * 2.2 + b.r); col = vec3f(.15, .35, 3.) * (step(f, .12) + step(abs(f - .25), .1)) * g.ev.x; }
  // a traffic light blinking yellow at night
  if (k == 6) { col = vec3f(2.4, 1.3, .1) * ss(.0, .05, sin(t * 3.1416) ) ; }
  // the level crossing: two red lamps taking turns while a train is near
  if (k == 7) { col = vec3f(2.6, .1, .05) * step(.5, fract(t * .9 + b.r * .5)) * g.ev.y; }
  // a car alarm: the hazard lights
  if (k == 8) { col = vec3f(2.4, 1.2, .2) * step(.5, fract(t * 1.6)) * g.ev.w; }
  // the club: lights over its door sweeping through the colours on the beat
  if (k == 10) { col = (.5 + .5 * cos(TAU * (t * .23 + b.r + vec3f(0., .33, .67)))) * 2.2 * (.3 + .7 * step(fract(t * 2.13 + b.r * 2.), .5)); }
  // a police car's lights, blue and red taking turns
  if (k == 11) { let f = fract(t * 1.6 + b.r); col = select(vec3f(.15, .3, 2.6), vec3f(2.6, .1, .08), b.r > .5) * (step(f, .14) + step(abs(f - .28), .08)); }
  // a gas flare: it breathes and flickers
  if (k == 9) { col *= .7 + .3 * sin(t * 2.1) * sin(t * 3.7) + .15 * hs(floor(t * 14.)); }
  if (k >= 80 && k < 90) {
    // the beacon on the roof of a police van or a plough on the highway
    let c = g.rc[k - 80]; let vk = u32(c.w + .5); let bh = VEHB[vk];
    p = vec3f(c.x + bh.z * c.y, bh.x, ${fl(ROADZ)} - 1.8 * c.y);
    let f = fract(t * 1.7 + f32(k) * .3);
    col = select(vec3f(2.4, 1., .1) * (.15 + .85 * pow(abs(sin(t * 6.)), 6.)), vec3f(.15, .3, 2.6) * (step(f, .15) + step(abs(f - .3), .1)), bh.y < 1.5) * c.z * step(.5, bh.y);
  }
  if (k >= 60 && k < 80) {
    // a vehicle on the highway: white in front, red behind, set by its length and height
    let c = g.rc[(k - 60) % 10]; let rear = k >= 70; let vk = u32(c.w + .5); let hl = VEHL[vk];
    p = vec3f(c.x + select(hl, 0. - hl, rear) * c.y, select(.7, 1.05, vk > 4u), ${fl(ROADZ)} - 1.8 * c.y);
    let f = max(dot(vec3f(c.y, 0., 0.), normalize(g.cam.xyz - p)), 0.);
    col = select(vec3f(3.4, 3.2, 2.8) * (.15 + 5. * f * f), vec3f(1.6, .06, .03), rear) * c.z;
  }
  if (k == 50) {
    p = vec3f(g.tr.x + select(-11.8, 224.2, g.tr.y > 0.), ${fl(RAILY + 3)}, ${fl(RAILZ)});
    let f = max(dot(vec3f(g.tr.y, 0., 0.), normalize(g.cam.xyz - p)), 0.); col *= (.2 + 6. * f * f * f) * g.tr.z;
  }
  if (k == 51) {
    p = vec3f(g.tr2.x + g.tr2.y * .2, ${fl(RAILY + 3.6)}, ${fl(RAILZ)});
    let f = max(dot(vec3f(g.tr2.y, 0., 0.), normalize(g.cam.xyz - p)), 0.); col *= (.2 + 6. * f * f * f) * g.tr2.z;
  }
  let v = p - g.cam.xyz; let d = length(v); let sz = a.w * (.3 + d * .017);
  if (d > 560.) { col = vec3f(0.); }
  let w = p + (g.right.xyz * q.x + g.up.xyz * q.y) * sz;
  o.cp = g.vp * vec4f(w, 1.); let cw = (g.vp * vec4f(p, 1.)).w; o.cp.z = g.fwd.w * o.cp.w / max(cw - .6, .01);
  o.uv = q; o.wp = p; o.pr = vec4f(col * exp(-SIG * d), 0.);
  if (dot(col, col) <= 0. || cw < .7) { o.cp = vec4f(0., 0., 2., 1.); }
  return o;
}
@fragment fn fsGl(i: VO) -> @location(0) vec4f {
  let r2 = dot(i.uv, i.uv); let an = atan2(i.uv.y, i.uv.x + 1e-5);
  let spk = pow(abs(cos(an * 3. + .5)), 60.) * exp(-r2 * 5.) + pow(abs(cos(an * 2. + 1.1)), 90.) * exp(-r2 * 9.) * .7;
  return vec4f(i.pr.rgb * ((exp(-r2 * 60.) * 2.5 + .05 / (.02 + r2) * (1. - ss(.3, 1., r2)) + spk * .32) * (1. - ss(.8, 1., r2))), 0.);
}
// scraps of paper blown along the lanes between the cars: they tumble while the wind carries them and lie flat when it drops
@vertex fn vsPap(@builtin(vertex_index) vi: u32, @location(0) a: vec4f, @location(1) b: vec4f) -> VO {
  var o: VO; let q = quad(vi);
  let tr = g.pap.x * b.w + a.z * b.x; let f = fract(tr / b.x);
  let lat = fract(a.z * 7.31) * b.y + .5 * sin(tr * .13 + a.z * 9.);
  let ax = b.z > .5; let dir = select(vec3f(0., 0., 1.), vec3f(1., 0., 0.), ax); let sdv = select(vec3f(1., 0., 0.), vec3f(0., 0., -1.), ax);
  var c = vec3f(a.x, 0., a.y) + dir * (f * b.x) + sdv * (lat * select(1., -1., ax));
  let th0 = tr * 3.3 + a.z * 31.; let th = th0 - .46 * sin(2. * th0);
  c.y = .015 + abs(sin(th)) * a.w * 1.1;
  let yw = a.z * 40.; let e1 = dir * cos(yw) + sdv * sin(yw); let e2 = sdv * cos(yw) - dir * sin(yw);
  let k = ss(.0, .02, f) * ss(1., .98, f);
  let p = c + (e1 * (q.x * 1.4) + (e2 * cos(th) + vec3f(0., sin(th), 0.)) * q.y) * (a.w * k);
  o.cp = g.vp * vec4f(p, 1.); o.uv = q; o.wp = p;
  o.pr = vec4f((glow(c + vec3f(0., .1, 0.)) * .5 + FCOL) * (.45 + .25 * hs(a.z * 5.)), a.z);
  return o;
}
@fragment fn fsPap(i: VO) -> @location(0) vec4f {
  let cr = .82 + .18 * sin(i.uv.x * 5. + i.pr.w * 20.) * sin(i.uv.y * 4. + i.pr.w * 7.);
  return fin(fog(i.pr.rgb * cr, i.wp));
}
// steam: over the boiler-house chimney and out of a manhole
@vertex fn vsSt(@builtin(vertex_index) vi: u32, @location(0) a: vec4f, @location(1) b: vec4f) -> VO {
  var o: VO; let q = quad(vi); let t = g.cam.w;
  let life = fract(t * b.y + b.x); let h = life * b.z;
  var p = a.xyz + vec3f(0., h * (1. - .35 * life), 0.) + WDIR * (life * life * b.z * (.5 + 1.8 * g.wind.w))
    + vec3f(sin(t * .6 + b.x * 40.), 0., cos(t * .5 + b.x * 31.)) * (b.w * (.2 + life) * a.w * .5);
  var sz = a.w * (.45 + 2.6 * life); var al = ss(.0, .12, life) * pow(1. - life, 1.4) * .2;
  if (b.z < 0.) {
    // a breath in the frost (rise = -1 - the heading): a puff out of the mouth every few seconds, carried forward
    // (spread: how far) and up a little, then gone until the next one
    let ya = -1. - b.z; let l2 = life * 2.6;
    p = a.xyz + vec3f(sin(ya), 0., cos(ya)) * (b.w * sqrt(min(l2, 1.))) + vec3f(0., .1 * l2, 0.) + WDIR * (l2 * (.08 + .35 * g.wind.w));
    sz = a.w * (.6 + 2.4 * l2); al = select(0., ss(.0, .08, l2) * pow(max(1. - l2, 0.), 1.6) * .5, l2 < 1.);
  }
  let w = p + (g.right.xyz * q.x + g.up.xyz * q.y) * sz;
  o.cp = g.vp * vec4f(w, 1.); o.uv = q; o.wp = p;
  o.pr = vec4f(glow(p) * .12 + FCOL * 2.2, al);
  if (al <= 0.) { o.cp = vec4f(0., 0., 2., 1.); }
  return o;
}
@fragment fn fsSt(i: VO) -> @location(0) vec4f {
  let r = length(i.uv); let n = textureSampleLevel(tD, sR, i.uv * .11 + i.pr.a * 3. + i.wp.xz * .01, 0.).a;
  let al = i.pr.a * ss(1., .1, r + (n - .5) * .5);
  let v = i.wp - g.cam.xyz; let d = length(v); let T = exp(-SIG * d);
  return vec4f(min((i.pr.rgb * T + fogc(v / d) * (1. - T)) * al, vec3f(20.)), al);
}
`;

// ---------------------------------------------------------------- lamp light in the haze (half res)
// For every lamp whose reach the view ray crosses, the scattered light is summed along the ray with samples spaced
// evenly in angle as seen from the lamp, which takes the 1/r² peak out of the noise; each sample looks up the lamp's shadow.
const W_RAYS = S_G + W_FS + /*wgsl*/`
@group(0) @binding(0) var<uniform> g: G;
@group(0) @binding(1) var sS: sampler_comparison;
@group(0) @binding(2) var tSh: texture_depth_2d;
@group(0) @binding(3) var tDp: texture_depth${AA > 1 ? '_multisampled' : ''}_2d;
@fragment fn fs(@builtin(position) fc: vec4f) -> @location(0) vec4f {
  let dp = textureLoad(tDp, vec2i(fc.xy) * 2, 0);
  let uv = fc.xy * 2. * g.res.zw;
  let nd = vec2f(uv.x * 2. - 1., 1. - uv.y * 2.);
  let rv = g.fwd.xyz + g.right.xyz * (nd.x * g.right.w) + g.up.xyz * (nd.y * g.up.w);
  let rl = length(rv); let rd = rv / rl;
  let zl = g.fwd.w / max(dp, 1e-6);
  var tm = min(zl * rl, 260.);
  if (rd.y < -1e-4) { tm = min(tm, g.cam.y / (0. - rd.y)); }
  let ro = g.cam.xyz; let j = ign(fc.xy);
  var acc = vec3f(0.);
  // only the lamps near enough to matter (main.js picks them every frame)
  for (var hk = 0; hk < i32(g.hn.x); hk++) {
    let L = g.lamp[u32(g.hz[hk >> 2u][hk & 3] + .5)]; let oc = ro - L.p.xyz; let R = L.p.w * select(.75, .95, L.c.w >= 0.);
    if (L.c.w < -1.5) { continue; }
    let b = dot(oc, rd); let D2 = dot(oc, oc) - b * b; let h = R * R - D2;
    if (h <= 0.) { continue; }
    let s = sqrt(h); let t0 = max(0. - b - s, 0.); let t1 = min(s - b, tm);
    if (t1 <= t0) { continue; }
    let D = sqrt(max(D2, 4e-4)); let a0 = atan2(t0 + b, D); let a1 = atan2(t1 + b, D);
    var a = 0.;
    for (var n = 0; n < ${RAYN}; n++) {
      let tt = D * tan(mix(a0, a1, (f32(n) + j) / ${RAYN}.)); let t = tt - b; let p = ro + rd * t; let d = p - L.p.xyz; let r2 = D2 + tt * tt;
      let w = sat(1. - r2 / (R * R)); let cy = (0. - d.y) * inverseSqrt(max(r2, 1e-4));
      // fog throws light mostly onwards: the haze glows brightest looked at towards the lamp
      let mu = 0. - dot(d, rd) * inverseSqrt(max(r2, 1e-4)); let ph = .3 + 1.9 * pow(.5 + .5 * mu, 4.);
      var e = ph * w * w * select(.4 + .6 * sat(cy * 2. + .6), ss(.0, .5, cy), L.c.w >= 0.) * exp(-SIG * t);
      let dz = max(.01, 0. - d.y); let q = d.xz / (dz * TANL); let ti = i32(L.c.w);
      if (ti >= 0 && ti < 16 && dz > ZN && max(abs(q.x), abs(q.y)) < .985) {
        e *= textureSampleCompareLevel(tSh, sS, (vec2f(f32(ti & 3), f32(ti >> 2u)) + vec2f(q.x, 0. - q.y) * .5 + .5) * .25, ZF * (dz - ZN) / ((ZF - ZN) * dz) - .0012);
      }
      a += e;
    }
    acc += L.c.rgb * (a * (a1 - a0) / (${RAYN}. * D));
  }
  return vec4f(min(acc * g.mis.y, vec3f(30.)), zl);
}
`;
// depth-aware 3x3 blur of the half-res haze (hides the sampling dither)
const W_RBLUR = W_FS + /*wgsl*/`
@group(0) @binding(0) var tR: texture_2d<f32>;
@fragment fn fs(@builtin(position) fc: vec4f) -> @location(0) vec4f {
  let p = vec2i(fc.xy); let mx = vec2i(textureDimensions(tR)) - 1;
  let c = textureLoad(tR, p, 0);
  var acc = vec3f(0.); var ws = 0.;
  for (var y = -1; y <= 1; y++) { for (var x = -1; x <= 1; x++) {
    let r = textureLoad(tR, clamp(p + vec2i(x, y) , vec2i(0), mx), 0);
    let w = 1. / (.03 + abs(r.a - c.a) / c.a);
    acc += r.rgb * w; ws += w;
  } }
  return vec4f(acc / ws, c.a);
}
`;

// ---------------------------------------------------------------- final composite
const W_POST = S_G + W_FS + /*wgsl*/`
@group(0) @binding(0) var<uniform> g: G;
@group(0) @binding(1) var sC: sampler;
@group(0) @binding(2) var tS: texture_2d<f32>;
@group(0) @binding(3) var tR: texture_2d<f32>;
@group(0) @binding(4) var tB: texture_2d<f32>;
@group(0) @binding(5) var tDp: texture_depth${AA > 1 ? '_multisampled' : ''}_2d;
fn sat3(x: vec3f) -> vec3f { return clamp(x, vec3f(0.), vec3f(1.)); }
fn tmap(x: vec3f) -> vec3f { return sat3((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14)); }
@fragment fn fs(@builtin(position) fc: vec4f) -> @location(0) vec4f {
  let px = vec2i(fc.xy);
  let uv = fc.xy * g.res.zw;
  let zf = g.fwd.w / max(textureLoad(tDp, px, 0), 1e-6);
  // depth-aware upsample of the half-res haze
  let h = fc.xy * .5 - .5; let b = floor(h); let f = h - b; let bi = vec2i(b);
  let mx = vec2i(textureDimensions(tR)) - 1;
  var acc = vec3f(0.); var ws = 0.;
  for (var k = 0; k < 4; k++) {
    let o = vec2i(k & 1, k >> 1u);
    let r = textureLoad(tR, clamp(bi + o, vec2i(0), mx), 0);
    let bw = mix(1. - f.x, f.x, f32(o.x)) * mix(1. - f.y, f.y, f32(o.y));
    let w = (bw + .02) / (.02 + abs(r.a - zf) / zf);
    acc += r.rgb * w; ws += w;
  }
  var c = textureLoad(tS, px, 0).rgb + acc / ws;
  let bl = textureSampleLevel(tB, sC, uv, 0.).rgb;
  c = mix(c, bl, .10) + bl * .05;
  c *= g.mis.x;
  let q = uv - .5;
  c *= 1. - dot(q, q) * .7;
  c = tmap(c);
  let l0 = dot(c, vec3f(.2126, .7152, .0722));
  let l = mix(l0, l0 * l0 * (3. - 2. * l0), .35);
  c *= l / max(l0, 1e-4);
  // a tired, slightly green-brown grade
  c = mix(vec3f(l), c, .86) * vec3f(1.01, 1., .95) + vec3f(.004, .004, .002);
  c = pow(max(c, vec3f(0.)), vec3f(1. / 2.2));
  // the grain of a camera pushed too far in the dark, then a dither against banding
  let tk = floor(g.cam.w * 24.);
  c += (ign(fc.xy + tk * vec2f(11.3, 7.7)) - .5) * (${fl(GRAIN)}) * (1. - l * .6);
  let n = ign(fc.xy) + ign(fc.xy + 37.) - 1.;
  return vec4f(c + n / 255., 1.);
}
`;
