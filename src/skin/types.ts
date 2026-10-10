/**
 * A hero skin is a small data record. The engine turns it into colour tokens (derive.ts) and a handful of
 * data-attributes that the structural CSS in styles/skins.css keys on, so a hero's page can have its own palette,
 * panel shape, surface texture, label shape, type, bar style, ornament, ambient effect and hover motion without
 * any per-hero component code.
 */

export type FontKey =
  | 'pulp' | 'ultra' | 'bungee' | 'grenze' | 'cormorant' | 'anton' | 'abril' | 'stardos' | 'josefin' | 'patrick' | 'gruppo'
  | 'courier' | 'alfa' | 'orbitron' | 'copse' | 'sancreek' | 'pirata' | 'fredoka' | 'metamorphous' | 'shippori' | 'staatliches'
  | 'wetpaint' | 'bevan' | 'almendra' | 'blackops' | 'limelight' | 'playfair' | 'fraktur' | 'cinzel' | 'elite' | 'fell' | 'federo'
  | 'marker' | 'creepster' | 'marcellus' | 'shoulders' | 'sniglet' | 'rye' | 'shrikhand' | 'eater' | 'italiana' | 'rampart'
  | 'cutive' | 'chelsea';

/** The shape of every panel on the page. */
export type Frame =
  | 'ticket' | 'folder' | 'blade' | 'lace' | 'riveted' | 'sticker' | 'neon' | 'marquee' | 'chalk' | 'bracket' | 'cut' | 'arch'
  | 'valance' | 'stone' | 'blob' | 'glass' | 'frost' | 'leather' | 'stitched' | 'drip' | 'tome' | 'deco' | 'card' | 'shield'
  | 'cell' | 'torn' | 'plain' | 'leaf' | 'wood' | 'scope' | 'claw' | 'kata' | 'gallery';

/** Surface pattern drawn on panels (and faintly on the page behind them). */
export type Tex =
  | 'grain' | 'smooth' | 'blinds' | 'mesh' | 'dots' | 'mottle' | 'halftone' | 'scan' | 'stripes' | 'damask' | 'chalk' | 'weave'
  | 'hatch' | 'frost' | 'blueprint' | 'rings' | 'diamonds' | 'fans' | 'brick' | 'stars' | 'ruled' | 'bubbles' | 'rays' | 'ink'
  | 'pinstripe' | 'checker' | 'embers' | 'strata' | 'hex' | 'scales' | 'waves';

/** Shape of the label plates, tab pills and tape strips. */
export type Label = 'plate' | 'notch' | 'ribbon' | 'pill' | 'rect' | 'chevron' | 'slash' | 'jag' | 'hex' | 'arrow' | 'bookmark';

/** Fill style of win-rate and share bars. */
export type Bar = 'solid' | 'seg' | 'stripe' | 'dots' | 'glow' | 'scale' | 'redact' | 'tally' | 'ink' | 'stitch' | 'chalk';

/** Rule that runs out from every section heading. */
export type Rule = 'line' | 'dots' | 'double' | 'zig' | 'wave' | 'dash' | 'stitch' | 'ticks' | 'stripe';

/** Ambient effect drifting behind the page. */
export type Fx = 'none' | 'embers' | 'snow' | 'sparks' | 'stars' | 'rain' | 'dust' | 'fog' | 'leaves' | 'confetti' | 'bubbles' | 'glitter' | 'bats' | 'ash' | 'petals';

/** What a hero's card does under the pointer. */
export type Hover =
  | 'lift' | 'tilt' | 'shake' | 'float' | 'squish' | 'slash' | 'zap' | 'dive' | 'slither' | 'chill' | 'burn' | 'flip' | 'spin'
  | 'pop' | 'stomp' | 'glitch' | 'sway' | 'flicker' | 'bounce' | 'wobble' | 'peek' | 'swing' | 'rise' | 'swoop' | 'fade';

/** Shape of the stat tiles ("tickets") on the player dossier. */
export type Tile = 'ticket' | 'slab' | 'tag' | 'pill' | 'stamp' | 'card' | 'plate' | 'chip';

/** How the page header is composed. */
export type Head = 'left' | 'center' | 'poster';

export interface SkinCopy {
  /** Small label over a hero's name. */
  kicker: string;
  /** Small label over a player's name when this hero is their most played. */
  dossier: string;
  /** Heading of the win-rate-over-time chart. */
  trend: string;
  /** Heading of the builds board. */
  builds: string;
  /** Heading of the matchups grid. */
  matchups: string;
  /** Heading of the match list. */
  matches: string;
}

export interface HeroSkin {
  slug: string;
  /** A one-line note on what the look is drawn from, shown in the style picker's tooltip. */
  concept: string;
  mode: 'dark' | 'light';
  /** Deepest page colour (a paper tone for light skins). */
  bg: string;
  accent: string;
  /** Brighter accent used for text on the page's surfaces. */
  accent2: string;
  /** A third colour for tags, highlights and ambient effects. */
  hi?: string;
  /** Body text tone; derived from the accent when omitted. */
  ink?: string;
  font: FontKey;
  frame: Frame;
  tex: Tex;
  label: Label;
  bar: Bar;
  rule: Rule;
  /** Ornament glyph in front of each section heading. */
  orn: string;
  fx: Fx;
  hover: Hover;
  tile: Tile;
  head?: Head;
  /** Film grain over the whole page, 0 to 0.1. Only the grainy skins use it. */
  grain?: number;
  /** Strength of the hero's key art behind the page, 0 to 1. */
  art?: number;
  /** Keep the site theme's own palette and background (Holliday). */
  inherit?: boolean;
  copy?: Partial<SkinCopy>;
}

export const DEFAULT_COPY: SkinCopy = {
  kicker: 'Hero dossier',
  dossier: 'Player dossier',
  trend: 'Win rate over time',
  builds: 'Top builds',
  matchups: 'Know your matchups',
  matches: 'Recent matches',
};
