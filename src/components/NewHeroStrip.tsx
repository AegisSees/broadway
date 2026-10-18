import { Link } from 'react-router-dom';
import { getHero } from '../data/roster';
import { getWordmark } from '../data/names';
import { NEWCOMERS, isOut, nextUnlock, releaseDay } from '../data/newHeroes';

/** A slim banner over the home header: the newest City Never Sleeps hero and the next unlock date, from the clock. */
export default function NewHeroStrip() {
  const now = Date.now();
  const latest = [...NEWCOMERS].reverse().find((n) => isOut(n.slug, now));
  if (!latest) return null;
  const h = getHero(latest.slug);
  const mark = getWordmark(latest.slug);
  const next = nextUnlock(now);
  return (
    <Link to={`/hero/${latest.slug}`} className="nh-strip">
      {h?.portrait && <img className="nh-face" src={h.portrait} alt="" />}
      <span className="nh-txt">
        <small>New hero {'·'} out {releaseDay(latest)}</small>
        {mark ? <img className="nh-mark" src={mark} alt={h?.name ?? latest.slug} /> : <b>{h?.name}</b>}
      </span>
      <span className="tape orange">Meet the hero {'→'}</span>
      {next && <small className="nh-next">Next hero {releaseDay(next)}</small>}
    </Link>
  );
}
