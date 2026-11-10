import { describe, expect, it } from 'vitest';
import buildsSaved from '../../api-samples/builds.json';
import type { BuildRaw } from '../api/types';
import { browseBuilds, fmtBuy, phaseCost, phaseWidths, plannerLink } from './builds';
import { normalizeBuild } from './communityBuilds';
import { getItem } from './items';

// Real published builds, saved from /v1/builds (three Bebop builds).
const NOW = Date.parse('2026-10-24T00:00:00Z');
const all = (buildsSaved as unknown as BuildRaw[]).map((raw) => normalizeBuild(raw, { slugById: (id) => (id === 15 ? 'bebop' : undefined), now: NOW })!);

describe('formatting and links', () => {
  it('formats buy times as m:ss', () => { expect(fmtBuy(5.5)).toBe('5:30'); expect(fmtBuy(12)).toBe('12:00'); expect(fmtBuy(9.999)).toBe('10:00'); });
  it('links into the planner with the hero and up to twelve item slugs', () => {
    const b = all[0];
    const link = plannerLink(b);
    expect(link.startsWith('/planner?hero=bebop&i=')).toBe(true);
    expect(link.split('i=')[1].split(',').length).toBeLessThanOrEqual(12);
  });
});

describe('browseBuilds', () => {
  it('filters by hero and searches titles, authors and tags', () => {
    expect(browseBuilds(all, { filter: 'all', sort: 'newest', hero: 'bebop' })).toHaveLength(all.length);
    expect(browseBuilds(all, { filter: 'all', sort: 'newest', hero: 'haze' })).toEqual([]);
    expect(browseBuilds(all, { filter: 'all', sort: 'popular', q: 'zzzzqqq' })).toEqual([]);
  });
  it('sorts by newest and by popularity', () => {
    const n = browseBuilds(all, { filter: 'all', sort: 'newest' });
    expect(n[0].ageDays ?? 999).toBeLessThanOrEqual(n[n.length - 1].ageDays ?? 999);
    const p = browseBuilds(all, { filter: 'all', sort: 'popular' });
    expect(p[0].likes ?? 0).toBeGreaterThanOrEqual(p[p.length - 1].likes ?? 0);
  });
});

describe('phaseWidths', () => {
  const ph = (n: number) => ({ items: Array.from({ length: n }) });
  it('pairs neighbouring short sections in order and leaves the rest full width', () => {
    expect(phaseWidths([ph(12), ph(4), ph(5), ph(11)])).toEqual(['full', 'half', 'half', 'full']);
    expect(phaseWidths([ph(3), ph(9), ph(2)])).toEqual(['full', 'full', 'full']);
    expect(phaseWidths([ph(2), ph(2), ph(2)])).toEqual(['half', 'half', 'full']);
  });
  it('adds up the soul cost of known items', () => {
    expect(phaseCost([{ name: 'Extra Regen' }, { name: 'Not an item' }])).toBe(getItem('Extra Regen')!.cost);
  });
});
