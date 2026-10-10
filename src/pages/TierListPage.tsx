import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Controls from '../components/Controls';
import { HeroFace } from '../components/HeroFace';
import TierTag from '../components/TierTag';
import { SiteFooter } from '../components/Shell';
import { getHeroColor } from '../data/heroColors';
import { getHero, initials } from '../data/roster';
import { dataSource } from '../data/source';
import { TIER_NOTES, type TierRow } from '../data/tiers';
import { useAsync } from '../data/useAsync';
import type { Tier } from '../data/types';
import { fmtInt, fmtPct } from '../lib/stats';
import { useFavorites } from '../lib/favorites';
import { useFilters } from '../lib/useFilters';
import { useTitle } from '../lib/useTitle';

const TIERS: Tier[] = ['S+', 'S', 'A', 'B', 'C', 'D'];
type SortKey = 'score' | 'winRate' | 'pickRate' | 'banRate' | 'matches' | 'delta' | 'name';

function HeroCard({ r, query }: { r: TierRow; query: string }) {
  const h = getHero(r.slug);
  if (!h) return null;
  return (
    <Link to={`/hero/${h.slug}${query}`} className="tl-card" style={{ ['--hc' as string]: getHeroColor(h.slug) } as React.CSSProperties}>
      <span className="pic">{h.portrait ? <img src={h.portrait} alt="" loading="lazy" /> : h.icon ? <img className="icon-pic" src={h.icon} alt="" loading="lazy" /> : initials(h.name)}</span>
      <b>{h.name}</b>
      <small>{fmtPct(r.winRate)}</small><small className="pr">{fmtPct(r.pickRate)} pick</small>
    </Link>
  );
}

/** Every hero grouped S+ to D, with a sortable table view. Sample data until the live source is connected. */
export default function TierListPage() {
  useTitle('Tier list');
  const [filters, setFilters] = useFilters();
  const [view, setView] = useState<'tiers' | 'table'>('tiers');
  const [q, setQ] = useState('');
  const { favs } = useFavorites();
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'score', dir: -1 });
  const state = useAsync((signal) => dataSource.tierList(filters, signal), [filters.mode, filters.queue, filters.rank]);
  const list = state.status === 'ready' ? state.value : null;
  const rows = useMemo(() => list?.rows ?? [], [list]);
  const shown = rows.filter((r) => (!onlyFavs || favs.includes(r.slug)) && (!q.trim() || (getHero(r.slug)?.name ?? r.slug).toLowerCase().includes(q.trim().toLowerCase())));
  const query = filters.mode === 'street_brawl' ? '?mode=street_brawl' : '';
  const brawl = filters.mode === 'street_brawl';
  const sorted = useMemo(() => {
    const val = (r: TierRow): number | string => (sort.key === 'name' ? getHero(r.slug)?.name ?? r.slug : sort.key === 'banRate' ? r.banRate ?? -1 : sort.key === 'delta' ? r.delta ?? -99 : r[sort.key]);
    return [...shown].sort((a, b) => { const x = val(a), y = val(b); return (typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number)) * sort.dir; });
  }, [shown, sort]);
  const head = (key: SortKey, label: string, left = false) => (
    <th style={left ? { textAlign: 'left' } : undefined} aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="th-sort" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === 'name' ? 1 : -1 }))}>{label}{sort.key === key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}</button>
    </th>
  );
  return (
    <div className="wrap">
      <div className="dir-head">
        <div><div className="dotline">Tier list</div><h1>Who rules <em>the city</em></h1></div>
        <div className="tl-tools">
          <label className="search-box" style={{ width: 220 }}>
            <span className="icon" aria-hidden="true">{'⌕'}</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a hero" aria-label="Find a hero" />
          </label>
          <button type="button" className={`chip fav-toggle${onlyFavs ? ' on' : ''}`} aria-pressed={onlyFavs} onClick={() => setOnlyFavs((v) => !v)}>{'★'} Following</button>
          <div className="seg" role="group" aria-label="View">
            <button type="button" aria-pressed={view === 'tiers'} onClick={() => setView('tiers')}>Tiers</button>
            <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}>Table</button>
          </div>
        </div>
      </div>
      <Controls filters={filters} onChange={setFilters} />
      {state.status === 'loading' && <p className="muted" role="status">Reading the standings…</p>}
      {state.status === 'error' && <div className="panel empty" role="alert"><h3>Couldn't load the tier list</h3><p>{state.message}. Try again in a moment.</p></div>}
      {list?.illustrative && <div className="notice"><b>Illustrative data.</b> This list is a generated sample for design review, not real game statistics. Tiers weigh win rate most, then pick rate, so a hero nobody plays cannot sit at the top on a lucky streak.{brawl ? ' Street Brawl is scored on its own, separate from Standard.' : ''}</div>}
      {list && !list.illustrative && (
        <p className="muted tl-how">
          Live from the Deadlock API. Tiers weigh win rate most (80%), then pick rate (20%), so a hero nobody plays cannot sit at the top on a lucky streak. Pick and ban rate are the share of games a hero is in or banned from; a game has twelve heroes, so pick rates add up to 1,200%.{brawl ? ' Street Brawl is scored on its own, separate from Standard.' : ''}
        </p>
      )}
      {list && !list.illustrative && rows.length === 0 && <div className="panel empty"><h3>Nothing to rank yet</h3><p>{list.note ?? 'No hero has enough games with these filters.'}</p></div>}

      {list && rows.length > 0 && (view === 'tiers' ? (
        <div className="tl-rows">
          {TIERS.map((t) => {
            const list = shown.filter((r) => r.tier === t).sort((a, b) => b.score - a.score);
            return (
              <section className={`tl-row t-${t.toLowerCase().replace('+', 'p')}`} key={t} aria-label={`${t} tier`}>
                <div className="tl-cap"><TierTag tier={t} size="lg" /><small>{TIER_NOTES[t]}</small><em>{list.length} {list.length === 1 ? 'hero' : 'heroes'}</em></div>
                <div className="tl-heroes">
                  {list.length ? list.map((r) => <HeroCard key={r.slug} r={r} query={query} />) : <span className="tl-empty">{q ? 'No match' : 'Nobody here'}</span>}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="panel pad tl-table">
          <table className="data tl">
            <thead><tr>{head('name', 'Hero', true)}<th style={{ textAlign: 'center' }}>Tier</th>{head('score', 'Score')}{head('winRate', 'Win rate')}{head('delta', '7 day')}{head('pickRate', 'Pick rate')}{head('banRate', 'Ban rate')}{head('matches', 'Matches')}</tr></thead>
            <tbody>
              {sorted.map((r) => { const h = getHero(r.slug); return (
                <tr key={r.slug}>
                  <td><span className="hn">{h && <HeroFace hero={h} />}<Link to={`/hero/${r.slug}${query}`}>{h?.name ?? r.slug}</Link></span></td>
                  <td className="tiercell"><TierTag tier={r.tier} size="sm" /></td>
                  <td><span className="score">{r.score.toFixed(1)}</span></td>
                  <td className="good">{fmtPct(r.winRate)}</td>
                  {r.delta === undefined ? <td className="muted">–</td> : <td className={r.delta > 0 ? 'good' : r.delta < 0 ? 'bad' : 'muted'}>{r.delta > 0 ? '+' : r.delta < 0 ? '−' : ''}{Math.abs(r.delta).toFixed(1)}</td>}
                  <td>{fmtPct(r.pickRate)}</td>
                  <td>{r.banRate !== undefined ? fmtPct(r.banRate) : ''}</td>
                  <td className="muted">{fmtInt(r.matches)}</td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      ))}
      <SiteFooter />
    </div>
  );
}
