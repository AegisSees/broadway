import { useState } from 'react';
import type { BuildPath, ItemRef } from '../data/types';
import { confidence, confidenceLabel, fmtInt, fmtPct } from '../lib/stats';
import { initials } from '../data/roster';
import { getItem } from '../data/items';
import Tip from './Tip';
import ItemCard from './ItemCard';

/** Item icon in a tier frame coloured by shop category; falls back to initials if an icon is missing. */
export function ItemTile({ item }: { item: ItemRef }) {
  const info = getItem(item.name);
  const cat = info?.category ?? item.category;
  return (
    <Tip content={<ItemCard item={item} />} className="item-tip">
      <span className={`item ${cat}`}>{info?.icon ? <img src={info.icon} alt="" /> : initials(item.name)}<span className="sr-only">{item.name}</span></span>
    </Tip>
  );
}

export default function BuildPanel({ builds }: { builds: BuildPath[] }) {
  const [id, setId] = useState(builds[0]?.id);
  const b = builds.find((x) => x.id === id) ?? builds[0];
  if (!b) return null;
  const conf = confidence(b.matches);
  return (
    <div className="panel pad">
      <div className="btabs" role="tablist" aria-label="Build styles">
        {builds.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={x.id === b.id} onClick={() => setId(x.id)}>
            {x.name} {'·'} {fmtInt(x.matches)}
          </button>
        ))}
      </div>
      <div className="bhead">
        <div>
          <div className="eyebrow">{b.style} {'·'} example playstyle</div>
          <h3>{b.name}</h3>
        </div>
        <div className="bnum">
          <div><b className="good">{fmtPct(b.winRate)}</b><small>Win rate</small></div>
          <div><b>{fmtPct(b.usage)}</b><small>Usage</small></div>
          <div><b>{fmtInt(b.matches)}</b><small>Matches {'·'} {confidenceLabel[conf].toLowerCase()}</small></div>
        </div>
      </div>
      <div className="slots">
        {b.slots.map((s) => (
          <div key={s.label}>
            <h4>{s.label}</h4>
            {s.items.map((i) => (
              <div className="slot-row" key={i.name}><ItemTile item={i} /><span className="n">{i.name}</span></div>
            ))}
          </div>
        ))}
      </div>
      <p className="note">Hover an item for details. Builds under a minimum match count are left out instead of listed.</p>
      <h3 className="sub-heading">Late-game options</h3>
      <div className="tscroll">
      <table className="data">
        <thead><tr><th>Item</th><th>Win rate</th><th>Usage</th><th>Matches</th><th>Avg. buy</th></tr></thead>
        <tbody>
          {b.lateGame.map((r) => (
            <tr key={r.item.name}>
              <td><span className="late-item"><ItemTile item={r.item} /><span>{r.item.name}</span></span></td><td className="good">{fmtPct(r.winRate)}</td><td>{fmtPct(r.usage)}</td>
              <td>{fmtInt(r.matches)}</td><td className="muted">{r.avgBuy}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
