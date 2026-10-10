import { describe, expect, it } from 'vitest';
import { sampleTierList } from './sampleTiers';
import { HAZE_BRAWL, HAZE_OVERVIEW } from './fixtures';

const std = { mode: 'standard', queue: 'ranked', rank: 'all' } as const;
const brawl = { mode: 'street_brawl', queue: 'ranked', rank: 'all' } as const;

describe('sampleTierList', () => {
  it('is deterministic and lists every released hero once', () => {
    const a = sampleTierList(std), b = sampleTierList(std);
    expect(a).toEqual(b);
    expect(new Set(a.map((r) => r.slug)).size).toBe(a.length);
    expect(a.some((r) => r.slug === 'deadman-danny')).toBe(false);
  });
  it('is sorted by win rate and agrees with the sample Haze pages', () => {
    const a = sampleTierList(std);
    expect(a.map((r) => r.winRate)).toEqual([...a.map((r) => r.winRate)].sort((x, y) => y - x));
    expect(a.findIndex((r) => r.slug === 'haze') + 1).toBe(HAZE_OVERVIEW.overallRank?.rank);
    const b = sampleTierList(brawl);
    expect(b.findIndex((r) => r.slug === 'haze') + 1).toBe(HAZE_BRAWL.overallRank?.rank);
    expect(b.find((r) => r.slug === 'haze')?.winRate).toBe(HAZE_BRAWL.winRate);
  });
  it('damage shares add up to 100', () => {
    for (const o of [HAZE_OVERVIEW, HAZE_BRAWL]) expect(o.damage?.sources.reduce((n, s) => n + s.share, 0)).toBe(100);
  });
});
