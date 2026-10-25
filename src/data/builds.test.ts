import { describe, expect, it } from 'vitest';
import { allSampleBuilds, browseBuilds, buildItemNames, fmtBuy, itemCount, plannerLink, sampleHeroBuilds, sampleSkill } from './builds';
import { getItem } from './items';

describe('sample hero builds', () => {
  it('gives four builds per hero, deterministically', () => {
    const a = sampleHeroBuilds('haze');
    const b = sampleHeroBuilds('haze');
    expect(a.map((x) => x.kind)).toEqual(['meta', 'winrate', 'popular', 'pro']);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(sampleHeroBuilds('abrams'))).not.toBe(JSON.stringify(a));
  });

  it('uses real, distinct items with sensible per-phase counts, and numbers them in order', () => {
    for (const b of sampleHeroBuilds('haze')) {
      const names = buildItemNames(b);
      expect(new Set(names).size).toBe(names.length);
      for (const n of names) expect(getItem(n)).toBeTruthy();
      expect(b.phases.map((p) => p.id)).toEqual(['laning', 'mid', 'late']);
      expect(b.phases.flatMap((p) => p.items.map((i) => i.order))).toEqual(names.map((_, i) => i + 1));
      expect(itemCount(b)).toBe(names.length);
      for (const p of b.phases) for (const i of p.items) { expect(i.picks).toBeLessThanOrEqual(i.of!); expect(i.picks).toBeGreaterThan(0); }
    }
  });

  it('marks every invented code with sample- and keeps the Eternus build on Eternus', () => {
    const list = sampleHeroBuilds('haze');
    expect(list.every((b) => b.code.startsWith('sample-') && b.illustrative)).toBe(true);
    const pro = list.find((b) => b.kind === 'pro')!;
    expect(pro.eternus).toBe(true);
    expect(pro.winRate).toBeGreaterThan(list.find((b) => b.kind === 'meta')!.winRate!);
  });

  it('builds a legal skill order: 16 distinct steps, each ability unlocked before it is upgraded, ult not before step 6', () => {
    for (const slug of ['haze', 'abrams', 'lash']) {
      const s = sampleSkill(slug, 'meta', 52, 1000);
      const steps = s.rows.flatMap((r) => [r.unlockAt, ...r.upgrades.map((u) => u.at)]);
      expect([...steps].sort((a, b) => a - b)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
      for (const r of s.rows) { const ups = r.upgrades.map((u) => u.at); expect(ups).toEqual([...ups].sort((a, b) => a - b)); expect(ups[0]).toBeGreaterThan(r.unlockAt); }
      expect(s.rows[3].unlockAt).toBeGreaterThanOrEqual(6);
    }
  });
});

describe('formatting and links', () => {
  it('formats buy times as m:ss', () => { expect(fmtBuy(5.5)).toBe('5:30'); expect(fmtBuy(12)).toBe('12:00'); expect(fmtBuy(9.999)).toBe('10:00'); });
  it('links into the planner with the hero and up to twelve item slugs', () => {
    const b = sampleHeroBuilds('haze')[0];
    const link = plannerLink(b);
    expect(link.startsWith('/planner?hero=haze&i=')).toBe(true);
    expect(link.split('i=')[1].split(',').length).toBeLessThanOrEqual(12);
  });
});

describe('browseBuilds', () => {
  const all = allSampleBuilds();
  it('covers many heroes', () => { expect(new Set(all.map((b) => b.heroSlug)).size).toBeGreaterThan(25); });
  it('filters by origin and Eternus', () => {
    expect(browseBuilds(all, { filter: 'ingame', sort: 'popular' }).every((b) => b.origin === 'ingame')).toBe(true);
    const pro = browseBuilds(all, { filter: 'pro', sort: 'popular' });
    expect(pro.length).toBeGreaterThan(10);
    expect(pro.every((b) => b.eternus)).toBe(true);
    // Pro is ranked by win rate unless another sort is chosen.
    expect(pro.map((b) => b.winRate)).toEqual([...pro.map((b) => b.winRate)].sort((a, b) => b! - a!));
  });
  it('filters by hero and searches titles, authors and tags', () => {
    const h = browseBuilds(all, { filter: 'all', sort: 'newest', hero: 'haze' });
    expect(h.length).toBeGreaterThan(3);
    expect(h.every((b) => b.heroSlug === 'haze')).toBe(true);
    expect(browseBuilds(all, { filter: 'all', sort: 'popular', q: 'eternus' }).length).toBeGreaterThan(0);
    expect(browseBuilds(all, { filter: 'all', sort: 'popular', q: 'zzzzqqq' })).toEqual([]);
  });
  it('sorts by win rate and newest', () => {
    const w = browseBuilds(all, { filter: 'all', sort: 'winrate' });
    expect(w[0].winRate).toBeGreaterThanOrEqual(w[w.length - 1].winRate!);
    const n = browseBuilds(all, { filter: 'community', sort: 'newest' });
    expect(n[0].ageDays ?? 999).toBeLessThanOrEqual(n[n.length - 1].ageDays ?? 999);
  });
});
