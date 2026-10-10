import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { HEROES, type Hero } from '../data/roster';

const PLAYABLE = HEROES.filter((h) => !h.unreleased);
const art = (h: Hero) => h.icon ?? h.portrait;

/** Searchable hero dropdown: type to filter, or scroll the alphabetical list and click. */
export default function HeroCombo({ value, onChange, anyLabel }: { value: string; onChange: (slug: string) => void; anyLabel?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const current = PLAYABLE.find((h) => h.slug === value);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? PLAYABLE.filter((h) => h.name.toLowerCase().includes(t)) : PLAYABLE;
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);
  useEffect(() => { if (open) { setQ(''); setCursor(Math.max(0, PLAYABLE.findIndex((h) => h.slug === value))); window.setTimeout(() => input.current?.focus(), 0); } }, [open, value]);
  useEffect(() => { setCursor((c) => Math.min(c, Math.max(0, list.length - 1))); }, [list.length]);
  useEffect(() => { if (open) document.getElementById(`${id}-${cursor}`)?.scrollIntoView({ block: 'nearest' }); }, [cursor, open, id]);

  const pick = (h: Hero) => { onChange(h.slug); setOpen(false); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, list.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (list[cursor]) pick(list[cursor]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  let lastLetter = '';
  return (
    <div className="hcombo" ref={root}>
      <span className="lbl">Hero</span>
      <button type="button" className="trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {current && art(current) ? <img src={art(current) as string} alt="" /> : <i />}
        <b>{current?.name ?? anyLabel ?? 'Choose a hero'}</b><span aria-hidden="true">{'▾'}</span>
      </button>
      {open && (
        <div className="pop">
          <input
            ref={input}
            role="combobox"
            aria-expanded="true"
            aria-controls={`${id}-list`}
            aria-activedescendant={list[cursor] ? `${id}-${cursor}` : undefined}
            aria-label="Find a hero"
            placeholder="Type a hero name"
            value={q}
            onChange={(e) => { setQ(e.target.value); setCursor(0); }}
            onKeyDown={onKey}
          />
          <ul id={`${id}-list`} role="listbox" aria-label="Heroes">
            {anyLabel && !q && (
              <li role="presentation">
                <button type="button" role="option" aria-selected={value === ''} className={value === '' ? 'sel' : ''} onClick={() => { onChange(''); setOpen(false); }}>
                  <i /><span>{anyLabel}</span>
                </button>
              </li>
            )}
            {list.map((h, i) => {
              const letter = h.name[0].toUpperCase();
              const head = !q && letter !== lastLetter;
              lastLetter = letter;
              return (
                <li key={h.slug} role="presentation">
                  {head && <div className="letter" aria-hidden="true">{letter}</div>}
                  <button type="button" id={`${id}-${i}`} role="option" aria-selected={h.slug === value} className={`${i === cursor ? 'cur' : ''}${h.slug === value ? ' sel' : ''}`} onMouseEnter={() => setCursor(i)} onClick={() => pick(h)}>
                    {art(h) ? <img src={art(h) as string} alt="" loading="lazy" /> : <i />}
                    <span>{h.name}</span>
                  </button>
                </li>
              );
            })}
            {list.length === 0 && <li className="none">No hero matches “{q}”.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
