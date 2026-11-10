import type { HeroStatsRow, HeroBanRow } from '../api/types';
import { MIN_GAMES, fitPrior, rateView, shrink, shrunkSd, type Prior, type RateView } from '../lib/stats';
import type { HeroIdMap } from './heroIds';
import type { PatchWindow } from './patchWindow';
import type { Tier } from './types';

export interface TierRow {
  slug: string;
  tier: Tier;
  /** Shrunk win rate in percent. This is the number the site leads with; `rate.raw` is wins over games untouched. */
  winRate: number;
  /** Win rate with its 95% range and sample label. */
  rate: RateView;
  /** Share of games the hero appears in, counted only over days the hero was in the game. */
  pickRate: number;
  banRate?: number;
  matches: number;
  /** Win rate of the last 7 days minus the 7 days before, in points. Absent unless both weeks have 1,000 games. */
  delta?: number;
  /** True when that change is bigger than luck alone would explain (about 2 standard errors). */
  deltaSure?: boolean;
  /** Tier score in win-rate points above or below an average hero. Tiers are cut from this. */
  score: number;
  /** The two parts of the score, so the page can show its working. */
  strength: number;
  presence: number;
}

/** What a set of numbers covers: how many games, from when to when, and when the site fetched them. */
export interface DataMeta {
  /** Games (not picks) in the sample. */
  matches: number;
  window: PatchWindow;
  /** Start of the newest day that has games, unix seconds. */
  latestDay?: number;
  /** When this browser fetched the numbers, in milliseconds. */
  fetchedAt: number;
}

export interface TierList {
  rows: TierRow[];
  /** Heroes left out for having too few games, with their game counts. */
  hidden: { slug: string; matches: number }[];
  prior: Prior;
  meta?: DataMeta;
  note?: string;
}

export const TIER_NOTES: Record<Tier, string> = {
  'S+': 'Defining the meta', S: 'Strong picks', A: 'Solid', B: 'Playable', C: 'Struggling', D: 'Needs a patch',
};

/**
 * Score needed for each tier, in win-rate points, best first. These are fixed lines, not shares: if a patch is well
 * balanced, S+ can be empty and most heroes land in B. Anything below the last line is D.
 */
export const TIER_CUTS: [Tier, number][] = [['S+', 4], ['S', 2.5], ['A', 1], ['B', -2], ['C', -4]];

export function tierOfScore(score: number): Tier {
  for (const [tier, min] of TIER_CUTS) if (score >= min) return tier;
  return 'D';
}

const round1 = (x: number) => Math.round(x * 10) / 10;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};

/**
 * The tier score of one hero, in win-rate points.
 *
 *   strength = how far the shrunk win rate is from 50%, moved one "standard deviation" back toward 50%.
 *              The standard deviation is how unsure we still are. A hero with few games is very unsure, so it is moved
 *              back a lot; a hero with 100,000 games barely moves. This is the "confidence" part: a hero has to be
 *              good AND proven to score high.
 *   presence = a small bonus or penalty for how often the hero is picked compared with the typical hero:
 *              half a point for every doubling, never more than three quarters of a point either way.
 *              A hero that wins in everyone's hands matters more than one that wins only for its few specialists.
 *   score    = strength + presence
 */
export function tierScore(wins: number, matches: number, pickRate: number, medianPickRate: number, prior: Prior) {
  const centre = (shrink(wins, matches, prior) - 0.5) * 100;
  const unsure = shrunkSd(wins, matches, prior) * 100;
  const strength = Math.sign(centre) * Math.max(0, Math.abs(centre) - unsure);
  const ratio = medianPickRate > 0 && pickRate > 0 ? pickRate / medianPickRate : 1;
  const presence = Math.max(-0.75, Math.min(0.75, 0.5 * Math.log2(ratio)));
  return { strength, presence, score: strength + presence };
}

const DAY = 86400;
/** Both weeks need this many games before a 7-day change is reported at all. */
export const MIN_WEEK_GAMES = 1000;

/**
 * Win rate of the last 7 days against the 7 before, per hero id, from daily rows.
 * `sure` says whether the change is larger than about two standard errors, i.e. unlikely to be luck.
 */
export function weeklyDeltas(daily: readonly HeroStatsRow[]): Map<number, { delta: number; sure: boolean }> {
  const out = new Map<number, { delta: number; sure: boolean }>();
  if (!daily.length) return out;
  const end = Math.max(...daily.map((r) => r.bucket));
  const sum = (id: number, from: number, to: number) => {
    let m = 0, w = 0;
    for (const r of daily) if (r.hero_id === id && r.bucket > from && r.bucket <= to) { m += r.matches; w += r.wins; }
    return { m, w };
  };
  for (const id of new Set(daily.map((r) => r.hero_id))) {
    const cur = sum(id, end - 7 * DAY, end), prev = sum(id, end - 14 * DAY, end - 7 * DAY);
    if (cur.m < MIN_WEEK_GAMES || prev.m < MIN_WEEK_GAMES) continue;
    const a = cur.w / cur.m, b = prev.w / prev.m;
    const se = Math.sqrt((a * (1 - a)) / cur.m + (b * (1 - b)) / prev.m);
    out.set(id, { delta: round1((a - b) * 100), sure: Math.abs(a - b) > 1.96 * se });
  }
  return out;
}

export interface TierInputs {
  /** One row per hero per day (bucket=start_time_day), already cut to the time window. */
  daily: readonly HeroStatsRow[];
  bans?: readonly HeroBanRow[] | null;
  ids: HeroIdMap;
}

export interface TierResult {
  rows: TierRow[];
  hidden: { slug: string; matches: number }[];
  /** API hero ids that Broadway has no page for. */
  unknownIds: number[];
  prior: Prior;
  /** Games in the sample (picks / 12). */
  games: number;
  latestDay?: number;
}

/**
 * Tier rows from the API's per-day hero rows.
 *
 * - Wins and games are added up over the days in the window.
 * - Pick rate is the share of games a hero appears in. A game has twelve heroes, so pick rates add up to 1,200%.
 *   It is counted only over days on which the hero had at least one game, so a hero released halfway through the patch
 *   is not marked down for the weeks it did not exist.
 * - Ban rate is bans over the games the API counted bans for.
 * - The win rate is shrunk toward the average hero (see lib/stats.ts), with the prior learned from this same sample.
 * - Heroes with fewer than MIN_GAMES.hero games are not ranked; they are returned in `hidden` so the page can say so.
 */
export function buildTierRows({ daily, bans, ids }: TierInputs): TierResult {
  // picks per day across all heroes: the API repeats it on every row of that day
  const picksOfDay = new Map<number, number>();
  const perHero = new Map<number, { wins: number; matches: number; days: Set<number> }>();
  for (const r of daily) {
    if (!(r.matches > 0)) continue;
    picksOfDay.set(r.bucket, r.matches_per_bucket ?? (picksOfDay.get(r.bucket) ?? 0));
    const h = perHero.get(r.hero_id) ?? { wins: 0, matches: 0, days: new Set<number>() };
    h.wins += r.wins; h.matches += r.matches; h.days.add(r.bucket);
    perHero.set(r.hero_id, h);
  }
  // older API versions had no matches_per_bucket: fall back to adding the heroes up
  if (daily.some((r) => r.matches_per_bucket === undefined)) {
    picksOfDay.clear();
    for (const r of daily) picksOfDay.set(r.bucket, (picksOfDay.get(r.bucket) ?? 0) + r.matches);
  }
  const totalPicks = [...picksOfDay.values()].reduce((a, b) => a + b, 0);
  const games = totalPicks / 12;
  const prior = fitPrior([...perHero.values()]);
  const empty: TierResult = { rows: [], hidden: [], unknownIds: [], prior, games: 0 };
  if (!(games > 0)) return empty;

  const banById = new Map<number, { bans: number; matches: number }>();
  for (const b of bans ?? []) {
    const a = banById.get(b.hero_id) ?? { bans: 0, matches: 0 };
    a.bans += b.bans; a.matches += b.matches ?? 0;
    banById.set(b.hero_id, a);
  }
  const deltas = weeklyDeltas(daily);

  const known: { id: number; slug: string; wins: number; matches: number; pick: number }[] = [];
  const hidden: TierResult['hidden'] = [];
  const unknownIds: number[] = [];
  for (const [id, h] of perHero) {
    const slug = ids.slugById(id);
    if (!slug) { unknownIds.push(id); continue; }
    if (h.matches < MIN_GAMES.hero) { hidden.push({ slug, matches: h.matches }); continue; }
    const gamesWhileAvailable = [...h.days].reduce((n, d) => n + (picksOfDay.get(d) ?? 0), 0) / 12;
    known.push({ id, slug, wins: h.wins, matches: h.matches, pick: gamesWhileAvailable > 0 ? (h.matches / gamesWhileAvailable) * 100 : 0 });
  }
  const medianPick = median(known.map((k) => k.pick));

  const rows: TierRow[] = known.map((k) => {
    const rate = rateView(k.wins, k.matches, prior);
    const s = tierScore(k.wins, k.matches, k.pick, medianPick, prior);
    const ban = banById.get(k.id);
    const d = deltas.get(k.id);
    return {
      slug: k.slug,
      // the tier is cut from the rounded score, so the number on the page always agrees with the tier beside it
      tier: tierOfScore(round1(s.score)),
      score: round1(s.score), strength: round1(s.strength), presence: round1(s.presence),
      winRate: rate.shrunk, rate,
      pickRate: round1(k.pick),
      banRate: bans && ban && ban.matches > 0 ? round1((ban.bans / ban.matches) * 100) : undefined,
      matches: k.matches,
      delta: d?.delta, deltaSure: d?.sure,
    };
  });
  rows.sort((a, b) => b.score - a.score || b.winRate - a.winRate);
  const latestDay = picksOfDay.size ? Math.max(...picksOfDay.keys()) : undefined;
  return { rows, hidden, unknownIds, prior, games: Math.round(games), latestDay };
}
