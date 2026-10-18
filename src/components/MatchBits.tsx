import ItemCard from './ItemCard';
import Tip from './Tip';
import { getItem } from '../data/items';
import type { MatchItem } from '../data/matchDetail';

/** Small pieces shared by the match page and the match cards on a player page. */

/** An item square in its shop colour, with the item card on hover. Sold or upgraded items are dimmed. */
export function ItemIcon({ item, size = 'md', note }: { item: MatchItem; size?: 'sm' | 'md' | 'lg'; note?: string }) {
  const info = getItem(item.name);
  const face = (
    <span className={`mt-it ${size}${item.held ? '' : ' sold'}`} data-cat={info?.category ?? 'none'} data-tier={info?.tier ?? 0}>
      {item.icon ? <img src={item.icon} alt={item.name} loading="lazy" /> : <b>{item.name.slice(0, 1)}</b>}
      {note ? <i>{note}</i> : null}
    </span>
  );
  if (!info) return <span title={item.name}>{face}</span>;
  return <Tip content={<ItemCard item={{ name: info.name, category: info.category }} />}>{face}</Tip>;
}

/** MVP for the best player of the game, #2 and #3 for the next two. */
export function MvpTag({ rank }: { rank?: number }) {
  if (!rank) return null;
  return <i className={`mt-mvp r${rank}`} title={rank === 1 ? 'Best player of the game' : `Number ${rank} player of the game`}>{rank === 1 ? 'MVP' : `#${rank}`}</i>;
}
