import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ItemCard from '../components/ItemCard';
import NextBuy from '../components/NextBuy';
import Kicker from '../components/Kicker';
import { SiteFooter } from '../components/Shell';
import Tip from '../components/Tip';
import { getHeroStats } from '../data/heroStats';
import { ALL_ITEM_NAMES, getItem, getItemCard, itemFromSlug, itemSlug, type ItemInfo } from '../data/items';
import { getHero, HEROES } from '../data/roster';
import type { ItemCategory } from '../data/types';
import { boonForSouls, project, totalCost, totalStats } from '../lib/buildStats';
import { INVEST_BONUS, INVEST_LABEL, INVEST_STEPS, KEY_STEP, investmentBonuses } from '../lib/investment';
import { deleteBuild, saveBuild, useSavedBuilds } from '../lib/savedBuilds';
import { fmtInt } from '../lib/stats';
import { useTitle } from '../lib/useTitle';

const SLOTS = 12;
const CATS: { id: ItemCategory | 'all'; label: string }[] = [{ id: 'all', label: 'All' }, { id: 'weapon', label: 'Weapon' }, { id: 'vitality', label: 'Vitality' }, { id: 'spirit', label: 'Spirit' }];
const f1 = (n: number, d = 0) => n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });

function parseItems(csv: string | null): string[] {
  if (!csv) return [];
  const out: string[] = [];
  for (const s of csv.split(',')) { const n = itemFromSlug(s); if (n && !out.includes(n) && getItem(n)?.tier !== 5) out.push(n); }
  return out.slice(0, SLOTS);
}

/** Enemy items may repeat (two enemies can hold the same one), so they skip the de-duplication above. */
function parseList(csv: string | null, max: number): string[] {
  return (csv ?? '').split(',').map((s) => itemFromSlug(s)).filter((n): n is string => !!n && (getItem(n)?.tier ?? 5) < 5).slice(0, max);
}
const parseHeroes = (csv: string | null) => [...new Set((csv ?? '').split(','))].filter((s) => !!getHero(s)).slice(0, 6);
/** Souls spent on items, roughly 1,000 a minute in a normal game (the average player earns about 1,150 a minute). */
const minuteFor = (cost: number) => Math.min(50, Math.max(1, Math.round(cost / 1000)));

/** Build planner: pick up to twelve items, see the cost, the always-on stat totals and what a hero looks like with them. */
export default function PlannerPage() {
  useTitle('Build planner');
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<string[]>(() => parseItems(params.get('i')));
  const [hero, setHero] = useState<string>(() => (getHeroStats(params.get('hero') ?? '') ? (params.get('hero') as string) : ''));
  const [enemies, setEnemies] = useState<string[]>(() => parseHeroes(params.get('vs')));
  const [enemyItems, setEnemyItems] = useState<string[]>(() => parseList(params.get('ei'), 36));
  const [minuteSet, setMinuteSet] = useState<number | null>(() => { const m = Number(params.get('min')); return m >= 1 && m <= 50 ? Math.round(m) : null; });
  const [cat, setCat] = useState<ItemCategory | 'all'>('all');
  const [q, setQ] = useState('');
  const [name, setName] = useState('');
  const [copied, setCopied] = useState(false);
  const saved = useSavedBuilds();

  useEffect(() => {
    const next = new URLSearchParams();
    if (hero) next.set('hero', hero);
    if (items.length) next.set('i', items.map((n) => itemSlug(n)).filter(Boolean).join(','));
    if (enemies.length) next.set('vs', enemies.join(','));
    if (enemyItems.length) next.set('ei', enemyItems.map((n) => itemSlug(n)).filter(Boolean).join(','));
    if (minuteSet !== null) next.set('min', String(minuteSet));
    setParams(next, { replace: true });
  }, [items, hero, enemies, enemyItems, minuteSet, setParams]);

  const all = useMemo(() => ALL_ITEM_NAMES.map((n) => getItem(n)).filter((i): i is ItemInfo => !!i && i.tier !== 5), []);
  const needle = q.trim().toLowerCase();
  const shown = all.filter((i) => (cat === 'all' || i.category === cat) && (!needle || i.name.toLowerCase().includes(needle)));
  const picked = items.map((n) => getItem(n)!).filter(Boolean);
  const cost = totalCost(items);
  const totals = useMemo(() => totalStats(items), [items]);
  const heroStats = getHeroStats(hero);
  const proj = useMemo(() => (heroStats ? project(heroStats, items) : null), [heroStats, items]);
  const baseBoon = heroStats ? boonForSouls(heroStats.gold, cost) : 1;
  const inv = useMemo(() => investmentBonuses(items), [items]);
  const split = (['weapon', 'vitality', 'spirit'] as const).map((c) => ({ c, n: picked.filter((p) => p.category === c).length, souls: inv[c].souls }));
  const actives = items.filter((n) => { const k = getItemCard(n)?.kind; return k === 'Active' || k === 'Passive+Active'; });

  const add = (n: string) => setItems((cur) => (cur.includes(n) || cur.length >= SLOTS ? cur : [...cur, n]));
  const remove = (n: string) => setItems((cur) => cur.filter((x) => x !== n));
  const share = () => { void navigator.clipboard?.writeText(window.location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }); };
  const load = (b: { hero: string; items: string[] }) => { setHero(b.hero); setItems(b.items.filter((n) => getItem(n)).slice(0, SLOTS)); };

  return (
    <div className="wrap bp">
      <div className="dir-head">
        <div><Kicker>Build planner</Kicker><h1>Plan <em>your twelve</em></h1></div>
        <label className="bp-hero">
          <span className="sr-only">Hero for projections</span>
          <select value={hero} onChange={(e) => setHero(e.target.value)} aria-label="Hero for projections">
            <option value="">No hero (items only)</option>
            {HEROES.filter((h) => getHeroStats(h.slug)).map((h) => <option key={h.slug} value={h.slug}>{h.name}</option>)}
          </select>
        </label>
      </div>
      <p className="muted shop-hint">Click items to add them, click a slot to remove it. The link in your address bar is the build, so copy it to share. Totals add up always-on bonuses only; conditional effects and unit-specific rules are left out.</p>

      <div className="bp-grid">
        <div className="bp-main">
          <section className="panel bp-slots" aria-label="Your build">
            <div className="slots">
              {Array.from({ length: SLOTS }, (_, i) => {
                const it = picked[i];
                return it ? (
                  <Tip key={it.name} className="slot-host" prefer="below" delay={120} content={<ItemCard item={{ name: it.name, category: it.category }} />}>
                    <button type="button" className={`slot full ${it.category}`} onClick={() => remove(it.name)} aria-label={`Remove ${it.name}`}>
                      <span className="im">{it.icon ? <img src={it.icon} alt="" /> : <b>{it.name[0]}</b>}</span>
                      <span className="nm">{it.name}</span><span className="c">{fmtInt(it.cost)}</span>
                    </button>
                  </Tip>
                ) : <div key={`e${i}`} className="slot empty" aria-label="Empty slot"><span>{i + 1}</span></div>;
              })}
            </div>
            <div className="bp-actions">
              <button type="button" className="chip" onClick={share} disabled={!items.length}>{copied ? 'Link copied' : 'Copy link'}</button>
              <button type="button" className="chip" onClick={() => setItems([])} disabled={!items.length}>Clear</button>
              <span className="grow" />
              <input className="bp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this build" aria-label="Build name" maxLength={40} />
              <button type="button" className="chip on" disabled={!items.length} onClick={() => { saveBuild({ name: name.trim() || (getHero(hero)?.name ? `${getHero(hero)!.name} build` : 'My build'), hero, items }); setName(''); }}>Save</button>
            </div>
          </section>

          <section className="panel bp-pick" aria-label="Item picker">
            <div className="bp-filters">
              <div className="seg" role="group" aria-label="Category">
                {CATS.map((c) => <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.label}</button>)}
              </div>
              <label className="search-box" style={{ width: 240 }}>
                <span className="icon" aria-hidden="true">{'⌕'}</span>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items" aria-label="Search items" />
              </label>
            </div>
            {[1, 2, 3, 4].map((t) => {
              const list = shown.filter((i) => i.tier === t).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
              if (!list.length) return null;
              return (
                <div className="bp-tier" key={t}>
                  <div className="sprice">{fmtInt(list[0].cost)}</div>
                  <div className="bp-tiles">
                    {list.map((i) => {
                      const has = items.includes(i.name);
                      return (
                        <Tip key={i.name} className="stile-host" prefer="side" delay={140} content={<ItemCard item={{ name: i.name, category: i.category }} />}>
                          <button type="button" className={`stile ${i.category}${has ? ' sel' : ''}`} onClick={() => (has ? remove(i.name) : add(i.name))} aria-pressed={has} disabled={!has && items.length >= SLOTS}>
                            <span className="im">{i.icon ? <img src={i.icon} alt="" loading="lazy" /> : <b>{i.name[0]}</b>}{i.imbue && <em className="imb">Imbue</em>}</span>
                            <span className="nm">{i.name}</span>
                          </button>
                        </Tip>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {!shown.length && <p className="muted">No items match.</p>}
          </section>
        </div>

        <aside className="bp-side">
          <section className="panel bp-sum">
            <div className="souls"><small>Total cost</small><b>{fmtInt(cost)}</b><i>souls</i></div>
            {heroStats && <p className="boon">Roughly <b>boon {baseBoon}</b> worth of souls for {getHero(hero)?.name}.</p>}
          </section>

          <section className="panel bp-inv" aria-label="Souls invested">
            <h3>Souls invested</h3>
            <p className="muted">Spending in a category unlocks a growing bonus. Items you pick count by their price.</p>
            {split.map(({ c, n }) => {
              const st = inv[c];
              const lab = INVEST_LABEL[c];
              return (
                <div className={`inv ${c}`} key={c}>
                  <div className="top"><span className="cat">{c}<small>{n} {n === 1 ? 'item' : 'items'}</small></span><b>{fmtInt(st.souls)}</b></div>
                  <div className="trk" role="img" aria-label={`${fmtInt(st.souls)} souls in ${c}, step ${st.step} of ${INVEST_STEPS.length}`}>
                    <span className="fill" style={{ width: `${st.fill * 100}%` }} />
                    {INVEST_STEPS.map((at, i) => <i key={i} className={`${i < st.step ? 'hit' : ''}${at === KEY_STEP ? ' key' : ''}`} style={{ left: `${((i + 1) / INVEST_STEPS.length) * 100}%` }} />)}
                  </div>
                  <div className="ticks" aria-hidden="true">
                    <span style={{ left: `${(1 / INVEST_STEPS.length) * 100}%` }}>800</span>
                    <span className={`key${st.souls >= KEY_STEP ? ' hit' : ''}`} style={{ left: `${((INVEST_STEPS.indexOf(KEY_STEP) + 1) / INVEST_STEPS.length) * 100}%` }}>4.8K</span>
                    <span style={{ left: '100%' }}>28.8K</span>
                  </div>
                  <div className="bn">
                    <span>{st.step ? <><b>+{st.bonus}{lab.unit}</b> {lab.text}</> : <span className="muted">No bonus yet</span>}</span>
                    <span className="muted">{st.next ? `${fmtInt(st.next.at - st.souls)} to +${st.next.bonus}${lab.unit}` : 'Top step reached'}</span>
                  </div>
                  <div className={`spike${st.souls >= KEY_STEP ? ' hit' : ''}`}>
                    <b>4.8K</b>
                    <span>The big jump: +{INVEST_BONUS[c][INVEST_STEPS.indexOf(KEY_STEP) - 1]}{lab.unit} {'→'} +{INVEST_BONUS[c][INVEST_STEPS.indexOf(KEY_STEP)]}{lab.unit} {lab.text}</span>
                    <em>{st.souls >= KEY_STEP ? 'Reached' : `${fmtInt(KEY_STEP - st.souls)} to go`}</em>
                  </div>
                </div>
              );
            })}
            <small className="inv-src">Steps from the Deadlock Wiki's investment table (800 to 28,800 souls). Not yet read from the game files.</small>
          </section>

          <NextBuy
            hero={hero} owned={items} minute={minuteSet ?? minuteFor(cost)} autoMinute={minuteSet === null} enemies={enemies} enemyItems={enemyItems} full={items.length >= SLOTS}
            onAdd={add} onMinute={setMinuteSet} onEnemies={setEnemies} onEnemyItems={setEnemyItems}
          />

          {proj && heroStats && (
            <section className="panel bp-proj">
              <h3>{getHero(hero)?.name} with this build</h3>
              <p className="muted">At boon {proj.boon}, with every always-on item bonus and the souls-invested bonuses applied.</p>
              <dl>
                <div><dt>Health</dt><dd>{f1(proj.health)}</dd></div>
                <div><dt>Bullet damage</dt><dd>{proj.bulletDamage === null ? '–' : f1(proj.bulletDamage, 2)}</dd></div>
                <div><dt>Damage per second</dt><dd>{proj.dps === null ? '–' : f1(proj.dps)}</dd></div>
                <div><dt>Magazine</dt><dd>{proj.magazine ?? '–'}</dd></div>
                <div><dt>Spirit power</dt><dd>{f1(proj.spirit)}</dd></div>
                <div><dt>Move speed</dt><dd>{f1(proj.move, 1)} m/s</dd></div>
              </dl>
              <Link className="chip" to={`/hero/${hero}`}>Open {getHero(hero)?.name} {'→'}</Link>
            </section>
          )}

          <section className="panel bp-tot">
            <h3>Stat totals</h3>
            {totals.length === 0 && <p className="muted">Add items to see what they give together.</p>}
            <ul>
              {totals.map((t) => (
                <li key={t.label} title={t.from.join(', ')}>
                  <span>{t.label}</span>
                  <b className={t.total < 0 ? 'neg' : ''}>{t.total > 0 && !t.resist ? '+' : ''}{f1(t.total, Math.abs(t.total) < 10 && t.unit !== '' ? 1 : t.total % 1 ? 1 : 0)}{t.unit}</b>
                  {t.resist && <small>stacked</small>}
                </li>
              ))}
            </ul>
          </section>

          {actives.length > 0 && (
            <section className="panel bp-act">
              <h3>Active items</h3>
              <ul>{actives.map((n) => <li key={n}><span>{n}</span><b>{getItemCard(n)?.cooldown ?? ''}</b></li>)}</ul>
            </section>
          )}

          {saved.length > 0 && (
            <section className="panel bp-saved">
              <h3>Saved on this device</h3>
              <ul>
                {saved.map((b) => (
                  <li key={b.id}>
                    <button type="button" className="ld" onClick={() => load(b)}><b>{b.name}</b><small>{getHero(b.hero)?.name ?? 'Any hero'} · {b.items.length} items</small></button>
                    <button type="button" className="rm" onClick={() => deleteBuild(b.id)} aria-label={`Delete ${b.name}`}>{'×'}</button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
      <SiteFooter />
    </div>
  );
}
