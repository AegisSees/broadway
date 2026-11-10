import { describe, expect, it } from 'vitest';
import { DEFAULT_PRIOR, confidence, confidenceOf, fitPrior, fmtDelta, fmtPct, pct, pickShare, rateView, shrink, shrunkRate, shrunkSd, wilson } from './stats';

describe('formatting', () => {
  it('computes percentages and guards divide-by-zero', () => {
    expect(pct(50, 200)).toBe(25);
    expect(pct(5, 0)).toBe(0);
    expect(fmtPct(53.456)).toBe('53.5%');
    expect(pickShare(10, 200)).toBe(5);
  });
  it('prints differences with a sign', () => {
    expect(fmtDelta(2.44)).toBe('+2.4');
    expect(fmtDelta(-1)).toBe('−1.0');
  });
});

describe('shrinkage', () => {
  it('pulls a small sample most of the way to the prior', () => {
    expect(shrink(6, 10)).toBeCloseTo(106 / 210, 6); // the worked example in stats.ts
    expect(shrink(60000, 100000)).toBeCloseTo(0.5998, 3);
  });
  it('never lets a lucky streak outrank a long record', () => {
    expect(shrunkRate(3, 3)).toBeLessThan(shrunkRate(600, 1000));
    expect(shrunkRate(3, 3)).toBeGreaterThan(0.5);
  });
  it('is less unsure with more games', () => {
    expect(shrunkSd(500, 1000)).toBeGreaterThan(shrunkSd(50000, 100000));
  });
  it('learns a weak prior when heroes really differ and a strong one when they do not', () => {
    // twelve heroes with 20,000 games each
    const spread = [0.42, 0.44, 0.46, 0.48, 0.49, 0.5, 0.5, 0.51, 0.52, 0.54, 0.56, 0.58].map((r) => ({ wins: Math.round(r * 20000), matches: 20000 }));
    const same = spread.map(() => ({ wins: 10000, matches: 20000 }));
    const a = fitPrior(spread), b = fitPrior(same);
    expect(a.mean).toBeCloseTo(0.5, 2);
    expect(a.strength).toBeGreaterThanOrEqual(50);
    expect(a.strength).toBeLessThan(300);
    expect(b.strength).toBe(5000);
  });
  it('falls back to the default prior with too few groups', () => {
    expect(fitPrior([{ wins: 10, matches: 20 }])).toEqual(DEFAULT_PRIOR);
  });
});

describe('Wilson range', () => {
  it('matches the worked examples', () => {
    const small = wilson(55, 100);
    expect(small.low).toBeCloseTo(0.452, 2);
    expect(small.high).toBeCloseTo(0.644, 2);
    const big = wilson(55000, 100000);
    expect(big.low).toBeGreaterThan(0.546);
    expect(big.high).toBeLessThan(0.554);
  });
  it('stays inside 0 to 100% and keeps some width on a perfect record', () => {
    const w = wilson(3, 3);
    expect(w.high).toBeLessThanOrEqual(1);
    expect(w.low).toBeGreaterThan(0.3);
    expect(w.low).toBeLessThan(1);
    expect(wilson(0, 0)).toEqual({ low: 0, high: 1 });
  });
});

describe('sample labels', () => {
  it('labels by the width of the range', () => {
    expect(confidenceOf(100, 200)).toBe('low');
    expect(confidenceOf(1000, 2000)).toBe('ok');
    expect(confidenceOf(10000, 20000)).toBe('high');
  });
  it('agrees with the game-count shortcut', () => {
    expect(confidence(10)).toBe('low');
    expect(confidence(1100)).toBe('ok');
    expect(confidence(9600)).toBe('high');
  });
  it('bundles everything the UI prints', () => {
    const v = rateView(550, 1000);
    expect(v.raw).toBe(55);
    expect(v.shrunk).toBeLessThan(55);
    expect(v.shrunk).toBeGreaterThan(50);
    expect(v.low).toBeLessThan(55);
    expect(v.high).toBeGreaterThan(55);
  });
});
