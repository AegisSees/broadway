import { Link } from 'react-router-dom';
import { getWordmark } from '../data/names';
import { NEWCOMERS, nextUnlock, releaseDay, releaseWeekday } from '../data/newHeroes';
import { getHero } from '../data/roster';
import SectionHeading from './SectionHeading';

const Lock = () => (
  <svg className="lock" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3h1.5A1.5 1.5 0 0 1 20 11.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 20.5v-9A1.5 1.5 0 0 1 5.5 10Zm2.5 0h5V7a2.5 2.5 0 0 0-5 0Zm2.5 4.5a1.8 1.8 0 0 0-.9 3.4V20h1.8v-2.1a1.8 1.8 0 0 0-.9-3.4Z" /></svg>
);

/**
 * The six heroes of the City Never Sleeps update as pinned photo prints, like the hero row on the official update page:
 * a black "Unlocked" label on each hero already out, a padlock on the one still to come, and an orange "Meet the hero"
 * label that appears on hover, or stays on the print for the page you are reading.
 */
export default function Newcomers({ current }: { current: string }) {
  const now = Date.now();
  const next = nextUnlock(now);
  return (
    <section className="newcomers" aria-label="The six City Never Sleeps heroes">
      <SectionHeading id="newcomers" title="The six newcomers" />
      <p className="muted newcomers-lead">
        The City Never Sleeps update brings six heroes, unlocking on Tuesdays and Fridays at 2 PM Pacific.
        {next && <> {getHero(next.slug)?.name} is next, on {releaseWeekday(next)}.</>}
      </p>
      <ol className="pols">
        {NEWCOMERS.map((n) => {
          const hero = getHero(n.slug);
          if (!hero) return null;
          const out = Date.parse(n.at) <= now;
          const wm = getWordmark(n.slug);
          const here = n.slug === current;
          return (
            <li key={n.slug} className={here ? 'cur' : ''}>
              <Link to={`/hero/${n.slug}`} className={`pol${out ? '' : ' locked'}`} aria-current={here ? 'page' : undefined} aria-label={`${hero.name}, ${out ? `unlocked ${releaseDay(n)}` : `unlocks ${releaseWeekday(n)}`}`}>
                <span className="mat">{hero.portrait ? <img src={hero.portrait} alt="" loading="lazy" /> : <span className="init" aria-hidden="true">{hero.name[0]}</span>}</span>
                {wm ? <img className="wm" src={wm} alt="" loading="lazy" /> : <span className="wm-text">{hero.name}</span>}
                {out ? <span className="utag">Unlocked</span> : <Lock />}
                <span className="meet">{here ? 'You are here' : <>Meet the hero {'→'}</>}</span>
                <small className="when">{out ? `Out ${releaseDay(n)}` : `Unlocks ${releaseWeekday(n)}`}</small>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
