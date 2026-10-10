import { describe, expect, it } from 'vitest';
import { confidence, fmtPct, pct, pickShare, shrunkRate, tierFromWinRate } from './stats';

describe('stats helpers', () => {
  it('computes percentages and guards divide-by-zero', () => {
    expect(pct(50, 200)).toBe(25);
    expect(pct(5, 0)).toBe(0);
    expect(fmtPct(53.456)).toBe('53.5%');
  });
  it('shrinks small samples toward 50% so they cannot outrank large ones', () => {
    expect(shrunkRate(3, 3)).toBeLessThan(shrunkRate(600, 1000));
    expect(shrunkRate(3, 3)).toBeGreaterThan(0.5);
    expect(shrunkRate(600, 1000)).toBeCloseTo(0.5909, 3);
    expect(shrunkRate(40, 60)).toBeLessThan(shrunkRate(600, 1000));
  });
  it('labels sample confidence', () => {
    expect(confidence(10)).toBe('low');
    expect(confidence(500)).toBe('ok');
    expect(confidence(5000)).toBe('high');
  });
  it('computes pick share across all heroes', () => {
    expect(pickShare(10, 200)).toBe(5);
  });
});

describe('tierFromWinRate', () => {
  it('bands win rate into S+ through D', () => {
    expect(tierFromWinRate(54.2)).toBe('S+');
    expect(tierFromWinRate(53.4)).toBe('S');
    expect(tierFromWinRate(51.5)).toBe('A');
    expect(tierFromWinRate(50)).toBe('B');
    expect(tierFromWinRate(48.5)).toBe('C');
    expect(tierFromWinRate(46)).toBe('D');
  });
});
