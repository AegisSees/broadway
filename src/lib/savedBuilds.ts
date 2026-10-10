import { useSyncExternalStore } from 'react';

export interface SavedBuild { id: string; name: string; hero: string; items: string[]; at: number }
const KEY = 'broadway-builds-v1';
let cache: SavedBuild[] | null = null;
const subs = new Set<() => void>();

function read(): SavedBuild[] {
  if (cache) return cache;
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    cache = Array.isArray(v) ? v.filter((b) => b && typeof b.id === 'string' && Array.isArray(b.items)) : [];
  } catch { cache = []; }
  return cache!;
}
function write(next: SavedBuild[]): void {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage may be blocked; the in-memory list still works this visit */ }
  subs.forEach((f) => f());
}

/** Builds the visitor saved in the planner. Browser-only (localStorage), so they do not follow a visitor between devices. */
export const saveBuild = (b: Omit<SavedBuild, 'id' | 'at'>): void => write([{ ...b, id: Math.random().toString(36).slice(2, 9), at: Date.now() }, ...read()].slice(0, 30));
export const deleteBuild = (id: string): void => write(read().filter((b) => b.id !== id));
export function useSavedBuilds(): SavedBuild[] {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, read, read);
}
