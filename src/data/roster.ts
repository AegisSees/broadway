import manifest from '../assets/heroes/manifest.json';
import { isOut } from './newHeroes';
import celesteArt from '../assets/art/celeste-art.webp';
import hazeArt from '../assets/art/haze-art.webp';

const iconUrls = import.meta.glob('../assets/icons/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const renderUrls = import.meta.glob('../assets/renders/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const portraitUrls = import.meta.glob('../assets/heroes/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export interface Hero {
  slug: string;
  name: string;
  /** Card portrait (177x240). Heroes without supplied art fall back to initials. */
  portrait?: string;
  /** Large transparent cut-out splash art, where supplied (Haze, Celeste). */
  art?: string;
  /** Square promotional render (every hero), faded into the page header when there is no cut-out. */
  render?: string;
  /** Small head icon on a transparent background, used in matchup lists and search. */
  icon?: string;
  /** Announced hero whose abilities have not been published yet. */
  unreleased?: boolean;
}

const ALT_PORTRAITS = new Set(['silver-transformed']);
const SPLASH: Record<string, string> = { haze: hazeArt, celeste: celesteArt };

const fromManifest: Hero[] = (manifest as { name: string; slug: string }[])
  .filter((m) => !ALT_PORTRAITS.has(m.slug))
  .map((m) => ({ slug: m.slug, name: m.name, portrait: portraitUrls[`../assets/heroes/${m.slug}.png`], art: SPLASH[m.slug] }));


// Heroes without a card from the manifest. All of them are playable now; their art and kits come from the game files.
const EXTRA: Hero[] = [
  { slug: 'celeste', name: 'Celeste', art: SPLASH.celeste },
  { slug: 'baba', name: 'Baba' },
  { slug: 'venator', name: 'Venator' },
  { slug: 'rat-king', name: 'Rat King' },
  { slug: 'deadman-danny', name: 'Deadman Danny' },
  { slug: 'nurse-harrow', name: 'Nurse Harrow' },
  { slug: 'solomon', name: 'Solomon' },
  { slug: 'violet', name: 'Violet' },
];

const withImages = (h: Hero): Hero => ({
  ...h,
  /** An announced hero counts as released once her unlock time has passed. */
  unreleased: h.unreleased && !isOut(h.slug) ? true : undefined,
  portrait: h.portrait ?? portraitUrls[`../assets/heroes/${h.slug}.png`],
  icon: iconUrls[`../assets/icons/${h.slug}.png`],
  render: renderUrls[`../assets/renders/${h.slug}.webp`],
});
export const HEROES: Hero[] = [...fromManifest, ...EXTRA].map(withImages).sort((a, b) =>
  a.name.localeCompare(b.name),
);

const bySlug = new Map(HEROES.map((h) => [h.slug, h]));
export const getHero = (slug: string | undefined): Hero | undefined => (slug ? bySlug.get(slug) : undefined);

export const initials = (name: string): string =>
  name
    .replace(/&/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/** Heroes that have splash art, used for the home-page spotlight (a different one is picked per visit). */
export const SPOTLIGHT_POOL: Hero[] = HEROES.filter((h) => h.art);
