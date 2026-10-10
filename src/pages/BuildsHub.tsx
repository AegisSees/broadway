import { useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { BuildPhases, BuildSkill, CopyCode } from '../components/BuildBoard';
import { ItemTile } from '../components/BuildPanel';
import HeroCombo from '../components/HeroCombo';
import Kicker from '../components/Kicker';
import { SiteFooter } from '../components/Shell';
import { browseBuilds, FILTER_LABEL, itemCount, plannerLink, SORT_LABEL, type BuildFilter, type BuildSort, type HeroBuild } from '../data/builds';
import { getHeroBg } from '../data/heroStats';
import { rankBadge } from '../data/ranks';
import { getHero } from '../data/roster';
import { dataSource } from '../data/source';
import { useAsync } from '../data/useAsync';
import { fmtInt, fmtPct } from '../lib/stats';
import { useTitle } from '../lib/useTitle';

const FILTERS = Object.keys(FILTER_LABEL) as BuildFilter[];
const SORTS = Object.keys(SORT_LABEL) as BuildSort[];
const STEP = 24;

const age = (d?: number): string | null => (d === undefined ? null : d === 0 ? 'today' : d < 14 ? `${d}d ago` : `${Math.floor(d / 7)}w ago`);

function BuildCard({ b, open, onToggle }: { b: HeroBuild; open: boolean; onToggle: () => void }) {
  const hero = getHero(b.heroSlug);
  const bg = getHeroBg(b.heroSlug);
  const names = b.phases.flatMap((p) => p.items);
  return (
    <article className={`bc panel paint${open ? ' open' : ''}`}>
      <div className="bc-art" style={bg ? { backgroundImage: `url(${bg})` } : undefined}>
        <Link to={`/hero/${b.heroSlug}`} className="bc-hero">
          {hero?.icon && <img src={hero.icon} alt="" />}
          <b>{hero?.name ?? b.heroSlug}</b>
        </Link>
        <span className={`bc-origin ${b.origin}`}>{b.origin === 'ingame' ? 'In-game' : 'Community'}</span>
        {b.eternus && <span className="bc-et"><img src={rankBadge('Eternus')} alt="" />Eternus</span>}
      </div>
      <div className="bc-body">
        <h3>{b.title}</h3>
        <p>{b.blurb}</p>
        <div className="bb-tags">{b.tags.map((t) => <span key={t} className="tagchip">{t}</span>)}</div>
        <div className="bc-items" aria-label="Items in this build">
          {names.slice(0, 12).map((it) => <ItemTile key={it.name} item={{ name: it.name, category: it.category }} />)}
        </div>
        <dl className="bc-nums">
          <div><dt>Win rate</dt><dd className={b.winRate >= 50 ? 'up' : 'down'}>{fmtPct(b.winRate)}</dd></div>
          <div><dt>Matches</dt><dd>{fmtInt(b.matches)}</dd></div>
          <div><dt>Items</dt><dd>{itemCount(b)}</dd></div>
          {b.likes !== undefined && <div><dt>Likes</dt><dd><span className="heart" aria-hidden="true">{'♥'}</span> {fmtInt(b.likes)}</dd></div>}
        </dl>
        <div className="bc-foot">
          <small>{b.author ? `by ${b.author}` : 'Built from match data'}{age(b.ageDays) ? ` · ${age(b.ageDays)}` : ''}</small>
          <div className="bc-actions">
            <CopyCode code={b.code} />
            <button type="button" className="chip" aria-expanded={open} onClick={onToggle}>{open ? 'Hide items' : 'Item paths'}</button>
            <Link className="chip" to={plannerLink(b)}>Planner {'→'}</Link>
          </div>
        </div>
      </div>
      {open && (
        <div className="bc-detail">
          <BuildPhases build={b} />
          <BuildSkill build={b} />
        </div>
      )}
    </article>
  );
}

/** Every build for every hero: filter by where it comes from (in-game, community, Eternus), sort and search. */
export default function BuildsHub() {
  const [sp, setSp] = useSearchParams();
  useTitle('Builds');
  const filter: BuildFilter = FILTERS.includes(sp.get('filter') as BuildFilter) ? (sp.get('filter') as BuildFilter) : 'all';
  const sort: BuildSort = SORTS.includes(sp.get('sort') as BuildSort) ? (sp.get('sort') as BuildSort) : 'popular';
  const hero = getHero(sp.get('hero') ?? undefined)?.slug ?? '';
  const q = sp.get('q') ?? '';
  const [shown, setShown] = useState(STEP);
  const [openId, setOpenId] = useState<string | null>(null);
  const state = useAsync((signal) => dataSource.allBuilds(signal), []);

  const all = state.status === 'ready' ? state.value : null;
  const list = useMemo(() => (all ? browseBuilds(all, { filter, sort, hero: hero || null, q }) : []), [all, filter, sort, hero, q]);

  // Links from before the planner moved to /planner carried the picked items in ?i=.
  if (sp.get('i')) return <Navigate to={`/planner?${sp.toString()}`} replace />;

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setSp(next, { replace: true });
    setShown(STEP);
  };

  return (
    <div className="wrap hub">
      <div className="dir-head">
        <div><Kicker>The workshop</Kicker><h1>Builds <em>for every hero</em></h1></div>
      </div>
      <p className="muted hub-lead">What players buy, in the order they buy it. Switch to Pro to see the highest win rate builds among Eternus players, or browse what the community has shared. Every build carries a code you can copy.</p>

      <div className="hub-controls">
        <div className="seg" role="group" aria-label="Where builds come from">
          {FILTERS.map((f) => <button key={f} type="button" aria-pressed={filter === f} onClick={() => set({ filter: f === 'all' ? '' : f })}>{FILTER_LABEL[f]}</button>)}
        </div>
        <HeroCombo value={hero} anyLabel="All heroes" onChange={(slug) => set({ hero: slug })} />
        <label className="hub-find">
          <span className="sr-only">Search builds</span>
          <input type="search" placeholder="Search builds, authors, tags" value={q} onChange={(e) => set({ q: e.target.value })} />
        </label>
      </div>
      <div className="pills hub-sort" role="group" aria-label="Sort builds">
        <span className="lbl">Sort</span>
        {SORTS.map((s) => <button key={s} type="button" className="pill" aria-pressed={sort === s} onClick={() => set({ sort: s === 'popular' ? '' : s })}>{SORT_LABEL[s]}</button>)}
        {all && <span className="hub-count">{fmtInt(list.length)} builds{filter !== 'all' ? ` · ${FILTER_LABEL[filter]}` : ''}</span>}
      </div>

      {all && all.some((b) => b.illustrative) && <div className="notice"><b>Illustrative builds.</b> Titles, authors, items and codes are invented samples. Codes start with “sample-” so they can’t be mistaken for real in-game builds.</div>}
      {state.status === 'loading' && <p className="muted" role="status">Loading builds…</p>}
      {state.status === 'error' && <div className="panel empty" role="alert"><h3>Couldn’t load builds</h3><p>{state.message}.</p></div>}
      {state.status === 'ready' && !all && <div className="panel empty"><h3>Builds aren’t connected yet</h3><p>This page fills in once the builds endpoints are connected. The planner still works: <Link className="chip" to="/planner">Open the planner {'→'}</Link></p></div>}
      {all && list.length === 0 && <div className="panel empty"><h3>No builds match</h3><p>Try another source, another hero or a shorter search. <button type="button" className="chip" onClick={() => { setSp(new URLSearchParams(), { replace: true }); }}>Clear filters</button></p></div>}

      {list.length > 0 && (
        <>
          <div className="bc-grid">
            {list.slice(0, shown).map((b) => <BuildCard key={b.id} b={b} open={openId === b.id} onToggle={() => setOpenId((c) => (c === b.id ? null : b.id))} />)}
          </div>
          {shown < list.length && (
            <div className="hub-more"><button type="button" className="pill" onClick={() => setShown((n) => n + STEP)}>Show {Math.min(STEP, list.length - shown)} more</button><small>{shown} of {list.length}</small></div>
          )}
        </>
      )}
      <p className="muted hub-foot">Want to put your own twelve together? <Link to="/planner">Open the build planner</Link>.</p>
      <SiteFooter />
    </div>
  );
}
