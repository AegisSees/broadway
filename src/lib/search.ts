import { HEROES, type Hero } from '../data/roster';
import { ALL_ITEM_NAMES, getItem, itemSlug, type ItemInfo } from '../data/items';
import { parseSteamInput } from './steam';

export type SearchResult =
  | { kind: 'hero'; hero: Hero }
  | { kind: 'item'; item: ItemInfo; slug: string }
  | { kind: 'steam-id'; accountId: number }
  | { kind: 'player'; accountId: number; name: string; note?: string; avatar?: string }
  /** Opens the player search page for a name (or the custom name in a steamcommunity.com/id/ link). */
  | { kind: 'find'; query: string };

const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Hero-first search. Heroes always come before players. A pasted Steam ID jumps straight to a player
 * lookup so people can find themselves even after changing their display name.
 */
export function searchHeroes(query: string, limit = 6): Hero[] {
  const q = clean(query);
  if (!q) return [];
  const scored = HEROES.map((h) => {
    const n = clean(h.name);
    const score = n === q ? 0 : n.startsWith(q) ? 1 : n.split(/\s+/).some((w) => clean(w).startsWith(q)) ? 2 : n.includes(q) ? 3 : 9;
    return { h, score };
  })
    .filter((x) => x.score < 9)
    .sort((a, b) => a.score - b.score || a.h.name.localeCompare(b.h.name));
  return scored.slice(0, limit).map((x) => x.h);
}

/** Items whose name contains the query, best matches first. */
export function searchItems(query: string, limit = 4): ItemInfo[] {
  const q = clean(query);
  if (q.length < 2) return [];
  const out: { i: ItemInfo; score: number }[] = [];
  for (const n of ALL_ITEM_NAMES) {
    const c = clean(n);
    const score = c === q ? 0 : c.startsWith(q) ? 1 : c.includes(q) ? 2 : 9;
    const i = score < 9 ? getItem(n) : undefined;
    if (i) out.push({ i, score });
  }
  return out.sort((a, b) => a.score - b.score || a.i.name.localeCompare(b.i.name)).slice(0, limit).map((x) => x.i);
}

export function buildResults(query: string, players: SearchResult[] = []): SearchResult[] {
  const parsed = parseSteamInput(query);
  const out: SearchResult[] = [];
  if (parsed && 'accountId' in parsed) out.push({ kind: 'steam-id', accountId: parsed.accountId });
  out.push(...searchHeroes(query).map((hero) => ({ kind: 'hero' as const, hero })));
  out.push(...searchItems(query).map((item) => ({ kind: 'item' as const, item, slug: itemSlug(item.name) ?? '' })));
  out.push(...players);
  const name = parsed && 'vanity' in parsed ? parsed.vanity : parsed ? '' : query.trim();
  if (name.length >= 3) out.push({ kind: 'find', query: name });
  return out;
}
