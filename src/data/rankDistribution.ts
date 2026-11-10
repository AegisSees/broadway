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
}

export const ALL_LEVELS: number[] = Array.from({ length: 66 }, (_, i) => (Math.floor(i / 6) + 1) * 10 + (i % 6) + 1);

/** /v1/players/rank/distribution (checked 8 Oct 2026): how many players sit at each of the 66 levels right now. */
export function normalizePlayerDistribution(rows: readonly RankDistributionRow[]): RankDistribution {
  const by = new Map<number, number>();
  for (const r of rows) {
    const level = r.badge > 0 ? r.badge : r.rank * 10 + r.subrank;
    if (level > 0) by.set(level, (by.get(level) ?? 0) + (r.players ?? 0));
  }
  return { unit: 'players', rows: ALL_LEVELS.map((level) => ({ level, count: by.get(level) ?? 0 })) };
}

interface RawBucket { badge_level?: number | null; total_matches?: number | null; matches?: number | null; players?: number | null }

/** Games played per level, from /v1/analytics/badge-distribution (used when a filter is set; the player counts above take none). */
export function normalizeDistribution(raw: unknown): RankDistribution {
  const list: RawBucket[] = Array.isArray(raw) ? raw : Array.isArray((raw as { entries?: unknown })?.entries) ? (raw as { entries: RawBucket[] }).entries : [];
  const by = new Map<number, number>();
  for (const r of list) if (r.badge_level) by.set(r.badge_level, (by.get(r.badge_level) ?? 0) + (r.total_matches ?? r.matches ?? r.players ?? 0));
  return { unit: 'games', rows: ALL_LEVELS.map((level) => ({ level, count: by.get(level) ?? 0 })) };
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
