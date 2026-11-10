import { getHero } from './roster';
import { getItem, itemSlug } from './items';
import type { ItemCategory, SkillPath } from './types';

/**
 * Hero builds: the "top four" shown on every hero page and the browsable builds hub.
 *
 * A build is a list of items grouped by when they are usually bought (laning 0-10 min, mid game 10-22, late 22+),
 * how many of the sampled builds contain each item, the average time it is bought, and the win rate when it is.
 * It also carries a skill order and a shareable code.
 *
 * Every build here is a real one published in the game's build browser; communityBuilds.ts maps them from the API.
 */

export type BuildKind = 'meta' | 'winrate' | 'popular' | 'pro' | 'community';
export type BuildOrigin = 'ingame' | 'community';
export type PhaseId = 'laning' | 'mid' | 'late';

export interface BuildItemStat {
  name: string;
  category: ItemCategory;
  /** 1-based purchase order across the whole build. */
  order: number;
  /** Builds that contain this item, out of `of`, when the source has per-item numbers. */
  picks?: number;
  of?: number;
  /** Average minute the item is bought. */
  avgBuy?: number;
  winRate?: number;
  /** The author's note on the item, for published builds. */
  note?: string;
}

/** A stage of the build. Published builds keep their author's own sections. */
export interface BuildPhase { id: string; label: string; range: string; items: BuildItemStat[] }

export interface HeroBuild {
  id: string;
  /** The shareable code: the in-game build id. */
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

/** Sections with this many items or fewer can share a row with a short neighbour. */
export const SHORT_PHASE = 6;

/**
 * How wide each build section sits on the board: two short sections in a row share it half and half, in buy order;
 * everything else (long sections, and a short one without a short neighbour) takes the full width.
 */
export function phaseWidths(phases: readonly { items: readonly unknown[] }[]): ('full' | 'half')[] {
  const out: ('full' | 'half')[] = [];
  for (let i = 0; i < phases.length; i++) {
    const next = phases[i + 1];
    if (phases[i].items.length <= SHORT_PHASE && next && next.items.length <= SHORT_PHASE) { out.push('half', 'half'); i++; }
    else out.push('full');
  }
  return out;
}

/** The soul cost of a section's items (Street Brawl legendaries cost nothing). */
export const phaseCost = (items: readonly { name: string }[]): number => items.reduce((s, i) => s + (getItem(i.name)?.cost ?? 0), 0);
