import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HEROES, type Hero } from '../data/roster';
import { getWordmark } from '../data/names';
import { getHeroColor } from '../data/heroColors';
import type { TierRow } from '../data/tiers';
import { fmtPct } from '../lib/stats';

const POOL: Hero[] = HEROES.filter((h) => h.portrait && !h.unreleased);

/** Three different heroes, drawn at random. */
function deal(): Hero[] {
  const b = [...POOL];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b.slice(0, 3);
}

/**
 * Front-page trial (not shipped): three random hero cards fanned under a spotlight beam, the middle one forward, each
 * with its win rate under it. Every visit deals a new hand; "Deal again" draws another. Cards link to hero pages.
 */
export default function CardFan({ rows }: { rows: TierRow[] | null }) {
  const [hand, setHand] = useState(deal);
  const [n, setN] = useState(0);
  const rate = (slug: string) => rows?.find((r) => r.slug === slug)?.winRate;
  // left, centre, right: the centre card is dealt last so it lands on top
  const order = [hand[1], hand[0], hand[2]];
  return (
    <div className="fan-stage">
      <div className="fan-beam" aria-hidden="true" />
      <div className="fan" key={n} aria-label="Three random heroes">
        {order.map((h, i) => {
          const wm = getWordmark(h.slug);
          const wr = rate(h.slug);
          const pos = ['l', 'c', 'r'][i];
          return (
            <Link key={h.slug} to={`/hero/${h.slug}`} className={`fan-card fan-${pos}`} style={{ ['--hc' as string]: getHeroColor(h.slug) } as React.CSSProperties}>
              {pos === 'c' && <span className="fan-tape">Tonight's draw</span>}
              <span className="fan-frame">
                <img className="fan-pic" src={h.portrait} alt="" />
                {wm ? <img className="fan-wm" src={wm} alt={h.name} /> : <b className="fan-name">{h.name}</b>}
              </span>
              {wr !== undefined && <span className="fan-wr">{fmtPct(wr)}</span>}
            </Link>
          );
        })}
      </div>
      <button type="button" className="fan-again" onClick={() => { setHand(deal()); setN((x) => x + 1); }}>Deal again</button>
    </div>
  );
}
