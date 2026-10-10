import { investmentBonuses } from './investment';
import type { HeroBaseStats } from '../data/heroStats';
import { statsAtBoon } from '../data/heroStats';
import { getItem, getItemCard } from '../data/items';

export interface Parsed { num: number; unit: '' | '%' | 'm' | 's' }

/** "+35%" -> {35,'%'}, "-1.75s" -> {-1.75,'s'}, "+1.5m" -> {1.5,'m'}. Returns null for anything that is not a plain number. */
export function parseValue(v: string): Parsed | null {
  const m = v.trim().replace(/−/g, '-').match(/^([+-]?)\s*(\d[\d,]*\.?\d*)\s*(%|m|s)?$/);
  if (!m) return null;
  const num = Number(m[2].replace(/,/g, '')) * (m[1] === '-' ? -1 : 1);
  return Number.isFinite(num) ? { num, unit: (m[3] as Parsed['unit']) ?? '' } : null;
}

/** Resistances stack as a chain of reductions, not a sum: two 30% resists make 51%, not 60%. */
const RESIST = /resist$/i;
const SKIP = /vs\.? npcs|sound|penalty/i;

export interface Total { label: string; total: number; unit: Parsed['unit']; resist: boolean; from: string[] }

/** Totals every always-on stat across a list of items. Conditional bonuses and effect text are not counted. */
export function totalStats(names: string[]): Total[] {
  const acc = new Map<string, { sum: number; keep: number; unit: Parsed['unit']; from: string[] }>();
  for (const n of names) {
    const card = getItemCard(n);
    if (!card) continue;
    for (const s of card.stats) {
      if (s.conditional || SKIP.test(s.label)) continue;
      const p = parseValue(s.value);
      if (!p) continue;
      const cur = acc.get(s.label) ?? { sum: 0, keep: 1, unit: p.unit, from: [] };
      cur.sum += p.num;
      cur.keep *= 1 - p.num / 100;
      cur.from.push(n);
      acc.set(s.label, cur);
    }
  }
  const out: Total[] = [];
  for (const [label, c] of acc) {
    const resist = RESIST.test(label) && c.unit === '%';
    out.push({ label, total: resist ? (1 - c.keep) * 100 : c.sum, unit: c.unit, resist, from: c.from });
  }
  const ORDER = ['Bonus Health', 'Weapon Damage', 'Fire Rate', 'Max Ammo', 'Spirit Power', 'Bullet Resist', 'Spirit Resist', 'Melee Resist', 'Sprint Speed', 'Move Speed', 'Out of Combat Regen', 'Health Regen'];
  return out.sort((a, b) => {
    const ia = ORDER.indexOf(a.label), ib = ORDER.indexOf(b.label);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.label.localeCompare(b.label);
  });
}

export const totalCost = (names: string[]): number => names.reduce((n, x) => n + (getItem(x)?.cost ?? 0), 0);

/** Highest boon level whose soul requirement is covered by the given souls. */
export function boonForSouls(gold: (number | null)[], souls: number): number {
  let b = 1;
  gold.forEach((g, i) => { if (g !== null && g <= souls) b = i + 1; });
  return b;
}

export interface Projection { boon: number; health: number; bulletDamage: number | null; dps: number | null; spirit: number; move: number; magazine: number | null; regen: number }

/** Hero stats at the boon level the build's souls would reach, with every always-on item bonus applied. */
export function project(hero: HeroBaseStats, names: string[], withInvestment = true): Projection {
  const totals = totalStats(names);
  const get = (l: string) => totals.find((t) => t.label === l)?.total ?? 0;
  const boon = boonForSouls(hero.gold, totalCost(names));
  const b = statsAtBoon(hero, boon);
  const inv = investmentBonuses(withInvestment ? names : []);
  const wd = 1 + (get('Weapon Damage') + inv.weapon.bonus) / 100, fr = 1 + get('Fire Rate') / 100;
  const bullet = b.bulletDamage === null ? null : b.bulletDamage * wd;
  return {
    boon, health: b.health * (1 + inv.vitality.bonus / 100) + get('Bonus Health'), bulletDamage: bullet,
    dps: bullet !== null && hero.weapon.rps ? bullet * hero.weapon.pellets * hero.weapon.rps * fr : null,
    spirit: b.spirit + get('Spirit Power') + inv.spirit.bonus, move: hero.move + get('Move Speed'),
    magazine: hero.weapon.clip ? Math.round(hero.weapon.clip * (1 + get('Max Ammo') / 100)) : null,
    regen: hero.regen + get('Health Regen'),
  };
}
