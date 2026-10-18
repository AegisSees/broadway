import saved from './heroMoods.json';
import { getGloat } from './heroGloat';
import { getHero } from './roster';

/**
 * The game draws each hero's card three ways: the normal card, a "critical" card (bloodied, low health) and a
 * "gloat" card (proud). A player's match shows the critical card for a loss, the normal card for a win, and the
 * gloat card for a win where they finished in the game's top three.
 *
 * Gloat cards ship with the site (assets/gloat). Critical cards are not in the game-file snapshot, so they load from
 * the Deadlock API's asset bucket: addresses saved from its hero list (heroMoods.json), refreshed from the live list
 * whenever the site reads it (newer heroes appear that way). If one cannot be loaded, the normal card is shown with
 * a red, washed-out treatment instead (`tinted`).
 */
export type Mood = 'normal' | 'critical' | 'proud';

const SAVED = saved as Record<string, { critical?: string; gloat?: string }>;
const live = new Map<string, string>();

/** Called with each hero's asset images when the live hero list is read. */
export function rememberMoodImages(slug: string, images: Record<string, string> | undefined): void {
  const url = images?.hero_card_critical_webp ?? images?.hero_card_critical;
  if (url && /^https:\/\//.test(url)) live.set(slug, url);
}

/** Loss: critical. Win: proud if they placed in the top three, otherwise normal. */
export function moodFor(won: boolean, place?: number): Mood {
  if (!won) return 'critical';
  return place !== undefined && place >= 1 && place <= 3 ? 'proud' : 'normal';
}

export interface MoodImage {
  src?: string;
  /** Shown if `src` fails to load. */
  fallback?: string;
  /** Show the fallback with the low-health treatment. */
  tintOnFallback: boolean;
}

export function moodImage(slug: string | undefined, mood: Mood): MoodImage {
  const h = getHero(slug);
  const normal = h?.portrait ?? h?.icon;
  if (!slug || !h) return { src: undefined, fallback: undefined, tintOnFallback: false };
  if (mood === 'proud') return { src: getGloat(slug) ?? normal, fallback: normal, tintOnFallback: false };
  if (mood === 'critical') {
    const url = live.get(slug) ?? SAVED[slug]?.critical;
    return url ? { src: url, fallback: normal, tintOnFallback: true } : { src: normal, fallback: normal, tintOnFallback: true };
  }
  return { src: normal, fallback: normal, tintOnFallback: false };
}

/** True when a hero has no critical card to load, so the normal one must be tinted from the start. */
export const criticalIsLocalOnly = (slug: string | undefined): boolean => !!slug && !live.has(slug) && !SAVED[slug]?.critical;
