import { Link } from 'react-router-dom';
import { getHero } from '../data/roster';
import { getHeroColor } from '../data/heroColors';
import { fmtInt, fmtPct } from '../lib/stats';
import type { TierList, TierRow } from '../data/tiers';

interface Pick { label: string; row: TierRow; stat: string; statLabel: string; tone?: 'orange' }

/**
 * Four headline picks from the tier list: the strongest hero, the most played, the best hero few people play, and the
 * biggest climber this week (or the most banned when there is no weekly change). Every number is the tier list's own.
 */
export function metaPicks(rows: TierRow[]): Pick[] {
  if (rows.length < 4) return [];
  const sorted = [...rows].map((r) => r.matches).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  // a hero needs a fair sample before it can lead anything
  const fair = rows.filter((r) => r.matches >= median * 0.35);
  const used = new Set<string>();
  const best = (xs: TierRow[], key: (r: TierRow) => number) => {
    const r = [...xs].filter((x) => !used.has(x.slug)).sort((a, b) => key(b) - key(a))[0];
    if (r) used.add(r.slug);
    return r;
  };
  const picks: Pick[] = [];
  const leader = best(fair, (r) => r.winRate);
  if (leader) picks.push({ label: 'Patch leader', row: leader, stat: fmtPct(leader.winRate), statLabel: 'win rate', tone: 'orange' });
  const popular = best(rows, (r) => r.pickRate);
  if (popular) picks.push({ label: 'Most picked', row: popular, stat: fmtPct(popular.pickRate), statLabel: 'pick rate' });
  const pickMedian = [...rows].map((r) => r.pickRate).sort((a, b) => a - b)[Math.floor(rows.length / 2)];
  const sleeper = best(fair.filter((r) => r.pickRate < pickMedian), (r) => r.winRate);
  if (sleeper) picks.push({ label: 'Sleeper pick', row: sleeper, stat: fmtPct(sleeper.winRate), statLabel: `win rate · ${fmtPct(sleeper.pickRate)} pick` });
  const withDelta = fair.filter((r) => r.delta !== undefined);
  if (withDelta.length) {
    const climber = best(withDelta, (r) => r.delta ?? 0);
    if (climber && (climber.delta ?? 0) > 0) picks.push({ label: 'Climbing', row: climber, stat: `+${(climber.delta ?? 0).toFixed(1)}`, statLabel: 'win rate pts this week' });
  }
  if (picks.length < 4) {
    const banned = best(rows.filter((r) => r.banRate !== undefined), (r) => r.banRate ?? 0);
    if (banned) picks.push({ label: 'Most banned', row: banned, stat: fmtPct(banned.banRate ?? 0), statLabel: 'ban rate' });
  }
  return picks.slice(0, 4);
}

export default function MetaNow({ list }: { list: TierList | null }) {
  const picks = list ? metaPicks(list.rows) : [];
  if (!picks.length) return null;
  return (
    <section className="meta-now" aria-labelledby="meta-now-h">
      <div className="dotline"><span>Standard {'·'} Ranked {'·'} {list?.illustrative ? 'illustrative sample' : 'live'}</span></div>
      <h2 id="meta-now-h" className="meta-now-title">The meta <em>right now</em></h2>
      <div className="mn-row">
        {picks.map((p, i) => {
          const h = getHero(p.row.slug);
          const art = h?.art ?? h?.render ?? h?.portrait;
          return (
            <Link key={p.label} to={`/hero/${p.row.slug}`} className="mn-card" style={{ ['--hc' as string]: getHeroColor(p.row.slug), ['--mi' as string]: i } as React.CSSProperties}>
              {art && <img className="mn-art" src={art} alt="" loading="lazy" />}
              <span className={`tape ${p.tone ?? ''}`}>{p.label}</span>
              <span className="mn-txt">
                <b className="mn-name">{h?.name ?? p.row.slug}</b>
                <span className="mn-stat">{p.stat}</span>
                <small>{p.statLabel} {'·'} {fmtInt(p.row.matches)} matches</small>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
