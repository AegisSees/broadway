import { describe, expect, it } from 'vitest';
import { streakOf, type PlayerMatchLine } from './player';
import { placeSelf } from '../components/PlayerMatchCard';
import { sampleMatchDetail } from './sampleMatch';

const line = (won: boolean, id = 1): PlayerMatchLine => ({
  id, heroId: 1, heroSlug: 'haze', start: 0, durationS: 1800, won, kind: 'ranked', kills: 7, deaths: 2, assists: 9,
  netWorth: 30000, lastHits: 150, level: 30, abandoned: false,
});

describe('streakOf', () => {
  it('counts the current run from the newest game', () => {
    expect(streakOf([line(false), line(false), line(true)])).toEqual({ won: false, n: 2 });
    expect(streakOf([line(true)])).toEqual({ won: true, n: 1 });
    expect(streakOf([])).toBeNull();
  });
});

describe('placeSelf', () => {
  it('puts the page owner into a sample game, on the side that matches the result', () => {
    const m = sampleMatchDetail(42);
    const won = placeSelf(m, line(true), 999);
    const me = won.players.find((p) => p.accountId === 999)!;
    expect(me.won).toBe(true);
    expect(me.heroSlug).toBe('haze');
    expect(me.kills).toBe(7);
    expect(won.teams.flatMap((t) => t.players).filter((p) => p.accountId === 999)).toHaveLength(1);
    expect(placeSelf(m, line(false), 999).players.find((p) => p.accountId === 999)!.won).toBe(false);
  });
  it('never changes a live game', () => {
    const live = { ...sampleMatchDetail(42), illustrative: false };
    expect(placeSelf(live, line(true), 999)).toBe(live);
  });
});
