/**
 * Small, stable per-name variation for the tilted plates. The CSS in tilt.css derives each plate's angle from a
 * number; these helpers give a hero page its own numbers, so the labels do not lean the same way on every hero.
 */

/** A stable value in [0, 1) for a string (FNV-1a). */
export function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** A whole number from 0 to 11 that shifts every plate on a hero's page. */
export const tiltSeed = (slug: string): number => Math.floor(hash01(`${slug}/plates`) * 12);

/** Resting angle for a section title's tape strip, from its text: either direction, 0.6 to 1.8 degrees. */
export function headTilt(title: string): number {
  const sign = hash01(`${title}/dir`) < 0.5 ? -1 : 1;
  return Number((sign * (0.6 + hash01(`${title}/deg`) * 1.2)).toFixed(2));
}

/**
 * Multiplier for the hero trait tags: its sign decides which way the first tag leans, its size how far. Always at
 * least 0.7 either way, so no hero gets tags that sit dead straight.
 */
export function tagScale(slug: string): number {
  const h = hash01(`${slug}/tags`);
  const sign = hash01(`${slug}/flip`) < 0.5 ? -1 : 1;
  return Number((sign * (0.7 + h * 0.5)).toFixed(2));
}
