// Generates src/styles/skin-tex.css: the surface patterns a hero's panels and page wear (halftone, blueprint grid,
// damask, brick ...). Every pattern is a mask (shape in black, transparent elsewhere), so the colour follows the skin.
// A pattern sets --tx-img / --tx-size / --tx-pos / --tx-rep (mask layers), --tx-o (strength) and --tx-c (colour).
// Run: node scripts/gen-skin-tex.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'styles', 'skin-tex.css');

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const f = (n) => Math.round(n * 10) / 10;
const svg = (w, h, body, defs = '') => `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;
const uri = (s) => `url("data:image/svg+xml,${encodeURIComponent(s).replace(/%20/g, ' ').replace(/%3D/g, '=').replace(/%2F/g, '/').replace(/%3A/g, ':').replace(/%2C/g, ',')}")`;
const S = (w, h, body, defs) => uri(svg(w, h, body, defs));
/** A noise field thresholded into blotches. alpha = a*noise + b is applied to the alpha channel. */
const noise = (w, h, freq, oct, seed, a, b, extra = '') =>
  S(w, h, `<rect width='${w}' height='${h}' filter='url(#n)'/>`,
    `<filter id='n' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${oct}' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${a} ${b}'/>${extra}</filter>`);

const P = {}; // name -> { img, size, pos?, rep?, o, c? }
const set = (name, o) => { P[name] = o; };

set('smooth', { img: 'none', size: 'auto', o: 0 });
set('grain', { img: 'none', size: 'auto', o: 0 });

// venetian-blind light: wide soft diagonal bands
set('blinds', { img: 'repeating-linear-gradient(104deg, #000 0 20px, transparent 20px 54px)', size: '100% 100%', rep: 'no-repeat', o: 0.05 });
// fencing-mask mesh: a fine diamond lattice
set('mesh', { img: 'repeating-linear-gradient(45deg, #000 0 1px, transparent 1px 5px), repeating-linear-gradient(-45deg, #000 0 1px, transparent 1px 5px)', size: '100% 100%, 100% 100%', rep: 'no-repeat', o: 0.07 });
set('dots', { img: 'radial-gradient(circle at 7px 7px, #000 1.5px, transparent 1.9px)', size: '14px 14px', o: 0.09 });
set('mottle', { img: noise(300, 300, 0.045, 3, 4, 1.7, -0.62), size: '300px 300px', o: 0.07 });
// halftone: two staggered dot grids, so the dots read as a printed screen
set('halftone', { img: 'radial-gradient(circle at 5px 5px, #000 2.1px, transparent 2.5px), radial-gradient(circle at 5px 5px, #000 1.4px, transparent 1.8px)', size: '10px 10px, 10px 10px', pos: '0 0, 5px 5px', o: 0.1 });
set('scan', { img: 'repeating-linear-gradient(0deg, #000 0 1px, transparent 1px 4px)', size: '100% 100%', rep: 'no-repeat', o: 0.07 });
set('stripes', { img: 'repeating-linear-gradient(90deg, #000 0 26px, transparent 26px 52px)', size: '100% 100%', rep: 'no-repeat', o: 0.07 });
set('weave', { img: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.8) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.8) 0 1px, transparent 1px 3px)', size: '100% 100%, 100% 100%', rep: 'no-repeat', o: 0.06 });
set('hatch', { img: 'repeating-linear-gradient(45deg, #000 0 1px, transparent 1px 7px)', size: '100% 100%', rep: 'no-repeat', o: 0.07 });
set('frost', { img: noise(300, 300, 0.7, 2, 9, 26, -13.4), size: '300px 300px', o: 0.12 });
set('blueprint', { img: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px), linear-gradient(rgba(0,0,0,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.4) 1px, transparent 1px)', size: '60px 60px, 60px 60px, 12px 12px, 12px 12px', o: 0.12 });
set('pinstripe', { img: 'repeating-linear-gradient(90deg, #000 0 1px, transparent 1px 11px)', size: '100% 100%', rep: 'no-repeat', o: 0.08 });
set('checker', { img: 'conic-gradient(#000 25%, transparent 0 50%, #000 0 75%, transparent 0)', size: '44px 44px', o: 0.045 });
set('ruled', { img: 'repeating-linear-gradient(0deg, #000 0 1px, transparent 1px 29px)', size: '100% 100%', rep: 'no-repeat', o: 0.1 });
set('rays', { img: 'repeating-conic-gradient(from 188deg at 50% -12%, #000 0 3deg, transparent 3deg 9deg)', size: '100% 100%', rep: 'no-repeat', o: 0.05 });
set('diamonds', { img: 'repeating-linear-gradient(60deg, #000 0 1px, transparent 1px 22px), repeating-linear-gradient(-60deg, #000 0 1px, transparent 1px 22px)', size: '100% 100%, 100% 100%', rep: 'no-repeat', o: 0.09 });


{
  // ink wash: a few tapered brush strokes drawn on a slant, wrapped so the tile repeats without a seam
  const W = 640, H = 420, r = rng(61); let b = '';
  for (let i = 0; i < 9; i++) {
    const x = r() * W, y = r() * H, len = 220 + r() * 260, wid = 9 + r() * 20, ang = (-24 + (r() - 0.5) * 16) * Math.PI / 180, o = f(0.35 + r() * 0.55);
    const n = 10, top = [], bot = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n, w = wid * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.04)), 0.7) * (1 - t * 0.35);
      const cx = x + Math.cos(ang) * len * t + (r() - 0.5) * 3, cy = y + Math.sin(ang) * len * t + (r() - 0.5) * 3;
      top.push([cx - Math.sin(ang) * w / 2, cy + Math.cos(ang) * w / 2]); bot.push([cx + Math.sin(ang) * w / 2, cy - Math.cos(ang) * w / 2]);
    }
    const d = 'M' + top.map(([a, c]) => `${f(a)} ${f(c)}`).join('L') + 'L' + bot.reverse().map(([a, c]) => `${f(a)} ${f(c)}`).join('L') + 'Z';
    for (const dx of [-W, 0, W]) for (const dy of [-H, 0, H]) b += `<path d='${d}' transform='translate(${dx} ${dy})' fill-opacity='${o}'/>`;
  }
  set('ink', { img: S(W, H, b), size: `${W}px ${H}px`, o: 0.1 });
}
{
  // chalk: soft eraser smears, wide and nearly flat
  const W = 560, H = 360, r = rng(71); let b = '';
  for (let i = 0; i < 9; i++) {
    const x = r() * W, y = r() * H, rx = 70 + r() * 120, ry = 14 + r() * 26, a = (r() - 0.5) * 14, o = f(0.25 + r() * 0.5);
    for (const dx of [-W, 0, W]) for (const dy of [-H, 0, H]) b += `<ellipse cx='${f(x + dx)}' cy='${f(y + dy)}' rx='${f(rx)}' ry='${f(ry)}' transform='rotate(${f(a)} ${f(x + dx)} ${f(y + dy)})' fill-opacity='${o}'/>`;
  }
  set('chalk', { img: S(W, H, `<g filter='url(#b)'>${b}</g>`, `<filter id='b' x='-20%' y='-20%' width='140%' height='140%'><feGaussianBlur stdDeviation='13'/></filter>`), size: `${W}px ${H}px`, o: 0.1 });
}

// ---- hand-drawn tiles ----
set('damask', {
  img: S(64, 80, `<g fill='none' stroke='#000' stroke-width='1.1' stroke-linecap='round'>
    <path d='M32 6C24 16 22 26 32 34C42 26 40 16 32 6Z'/><path d='M32 34C22 40 14 38 10 30C16 28 24 30 32 40'/><path d='M32 34C42 40 50 38 54 30C48 28 40 30 32 40'/>
    <path d='M32 40V54'/><path d='M24 52C28 48 36 48 40 52'/><circle cx='32' cy='18' r='2'/>
    <path d='M0 40C8 44 10 52 8 60'/><path d='M64 40C56 44 54 52 56 60'/>
    <path d='M0 72C6 66 12 66 16 72C20 78 26 78 32 72'/><path d='M64 72C58 66 52 66 48 72C44 78 38 78 32 72'/></g>`), size: '64px 80px', o: 0.1,
});
set('fans', {
  img: S(48, 24, `<g fill='none' stroke='#000' stroke-width='1.1'>${[5, 9, 13, 17].map((r) => `<circle cx='24' cy='24' r='${r}'/><circle cx='0' cy='0' r='${r}'/><circle cx='48' cy='0' r='${r}'/>`).join('')}</g>`), size: '48px 24px', o: 0.12,
});
set('brick', {
  img: S(60, 30, `<g fill='none' stroke='#000' stroke-width='1.3'><path d='M0 0.6H60M0 15.6H60'/><path d='M0.6 0V15M30.6 0V15M30.6 15V30M0.6 30V15M60 15V30'/></g>`), size: '60px 30px', o: 0.1,
});
set('rings', {
  img: S(140, 140, `<g fill='none' stroke='#000' stroke-width='1.2'><circle cx='70' cy='70' r='58'/><circle cx='70' cy='70' r='46' stroke-dasharray='2 6'/><circle cx='70' cy='70' r='30'/><circle cx='70' cy='70' r='4' fill='#000'/>
    <path d='M70 12V22M70 118V128M12 70H22M118 70H128M29 29L36 36M104 104L111 111M111 29L104 36M36 104L29 111'/><path d='M70 70L70 44M70 70L88 80' stroke-width='1.6'/></g>`), size: '140px 140px', o: 0.1,
});
set('hex', {
  img: S(28, 49, `<g fill='none' stroke='#000' stroke-width='1.1'><path d='M14 0.5L27.5 8.3V24L14 31.8L0.5 24V8.3Z' transform='translate(0 -7.8)'/><path d='M14 0.5L27.5 8.3V24L14 31.8L0.5 24V8.3Z' transform='translate(14 16.6)'/><path d='M14 0.5L27.5 8.3V24L14 31.8L0.5 24V8.3Z' transform='translate(-14 16.6)'/></g>`), size: '28px 49px', o: 0.09,
});
set('scales', {
  img: S(28, 20, `<g fill='none' stroke='#000' stroke-width='1.2'><path d='M0 14A14 14 0 0 1 28 14'/><path d='M-14 24A14 14 0 0 1 14 24'/><path d='M14 24A14 14 0 0 1 42 24'/></g>`), size: '28px 20px', o: 0.1,
});
set('waves', {
  img: S(48, 14, `<path d='M0 7C8 -1 16 -1 24 7C32 15 40 15 48 7' fill='none' stroke='#000' stroke-width='1.2'/>`), size: '48px 14px', o: 0.1,
});
set('strata', {
  img: S(240, 90, `<g fill='none' stroke='#000' stroke-width='1.2'><path d='M0 14C40 6 80 22 120 14S200 8 240 14'/><path d='M0 36C50 44 90 28 130 36S210 44 240 36'/><path d='M0 58C30 52 70 66 120 58S190 50 240 58'/><path d='M0 80C60 88 100 72 150 80S210 86 240 80'/></g><g fill='#000'><circle cx='40' cy='26' r='2'/><circle cx='170' cy='48' r='2.4'/><circle cx='96' cy='70' r='1.8'/><circle cx='210' cy='70' r='2'/></g>`), size: '240px 90px', o: 0.11,
});
{
  const r = rng(21); let b = '';
  for (let i = 0; i < 70; i++) {
    const x = r() * 260, y = r() * 260, rad = 0.6 + r() * 1.5;
    for (const dx of [0, x < 3 ? 260 : x > 257 ? -260 : 0]) for (const dy of [0, y < 3 ? 260 : y > 257 ? -260 : 0]) b += `<circle cx='${f(x + dx)}' cy='${f(y + dy)}' r='${f(rad)}' fill-opacity='${f(0.4 + r() * 0.6)}'/>`;
  }
  set('embers', { img: S(260, 260, b), size: '260px 260px', o: 0.3 });
}
{
  const r = rng(33); let b = '';
  const star = (x, y, s) => `<path d='M${x} ${f(y - s)}L${f(x + s * 0.28)} ${f(y - s * 0.28)}L${f(x + s)} ${y}L${f(x + s * 0.28)} ${f(y + s * 0.28)}L${x} ${f(y + s)}L${f(x - s * 0.28)} ${f(y + s * 0.28)}L${f(x - s)} ${y}L${f(x - s * 0.28)} ${f(y - s * 0.28)}Z'/>`;
  for (let i = 0; i < 44; i++) { const x = f(r() * 200), y = f(r() * 200); b += r() < 0.3 ? star(x, y, f(2.6 + r() * 3)) : `<circle cx='${x}' cy='${y}' r='${f(0.5 + r() * 1.1)}' fill-opacity='${f(0.4 + r() * 0.6)}'/>`; }
  set('stars', { img: S(200, 200, b), size: '200px 200px', o: 0.4 });
}
{
  const r = rng(47); let b = '';
  for (let i = 0; i < 16; i++) {
    const x = r() * 220, y = r() * 220, rad = 5 + r() * 18;
    b += `<circle cx='${f(x)}' cy='${f(y)}' r='${f(rad)}' fill='none' stroke='#000' stroke-width='1.2' stroke-opacity='${f(0.5 + r() * 0.5)}'/><circle cx='${f(x - rad * 0.35)}' cy='${f(y - rad * 0.38)}' r='${f(rad * 0.18)}' fill='#000' fill-opacity='0.6'/>`;
  }
  set('bubbles', { img: S(220, 220, b), size: '220px 220px', o: 0.16 });
}

// ---- torn / bitten paper edges (used as mask strips by the "torn" frame) ----
function tear(seed, w, h, amp, flip) {
  const r = rng(seed); let d = flip ? `M0 ${h}` : 'M0 0';
  let x = 0;
  const pts = [];
  while (x < w) { pts.push([x, r()]); x += 3 + r() * 7; }
  pts.push([w, pts[0][1]]);
  d = flip ? `M0 0V${f(h - amp * pts[0][1])}` : `M0 ${h}V${f(amp * pts[0][1])}`;
  for (const [px, py] of pts) d += `L${f(px)} ${f(flip ? h - amp * py : amp * py)}`;
  d += flip ? `V0Z` : `V${h}Z`;
  return S(w, h, `<path d='${d}'/>`);
}
const TEARS = {
  fine: { top: tear(5, 160, 10, 8, false), bot: tear(8, 160, 10, 8, true), h: 10, w: 160 },
  coarse: { top: tear(12, 120, 14, 12, false), bot: tear(17, 120, 14, 12, true), h: 14, w: 120 },
  poster: { top: tear(23, 220, 8, 5, false), bot: tear(29, 220, 8, 5, true), h: 8, w: 220 },
};

// ---- icicles and drips (frost / drip frames hang them from the top edge) ----
const ICICLES = S(44, 20, `<path d='M0 0H44V3L40 3L37.5 19L35 3L28 3L25 12L22 3L14 3L11 15L8 3L0 3Z'/>`);
const DRIPS = S(96, 34, `<rect width='96' height='6'/><g>${[[8, 12, 2.6], [28, 22, 3.2], [47, 8, 2.4], [63, 17, 3], [83, 11, 2.6]].map(([x, l, w]) => `<rect x='${x - w / 2}' y='4' width='${w}' height='${l}'/><circle cx='${x}' cy='${4 + l}' r='${w * 1.55}'/><path d='M${x - w * 2.4} 6Q${x - w * 0.6} 6 ${x - w / 2} 14L${x - w / 2} 6Z M${x + w * 2.4} 6Q${x + w * 0.6} 6 ${x + w / 2} 14L${x + w / 2} 6Z'/>`).join('')}</g>`);
const SCALLOP = S(24, 12, `<path d='M0 0H24V1C24 7 18 12 12 12C6 12 0 7 0 1Z'/>`);

let css = '/* Generated by scripts/gen-skin-tex.mjs. Do not edit by hand. */\n';
css += `.skin { --tx-img: none; --tx-size: auto; --tx-pos: 0 0; --tx-rep: repeat; --tx-o: 0; --tx-c: var(--ink); }\n`;
const COL = { blueprint: 'var(--sk-accent-2)', embers: 'var(--sk-accent-2)', stars: 'var(--sk-hi)', frost: 'var(--sk-accent-2)', halftone: 'var(--sk-accent)', scan: 'var(--sk-accent)', rays: 'var(--sk-hi)', rings: 'var(--sk-accent-2)', bubbles: 'var(--sk-accent-2)', diamonds: 'var(--sk-accent-2)', damask: 'var(--sk-accent-2)', fans: 'var(--sk-accent-2)', chalk: 'var(--ink)', dots: 'var(--sk-accent-2)', stripes: 'var(--sk-accent)', checker: 'var(--sk-accent-2)', hex: 'var(--sk-accent-2)', pinstripe: 'var(--sk-accent-2)' };
for (const [name, p] of Object.entries(P)) {
  if (name === 'smooth' || name === 'grain') { css += `.skin[data-tex='${name}'] { --tx-o: 0; }\n`; continue; }
  const c = COL[name] ? ` --tx-c: ${COL[name]};` : '';
  css += `.skin[data-tex='${name}'] { --tx-img: ${p.img}; --tx-size: ${p.size}; --tx-pos: ${p.pos ?? '0 0'}; --tx-rep: ${p.rep ?? 'repeat'}; --tx-o: ${p.o};${c} }\n`;
}
css += `\n/* edge shapes for frames */\n.skin { --ice: ${ICICLES}; --drips: ${DRIPS}; --scallop: ${SCALLOP}; }\n`;
for (const [k, t] of Object.entries(TEARS)) css += `.skin { --tear-${k}-top: ${t.top}; --tear-${k}-bot: ${t.bot}; --tear-${k}-h: ${t.h}px; --tear-${k}-w: ${t.w}px; }\n`;
writeFileSync(OUT, css);
console.log('wrote', OUT, Math.round(css.length / 1024) + ' KB', Object.keys(P).length + ' patterns');
