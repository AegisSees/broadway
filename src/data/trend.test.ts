import { describe, expect, it } from 'vitest';
import { DAY, normalizeTrend, patchMarks, trendSummary, trendView, type HeroTrend } from './trend';

const END = Math.floor(Date.UTC(2026, 9, 8) / 1000 / DAY) * DAY;

/** A plain 140-day series with four patch days, written out by a formula so the expected values are easy to see. */
function series(days = 140): HeroTrend {
  const points = Array.from({ length: days }, (_, i) => ({ t: END - (days - 1 - i) * DAY, winRate: 48 + (i % 5), matches: 100 + i }));
  const patches = [100, 70, 40, 10].map((ago) => ({ t: END - ago * DAY, label: '' }));
  return { points, patches };
}

describe('trendView', () => {
  const t = series();
  it('cuts the last four weeks', () => {
    const v = trendView(t, '4w');
    expect(v.points.length).toBe(28);
    expect(v.patches.every((p) => p.t >= v.points[0].t)).toBe(true);
  });
  it('collapses to one weighted point per patch', () => {
    const v = trendView(t, 'patch');
    expect(v.byPatch).toBe(true);
    expect(v.points.length).toBe(v.patches.length);
    expect(v.points.length).toBeLessThan(t.points.length / 5);
    const lo = Math.min(...t.points.map((p) => p.winRate)); const hi = Math.max(...t.points.map((p) => p.winRate));
    expect(v.points.every((p) => p.winRate >= lo && p.winRate <= hi)).toBe(true);
  });
});

describe('trendSummary', () => {
  it('weights the last week by matches and compares it with the week before', () => {
    const points = Array.from({ length: 14 }, (_, i) => ({ t: END - (13 - i) * DAY, winRate: i < 7 ? 50 : 52, matches: 100 }));
    const s = trendSummary({ points, patches: [] })!;
    expect(s.current).toBe(52);
    expect(s.delta).toBe(2);
    expect(s.matchesWeek).toBe(700);
  });
  it('returns null for an empty series', () => { expect(trendSummary({ points: [], patches: [] })).toBeNull(); });
});

describe('live normalising', () => {
  it('groups rows by day for one hero and drops empty days', () => {
    const rows = [
      { bucket: END - DAY + 5, hero_id: 1, matches: 100, wins: 55 },
      { bucket: END - DAY + 9, hero_id: 1, matches: 100, wins: 45 },
      { bucket: END, hero_id: 1, matches: 200, wins: 120 },
      { bucket: END, hero_id: 2, matches: 999, wins: 1 },
      { bucket: END - 2 * DAY, hero_id: 1, matches: 0, wins: 0 },
    ];
    const t = normalizeTrend(rows, 1, [])!;
    expect(t.points.map((p) => [p.t, p.winRate, p.matches])).toEqual([[END - DAY, 50, 200], [END, 60, 200]]);
    expect(normalizeTrend([], 1, [])).toBeNull();
  });
  it('reads patch dates from several field spellings and ignores junk', () => {
    const m = patchMarks([{ pub_date: '2026-09-30T12:00:00Z' }, { date: 1790000000 }, { published_at: 1790100000000 }, { nothing: true }, null]);
    expect(m.length).toBe(3);
    expect(m.every((x, i) => i === 0 || m[i - 1].t <= x.t)).toBe(true);
    expect(patchMarks('nope')).toEqual([]);
  });
});

describe('partial last day', () => {
  const day = (i: number, matches: number, wins: number) => ({ bucket: END - (6 - i) * DAY + 100, hero_id: 1, matches, wins });
  const full = [0, 1, 2, 3, 4, 5].map((i) => day(i, 1000, 520));

  it('drops a last day that is far smaller than the days before it', () => {
    const t = normalizeTrend([...full, day(6, 180, 68)], 1, [])!; // 37.8%: the cliff seen on 8 Oct 2026
    expect(t.points).toHaveLength(6);
    expect(t.points[t.points.length - 1].t).toBe(END - DAY);
    expect(Math.min(...t.points.map((p) => p.winRate))).toBe(52);
  });
  it('keeps a last day of a normal size, even when the win rate dips', () => {
    const t = normalizeTrend([...full, day(6, 900, 400)], 1, [])!;
    expect(t.points).toHaveLength(7);
    expect(t.points[6].winRate).toBe(44.44);
  });
  it('leaves short series alone', () => {
    const t = normalizeTrend([day(4, 1000, 500), day(5, 1000, 500), day(6, 10, 3)], 1, [])!;
    expect(t.points).toHaveLength(3);
  });
  it('judges against the last week only', () => {
    const old = [0, 1, 2, 3].map((i) => ({ bucket: END - (20 - i) * DAY, hero_id: 1, matches: 9000, wins: 4500 }));
    const t = normalizeTrend([...old, ...full, day(6, 700, 350)], 1, [])!;
    expect(t.points[t.points.length - 1].matches).toBe(700);
  });
});
