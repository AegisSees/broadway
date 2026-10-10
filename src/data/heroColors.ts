import { useSyncExternalStore } from 'react';
import base from './heroColors.json';

/**
 * Per-hero accent colour. The built-in values were sampled from each hero's art. When the page loads it also asks
 * the Deadlock assets API for the game's own hero colours and, if that answers, uses those instead.
 */
const BASE = base as Record<string, string | null>;
const KEY = 'broadway-hero-colors-v1';
const DAY = 24 * 60 * 60 * 1000;
const FALLBACK = '#b9a6e8';

let live: Record<string, string> = {};
const listeners = new Set<() => void>();
let version = 0;

const norm = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const hex = (r: number, g: number, b: number) => '#' + [r, g, b].map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');

function toHex(c: unknown): string | null {
  if (Array.isArray(c) && c.length >= 3 && c.every((n) => typeof n === 'number')) return hex(c[0], c[1], c[2]);
  if (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)) return c;
  return null;
}

function apply(map: Record<string, string>) {
  live = map; version++;
  listeners.forEach((l) => l());
}

/** Fetch the game's hero colours once a day. Any failure (offline, blocked, different shape) keeps the built-in colours. */
export async function loadLiveHeroColors(): Promise<void> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const c = JSON.parse(raw) as { t: number; map: Record<string, string> };
      if (c?.map) apply(c.map);
      if (c && Date.now() - c.t < DAY) return;
    }
  } catch { /* ignore */ }
  try {
    const res = await fetch('https://assets.deadlock-api.com/v2/heroes?only_active=true', { headers: { accept: 'application/json' } });
    if (!res.ok) return;
    const heroes = (await res.json()) as { name?: string; colors?: { ui?: unknown } }[];
    const map: Record<string, string> = {};
    for (const h of heroes) { const c = toHex(h?.colors?.ui); if (h?.name && c) map[norm(h.name)] = c; }
    if (Object.keys(map).length === 0) return;
    apply(map);
    try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), map })); } catch { /* ignore */ }
  } catch { /* offline or blocked */ }
}

export const getHeroColor = (slug: string): string => live[slug] ?? BASE[slug] ?? FALLBACK;

export function useHeroColor(slug: string): string {
  useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => version, () => 0);
  return getHeroColor(slug);
}

/** Tag plate colours from a hero colour: a bright, readable plate with a very dark ink of the same hue. */
export function tagColors(color: string): { bg: string; ink: string } {
  const n = parseInt(color.slice(1), 16);
  let r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0; const l0 = (max + min) / 2; const d = max - min;
  const s0 = d === 0 ? 0 : d / (1 - Math.abs(2 * l0 - 1));
  if (d !== 0) { h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  const css = (s: number, l: number) => `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
  r = g = b = 0;
  const s = Math.max(0.55, Math.min(0.92, s0));
  return { bg: css(s, 0.62), ink: css(Math.min(0.8, s), 0.08) };
}
