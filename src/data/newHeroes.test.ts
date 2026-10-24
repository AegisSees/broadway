import { describe, expect, it } from 'vitest';
import { baseDps, getHeroStats, hasScaling, rankAmong } from './heroStats';
import { getNewcomer, isNewHero, isOut, NEWCOMERS, nextUnlock, releaseDay, releaseWeekday } from './newHeroes';
import { getHero, HEROES } from './roster';
import { getAbilities } from './abilities';

describe('City Never Sleeps newcomers', () => {
  it('lists the six heroes in release order, all present in the roster', () => {
    expect(NEWCOMERS).toHaveLength(6);
    const times = NEWCOMERS.map((n) => Date.parse(n.at));
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    for (const n of NEWCOMERS) expect(getHero(n.slug)).toBeDefined();
  });

  it('unlocks at 2 PM Pacific, announced in Pacific time', () => {
    const violet = getNewcomer('violet')!;
    expect(releaseDay(violet)).toBe('Oct 16');
    expect(releaseWeekday(violet)).toBe('Fri, Oct 16');
    expect(releaseWeekday(getNewcomer('nurse-harrow')!)).toBe('Tue, Oct 20');
  });

  it('works out who is out from the clock', () => {
    const before = Date.parse('2026-10-18T00:00:00Z');
    expect(isOut('violet', before)).toBe(true);
    expect(isOut('nurse-harrow', before)).toBe(false);
    expect(nextUnlock(before)?.slug).toBe('nurse-harrow');
    expect(isOut('nurse-harrow', Date.parse('2026-10-20T21:00:00Z'))).toBe(true);
    expect(nextUnlock(Date.parse('2026-10-21T00:00:00Z'))).toBeUndefined();
    expect(isOut('abrams', before)).toBe(false);
  });

  it('flags a hero as new until two weeks after her unlock', () => {
    expect(isNewHero('violet', Date.parse('2026-10-17T00:00:00Z'))).toBe(true);
    expect(isNewHero('nurse-harrow', Date.parse('2026-10-17T00:00:00Z'))).toBe(true);
    expect(isNewHero('rat-king', Date.parse('2026-10-17T00:00:00Z'))).toBe(false);
    expect(isNewHero('abrams')).toBe(false);
  });

  it('marks Violet, Solomon and Danny as released and flips Nurse Harrow by date', () => {
    for (const slug of ['violet', 'solomon', 'deadman-danny']) expect(HEROES.find((h) => h.slug === slug)?.unreleased).toBeFalsy();
    expect(HEROES.find((h) => h.slug === 'nurse-harrow')?.unreleased).toBe(Date.now() < Date.parse('2026-10-20T21:00:00Z') ? true : undefined);
  });

  it('keeps a four-ability kit with a placeholder icon for new heroes', () => {
    const kit = getAbilities('violet');
    expect(kit?.map((a) => a.name)).toEqual(['Living Ink', 'Flow State', 'Still Life', 'Abstract Landscape']);
    expect(kit?.every((a) => !!a.icon)).toBe(true);
  });
});

describe("Violet's release numbers and ranks", () => {
  const s = getHeroStats('violet')!;
  it('has the released base stats and weapon', () => {
    expect(s.health).toBe(710);
    expect(s.complexity).toBe(1);
    expect(s.weapon.name).toBe('Creative Solutions');
    expect(s.weapon.clip).toBe(15);
    expect(Math.round(baseDps(s)!)).toBe(46);
    expect(hasScaling(s)).toBe(false);
  });
  it('ranks among the 44 released heroes (43 on her release page, before Nurse Harrow unlocked)', () => {
    expect(rankAmong('violet', (x) => x.health)).toEqual({ rank: 40, of: 44 });
    expect(rankAmong('violet', (x) => x.regen)).toEqual({ rank: 6, of: 44 });
    expect(rankAmong('violet', (x) => x.move)).toEqual({ rank: 18, of: 44 });
    expect(rankAmong('violet', (x) => x.sprint)).toEqual({ rank: 5, of: 44 });
    expect(rankAmong('violet', (x) => x.stamina)).toEqual({ rank: 5, of: 44 });
    expect(rankAmong('violet', (x) => x.light)).toEqual({ rank: 9, of: 44 });
    expect(rankAmong('violet', (x) => x.heavy)).toEqual({ rank: 5, of: 44 });
  });
  it('leaves a missing hero without a rank', () => {
    expect(rankAmong('nobody', (x) => x.health)).toBeUndefined();
  });
});

describe("Nurse Harrow's kit and numbers from the game files", () => {
  it('has her four abilities in slot order with icons and cooldowns', () => {
    const kit = getAbilities('nurse-harrow');
    expect(kit?.map((a) => a.name)).toEqual(['Leech Therapy', 'Wretched Vapors', 'Healing Needles', 'Lurking Terrors']);
    expect(kit?.map((a) => a.cooldown)).toEqual([30, 40, null, 200]);
    expect(kit?.every((a) => !!a.card && a.card.upgrades.length === 3)).toBe(true);
  });
  it('has her released base stats and Code Blue', () => {
    const s = getHeroStats('nurse-harrow')!;
    expect(s.dev).toBe('EHeroDevState_Release');
    expect(s.health).toBe(730);
    expect(s.weapon.name).toBe('Code Blue');
    expect(s.weapon.clip).toBe(11);
    expect(rankAmong('nurse-harrow', (x) => x.health)).toEqual({ rank: 29, of: 44 });
  });
});
