/* Shared helpers for the Phase 2 mockups. Numbers come from data.js, a real snapshot of the Deadlock API
   taken through the site's own code (see the "takenAt" field). Nothing here is invented. */
const D = window.DATA;
const A = '../../src/assets/';
const $ = (sel) => document.querySelector(sel);
const int = (n) => n.toLocaleString('en-US');
const pct = (n, d = 1) => n.toFixed(d) + '%';
const delta = (n, d = 1) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(d);
const nameOf = (slug) => D.names[slug] || slug;
const itemSlug = (name) => name.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* Winged-diamond tier badge. The diamond carries the letter; the wings grow with the tier:
   S+ three feathers a side, S two, A one, B none. C and D are an outline only. */
function tierBadge(tier, size = 56) {
  const feathers = { 'S+': 3, S: 2, A: 1 }[tier] || 0;
  const solid = tier !== 'C' && tier !== 'D';
  let wings = '';
  for (let i = 0; i < feathers; i++) {
    // one long blade per feather, sweeping up and out from the diamond; lower feathers are shorter
    const y0 = 17 + i * 6, tipX = 95 - i * 10, tipY = 5 + i * 10, y1 = 26 + i * 5;
    wings += `<path d="M63 ${y0} L${tipX} ${tipY} L${65 - i} ${y1} Z"/><path d="M33 ${y0} L${96 - tipX} ${tipY} L${31 + i} ${y1} Z"/>`;
  }
  return `<svg class="tier tier-${tier.replace('+', 'p')}${solid ? '' : ' hollow'}" width="${size}" height="${size / 2}" viewBox="0 0 96 48" role="img" aria-label="${tier} tier">
    <g class="wings">${wings}</g><path class="gem" d="M48 3 L67 24 L48 45 L29 24 Z"/>
    <text x="48" y="30" text-anchor="middle">${tier}</text></svg>`;
}

/* A win rate drawn on a fixed 42% to 58% scale: a tick at 50%, a line for the 95% range, a dot for the value. */
function rangeBar(rate) {
  const x = (v) => Math.max(0, Math.min(100, ((v - 42) / 16) * 100));
  return `<span class="rangebar" title="Range ${rate.low} to ${rate.high}%" aria-hidden="true"><i class="mid"></i><i class="span" style="left:${x(rate.low)}%;width:${Math.max(1.5, x(rate.high) - x(rate.low))}%"></i><i class="dot" style="left:${x(rate.shrunk)}%"></i></span>`;
}

/* Daily win rate as a simple line with the 50% line drawn in. */
function trendSvg(points, w = 900, h = 220) {
  const vals = points.map((p) => p.winRate);
  const lo = Math.floor(Math.min(...vals, 50) - 0.5), hi = Math.ceil(Math.max(...vals) + 0.5);
  const x = (i) => 40 + (i / (points.length - 1)) * (w - 56), y = (v) => 12 + (1 - (v - lo) / (hi - lo)) * (h - 44);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.winRate).toFixed(1)}`).join(' ');
  const day = (t) => new Date(t * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  let grid = '';
  for (let v = lo; v <= hi; v++) grid += `<line x1="40" x2="${w - 16}" y1="${y(v)}" y2="${y(v)}" class="${v === 50 ? 'fifty' : 'grid'}"/><text x="32" y="${y(v) + 4}" text-anchor="end">${v}%</text>`;
  const ticks = [0, Math.floor(points.length / 3), Math.floor((2 * points.length) / 3), points.length - 1]
    .map((i) => `<text x="${x(i)}" y="${h - 8}" text-anchor="middle">${day(points[i].t)}</text>`).join('');
  return `<svg class="trend" viewBox="0 0 ${w} ${h}" role="img" aria-label="Daily win rate this patch">${grid}<path d="${line} L${x(points.length - 1)} ${y(lo)} L${x(0)} ${y(lo)} Z" class="area"/><path d="${line}" class="line"/>${ticks}</svg>`;
}

const stampText = (meta, unit = 'matches') => {
  const since = new Date(meta.window.from * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `<b>${int(meta.matches)}</b> ${unit} · this patch, since ${since} · snapshot ${new Date(D.takenAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
};

/* Theme and font switches for the mockup only: ?theme=king and ?fonts=valve in the address. */
const params = new URLSearchParams(location.search);
document.documentElement.dataset.theme = params.get('theme') === 'king' ? 'king' : 'arch';
document.documentElement.dataset.fonts = params.get('fonts') === 'valve' ? 'valve' : 'open';
