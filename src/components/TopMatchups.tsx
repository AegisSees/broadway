import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getHero } from '../data/roster';
import type { MatchupGroup } from '../data/types';
import { useModel } from '../ml/models';
import { heroIdOf, matchupsOf, type Matchup } from '../ml/predict';
import MatchupColumn from './MatchupColumn';

const N = 5;

function group(key: 'best' | 'worst', list: Matchup[]): MatchupGroup {
  const max = Math.max(...list.map((m) => Math.abs(m.delta)), 1);
  return {
    key,
    title: key === 'best' ? '{hero} beats, at the top' : '{hero} struggles into, at the top',
    subtitle: 'Top-10% games (Phantom and up), win-rate points against {hero}’s own average',
    tone: key === 'best' ? 'good' : 'bad',
    entries: list.map((m) => ({
      slug: m.slug ?? '', name: getHero(m.slug)?.name ?? `Hero ${m.hero}`,
      display: `${m.delta >= 0 ? '+' : '−'}${Math.abs(m.delta).toFixed(1)} pts`, fill: Math.abs(m.delta) / max, matches: m.games,
    })),
  };
}

/**
 * The matchups model: how this hero does into each enemy in top-bracket games, shrunk toward all ranks where the top
 * games are few. Sits under the all-ranks matchups from the API, so the two can be read side by side.
 */
export default function TopMatchups({ slug, name }: { slug: string; name: string }) {
  const model = useModel('matchups');
  const list = useMemo(() => { const id = heroIdOf(slug); return model && id !== undefined ? matchupsOf(model, id) : []; }, [model, slug]);
  if (list.length < 4) return null;
  const best = list.filter((m) => m.delta > 0).slice(0, N);
  const worst = list.filter((m) => m.delta < 0).reverse().slice(0, N);
  const groups = [best.length ? group('best', best) : null, worst.length ? group('worst', worst) : null].filter((g): g is MatchupGroup => !!g);
  return (
    <div className="ml-topmu">
      <p className="muted ml-topmu-h">How {name} fares at the top, in top-bracket games. <Link to={`/draft?hk=${slug}`}>Try a draft with {name} {'→'}</Link></p>
      <div className="mugrid" data-n={groups.length}>{groups.map((g) => <MatchupColumn key={g.key} group={g} heroName={name} heroSlug="" />)}</div>
    </div>
  );
}
