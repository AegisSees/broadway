import { useSyncExternalStore } from 'react';

/**
 * Which kind of numbers the site shows. "live" asks the Deadlock API; "sample" uses the built-in illustrative data so the
 * site can be designed and demonstrated offline. The choice is remembered in the browser. VITE_DATA_SOURCE=fixture makes
 * "sample" the default for a build.
 */
export type DataMode = 'live' | 'sample';
const KEY = 'broadway-data-v1';

function initial(): DataMode {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === 'live' || saved === 'sample') return saved;
  } catch { /* storage can be blocked (private windows, file previews); fall through to the default */ }
  return import.meta.env.VITE_DATA_SOURCE === 'fixture' ? 'sample' : 'live';
}

export const dataMode: DataMode = initial();

/** Remembers the choice and reloads, so every page starts again on the other source with nothing half-loaded. */
export function switchDataMode(next: DataMode): void {
  try { window.localStorage.setItem(KEY, next); } catch { /* the choice just will not stick */ }
  window.location.reload();
}

// ---------------------------------------------------------------------------------------------------------
// Health of the live connection. A failed call that falls back to a sample is recorded here so the header can say so.
// ---------------------------------------------------------------------------------------------------------

export interface DataHealth { degraded: boolean; reason: string | null; at: number | null }
let health: DataHealth = { degraded: false, reason: null, at: null };
const listeners = new Set<() => void>();

export const getDataHealth = (): DataHealth => health;

export function reportDegraded(reason: string): void {
  health = { degraded: true, reason, at: Date.now() };
  listeners.forEach((l) => l());
}
export function reportHealthy(): void {
  if (!health.degraded) return;
  health = { degraded: false, reason: null, at: null };
  listeners.forEach((l) => l());
}
export const useDataHealth = (): DataHealth => useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => health, () => health);
