import { describe, expect, it } from 'vitest';
import { ALL_LEVELS, distributionStats, normalizeDistribution, sampleDistribution } from './rankDistribution';

describe('rank distribution', () => {
  it('covers all 66 levels and totals add up', () => {
    const d = sampleDistribution();
    expect(d.rows).toHaveLength(66);
    expect(ALL_LEVELS[0]).toBe(11);
    expect(ALL_LEVELS[65]).toBe(116);
    const st = distributionStats(d);
    expect(st.tiers).toHaveLength(11);
    expect(st.tiers.reduce((n, t) => n + t.share, 0)).toBeCloseTo(100, 5);
    expect(st.byLevel.get(11)!.top).toBeCloseTo(100, 5);
    expect(st.byLevel.get(116)!.top).toBeLessThan(0.2);
  });
  it('finds a median in the middle of the ladder', () => {
    const m = distributionStats(sampleDistribution()).median;
    expect(Math.floor(m / 10)).toBeGreaterThanOrEqual(4);
    expect(Math.floor(m / 10)).toBeLessThanOrEqual(6);
  });
  it('normalises API buckets as games', () => {
    const d = normalizeDistribution([{ badge_level: 116, total_matches: 5 }, { badge_level: 11, total_matches: 7 }]);
    expect(d.unit).toBe('games');
    expect(d.rows.find((r) => r.level === 116)!.count).toBe(5);
    expect(normalizeDistribution(null).rows).toHaveLength(66);
  });
});
