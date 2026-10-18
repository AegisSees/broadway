import tags from '../data/heroTags.json';
import { tagColors, useHeroColor } from '../data/heroColors';
import { tagScale } from '../lib/tilt';

const TAGS = tags as Record<string, string[] | null>;
// Tags come from the game's own hero data (citadel_heroes localization).
export const getTags = (slug: string): string[] => TAGS[slug] ?? [];

/**
 * Hero trait tags in the tilted-block style of the in-game hero intro, in the hero's own colour. Each block rests
 * at a slight angle and straightens on hover or keyboard focus, like the "Sounds" button.
 */
export default function HeroTags({ slug, className = '' }: { slug: string; className?: string }) {
  const color = useHeroColor(slug);
  const list = getTags(slug);
  if (list.length === 0) return null;
  const { bg, ink } = tagColors(color);
  return (
    <ul className={`htags ${className}`} aria-label="Hero traits" style={{ ['--tag-bg' as string]: bg, ['--tag-ink' as string]: ink, ['--hs' as string]: tagScale(slug) } as React.CSSProperties}>
      {list.map((t) => <li key={t}><span className="htag" tabIndex={0}>{t}</span></li>)}
    </ul>
  );
}
