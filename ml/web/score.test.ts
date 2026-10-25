import { describe, expect, it } from 'vitest';
import golden from './golden.json';
import {
  badgeToIndex, draftFeatures, indexToBadge, liveFeatures, nearestCentroid, recommendItems, scoreItem, scoreLinear,
  type BuildContext, type CentroidModel, type ItemTableModel, type LinearModel,
} from './score';

const base = { name: 't', trained_at: '', metrics: {}, notes: '' };
const clean = (x: Record<string, number | undefined>) =>
  Object.fromEntries(Object.entries(x).filter(([, v]) => v !== 0 && v !== undefined));

describe('ml scorer', () => {
  it('builds the same draft features as models/draft.py', () => {
    expect(clean(draftFeatures(golden.draft.team0, golden.draft.team1))).toEqual(golden.draft.features);
  });

  it('builds the same live features as models/live.py', () => {
    const x = liveFeatures(golden.live.gaps, golden.live.minute);
    for (const [k, v] of Object.entries(golden.live.features)) expect(x[k]).toBeCloseTo(v, 6);
  });

  it('scores an item like models/builds.py', () => {
    const m: ItemTableModel = { ...base, format: 'broadway-ml/table@1', key_names: ['item_id'], rows: golden.build.rows as unknown as ItemTableModel['rows'] };
    const c = golden.build.context as unknown as BuildContext;
    expect(scoreItem(m, golden.build.item, c)).toBeCloseTo(golden.build.score, 6);
    expect(scoreItem(m, 12345, c)).toBeUndefined();
    expect(recommendItems(m, c, [golden.build.item])).toEqual([]);
  });

  it('matches the logistic formula used by export.py', () => {
    const m: LinearModel = { ...base, format: 'broadway-ml/linear@1', link: 'logistic', features: ['h_1', 'h_2', 'badge_diff'],
      mean: [0, 0, 1], scale: [1, 0.5, 2], coef: [0.4, -0.2, 0.1], intercept: 0.05 };
    const x = draftFeatures([1], [2], 90, 80);
    const z = 0.05 + 0.4 * 1 + (-0.2 * -1) / 0.5 + (0.1 * (1 - 1)) / 2;
    expect(scoreLinear(m, x)).toBeCloseTo(1 / (1 + Math.exp(-z)), 10);
  });

  it('finds the nearest centroid in scaled space', () => {
    const m: CentroidModel = { ...base, format: 'broadway-ml/centroids@1', features: ['a', 'b'], mean: [10, 0], scale: [10, 1],
      centroids: [[0, 0], [1, 1]], labels: ['steady', 'aggressive'] };
    expect(nearestCentroid(m, { a: 20, b: 0.9 }).label).toBe('aggressive');
    expect(nearestCentroid(m, { a: 10, b: 0 }).label).toBe('steady');
  });

  it('round-trips badges', () => {
    for (const b of [11, 16, 74, 116]) expect(indexToBadge(badgeToIndex(b))).toBe(b);
    expect(badgeToIndex(116)).toBe(71);
  });
});
