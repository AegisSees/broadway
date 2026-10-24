import { describe, expect, it } from 'vitest';
import { badgeToIndex, draftFeatures, indexToBadge, nearestCentroid, scoreLinear, type CentroidModel, type LinearModel } from './score';

const base = { name: 't', trained_at: '', metrics: {}, notes: '' };

describe('ml scorer', () => {
  it('matches the logistic formula used by export.py', () => {
    const m: LinearModel = { ...base, format: 'broadway-ml/linear@1', link: 'logistic', features: ['h_1', 'h_2', 'badge'],
      mean: [0, 0, 7], scale: [1, 0.5, 2], coef: [0.4, -0.2, 0.1], intercept: 0.05 };
    const x = draftFeatures([1], [2], 80);
    const z = 0.05 + 0.4 * 1 + (-0.2 * -1) / 0.5 + (0.1 * (8 - 7)) / 2;
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
