import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { badgeLabel, badgeParts } from '../data/leaderboard';
import { badgeLevel, type RankPoint } from '../data/player';
import { RANK_COLOR } from '../data/ranks';
import { fmtDay } from '../data/trend';
import RankBadge from './RankBadge';

const H = 280;
const MD = { l: 92, r: 26, t: 20, b: 36 };
const MN = { l: 66, r: 14, t: 20, b: 36 };

const RANGES = [
  { id: '50', label: 'Last 50', n: 50 },
  { id: '200', label: 'Last 200', n: 200 },
  { id: 'all', label: 'All', n: Infinity },
] as const;
type RangeId = (typeof RANGES)[number]['id'];

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

const tierName = (t: number) => badgeParts(t * 10 + 1).rank;

/**
 * Rank over time: the rank a player held going into each ranked game, drawn on a ladder of rank bands (each band is one
 * rank, split into its six levels). Rank only changes between games, so the line steps rather than slopes.
 */
export default function RankHistory({ points }: { points: readonly RankPoint[] }) {
  const [range, setRange] = useState<RangeId>('50');
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const W = useWidth(box);
  const uid = useId().replace(/:/g, '');

  const n = RANGES.find((r) => r.id === range)!.n;
  const pts = useMemo(() => (Number.isFinite(n) ? points.slice(-n) : points.slice()), [points, n]);

  if (pts.length < 2) {
    return <div className="panel empty"><h3>No rank history yet</h3><p>Rank history is drawn from ranked games. This player has fewer than two in the data.</p></div>;
  }

  const levels = pts.map((p) => badgeLevel(p.badge));
  // Always show at least two rank bands so a player who stays in one rank still has a ladder to read against.
  const minTier = Math.max(1, Math.floor(Math.min(...levels)));
  const highTier = Math.min(11, Math.max(minTier + 1, Math.floor(Math.max(...levels) + 1e-9)));
  const lowTier = Math.min(minTier, highTier - 1);
  const lo = lowTier, hi = highTier + 1;
  const M = W < 520 ? MN : MD;
  const pw = W - M.l - M.r;
  const ph = H - M.t - M.b;
  const y = (lv: number) => M.t + ((hi - lv) / (hi - lo)) * ph;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  const x = (t: number) => M.l + ((t - t0) / (t1 - t0 || 1)) * pw;
  const xs = pts.map((p) => x(p.t));
  const ys = levels.map((lv) => y(lv + 1 / 12)); // plot at the middle of the level's slot
  let d = `M${xs[0].toFixed(1)} ${ys[0].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) d += ` H${xs[i].toFixed(1)} V${ys[i].toFixed(1)}`;
  const last = pts[pts.length - 1];
  const first = pts[0];
  const moved = Math.round((badgeLevel(last.badge) - badgeLevel(first.badge)) * 6);
  const showSubs = hi - lo <= 4;
  const tiers = Array.from({ length: highTier - lowTier + 1 }, (_, i) => lowTier + i);
  const crowded = ph / tiers.length < 30;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0, dist = Infinity;
    xs.forEach((v, i) => { const dd = Math.abs(v - px); if (dd < dist) { dist = dd; best = i; } });
    setHover(px < M.l - 8 || px > M.l + pw + 8 ? null : best);
  };
  const hp = hover === null ? null : pts[hover];
  const tipLeft = hover === null ? 0 : Math.min(Math.max(xs[hover], 78), W - 78);
  const lastBadge = badgeParts(last.badge);

  return (
    <div className="wt rh panel paint" ref={box}>
      <div className="wt-brush" aria-hidden="true" />
      <div className="wt-head">
        <div className="wt-title">
          <span className="tape">Rank history</span>
          <div className="wt-now rh-now">
            <RankBadge rank={lastBadge.rank} size="xs" />
            <b style={{ color: RANK_COLOR[lastBadge.rank as keyof typeof RANK_COLOR] }}>{badgeLabel(last.badge)}</b>
            <span className={`wt-delta ${moved >= 0 ? 'up' : 'down'}`}>{moved === 0 ? 'No change' : `${moved > 0 ? '▲' : '▼'} ${Math.abs(moved)} ${Math.abs(moved) === 1 ? 'level' : 'levels'}`}</span>
            <small>over {pts.length} ranked games</small>
          </div>
        </div>
        <div className="seg" role="group" aria-label="History range">
          {RANGES.map((r) => <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => { setRange(r.id); setHover(null); }}>{r.label}</button>)}
        </div>
      </div>

      <div className="wt-plot">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Rank history over ${pts.length} ranked games: from ${badgeLabel(first.badge)} to ${badgeLabel(last.badge)}.`} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          <defs>
            <clipPath id={`${uid}c`}><rect x={M.l} y={M.t} width={pw} height={ph} /></clipPath>
          </defs>
          {tiers.map((t) => {
            const name = tierName(t);
            const color = RANK_COLOR[name as keyof typeof RANK_COLOR];
            const top = y(t + 1), bottom = y(t);
            return (
              <g key={t}>
                <rect x={M.l} y={top} width={pw} height={bottom - top} fill={color} opacity={t % 2 ? 0.1 : 0.17} />
                <line x1={M.l} x2={M.l + pw} y1={top} y2={top} className="wt-grid" />
                {showSubs && [1, 2, 3, 4, 5].map((s) => <line key={s} x1={M.l} x2={M.l + pw} y1={y(t + s / 6)} y2={y(t + s / 6)} className="rh-sub" />)}
                <text x={M.l - 10} y={(top + bottom) / 2 + 4} textAnchor="end" className={`rh-tier${W < 520 ? ' sm' : ''}`} fill={color}>{crowded && W < 520 ? name.slice(0, 3) : name}</text>
              </g>
            );
          })}
          <line x1={M.l} x2={M.l + pw} y1={y(lo)} y2={y(lo)} className="wt-grid" />
          {[0, 0.5, 1].map((f) => (
            <text key={f} x={M.l + f * pw} y={M.t + ph + 22} textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'} className="wt-date alt">{fmtDay(t0 + f * (t1 - t0))}</text>
          ))}
          <g clipPath={`url(#${uid}c)`}><path d={d} className="wt-line" /></g>
          {hp && hover !== null && (
            <g>
              <line x1={xs[hover]} x2={xs[hover]} y1={M.t} y2={M.t + ph} className="wt-cross" />
              <circle cx={xs[hover]} cy={ys[hover]} r={5} className="wt-pt" />
            </g>
          )}
          <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={9} className="wt-halo" />
          <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={4.5} className="wt-end" />
        </svg>
        {hp && (
          <div className="wt-tip" style={{ left: tipLeft }} role="status">
            <b>{fmtDay(hp.t)}</b>
            <span>{badgeLabel(hp.badge)}</span>
            <small>Game {(hover ?? 0) + 1} of {pts.length}</small>
          </div>
        )}
      </div>
      <p className="wt-note">Each point is the rank shown going into a ranked game. Eternus levels follow the percentile of Eternus itself.</p>
    </div>
  );
}
