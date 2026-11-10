import type { RateView } from '../lib/stats';
import type { WindowKey } from './patchWindow';
import type { DataMeta } from './tiers';

export type Mode = 'standard' | 'street_brawl';
export type Queue = 'ranked' | 'unranked';

export const RANKS = [
  'Eternus', 'Ascendant', 'Phantom', 'Oracle', 'Emissary', 'Ritualist', 'Mystic', 'Sentinel', 'Acolyte', 'Seeker', 'Initiate',
] as const;
export type Rank = (typeof RANKS)[number];

/**
 * Rank brackets: a few neighbouring ranks taken together. One rank on its own often has too few games for a hero's win
 * rate to mean much, so the filter offers these wider groups first. `low` and `high` are rank tiers (Initiate = 1,
 * Eternus = 11).
 */
export const BRACKETS = [
  { key: 'bracket-1', label: 'Initiate to Acolyte', low: 1, high: 3 },
  { key: 'bracket-2', label: 'Sentinel to Ritualist', low: 4, high: 6 },
  { key: 'bracket-3', label: 'Emissary and Oracle', low: 7, high: 8 },
  { key: 'bracket-4', label: 'Phantom and above', low: 9, high: 11 },
] as const;
export type BracketKey = (typeof BRACKETS)[number]['key'];
export type RankKey = 'all' | BracketKey | Rank;

export interface Filters {
  mode: Mode;
  queue: Queue;
  rank: RankKey;
  /** Which stretch of time the numbers cover. See data/patchWindow.ts. */
  window: WindowKey;
}

export const DEFAULT_FILTERS: Filters = { mode: 'standard', queue: 'ranked', rank: 'all', window: 'patch' };

export type ItemCategory = 'weapon' | 'vitality' | 'spirit';
export interface ItemRef {
  name: string;
  category: ItemCategory;
}

export interface BuildSlot {
  label: string;
  items: ItemRef[];
}

export interface LateItem {
  item: ItemRef;
  winRate: number;
  usage: number;
  matches: number;
  avgBuy: string;
}

export interface BuildPath {
  id: string;
  name: string;
  style: string;
  winRate: number;
  usage: number;
  matches: number;
  slots: BuildSlot[];
  lateGame: LateItem[];
}

export type ApStep = 1 | 2 | 5;
export interface SkillRow {
  abilityIndex: 0 | 1 | 2 | 3;
  /** Column (1-16) where the ability is first unlocked. */
  unlockAt: number;
  /** Columns where the ability receives its 1 / 2 / 5 AP upgrade. */
  upgrades: { at: number; ap: ApStep }[];
}
export interface SkillPath {
  note: string;
  winRate?: number;
  matches?: number;
  rows: SkillRow[];
}

export interface MatchupEntry {
  slug: string;
  name: string;
  /** Value used for the bar and label. */
  display: string;
  /** Hover text with the full working: raw rate, range and games. */
  detail?: string;
  /** True when the range still includes "no difference": drawn greyed out. */
  unsure?: boolean;
  /** 0..1 bar fill relative to the group. */
  fill: number;
  matches: number;
}
export interface MatchupGroup {
  key: 'best' | 'worst' | 'synergy' | 'lane';
  title: string;
  subtitle: string;
  tone: 'good' | 'bad';
  /** Which hero-page badge art to show beside the title. */
  badge?: 'deflated' | 'gloat';
  entries: MatchupEntry[];
}

export interface Guide {
  id: string;
  title: string;
  author: string;
  updated: string;
  tags: string[];
}

export type Tier = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';

/** One day of a hero's 7-day trend. daysAgo 0 is today. */
export interface TrendPoint { daysAgo: number; winRate: number; pickRate: number; matches: number }

/** Where a hero's damage comes from. Abilities and items are matched by name; melee and misc have no icon. */
export interface DamageSource { name: string; kind: 'ability' | 'item' | 'melee' | 'misc'; share: number }
export interface DamageBreakdown { perMatch: number; sources: DamageSource[] }

/** Street Brawl "high rolls": for one item tier, how often each item is taken and how it performs. */
export interface HighRollStat { pickRate: number; winRate: number; matches: number }
/** One item in a Street Brawl tier, with its base numbers and the numbers for its Enhanced version. Tier 5 is Legendary. */
export interface HighRollItem extends HighRollStat { item: ItemRef; enhanced?: HighRollStat }
export interface HighRollTier { tier: 1 | 2 | 3 | 4 | 5; items: HighRollItem[] }

export interface HeroOverview {
  slug: string;
  tier?: Tier;
  winRate: number;
  pickRate: number;
  banRate?: number;
  overallRank?: { rank: number; of: number };
  matches: number;
  /** Win rate with its range and sample label. */
  rate?: RateView;
  /** Tier score in win-rate points, and its two parts. */
  score?: number;
  strength?: number;
  presence?: number;
  /** What the numbers cover. */
  meta?: DataMeta;
  builds: BuildPath[];
  skill?: SkillPath;
  matchups: MatchupGroup[];
  guides: Guide[];
  trends?: TrendPoint[];
  damage?: DamageBreakdown;
  highRolls?: HighRollTier[];
}

export interface Ability {
  name: string;
  icon: string;
  /** Plain-English summary from the Deadlock wiki. */
  desc?: string;
  /** Base-rank cooldown in seconds; null for passives. */
  cooldown?: number | null;
  /** Short base-rank stats string, e.g. "30 spirit damage; 0.3s wall stun". */
  stats?: string | null;
  /** Structured in-game style card data from the wiki, where gathered. */
  card?: AbilityCardData;
}

export interface AbilityCardData {
  name: string;
  chips: { k: 'cooldown' | 'charges' | 'duration' | 'range' | 'radius' | 'cast' | 'channel'; v: string }[];
  desc: string;
  sections: { title: string | null; tiles: { v: string; l: string; kind: 'spirit' | 'weapon' | 'health' | 'speed' | 'neutral'; scale: string | null }[]; rows: { v: string; l: string }[] }[];
  upgrades: string[];
}
