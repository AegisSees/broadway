import { describe, expect, it } from 'vitest';
import { RANKS } from './types';
import { badgeRange } from '../api/filters';
import { LADDER, rankBadge, TIER_NUMBER } from './ranks';
import { searchItems } from '../lib/search';
import { getHeroStats, statsAtBoon } from './heroStats';

describe('ranks', () => {
  it('uses the game tier numbers', () => {
    expect(TIER_NUMBER.Obscurus).toBe(0);
    expect(TIER_NUMBER.Initiate).toBe(1);
    expect(TIER_NUMBER.Eternus).toBe(11);
    expect(RANKS).toHaveLength(11);
    expect(LADDER[0]).toBe('Obscurus');
  });
  it('has a badge for every rank', () => {
    for (const r of LADDER) expect(rankBadge(r)).toBeTruthy();
  });
  it('uses the current rank names', () => {
    expect([...RANKS].reverse().slice(0, 4)).toEqual(['Initiate', 'Seeker', 'Acolyte', 'Sentinel']);
    expect(TIER_NUMBER.Mystic).toBe(5);
    expect(TIER_NUMBER.Emissary).toBe(7);
  });
  it('maps ranks to the API badge range', () => {
    expect(badgeRange('Eternus')).toEqual({ min: 111, max: 116 });
    expect(badgeRange('Initiate')).toEqual({ min: 11, max: 16 });
  });
});

describe('hero stats', () => {
  it('scales per boon', () => {
    const h = getHeroStats('haze')!;
    expect(statsAtBoon(h, 1).health).toBe(h.health);
    expect(statsAtBoon(h, 11).health).toBeCloseTo(h.health + 10 * (h.perBoon.health ?? 0));
  });
  it('has stats for released heroes', () => { expect(getHeroStats('abrams')?.weapon.clip).toBeGreaterThan(0); });
});

describe('item search', () => {
  it('finds items by partial name', () => { expect(searchItems('ricoc').map((i) => i.name)).toContain('Ricochet'); });
  it('ignores one-letter queries', () => { expect(searchItems('r')).toEqual([]); });
});
