import type { MatchMetadataRaw, MatchPlayerRaw } from '../api/types';
import type { HeroIdMap } from './heroIds';
import names from './itemIds.json';
import { getItem } from './items';
import { queueKind, type QueueKind } from './player';

/**
 * A finished game in full, built from /v1/matches/metadata (shape checked against the live service on 9 Oct 2026,
 * saved trimmed as api-samples/match-metadata.json).
 *
 * Verified from real answers: `Team0` is the Hidden King's side and `Team1` the Archmother's; `mvp_rank` appears only on
 * the three best players; shop items are the purchase rows with `upgrade_id` 1 (every one of them is in itemIds.json), the
 * rest are ability-point purchases; an item is still held at the end when `sold_time_s` is 0 or missing; the
 * stats array holds a net-worth sample every three minutes plus one at the final second; `team_score` is empty
 * for a normal game and `[team0, team1]` rounds in Street Brawl. Not verified: which street `assigned_lane` 1 / 4 / 6
 * means (the mapping below is the best reading of the colours, about four times in five).
 */

export type Side = 'hidden-king' | 'archmother';
export const SIDE_NAME: Record<Side, string> = { 'hidden-king': 'The Hidden King', archmother: 'The Archmother' };
export const SIDE_SHORT: Record<Side, string> = { 'hidden-king': 'Hidden King', archmother: 'Archmother' };
export const sideOf = (team: string): Side => (team === 'Team1' ? 'archmother' : 'hidden-king');

export type Lane = 'york' | 'broadway' | 'greenwich';
export const LANE_NAME: Record<Lane, string> = { york: 'York', broadway: 'Broadway', greenwich: 'Greenwich' };
const LANES: Record<number, Lane> = { 1: 'york', 4: 'broadway', 6: 'greenwich' };

const ITEM_NAME = names as Record<string, string>;

export interface MatchItem {
  id: number;
  name: string;
  icon?: string;
  tier?: number;
  cost?: number;
  imbue?: boolean;
  /** Seconds into the game when it was bought. */
  at: number;
  /** Seconds into the game when it was sold or upgraded into something bigger. */
  soldAt?: number;
  held: boolean;
}

/** One ability-point purchase. `group` numbers the abilities in the order the player first learned them (0-3). */
export interface SkillStep { at: number; group: number; level: number }

export interface MatchPlayer {
  accountId: number;
  heroId: number;
  heroSlug?: string;
  slot: number;
  side: Side;
  lane?: Lane;
  won: boolean;
  kills: number; deaths: number; assists: number;
  netWorth: number;
  lastHits: number; denies: number;
  level: number;
  abilityPoints: number;
  /** 1 to 3 for the three best players of the game. */
  mvp?: number;
  /** Seconds into the game when they left, when they did. */
  abandonedAt?: number;
  /** Rank badge shown going into this game (ranked games). */
  badge?: number;
  damage?: number; healing?: number; damageTaken?: number;
  bossDamage?: number; neutralDamage?: number; creeps?: number;
  /** Share of shots that hit, 0-100. */
  accuracy?: number;
  /** Every shop item bought, in order. */
  bought: MatchItem[];
  /** What they still held at the end, priciest first. */
  held: MatchItem[];
  skills: SkillStep[];
  /** Net worth over the game, oldest first, starting at 0. */
  curve: { t: number; v: number }[];
  /** The three-minute stat samples (souls, kills, deaths, assists, level so far), oldest first, for the live win model. */
  snaps: { t: number; nw: number; k: number; d: number; a: number; lvl: number }[];
}

export interface TeamTotals {
  side: Side;
  won: boolean;
  /** Rounds won in Street Brawl. */
  score?: number;
  kills: number; deaths: number; assists: number;
  netWorth: number;
  damage: number;
  healing: number;
  bossDamage: number;
  players: MatchPlayer[];
  avgBadge?: number;
}

export interface MatchDetail {
  id: number;
  /** Unix seconds. */
  start: number;
  durationS: number;
  kind: QueueKind;
  winner: Side;
  notScored: boolean;
  teams: [TeamTotals, TeamTotals];
  players: MatchPlayer[];
  /** Average badge of the lobby, when the API reports one. */
  avgBadge?: number;
  /** Net worth of the Hidden King's team minus the Archmother's at each sample, oldest first. */
  lead: { t: number; v: number }[];
  bans: string[];
  /** True when this is built-in sample data rather than the real game with this id. */
  illustrative: boolean;
}

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** "2026-10-08 21:42:53" (UTC) to unix seconds. */
export function parseStart(s: string): number {
  const ms = Date.parse(s.replace(' ', 'T') + 'Z');
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0;
}

/** The API names the queue and the mode in words in this endpoint (numbers in the history endpoint). */
export function kindOf(gameMode: string | number, matchMode: string | number): QueueKind {
  if (typeof gameMode === 'number' && typeof matchMode === 'number') return queueKind(gameMode, matchMode);
  const g = String(gameMode).toLowerCase();
  const m = String(matchMode).toLowerCase();
  if (g.includes('brawl')) return 'brawl';
  if (m === 'ranked') return 'ranked';
  if (m === 'unranked') return 'unranked';
  return 'other';
}

function itemOf(row: { item_id: number; game_time_s: number; sold_time_s?: number }): MatchItem {
  const name = ITEM_NAME[String(row.item_id)];
  const info = name ? getItem(name) : undefined;
  const soldAt = row.sold_time_s && row.sold_time_s > 0 ? row.sold_time_s : undefined;
  return {
    id: row.item_id,
    name: info?.name ?? name ?? `Item ${row.item_id}`,
    icon: info?.icon, tier: info?.tier, cost: info?.cost, imbue: info?.imbue,
    at: row.game_time_s, soldAt, held: soldAt === undefined,
  };
}

function skillsOf(rows: readonly { item_id: number; game_time_s: number }[]): SkillStep[] {
  const order = new Map<number, number>();
  const seen = new Map<number, number>();
  const out: SkillStep[] = [];
  for (const r of [...rows].sort((a, b) => a.game_time_s - b.game_time_s)) {
    if (!order.has(r.item_id)) order.set(r.item_id, order.size);
    const level = (seen.get(r.item_id) ?? 0) + 1;
    seen.set(r.item_id, level);
    out.push({ at: r.game_time_s, group: order.get(r.item_id)!, level });
  }
  return out;
}

function playerOf(p: MatchPlayerRaw, winner: string, ids: HeroIdMap): MatchPlayer {
  const rows = p.items ?? [];
  // A shop item has upgrade_id 1 (and a name in the table); an ability-point purchase has neither.
  const isShop = (r: { item_id: number; upgrade_id?: number }) => (r.upgrade_id ?? 0) > 0 || ITEM_NAME[String(r.item_id)] !== undefined;
  const bought = rows.filter(isShop).map(itemOf).sort((a, b) => a.at - b.at);
  const held = bought.filter((i) => i.held).sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0) || a.at - b.at);
  const fs = p.final_stats ?? {};
  const shots = (num(fs.shots_hit) ?? 0) + (num(fs.shots_missed) ?? 0);
  const samples = (p.stats ?? []).filter((s) => num(s.net_worth) !== undefined).sort((a, b) => a.time_stamp_s - b.time_stamp_s);
  return {
    accountId: p.account_id,
    heroId: p.hero_id,
    heroSlug: ids.slugById(p.hero_id),
    slot: p.player_slot,
    side: sideOf(p.team),
    lane: p.assigned_lane !== undefined ? LANES[p.assigned_lane] : undefined,
    won: p.team === winner,
    kills: p.kills, deaths: p.deaths, assists: p.assists,
    netWorth: p.net_worth,
    lastHits: p.last_hits, denies: p.denies,
    level: p.player_level,
    abilityPoints: p.ability_points ?? 0,
    mvp: p.mvp_rank && p.mvp_rank >= 1 && p.mvp_rank <= 3 ? p.mvp_rank : undefined,
    abandonedAt: p.abandon_match_time_s && p.abandon_match_time_s > 0 ? p.abandon_match_time_s : undefined,
    badge: p.player_rank_initial_display_rank && p.player_rank_initial_display_rank > 0 ? p.player_rank_initial_display_rank : undefined,
    damage: num(fs.player_damage), healing: num(fs.player_healing), damageTaken: num(fs.player_damage_taken),
    bossDamage: num(fs.boss_damage), neutralDamage: num(fs.neutral_damage),
    creeps: num(fs.creep_kills),
    accuracy: shots > 0 ? Math.round(((num(fs.shots_hit) ?? 0) / shots) * 100) : undefined,
    bought, held,
    skills: skillsOf(rows.filter((r) => !isShop(r))),
    curve: samples.length ? [{ t: 0, v: 0 }, ...samples.map((s) => ({ t: s.time_stamp_s, v: s.net_worth! }))] : [],
    snaps: samples.map((s) => ({ t: s.time_stamp_s, nw: s.net_worth!, k: s.kills ?? 0, d: s.deaths ?? 0, a: s.assists ?? 0, lvl: s.level ?? 0 })),
  };
}

/** Average of the badges known among `players`, when at least `min` of them have one (only ranked games carry badges). */
export function avgBadgeOf(players: readonly { badge?: number }[], min: number): number | undefined {
  const known = players.map((p) => p.badge).filter((b): b is number => !!b && b > 0);
  return known.length >= min ? Math.round(known.reduce((a, b) => a + b, 0) / known.length) : undefined;
}

const sum = (list: readonly MatchPlayer[], f: (p: MatchPlayer) => number | undefined) => list.reduce((n, p) => n + (f(p) ?? 0), 0);

/** Net worth lead of the first team over the second at every moment both have a sample. */
export function leadCurve(a: readonly MatchPlayer[], b: readonly MatchPlayer[]): { t: number; v: number }[] {
  const at = (list: readonly MatchPlayer[], t: number): number | null => {
    let total = 0, n = 0;
    for (const p of list) { const pt = p.curve.find((c) => c.t === t); if (pt) { total += pt.v; n++; } }
    return n === list.length && n > 0 ? total : null;
  };
  const times = [...new Set([...a, ...b].flatMap((p) => p.curve.map((c) => c.t)))].sort((x, y) => x - y);
  const out: { t: number; v: number }[] = [];
  for (const t of times) {
    const x = at(a, t), y = at(b, t);
    if (x !== null && y !== null) out.push({ t, v: x - y });
  }
  return out;
}

export function normalizeMatch(raw: MatchMetadataRaw, ids: HeroIdMap, opts: { illustrative?: boolean } = {}): MatchDetail {
  const players = raw.players.map((p) => playerOf(p, raw.winning_team, ids))
    .sort((a, b) => (a.side === b.side ? a.slot - b.slot : a.side === 'hidden-king' ? -1 : 1));
  const winner = sideOf(raw.winning_team);
  const score = raw.team_score && raw.team_score.length === 2 ? raw.team_score : undefined;
  const team = (side: Side, i: 0 | 1): TeamTotals => {
    const list = players.filter((p) => p.side === side);
    const avg = i === 0 ? raw.average_badge_team0 : raw.average_badge_team1;
    return {
      side, won: winner === side, score: score?.[i],
      kills: sum(list, (p) => p.kills), deaths: sum(list, (p) => p.deaths), assists: sum(list, (p) => p.assists),
      netWorth: sum(list, (p) => p.netWorth), damage: sum(list, (p) => p.damage), healing: sum(list, (p) => p.healing), bossDamage: sum(list, (p) => p.bossDamage),
      // the API sends 0 for the team averages, so they come from the players' own badges
      players: list, avgBadge: avg && avg > 0 ? avg : avgBadgeOf(list, 3),
    };
  };
  const hk = team('hidden-king', 0);
  const am = team('archmother', 1);
  return {
    id: raw.match_id,
    start: parseStart(raw.start_time),
    durationS: raw.duration_s,
    kind: kindOf(raw.game_mode, raw.match_mode),
    winner,
    notScored: !!raw.not_scored,
    teams: [hk, am],
    players,
    avgBadge: raw.average_badge && raw.average_badge > 0 ? raw.average_badge : avgBadgeOf(players, 6),
    lead: leadCurve(hk.players, am.players),
    bans: (raw.banned_hero_ids ?? []).map((id) => ids.slugById(id)).filter((s): s is string => !!s),
    illustrative: !!opts.illustrative,
  };
}

/** Which of the game's players had the most of something, for the "who led" callouts. */
export function leader(players: readonly MatchPlayer[], f: (p: MatchPlayer) => number | undefined): MatchPlayer | undefined {
  let best: MatchPlayer | undefined, bv = 0;
  for (const p of players) { const v = f(p) ?? 0; if (v > bv) { bv = v; best = p; } }
  return best;
}

/** Items the whole lobby ended with, most common first: a quick read of what the game looked like. */
export function itemUse(players: readonly MatchPlayer[], top = 8): { item: MatchItem; count: number }[] {
  const m = new Map<number, { item: MatchItem; count: number }>();
  for (const p of players) for (const i of p.held) { const e = m.get(i.id); if (e) e.count++; else m.set(i.id, { item: i, count: 1 }); }
  return [...m.values()].sort((a, b) => b.count - a.count || (b.item.cost ?? 0) - (a.item.cost ?? 0)).slice(0, top);
}
