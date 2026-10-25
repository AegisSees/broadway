import { useMemo } from 'react';
import { ALL_ITEM_NAMES, getItem, type ItemInfo } from '../data/items';
import { getHero, HEROES } from '../data/roster';
import { useModel } from '../ml/models';
import { heroIdOf, topPlayerBuys, winningBuys, type Suggestion } from '../ml/predict';
import { fmtInt } from '../lib/stats';
import { HeroFace } from './HeroFace';

const CATS = ['weapon', 'vitality', 'spirit'] as const;
const SHOP: ItemInfo[] = ALL_ITEM_NAMES.map((n) => getItem(n)).filter((i): i is ItemInfo => !!i && i.tier < 5).sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
const PICKABLE = HEROES.filter((h) => !h.unreleased && heroIdOf(h.slug) !== undefined);

function Row({ s, unit, onAdd, full }: { s: Suggestion; unit: 'pts' | 'share'; onAdd: (name: string) => void; full: boolean }) {
  const v = unit === 'pts' ? `${s.value >= 0 ? '+' : '−'}${Math.abs(s.value).toFixed(1)}` : `${Math.round(s.value * 100)}%`;
  return (
    <li>
      <button type="button" className={`nb-item ${s.item.category}`} onClick={() => onAdd(s.item.name)} disabled={full} title={full ? 'Your twelve slots are full' : `Add ${s.item.name} to the build`}>
        <span className="im">{s.item.icon ? <img src={s.item.icon} alt="" loading="lazy" /> : <b>{s.item.name[0]}</b>}</span>
        <span className="nm"><b>{s.item.name}</b><small>{fmtInt(s.item.cost)}</small></span>
        <em>{v}{unit === 'pts' && <small> pts</small>}</em>
        {unit === 'share' && <i className="nb-bar" aria-hidden="true" style={{ width: `${Math.max(3, s.value * 100)}%` }} />}
      </button>
    </li>
  );
}

/**
 * "What next" for the build planner: two models read the same moment (your hero, the minute, what you hold, the
 * enemy heroes and what they have bought) and answer different questions. The build recommender says which buy has
 * gone with winning in spots like this; the top-player model says what players in the top 10% actually buy next.
 */
export default function NextBuy(props: {
  hero: string; owned: string[]; minute: number; autoMinute: boolean; enemies: string[]; enemyItems: string[]; full: boolean;
  onAdd: (name: string) => void; onMinute: (m: number | null) => void; onEnemies: (s: string[]) => void; onEnemyItems: (s: string[]) => void;
}) {
  const { hero, owned, minute, enemies, enemyItems } = props;
  const builds = useModel('builds');
  const top = useModel('topItems');
  const ctx = useMemo(() => ({
    hero: heroIdOf(hero) ?? 0, minute, owned,
    enemyHeroes: enemies.map((s) => heroIdOf(s)).filter((x): x is number => x !== undefined), enemyItems,
  }), [hero, minute, owned, enemies, enemyItems]);
  const win = useMemo(() => (builds ? winningBuys(builds, ctx, 4) : []), [builds, ctx]);
  const tops = useMemo(() => (top ? topPlayerBuys(top, ctx, 4) : []), [top, ctx]);
  const spend = CATS.map((c) => enemyItems.reduce((s, n) => { const i = getItem(n); return s + (i?.category === c ? i.cost : 0); }, 0));
  const spent = spend.reduce((a, b) => a + b, 0);

  return (
    <section className="panel bp-next" aria-label="Next buy">
      <h3>Next buy</h3>
      <p className="muted">Two models read this spot: the minute, what you hold, and who you are up against.{!hero && ' Pick a hero above for sharper picks.'}</p>

      <div className="nb-ctx">
        <label className="nb-min">
          <span>Minute <b>{minute}</b>{props.autoMinute && <small> from your souls</small>}</span>
          <input type="range" min={1} max={50} value={minute} onChange={(e) => props.onMinute(Number(e.target.value))} aria-label="Game minute" />
        </label>
        {!props.autoMinute && <button type="button" className="chip" onClick={() => props.onMinute(null)}>Use my souls</button>}
      </div>

      <div className="nb-vs">
        <span className="nb-lbl">Enemy heroes</span>
        <ul className="nb-chips">
          {enemies.map((s) => { const h = getHero(s); return h ? <li key={s}><button type="button" onClick={() => props.onEnemies(enemies.filter((x) => x !== s))} aria-label={`Remove ${h.name}`}><HeroFace hero={h} />{h.name}<i aria-hidden="true">×</i></button></li> : null; })}
          {enemies.length < 6 && (
            <li>
              <select value="" onChange={(e) => e.target.value && props.onEnemies([...enemies, e.target.value])} aria-label="Add an enemy hero">
                <option value="">+ Add hero</option>
                {PICKABLE.filter((h) => !enemies.includes(h.slug) && h.slug !== hero).map((h) => <option key={h.slug} value={h.slug}>{h.name}</option>)}
              </select>
            </li>
          )}
        </ul>
      </div>

      <div className="nb-vs">
        <span className="nb-lbl">What they have bought</span>
        <ul className="nb-chips">
          {enemyItems.map((n, i) => { const it = getItem(n); return it ? <li key={`${n}${i}`}><button type="button" className={it.category} onClick={() => props.onEnemyItems(enemyItems.filter((_, j) => j !== i))} aria-label={`Remove ${n}`}>{it.icon && <img src={it.icon} alt="" />}{n}<i aria-hidden="true">×</i></button></li> : null; })}
          {enemyItems.length < 36 && (
            <li>
              <select value="" onChange={(e) => e.target.value && props.onEnemyItems([...enemyItems, e.target.value])} aria-label="Add an enemy item">
                <option value="">+ Add item</option>
                {CATS.map((c) => <optgroup key={c} label={c[0].toUpperCase() + c.slice(1)}>{SHOP.filter((i) => i.category === c).map((i) => <option key={i.name} value={i.name}>{i.name} ({fmtInt(i.cost)})</option>)}</optgroup>)}
              </select>
            </li>
          )}
        </ul>
        {spent > 0 && (
          <span className="nb-spend" role="img" aria-label={`Enemy spend: ${CATS.map((c, i) => `${c} ${Math.round((spend[i] / spent) * 100)}%`).join(', ')}`}>
            {CATS.map((c, i) => spend[i] > 0 && <i key={c} className={c} style={{ width: `${(spend[i] / spent) * 100}%` }}>{Math.round((spend[i] / spent) * 100)}% {c}</i>)}
          </span>
        )}
      </div>

      <div className="nb-cols">
        <div>
          <h4>Wins most here</h4>
          <small className="muted">Win-chance points over a typical buy, in an even game</small>
          {win.length ? <ol className="nb-list">{win.map((s) => <Row key={s.id} s={s} unit="pts" onAdd={props.onAdd} full={props.full} />)}</ol> : <p className="muted">Loading…</p>}
        </div>
        <div>
          <h4>Top players buy</h4>
          <small className="muted">Chance a top-10% player buys it next</small>
          {tops.length ? <ol className="nb-list">{tops.map((s) => <Row key={s.id} s={s} unit="share" onAdd={props.onAdd} full={props.full} />)}</ol> : <p className="muted">Loading…</p>}
        </div>
      </div>
      <small className="nb-src">Trained on about a million item purchases from recent public games. The win model links buys to results, it does not prove an item wins; on unseen games the buy that went with the winner ranked higher 56% of the time. The top-player model guesses their next buy in its top three 59% of the time.</small>
    </section>
  );
}
