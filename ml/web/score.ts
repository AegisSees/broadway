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

/** One item's terms in the build recommender (see ml/broadway_ml/models/builds.py). */
export interface ItemTerms {
  b: number;
  t: number;
  h: Record<string, number>;
  e: Record<string, number>;
  s: [number, number, number];
  v: Record<string, number>;
  /** Owned items (top-player model only). */
  o?: Record<string, number>;
}

export interface ItemTableModel extends ModelBase {
  format: 'broadway-ml/table@1';
  key_names: string[];
  rows: Record<string, ItemTerms>;
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

/**
 * Draft features in the layout of models/draft.py: h_<id> +1 / -1 by side, s_<a>_<b> for teammates (a < b, +1 on
 * team 0), c_<a>_<b> for opponents (a < b, +1 when a is on team 0), and badge_diff when both team badges are known.
 * The result is the chance that team 0 (the Hidden King) wins.
 */
export function draftFeatures(team0: number[], team1: number[], badge0 = 0, badge1 = 0): Features {
  const x: Features = {};
  const add = (k: string, v: number) => (x[k] = (x[k] ?? 0) + v);
  for (const h of team0) add(`h_${h}`, 1);
  for (const h of team1) add(`h_${h}`, -1);
  for (const [team, sign] of [[team0, 1], [team1, -1]] as const) {
    const s = [...team].sort((a, b) => a - b);
    for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) add(`s_${s[i]}_${s[j]}`, sign);
  }
  for (const a of team0) for (const b of team1) add(a < b ? `c_${a}_${b}` : `c_${b}_${a}`, a < b ? 1 : -1);
  if (badge0 > 0 && badge1 > 0) x.badge_diff = (badge0 - badge1) / 10;
  return x;
}

/** Live features in the layout of models/live.py, from team 0 minus team 1 gaps at a moment of the game. */
export function liveFeatures(g: { netWorth: number; kills: number; deaths: number; assists: number; level: number; netWorthShare: number }, minute: number): Features {
  const gaps: Record<string, number> = {
    nw_k: g.netWorth / 1000, kills_diff: g.kills, deaths_diff: g.deaths, assists_diff: g.assists, level_diff: g.level,
    net_worth_share: g.netWorthShare,
  };
  const x: Features = { minute };
  for (const [k, v] of Object.entries(gaps)) {
    x[k] = v;
    x[`${k}__x_min`] = (v * minute) / 30;
  }
  return x;
}

export interface BuildContext {
  hero: number;
  minute: number;
  enemyHeroes: number[];
  /** Item ids the enemy team holds right now, one entry per copy. */
  enemyItems: number[];
  /** Souls the enemy team has spent on weapon, vitality and spirit items. */
  enemySpend: [number, number, number];
  /** Items the player already owns (used by the top-player model). */
  owned?: number[];
}

/** Score of one candidate item in this moment; only differences between items mean anything. */
export function scoreItem(m: ItemTableModel, itemId: number, c: BuildContext): number | undefined {
  const r = m.rows[String(itemId)];
  if (!r) return undefined;
  const tot = c.enemySpend[0] + c.enemySpend[1] + c.enemySpend[2];
  let z = r.b + (r.t * c.minute) / 30 + (r.h[String(c.hero)] ?? 0);
  for (const e of c.enemyHeroes) z += r.e[String(e)] ?? 0;
  if (tot > 0) z += c.enemySpend.reduce((s, v, i) => s + (r.s[i] * v) / tot, 0);
  for (const e of c.enemyItems) z += r.v[String(e)] ?? 0;
  if (r.o) for (const o of new Set(c.owned ?? [])) z += r.o[String(o)] ?? 0;
  return z;
}

/** The best `n` items to buy next, leaving out what the player already holds. */
export function recommendItems(m: ItemTableModel, c: BuildContext, owned: number[], n = 3): { itemId: number; score: number }[] {
  const have = new Set(owned);
  return Object.keys(m.rows)
    .map(Number)
    .filter((id) => !have.has(id))
    .map((itemId) => ({ itemId, score: scoreItem(m, itemId, c) ?? -Infinity }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

/** Matchup table from models/matchups.py: rows[hero][enemy] = { d: win-rate points vs its own average, n: top games }. */
export interface MatchupModel extends ModelBase {
  format: 'broadway-ml/table@1';
  key_names: string[];
  rows: Record<string, Record<string, { d: number; n: number }>>;
}

/** Heroes that do best into `enemy`, strongest first. */
export function bestInto(m: MatchupModel, enemy: number, n = 5): { hero: number; delta: number; games: number }[] {
  return Object.entries(m.rows)
    .filter(([, vs]) => vs[String(enemy)])
    .map(([h, vs]) => ({ hero: Number(h), delta: vs[String(enemy)].d, games: vs[String(enemy)].n }))
    .sort((a, b) => b.delta - a.delta)
    .slice(0, n);
}

/** Badge 116 (Eternus VI) <-> the 0..71 level scale the rank model predicts on. */
export const badgeToIndex = (badge: number) => Math.floor(badge / 10) * 6 + (badge % 10) - 1;
export function indexToBadge(idx: number): number {
  const i = Math.min(71, Math.max(0, Math.round(idx)));
  return Math.floor(i / 6) * 10 + (i % 6) + 1;
}
