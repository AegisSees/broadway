import { useSyncExternalStore } from 'react';

/**
 * Three palettes, all dark:
 *  - city:        City Never Sleeps (default): near-black with the official update page's teal tint, orange labels and cream type
 *  - hidden-king: amber and ember on near-black
 *  - archmother:  sapphire blue and pale white on deep night-blue
 * Only borders, text, lighting and accents change.
 */
export type ThemeId = 'city' | 'hidden-king' | 'archmother';

export const THEMES: { id: ThemeId; name: string }[] = [
  { id: 'city', name: 'City Never Sleeps' },
  { id: 'hidden-king', name: 'Hidden King' },
  { id: 'archmother', name: 'Archmother' },
];

// v3: City Never Sleeps became the default, so everyone starts on it once
const KEY = 'broadway-theme-v3';
const isTheme = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v);

let current: ThemeId = (() => {
  try {
    const stored = localStorage.getItem(KEY);
    if (isTheme(stored)) return stored;
  } catch { /* storage can be blocked (private windows, file://); fall back to the default */ }
  return 'city';
})();

const listeners = new Set<() => void>();

function commit(next: ThemeId): void {
  current = next;
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

/** Apply the saved theme before first paint so there is no flash of the wrong palette. */
export function initTheme(): void {
  document.documentElement.dataset.theme = current;
}

type VT = { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

/**
 * Switch palette. Where the browser supports view transitions the new palette is revealed as a circle that
 * grows out of the toggle. Elsewhere the colours cross-fade. Reduced-motion users get an instant swap.
 */
export function setTheme(next: ThemeId, origin?: { x: number; y: number }): void {
  if (next === current) return;
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { commit(next); return; }

  const doc = document as unknown as VT;
  if (doc.startViewTransition) {
    const x = origin?.x ?? window.innerWidth - 60;
    const y = origin?.y ?? 30;
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    root.style.setProperty('--vt-x', `${x}px`);
    root.style.setProperty('--vt-y', `${y}px`);
    root.style.setProperty('--vt-r', `${Math.ceil(r)}px`);
    doc.startViewTransition(() => commit(next));
    return;
  }
  root.classList.add('theme-fading');
  commit(next);
  window.setTimeout(() => root.classList.remove('theme-fading'), 700);
}

export function useTheme(): ThemeId {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => current,
    () => 'city' as ThemeId,
  );
}
