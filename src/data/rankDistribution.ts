import type { RankDistributionRow } from '../api/types';
import { RANKS } from './types';
import { badgeLabel, badgeParts } from './leaderboard';
import { RANK_COLOR } from './ranks';

/** How many players (or games) sit at each of the 66 rank levels. `level` is tier * 10 + sub, so Initiate I = 11 and Eternus VI = 116. */
export interface RankDistribution {
  unit: 'players' | 'games';
  rows: { level: number; count: number }[];
  /** Players still in their placement matches, when the source knows. */
  placements?: number;
  /** True when the numbers are generated for design review. */
  illustrative: boolean;
}

export const ALL_LEVELS: number[] = Array.from({ length: 66 }, (_, i) => (Math.floor(i / 6) + 1) * 10 + (i % 6) + 1);

// Relative share of ranked players per tier, lowest first. Invented for the sample, shaped like a normal ranked ladder.
const TIER_WEIGHT = [3.5, 15, 12.8, 11.2, 10.6, 9.6, 8.8, 10.2, 5.4, 2.2, 0.7];
const SUB_WEIGHT = [1.0, 0.9, 0.95, 1.0, 1.1, 1.6];
// Eternus is split by percentile of its own players: I is the bottom 25%, VI the top 5%.
const ETERNUS_SPLIT = [0.25, 0.25, 0.2, 0.15, 0.1, 0.05];

export function sampleDistribution(): RankDistribution {
  const total = 92000;
  const wsum = TIER_WEIGHT.reduce((a, b) => a + b, 0);
  const subSum = SUB_WEIGHT.reduce((a, b) => a + b, 0);
  const rows = ALL_LEVELS.map((level) => {
    const t = Math.floor(level / 10), s = level % 10;
    const tierPlayers = (TIER_WEIGHT[t - 1] / wsum) * total;
    const share = t === 11 ? ETERNUS_SPLIT[s - 1] : SUB_WEIGHT[s - 1] / subSum;
    // a small deterministic wobble so the bars are not perfectly regular
    const wobble = 1 + (((level * 37) % 11) - 5) / 90;
    return { level, count: Math.round(tierPlayers * share * wobble) };
  });
  return { unit: 'players', rows, placements: 9400, illustrative: true };
}

/** /v1/players/rank/distribution (checked 8 Oct 2026): how many players sit at each of the 66 levels right now. */
export function normalizePlayerDistribution(rows: readonly RankDistributionRow[]): RankDistribution {
  const by = new Map<number, number>();
  for (const r of rows) {
    const level = r.badge > 0 ? r.badge : r.rank * 10 + r.subrank;
    if (level > 0) by.set(level, (by.get(level) ?? 0) + (r.players ?? 0));
  }
  return { unit: 'players', rows: ALL_LEVELS.map((level) => ({ level, count: by.get(level) ?? 0 })), illustrative: false };
}

interface RawBucket { badge_level?: number | null; total_matches?: number | null; matches?: number | null; players?: number | null }

/** Games played per level, from /v1/analytics/badge-distribution (used when a filter is set; the player counts above take none). */
export function normalizeDistribution(raw: unknown): RankDistribution {
  const list: RawBucket[] = Array.isArray(raw) ? raw : Array.isArray((raw as { entries?: unknown })?.entries) ? (raw as { entries: RawBucket[] }).entries : [];
  const by = new Map<number, number>();
  for (const r of list) if (r.badge_level) by.set(r.badge_level, (by.get(r.badge_level) ?? 0) + (r.total_matches ?? r.matches ?? r.players ?? 0));
  return { unit: 'games', rows: ALL_LEVELS.map((level) => ({ level, count: by.get(level) ?? 0 })), illustrative: false };
}

export interface DistributionStats {
  total: number;
  /** Level at which half of the ranked players are at or below. */
  median: number;
  byLevel: Map<number, { count: number; share: number; top: number }>;
  tiers: { rank: string; tier: number; count: number; share: number; top: number; color: string; levels: { level: number; count: number; share: number }[] }[];
  max: number;
}

export function distributionStats(d: RankDistribution): DistributionStats {
  const rows = [...d.rows].sort((a, b) => a.level - b.level);
  const total = rows.reduce((n, r) => n + r.count, 0);
  const byLevel = new Map<number, { count: number; share: number; top: number }>();
  let above = total;
  let cum = 0, median = rows[0]?.level ?? 11;
  let found = false;
  for (const r of rows) {
    byLevel.set(r.level, { count: r.count, share: total ? (r.count / total) * 100 : 0, top: total ? (above / total) * 100 : 0 });
    above -= r.count;
    cum += r.count;
    if (!found && total && cum >= total / 2) { median = r.level; found = true; }
  }
  const tiers = [...RANKS].reverse().map((rank, i) => {
    const tier = i + 1;
    const levels = rows.filter((r) => Math.floor(r.level / 10) === tier).map((r) => ({ ...r, share: byLevel.get(r.level)!.share }));
    const count = levels.reduce((n, r) => n + r.count, 0);
    return { rank, tier, count, share: total ? (count / total) * 100 : 0, top: byLevel.get(tier * 10 + 1)?.top ?? 0, color: RANK_COLOR[rank], levels };
  });
  return { total, median, byLevel, tiers, max: Math.max(1, ...rows.map((r) => r.count)) };
}

export const levelLabel = (level: number): string => badgeLabel(level);
export { badgeParts };
