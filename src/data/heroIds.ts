import type { AssetHero } from '../api/types';
import { allHeroStats } from './heroStats';
import { HEROES } from './roster';

/** Translates between the API's numeric hero ids and Broadway's slugs. */
export interface HeroIdMap {
  slugById(id: number): string | undefined;
  idBySlug(slug: string): number | undefined;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Matches by the game's internal class name first (`hero_inferno` is the same key in the game files and in the API's
 * hero list, so renamed heroes still line up) and falls back to the display name.
 */
export function buildHeroIdMap(assets: readonly AssetHero[]): HeroIdMap {
  const byKey = new Map(allHeroStats().map(([slug, s]) => [s.key, slug]));
  const byName = new Map(HEROES.map((h) => [norm(h.name), h.slug]));
  const slugOf = new Map<number, string>();
  const idOf = new Map<string, number>();
  for (const a of assets) {
    const slug = byKey.get(a.class_name) ?? byName.get(norm(a.name));
    if (!slug) continue;
    slugOf.set(a.id, slug);
    idOf.set(slug, a.id);
  }
  return { slugById: (id) => slugOf.get(id), idBySlug: (slug) => idOf.get(slug) };
}
