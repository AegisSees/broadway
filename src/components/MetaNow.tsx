import { Link } from 'react-router-dom';
import { getHero } from '../data/roster';
import { getGloat } from '../data/heroGloat';
import { fmtInt, fmtPct } from '../lib/stats';
import type { TierList, TierRow } from '../data/tiers';

interface Pick { label: string; row: TierRow; stat: string; statLabel: string; note: string }

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
  if (leader) picks.push({ label: 'Patch leader', row: leader, stat: fmtPct(leader.winRate), statLabel: 'win rate', note: `${leader.tier} tier across ${fmtInt(leader.matches)} games. The safest pick right now.` });
  const popular = best(rows, (r) => r.pickRate);
  if (popular) picks.push({ label: 'Most picked', row: popular, stat: fmtPct(popular.pickRate), statLabel: 'pick rate', note: `In ${fmtPct(popular.pickRate)} of games, winning ${fmtPct(popular.winRate)}. Expect to meet this hero.` });
  const pickMedian = [...rows].map((r) => r.pickRate).sort((a, b) => a - b)[Math.floor(rows.length / 2)];
  const sleeper = best(fair.filter((r) => r.pickRate < pickMedian), (r) => r.winRate);
  if (sleeper) picks.push({ label: 'Sleeper pick', row: sleeper, stat: fmtPct(sleeper.winRate), statLabel: 'win rate', note: `Picked in only ${fmtPct(sleeper.pickRate)} of games. Few players have caught on.` });
  const withDelta = fair.filter((r) => r.delta !== undefined);
  if (withDelta.length) {
    const climber = best(withDelta, (r) => r.delta ?? 0);
    if (climber && (climber.delta ?? 0) > 0) picks.push({ label: 'Climbing', row: climber, stat: `+${(climber.delta ?? 0).toFixed(1)}`, statLabel: 'pts this week', note: `Win rate up ${(climber.delta ?? 0).toFixed(1)} points over the last seven days, now ${fmtPct(climber.winRate)}.` });
  }
  if (picks.length < 4) {
    const banned = best(rows.filter((r) => r.banRate !== undefined), (r) => r.banRate ?? 0);
    if (banned) picks.push({ label: 'Most banned', row: banned, stat: fmtPct(banned.banRate ?? 0), statLabel: 'ban rate', note: `Banned in ${fmtPct(banned.banRate ?? 0)} of games. Players would rather not face this hero.` });
  }
  return picks.slice(0, 4);
}

export default function MetaNow({ list }: { list: TierList | null }) {
  const picks = list ? metaPicks(list.rows) : [];
  if (!list || !picks.length) return null;
  const games = list.rows.reduce((n, r) => n + r.matches, 0);
  return (
    <section className="meta-now" aria-labelledby="meta-now-h">
      <div className="dotline"><span>Standard {'·'} Ranked {'·'} live</span></div>
      <h2 id="meta-now-h" className="meta-now-title">The meta <em>right now</em></h2>
      <div className="mn-row">
        {picks.map((p, i) => {
          const h = getHero(p.row.slug);
          const art = getGloat(p.row.slug) ?? h?.portrait;
          return (
            <Link key={p.label} to={`/hero/${p.row.slug}`} className={`mn-card mn-${i}`}>
              <span className="mn-pic" aria-hidden="true">{art && <img src={art} alt="" loading="lazy" />}</span>
              <span className="mn-body">
                <span className="tape">{p.label}</span>
                <span className="mn-stat">{p.stat}<small>{p.statLabel}</small></span>
                <b className="mn-name">{h?.name ?? p.row.slug}</b>
                <span className="mn-note">{p.note}</span>
              </span>
            </Link>
          );
        })}
      </div>
      <p className="mn-foot"><b>{fmtInt(games)}</b> hero games counted</p>
    </section>
  );
}
