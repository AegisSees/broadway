import { Link } from 'react-router-dom';
import { initials, type Hero } from '../data/roster';

export function HeroFace({ hero, size }: { hero: Hero; size?: 'sm' | 'lg' }) {
  return (
    <span className={`face ${size ?? ''}`} aria-hidden="true">
      {hero.icon ? <img className="icon" src={hero.icon} alt="" loading="lazy" />
        : hero.portrait ? <img src={hero.portrait} alt="" loading="lazy" /> : initials(hero.name)}
    </span>
  );
}

export function HeroLink({ hero, size, children }: { hero: Hero; size?: 'sm' | 'lg'; children?: React.ReactNode }) {
  return (
    <Link to={`/hero/${hero.slug}`} className="face-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
      <HeroFace hero={hero} size={size} />
      {children ?? hero.name}
    </Link>
  );
}
