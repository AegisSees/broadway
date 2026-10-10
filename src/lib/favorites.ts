import { useSyncExternalStore } from 'react';

const KEY = 'broadway-favorites-v1';
let cache: string[] | null = null;
const subs = new Set<() => void>();

function read(): string[] {
  if (cache) return cache;
  try { const raw = localStorage.getItem(KEY); const v = raw ? JSON.parse(raw) : []; cache = Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { cache = []; }
  return cache!;
}

/** Heroes the visitor has starred. Stored in this browser only (localStorage), so it is a convenience, not an account feature. */
export function toggleFavorite(slug: string): void {
  const cur = read();
  cache = cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug];
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* storage may be blocked; the in-memory list still works */ }
  subs.forEach((f) => f());
}

export function useFavorites(): { favs: string[]; has: (slug: string) => boolean; toggle: (slug: string) => void } {
  const favs = useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, read, read);
  return { favs, has: (s) => favs.includes(s), toggle: toggleFavorite };
}
