import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import history from '../../api-samples/match-history.json';
import type { MatchHistoryRow } from '../api/types';
import { normalizeHistory, sampleMatches } from '../data/player';
import { sampleMatchDetail } from '../data/sampleMatch';
import type { Models } from './models';
import {
  bestPicks, biggestSwing, countersTo, draftChance, draftTerms, heroIdOf, matchDraftChance, matchupsOf, playstyleOf, profileOf,
  rankGuess, teamBadge, topPlayerBuys, winCurve, winningBuys,
} from './predict';

const load = <K extends keyof Models>(f: string) => JSON.parse(readFileSync(new URL(`../../ml/models/${f}.json`, import.meta.url), 'utf8')) as Models[K];
const draft = load<'draft'>('draft_win');
const live = load<'live'>('live_win');
const builds = load<'builds'>('build_recommender');
const top = load<'topItems'>('top_player_items');
const matchups = load<'matchups'>('matchups');
const playstyle = load<'playstyle'>('playstyle');
const rank = load<'rank'>('rank_estimate');

const ids = (...slugs: string[]) => slugs.map((s) => heroIdOf(s)!);

describe('site predictions', () => {
  it('maps every hero the draft model knows', () => {
    const known = draft.features.filter((f) => f.startsWith('h_')).map((f) => Number(f.slice(2)));
    expect(known.length).toBeGreaterThan(40);
    const mapped = new Set(['infernus', 'haze', 'nurse-harrow', 'deadman-danny'].map((s) => heroIdOf(s)));
    expect(known.filter((id) => mapped.has(id)).length).toBeGreaterThanOrEqual(3);
    expect(heroIdOf('infernus')).toBe(1);
    expect(heroIdOf('nurse-harrow')).toBe(87);
  });

  it('gives a draft chance that is symmetric when the teams swap', () => {
    const a = ids('infernus', 'seven', 'haze', 'abrams', 'mirage', 'ivy');
    const b = ids('lash', 'paige', 'graves', 'victor', 'warden', 'shiv');
    const p = draftChance(draft, a, b);
    expect(p).toBeGreaterThan(0.05);
    expect(p).toBeLessThan(0.95);
    // the model has a tiny side term (-0.013 logit), so a swap is close to, not exactly, 1 - p
    expect(Math.abs(p + draftChance(draft, b, a) - 1)).toBeLessThan(0.02);
    expect(draftTerms(draft, a, b).length).toBeGreaterThan(0);
  });

  it('ranks open-slot picks from best to worst', () => {
    const a = ids('infernus', 'seven');
    const picks = bestPicks(draft, a, [], 0, ids('haze', 'graves', 'victor', 'mina', 'paige'));
    expect(picks.length).toBe(5);
    for (let i = 1; i < picks.length; i++) expect(picks[i - 1].chance).toBeGreaterThanOrEqual(picks[i].chance);
  });

  it('averages badges only when half the team has one', () => {
    expect(teamBadge([90, 100, undefined, undefined, undefined, undefined])).toBe(0);
    expect(teamBadge([90, 100, 110, undefined, undefined, undefined])).toBe(100);
  });

  it('draws a win-chance curve over the sample game that ends with the winner ahead', () => {
    const m = sampleMatchDetail(1);
    expect(matchDraftChance(draft, m)).not.toBeNull();
    const pts = winCurve(live, m, draft);
    expect(pts.length).toBeGreaterThan(4);
    expect(pts[0].t).toBe(0);
    for (const p of pts) { expect(p.p).toBeGreaterThan(0); expect(p.p).toBeLessThan(1); }
    const last = pts[pts.length - 1].p;
    expect(m.winner === 'hidden-king' ? last > 0.5 : last < 0.5).toBe(true);
    expect(biggestSwing(pts)).not.toBeNull();
  });

  it('suggests buys that are not owned and not components of owned items', () => {
    const c = { hero: heroIdOf('haze')!, minute: 14, enemyHeroes: ids('abrams', 'mcginnis'), enemyItems: ['Extra Health'], owned: ['Superior Cooldown', 'Headshot Booster'] };
    for (const list of [winningBuys(builds, c, 6), topPlayerBuys(top, c, 6)]) {
      expect(list.length).toBe(6);
      for (const s of list) {
        expect(c.owned).not.toContain(s.item.name);
        expect(s.item.name).not.toBe('Compress Cooldown');
      }
    }
    const shares = topPlayerBuys(top, { ...c, owned: [] }, 200).reduce((s, x) => s + x.value, 0);
    expect(shares).toBeCloseTo(1, 6);
  });

  it('reads matchups both ways', () => {
    const h = heroIdOf('haze')!;
    const into = matchupsOf(matchups, h);
    expect(into.length).toBeGreaterThan(0);
    expect(into[0].delta).toBeGreaterThanOrEqual(into[into.length - 1].delta);
    expect(countersTo(matchups, h).length).toBeGreaterThan(0);
  });

  it('profiles a real match history like features.py', () => {
    const lines = normalizeHistory(history as unknown as MatchHistoryRow[], { slugById: () => undefined, idBySlug: () => undefined }).matches;
    const x = profileOf(lines.slice(0, 50));
    expect(x.kills_pm).toBeGreaterThan(0);
    expect(x.top_hero_share).toBeGreaterThan(0);
    expect(x.top_hero_share).toBeLessThanOrEqual(1);
    const ps = playstyleOf(playstyle, lines);
    expect(playstyle.labels).toContain(ps?.label);
    const r = rankGuess(rank, lines);
    expect(r).not.toBeNull();
    expect(r!.low).toBeLessThanOrEqual(r!.badge);
    expect(r!.high).toBeGreaterThanOrEqual(r!.badge);
  });

  it('works on the illustrative player too', () => {
    const lines = sampleMatches(4242).matches;
    expect(playstyleOf(playstyle, lines)).not.toBeNull();
    expect(rankGuess(rank, lines)?.fromRanked).toBe(true);
  });
});
