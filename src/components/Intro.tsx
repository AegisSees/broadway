import { useEffect, useState } from 'react';
import skyline from '../assets/city/skyline-yellow.webp';

const KEY = 'broadway-intro';
const HOLD_MS = 2100;
const LIFT_MS = 750;

/** Whether the opening title card should play: once per browser session, never under reduced motion. */
function shouldPlay() {
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
    return !sessionStorage.getItem(KEY);
  } catch {
    return false;
  }
}

/**
 * The opening title card on the home page, like the card before a 1940s picture: the rules draw out, the name
 * fades up over the skyline, then the whole card lifts away like a shutter. Any click, key or scroll skips it.
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
    <div className={`intro${phase === 'lift' ? ' lift' : ''}`} onClick={() => setPhase('lift')} aria-hidden="true">
      <img className="intro-sky" src={skyline} alt="" />
      <div className="intro-card">
        <span className="intro-rule" />
        <span className="intro-kicker">The city never sleeps</span>
        <b className="intro-name">{'BROADWAY'.split('').map((c, i) => <span key={i} style={{ ['--i' as string]: i } as React.CSSProperties}>{c}</span>)}</b>
        <span className="intro-tape">Deadlock companion</span>
        <span className="intro-rule" />
      </div>
      <span className="intro-skip">Click to skip</span>
    </div>
  );
}
