import { getItem } from '../data/items';
import type { ItemCategory } from '../data/types';

/**
 * Souls-invested steps. Spending souls on a category's items unlocks a growing bonus for that category:
 * weapon gives % weapon damage, vitality gives % base health, spirit gives flat spirit power.
 * Values are from the Deadlock Wiki's ItemInvestmentData table (https://deadlock.wiki/Data:ItemInvestmentData.json).
 * They have not yet been read from the game files, so re-check them after a balance patch.
 */
export const INVEST_STEPS = [800, 1600, 2400, 3200, 4800, 6400, 8000, 11200, 16000, 22400, 28800] as const;
/** The step with the biggest jump in every category (weapon +18% to +46%): worth planning a build around. */
export const KEY_STEP = 4800;
export const INVEST_BONUS: Record<ItemCategory, readonly number[]> = {
  weapon: [9, 12, 15, 18, 46, 54, 62, 74, 86, 100, 115],
  vitality: [9, 12, 15, 20, 38, 42, 46, 50, 54, 60, 66],
  spirit: [7, 11, 15, 19, 38, 45, 52, 59, 66, 75, 100],
};

export const INVEST_LABEL: Record<ItemCategory, { unit: string; text: string }> = {
  weapon: { unit: '%', text: 'weapon damage' },
  vitality: { unit: '%', text: 'base health' },
  spirit: { unit: '', text: 'spirit power' },
};

export interface InvestmentState {
  souls: number;
  /** Steps reached, 0 to 11. */
  step: number;
  /** Bonus unlocked so far (0 before the first step). */
  bonus: number;
  next: { at: number; bonus: number } | null;
  /** 0 to 1 position along the track, interpolated between evenly spaced steps. */
  fill: number;
}

export function investmentAt(cat: ItemCategory, souls: number): InvestmentState {
  let step = 0;
  INVEST_STEPS.forEach((s, i) => { if (souls >= s) step = i + 1; });
  const bonus = step ? INVEST_BONUS[cat][step - 1] : 0;
  const next = step < INVEST_STEPS.length ? { at: INVEST_STEPS[step], bonus: INVEST_BONUS[cat][step] } : null;
  const lo = step ? INVEST_STEPS[step - 1] : 0;
  const frac = next ? (souls - lo) / (next.at - lo) : 0;
  return { souls, step, bonus, next, fill: Math.min(1, (step + frac) / INVEST_STEPS.length) };
}

/** Souls spent per category by the listed items. Counts final item prices only, not sold or skipped components. */
export function investedSouls(names: string[]): Record<ItemCategory, number> {
  const out: Record<ItemCategory, number> = { weapon: 0, vitality: 0, spirit: 0 };
  for (const n of names) { const i = getItem(n); if (i) out[i.category] += i.cost; }
  return out;
}

export function investmentBonuses(names: string[]): Record<ItemCategory, InvestmentState> {
  const s = investedSouls(names);
  return { weapon: investmentAt('weapon', s.weapon), vitality: investmentAt('vitality', s.vitality), spirit: investmentAt('spirit', s.spirit) };
}
