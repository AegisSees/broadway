import { heading } from './heading';
import type { HeroSkin, SkinCopy } from './types';

interface Props {
  skin?: HeroSkin;
  /** Which of the skin's themed titles to use. Omit and pass `title` for a heading the skin does not rename. */
  k?: keyof SkinCopy;
  title?: string;
  id?: string;
}

/** A page section title: the skin's ornament, its themed title (with the plain one kept as a quiet subtitle) and its rule. */
export default function SectionHeading({ skin, k, title, id }: Props) {
  const h = k ? heading(skin, k) : { title: title ?? '', sub: undefined };
  return (
    <div className="section-heading" id={id}>
      <span className="star">{'✦'}</span>
      <h2>{h.title}</h2>
      {h.sub && <small className="sh-sub">{h.sub}</small>}
    </div>
  );
}
