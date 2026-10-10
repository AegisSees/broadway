import hazeGloat from '../assets/art/haze-gloat.png';

const gameGloat = import.meta.glob('../assets/gloat/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

/**
 * Gloat / killstreak busts shown when the portrait on a hero page is hovered. Haze uses the art supplied for the
 * site; every other hero uses the gloat card from the game's own files.
 */
export const getGloat = (slug: string): string | undefined =>
  slug === 'haze' ? hazeGloat : gameGloat[`../assets/gloat/${slug}.webp`];
