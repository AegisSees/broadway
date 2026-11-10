import type { ItemStatsRow } from '../api/types';
import { MIN_GAMES } from '../lib/stats';

/**
 * Item win rates for one hero, corrected for WHEN the item was bought and HOW RICH the buyer was.
 *
 * The trap with raw item win rates: expensive late items are mostly bought by players who are already winning, and
 * cheap comeback items by players who are losing. The raw number then measures the state of the game, not the item.
 *
 * The fix used here is a "like with like" comparison (statisticians call it stratification):
 *   1. Split every purchase into groups by the part of the game it happened in (five time bands) and by the buyer's
 *      net worth at that moment (steps of 2,000 souls). Inside one group, everyone was about equally far ahead or behind.
 *   2. Inside each group, compare the item's win rate with the win rate of ALL purchases this hero made in that group.
 *   3. Average those differences, weighted by how many of the item's purchases fall in each group.
 * The result ("adjusted") says: buyers of this item won this many points more often than players of this hero who
 * bought something else in the same situation.
 *
 * It is still not proof the item causes wins (good players may simply prefer it), and the About page says so.
 */

/** Purchase-time bands in seconds: laning, early mid game, mid game, late, very late. */
export const TIME_BANDS: { label: string; from: number; to?: number }[] = [
  { label: '0 to 8 min', from: 0, to: 480 },
  { label: '8 to 16 min', from: 480, to: 960 },
  { label: '16 to 26 min', from: 960, to: 1560 },
  { label: '26 to 34 min', from: 1560, to: 2040 },
  { label: '34 min on', from: 2040 },
];
export const NET_WORTH_STEP = 2000;
/** How many imaginary "no difference" purchases every item starts with. Explained on the About page. */
export const ITEM_PRIOR_GAMES = 300;

export interface ItemEffect {
  itemId: number;
  /** Purchases (one per player per game). */
  matches: number;
  wins: number;
  /** Item win rate minus the hero's win rate over all purchases, in points. No correction. */
  rawDelta: number;
  /** The like-with-like difference, in points, before shrinking. */
  adjustedDelta: number;
  /** The adjusted difference after shrinking toward zero by sample size. This is the number shown. */
  shownDelta: number;
  /** About 95% range around the adjusted difference: plus or minus this many points. */
  margin: number;
  /** True when that range still includes zero. */
  unsure: boolean;
  /** Average purchase time in seconds. */
  avgBuyTime: number;
}

/**
 * `bands` holds one list of API rows per time band, each row split by net worth at purchase (`bucket`).
 * Items with fewer than MIN_GAMES.item purchases are left out and counted in `hidden`.
 */
export function itemEffects(bands: readonly (readonly ItemStatsRow[])[]): { items: ItemEffect[]; hidden: number; purchases: number } {
  interface Acc { n: number; w: number; expected: number; variance: number; timeSum: number }
  const perItem = new Map<number, Acc>();
  let allN = 0, allW = 0;
  for (const rows of bands) {
    // win rate of everything bought in each net-worth group of this band
    const group = new Map<number, { n: number; w: number }>();
    for (const r of rows) {
      const g = group.get(r.bucket) ?? { n: 0, w: 0 };
      g.n += r.matches; g.w += r.wins;
      group.set(r.bucket, g);
    }
    for (const r of rows) {
      if (!(r.matches > 0)) continue;
      const g = group.get(r.bucket)!;
      const p = g.w / g.n;
      const a = perItem.get(r.item_id) ?? { n: 0, w: 0, expected: 0, variance: 0, timeSum: 0 };
      a.n += r.matches; a.w += r.wins;
      a.expected += r.matches * p;            // wins we would expect if the item made no difference
      a.variance += r.matches * p * (1 - p);  // how much luck could move that count
      a.timeSum += (r.avg_buy_time_s ?? 0) * r.matches;
      perItem.set(r.item_id, a);
      allN += r.matches; allW += r.wins;
    }
  }
  const base = allN > 0 ? allW / allN : 0.5;
  const items: ItemEffect[] = [];
  let hidden = 0;
  for (const [itemId, a] of perItem) {
    if (a.n < MIN_GAMES.item) { hidden++; continue; }
    const adjusted = ((a.w - a.expected) / a.n) * 100;
    const margin = ((1.96 * Math.sqrt(a.variance)) / a.n) * 100;
    items.push({
      itemId, matches: a.n, wins: a.w,
      rawDelta: (a.w / a.n - base) * 100,
      adjustedDelta: adjusted,
      shownDelta: adjusted * (a.n / (a.n + ITEM_PRIOR_GAMES)),
      margin,
      unsure: Math.abs(adjusted) <= margin,
      avgBuyTime: a.timeSum / a.n,
    });
  }
  items.sort((x, y) => y.shownDelta - x.shownDelta);
  return { items, hidden, purchases: allN };
}
