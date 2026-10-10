/** Tiny deterministic helpers for the illustrative sample data: the same seed always gives the same numbers. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T,>(r: () => number, list: readonly T[]): T => list[Math.floor(r() * list.length)];
export const between = (r: () => number, lo: number, hi: number): number => lo + r() * (hi - lo);

/** Weighted draw without replacement; weights <= 0 are never drawn. */
export function weightedSample<T>(r: () => number, list: readonly T[], weight: (t: T) => number, n: number): T[] {
  const pool = list.map((t) => ({ t, w: Math.max(0, weight(t)) })).filter((x) => x.w > 0);
  const out: T[] = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, x) => s + x.w, 0);
    let roll = r() * total;
    let i = 0;
    for (; i < pool.length - 1; i++) { roll -= pool[i].w; if (roll <= 0) break; }
    out.push(pool[i].t);
    pool.splice(i, 1);
  }
  return out;
}
