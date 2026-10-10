import info from './itemInfo.json';
import type { ItemCategory } from './types';

export interface ItemInfo { name: string; category: ItemCategory; tier: number; cost: number; desc: string; icon?: string; imbue?: boolean }

const iconUrls = import.meta.glob('../assets/items/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const RAW = info as unknown as Record<string, { slug: string; category: ItemCategory; tier: number; cost: number; desc: string; imbue?: boolean }>;

/** Items that were renamed by a patch. Older saved data may still use the old name. */
const ALIASES: Record<string, string> = { 'Mystic Reach': 'Mystic Expansion', 'Improved Cooldown': 'Compress Cooldown' };

export function getItem(name: string): ItemInfo | undefined {
  const real = ALIASES[name] ?? name;
  const r = RAW[real];
  return r ? { name: real, category: r.category, tier: r.tier, cost: r.cost, desc: r.desc, imbue: r.imbue, icon: iconUrls[`../assets/items/${r.slug}.png`] } : undefined;
}

export const ALL_ITEM_NAMES = Object.keys(RAW);

const NAME_BY_SLUG = new Map(Object.entries(RAW).map(([n, r]) => [r.slug, n]));
/** Stable URL-safe id for an item, used in shared build links. */
export const itemSlug = (name: string): string | undefined => RAW[ALIASES[name] ?? name]?.slug;
export const itemFromSlug = (slug: string): string | undefined => NAME_BY_SLUG.get(slug);

import cards from './itemCards.json';

export interface ItemCardData {
  stats: { label: string; value: string; conditional?: boolean }[];
  kind: 'Passive' | 'Active' | 'Passive+Active' | 'None';
  cooldown: string | null;
  effect: string;
  tiles: { value: string; label: string; key?: boolean }[];
  note: string | null;
  upgradesFrom: string | null;
  components: string[];
}
/** Structured shop-card data from the Deadlock wiki (default variant), keyed by current item name. */
export const getItemCard = (name: string): ItemCardData | undefined => (cards as unknown as Record<string, ItemCardData | null>)[ALIASES[name] ?? name] ?? undefined;

let BUILDS: Record<string, string[]> | null = null;
/** Items that list this one as a component or direct upgrade source. */
export function buildsInto(name: string): string[] {
  if (!BUILDS) {
    BUILDS = {};
    for (const [n, c] of Object.entries(cards as unknown as Record<string, ItemCardData | null>)) {
      if (!c) continue;
      const src = c.components.length ? c.components : c.upgradesFrom ? [c.upgradesFrom] : [];
      for (const f of src) (BUILDS[f] ??= []).push(n);
    }
  }
  return BUILDS[ALIASES[name] ?? name] ?? [];
}

/** Legendary (tier 5) items exist only in Street Brawl and have no soul cost. */
export const isLegendary = (name: string): boolean => getItem(name)?.tier === 5;
