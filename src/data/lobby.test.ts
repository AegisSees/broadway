import { describe, expect, it } from 'vitest';
import { avgBadgeOf } from './matchDetail';
import { placement, sampleCore, sampleMatches, shownRank } from './player';
import { sampleMatchDetail } from './sampleMatch';
import { fixtureSource } from './source';

describe('lobby ranks', () => {
  it('averages badges only when enough players have one', () => {
    expect(avgBadgeOf([{ badge: 96 }, { badge: 104 }, {}], 3)).toBeUndefined();
    expect(avgBadgeOf([{ badge: 96 }, { badge: 104 }, { badge: 100 }], 3)).toBe(100);
  });

  it('fills the match and team averages from the players when the API sends 0', () => {
    const m = sampleMatchDetail(1);
    expect(m.avgBadge).toBeGreaterThan(0);
    for (const t of m.teams) expect(t.avgBadge).toBeGreaterThan(0);
  });

  it('places a player at the median of their lobbies', () => {
    expect(placement([])).toBeNull();
    expect(placement([90, 100, 110, 95, 105])).toEqual({ badge: 100, low: 95, high: 105, n: 5 });
  });

  it('falls back to the badge of the newest ranked game when the rank lookup is empty', () => {
    const lines = sampleMatches(4242).matches;
    const core = { ...sampleCore(4242), rank: null };
    const r = shownRank(core, lines);
    expect(r?.badge).toBe(lines.find((m) => m.kind === 'ranked')!.badge);
    expect(r?.fromHistory).toBeGreaterThan(0);
    expect(shownRank(core, lines.filter((m) => m.kind !== 'ranked'))).toBeNull();
  });

  it('gives sample lobbies near the sample player', async () => {
    const lines = sampleMatches(4242).matches.filter((m) => m.kind === 'ranked').slice(0, 20);
    const got = await fixtureSource.lobbyRanks(4242, lines.map((m) => m.id));
    expect(got.size).toBe(lines.length);
    const own = sampleCore(4242).rank!.badge;
    for (const m of lines) expect(Math.abs(Math.floor(got.get(m.id)! / 10) - Math.floor(own / 10))).toBeLessThanOrEqual(1);
  });
});
