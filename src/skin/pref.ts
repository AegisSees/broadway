import { useSyncExternalStore } from 'react';

/** Whether pages wear the hero's own skin. Stored per browser; defaults to on. */
const KEY = 'broadway-skin-v1';

function read(): boolean {
  try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
}

let on = read();
const subs = new Set<() => void>();

export function setSkinOn(v: boolean): void {
  if (v === on) return;
  on = v;
  try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch { /* storage may be unavailable */ }
  subs.forEach((f) => f());
}

export const getSkinOn = (): boolean => on;

export function useSkinOn(): boolean {
  return useSyncExternalStore(
    (f) => { subs.add(f); return () => subs.delete(f); },
    () => on,
    () => true,
  );
}
