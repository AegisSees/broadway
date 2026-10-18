import raw from './heroStats.json';

/** Base stats and weapon data read straight from the game files (heroes.vdata and abilities.vdata). */
export interface HeroBaseStats {
  key: string; name: string; type: string; complexity: number | null; dev: string;
  /** False for heroes read from their release page only: base stats and weapon are known, level scaling is not. */
  scaling?: boolean;
  health: number; regen: number; move: number; sprint: number; crouch: number; stamina: number;
  light: number; heavy: number; reloadSpeed: number; dashDist: number;
  perBoon: { health: number | null; bullet: number | null; melee: number | null; spirit: number | null };
  weapon: {
    name?: string;
    bulletDamage: number | null; clip: number | null; reload: number | null; pellets: number; cycle: number | null; rps: number | null;
    bulletSpeed: number | null; falloffStart: number | null; falloffEnd: number | null; falloffEndScale: number | null; burst: number | null; attrs: string[];
  };
  gold: (number | null)[];
}

const STATS = raw as unknown as Record<string, HeroBaseStats>;
export const getHeroStats = (slug: string | undefined): HeroBaseStats | undefined => (slug ? STATS[slug] : undefined);
export const allHeroStats = (): [string, HeroBaseStats][] => Object.entries(STATS);

const bgs = import.meta.glob('../assets/hero-bg/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
/** Hero-coloured key art from the game's hero select screen: transparent where the hero stands, painted shapes to the right. */
export const getHeroBg = (slug: string | undefined): string | undefined => (slug ? bgs[`../assets/hero-bg/${slug}.webp`] : undefined);

/** Boon level at which a hero stat is read. Level 1 is the starting stat; every boon adds the per-boon amount. */
export interface StatsAtBoon {
  boon: number; souls: number | null; health: number; bulletDamage: number | null; dps: number | null; light: number; heavy: number; spirit: number;
}

export function statsAtBoon(s: HeroBaseStats, boon: number): StatsAtBoon {
  const n = Math.max(0, boon - 1);
  const w = s.weapon;
  const bd = w.bulletDamage === null ? null : w.bulletDamage + (s.perBoon.bullet ?? 0) * n;
  return {
    boon, souls: s.gold[boon - 1] ?? null,
    health: s.health + (s.perBoon.health ?? 0) * n,
    bulletDamage: bd,
    dps: bd !== null && w.rps ? bd * w.pellets * w.rps : null,
    light: s.light + (s.perBoon.melee ?? 0) * n,
    heavy: s.heavy + (s.perBoon.melee ?? 0) * n * (s.heavy / s.light),
    spirit: (s.perBoon.spirit ?? 0) * n,
  };
}

export const MAX_BOON = (s: HeroBaseStats): number => s.gold.length || 35;

/** The roster-wide range of a base stat, so a hero's value can be drawn against every other hero. */
export function statRange(pick: (s: HeroBaseStats) => number | null): { min: number; max: number } {
  const v = allHeroStats().map(([, s]) => pick(s)).filter((x): x is number => x !== null && Number.isFinite(x));
  return { min: Math.min(...v), max: Math.max(...v) };
}

export const ATTR_LABEL: Record<string, string> = {
  RapidFire: 'Rapid fire', CloseRange: 'Close range', MediumRange: 'Medium range', LongRange: 'Long range', Spreadshot: 'Spread shot',
  Projectile: 'Projectile', HeavyHitter: 'Heavy hitter', BurstFire: 'Burst fire', BeamWeapon: 'Beam', Bouncy: 'Bouncing',
};
export const attrLabel = (a: string): string => ATTR_LABEL[a] ?? a.replace(/([a-z])([A-Z])/g, '$1 $2');
export const isPreRelease = (s: HeroBaseStats): boolean => s.dev.includes('PreRelease');
export const hasScaling = (s: HeroBaseStats): boolean => s.scaling !== false && s.perBoon.health !== null;

/** Gun damage per second at level 1 (damage x pellets x shots per second). */
export const baseDps = (s: HeroBaseStats): number | null => (s.weapon.bulletDamage && s.weapon.rps ? s.weapon.bulletDamage * s.weapon.pellets * s.weapon.rps : null);

/** Where a hero sits among every released hero for one stat (1 = highest). Ties share a place. */
export function rankAmong(slug: string, pick: (s: HeroBaseStats) => number | null): { rank: number; of: number } | undefined {
  const me = STATS[slug];
  const mine = me ? pick(me) : null;
  if (!me || mine === null) return undefined;
  const all = Object.values(STATS).filter((s) => !isPreRelease(s)).map(pick).filter((x): x is number => x !== null && Number.isFinite(x));
  const eps = 1e-9;
  return { rank: 1 + all.filter((x) => x > mine + eps).length, of: all.length };
}
