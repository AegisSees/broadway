import { useFavorites } from '../lib/favorites';

/** Star toggle for following a hero. */
export default function FavStar({ slug, name, label = false }: { slug: string; name: string; label?: boolean }) {
  const { has, toggle } = useFavorites();
  const on = has(slug);
  return (
    <button type="button" className={`favstar${on ? ' on' : ''}${label ? ' lab' : ''}`} aria-pressed={on} aria-label={`${on ? 'Unfollow' : 'Follow'} ${name}`} title={on ? 'Following' : 'Follow this hero'}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(slug); }}>
      <span aria-hidden="true">{on ? '★' : '☆'}</span>{label && <em>{on ? 'Following' : 'Follow'}</em>}
    </button>
  );
}
