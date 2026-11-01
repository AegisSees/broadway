import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getHero, shortName } from '../data/roster';
import { useModel } from '../ml/models';
import { heroIdOf, matchupsOf, type Matchup } from '../ml/predict';
import { HeroFace } from './HeroFace';
import { fmtInt } from '../lib/stats';

const N = 5;
const pts = (d: number) => `${d >= 0 ? '+' : '\u2212'}${Math.abs(d).toFixed(1)}`;

/**
 * The matchups model: how this hero does into each enemy in top-bracket games, shrunk toward all ranks where the top
 * games are few. Round 59 (V): one two-sided bar graph instead of two lopsided columns. Each enemy is a row, the bar
 * runs right from the centre line when the hero does better than its own average into them, left when worse.
 */
export default function TopMatchups({ slug, name }: { slug: string; name: string }) {
  const model = useModel('matchups');
  const list = useMemo(() => { const id = heroIdOf(slug); return model && id !== undefined ? matchupsOf(model, id) : []; }, [model, slug]);
  if (list.length < 4) return null;
  const best = list.filter((m) => m.delta > 0).slice(0, N);
  const worst = list.filter((m) => m.delta < 0).reverse().slice(0, N).reverse();
  const rows: Matchup[] = [...best, ...worst];
  const max = Math.max(...rows.map((m) => Math.abs(m.delta)), 1);
  return (
    <div className="ml-topmu">
      <p className="muted ml-topmu-h">How {name} fares at the top, in top-bracket games. <Link to={`/draft?hk=${slug}`}>Try a draft with {name} {'\u2192'}</Link></p>
      <section className="panel pad dvg" aria-label={`${name} at the top, by enemy hero`}>
        <header className="dvg-head">
          <h3>{name} at the top</h3>
          <p className="muted">Top-10% games (Phantom and up). Win-rate points against {name}{'\u2019'}s own average, by enemy hero.</p>
          <div className="dvg-axis" aria-hidden="true"><span className="bad">Struggles into</span><span className="good">Beats</span></div>
        </header>
        <ol className="dvg-rows">
          {rows.map((m) => {
            const h = getHero(m.slug);
            const up = m.delta >= 0;
            return (
              <li key={m.hero} className={up ? 'dvg-up' : 'dvg-down'}>
                <span className="dvg-who">{h ? <HeroFace hero={h} /> : null}<span><b>{h ? shortName(h) : `Hero ${m.hero}`}</b><small>{fmtInt(m.games)} matches</small></span></span>
                <span className="dvg-track" aria-hidden="true"><i style={{ width: `${(Math.abs(m.delta) / max) * 50}%` }} /></span>
                <b className={`dvg-n ${up ? 'good' : 'bad'}`}>{pts(m.delta)} pts</b>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
