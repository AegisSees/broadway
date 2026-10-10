import { contrast, ensure, hueOf, mix, readableOn, rgba } from './color';
import type { FontKey, HeroSkin } from './types';

/** CSS font stack for each skin typeface. The faces themselves are declared in styles/skin-fonts.css. */
export const FONT_STACK: Record<FontKey, string> = {
  pulp: "'Valve Pulp', Reaver, 'Times New Roman', serif",
  ultra: "'BW Ultra'", bungee: "'BW Bungee'", grenze: "'BW Grenze Gotisch'", cormorant: "'BW Cormorant Unicase'", anton: "'BW Anton'",
  abril: "'BW Abril Fatface'", stardos: "'BW Stardos Stencil'", josefin: "'BW Josefin Sans'", patrick: "'BW Patrick Hand'", gruppo: "'BW Gruppo'",
  courier: "'BW Courier Prime'", alfa: "'BW Alfa Slab One'", orbitron: "'BW Orbitron'", copse: "'BW Copse'", sancreek: "'BW Sancreek'",
  pirata: "'BW Pirata One'", fredoka: "'BW Fredoka'", metamorphous: "'BW Metamorphous'", shippori: "'BW Shippori Mincho'",
  staatliches: "'BW Staatliches'", wetpaint: "'BW Rubik Wet Paint'", bevan: "'BW Bevan'", almendra: "'BW Almendra'", blackops: "'BW Black Ops One'",
  limelight: "'BW Limelight'", playfair: "'BW Playfair Display'", fraktur: "'BW UnifrakturCook'", cinzel: "'BW Cinzel'", elite: "'BW Special Elite'",
  fell: "'BW IM Fell English'", federo: "'BW Federo'", marker: "'BW Permanent Marker'", creepster: "'BW Creepster'", marcellus: "'BW Marcellus'",
  shoulders: "'BW Big Shoulders Display'", sniglet: "'BW Sniglet'", rye: "'BW Rye'", shrikhand: "'BW Shrikhand'", eater: "'BW Eater'",
  italiana: "'BW Italiana'", rampart: "'BW Rampart One'", cutive: "'BW Cutive Mono'", chelsea: "'BW Chelsea Market'",
};

const FALLBACK = "'Valve Pulp', Reaver, 'Times New Roman', serif";
export const fontFamily = (k: FontKey): string => (k === 'pulp' ? FONT_STACK.pulp : `${FONT_STACK[k]}, ${FALLBACK}`);

export type Tokens = Record<string, string>;

const GOOD_DARK = '#8fc79a', BAD_DARK = '#e68b7d';
const GOOD_LIGHT = '#2c7a4b', BAD_LIGHT = '#b3402e';

/**
 * Turns a skin's few seed colours into the full set of site tokens, nudging text colours until they meet WCAG contrast
 * on the surfaces they sit on. Pure, so the whole table can be tested.
 */
export function deriveTokens(s: HeroSkin): Tokens {
  const light = s.mode === 'light';
  const W = '#ffffff', K = '#000000';
  const bg = s.bg;

  // Surfaces. Dark skins step up from the page colour; light skins step down from it and put the panels near white.
  const s2 = bg;
  const s0 = light ? mix(bg, K, 0.07) : mix(bg, K, 0.5);
  const s1 = light ? mix(bg, W, 0.6) : mix(bg, K, 0.26);
  const s3 = light ? mix(bg, K, 0.035) : mix(mix(bg, W, 0.035), s.accent, 0.03);
  const s4 = light ? mix(bg, K, 0.08) : mix(mix(bg, W, 0.075), s.accent, 0.06);
  const s5 = light ? mix(mix(bg, K, 0.12), s.accent, 0.1) : mix(mix(bg, W, 0.13), s.accent, 0.1);
  const panel = light ? mix(bg, W, 0.55) : mix(mix(bg, W, 0.045), s.accent, 0.03);
  const panel2 = light ? mix(bg, W, 0.3) : mix(mix(bg, W, 0.085), s.accent, 0.04);

  // Text.
  const inkSeed = s.ink ?? (light ? mix(mix(bg, K, 0.88), s.accent, 0.12) : mix(W, s.accent2, 0.1));
  const ink = ensure(inkSeed, light ? s5 : s5, 9);
  const ink2 = ensure(mix(ink, bg, 0.24), s5, 7);
  const muted = ensure(mix(ink, bg, 0.5), s5, 4.6);
  const dim = ensure(mix(ink, bg, 0.68), panel, 3);
  const brass = ensure(s.accent, s5, 4.5);
  const brass2 = ensure(s.accent2, s5, 5.4);
  const label = s.accent;
  const onAccent = readableOn(label, light ? mix(bg, K, 0.82) : s0, light ? '#ffffff' : '#fffaf0');
  const good = ensure(light ? GOOD_LIGHT : GOOD_DARK, s5, 4.6);
  const bad = ensure(light ? BAD_LIGHT : BAD_DARK, s5, 4.6);
  const hi = s.hi ?? s.accent2;

  const paper = light ? mix(bg, W, 0.7) : mix(W, s.accent2, 0.1);
  const paperInk = mix(light ? ink : s0, K, 0.2);
  const paperInk2 = ensure(mix(paperInk, paper, 0.4), paper, 4.6);

  const t: Tokens = {
    '--bg': bg,
    '--s0': s0, '--s1': s1, '--s2': s2, '--s3': s3, '--s4': s4, '--s5': s5,
    '--panel': panel, '--panel-2': panel2,
    '--line': rgba(light ? ensure(s.accent, panel, 3) : s.accent, light ? 0.42 : 0.34),
    '--line-2': rgba(ink, light ? 0.13 : 0.1),
    '--ink': ink, '--ink-2': ink2, '--muted': muted, '--dim': dim,
    '--brass': brass, '--brass-2': brass2,
    '--glow': s.accent, '--glow-2': s.accent2,
    '--on-accent': onAccent,
    '--good': good, '--bad': bad,
    '--paper': paper, '--paper-ink': paperInk, '--paper-ink-2': paperInk2,
    '--halo-a': rgba(s.accent, 0.3), '--halo-b': rgba(hi, 0.22), '--halo-c': rgba(s.accent2, 0.08),
    '--mat': paper, '--mat-ink': paperInk,
    '--tag-bg': hi, '--tag-ink': readableOn(hi, mix(bg, K, 0.7), '#ffffff'),
    '--tape': light ? mix(bg, K, 0.82) : mix(bg, K, 0.62),
    '--label': label,
    '--city-filter': `hue-rotate(${Math.round(hueOf(s.accent) - 30)}deg) saturate(0.8) brightness(0.9)`,
    '--grain': String(s.grain ?? 0),
    '--display': fontFamily(s.font),
    // skin-only helpers used by skins.css
    '--sk-bg': bg, '--sk-accent': s.accent, '--sk-accent-2': s.accent2, '--sk-hi': hi,
    '--sk-ink-rgb': rgbList(ink),
    '--sk-accent-rgb': rgbList(s.accent),
    '--sk-hi-rgb': rgbList(hi),
    '--sk-s0': s0,
    '--sk-bg-rgb': rgbList(bg),
    '--sk-panel-rgb': rgbList(panel),
    '--sk-panel2-rgb': rgbList(panel2),
    '--orn': JSON.stringify(s.orn),
    '--sk-art-o': String(s.art ?? (light ? 0.32 : 0.5)),
    '--sk-lite': light ? '1' : '0',
  };
  return t;
}

function rgbList(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '255, 255, 255';
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/** The contrast pairs a skin must satisfy, for the unit test and for debugging. */
export function auditSkin(s: HeroSkin): { name: string; ratio: number; min: number }[] {
  const t = deriveTokens(s);
  const c = (a: string, b: string) => contrast(t[a], t[b]);
  return [
    { name: 'ink on panel', ratio: c('--ink', '--panel'), min: 7 },
    { name: 'ink on page', ratio: c('--ink', '--s2'), min: 7 },
    { name: 'ink-2 on panel', ratio: c('--ink-2', '--panel'), min: 4.5 },
    { name: 'muted on panel', ratio: c('--muted', '--panel'), min: 4.5 },
    { name: 'muted on hover', ratio: c('--muted', '--s5'), min: 4.5 },
    { name: 'brass on panel', ratio: c('--brass', '--panel'), min: 4.5 },
    { name: 'brass-2 on panel', ratio: c('--brass-2', '--panel'), min: 4.5 },
    { name: 'on-accent on label', ratio: c('--on-accent', '--label'), min: 4.5 },
    { name: 'good on panel', ratio: c('--good', '--panel'), min: 4.5 },
    { name: 'bad on panel', ratio: c('--bad', '--panel'), min: 4.5 },
    { name: 'paper-ink on paper', ratio: c('--paper-ink', '--paper'), min: 7 },
    { name: 'tag-ink on tag', ratio: c('--tag-ink', '--tag-bg'), min: 4.5 },
  ];
}
