import type { Tier } from '../data/types';

/**
 * Tier label: a flat rectangular plate in the tier's colour with a hard shadow and heavy white lettering, moving in
 * three-frame stop-motion (styles in tier-tags.css). Used wherever a tier is shown: tier list, hero page, home table.
 */
export default function TierTag({ tier, size = 'md' }: { tier: Tier; size?: 'sm' | 'md' | 'lg' }) {
  const plus = tier === 'S+';
  return (
    <span className={`tier-tag t-${tier.toLowerCase().replace('+', 'p')} ${size}`} role="img" aria-label={`${tier} tier`}>
      <b aria-hidden="true">{plus ? <>S<i>+</i></> : tier}</b>
    </span>
  );
}
