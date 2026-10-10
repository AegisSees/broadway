import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Complexity } from '../components/HeroStatsPanel';
import { SiteFooter } from '../components/Shell';
import { getHeroColor } from '../data/heroColors';
import { attrLabel, getHeroBg, getHeroStats, statsAtBoon, type HeroBaseStats } from '../data/heroStats';
import { dataSource } from '../data/source';
import { useAsync } from '../data/useAsync';
import { useFilters } from '../lib/useFilters';
import { pct } from '../lib/stats';
import { getWordmark } from '../data/names';
import { getHero, HEROES, initials } from '../data/roster';
import { useTitle } from '../lib/useTitle';

const n = (v: number | null | undefined, d = 0) => (v === null || v === undefined || !Number.isFinite(v) ? '–' : v.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }));

interface Row { label: string; a: number | null; b: number | null; digits?: number; unit?: string; lowerIsBetter?: boolean; hint?: string }

function rowsFor(sa: HeroBaseStats, sb: HeroBaseStats, boon: number): { group: string; rows: Row[] }[] {
  const a = statsAtBoon(sa, boon), b = statsAtBoon(sb, boon);
  return [
    { group: 'Vitality', rows: [
      { label: 'Health', a: a.health, b: b.health },
      { label: 'Health regen', a: sa.regen, b: sb.regen, digits: 1, unit: '/s' },
      { label: 'Move speed', a: sa.move, b: sb.move, digits: 1, unit: ' m/s' },
      { label: 'Sprint bonus', a: sa.sprint, b: sb.sprint, digits: 1, unit: ' m/s' },
      { label: 'Stamina', a: sa.stamina, b: sb.stamina },
    ] },
    { group: 'Weapon', rows: [
      { label: 'Damage per shot', a: a.bulletDamage === null ? null : a.bulletDamage * sa.weapon.pellets, b: b.bulletDamage === null ? null : b.bulletDamage * sb.weapon.pellets, digits: 1, hint: 'All pellets of one shot' },
      { label: 'Damage per second', a: a.dps, b: b.dps },
      { label: 'Shots per second', a: sa.weapon.rps, b: sb.weapon.rps, digits: 1 },
      { label: 'Magazine', a: sa.weapon.clip, b: sb.weapon.clip },
      { label: 'Reload time', a: sa.weapon.reload, b: sb.weapon.reload, digits: 2, unit: 's', lowerIsBetter: true },
      { label: 'Falloff ends at', a: sa.weapon.falloffEnd, b: sb.weapon.falloffEnd, unit: ' m' },
    ] },
    { group: 'Melee & spirit', rows: [
      { label: 'Light melee', a: a.light, b: b.light },
      { label: 'Heavy melee', a: a.heavy, b: b.heavy },
      { label: 'Spirit power per boon', a: sa.perBoon.spirit, b: sb.perBoon.spirit, digits: 2 },
    ] },
  ];
}

function Pick({ value, other, onPick }: { value: string; other: string; onPick: (slug: string) => void }) {
  return (
    <label className="cmp-pick">
      <span className="sr-only">Choose hero</span>
      <select value={value} onChange={(e) => onPick(e.target.value)}>
        {HEROES.filter((h) => getHeroStats(h.slug)).map((h) => <option key={h.slug} value={h.slug} disabled={h.slug === other}>{h.name}</option>)}
      </select>
    </label>
  );
}

function Head({ slug, side }: { slug: string; side: 'a' | 'b' }) {
  const h = getHero(slug); const s = getHeroStats(slug);
  if (!h || !s) return null;
  const wm = getWordmark(slug); const bg = getHeroBg(slug);
  return (
    <div className={`cmp-head ${side}`} style={{ ['--hc' as string]: getHeroColor(slug) } as React.CSSProperties}>
      {bg && <i className="bg" style={{ backgroundImage: `url(${bg})` }} aria-hidden="true" />}
      <Link to={`/hero/${slug}`} className="pic">{h.portrait ? <img src={h.portrait} alt="" /> : h.icon ? <img className="icon-pic" src={h.icon} alt="" /> : <span>{initials(h.name)}</span>}</Link>
      <div className="nm">
        {wm ? <img className="wm" src={wm} alt={h.name} /> : <b>{h.name}</b>}
        <small>{s.type || 'New hero'}{s.complexity ? <> · <Complexity n={s.complexity} /></> : null}</small>
        <small>{s.weapon.attrs.map(attrLabel).join(' · ')}</small>
      </div>
    </div>
  );
}

/** Two heroes side by side: game-file stat sheet, plus their head-to-head record when live data is connected. */
export default function ComparePage() {
  const params = useParams();
  const nav = useNavigate();
  const a = getHeroStats(params.a) ? (params.a as string) : 'haze';
  const b = getHeroStats(params.b) && params.b !== a ? (params.b as string) : a === 'abrams' ? 'haze' : 'abrams';
  const boon = 1;
  const [filters] = useFilters();
  const h2h = useAsync((signal) => dataSource.headToHead(a, b, filters, signal), [a, b, filters.mode, filters.queue, filters.rank]);
  useTitle(`${getHero(a)?.name ?? ''} vs ${getHero(b)?.name ?? ''}`);
  const sa = getHeroStats(a)!, sb = getHeroStats(b)!;
  const groups = useMemo(() => rowsFor(sa, sb, boon), [sa, sb]);
  const go = (x: string, y: string) => nav(`/compare/${x}/${y}`);
  let wa = 0, wb = 0;
  groups.forEach((g) => g.rows.forEach((r) => { if (r.a === null || r.b === null || r.a === r.b) return; const aw = r.lowerIsBetter ? r.a < r.b : r.a > r.b; aw ? wa++ : wb++; }));
  return (
    <div className="wrap cmp">
      <div className="dir-head"><div><div className="dotline">Head to head</div><h1>Compare <em>heroes</em></h1></div></div>
      <p className="muted cmp-lead">Stats at spawn straight from the game files. This is a stat sheet, not a verdict: abilities, items and skill decide most fights.</p>
      <div className="cmp-top">
        <Head slug={a} side="a" /><div className="vs" aria-hidden="true">VS</div><Head slug={b} side="b" />
        <Pick value={a} other={b} onPick={(x) => go(x, b)} />
        <button type="button" className="swap" onClick={() => go(b, a)} aria-label="Swap heroes">{'⇄'}</button>
        <Pick value={b} other={a} onPick={(x) => go(a, x)} />
      </div>
      <div className="cmp-score" aria-live="polite"><span className={wa >= wb ? 'lead' : ''}>{getHero(a)?.name} ahead in <b>{wa}</b></span><span className={wb > wa ? 'lead' : ''}>{getHero(b)?.name} ahead in <b>{wb}</b></span></div>
      <section className="panel cmp-h2h" aria-live="polite">
        <h3>Head to head</h3>
        {h2h.status === 'loading' && <p className="muted">Loading their record…</p>}
        {h2h.status === 'error' && <p>Couldn't load their record: {h2h.message}.</p>}
        {h2h.status === 'ready' && h2h.value && (
          <div className="h2h-body">
            <b>{getHero(a)?.name} wins {pct(h2h.value.winsA, h2h.value.matches).toFixed(1)}%</b>
            <span>of {h2h.value.matches.toLocaleString('en-US')} matches where both heroes were on opposite teams. {getHero(b)?.name} wins {pct(h2h.value.matches - h2h.value.winsA, h2h.value.matches).toFixed(1)}%.</span>
          </div>
        )}
        {h2h.status === 'ready' && !h2h.value && (
          <p className="muted">{dataSource.id === 'fixture' ? 'Their win rate against each other appears here once live match data is connected.' : 'Not enough matches between these two heroes with the current filters.'}</p>
        )}
        <p className="h2h-links"><Link className="chip" to={`/planner?hero=${a}`}>Plan a {getHero(a)?.name} build {'→'}</Link><Link className="chip" to={`/planner?hero=${b}`}>Plan a {getHero(b)?.name} build {'→'}</Link></p>
      </section>
      {groups.map((g) => (
        <section className="panel cmp-group" key={g.group}>
          <h3>{g.group}</h3>
          {g.rows.map((r) => {
            const hi = r.a === null || r.b === null || r.a === r.b ? 0 : (r.lowerIsBetter ? r.a < r.b : r.a > r.b) ? 1 : 2;
            const mx = Math.max(r.a ?? 0, r.b ?? 0) || 1;
            return (
              <div className="cmp-row" key={r.label} title={r.hint}>
                <div className={`va a${hi === 1 ? ' win' : ''}`}><b>{n(r.a, r.digits)}<i>{r.unit}</i></b><span className="bar"><em style={{ width: `${((r.a ?? 0) / mx) * 100}%` }} /></span></div>
                <div className="lb">{r.label}</div>
                <div className={`va b${hi === 2 ? ' win' : ''}`}><b>{n(r.b, r.digits)}<i>{r.unit}</i></b><span className="bar"><em style={{ width: `${((r.b ?? 0) / mx) * 100}%` }} /></span></div>
              </div>
            );
          })}
        </section>
      ))}
      <SiteFooter />
    </div>
  );
}
