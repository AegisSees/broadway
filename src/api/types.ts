/**
 * Response shapes of the Deadlock API (api.deadlock-api.com, OpenAPI v0.1.0).
 *
 * Everything below was checked against the running service on 8 Oct 2026; real samples live in `api-samples/` and the
 * unit tests run the normalisers on them. Only the fields Broadway uses are listed (responses carry more).
 * `card` and `account-stats` are Patreon-only (HTTP 403) and are deliberately not used.
 */

export type ApiGameMode = 'normal' | 'street_brawl';

export interface AnalyticsFilters {
  game_mode?: ApiGameMode;
  /** Comma-separated: ranked, unranked, ... API default is "ranked,unranked". */
  match_mode?: string;
  /** Average badge of BOTH teams, 0-116 (tier = leading digits, subtier = last digit). */
  min_average_badge?: number;
  max_average_badge?: number;
  min_unix_timestamp?: number;
  max_unix_timestamp?: number;
  min_matches?: number;
}

/** /v1/analytics/hero-stats. With bucket=start_time_day, `bucket` is the unix time of that day's start. */
export interface HeroStatsRow {
  bucket: number;
  hero_id: number;
  matches: number;
  wins: number;
  losses: number;
  total_kills: number;
  total_deaths: number;
  total_assists: number;
  total_net_worth?: number;
  total_last_hits?: number;
  total_player_damage?: number;
}

/** /v1/analytics/hero-counter-stats: `wins` belong to `hero_id` against `enemy_hero_id`. */
export interface HeroCounterRow {
  hero_id: number;
  enemy_hero_id: number;
  matches_played: number;
  wins: number;
}

/** /v1/analytics/hero-synergy-stats: `wins` is the pair's wins when both were on the same team. */
export interface HeroSynergyRow {
  hero_id1: number;
  hero_id2: number;
  matches_played: number;
  wins: number;
}

/** /v1/analytics/hero-ban-stats */
export interface HeroBanRow {
  hero_id: number;
  bucket: number;
  bans: number;
}

export interface AbilityOrderRow {
  /** Ability ids in upgrade order. */
  abilities: number[];
  matches: number;
  wins: number;
  losses: number;
  players: number;
}

export interface ItemStatsRow {
  item_id: number;
  bucket: number;
  matches: number;
  wins: number;
  losses: number;
  players: number;
  avg_buy_time_s: number;
}

/** /v1/players/rank/distribution: how many players sit at each of the 66 levels. `badge` = tier * 10 + level. */
export interface RankDistributionRow {
  badge: number;
  rank: number;
  subrank: number;
  players: number;
}

/** /v1/analytics/badge-distribution: how many games were played at each level. */
export interface BadgeDistributionRow {
  badge_level: number;
  total_matches: number;
  unique_players: number;
}

export interface LeaderboardEntryRaw {
  rank: number;
  account_name: string;
  /** More than one account can share a name; the API cannot tell which one is on the board. */
  possible_account_ids: number[];
  top_hero_ids: number[];
}
export interface LeaderboardRaw {
  entries: LeaderboardEntryRaw[];
}

export interface ActivePlayerRaw {
  account_id: number;
  team: number;
  hero_id: number;
  abandoned?: boolean | null;
}
/** /v1/matches/active. game_mode 1 = Standard, 4 = Street Brawl. match_mode 4 = Ranked, 1 = Unranked. */
export interface ActiveMatchRaw {
  match_id: number;
  start_time: number;
  players: ActivePlayerRaw[];
  net_worth_team_0: number;
  net_worth_team_1: number;
  spectators: number;
  game_mode: number;
  game_mode_parsed?: string;
  match_mode: number;
  match_mode_parsed?: string;
  region_mode_parsed?: string;
}

export interface SteamProfile {
  account_id: number;
  personaname: string;
  profileurl: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  countrycode: string | null;
  last_updated?: string;
  matches_played_last_30d: number;
  /** 0 or null when unknown. */
  last_team_avg_badge: number | null;
}

/** /v1/players/rank and /v1/players/{id}/rank. `badge` = rank * 10 + subrank (116 = Eternus VI). */
export interface PlayerRankRaw {
  account_id?: number;
  badge: number;
  rank: number;
  subrank: number;
  last_match?: {
    match_id: number;
    start_time: number;
    player_rank_initial_flat_progress?: number;
    player_rank_final_flat_progress?: number;
    player_rank_initial_calibration_games?: number;
    player_rank_initial_win_streak?: number;
  };
}

/** /v1/players/hero-stats: one row per player and hero, all time. */
export interface PlayerHeroStatsRow {
  account_id: number;
  hero_id: number;
  matches_played: number;
  wins: number;
  last_played: number;
  /** Seconds. */
  time_played: number;
  kills: number;
  deaths: number;
  assists: number;
  ending_level?: number;
  accuracy?: number;
  networth_per_min?: number;
  damage_per_min?: number;
  last_hits_per_min?: number;
}

/** /v1/players/{id}/match-history. match_mode 4 = Ranked, 1 = Unranked; game_mode 4 = Street Brawl. outcome 1 = win, 2 = loss. */
export interface MatchHistoryRow {
  match_id: number;
  hero_id: number;
  hero_level: number;
  start_time: number;
  game_mode: number;
  match_mode: number;
  player_team: number;
  match_result: number;
  player_match_outcome: number;
  player_kills: number;
  player_deaths: number;
  player_assists: number;
  denies: number;
  last_hits: number;
  net_worth: number;
  match_duration_s: number;
  team_abandoned: boolean;
  abandoned_time_s: number;
  ranked_display_badge: number | null;
  ranked_delta: number | null;
  ranked_calibration_match: number | null;
}

export interface MateRow {
  mate_id: number;
  wins: number;
  matches_played: number;
}
export interface EnemyRow {
  enemy_id: number;
  wins: number;
  matches_played: number;
}

export interface AssetHero {
  id: number;
  name: string;
  class_name: string;
  player_selectable: boolean;
  disabled: boolean;
  development_state?: string;
  images: Record<string, string>;
}

export interface AssetRank {
  tier: number;
  name: string;
  color: string;
  images?: { large: string; large_webp: string; small: string; small_webp: string };
}

/** /v2/patches: the game's Steam news feed. `content` is HTML. */
export interface PatchEntry {
  source?: string;
  title: string;
  pub_date: string;
  link: string;
  content?: string;
}

// ---------------------------------------------------------------------------------------------------------
// /v1/matches/metadata (checked against the live service on 9 Oct 2026; api-samples/match-metadata.json is a trimmed real answer)
// ---------------------------------------------------------------------------------------------------------

/** One purchase. Shop items carry `upgrade_id` 1 and a name in itemIds.json; ability-point purchases leave the zero-valued fields out and are not in that table. */
export interface MatchItemRaw {
  game_time_s: number;
  item_id: number;
  upgrade_id?: number;
  /** 0 or missing while the item is still held at the end of the game. */
  sold_time_s?: number;
  flags?: number;
  imbued_ability_id?: number;
}
export interface MatchStatRaw {
  time_stamp_s: number;
  net_worth?: number;
  level?: number;
  kills?: number; deaths?: number; assists?: number;
  player_damage?: number; player_healing?: number; player_damage_taken?: number;
}
export interface MatchFinalStatsRaw {
  player_damage?: number; player_healing?: number; player_damage_taken?: number;
  creep_kills?: number; neutral_kills?: number; boss_damage?: number; neutral_damage?: number;
  shots_hit?: number; shots_missed?: number; hero_bullets_hit?: number; headshot_kills?: number;
  max_health?: number; weapon_power?: number; tech_power?: number;
}
export interface MatchPlayerRaw {
  account_id: number;
  hero_id: number;
  player_slot: number;
  team: 'Team0' | 'Team1' | string;
  kills: number; deaths: number; assists: number;
  net_worth: number;
  last_hits: number; denies: number;
  ability_points?: number;
  assigned_lane?: number;
  player_level: number;
  abandon_match_time_s?: number;
  /** Only the three best players of the game carry one. */
  mvp_rank?: number;
  player_match_outcome?: string;
  player_rank_initial_display_rank?: number;
  items?: MatchItemRaw[];
  stats?: MatchStatRaw[];
  final_stats?: MatchFinalStatsRaw;
}
export interface MatchMetadataRaw {
  match_id: number;
  /** "YYYY-MM-DD HH:MM:SS", UTC. */
  start_time: string;
  winning_team: 'Team0' | 'Team1' | string;
  duration_s: number;
  match_outcome?: string;
  /** "Ranked" | "Unranked" | … */
  match_mode: string;
  /** "Normal" | "StreetBrawl" */
  game_mode: string;
  average_badge_team0?: number;
  average_badge_team1?: number;
  average_badge?: number | null;
  not_scored?: boolean;
  /** Empty for a normal game; [team0, team1] rounds won in Street Brawl. */
  team_score?: number[];
  banned_hero_ids?: number[];
  players: MatchPlayerRaw[];
}
