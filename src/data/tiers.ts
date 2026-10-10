import type { HeroStatsRow, HeroBanRow } from '../api/types';
import type { HeroIdMap } from './heroIds';
import type { Tier } from './types';

export interface TierRow {
  slug: string;
  tier: Tier;
  winRate: number;
  /** Share of games the hero appears in. */
  pickRate: number;
  banRate?: number;
  matches: number;
  /** Win rate change over the last 7 days, in percentage points. Absent when there is not enough recent data. */
  delta?: number;
  /** Broadway score, 0 to 100: mostly win rate, with pick rate as the second signal. Tiers are cut from this. */
  score: number;
}

export interface TierList { rows: TierRow[]; illustrative: boolean; note?: string }

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const sd = (xs: number[]) => Math.sqrt(mean(xs.map((x) => (x - mean(xs)) ** 2))) || 1;

/** Share of heroes in each tier, best to worst (S+ first). The cut is on the composite score, not on win rate alone. */
const SHARE: [Tier, number][] = [['S+', 0.15], ['S', 0.22], ['A', 0.25], ['B', 0.2], ['C', 0.11], ['D', 0.07]];

export const TIER_NOTES: Record<Tier, string> = {
  'S+': 'Defining the meta', S: 'Strong picks', A: 'Solid', B: 'Playable', C: 'Struggling', D: 'Needs a patch',
};

/**
 * Scores every hero (80% win rate, 20% pick rate, both as distance from the average in standard deviations) and cuts the
 * tiers by share. `pinHaze` is only for the illustrative sample, which keeps the demo hero where its page says it is.
 */
export function scoreAndTier(rows: TierRow[], pinHaze = false): TierRow[] {
  const wm = mean(rows.map((r) => r.winRate)), ws = sd(rows.map((r) => r.winRate));
  const pm = mean(rows.map((r) => r.pickRate)), ps = sd(rows.map((r) => r.pickRate));
  const scored = rows.map((r) => {
    const c = 0.8 * ((r.winRate - wm) / ws) + 0.2 * ((r.pickRate - pm) / ps);
    return { ...r, score: Math.max(0, Math.min(100, Math.round((50 + c * 17) * 10) / 10)) };
  });
  const ranked = [...scored].sort((a, b) => b.score - a.score).map((r) => r.slug);
  const cut: Record<string, Tier> = {};
  let at = 0;
  for (const [tier, share] of SHARE) {
    const n = Math.round(share * rows.length);
    for (const slug of ranked.slice(at, at + n)) cut[slug] = tier;
    at += n;
  }
  for (const slug of ranked.slice(at)) cut[slug] = 'D';
  return scored.map((r) => ({ ...r, tier: pinHaze && r.slug === 'haze' ? 'S' : cut[r.slug] ?? 'B' }));
}

const DAY = 86400;

/** Win rate of the last 7 days against the 7 before, per hero id, from daily rows. Needs 100 games in each window. */
export function weeklyDeltas(daily: readonly HeroStatsRow[]): Map<number, number> {
  const out = new Map<number, number>();
  if (!daily.length) return out;
  const end = Math.max(...daily.map((r) => r.bucket));
  const win = (id: number, from: number, to: number) => {
    let m = 0, w = 0;
    for (const r of daily) if (r.hero_id === id && r.bucket > from && r.bucket <= to) { m += r.matches; w += r.wins; }
    return { m, wr: m ? (w / m) * 100 : null };
  };
  for (const id of new Set(daily.map((r) => r.hero_id))) {
    const cur = win(id, end - 7 * DAY, end), prev = win(id, end - 14 * DAY, end - 7 * DAY);
    if (cur.m >= 100 && prev.m >= 100 && cur.wr !== null && prev.wr !== null) out.set(id, Math.round((cur.wr - prev.wr) * 10) / 10);
  }
  return out;
}

export interface TierInputs {
  stats: readonly HeroStatsRow[];
  bans?: readonly HeroBanRow[] | null;
  daily?: readonly HeroStatsRow[] | null;
  ids: HeroIdMap;
}

/**
 * Tier rows from the API's hero totals.
 * - Win rate is wins over matches.
 * - Pick rate is the share of games a hero appears in: each game has twelve player slots, so games = total picks / 12
 *   and a hero's pick rate = its picks / games. Twelve heroes per game means the rates add up to 1,200%.
 * - Ban rate is bans over games, the same way.
 * Heroes the API lists but Broadway has no page for are skipped, as are heroes with fewer than 100 games.
 */
export function buildTierRows({ stats, bans, daily, ids }: TierInputs): TierRow[] {
  const totalPicks = stats.reduce((n, r) => n + r.matches, 0);
  const games = totalPicks / 12;
  if (!(games > 0)) return [];
  const banById = new Map<number, number>();
  for (const b of bans ?? []) banById.set(b.hero_id, (banById.get(b.hero_id) ?? 0) + b.bans);
  const deltas = daily ? weeklyDeltas(daily) : new Map<number, number>();
  const rows: TierRow[] = [];
  for (const r of stats) {
    const slug = ids.slugById(r.hero_id);
    if (!slug || r.matches < 100) continue;
    rows.push({
      slug, tier: 'B', score: 0,
      winRate: Math.round((r.wins / r.matches) * 1000) / 10,
      pickRate: Math.round((r.matches / games) * 1000) / 10,
      banRate: bans ? Math.round(((banById.get(r.hero_id) ?? 0) / games) * 1000) / 10 : undefined,
      matches: r.matches,
      delta: deltas.get(r.hero_id),
    });
  }
  return scoreAndTier(rows).sort((a, b) => b.score - a.score);
}
