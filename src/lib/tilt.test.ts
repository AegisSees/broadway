import { describe, expect, it } from 'vitest';
import { hash01, headTilt, tagScale, tiltSeed } from './tilt';
import { HEROES } from '../data/roster';

describe('tilt helpers', () => {
  it('is stable for the same name', () => {
    expect(tiltSeed('haze')).toBe(tiltSeed('haze'));
    expect(tagScale('abrams')).toBe(tagScale('abrams'));
    expect(hash01('x')).toBeGreaterThanOrEqual(0);
    expect(hash01('x')).toBeLessThan(1);
  });
  it('keeps the seed in range and the tag scale away from zero', () => {
    for (const h of HEROES) {
      const s = tiltSeed(h.slug);
      expect(Number.isInteger(s) && s >= 0 && s <= 11).toBe(true);
      const t = Math.abs(tagScale(h.slug));
      expect(t).toBeGreaterThanOrEqual(0.7);
      expect(t).toBeLessThanOrEqual(1.2);
    }
  });
  it('tilts section titles both ways, never flat', () => {
    const t = ['Win rate over time', 'Top builds', 'Know your matchups', 'Base stats', 'Abilities', 'Pick rate & damage', 'Questions', 'The six newcomers'].map(headTilt);
    expect(t.every((x) => Math.abs(x) >= 0.6 && Math.abs(x) <= 1.8)).toBe(true);
    expect(new Set(t.map(Math.sign)).size).toBe(2);
  });
  it('spreads heroes across seeds and across both directions', () => {
    const seeds = new Set(HEROES.map((h) => tiltSeed(h.slug)));
    expect(seeds.size).toBeGreaterThanOrEqual(8);
    const dirs = new Set(HEROES.map((h) => Math.sign(tagScale(h.slug))));
    expect(dirs.size).toBe(2);
  });
});
