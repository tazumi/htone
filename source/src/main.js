// ============================================================================
// renderer, camera and input
// ============================================================================
const $ = (id) => document.getElementById(id);
const canvas = $('c'), info = $('i'), body = document.body;
// a phone held upright gets the page turned on its side (see template.html)
const rot = matchMedia('(orientation:portrait) and (pointer:coarse)');
// loading bar: each stage glides it to `to` (the share done) over ~`ms` on the compositor, so it moves while this
// thread is busy
let loaded = 0, dead; // dead: the graphics device was lost
const say = (m, to, ms) => {
  if (!dead) $('s').textContent = m;
  const a = $('b').animate({ transform: [`scaleX(${loaded})`, `scaleX(${to})`] }, { duration: ms, fill: 'forwards', easing: 'cubic-bezier(.3,.5,.5,1)' });
  loaded = to;
  // go on once the animation runs: one not started before the thread gets busy stays stuck (timer: hidden tabs)
  return new Promise((r) => { a.ready.then(() => setTimeout(r)); setTimeout(r, document.hidden ? 0 : 1e3); });
};
const fail = (m) => { throw new Error(m, { cause: 1 }); }; // cause marks a message that is shown as it is
if (!navigator.gpu) fail(T.noGpu);
const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
if (!adapter) fail(T.noAdapter);
$('w').hidden = !!navigator.userAgentData; // only Chromium-based browsers have it
const hasTS = adapter.features.has('timestamp-query');
const device = await adapter.requestDevice({ requiredFeatures: hasTS ? ['timestamp-query'] : [] });
device.addEventListener('uncapturederror', (e) => console.error('GPU: ' + e.error.message));
// out of memory or a GPU timeout: reload a level lower, or on Low say what happened
device.lost.then((l) => {
  if (l.reason === 'destroyed') return; // the page is closing
  if (LV < 2) { keep('htone', LV + 1); location.reload(); }
  dead = body.className = 'l e'; $('s').textContent = T.lost;
});
const ctx = canvas.getContext('webgpu'), FMT = navigator.gpu.getPreferredCanvasFormat();
const Q = device.queue, HDR = 'rgba16float', DEPTH = 'depth32float';
const TU = GPUTextureUsage, BU = GPUBufferUsage, SS = GPUShaderStage;

const mod = (code) => device.createShaderModule({ code });
const buf = (data, usage) => { const b = device.createBuffer({ size: max(16, (data.byteLength + 3) & ~3), usage: usage | BU.COPY_DST }); Q.writeBuffer(b, 0, data.buffer || data, data.byteOffset || 0, data.byteLength); return b; };
const tex = (w, h, format, usage, o = {}) => device.createTexture({ size: [w, h], format, usage, mipLevelCount: o.mips || 1, sampleCount: o.samples || 1 });

// ---------------------------------------------------------------- static resources
const sRep = device.createSampler({ addressModeU: 'repeat', addressModeV: 'repeat', magFilter: 'linear', minFilter: 'linear', mipmapFilter: 'linear', maxAnisotropy: LV > 1 ? 1 : 8 });
const sClamp = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
const sCmp = device.createSampler({ compare: 'less-equal', magFilter: 'linear', minFilter: 'linear' });
const tShadow = tex(SHADOW, SHADOW, DEPTH, TU.RENDER_ATTACHMENT | TU.TEXTURE_BINDING);
const tDummy = tex(1, 1, DEPTH, TU.RENDER_ATTACHMENT | TU.TEXTURE_BINDING);
const tDetail = tex(1024, 1024, 'rgba8unorm', TU.RENDER_ATTACHMENT | TU.TEXTURE_BINDING, { mips: 11 });
const tMap = tex(MAPW, MAPH, 'rgba8unorm', TU.TEXTURE_BINDING | TU.COPY_DST);
const tLamp = tex(LGN * 2, LGN, 'rgba8uint', TU.TEXTURE_BINDING | TU.COPY_DST);
const tAtlas = tex(ATLAS, ATLASH, 'rgba8unorm', TU.TEXTURE_BINDING | TU.COPY_DST | TU.RENDER_ATTACHMENT, { mips: 12 });

// the uniform block G (see shaders.js): offsets in floats
const U_CAM = 16, U_RIGHT = 20, U_UP = 24, U_FWD = 28, U_RES = 32, U_MIS = 36, U_WIND = 40, U_PAP = 44, U_TR = 48, U_TR2 = 52, U_PL = 56, U_EV = 60, U_HN = 64, U_HZ = 68, U_RC = U_HZ + 48, U_EX = U_RC + NRC * 4, U_ACT = U_EX + 8, U_LAMP = U_ACT + NACT * 8, NL = LAMPS.length;
const UB = new Float32Array(U_LAMP + NL * 8);
const ubo = device.createBuffer({ size: UB.byteLength, usage: BU.UNIFORM | BU.COPY_DST });
LAMPS.forEach((l, i) => UB.set([l.x, l.y, l.z, l.r, l.c[0], l.c[1], l.c[2], l.t], U_LAMP + i * 8));

const VF = SS.VERTEX | SS.FRAGMENT;
const bgl0 = device.createBindGroupLayout({ entries: [
  { binding: 0, visibility: VF, buffer: {} },
  { binding: 1, visibility: VF, sampler: {} }, { binding: 2, visibility: VF, sampler: {} }, { binding: 3, visibility: VF, sampler: { type: 'comparison' } },
  { binding: 4, visibility: VF, texture: { sampleType: 'depth' } },
  { binding: 5, visibility: VF, texture: {} }, { binding: 6, visibility: VF, texture: {} }, { binding: 7, visibility: VF, texture: { sampleType: 'uint' } },
  { binding: 8, visibility: VF, texture: {} }] });
const mkBG0 = (u, sh) => device.createBindGroup({ layout: bgl0, entries: [
  { binding: 0, resource: { buffer: u } }, { binding: 1, resource: sRep }, { binding: 2, resource: sClamp }, { binding: 3, resource: sCmp },
  { binding: 4, resource: sh.createView() }, { binding: 5, resource: tDetail.createView() }, { binding: 6, resource: tMap.createView() }, { binding: 7, resource: tLamp.createView() }, { binding: 8, resource: tAtlas.createView() }] });
const bg0 = mkBG0(ubo, tShadow);
const pl0 = device.createPipelineLayout({ bindGroupLayouts: [bgl0] });

const bglBlit = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: SS.FRAGMENT, texture: {} }, { binding: 1, visibility: SS.FRAGMENT, sampler: {} }] });
const plBlit = device.createPipelineLayout({ bindGroupLayouts: [bglBlit] });
const mBlit = mod(W_BLIT);
const blitPipe = (entry, format, add) => device.createRenderPipeline({ layout: plBlit, vertex: { module: mBlit, entryPoint: 'vs' },
  fragment: { module: mBlit, entryPoint: entry, targets: [{ format, blend: add ? { color: { srcFactor: 'one', dstFactor: 'one' }, alpha: { srcFactor: 'one', dstFactor: 'one' } } : undefined }] } });
const pMip8 = blitPipe('fsMip', 'rgba8unorm'), pDown0 = blitPipe('fsDown0', HDR), pDown = blitPipe('fsDown', HDR), pUp = blitPipe('fsUp', HDR, true);
const blitBG = (view) => device.createBindGroup({ layout: bglBlit, entries: [{ binding: 0, resource: view }, { binding: 1, resource: sClamp }] });
const colorAtt = (view, clear) => ({ view, loadOp: clear ? 'clear' : 'load', storeOp: 'store', clearValue: [0, 0, 0, 0] });

// vertex layouts
const A = (shaderLocation, offset, format) => ({ shaderLocation, offset, format });
const vbSolid = { arrayStride: 16, attributes: [A(0, 0, 'float32x3'), A(1, 12, 'snorm8x4')] };
const ibSolid = { arrayStride: 48, stepMode: 'instance', attributes: [A(2, 0, 'float32x4'), A(3, 16, 'float32x4'), A(4, 32, 'float32x4')] };
const ibLeaf = { arrayStride: 36, stepMode: 'instance', attributes: [A(0, 0, 'float32x4'), A(1, 16, 'float32x4'), A(2, 32, 'unorm8x4')] };
const ibPair = { arrayStride: 32, stepMode: 'instance', attributes: [A(0, 0, 'float32x4'), A(1, 16, 'float32x4')] };
const ibDec = { arrayStride: 48, stepMode: 'instance', attributes: [A(0, 0, 'float32x4'), A(1, 16, 'float32x4'), A(2, 32, 'float32x4')] };
const ibSnow = { arrayStride: 16, stepMode: 'instance', attributes: [A(0, 0, 'float32x4')] };

const scenePipe = (m, vsE, fsE, buffers, o = {}) => device.createRenderPipeline({ layout: pl0,
  vertex: { module: m, entryPoint: vsE, buffers, constants: o.constants },
  fragment: { module: m, entryPoint: fsE, targets: [{ format: HDR, blend: o.blend }] },
  primitive: { topology: o.strip ? 'triangle-strip' : 'triangle-list', cullMode: 'none' },
  depthStencil: { format: DEPTH, depthWriteEnabled: !o.blend, depthCompare: 'greater' }, multisample: { count: AA } });
const shadowPipe = (m, vsE, buffers) => device.createRenderPipeline({ layout: pl0,
  vertex: { module: m, entryPoint: vsE, buffers },
  primitive: { topology: 'triangle-list', cullMode: 'none' },
  depthStencil: { format: DEPTH, depthWriteEnabled: true, depthCompare: 'less', depthBias: 2, depthBiasSlopeScale: 1.5 } });

await say(T.shaders, 0.1, 300);
const mDec = mod(W_DEC), mSolid = mod(W_SOLID), mWin = mod(W_WIN), mLeaf = mod(W_LEAF), mSpr = mod(W_SPR);
const ADD = { color: { srcFactor: 'one', dstFactor: 'one' }, alpha: { srcFactor: 'one', dstFactor: 'one' } };
const OVER = { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' } };
const pSolid = scenePipe(mSolid, 'vs', 'fs', [vbSolid, ibSolid]);
const pWin = scenePipe(mWin, 'vs', 'fs', [ibPair], { strip: true });
const pDec = scenePipe(mDec, 'vs', 'fs', [ibDec], { strip: true, blend: OVER });
const pLeaf = scenePipe(mLeaf, 'vs', 'fs', [ibLeaf], { strip: true, constants: { ROWS: 5 } });
const pLeafF = scenePipe(mLeaf, 'vs', 'fs', [ibLeaf], { strip: true, constants: { ROWS: 3 } });
const pBack = scenePipe(mSpr, 'vsB', 'fsB', [], { strip: true });
const pSnow = scenePipe(mSpr, 'vsSnow', 'fsSnow', [ibSnow], { strip: true, blend: ADD });
const pDrift = scenePipe(mSpr, 'vsDrift', 'fsDrift', [ibSnow], { strip: true, blend: ADD });
const pGl = scenePipe(mSpr, 'vsGl', 'fsGl', [ibPair], { strip: true, blend: ADD });
const pPap = scenePipe(mSpr, 'vsPap', 'fsPap', [ibPair], { strip: true });
const pSt = scenePipe(mSpr, 'vsSt', 'fsSt', [ibPair], { strip: true, blend: OVER });
const pSolidSh = shadowPipe(mSolid, 'vs', [vbSolid, ibSolid]);

const mRays = mod(W_RAYS), mPost = mod(W_POST), mRB = mod(W_RBLUR);
const pRB = device.createRenderPipeline({ layout: 'auto', vertex: { module: mRB, entryPoint: 'vs' }, fragment: { module: mRB, entryPoint: 'fs', targets: [{ format: HDR }] } });
const pRays = device.createRenderPipeline({ layout: 'auto', vertex: { module: mRays, entryPoint: 'vs' }, fragment: { module: mRays, entryPoint: 'fs', targets: [{ format: HDR }] } });
const pPost = device.createRenderPipeline({ layout: 'auto', vertex: { module: mPost, entryPoint: 'vs' }, fragment: { module: mPost, entryPoint: 'fs', targets: [{ format: FMT }] } });

// ---------------------------------------------------------------- world generation
await say(T.houses, 0.45, 1500);
// marks a load in progress (quality.js); leaving the page before it ends is not a crash
keep('htoneLoad', 1);
addEventListener('pagehide', () => keep('htoneLoad', ''));
const Wd = makeWorld(), meshes = Wd.meshes;
// the decal atlas, and the decals with their cells looked up by name
const AT = makeAtlas();
Q.copyExternalImageToTexture({ source: AT.cv }, { texture: tAtlas, premultipliedAlpha: true }, [ATLAS, ATLASH]);
const decF = new Float32Array(Wd.decals.length * 12);
Wd.decals.forEach((d, i) => { decF.set(d.slice(0, 8), i * 12); decF.set(AT.R[d[8]], i * 12 + 8); });

// preset viewpoints (position, look-at), keys 1-6: at the window, among the cars, under the lamp, on the playground,
// on the roof of the tower, by the railway
const POSES = [
  [EYE[0], EYE[1], EYE[2], 7.5, 3.5, -30],
  [-4, 1.7, 19, 6, 1.4, -30],
  [8.3, 1.65, 15.5, 10.4, 9, 8.5],
  [27, 1.6, -1, -28, 9, -12],
  [6, 28.7, -63.4, 3, 4, 20],
  [-34, 3.4, -172, 70, 4.2, -186],
];
// 60 s camera path (position + look-at, Catmull-Rom): out of the window, through the yard, up the tower, to the railway;
// dev.js flies along it
const FLY = new Float32Array([
  EYE[0], EYE[1], EYE[2], 9, 1, -16,
  2.55, 11.2, 40, 9, 0, -20,
  4, 8, 30, 8, 0, -10,
  2, 3, 18, 8, 1, -10,
  4, 1.8, 6, 9, 3, -14,
  9, 2.5, -8, 11, 8, -22,
  16, 2, -12, 24, 1, -6,
  26, 2.2, -2, 0, 6, -10,
  8, 4, -6, -28, 8, -8,
  -18, 8, -8, -28, 9, -20,
  -22, 9, -30, -28, 9, -45,
  -18, 10, -48, 0, 14, -66,
  -8, 16, -56, 6, 18, -68,
  -1, 26, -58, 6, 28, -72,
  6, 33, -66, 6, 6, 30,
  6, 34, -84, -40, 4, -180,
  -10, 20, -122, -40, 3, -185,
  -30, 6, -166, 40, 4, -186,
]);
const FLYN = FLY.length / 6, FLYT = 60, LUTN = 1024, flyLUT = new Float32Array(LUTN + 1);
// per-frame float state lives in one preallocated array, so the frame loop allocates no heap numbers
const F = new Float64Array(128), P6 = new Float64Array(6);
const CX = 0, CY = 1, CZ = 2, YAW = 3, PIT = 4, FX = 5, FY = 6, FZ = 7, RX = 8, RZ = 9, UX = 10, UY = 11, UZ = 12, VX = 13, VY = 14, VZ = 15, TIME = 16, FLT = 17, LAST = 18, GPU = 19, HUDT = 20, SPL = 21, MX = 22, MY = 23, MZ = 24,
  BLZ = 82, KET = 83, CALM = 87, FALLT = 88, BAL = 84, TOUR = 85, TOURT = 86, GUST = 25, WX = 26, WZ = 27, PAP = 28, TRX = 29, TRD = 30, TRON = 31, FLK = 32, INR = 33, FRX = 34, FRD = 35, FRON = 36, PLX = 37, PLZ = 38, PLH = 39, PLON = 40, DRF = 41, SNOWD = 42, EVA = 43, EVX = 44, EVS = 45, EVL = 46,
  RC = 48; // RC: NRC x (x, direction, present, kind)
// aim the camera from P6 = position + look-at point
function aim() {
  const dx = P6[3] - P6[0], dy = P6[4] - P6[1], dz = P6[5] - P6[2];
  F[CX] = P6[0]; F[CY] = P6[1]; F[CZ] = P6[2];
  F[YAW] = atan2(dx, -dz); F[PIT] = atan2(dy, sqrt(dx * dx + dz * dz));
}
const lookAt = (x, y, z, tx, ty, tz) => { P6[0] = x; P6[1] = y; P6[2] = z; P6[3] = tx; P6[4] = ty; P6[5] = tz; aim(); F[VX] = F[VY] = F[VZ] = 0; };
// camera spline (Catmull-Rom over position + look-at) at parameter F[SPL]
function flyRaw() {
  const s = F[SPL]; let i = floor(s) | 0; if (i > FLYN - 2) i = FLYN - 2;
  const u = s - i, i0 = (i > 0 ? i - 1 : 0) * 6, i1 = i * 6, i2 = (i + 1) * 6, i3 = (i + 2 < FLYN ? i + 2 : FLYN - 1) * 6;
  for (let o = 0; o < 6; o++) {
    const a = FLY[i0 + o], b = FLY[i1 + o], c = FLY[i2 + o], d = FLY[i3 + o];
    P6[o] = 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);
  }
  aim();
}
{ // arc-length table: flyLUT[k] = spline parameter at fraction k/LUTN of the total path length
  const M = 4096, len = new Float32Array(M + 1); let px = 0, py = 0, pz = 0;
  for (let k = 0; k <= M; k++) { F[SPL] = k / M * (FLYN - 1); flyRaw(); if (k) len[k] = len[k - 1] + hypot(F[CX] - px, F[CY] - py, F[CZ] - pz); px = F[CX]; py = F[CY]; pz = F[CZ]; }
  for (let k = 0, j = 0; k <= LUTN; k++) { const d = k / LUTN * len[M]; while (j < M - 1 && len[j + 1] < d) j++; flyLUT[k] = (j + (d - len[j]) / max(len[j + 1] - len[j], 1e-6)) / M * (FLYN - 1); }
}
// camera on the scripted path at time F[FLT]
function flyAt() {
  let s = F[FLT] / FLYT; s = s < 0 ? 0 : s > 1 ? 1 : s; s = s * s * (3 - 2 * s) * 0.25 + s * 0.75;
  s *= LUTN; let k = floor(s) | 0; if (k > LUTN - 1) k = LUTN - 1;
  F[SPL] = flyLUT[k] + (flyLUT[k + 1] - flyLUT[k]) * (s - k); flyRaw();
}

await say(T.lamps, 0.8, 900);
let nV = 0, nI = 0;
for (const m of meshes) { m.v0 = nV; m.i0 = nI; nV += m.nv; nI += m.ib.length; }
const allV = new Uint8Array(nV * 16), allI = new Uint32Array(nI);
for (const m of meshes) { allV.set(new Uint8Array(m.vb), m.v0 * 16); allI.set(m.ib, m.i0); m.n = m.ib.length; m.vb = m.ib = 0; }
const vbMesh = buf(allV, BU.VERTEX), ibMesh = buf(allI, BU.INDEX);
const ibSolids = buf(Wd.data, BU.VERTEX), ibWin = buf(Wd.wins, BU.VERTEX), nWin = Wd.wins.length / 8;
const ibGrass = buf(new Uint8Array(Wd.grass.buf), BU.VERTEX);
const ibSnowB = buf(Wd.snow, BU.VERTEX), ibGlare = buf(Wd.glare, BU.VERTEX), ibSteam = buf(Wd.steam, BU.VERTEX), ibPaper = buf(Wd.paper, BU.VERTEX);
const ibDecB = buf(decF, BU.VERTEX), nDec = Wd.decals.length;
const nGlare = Wd.glare.length / 8, nSteam = Wd.steam.length / 8, nPaper = Wd.paper.length / 8;
Q.writeTexture({ texture: tMap }, Wd.gm, { bytesPerRow: MAPW * 4 }, [MAPW, MAPH]);
Q.writeTexture({ texture: tLamp }, Wd.lg, { bytesPerRow: LGN * 8 }, [LGN * 2, LGN]);
// what the camera can't pass: x0, z0, x1, z1, height per box; the first is the viewer's house
const BX = new Float32Array(Wd.boxes.flat()), NBX = Wd.boxes.length;
// the solids go by zones (world.js): the estate always, the town's squares when in view and near enough, the forest's
// fuller trees only near and its plain ones only far; the lamps' shadows are baked from the estate alone
const zv = new Uint8Array(NZONE), ZB = Wd.zb, FARZ = 300, NEARZ = 125; // beyond FARZ the haze leaves 4 % of anything
const drawSolids = (r, sh) => { for (let i = 0; i < meshes.length; i++) { const m = meshes[i], R = Wd.ranges[i]; if (sh && m.noSh) continue; for (let k = 0; k < R.length; k++) { const g = R[k]; if (sh ? !g[2] : zv[g[2]]) r.drawIndexed(m.n, g[1], m.i0, m.v0, g[0]); } } };
function zones() {
  const cx = F[CX], cy = F[CY], cz = F[CZ], fx = F[FX], fy = F[FY], fz = F[FZ], rx = F[RX], rz = F[RZ], ux = F[UX], uy = F[UY], uz = F[UZ], tx = TANH * W / H, far = FARZ * (0.6 + 0.4 * det);
  zv[0] = 1;
  for (let z = 1; z < NZONE; z++) {
    const o = z * 6; zv[z] = 0; if (ZB[o] > ZB[o + 3]) continue;
    const ex = (ZB[o + 3] - ZB[o]) * 0.5, ey = (ZB[o + 4] - ZB[o + 1]) * 0.5, ez = (ZB[o + 5] - ZB[o + 2]) * 0.5, px = ZB[o] + ex - cx, py = ZB[o + 1] + ey - cy, pz = ZB[o + 2] + ez - cz;
    const dx = max(abs(px) - ex, 0), dy = max(abs(py) - ey, 0), dz = max(abs(pz) - ez, 0), d = sqrt(dx * dx + dy * dy + dz * dz), mode = (z - 1) / (ZN_ * ZN_) | 0;
    if (d > far || (mode === 1 && d > NEARZ) || (mode === 2 && d <= NEARZ)) continue;
    const lim = px * fx + py * fy + pz * fz + ex * abs(fx) + ey * abs(fy) + ez * abs(fz);
    if (lim >= 0 && abs(px * rx + pz * rz) - ex * abs(rx) - ez * abs(rz) <= lim * tx && abs(px * ux + py * uy + pz * uz) - ex * abs(ux) - ey * abs(uy) - ez * abs(uz) <= lim * TANH) zv[z] = 1;
  }
}
// the lamps whose light in the haze can be seen from here, nearest first (at most 48)
const hzD = new Float32Array(48), hzI = new Float32Array(48);
function hazeList() {
  const cx = F[CX], cy = F[CY], cz = F[CZ]; let n = 0;
  for (let k = 0; k < NL; k++) {
    const l = LAMPS[k]; if (l.t < -1.5) continue;
    const d = hypot(l.x - cx, l.y - cy, l.z - cz) - l.r; if (d > 260) continue;
    let j = n < 48 ? n++ : 47; if (j === 47 && n === 48 && d >= hzD[47]) continue;
    while (j > 0 && hzD[j - 1] > d) { hzD[j] = hzD[j - 1]; hzI[j] = hzI[j - 1]; j--; }
    hzD[j] = d; hzI[j] = k;
  }
  UB[U_HN] = n; for (let j = 0; j < n; j++) UB[U_HZ + j] = hzI[j];
}

// ---------------------------------------------------------------- one-time bakes: detail texture, the lamps' shadow atlas
{
  const m = mod(W_DETAIL), p = device.createRenderPipeline({ layout: 'auto', vertex: { module: m, entryPoint: 'vs' }, fragment: { module: m, entryPoint: 'fs', targets: [{ format: 'rgba8unorm' }] } });
  const e = device.createCommandEncoder();
  let r = e.beginRenderPass({ colorAttachments: [colorAtt(tDetail.createView({ baseMipLevel: 0, mipLevelCount: 1 }), true)] });
  r.setPipeline(p); r.draw(3); r.end();
  const mips = (tx, n) => { for (let i = 1; i < n; i++) {
    r = e.beginRenderPass({ colorAttachments: [colorAtt(tx.createView({ baseMipLevel: i, mipLevelCount: 1 }), true)] });
    r.setPipeline(pMip8); r.setBindGroup(0, blitBG(tx.createView({ baseMipLevel: i - 1, mipLevelCount: 1 }))); r.draw(3); r.end();
  } };
  mips(tDetail, 11); mips(tAtlas, 12);
  // every street lamp gets a tile of the atlas: the yard seen straight down from the lamp
  const TS = SHADOW / 4, vSh = tShadow.createView(), za = ZF / (ZF - ZN), zb = -ZF * ZN / (ZF - ZN);
  let first = true;
  for (const l of LAMPS) {
    if (l.t < 0 || l.t > 15) continue; // only the estate's lamps have a tile
    const m = new Float32Array(UB.length), u = device.createBuffer({ size: UB.byteLength, usage: BU.UNIFORM | BU.COPY_DST });
    m[0] = 1 / TANL; m[12] = -l.x / TANL; m[9] = 1 / TANL; m[13] = -l.z / TANL; m[6] = -za; m[14] = za * l.y + zb; m[7] = -1; m[15] = l.y;
    Q.writeBuffer(u, 0, m);
    r = e.beginRenderPass({ colorAttachments: [], depthStencilAttachment: { view: vSh, depthClearValue: 1, depthLoadOp: first ? 'clear' : 'load', depthStoreOp: 'store' } });
    first = false;
    r.setViewport((l.t & 3) * TS, (l.t >> 2) * TS, TS, TS, 0, 1); r.setScissorRect((l.t & 3) * TS, (l.t >> 2) * TS, TS, TS);
    r.setBindGroup(0, mkBG0(u, tDummy)); r.setPipeline(pSolidSh); r.setVertexBuffer(0, vbMesh); r.setVertexBuffer(1, ibSolids); r.setIndexBuffer(ibMesh, 'uint32');
    drawSolids(r, true);
    r.end();
  }
  Q.submit([e.finish()]);
}
// the GPU has its own copies now
Wd.data = Wd.wins = Wd.grass.buf = Wd.gm = Wd.snow = 0;

// ---------------------------------------------------------------- render targets (rebuilt on resize)
// The scene is drawn at `pix` pixels and scaled up to the window. frame() tunes it and the draw distance scale `det`
// for 60 fps; both start where the last visit left them.
const PIXMAX = 2560 * 1440, PIXMIN = mob ? 25e4 : 5e5, DETMIN = 0.4;
let W = 0, H = 0, DW = 0, DH = 0, pix = +SV[1] || (LV > 1 ? 41e4 : mob ? 1280 * 720 : PIXMAX), det = +SV[2] || 1, dynN = 0, dynT = 0, dynG = 0, dynGN = 0, dynBad = 0, dynOk = 0, dynWait = 3;
let passScene, passRays, passBlur, bgBlur, passPost, bgRays, bgPost, bloomPass = [], bloomBG = [], targets = [];
const NB = 6;
function resize() {
  DW = max(2, round(canvas.clientWidth * devicePixelRatio)); DH = max(2, round(canvas.clientHeight * devicePixelRatio));
  const s = min(1, sqrt(pix / (DW * DH)));
  const w = max(2, round(DW * s) & ~1), h = max(2, round(DH * s) & ~1);
  if (w === W && h === H) return;
  dynN = dynG = dynGN = 0; dynT = -300; // let the new size settle before measuring again
  W = w; H = h; canvas.width = W; canvas.height = H;
  ctx.configure({ device, format: FMT, alphaMode: 'opaque' });
  for (const t of targets) t.destroy();
  const tMS = tex(AA > 1 ? W : 1, H, HDR, TU.RENDER_ATTACHMENT, { samples: AA }), tDp = tex(W, H, DEPTH, TU.RENDER_ATTACHMENT | TU.TEXTURE_BINDING, { samples: AA });
  const tRes = tex(W, H, HDR, TU.RENDER_ATTACHMENT | TU.TEXTURE_BINDING), tRay = tex(W / 2, H / 2, HDR, TU.RENDER_ATTACHMENT | TU.TEXTURE_BINDING), tRay2 = tex(W / 2, H / 2, HDR, TU.RENDER_ATTACHMENT | TU.TEXTURE_BINDING);
  targets = [tMS, tDp, tRes, tRay, tRay2];
  const bl = [];
  for (let i = 0; i < NB; i++) { const t = tex(max(1, W >> (i + 1)), max(1, H >> (i + 1)), HDR, TU.RENDER_ATTACHMENT | TU.TEXTURE_BINDING); bl.push(t); targets.push(t); }
  const vDp = tDp.createView(), vRes = tRes.createView(), vRay = tRay.createView(), vRay2 = tRay2.createView(), vBl = bl.map((t) => t.createView());
  // without anti-aliasing (Low) the scene goes straight into the resolve target, and tMS is one unused column
  passScene = { colorAttachments: [{ view: AA > 1 ? tMS.createView() : vRes, resolveTarget: AA > 1 ? vRes : undefined, loadOp: 'clear', storeOp: AA > 1 ? 'discard' : 'store', clearValue: [0, 0, 0, 1] }],
    depthStencilAttachment: { view: vDp, depthClearValue: 0, depthLoadOp: 'clear', depthStoreOp: 'store' } };
  passRays = { colorAttachments: [colorAtt(vRay, true)] };
  passBlur = { colorAttachments: [colorAtt(vRay2, true)] };
  bgBlur = device.createBindGroup({ layout: pRB.getBindGroupLayout(0), entries: [{ binding: 0, resource: vRay }] });
  passPost = { colorAttachments: [{ view: null, loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }] };
  bgRays = device.createBindGroup({ layout: pRays.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: ubo } }, { binding: 1, resource: sCmp }, { binding: 2, resource: tShadow.createView() }, { binding: 3, resource: vDp }] });
  bgPost = device.createBindGroup({ layout: pPost.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: ubo } }, { binding: 1, resource: sClamp }, { binding: 2, resource: vRes },
    { binding: 3, resource: vRay2 }, { binding: 4, resource: vBl[0] }, { binding: 5, resource: vDp }] });
  bloomPass = []; bloomBG = [];
  // down: res -> b0 -> ... -> b5 ; up: b5 -> b4 (additive) ... -> b0
  for (let i = 0; i < NB; i++) { bloomPass.push({ colorAttachments: [colorAtt(vBl[i], true)] }); bloomBG.push(blitBG(i ? vBl[i - 1] : vRes)); }
  for (let i = NB - 1; i > 0; i--) { bloomPass.push({ colorAttachments: [colorAtt(vBl[i - 1], false)] }); bloomBG.push(blitBG(vBl[i])); }
  UB[U_RES] = W; UB[U_RES + 1] = H; UB[U_RES + 2] = 1 / W; UB[U_RES + 3] = 1 / H;
}
resize();
addEventListener('resize', resize);

// ---------------------------------------------------------------- timing (GPU timestamp queries)
let qs, qResolve, qRead = [], tsBegin, tsEnd;
if (hasTS) {
  qs = device.createQuerySet({ type: 'timestamp', count: 2 });
  qResolve = device.createBuffer({ size: 16, usage: BU.QUERY_RESOLVE | BU.COPY_SRC });
  for (let i = 0; i < 6; i++) {
    const b = device.createBuffer({ size: 16, usage: BU.MAP_READ | BU.COPY_DST });
    const o = { b, busy: false, done: null };
    o.done = () => {
      const a = new BigInt64Array(b.getMappedRange());
      const ms = Number(a[1] - a[0]) / 1e6; F[GPU] = ms; b.unmap(); o.busy = false;
      if (dynT > 0 && ms > 0 && ms < 1e3) { dynG += ms; dynGN++; }
    };
    qRead.push(o);
  }
  tsBegin = { querySet: qs, beginningOfPassWriteIndex: 0 }; tsEnd = { querySet: qs, endOfPassWriteIndex: 1 };
}

// ---------------------------------------------------------------- frame
let hud = false;
let kf = 0, kb = 0, kl = 0, kr = 0, ku = 0, kd = 0, ks = 0, mdx = 0, mdy = 0, lkx = 0, lky = 0, l2x = 0, l2y = 0, hN = 0, hMax = 0, hMin = 1e9, hPer = 1e9, hLate = 0, hTot = 0, tId = -1, tN = 0, tx0 = 0, ty0 = 0, tx = 0, ty = 0;
const TANH = 0.6, NEAR = 0.1, EXPO = 0.9, RAYS = 0.003;
const submitList = [null];
const rowOrd = new Uint8Array(CELLS);
// Draws the cells of a cell-sorted blade buffer that are in view and within [minD, maxD) (scaled by `det`) as merged
// runs, nearest rows first.
function drawCells(r, start, lo, hi, mar, verts, minD, maxD) {
  const cx = F[CX], cy = F[CY], cz = F[CZ], fx = F[FX], fy = F[FY], fz = F[FZ], rx = F[RX], rz = F[RZ], ux = F[UX], uy = F[UY], uz = F[UZ];
  const tx = TANH * W / H, hw = CELLW * 0.5, ex = hw + mar, min2 = minD * minD * det * det, max2 = maxD * maxD * det * det;
  for (let k = 0; k < CELLS; k++) {
    const rw = rowOrd[k], row = rw * CELLS, pz = OZ + (rw + 0.5) * CELLW - cz, hz = max(abs(pz) - hw, 0);
    let run = -1;
    for (let x = 0; x <= CELLS; x++) {
      const c = row + x; let v = false;
      if (x < CELLS) {
        const l = lo[c], h = hi[c];
        if (l <= h) {
          const px = OX + (x + 0.5) * CELLW - cx, py = (l + h) * 0.5 - cy, ey = (h - l) * 0.5 + mar, hx = max(abs(px) - hw, 0), h2 = hx * hx + hz * hz + (cy > h ? (cy - h) * (cy - h) : 0);
          if (h2 < max2 && h2 >= min2) {
            const lim = px * fx + py * fy + pz * fz + ex * abs(fx) + ey * abs(fy) + ex * abs(fz);
            if (lim >= 0 && abs(px * rx + pz * rz) - ex * (abs(rx) + abs(rz)) <= lim * tx) v = abs(px * ux + py * uy + pz * uz) - ex * (abs(ux) + abs(uz)) - ey * abs(uy) <= lim * TANH;
          }
        }
      }
      if (v) { if (run < 0) run = c; } else if (run >= 0) {
        const a = start[run], n = start[c] - a;
        if (n > 0) r.draw(verts, n, 0, a);
        run = -1;
      }
    }
  }
}
function render() {
  // camera basis (right vector is horizontal)
  const cx = F[CX], cy = F[CY], cz = F[CZ], pitch = F[PIT], yaw = F[YAW];
  const cp = cos(pitch), fy = sin(pitch), rx = cos(yaw), rz = sin(yaw), fx = cp * rz, fz = -cp * rx;
  const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;
  F[FX] = fx; F[FY] = fy; F[FZ] = fz; F[RX] = rx; F[RZ] = rz; F[UX] = ux; F[UY] = uy; F[UZ] = uz;
  const asp = W / H, sx = 1 / (TANH * asp), sy = 1 / TANH, m = UB;
  m[0] = rx * sx; m[4] = 0; m[8] = rz * sx; m[12] = -(rx * cx + rz * cz) * sx;
  m[1] = ux * sy; m[5] = uy * sy; m[9] = uz * sy; m[13] = -(ux * cx + uy * cy + uz * cz) * sy;
  m[2] = 0; m[6] = 0; m[10] = 0; m[14] = NEAR;
  m[3] = fx; m[7] = fy; m[11] = fz; m[15] = -(fx * cx + fy * cy + fz * cz);
  m[U_CAM] = cx; m[U_CAM + 1] = cy; m[U_CAM + 2] = cz; m[U_CAM + 3] = F[TIME];
  m[U_RIGHT] = rx; m[U_RIGHT + 1] = 0; m[U_RIGHT + 2] = rz; m[U_RIGHT + 3] = TANH * asp;
  m[U_UP] = ux; m[U_UP + 1] = uy; m[U_UP + 2] = uz; m[U_UP + 3] = TANH;
  m[U_FWD] = fx; m[U_FWD + 1] = fy; m[U_FWD + 2] = fz; m[U_FWD + 3] = NEAR;
  m[U_MIS] = EXPO; m[U_MIS + 1] = RAYS; m[U_MIS + 2] = det; m[U_MIS + 3] = F[GUST];
  m[U_WIND] = F[WX]; m[U_WIND + 1] = 0; m[U_WIND + 2] = F[WZ]; m[U_WIND + 3] = F[GUST];
  m[U_PAP] = F[PAP]; m[U_PAP + 1] = F[DRF]; m[U_PAP + 2] = F[SNOWD]; m[U_PAP + 3] = F[FALLT];
  m[U_EV] = F[EVA]; m[U_EV + 1] = F[EVX]; m[U_EV + 2] = F[EVS]; m[U_EV + 3] = F[EVL];
  m[U_TR] = F[TRX]; m[U_TR + 1] = F[TRD]; m[U_TR + 2] = F[TRON];
  m[U_TR2] = F[FRX]; m[U_TR2 + 1] = F[FRD]; m[U_TR2 + 2] = F[FRON];
  m[U_PL] = F[PLX]; m[U_PL + 1] = F[PLZ]; m[U_PL + 2] = F[PLH]; m[U_PL + 3] = F[PLON];
  for (let k = 0; k < NRC * 4; k++) m[U_RC + k] = F[RC + k];
  m.set(ACT, U_ACT);
  hazeList();
  { const o = U_LAMP + FLICK * 8 + 4, c = LAMPS[FLICK].c, f = F[FLK]; m[o] = c[0] * f; m[o + 1] = c[1] * f; m[o + 2] = c[2] * f; }
  { const o = U_LAMP + FLICK2 * 8 + 4, c = LAMPS[FLICK2].c, f = fract(sin(floor(F[TIME] * 9) * 47.3) * 9631.7) > 0.8 || fract(F[TIME] / 17) > 0.9 ? 0.08 : 1; m[o] = c[0] * f; m[o + 1] = c[1] * f; m[o + 2] = c[2] * f; }
  // the flat's lights as its switches have them, the televisions flickering with their pictures (when on)
  ALAMP.forEach((l, j) => { if (j === 1) return; const o = U_LAMP + (AL0 + j) * 8 + 4, f = FLAT.light[j]; m[o] = l[5][0] * f; m[o + 1] = l[5][1] * f; m[o + 2] = l[5][2] * f; });
  m[U_EX] = F[KET]; m[U_EX + 1] = F[BLZ]; m[U_EX + 2] = FLAT.tv[1]; m[U_EX + 3] = FLAT.tv[0]; m[U_EX + 4] = FLAT.kettle > 0 ? 1 : 0; m[U_EX + 5] = F[CALM];
  // the glow of each television takes the colour of its channel (TVCOL, world.js), a concert's beating with the music
  for (let j = 0; j < 2; j++) {
    const ch = FLAT.tv[j], o = U_LAMP + (j ? TVL2 : TVL) * 8 + 4, c = TVCOL[ch], s = j ? 0.9 : 1, t = F[TIME];
    const f = (ch ? 1 : 0) * (0.6 + 0.4 * fract(sin(floor(t * (j ? 2.3 : 3) + j * 0.5) * (j ? 91.7 : 127.1)) * 43758.5453)) * (ch === 2 ? 0.7 + 0.6 * (fract(t * 2.1) < 0.12 ? 1 : 0) : 1);
    m[o] = c[0] * f * s; m[o + 1] = c[1] * f * s; m[o + 2] = c[2] * f * s;
  }
  // the watchman's fire breathes and flickers
  // (and every other fire: the travellers' in the forest, the grill at the party, each on its own beat)
  for (let j = 0; j < FIRES.length; j++) { const i = FIRES[j], o = U_LAMP + i * 8 + 4, c = LAMPS[i].c, t = F[TIME] + j * 17.3, f = 0.72 + 0.18 * sin(t * 2.3) * sin(t * 3.7) + 0.16 * fract(sin(floor(t * 14) * 78.2) * 43758.5); m[o] = c[0] * f; m[o + 1] = c[1] * f; m[o + 2] = c[2] * f; }
  // the club's light over its door goes round the colours on the beat
  { const o = U_LAMP + CLUBL * 8 + 4, t = F[TIME], b = 0.35 + 0.65 * (fract(t * 2.13) < 0.5 ? 1 : 0); for (let j = 0; j < 3; j++) m[o + j] = 9 * b * (0.5 + 0.5 * cos(TAU * (t * 0.23 + j / 3))); }
  Q.writeBuffer(ubo, 0, UB);

  { let cr = floor((cz - OZ) / CELLW) | 0; cr = cr < 0 ? 0 : cr > CELLS - 1 ? CELLS - 1 : cr; let n = 0; rowOrd[n++] = cr; for (let d = 1; d < CELLS; d++) { if (cr - d >= 0) rowOrd[n++] = cr - d; if (cr + d < CELLS) rowOrd[n++] = cr + d; } }
  zones();
  const e = device.createCommandEncoder();
  let slot = null;
  if (hasTS) { for (let i = 0; i < qRead.length; i++) if (!qRead[i].busy) { slot = qRead[i]; break; } }
  passScene.timestampWrites = slot ? tsBegin : undefined;
  passPost.timestampWrites = slot ? tsEnd : undefined;
  // scene
  let r = e.beginRenderPass(passScene);
  r.setBindGroup(0, bg0);
  r.setPipeline(pSolid); r.setVertexBuffer(0, vbMesh); r.setVertexBuffer(1, ibSolids); r.setIndexBuffer(ibMesh, 'uint32');
  drawSolids(r, false);
  r.setPipeline(pWin); r.setVertexBuffer(0, ibWin); r.draw(4, nWin);
  r.setPipeline(pDec); r.setVertexBuffer(0, ibDecB); r.draw(4, nDec);
  // grass: 5-row blades up close, 3 rows further out
  const G = Wd.grass;
  r.setPipeline(pLeaf); r.setVertexBuffer(0, ibGrass); drawCells(r, G.start, G.lo, G.hi, 2, 10, 0, 16);
  r.setPipeline(pLeafF); drawCells(r, G.start, G.lo, G.hi, 2, 6, 16, 70);
  r.setPipeline(pPap); r.setVertexBuffer(0, ibPaper); r.draw(4, nPaper);
  r.setPipeline(pBack); r.draw(4);
  r.setPipeline(pSt); r.setVertexBuffer(0, ibSteam); r.draw(4, nSteam);
  r.setPipeline(pSnow); r.setVertexBuffer(0, ibSnowB); r.draw(4, NSNOW);
  r.setPipeline(pDrift); r.draw(4, NDRIFT);
  r.setPipeline(pGl); r.setVertexBuffer(0, ibGlare); r.draw(4, nGlare);
  r.end();
  // lamp light in the haze
  r = e.beginRenderPass(passRays); r.setPipeline(pRays); r.setBindGroup(0, bgRays); r.draw(3); r.end();
  r = e.beginRenderPass(passBlur); r.setPipeline(pRB); r.setBindGroup(0, bgBlur); r.draw(3); r.end();
  // bloom
  for (let i = 0; i < bloomPass.length; i++) {
    r = e.beginRenderPass(bloomPass[i]); r.setPipeline(i === 0 ? pDown0 : i < NB ? pDown : pUp); r.setBindGroup(0, bloomBG[i]); r.draw(3); r.end();
  }
  // composite
  passPost.colorAttachments[0].view = ctx.getCurrentTexture().createView();
  r = e.beginRenderPass(passPost); r.setPipeline(pPost); r.setBindGroup(0, bgPost); r.draw(3); r.end();
  if (slot) { e.resolveQuerySet(qs, 0, 2, qResolve, 0); e.copyBufferToBuffer(qResolve, 0, slot.b, 0, 16); }
  submitList[0] = e.finish();
  Q.submit(submitList);
  if (slot) { slot.busy = true; slot.b.mapAsync(GPUMapMode.READ).then(slot.done); }
}

// ---------------------------------------------------------------- what moves on its own: wind, the bad lamp, the highway, the trains, the plane
// All of it is a function of the scene time, so the picture and the sound (audio.js reads the same numbers) agree.
// The trains take turns on the track: a passenger train, then a freight train, each every TRAINP seconds.
const BLZP = 470, SALP = 290, SALT = 24, TRAINP = 210, TRAIN0 = 38, TRAINV = 22, FREIGHTV = 13, PLANEP = 170, PLANET = 75;
function world(dt) {
  const t = F[TIME];
  // wind, 0..1: it dies down to almost nothing and rises again to a strong blow in a slow even swell (a little over a
  // minute each way), with a light flutter on top when it is strong; the offset it has carried the air drives the snow
  const sw = 0.5 - 0.5 * cos(t * TAU / 150 + 0.4 * sin(t * 0.013)); let g = 0.04 + 0.96 * sw * (0.9 + 0.1 * sin(t * 0.83 + 2 * sin(t * 0.31)));
  // now and then a blizzard: for a minute and a half the wind blows a gale, the snow comes thick and the haze closes in
  // and on the same cycle, well clear of it, a calm: the wind drops away and big soft flakes come down slowly and straight
  { const c = ((t + 180) % BLZP + BLZP) % BLZP; F[BLZ] = sstep(0, 18, c) * (1 - sstep(68, 96, c)); F[CALM] = sstep(196, 226, c) * (1 - sstep(330, 362, c));
    g = max(g * (1 - 0.92 * F[CALM]), F[BLZ] * (0.86 + 0.14 * sin(t * 1.7) * sin(t * 0.61))); }
  // the snow's clock: the flakes sink at half their pace in a calm
  F[FALLT] += dt * (1 - 0.5 * F[CALM]);
  F[GUST] = g; const ws = 0.8 + 4.2 * g + 7 * F[BLZ]; F[WX] += WDX * ws * dt; F[WZ] += WDZ * ws * dt;
  F[PAP] += (g > 0.4 ? g - 0.4 : 0) * 6 * dt;
  // loose snow runs along the ground in the stronger gusts
  F[DRF] += (g > 0.3 ? g - 0.3 : 0) * 9 * dt;
  // the snowfall: from a few flakes to a thick fall and back, on a slower swell of its own (the share of flakes shown)
  { const s = 0.5 - 0.5 * cos(t * TAU / 230 + 2.1); F[SNOWD] = max(0.04 + 0.96 * s * s + (0.6 - s * s) * F[CALM], F[BLZ]); }
  // events: the ambulance's lights at a far door (on for a while, off for a while), the level crossing while a train
  // is near it, a salute far away (seconds since it began, -1 when none), a car alarm in the yard
  F[EVA] = fract(t / 260 + 0.3) < 0.45 ? 1 : 0;
  { const fr = F[FRON] > 0, on = fr || F[TRON] > 0, d = fr ? F[FRD] : F[TRD], x0 = fr ? F[FRX] - (d > 0 ? FRL : 0) : F[TRX] - 11, x1 = fr ? F[FRX] + (d > 0 ? 0 : FRL) : F[TRX] + 224;
    F[EVX] = on && XING > x0 - (d > 0 ? 260 : 30) && XING < x1 + (d > 0 ? 30 : 260) ? 1 : 0; }
  { const q = t + 140, c = floor(q / SALP), s = q - c * SALP; F[EVS] = s < SALT ? s : -1; }
  F[EVL] = fract(t / 190 + 0.62) < 0.11 ? 1 : 0;
  // the failing lamp: stutters, and now and then goes out for a moment
  const n = fract(sin(floor(t * 13) * 91.7) * 43758.5), o = fract(t / 23 + 0.2) > 0.88;
  F[FLK] = o ? (fract(sin(floor(t * 7) * 33.1) * 9631.7) > 0.7 ? 0.9 : 0.04) : n > 0.86 ? 0.25 : 1;
  // the highway: every slot sends a vehicle of its own kind now and then, at the kind's speed
  for (let k = 0; k < NRC; k++) {
    // a slow vehicle that could not cross the whole town within its slot's period sends a car instead
    const q = t + ROADO[k], c = floor(q / ROADP[k]), h = ihash(k, c, 3), k0 = vehKind(h), kind = VEH[k0][1] * 0.9 * ROADP[k] < 2 * (WE + 30 + VEH[k0][0]) ? (h * 37 | 0) % 5 : k0, v = VEH[kind][1] * (0.9 + 0.2 * fract(h * 13.7)), x = (q - c * ROADP[k]) * v - WE - 25 - VEH[kind][0];
    F[RC + k * 4] = (k & 1 ? -1 : 1) * x; F[RC + k * 4 + 1] = k & 1 ? -1 : 1; F[RC + k * 4 + 2] = x < WE + 25 + VEH[kind][0] ? 1 : 0; F[RC + k * 4 + 3] = kind;
  }
  const q = t + TRAINP - TRAIN0, c = floor(q / TRAINP), s = q - c * TRAINP, d = floor(c / 2) & 1 ? -1 : 1;
  if (c & 1) {
    // freight: x is the nose of the locomotive, the cars trail behind it
    F[TRON] = 0; F[TRX] = -1e4; F[FRD] = d; const x = -WE - 20 + FREIGHTV * s; F[FRON] = x - FRL < WE + 20 ? 1 : 0; F[FRX] = d * x;
  } else {
    F[FRON] = 0; F[FRX] = -1e4; F[TRD] = d; F[TRON] = s < (2 * WE + 290) / TRAINV ? 1 : 0; F[TRX] = d > 0 ? -WE - 255 + TRAINV * s : WE + 35 - TRAINV * s;
  }
  // an aeroplane far overhead now and then, on a new heading every time
  const pc = floor((t + 60) / PLANEP), ps = t + 60 - pc * PLANEP, ph = ihash(pc, 7, 11) * TAU, pd = (ps / PLANET - 0.5) * 16000, po = (ihash(pc, 5, 2) - 0.5) * 5000;
  F[PLH] = ph; F[PLON] = ps < PLANET ? 1 : 0; F[PLX] = cos(ph) * pd - sin(ph) * po; F[PLZ] = sin(ph) * pd + cos(ph) * po;
  // the traffic of the town, the people going from door to door, the dogs (life.js)
  lifeTick(t);
  flatTick(t, dt);
}

// ---------------------------------------------------------------- collision
// Boxes for the houses, the cars and the posts; the viewer's room and the window opening are a hole in the first one.
const CR = 0.3;
const inB = (b, x, y, z, m) => x > b[0] + m && x < b[3] - m && y > b[1] + m && y < b[4] - m && z > b[2] + m && z < b[5] - m;
// the doorway of a shut door is not free; AT_DOOR[i]: the door of AFREE box i
const AT_DOOR = AFREE.map((b, i) => FLAT.doors.find((d) => (d.ad < 0 ? APT.length + ADOOR.length : APT.length + d.ad) === i));
const shut = (i) => AT_DOOR[i] && ACT[AT_DOOR[i].o * 8 + 6] < 0.65;
const free = (x, y, z) => inB(TUN, x, y, z, 0.1) || inB(BTUN, x, y, z, 0.1) || AFREE.some((b, i) => !shut(i) && inB(b, x, y, z, i < APT.length ? 0.22 : 0.1));
// inside the walls of the viewer's house
// (the balcony is part of it: its parapet and the slab over it keep one in, but for the way out over the parapet)
const BALC = AFREE[AFREE.length - 1], BALE = [BALC[0] - 0.45, BALC[1] - 0.45, BALC[2] - 0.45, BALC[3] + 0.45, RY + 2.75, BALC[5] + 0.45];
const home = (x, y, z) => ((x > BX[0] - CR && x < BX[2] + CR && z > BX[1] - CR && z < BX[3] + CR && y < BX[4] + CR) || inB(BALE, x, y, z, 0)) && !free(x, y, z);
function collide() {
  let x = F[CX] + F[MX], y = F[CY] + F[MY], z = F[CZ] + F[MZ];
  x = x < -WE ? -WE : x > WE ? WE : x; z = z < -WE ? -WE : z > WE ? WE : z; y = y < 0.4 ? 0.4 : y > 95 ? 95 : y;
  if (z < RAILZ + 11.5 && y < RAILY + 0.5) y = min(RAILY + 0.5, max(y, (RAILZ + 11.5 - z) * 0.5 + 0.4));
  if (free(F[CX], F[CY], F[CZ])) {
    // in the room: take the move one axis at a time, so the walls are slid along
    if (home(x, F[CY], F[CZ])) { x = F[CX]; F[VX] = 0; }
    if (home(x, y, F[CZ])) { y = F[CY]; F[VY] = 0; }
    if (home(x, y, z)) { z = F[CZ]; F[VZ] = 0; }
  } else for (let i = 0; i < NBX; i++) {
    const o = i * 5, x0 = BX[o] - CR, z0 = BX[o + 1] - CR, x1 = BX[o + 2] + CR, z1 = BX[o + 3] + CR, h = BX[o + 4] + CR;
    if (x <= x0 || x >= x1 || z <= z0 || z >= z1 || y >= h || (!i && free(x, y, z))) continue;
    // out by the nearest face
    const a = x - x0, b = x1 - x, c = z - z0, d = z1 - z, e = h - y, m = min(a, b, c, d, e);
    if (m === e) { y = h; if (F[VY] < 0) F[VY] = 0; } else if (m === a) { x = x0; F[VX] = 0; } else if (m === b) { x = x1; F[VX] = 0; } else if (m === c) { z = z0; F[VZ] = 0; } else { z = z1; F[VZ] = 0; }
  }
  F[CX] = x; F[CY] = y; F[CZ] = z;
}

// ---------------------------------------------------------------- the flat: the switches, the doors, the televisions, the kettle
// F, a click or a tap uses what the view points at within reach (USE, world.js); the line at the bottom says what it is.
const hintEl = $('u');
let useK = -1, hintK = -2;
function aimUse() {
  if (!inB(APTB, F[CX], F[CY], F[CZ], -1.2) && F[BAL] < 0.5) return -1;
  let best = -1, bd = 3;
  for (let k = 0; k < USE.length; k++) {
    const u = USE[k], dx = u.p[0] - F[CX], dy = u.p[1] - F[CY], dz = u.p[2] - F[CZ], t = dx * F[FX] + dy * F[FY] + dz * F[FZ];
    if (t <= 0 || t > bd) continue;
    if (dx * dx + dy * dy + dz * dz - t * t < u.r * u.r) { best = k; bd = t; }
  }
  return best;
}
function use() {
  if (useK < 0) return;
  const u = USE[useK], t = F[TIME];
  if (u.kind === 'light') FLAT.light.forEach((v, j) => { if (j !== 1 && ALAMP[j][0] === u.i) FLAT.light[j] = v ? 0 : 1; });
  else if (u.kind === 'tv') FLAT.tv[u.i] = (FLAT.tv[u.i] + 1) % TVCOL.length; // the next channel, after the last one off
  else if (u.kind === 'kettle') { if (FLAT.kettle === 2) FLAT.kettle = 0; else { FLAT.kettle = 2; FLAT.boil = t; } }
  else if (u.kind === 'door') {
    // a door can't be shut on the one standing in it
    const d = FLAT.doors[u.i], j = d.ad < 0 ? APT.length + ADOOR.length : APT.length + d.ad;
    if (d.want && inB(AFREE[j], F[CX], F[CY], F[CZ], -0.25)) return;
    d.want = !d.want;
  }
  click();
  hintK = -2;
}
function flatTick(t, dt) {
  // the doors swing to where they are wanted
  const k = 1 - exp(-dt * 4);
  for (const d of FLAT.doors) { const o = d.o * 8 + 6, to = d.want ? d.open || 1.3 : 0; ACT[o] += (to - ACT[o]) * k; }
  // the kettle: steaming a little on the low gas, more and more once put on to boil, nothing when the gas is off
  const ket = FLAT.kettle === 2 ? 0.3 + 0.7 * sstep(4, 20, t - FLAT.boil) : FLAT.kettle ? 0.35 : 0;
  F[KET] += (ket - F[KET]) * (1 - exp(-dt * (ket > F[KET] ? 1.5 : 0.6)));
}
// the line under the view: what F (or a tap) would use
function hint() {
  useK = menu || F[TOUR] ? -1 : aimUse();
  if (useK === hintK) return;
  hintK = useK;
  hintEl.textContent = useK < 0 ? '' : `${mob ? T.tap : 'F'} · ${T[USE[useK].kind]}`;
}

// ---------------------------------------------------------------- the flight over the town (T, or the menu's button)
// A closed loop of camera positions and the points looked at (Catmull-Rom), flown at an even pace; any key or a finger
// hands the camera back where it is.
const TOURK = [
  [18, 32, 70, 0, 6, 0], [-40, 30, 40, -140, 6, 10], [-200, 38, 20, -320, 4, 20], [-300, 22, 70, -420, 3, 40], [-400, 30, 40, -440, 2, -60],
  [-440, 27, -60, -420, 2, -118], [-380, 24, -150, -250, 3, -230], [-280, 22, -190, -200, 3, -235], [-150, 30, -200, -40, 4, -150],
  [-20, 40, -150, 120, 6, -130], [140, 46, -110, 300, 4, -10], [250, 28, -70, 330, 4, 10], [300, 24, 30, 320, 2, 80], [250, 26, 110, 140, 6, 190],
  [140, 24, 180, 122, 7, 260], [150, 30, 260, 220, 10, 400], [210, 40, 300, 330, 15, 420], [120, 44, 330, -60, 3, 400], [-40, 34, 360, -112, 2, 393],
  [-150, 30, 340, -80, 2, 450], [-180, 34, 430, -60, 4, 330], [-80, 40, 250, 0, 10, 60], [0, 40, 150, 6, 6, 20],
];
const TOURN = TOURK.length, TOURV = 9, TOURL = new Float32Array(1025);
let tourLen = 0;
function tourRaw(u) {
  // u along the loop, 0..TOURN
  const i = floor(u) % TOURN, f = u - floor(u), K = (j) => TOURK[((j % TOURN) + TOURN) % TOURN];
  const a = K(i - 1), b = K(i), c = K(i + 1), d = K(i + 2);
  for (let o = 0; o < 6; o++) P6[o] = 0.5 * (2 * b[o] + (c[o] - a[o]) * f + (2 * a[o] - 5 * b[o] + 4 * c[o] - d[o]) * f * f + (3 * b[o] - a[o] - 3 * c[o] + d[o]) * f * f * f);
}
{ // arc length table, as for the scripted path
  const M = 8192, len = new Float32Array(M + 1); let px = 0, py = 0, pz = 0;
  for (let k = 0; k <= M; k++) { tourRaw(k / M * TOURN); if (k) len[k] = len[k - 1] + hypot(P6[0] - px, P6[1] - py, P6[2] - pz); px = P6[0]; py = P6[1]; pz = P6[2]; }
  tourLen = len[M];
  for (let k = 0, j = 0; k <= 1024; k++) { const d = k / 1024 * len[M]; while (j < M - 1 && len[j + 1] < d) j++; TOURL[k] = (j + (d - len[j]) / max(len[j + 1] - len[j], 1e-6)) / M * TOURN; }
}
function tourAt(t) {
  let s = (t * TOURV / tourLen) % 1; s *= 1024; const k = floor(s) | 0;
  tourRaw(TOURL[k] + (TOURL[k + 1] - TOURL[k]) * (s - k)); aim();
}
const tour = (on) => { F[TOUR] = on ? 1 : 0; F[VX] = F[VY] = F[VZ] = 0; hintK = -2; if (on) F[TOURT] = 0; };

function frame(now) {
  requestAnimationFrame(frame);
  const dtr = now - F[LAST]; F[LAST] = now;
  let dt = dtr / 1000; if (dt > 0.1) dt = 0.1;
  // Dynamic resolution for 60 fps: every second (0.4 s behind the menu) scale the load by k
  if (dtr < 1e3 && (dynT += dtr) > 0 && (dynN++, dynT > (menu ? 400 : 1000))) {
    const a = dynT / dynN, g = dynGN ? dynG / dynGN : 0; let k = 1;
    // with GPU timing: keep it between 9.8 and 13.6 ms
    if (g) { if (g > 13.6 || g < 9.8) k = 11.7 / g; }
    // without: slow for two periods in a row means fewer pixels, and twice as long before trying to go back up
    else if (a > 17.6) { dynOk = 0; if (++dynBad > 1) { k = 15 / a; dynBad = 0; dynWait = min(dynWait * 2, 60); } }
    // at the display's rate there is no telling if there is room, so try a little more now and then
    else { dynBad = 0; if (a < 12.5) k = 15 / a; else if (++dynOk > dynWait) { k = 1.17; dynOk = 0; } }
    k = k < 0.5 ? 0.5 : k > 1.7 ? 1.7 : k; const top = min(PIXMAX, DW * DH), mid = max(top / 2, PIXMIN), was = pix + det;
    // too slow: pixels down to `mid` first, then draw distance, then the remaining pixels; faster goes back the same way
    if (k < 1 ? pix > mid || det <= DETMIN : pix < mid || det >= 1) {
      const end = k < 1 ? (det > DETMIN ? mid : PIXMIN) : det < 1 ? mid : top;
      pix *= k; if (k < 1 ? pix < end : pix > end) pix = end;
    } else { det *= sqrt(k); det = det < DETMIN ? DETMIN : det > 1 ? 1 : det; }
    if (was !== pix + det) keep('htone', [LV, pix < top ? pix | 0 : '', det]); // nothing kept at full resolution
    dynN = dynT = dynG = dynGN = 0; resize();
  }
  F[TIME] += dt;
  world(dt);
  if (F[TOUR]) { F[TOURT] += dt; tourAt(F[TOURT]); mdx = mdy = 0; }
  else {
    // touch: holding the finger away from where it went down keeps turning, like a joystick
    if (tId >= 0) {
      const tr = 4 / (innerWidth < innerHeight ? innerWidth : innerHeight); let jx = (tx - tx0) * tr, jy = (ty - ty0) * tr;
      jx = jx > 1 ? 1 : jx < -1 ? -1 : jx; jy = jy > 1 ? 1 : jy < -1 ? -1 : jy;
      lkx += jx * 1.5 * dt; lky += jy * dt;
    }
    // mouse look through two cascaded low-pass stages
    const kq = 1 - exp(-dt * 30); lkx += mdx * 0.0022; lky += mdy * 0.0022; mdx = 0; mdy = 0;
    const ax = lkx * kq, ay = lky * kq; lkx -= ax; lky -= ay; l2x += ax; l2y += ay;
    const dyw = l2x * kq, dpt = l2y * kq; l2x -= dyw; l2y -= dpt;
    const yaw = F[YAW] + dyw; let pitch = F[PIT] - dpt; pitch = pitch < -1.55 ? -1.55 : pitch > 1.55 ? 1.55 : pitch;
    // a walking pace in the room, faster outside, Shift (or a second finger) to hurry
    const sp = (ks || tN > 1 ? 4 : 1) * (F[INR] > 0.5 || F[BAL] > 0.5 ? 1.6 : 5.5), k = 1 - exp(-dt * 4.5), mf = tId >= 0 ? 0.7 : kf - kb, mr = kr - kl, mu = ku - kd, cp = cos(pitch), sy = sin(yaw), cw = cos(yaw);
    const vx = F[VX] + ((sy * cp * mf + cw * mr) * sp - F[VX]) * k, vy = F[VY] + ((sin(pitch) * mf + mu) * sp - F[VY]) * k, vz = F[VZ] + ((-cw * cp * mf + sy * mr) * sp - F[VZ]) * k;
    F[YAW] = yaw; F[PIT] = pitch; F[VX] = vx; F[VY] = vy; F[VZ] = vz; F[MX] = vx * dt; F[MY] = vy * dt; F[MZ] = vz * dt;
    collide();
  }
  F[INR] += ((inB(APTB, F[CX], F[CY], F[CZ], -0.3) ? 1 : 0) - F[INR]) * (1 - exp(-dt * 6));
  F[BAL] = inB(AFREE[AFREE.length - 1], F[CX], F[CY], F[CZ], -0.05) ? 1 : 0;
  hint();
  render();
  if (hud) {
    hN++; if (dtr > hMax) hMax = dtr; if (dtr < hMin) hMin = dtr; if (dtr > hPer * 1.5) { hLate++; hTot++; }
    F[HUDT] += dtr / 1000;
    if (F[HUDT] > 0.5) { info.textContent = `${(hN / F[HUDT]).toFixed(0)} fps  ·  ${T.worst} ${hMax.toFixed(1)} ${T.ms}  ·  ${T.late} ${hLate} (${T.total} ${hTot})  ·  GPU ${F[GPU].toFixed(2)} ${T.ms}  ·  ${W}x${H} (${W * 100 / DW | 0}%)`; F[HUDT] = 0; hPer = hMin; hN = 0; hMax = 0; hMin = 1e9; hLate = 0; }
  }
}

// ---------------------------------------------------------------- input
const key = (e, v) => {
  // a key that moves hands the camera back from the flight over the town
  if (v && F[TOUR] && /^Key[WASDQE]$/.test(e.code)) tour(false);
  switch (e.code) {
    case 'KeyW': kf = v; break; case 'KeyS': kb = v; break; case 'KeyA': kl = v; break; case 'KeyD': kr = v; break;
    case 'KeyE': ku = v; break; case 'KeyQ': kd = v; break; case 'ShiftLeft': case 'ShiftRight': ks = v; break;
    default: if (v && !e.repeat) {
      if (e.code === 'KeyH') { hud = !hud; hTot = 0; hPer = 1e9; info.textContent = ''; }
      else if (e.code === 'KeyM') mute();
      else if (e.code === 'KeyF') use();
      else if (e.code === 'KeyT') tour(!F[TOUR]);
      else if (e.code === 'Escape') ui(true);
      else if (e.code >= 'Digit1' && e.code <= 'Digit6') { tour(false); lookAt(...POSES[e.code.charCodeAt(5) - 49]); }
    }
  }
};
// behind the menu only the stats and mute keys work
addEventListener('keydown', (e) => { if (menu && e.code !== 'KeyH' && e.code !== 'KeyM') return; sound(); key(e, 1); });
addEventListener('keyup', (e) => key(e, 0));
const release = () => { kf = kb = kl = kr = ku = kd = ks = 0; tId = -1; tN = 0; };
const capture = () => { sound(); const p = canvas.requestPointerLock({ unadjustedMovement: true }); if (p && p.catch) p.catch(() => canvas.requestPointerLock()).catch(() => 0); };
canvas.addEventListener('click', () => { if (document.pointerLockElement === canvas) use(); else capture(); });
addEventListener('mousemove', (e) => { if (document.pointerLockElement === canvas) { mdx += e.movementX; mdy += e.movementY; } });
addEventListener('blur', release);
const touch = (e) => {
  e.preventDefault(); sound(); tN = e.touches.length;
  let f = null, first = false; for (let i = 0; i < tN; i++) if (e.touches[i].identifier === tId) f = e.touches[i];
  if (!f) { tId = -1; if (tN) { f = e.touches[0]; tId = f.identifier; first = true; } }
  if (f) {
    // the touch axes turn with the page when it lies on its side
    const x = rot.matches ? f.clientY : f.clientX, y = rot.matches ? -f.clientX : f.clientY, s = 1100 / min(innerWidth, innerHeight);
    if (first) { tx0 = x; ty0 = y; } else { mdx += (x - tx) * s; mdy += (y - ty) * s; } // the view follows the finger at once
    tx = x; ty = y;
  }
};
for (const n of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) canvas.addEventListener(n, touch, { passive: false });
// a short tap that barely moves uses what is in view; a finger on the glass ends the flight over the town
let tapT = 0, tapX = 0, tapY = 0;
canvas.addEventListener('touchstart', (e) => { if (F[TOUR]) tour(false); if (e.touches.length === 1) { tapT = performance.now(); tapX = e.touches[0].clientX; tapY = e.touches[0].clientY; } });
canvas.addEventListener('touchend', (e) => { const c = e.changedTouches[0]; if (performance.now() - tapT < 260 && hypot(c.clientX - tapX, c.clientY - tapY) < 14) use(); });

// ---------------------------------------------------------------- menu
// The scene keeps rendering (blurred by CSS) behind the menu. Esc, losing the mouse or the corner button open it.
let menu = true;
const bGo = $('d');
const ui = (m) => {
  if (dead) return;
  menu = m; body.className = m ? 'm' : document.pointerLockElement ? 'g p' : 'g';
  // focus the main button so Enter works (delayed: it can't take focus while still hidden)
  if (m) { release(); setTimeout(() => menu && bGo.focus(), 100); } else document.activeElement.blur();
};
const go = () => {
  sound(); ui(false); bGo.textContent = T.resume;
  // phones: go fullscreen and ask for landscape; where that is refused the CSS rotation still applies
  if (mob) document.documentElement.requestFullscreen?.()?.then(() => screen.orientation.lock('landscape')).catch(() => 0);
  if (!mob) capture();
};
bGo.onclick = go; $('o').onclick = () => ui(true);
$('v').onclick = () => { go(); tour(true); };
// detail buttons: the current level is lit, the others reload the page with theirs
$('q').querySelectorAll('button').forEach((b, i) => { if (i === 2 - LV) b.className = 'on'; else b.onclick = () => { keep('htone', 2 - i); location.reload(); }; });
document.addEventListener('pointerlockchange', () => ui(!document.pointerLockElement));

// draw the first frame and wait for the GPU to finish it (pipelines get compiled on first use) before the reveal
lookAt(...POSES[0]); F[INR] = 1; F[TIME] = 3; world(0);
await say(T.dark, 1, 400);
render(); await Q.onSubmittedWorkDone();
setTimeout(keep, 15e3, 'htoneLoad', ''); // the load counts as survived after 15 s of frames
ui(true);
requestAnimationFrame((t) => { F[LAST] = t; requestAnimationFrame(frame); });
