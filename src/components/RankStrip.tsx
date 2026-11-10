import type { HeroByRank } from '../data/source';
import { rankBadge } from '../data/ranks';
import { confidenceLabel, fmtDelta, fmtInt, fmtPct } from '../lib/stats';
import DataStamp from './DataStamp';

/**
 * Where a hero is strong and weak by rank: one cell per rank with the hero's win rate there and how far that is from
 * the hero's own average. Cells with a thin sample are greyed; ranks under the minimum are not drawn at all.
 */
export default function RankStrip({ data, heroName }: { data: HeroByRank; heroName: string }) {
  // lowest rank first, so the strip reads left to right like the ladder
  const slices = [...data.slices].reverse();
  return (
    <div className="panel pad rank-strip">
      <ol>
        {slices.map((s) => (
          <li key={s.rank} className={`conf-${s.rate.confidence}`} title={`${s.rank}: won ${fmtPct(s.rate.raw)} of ${fmtInt(s.rate.matches)} games, range ${fmtPct(s.rate.low)} to ${fmtPct(s.rate.high)}. ${confidenceLabel[s.rate.confidence]}.`}>
            {rankBadge(s.rank) && <img src={rankBadge(s.rank)} alt="" loading="lazy" />}
            <small>{s.rank}</small>
            <b>{fmtPct(s.rate.shrunk)}</b>
            <em className={s.delta > 0 ? 'good' : s.delta < 0 ? 'bad' : 'muted'}>{fmtDelta(s.delta)}</em>
            <span className="n">{fmtInt(s.rate.matches)}</span>
          </li>
        ))}
      </ol>
      <p className="muted fine">
        The small number is the difference from {heroName}{'’'}s win rate across all ranks ({fmtPct(data.overall)}), in points. Greyed cells have a thin sample.
        {data.hidden > 0 ? ` ${data.hidden} ${data.hidden === 1 ? 'rank is' : 'ranks are'} hidden for having too few games.` : ''}
      </p>
      <DataStamp meta={data.meta} />
    </div>
  );
}
