import type { MatchHistoryRow, PlayerHeroStatsRow, PlayerRankRaw, SteamProfile } from '../api/types';
import { steamProfileUrl } from '../lib/steam';
import type { HeroIdMap } from './heroIds';
import { badgeLabel, badgeParts } from './leaderboard';

/**
 * A player, built from the Deadlock API's player endpoints (all checked against the live service on 8 Oct 2026):
 *   /v1/players/steam            name, avatar, matches in the last 30 days
 *   /v1/players/rank             current rank badge
 *   /v1/players/hero-stats       all-time record per hero
 *   /v1/players/{id}/match-history   every match, newest first (also gives the rank history)
 *   /v1/players/{id}/mate-stats  who they play with
 * `card` and `account-stats` are Patreon-only and are not used.
 */

export type QueueKind = 'ranked' | 'unranked' | 'brawl' | 'other';
export const QUEUE_LABEL: Record<QueueKind, string> = { ranked: 'Ranked', unranked: 'Unranked', brawl: 'Street Brawl', other: 'Other' };

/** game_mode 4 is Street Brawl; otherwise match_mode 4 is Ranked and 1 is Unranked (anything else is a private or test lobby). */
export function queueKind(gameMode: number, matchMode: number): QueueKind {
  if (gameMode === 4) return 'brawl';
  if (matchMode === 4) return 'ranked';
  if (matchMode === 1) return 'unranked';
  return 'other';
}

export interface PlayerRank {
  /** 0-116: tier in the leading digits, level 1-6 in the last digit. */
  badge: number;
  tier: number;
  sub: number;
  /** Rank name, e.g. "Eternus". */
  name: string;
  /** Rank name with its level, e.g. "Eternus VI". */
  label: string;
  /** Consecutive wins going into the last ranked game, when known. */
  streak?: number;
}

export interface PlayerHeroLine {
  slug: string;
  matches: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  /** Seconds spent playing this hero. */
  seconds: number;
  lastPlayed: number;
  accuracy?: number;
  netWorthPerMin?: number;
  damagePerMin?: number;
}

export interface PlayerTotals { matches: number; wins: number; kills: number; deaths: number; assists: number; seconds: number }

export interface PlayerCore {
  accountId: number;
  name: string;
  avatar?: string;
  profileUrl: string;
  /** Matches in the last 30 days, per Steam-linked activity. */
  matches30d?: number;
  rank: PlayerRank | null;
  totals: PlayerTotals | null;
  heroes: PlayerHeroLine[];
  /** True when the API knows nothing about this account (no profile, no record, no matches). */
  empty: boolean;
}

export interface PlayerMatchLine {
  id: number;
  heroSlug?: string;
  heroId: number;
  /** Unix seconds. */
  start: number;
  durationS: number;
  won: boolean;
  kind: QueueKind;
  kills: number;
  deaths: number;
  assists: number;
  netWorth: number;
  lastHits: number;
  denies?: number;
  level: number;
  /** Rank change from this game, in the game's own progress units, when ranked. */
  rankDelta?: number;
  /** Rank badge shown going into this game, when ranked. */
  badge?: number;
  abandoned: boolean;
}

export interface RankPoint { t: number; badge: number }

export interface PlayerMatches {
  /** Newest first. */
  matches: PlayerMatchLine[];
  /** Oldest first: the rank shown going into each ranked game. */
  history: RankPoint[];
}

export interface PlayerMate { accountId: number; name?: string; avatar?: string; matches: number; wins: number }

export interface PlayerHit {
  accountId: number;
  name: string;
  avatar?: string;
  matches30d?: number;
  /** Average rank of the lobby in their last game (what the search endpoint reports). */
  lobbyBadge?: number;
  /** The player's own current rank, when it has been looked up. */
  rankBadge?: number;
}

// ---------------------------------------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------------------------------------

export const winPct = (wins: number, matches: number): number | null => (matches > 0 ? (wins / matches) * 100 : null);

/** (kills + assists) per death; deaths of zero count as one so a perfect game stays finite. */
export const kdaRatio = (k: number, d: number, a: number): number => (k + a) / Math.max(1, d);

/** 1719 -> "28:39"; an hour or more -> "1:02:03". */
export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

/** 36000 -> "10h"; under ten hours keeps a decimal: 9826 -> "2.7h". */
export function fmtHours(seconds: number): string {
  const h = seconds / 3600;
  return h >= 10 ? `${Math.round(h).toLocaleString('en-US')}h` : `${h.toFixed(1)}h`;
}

/** "just now", "5m ago", "3h ago", "2d ago", "4w ago", "3mo ago". */
export function timeAgo(unix: number, nowS = Math.floor(Date.now() / 1000)): string {
  const d = Math.max(0, nowS - unix);
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  if (d < 86400 * 14) return `${Math.floor(d / 86400)}d ago`;
  if (d < 86400 * 60) return `${Math.floor(d / (86400 * 7))}w ago`;
  return `${Math.floor(d / (86400 * 30))}mo ago`;
}

/** Position on the rank ladder as a single number: Initiate I = 1, Eternus VI = 11.83. Used to draw the history. */
export function badgeLevel(badge: number): number {
  const { tier, sub } = badgeParts(badge);
  return tier === 0 ? 0 : tier + (Math.max(1, sub) - 1) / 6;
}

// ---------------------------------------------------------------------------------------------------------
// Normalisers
// ---------------------------------------------------------------------------------------------------------

export function normalizeRank(raw: PlayerRankRaw | undefined | null): PlayerRank | null {
  if (!raw || !(raw.badge > 0)) return null;
  const p = badgeParts(raw.badge);
  const streak = raw.last_match?.player_rank_initial_win_streak;
  return { badge: raw.badge, tier: p.tier, sub: p.sub, name: p.rank, label: badgeLabel(raw.badge), streak: streak && streak > 0 ? streak : undefined };
}

export function normalizeHeroLines(rows: readonly PlayerHeroStatsRow[], ids: HeroIdMap): PlayerHeroLine[] {
  const out: PlayerHeroLine[] = [];
  for (const r of rows) {
    const slug = ids.slugById(r.hero_id);
    if (!slug || !(r.matches_played > 0)) continue;
    out.push({
      slug, matches: r.matches_played, wins: r.wins, kills: r.kills, deaths: r.deaths, assists: r.assists, seconds: r.time_played, lastPlayed: r.last_played,
      accuracy: r.accuracy, netWorthPerMin: r.networth_per_min, damagePerMin: r.damage_per_min,
    });
  }
  return out.sort((a, b) => b.matches - a.matches);
}

/** Totals over every hero row, including heroes that have since been removed from the game. */
export function playerTotals(rows: readonly PlayerHeroStatsRow[]): PlayerTotals | null {
  const real = rows.filter((r) => r.matches_played > 0);
  if (!real.length) return null;
  const t: PlayerTotals = { matches: 0, wins: 0, kills: 0, deaths: 0, assists: 0, seconds: 0 };
  for (const r of real) { t.matches += r.matches_played; t.wins += r.wins; t.kills += r.kills; t.deaths += r.deaths; t.assists += r.assists; t.seconds += r.time_played; }
  return t;
}

export function normalizeHistory(rows: readonly MatchHistoryRow[], ids: HeroIdMap): PlayerMatches {
  const matches: PlayerMatchLine[] = rows.map((r) => {
    const kind = queueKind(r.game_mode, r.match_mode);
    return {
      id: r.match_id,
      heroId: r.hero_id,
      heroSlug: ids.slugById(r.hero_id),
      start: r.start_time,
      durationS: r.match_duration_s,
      // stored history can send outcome 0; then the team that won says it (checked 25 Oct 2026)
      won: r.player_match_outcome === 1 || (r.player_match_outcome !== 2 && r.match_result === r.player_team),
      kind,
      kills: r.player_kills, deaths: r.player_deaths, assists: r.player_assists,
      netWorth: r.net_worth, lastHits: r.last_hits, denies: r.denies, level: r.hero_level,
      rankDelta: kind === 'ranked' && typeof r.ranked_delta === 'number' ? r.ranked_delta : undefined,
      badge: kind === 'ranked' && typeof r.ranked_display_badge === 'number' && r.ranked_display_badge > 0 ? r.ranked_display_badge : undefined,
      abandoned: r.team_abandoned,
    };
  }).sort((a, b) => b.start - a.start);
  const history = matches
    .filter((m): m is PlayerMatchLine & { badge: number } => m.badge !== undefined)
    .map((m) => ({ t: m.start, badge: m.badge }))
    .reverse();
  return { matches, history };
}

export function hitFromProfile(p: SteamProfile): PlayerHit {
  return {
    accountId: p.account_id,
    name: p.personaname?.trim() || `Player ${p.account_id}`,
    avatar: p.avatarmedium || p.avatar || p.avatarfull,
    matches30d: p.matches_played_last_30d,
    lobbyBadge: p.last_team_avg_badge && p.last_team_avg_badge > 0 ? p.last_team_avg_badge : undefined,
  };
}

/** Everything the profile header needs, from whichever calls succeeded. Missing pieces stay empty rather than invented. */
export function buildCore(accountId: number, parts: { steam?: SteamProfile | null; rank?: PlayerRankRaw | null; heroRows?: readonly PlayerHeroStatsRow[]; ids: HeroIdMap }): PlayerCore {
  const rows = parts.heroRows ?? [];
  const steam = parts.steam ?? null;
  const totals = playerTotals(rows);
  const rank = normalizeRank(parts.rank);
  return {
    accountId,
    name: steam?.personaname?.trim() || `Player ${accountId}`,
    avatar: steam?.avatarfull || steam?.avatarmedium || steam?.avatar,
    profileUrl: steam?.profileurl || steamProfileUrl(accountId),
    matches30d: steam?.matches_played_last_30d,
    rank,
    totals,
    heroes: normalizeHeroLines(rows, parts.ids),
    empty: !steam && !totals && !rank,
  };
}

/**
 * The rank to show: the API's current rank, or else the badge shown going into their newest ranked game (the rank lookup
 * sometimes comes back empty for players with a long ranked record). `fromHistory` says which one it is.
 */
export function shownRank(core: PlayerCore, matches: readonly PlayerMatchLine[] | null): (PlayerRank & { fromHistory?: number }) | null {
  if (core.rank) return core.rank;
  const last = matches?.find((m) => m.kind === 'ranked' && m.badge);
  const r = last?.badge ? normalizeRank({ badge: last.badge, rank: Math.floor(last.badge / 10), subrank: last.badge % 10 }) : null;
  return r && last ? { ...r, streak: undefined, fromHistory: last.start } : null;
}

/** Where a player's lobbies sit: the median of the lobby badges given, and the middle half of them. */
export function placement(lobbies: readonly number[]): { badge: number; low: number; high: number; n: number } | null {
  if (!lobbies.length) return null;
  const s = [...lobbies].sort((a, b) => a - b);
  const at = (q: number) => s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))];
  return { badge: at(0.5), low: at(0.25), high: at(0.75), n: s.length };
}

// ---------------------------------------------------------------------------------------------------------
// Summaries
// ---------------------------------------------------------------------------------------------------------

export interface FormSummary { n: number; wins: number; kills: number; deaths: number; assists: number; avgSeconds: number }

/** Record and averages over the newest `n` matches of the list given (already filtered by the caller if needed). */
export function formSummary(matches: readonly PlayerMatchLine[], n = 20): FormSummary {
  const s = matches.slice(0, n);
  const sum = (f: (m: PlayerMatchLine) => number) => s.reduce((a, m) => a + f(m), 0);
  return { n: s.length, wins: s.filter((m) => m.won).length, kills: sum((m) => m.kills), deaths: sum((m) => m.deaths), assists: sum((m) => m.assists), avgSeconds: s.length ? sum((m) => m.durationS) / s.length : 0 };
}

/** Per-hero record in a list of matches (e.g. the last 30 days), most played first. */
export function heroesIn(matches: readonly PlayerMatchLine[]): { slug: string; matches: number; wins: number }[] {
  const by = new Map<string, { matches: number; wins: number }>();
  for (const m of matches) {
    if (!m.heroSlug) continue;
    const a = by.get(m.heroSlug) ?? { matches: 0, wins: 0 };
    a.matches++; if (m.won) a.wins++;
    by.set(m.heroSlug, a);
  }
  return [...by.entries()].map(([slug, v]) => ({ slug, ...v })).sort((a, b) => b.matches - a.matches);
}
