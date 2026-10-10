import { HEROES } from './roster';
import { scoreAndTier, TIER_NOTES, type TierRow } from './tiers';

import type { Filters, Mode } from './types';

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
const unit = (s: string): number => hash(s) / 4294967296;

/**
 * ILLUSTRATIVE tier list for every released hero. Deterministic (the same filters always give the same list) so the
 * page can be designed and tested before live data is connected. None of these numbers are real game statistics.
 */

/** Where Haze sits in each mode, so the tier list agrees with the sample hero page. */
const HAZE_AT: Record<Mode, number> = { standard: 7, street_brawl: 10 };

export function sampleTierList(f: Filters): TierRow[] {
  const heroes = HEROES.filter((h) => !h.unreleased);
  const seed = `${f.mode}|${f.queue}|${f.rank}`;
  const defaults = f.queue === 'ranked' && f.rank === 'all';
  const order = heroes.map((h) => h.slug).filter((s) => !(defaults && s === 'haze')).sort((a, b) => unit(`${seed}${a}`) - unit(`${seed}${b}`));
  if (defaults) order.splice(Math.min(HAZE_AT[f.mode], order.length), 0, 'haze');
  const top = f.mode === 'street_brawl' ? 56.4 : 55.2;
  const step = (top - 46.6) / Math.max(1, order.length - 1);
  const rows = order.map((slug, i) => {
    const winRate = Math.round((top - step * i + (unit(`${seed}j${slug}`) - 0.5) * 0.12) * 10) / 10;
    const pickRate = Math.round((3 + unit(`${seed}p${slug}`) * 19) * 10) / 10;
    const row: TierRow = {
      slug, winRate, pickRate,
      banRate: Math.round((0.6 + unit(`${seed}b${slug}`) * 11) * 10) / 10,
      matches: Math.round(pickRate * 860),
      delta: Math.round((unit(`${seed}d${slug}`) * 3.2 - 1.6) * 10) / 10,
      tier: 'B', score: 0,
    };
    if (defaults && slug === 'haze' && f.mode === 'standard') return { ...row, winRate: 53.4, pickRate: 21.7, banRate: 6.2, matches: 18642, delta: 0.6 };
    return row;
  });
  return scoreAndTier(rows, defaults && f.mode === 'standard');
}

export { TIER_NOTES };
export type { TierRow };
