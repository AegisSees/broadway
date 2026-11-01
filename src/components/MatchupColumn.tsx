import { Link } from 'react-router-dom';
import { getHero } from '../data/roster';
import type { MatchupGroup } from '../data/types';
import { fmtInt } from '../lib/stats';
import { HeroFace } from './HeroFace';
/** One matchup list: a hero-specific title over the ranked rows (Round 63, V: no badge, no subtitle). */
export default function MatchupColumn({ group, heroName }: { group: MatchupGroup; heroName: string; heroSlug?: string }) {
  const fill = (s: string) => s.replace('{hero}', heroName);
  return (
    <section className="panel mu" aria-label={fill(group.title)}>
      <header><h3>{fill(group.title)}</h3></header>
      <ol>
        {group.entries.map((e) => {
          const hero = getHero(e.slug);
          return (
            <li key={e.slug}>
              {hero ? <Link to={`/hero/${e.slug}`} aria-label={e.name}><HeroFace hero={hero} /></Link> : <span className="face" aria-hidden="true">{e.name[0]}</span>}
              <div className="main">
                <div className="top"><Link to={`/hero/${e.slug}`}>{e.name}</Link><em className={group.tone}>{e.display}</em></div>
                <div className="bar" aria-hidden="true"><i className={group.tone} style={{ width: `${Math.round(e.fill * 100)}%` }} /></div>
                <small>{fmtInt(e.matches)} matches</small>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
