import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SiteFooter } from '../components/Shell';
import Kicker from '../components/Kicker';
import ItemCard from '../components/ItemCard';
import Tip from '../components/Tip';
import { ALL_ITEM_NAMES, getItem, itemFromSlug, type ItemInfo } from '../data/items';
import type { ItemCategory } from '../data/types';
import { fmtInt } from '../lib/stats';
import { useTitle } from '../lib/useTitle';

const COLUMNS: { id: ItemCategory; label: string; tag: string }[] = [
  { id: 'weapon', label: 'Weapon', tag: 'Stock up!' },
  { id: 'spirit', label: 'Spirit', tag: 'Big deal!' },
  { id: 'vitality', label: 'Vitality', tag: 'Feel good!' },
];
const TIERS = [1, 2, 3, 4, 5];

/** The shop laid out like the in-game one: three category columns, a row per price, and the card beside it. */
export default function ItemsPage() {
  useTitle('Items');
  const [q, setQ] = useState('');
  const [params] = useSearchParams();
  const [pinned, setPinned] = useState<ItemInfo | null>(() => { const n = itemFromSlug(params.get('item') ?? ''); return n ? getItem(n) ?? null : null; });
  const all = useMemo(() => ALL_ITEM_NAMES.map((n) => getItem(n)).filter((i): i is ItemInfo => !!i), []);
  const needle = q.trim().toLowerCase();
  const matches = (i: ItemInfo) => !needle || i.name.toLowerCase().includes(needle);
  const hits = all.filter(matches).length;
  const price = (tier: number): string => {
    if (tier === 5) return 'Legendary · Street Brawl only';
    const c = all.find((i) => i.tier === tier)?.cost;
    return c ? fmtInt(c) : `Tier ${tier}`;
  };
  return (
    <div className="wrap">
      <div className="dir-head">
        <div><Kicker>The shop</Kicker><h1>Every item <em>in the city</em></h1></div>
        <label className="search-box" style={{ width: 280 }}>
          <span className="icon" aria-hidden="true">{'⌕'}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to search" aria-label="Search items" />
        </label>
      </div>
      <p className="muted shop-hint">Hover an item to read its card, or click it to keep the card open (tap on a phone). {needle && <b>{hits} match{hits === 1 ? '' : 'es'}.</b>}</p>
      <div className="shop2">
        <div className="shop2-cols">
          {COLUMNS.map((c) => (
            <section className={`scol ${c.id}`} key={c.id} aria-label={c.label}>
              <header><b>{c.label}</b><i>{c.tag}</i></header>
              {TIERS.map((t) => {
                const list = all.filter((i) => i.category === c.id && i.tier === t).sort((a, b) => a.name.localeCompare(b.name));
                if (!list.length) return null;
                return (
                  <div className="srow" key={t}>
                    <div className="sprice">{price(t)}</div>
                    <div className="sgrid">
                      {list.map((i) => (
                        <Tip key={i.name} className="stile-host" prefer="side" delay={120} content={<ItemCard item={{ name: i.name, category: i.category }} />}>
                          <button type="button" className={`stile ${i.category}${t === 5 ? ' leg' : ''}${pinned?.name === i.name ? ' sel' : ''}${needle && !matches(i) ? ' dim' : ''}`}
                            onClick={() => setPinned((p) => (p?.name === i.name ? null : i))} aria-pressed={pinned?.name === i.name}>
                            <span className="im">{i.icon ? <img src={i.icon} alt="" loading="lazy" /> : <b>{i.name[0]}</b>}{i.imbue && <em className="imb">Imbue</em>}</span>
                            <span className="nm">{i.name}</span>
                          </button>
                        </Tip>
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      </div>
      {pinned && (
        <>
          <button type="button" className="shop2-scrim" aria-label="Close item card" onClick={() => setPinned(null)} />
          <div className="shop2-pin" role="dialog" aria-label={`${pinned.name} card`}>
            <button type="button" className="close" onClick={() => setPinned(null)} aria-label="Close item card">{'×'}</button>
            <ItemCard item={{ name: pinned.name, category: pinned.category }} />
          </div>
        </>
      )}
      <SiteFooter />
    </div>
  );
}
