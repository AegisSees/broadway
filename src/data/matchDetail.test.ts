import { describe, expect, it } from 'vitest';
import assetsHeroes from '../../api-samples/assets-heroes.json';
import raw from '../../api-samples/match-metadata.json';
import type { AssetHero, MatchMetadataRaw } from '../api/types';
import { buildHeroIdMap } from './heroIds';
import { itemUse, kindOf, leader, normalizeMatch, parseStart, sideOf } from './matchDetail';

const ids = buildHeroIdMap(assetsHeroes as unknown as AssetHero[]);
const match = raw as unknown as MatchMetadataRaw;
const m = normalizeMatch(match, ids);

describe('normalizeMatch on a real ranked game', () => {
  it('reads the header: id, time, length, queue and winner', () => {
    expect(m.id).toBe(113086334);
    expect(m.start).toBe(Date.UTC(2026, 9, 8, 21, 42, 53) / 1000);
    expect(m.durationS).toBe(1719);
    expect(m.kind).toBe('ranked');
    expect(m.winner).toBe('hidden-king');
    expect(m.illustrative).toBe(false);
    expect(m.avgBadge).toBe(114);
  });

  it('splits twelve players into two sides of six with the winners marked', () => {
    expect(m.players).toHaveLength(12);
    const [hk, am] = m.teams;
    expect(hk.side).toBe('hidden-king');
    expect(hk.players).toHaveLength(6);
    expect(am.players).toHaveLength(6);
    expect(hk.won).toBe(true);
    expect(am.won).toBe(false);
    expect(hk.players.every((p) => p.won)).toBe(true);
    expect(am.players.every((p) => !p.won)).toBe(true);
    expect(hk.score).toBeUndefined();
    expect(m.players.slice(0, 6).every((p) => p.side === 'hidden-king')).toBe(true);
  });

  it('adds up the team totals from the players', () => {
    const [hk, am] = m.teams;
    expect(hk.kills).toBe(2 + 12 + 10 + 1 + 10 + 13);
    expect(am.kills).toBe(6 + 6 + 2 + 4 + 4 + 1);
    expect(hk.netWorth).toBe(hk.players.reduce((n, p) => n + p.netWorth, 0));
    expect(hk.damage).toBeGreaterThan(0);
  });

  it('maps hero ids to slugs and keeps the three MVP ranks', () => {
    expect(m.players.every((p) => p.heroSlug)).toBe(true);
    const mvps = m.players.filter((p) => p.mvp).map((p) => p.mvp).sort();
    expect(mvps).toEqual([1, 2, 3]);
    expect(m.players.find((p) => p.mvp === 1)!.side).toBe('hidden-king');
    expect(m.players.find((p) => p.mvp === 3)!.won).toBe(false);
  });

  it('names every shop item and keeps ability purchases out of the build', () => {
    for (const p of m.players) {
      expect(p.bought.length).toBeGreaterThan(8);
      expect(p.bought.every((i) => !i.name.startsWith('Item '))).toBe(true);
      expect(p.bought.every((i) => i.tier !== undefined)).toBe(true);
      expect(p.skills.length).toBeGreaterThan(10);
      expect(p.skills.length).toBeLessThanOrEqual(p.abilityPoints + 2);
    }
    const first = m.players.find((p) => p.accountId === 1162416085)!;
    expect(first.bought.some((i) => i.name === 'Mystic Burst')).toBe(true);
  });

  it('holds only what was not sold, priciest first, and never more than a full inventory', () => {
    for (const p of m.players) {
      expect(p.held.length).toBeLessThanOrEqual(14);
      expect(p.held.every((i) => i.held && i.soldAt === undefined)).toBe(true);
      const costs = p.held.map((i) => i.cost ?? 0);
      expect(costs).toEqual([...costs].sort((a, b) => b - a));
    }
    const sold = m.players[0].bought.filter((i) => !i.held);
    expect(sold.length).toBeGreaterThan(0);
    expect(sold.every((i) => (i.soldAt ?? 0) >= i.at)).toBe(true);
  });

  it('numbers abilities in the order they were first learned', () => {
    const p = m.players[0];
    expect(p.skills[0].group).toBe(0);
    expect(Math.max(...p.skills.map((s) => s.group))).toBeLessThanOrEqual(5);
    expect(p.skills.every((s, i) => i === 0 || s.at >= p.skills[i - 1].at)).toBe(true);
    const lv = new Map<number, number>();
    for (const s of p.skills) { lv.set(s.group, (lv.get(s.group) ?? 0) + 1); expect(s.level).toBe(lv.get(s.group)); }
  });

  it('draws a souls curve for each player and a lead curve for the match', () => {
    for (const p of m.players) {
      expect(p.curve[0]).toEqual({ t: 0, v: 0 });
      expect(p.curve[p.curve.length - 1].t).toBe(1719);
      expect(p.curve[p.curve.length - 1].v).toBeGreaterThan(20000);
    }
    expect(m.lead.length).toBe(9);
    expect(m.lead[0]).toEqual({ t: 0, v: 0 });
    const last = m.lead[m.lead.length - 1];
    expect(last.t).toBe(1719);
    // The last sample is taken a second before the final tally, so the two can differ by a soul or two.
    expect(Math.abs(last.v - (m.teams[0].netWorth - m.teams[1].netWorth))).toBeLessThanOrEqual(10);
    expect(last.v).toBeGreaterThan(0);
  });

  it('assigns lanes and works out accuracy', () => {
    expect(m.players.filter((p) => p.lane === 'york')).toHaveLength(4);
    expect(m.players.filter((p) => p.lane === 'broadway')).toHaveLength(4);
    expect(m.players.filter((p) => p.lane === 'greenwich')).toHaveLength(4);
    const p = m.players.find((x) => x.accountId === 1090618511)!;
    expect(p.accuracy).toBe(Math.round((1199 / (1199 + 2230)) * 100));
    expect(p.badge).toBe(114);
  });

  it('finds the standout players and what the lobby ended with', () => {
    expect(leader(m.players, (p) => p.damage)!.accountId).toBe(1162416085);
    expect(leader([], () => 1)).toBeUndefined();
    const use = itemUse(m.players, 5);
    expect(use).toHaveLength(5);
    expect(use[0].count).toBeGreaterThanOrEqual(use[4].count);
  });
});

describe('normalizeMatch edge cases', () => {
  it('reads a Street Brawl game: round score, eight players, no ban list needed', () => {
    const brawl: MatchMetadataRaw = {
      ...match, game_mode: 'StreetBrawl', match_mode: 'Unranked', team_score: [2, 3], winning_team: 'Team1', average_badge: null,
      players: match.players.filter((_, i) => i < 8).map((p, i) => ({ ...p, team: i % 2 ? 'Team1' : 'Team0' })),
    };
    const b = normalizeMatch(brawl, ids);
    expect(b.kind).toBe('brawl');
    expect(b.winner).toBe('archmother');
    expect(b.teams.map((t) => t.score)).toEqual([2, 3]);
    expect(b.teams[1].won).toBe(true);
    expect(b.players).toHaveLength(8);
    expect(b.avgBadge).toBeUndefined();
  });

  it('copes with a game that has no items, stats or final numbers', () => {
    const bare: MatchMetadataRaw = {
      ...match,
      players: match.players.map((p) => ({ ...p, items: undefined, stats: undefined, final_stats: undefined, mvp_rank: undefined, assigned_lane: undefined })),
    };
    const b = normalizeMatch(bare, ids);
    expect(b.players.every((p) => p.bought.length === 0 && p.held.length === 0 && p.curve.length === 0)).toBe(true);
    expect(b.players.every((p) => p.damage === undefined && p.accuracy === undefined && p.lane === undefined)).toBe(true);
    expect(b.lead).toEqual([]);
    expect(b.teams[0].damage).toBe(0);
  });

  it('keeps an unknown item and an unknown hero instead of dropping them', () => {
    const odd: MatchMetadataRaw = {
      ...match,
      players: match.players.map((p, i) => i === 0
        ? { ...p, hero_id: 987654, items: [...(p.items ?? []), { game_time_s: 99, item_id: 424242, upgrade_id: 1 }] }
        : p),
    };
    const o = normalizeMatch(odd, ids);
    const p = o.players.find((x) => x.heroId === 987654)!;
    expect(p.heroSlug).toBeUndefined();
    expect(p.bought.some((i) => i.name === 'Item 424242' && i.held)).toBe(true);
  });

  it('marks someone who left early and ignores a rank of zero', () => {
    const left: MatchMetadataRaw = { ...match, players: match.players.map((p, i) => (i === 2 ? { ...p, abandon_match_time_s: 640, player_rank_initial_display_rank: 0 } : p)) };
    const l = normalizeMatch(left, ids).players.find((p) => p.accountId === match.players[2].account_id)!;
    expect(l.abandonedAt).toBe(640);
    expect(l.badge).toBeUndefined();
  });
});

describe('small readers', () => {
  it('parses the start time as UTC', () => {
    expect(parseStart('2026-10-08 21:42:53')).toBe(1791495773);
    expect(parseStart('nonsense')).toBe(0);
  });
  it('reads the queue from words or numbers', () => {
    expect(kindOf('Normal', 'Ranked')).toBe('ranked');
    expect(kindOf('Normal', 'Unranked')).toBe('unranked');
    expect(kindOf('StreetBrawl', 'Unranked')).toBe('brawl');
    expect(kindOf(4, 1)).toBe('brawl');
    expect(kindOf(1, 4)).toBe('ranked');
    expect(kindOf('Normal', 'PrivateLobby')).toBe('other');
  });
  it('maps team names to sides', () => {
    expect(sideOf('Team0')).toBe('hidden-king');
    expect(sideOf('Team1')).toBe('archmother');
  });
});
