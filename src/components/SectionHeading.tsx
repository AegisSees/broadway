/** A page section title: the brass star, the heading and a fading rule (styles in base.css). */
export default function SectionHeading({ title, id }: { title: string; id?: string }) {
  return (
    <div className="section-heading" id={id}>
      <span className="star">{'✦'}</span>
      <h2>{title}</h2>
    </div>
  );
}
