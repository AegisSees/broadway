import { headTilt } from '../lib/tilt';

/** A page section title: the brass star, the heading on a tape strip that rests at its own angle, and a fading rule. */
export default function SectionHeading({ title, id }: { title: string; id?: string }) {
  return (
    <div className="section-heading" id={id} style={{ ['--ht' as string]: `${headTilt(title)}deg` } as React.CSSProperties}>
      <span className="star">{'✦'}</span>
      <h2>{title}</h2>
    </div>
  );
}
