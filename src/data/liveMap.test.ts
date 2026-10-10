import { describe, expect, it } from 'vitest';
import activeRaw from '../../api-samples/active.json';
import assetsHeroes from '../../api-samples/assets-heroes.json';
import banRaw from '../../api-samples/hero-ban.json';
import counterRaw from '../../api-samples/hero-counter.json';
import dailyRaw from '../../api-samples/hero-stats-daily.json';
import statsRaw from '../../api-samples/hero-stats.json';
import synergyRaw from '../../api-samples/hero-synergy.json';
import historyRaw from '../../api-samples/match-history.json';
import patchesRaw from '../../api-samples/patches.json';
import playerHeroRaw from '../../api-samples/player-hero-stats.json';
import playerRankRaw from '../../api-samples/player-rank.json';
import playerSteamRaw from '../../api-samples/player-steam.json';
import distRaw from '../../api-samples/rank-distribution.json';
import leaderboardRaw from '../../api-samples/leaderboard-namerica.json';
import type { ActiveMatchRaw, AssetHero, HeroBanRow, HeroCounterRow, HeroStatsRow, HeroSynergyRow, MatchHistoryRow, PatchEntry, PlayerHeroStatsRow, PlayerRankRaw, RankDistributionRow, SteamProfile } from '../api/types';
import { buildPickColumns, buildSynergyColumn } from '../api/matchups';
import { buildHeroIdMap } from './heroIds';
import { averageBadge, enrichMatch, normalizeMatches } from './matches';
import { normalizePatches, plainExcerpt } from './patches';
import { badgeLevel, buildCore, formSummary, heroesIn, normalizeHistory, normalizeRank, queueKind } from './player';
import { ALL_LEVELS, distributionStats, normalizePlayerDistribution } from './rankDistribution';
import { normalizeLeaderboard, playerHref, resolveCandidates } from './leaderboard';
import { buildTierRows, weeklyDeltas } from './tiers';
import { getHero } from './roster';

const assets = assetsHeroes as unknown as AssetHero[];
const ids = buildHeroIdMap(assets);
const stats = statsRaw as unknown as HeroStatsRow[];

describe('hero ids', () => {
  it('maps every active hero in the API to a Broadway hero page', () => {
    const missing = assets.filter((a) => !ids.slugById(a.id)).map((a) => `${a.id}:${a.class_name}`);
    expect(missing).toEqual([]);
    for (const a of assets) expect(getHero(ids.slugById(a.id))).toBeTruthy();
  });
  it('round-trips between ids and slugs', () => {
    for (const a of assets) expect(ids.idBySlug(ids.slugById(a.id)!)).toBe(a.id);
  });
});

describe('tier rows from hero-stats', () => {
  const rows = buildTierRows({ stats, bans: banRaw as unknown as HeroBanRow[], daily: dailyRaw as unknown as HeroStatsRow[], ids });
  it('lists each hero once with sensible rates', () => {
    expect(rows.length).toBeGreaterThan(30);
    expect(new Set(rows.map((r) => r.slug)).size).toBe(rows.length);
    for (const r of rows) { expect(r.winRate).toBeGreaterThan(30); expect(r.winRate).toBeLessThan(70); expect(r.pickRate).toBeGreaterThan(0); }
  });
  it('defines pick rate as the share of games a hero is in (twelve slots per game, so rates add up to about 1200%)', () => {
    const total = stats.reduce((n, r) => n + r.matches, 0);
    const sum = buildTierRows({ stats, ids }).reduce((n, r) => n + r.pickRate, 0);
    expect(sum).toBeGreaterThan(1150);
    expect(sum).toBeLessThanOrEqual(1200.5);
    const top = [...stats].sort((a, b) => b.matches - a.matches)[0];
    const row = rows.find((r) => r.slug === ids.slugById(top.hero_id));
    expect(row?.pickRate).toBeCloseTo((top.matches / (total / 12)) * 100, 0);
  });
  it('derives ban rate from bans over games and cuts tiers by score', () => {
    expect(rows.every((r) => r.banRate !== undefined && r.banRate >= 0)).toBe(true);
    expect(rows.map((r) => r.score)).toEqual([...rows.map((r) => r.score)].sort((a, b) => b - a));
    expect(rows[0].tier).toBe('S+');
    expect(new Set(rows.map((r) => r.tier)).size).toBeGreaterThanOrEqual(5);
    expect(buildTierRows({ stats, ids }).every((r) => r.banRate === undefined)).toBe(true);
  });
  it('computes the 7-day change only with enough games in both weeks', () => {
    const d = weeklyDeltas(dailyRaw as unknown as HeroStatsRow[]);
    for (const v of d.values()) expect(Math.abs(v)).toBeLessThan(15);
    expect(weeklyDeltas([])).toEqual(new Map());
    const thin = [{ bucket: 86400 * 20, hero_id: 1, matches: 5, wins: 5 }, { bucket: 86400 * 10, hero_id: 1, matches: 5, wins: 0 }] as HeroStatsRow[];
    expect(weeklyDeltas(thin).size).toBe(0);
  });
  it('returns nothing when there are no games', () => expect(buildTierRows({ stats: [], ids })).toEqual([]));
});

describe('matchup columns from the API', () => {
  const lookup = { byId: (id: number) => { const s = ids.slugById(id); const h = s ? getHero(s) : undefined; return h ? { slug: h.slug, name: h.name } : undefined; } };
  it('builds best and worst picks against a hero from real counter rows', () => {
    const rows = counterRaw as unknown as HeroCounterRow[];
    const hero = rows[0].hero_id;
    const [best, worst] = buildPickColumns(hero, rows, lookup);
    expect(best.entries.length).toBeGreaterThan(0);
    const num = (s: string) => parseFloat(s);
    expect(num(best.entries[0].display)).toBeGreaterThanOrEqual(num(worst.entries[0].display));
  });
  it('builds lane synergy from pairs listed once, whichever side the hero is on', () => {
    const rows = synergyRaw as unknown as HeroSynergyRow[];
    const g = buildSynergyColumn(rows[0].hero_id1, rows, lookup);
    expect(g?.key).toBe('synergy');
    const other = rows.find((r) => r.hero_id2 === rows[0].hero_id1);
    if (other) expect(buildSynergyColumn(rows[0].hero_id1, [other], lookup)?.entries[0].slug).toBe(ids.slugById(other.hero_id1));
    expect(buildSynergyColumn(999999, rows, lookup)).toBeNull();
  });
});

describe('rank distribution of players', () => {
  const d = normalizePlayerDistribution(distRaw as unknown as RankDistributionRow[]);
  it('covers all 66 levels as players', () => {
    expect(d.unit).toBe('players');
    expect(d.illustrative).toBe(false);
    expect(d.rows.map((r) => r.level)).toEqual(ALL_LEVELS);
    expect(d.rows.reduce((n, r) => n + r.count, 0)).toBe((distRaw as unknown as RankDistributionRow[]).reduce((n, r) => n + r.players, 0));
    expect(distributionStats(d).tiers).toHaveLength(11);
  });
});

describe('live matches', () => {
  const raw = activeRaw as unknown as ActiveMatchRaw[];
  const list = normalizeMatches(raw, (id) => ids.slugById(id));
  it('keeps every game with two teams of six and reads the mode from the number', () => {
    expect(list).toHaveLength(raw.length);
    expect(list.filter((m) => m.mode === 'street_brawl').length).toBe(raw.filter((m) => m.game_mode === 4).length);
    expect(list.some((m) => m.mode === 'street_brawl')).toBe(true);
    for (const m of list) { expect(m.teams[0].players.length + m.teams[1].players.length).toBeGreaterThan(0); expect(m.illustrative).toBe(false); expect(m.avgBadge).toBe(0); }
    expect(list.find((m) => m.queue === 'ranked') ?? list.find((m) => m.queue === 'unranked')).toBeTruthy();
  });
  it('fills names and a lobby average from looked-up players', () => {
    const m = list[0];
    const players = m.teams.flatMap((t) => t.players).filter((p) => p.accountId);
    const who = new Map(players.map((p, i) => [p.accountId as number, { name: `P${i}`, badge: 100 + (i % 6) }]));
    const e = enrichMatch(m, who);
    expect(e.teams[0].players[0].name).toBe('P0');
    expect(e.avgBadge).toBeGreaterThan(0);
    expect(e.badgesKnown).toBe(players.length);
    expect(enrichMatch(m, new Map([[players[0].accountId as number, { badge: 100 }]])).avgBadge).toBe(0); // fewer than four ranks: not enough to call an average
  });
  it('averages ranks on the ladder, not as raw numbers', () => {
    expect(averageBadge([36, 46])).toBe(43); // Acolyte VI and Seeker VI sit six levels apart on the ladder, so the middle is Seeker III
    expect(averageBadge([36, 41])).toBe(41); // two neighbouring levels average to the upper one
    expect(averageBadge([111, 116])).toBe(114);
    expect(averageBadge([])).toBe(0);
    expect(averageBadge([0, 0])).toBe(0);
  });
});

describe('leaderboard rows', () => {
  const raw = leaderboardRaw as unknown as { entries: { rank: number; account_name: string; possible_account_ids: number[]; top_hero_ids: number[] }[] };
  const rows = normalizeLeaderboard(raw, ids.slugById);
  it('reads names, ranks and favourite heroes', () => {
    expect(rows[0]).toMatchObject({ rank: 1, name: 'lavabolt VOTE DANNY', accountId: 1162416085 });
    expect(rows[0].topHeroes.length).toBe(1);
    expect(rows.every((r) => r.badge === 0)).toBe(true);
  });
  it('keeps shared names as candidates instead of guessing', () => {
    const shared = rows.find((r) => r.candidates);
    expect(shared?.accountId).toBeUndefined();
    expect(shared!.candidates!.length).toBeGreaterThan(1);
  });
  it('links to the player, to a name search, or nowhere for samples', () => {
    expect(playerHref({ name: 'x', accountId: 7 })).toBe('/player/7');
    expect(playerHref({ name: 'x', accountId: 7, alt: [8, 9] })).toBe('/player/7?alt=8,9');
    expect(playerHref({ name: 'a b' })).toBe('/player?q=a%20b');
    expect(playerHref({ name: 'x', sample: true })).toBeNull();
  });
  it('picks the active, highest-ranked account among accounts sharing a name', () => {
    const info = new Map([[1, { matches30d: 4, badge: 116 }], [2, { matches30d: 90, badge: 112 }], [3, { matches30d: 120, badge: 115 }]]);
    expect(resolveCandidates([1, 2, 3], info)).toEqual({ accountId: 3, alt: [1, 2], certain: false });
    expect(resolveCandidates([1, 2], info)).toEqual({ accountId: 2, alt: [1], certain: true }); // only #2 was active lately
    expect(resolveCandidates([1], info)?.accountId).toBe(1);
    expect(resolveCandidates([9], info)).toBeNull();
    expect(resolveCandidates([1], new Map([[1, { matches30d: 2, badge: 100 }]]))?.certain).toBe(false);
  });
});

describe('player profile', () => {
  const history = normalizeHistory(historyRaw as unknown as MatchHistoryRow[], ids);
  it('reads the match list newest first, with the queue worked out from both mode fields', () => {
    expect(history.matches).toHaveLength((historyRaw as unknown[]).length);
    const times = history.matches.map((m) => m.start);
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(history.matches.some((m) => m.kind === 'ranked')).toBe(true);
    expect(history.matches.filter((m) => m.won).length).toBe((historyRaw as unknown as MatchHistoryRow[]).filter((r) => r.player_match_outcome === 1).length);
  });
  it('treats game mode 4 as Street Brawl, then match mode 4 as ranked and 1 as unranked', () => {
    expect(queueKind(4, 4)).toBe('brawl'); expect(queueKind(1, 4)).toBe('ranked'); expect(queueKind(1, 1)).toBe('unranked'); expect(queueKind(1, 2)).toBe('other');
  });
  it('builds the rank history oldest first from ranked games only', () => {
    expect(history.history.length).toBeGreaterThan(0);
    const t = history.history.map((p) => p.t);
    expect(t).toEqual([...t].sort((a, b) => a - b));
    expect(history.history.every((p) => p.badge > 0)).toBe(true);
  });
  it('summarises recent form and hero usage', () => {
    const f = formSummary(history.matches, 20);
    expect(f.n).toBe(20);
    expect(f.wins).toBe(history.matches.slice(0, 20).filter((m) => m.won).length);
    const heroes = heroesIn(history.matches);
    expect(heroes.reduce((n, h) => n + h.matches, 0)).toBeLessThanOrEqual(history.matches.length);
    expect(heroes[0].matches).toBeGreaterThanOrEqual(heroes[heroes.length - 1].matches);
  });
  it('combines profile, rank and hero record into one header', () => {
    const steam = (playerSteamRaw as unknown as SteamProfile[])[0];
    const rank = (playerRankRaw as unknown as PlayerRankRaw[])[0];
    const rows = playerHeroRaw as unknown as PlayerHeroStatsRow[];
    const c = buildCore(steam.account_id, { steam, rank, heroRows: rows.filter((r) => r.account_id === steam.account_id), ids });
    expect(c.name).toBe(steam.personaname);
    expect(c.rank).toMatchObject({ badge: 116, name: 'Eternus', label: 'Eternus VI' });
    expect(c.totals!.matches).toBeGreaterThan(0);
    expect(c.heroes[0].matches).toBeGreaterThanOrEqual(c.heroes[c.heroes.length - 1].matches);
    expect(c.empty).toBe(false);
    expect(c.illustrative).toBe(false);
  });
  it('is empty when the API knows nothing, and never invents a name', () => {
    const c = buildCore(42, { ids });
    expect(c.empty).toBe(true);
    expect(c.rank).toBeNull();
    expect(c.name).toBe('Player 42');
  });
  it('ignores a rank of zero and orders the ladder', () => {
    expect(normalizeRank({ badge: 0, rank: 0, subrank: 0 })).toBeNull();
    expect(badgeLevel(116)).toBeGreaterThan(badgeLevel(111));
    expect(badgeLevel(41)).toBeGreaterThan(badgeLevel(36));
  });
});

describe('patch notes', () => {
  it('lists posts newest first as plain text', () => {
    const notes = normalizePatches(patchesRaw as unknown as PatchEntry[]);
    expect(notes.length).toBe((patchesRaw as unknown[]).length);
    const dates = notes.map((n) => n.date);
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
    for (const n of notes) { expect(n.excerpt).not.toMatch(/[<>]/); expect(n.link).toMatch(/^https?:\/\//); }
  });
  it('strips markup, entities and links, and shortens on a word', () => {
    expect(plainExcerpt('<p>Fix &amp; tweak <b>things</b></p><img src="https://x/y.png">')).toBe('Fix & tweak things');
    const long = plainExcerpt(`<p>${'word '.repeat(80)}</p>`, 60);
    expect(long.length).toBeLessThanOrEqual(61);
    expect(long.endsWith('…')).toBe(true);
    expect(plainExcerpt(undefined)).toBe('');
  });
  it('drops posts with no date or a non-web link', () => {
    expect(normalizePatches([{ title: 'a', pub_date: 'nope', link: 'https://x' }, { title: 'b', pub_date: '2026-10-01T00:00:00Z', link: 'javascript:alert(1)' }] as PatchEntry[])).toEqual([]);
  });
});
