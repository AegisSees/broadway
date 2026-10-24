import { describe, expect, it } from 'vitest';
import buildsSample from '../../api-samples/builds.json';
import assetsSample from '../../api-samples/assets-heroes.json';
import { DeadlockApi } from '../api/client';
import type { AssetHero, BuildRaw, HeroBuildStatsRow } from '../api/types';
import { heroBuildTabs, normalizeBuild, skillFromOrder } from './communityBuilds';
import { buildItemNames, itemCount } from './builds';
import { getItem } from './items';
import { createLiveSource } from './source';
import { DEFAULT_FILTERS } from './types';

const RAWS = buildsSample as unknown as BuildRaw[];
const slugById = (id: number) => (id === 15 ? 'bebop' : undefined);
const NOW = Date.parse('2026-10-24T00:00:00Z');

describe('published builds (shape from api-samples/builds.json)', () => {
  const b = normalizeBuild(RAWS[0], { slugById, now: NOW })!;

  it('keeps the author’s sections and every item we know, in order and once', () => {
    expect(b.heroSlug).toBe('bebop');
    expect(b.code).toBe('1084');
    expect(b.illustrative).toBe(false);
    expect(b.phases.map((p) => p.label)).toEqual(['Early', 'Mid game', 'Late game', 'EXTRA USEFULL']);
    const names = buildItemNames(b);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(getItem(n)).toBeTruthy();
    expect(b.phases.flatMap((p) => p.items.map((i) => i.order))).toEqual(names.map((_, i) => i + 1));
    expect(itemCount(b)).toBeGreaterThan(15);
  });

  it('never invents numbers: no games means no win rate', () => {
    expect(b.winRate).toBeNull();
    expect(b.matches).toBeNull();
    expect(b.pickRate).toBeNull();
    expect(b.likes).toBe(273226);
    const stats = new Map<number, HeroBuildStatsRow>([[1084, { hero_id: 15, hero_build_id: 1084, wins: 60, losses: 40, matches: 100, players: 80 }]]);
    const withStats = normalizeBuild(RAWS[0], { slugById, stats, now: NOW })!;
    expect(withStats.winRate).toBe(60);
    expect(withStats.matches).toBe(100);
  });

  it('reads the ability order: four unlocks and twelve upgrades of 1, 2 and 5 AP over 16 steps', () => {
    const s = skillFromOrder(RAWS[0], 'bebop')!;
    const steps = s.rows.flatMap((r) => [r.unlockAt, ...r.upgrades.map((u) => u.at)]).filter(Boolean);
    expect([...steps].sort((x, y) => x - y)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    for (const r of s.rows) {
      expect(r.unlockAt).toBeGreaterThan(0);
      expect(r.upgrades.map((u) => u.ap)).toEqual([1, 2, 5]);
      expect(r.upgrades[0].at).toBeGreaterThan(r.unlockAt);
    }
    expect(skillFromOrder(RAWS[0], 'haze')).toBeNull();
  });

  it('marks Eternus authors and names them', () => {
    const authors = new Map([[RAWS[0].hero_build.author_account_id, { name: 'STRMX', badge: 114 }]]);
    const e = normalizeBuild(RAWS[0], { slugById, authors, now: NOW })!;
    expect(e.author).toBe('STRMX');
    expect(e.eternus).toBe(true);
    expect(e.tags).toContain('Eternus');
  });

  it('skips builds for heroes it does not know', () => {
    expect(normalizeBuild(RAWS[0], { slugById: () => undefined })).toBeNull();
  });

  it('picks up to four distinct tabs for a hero page', () => {
    const stats = new Map<number, HeroBuildStatsRow>([
      [234272, { hero_id: 15, hero_build_id: 234272, wins: 300, losses: 200, matches: 500, players: 300 }],
      [1242, { hero_id: 15, hero_build_id: 1242, wins: 70, losses: 30, matches: 100, players: 90 }],
    ]);
    const list = RAWS.map((r) => normalizeBuild(r, { slugById, stats, now: NOW })!);
    const tabs = heroBuildTabs(list);
    expect(tabs.map((t) => t.tab)).toEqual(['Most favorited', 'Most played', 'Best results']);
    expect(tabs.map((t) => t.code)).toEqual(['1084', '234272', '1242']);
  });
});

describe('live source builds', () => {
  const fakeFetch = (async (url: string) => {
    const u = new URL(url);
    const body = u.pathname === '/v1/assets/heroes' ? assetsSample
      : u.pathname === '/v1/builds' ? (u.searchParams.get('hero_id') === '15' ? RAWS : [])
        : u.pathname.startsWith('/v1/analytics/hero-build-stats/') ? [{ hero_id: 15, hero_build_id: 1242, wins: 70, losses: 30, matches: 100, players: 90 }]
          : [];
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
  const src = createLiveSource(new DeadlockApi({ baseUrl: 'https://api.test', fetchImpl: fakeFetch }));

  it('serves a hero’s published builds as tabs', async () => {
    expect((assetsSample as AssetHero[]).some((h) => h.id === 15)).toBe(true);
    const tabs = await src.heroBuilds('bebop', DEFAULT_FILTERS);
    expect(tabs?.[0].code).toBe('1084');
    expect(tabs?.find((t) => t.tab === 'Most played')?.code).toBe('1242');
    expect(tabs?.every((t) => !t.illustrative)).toBe(true);
  });

  it('answers null for a hero with no published builds', async () => {
    expect(await src.heroBuilds('haze', DEFAULT_FILTERS)).toBeNull();
  });

  it('collects builds for the hub', async () => {
    const all = await src.allBuilds();
    expect(all?.length).toBe(3);
    expect(all?.every((b) => b.heroSlug === 'bebop')).toBe(true);
  });
});
