import { RANKS } from './types';
import { ROMAN, TIER_NUMBER } from './ranks';
import type { LeaderboardEntryRaw, LeaderboardRaw } from '../api/types';

/** Leaderboard regions as the Deadlock API names them (path segment of /v1/leaderboard/{region}). */
export type Region = 'NAmerica' | 'Europe' | 'Asia' | 'SAmerica' | 'Oceania';
export const REGIONS: { id: Region; label: string }[] = [
  { id: 'NAmerica', label: 'North America' },
  { id: 'Europe', label: 'Europe' },
  { id: 'Asia', label: 'Asia' },
  { id: 'SAmerica', label: 'South America' },
  { id: 'Oceania', label: 'Oceania' },
];

/** The leaderboard shows the top 100 first and lets people scroll on to the top 500. */
export const PAGE_SIZE = 100;
export const MAX_ROWS = 500;
export const PAGES = MAX_ROWS / PAGE_SIZE;

export interface LeaderboardEntry {
  rank: number;
  name: string;
  /** Steam account id when it is known for certain (links straight to the player page). */
  accountId?: number;
  /** Every account that has this name. More than one means the board cannot say which is meant until extras resolve it. */
  candidates?: number[];
  /** Other accounts with the same name, when `accountId` is a best guess rather than certain. */
  alt?: number[];
  /** Badge level 0-116: tier in the leading digits, level 1-6 in the last digit (116 = Eternus star). */
  badge: number;
  /** Hero slugs, most played first. */
  topHeroes: string[];
  /** Steam avatar image URL. */
  avatar?: string;
  /** Match record. For a hero board this is the record on that hero. */
  wins?: number;
  losses?: number;
}

/**
 * Extra per-player details fetched for the rows on screen, keyed by the row's rank. The official board has names only,
 * and a name can belong to several accounts, so this is also where a row learns which account it most likely is.
 */
export interface PlayerExtras {
  accountId?: number;
  /** Other accounts that share the name (set when the match above is a best guess). */
  alt?: number[];
  avatar?: string;
  badge?: number;
  wins?: number;
  losses?: number;
  /** Their three most played heroes (all heroes boards only), most games first. */
  heroes?: string[];
}

/** A name shared by more accounts than this is not worth resolving: the lookup would cost hundreds of calls for one row. */
export const MAX_CANDIDATES = 12;

export interface CandidateInfo { matches30d?: number; badge?: number }
export interface Resolution { accountId: number; alt: number[]; certain: boolean }

/**
 * The official board lists names, and one name can belong to many accounts. The board only lists players who were active
 * (75 games in 30 days overall, 30 on a hero), so accounts that have not played lately are ruled out first; of those left
 * the highest rank wins, then the busiest. `certain` is true only when exactly one account passed the activity test.
 */
export function resolveCandidates(candidates: readonly number[], info: ReadonlyMap<number, CandidateInfo>, minMatches = 30): Resolution | null {
  const known = candidates.filter((c) => info.has(c));
  if (!known.length) return null;
  const active = known.filter((c) => (info.get(c)!.matches30d ?? 0) >= minMatches);
  const pool = active.length ? active : known;
  const best = [...pool].sort((a, b) => (info.get(b)!.badge ?? 0) - (info.get(a)!.badge ?? 0) || (info.get(b)!.matches30d ?? 0) - (info.get(a)!.matches30d ?? 0))[0];
  return { accountId: best, alt: candidates.filter((c) => c !== best), certain: active.length === 1 };
}

/** Where a row's name leads: the player page when the account is known, a name search when it is not. */
export function playerHref(e: Pick<LeaderboardEntry, 'accountId' | 'alt' | 'name'>): string | null {
  if (e.accountId !== undefined) return `/player/${e.accountId}${e.alt?.length ? `?alt=${e.alt.slice(0, 11).join(',')}` : ''}`;
  return `/player?q=${encodeURIComponent(e.name)}`;
}

export const winRate = (e: { wins?: number; losses?: number }): number | null => {
  const n = (e.wins ?? 0) + (e.losses ?? 0);
  return e.wins === undefined || e.losses === undefined || n === 0 ? null : (e.wins / n) * 100;
};

const tierName = (t: number): string => (t === 0 ? 'Obscurus' : RANKS[RANKS.length - t] ?? 'Obscurus');

/** Splits a 0-116 badge level into the rank name and its 1-6 level. */
export function badgeParts(level: number): { rank: string; tier: number; sub: number } {
  const tier = Math.max(0, Math.min(11, Math.floor(level / 10)));
  const sub = tier === 0 ? 0 : Math.max(1, Math.min(6, level % 10 || 1));
  return { rank: tierName(tier), tier, sub };
}

export function badgeLabel(level: number): string {
  const { rank, sub } = badgeParts(level);
  return sub ? `${rank} ${ROMAN[sub]}` : rank;
}

// ---------------------------------------------------------------------------------------------------------
// Live response normalising. Shape checked against /v1/leaderboard/{region}[/{hero_id}] on 8 Oct 2026:
//   { entries: [{ rank, account_name, possible_account_ids: number[], top_hero_ids: number[] }] }, up to 1,000 entries.
// The board has no badge, avatar or record. Those are filled in for the rows on screen (playerExtras).
// ---------------------------------------------------------------------------------------------------------

export function normalizeLeaderboard(raw: unknown, heroSlugById: (id: number) => string | undefined, heroSlug?: string): LeaderboardEntry[] {
  const list: Partial<LeaderboardEntryRaw>[] = Array.isArray(raw) ? raw : Array.isArray((raw as { entries?: unknown })?.entries) ? ((raw as LeaderboardRaw).entries) : [];
  return list.slice(0, MAX_ROWS).map((e, i) => {
    const ids = (e.possible_account_ids ?? []).filter((n): n is number => typeof n === 'number' && n > 0);
    const heroes = heroSlug ? [heroSlug] : (e.top_hero_ids ?? []).map((id) => heroSlugById(id)).filter((s): s is string => !!s).slice(0, 3);
    return {
      rank: e.rank ?? i + 1,
      name: e.account_name?.trim() || 'Unknown player',
      accountId: ids.length === 1 ? ids[0] : undefined,
      candidates: ids.length > 1 ? ids : undefined,
      badge: 0,
      topHeroes: heroes,
    };
  });
}

export { TIER_NUMBER };
