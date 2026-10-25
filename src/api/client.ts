import type {
  AbilityOrderRow, ActiveMatchRaw, AnalyticsFilters, AssetHero, AssetRank, BadgeDistributionRow, BuildRaw, EnemyRow, HeroBanRow, HeroBuildStatsRow, HeroCounterRow,
  HeroStatsRow, HeroSynergyRow, ItemStatsRow, LeaderboardRaw, MateRow, MatchHistoryRow, MatchMetadataRaw, PatchEntry, PlayerHeroStatsRow, PlayerRankRaw,
  RankDistributionRow, SteamProfile,
} from './types';

/**
 * Thin client for the Deadlock API (https://api.deadlock-api.com).
 *
 * - Checked against the live service on 8 Oct 2026. The API sends `access-control-allow-origin: *`, so a browser can
 *   call it directly; for a busy site, point VITE_API_BASE at server/proxy.mjs so one cache serves everyone.
 * - Analytics endpoints share one rate limit (200 req/min per IP, 400 per key, 2000 global) and the server caches
 *   results for hours, so identical queries are cached here too and de-duplicated while in flight.
 * - Player endpoints that take `account_ids` are split into chunks so the URL stays short and one slow player
 *   cannot stall a whole page.
 * - Never ship an API key in the browser bundle.
 */

const SIX_HOURS = 6 * 60 * 60 * 1000;
const FIVE_MIN = 5 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 30_000;
/** Set VITE_API_BASE to your own proxy (see server/proxy.mjs). Falls back to the public API. */
const DEFAULT_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || 'https://api.deadlock-api.com';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;

export interface ClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

/** Splits a list into groups of at most `size`. */
export function chunk<T>(list: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** Runs `fn` over `items` with at most `limit` in flight, keeping the input order. */
export async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** Lets one caller stop waiting for a shared request without cancelling it for the others. */
function waitFor<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return p;
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    p.then(
      (v) => { signal.removeEventListener('abort', onAbort); resolve(v); },
      (e) => { signal.removeEventListener('abort', onAbort); reject(e); },
    );
  });
}

export class DeadlockApi {
  private baseUrl: string;
  private fetchImpl: typeof fetch;
  private now: () => number;
  private cache = new Map<string, { at: number; ttl: number; value: unknown }>();
  private inflight = new Map<string, Promise<unknown>>();

  constructor(opts: ClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE).replace(/\/$/, '');
    this.fetchImpl = opts.fetchImpl ?? ((...a) => fetch(...a));
    this.now = opts.now ?? Date.now;
  }

  static buildUrl(base: string, path: string, params: Params = {}): string {
    const qs = new URLSearchParams();
    for (const key of Object.keys(params).sort()) {
      const v = params[key];
      if (v !== undefined && v !== null && v !== '') qs.set(key, String(v));
    }
    const q = qs.toString();
    return `${base}${path}${q ? `?${q}` : ''}`;
  }

  /** One network call with a timeout. It is shared by every caller waiting on the same URL, so it never listens to one caller's signal. */
  private async fetchJson(url: string): Promise<Response> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      return await this.fetchImpl(url, { signal: ctl.signal, headers: { accept: 'application/json' } });
    } finally {
      clearTimeout(timer);
    }
  }

  private async request<T>(path: string, params: Params = {}, ttl = SIX_HOURS, signal?: AbortSignal): Promise<T> {
    const url = DeadlockApi.buildUrl(this.baseUrl, path, params);
    const hit = this.cache.get(url);
    if (hit && this.now() - hit.at < hit.ttl) return hit.value as T;
    let run = this.inflight.get(url) as Promise<T> | undefined;
    if (!run) {
      run = (async () => {
        let res = await this.fetchJson(url);
        if (res.status === 429) {
          const wait = Math.min(Number(res.headers.get('retry-after')) || 2, 10) * 1000;
          await new Promise((r) => setTimeout(r, wait));
          res = await this.fetchJson(url);
        }
        if (!res.ok) throw new ApiError(res.status, `${path} failed with HTTP ${res.status}`);
        const value = (await res.json()) as T;
        this.cache.set(url, { at: this.now(), ttl, value });
        return value;
      })().finally(() => this.inflight.delete(url));
      this.inflight.set(url, run);
    }
    return waitFor(run, signal);
  }

  // ---- Builds -------------------------------------------------------------------------------------------------

  /** Published in-game builds, latest version of each, most favourited first unless `sort_by` says otherwise. */
  builds(q: { hero_id?: number; sort_by?: 'favorites' | 'weekly_favorites' | 'updated_at'; limit?: number; build_id?: number } = {}, signal?: AbortSignal) {
    return this.request<BuildRaw[]>('/v1/builds', { only_latest: true, sort_by: q.sort_by ?? 'favorites', sort_direction: 'desc', limit: q.limit ?? 20, hero_id: q.hero_id, build_id: q.build_id }, SIX_HOURS, signal);
  }

  /** Wins and games for each published build of a hero, from matches where the build was in use. */
  heroBuildStats(heroId: number, f: AnalyticsFilters = {}, signal?: AbortSignal) {
    return this.request<HeroBuildStatsRow[]>(`/v1/analytics/hero-build-stats/${heroId}`, { ...f }, SIX_HOURS, signal);
  }

  // ---- Analytics --------------------------------------------------------------------------------------------

  heroStats(f: AnalyticsFilters & { bucket?: 'no_bucket' | 'start_time_day' | 'avg_badge'; account_id?: number } = {}, signal?: AbortSignal) {
    return this.request<HeroStatsRow[]>('/v1/analytics/hero-stats', { bucket: 'no_bucket', ...f }, SIX_HOURS, signal);
  }

  /** Hero-versus-hero results. `same_lane_filter` defaults to true on the server: lane opponents only. */
  heroCounterStats(f: AnalyticsFilters & { same_lane_filter?: boolean } = {}, signal?: AbortSignal) {
    return this.request<HeroCounterRow[]>('/v1/analytics/hero-counter-stats', { ...f }, SIX_HOURS, signal);
  }

  heroSynergyStats(f: AnalyticsFilters & { same_lane_filter?: boolean } = {}, signal?: AbortSignal) {
    return this.request<HeroSynergyRow[]>('/v1/analytics/hero-synergy-stats', { ...f }, SIX_HOURS, signal);
  }

  /** Ban counts per hero. Only `match_mode` and the rank/time filters apply. */
  heroBanStats(f: Pick<AnalyticsFilters, 'match_mode' | 'min_average_badge' | 'max_average_badge' | 'min_unix_timestamp' | 'max_unix_timestamp'> = {}, signal?: AbortSignal) {
    return this.request<HeroBanRow[]>('/v1/analytics/hero-ban-stats', { bucket: 'no_bucket', ...f }, SIX_HOURS, signal);
  }

  abilityOrderStats(heroId: number, f: AnalyticsFilters = {}, signal?: AbortSignal) {
    return this.request<AbilityOrderRow[]>('/v1/analytics/ability-order-stats', { hero_id: heroId, ...f }, SIX_HOURS, signal);
  }

  itemStats(f: AnalyticsFilters & { hero_id?: number; bucket?: string } = {}, signal?: AbortSignal) {
    return this.request<ItemStatsRow[]>('/v1/analytics/item-stats', { bucket: 'no_bucket', ...f }, SIX_HOURS, signal);
  }

  /** How many games were played at each of the 66 levels. */
  badgeDistribution(f: AnalyticsFilters = {}, signal?: AbortSignal) {
    return this.request<BadgeDistributionRow[]>('/v1/analytics/badge-distribution', { ...f }, SIX_HOURS, signal);
  }

  // ---- Players ----------------------------------------------------------------------------------------------

  /** How many players sit at each of the 66 levels right now. */
  rankDistribution(signal?: AbortSignal) {
    return this.request<RankDistributionRow[]>('/v1/players/rank/distribution', {}, 30 * 60 * 1000, signal);
  }

  steamSearch(query: string, limit = 8, signal?: AbortSignal) {
    return this.request<SteamProfile[]>('/v1/players/steam-search', { search_query: query, limit }, FIVE_MIN, signal);
  }

  /** Steam name and avatar for any number of accounts (fetched 100 at a time). Accounts the API has never seen are left out. */
  async steamProfiles(accountIds: readonly number[], signal?: AbortSignal): Promise<SteamProfile[]> {
    const parts = await mapLimit(chunk([...new Set(accountIds)], 100), 3, (ids) =>
      this.request<SteamProfile[]>('/v1/players/steam', { account_ids: ids.join(',') }, 60 * 60 * 1000, signal),
    );
    return parts.flat();
  }

  /** Current rank of any number of accounts (fetched 100 at a time). */
  async playerRanks(accountIds: readonly number[], signal?: AbortSignal): Promise<PlayerRankRaw[]> {
    const parts = await mapLimit(chunk([...new Set(accountIds)], 100), 3, (ids) =>
      this.request<PlayerRankRaw[]>('/v1/players/rank', { account_ids: ids.join(',') }, FIVE_MIN, signal),
    );
    return parts.flat();
  }

  /** All-time record per hero for each account (fetched 20 accounts at a time: the rows are large). */
  async playerHeroStats(accountIds: readonly number[], opts: { heroId?: number } = {}, signal?: AbortSignal): Promise<PlayerHeroStatsRow[]> {
    const parts = await mapLimit(chunk([...new Set(accountIds)], 20), 3, (ids) =>
      this.request<PlayerHeroStatsRow[]>('/v1/players/hero-stats', { account_ids: ids.join(','), hero_ids: opts.heroId }, 15 * 60 * 1000, signal),
    );
    return parts.flat();
  }

  /** Every match the API has for the account, newest first. Large for veterans (a few MB), cached for five minutes. */
  matchHistory(accountId: number, signal?: AbortSignal) {
    return this.request<MatchHistoryRow[]>(`/v1/players/${accountId}/match-history`, {}, FIVE_MIN, signal);
  }

  /**
   * One finished game in full: both teams, every player's items, souls over time and final numbers (400-500 KB). An unknown id
   * answers HTTP 404, which surfaces as an ApiError. A finished game never changes, so it is cached for a day.
   */
  async matchMetadata(matchId: number, signal?: AbortSignal): Promise<MatchMetadataRaw> {
    const rows = await this.request<MatchMetadataRaw[]>('/v1/matches/metadata', {
      match_ids: matchId, limit: 1,
      include_info: true, include_more_info: true, include_player_info: true, include_player_kda: true,
      include_player_final_stats: true, include_player_items: true, include_player_stats: true,
    }, DAY, signal);
    const row = rows.find((r) => r.match_id === matchId) ?? rows[0];
    if (!row) throw new ApiError(404, `Match ${matchId} was not found`);
    return row;
  }

  /** Players this account has shared a team with, most games first in practice. */
  mateStats(accountId: number, minMatches = 5, signal?: AbortSignal) {
    return this.request<MateRow[]>(`/v1/players/${accountId}/mate-stats`, { min_matches_played: minMatches }, 30 * 60 * 1000, signal);
  }

  enemyStats(accountId: number, minMatches = 5, signal?: AbortSignal) {
    return this.request<EnemyRow[]>(`/v1/players/${accountId}/enemy-stats`, { min_matches_played: minMatches }, 30 * 60 * 1000, signal);
  }

  // ---- Assets, boards and feeds -----------------------------------------------------------------------------

  heroes(signal?: AbortSignal) {
    return this.request<AssetHero[]>('/v1/assets/heroes', { only_active: true }, DAY, signal);
  }

  ranks(signal?: AbortSignal) {
    return this.request<AssetRank[]>('/v1/assets/ranks', {}, DAY, signal);
  }

  /**
   * Official leaderboard, up to 1,000 entries. `region` is Europe | Asia | NAmerica | SAmerica | Oceania; add a hero id
   * for a per-hero ladder. Entries carry a name, one or more candidate account ids, a rank and (on the overall board)
   * up to three top hero ids. They carry no rank badge, avatar or record: those come from the player endpoints.
   */
  leaderboard(region: string, heroId?: number, signal?: AbortSignal) {
    return this.request<LeaderboardRaw>(`/v1/leaderboard/${region}${heroId !== undefined ? `/${heroId}` : ''}`, {}, 15 * 60 * 1000, signal);
  }

  /** Matches in progress right now (about 150). Short cache because the list changes by the minute. */
  activeMatches(signal?: AbortSignal) {
    return this.request<ActiveMatchRaw[]>('/v1/matches/active', {}, 15_000, signal);
  }

  patches(signal?: AbortSignal) {
    return this.request<PatchEntry[]>('/v2/patches', {}, 30 * 60 * 1000, signal);
  }
}
