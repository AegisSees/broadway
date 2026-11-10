import { describe, expect, it } from 'vitest';
import type { ItemStatsRow } from '../api/types';
import { itemEffects } from './heroItems';
import { CITY_NEVER_SLEEPS, bigDaysToUnix, resolveWindow } from './patchWindow';
import { tierOfScore, tierScore } from './tiers';

const DAY = 86400;

describe('patch window', () => {
  const days = bigDaysToUnix(['2026-09-29T20:25:11Z', '2026-05-22T21:51:02Z']);
  const now = CITY_NEVER_SLEEPS + 40 * DAY;
  it('reads the API dates and always knows City Never Sleeps', () => {
    expect(days[0]).toBe(CITY_NEVER_SLEEPS);
    expect(bigDaysToUnix(null)).toEqual([CITY_NEVER_SLEEPS]);
    expect(bigDaysToUnix(['not a date'])).toEqual([CITY_NEVER_SLEEPS]);
  });
  it('starts "this patch" on the patch day', () => {
    expect(resolveWindow('patch', days, now)).toEqual({ key: 'patch', from: CITY_NEVER_SLEEPS, patchStart: CITY_NEVER_SLEEPS });
  });
  it('never lets a short window reach back before the patch', () => {
    expect(resolveWindow('14d', days, now).from).toBe(now - 14 * DAY);
    expect(resolveWindow('14d', days, CITY_NEVER_SLEEPS + 3 * DAY).from).toBe(CITY_NEVER_SLEEPS);
  });
  it('ends the previous patch just before the current one', () => {
    const w = resolveWindow('prev', days, now);
    expect(w.to).toBe(CITY_NEVER_SLEEPS - 1);
    expect(w.from).toBe(days[1]);
    expect(resolveWindow('prev', [CITY_NEVER_SLEEPS], now).key).toBe('patch');
  });
});

describe('tier score', () => {
  const prior = { mean: 0.5, strength: 250 };
  it('needs proof: the same win rate scores higher with more games', () => {
    const few = tierScore(165, 300, 10, 10, prior).score;      // 55% of 300
    const many = tierScore(16500, 30000, 10, 10, prior).score; // 55% of 30,000
    expect(many).toBeGreaterThan(few);
    expect(many).toBeGreaterThan(4);
    expect(few).toBeLessThan(1);
  });
  it('adds at most three quarters of a point for popularity', () => {
    expect(tierScore(5000, 10000, 40, 10, prior).presence).toBe(0.75);
    expect(tierScore(5000, 10000, 20, 10, prior).presence).toBeCloseTo(0.5, 6);
    expect(tierScore(5000, 10000, 1, 10, prior).presence).toBe(-0.75);
  });
  it('cuts tiers on fixed lines', () => {
    expect(['S+', 'S', 'A', 'B', 'B', 'C', 'D']).toEqual([4.2, 2.5, 1, 0, -2, -3.9, -4.1].map(tierOfScore));
  });
});

describe('item effects', () => {
  const row = (item_id: number, bucket: number, matches: number, wins: number): ItemStatsRow =>
    ({ item_id, bucket, matches, wins, losses: matches - wins, players: matches, avg_buy_time_s: 600 });
  /**
   * A made-up hero with two kinds of situation in one time band: behind (net worth 2,000, everyone wins 40%) and ahead
   * (net worth 8,000, everyone wins 60%). Item 1 is bought mostly when ahead and item 2 mostly when behind, but inside
   * each situation both win exactly as often as everyone else. A raw comparison calls item 1 good and item 2 bad;
   * the like-with-like comparison must call both neutral.
   */
  const band = [
    row(1, 2000, 1000, 400), row(1, 8000, 9000, 5400),
    row(2, 2000, 9000, 3600), row(2, 8000, 1000, 600),
    row(3, 2000, 50, 20), // too few purchases: hidden
  ];
  it('removes the "bought when already winning" effect', () => {
    const { items, hidden } = itemEffects([band]);
    expect(hidden).toBe(1);
    const one = items.find((i) => i.itemId === 1)!, two = items.find((i) => i.itemId === 2)!;
    expect(one.rawDelta).toBeGreaterThan(7);
    expect(two.rawDelta).toBeLessThan(-7);
    expect(Math.abs(one.adjustedDelta)).toBeLessThan(0.05);
    expect(Math.abs(two.adjustedDelta)).toBeLessThan(0.05);
    expect(one.unsure).toBe(true);
  });
  it('keeps a real effect and shrinks it a little', () => {
    const real = [row(1, 2000, 5000, 2300), row(2, 2000, 45000, 17700)]; // item 1 wins 46% where the group wins 40%
    const one = itemEffects([real]).items.find((i) => i.itemId === 1)!;
    expect(one.adjustedDelta).toBeCloseTo(6, 0);
    expect(one.shownDelta).toBeLessThan(one.adjustedDelta);
    expect(one.shownDelta).toBeGreaterThan(5);
    expect(one.unsure).toBe(false);
  });
});
