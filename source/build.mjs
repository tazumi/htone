// Bundles src/*.js into a single self-contained page per language of lang.mjs (one so far: ../index.html)
//   npm run build            minified
//   npm run build:readable   unminified, for debugging
//   npm run build:dev        ../dev.html: unminified, plus the development tools in src/dev.js
//   --lang en                only that language (the dev page takes the first one without it)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';
import LANG from './lang.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
// concatenation order matters: the shaders are built from constants of the world layout
const FILES = ['quality.js', 'math.js', 'props2.js', 'props3.js', 'props4.js', 'props5.js', 'props6.js', 'props7.js', 'world.js', 'town.js', 'districts.js', 'shaders.js', 'atlas.js', 'main.js', 'audio.js'];
const dev = process.argv.includes('--dev'), readable = dev || process.argv.includes('--readable');
if (dev) FILES.push('dev.js');
// the dev page is one file, so it gets one language
const li = process.argv.indexOf('--lang'), langs = li > 0 ? [process.argv[li + 1]] : dev ? Object.keys(LANG).slice(0, 1) : Object.keys(LANG);

let js = FILES.map((f) => readFileSync(path.join(here, 'src', f), 'utf8')).join('\n');
let tpl = readFileSync(path.join(here, 'template.html'), 'utf8');
// everything runs inside one async function, with the texts of the language in T; startup errors are shown on screen
const wrap = (body, t) => `(async()=>{const T=${JSON.stringify(t.js)};\n${body}\n})().catch(e=>{console.error(e);document.body.className='l e';document.getElementById('s').textContent=(e.cause?'':${JSON.stringify(t.failed)})+e.message});`;

if (!readable) {
  // shrink the WGSL inside /*wgsl*/ template literals and minify the page's CSS; the JS is minified per language below
  const minWgsl = (s) => s.replace(/\/\/[^\n]*/g, '').replace(/\s+/g, ' ').replace(/ ?([{}()\[\];,:=+\-*\/<>&|!%@]) ?/g, '$1').trim();
  js = js.replace(/\/\*wgsl\*\/`([^`]*)`/g, (_, w) => '`' + minWgsl(w) + '`');
  const css = (_, s) => '<style>' + transformSync(s, { loader: 'css', minify: true }).code.trim();
  tpl = tpl.replace(/<style>([^]*?)(?=<\/style>)/, css).replace(/>\s+</g, '><').replace(/<script>\s+/, '<script>').replace(/\s+<\/script>/, '</script>');
}

for (const lang of langs) {
  if (!LANG[lang]) throw new Error(`no such language: ${lang}`);
  const t = { lang, ...LANG[lang] }, out = dev ? 'dev.html' : t.out, file = path.join(here, '..', out);
  const code = readable ? wrap(js, t) : transformSync(wrap(js, t), { minify: true, target: 'es2022', legalComments: 'none' }).code.trim();
  // the texts go in before the script does: the script has braces of its own
  const html = tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => { if (typeof t[k] !== 'string') throw new Error(`${lang}: no text for {{${k}}}`); return t[k]; }).replace('/*SCRIPT*/', () => code);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, html);
  const gz = gzipSync(Buffer.from(html), { level: 9 }).length;
  console.log(`${out}: ${(Buffer.byteLength(html) / 1024).toFixed(1)} kB${readable ? ' (readable)' : ''}, ${(gz / 1024).toFixed(1)} kB gzipped`);
}
