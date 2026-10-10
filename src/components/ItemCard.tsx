import type { ItemRef } from '../data/types';
import { buildsInto, getItem, getItemCard, isLegendary } from '../data/items';
import { barLabel, Emph, parseItem } from './itemText';
import Rich from './Rich';

/** The teardrop-S soul mark used for item costs. */
export const Soul = () => (
  <svg viewBox="0 0 16 22" width="13" height="18" aria-hidden="true">
    <path d="M11.5 4.5C10.2 2.5 5 2.8 5 6.5c0 4.2 6.5 3.8 6.5 8 0 3.5-5.5 3.8-7 1.2" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M8 1v20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/** "+20%" -> sign "+", number "20", unit "%". Values with no leading number are returned whole. */
function splitValue(v: string): { sign: string; num: string; unit: string } {
  const m = v.trim().match(/^([+\-−]?)(\d[\d.,]*)(.*)$/);
  return m ? { sign: m[1], num: m[2], unit: m[3] } : { sign: '', num: v, unit: '' };
}
const Val = ({ v }: { v: string }) => { const x = splitValue(v); return <span className="val2">{x.sign && <i className={`sg${x.sign === '+' ? '' : ' neg'}`}>{x.sign}</i>}<b className="n">{x.num}</b>{x.unit && <i className="un">{x.unit}</i>}</span>; };

const STAT_ICONS = import.meta.glob('../assets/stat/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const statIcon = (n: string) => STAT_ICONS[`../assets/stat/${n}.png`];
type Glyph = { cls: string; icon?: string };
/** Colours a stat tile by what it measures and picks the game's own stat glyph, the way the in-game card tints weapon, spirit, healing and speed numbers. */
function labelKind(label: string): Glyph {
  if (/bullet resist/i.test(label)) return { cls: 'weapon', icon: statIcon('property_bullet_armor') };
  if (/spirit resist/i.test(label)) return { cls: 'spirit', icon: statIcon('property_tech_armor') };
  if (/resist|armor/i.test(label)) return { cls: 'plain', icon: statIcon('armor') };
  if (/heal|health|regen|lifesteal|barrier|shield/i.test(label)) return { cls: 'health', icon: statIcon('all_stats') };
  if (/fire rate/i.test(label)) return { cls: 'weapon', icon: statIcon('fire_rate_icon') };
  if (/ammo|magazine|reload/i.test(label)) return { cls: 'weapon', icon: statIcon('ammo_icon') };
  if (/melee/i.test(label)) return { cls: 'weapon', icon: statIcon('melee_icon') };
  if (/weapon damage|bullet|headshot|crit/i.test(label)) return { cls: 'weapon', icon: statIcon('weapon_power') };
  if (/cooldown/i.test(label)) return { cls: 'spirit', icon: statIcon('property_cooldown_large') };
  if (/spirit|ability|charge|tech/i.test(label)) return { cls: 'spirit', icon: statIcon('tech_power') };
  if (/slow/i.test(label)) return { cls: 'speed', icon: statIcon('property_slow_large') };
  if (/speed|sprint|dash|stamina|evasion|jump/i.test(label)) return { cls: 'speed', icon: statIcon('speed_icon') };
  return { cls: 'plain' };
}
/** Longer-lived or secondary numbers sit in the plain rows under the key tiles instead of getting a tile of their own. */
const SECONDARY = /duration|limit|delay|interval|stacks?\b|non-hero|per |window|range|radius/i;
function splitTiles<T extends { label: string; key?: boolean }>(tiles: T[]): { key: T[]; rest: T[] } {
  // The game marks the "important" properties of an item; those get the big tiles and everything else the plain rows.
  if (tiles.some((t) => t.key)) return { key: tiles.filter((t) => t.key).slice(0, 3), rest: [...tiles.filter((t) => t.key).slice(3), ...tiles.filter((t) => !t.key)] };
  const key: T[] = [], rest: T[] = [];
  for (const t of tiles) (SECONDARY.test(t.label) && !/ability range/i.test(t.label) || key.length >= 3 ? rest : key).push(t);
  return { key, rest };
}

const sameText = (a: string, b: string) => a.replace(/\*\*/g, '').trim().toLowerCase() === b.replace(/\*\*/g, '').trim().toLowerCase();
const kindLabel = (k: string) => (k === 'Passive+Active' ? 'Passive / Active' : k);

/**
 * Item hover card in the in-game shop layout: tinted header with cost, stat rows with before and after values,
 * a Passive or Active bar with the cooldown tab, the effect text with its keywords picked out, stat tiles and an
 * "Upgrades from" footer. Items without structured data fall back to the plain wiki summary.
 */
function ItemLinks({ title, names }: { title: string; names: string[] }) {
  return (
    <div className="itc-sec">
      <div className="h">{title}</div>
      <div className="r">{names.map((n) => <span className="itc-up" key={n}>{getItem(n)?.icon ? <img src={getItem(n)!.icon} alt="" /> : <b className="mini">{n[0]}</b>}{n}</span>)}</div>
    </div>
  );
}

export default function ItemCard({ item, usage }: { item: ItemRef; usage?: { text: string; icon?: string } }) {
  const info = getItem(item.name);
  if (!info) return <div className="tip-title">{item.name}</div>;
  const card = getItemCard(info.name);
  const fallback = card ? null : parseItem(info.desc);
  const stats: { label: string; value: string; conditional?: boolean }[] = card ? card.stats : fallback!.stats.map((r) => ({ label: r.label, value: r.value }));
  const tiles = card && card.kind !== 'None'
    ? card.tiles.filter((t) => !card.stats.some((s) => s.value === t.value && s.label === t.label))
    : [];
  const from = card ? (card.components.length ? card.components : card.upgradesFrom ? [card.upgradesFrom] : []) : fallback!.upgrades;
  const parts = splitTiles(tiles.slice(0, 7));
  const bar = card ? (card.kind === 'None' ? null : kindLabel(card.kind)) : barLabel(fallback!.body);
  const cooldown = card?.cooldown ?? null;
  const into = buildsInto(info.name).slice(0, 4);
  return (
    <div className={`itc v2 ${info.category}`}>
      <div className="itc-head">
        <div className="itc-name">{info.name}</div>
        {isLegendary(info.name) ? <div className="itc-cost legend">Legendary <i>Street Brawl</i></div> : <div className="itc-cost"><Soul />{info.cost.toLocaleString("en-US")}</div>}
      </div>
      <div className="itc-body">
        {stats.length > 0 && (
          <div className="itc-rows">
            {stats.map((r, i) => (
              <div className={`itc-row${i === 0 ? ' main' : ''}${r.conditional ? ' cond' : ''}`} key={r.label + r.value}>
                <Val v={r.value} /><span className="lb">{r.label}</span>{r.conditional && <i className="ctag">Conditional</i>}
              </div>
            ))}
          </div>
        )}
        {bar && <div className="itc-bar"><span>{bar}</span>{cooldown && <span className="cd">{cooldown}</span>}</div>}
        {card ? (card.effect && <p className="itc-text"><Rich text={card.effect} /></p>) : (fallback!.body && <p className="itc-text"><Emph text={fallback!.body} /></p>)}
        {usage && <p className="itc-usage">{usage.icon && <img src={usage.icon} alt="" />}<span>{usage.text}</span></p>}
        {tiles.length > 0 && (
          <div className="itc-stats">
            {parts.key.length > 0 && (
              <div className="itc-tiles" style={{ ['--cols' as string]: parts.key.length } as React.CSSProperties}>
                {parts.key.map((t) => { const k = labelKind(t.label); return (
                  <div className={`tile k-${k.cls}`} key={t.label + t.value}>
                    <span className="tv">{k.icon && <i className="gl" style={{ ['--ic' as string]: `url(${k.icon})` } as React.CSSProperties} />}<Val v={t.value} /></span><i className="tlab">{t.label}</i>
                  </div>
                ); })}
              </div>
            )}
            {parts.rest.length > 0 && (
              <div className="itc-plain">
                {parts.rest.map((t) => <div key={t.label + t.value}><Val v={t.value} /> <span>{t.label}</span></div>)}
              </div>
            )}
          </div>
        )}
        {card?.note && !sameText(card.note, card.effect) && <p className="itc-note">{card.note}</p>}
        {from.length > 0 && <ItemLinks title="Upgrades from:" names={from} />}
        {into.length > 0 && <ItemLinks title="Upgrades to:" names={into} />}
        <div className="itc-src">From the game files</div>
      </div>
    </div>
  );
}
