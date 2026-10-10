import { useId } from 'react';
import type { Tier } from '../data/types';

/**
 * Tier emblem. The palette runs down from Eternus (pearl white and ice teal, winged) to a cracked ember D.
 * The higher the tier, the more ornament: S+ is crested and fully winged, S has a smaller wing, A has blades,
 * B and C are plain, and D is cracked. Colours are fixed (not themed) so a tier reads the same in both themes.
 */
interface Look { hi: string; mid: string; lo: string; rim: string; ink: string; glow: string; wings: number; crest: boolean }

const LOOK: Record<Tier, Look> = {
  'S+': { hi: '#f6fffc', mid: '#9ce9d9', lo: '#2f908f', rim: '#d8fbf3', ink: '#072a2b', glow: '#8ff0dc', wings: 5, crest: true },
  S: { hi: '#c6f4ea', mid: '#6dd0bf', lo: '#27807f', rim: '#9fe9da', ink: '#062524', glow: '#5cd3c0', wings: 3, crest: false },
  A: { hi: '#d3e8fb', mid: '#7fb6e6', lo: '#30639a', rim: '#a9d0f4', ink: '#07213b', glow: '#6fb0ee', wings: 0, crest: false },
  B: { hi: '#d6dde8', mid: '#9fb0c4', lo: '#4e607a', rim: '#bac7d8', ink: '#0f1a2a', glow: '#9fb0c4', wings: 0, crest: false },
  C: { hi: '#b7bfca', mid: '#8591a1', lo: '#454f5d', rim: '#9aa5b4', ink: '#0e131a', glow: '#8591a1', wings: 0, crest: false },
  D: { hi: '#e6b0a5', mid: '#c4786c', lo: '#6c342e', rim: '#dc9a8e', ink: '#210c09', glow: '#c4786c', wings: 0, crest: false },
};


/**
 * Angel wing in the manner of the Eternus emblem: a bony arm along the top edge with rows of rounded feathers
 * hanging from it, longest at the wrist and shorter toward the body. Built for the left side (mirrored for the
 * right). Primaries sit behind, shorter coverts in front.
 */
const feather = (len: number, w: number) => `M0 0C${-w} ${-len * 0.25} ${-w * 0.8} ${-len * 0.75} 0 ${-len}C${w * 0.8} ${-len * 0.75} ${w} ${-len * 0.25} 0 0Z`;

/** S tier keeps the original small fan of three feathers per side. */
function FanWing({ side, fill, stroke }: { side: 'l' | 'r'; fill: string; stroke: string }) {
  const angles = [-52, -78, -104];
  const lens = [28, 30, 24];
  return (
    <g transform={side === 'r' ? 'translate(120 0) scale(-1 1)' : undefined}>
      {angles.map((a, i) => (
        <path key={a} d={feather(lens[i], 6.5)} transform={`translate(41 52) rotate(${a})`} fill={fill} stroke={stroke} strokeWidth="0.9" strokeLinejoin="round" />
      ))}
    </g>
  );
}

const arm = (t: number) => {
  const u = 1 - t; // quadratic curve: shoulder -> bend -> wrist
  return [u * u * 46 + 2 * u * t * 29 + t * t * 8, u * u * 50 + 2 * u * t * 24 + t * t * 19] as const;
};
const FEATHER = (cx: number, cy: number, deg: number) => `translate(${cx} ${cy}) rotate(${deg})`;

function WingArt({ fill, cover, stroke, n }: { fill: string; cover: string; stroke: string; n: number }) {
  const rows = Array.from({ length: n }, (_, i) => i / (n - 1)); // 0 = shoulder end, 1 = wrist end
  const feat = (t: number, len: number, w: number, sweep: number) => {
    const [x, y] = arm(t);
    const ang = 98 + sweep * t; // degrees clockwise from +x; ~100 = straight down, larger = swept outward
    const r = (ang * Math.PI) / 180;
    return { cx: x + Math.cos(r) * len * 0.5, cy: y + Math.sin(r) * len * 0.5, rx: w, ry: len * 0.5, deg: ang - 90 };
  };
  return (
    <g>
      {rows.map((t) => { const f = feat(t, 16 + 20 * t, 5.2, 60); return (
        <ellipse key={`p${t}`} rx={f.rx} ry={f.ry} transform={FEATHER(f.cx, f.cy, f.deg)} fill={fill} stroke={stroke} strokeWidth="0.8" />
      ); })}
      {rows.slice(0, -1).map((t) => { const f = feat(t + 0.05, 9 + 10 * t, 4.4, 60); return (
        <ellipse key={`c${t}`} rx={f.rx} ry={f.ry} transform={FEATHER(f.cx, f.cy, f.deg)} fill={cover} stroke={stroke} strokeWidth="0.7" />
      ); })}
      <path d={`M46 50Q29 24 8 19`} fill="none" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" />
    </g>
  );
}

function Wing({ side, kind, scale = 1, fill, cover, stroke }: { side: 'l' | 'r'; kind: 'upper' | 'lower'; scale?: number; fill: string; cover: string; stroke: string }) {
  const t = kind === 'upper'
    ? `translate(46 50) scale(${scale}) translate(-46 -50)`
    : `translate(46 58) rotate(-40) scale(${0.7 * scale}) translate(-46 -50)`;
  return (
    <g transform={side === 'r' ? 'translate(120 0) scale(-1 1)' : undefined}>
      <g transform={t}><WingArt fill={fill} cover={cover} stroke={stroke} n={kind === 'upper' ? 9 : 6} /></g>
    </g>
  );
}

/** Eternus-style crest: two folded wings standing upright behind the gem, tips almost touching. */
function Crest({ fill, stroke }: { fill: string; stroke: string }) {
  const left = 'M60 40C41 36 43 15 58 4C60 14 60.5 26 60 40Z';
  return (
    <g fill={fill} stroke={stroke} strokeWidth="0.9" strokeLinejoin="round">
      <path d={left} />
      <path d={left} transform="translate(120 0) scale(-1 1)" />
    </g>
  );
}

/** A-tier detail: a cut-gem face (four facets round an inner plate) with studs on the side points. */
function GemFacets({ rim, lo }: { rim: string; lo: string }) {
  const k = 0.72;
  const c = { x: 60, y: 52 };
  const o = [[60, 22], [84, 52], [60, 82], [36, 52]];
  const i = o.map(([x, y]) => [c.x + (x - c.x) * k, c.y + (y - c.y) * k]);
  const quad = (n: number) => { const a = o[n], b = o[(n + 1) % 4], bi = i[(n + 1) % 4], ai = i[n]; return `M${a[0]} ${a[1]}L${b[0]} ${b[1]}L${bi[0]} ${bi[1]}L${ai[0]} ${ai[1]}Z`; };
  const shade = [['#fff', 0.26], ['#000', 0.12], ['#000', 0.3], ['#fff', 0.08]] as const;
  return (
    <g>
      {shade.map(([f, op], n) => <path key={n} d={quad(n)} fill={f} opacity={op} />)}
      <path d={`M${i.map((p) => p.join(' ')).join('L')}Z`} fill="none" stroke={rim} strokeWidth="0.9" opacity="0.9" />
      <path d={`M${o.map((p) => p.join(' ')).join('L')}Z`} fill="none" stroke={rim} strokeWidth="0.6" opacity="0.5" />
      {[32, 88].map((x) => <circle key={x} cx={x} cy={52} r="2.7" fill={rim} stroke={lo} strokeWidth="1" />)}
      <circle cx="60" cy="18" r="2.2" fill={rim} stroke={lo} strokeWidth="0.8" />
      <circle cx="60" cy="86" r="2.2" fill={rim} stroke={lo} strokeWidth="0.8" />
    </g>
  );
}

/** Tier letter, engraved: a faint light edge sits under the dark letter. S+ is a big S with a small raised plus. */
function Glyph({ tier, ink, lift }: { tier: Tier; ink: string; lift: string }) {
  const font = { fontFamily: "Reaver, 'Times New Roman', serif", fontWeight: 700 } as const;
  const size = tier === 'A' ? 24 : 26;
  const base = tier === 'A' ? 60.5 : 61.4;
  const plus = tier === 'S+';
  const x = plus ? 55 : 60;
  return (
    <g textAnchor="middle" {...font}>
      <text x={x} y={base + 0.9} fontSize={size} fill={lift} opacity="0.45">{plus ? 'S' : tier}</text>
      <text x={x} y={base} fontSize={size} fill={ink}>{plus ? 'S' : tier}</text>
      {plus && (
        <>
          <text x="68.6" y="52.4" fontSize="15" fill={lift} opacity="0.45">+</text>
          <text x="68.6" y="51.5" fontSize="15" fill={ink}>+</text>
        </>
      )}
    </g>
  );
}

export default function TierBadge({ tier, size = 'md' }: { tier: Tier; size?: 'sm' | 'md' | 'lg' }) {
  const id = useId().replace(/:/g, '');
  const k = LOOK[tier];
  const cls = `tier-badge t-${tier.toLowerCase().replace('+', 'p')} ${size}`;
  return (
    <span className={cls} role="img" aria-label={`${tier} tier`} style={{ ['--tier-glow' as string]: k.glow } as React.CSSProperties}>
      <svg viewBox="0 0 120 100" aria-hidden="true">
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={k.hi} /><stop offset="0.5" stopColor={k.mid} /><stop offset="1" stopColor={k.lo} />
          </linearGradient>
          <linearGradient id={`w${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={k.hi} stopOpacity="0.95" /><stop offset="1" stopColor={k.mid} stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id={`v${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={k.hi} stopOpacity="1" /><stop offset="1" stopColor={k.mid} stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id={`s${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="0.5" stopColor="#fff" stopOpacity="0.75" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`c${id}`}><path d="M60 22 84 52 60 82 36 52Z" /></clipPath>
        </defs>

        {k.crest && <Crest fill={`url(#w${id})`} stroke={k.rim} />}
        {k.wings > 0 && (
          <g className="wings">
            {k.wings >= 5 && (<><Wing side="l" kind="lower" fill={`url(#w${id})`} cover={`url(#v${id})`} stroke={k.rim} /><Wing side="r" kind="lower" fill={`url(#w${id})`} cover={`url(#v${id})`} stroke={k.rim} /></>)}
            {k.wings >= 5 ? (<>
              <Wing side="l" kind="upper" fill={`url(#w${id})`} cover={`url(#v${id})`} stroke={k.rim} />
              <Wing side="r" kind="upper" fill={`url(#w${id})`} cover={`url(#v${id})`} stroke={k.rim} />
            </>) : (<>
              <FanWing side="l" fill={`url(#w${id})`} stroke={k.rim} />
              <FanWing side="r" fill={`url(#w${id})`} stroke={k.rim} />
            </>)}
          </g>
        )}

        {/* outer frame */}
        <path d="M60 18 88 52 60 86 32 52Z" fill={k.lo} stroke={k.rim} strokeWidth={tier === 'C' || tier === 'D' ? 1.4 : 2} strokeLinejoin="round" />
        {(tier === 'S+' || tier === 'S' || tier === 'A' || tier === 'B') && (
          <path d="M60 23 83 52 60 81 37 52Z" fill="none" stroke={k.rim} strokeWidth="0.8" opacity="0.7" />
        )}
        {/* face */}
        <path d="M60 22 84 52 60 82 36 52Z" fill={`url(#g${id})`} />
        {tier === 'A' && <GemFacets rim={k.rim} lo={k.lo} />}
        {tier === 'S+' && (
          <g clipPath={`url(#c${id})`}><g className="sheen"><rect x="-30" y="20" width="26" height="64" fill={`url(#s${id})`} transform="skewX(-14)" /></g></g>
        )}
        {tier === 'D' && <path d="M62 80 65 74 63 70.5 68 66" fill="none" stroke={k.ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />}
        <Glyph tier={tier} ink={k.ink} lift={k.hi} />
        {tier === 'S+' && <circle cx="60" cy="88" r="2.3" fill={k.hi} />}
      </svg>
    </span>
  );
}
