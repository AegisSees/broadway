import { RANKS, type Rank } from './types';

const urls = import.meta.glob('../assets/rank/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const u = (n: number): string | undefined => urls[`../assets/rank/rank${n}.webp`];

/** Tier numbers as the game and the Deadlock API use them: Obscurus 0 (unranked), Initiate 1 ... Eternus 11. */
export const TIER_NUMBER: Record<Rank | 'Obscurus', number> = Object.fromEntries([
  ['Obscurus', 0], ...RANKS.map((r, i) => [r, RANKS.length - i] as const),
]) as Record<Rank | 'Obscurus', number>;

/** Sub-levels run I to VI. */
export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'] as const;

/**
 * Badge art for a rank (the animal plaque from the Deadlock Wiki's Ranked Mode page).
 * Obscurus (unranked), Initiate and Acolyte come from the game's own files (ranked/badges/rankNN_lg).
 */
export function rankBadge(rank: string): string | undefined {
  const t = TIER_NUMBER[rank as Rank | 'Obscurus'];
  return t === undefined ? undefined : u(t);
}

/** What the wiki says each tier is made of (its badge material). */
export const RANK_MATERIAL: Record<Rank | 'Obscurus', string> = {
  Obscurus: 'Unranked', Initiate: 'Brick', Seeker: 'Stone', Acolyte: 'Iron', Sentinel: 'Bronze', Mystic: 'Silver', Ritualist: 'Gold',
  Emissary: 'Platinum', Oracle: 'Diamond', Phantom: '', Ascendant: '', Eternus: '',
};

/** Each tier's accent, sampled from the badge art, for tinted headings and bars. */
export const RANK_COLOR: Record<Rank | 'Obscurus', string> = {
  Obscurus: '#6b6b6b', Initiate: '#b4673f', Seeker: '#9a8b7c', Acolyte: '#8e98a6', Sentinel: '#d58f48', Mystic: '#cdd6e0', Ritualist: '#f0c444',
  Emissary: '#7fd0d6', Oracle: '#aeb0ff', Phantom: '#8c78f0', Ascendant: '#ffbb40', Eternus: '#5fe3cf',
};

/** Rank names in the order the game lists them, lowest first, including the unranked tier. */
export const LADDER: (Rank | 'Obscurus')[] = ['Obscurus', ...[...RANKS].reverse()];
