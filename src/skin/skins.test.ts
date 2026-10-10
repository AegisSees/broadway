import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HEROES } from '../data/roster';
import { auditSkin, FONT_STACK } from './derive';
import { ALL_SKINS, getSkin } from './heroSkins';
import { DEFAULT_COPY } from './types';

const css = (f: string) => readFileSync(new URL(`../styles/${f}`, import.meta.url), 'utf8');
const SKINS = css('skins.css'), FRAMES = css('skin-frames.css'), PARTS = css('skin-parts.css'), TEX = css('skin-tex.css'), FX = css('skin-fx.css');
const FONTS = css('skin-fonts.css'), CARDS = css('hero-cards.css');
const has = (src: string, attr: string, v: string) => src.includes(`data-${attr}='${v}'`) || src.includes(`data-${attr}="${v}"`);

describe('hero skins', () => {
  it('gives every hero on the roster exactly one skin', () => {
    expect(new Set(ALL_SKINS.map((s) => s.slug)).size).toBe(ALL_SKINS.length);
    const missing = HEROES.filter((h) => !getSkin(h.slug)).map((h) => h.slug);
    expect(missing).toEqual([]);
    expect(ALL_SKINS.filter((s) => !HEROES.some((h) => h.slug === s.slug)).map((s) => s.slug)).toEqual([]);
    expect(ALL_SKINS.length).toBeGreaterThanOrEqual(44);
  });

  it('keeps every skin readable: text, accents, good/bad and label text all clear their contrast minimum', () => {
    const fails: string[] = [];
    for (const s of ALL_SKINS) {
      if (s.inherit) continue;
      for (const a of auditSkin(s)) if (a.ratio < a.min) fails.push(`${s.slug}: ${a.name} ${a.ratio.toFixed(2)} < ${a.min}`);
    }
    expect(fails).toEqual([]);
  });

  it('uses only typefaces that are declared and shipped', () => {
    for (const s of ALL_SKINS) {
      expect(FONT_STACK[s.font], `${s.slug} font ${s.font}`).toBeTruthy();
      if (s.font === 'pulp') continue;
      const family = FONT_STACK[s.font].replace(/'/g, '').replace(/,.*$/, '');
      expect(FONTS.includes(`font-family: '${family}'`), `${s.slug}: @font-face for ${family}`).toBe(true);
      expect(existsSync(new URL(`../assets/fonts/hero/${s.font}.woff2`, import.meta.url)), `${s.slug}: ${s.font}.woff2`).toBe(true);
    }
    expect(existsSync(new URL('../assets/fonts/hero/LICENSES.md', import.meta.url))).toBe(true);
  });

  it('has CSS for every frame, texture, label, bar, rule, tile, effect and hover a skin asks for', () => {
    const miss: string[] = [];
    for (const s of ALL_SKINS) {
      if (s.inherit) continue;
      if (s.frame !== 'plain' && !has(FRAMES, 'frame', s.frame)) miss.push(`${s.slug} frame ${s.frame}`);
      if (s.tex !== 'smooth' && s.tex !== 'grain' && !has(TEX, 'tex', s.tex)) miss.push(`${s.slug} tex ${s.tex}`);
      if (!has(SKINS, 'label', s.label)) miss.push(`${s.slug} label ${s.label}`);
      if (s.bar !== 'solid' && !has(PARTS, 'bar', s.bar)) miss.push(`${s.slug} bar ${s.bar}`);
      if (s.rule !== 'line' && !has(SKINS, 'rule', s.rule)) miss.push(`${s.slug} rule ${s.rule}`);
      if (s.tile !== 'ticket' && !has(PARTS, 'tile', s.tile)) miss.push(`${s.slug} tile ${s.tile}`);
      if (s.fx !== 'none' && !has(FX, 'fx', s.fx)) miss.push(`${s.slug} fx ${s.fx}`);
    }
    for (const s of ALL_SKINS) if (s.hover !== 'lift' && !has(CARDS, 'hover', s.hover)) miss.push(`${s.slug} hover ${s.hover}`);
    expect(miss).toEqual([]);
  });

  it('never gives two heroes the same look', () => {
    const seen = new Map<string, string>();
    for (const s of ALL_SKINS) {
      const key = [s.font, s.frame, s.tex, s.label, s.bar, s.rule, s.fx, s.tile].join('|');
      expect(seen.get(key), `${s.slug} repeats ${seen.get(key)}`).toBeUndefined();
      seen.set(key, s.slug);
    }
    // palettes differ too: no two skins share an accent and a background
    const pal = new Set(ALL_SKINS.map((s) => `${s.bg}|${s.accent}`));
    expect(pal.size).toBe(ALL_SKINS.length);
    // and the roster is not all one motion
    expect(new Set(ALL_SKINS.map((s) => s.hover)).size).toBeGreaterThanOrEqual(20);
  });

  it('has its own words for the page titles, and a plain fallback for the rest', () => {
    for (const s of ALL_SKINS) {
      if (s.inherit) continue;
      expect(s.concept.length, `${s.slug} concept`).toBeGreaterThan(20);
      expect(s.copy?.kicker, `${s.slug} kicker`).toBeTruthy();
    }
    expect(Object.keys(DEFAULT_COPY).sort()).toEqual(['builds', 'dossier', 'kicker', 'matches', 'matchups', 'trend']);
  });

  it('keeps Holliday on the site look with its ticket tiles', () => {
    const h = getSkin('holliday')!;
    expect(h.inherit).toBe(true);
    expect(h.tile).toBe('ticket');
  });
});
