import { useEffect, useState } from 'react';
import outer from '../assets/logo/outer.svg?raw';
import inner from '../assets/logo/inner-noeye.svg?raw';

const KEY = 'broadway-intro';
const HOLD_MS = 2900;
const LIFT_MS = 520;

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

/** A jagged star of `n` points between two radii, as an SVG path centred on 0,0. */
function starburst(n: number, r1: number, r2: number, seed: number): string {
  const r = rng(seed);
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 + (r() - 0.5) * 0.12;
    const rad = (i % 2 ? r1 : r2) * (0.9 + r() * 0.2);
    pts.push(`${(Math.cos(a) * rad).toFixed(1)},${(Math.sin(a) * rad).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** Towers standing outward all round the eye, each a stack of setbacks, like the city seen from straight above. */
function skyline(): { d: string; a: number }[] {
  const r = rng(7);
  return Array.from({ length: 44 }, (_, i) => {
    const w = 5 + r() * 7; const h = 34 + r() * 58; const step = 0.55 + r() * 0.3;
    const top = -(18 + h); const mid = -(18 + h * step);
    const d = `M${-w / 2},-18V${mid}H${-w / 3}V${top}H${w / 3}V${mid}H${w / 2}V-18Z` + (r() > 0.6 ? `M-0.6,${top}V${top - 8}H0.6V${top}Z` : '');
    return { d, a: (i / 44) * 360 + (r() - 0.5) * 4 };
  });
}

const BURST_IN = starburst(13, 74, 100, 3);
const BURST_OUT = starburst(17, 86, 100, 11);
const TOWERS = skyline();
const ORBITS = [-90, 30, 150];

/**
 * The opening on the home page, after the game's matchmaking eye: the Deadlock emblem blinks on a dark screen, then
 * opens three times, each time throwing something out behind it (a green starburst, the city's towers, and last a
 * teal summoning circle) before the whole thing rushes forward and the page comes through. Any click, key, wheel or
 * swipe skips it.
 */
export default function Intro() {
  const [phase, setPhase] = useState<'show' | 'lift' | 'done'>(() => (shouldPlay() ? 'show' : 'done'));

  // marked as seen once it has mounted (not while choosing the first state, which may run twice in development)
  useEffect(() => { try { sessionStorage.setItem(KEY, '1'); } catch { /* storage blocked: it simply plays again */ } }, []);

  useEffect(() => {
    if (phase === 'done') return;
    if (phase === 'show') {
      const skip = () => setPhase('lift');
      const t = window.setTimeout(skip, HOLD_MS);
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
    <div className={`opening${phase === 'lift' ? ' lift' : ''}`} onClick={() => setPhase('lift')} aria-hidden="true">
      <svg className="op-burst out" viewBox="-100 -100 200 200"><path d={BURST_OUT} /></svg>
      <svg className="op-burst in" viewBox="-100 -100 200 200"><path d={BURST_IN} /></svg>
      <svg className="op-city" viewBox="-110 -110 220 220">{TOWERS.map((t, i) => <path key={i} d={t.d} transform={`rotate(${t.a.toFixed(1)})`} />)}</svg>
      <svg className="op-ritual" viewBox="-130 -130 260 260">
        <circle className="op-ring big" r="118" pathLength={100} />
        <circle className="op-ring" r="84" pathLength={100} />
        <path className="op-hex" pathLength={100} d="M0,-84L72.7,42L-72.7,42Z" />
        <path className="op-hex" pathLength={100} d="M0,84L-72.7,-42L72.7,-42Z" />
        {ORBITS.map((a) => (
          <g key={a} className="op-orbit" transform={`rotate(${a}) translate(58 0)`}>
            <circle r="20" pathLength={100} /><circle r="15" pathLength={100} />
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
