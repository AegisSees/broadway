import { ApiError, DeadlockApi } from '../api/client';
import { toApiFilters } from '../api/filters';
import { buildPickColumns, buildSynergyColumn } from '../api/matchups';
import type { BuildRaw, PlayerRankRaw, SteamProfile } from '../api/types';
import { dataMode, reportDegraded, reportHealthy } from './dataMode';
import { buildHeroIdMap, type HeroIdMap } from './heroIds';
import { liveOverview } from './liveHero';
import { normalizePatches, type PatchNote } from './patches';
import { getHero } from './roster';
import { HAZE_BRAWL, HAZE_OVERVIEW } from './fixtures';
import type { Filters, HeroOverview, MatchupGroup } from './types';
import {
  MAX_CANDIDATES, normalizeLeaderboard, resolveCandidates, sampleAvatar, sampleLeaderboard, type CandidateInfo, type LeaderboardEntry, type PlayerExtras, type Region,
} from './leaderboard';
import { normalizePlayerDistribution, sampleDistribution, type RankDistribution } from './rankDistribution';
import { allSampleBuilds, sampleHeroBuilds, type HeroBuild } from './builds';
import { BEST_MIN_GAMES, buildResultScore, heroBuildTabs, normalizeBuild } from './communityBuilds';
import { normalizeTrend, patchMarks, sampleTrend, todayUtc, DAY, type HeroTrend } from './trend';
import { normalizeMatches, sampleMatches, type LiveMatch } from './matches';
import { normalizeStreams, sampleStreams, type LiveStream } from './streams';
import {
  buildCore, hitFromProfile, normalizeHistory, normalizeRank, sampleCore, sampleMatches as samplePlayerMatches, sampleMates, sampleName,
  type PlayerCore, type PlayerHit, type PlayerMate, type PlayerMatches,
} from './player';
import { sampleTierList } from './sampleTiers';
import { avgBadgeOf, normalizeMatch, type MatchDetail } from './matchDetail';
import { sampleMatchDetail } from './sampleMatch';
import { buildTierRows, type TierList } from './tiers';

/** Head-to-head record between two heroes: wins for `a` over `b`. */
export interface HeadToHead { matches: number; winsA: number }

export interface DataSource {
  /** "live" asks the Deadlock API (and falls back to a labelled sample when it cannot be reached); "fixture" is samples only. */
  id: 'fixture' | 'live';
  /** Resolves null when this source has nothing for the hero + filters (the UI shows an honest empty state). */
  heroOverview(slug: string, filters: Filters, signal?: AbortSignal): Promise<HeroOverview | null>;
  /** Every hero with win, pick and ban rate, tier and 7-day change. */
  tierList(filters: Filters, signal?: AbortSignal): Promise<TierList>;
  /** Up to 500 rows for a region, optionally for one hero. */
  leaderboard(region: Region, heroSlug: string | null, signal?: AbortSignal): Promise<LeaderboardEntry[]>;
  /** Avatar, rank and record for the players on screen, keyed by the row's rank. Empty when the rows already carry them. */
  playerExtras(entries: LeaderboardEntry[], heroSlug: string | null, signal?: AbortSignal): Promise<Map<number, PlayerExtras>>;
  rankDistribution(filters: Filters, signal?: AbortSignal): Promise<RankDistribution>;
  /** Null when the source has no head-to-head data. */
  headToHead(a: string, b: string, filters: Filters, signal?: AbortSignal): Promise<HeadToHead | null>;
  /** Daily win rate for a hero with patch dates. Null when the source has no history for it. */
  heroTrend(slug: string, filters: Filters, signal?: AbortSignal): Promise<HeroTrend | null>;
  /** The top builds for a hero (meta, win rate, popular, Eternus). Null when the source has none. */
  heroBuilds(slug: string, filters: Filters, signal?: AbortSignal): Promise<HeroBuild[] | null>;
  /** Builds for the builds hub: every hero's most favorited, or one hero's when `heroSlug` is given. Null when the source has none. */
  allBuilds(signal?: AbortSignal, heroSlug?: string | null): Promise<HeroBuild[] | null>;
  /** Matches in progress right now. Null when the source has no live feed. */
  liveMatches(signal?: AbortSignal): Promise<LiveMatch[] | null>;
  /** Streams of the game that are live right now. Null when the source has no streams feed. */
  liveStreams(signal?: AbortSignal): Promise<LiveStream[] | null>;
  /** The game's latest update posts, newest first. Null when the source has none (the page shows its sample block). */
  patchNotes(signal?: AbortSignal): Promise<PatchNote[] | null>;

  // ---- Players ----
  /** One player's header: name, avatar, rank and hero record. Rejects when the lookup fails; never invents a real account. */
  player(accountId: number, signal?: AbortSignal): Promise<PlayerCore>;
  /** Every match the API has for the player, newest first. */
  playerMatches(accountId: number, signal?: AbortSignal): Promise<PlayerMatches>;
  /** Players they queue with most, with names. */
  playerMates(accountId: number, signal?: AbortSignal): Promise<PlayerMate[]>;
  /** Players by Steam name. */
  searchPlayers(query: string, signal?: AbortSignal): Promise<PlayerHit[]>;
  /** Names, avatars and ranks for a set of account ids (accounts the API has never seen are left out). */
  playerHits(accountIds: readonly number[], signal?: AbortSignal): Promise<Map<number, PlayerHit>>;
  /**
   * For each of the given games, the lobby's average badge: the API's own average when it reports one, else the other
   * players' badges going in (games where fewer than half the lobby has one are left out). Used to place a player by the lobbies matchmaking gives them.
   */
  lobbyRanks(accountId: number, matchIds: readonly number[], signal?: AbortSignal): Promise<Map<number, number>>;
  /** One finished game in full. Rejects with a 404 ApiError when the id is unknown. The sample source answers any id with its labelled sample game. */
  matchDetail(matchId: number, signal?: AbortSignal): Promise<MatchDetail>;
}

// ---------------------------------------------------------------------------------------------------------
// Samples
// ---------------------------------------------------------------------------------------------------------

/** Illustrative data: clearly labelled samples, available for Haze on Standard / Ranked / All ranks. */
export const fixtureSource: DataSource = {
  id: 'fixture',
  async heroOverview(slug, f) {
    if (slug !== 'haze') return null;
    if (f.mode === 'street_brawl') return HAZE_BRAWL;
    return f.queue === 'ranked' && f.rank === 'all' ? HAZE_OVERVIEW : null;
  },
  async tierList(f) {
    return { rows: sampleTierList(f), illustrative: true };
  },
  async leaderboard(region, heroSlug) {
    return sampleLeaderboard(region, heroSlug);
  },
  async headToHead() {
    return null;
  },
  async playerExtras() {
    return new Map();
  },
  async rankDistribution() {
    return sampleDistribution();
  },
  async heroTrend(slug) {
    return getHero(slug) ? sampleTrend(slug, todayUtc(), 140, slug === 'haze' ? HAZE_OVERVIEW.winRate : undefined) : null;
  },
  async heroBuilds(slug) {
    const list = sampleHeroBuilds(slug);
    return list.length ? list : null;
  },
  async allBuilds() {
    return allSampleBuilds();
  },
  async liveMatches() {
    return sampleMatches();
  },
  async liveStreams() {
    return sampleStreams();
  },
  async patchNotes() {
    return null;
  },
  async player(accountId) {
    return sampleCore(accountId);
  },
  async playerMatches(accountId) {
    return samplePlayerMatches(accountId);
  },
  async playerMates(accountId) {
    return sampleMates(accountId);
  },
  async searchPlayers() {
    return [];
  },
  async playerHits(ids) {
    return new Map(ids.map((id) => { const name = sampleName(id); return [id, { accountId: id, name, avatar: sampleAvatar(name) }]; }));
  },
  async matchDetail(matchId) {
    return sampleMatchDetail(matchId);
  },
  async lobbyRanks(accountId, matchIds) {
    // the sample lobbies sit within a few levels of the sample player's rank
    const lines = new Map(samplePlayerMatches(accountId).matches.map((m) => [m.id, m]));
    const own = sampleCore(accountId).rank?.badge;
    const out = new Map<number, number>();
    for (const id of matchIds) {
      const b = lines.get(id)?.badge ? own : undefined;
      if (!b) continue;
      const idx = Math.floor(b / 10) * 6 + (b % 10) - 1 + ((id * 7919) % 7) - 3;
      const i = Math.min(71, Math.max(6, idx));
      out.set(id, Math.floor(i / 6) * 10 + (i % 6) + 1);
    }
    return out;
  },
};

// ---------------------------------------------------------------------------------------------------------
// Live
// ---------------------------------------------------------------------------------------------------------

const isAbort = (e: unknown, signal?: AbortSignal): boolean => !!signal?.aborted || (e instanceof DOMException && e.name === 'AbortError');

/** For optional extras: a failure leaves them out instead of breaking the page, but an abort still stops everything. */
async function soft<T>(p: Promise<T>, signal?: AbortSignal): Promise<T | null> {
  try { return await p; } catch (e) { if (isAbort(e, signal)) throw e; return null; }
}

/** Ban filters: the endpoint only understands the queue and the rank and time ranges. */
const banFilters = (f: Filters) => {
  const { match_mode, min_average_badge, max_average_badge } = toApiFilters(f);
  return { match_mode, min_average_badge, max_average_badge };
};

/** Patch posts that mark a change to the game (the forum's dated notes and Steam posts titled as updates), as trend markers. */
const patchDates = (entries: Awaited<ReturnType<DeadlockApi['patches']>>) =>
  patchMarks((entries ?? []).filter((p) => p.source === 'forum' || /update|patch/i.test(p.title ?? '')));

/**
 * The live source, reading the Deadlock API (api.deadlock-api.com). Every mapping here was checked against the running
 * service on 8 Oct 2026; the unit tests run the same mappings on saved responses (api-samples/).
 *
 * Not connected yet: the hero overview's skill order, guides, damage and high rolls (their endpoints are different and larger).
 */
export function createLiveSource(api = new DeadlockApi()): DataSource {
  const heroIds = async (signal?: AbortSignal): Promise<HeroIdMap> => buildHeroIdMap(await api.heroes(signal));

  /** Steam names and ranks of build authors, for the byline and the Eternus filter. Missing lookups just leave them blank. */
  async function buildAuthors(accountIds: number[], signal?: AbortSignal): Promise<Map<number, { name?: string; badge?: number }>> {
    const uniq = [...new Set(accountIds)];
    const [profiles, ranks] = await Promise.all([soft(api.steamProfiles(uniq, signal), signal), soft(api.playerRanks(uniq, signal), signal)]);
    const out = new Map<number, { name?: string; badge?: number }>();
    for (const p of profiles ?? []) out.set(p.account_id, { name: p.personaname?.trim() || undefined });
    for (const r of ranks ?? []) if (r.account_id !== undefined) out.set(r.account_id, { ...out.get(r.account_id), badge: r.badge });
    return out;
  }

  /** Every hero with its numbers for these filters. The API's calls are cached, so the hero, tier and trend pages share them. */
  async function liveTier(f: Filters, signal?: AbortSignal) {
    const [ids, stats] = await Promise.all([heroIds(signal), api.heroStats(toApiFilters(f), signal)]);
    const brawl = f.mode === 'street_brawl';
    const [bans, daily] = await Promise.all([
      brawl ? Promise.resolve(null) : soft(api.heroBanStats(banFilters(f), signal), signal),
      soft(api.heroStats({ ...toApiFilters(f), bucket: 'start_time_day', min_unix_timestamp: todayUtc() - 14 * DAY }, signal), signal),
    ]);
    return { ids, rows: buildTierRows({ stats, bans, daily, ids }) };
  }

  /** Profiles and ranks for a set of accounts; whichever call fails is simply missing from the answer. */
  async function lookup(accountIds: readonly number[], signal?: AbortSignal) {
    const [profiles, ranks] = await Promise.all([soft(api.steamProfiles(accountIds, signal), signal), soft(api.playerRanks(accountIds, signal), signal)]);
    const profile = new Map<number, SteamProfile>((profiles ?? []).map((p) => [p.account_id, p]));
    const rank = new Map<number, PlayerRankRaw>((ranks ?? []).filter((r) => typeof r.account_id === 'number').map((r) => [r.account_id as number, r]));
    return { profile, rank };
  }

  return {
    id: 'live',

    async heroOverview(slug, f, signal) {
      if (!getHero(slug)) return null;
      const { ids, rows } = await liveTier(f, signal);
      const heroId = ids.idBySlug(slug);
      if (heroId === undefined || !rows.some((r) => r.slug === slug)) return null;
      let matchups: MatchupGroup[] = [];
      if (f.mode === 'standard') {
        const filters = toApiFilters(f);
        const [counters, synergy] = await Promise.all([
          soft(api.heroCounterStats({ ...filters, same_lane_filter: false, min_matches: 50 }, signal), signal),
          soft(api.heroSynergyStats({ ...filters, same_lane_filter: true, min_matches: 50 }, signal), signal),
        ]);
        const lookupHero = { byId: (id: number) => { const s = ids.slugById(id); const h = s ? getHero(s) : undefined; return h ? { slug: h.slug, name: h.name } : undefined; } };
        matchups = [
          ...(counters ? buildPickColumns(heroId, counters, lookupHero) : []),
          ...(synergy ? [buildSynergyColumn(heroId, synergy, lookupHero)].filter((g): g is MatchupGroup => g !== null) : []),
        ];
      }
      return liveOverview(slug, rows, matchups);
    },

    async tierList(f, signal) {
      const { rows } = await liveTier(f, signal);
      return { rows, illustrative: false, note: rows.length ? undefined : 'Not enough games with these filters yet.' };
    },

    async leaderboard(region, heroSlug, signal) {
      const ids = await heroIds(signal);
      let heroId: number | undefined;
      if (heroSlug) {
        heroId = ids.idBySlug(heroSlug);
        if (heroId === undefined) return [];
      }
      return normalizeLeaderboard(await api.leaderboard(region, heroId, signal), ids.slugById, heroSlug ?? undefined);
    },

    async playerExtras(entries, heroSlug, signal) {
      const out = new Map<number, PlayerExtras>();
      if (!entries.length) return out;
      const ids = await heroIds(signal);
      const heroId = heroSlug ? ids.idBySlug(heroSlug) : undefined;

      // A name can belong to many accounts. Look up the plausible ones for each row, then pick the most likely.
      const pool = new Set<number>();
      for (const e of entries) {
        if (e.accountId !== undefined) pool.add(e.accountId);
        else if (e.candidates && e.candidates.length <= MAX_CANDIDATES) e.candidates.forEach((c) => pool.add(c));
      }
      const { profile, rank } = await lookup([...pool], signal);
      const info = new Map<number, CandidateInfo>();
      for (const id of pool) {
        if (!profile.has(id) && !rank.has(id)) continue;
        info.set(id, { matches30d: profile.get(id)?.matches_played_last_30d, badge: rank.get(id)?.badge });
      }

      const chosen = new Map<number, number>(); // row rank -> account id
      for (const e of entries) {
        if (e.accountId !== undefined) { chosen.set(e.rank, e.accountId); continue; }
        if (!e.candidates || e.candidates.length > MAX_CANDIDATES) continue;
        const r = resolveCandidates(e.candidates, info);
        if (!r) continue;
        chosen.set(e.rank, r.accountId);
        out.set(e.rank, { accountId: r.accountId, alt: r.certain || !r.alt.length ? undefined : r.alt });
      }
      for (const [rowRank, id] of chosen) {
        const p = profile.get(id);
        const b = rank.get(id)?.badge;
        out.set(rowRank, { ...out.get(rowRank), accountId: id, avatar: p?.avatarmedium || p?.avatar || p?.avatarfull, badge: b && b > 0 ? b : undefined });
      }

      // Record: on a hero board the record on that hero, otherwise all heroes together.
      const records = await soft(api.playerHeroStats([...new Set(chosen.values())], { heroId }, signal), signal);
      if (records) {
        const by = new Map<number, { m: number; w: number }>();
        for (const r of records) {
          const a = by.get(r.account_id) ?? { m: 0, w: 0 };
          a.m += r.matches_played; a.w += r.wins;
          by.set(r.account_id, a);
        }
        for (const [rowRank, id] of chosen) {
          const a = by.get(id);
          if (a && a.m > 0) out.set(rowRank, { ...out.get(rowRank), wins: a.w, losses: a.m - a.w });
        }
      }
      return out;
    },

    async heroTrend(slug, f, signal) {
      const ids = await heroIds(signal);
      const id = ids.idBySlug(slug);
      if (id === undefined) return null;
      const since = todayUtc() - 120 * DAY;
      const [rows, patches] = await Promise.all([
        api.heroStats({ ...toApiFilters(f), bucket: 'start_time_day', min_unix_timestamp: since }, signal),
        soft(api.patches(signal), signal),
      ]);
      return normalizeTrend(rows, id, patchDates(patches ?? []));
    },

    // Published in-game builds (/v1/builds) with their games and wins (/v1/analytics/hero-build-stats). Two rounds of
    // requests after the hero list: the builds and stats together, then the authors and any missing top builds together.
    async heroBuilds(slug, f, signal) {
      const ids = await heroIds(signal);
      const id = ids.idBySlug(slug);
      if (id === undefined) return null;
      const [top, weekly, stats] = await Promise.all([
        api.builds({ hero_id: id, limit: 12 }, signal),
        soft(api.builds({ hero_id: id, sort_by: 'weekly_favorites', limit: 6 }, signal), signal),
        soft(api.heroBuildStats(id, { ...toApiFilters(f), min_matches: 10 }, signal), signal),
      ]);
      const byId = new Map((stats ?? []).map((r) => [r.hero_build_id, r]));
      // the most played and best performing builds may not be among the most favorited: fetch those few by id
      const have = new Set([...top, ...(weekly ?? [])].map((b) => b.hero_build.hero_build_id));
      const played = [...byId.values()].sort((a, b) => b.matches - a.matches);
      const best = played.filter((r) => r.matches >= BEST_MIN_GAMES).sort((a, b) => buildResultScore(b.wins, b.matches) - buildResultScore(a.wins, a.matches));
      const extraIds = [...new Set([played[0], best[0]].filter((r) => r && !have.has(r.hero_build_id)).map((r) => r!.hero_build_id))];
      const [extra, authors] = await Promise.all([
        Promise.all(extraIds.map((bid) => soft(api.builds({ build_id: bid, limit: 1 }, signal), signal))).then((x) => x.flatMap((l) => l ?? [])),
        buildAuthors([...top, ...(weekly ?? [])].map((b) => b.hero_build.author_account_id), signal),
      ]);
      const ctx = { slugById: ids.slugById, stats: byId, authors };
      const norm = (list: BuildRaw[]) => list.map((b) => normalizeBuild(b, ctx)).filter((b): b is HeroBuild => !!b && b.heroSlug === slug);
      const tabs = heroBuildTabs(norm([...top, ...extra]), norm(weekly ?? []));
      return tabs.length ? tabs : null;
    },
    // The hub asks for one list: the most favorited builds across every hero, or one hero's builds with their games.
    async allBuilds(signal, heroSlug) {
      const ids = await heroIds(signal);
      const id = heroSlug ? ids.idBySlug(heroSlug) : undefined;
      if (heroSlug && id === undefined) return null;
      const [list, weekly, stats] = await Promise.all([
        api.builds(id !== undefined ? { hero_id: id, limit: 40 } : { limit: 120 }, signal),
        soft(api.builds(id !== undefined ? { hero_id: id, sort_by: 'weekly_favorites', limit: 10 } : { sort_by: 'weekly_favorites', limit: 40 }, signal), signal),
        id !== undefined ? soft(api.heroBuildStats(id, { min_matches: 10 }, signal), signal) : Promise.resolve(null),
      ]);
      const seen = new Set<number>();
      const raws = [...list, ...(weekly ?? [])].filter((b) => !seen.has(b.hero_build.hero_build_id) && !!seen.add(b.hero_build.hero_build_id));
      if (!raws.length) return null;
      const authors = await buildAuthors(raws.map((b) => b.hero_build.author_account_id), signal);
      const statMap = new Map((stats ?? []).map((r) => [r.hero_build_id, r]));
      return raws.map((b) => normalizeBuild(b, { slugById: ids.slugById, stats: statMap, authors })).filter((b): b is HeroBuild => !!b);
    },

    async liveMatches(signal) {
      const ids = await heroIds(signal);
      return normalizeMatches(await api.activeMatches(signal), ids.slugById);
    },

    // Streams come from Broadway's own proxy (server/proxy.mjs /streams), which holds the Twitch credentials.
    async liveStreams(signal) {
      const base = (import.meta.env.VITE_STREAMS_BASE as string | undefined)?.replace(/\/$/, '');
      if (!base) return null;
      const res = await fetch(`${base}/streams`, { signal, headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`Streams service answered ${res.status}`);
      return normalizeStreams(await res.json());
    },

    async patchNotes(signal) {
      return normalizePatches(await api.patches(signal));
    },

    // The distribution endpoint counts players at each of the 66 levels and takes no filters.
    async rankDistribution(_f, signal) {
      return normalizePlayerDistribution(await api.rankDistribution(signal));
    },

    async headToHead(a, b, f, signal) {
      const ids = await heroIds(signal);
      const ida = ids.idBySlug(a), idb = ids.idBySlug(b);
      if (ida === undefined || idb === undefined) return null;
      // same_lane_filter=false so the record covers whole matches, not just lane opponents.
      const rows = await api.heroCounterStats({ ...toApiFilters(f), same_lane_filter: false, min_matches: 1 }, signal);
      const row = rows.find((r) => r.hero_id === ida && r.enemy_hero_id === idb);
      return row ? { matches: row.matches_played, winsA: row.wins } : null;
    },

    // ---- Players -----------------------------------------------------------------------------------------

    async player(accountId, signal) {
      const ids = await heroIds(signal);
      const [steam, rank, heroRows] = await Promise.allSettled([api.steamProfiles([accountId], signal), api.playerRanks([accountId], signal), api.playerHeroStats([accountId], {}, signal)]);
      if (steam.status === 'rejected' && rank.status === 'rejected' && heroRows.status === 'rejected') throw steam.reason;
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      return buildCore(accountId, {
        steam: steam.status === 'fulfilled' ? steam.value.find((p) => p.account_id === accountId) ?? null : null,
        rank: rank.status === 'fulfilled' ? rank.value.find((r) => r.account_id === accountId) ?? rank.value[0] ?? null : null,
        heroRows: heroRows.status === 'fulfilled' ? heroRows.value.filter((r) => r.account_id === accountId) : [],
        ids,
      });
    },

    async playerMatches(accountId, signal) {
      const [rows, ids] = await Promise.all([api.matchHistory(accountId, signal), heroIds(signal)]);
      return normalizeHistory(rows, ids);
    },

    async playerMates(accountId, signal) {
      const rows = (await api.mateStats(accountId, 5, signal)).filter((r) => r.mate_id !== accountId).sort((a, b) => b.matches_played - a.matches_played).slice(0, 8);
      if (!rows.length) return [];
      const profiles = await soft(api.steamProfiles(rows.map((r) => r.mate_id), signal), signal);
      const by = new Map((profiles ?? []).map((p) => [p.account_id, p]));
      return rows.map((r) => {
        const p = by.get(r.mate_id);
        return { accountId: r.mate_id, name: p?.personaname?.trim() || undefined, avatar: p?.avatarmedium || p?.avatar, matches: r.matches_played, wins: r.wins };
      });
    },

    async searchPlayers(query, signal) {
      const q = query.trim();
      if (q.length < 3) return [];
      return (await api.steamSearch(q, 8, signal)).map(hitFromProfile);
    },

    async playerHits(accountIds, signal) {
      const out = new Map<number, PlayerHit>();
      if (!accountIds.length) return out;
      const { profile, rank } = await lookup(accountIds, signal);
      for (const id of new Set(accountIds)) {
        const p = profile.get(id);
        if (!p && !rank.has(id)) continue;
        const hit = p ? hitFromProfile(p) : { accountId: id, name: `Player ${id}` };
        out.set(id, { ...hit, rankBadge: normalizeRank(rank.get(id))?.badge });
      }
      return out;
    },

    async matchDetail(matchId, signal) {
      const [raw, ids] = await Promise.all([api.matchMetadata(matchId, signal), heroIds(signal)]);
      return normalizeMatch(raw, ids);
    },

    async lobbyRanks(accountId, matchIds, signal) {
      const out = new Map<number, number>();
      for (const m of await api.matchLobbies(matchIds, signal)) {
        // the API's lobby average when it has one (older standard games carry it too), else the other players' badges
        const others = m.players.filter((p) => p.account_id !== accountId).map((p) => ({ badge: p.player_rank_initial_display_rank }));
        const avg = m.average_badge && m.average_badge > 0 ? m.average_badge : avgBadgeOf(others, 6);
        if (avg) out.set(m.match_id, avg);
      }
      return out;
    },
  };
}

// ---------------------------------------------------------------------------------------------------------
// Live with labelled samples where the live version is missing or unreachable
// ---------------------------------------------------------------------------------------------------------

/**
 * What the site actually runs on when the data mode is "live". Lists that the API cannot be reached for fall back to
 * the labelled sample (and the header says so); the player pages never do, because a made-up profile for a real account
 * is worse than an error. Build data is not connected yet, so builds stay on labelled samples.
 */
export function createHybridSource(live: DataSource, sample: DataSource): DataSource {
  async function guard<T>(call: () => Promise<T>, fallback: () => Promise<T>, signal?: AbortSignal, rethrowIfNoSample = false): Promise<T> {
    try {
      const v = await call();
      reportHealthy();
      return v;
    } catch (e) {
      if (isAbort(e, signal)) throw e;
      const s = await fallback();
      if (rethrowIfNoSample && s == null) throw e;
      reportDegraded(e instanceof Error ? e.message : 'The Deadlock API could not be reached');
      return s;
    }
  }
  /** Player lookups are never replaced by samples. A failure still shows in the header chip, unless the API simply answered "not found". */
  async function watch<T>(call: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    try {
      const v = await call();
      reportHealthy();
      return v;
    } catch (e) {
      if (isAbort(e, signal)) throw e;
      const answered = e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 429;
      if (!answered) reportDegraded(e instanceof Error ? e.message : 'The Deadlock API could not be reached');
      throw e;
    }
  }
  return {
    ...live,
    player: (id, signal) => watch(() => live.player(id, signal), signal),
    playerMatches: (id, signal) => watch(() => live.playerMatches(id, signal), signal),
    playerMates: (id, signal) => watch(() => live.playerMates(id, signal), signal),
    matchDetail: (id, signal) => watch(() => live.matchDetail(id, signal), signal),
    lobbyRanks: (id, ids, signal) => watch(() => live.lobbyRanks(id, ids, signal), signal),
    searchPlayers: (q, signal) => watch(() => live.searchPlayers(q, signal), signal),
    heroOverview: (slug, f, signal) => guard(() => live.heroOverview(slug, f, signal), () => sample.heroOverview(slug, f, signal), signal, true),
    tierList: (f, signal) => guard(() => live.tierList(f, signal), () => sample.tierList(f, signal), signal),
    leaderboard: (region, hero, signal) => guard(() => live.leaderboard(region, hero, signal), () => sample.leaderboard(region, hero, signal), signal),
    rankDistribution: (f, signal) => guard(() => live.rankDistribution(f, signal), () => sample.rankDistribution(f, signal), signal),
    heroTrend: (slug, f, signal) => guard(() => live.heroTrend(slug, f, signal), () => sample.heroTrend(slug, f, signal), signal, true),
    liveMatches: (signal) => guard(() => live.liveMatches(signal), () => sample.liveMatches(signal), signal),
    patchNotes: (signal) => guard(() => live.patchNotes(signal), () => sample.patchNotes(signal), signal),
    heroBuilds: (slug, f, signal) => guard(() => live.heroBuilds(slug, f, signal), () => sample.heroBuilds(slug, f, signal), signal),
    allBuilds: (signal, hero) => guard(() => live.allBuilds(signal, hero), () => sample.allBuilds(signal, hero), signal),
    liveStreams: async (signal) => (await live.liveStreams(signal).catch((e) => { if (isAbort(e, signal)) throw e; return null; })) ?? sample.liveStreams(signal),
  };
}

export const dataSource: DataSource = dataMode === 'live' ? createHybridSource(createLiveSource(), fixtureSource) : fixtureSource;
