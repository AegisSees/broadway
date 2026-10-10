import type { Ability } from '../data/types';
import AbilityCard from './AbilityCard';

/** Hover card for an ability: the same in-game style card used on the hero page, shown in a tooltip. */
export default function AbilityTip({ ability, slot }: { ability: Ability; slot: number }) {
  return <AbilityCard ability={ability} slot={slot} />;
}
