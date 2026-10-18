import { describe, expect, it } from 'vitest';
import { HERO_LORE, getLore } from './heroLore';
import { HEROES } from './roster';

describe('hero dossiers', () => {
  it('covers every hero on the roster, and only them', () => {
    const roster = new Set(HEROES.map((h) => h.slug));
    for (const h of HEROES) expect(getLore(h.slug), h.slug).toBeDefined();
    for (const slug of Object.keys(HERO_LORE)) expect(roster.has(slug), slug).toBe(true);
  });
  it('keeps titles short enough for the label and bios to a few sentences', () => {
    for (const [slug, l] of Object.entries(HERO_LORE)) {
      expect(l.title.length, slug).toBeLessThanOrEqual(34);
      expect(l.bio.length, slug).toBeGreaterThanOrEqual(1);
      expect(l.bio.length, slug).toBeLessThanOrEqual(3);
      expect(l.title).not.toMatch(/dossier/i);
    }
  });
  it('keeps Haze as she was', () => {
    expect(getLore('haze')?.title).toBe('The unseen threat');
  });
  it('marks a hero with no published biography as pending', () => {
    expect(getLore('nurse-harrow')?.from).toBe('pending');
  });
});
