import { describe, expect, it } from 'vitest';
import { badgeLabel, badgeParts, normalizeLeaderboard, sampleLeaderboard } from './leaderboard';

describe('leaderboard', () => {
  it('builds a deterministic 500-row sample with unique handles', () => {
    const a = sampleLeaderboard('Europe', null);
    expect(a).toHaveLength(500);
    expect(a[0].rank).toBe(1);
    expect(new Set(a.map((r) => r.name)).size).toBe(500);
    expect(sampleLeaderboard('Europe', null)[10].name).toBe(a[10].name);
    expect(sampleLeaderboard('Europe', 'haze')[0].topHeroes[0]).toBe('haze');
  });
  it('splits badge levels', () => {
    expect(badgeParts(116)).toMatchObject({ rank: 'Eternus', sub: 6 });
    expect(badgeLabel(116)).toBe('Eternus VI');
    expect(badgeLabel(31)).toBe('Acolyte I');
    expect(badgeParts(0).sub).toBe(0);
  });
  it('normalises the board and a bare list', () => {
    const raw = [{ rank: 1, account_name: 'x', possible_account_ids: [7], top_hero_ids: [1, 2] }];
    const ids = (n: number) => (n === 1 ? 'haze' : undefined);
    expect(normalizeLeaderboard(raw, ids)[0]).toMatchObject({ rank: 1, name: 'x', accountId: 7, badge: 0, topHeroes: ['haze'] });
    expect(normalizeLeaderboard(raw, ids, 'lash')[0].topHeroes).toEqual(['lash']); // a hero board lists that hero
    expect(normalizeLeaderboard({ entries: raw }, ids)).toHaveLength(1);
    expect(normalizeLeaderboard(null, ids)).toEqual([]);
  });
});
