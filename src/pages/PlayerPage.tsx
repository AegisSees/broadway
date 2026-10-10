import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { CopyCode } from '../components/BuildBoard';
import { HeroFace } from '../components/HeroFace';
import Kicker from '../components/Kicker';
import RankBadge from '../components/RankBadge';
import RankHistory from '../components/RankHistory';
import { SiteFooter } from '../components/Shell';
import { getHeroColor } from '../data/heroColors';
import { getHeroBg } from '../data/heroStats';
import { badgeLabel } from '../data/leaderboard';
import {
  fmtDuration, fmtHours, formSummary, heroesIn, kdaRatio, QUEUE_LABEL, timeAgo, winPct,
  type PlayerCore, type PlayerHeroLine, type PlayerMate, type PlayerMatchLine, type PlayerMatches, type QueueKind,
} from '../data/player';
import { RANK_COLOR } from '../data/ranks';
import { getHero } from '../data/roster';
import { dataSource } from '../data/source';
import { useAsync } from '../data/useAsync';
import { rememberPlayer } from '../lib/recentPlayers';
import { safeSteamHref, toAccountId, toSteam64 } from '../lib/steam';
import { fmtInt } from '../lib/stats';
import { useTitle } from '../lib/useTitle';
import PlayerLookup from './PlayerLookup';
import Avatar from '../components/Avatar';
import SkinScope, { SkinSwitch } from '../skin/SkinScope';
import SectionHeading from '../skin/SectionHeading';
import { getSkin } from '../skin/heroSkins';
import { useSkinOn } from '../skin/pref';
import type { HeroSkin } from '../skin/types';

const n0 = (n: number) => n.toLocaleString('en-US');
const souls = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(Math.round(n)));
const DAY_S = 86400;

function WinRate({ wins, matches }: { wins: number; matches: number }) {
  const wr = winPct(wins, matches);
  if (wr === null) return <span className="muted">–</span>;
  return (
    <div className="wr" title={`${wr.toFixed(1)}% win rate`}>
      <b className={wr >= 50 ? 'up' : 'down'}>{wr.toFixed(1)}%</b>
      <span className="bar" aria-hidden="true"><i className={wr >= 50 ? 'up' : 'down'} style={{ width: `${Math.min(100, wr)}%` }} /><u /></span>
    </div>
  );
}

function HeroLine({ slug }: { slug: string }) {
  const h = getHero(slug);
  if (!h) return <span className="muted">{slug}</span>;
  return <span className="hn"><HeroFace hero={h} /><Link to={`/hero/${h.slug}`}>{h.name}</Link></span>;
}

// ---------------------------------------------------------------------------------------------------------
// Page style: the page wears the skin of a hero. By default that is the player's most played one.
// ---------------------------------------------------------------------------------------------------------

function StylePicker({ heroes, value, onPick }: { heroes: PlayerHeroLine[]; value: string | undefined; onPick: (slug: string | 'site') => void }) {
  const on = useSkinOn();
  const options = heroes.slice(0, 4).map((h) => getHero(h.slug)).filter((h): h is NonNullable<ReturnType<typeof getHero>> => !!h && !!getSkin(h.slug));
  if (!options.length) return null;
  if (!on) return <div className="pl-style"><span>Page style</span><SkinSwitch slug={options[0].slug} label="Hero styles" /></div>;
  return (
    <div className="pl-style" role="group" aria-label="Page style">
      <span>Page style</span>
      {options.map((h, i) => (
        <button key={h.slug} type="button" className="chip pl-sty" aria-pressed={value === h.slug} onClick={() => onPick(h.slug)} title={getSkin(h.slug)?.concept}>
          <HeroFace hero={h} />{h.name}{i === 0 ? <small>most played</small> : null}
        </button>
      ))}
      <button type="button" className="chip pl-sty" aria-pressed={value === undefined} onClick={() => onPick('site')} title="The site’s own look">Site theme</button>
      <SkinSwitch slug={value} label="Hero styles" />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Header: the dossier
// ---------------------------------------------------------------------------------------------------------

function Dossier({ core, lastSeen, skin }: { core: PlayerCore; lastSeen?: number; skin?: HeroSkin }) {
  const top = core.heroes[0]?.slug;
  const bg = getHeroBg(top);
  const hero = getHero(top);
  const art = hero ? hero.art ?? hero.render ?? hero.portrait : undefined;
  const steamHref = safeSteamHref(core.profileUrl);
  const r = core.rank;
  const t = core.totals;
  const wr = t ? winPct(t.wins, t.matches) : null;
  return (
    <section className="pl-head panel paint" style={{ ['--hc' as string]: getHeroColor(top ?? 'haze') } as React.CSSProperties} aria-label="Player summary">
      {bg && <div className="pl-bg" style={{ backgroundImage: `url(${bg})` }} aria-hidden="true" />}
      {art && <img className="pl-art" src={art} alt="" loading="lazy" />}
      <div className="pl-av"><Avatar src={core.avatar} size={120} /></div>
      <div className="pl-info">
        <Kicker>{skin?.copy?.dossier ?? 'Player dossier'}</Kicker>
        <h1>{core.name}</h1>
        <div className="pl-ids">
          <CopyCode code={toSteam64(core.accountId)} label="Copy Steam ID" />
          {steamHref && <a className="chip" href={steamHref} target="_blank" rel="noreferrer noopener">Steam profile {'↗'}</a>}
          {lastSeen ? <small>Last game {timeAgo(lastSeen)}</small> : null}
        </div>
        <dl className="pl-quick">
          <div><dt>Record</dt><dd className="wl">{t ? <><b className="w">{n0(t.wins)}</b><i>/</i><b className="l">{n0(t.matches - t.wins)}</b></> : <span className="muted">–</span>}</dd></div>
          <div><dt>Win rate</dt><dd>{t ? <WinRate wins={t.wins} matches={t.matches} /> : <span className="muted">–</span>}</dd></div>
          <div><dt>Most played</dt><dd className="hs"><div>{core.heroes.slice(0, 3).map((h) => { const x = getHero(h.slug); const src = x?.icon ?? x?.portrait; return x ? <Link key={h.slug} to={`/hero/${x.slug}`} className="lb-hero" title={`${x.name}: ${h.matches} matches`} aria-label={x.name}>{src ? <img src={src} alt="" loading="lazy" /> : <span>{x.name.slice(0, 1)}</span>}</Link> : null; })}</div></dd></div>
        </dl>
      </div>
      <div className="pl-rank" style={r ? { ['--rc' as string]: RANK_COLOR[r.name as keyof typeof RANK_COLOR] } as React.CSSProperties : undefined}>
        {r ? (
          <>
            <RankBadge rank={r.name} sub={r.sub} size="lg" />
            <b>{r.label}</b>
            <small>{r.streak && r.streak >= 3 ? `${r.streak} win streak` : 'Current rank'}</small>
          </>
        ) : (
          <>
            <span className="pl-unranked" aria-hidden="true">?</span>
            <b>Unranked</b>
            <small>No ranked rating yet</small>
          </>
        )}
      </div>
      {wr === null && !t && <p className="pl-nodata muted">No match record yet.</p>}
    </section>
  );
}

function Tickets({ core }: { core: PlayerCore }) {
  const t = core.totals;
  if (!t) return null;
  const kda = kdaRatio(t.kills, t.deaths, t.assists);
  const perGame = (n: number) => (n / Math.max(1, t.matches)).toFixed(1);
  return (
    <div className="rd-tickets pl-tickets">
      <div className="ticket"><small>Matches</small><b>{n0(t.matches)}</b></div>
      <div className="ticket"><small>KDA</small><b>{kda.toFixed(2)}</b><em>{perGame(t.kills)} / {perGame(t.deaths)} / {perGame(t.assists)} a game</em></div>
      <div className="ticket"><small>Time played</small><b>{fmtHours(t.seconds)}</b></div>
      {core.matches30d !== undefined && <div className="ticket"><small>Last 30 days</small><b>{n0(core.matches30d)}</b><em>matches</em></div>}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Recent form
// ---------------------------------------------------------------------------------------------------------

function Form({ matches }: { matches: PlayerMatchLine[] }) {
  const s = formSummary(matches, 20);
  if (!s.n) return null;
  const recent = matches.slice(0, 20);
  return (
    <div className="panel pad pl-form">
      <div className="pl-form-head">
        <h3>Last {s.n} games</h3>
        <b className={s.wins * 2 >= s.n ? 'good' : 'bad'}>{s.wins}–{s.n - s.wins}</b>
      </div>
      <ol className="pl-pips" aria-label={`Results, newest first: ${recent.map((m) => (m.won ? 'win' : 'loss')).join(', ')}`}>
        {recent.map((m) => {
          const h = getHero(m.heroSlug);
          return <li key={m.id} className={m.won ? 'w' : 'l'} title={`${m.won ? 'Won' : 'Lost'} as ${h?.name ?? 'a hero'} · ${m.kills}/${m.deaths}/${m.assists}`}>{m.won ? 'W' : 'L'}</li>;
        })}
      </ol>
      <dl className="pl-avg">
        <div><dt>Avg K / D / A</dt><dd>{(s.kills / s.n).toFixed(1)} / {(s.deaths / s.n).toFixed(1)} / {(s.assists / s.n).toFixed(1)}</dd></div>
        <div><dt>KDA</dt><dd>{kdaRatio(s.kills, s.deaths, s.assists).toFixed(2)}</dd></div>
        <div><dt>Avg length</dt><dd>{fmtDuration(s.avgSeconds)}</dd></div>
      </dl>
    </div>
  );
}

function Recent30({ matches, now }: { matches: PlayerMatchLine[]; now: number }) {
  const month = matches.filter((m) => m.start >= now - 30 * DAY_S);
  const list = heroesIn(month).slice(0, 4);
  if (!list.length) return null;
  return (
    <div className="panel pad pl-side">
      <h3>Playing lately</h3>
      <small>Last 30 days · {n0(month.length)} games</small>
      <ul>
        {list.map((h) => (
          <li key={h.slug}>
            <HeroLine slug={h.slug} />
            <span className="pl-n">{h.matches} <small>games</small></span>
            <WinRate wins={h.wins} matches={h.matches} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Mates({ mates }: { mates: PlayerMate[] }) {
  if (!mates.length) return null;
  return (
    <div className="panel pad pl-side">
      <h3>Plays with</h3>
      <small>Teammates over the most games</small>
      <ul>
        {mates.map((m) => (
          <li key={m.accountId}>
            <span className="pl-mate">
              <Avatar src={m.avatar} size={30} lazy />
              <Link to={`/player/${m.accountId}`}>{m.name ?? `Player ${m.accountId}`}</Link>
            </span>
            <span className="pl-n">{m.matches} <small>games</small></span>
            <WinRate wins={m.wins} matches={m.matches} />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Heroes
// ---------------------------------------------------------------------------------------------------------

function Heroes({ heroes }: { heroes: PlayerHeroLine[] }) {
  const [all, setAll] = useState(false);
  if (!heroes.length) return <div className="panel empty"><h3>No hero record</h3><p>This player has no recorded games on any current hero.</p></div>;
  const rows = all ? heroes : heroes.slice(0, 8);
  return (
    <div className="panel lb-board pl-heroes">
      <div className="lb-tablewrap">
        <table className="lb-table pl-table">
          <thead><tr><th>Hero</th><th className="num">Games</th><th>Win rate</th><th className="num">Avg K / D / A</th><th className="num">KDA</th><th className="num pl-opt">Souls / min</th><th className="pl-opt">Last played</th></tr></thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.slug}>
                <td className="who"><HeroLine slug={h.slug} /></td>
                <td className="num">{n0(h.matches)}</td>
                <td className="wrc"><WinRate wins={h.wins} matches={h.matches} /></td>
                <td className="num">{(h.kills / h.matches).toFixed(1)} / {(h.deaths / h.matches).toFixed(1)} / {(h.assists / h.matches).toFixed(1)}</td>
                <td className="num"><b>{kdaRatio(h.kills, h.deaths, h.assists).toFixed(2)}</b></td>
                <td className="num pl-opt">{h.netWorthPerMin ? n0(Math.round(h.netWorthPerMin)) : '–'}</td>
                <td className="pl-opt muted">{h.lastPlayed ? timeAgo(h.lastPlayed) : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {heroes.length > 8 && (
        <div className="lb-foot"><span>Showing {rows.length} of {heroes.length} heroes</span><button type="button" className="chip" onClick={() => setAll((v) => !v)}>{all ? 'Show fewer' : `Show all ${heroes.length}`}</button></div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Matches
// ---------------------------------------------------------------------------------------------------------

const KINDS: (QueueKind | 'all')[] = ['all', 'ranked', 'unranked', 'brawl'];

function MatchRow({ m, accountId }: { m: PlayerMatchLine; accountId: number }) {
  const h = getHero(m.heroSlug);
  const badge = m.badge;
  const parts = badge ? badge : 0;
  return (
    <li className={`pm ${m.won ? 'win' : 'loss'}`}>
      <Link className="pm-hit" to={`/match/${m.id}?player=${accountId}`} aria-label={`Open the full match: ${m.won ? 'won' : 'lost'} as ${h?.name ?? 'a retired hero'}, ${m.kills} kills ${m.deaths} deaths ${m.assists} assists`} />
      <span className="pm-res"><b>{m.abandoned && !m.won ? 'Left' : m.won ? 'Won' : 'Lost'}</b><small>{fmtDuration(m.durationS)}</small></span>
      <span className="pm-hero">{h ? <><HeroFace hero={h} /><span><Link to={`/hero/${h.slug}`}>{h.name}</Link><small>Level {m.level}</small></span></> : <span className="muted">Retired hero</span>}</span>
      <span className="pm-kind"><b>{QUEUE_LABEL[m.kind]}</b><small>{timeAgo(m.start)}</small></span>
      <span className="pm-kda"><b>{m.kills} / {m.deaths} / {m.assists}</b><small>{kdaRatio(m.kills, m.deaths, m.assists).toFixed(2)} KDA</small></span>
      <span className="pm-nw"><b>{souls(m.netWorth)}</b><small>souls</small></span>
      <span className="pm-delta" title={badge ? `Rank going in: ${badgeLabel(badge)}. Change is in the game's rank progress points.` : undefined}>
        {m.rankDelta !== undefined && parts ? <><b className={m.rankDelta >= 0 ? 'good' : 'bad'}>{m.rankDelta >= 0 ? '+' : '−'}{Math.abs(m.rankDelta)}</b><small>{badgeLabel(badge as number)}</small></> : null}
      </span>
      <span className="pm-go" aria-hidden="true">{'›'}</span>
    </li>
  );
}

function Matches({ data, accountId }: { data: PlayerMatches; accountId: number }) {
  const [kind, setKind] = useState<QueueKind | 'all'>('all');
  const [shown, setShown] = useState(20);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: data.matches.length, ranked: 0, unranked: 0, brawl: 0, other: 0 };
    for (const m of data.matches) c[m.kind]++;
    return c;
  }, [data]);
  const list = useMemo(() => (kind === 'all' ? data.matches : data.matches.filter((m) => m.kind === kind)), [data, kind]);
  if (!data.matches.length) return <div className="panel empty"><h3>No matches on record</h3><p>The Deadlock API has no games for this account yet.</p></div>;
  return (
    <div className="pl-matches">
      <div className="pills" role="group" aria-label="Queue">
        {KINDS.filter((k) => k === 'all' || counts[k] > 0).map((k) => (
          <button key={k} type="button" className="pill" aria-pressed={kind === k} onClick={() => { setKind(k); setShown(20); }}>{k === 'all' ? 'All games' : QUEUE_LABEL[k]}<small>{n0(counts[k])}</small></button>
        ))}
      </div>
      <ol className="panel pm-list">
        {list.slice(0, shown).map((m) => <MatchRow key={m.id} m={m} accountId={accountId} />)}
      </ol>
      {list.length > shown && (
        <p className="mx-more"><button type="button" className="chip" onClick={() => setShown((n) => n + 20)}>Show {Math.min(20, list.length - shown)} more</button><span className="muted">{shown} of {n0(list.length)}</span></p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------------------------------------

function AltAccounts({ ids, self }: { ids: number[]; self: number }) {
  const list = ids.filter((i) => i !== self);
  const state = useAsync((signal) => dataSource.playerHits(list, signal), [list.join(',')]);
  if (!list.length) return null;
  const hits = state.status === 'ready' ? state.value : new Map();
  return (
    <div className="notice pl-alt">
      <span><b>Other accounts share this name.</b> The leaderboard lists names, not accounts, so this was the most likely match.</span>
      <span className="pl-alts">
        {list.map((id) => {
          const h = hits.get(id);
          return <Link key={id} to={`/player/${id}`} className="chip">{h?.name ?? `Player ${id}`}{h?.rankBadge ? ` · ${badgeLabel(h.rankBadge)}` : ''}</Link>;
        })}
      </span>
    </div>
  );
}

export default function PlayerPage() {
  const { accountId: param } = useParams();
  const [sp] = useSearchParams();
  const id = param ? toAccountId(param) : null;
  const [tries, setTries] = useState(0);
  const [style, setStyle] = useState<string | 'site' | null>(() => sp.get('style'));
  const skinOn = useSkinOn();
  const core = useAsync((signal) => (id ? dataSource.player(id, signal) : Promise.resolve(null)), [id, tries]);
  const history = useAsync((signal) => (id ? dataSource.playerMatches(id, signal) : Promise.resolve(null)), [id, tries]);
  const mates = useAsync((signal) => (id ? dataSource.playerMates(id, signal) : Promise.resolve([])), [id, tries]);
  const c = core.status === 'ready' ? core.value : null;
  useTitle(c ? c.name : 'Player');

  useEffect(() => {
    if (c && !c.empty && !c.illustrative) rememberPlayer({ accountId: c.accountId, name: c.name, avatar: c.avatar });
  }, [c]);

  // The page wears the skin of the chosen hero, by default the most played one; "site" keeps the site's own theme.
  const topSlug = c?.heroes[0]?.slug;
  const styleSlug = !c || c.empty || style === 'site' ? undefined : getSkin(style ?? undefined) ? style ?? undefined : topSlug;
  const skin = skinOn ? getSkin(styleSlug) : undefined;

  const alt = useMemo(() => (sp.get('alt') ?? '').split(',').map((s) => Number(s)).filter((n) => Number.isInteger(n) && n > 0), [sp]);

  if (param && id === null) return <PlayerLookup problem={`“${param}” isn’t a Steam ID. Paste a 17-digit Steam ID, an account number, or search by name.`} />;
  if (!param || id === null) return <PlayerLookup />;
  if (param !== String(id)) return <Navigate to={`/player/${id}${sp.toString() ? `?${sp.toString()}` : ''}`} replace />;

  const matches = history.status === 'ready' ? history.value : null;
  const now = Math.floor(Date.now() / 1000);

  return (
    <SkinScope slug={styleSlug}>
    <div className="wrap pl">
      {core.status === 'loading' && (
        <div className="panel pl-head pl-skeleton" aria-busy="true" role="status"><div className="pl-av"><span className="ph" /></div><div className="pl-info"><h1>Pulling the file…</h1><small>Steam ID {toSteam64(id)}</small></div></div>
      )}
      {core.status === 'error' && (
        <div className="panel empty" role="alert">
          <h3>Couldn’t load this player</h3>
          <p>{core.message}. The Deadlock API may be busy.</p>
          <p><button type="button" className="chip" onClick={() => setTries((n) => n + 1)}>Try again</button> <Link className="chip" to="/player">Look up someone else</Link></p>
        </div>
      )}
      {c && c.empty && (
        <>
          <div className="panel empty">
            <h3>No record for this account</h3>
            <p>The Deadlock API has no profile, rank or games for account {id}. The ID may be mistyped, or the player hasn’t played a tracked match yet.</p>
            <p><Link className="chip" to="/player">Look up someone else</Link></p>
          </div>
        </>
      )}
      {c && !c.empty && (
        <>
          {c.illustrative && <div className="notice"><b>Illustrative player.</b> Name, rank and games are invented from the account number for design review. Switch to live data in the header to see the real record.</div>}
          {alt.length > 0 && <AltAccounts ids={alt} self={c.accountId} />}
          <StylePicker heroes={c.heroes} value={styleSlug} onPick={(slug) => setStyle(slug)} />
          <Dossier core={c} lastSeen={matches?.matches[0]?.start} skin={skin} />
          <Tickets core={c} />

          <div className="pl-grid">
            <div className="pl-main">
              <SectionHeading skin={skin} title="Rank over time" />
              {history.status === 'loading' && <p className="muted" role="status">Reading the match history…</p>}
              {history.status === 'error' && <div className="panel empty" role="alert"><h3>Couldn’t load the match history</h3><p>{history.message}.</p></div>}
              {matches && <RankHistory points={matches.history} illustrative={c.illustrative} />}

              <SectionHeading skin={skin} title="Heroes" />
              <Heroes heroes={c.heroes} />

              <SectionHeading skin={skin} k="matches" />
              {history.status === 'loading' && <p className="muted" role="status">Reading the match history…</p>}
              {matches && <Matches data={matches} accountId={c.accountId} />}
            </div>
            <aside className="pl-aside" aria-label="Form and teammates">
              {matches && <Form matches={matches.matches} />}
              {matches && <Recent30 matches={matches.matches} now={now} />}
              {mates.status === 'ready' && <Mates mates={mates.value} />}
              <p className="muted pl-fine">
                Records are all-time and cover every queue. Win rate counts a game as won when the player’s team won. Data from the Deadlock API
                {c.illustrative ? '.' : `; ${fmtInt(c.totals?.matches ?? 0)} games on record.`}
              </p>
            </aside>
          </div>
        </>
      )}
      <SiteFooter />
    </div>
    </SkinScope>
  );
}
