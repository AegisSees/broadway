import { RANK_COLOR, rankBadge, ROMAN } from '../data/ranks';

/** A rank's badge art, with its sub-level numeral (I to VI) on a small plate beneath when `sub` is given. */
export default function RankBadge({ rank, sub, size = 'md' }: { rank: string; sub?: number; size?: 'xs' | 'sm' | 'md' | 'lg'; }) {
  const color = RANK_COLOR[rank as keyof typeof RANK_COLOR];
  const src = rankBadge(rank);
  return (
    <span className={`rbadge ${size}`} style={{ ['--rc' as string]: color } as React.CSSProperties}>
      {src ? <img src={src} alt="" loading="lazy" /> : <span className="none" />}
      {sub ? <b>{ROMAN[sub]}</b> : null}
    </span>
  );
}
