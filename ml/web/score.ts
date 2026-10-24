// Scores the JSON models written by ml/broadway_ml/export.py. Not wired into the site yet: when a model is ready,
// copy its JSON into src/ and import this file from the page that shows it.

export interface ModelBase {
  format: string;
  name: string;
  trained_at: string;
  metrics: Record<string, number | string>;
  notes: string;
}

export interface LinearModel extends ModelBase {
  format: 'broadway-ml/linear@1';
  link: 'logistic' | 'identity';
  features: string[];
  mean: number[];
  scale: number[];
  coef: number[];
  intercept: number;
}

export interface CentroidModel extends ModelBase {
  format: 'broadway-ml/centroids@1';
  features: string[];
  mean: number[];
  scale: number[];
  centroids: number[][];
  labels: string[];
}

export type Features = Record<string, number | undefined>;

/** Win chance (logistic) or a plain number (identity). Missing features count as 0, as in training. */
export function scoreLinear(m: LinearModel, x: Features): number {
  let z = m.intercept;
  m.features.forEach((f, i) => {
    z += (m.coef[i] * ((x[f] ?? 0) - m.mean[i])) / (m.scale[i] || 1);
  });
  return m.link === 'logistic' ? 1 / (1 + Math.exp(-z)) : z;
}

/** The nearest centroid's label and index, plus the distance (smaller is a clearer fit). */
export function nearestCentroid(m: CentroidModel, x: Features): { label: string; index: number; distance: number } {
  const v = m.features.map((f, i) => ((x[f] ?? 0) - m.mean[i]) / (m.scale[i] || 1));
  let best = 0;
  let bestD = Infinity;
  m.centroids.forEach((c, k) => {
    const d = Math.sqrt(c.reduce((s, ci, i) => s + (ci - v[i]) ** 2, 0));
    if (d < bestD) [best, bestD] = [k, d];
  });
  return { label: m.labels[best], index: best, distance: bestD };
}

/** Draft features in the same layout as features.draft_features: +1 for team 0 heroes, -1 for team 1. */
export function draftFeatures(team0: number[], team1: number[], averageBadge: number): Features {
  const x: Features = { badge: averageBadge / 10 };
  for (const h of team0) x[`h_${h}`] = 1;
  for (const h of team1) x[`h_${h}`] = -1;
  return x;
}

/** Badge 116 (Eternus VI) <-> the 0..71 level scale the rank model predicts on. */
export const badgeToIndex = (badge: number) => Math.floor(badge / 10) * 6 + (badge % 10) - 1;
export function indexToBadge(idx: number): number {
  const i = Math.min(71, Math.max(0, Math.round(idx)));
  return Math.floor(i / 6) * 10 + (i % 6) + 1;
}
