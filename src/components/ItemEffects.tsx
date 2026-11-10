import { Link } from 'react-router-dom';
import type { HeroItems, HeroItemRow } from '../data/source';
import { getItem, itemSlug } from '../data/items';
import { fmtDelta, fmtInt } from '../lib/stats';
import DataStamp from './DataStamp';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

function Row({ i }: { i: HeroItemRow }) {
  const info = getItem(i.name);
  const slug = itemSlug(i.name);
  return (
    <tr className={i.unsure ? 'unsure' : undefined}>
      <td style={{ textAlign: 'left' }}>
        <span className={`ie-name cat-${info?.category ?? 'none'}`}>
          {info?.icon && <img src={info.icon} alt="" loading="lazy" />}
          {slug ? <Link to={`/items/${slug}`}>{i.name}</Link> : i.name}
        </span>
      </td>
      <td className={i.unsure ? 'muted' : i.shownDelta > 0 ? 'good' : 'bad'}><b>{fmtDelta(i.shownDelta)}</b></td>
      <td className="muted">{'±'}{i.margin.toFixed(1)}</td>
      <td className="muted">{fmtDelta(i.rawDelta)}</td>
      <td className="muted">{clock(i.avgBuyTime)}</td>
      <td className="muted">{fmtInt(i.matches)}</td>
    </tr>
  );
}

/**
 * Items whose buyers win more (or less) often than other players of the same hero who were in the same situation:
 * same part of the game, same net worth. See data/heroItems.ts for the method.
 */
export default function ItemEffects({ data, heroName }: { data: HeroItems; heroName: string }) {
  const best = data.items.slice(0, 10);
  const worst = data.items.slice(-5).filter((i) => !best.includes(i) && i.shownDelta < 0).reverse();
  const head = (
    <thead><tr>
      <th style={{ textAlign: 'left' }}>Item</th><th title="Win rate difference against similar purchases, shrunk for sample size">Adjusted</th>
      <th title="About 95% of the time the true value is within this many points">Margin</th>
      <th title="Difference with no correction for timing or net worth">Raw</th><th>Avg. bought</th><th>Purchases</th>
    </tr></thead>
  );
  return (
    <div className="panel pad item-effects">
      <table className="data ie">
        {head}
        <tbody>
          {best.map((i) => <Row key={i.itemId} i={i} />)}
          {worst.length > 0 && <tr className="ie-gap"><td colSpan={6}>Lowest on {heroName}</td></tr>}
          {worst.map((i) => <Row key={i.itemId} i={i} />)}
        </tbody>
      </table>
      <p className="muted fine">
        Adjusted is how many points more often buyers won than {heroName} players who bought something else at the same stage of the game with the same net worth.
        Raw is the same comparison with no correction. Greyed rows could be chance. This shows what winning players buy, not proof that the item causes the win.
        {data.hidden > 0 ? ` ${data.hidden} items are hidden for having too few purchases.` : ''} Corrupted Items are not included.
      </p>
      <DataStamp meta={data.meta} unit="purchases" />
    </div>
  );
}
