import type { PatchWindow } from '../data/patchWindow';
import { BRACKETS, RANKS, type Filters, type Rank, type RankKey } from '../data/types';
import type { AnalyticsFilters } from './types';

/**
 * Tiers are numbered Initiate = 1 ... Eternus = 11 (the game's own Citadel_ranks_rankN strings), each with sub-tiers
 * 1-6, which matches the spec's maximum average badge of 116.
 */
const TIER_OF: Record<Rank, number> = Object.fromEntries(RANKS.map((r, i) => [r, RANKS.length - i])) as Record<Rank, number>;

/** Badge range for a rank. NOTE: the API filters on the average badge of both teams in a match. */
export function badgeRange(rank: Rank): { min: number; max: number } {
  const tier = TIER_OF[rank];
  return { min: tier * 10 + 1, max: tier * 10 + 6 };
}

/** Badge range for any rank filter value: one rank, a bracket of ranks, or null for "all ranks". */
export function badgeRangeOf(rank: RankKey): { min: number; max: number } | null {
  if (rank === 'all') return null;
  const bracket = BRACKETS.find((b) => b.key === rank);
  if (bracket) return { min: bracket.low * 10 + 1, max: bracket.high * 10 + 6 };
  return badgeRange(rank as Rank);
}

/**
 * The query the API understands for a set of site filters. `window` is the time range (see data/patchWindow.ts); every
 * statistics call passes one, so nothing is ever read across a patch boundary by accident.
 */
export function toApiFilters(f: Filters, window?: PatchWindow): AnalyticsFilters {
  const out: AnalyticsFilters = {
    game_mode: f.mode === 'street_brawl' ? 'street_brawl' : 'normal',
    match_mode: f.queue,
  };
  const range = badgeRangeOf(f.rank);
  if (range) {
    out.min_average_badge = range.min;
    out.max_average_badge = range.max;
  }
  if (window) {
    out.min_unix_timestamp = window.from;
    if (window.to !== undefined) out.max_unix_timestamp = window.to;
  }
  return out;
}
