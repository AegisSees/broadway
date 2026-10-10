import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { fmtDay, trendSummary, trendView, type HeroTrend, type TrendRange } from '../data/trend';
import { fmtInt } from '../lib/stats';

const RANGES: { id: TrendRange; label: string; hint: string }[] = [
  { id: 'all', label: 'All', hint: 'Every day in the sample' },
  { id: '4w', label: '4W', hint: 'The last four weeks' },
  { id: 'patch', label: 'By patch', hint: 'One point per patch' },
];

const H = 292;
const MD = { l: 46, r: 92, t: 22, b: 44 };
const MN = { ...MD, l: 38, r: 74 };

function useWidth(ref: React.RefObject<HTMLElement | null>, fallback = 720): number {
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setW(Math.max(300, Math.round(el.getBoundingClientRect().width) || fallback));
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, fallback]);
  return w;
}

/** Axis ticks on whole points of win rate, widened so the 50% line always has room on both sides. */
function axis(values: number[]): { lo: number; hi: number; ticks: number[] } {
  let lo = Math.floor(Math.min(...values, 49) - 0.4);
  let hi = Math.ceil(Math.max(...values, 51) + 0.4);
  const span = hi - lo;
  const step = span <= 8 ? 1 : span <= 16 ? 2 : 5;
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(v);
  return { lo, hi, ticks };
}

/**
 * Win rate over time, drawn the way the best stat sites do it: a painted panel, dashed orange patch lines with their
 * dates, green where the hero is above 50% and red where it is below, and a flag on the latest value.
 */
export default function WinTrend({ heroName, trend }: { heroName: string; trend: HeroTrend }) {
  const [range, setRange] = useState<TrendRange>('all');
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const W = useWidth(box);
  const uid = useId().replace(/:/g, '');

  const view = useMemo(() => trendView(trend, range), [trend, range]);
  const summary = useMemo(() => trendSummary(trend), [trend]);
  const pts = view.points;
  const { lo, hi, ticks } = useMemo(() => axis(pts.map((p) => p.winRate)), [pts]);

  if (!pts.length || !summary) return <div className="panel empty"><h3>No history yet</h3><p>{heroName} doesn't have enough days of results to draw a trend.</p></div>;

  const M = W < 520 ? MN : MD;
  const pw = W - M.l - M.r;
  const ph = H - M.t - M.b;
  const y = (v: number) => M.t + ((hi - v) / (hi - lo)) * ph;
  const t0 = pts[0].t;
  const t1 = pts[pts.length - 1].t;
  const x = (p: { t: number }, i: number) => {
    if (pts.length === 1) return M.l + pw / 2;
    return view.byPatch ? M.l + (i / (pts.length - 1)) * pw : M.l + ((p.t - t0) / (t1 - t0 || 1)) * pw;
  };
  const xs = pts.map((p, i) => x(p, i));
  const y50 = y(50);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${xs[i].toFixed(1)} ${y(p.winRate).toFixed(1)}`).join(' ');
  const area = `${line} L${xs[xs.length - 1].toFixed(1)} ${y50.toFixed(1)} L${xs[0].toFixed(1)} ${y50.toFixed(1)} Z`;
  const last = pts[pts.length - 1];
  const lx = xs[xs.length - 1];
  const ly = y(last.winRate);
  const up = summary.current >= 50;

  // Patch markers. In "by patch" view every point is a patch, so the markers sit on the points.
  const marks = view.patches
    .map((p, i) => ({ p, px: view.byPatch ? xs[i] : M.l + ((p.t - t0) / (t1 - t0 || 1)) * pw }))
    .filter((m) => m.px >= M.l - 1 && m.px <= M.l + pw + 1);
  let lastLabel = -Infinity;
  const labelled = marks.map((m) => { const ok = m.px - lastLabel >= 54; if (ok) lastLabel = m.px; return { ...m, ok }; });

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0; let d = Infinity;
    xs.forEach((v, i) => { const dd = Math.abs(v - px); if (dd < d) { d = dd; best = i; } });
    setHover(px < M.l - 8 || px > M.l + pw + 8 ? null : best);
  };
  const hp = hover === null ? null : pts[hover];
  const tipLeft = hp === null || hover === null ? 0 : Math.min(Math.max(xs[hover], 86), W - 86);

  return (
    <div className="wt panel paint" ref={box}>
      <div className="wt-brush" aria-hidden="true" />
      <div className="wt-head">
        <div className="wt-title">
          <span className="tape">Win rate trend</span>
          <div className="wt-now">
            <b className={up ? 'up' : 'down'}>{summary.current.toFixed(1)}%</b>
            {summary.delta !== null && <span className={`wt-delta ${summary.delta >= 0 ? 'up' : 'down'}`}>{summary.delta >= 0 ? '▲' : '▼'} {Math.abs(summary.delta).toFixed(1)}%</span>}
            <small>{fmtInt(summary.matchesWeek)} matches this week</small>
          </div>
        </div>
        <div className="seg" role="group" aria-label="Trend range">
          {RANGES.map((r) => <button key={r.id} type="button" title={r.hint} aria-pressed={range === r.id} onClick={() => { setRange(r.id); setHover(null); }}>{r.label}</button>)}
        </div>
      </div>

      <div className="wt-plot">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${heroName} win rate: ${summary.current.toFixed(1)} percent over the last seven days${summary.delta === null ? '' : `, ${summary.delta >= 0 ? 'up' : 'down'} ${Math.abs(summary.delta).toFixed(1)} points on the week before`}.`} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          <defs>
            <clipPath id={`${uid}a`}><rect x={M.l} y={M.t - 6} width={pw} height={Math.max(0, y50 - (M.t - 6))} /></clipPath>
            <clipPath id={`${uid}b`}><rect x={M.l} y={y50} width={pw} height={Math.max(0, M.t + ph + 6 - y50)} /></clipPath>
            <linearGradient id={`${uid}g`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--good)" stopOpacity="0.55" /><stop offset="1" stopColor="var(--good)" stopOpacity="0.08" /></linearGradient>
            <linearGradient id={`${uid}r`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--bad)" stopOpacity="0.08" /><stop offset="1" stopColor="var(--bad)" stopOpacity="0.55" /></linearGradient>
          </defs>

          {ticks.map((v) => (
            <g key={v}>
              <line x1={M.l} x2={M.l + pw} y1={y(v)} y2={y(v)} className="wt-grid" />
              <text x={M.l - 8} y={y(v) + 4} textAnchor="end" className="wt-tick">{v}%</text>
            </g>
          ))}

          {labelled.map(({ p, px, ok }, i) => (
            <g key={p.t}>
              <line x1={px} x2={px} y1={M.t - 4} y2={M.t + ph} className="wt-patch" />
              {ok && <text x={px} y={M.t + ph + 22} textAnchor="middle" className={`wt-date ${i % 2 ? 'alt' : ''}`}>{p.label}</text>}
            </g>
          ))}
          {!view.byPatch && marks.length === 0 && [0, 0.5, 1].map((f) => (
            <text key={f} x={M.l + f * pw} y={M.t + ph + 22} textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'} className="wt-date alt">{fmtDay(t0 + f * (t1 - t0))}</text>
          ))}

          <path d={area} fill={`url(#${uid}g)`} clipPath={`url(#${uid}a)`} />
          <path d={area} fill={`url(#${uid}r)`} clipPath={`url(#${uid}b)`} />
          <line x1={M.l} x2={M.l + pw} y1={y50} y2={y50} className="wt-base" />
          <text x={M.l + 6} y={y50 - 6} className="wt-basel">50%</text>
          <path d={line} className="wt-line" />
          {view.byPatch && pts.map((p, i) => <circle key={p.t} cx={xs[i]} cy={y(p.winRate)} r={4} className="wt-pt" />)}

          {hp && hover !== null && (
            <g>
              <line x1={xs[hover]} x2={xs[hover]} y1={M.t - 4} y2={M.t + ph} className="wt-cross" />
              <circle cx={xs[hover]} cy={y(hp.winRate)} r={5} className="wt-pt" />
            </g>
          )}

          <circle cx={lx} cy={ly} r={9} className="wt-halo" />
          <circle cx={lx} cy={ly} r={4.5} className="wt-end" />
          <g transform={`translate(${lx + 12} ${ly - 12})`}>
            <path d="M0 12 L8 0 H62 V24 H8 Z" className="wt-flag" />
            <text x={36} y={16.5} textAnchor="middle" className="wt-flagt">{last.winRate.toFixed(1)}%</text>
          </g>
        </svg>
        {hp && (
          <div className="wt-tip" style={{ left: tipLeft }} role="status">
            <b>{view.byPatch ? `Patch of ${fmtDay(hp.t)}` : fmtDay(hp.t)}</b>
            <span className={hp.winRate >= 50 ? 'up' : 'down'}>{hp.winRate.toFixed(1)}%</span>
            <small>{fmtInt(hp.matches)} matches</small>
          </div>
        )}
      </div>
      <p className="wt-note">{trend.illustrative ? 'Illustrative sample: the curve and patch dates are invented for design review. ' : ''}Green sits above 50% and red below. Dashed lines mark patch days.</p>
    </div>
  );
}
