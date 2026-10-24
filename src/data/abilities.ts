import info from './abilityInfo.json';
import type { Ability, AbilityCardData } from './types';
import cards from './abilityCards.json';
import blankIcon from '../assets/ui/ability-blank.svg';

const CARDS = cards as unknown as Record<string, (AbilityCardData | null)[] | null>;

/**
 * Ability names, descriptions and base stats per hero, in slot order (1, 2, 3, ultimate). Gathered from the public
 * Deadlock wiki; re-check against the game's own hero data (/v1/assets/heroes) before launch because numbers change
 * every patch. Heroes whose abilities are not published yet have null names; heroes with a name but no icon get a placeholder.
 */
interface Row { role: string | null; released: boolean; abilities: { name: string | null; desc: string | null; cooldown: number | null; stats: string | null }[] }
const INFO = info as unknown as Record<string, Row>;

const iconUrls = import.meta.glob('../assets/abilities/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const slugify = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Four abilities with icons for a hero, or undefined when they are unpublished or an icon is missing. */
export function getAbilities(heroSlug: string): [Ability, Ability, Ability, Ability] | undefined {
  const row = INFO[heroSlug];
  if (!row || row.abilities.length !== 4) return undefined;
  const list: Ability[] = [];
  for (const [i, a] of row.abilities.entries()) {
    if (!a.name) return undefined;
    // newly released heroes may not have an icon in the pack yet: show a plain placeholder rather than hiding the kit
    const icon = iconUrls[`../assets/abilities/${slugify(a.name)}.png`] ?? blankIcon;
    list.push({ name: a.name, icon, desc: a.desc ?? undefined, cooldown: a.cooldown, stats: a.stats, card: CARDS[heroSlug]?.[i] ?? undefined });
  }
  return list as [Ability, Ability, Ability, Ability];
}

/** Kits read straight from the game's own ability data (scripts/abilities.vdata_c) rather than the wiki. */
const FROM_GAME_FILES = new Set(['nurse-harrow']);
export const abilitySource = (slug: string): 'game' | 'wiki' => (FROM_GAME_FILES.has(slug) ? 'game' : 'wiki');

export const heroRole = (slug: string): string | undefined => INFO[slug]?.role ?? undefined;
