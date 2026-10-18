import { useEffect, useRef, useState } from 'react';
import { RANKS, type Filters, type RankKey } from '../data/types';

import { rankBadge } from '../data/ranks';
export const badge = (rank: string): string | undefined => rankBadge(rank);

function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

function RankSelect({ value, onChange }: { value: RankKey; onChange: (r: RankKey) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [open]);

  const pick = (r: RankKey) => { onChange(r); setOpen(false); };
  return (
    <div className="rank-select" ref={ref}>
      <button type="button" className="rank-trigger" aria-haspopup="listbox" aria-expanded={open} aria-label={`Average match rank: ${value === 'all' ? 'All ranks' : value}`} onClick={() => setOpen((o) => !o)}>
        {value !== 'all' && badge(value) && <img src={badge(value)} alt="" />}
        <span>{value === 'all' ? 'All ranks' : value}</span>
        <span className="chev" aria-hidden="true">{'▾'}</span>
      </button>
      {open && (
        <ul className="rank-menu" role="listbox" aria-label="Average match rank">
          {(['all', ...RANKS] as RankKey[]).map((r) => (
            <li key={r} role="presentation">
              <button type="button" role="option" aria-selected={r === value} onClick={() => pick(r)}>
                {r === 'all' ? <span className="all-star" aria-hidden="true">{'✦'}</span> : badge(r) ? <img src={badge(r)} alt="" /> : <span className="ph" aria-hidden="true">{r[0]}</span>}
                {r === 'all' ? 'All ranks' : r}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Controls({ filters, onChange }: { filters: Filters; onChange: (p: Partial<Filters>) => void }) {
  return (
    <div className="controls">
      <Segmented label="Game mode" value={filters.mode} onChange={(mode) => onChange({ mode })}
        options={[{ value: 'standard', label: 'Standard' }, { value: 'street_brawl', label: 'Street Brawl' }]} />
      <Segmented label="Queue" value={filters.queue} onChange={(queue) => onChange({ queue })}
        options={[{ value: 'ranked', label: 'Ranked' }, { value: 'unranked', label: 'Unranked' }]} />
      <RankSelect value={filters.rank} onChange={(rank) => onChange({ rank })} />
    </div>
  );
}
