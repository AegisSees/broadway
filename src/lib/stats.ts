/** Small, pure statistics helpers. Everything here is unit tested (stats.test.ts). */

export const pct = (part: number, whole: number): number => (whole > 0 ? (part / whole) * 100 : 0);

export const fmtPct = (value: number, digits = 1): string => `${value.toFixed(digits)}%`;

export const fmtInt = (n: number): string => n.toLocaleString('en-US');

/**
 * Win rate pulled toward 50% for small samples, used only to ORDER lists (never displayed).
 * With k = 100 a 3-0 record scores ~51.5% and 600-400 scores ~59.1%; a 40-20 record (66.7% raw over
 * 60 matches) scores ~56%, so it cannot outrank the larger sample.
 */
export function shrunkRate(wins: number, matches: number, prior = 0.5, k = 100): number {
  return (wins + prior * k) / (matches + k);
}

export type Confidence = 'low' | 'ok' | 'high';

/** Sample-size label shown next to statistics so players can judge how much to trust a number. */
export function confidence(matches: number): Confidence {
  if (matches < 100) return 'low';
  if (matches < 1000) return 'ok';
  return 'high';
}

export const confidenceLabel: Record<Confidence, string> = {
  low: 'Low sample',
  ok: 'Moderate sample',
  high: 'Large sample',
};

/** Share of all picks (not of all matches): hero matches divided by the sum over every hero. */
export function pickShare(heroMatches: number, allHeroMatches: number): number {
  return pct(heroMatches, allHeroMatches);
}

/**
 * Placeholder tier used only when the data source supplies none. Bands are on win rate alone, so treat it as a
 * rough guide: a real tier list also weighs pick rate, sample size and patch context.
 */
export function tierFromWinRate(winRate: number): 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' {
  if (winRate >= 54) return 'S+';
  if (winRate >= 52.5) return 'S';
  if (winRate >= 51) return 'A';
  if (winRate >= 49.5) return 'B';
  if (winRate >= 48) return 'C';
  return 'D';
}
