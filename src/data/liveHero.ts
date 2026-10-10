import type { HeroOverview, MatchupGroup } from './types';
import type { TierRow } from './tiers';

/**
 * Headline numbers for one hero from the live tier rows (which already carry win rate, pick rate, ban rate, matches and
 * the tier), plus the matchup columns. Builds, skill order, guides and damage are not part of this: they have their own
 * endpoints and show their own "not connected" states until those are wired.
 */
export function liveOverview(slug: string, tiers: readonly TierRow[], matchups: MatchupGroup[]): HeroOverview | null {
  const idx = tiers.findIndex((r) => r.slug === slug);
  if (idx < 0) return null;
  const r = tiers[idx];
  return {
    slug,
    tier: r.tier,
    winRate: r.winRate,
    pickRate: r.pickRate,
    banRate: r.banRate,
    // tiers are sorted by score, best first, so position is the overall rank
    overallRank: { rank: idx + 1, of: tiers.length },
    matches: r.matches,
    builds: [],
    matchups,
    guides: [],
    provenance: 'live',
  };
}
