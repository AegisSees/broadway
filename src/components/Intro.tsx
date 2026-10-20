import { useEffect, useState } from 'react';
import outer from '../assets/logo/outer.svg?raw';
import inner from '../assets/logo/inner-noeye.svg?raw';

const KEY = 'broadway-intro';
const HOLD_MS = 3000;
const LIFT_MS = 950;

/** Whether the opening should play: once per browser session, never under reduced motion. */
function shouldPlay() {
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
    return !sessionStorage.getItem(KEY);
  } catch {
    return false;
  }
}

/** A small seeded random, so the shapes are the same on every visit. */
function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const pt = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
};

/** `n` spokes between two radii (every `major`th one reaching further in), as one SVG path centred on 0,0. */
function ticks(n: number, r1: number, r2: number, major = 0, rMajor = r1): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 360;
    d += `M${pt(major && i % major === 0 ? rMajor : r1, a)}L${pt(r2, a)}`;
  }
  return d;
}

/** The sigil the first opening throws out: eight long diamond blades and sixteen fine rays between a ringed hub and a ticked rim. */
function sigil() {
  let blades = '';
  let rays = '';
  for (let i = 0; i < 8; i++) {
    const a = i * 45; const w = i % 2 ? 3.2 : 4.6; const tip = i % 2 ? 74 : 88;
    blades += `M${pt(27, a)}L${pt(tip * 0.62, a - w)}L${pt(tip, a)}L${pt(tip * 0.62, a + w)}Z`;
  }
  for (let i = 0; i < 24; i++) if (i % 3) rays += `M${pt(31, i * 15)}L${pt(77, i * 15)}`;
  return { blades, rays, rim: ticks(120, 88.5, 91.5, 10, 85), far: ticks(72, 95, 98, 6, 93) };
}

/** Towers standing outward all round the eye, each a stack of setbacks with a few lit windows, like the city seen from straight above. */
function skyline(): { d: string; win: string; a: number }[] {
  const r = rng(7);
  return Array.from({ length: 48 }, (_, i) => {
    const w = 5 + r() * 7; const h = 34 + r() * 58; const step = 0.55 + r() * 0.3;
    const top = -(18 + h); const mid = -(18 + h * step);
    const d = `M${-w / 2},-18V${mid}H${-w / 3}V${top}H${w / 3}V${mid}H${w / 2}V-18Z` + (r() > 0.6 ? `M-0.6,${top}V${top - 8}H0.6V${top}Z` : '');
    let win = '';
    for (let y = -22; y > top + 3; y -= 3.4) {
      const half = y > mid ? w / 2 : w / 3;
      for (let x = -half + 1.2; x < half - 1.6; x += 2.2) if (r() > 0.72) win += `M${x.toFixed(1)},${y.toFixed(1)}h1v-1.5h-1Z`;
    }
    return { d, win, a: (i / 48) * 360 + (r() - 0.5) * 4 };
  });
}

const SIGIL = sigil();
const TOWERS = skyline();
const ORBITS = [0, 120, 240];
const STARS = [0, 60, 120, 180, 240, 300];
const RITUAL_TICKS = ticks(72, 112, 117, 6, 109);
const CIRCLE = (r: number) => `M0,${-r}A${r},${r} 0 1 1 0,${r}A${r},${r} 0 1 1 0,${-r}`;
const CHANT = 'THE CITY NEVER SLEEPS \u2726 THE PATRONS ARE WATCHING \u2726 BROADWAY \u2726 A DEADLOCK COMPANION \u2726 ';

/** The summoning circle's lines. Drawn twice: once wide and faint as its glow, once sharp on top. */
function RitualLines({ glow }: { glow?: boolean }) {
  return (
    <g className={glow ? 'op-rlines glow' : 'op-rlines'}>
      <circle className="op-ring big" r="118" pathLength={100} />
      <circle className="op-ring" r="84" pathLength={100} />
      <g className="op-hexagram">
        <path className="op-hex" pathLength={100} d="M0,-84L72.7,42L-72.7,42Z" />
        <path className="op-hex" pathLength={100} d="M0,84L-72.7,-42L72.7,-42Z" />
      </g>
    </g>
  );
}

/**
 * The opening on the home page, after the game's matchmaking eye: the Deadlock emblem blinks on a forest-black screen,
 * then opens three times, each time throwing something out behind it (a fine sigil of blades and rays, the city's
 * towers with their windows lit, and last a teal summoning circle that draws itself and spins), before the view dives
 * into the pupil and the page comes up through the dark. Any click, key, wheel or swipe skips straight to the dive.
 */
export default function Intro() {
  const [phase, setPhase] = useState<'show' | 'lift' | 'skip' | 'done'>(() => (shouldPlay() ? 'show' : 'done'));

  // marked as seen once it has mounted (not while choosing the first state, which may run twice in development)
  useEffect(() => { try { sessionStorage.setItem(KEY, '1'); } catch { /* storage blocked: it simply plays again */ } }, []);

  useEffect(() => {
    if (phase === 'done') return;
    if (phase === 'show') {
      const skip = () => setPhase('skip');
      const t = window.setTimeout(() => setPhase('lift'), HOLD_MS);
      window.addEventListener('keydown', skip); window.addEventListener('wheel', skip, { passive: true }); window.addEventListener('touchmove', skip, { passive: true });
      return () => { window.clearTimeout(t); window.removeEventListener('keydown', skip); window.removeEventListener('wheel', skip); window.removeEventListener('touchmove', skip); };
    }
    const t = window.setTimeout(() => setPhase('done'), LIFT_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase === 'done') return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = prev; };
  }, [phase]);

  if (phase === 'done') return null;
  return (
    <div className={`opening${phase === 'show' ? '' : phase === 'skip' ? ' lift skip' : ' lift'}`} onClick={() => setPhase((p) => (p === 'show' ? 'skip' : p))} aria-hidden="true">
      <span className="op-glow" />
      <svg className="op-sigil far" viewBox="-100 -100 200 200">
        <circle r="99" /><circle r="91" className="dots" /><path d={SIGIL.far} />
      </svg>
      <svg className="op-sigil" viewBox="-100 -100 200 200">
        <circle r="96" /><circle r="92" /><path className="rim" d={SIGIL.rim} />
        <circle r="80" className="dots" /><path className="rays" d={SIGIL.rays} /><path className="blades" d={SIGIL.blades} />
        <circle r="31" /><circle r="27" className="fine" />
      </svg>
      <svg className="op-city" viewBox="-110 -110 220 220">
        <circle className="ground" r="18" />
        {TOWERS.map((t, i) => (
          <g key={i} transform={`rotate(${t.a.toFixed(1)})`}><path d={t.d} /><path className="lit" d={t.win} /></g>
        ))}
      </svg>
      <svg className="op-ritual" viewBox="-130 -130 260 260">
        <defs><path id="op-chant" d={CIRCLE(100)} /></defs>
        <RitualLines glow />
        <path className="op-rticks" d={RITUAL_TICKS} />
        <circle className="op-ring fine" r="112" />
        <text className="op-chant"><textPath href="#op-chant" textLength={626} lengthAdjust="spacing">{CHANT}</textPath></text>
        <circle className="op-ring fine" r="92" />
        <RitualLines />
        <g className="op-studs">{STARS.map((a) => <circle key={a} r="2.6" transform={`rotate(${a}) translate(0 -84)`} />)}</g>
        <circle className="op-ring dash" r="40" />
        {ORBITS.map((a) => (
          <g key={a} transform={`rotate(${a}) translate(0 -58)`}>
            <g className="op-orbit"><circle r="17" /><circle r="12.5" className="fine" /><circle r="2.4" className="dot" /></g>
          </g>
        ))}
      </svg>
      <div className="op-emblem">
        <span className="op-logo" dangerouslySetInnerHTML={{ __html: outer }} />
        <span className="op-logo" dangerouslySetInnerHTML={{ __html: inner }} />
        <span className="op-lid">
          <svg viewBox="-50 -50 100 100">
            <path className="op-almond" d="M-44,0Q0,-38 44,0Q0,38 -44,0Z" />
            <circle className="op-pupil ring" r="11" />
            <path className="op-pupil star" d="M0,-15L3.6,-3.6L15,0L3.6,3.6L0,15L-3.6,3.6L-15,0L-3.6,-3.6Z" />
          </svg>
        </span>
      </div>
      <div className="op-caption"><b>BROADWAY</b><span>A Deadlock companion</span></div>
      <span className="opening-skip">Click to skip</span>
    </div>
  );
}
