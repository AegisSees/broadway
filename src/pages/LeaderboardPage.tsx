import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import HeroCombo from '../components/HeroCombo';
import Kicker from '../components/Kicker';
import Pager from '../components/Pager';
import RankBadge from '../components/RankBadge';
import { SiteFooter } from '../components/Shell';
import { badgeLabel, badgeParts, MAX_ROWS, PAGE_SIZE, PAGES, playerHref, REGIONS, winRate, type LeaderboardEntry, type Region } from '../data/leaderboard';
import { RANK_COLOR } from '../data/ranks';
import { getHero } from '../data/roster';
import { getHeroBg } from '../data/heroStats';
import { getHeroColor } from '../data/heroColors';
import { dataSource } from '../data/source';
import { useAsync } from '../data/useAsync';
import { useTitle } from '../lib/useTitle';
import Avatar from '../components/Avatar';

type View = 'top' | 'heroes';
const isRegion = (s: string | null): s is Region => REGIONS.some((r) => r.id === s);
const n0 = (n: number) => n.toLocaleString('en-US');

function HeroDot({ slug }: { slug: string }) {
  const h = getHero(slug);
  if (!h) return null;
  const src = h.icon ?? h.portrait;
  return (
    <Link to={`/hero/${h.slug}`} className="lb-hero" title={h.name} aria-label={h.name}>
      {src ? <img src={src} alt="" loading="lazy" /> : <span>{h.name.slice(0, 1)}</span>}
    </Link>
  );
}

function WinRate({ e }: { e: LeaderboardEntry }) {
  const wr = winRate(e);
  if (wr === null) return <span className="muted">–</span>;
  return (
    <div className="wr" title={`${wr.toFixed(1)}% win rate`}>
      <b className={wr >= 50 ? 'up' : 'down'}>{wr.toFixed(1)}%</b>
      <span className="bar" aria-hidden="true"><i className={wr >= 50 ? 'up' : 'down'} style={{ width: `${Math.min(100, wr)}%` }} /><u /></span>
    </div>
  );
}

function Row({ e }: { e: LeaderboardEntry }) {
  const b = badgeParts(e.badge);
  const href = playerHref(e);
  const name = href ? <Link to={href}>{e.name}</Link> : <span>{e.name}</span>;
  return (
    <tr className="lb-row">
      <td className="n">{e.rank}</td>
      <td className="av"><Avatar src={e.avatar} size={36} lazy /></td>
      <td className="who">{name}</td>
      <td className="hs"><div>{e.topHeroes.map((s) => <HeroDot key={s} slug={s} />)}</div></td>
      <td className="bd">
        {e.badge > 0 ? <><RankBadge rank={b.rank} size="xs" /><span style={{ color: RANK_COLOR[b.rank as keyof typeof RANK_COLOR] }}>{badgeLabel(e.badge)}</span></> : <span className="muted">–</span>}
      </td>
      <td className="wrc"><WinRate e={e} /></td>
      <td className="wl">{e.wins === undefined || e.losses === undefined ? <span className="muted">–</span> : <><b className="w">{n0(e.wins)}</b><i>/</i><b className="l">{n0(e.losses)}</b></>}</td>
    </tr>
  );
}

function PlayerName({ e }: { e: LeaderboardEntry }) {
  const href = playerHref(e);
  return href ? <Link to={href}>{e.name}</Link> : <span>{e.name}</span>;
}

const games = (e: LeaderboardEntry) => (e.wins === undefined || e.losses === undefined ? undefined : e.wins + e.losses);

function RankLine({ e, size }: { e: LeaderboardEntry; size: 'sm' | 'md' }) {
  if (!(e.badge > 0)) return null;
  const b = badgeParts(e.badge);
  return <div className="lb5-rank"><RankBadge rank={b.rank} size={size} /><b style={{ color: RANK_COLOR[b.rank as keyof typeof RANK_COLOR] }}>{badgeLabel(e.badge)}</b></div>;
}

function Nums({ e }: { e: LeaderboardEntry }) {
  const wr = winRate(e);
  const g = games(e);
  return (
    <dl className="lb5-nums">
      {wr !== null && <div><dd className={wr >= 50 ? 'up' : 'down'}>{wr.toFixed(1)}%</dd><dt>Win rate</dt></div>}
      {g !== undefined && <div><dd>{n0(g)}</dd><dt>Games</dt></div>}
    </dl>
  );
}

/**
 * The top five (Round 58, after a reference V liked): number one on a wide dark banner with their main hero's art on
 * the right, then two to five as four identical dark cards. Every card reads the same way: place, avatar and name
 * on one line, the rank under it, then win rate, games and most played heroes. Thin lines, no colour fills.
 */
function TopFive({ rows, label }: { rows: LeaderboardEntry[]; label: string }) {
  const [one, ...rest] = rows;
  const heroOf = one.topHeroes[0];
  const h1 = getHero(heroOf);
  const art = h1 ? (h1.render ?? h1.art ?? h1.portrait) : undefined;
  return (
    <section className="lb5" aria-label="The top five players" style={{ ['--hc' as string]: getHeroColor(heroOf ?? 'haze') } as React.CSSProperties}>
      <article className="lb5-one">
        {art && <img className="lb5-art" src={art} alt="" loading="lazy" />}
        <div className="lb5-big" aria-hidden="true">1</div>
        <div className="lb5-info">
          <span className="lb5-kick">#1 in {label}</span>
          <h2><Avatar src={one.avatar} size={44} /><PlayerName e={one} /></h2>
          <RankLine e={one} size="sm" />
          <div className="lb5-foot">
            <Nums e={one} />
            {one.topHeroes.length > 0 && <div className="lb5-heroes"><div className="hs"><div>{one.topHeroes.map((s) => <HeroDot key={s} slug={s} />)}</div></div><span>Most played</span></div>}
          </div>
        </div>
      </article>
      <div className="lb5-row">
        {rest.map((e) => (
          <article key={e.rank} className={`lb5-card p${e.rank}`}>
            <h3><span className="lb5-no">{e.rank}</span><Avatar src={e.avatar} size={32} /><PlayerName e={e} /></h3>
            <RankLine e={e} size="sm" />
            <div className="lb5-foot">
              <Nums e={e} />
              <div className="hs"><div>{e.topHeroes.map((s) => <HeroDot key={s} slug={s} />)}</div></div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Board({ region, regionLabel, hero, label, page, onPage }: { region: Region; regionLabel: string; hero: string | null; label: string; page: number; onPage: (n: number) => void }) {
  const state = useAsync((signal) => dataSource.leaderboard(region, hero, signal), [region, hero]);
  const [q, setQ] = useState('');
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => { setQ(''); }, [region, hero]);

  const rows = state.status === 'ready' ? state.value.slice(0, MAX_ROWS) : [];
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? rows.filter((r) => r.name.toLowerCase().includes(t)) : rows;
  }, [rows, q]);
  const pages = Math.max(1, Math.min(PAGES, Math.ceil(filtered.length / PAGE_SIZE)));
  const cur = Math.min(Math.max(1, page), pages);
  const slice = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  const extras = useAsync((signal) => dataSource.playerExtras(slice, hero, signal), [region, hero, cur, q, state.status]);
  const merged = useMemo(() => {
    const ex = extras.status === 'ready' ? extras.value : null;
    return slice.map((e) => {
      const x = ex?.get(e.rank);
      return x ? { ...e, accountId: e.accountId ?? x.accountId, alt: x.alt, avatar: e.avatar ?? x.avatar, badge: e.badge || x.badge || 0, wins: e.wins ?? x.wins, losses: e.losses ?? x.losses, topHeroes: x.heroes?.length ? x.heroes : e.topHeroes } : e;
    });
  }, [slice, extras]);

  // players the lookups found nothing for (no rank, record or avatar) are left out once the lookups are done (V)
  const known = extras.status !== 'ready' ? merged : merged.filter((e) => e.sample || e.badge > 0 || e.wins !== undefined);
  const hidden = merged.length - known.length;
  const showTop = cur === 1 && !q.trim() && known.length >= 5;
  const tableRows = showTop ? known.slice(5) : known;
  const go = (n: number) => { onPage(n); window.setTimeout(() => top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0); };
  const first = (cur - 1) * PAGE_SIZE + 1;

  return (
    <>
    {showTop && <TopFive rows={known.slice(0, 5)} label={regionLabel} />}
    <div className="panel lb-board" ref={top}>
      <div className="lb-bar">
        <h3>{label}</h3>
        <label className="lb-find"><span className="sr-only">Find a player in this list</span>
          <input type="search" placeholder="Find a player in this list" value={q} onChange={(e) => { setQ(e.target.value); onPage(1); }} />
        </label>
      </div>
      {rows.some((r) => r.sample) && <div className="notice lb-note"><b>Illustrative ladder.</b> Handles, avatars and records are invented. Switch to live data in the header to see real players.</div>}
      {rows.length > 0 && !rows[0].sample && extras.status === 'loading' && <p className="muted lb-msg" role="status">Looking up avatars, ranks and records…</p>}
      {state.status === 'loading' && <p className="muted lb-msg" role="status">Loading the ladder…</p>}
      {state.status === 'error' && <p className="lb-msg" role="alert">Couldn't load this leaderboard: {state.message}.</p>}
      {state.status === 'ready' && rows.length === 0 && <p className="muted lb-msg">No leaderboard entries for this selection yet.</p>}
      {rows.length > 0 && (
        <>
          <div className="lb-tablewrap">
            <table className="lb-table">
              <thead><tr><th className="n">#</th><th className="av"><span className="sr-only">Avatar</span></th><th>Player</th><th>Most played</th><th>Rank</th><th>Win rate</th><th className="wl">W / L</th></tr></thead>
              <tbody>{tableRows.map((e) => <Row key={e.rank} e={e} />)}</tbody>
            </table>
            {slice.length === 0 && <p className="muted lb-msg">Nobody in this list matches “{q}”.</p>}
          </div>
          <div className="lb-foot">
            <span>{slice.length ? `Showing ${first} to ${first + slice.length - 1} of ${filtered.length}` : 'Showing 0'}{hidden > 0 ? ` · ${hidden} without a public profile left out` : ''}</span>
            <Pager page={cur} pages={pages} onPage={go} label="Leaderboard pages" />
          </div>
        </>
      )}
    </div>
    </>
  );
}

export default function LeaderboardPage() {
  const [sp, setSp] = useSearchParams();
  const view: View = sp.get('view') === 'heroes' ? 'heroes' : 'top';
  const region: Region = isRegion(sp.get('region')) ? (sp.get('region') as Region) : 'NAmerica';
  const heroSlug = getHero(sp.get('hero') ?? undefined)?.slug ?? 'haze';
  const hero = getHero(heroSlug)!;
  const page = Math.min(PAGES, Math.max(1, Number(sp.get('page')) || 1));
  useTitle('Leaderboard');

  const set = (patch: Record<string, string>, resetPage = true) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) next.set(k, v);
    if (resetPage) next.delete('page');
    setSp(next, { replace: true });
  };
  const regionLabel = REGIONS.find((r) => r.id === region)!.label;
  const bg = getHeroBg(heroSlug);

  return (
    <div className="wrap lb">
      <div className="dir-head"><div><Kicker>Leaderboard</Kicker><h1>The top <em>of the city</em></h1></div></div>

      <div className="lb-controls">
        <div className="seg" role="group" aria-label="Leaderboard view">
          <button type="button" aria-pressed={view === 'top'} onClick={() => set({ view: 'top' })}>Top players</button>
          <button type="button" aria-pressed={view === 'heroes'} onClick={() => set({ view: 'heroes' })}>By hero</button>
        </div>
        <label className="lb-region">
          <span>Region</span>
          <select value={region} onChange={(e) => set({ region: e.target.value })}>
            {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </label>
        {view === 'heroes' && <HeroCombo value={heroSlug} onChange={(slug) => set({ hero: slug })} />}
      </div>

      {view === 'top' && <Board region={region} regionLabel={regionLabel} hero={null} label={`Top players · ${regionLabel}`} page={page} onPage={(n) => set({ page: String(n) }, false)} />}

      {view === 'heroes' && (
        <>
          <div className="lb-herohead" style={{ ['--hc' as string]: getHeroColor(heroSlug) } as React.CSSProperties}>
            {bg && <div className="bg" style={{ backgroundImage: `url(${bg})` }} aria-hidden="true" />}
            <div className="txt"><small>Best {hero.name} players</small><b>{hero.name}</b></div>
            <Link to={`/hero/${hero.slug}`} className="chip">Open {hero.name}</Link>
          </div>
          <Board region={region} regionLabel={regionLabel} hero={heroSlug} label={`${hero.name} · ${regionLabel}`} page={page} onPage={(n) => set({ page: String(n) }, false)} />
        </>
      )}

      <p className="muted lb-rules">
        {view === 'top'
          ? 'Players need 75 matches in the last 30 days to be listed. Each shows up to three of their highest-rated heroes.'
          : `Hero boards list players with at least 30 matches and 100 wins on ${hero.name} in the last 30 days, and the record shown is on ${hero.name}.`}{' '}
        The game keeps the top 1,000 per region; Broadway shows the first 500 for now. See <Link to="/ranks">rank distribution</Link> for how the whole ladder is spread.
      </p>
      <SiteFooter />
    </div>
  );
}
