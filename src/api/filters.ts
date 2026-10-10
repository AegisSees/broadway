import { RANKS, type Filters, type Rank } from '../data/types';
import type { AnalyticsFilters } from './types';

/**
 * Tiers are numbered Initiate = 1 ... Eternus = 11 (the game's own Citadel_ranks_rankN strings), each with sub-tiers
 * 1-6, which matches the spec's maximum average badge of 116. Still worth one check against /v1/assets/ranks.
 */
const TIER_OF: Record<Rank, number> = Object.fromEntries(RANKS.map((r, i) => [r, RANKS.length - i])) as Record<Rank, number>;

/** Badge range for a rank. NOTE: the API filters on the average badge of both teams in a match. */
export function badgeRange(rank: Rank): { min: number; max: number } {
  const tier = TIER_OF[rank];
  return { min: tier * 10 + 1, max: tier * 10 + 6 };
}

export function toApiFilters(f: Filters): AnalyticsFilters {
  const out: AnalyticsFilters = {
    game_mode: f.mode === 'street_brawl' ? 'street_brawl' : 'normal',
    match_mode: f.queue,
  };
  if (f.rank !== 'all') {
    const { min, max } = badgeRange(f.rank);
    out.min_average_badge = min;
    out.max_average_badge = max;
  }
  return out;
}
