// ============================================================================
// WGSL sources
// ============================================================================
const fl = (x) => (Number.isInteger(x) ? x + '.' : '' + x); // a JS number as a WGSL float literal
const TANL = 2.2, ZN = 1, ZF = 60; // every street lamp's shadow tile looks straight down: tan of its half angle, depth range
const WDX = 0.553, WDZ = 0.833; // the wind blows from the north-west
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
// wind (travelled offset, strength), pap (paper travel), tr (train x, direction, present), rc (cars on the far road:
// x, direction, present), lamps (position + reach, colour + shadow tile or -1)
const S_G = /*wgsl*/`
struct Lamp { p: vec4f, c: vec4f };
struct G { vp: mat4x4f, cam: vec4f, right: vec4f, up: vec4f, fwd: vec4f, res: vec4f, mis: vec4f, wind: vec4f, pap: vec4f, tr: vec4f, rc: array<vec4f, 4>, lamp: array<Lamp, ${NL}> };
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
fn fog(c: vec3f, wp: vec3f) -> vec3f { let v = wp - g.cam.xyz; let d = length(v); let T = exp(-SIG * d); return c * T + fogc(v / d) * (1. - T); }
fn qrot(q: vec4f, v: vec3f) -> vec3f { return v + 2. * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
// the viewer's room: lamp light gets in only through the window (d: vector to the lamp)
fn inroom(p: vec3f) -> bool { return all(p > ${v3([ROOM[0] - 0.1, ROOM[1] - 0.1, WINB[2]])}) && all(p < ${v3([ROOM[3] + 0.1, ROOM[4] + 0.1, ROOM[5] + 0.1])}); }
fn through(p: vec3f, d: vec3f) -> f32 {
  if (d.z > -.01) { return 0.; }
  let h = p + d * ((${fl(WINB[2])} - p.z) / d.z);
  let e = min(h.xy - vec2f(${WINB.slice(0, 2).map(fl).join(',')}), vec2f(${WINB.slice(3, 5).map(fl).join(',')}) - h.xy);
  return ss(-.02, .04, min(e.x, e.y));
}
// where p falls in lamp L's tile of the shadow atlas: uv, depth, 1 when it is inside the tile
fn lsuv(L: Lamp, p: vec3f) -> vec4f {
  let d = p - L.p.xyz; let dz = max(.01, 0. - d.y); let q = d.xz / (dz * TANL); let t = i32(L.c.w);
  let ok = f32(t >= 0 && dz > ZN && max(abs(q.x), abs(q.y)) < .985);
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
fn lid(p: vec3f, k: i32) -> u32 { let c = vec2i(clamp((p.xz + 192.) / 6., vec2f(0.), vec2f(63.))); return textureLoad(tL, vec2i(c.x * 2 + (k >> 2u), c.y), 0)[k & 3]; }
// lamp light on a surface: diffuse and specular; gl: gloss 0..1
struct LT { d: vec3f, s: vec3f };
fn lit(p: vec3f, n: vec3f, V: vec3f, gl: f32) -> LT {
  var o: LT; o.d = vec3f(0.); o.s = vec3f(0.);
  let ns = exp2(gl * 10.); let rm = inroom(p);
  for (var k = 0; k < 8; k++) {
    let id = lid(p, k); if (id > 100u) { break; }
    let L = g.lamp[id]; let d = L.p.xyz - p; let r2 = dot(d, d); let w = sat(1. - r2 / (L.p.w * L.p.w));
    if (w <= 0.) { continue; }
    let l = d * inverseSqrt(r2);
    var E = L.c.rgb * (w * w / (r2 + 1.) * lcone(L, l) * lsh4(L, p + n * .07));
    if (rm) { E *= through(p, d); }
    let ndl = sat(dot(n, l));
    o.d += E * ndl;
    let h = normalize(l + V); let fr = .04 + .96 * pow(1. - sat(dot(h, V)), 5.);
    o.s += E * (pow(sat(dot(n, h)), ns) * (ns + 8.) * .04 * fr * sat(ndl * 6.));
  }
  return o;
}
// lamp light arriving at a point in the air (snow, steam, grass tips)
fn glow(p: vec3f) -> vec3f {
  var o = vec3f(0.);
  for (var k = 0; k < 8; k++) {
    let id = lid(p, k); if (id > 100u) { break; }
    let L = g.lamp[id]; let d = L.p.xyz - p; let r2 = dot(d, d); let w = sat(1. - r2 / (L.p.w * L.p.w));
    if (w <= 0.) { continue; }
    o += L.c.rgb * (w * w / (r2 + 1.) * lcone(L, d * inverseSqrt(r2)) * lsh(L, p));
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
  var w = i.a.xyz + qrot(i.b, p);
  if (an == 1 && live) {
    // trees and wires: the shade bits are the sway weight, 0 at the trunk
    let ph = dot(i.a.xz, vec2f(.13, .09)) + i.c.y * 20.; let k = sh * sh; let gu = g.wind.w;
    w += WDIR * (k * (.04 + .34 * gu) * (.6 + .5 * sin(t * 1.1 + ph + w.y * .2)))
       + vec3f(sin(t * 3.7 + ph * 3. + w.y), .3 * cos(t * 4.3 + ph * 2. + w.x), cos(t * 3.1 + ph * 2.3 + w.y * 1.3)) * (k * sh * (.01 + .05 * gu));
  }
  if (an == 2) { w.x += g.tr.x; if (g.tr.z < .5) { w.y -= 60.; } }
  o.cp = g.vp * vec4f(w, 1.); o.wp = w; o.n = qrot(i.b, i.n.xyz); o.op = i.p * i.a.w; o.on = i.n.xyz;
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
  let gm = textureSampleLevel(tM, sC, i.wp.xz / 384. + .5, 0.);
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
      ao *= gm.r; snowK = .1 * (1. - pud); cov = gm.g * .55 + dB.a * .35 - .2;
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
      gl = .08; bump = .4;
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
    }
    case 7 { alb = pal(i.m.x) * (.65 + .5 * wA.b) * (.8 + .3 * wB.b); gl = .3; }
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
    case 10 { alb = vec3f(.30, .30, .28) * (.7 + .4 * wA.b) * (.8 + .3 * wB.b) * mix(1., .65, ss(.55, .8, wS.a)); gl = .1; }
    case 11 { alb = vec3f(.26, .02, .02); gl = .7; }
    case 13 { alb = vec3f(.25, .26, .27); gl = .95; }
    case 14 { alb = vec3f(.50, .36, .03) * (.7 + .4 * wA.b); gl = .35; }
    default { alb = vec3f(.04, .13, .06) * (.65 + .5 * wA.b); gl = .3; }
  }
  // thin, patchy November snow on whatever faces the sky
  let sn = snowK * ss(.62, .9, n0.y) * ss(.47, .6, cov);
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
// painted there (interior mapping), with wallpaper, furniture, curtains and a lamp chosen by the pane's seed.
// Types: 0 window, 1 balcony glazing, 2 stairwell.
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
fn hue(h: f32) -> vec3f { return .5 + .5 * cos(TAU * (h + vec3f(0., .33, .67))); }
@fragment fn fs(i: WO) -> @location(0) vec4f {
  let n = vec3f(i.nr.x, 0., i.nr.y); let r = vec3f(i.nr.z, 0., i.nr.w); let sz = i.sz.xy; let sd = i.sz.z; let ty = i32(i.sz.w + .5);
  let p = i.uv * sz * .5; let aa = max(fwidth(p.x), fwidth(p.y));
  let V0 = i.wp - g.cam.xyz; let dist = length(V0); let rw = V0 / dist; let t = g.cam.w;
  let dt = textureSample(tD, sR, i.wp.xy * .6 + i.wp.z * .37 + sd);
  let h1 = hs(sd * 91.3 + 1.7); let h2 = hs(sd * 37.7 + 5.1); let h3 = hs(sd * 13.3 + 9.9); let h4 = hs(sd * 57.1 + 3.3); let h5 = hs(sd * 23.9 + 4.4);
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
  let h = vec3f(p, 0.) + rd * tm; let u = (h.x - x0) / (x1 - x0); let v = h.y - y0; let xm = (x0 + x1) * .5;
  // --- is anyone home, and by what light
  var on = step(h1, .075);
  on = mix(on, step(.6, hs(floor(t / (50. + 90. * h3) + h4) + sd * 7.)), step(.93, hs(sd * 71.7)));
  if (ty == 2) { on = step(.1, h1); }
  if (ty == 1) { on = step(h1, .05); }
  var lc = vec3f(1., .60, .28) * 5.;
  if (h3 > .5) { lc = vec3f(1., .78, .50) * 5.; }
  if (h3 > .8) { lc = vec3f(.8, .95, 1.1) * 4.5; }
  if (h3 < .14) { lc = vec3f(1., .22, .55) * 3.2; }
  let tv = f32(h3 >= .14 && h3 < .3 && ty == 0);
  let tt = t * 4. + sd * 50.; let flick = .5 + .5 * mix(hs(floor(tt)), hs(floor(tt) + 1.), fract(tt));
  lc = mix(lc, vec3f(.25, .42, 1.) * (1.3 * flick + .3), tv);
  if (ty == 2) { lc = vec3f(.80, .85, .50) * 1.2; }
  // --- what the ray hits
  let wc = .22 + .2 * hue(h4) + .12; let pat = sat(1. - aa * 10.);
  var alb = vec3f(.3); var scr = 0.;
  if (tm == tz) {
    alb = wc * (1. - .14 * pat * step(.5, fract(h.x * (5. + 6. * h2))));
    if (ty == 0) {
      if (h2 > .62) {
        // a carpet on the wall
        let cq = vec2f(h.x - xm, v - 1.6); let inC = step(abs(cq.x), .95) * step(abs(cq.y), .65);
        let orn = (.5 + .5 * cos(cq.x * 13.) * cos(cq.y * 13.)) * pat; let bor = step(.8, max(abs(cq.x) / .95, abs(cq.y) / .65));
        alb = mix(alb, mix(vec3f(.36, .05, .04), vec3f(.50, .36, .16), orn * .6 + bor * .3), inC);
      } else if (h2 < .34) {
        // the wall unit: dark doors, books behind glass in the middle
        let inU = step(v, 2.05) * step(.1, u) * step(u, .9); let cx = fract(u * 5.);
        var uc = vec3f(.16, .08, .04) * (.55 + .45 * ss(.0, .05, min(cx, 1. - cx)));
        let bk = hs(floor(h.x * 28.) + floor(v * 3.) * 7.);
        uc = mix(uc, hue(bk) * (.12 + .5 * step(.14, fract(v * 3.))) * (.4 + .6 * pat), step(.4, u) * step(u, .6) * step(.7, v));
        alb = mix(alb, uc, inU);
      } else {
        let cq = vec2f(h.x - mix(x0, x1, .3 + .4 * h1), v - 1.65); let inP = step(abs(cq.x), .32) * step(abs(cq.y), .24);
        alb = mix(alb, mix(vec3f(.08, .05, .03), .12 + .25 * hue(h1 + cq.y), step(abs(cq.x), .28) * step(abs(cq.y), .2)), inP);
      }
      let tq = vec2f(h.x - mix(x0, x1, .72), v - .95);
      scr = step(abs(tq.x), .42) * step(abs(tq.y), .25) * tv;
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
    alb = wc * .82;
    if (ty == 2) { alb = mix(vec3f(.46, .46, .40), vec3f(.08, .19, .14), step(v, 1.6)); }
    if (ty == 0 && rd.x * (h4 - .5) > 0.) { alb = mix(alb, vec3f(.13, .07, .04) * (.6 + .4 * step(.04, abs(fract(h.z * 1.6) - .5))), step(v, 2.1) * step(.3 * z1, h.z) * step(h.z, .85 * z1)); }
  } else if (rd.y > 0.) { alb = vec3f(.60, .58, .54); }
  else { alb = mix(vec3f(.20, .12, .07), .1 + .25 * hue(h1 + .4), step(length((h.xz - vec2f(xm, z1 * .55)) / vec2f(1.2, .9)), 1.) * step(.5, h4)); }
  // --- light in the room: from the lamp under the ceiling, or from the screen
  let lp = vec3f(xm, y1 - .45, z1 * .5); let tp = vec3f(mix(x0, x1, .72), y0 + .95, z1 - .2);
  let I = mix(1.3 / (.7 + dot(h - lp, h - lp)), .8 / (.5 + dot(h - tp, h - tp)), tv);
  var c = alb * lc * I * on;
  if (ty == 1) { c = alb * (Lo.d * .25 + FCOL) + lc * scr * on * .5; } else { c += vec3f(.4, .6, 1.) * (scr * on * 3. * (.4 + flick)); }
  if (ty != 1) {
    // furniture standing in the room: a sofa or a table with chairs
    let zc = z1 * .55; let tc = zc / rd.z;
    if (tc < tm && ty == 0) {
      let cp = vec3f(p + rd.xy * tc, zc); let q = vec2f(cp.x - mix(x0, x1, .35 + .3 * h1), cp.y - y0); var mk = 0.;
      if (h4 < .5) { mk = step(abs(q.x), .95) * step(q.y, .82) * step(.08, q.y) + step(abs(abs(q.x) - .9), .1) * step(q.y, .62); }
      else { mk = step(abs(q.x), .62) * step(abs(q.y - .74), .03) + step(abs(abs(q.x) - .52), .03) * step(q.y, .74) + step(abs(q.x - .9), .035) * step(q.y, .98) + step(abs(q.x - .74), .2) * step(abs(q.y - .46), .03); }
      let fc_ = mix(.06 + .16 * hue(h2 + .2), vec3f(.10, .06, .035), step(.5, h4));
      c = mix(c, fc_ * lc * (mix(1.3 / (.7 + dot(cp - lp, cp - lp)), .3, tv) * on), sat(mk));
    }
    // the lamp itself
    let pl = lp - vec3f(p, 0.); let tl = max(dot(pl, rd), 0.); let dq = length(pl - rd * tl);
    c += lc * ((exp(-dq * dq * 70.) * 2.6 + exp(-dq * dq * 8.) * .3) * on * (1. - tv) * f32(tl < tm));
    // somebody stands at the window and looks out
    if (ty == 0 && hs(sd * 3.3) > .88) {
      let k = .45 / rd.z; let q = vec2f(p.x + rd.x * k - sz.x * (h2 - .5) * .5 - .02 * sin(t * .31 + sd * 9.), p.y + rd.y * k + sz.y * .5 - .68);
      let body = max(step(length(q), .105), step(abs(q.x), .25 - .12 * sat((q.y + .34) / .16)) * step(q.y, -.13));
      c = mix(c, c * .03, body * step(.5, on));
    }
  }
  if (ty == 0) {
    // a plant on the sill
    let k = .15 / rd.z; let q = vec2f(p.x + rd.x * k - sz.x * (.3 - .6 * h4), p.y + rd.y * k + sz.y * .5);
    let pm = max(step(abs(q.x), .07) * step(q.y, .12), step(length(q - vec2f(0., .26)), .12 + .035 * sin(atan2(q.y - .26, q.x) * 5. + sd * 9.)));
    c = mix(c, vec3f(.02, .045, .02) * (lc * on * .12 + Lo.d * .3 + FCOL), pm * step(.55, hs(sd * 5.5)));
    // curtains: none, net, net and drapes, drapes drawn
    let fold = mix(.5, .5 + .5 * sin(p.x * (34. + 20. * h2) + 2. * sin(p.y * 2.3 + h1 * 9.)), sat(1. - aa * 30.));
    let cv = select(select(0., .2 + .45 * h4, h5 > .6), 1., h5 > .85);
    let dr = step(sz.x * .5 * (1. - cv), abs(p.x) + 1e-4) * f32(cv > 0.);
    let net = f32(h5 > .25) * (.36 + .26 * fold) * (1. - dr);
    c = mix(c, vec3f(.8) * (lc * .22 * on * (1. - tv * .6) + Lo.d * .3 + FCOL * .7), net);
    c = mix(c, (.18 + .4 * hue(h1 + .3)) * (.55 + .45 * fold) * (lc * .2 * on + Lo.d * .25 + FCOL * .5), dr);
  }
  // --- glass over it all: the haze and the lamps mirrored, grime
  let fres = .04 + .96 * pow(1. - sat(dot(-rw, n)), 5.);
  c = c * (1. - fres) * (.72 + .28 * dt.a) + fogc(reflect(rw, n)) * 1.5 * fres + Lo.s * 2.;
  let fa = select(vec3f(.40, .40, .38), vec3f(.10, .06, .04), h4 > .7 && ty == 0) * (.7 + .4 * dt.b);
  c = mix(c, fa * (Lo.d + FCOL * .9), fm);
  return fin(fog(c, i.wp));
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
struct VO { @builtin(position) cp: vec4f, @location(0) uv: vec2f, @location(1) @interpolate(flat) pr: vec4f, @location(2) wp: vec3f };
fn quad(i: u32) -> vec2f { return vec2f(f32(i & 1u), f32(i >> 1u)) * 2. - 1.; }
// behind everything: the glowing haze, with slow low cloud overhead
@vertex fn vsB(@builtin(vertex_index) i: u32) -> VO {
  var o: VO; let p = quad(i);
  o.wp = g.cam.xyz + g.fwd.xyz + g.right.xyz * (p.x * g.right.w) + g.up.xyz * (p.y * g.up.w);
  o.cp = vec4f(p, 1e-7, 1.); o.uv = p; o.pr = vec4f(0.);
  return o;
}
@fragment fn fsB(i: VO) -> @location(0) vec4f {
  let rd = normalize(i.wp - g.cam.xyz);
  let q = rd.xz / (abs(rd.y) + .25) * .09 + g.wind.xz * .0006;
  let cl = textureSampleLevel(tD, sR, q, 0.).a * .6 + textureSampleLevel(tD, sR, q * 2.3 + .4, 0.).b * .4;
  return fin(fogc(rd) * (1. + (cl - .5) * .5 * ss(.0, .35, rd.y)));
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
  let room = all(p > vec3f(${ROOM.slice(0, 3).map((v) => fl(v - 0.3)).join(',')})) && all(p < vec3f(${ROOM.slice(3).map((v) => fl(v + 0.3)).join(',')}));
  let cvr = min(1., sz / px); let fade = ss(B * .5, B * .34, d) * ss(.25, 1.2, d) * cvr * cvr * ss(.0, .3, p.y) * f32(!room);
  o.pr = vec4f((glow(p) * .5 + FCOL * 1.1) * fade, d);
  if (fade <= 0.) { o.cp = vec4f(0., 0., 2., 1.); }
  return o;
}
@fragment fn fsSnow(i: VO) -> @location(0) vec4f {
  let m = ss(1., .15, length(i.uv));
  return vec4f(min(i.pr.rgb * (m * m * exp(-SIG * i.pr.w)), vec3f(12.)), 0.);
}
// glare: the star a lamp makes in a lens, the beacons on the mast and the chimney, lights of far cars and of the train
@vertex fn vsGl(@builtin(vertex_index) vi: u32, @location(0) a: vec4f, @location(1) b: vec4f) -> VO {
  var o: VO; let q = quad(vi); let t = g.cam.w; let k = i32(b.w + .5);
  var p = a.xyz; var col = b.rgb;
  if (k >= 10 && k < 40) { let L = g.lamp[k - 10]; col = L.c.rgb * select(.011, .12, L.c.w < 0.); }
  if (k == 1) { col *= .12 + .88 * ss(.0, .12, fract(t * .42)) * ss(.62, .45, fract(t * .42)); }
  if (k == 2) { col *= .12 + 1.6 * pow(max(sin(t * .7), 0.), 24.); }
  if (k >= 40 && k < 48) {
    // a car on the far road: white in front, red behind
    let c = g.rc[(k - 40) & 3]; let rear = k >= 44;
    p = vec3f(c.x + select(2., -2., rear) * c.y, .7, (${fl(ROADZ)}) - 1.8 * c.y);
    let f = max(dot(vec3f(c.y, 0., 0.), normalize(g.cam.xyz - p)), 0.);
    col = select(vec3f(3.4, 3.2, 2.8) * (.15 + 5. * f * f), vec3f(1.6, .06, .03), rear) * c.z;
  }
  if (k == 50) {
    p = vec3f(g.tr.x + select(-11.8, 224.2, g.tr.y > 0.), ${fl(RAILY + 3)}, ${fl(RAILZ)});
    let f = max(dot(vec3f(g.tr.y, 0., 0.), normalize(g.cam.xyz - p)), 0.); col *= (.2 + 6. * f * f * f) * g.tr.z;
  }
  let v = p - g.cam.xyz; let d = length(v); let sz = a.w * (.3 + d * .017);
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
  let sz = a.w * (.45 + 2.6 * life);
  let w = p + (g.right.xyz * q.x + g.up.xyz * q.y) * sz;
  o.cp = g.vp * vec4f(w, 1.); o.uv = q; o.wp = p;
  o.pr = vec4f(glow(p) * .12 + FCOL * 2.2, ss(.0, .12, life) * pow(1. - life, 1.4) * .2);
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
  for (var k = 0; k < ${LAMPS.length}; k++) {
    let L = g.lamp[k]; let oc = ro - L.p.xyz; let R = L.p.w * select(.75, .95, L.c.w >= 0.);
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
      if (ti >= 0 && dz > ZN && max(abs(q.x), abs(q.y)) < .985) {
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
