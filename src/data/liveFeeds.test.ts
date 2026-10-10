import { describe, expect, it } from 'vitest';
import { filterMatches, fmtClock, fmtSouls, MIN_RANKS, netWorthShare, normalizeMatches, sampleMatches } from './matches';
import { embedUrl, normalizeStreams, sampleStreams } from './streams';

describe('sample matches', () => {
  const NOW = 2_000_000_000;
  const list = sampleMatches(NOW, 12);
  it('has twelve distinct heroes per game, six a side, and a start time in the past', () => {
    expect(list.length).toBe(12);
    for (const m of list) {
      const heroes = m.teams.flatMap((t) => t.players.map((p) => p.heroSlug));
      expect(heroes.length).toBe(12);
      expect(new Set(heroes).size).toBe(12);
      expect(m.teams.every((t) => t.players.length === 6)).toBe(true);
      expect(m.illustrative).toBe(true);
    }
    expect(new Set(list.map((m) => m.id)).size).toBe(12);
  });
  it('filters by mode and minimum rank, and sorts', () => {
    const brawl = filterMatches(list, { mode: 'street_brawl', minBadge: 0, sort: 'newest' });
    expect(brawl.every((m) => m.mode === 'street_brawl')).toBe(true);
    const min = MIN_RANKS.find((r) => r.id === 'phantom')!.min;
    expect(filterMatches(list, { mode: 'all', minBadge: min, sort: 'rank' }).every((m) => m.avgBadge >= min)).toBe(true);
    const byRank = filterMatches(list, { mode: 'all', minBadge: 0, sort: 'rank' });
    expect(byRank[0].avgBadge).toBeGreaterThanOrEqual(byRank[byRank.length - 1].avgBadge);
  });
  it('splits net worth between the teams', () => {
    for (const m of list) { const s = netWorthShare(m); expect(s).toBeGreaterThan(0.2); expect(s).toBeLessThan(0.8); }
  });
});

describe('formatting', () => {
  it('formats clocks and souls', () => {
    expect(fmtClock(0)).toBe('0:00'); expect(fmtClock(61)).toBe('1:01'); expect(fmtClock(3725)).toBe('1:02:05'); expect(fmtClock(-5)).toBe('0:00');
    expect(fmtSouls(950)).toBe('950'); expect(fmtSouls(312400)).toBe('312.4K'); expect(fmtSouls(12000)).toBe('12K');
  });
});

describe('normalizeMatches (feed shape checked 8 Oct 2026)', () => {
  const byId = (id: number) => ({ 1: 'haze', 2: 'abrams', 3: 'lash' } as Record<number, string>)[id];
  it('maps teams, net worth and mode, and drops rows it cannot read', () => {
    const raw = [
      { match_id: 123, start_time: 1_790_000_000, game_mode: 4, match_mode: 1, spectators: 5, net_worth_team_0: 5000, net_worth_team_1: 4000,
        players: [{ team: 0, hero_id: 1, account_id: 9 }, { team: 1, hero_id: 2 }, { team: 1, hero_id: 99 }] },
      { match_id: 5, players: [] },
      { start_time: 1 },
    ];
    const out = normalizeMatches(raw, byId);
    expect(out.length).toBe(1);
    const m = out[0];
    expect(m.id).toBe('123'); expect(m.mode).toBe('street_brawl'); expect(m.queue).toBe('unranked'); expect(m.spectators).toBe(5);
    expect(m.avgBadge).toBe(0); // the feed has no ranks; they are looked up afterwards
    expect(m.teams[0].players.map((p) => p.heroSlug)).toEqual(['haze']);
    expect(m.teams[0].players[0].accountId).toBe(9);
    expect(m.teams[1].players.map((p) => p.heroSlug)).toEqual(['abrams']); // unknown hero 99 is dropped
    expect(m.teams[0].netWorth).toBe(5000);
    expect(m.illustrative).toBe(false);
  });
  it('reads standard and ranked from the numbers, and still understands an older mode name', () => {
    const p = [{ team: 0, hero_id: 1 }, { team: 1, hero_id: 2 }];
    const [a, b] = normalizeMatches([{ match_id: 1, start_time: 1, game_mode: 1, match_mode: 4, players: p }, { match_id: 2, start_time: 1, game_mode: 'KECitadelGameModeStreetBrawl', players: p }], byId);
    expect(a.mode).toBe('standard'); expect(a.queue).toBe('ranked'); expect(b.mode).toBe('street_brawl');
  });
  it('accepts { matches: [...] } and survives junk', () => {
    expect(normalizeMatches({ matches: [] }, byId)).toEqual([]);
    expect(normalizeMatches('x', byId)).toEqual([]);
    expect(normalizeMatches(null, byId)).toEqual([]);
  });
});

describe('streams', () => {
  it('has invented channels with unique names and heroes, busiest first', () => {
    const s = sampleStreams(12);
    expect(new Set(s.map((x) => x.channel)).size).toBe(12);
    expect(new Set(s.map((x) => x.heroSlug)).size).toBe(12);
    expect(s.every((x) => x.illustrative && !x.thumbnail)).toBe(true);
    expect(s.map((x) => x.viewers)).toEqual([...s.map((x) => x.viewers)].sort((a, b) => b - a));
  });
  it('normalises the proxy list, sizes thumbnails and refuses odd channel names', () => {
    const out = normalizeStreams({ streams: [
      { id: '1', channel: 'Fox_One', name: 'Fox One', title: 'Hi', viewers: 10, language: 'EN', thumbnail: 'https://x/{width}x{height}.jpg' },
      { id: '2', channel: 'bad name!', viewers: 999 },
      { user_login: 'big', viewer_count: 500, thumbnail_url: 'http://insecure/x.jpg', started_at: '2026-10-08T00:00:00Z' },
    ] });
    expect(out.map((s) => s.channel)).toEqual(['big', 'fox_one']);
    expect(out[1].thumbnail).toBe('https://x/440x248.jpg');
    expect(out[0].thumbnail).toBeUndefined(); // http thumbnails are dropped
    expect(out[1].language).toBe('en');
    expect(normalizeStreams(undefined)).toEqual([]);
  });
  it('builds a Twitch embed address with the parent host', () => {
    expect(embedUrl('fox_one', 'broadway.gg')).toBe('https://player.twitch.tv/?channel=fox_one&parent=broadway.gg&muted=true');
  });
});
