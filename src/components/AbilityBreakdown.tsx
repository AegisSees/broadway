import type { Ability } from '../data/types';
import AbilityCard from './AbilityCard';

/** Full ability cards for a hero, as they read in game, with the wiki's base values. */
export default function AbilityBreakdown({ abilities, heroName }: { abilities: Ability[]; heroName: string }) {
  return (
    <>
      <div className="section-heading" id="abilities"><span className="star">{'\u2726'}</span><h2>{heroName}'s abilities</h2></div>
      <div className="abl2">
        {abilities.map((a, i) => <AbilityCard key={a.name} ability={a} slot={i} inline />)}
      </div>
      <p className="note" style={{ marginTop: 10 }}>Base values and upgrade tiers from the Deadlock wiki (the upgrade numbers are the ability-point costs 1, 2 and 5); they change with patches.</p>
    </>
  );
}
