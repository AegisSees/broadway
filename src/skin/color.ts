/**
 * Small colour toolkit for the hero skins. Everything works on #rrggbb strings so a skin's palette can be written by
 * hand, and every derived colour can be checked against WCAG contrast before it is used for text.
 */
export type RGB = [number, number, number];

const clamp = (n: number, lo = 0, hi = 255) => Math.min(hi, Math.max(lo, n));

export function parse(hex: string): RGB {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (!Number.isFinite(n) || h.length < 6) throw new Error(`Bad colour: ${hex}`);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const toHex = ([r, g, b]: RGB): string => '#' + [r, g, b].map((v) => Math.round(clamp(v)).toString(16).padStart(2, '0')).join('');

/** Mix two colours; `t` is how much of `b` (0 = all a, 1 = all b). */
export function mix(a: string, b: string, t: number): string {
  const x = parse(a), y = parse(b);
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

export const rgba = (hex: string, alpha: number): string => {
  const [r, g, b] = parse(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 1000) / 1000})`;
};

const lin = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
export function luminance(hex: string): number {
  const [r, g, b] = parse(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
export function contrast(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Moves `fg` towards white (on dark backgrounds) or black (on light ones) until it reaches `min` contrast on `bg`. */
export function ensure(fg: string, bg: string, min: number): string {
  if (contrast(fg, bg) >= min) return fg;
  const target = luminance(bg) < 0.4 ? '#ffffff' : '#000000';
  for (let t = 0.04; t <= 1.0001; t += 0.04) {
    const c = mix(fg, target, t);
    if (contrast(c, bg) >= min) return c;
  }
  return target;
}

/** The better of near-black and near-white text on `bg`, taking `dark`/`light` as the two candidates. */
export function textOn(bg: string, dark: string, light = '#ffffff'): string {
  return contrast(dark, bg) >= contrast(light, bg) ? dark : light;
}

/**
 * Like `textOn`, but guarantees `min` contrast: if neither candidate reaches it, falls back to pure black or white,
 * which always clears 4.5 whatever the background (the two cross over at about 4.58).
 */
export function readableOn(bg: string, dark: string, light = '#ffffff', min = 4.5): string {
  const pick = textOn(bg, dark, light);
  if (contrast(pick, bg) >= min) return pick;
  return contrast('#000000', bg) >= contrast('#ffffff', bg) ? '#000000' : '#ffffff';
}

export function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = parse(hex).map((v) => v / 255) as RGB;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return [h, s, l];
}

export function fromHsl(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return toHex([l * 255, l * 255, l * 255]);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return toHex([f(hh + 1 / 3) * 255, f(hh) * 255, f(hh - 1 / 3) * 255]);
}

export const hueOf = (hex: string): number => toHsl(hex)[0];
