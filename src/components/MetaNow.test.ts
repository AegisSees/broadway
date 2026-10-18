import { describe, expect, it } from 'vitest';
import { metaPicks } from './MetaNow';
import type { TierRow } from '../data/tiers';

const row = (slug: string, winRate: number, pickRate: number, matches: number, delta?: number): TierRow =>
  ({ slug, tier: 'A', winRate, pickRate, matches, delta, score: 50 });

describe('metaPicks', () => {
  const rows = [
    row('haze', 53, 22, 18000, -0.4), row('ivy', 51, 16, 15000, 1.6), row('seven', 55, 7, 6000, 0.2),
    row('lash', 49, 17, 14000, 0.1), row('rare', 60, 1, 300, 3), row('paradox', 54, 10, 9000, 0.5),
  ];
  const picks = metaPicks(rows);
  it('gives four picks, each a different hero', () => {
    expect(picks.map((p) => p.label)).toEqual(['Patch leader', 'Most picked', 'Sleeper pick', 'Climbing']);
    expect(new Set(picks.map((p) => p.row.slug)).size).toBe(4);
  });
  it('never crowns a hero with too few games', () => {
    expect(picks.some((p) => p.row.slug === 'rare')).toBe(false);
    expect(picks[0].row.slug).toBe('seven');
  });
  it('picks the sleeper from the less played half', () => {
    expect(picks[2].row.slug).toBe('paradox');
  });
  it('shows nothing for a tiny list', () => { expect(metaPicks(rows.slice(0, 2))).toEqual([]); });
});
