import { describe, expect, it } from 'vitest';
import { avgBadgeOf } from './matchDetail';
import { placement, shownRank, type PlayerCore, type PlayerMatchLine } from './player';
import { savedMatchDetail } from '../test/savedMatch';

describe('lobby ranks', () => {
  it('averages badges only when enough players have one', () => {
    expect(avgBadgeOf([{ badge: 96 }, { badge: 104 }, {}], 3)).toBeUndefined();
    expect(avgBadgeOf([{ badge: 96 }, { badge: 104 }, { badge: 100 }], 3)).toBe(100);
  });

  it('fills the match and team averages from the players when the API sends 0', () => {
    const m = savedMatchDetail(1);
    expect(m.avgBadge).toBeGreaterThan(0);
    for (const t of m.teams) expect(t.avgBadge).toBeGreaterThan(0);
  });

  it('places a player at the median of their lobbies', () => {
    expect(placement([])).toBeNull();
    expect(placement([90, 100, 110, 95, 105])).toEqual({ badge: 100, low: 95, high: 105, n: 5 });
  });

  it('falls back to the badge of the newest ranked game when the rank lookup is empty', () => {
    const line = (id: number, kind: PlayerMatchLine['kind'], badge?: number): PlayerMatchLine => ({
      id, heroId: 1, heroSlug: 'haze', start: 1_000 - id, durationS: 1800, won: true, kind, kills: 1, deaths: 1, assists: 1,
      netWorth: 1, lastHits: 1, level: 1, abandoned: false, badge,
    });
    const lines = [line(1, 'unranked'), line(2, 'ranked', 94), line(3, 'ranked', 85)];
    const core = { rank: null } as unknown as PlayerCore;
    const r = shownRank(core, lines);
    expect(r?.badge).toBe(94);
    expect(r?.fromHistory).toBeGreaterThan(0);
    expect(shownRank(core, lines.filter((m) => m.kind !== 'ranked'))).toBeNull();
  });
});
