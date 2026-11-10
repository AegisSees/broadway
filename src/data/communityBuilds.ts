import type { BuildRaw, HeroBuildStatsRow } from '../api/types';
import abilityIds from './heroAbilityIds.json';
import itemIds from './itemIds.json';
import type { BuildItemStat, BuildPhase, HeroBuild } from './builds';
import { getItem } from './items';
import { getHero } from './roster';
import type { ItemCategory, SkillPath, SkillRow } from './types';

/**
 * Published in-game builds from the Deadlock API (`/v1/builds`), turned into Broadway's build cards.
 *
 * - Items are the build's own sections in the author's order; an item's id is the same hash as in match data
 *   (itemIds.json). Ids we don't know (a brand-new item) are skipped rather than guessed.
 * - The skill order comes from the build's `ability_order`: currency_type 2 unlocks an ability, currency_type 1 spends
 *   1, 2 or 5 ability points on it. Ability ids are hashes of the ability names in the game files (heroAbilityIds.json,
 *   generated from scripts/heroes.vdata_c). Builds without an order get none.
 * - Win rate and games come from `/v1/analytics/hero-build-stats/{hero}` when players have used the build in sampled
 *   matches; otherwise they stay empty, never invented.
 */

const ITEM_NAMES = itemIds as Record<string, string>;
const ABILITY_SLOT = abilityIds as unknown as Record<string, [string, number]>;
const DAY = 24 * 60 * 60 * 1000;
const STEPS = 16;
/** Badge 111 and up is Eternus (tier 11). */
const ETERNUS_BADGE = 111;

export interface BuildContext {
  slugById(id: number): string | undefined;
  stats?: Map<number, HeroBuildStatsRow>;
  authors?: Map<number, { name?: string; badge?: number }>;
  now?: number;
}

const clean = (s: string | null | undefined, max: number): string => {
  const t = (s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};
const r1 = (n: number) => Math.round(n * 10) / 10;

/** The game's own default section names arrive as localisation tokens (#Citadel_HeroBuilds_EarlyGame). */
const TOKENS: Record<string, string> = { EarlyGame: 'Early game', MidGame: 'Mid game', LateGame: 'Late game', Lane: 'Lane' };
export const sectionName = (raw: string | null | undefined): string => {
  const m = /^#?Citadel_HeroBuilds_(\w+)$/i.exec((raw ?? '').trim());
  if (!m) return clean(raw, 28);
  return TOKENS[m[1]] ?? m[1].replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
};

/** The 16-step skill order a build recommends for its hero, or null when it carries none. */
export function skillFromOrder(raw: BuildRaw, heroSlug: string): SkillPath | null {
  const changes = raw.hero_build.details.ability_order?.currency_changes ?? [];
  const rows: SkillRow[] = [0, 1, 2, 3].map((i) => ({ abilityIndex: i as SkillRow['abilityIndex'], unlockAt: 0, upgrades: [] }));
  let step = 0;
  for (const c of changes) {
    const hit = ABILITY_SLOT[String(c.ability_id)];
    if (!hit || hit[0] !== heroSlug) continue;
    const row = rows[hit[1]];
    if (c.currency_type === 2) {
      if (row.unlockAt) continue;
      step++;
      row.unlockAt = step;
    } else if (c.currency_type === 1) {
      const ap = -c.delta;
      if (ap !== 1 && ap !== 2 && ap !== 5) continue;
      step++;
      row.upgrades.push({ at: step, ap });
    }
    if (step >= STEPS) break;
  }
  if (step === 0) return null;
  return { note: 'The author’s ability order, step by step, as saved with the build.', rows };
}

const TAG: Record<ItemCategory, string> = { weapon: 'Weapon', vitality: 'Vitality', spirit: 'Spirit' };

/** One published build as a card, or null when it is for a hero Broadway doesn't know or has no items we recognise. */
export function normalizeBuild(raw: BuildRaw, ctx: BuildContext): HeroBuild | null {
  const hb = raw.hero_build;
  const slug = ctx.slugById(hb.hero_id);
  const hero = getHero(slug);
  if (!slug || !hero) return null;

  const seen = new Set<string>();
  let order = 0;
  const phases: BuildPhase[] = [];
  for (const [i, cat] of (hb.details.mod_categories ?? []).entries()) {
    const items: BuildItemStat[] = [];
    for (const m of cat.mods ?? []) {
      const name = ITEM_NAMES[String(m.ability_id)];
      const info = name ? getItem(name) : undefined;
      if (!name || !info || seen.has(name)) continue;
      seen.add(name);
      items.push({ name, category: info.category, order: ++order, note: clean(m.annotation, 240) || undefined });
    }
    if (items.length) phases.push({ id: `s${i}`, label: sectionName(cat.name) || `Section ${i + 1}`, range: /^#/.test(cat.description ?? '') ? '' : clean(cat.description, 60), items });
  }
  if (!phases.length) return null;

  const tally: Record<ItemCategory, number> = { weapon: 0, vitality: 0, spirit: 0 };
  for (const p of phases) for (const it of p.items) tally[it.category]++;
  const author = ctx.authors?.get(hb.author_account_id);
  const eternus = (author?.badge ?? 0) >= ETERNUS_BADGE;
  const tags = (Object.keys(tally) as ItemCategory[]).filter((c) => tally[c] > 0).sort((a, b) => tally[b] - tally[a]).slice(0, 2).map((c) => TAG[c]);
  const st = ctx.stats?.get(hb.hero_build_id);
  const played = st && st.matches > 0 ? st : undefined;
  const now = ctx.now ?? Date.now();
  const updated = hb.last_updated_timestamp * 1000;

  return {
    id: `b${hb.hero_build_id}`,
    code: String(hb.hero_build_id),
    heroSlug: slug,
    kind: 'community',
    origin: 'community',
    eternus,
    title: clean(hb.name, 70) || `${hero.name} build`,
    author: author?.name,
    blurb: clean(hb.description, 240) || `A ${hero.name} build published in the game's build browser.`,
    winRate: played ? r1((played.wins / played.matches) * 100) : null,
    pickRate: null,
    matches: played ? played.matches : null,
    trend: raw.num_weekly_favorites ?? 0,
    likes: raw.num_favorites ?? undefined,
    ageDays: Number.isFinite(updated) && updated > 0 ? Math.max(0, Math.floor((now - updated) / DAY)) : undefined,
    tags: [...tags, ...(eternus ? ['Eternus'] : [])],
    phases,
    skill: skillFromOrder(raw, slug),
    sample: played ? `${played.matches.toLocaleString('en-US')} games with this build · version ${hb.version}` : `Published in-game build · version ${hb.version}`,
  };
}

/** Builds need this many games before they can be a hero's "Best results". */
export const BEST_MIN_GAMES = 50;
/**
 * A build's win rate pulled toward 50% by 250 imaginary even games, so results count only as far as the play behind
 * them: a 54% build over 52 games scores 50.8%, a 51% build over 6,000 games 51.0%.
 */
export const buildResultScore = (wins: number, matches: number): number => (wins + 125) / (matches + 250);

/**
 * The tabs on a hero page, from one hero's published builds: the best results (50+ games, weighed by how much it was
 * played), the one played most in sampled games, the most favorited build, and the most favorited this week. A build
 * appears once, under the first tab it earns. With no played builds the most favorited one leads.
 */
export function heroBuildTabs(builds: readonly HeroBuild[], weekly: readonly HeroBuild[] = []): HeroBuild[] {
  const out: HeroBuild[] = [];
  const add = (b: HeroBuild | undefined, tab: string) => { if (b && !out.some((x) => x.id === b.id)) out.push({ ...b, tab }); };
  const played = builds.filter((b) => (b.matches ?? 0) > 0);
  const score = (b: HeroBuild) => buildResultScore(((b.winRate ?? 0) / 100) * (b.matches ?? 0), b.matches ?? 0);
  add(played.filter((b) => (b.matches ?? 0) >= BEST_MIN_GAMES).sort((a, b) => score(b) - score(a))[0], 'Best results');
  add([...played].sort((a, b) => (b.matches ?? 0) - (a.matches ?? 0))[0], 'Most played');
  const byFav = [...builds].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
  add(byFav[0], 'Most favorited');
  add([...weekly].sort((a, b) => b.trend - a.trend).find((b) => !out.some((x) => x.id === b.id)), 'Hot this week');
  for (const [i, b] of byFav.entries()) { if (out.length >= 4) break; add(b, `No. ${i + 1} favorite`); }
  return out.slice(0, 4);
}
