import { describe, expect, it, vi } from 'vitest';
import { DeadlockApi } from './client';
import { toApiFilters } from './filters';
import { buildPickColumns } from './matchups';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('DeadlockApi', () => {
  it('sorts and omits empty params when building urls', () => {
    expect(DeadlockApi.buildUrl('https://x', '/p', { b: 2, a: 1, c: undefined, d: '' })).toBe('https://x/p?a=1&b=2');
  });
  it('caches identical requests and de-duplicates in-flight ones', async () => {
    const f = vi.fn(async () => json([{ hero_id: 1 }]));
    const api = new DeadlockApi({ baseUrl: 'https://x', fetchImpl: f as unknown as typeof fetch });
    await Promise.all([api.heroStats(), api.heroStats()]);
    await api.heroStats();
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('throws a typed error on failure', async () => {
    const api = new DeadlockApi({ baseUrl: 'https://x', fetchImpl: (async () => json({}, 500)) as unknown as typeof fetch });
    await expect(api.heroStats()).rejects.toMatchObject({ name: 'ApiError', status: 500 });
  });
  it('expires cache after the ttl', async () => {
    let t = 0;
    const f = vi.fn(async () => json([]));
    const api = new DeadlockApi({ baseUrl: 'https://x', fetchImpl: f as unknown as typeof fetch, now: () => t });
    await api.heroStats();
    t = 7 * 60 * 60 * 1000;
    await api.heroStats();
    expect(f).toHaveBeenCalledTimes(2);
  });
});

describe('shared requests', () => {
  it('lets one caller walk away without cancelling the request for another', async () => {
    let release: (r: Response) => void = () => {};
    const f = vi.fn(() => new Promise<Response>((r) => { release = r; }));
    const api = new DeadlockApi({ baseUrl: 'https://x', fetchImpl: f as unknown as typeof fetch });
    const quitter = new AbortController();
    const first = api.heroStats({}, quitter.signal);
    const second = api.heroStats({});
    quitter.abort();
    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    release(json([{ hero_id: 7 }]));
    await expect(second).resolves.toEqual([{ hero_id: 7 }]);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('rejects at once for a signal that is already aborted, but still caches for the next caller', async () => {
    const f = vi.fn(async () => json([]));
    const api = new DeadlockApi({ baseUrl: 'https://x', fetchImpl: f as unknown as typeof fetch });
    const done = new AbortController(); done.abort();
    await expect(api.heroStats({}, done.signal)).rejects.toMatchObject({ name: 'AbortError' });
    await api.heroStats({});
    expect(f.mock.calls.length).toBeLessThanOrEqual(1);
  });
});

describe('batched player calls', () => {
  it('splits long id lists into chunks and merges the answers, skipping repeats', async () => {
    const f = vi.fn(async (url: string) => {
      const ids = new URL(url).searchParams.get('account_ids')!.split(',').map(Number);
      return json(ids.map((account_id) => ({ account_id, personaname: `p${account_id}` })));
    });
    const api = new DeadlockApi({ baseUrl: 'https://x', fetchImpl: f as unknown as typeof fetch });
    const ids = Array.from({ length: 230 }, (_, i) => i + 1);
    const out = await api.steamProfiles([...ids, 5, 6]);
    expect(out).toHaveLength(230);
    expect(f).toHaveBeenCalledTimes(3); // 100 + 100 + 30
    const hs = await api.playerHeroStats(ids.slice(0, 45), { heroId: 14 });
    expect(hs.length).toBeGreaterThan(0);
    expect(f.mock.calls.filter(([u]) => String(u).includes('/players/hero-stats')).length).toBe(3); // 20 + 20 + 5
    expect(String(f.mock.calls[f.mock.calls.length - 1][0])).toContain('hero_ids=14');
  });
});

describe('filters', () => {
  it('maps modes, queues, ranks, brackets and the time window to API params', () => {
    expect(toApiFilters({ mode: 'standard', queue: 'ranked', rank: 'all', window: 'patch' })).toEqual({ game_mode: 'normal', match_mode: 'ranked' });
    const f = toApiFilters({ mode: 'street_brawl', queue: 'unranked', rank: 'Eternus', window: 'patch' });
    expect(f.game_mode).toBe('street_brawl');
    expect(f.min_average_badge).toBe(111);
    expect(f.max_average_badge).toBe(116);
    const b = toApiFilters({ mode: 'standard', queue: 'ranked', rank: 'bracket-4', window: 'patch' }, { key: 'patch', from: 1000, patchStart: 1000 });
    expect([b.min_average_badge, b.max_average_badge]).toEqual([91, 116]);
    expect(b.min_unix_timestamp).toBe(1000);
    expect(b.max_unix_timestamp).toBeUndefined();
  });
});

describe('buildPickColumns', () => {
  const heroes = { byId: (id: number) => ({ slug: `h${id}`, name: `Hero ${id}` }) };
  // Hero 1 wins 50% overall: 5,000 games against each of nine opponents, one clearly bad matchup, one clearly good.
  const rows = [
    { hero_id: 1, enemy_hero_id: 2, matches_played: 5000, wins: 2200 }, // 44%: bad for hero 1
    { hero_id: 1, enemy_hero_id: 3, matches_played: 5000, wins: 2800 }, // 56%: good for hero 1
    ...[4, 5, 6, 7, 8, 9, 10].map((e) => ({ hero_id: 1, enemy_hero_id: e, matches_played: 5000, wins: 2500 })),
    { hero_id: 1, enemy_hero_id: 11, matches_played: 20, wins: 0 }, // too few games: hidden and counted
    { hero_id: 9, enemy_hero_id: 2, matches_played: 500, wins: 100 }, // another hero's row
  ];
  it('shows each matchup as points against the hero\u2019s own baseline and hides thin ones', () => {
    const { groups: [best, worst], hidden } = buildPickColumns(1, rows, heroes);
    expect(hidden).toBe(1);
    expect(best.entries[0].slug).toBe('h2');
    expect(best.entries[0].display.startsWith('\u2212')).toBe(true);
    expect(parseFloat(best.entries[0].display.slice(1))).toBeGreaterThan(4);
    expect(parseFloat(best.entries[0].display.slice(1))).toBeLessThan(6); // shrunk, so a little under the raw 6 points
    expect(best.entries[0].unsure).toBe(false);
    expect(worst.entries[0].slug).toBe('h3');
    expect(worst.entries[0].display.startsWith('+')).toBe(true);
    expect([...best.entries, ...worst.entries].some((e) => e.slug === 'h11')).toBe(false);
  });
  it('flags a difference that could be chance', () => {
    const noisy = [...rows.slice(2, 9), { hero_id: 1, enemy_hero_id: 2, matches_played: 200, wins: 96 }]; // 48% of 200
    const { groups: [best] } = buildPickColumns(1, noisy, heroes);
    expect(best.entries.find((e) => e.slug === 'h2')?.unsure ?? true).toBe(true);
  });
});
