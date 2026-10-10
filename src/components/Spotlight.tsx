import Kicker from './Kicker';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HEROES, type Hero } from '../data/roster';
import { getWordmark } from '../data/names';
import HeroTags from './HeroTags';
import { getHeroColor, useHeroColor } from '../data/heroColors';

const CYCLE_MS = 5500;
/** Renders that are a full rectangle rather than a cut-out are cropped to fill the card around the character. */
const FILL: Record<string, string> = {};
const POOL: Hero[] = HEROES.filter((h) => h.art || h.render);

/** Shuffle once per visit so the first hero differs, then step through everyone in that order. */
function shuffled<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

/**
 * "In the spotlight": every hero in turn, with the name shown as the hero's own wordmark. Rotates by itself,
 * pauses while hovered or focused, and does not auto-rotate for people who prefer reduced motion.
 */
export default function Spotlight() {
  const [order] = useState(() => shuffled(POOL));
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const clear = useRef<number>();
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const go = useCallback((to: number) => {
    setI((cur) => {
      const next = (to + order.length) % order.length;
      if (next === cur) return cur;
      setPrev(cur);
      window.clearTimeout(clear.current);
      clear.current = window.setTimeout(() => setPrev(null), 700);
      return next;
    });
  }, [order.length]);

  useEffect(() => {
    if (paused || reduce) return;
    const t = window.setInterval(() => go(i + 1), CYCLE_MS);
    return () => window.clearInterval(t);
  }, [i, paused, reduce, go]);
  useEffect(() => () => window.clearTimeout(clear.current), []);

  const slide = (h: Hero, state: 'in' | 'out') => {
    const wm = getWordmark(h.slug);
    return (
      <div className={`spot-slide ${state}`} key={h.slug} aria-hidden={state === 'out'} style={{ ['--hc' as string]: getHeroColor(h.slug) } as React.CSSProperties}>
        {!h.art && <img className="artbg" src={h.render as string} alt="" aria-hidden="true" />}
        <img className={`art${FILL[h.slug] ? ' fill' : ''}`} src={(h.art ?? h.render) as string} alt="" style={FILL[h.slug] ? { objectPosition: FILL[h.slug] } : undefined} />
        <div className="cap">
          <Kicker>In the spotlight</Kicker>
          {wm ? <img className="wm" src={wm} alt="" /> : <h2>{h.name}</h2>}
          <HeroTags slug={h.slug} />
        </div>
      </div>
    );
  };

  const cur = order[i];
  useHeroColor(cur.slug); // re-render when the live colours arrive
  return (
    <div
      className="spot" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} aria-roledescription="carousel" aria-label="Heroes in the spotlight"
    >
      {prev !== null && slide(order[prev], 'out')}
      {slide(cur, 'in')}
      <Link to={`/hero/${cur.slug}`} className="spot-link" aria-label={`Open ${cur.name}`}><span className="go">Open hero page {'✦'}</span></Link>
      <div className="spot-ctl">
        <button type="button" onClick={() => go(i - 1)} aria-label="Previous hero">{'‹'}</button>
        <span className="count" aria-live="off">{String(i + 1).padStart(2, '0')}<i> / {order.length}</i></span>
        <button type="button" onClick={() => go(i + 1)} aria-label="Next hero">{'›'}</button>
      </div>
      <div className="spot-bar" aria-hidden="true"><span key={`${i}-${paused}`} className={paused || reduce ? 'still' : 'run'} style={{ animationDuration: `${CYCLE_MS}ms` }} /></div>
    </div>
  );
}
