// Generates src/styles/skin-fx.css: the ambient effects drifting behind a hero's skinned page.
// Each effect is one or two seamless SVG tiles used as a CSS mask (so the colour follows the skin) on an oversized layer
// that is moved with `transform`, which keeps the animation on the compositor. Run: node scripts/gen-skin-fx.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'styles', 'skin-fx.css');
const T = 640;

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const f = (n) => Math.round(n * 10) / 10;

/** Draws `shape(x, y)` at a point and, near a tile edge, at its wrapped copies so the tile repeats without a seam. */
function wrap(x, y, r, w, h, draw) {
  const xs = [0]; const ys = [0];
  if (x < r) xs.push(1); if (x > w - r) xs.push(-1);
  if (y < r) ys.push(1); if (y > h - r) ys.push(-1);
  let out = '';
  for (const dx of xs) for (const dy of ys) out += draw(f(x + dx * w), f(y + dy * h));
  return out;
}

const svg = (w, h, body, defs = '') => `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;
const uri = (s) => `url("data:image/svg+xml,${encodeURIComponent(s).replace(/%20/g, ' ').replace(/%3D/g, '=').replace(/%2F/g, '/').replace(/%3A/g, ':').replace(/%2C/g, ',')}")`;

const GLOW = `<radialGradient id='g'><stop offset='0' stop-opacity='1'/><stop offset='1' stop-opacity='0'/></radialGradient>`;

function dots(seed, n, rmin, rmax, { op = [0.5, 1], glow = 0 } = {}) {
  const r = rng(seed); let b = '';
  for (let i = 0; i < n; i++) {
    const x = r() * T, y = r() * T, rad = rmin + r() * (rmax - rmin), o = f(op[0] + r() * (op[1] - op[0]));
    if (glow && r() < glow) b += wrap(x, y, rad * 4, T, T, (px, py) => `<circle cx='${px}' cy='${py}' r='${f(rad * 3.4)}' fill='url(#g)' fill-opacity='${f(o * 0.55)}'/><circle cx='${px}' cy='${py}' r='${f(rad)}' fill-opacity='${o}'/>`);
    else b += wrap(x, y, rad, T, T, (px, py) => `<circle cx='${px}' cy='${py}' r='${f(rad)}' fill-opacity='${o}'/>`);
  }
  return svg(T, T, b, glow ? GLOW : '');
}

function lines(seed, n, len, dx, sw, op = [0.4, 0.9]) {
  const r = rng(seed); let b = '';
  for (let i = 0; i < n; i++) {
    const x = r() * T, y = r() * T, l = len * (0.6 + r() * 0.8), o = f(op[0] + r() * (op[1] - op[0]));
    b += wrap(x, y, l, T, T, (px, py) => `<path d='M${px} ${py}l${f(dx * l / len)} ${f(l)}' stroke='#000' stroke-width='${sw}' stroke-linecap='round' fill='none' stroke-opacity='${o}'/>`);
  }
  return svg(T, T, b);
}

function shapes(seed, n, path, smin, smax, { op = [0.5, 1], rot = 360 } = {}) {
  const r = rng(seed); let b = '';
  for (let i = 0; i < n; i++) {
    const x = r() * T, y = r() * T, s = smin + r() * (smax - smin), a = Math.round(r() * rot), o = f(op[0] + r() * (op[1] - op[0]));
    b += wrap(x, y, 14 * s, T, T, (px, py) => `<path d='${path}' transform='translate(${px} ${py}) rotate(${a}) scale(${f(s)})' fill-opacity='${o}'/>`);
  }
  return svg(T, T, b);
}

function rings(seed, n, rmin, rmax) {
  const r = rng(seed); let b = '';
  for (let i = 0; i < n; i++) {
    const x = r() * T, y = r() * T, rad = rmin + r() * (rmax - rmin), o = f(0.45 + r() * 0.5);
    b += wrap(x, y, rad + 2, T, T, (px, py) => `<circle cx='${px}' cy='${py}' r='${f(rad)}' fill='#000' fill-opacity='0.07' stroke='#000' stroke-width='1.3' stroke-opacity='${o}'/><circle cx='${f(px - rad * 0.35)}' cy='${f(py - rad * 0.38)}' r='${f(rad * 0.16)}' fill-opacity='${f(o * 0.8)}'/>`);
  }
  return svg(T, T, b);
}

function fog(seed, n, W = 960) {
  const r = rng(seed); let b = '';
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = 60 + r() * (T - 120), rx = 170 + r() * 150, ry = 55 + r() * 60, o = f(0.35 + r() * 0.4);
    b += wrap(x, y, rx, W, T, (px, py) => `<ellipse cx='${px}' cy='${py}' rx='${f(rx)}' ry='${f(ry)}' fill='url(#g)' fill-opacity='${o}'/>`);
  }
  return svg(W, T, b, GLOW);
}

const BAT = 'M0 0C-3 -6 -9 -9 -19 -5C-15 -3 -14 0 -12 4C-9 1 -6 2 -3 7C-2 4 -1 3 0 3C1 3 2 4 3 7C6 2 9 1 12 4C14 0 15 -3 19 -5C9 -9 3 -6 0 0Z';
function bats(seed, n, W = 1280, H = 640) {
  const r = rng(seed); let b = '';
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = 40 + r() * (H - 160), s = 0.7 + r() * 1.2, a = Math.round(-14 + r() * 28), o = f(0.5 + r() * 0.45);
    b += wrap(x, y, 40, W, H, (px, py) => `<path d='${BAT}' transform='translate(${px} ${py}) rotate(${a}) scale(${f(s)})' fill-opacity='${o}'/>`);
  }
  return svg(W, H, b);
}

function confetti(seed, n) {
  const r = rng(seed); const cols = ['#e0407f', '#17b3ae', '#f2b632', '#5b7de8', '#f27a3a', '#8a4fd1']; let b = '';
  for (let i = 0; i < n; i++) {
    const x = r() * T, y = r() * T, a = Math.round(r() * 180), c = cols[Math.floor(r() * cols.length)], w = 3 + r() * 3, h = 6 + r() * 6;
    b += wrap(x, y, 10, T, T, (px, py) => `<rect x='${f(px - w / 2)}' y='${f(py - h / 2)}' width='${f(w)}' height='${f(h)}' rx='1' fill='${c}' fill-opacity='0.85' transform='rotate(${a} ${px} ${py})'/>`);
  }
  return svg(T, T, b);
}

function ash(seed, n) {
  const r = rng(seed); let b = '';
  for (let i = 0; i < n; i++) {
    const x = r() * T, y = r() * T, s = 1.5 + r() * 3.2, o = f(0.35 + r() * 0.55);
    const pts = [0, 1, 2, 3, 4].map((k) => { const ang = (k / 5) * Math.PI * 2 + r() * 0.6, rad = s * (0.6 + r() * 0.7); return `${f(Math.cos(ang) * rad)},${f(Math.sin(ang) * rad)}`; }).join(' ');
    b += wrap(x, y, s * 2, T, T, (px, py) => `<polygon points='${pts}' transform='translate(${px} ${py})' fill-opacity='${o}'/>`);
  }
  return svg(T, T, b);
}

const LEAF = 'M0 0C4 -7 11 -7 16 0C11 7 4 7 0 0Z';
const PETAL = 'M0 0C-4 -5 -4 -11 0 -15C4 -11 4 -5 0 0Z';
const STAR = 'M0 -7L1.4 -1.4L7 0L1.4 1.4L0 7L-1.4 1.4L-7 0L-1.4 -1.4Z';
const SPARK = 'M0 0l5 -4l-2 4l5 -3';

const A = 1, B = 2;
const fx = {
  embers: { c: 'var(--sk-accent-2)', o: 0.6, a: { tile: dots(11, 16, 1, 2.6, { glow: 0.5 }), anim: 'fx-up 52s linear infinite' }, b: { tile: dots(12, 11, 0.8, 1.8, { op: [0.3, 0.8] }), anim: 'fx-up 33s linear infinite', o: 0.5 } },
  snow: { c: '#e9f7ff', o: 0.55, a: { tile: dots(21, 20, 1, 3, { op: [0.5, 1] }), anim: 'fx-snow 58s linear infinite' }, b: { tile: dots(22, 14, 0.8, 2, { op: [0.4, 0.9] }), anim: 'fx-snow 38s linear infinite', o: 0.45 } },
  sparks: { c: 'var(--sk-hi)', o: 0.7, a: { tile: shapes(31, 16, SPARK, 0.9, 1.7, { rot: 360 }), anim: 'fx-up 24s linear infinite, fx-flicker 3.1s steps(1) infinite' }, b: { tile: dots(32, 10, 0.8, 1.6, { op: [0.5, 1] }), anim: 'fx-up 41s linear infinite, fx-flicker 4.3s steps(1) infinite', o: 0.55 } },
  stars: { c: 'var(--sk-accent-2)', o: 0.7, a: { tile: dots(41, 30, 0.5, 1.5, { op: [0.4, 1] }), anim: 'fx-twinkle 5.5s ease-in-out infinite alternate' }, b: { tile: shapes(42, 9, STAR, 0.5, 0.95, { rot: 0 }), anim: 'fx-twinkle 3.7s ease-in-out infinite alternate-reverse', o: 0.75 } },
  rain: { c: 'var(--sk-ink-soft)', o: 0.5, a: { tile: lines(51, 26, 42, 7, 1.1), anim: 'fx-rain 4.8s linear infinite' }, b: { tile: lines(52, 16, 28, 7, 0.9, [0.25, 0.6]), anim: 'fx-rain 7.2s linear infinite', o: 0.4 } },
  dust: { c: 'var(--sk-accent-2)', o: 0.4, a: { tile: dots(61, 22, 0.8, 2.2, { op: [0.3, 0.8], glow: 0.35 }), anim: 'fx-dust 120s linear infinite' }, b: { tile: dots(62, 14, 0.6, 1.5, { op: [0.3, 0.7] }), anim: 'fx-up 95s linear infinite', o: 0.5 } },
  fog: { c: 'var(--sk-accent)', o: 0.2, a: { tile: fog(71, 6), w: 960, anim: 'fx-fog 140s linear infinite' }, b: { tile: fog(72, 5), w: 960, anim: 'fx-fog 90s linear infinite reverse', o: 0.14 } },
  leaves: { c: 'var(--sk-hi)', o: 0.5, a: { tile: shapes(81, 12, LEAF, 0.5, 1.0, { op: [0.5, 1] }), anim: 'fx-snow 64s linear infinite' }, b: { tile: shapes(82, 8, LEAF, 0.4, 0.8, { op: [0.4, 0.8] }), anim: 'fx-snow 44s linear infinite', o: 0.4 } },
  petals: { c: 'var(--sk-accent-2)', o: 0.5, a: { tile: shapes(91, 12, PETAL, 0.5, 0.95, { op: [0.5, 1] }), anim: 'fx-snow 62s linear infinite' }, b: { tile: shapes(92, 8, PETAL, 0.4, 0.8, { op: [0.4, 0.8] }), anim: 'fx-snow 43s linear infinite', o: 0.4 } },
  confetti: { raw: true, o: 0.75, a: { tile: confetti(101, 22), anim: 'fx-snow 60s linear infinite' }, b: { tile: confetti(102, 14), anim: 'fx-snow 38s linear infinite', o: 0.55 } },
  bubbles: { c: 'var(--sk-accent-2)', o: 0.5, a: { tile: rings(111, 12, 4, 15), anim: 'fx-up 48s linear infinite' }, b: { tile: rings(112, 8, 3, 9), anim: 'fx-up 30s linear infinite', o: 0.4 } },
  glitter: { c: 'var(--sk-accent-2)', o: 0.7, a: { tile: shapes(121, 15, STAR, 0.35, 0.9, { rot: 0 }), anim: 'fx-twinkle 2.8s ease-in-out infinite alternate' }, b: { tile: shapes(122, 11, STAR, 0.3, 0.7, { rot: 0 }), anim: 'fx-twinkle 3.9s ease-in-out infinite alternate-reverse', o: 0.7 } },
  bats: { c: 'var(--sk-s0)', o: 0.55, bats: true, a: { tile: bats(131, 3), anim: 'fx-fly 85s linear infinite' }, b: { tile: bats(132, 2), anim: 'fx-fly 120s linear infinite', o: 0.4 } },
  ash: { c: 'var(--sk-ink-soft)', o: 0.4, a: { tile: ash(141, 20), anim: 'fx-snow 70s linear infinite' }, b: { tile: ash(142, 12), anim: 'fx-snow 48s linear infinite', o: 0.3 } },
};

// How each animation lays out its oversized layer. Tiles are 640px (fog 960, bats 1280 wide) and every keyframe moves by exactly one tile.
const layout = {
  'fx-up': 'top:0;height:calc(100% + 640px)',
  'fx-snow': 'top:-640px;height:calc(100% + 640px)',
  'fx-rain': 'top:-640px;height:calc(100% + 640px)',
  'fx-dust': 'left:-640px;width:calc(100% + 640px);top:0;height:100%',
  'fx-fog': 'left:-960px;width:calc(100% + 960px);top:0;height:100%',
  'fx-fly': 'left:-1280px;width:calc(100% + 1280px);top:0;height:100%',
  'fx-twinkle': 'top:0;height:100%',
};

let css = `/* Generated by scripts/gen-skin-fx.mjs. Do not edit by hand. */
.sw-fx { position: absolute; inset: 0; overflow: hidden; display: none; contain: strict; }
.skin:not([data-fx='none']) .sw-fx { display: block; }
.sw-fx::before, .sw-fx::after { content: ''; position: absolute; left: 0; width: 100%; will-change: transform; background: var(--fxc, var(--sk-accent-2)); opacity: var(--fxo, 0.5); }
.skin[data-mode='light'] .sw-fx::before, .skin[data-mode='light'] .sw-fx::after { mix-blend-mode: multiply; }
.skin { --sk-ink-soft: color-mix(in srgb, var(--ink) 70%, transparent); }
@keyframes fx-up { to { transform: translateY(-640px); } }
@keyframes fx-snow { from { transform: translate(0, 0); } 50% { transform: translate(36px, 320px); } to { transform: translate(0, 640px); } }
@keyframes fx-rain { to { transform: translateY(640px); } }
@keyframes fx-dust { to { transform: translateX(640px); } }
@keyframes fx-fog { to { transform: translateX(960px); } }
@keyframes fx-fly { to { transform: translateX(1280px); } }
@keyframes fx-twinkle { from { opacity: 0.15; } to { opacity: var(--fxo, 0.6); } }
@keyframes fx-flicker { 0%, 100% { opacity: var(--fxo, 0.6); } 22% { opacity: 0.1; } 31% { opacity: var(--fxo, 0.6); } 58% { opacity: 0.2; } 66% { opacity: var(--fxo, 0.6); } }
@media (prefers-reduced-motion: reduce) { .sw-fx::before, .sw-fx::after { animation: none !important; } .skin:not([data-fx='stars']):not([data-fx='glitter']) .sw-fx { display: none; } }
`;

for (const [name, d] of Object.entries(fx)) {
  const sel = `.skin[data-fx='${name}'] .sw-fx`;
  css += `${sel} { --fxo: ${d.o};${d.raw ? '' : ` --fxc: ${d.c};`} }\n`;
  for (const [pseudo, L] of [['before', d.a], ['after', d.b]]) {
    const first = L.anim.split(' ')[0];
    const w = d.bats ? 1280 : (L.w ?? T);
    const h = d.bats ? 640 : T;
    const rep = d.bats ? 'repeat-x' : first === 'fx-fog' ? 'repeat' : 'repeat';
    const op = L.o !== undefined ? ` opacity: ${L.o};` : '';
    const lay = layout[first] ?? layout['fx-up'];
    if (d.raw) {
      css += `${sel}::${pseudo} { ${lay}; background: ${uri(L.tile)} 0 0 / ${w}px ${h}px ${rep}; animation: ${L.anim};${op} }\n`;
    } else {
      css += `${sel}::${pseudo} { ${lay}; -webkit-mask: ${uri(L.tile)} 0 0 / ${w}px ${h}px ${rep}; mask: ${uri(L.tile)} 0 0 / ${w}px ${h}px ${rep}; animation: ${L.anim};${op} }\n`;
    }
  }
}

writeFileSync(OUT, css);
console.log(`wrote ${OUT} (${Math.round(css.length / 1024)} KB)`);
