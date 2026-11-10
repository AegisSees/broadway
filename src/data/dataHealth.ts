import { useSyncExternalStore } from 'react';

/**
 * Health of the connection to the Deadlock API. Every number on the site comes from that API, so when a call fails
 * the page shows an error state and the header chip says the API is not answering. Nothing is ever filled in with
 * made-up data.
 */
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
