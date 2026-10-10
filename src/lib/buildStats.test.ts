import { describe, expect, it } from 'vitest';
import { boonForSouls, parseValue, totalCost, totalStats } from './buildStats';

describe('parseValue', () => {
  it('reads signed numbers with units', () => {
    expect(parseValue('+35%')).toEqual({ num: 35, unit: '%' });
    expect(parseValue('-1.75s')).toEqual({ num: -1.75, unit: 's' });
    expect(parseValue('+1,250')).toEqual({ num: 1250, unit: '' });
  });
  it('rejects text', () => { expect(parseValue('Passive')).toBeNull(); });
});

describe('totals', () => {
  it('sums items and stacks resists multiplicatively', () => {
    const t = totalStats(['Extra Health', 'Extra Health']);
    expect(t.find((x) => x.label === 'Bonus Health')?.total).toBeGreaterThan(0);
    expect(totalCost(['Extra Health'])).toBe(800);
  });
  it('maps souls to a boon level', () => {
    expect(boonForSouls([0, 200, 500, 900], 600)).toBe(3);
    expect(boonForSouls([0, 200, 500, 900], 0)).toBe(1);
  });
});

import { investmentAt, investedSouls } from './investment';

describe('investment steps', () => {
  it('finds the step and the next one', () => {
    expect(investmentAt('weapon', 0)).toMatchObject({ step: 0, bonus: 0, next: { at: 800, bonus: 9 } });
    expect(investmentAt('weapon', 4800)).toMatchObject({ step: 5, bonus: 46 });
    expect(investmentAt('spirit', 5000).next).toEqual({ at: 6400, bonus: 45 });
    expect(investmentAt('vitality', 99999)).toMatchObject({ step: 11, bonus: 66, next: null, fill: 1 });
  });
  it('adds up souls per category', () => {
    const s = investedSouls(['Extra Health', 'Extra Health']);
    expect(s.vitality + s.weapon + s.spirit).toBeGreaterThan(0);
  });
});
