import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HEROES, type Hero } from '../data/roster';
import { getWordmark } from '../data/names';
import { getHeroColor, useHeroColor } from '../data/heroColors';
import { NEWCOMERS, isOut } from '../data/newHeroes';

const CYCLE_MS = 5500;
/** The newest hero opens the spotlight and stays a little longer before the rotation starts. */
const FIRST_MS = 9000;
const POOL: Hero[] = HEROES.filter((h) => h.art || h.render);

/** The newest City Never Sleeps hero that is out leads, then everyone else in an order shuffled once per visit. */
function openingOrder(): Hero[] {
  const now = Date.now();
  const newest = [...NEWCOMERS].reverse().find((n) => isOut(n.slug, now));
  const lead = POOL.find((h) => h.slug === newest?.slug);
  const rest = shuffled(POOL.filter((h) => h !== lead));
  return lead ? [lead, ...rest] : rest;
}

/** Shuffle once per visit, then step through everyone in that order. */
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
  const [order] = useState(openingOrder);
  const [moved, setMoved] = useState(false);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  // the card that just left the front, kept for a moment so it can be thrown off the deck
  const [gone, setGone] = useState<{ h: Hero; back: boolean; n: number } | null>(null);
  const goneTimer = useRef<number>();
  const shown = useRef(0);
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const go = useCallback((to: number) => {
    const cur = shown.current;
    const next = (to + order.length) % order.length;
    if (next === cur) return;
    shown.current = next;
    setI(next);
    setGone((g) => ({ h: order[cur], back: to < cur, n: (g?.n ?? 0) + 1 }));
    window.clearTimeout(goneTimer.current);
    goneTimer.current = window.setTimeout(() => setGone(null), 650);
  }, [order]);
  useEffect(() => () => window.clearTimeout(goneTimer.current), []);

  useEffect(() => {
    if (paused || reduce) return;
    const t = window.setTimeout(() => { setMoved(true); go(i + 1); }, moved ? CYCLE_MS : FIRST_MS);
    return () => window.clearTimeout(t);
  }, [i, paused, reduce, go, moved]);

  // the art is the whole card: no caption over it, the name sits in the link along the bottom
  const slide = (h: Hero, state: 'in' | 'out') => (
    <div className={`spot-slide ${state}`} key={h.slug} aria-hidden={state === 'out'} style={{ ['--hc' as string]: getHeroColor(h.slug) } as React.CSSProperties}>
      <img className="art" src={(h.art ?? h.render) as string} alt="" />
    </div>
  );

  const cur = order[i];
  useHeroColor(cur.slug); // re-render when the live colours arrive
  // the next two heroes wait as cards stacked behind the big one; the front card is dealt from that pile
  const back = [1, 2].map((k) => order[(i + k) % order.length]);
  return (
    <div className="spot-deck">
    {back.slice().reverse().map((h, n) => {
      const depth = 2 - n;
      const wm = getWordmark(h.slug);
      return (
        <button type="button" key={h.slug} className={`spot-back d${depth}`} tabIndex={-1} aria-hidden="true"
          onClick={() => { setMoved(true); go(i + depth); }} style={{ ['--hc' as string]: getHeroColor(h.slug) } as React.CSSProperties}>
          <img src={(h.art ?? h.render) as string} alt="" />
          {wm && <img className="wm" src={wm} alt="" />}
        </button>
      );
    })}
    {gone && (
      <div key={`gone-${gone.n}`} className={`spot-gone${gone.back ? ' back' : ''}`} aria-hidden="true">
        {slide(gone.h, 'out')}
      </div>
    )}
    <div
      key={cur.slug} className={`spot${gone ? ' dealt' : ''}`} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} aria-roledescription="carousel" aria-label="Heroes in the spotlight"
    >
      {slide(cur, 'in')}
      <Link to={`/hero/${cur.slug}`} className="spot-link" aria-label={`Open ${cur.name}`}><span className="go">{cur.name}<span className="go-more"> {'·'} open hero page</span> {'✦'}</span></Link>
      <div className="spot-ctl">
        <button type="button" onClick={() => { setMoved(true); go(i - 1); }} aria-label="Previous hero">{'‹'}</button>
        <span className="count" aria-live="off">{String(i + 1).padStart(2, '0')}<i> / {order.length}</i></span>
        <button type="button" onClick={() => { setMoved(true); go(i + 1); }} aria-label="Next hero">{'›'}</button>
      </div>
      <div className="spot-bar" aria-hidden="true"><span key={`${i}-${paused}`} className={paused || reduce ? 'still' : 'run'} style={{ animationDuration: `${moved ? CYCLE_MS : FIRST_MS}ms` }} /></div>
    </div>
    </div>
  );
}
