import {
  draftFeatures, indexToBadge, liveFeatures, nearestCentroid, scoreItem, scoreLinear,
  type BuildContext, type CentroidModel, type Features, type ItemTableModel, type LinearModel, type MatchupModel,
} from '../../ml/web/score';
import itemNames from '../data/itemIds.json';
import { buildsInto, getItem, type ItemInfo } from '../data/items';
import type { MatchDetail, MatchPlayer } from '../data/matchDetail';
import type { PlayerMatchLine } from '../data/player';
import heroIdJson from './heroIds.json';

/**
 * What the site asks of the trained models, in the site's own terms (hero slugs, item names, match and player
 * records). The feature layouts live in ml/web/score.ts, which is pinned to the Python side by golden.json; this file
 * only gathers the inputs and shapes the answers. Every function takes the model as an argument so it stays pure.
 */

// ---------------------------------------------------------------------------------------------------------
// Ids
// ---------------------------------------------------------------------------------------------------------

/** Hero slug -> API hero id, from /v1/assets/heroes on 25 Oct 2026 (the ids the models were trained on). */
const HERO_ID = heroIdJson as Record<string, number>;
const HERO_SLUG = new Map(Object.entries(HERO_ID).map(([s, id]) => [id, s]));
export const heroIdOf = (slug: string | undefined): number | undefined => (slug ? HERO_ID[slug] : undefined);
export const heroSlugOf = (id: number): string | undefined => HERO_SLUG.get(id);

const ITEM_NAME = itemNames as Record<string, string>;
const ITEM_ID = new Map(Object.entries(ITEM_NAME).map(([id, n]) => [n, Number(id)]));
export const itemIdOf = (name: string): number | undefined => ITEM_ID.get(name);
export const itemOfId = (id: number): ItemInfo | undefined => { const n = ITEM_NAME[String(id)]; return n ? getItem(n) : undefined; };

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

// ---------------------------------------------------------------------------------------------------------
// 1. Draft
// ---------------------------------------------------------------------------------------------------------

/** Average of the badges we know on a team, when at least half of the team has one (ranked games only). */
export function teamBadge(badges: readonly (number | undefined)[]): number {
  const known = badges.filter((b): b is number => !!b && b > 0);
  return known.length * 2 >= badges.length && known.length ? known.reduce((a, b) => a + b, 0) / known.length : 0;
}

/**
 * Chance that team 0 (the Hidden King) wins from the heroes alone, plus both teams' ranks when known. The API sends 0
 * for a match's team-average badge, so the badges come from the players.
 */
export function draftChance(m: LinearModel, team0: readonly number[], team1: readonly number[], badge0 = 0, badge1 = 0): number {
  return scoreLinear(m, draftFeatures([...team0], [...team1], badge0, badge1));
}

export interface DraftTerm { kind: 'hero' | 'pair' | 'duel' | 'rank'; heroes: number[]; /** Log-odds toward team 0. */ value: number }

/** The terms that push the draft one way or the other, biggest first: single heroes, teammate pairs and lane duels. */
export function draftTerms(m: LinearModel, team0: readonly number[], team1: readonly number[], n = 6): DraftTerm[] {
  const x: Features = draftFeatures([...team0], [...team1]);
  const out: DraftTerm[] = [];
  m.features.forEach((f, i) => {
    const v = x[f];
    if (!v) return;
    const value = (m.coef[i] * (v - m.mean[i])) / (m.scale[i] || 1);
    if (Math.abs(value) < 1e-4) return;
    const ids = f.slice(2).split('_').map(Number);
    out.push({ kind: f[0] === 'h' ? 'hero' : f[0] === 's' ? 'pair' : f[0] === 'c' ? 'duel' : 'rank', heroes: ids, value });
  });
  return out.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, n);
}

/** For an open slot on `side`, every hero not yet picked with the win chance it would give that side, best first. */
export function bestPicks(m: LinearModel, team0: readonly number[], team1: readonly number[], side: 0 | 1, pool: readonly number[]): { hero: number; chance: number }[] {
  const taken = new Set([...team0, ...team1]);
  return pool.filter((h) => !taken.has(h)).map((h) => {
    const p = side === 0 ? draftChance(m, [...team0, h], team1) : 1 - draftChance(m, team0, [...team1, h]);
    return { hero: h, chance: p };
  }).sort((a, b) => b.chance - a.chance);
}

/** Draft chance of a finished game, from its two lineups and the players' badges. Null for Street Brawl. */
export function matchDraftChance(m: LinearModel, d: MatchDetail): number | null {
  if (d.kind === 'brawl' || d.teams.some((t) => t.players.length !== 6)) return null;
  const [hk, am] = d.teams;
  return draftChance(m, hk.players.map((p) => p.heroId), am.players.map((p) => p.heroId),
    teamBadge(hk.players.map((p) => p.badge)), teamBadge(am.players.map((p) => p.badge)));
}

// ---------------------------------------------------------------------------------------------------------
// 2. Live win chance over a finished game
// ---------------------------------------------------------------------------------------------------------

export interface WinPoint { t: number; /** Hidden King's chance of winning, 0-1. */ p: number; nw: number; kills: number }

const SNAP_S = 180;

/**
 * Hidden King's chance of winning at every three-minute snapshot both teams have in full, as the live model saw it.
 * The game's final sample is left out, like in training, because it gives the result away. When the draft model is
 * given, the curve starts at kick-off with the draft chance.
 */
export function winCurve(live: LinearModel, d: MatchDetail, draft?: LinearModel | null): WinPoint[] {
  if (d.kind === 'brawl' || d.players.length !== 12) return [];
  const times = [...new Set(d.players.flatMap((p) => p.snaps.map((s) => s.t)))].filter((t) => t > 0 && t % SNAP_S === 0).sort((a, b) => a - b);
  const out: WinPoint[] = [];
  const start = draft ? matchDraftChance(draft, d) : null;
  if (start !== null) out.push({ t: 0, p: start, nw: 0, kills: 0 });
  for (const t of times) {
    const at = (p: MatchPlayer) => p.snaps.find((s) => s.t === t);
    if (d.players.some((p) => !at(p))) continue;
    const g = { netWorth: 0, kills: 0, deaths: 0, assists: 0, level: 0, total: 0 };
    for (const p of d.players) {
      const s = at(p)!;
      const sign = p.side === 'hidden-king' ? 1 : -1;
      g.netWorth += sign * s.nw; g.kills += sign * s.k; g.deaths += sign * s.d; g.assists += sign * s.a; g.level += sign * s.lvl;
      g.total += s.nw;
    }
    const x = liveFeatures({ ...g, netWorthShare: g.total > 0 ? g.netWorth / g.total : 0 }, t / 60);
    out.push({ t, p: scoreLinear(live, x), nw: g.netWorth, kills: g.kills });
  }
  return out;
}

/** The snapshot where the chance moved most from the one before it. */
export function biggestSwing(points: readonly WinPoint[]): { from: WinPoint; to: WinPoint } | null {
  let best: { from: WinPoint; to: WinPoint } | null = null;
  for (let i = 1; i < points.length; i++) {
    if (!best || Math.abs(points[i].p - points[i - 1].p) > Math.abs(best.to.p - best.from.p)) best = { from: points[i - 1], to: points[i] };
  }
  return best;
}

// ---------------------------------------------------------------------------------------------------------
// 3. Next item
// ---------------------------------------------------------------------------------------------------------

export interface BuyContext {
  hero: number;
  minute: number;
  enemyHeroes: number[];
  /** Item names the enemy team holds. */
  enemyItems: string[];
  /** Item names the player holds. */
  owned: string[];
}

export interface Suggestion {
  item: ItemInfo;
  id: number;
  score: number;
  /** Win model: win-chance points over an average candidate in an even game. Top-player model: chance (0-1) a top player buys it next. */
  value: number;
}

function context(c: BuyContext): BuildContext {
  const spend: [number, number, number] = [0, 0, 0];
  const enemyItems: number[] = [];
  for (const n of c.enemyItems) {
    const it = getItem(n);
    const id = itemIdOf(it?.name ?? n);
    if (id !== undefined) enemyItems.push(id);
    if (it) spend[it.category === 'weapon' ? 0 : it.category === 'vitality' ? 1 : 2] += it.cost;
  }
  return { hero: c.hero, minute: c.minute, enemyHeroes: c.enemyHeroes, enemyItems, enemySpend: spend, owned: c.owned.map(itemIdOf).filter((x): x is number => x !== undefined) };
}

/** Items worth offering: in the shop catalogue, not owned, not a component of something owned, not a legendary. */
function candidates(m: ItemTableModel, owned: readonly string[]): { id: number; item: ItemInfo }[] {
  const have = new Set(owned);
  return Object.keys(m.rows).map(Number).flatMap((id) => {
    const item = itemOfId(id);
    if (!item || item.tier >= 5 || have.has(item.name) || buildsInto(item.name).some((n) => have.has(n))) return [];
    return [{ id, item }];
  });
}

/** Which buy goes with winning most in this spot (build recommender). */
export function winningBuys(m: ItemTableModel, c: BuyContext, n = 4): Suggestion[] {
  const ctx = context(c);
  const list = candidates(m, c.owned).map((x) => ({ ...x, score: scoreItem(m, x.id, ctx) ?? -Infinity }));
  if (!list.length) return [];
  const avg = list.reduce((s, x) => s + x.score, 0) / list.length;
  return list.sort((a, b) => b.score - a.score).slice(0, n).map((x) => ({ ...x, value: (sigmoid(x.score - avg) - 0.5) * 100 }));
}

/** What a top-bracket player buys next in this spot, with the model's chance for each (softmax over the candidates). */
export function topPlayerBuys(m: ItemTableModel, c: BuyContext, n = 4): Suggestion[] {
  const ctx = context(c);
  const list = candidates(m, c.owned).map((x) => ({ ...x, score: scoreItem(m, x.id, ctx) ?? -Infinity }));
  if (!list.length) return [];
  const top = Math.max(...list.map((x) => x.score));
  const sum = list.reduce((s, x) => s + Math.exp(x.score - top), 0);
  return list.sort((a, b) => b.score - a.score).slice(0, n).map((x) => ({ ...x, value: Math.exp(x.score - top) / sum }));
}

// ---------------------------------------------------------------------------------------------------------
// 5. Matchups
// ---------------------------------------------------------------------------------------------------------

export interface Matchup { hero: number; slug?: string; delta: number; games: number }

/** How `hero` does into each enemy at the top, in win-rate points against its own average: best first. */
export function matchupsOf(m: MatchupModel, hero: number, minGames = 20): Matchup[] {
  return Object.entries(m.rows[String(hero)] ?? {})
    .filter(([, v]) => v.n >= minGames)
    .map(([e, v]) => ({ hero: Number(e), slug: heroSlugOf(Number(e)), delta: v.d, games: v.n }))
    .sort((a, b) => b.delta - a.delta);
}

/** Heroes that do best into `enemy` at the top, best first. */
export function countersTo(m: MatchupModel, enemy: number, minGames = 20): Matchup[] {
  return Object.entries(m.rows)
    .flatMap(([h, vs]) => { const v = vs[String(enemy)]; return v && v.n >= minGames ? [{ hero: Number(h), slug: heroSlugOf(Number(h)), delta: v.d, games: v.n }] : []; })
    .sort((a, b) => b.delta - a.delta);
}

/**
 * Heroes that do best into a whole enemy lineup at the top: the sum of their deltas into each enemy they have enough
 * top games against, best first. `pool` limits the answer (e.g. to heroes not yet picked).
 */
export function lineupCounters(m: MatchupModel, enemies: readonly number[], pool: readonly number[], minGames = 20): { hero: number; total: number; vs: Matchup[] }[] {
  if (!enemies.length) return [];
  return pool.flatMap((h) => {
    const vs = enemies.flatMap((e) => { const v = m.rows[String(h)]?.[String(e)]; return v && v.n >= minGames ? [{ hero: e, slug: heroSlugOf(e), delta: v.d, games: v.n }] : []; });
    return vs.length ? [{ hero: h, total: vs.reduce((s, v) => s + v.delta, 0), vs }] : [];
  }).sort((a, b) => b.total - a.total);
}

// ---------------------------------------------------------------------------------------------------------
// 4 + 6. Player profile: playstyle and rank estimate
// ---------------------------------------------------------------------------------------------------------

/** The profile of models/features.py `_profile` over the given games. */
export function profileOf(games: readonly PlayerMatchLine[]): Features {
  const mins = games.reduce((s, g) => s + Math.max(60, g.durationS), 0) / 60;
  const sum = (f: (g: PlayerMatchLine) => number) => games.reduce((s, g) => s + f(g), 0);
  const by = new Map<string, number>();
  for (const g of games) { const k = g.heroSlug ?? String(g.heroId); by.set(k, (by.get(k) ?? 0) + 1); }
  const shares = [...by.values()].map((n) => n / games.length).sort((a, b) => b - a);
  return {
    kills_pm: sum((g) => g.kills) / mins,
    deaths_pm: sum((g) => g.deaths) / mins,
    assists_pm: sum((g) => g.assists) / mins,
    souls_pm: sum((g) => g.netWorth) / mins,
    last_hits_pm: sum((g) => g.lastHits) / mins,
    denies_pm: sum((g) => g.denies ?? 0) / mins,
    kda: (sum((g) => g.kills) + sum((g) => g.assists)) / Math.max(1, sum((g) => g.deaths)),
    win_rate: games.length ? games.filter((g) => g.won).length / games.length : 0,
    hero_entropy: -shares.reduce((s, p) => s + p * Math.log(p), 0),
    top_hero_share: shares[0] ?? 0,
  };
}

export const PLAYSTYLE_GAMES = 50;
export const PLAYSTYLE_MIN = 15;

export interface Playstyle {
  label: string;
  games: number;
  /** How clearly the player sits in this group: 0 (on the edge) to 1 (on its centre). */
  fit: number;
  runnerUp: string;
  /** The player's numbers against the average player, as z-scores. */
  z: Record<string, number>;
  profile: Features;
}

/** Nearest playstyle over the last 50 Normal-mode games (Street Brawl left out), when there are at least 15. */
export function playstyleOf(m: CentroidModel, matches: readonly PlayerMatchLine[]): Playstyle | null {
  const games = matches.filter((g) => g.kind !== 'brawl').slice(0, PLAYSTYLE_GAMES);
  if (games.length < PLAYSTYLE_MIN) return null;
  const profile = profileOf(games);
  const best = nearestCentroid(m, profile);
  const v = m.features.map((f, i) => ((profile[f] ?? 0) - m.mean[i]) / (m.scale[i] || 1));
  const dists = m.centroids.map((c) => Math.sqrt(c.reduce((s, ci, i) => s + (ci - v[i]) ** 2, 0)));
  const order = dists.map((d, i) => [d, i] as const).sort((a, b) => a[0] - b[0]);
  const second = order[1] ?? order[0];
  return {
    label: best.label,
    games: games.length,
    fit: second[0] > 0 ? Math.max(0, Math.min(1, 1 - best.distance / second[0])) : 1,
    runnerUp: m.labels[second[1]],
    z: Object.fromEntries(m.features.map((f, i) => [f, v[i]])),
    profile,
  };
}

export const RANK_GAMES = 20;

export interface RankGuess {
  badge: number;
  low: number;
  high: number;
  games: number;
  /** False when the player has too few ranked games and the estimate reads their other games instead. */
  fromRanked: boolean;
}

/** The rank this player's last 20 ranked games play like, give or take one residual SD of the model. */
export function rankGuess(m: LinearModel, matches: readonly PlayerMatchLine[]): RankGuess | null {
  const ranked = matches.filter((g) => g.kind === 'ranked' && g.badge).slice(0, RANK_GAMES);
  const fromRanked = ranked.length >= RANK_GAMES;
  const games = fromRanked ? ranked : matches.filter((g) => g.kind !== 'brawl').slice(0, RANK_GAMES);
  if (games.length < RANK_GAMES) return null;
  const idx = scoreLinear(m, profileOf(games));
  const sd = Number(m.metrics.resid_sd) || 12;
  return { badge: indexToBadge(idx), low: indexToBadge(idx - sd), high: indexToBadge(idx + sd), games: games.length, fromRanked };
}
