import { getHero, HEROES } from './roster';
import { getHeroStats } from './heroStats';
import { ALL_ITEM_NAMES, getItem, itemSlug } from './items';
import { FIRST, SECOND } from './leaderboard';
import type { ItemCategory, SkillPath, SkillRow } from './types';
import { between, hash, pick, rng, weightedSample } from '../lib/prng';

/**
 * Hero builds: the "top four" shown on every hero page and the browsable builds hub.
 *
 * A build is a list of items grouped by when they are usually bought (laning 0-10 min, mid game 10-22, late 22+),
 * how many of the sampled builds contain each item, the average time it is bought, and the win rate when it is.
 * It also carries a skill order and a shareable code.
 *
 * EVERYTHING GENERATED IN THIS FILE IS ILLUSTRATIVE. It is built from the real item list and each hero's role so it
 * reads sensibly, but no number is a game statistic and every code starts with "sample-" so it can never be mistaken
 * for a real in-game build id. Live builds (published in-game builds from the Deadlock API) are in communityBuilds.ts.
 */

export type BuildKind = 'meta' | 'winrate' | 'popular' | 'pro' | 'community';
export type BuildOrigin = 'ingame' | 'community';
export type PhaseId = 'laning' | 'mid' | 'late';

export interface BuildItemStat {
  name: string;
  category: ItemCategory;
  /** 1-based purchase order across the whole build. */
  order: number;
  /** Builds in the sample that contain this item, out of `of`. Published builds have no per-item numbers. */
  picks?: number;
  of?: number;
  /** Average minute the item is bought. */
  avgBuy?: number;
  winRate?: number;
  /** The author's note on the item, for published builds. */
  note?: string;
}

/** A stage of the build. Samples use laning / mid / late; published builds keep their author's own sections. */
export interface BuildPhase { id: string; label: string; range: string; items: BuildItemStat[] }

export interface HeroBuild {
  id: string;
  /** The shareable code. Real builds carry the in-game build id; invented ones start with "sample-". */
  code: string;
  heroSlug: string;
  kind: BuildKind;
  origin: BuildOrigin;
  /** True when the build is ranked by results among Eternus players only. */
  eternus: boolean;
  title: string;
  author?: string;
  blurb: string;
  /** Null when nobody has played the build in the sampled games yet. */
  winRate: number | null;
  pickRate: number | null;
  matches: number | null;
  /** Change in pick rate over the last week, in percentage points. Used for "Trending". */
  trend: number;
  likes?: number;
  ageDays?: number;
  tags: string[];
  phases: BuildPhase[];
  /** Null when the build carries no ability order. */
  skill: SkillPath | null;
  /** Tab label on a hero page, in place of the kind's label. */
  tab?: string;
  /** Where the numbers come from, shown on the card. */
  sample: string;
  illustrative: boolean;
}

export const PHASES: { id: PhaseId; label: string; range: string; from: number; to: number }[] = [
  { id: 'laning', label: 'Laning', range: '0 to 10 min', from: 1, to: 9 },
  { id: 'mid', label: 'Mid game', range: '10 to 22 min', from: 10, to: 21 },
  { id: 'late', label: 'Late game', range: '22+ min', from: 22, to: 38 },
];

export const itemCount = (b: HeroBuild): number => b.phases.reduce((n, p) => n + p.items.length, 0);
export const buildItemNames = (b: HeroBuild): string[] => b.phases.flatMap((p) => p.items.map((i) => i.name));
export const fmtBuy = (min: number): string => {
  const s = Math.round(min * 60);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
/** Link into the planner pre-loaded with a build's items. */
export const plannerLink = (b: HeroBuild): string => {
  const slugs = buildItemNames(b).map((n) => itemSlug(n)).filter(Boolean).slice(0, 12).join(',');
  return `/planner?hero=${b.heroSlug}&i=${slugs}`;
};

export const KIND_LABEL: Record<BuildKind, string> = { meta: 'Meta consensus', winrate: 'Highest win rate', popular: 'Most popular', pro: 'Pro · Eternus', community: 'Community' };

// ---------------------------------------------------------------------------------------------------------
// Item pool and hero archetypes
// ---------------------------------------------------------------------------------------------------------

const POOL = ALL_ITEM_NAMES.map((n) => getItem(n)!).filter((i) => i && i.tier >= 1 && i.tier <= 4);

type Weights = Record<ItemCategory, number>;
const ARCHETYPE: Record<string, Weights> = {
  Marksman: { weapon: 0.55, vitality: 0.2, spirit: 0.25 },
  Mystic: { weapon: 0.15, vitality: 0.25, spirit: 0.6 },
  Brawler: { weapon: 0.35, vitality: 0.45, spirit: 0.2 },
  Assassin: { weapon: 0.4, vitality: 0.25, spirit: 0.35 },
};
const EVEN: Weights = { weapon: 0.34, vitality: 0.33, spirit: 0.33 };
const weightsFor = (slug: string): Weights => ARCHETYPE[getHeroStats(slug)?.type ?? ''] ?? EVEN;

const TITLES: Record<string, string[]> = {
  Marksman: ['Long-range pressure', 'Magazine abuse', 'Headshot economy', 'Sustained fire', 'Hold the angle'],
  Mystic: ['Spirit burst', 'Cooldown cycle', 'Zone control', 'Late-game caster', 'Burn them down'],
  Brawler: ['Front-line anchor', 'Close-quarters bully', 'Unkillable', 'Lifesteal bruiser', 'Engage and stay'],
  Assassin: ['Pick and vanish', 'Glass cannon', 'Flank and finish', 'Skirmisher', 'One-clip setup'],
  '': ['Balanced starter', 'Safe and steady', 'Hybrid damage', 'Flexible core', 'Scaling pick'],
};
const BLURBS: Record<BuildKind, (hero: string) => string> = {
  meta: (h) => `The items most ${h} players buy, in the order they buy them. The safest place to start.`,
  winrate: (h) => `The ${h} item mix with the best results across the sample, even if fewer people play it.`,
  popular: (h) => `What most ${h} players actually run. Low risk, familiar, easy to adapt mid-match.`,
  pro: (h) => `The highest win rate builds for ${h} among Eternus players. Sharper timings, more tier 4 items.`,
  community: (h) => `A community build for ${h}.`,
};
const TAGS_BY_CAT: Record<ItemCategory, string> = { weapon: 'Weapon', vitality: 'Vitality', spirit: 'Spirit' };
const EXTRA_TAGS = ['Early game', 'Late game', 'Tanky', 'Burst', 'Poke', 'Beginner friendly', 'Anti-heal', 'High skill'];

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const r1 = (n: number) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------------------------------------
// Skill order: each of the four abilities is unlocked once and upgraded three times across 16 steps
// ---------------------------------------------------------------------------------------------------------

export function sampleSkill(slug: string, seedKey: string, winRate: number, matches: number): SkillPath {
  const r = rng(hash(`skill:${slug}:${seedKey}`));
  const left = [4, 4, 4, 4];
  const w = [0.8 + r(), 0.8 + r(), 0.8 + r(), 0.35 + r() * 0.4];
  const hits: number[][] = [[], [], [], []];
  for (let level = 1; level <= 16; level++) {
    // The ultimate is held back until the sixth step, as in the game.
    const options = [0, 1, 2, 3].filter((a) => left[a] > 0 && (a !== 3 || level >= 6));
    const total = options.reduce((s, a) => s + w[a] * (hits[a].length === 0 ? 1.6 : 1), 0);
    let roll = r() * total;
    let chosen = options[options.length - 1];
    for (const a of options) { roll -= w[a] * (hits[a].length === 0 ? 1.6 : 1); if (roll <= 0) { chosen = a; break; } }
    hits[chosen].push(level);
    left[chosen]--;
  }
  const rows: SkillRow[] = hits.map((h, abilityIndex) => ({
    abilityIndex: abilityIndex as SkillRow['abilityIndex'],
    unlockAt: h[0],
    upgrades: [{ at: h[1], ap: 1 as const }, { at: h[2], ap: 2 as const }, { at: h[3], ap: 5 as const }],
  }));
  return { note: 'Illustrative order. Live data shows the win rate and match count for each order.', winRate, matches, rows };
}

// ---------------------------------------------------------------------------------------------------------
// Build generator
// ---------------------------------------------------------------------------------------------------------

interface Recipe { kind: BuildKind; seed: string; bias: number; elite: boolean; wr: [number, number]; pr: [number, number]; n: [number, number] }
const RECIPES: Recipe[] = [
  { kind: 'meta', seed: 'meta', bias: 0, elite: false, wr: [50.4, 52.6], pr: [30, 42], n: [3800, 14000] },
  { kind: 'winrate', seed: 'wr', bias: 1, elite: false, wr: [53.4, 56.2], pr: [6, 14], n: [900, 4200] },
  { kind: 'popular', seed: 'pop', bias: -1, elite: false, wr: [49.2, 51.6], pr: [38, 55], n: [5200, 19000] },
  { kind: 'pro', seed: 'pro', bias: 1, elite: true, wr: [55.2, 59.8], pr: [3, 9], n: [160, 900] },
];

function makeItems(slug: string, recipe: Recipe, r: () => number, sampleSize: number): BuildPhase[] {
  const w = weightsFor(slug);
  const used = new Set<string>();
  const counts = [4 + Math.floor(r() * 2), 4 + Math.floor(r() * 2), 4 + Math.floor(r() * 3)];
  const tiersFor = (phase: number): number[] => {
    if (phase === 0) return recipe.elite ? [1, 2] : [1, 1, 2];
    if (phase === 1) return recipe.bias > 0 ? [2, 3, 3] : [2, 2, 3];
    return recipe.elite ? [3, 4, 4, 4] : recipe.bias < 0 ? [3, 3, 4] : [3, 4, 4];
  };
  let order = 0;
  return PHASES.map((ph, pi) => {
    const tiers = tiersFor(pi);
    const chosen: typeof POOL = [];
    for (let k = 0; k < counts[pi]; k++) {
      const tier = tiers[k % tiers.length];
      const [it] = weightedSample(r, POOL.filter((i) => i.tier === tier && !used.has(i.name)), (i) => w[i.category] * (0.55 + r()), 1);
      if (it) { used.add(it.name); chosen.push(it); }
    }
    // Earlier-bought items sit earlier in the window.
    const items: BuildItemStat[] = chosen.map((it, k) => {
      order++;
      const span = ph.to - ph.from;
      const base = ph.from + (span * (k + 0.5)) / chosen.length;
      const share = clamp(0.8 - k * 0.07 - pi * 0.06 + (r() - 0.5) * 0.2 + (recipe.kind === 'meta' || recipe.kind === 'popular' ? 0.05 : -0.1), 0.22, 0.93);
      return {
        name: it.name, category: it.category, order,
        picks: Math.round(sampleSize * share), of: sampleSize,
        avgBuy: r1(clamp(base + (r() - 0.5) * 1.8, ph.from, ph.to)),
        winRate: r1(clamp(50.8 + (recipe.bias > 0 ? 2.2 : recipe.bias < 0 ? -0.6 : 0.6) + (r() - 0.45) * 5 + (it.tier - 2) * 0.4, 45.5, 62)),
      };
    });
    return { id: ph.id, label: ph.label, range: ph.range, items };
  });
}

function dominantTags(phases: BuildPhase[], r: () => number): string[] {
  const tally: Record<ItemCategory, number> = { weapon: 0, vitality: 0, spirit: 0 };
  for (const p of phases) for (const i of p.items) tally[i.category]++;
  const tags = (Object.keys(tally) as ItemCategory[]).sort((a, b) => tally[b] - tally[a]).slice(0, 2).map((c) => TAGS_BY_CAT[c]);
  return [...tags, pick(r, EXTRA_TAGS)];
}

const handle = (r: () => number) => `${pick(r, FIRST)}${pick(r, SECOND)}`;

const codeFor = (slug: string, seed: string): string => `sample-${hash(`code:${slug}:${seed}`).toString(36).slice(0, 6).padEnd(6, '0')}`;

function buildFrom(slug: string, recipe: Recipe): HeroBuild {
  const hero = getHero(slug)!;
  const r = rng(hash(`build:${slug}:${recipe.seed}`));
  const sampleSize = Math.round(between(r, recipe.n[0], recipe.n[1]) / 6);
  const phases = makeItems(slug, recipe, r, sampleSize);
  const winRate = r1(between(r, recipe.wr[0], recipe.wr[1]));
  const matches = Math.round(between(r, recipe.n[0], recipe.n[1]));
  const pro = recipe.kind === 'pro';
  return {
    id: `${slug}-${recipe.seed}`,
    code: codeFor(slug, recipe.seed),
    heroSlug: slug,
    kind: recipe.kind,
    origin: recipe.kind === 'meta' || recipe.kind === 'popular' ? 'ingame' : 'community',
    eternus: pro,
    title: recipe.kind === 'meta' ? `${hero.name} meta consensus` : recipe.kind === 'popular' ? `${hero.name} most played` : recipe.kind === 'winrate' ? `${hero.name} best results` : `${hero.name} Eternus build`,
    author: pro ? handle(r) : undefined,
    blurb: BLURBS[recipe.kind](hero.name),
    winRate,
    pickRate: r1(between(r, recipe.pr[0], recipe.pr[1])),
    matches,
    trend: r1((r() - 0.45) * 2.4),
    likes: pro ? Math.round(between(r, 40, 420)) : undefined,
    ageDays: pro ? Math.round(between(r, 1, 18)) : undefined,
    tags: [...dominantTags(phases, r), ...(pro ? ['Eternus'] : [])].slice(0, 4),
    phases,
    skill: sampleSkill(slug, recipe.seed, r1(winRate + (r() - 0.4) * 1.2), Math.round(matches * 0.8)),
    sample: pro ? 'Eternus players, last 30 days' : 'All ranks, last 14 days',
    illustrative: true,
  };
}

/** The four builds shown on a hero page: meta consensus, highest win rate, most popular and the Eternus pick. Deterministic per hero. */
export function sampleHeroBuilds(slug: string): HeroBuild[] {
  if (!getHero(slug)) return [];
  return RECIPES.map((rc) => buildFrom(slug, rc));
}

/** Extra community builds for the hub: a few per hero, written by invented handles. */
export function sampleCommunityBuilds(slug: string): HeroBuild[] {
  const hero = getHero(slug);
  if (!hero) return [];
  const type = getHeroStats(slug)?.type ?? '';
  const titles = TITLES[type] ?? TITLES[''];
  const r = rng(hash(`community:${slug}`));
  const out: HeroBuild[] = [];
  const n = 3 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const elite = r() < 0.38;
    const rc: Recipe = { kind: 'community', seed: `c${i}`, bias: r() < 0.5 ? 1 : 0, elite, wr: elite ? [54, 59] : [48.6, 54.8], pr: [0.4, 6], n: elite ? [90, 520] : [160, 2600] };
    const b = buildFrom(slug, rc);
    const title = pick(r, titles);
    out.push({
      ...b,
      title: `${hero.name}: ${title}`,
      author: handle(r),
      eternus: elite,
      origin: 'community',
      blurb: `${title} on ${hero.name}. ${elite ? 'Tuned by Eternus players.' : 'Shared by a community builder.'}`,
      likes: Math.round(between(r, 3, elite ? 380 : 140)),
      ageDays: Math.round(between(r, 0, 60)),
      sample: elite ? 'Eternus players, last 30 days' : 'All ranks, last 30 days',
    });
  }
  return out;
}

let ALL: HeroBuild[] | null = null;
/** Every sample build for every playable hero: the pool behind the builds hub. */
export function allSampleBuilds(): HeroBuild[] {
  if (!ALL) {
    ALL = HEROES.filter((h) => !h.unreleased && getHeroStats(h.slug)).flatMap((h) => [...sampleHeroBuilds(h.slug), ...sampleCommunityBuilds(h.slug)]);
  }
  return ALL;
}

// ---------------------------------------------------------------------------------------------------------
// Hub browsing
// ---------------------------------------------------------------------------------------------------------

export type BuildFilter = 'all' | 'ingame' | 'community' | 'pro';
export type BuildSort = 'popular' | 'trending' | 'newest' | 'winrate';

export const FILTER_LABEL: Record<BuildFilter, string> = { all: 'All', ingame: 'In-game', community: 'Community', pro: 'Pro · Eternus' };
export const SORT_LABEL: Record<BuildSort, string> = { popular: 'Popular', trending: 'Trending', newest: 'Newest', winrate: 'Win rate' };

export function browseBuilds(all: HeroBuild[], opts: { filter: BuildFilter; sort: BuildSort; hero?: string | null; q?: string }): HeroBuild[] {
  const q = (opts.q ?? '').trim().toLowerCase();
  const list = all.filter((b) => {
    if (opts.hero && b.heroSlug !== opts.hero) return false;
    if (opts.filter === 'ingame' && b.origin !== 'ingame') return false;
    if (opts.filter === 'community' && b.origin !== 'community') return false;
    if (opts.filter === 'pro' && !b.eternus) return false;
    if (q && !`${b.title} ${b.author ?? ''} ${getHero(b.heroSlug)?.name ?? ''} ${b.tags.join(' ')}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const by: Record<BuildSort, (a: HeroBuild, b: HeroBuild) => number> = {
    popular: (a, b) => (b.likes ?? (b.pickRate ?? 0) * 6) - (a.likes ?? (a.pickRate ?? 0) * 6),
    trending: (a, b) => b.trend - a.trend,
    newest: (a, b) => (a.ageDays ?? 999) - (b.ageDays ?? 999),
    winrate: (a, b) => (b.winRate ?? -1) - (a.winRate ?? -1),
  };
  // Pro builds are ranked on win rate unless the person asks for another order.
  return [...list].sort(opts.filter === 'pro' && opts.sort === 'popular' ? by.winrate : by[opts.sort]);
}
