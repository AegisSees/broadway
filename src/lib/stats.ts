/**
 * Small, pure statistics helpers. Everything here is unit tested (stats.test.ts).
 *
 * The problem they solve: a raw win rate on a small sample is mostly luck. 6 wins in 10 games is "60%", but so is a
 * coin on a good day. Every win rate on the site therefore goes through three steps:
 *
 *   1. SHRINK it toward a sensible starting guess, more strongly the fewer games there are (`shrink`).
 *   2. Put a RANGE around it that says how far off it could reasonably be (`wilson`).
 *   3. Label the SAMPLE so thin numbers are greyed out or hidden (`confidenceOf`).
 */

export const pct = (part: number, whole: number): number => (whole > 0 ? (part / whole) * 100 : 0);
export const fmtPct = (value: number, digits = 1): string => `${value.toFixed(digits)}%`;
export const fmtInt = (n: number): string => n.toLocaleString('en-US');
/** "+2.4" / "−1.0": a difference in percentage points, with a real minus sign. */
export const fmtDelta = (points: number, digits = 1): string => `${points >= 0 ? '+' : '−'}${Math.abs(points).toFixed(digits)}`;

// ---------------------------------------------------------------------------------------------------------
// 1. Shrinkage (empirical Bayes)
// ---------------------------------------------------------------------------------------------------------

/**
 * A starting guess for a win rate before looking at one hero's own games.
 * `mean` is the guess itself (as a fraction, 0.5 = 50%). `strength` is how many imaginary games the guess is worth:
 * with strength 250, a hero needs about 250 real games before its own record counts as much as the guess.
 */
export interface Prior { mean: number; strength: number }

/** Used when there is too little data to learn a prior from: 50%, worth 200 games. */
export const DEFAULT_PRIOR: Prior = { mean: 0.5, strength: 200 };

/**
 * Learns the prior from the data itself ("empirical Bayes").
 *
 * Idea in plain words: look at how spread out the win rates of all heroes are. Part of that spread is real (some
 * heroes are stronger) and part is luck (small samples bounce around). We can work out how much spread luck alone
 * would cause, subtract it, and what is left is the real spread. If heroes really differ a lot, the prior is weak and
 * each hero's own record is trusted quickly. If they barely differ, the prior is strong and it takes many games to
 * move a hero away from the average.
 *
 * The maths is the "method of moments" fit of a Beta distribution:
 *   real spread   = spread we see  -  spread luck would cause
 *   strength      = mean * (1 - mean) / real spread  -  1
 * The strength is kept between 50 and 5,000 games so one odd bucket cannot produce a silly prior.
 */
export function fitPrior(groups: readonly { wins: number; matches: number }[]): Prior {
  const used = groups.filter((g) => g.matches >= 30);
  if (used.length < 8) return DEFAULT_PRIOR;
  const totalMatches = used.reduce((n, g) => n + g.matches, 0);
  const mean = used.reduce((n, g) => n + g.wins, 0) / totalMatches;
  const rates = used.map((g) => g.wins / g.matches);
  const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
  const seen = rates.reduce((n, r) => n + (r - avgRate) ** 2, 0) / rates.length;
  const fromLuck = used.reduce((n, g) => n + (mean * (1 - mean)) / g.matches, 0) / used.length;
  const real = seen - fromLuck;
  if (!(real > 0)) return { mean, strength: 5000 };
  const strength = (mean * (1 - mean)) / real - 1;
  return { mean, strength: Math.min(5000, Math.max(50, strength)) };
}

/**
 * The shrunk win rate, as a fraction: the hero's wins plus the prior's imaginary games, divided by all games.
 * 6 wins in 10 games with the default prior (50%, 200 games) gives (6 + 100) / (10 + 200) = 50.5%, not 60%.
 * 60,000 wins in 100,000 games gives 59.98%: with plenty of data the prior stops mattering.
 */
export function shrink(wins: number, matches: number, prior: Prior = DEFAULT_PRIOR): number {
  return (wins + prior.mean * prior.strength) / (matches + prior.strength);
}

/** How unsure the shrunk rate still is (one standard deviation, as a fraction). Shrinks as games pile up. */
export function shrunkSd(wins: number, matches: number, prior: Prior = DEFAULT_PRIOR): number {
  const p = shrink(wins, matches, prior);
  return Math.sqrt((p * (1 - p)) / (matches + prior.strength + 1));
}

/** Older name, kept for list ordering in a few places: shrink toward `prior` with `k` imaginary games. */
export function shrunkRate(wins: number, matches: number, prior = 0.5, k = 100): number {
  return shrink(wins, matches, { mean: prior, strength: k });
}

// ---------------------------------------------------------------------------------------------------------
// 2. Ranges (Wilson score interval)
// ---------------------------------------------------------------------------------------------------------

export interface Interval { low: number; high: number }

/**
 * The 95% Wilson interval for a win rate, as fractions.
 *
 * Plain words: "if this hero's true win rate were anywhere in this range, the record we saw would be unsurprising".
 * 55 wins in 100 games gives roughly 45% to 64%: we cannot even say the hero is above 50%.
 * 55,000 wins in 100,000 games gives 54.7% to 55.3%: now we can.
 *
 * Wilson is used instead of the textbook "plus or minus" formula because it behaves at the edges: it never goes
 * below 0% or above 100% and it does not collapse to zero width on a 3-0 record.
 */
export function wilson(wins: number, matches: number, z = 1.96): Interval {
  if (!(matches > 0)) return { low: 0, high: 1 };
  const p = wins / matches;
  const z2 = z * z;
  const centre = (p + z2 / (2 * matches)) / (1 + z2 / matches);
  const half = (z * Math.sqrt((p * (1 - p)) / matches + z2 / (4 * matches * matches))) / (1 + z2 / matches);
  return { low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
}

// ---------------------------------------------------------------------------------------------------------
// 3. Sample labels and thresholds
// ---------------------------------------------------------------------------------------------------------

/**
 * Minimum games before a number is shown at all, by kind of statistic. Below these it is hidden (the row is left out
 * and counted in the data notes), because even a shrunk number would mostly be the prior.
 */
export const MIN_GAMES = { hero: 200, matchup: 150, item: 200, bracket: 150 } as const;

export type Confidence = 'low' | 'ok' | 'high';

/**
 * How much to trust a win rate, from the width of its 95% range rather than a fixed game count:
 *   high: the range is at most 2 points wide   (about 9,600 games or more)
 *   ok:   at most 6 points wide                (about 1,100 games or more)
 *   low:  wider than that. Shown greyed out.
 */
export function confidenceOf(wins: number, matches: number): Confidence {
  const { low, high } = wilson(wins, matches);
  const width = (high - low) * 100;
  if (width <= 2) return 'high';
  if (width <= 6) return 'ok';
  return 'low';
}

/** Older helper by game count only, for places that have no win count. Same cut points as above. */
export function confidence(matches: number): Confidence {
  if (matches >= 9600) return 'high';
  if (matches >= 1100) return 'ok';
  return 'low';
}

export const confidenceLabel: Record<Confidence, string> = {
  low: 'Thin sample',
  ok: 'Fair sample',
  high: 'Solid sample',
};

/** Share of all picks (not of all matches): hero matches divided by the sum over every hero. */
export function pickShare(heroMatches: number, allHeroMatches: number): number {
  return pct(heroMatches, allHeroMatches);
}

/** Everything the UI needs to print one win rate honestly. Rates are in percent. */
export interface RateView {
  wins: number;
  matches: number;
  /** Wins over games, untouched. */
  raw: number;
  /** After shrinkage. This is the number the site leads with. */
  shrunk: number;
  /** 95% range of the raw rate. */
  low: number;
  high: number;
  confidence: Confidence;
}

export function rateView(wins: number, matches: number, prior: Prior = DEFAULT_PRIOR): RateView {
  const ci = wilson(wins, matches);
  const r1 = (x: number) => Math.round(x * 1000) / 10;
  return {
    wins, matches,
    raw: matches > 0 ? r1(wins / matches) : 0,
    shrunk: r1(shrink(wins, matches, prior)),
    low: r1(ci.low), high: r1(ci.high),
    confidence: confidenceOf(wins, matches),
  };
}
