import { getItem } from '../data/items';
import type { HighRollItem, HighRollTier } from '../data/types';
import { confidence, fmtPct } from '../lib/stats';

/** Which item tiers each round of the draft can offer, and the ability points a round starts with (Street Brawl rules). */
const ROUNDS: { n: number; tiers: number[]; ap: number }[] = [
  { n: 1, tiers: [1, 2, 3], ap: 6 },
  { n: 2, tiers: [2, 3], ap: 6 },
  { n: 3, tiers: [2, 3, 4], ap: 5 },
  { n: 4, tiers: [3, 4, 5], ap: 5 },
  { n: 5, tiers: [4, 5], ap: 10 },
];
const tierLabel = (t: number[]) => { const l = t.filter((x) => x < 5); return l.length > 1 ? `Tiers ${l[0]} to ${l[l.length - 1]}` : `Tier ${l[0]}`; };

/** For each of the five draft rounds: the best performing and the most taken item among the tiers that round can offer. */
export default function DraftPlanner({ tiers, heroName }: { tiers: HighRollTier[]; heroName: string }) {
  return (
    <div className="panel pad draft">
      <h3>Draft planner</h3>
      <small className="muted">Each round you see three sets of three items and take one. Here is {heroName}'s best pick for what each round can offer.</small>
      <div className="draft-row">
        {ROUNDS.map((r) => {
          const pool: HighRollItem[] = tiers.filter((t) => r.tiers.includes(t.tier)).flatMap((t) => t.items).filter((i) => confidence(i.matches) !== 'low');
          const best = pool.reduce<HighRollItem | undefined>((a, b) => (!a || b.winRate > a.winRate ? b : a), undefined);
          const common = pool.reduce<HighRollItem | undefined>((a, b) => (!a || b.pickRate > a.pickRate ? b : a), undefined);
          const info = best && getItem(best.item.name);
          return (
            <div className="draft-card" key={r.n}>
              <div className="dh"><b>Round {r.n}</b><small>{tierLabel(r.tiers)}{r.tiers.includes(5) ? ' + Legendary' : ''}</small></div>
              <div className={`dpic ${best?.item.category ?? ''}`}>{info?.icon ? <img src={info.icon} alt="" /> : <b>{best?.item.name[0]}</b>}</div>
              <div className="dn">{best?.item.name}</div>
              <div className="dw">{best && fmtPct(best.winRate)}<small>win rate</small></div>
              {common && common !== best && <div className="dc">Most taken: {common.item.name}</div>}
              <div className="dap">{r.ap} ability points</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
