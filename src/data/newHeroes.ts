/**
 * The six heroes of the City Never Sleeps update, in release order. Heroes unlock Tuesdays and Fridays at 2 PM Pacific
 * (21:00 UTC while daylight saving time lasts). Status is worked out from the clock, so a hero flips to "out" by itself
 * when her time comes. Dates are from the official update page and Deadlock Labs' hero pages.
 */
export interface Newcomer {
  slug: string;
  /** Unlock instant, ISO 8601 UTC. Biographies are in heroLore.ts with everyone else's. */
  at: string;
}

export const NEWCOMERS: Newcomer[] = [
  { slug: 'rat-king', at: '2026-10-02T21:00:00Z' },
  { slug: 'baba', at: '2026-10-06T21:00:00Z' },
  { slug: 'solomon', at: '2026-10-09T21:00:00Z' },
  { slug: 'deadman-danny', at: '2026-10-13T21:00:00Z' },
  { slug: 'violet', at: '2026-10-16T21:00:00Z' },
  { slug: 'nurse-harrow', at: '2026-10-20T21:00:00Z' },
];

export const getNewcomer = (slug: string | undefined): Newcomer | undefined => NEWCOMERS.find((n) => n.slug === slug);
export const isOut = (slug: string, now: number = Date.now()): boolean => {
  const n = getNewcomer(slug);
  return !!n && Date.parse(n.at) <= now;
};

const PT = 'America/Los_Angeles';
/** "Oct 16" in Pacific time, the way the unlock schedule is announced. */
export const releaseDay = (n: Newcomer): string => new Date(n.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: PT });
/** "Tue, Oct 20" in Pacific time. */
export const releaseWeekday = (n: Newcomer): string => new Date(n.at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: PT });
/** The next hero still to unlock, if any. */
export const nextUnlock = (now: number = Date.now()): Newcomer | undefined => NEWCOMERS.find((n) => Date.parse(n.at) > now);

const NEW_FOR_MS = 14 * 24 * 60 * 60 * 1000;
/** True for a newcomer who unlocks soon or has been out for less than two weeks (drives the "New" flag in the directory). */
export const isNewHero = (slug: string, now: number = Date.now()): boolean => {
  const n = getNewcomer(slug);
  return !!n && now - Date.parse(n.at) < NEW_FOR_MS;
};
