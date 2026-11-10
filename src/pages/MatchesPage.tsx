import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CopyCode } from '../components/BuildBoard';
import { DraftOddsBar } from '../components/DraftOdds';
import Kicker from '../components/Kicker';
import RankBadge from '../components/RankBadge';
import { SiteFooter } from '../components/Shell';
import { badgeLabel, badgeParts } from '../data/leaderboard';
import { enrichMatch, filterMatches, fmtClock, fmtSouls, MATCH_SORT_LABEL, MIN_RANKS, netWorthShare, type LiveMatch, type LivePlayer, type LiveTeam, type MatchMode, type MatchSort } from '../data/matches';
import { RANK_COLOR } from '../data/ranks';
import { getHero } from '../data/roster';
import { dataSource } from '../data/source';
import { useAsync } from '../data/useAsync';
import type { PlayerHit } from '../data/player';
import { useTitle } from '../lib/useTitle';
import { usePoll, useNowSeconds } from '../lib/usePoll';

const SORTS = Object.keys(MATCH_SORT_LABEL) as MatchSort[];
const MODES: { id: MatchMode | 'all'; label: string }[] = [{ id: 'all', label: 'All modes' }, { id: 'standard', label: 'Standard' }, { id: 'street_brawl', label: 'Street Brawl' }];
const REFRESH_MS = 30_000;
/** Games drawn at once; the feed has well over a hundred. */
const PAGE = 24;
const WATCH_TEMPLATE = (import.meta.env.VITE_WATCH_URL_TEMPLATE as string | undefined) || '';

const watchUrl = (id: string): string | null => (WATCH_TEMPLATE.includes('{id}') ? WATCH_TEMPLATE.replace('{id}', encodeURIComponent(id)) : null);

function Player({ p }: { p: LivePlayer }) {
  const hero = getHero(p.heroSlug);
  const art = hero?.icon ?? hero?.portrait;
  const face = <>{art ? <img src={art} alt="" loading="lazy" /> : <i>{hero?.name.slice(0, 1) ?? '?'}</i>}</>;
  return (
    <li className="lm-p">
      {hero ? <Link to={`/hero/${hero.slug}`} className="lm-face" aria-label={hero.name} title={hero.name}>{face}</Link> : <span className="lm-face">{face}</span>}
      {p.name && p.accountId
        ? <Link to={`/player/${p.accountId}`} className="lm-name" title={`${p.name} · ${hero?.name ?? ''}`}>{p.name}</Link>
        : <span className="lm-name" title={hero?.name}>{p.name || hero?.name || ''}</span>}
      <span className="lm-hero">{p.name ? hero?.name ?? '' : ''}</span>
    </li>
  );
}

function Team({ t }: { t: LiveTeam }) {
  return (
    <div className={`lm-team ${t.id}`}>
      <div className="lm-tl"><i aria-hidden="true" /><b>{t.label}</b><span>{fmtSouls(t.netWorth)} souls</span></div>
      <ul>{t.players.map((p, i) => <Player key={`${p.heroSlug}${i}`} p={p} />)}</ul>
    </div>
  );
}

function MatchCard({ m, now }: { m: LiveMatch; now: number }) {
  const share = netWorthShare(m);
  const lead = Math.abs(m.teams[0].netWorth - m.teams[1].netWorth);
  const leader = m.teams[0].netWorth >= m.teams[1].netWorth ? m.teams[0] : m.teams[1];
  const b = badgeParts(m.avgBadge);
  const watch = watchUrl(m.id);
  return (
    <article className="lm panel paint">
      <header className="lm-head">
        <span className="lm-live"><i aria-hidden="true" />Live</span>
        <b className="lm-clock" aria-label={`Match time ${fmtClock(now - m.startedAt)}`}>{fmtClock(now - m.startedAt)}</b>
        <span className="lm-mode">{m.mode === 'street_brawl' ? 'Street Brawl' : 'Standard'}{m.queue && m.mode !== 'street_brawl' ? ` · ${m.queue === 'ranked' ? 'Ranked' : 'Unranked'}` : ''}</span>
        {m.avgBadge > 0 && (
          <span className="lm-rank" title={`Average rank of the lobby${m.badgesKnown !== undefined ? `, from ${m.badgesKnown} of 12 players` : ''}`}>
            <RankBadge rank={b.rank} size="xs" />
            <span style={{ color: RANK_COLOR[b.rank as keyof typeof RANK_COLOR] }}>{badgeLabel(m.avgBadge)}</span>
          </span>
        )}
        {m.spectators !== undefined && <span className="lm-eye" title="People watching"><span aria-hidden="true">{'◉'}</span> {m.spectators.toLocaleString('en-US')}</span>}
      </header>

      <div className="lm-teams">
        <Team t={m.teams[0]} />
        <Team t={m.teams[1]} />
      </div>

      <div className="lm-nw" role="img" aria-label={`${leader.label} leads by ${fmtSouls(lead)} souls`}>
        <span className="hk" style={{ width: `${(share * 100).toFixed(1)}%` }} />
        <span className="am" style={{ width: `${((1 - share) * 100).toFixed(1)}%` }} />
      </div>
      <p className="lm-lead">{lead > 0 ? <><b className={leader.id}>{leader.label}</b> lead by {fmtSouls(lead)} souls</> : 'Dead even'}</p>
      {m.mode === 'standard' && <DraftOddsBar team0={m.teams[0].players} team1={m.teams[1].players} />}

      <footer className="lm-foot">
        <span className="lbl">Match ID</span>
        <CopyCode code={m.id} label="Copy ID" />
        {watch && <a className="chip" href={watch} target="_blank" rel="noreferrer noopener">Watch {'↗'}</a>}
      </footer>
    </article>
  );
}

/** Matches in progress right now: who is playing what, how long it has run, who is ahead and who is watching. */
export default function MatchesPage() {
  useTitle('Live matches');
  const [sp, setSp] = useSearchParams();
  const mode = (MODES.some((m) => m.id === sp.get('mode')) ? sp.get('mode') : 'all') as MatchMode | 'all';
  const sort = (SORTS.includes(sp.get('sort') as MatchSort) ? sp.get('sort') : 'newest') as MatchSort;
  const minId = MIN_RANKS.some((r) => r.id === sp.get('rank')) ? (sp.get('rank') as string) : 'any';
  const now = useNowSeconds();
  const state = usePoll((signal) => dataSource.liveMatches(signal), REFRESH_MS, []);

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setSp(next, { replace: true });
  };
  const all = state.status === 'ready' ? state.value : null;
  const minBadge = MIN_RANKS.find((r) => r.id === minId)?.min ?? 0;
  const [shown, setShown] = useState(PAGE);
  const live = !!all && all.length > 0;

  // The feed has hero picks but no names or ranks. Look those up for the games being shown; ranking or filtering by rank
  // needs every game's ranks, so it reads them all (a few seconds the first time, cached after).
  const needAll = minBadge > 0 || sort === 'rank';
  const ordered = useMemo(() => (all ? filterMatches(all, { mode, minBadge: 0, sort: needAll ? 'newest' : sort }) : []), [all, mode, sort, needAll]);
  const toLook = useMemo(() => (live ? (needAll ? ordered : ordered.slice(0, shown)) : []), [live, needAll, ordered, shown]);
  const lookKey = toLook.map((m) => m.id).join(',');
  const who = useAsync<Map<number, PlayerHit>>(
    (signal) => (toLook.length ? dataSource.playerHits([...new Set(toLook.flatMap((m) => m.teams.flatMap((t) => t.players.map((p) => p.accountId).filter((n): n is number => n !== undefined))))], signal) : Promise.resolve(new Map())),
    [lookKey],
  );
  const known = useMemo(() => {
    const out = new Map<number, { name?: string; avatar?: string; badge?: number }>();
    if (who.status === 'ready') for (const [id, h] of who.value) out.set(id, { name: h.name, avatar: h.avatar, badge: h.rankBadge });
    return out;
  }, [who]);
  const enriched = useMemo(() => (known.size ? (all ?? []).map((m) => enrichMatch(m, known)) : all ?? []), [all, known]);
  const list = useMemo(() => (all ? filterMatches(enriched, { mode, minBadge, sort }) : []), [all, enriched, mode, minBadge, sort]);
  const reading = live && who.status === 'loading';
  const ago = state.status === 'ready' && state.updatedAt ? Math.max(0, Math.round((Date.now() - state.updatedAt) / 1000)) : null;

  return (
    <div className="wrap mx">
      <div className="dir-head">
        <div><Kicker>On the air</Kicker><h1>Live <em>matches</em></h1></div>
        {all && <div className="mx-count"><b>{all.length}</b><span>in progress</span></div>}
      </div>
      <p className="muted mx-lead">Games being played right now, refreshed every {REFRESH_MS / 1000} seconds. Copy a match ID to find it in the game.{live ? ' Names and ranks are looked up for the games on screen.' : ''}</p>

      <div className="mx-controls">
        <div className="seg" role="group" aria-label="Game mode">
          {MODES.map((m) => <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => set({ mode: m.id === 'all' ? '' : m.id })}>{m.label}</button>)}
        </div>
        <label className="lb-region">
          <span>Rank</span>
          <select value={minId} onChange={(e) => set({ rank: e.target.value === 'any' ? '' : e.target.value })}>
            {MIN_RANKS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </label>
      </div>
      <div className="pills hub-sort" role="group" aria-label="Sort matches">
        <span className="lbl">Sort</span>
        {SORTS.map((s) => <button key={s} type="button" className="pill" aria-pressed={sort === s} onClick={() => set({ sort: s === 'newest' ? '' : s })}>{MATCH_SORT_LABEL[s]}</button>)}
        {ago !== null && <span className="hub-count" role="status">Updated {ago < 5 ? 'just now' : `${ago}s ago`}</span>}
      </div>

      {reading && <p className="muted" role="status">{needAll ? `Reading the ranks of ${toLook.length} games…` : 'Looking up names and ranks…'}</p>}
      {state.status === 'loading' && <p className="muted" role="status">Looking for live games…</p>}
      {state.status === 'error' && <div className="panel empty" role="alert"><h3>Couldn’t load live matches</h3><p>{state.message}. It will try again in {REFRESH_MS / 1000} seconds.</p></div>}
      {state.status === 'ready' && !all && <div className="panel empty"><h3>Live matches aren’t connected yet</h3><p>This page fills in once the active-matches feed is connected.</p></div>}
      {all && list.length === 0 && <div className="panel empty"><h3>No live games match</h3><p>Try another mode or a lower rank. <button type="button" className="chip" onClick={() => setSp(new URLSearchParams(), { replace: true })}>Clear filters</button></p></div>}
      {list.length > 0 && <div className="lm-grid">{(needAll ? list : list.slice(0, shown)).map((m) => <MatchCard key={m.id} m={m} now={now} />)}</div>}
      {!needAll && list.length > shown && <p className="mx-more"><button type="button" className="chip" onClick={() => setShown((n) => n + PAGE)}>Show {Math.min(PAGE, list.length - shown)} more games</button><span className="muted">{shown} of {list.length}</span></p>}
      <p className="muted hub-foot">Watching a game happens inside Deadlock itself. {WATCH_TEMPLATE ? 'Watch links open the viewer you configured.' : 'Broadway shows what is live and gives you the match ID; it does not stream the game.'} Looking for people who stream it? See <Link to="/streams">Livestreams</Link>.</p>
      <SiteFooter />
    </div>
  );
}
