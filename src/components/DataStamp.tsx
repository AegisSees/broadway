import { useEffect, useState } from 'react';
import { WINDOW_LABEL } from '../data/patchWindow';
import type { DataMeta } from '../data/tiers';
import { fmtInt } from '../lib/stats';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (unix: number) => { const d = new Date(unix * 1000); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };

/** "12 min ago", "2 h ago". Under a minute reads "just now". */
export function ago(ms: number): string {
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`;
}

/**
 * The line under every data view that says what the numbers cover: how many games, which dates, and how long ago this
 * browser fetched them. `unit` is "matches" for most views and "purchases" for item tables.
 */
export default function DataStamp({ meta, unit = 'matches' }: { meta: DataMeta; unit?: string }) {
  // re-render once a minute so "fetched X ago" keeps counting
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);
  const w = meta.window;
  const span = w.to !== undefined ? `${day(w.from)} to ${day(w.to)}` : `since ${day(w.from)}`;
  return (
    <p className="data-stamp">
      <b>{fmtInt(meta.matches)}</b> {unit} <span aria-hidden="true">·</span> {WINDOW_LABEL[w.key]}, {span}
      {meta.latestDay !== undefined && w.to === undefined && <> <span aria-hidden="true">·</span> data through {day(meta.latestDay)}</>}
      {' '}<span aria-hidden="true">·</span> updated {ago(now - meta.fetchedAt)}
    </p>
  );
}
