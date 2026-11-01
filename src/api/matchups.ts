import type { MatchupEntry, MatchupGroup } from '../data/types';
import { fmtPct, shrunkRate } from '../lib/stats';
import type { HeroCounterRow, HeroSynergyRow } from './types';

export interface HeroLookup {
  byId: (id: number) => { slug: string; name: string } | undefined;
}

export const MIN_MATCHUP_MATCHES = 50;
const GROUP_SIZE = 6;

/**
 * Turns hero-versus-hero rows into the two "picks vs hero" columns.
 * Rows are Haze-style: `wins` belong to `hero_id`; the opponent's win rate is the complement.
 * Lists are ordered with a shrunk rate so a 3-0 record cannot outrank a 600-400 record, and matchups
 * under MIN_MATCHUP_MATCHES are dropped entirely. The displayed number is always the raw win rate.
 */
export function buildPickColumns(heroId: number, rows: HeroCounterRow[], heroes: HeroLookup): MatchupGroup[] {
  const entries = rows
    .filter((r) => r.hero_id === heroId && r.matches_played >= MIN_MATCHUP_MATCHES)
    .map((r) => {
      const who = heroes.byId(r.enemy_hero_id);
      if (!who) return null;
      const enemyWins = r.matches_played - r.wins;
      return { who, matches: r.matches_played, enemyWins, score: shrunkRate(enemyWins, r.matches_played) };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  const toEntry = (e: (typeof entries)[number], fillBase: number): MatchupEntry => ({
    slug: e.who.slug,
    name: e.who.name,
    display: fmtPct((e.enemyWins / e.matches) * 100),
    fill: Math.max(0.2, Math.min(1, fillBase)),
    matches: e.matches,
  });

  const best = [...entries].sort((a, b) => b.score - a.score).slice(0, GROUP_SIZE);
  const worst = [...entries].sort((a, b) => a.score - b.score).slice(0, GROUP_SIZE);

  return [
    {
      key: 'best', title: 'Best picks vs {hero}', subtitle: "Opponent's match win rate", tone: 'bad', badge: 'deflated',
      entries: best.map((e, i) => toEntry(e, 1 - i * 0.11)),
    },
    {
      key: 'worst', title: 'Worst picks vs {hero}', subtitle: "Opponent's match win rate", tone: 'good', badge: 'gloat',
      entries: worst.map((e, i) => toEntry(e, 1 - i * 0.11)),
    },
  ];
}

/**
 * "Best lane synergy": heroes that win most when laned with this one. Rows list each pair once (lower hero id first), and
 * `wins` is the pair's win count, so the rate shown is the hero's match win rate with that partner.
 */
export function buildSynergyColumn(heroId: number, rows: HeroSynergyRow[], heroes: HeroLookup): MatchupGroup | null {
  const entries = rows
    .filter((r) => (r.hero_id1 === heroId || r.hero_id2 === heroId) && r.matches_played >= MIN_MATCHUP_MATCHES)
    .map((r) => {
      const who = heroes.byId(r.hero_id1 === heroId ? r.hero_id2 : r.hero_id1);
      return who ? { who, matches: r.matches_played, rate: r.wins / r.matches_played, score: shrunkRate(r.wins, r.matches_played) } : null;
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, GROUP_SIZE);
  if (!entries.length) return null;
  return {
    key: 'synergy', title: 'Best lane partners for {hero}', subtitle: "{hero}'s match win rate", tone: 'good',
    entries: entries.map((e, i) => ({ slug: e.who.slug, name: e.who.name, display: fmtPct(e.rate * 100), fill: Math.max(0.2, 1 - i * 0.11), matches: e.matches })),
  };
}
