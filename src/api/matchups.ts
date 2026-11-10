import type { MatchupEntry, MatchupGroup } from '../data/types';
import { MIN_GAMES, fitPrior, fmtDelta, fmtInt, fmtPct, shrink, wilson, type Prior } from '../lib/stats';
import type { HeroCounterRow, HeroSynergyRow } from './types';

export interface HeroLookup {
  byId: (id: number) => { slug: string; name: string } | undefined;
}

const GROUP_SIZE = 6;

/** One opponent or partner, measured against the hero's own usual win rate. */
export interface RelativeRecord {
  who: { slug: string; name: string };
  wins: number;
  matches: number;
  /** Shrunk win rate minus the hero's baseline, in points. Positive = the hero does better than usual here. */
  delta: number;
  /** True when the 95% range of the raw rate still contains the baseline: we cannot tell it from "no effect". */
  unsure: boolean;
}

/**
 * Compares each record with the hero's own baseline.
 *
 * A raw "54% against Haze" says little on its own: a strong hero is above 50% against almost everyone. What a player
 * wants to know is whether this matchup is better or worse than the hero's usual result. So:
 *   baseline = the hero's win rate over all the records together
 *   delta    = (win rate in this record, shrunk toward the baseline) - baseline
 * The shrinking works as in lib/stats.ts, with the prior learned from this hero's own set of records, so a matchup
 * with few games stays close to "no difference" until it has earned a number.
 */
export function relativeRecords(records: { who: { slug: string; name: string }; wins: number; matches: number }[]): { baseline: number; prior: Prior; list: RelativeRecord[]; hidden: number } {
  const total = records.reduce((n, r) => n + r.matches, 0);
  const baseline = total > 0 ? records.reduce((n, r) => n + r.wins, 0) / total : 0.5;
  const fitted = fitPrior(records);
  // the prior is centred on this hero's own baseline, whatever the fit's average was
  const prior: Prior = { mean: baseline, strength: fitted.strength };
  const shown = records.filter((r) => r.matches >= MIN_GAMES.matchup);
  const list = shown.map((r) => {
    const ci = wilson(r.wins, r.matches);
    return {
      ...r,
      delta: (shrink(r.wins, r.matches, prior) - baseline) * 100,
      unsure: ci.low <= baseline && baseline <= ci.high,
    };
  });
  return { baseline, prior, list, hidden: records.length - shown.length };
}

function toEntries(list: RelativeRecord[], baseline: number): MatchupEntry[] {
  const biggest = Math.max(0.5, ...list.map((e) => Math.abs(e.delta)));
  return list.map((e) => {
    const ci = wilson(e.wins, e.matches);
    return {
      slug: e.who.slug,
      name: e.who.name,
      display: fmtDelta(e.delta),
      fill: Math.max(0.08, Math.min(1, Math.abs(e.delta) / biggest)),
      matches: e.matches,
      unsure: e.unsure,
      detail: `Won ${fmtPct((e.wins / e.matches) * 100)} of ${fmtInt(e.matches)} games (range ${fmtPct(ci.low * 100)} to ${fmtPct(ci.high * 100)}), against a usual ${fmtPct(baseline * 100)}.`,
    };
  });
}

/**
 * The two "picks vs hero" columns from hero-versus-hero rows (`wins` belong to `hero_id`).
 * Numbers are the HERO's change against its own baseline, so "Best picks vs Haze" lists the opponents Haze does worst
 * against (most negative first) and "Worst picks" the ones Haze does best against.
 */
export function buildPickColumns(heroId: number, rows: HeroCounterRow[], heroes: HeroLookup): { groups: MatchupGroup[]; hidden: number } {
  const records = rows
    .filter((r) => r.hero_id === heroId && r.matches_played > 0)
    .map((r) => { const who = heroes.byId(r.enemy_hero_id); return who ? { who, wins: r.wins, matches: r.matches_played } : null; })
    .filter((e): e is NonNullable<typeof e> => e !== null);
  const { baseline, list, hidden } = relativeRecords(records);
  const hardest = [...list].sort((a, b) => a.delta - b.delta).slice(0, GROUP_SIZE).filter((e) => e.delta < 0);
  const easiest = [...list].sort((a, b) => b.delta - a.delta).slice(0, GROUP_SIZE).filter((e) => e.delta > 0);
  const subtitle = "{hero}'s win rate against them, compared with {hero}'s usual win rate";
  return {
    hidden,
    groups: [
      { key: 'best', title: 'Best picks vs {hero}', subtitle, tone: 'bad', badge: 'deflated', entries: toEntries(hardest, baseline) },
      { key: 'worst', title: 'Worst picks vs {hero}', subtitle, tone: 'good', badge: 'gloat', entries: toEntries(easiest, baseline) },
    ],
  };
}

/**
 * "Best lane partners": heroes this one wins more with than usual. Rows list each pair once (either id first), and
 * `wins` is the pair's win count.
 */
export function buildSynergyColumn(heroId: number, rows: HeroSynergyRow[], heroes: HeroLookup): { group: MatchupGroup | null; hidden: number } {
  const records = rows
    .filter((r) => (r.hero_id1 === heroId || r.hero_id2 === heroId) && r.matches_played > 0)
    .map((r) => { const who = heroes.byId(r.hero_id1 === heroId ? r.hero_id2 : r.hero_id1); return who ? { who, wins: r.wins, matches: r.matches_played } : null; })
    .filter((e): e is NonNullable<typeof e> => e !== null);
  const { baseline, list, hidden } = relativeRecords(records);
  const top = [...list].sort((a, b) => b.delta - a.delta).slice(0, GROUP_SIZE).filter((e) => e.delta > 0);
  if (!top.length) return { group: null, hidden };
  return {
    hidden,
    group: { key: 'synergy', title: 'Best lane partners for {hero}', subtitle: "{hero}'s win rate with them, compared with {hero}'s usual win rate", tone: 'good', entries: toEntries(top, baseline) },
  };
}
