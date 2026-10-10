import type { Tier } from '../data/types';

/**
 * Tier label in the city's tape-plate style: a flat coloured plate with a hard shadow and heavy dark lettering.
 * Used on the tier list; the winged emblem (TierBadge) stays on hero pages.
 */
export default function TierTag({ tier, size = 'md' }: { tier: Tier; size?: 'sm' | 'md' | 'lg' }) {
  const plus = tier === 'S+';
  return (
    <span className={`tier-tag t-${tier.toLowerCase().replace('+', 'p')} ${size}`} role="img" aria-label={`${tier} tier`}>
      <b aria-hidden="true">{plus ? <>S<i>+</i></> : tier}</b>
    </span>
  );
}
