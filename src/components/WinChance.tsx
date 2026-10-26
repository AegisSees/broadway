import { useId, useMemo } from 'react';
import { SIDE_SHORT, type MatchDetail } from '../data/matchDetail';
import { fmtDuration } from '../data/player';
import { useModel } from '../ml/models';
import { biggestSwing, winCurve } from '../ml/predict';

const pct = (p: number) => `${Math.round(p * 100)}%`;

/**
 * Hidden King's chance of winning over a finished game, as the live model read it at every three-minute snapshot
 * (souls, kills, deaths, assists and levels on both sides), starting from the draft model's call at kick-off. Drawn
 * like the souls lead above it: the line sits over the Hidden King's colour while they are favoured.
 */
export default function WinChance({ m }: { m: MatchDetail }) {
  const uid = useId().replace(/:/g, '');
  const live = useModel('live');
  const draft = useModel('draft');
  const pts = useMemo(() => (live ? winCurve(live, m, draft) : []), [live, draft, m]);
  if (pts.length < 3) return null;
  const W = 1000, H = 230, L = 56, R = 112, T = 16, B = 34;
  const tEnd = Math.max(m.durationS, pts[pts.length - 1].t);
  const x = (t: number) => L + (t / tEnd) * (W - L - R);
  const y = (p: number) => T + (1 - p) * (H - T - B);
  const y0 = y(0.5);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.p).toFixed(1)}`).join('');
  const area = `${line}L${x(pts[pts.length - 1].t).toFixed(1)} ${y0}L${x(pts[0].t).toFixed(1)} ${y0}Z`;
  const mins: number[] = [];
  for (let s = 0; s <= tEnd; s += tEnd > 2700 ? 600 : 300) mins.push(s);
  const start = pts[0].t === 0 ? pts[0] : null;
  // the jump from the draft call to the first snapshot is not a moment of the game, so it is left out
  const swing = biggestSwing(pts.filter((p) => p.t > 0));
  const swingSide = swing && swing.to.p >= swing.from.p ? 'hidden-king' : 'archmother';
  const fav = (p: number) => (p >= 0.5 ? 'hidden-king' : 'archmother');
  const winner = m.winner;
  // the lowest the eventual winner's chance went, for the "comeback" read
  const low = Math.min(...pts.map((p) => (winner === 'hidden-king' ? p.p : 1 - p.p)));
  return (
    <section className="mt-lead mt-win panel pad" aria-label="Win chance over time">
      <div className="mt-lead-head">
        <h3>Win chance</h3>
        <small>What the model gave each side every three minutes, from souls, kills, deaths, assists and levels</small>
      </div>
      <ul className="mt-win-notes">
        {start && <li className={fav(start.p)}><small>Draft</small><b>{SIDE_SHORT[fav(start.p)]} {pct(Math.max(start.p, 1 - start.p))}</b></li>}
        {swing && <li className={swingSide}><small>Biggest swing</small><b>{fmtDuration(swing.from.t)}–{fmtDuration(swing.to.t)}</b><em>{Math.round(Math.abs(swing.to.p - swing.from.p) * 100)} pts to the {SIDE_SHORT[swingSide]}</em></li>}
        <li className={winner}><small>{low < 0.35 ? 'Comeback' : 'Winner'}</small><b>{SIDE_SHORT[winner]}</b><em>{low < 0.5 ? `were down to ${pct(low)}` : `never below ${pct(low)}`}</em></li>
      </ul>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Win chance over the game. ${start ? `The draft favoured the ${SIDE_SHORT[fav(start.p)]}. ` : ''}The ${SIDE_SHORT[winner]} won${low < 0.5 ? ` after dropping to ${pct(low)}` : ''}.`}>
        <defs>
          <clipPath id={`${uid}a`}><rect x={L} y={T} width={W - L - R} height={Math.max(0, y0 - T)} /></clipPath>
          <clipPath id={`${uid}b`}><rect x={L} y={y0} width={W - L - R} height={Math.max(0, H - B - y0)} /></clipPath>
        </defs>
        {[1, 0.75, 0.5, 0.25, 0].map((v) => (
          <g key={v}>
            <line className={v === 0.5 ? 'mt-zero' : 'mt-grid-l'} x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
            <text className="mt-ax" x={L - 8} y={y(v) + 4} textAnchor="end">{v === 0.5 ? 'Even' : pct(v >= 0.5 ? v : 1 - v)}</text>
          </g>
        ))}
        {mins.map((s) => <text key={s} className="mt-ax" x={x(s)} y={H - 10} textAnchor="middle">{s / 60}m</text>)}
        <path className="mt-area hidden-king" d={area} clipPath={`url(#${uid}a)`} />
        <path className="mt-area archmother" d={area} clipPath={`url(#${uid}b)`} />
        <path className="mt-line" d={line} fill="none" />
        {pts.map((p) => (
          <circle key={p.t} className={`mt-dot${p.t === 0 ? ' draft' : ''}`} cx={x(p.t)} cy={y(p.p)} r={p.t === 0 ? 4.2 : 3.2}>
            <title>{`${p.t === 0 ? 'Draft' : fmtDuration(p.t)} · ${SIDE_SHORT[fav(p.p)]} ${pct(Math.max(p.p, 1 - p.p))}`}</title>
          </circle>
        ))}
        <text className="mt-end hidden-king" x={W - R + 8} y={T + 10}>{SIDE_SHORT['hidden-king']}</text>
        <text className="mt-end archmother" x={W - R + 8} y={H - B - 2}>{SIDE_SHORT.archmother}</text>
      </svg>
      <p className="mt-win-fine muted">
        Trained on recent public Normal-mode games. On games it had not seen, a side it gave 70% won about 70% of the time.
        The draft call reads only the twelve heroes and their ranks, so it picks the winner about six times in ten; the live read firms up as the game goes.
      </p>
    </section>
  );
}
