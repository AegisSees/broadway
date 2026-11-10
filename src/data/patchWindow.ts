/**
 * Which stretch of time a statistic covers.
 *
 * A big patch changes heroes and items so much that games from before and after it are different games. Mixing them
 * gives numbers that describe neither. So every statistic on the site is cut to one patch: by default the current one,
 * from the day it shipped until now. The shorter windows (last 14 or 7 days) are also cut at the patch day, so they can
 * never reach back across it.
 *
 * Patch days come from the Deadlock API (`/v1/patches/big-days`). The City Never Sleeps day is also written down here,
 * so the site still refuses to mix eras if that call fails.
 */

export type WindowKey = 'patch' | '14d' | '7d' | 'prev';
export const WINDOW_KEYS: readonly WindowKey[] = ['patch', '14d', '7d', 'prev'];

export const WINDOW_LABEL: Record<WindowKey, string> = {
  patch: 'This patch',
  '14d': 'Last 14 days',
  '7d': 'Last 7 days',
  prev: 'Previous patch',
};

/** City Never Sleeps shipped on 29 Sep 2026 at 20:25:11 UTC. Unix seconds. */
export const CITY_NEVER_SLEEPS = Date.UTC(2026, 8, 29, 20, 25, 11) / 1000;

const DAY = 86400;

export interface PatchWindow {
  key: WindowKey;
  /** Start, unix seconds (inclusive). */
  from: number;
  /** End, unix seconds. Absent means "until now". */
  to?: number;
  /** The day the patch this window belongs to shipped, unix seconds. */
  patchStart: number;
}

/** Turns the API's list of ISO dates into unix seconds, newest first, always including City Never Sleeps. */
export function bigDaysToUnix(days: readonly string[] | null | undefined): number[] {
  const out = new Set<number>([CITY_NEVER_SLEEPS]);
  for (const d of days ?? []) {
    const ms = Date.parse(d);
    if (Number.isFinite(ms)) out.add(Math.floor(ms / 1000));
  }
  return [...out].sort((a, b) => b - a);
}

/**
 * The time range for a window choice.
 * - patch: latest patch day until now.
 * - 14d / 7d: that many days back, but never before the latest patch day.
 * - prev: from the patch day before the latest one up to the latest one.
 */
export function resolveWindow(key: WindowKey, bigDays: readonly number[], nowSec: number): PatchWindow {
  const days = bigDays.length ? bigDays : [CITY_NEVER_SLEEPS];
  const latest = days[0];
  if (key === 'prev') {
    const before = days[1];
    // No earlier patch known: fall back to the current patch rather than to "all time".
    if (before === undefined) return { key: 'patch', from: latest, patchStart: latest };
    return { key, from: before, to: latest - 1, patchStart: before };
  }
  if (key === 'patch') return { key, from: latest, patchStart: latest };
  const back = key === '14d' ? 14 : 7;
  return { key, from: Math.max(latest, nowSec - back * DAY), patchStart: latest };
}
