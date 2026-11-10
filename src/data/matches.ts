import { TIER_NUMBER } from './ranks';

/**
 * Live matches. The sample generates invented games (invented handles, hero picks and numbers) that tick like real
 * ones; the live source reads the API's active-matches feed (/v1/matches/active, shape checked on 8 Oct 2026). That feed
 * carries hero picks, net worth, spectators and the mode, but no names and no ranks: those are looked up afterwards, for
 * the games on screen, from the player endpoints (see enrichMatch).
 */

export type MatchMode = 'standard' | 'street_brawl';
export type TeamId = 'hidden-king' | 'archmother';

export interface LivePlayer {
  /** Empty until the player's Steam name has been looked up. */
  name: string;
  heroSlug: string;
  accountId?: number;
  netWorth?: number;
  avatar?: string;
  /** Rank badge 0-116 once looked up. */
  badge?: number;
}
export interface LiveTeam { id: TeamId; label: string; players: LivePlayer[]; netWorth: number }

export interface LiveMatch {
  id: string;
  mode: MatchMode;
  /** Unix seconds the match started (clock = now - startedAt). */
  startedAt: number;
  /** Average badge of the lobby, 0-116. Zero while the players' ranks are not known yet. */
  avgBadge: number;
  /** How many of the twelve players' ranks went into avgBadge. */
  badgesKnown?: number;
  queue?: 'ranked' | 'unranked';
  spectators?: number;
  teams: [LiveTeam, LiveTeam];
}

export const TEAM_LABEL: Record<TeamId, string> = { 'hidden-king': 'Hidden King', archmother: 'Archmother' };

export const fmtClock = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};

/** 312400 -> "312K". Net worth is in souls. */
export const fmtSouls = (n: number): string => (n >= 1000 ? `${Math.round(n / 100) / 10}K`.replace(/\.0K$/, 'K') : String(Math.round(n)));

// ---------------------------------------------------------------------------------------------------------
// Live feed normalising
// ---------------------------------------------------------------------------------------------------------

interface RawPlayer { account_id?: number | null; team?: number | string | null; hero_id?: number | null }
interface RawMatch {
  match_id?: number | string | null;
  start_time?: number | string | null;
  /** 4 = Street Brawl, 1 = Standard. Older feeds sent a name such as "KECitadelGameModeStreetBrawl". */
  game_mode?: string | number | null;
  game_mode_parsed?: string | null;
  /** 4 = Ranked, 1 = Unranked. */
  match_mode?: number | null;
  players?: RawPlayer[] | null;
  net_worth_team_0?: number | null;
  net_worth_team_1?: number | null;
  spectators?: number | null;
}

const isBrawl = (m: RawMatch): boolean => m.game_mode === 4 || /brawl/i.test(String(m.game_mode_parsed ?? (typeof m.game_mode === 'string' ? m.game_mode : '')));

export function normalizeMatches(raw: unknown, heroSlugById: (id: number) => string | undefined): LiveMatch[] {
  const list: RawMatch[] = Array.isArray(raw) ? raw : Array.isArray((raw as { matches?: unknown })?.matches) ? ((raw as { matches: RawMatch[] }).matches) : [];
  const out: LiveMatch[] = [];
  for (const m of list) {
    const id = m.match_id;
    const players = Array.isArray(m.players) ? m.players : [];
    if (id === undefined || id === null || players.length < 2) continue;
    const start = typeof m.start_time === 'number' ? (m.start_time > 1e12 ? Math.floor(m.start_time / 1000) : m.start_time) : typeof m.start_time === 'string' ? Math.floor(Date.parse(m.start_time) / 1000) : NaN;
    if (!Number.isFinite(start)) continue;
    const team = (t: number): LivePlayer[] => players
      .filter((p) => Number(p.team) === t)
      .map((p) => ({ heroSlug: p.hero_id != null ? heroSlugById(p.hero_id) ?? '' : '', name: '', accountId: p.account_id && p.account_id > 0 ? p.account_id : undefined }))
      .filter((p) => p.heroSlug);
    const a = team(0); const b = team(1);
    if (!a.length && !b.length) continue;
    out.push({
      id: String(id),
      mode: isBrawl(m) ? 'street_brawl' : 'standard',
      startedAt: start,
      avgBadge: 0,
      queue: m.match_mode === 4 ? 'ranked' : m.match_mode === 1 ? 'unranked' : undefined,
      spectators: m.spectators ?? undefined,
      teams: [
        { id: 'hidden-king', label: TEAM_LABEL['hidden-king'], players: a, netWorth: m.net_worth_team_0 ?? 0 },
        { id: 'archmother', label: TEAM_LABEL.archmother, players: b, netWorth: m.net_worth_team_1 ?? 0 },
      ],
    });
  }
  return out;
}

/** Position on the ladder as a whole number: Initiate I = 6, Eternus VI = 71. Ranks are not evenly spaced as badge numbers (Acolyte VI = 36, Seeker I = 41). */
const slot = (badge: number): number => Math.floor(badge / 10) * 6 + (Math.max(1, badge % 10 || 1) - 1);
const fromSlot = (n: number): number => Math.floor(n / 6) * 10 + (n % 6) + 1;

/** Average rank of a set of badges, on the ladder, or 0 when there are none. */
export function averageBadge(badges: readonly number[]): number {
  const known = badges.filter((b) => b > 0);
  return known.length ? fromSlot(Math.round(known.reduce((n, b) => n + slot(b), 0) / known.length)) : 0;
}

/** Fills in names, avatars and ranks from a lookup. Four known ranks are enough to call a lobby average; fewer leave it unknown. */
export function enrichMatch(m: LiveMatch, who: ReadonlyMap<number, { name?: string; avatar?: string; badge?: number }>): LiveMatch {
  const teams = m.teams.map((t) => ({
    ...t,
    players: t.players.map((p) => {
      const h = p.accountId !== undefined ? who.get(p.accountId) : undefined;
      return h ? { ...p, name: h.name ?? p.name, avatar: h.avatar ?? p.avatar, badge: h.badge ?? p.badge } : p;
    }),
  })) as [LiveTeam, LiveTeam];
  const badges = teams.flatMap((t) => t.players.map((p) => p.badge ?? 0)).filter((b) => b > 0);
  return { ...m, teams, avgBadge: badges.length >= 4 ? averageBadge(badges) : m.avgBadge, badgesKnown: badges.length };
}

// ---------------------------------------------------------------------------------------------------------
// Filtering and sorting
// ---------------------------------------------------------------------------------------------------------

export type MatchSort = 'newest' | 'longest' | 'rank' | 'watched';
export const MATCH_SORT_LABEL: Record<MatchSort, string> = { newest: 'Just started', longest: 'Longest', rank: 'Highest rank', watched: 'Most watched' };

/** Minimum-rank choices for the filter. `min` is the lowest badge level that passes. */
export const MIN_RANKS: { id: string; label: string; min: number }[] = [
  { id: 'any', label: 'Any rank', min: 0 },
  { id: 'oracle', label: 'Oracle and above', min: TIER_NUMBER.Oracle * 10 },
  { id: 'phantom', label: 'Phantom and above', min: TIER_NUMBER.Phantom * 10 },
  { id: 'ascendant', label: 'Ascendant and above', min: TIER_NUMBER.Ascendant * 10 },
  { id: 'eternus', label: 'Eternus', min: TIER_NUMBER.Eternus * 10 },
];

export function filterMatches(list: LiveMatch[], o: { mode: MatchMode | 'all'; minBadge: number; sort: MatchSort }): LiveMatch[] {
  const f = list.filter((m) => (o.mode === 'all' || m.mode === o.mode) && m.avgBadge >= o.minBadge);
  const by: Record<MatchSort, (a: LiveMatch, b: LiveMatch) => number> = {
    newest: (a, b) => b.startedAt - a.startedAt,
    longest: (a, b) => a.startedAt - b.startedAt,
    rank: (a, b) => b.avgBadge - a.avgBadge,
    watched: (a, b) => (b.spectators ?? 0) - (a.spectators ?? 0),
  };
  return [...f].sort(by[o.sort]);
}

/** Share of the combined net worth held by the first team, 0..1 (0.5 when nothing is known). */
export const netWorthShare = (m: LiveMatch): number => {
  const t = m.teams[0].netWorth + m.teams[1].netWorth;
  return t > 0 ? m.teams[0].netWorth / t : 0.5;
};
