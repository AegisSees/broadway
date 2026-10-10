import { useState } from 'react';
import ItemCard from './ItemCard';
import Tip from './Tip';
import { getItem } from '../data/items';
import type { HighRollItem, HighRollStat, HighRollTier } from '../data/types';
import { confidence, fmtPct } from '../lib/stats';

type Sort = 'picked' | 'win';
type Variant = 'base' | 'enhanced';
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
/** Which draft rounds can offer each item tier (from the Street Brawl rules). */
const ROUNDS = ['', 'Round 1', 'Rounds 1 to 3', 'Rounds 1 to 4', 'Rounds 3 to 5', 'Rounds 4 and 5 · rare'];

const statOf = (r: HighRollItem, v: Variant): HighRollStat => (v === 'enhanced' && r.enhanced ? r.enhanced : r);

function Pic({ r, enhanced }: { r: HighRollItem; enhanced: boolean }) {
  const info = getItem(r.item.name);
  return (
    <span className={`pic ${r.item.category}${enhanced ? ' enh' : ''}`}>
      {info?.icon ? <img src={info.icon} alt="" /> : <b className="glyph">{r.item.name[0]}</b>}
      {enhanced && <i className="spark" aria-hidden="true">{'✦'}</i>}
    </span>
  );
}

/**
 * Street Brawl "high rolls": per item tier, the items players take most and the ones that win most, for base or
 * Enhanced versions. Tier V is the Legendary pool. Each tier keeps a fixed height and scrolls.
 */
export default function HighRolls({ tiers, heroName, heroIcon }: { tiers: HighRollTier[]; heroName: string; heroIcon?: string }) {
  const [sort, setSort] = useState<Sort>('picked');
  const [variant, setVariant] = useState<Variant>('base');
  return (
    <>
      <div className="hr-bar">
        <p className="muted">
          The most taken and best performing items for {heroName} at each item tier. Enhanced versions of any item, and the Legendary pool, are included.
        </p>
        <div className="hr-ctl">
          <div className="seg" role="group" aria-label="Item version">
            <button type="button" aria-pressed={variant === 'base'} onClick={() => setVariant('base')}>Base</button>
            <button type="button" aria-pressed={variant === 'enhanced'} onClick={() => setVariant('enhanced')}>{'✦'} Enhanced</button>
          </div>
          <div className="seg" role="group" aria-label="Sort high rolls">
            <button type="button" aria-pressed={sort === 'picked'} onClick={() => setSort('picked')}>Most picked</button>
            <button type="button" aria-pressed={sort === 'win'} onClick={() => setSort('win')}>Best win rate</button>
          </div>
        </div>
      </div>
      <div className="hr-grid">
        {tiers.map((t) => {
          const solid = t.items.filter((i) => confidence(statOf(i, variant).matches) !== 'low');
          const best = solid.length ? solid.reduce((a, b) => (statOf(b, variant).winRate > statOf(a, variant).winRate ? b : a)) : undefined;
          const items = [...t.items].sort((a, b) => (sort === 'picked' ? statOf(b, variant).pickRate - statOf(a, variant).pickRate : statOf(b, variant).winRate - statOf(a, variant).winRate));
          const maxPick = Math.max(...t.items.map((i) => statOf(i, variant).pickRate));
          const legend = t.tier === 5;
          return (
            <section className={`panel pad hr-tier${legend ? ' legend' : ''}`} key={t.tier}>
              <header>
                <span className="rom">{ROMAN[t.tier]}</span>
                <div><h3>{legend ? 'Legendary' : `Tier ${ROMAN[t.tier]}`}</h3><small>{ROUNDS[t.tier]}</small></div>
                <span className="cnt">{items.length} items</span>
              </header>
              <div className="hr-scroll" tabIndex={0} role="region" aria-label={`${legend ? 'Legendary' : `Tier ${ROMAN[t.tier]}`} items, scrollable`}>
                <ol>
                  {items.map((r, idx) => {
                    const st = statOf(r, variant);
                    const isBest = r === best;
                    return (
                      <li key={r.item.name} className={isBest ? 'best' : ''}>
                        <Tip className="hr-tip" content={<ItemCard item={r.item} usage={{ text: `Picked in ${fmtPct(st.pickRate)} of ${heroName}'s Street Brawl matches.`, icon: heroIcon }} />}>
                          <div className="hr-row">
                            <span className="idx">{idx + 1}</span>
                            <Pic r={r} enhanced={variant === 'enhanced'} />
                            <span className="nm"><span className="top"><b>{r.item.name}</b>{isBest && <i className="crown">High roll</i>}</span>
                              <span className="pbar"><i style={{ width: `${(st.pickRate / maxPick) * 100}%` }} /></span></span>
                            <span className="pk"><b>{fmtPct(st.pickRate)}</b><small>picked</small></span>
                            <span className={`wr ${st.winRate >= 53 ? 'good' : ''}`}><b>{fmtPct(st.winRate)}</b><small>win</small></span>
                          </div>
                        </Tip>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
