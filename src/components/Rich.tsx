import { Fragment } from 'react';

const SPLIT = /(\*\*[^*]+\*\*|\[\[[a-z]+\|[^\]]+\]\])/g;

/**
 * Card text markup: **bold** for key mechanics and [[spirit|spirit damage]] style coloured keywords
 * (kinds: spirit, weapon, speed, health). Plain text passes through, so unmarked data still renders.
 */
export default function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(SPLIT).map((p, i) => {
        if (p.startsWith('**')) return <b key={i}>{p.slice(2, -2)}</b>;
        const m = /^\[\[([a-z]+)\|([^\]]+)\]\]$/.exec(p);
        if (m) return <span key={i} className={`kw kw-${m[1]}`}>{m[2]}</span>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}
