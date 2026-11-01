import { useEffect, useMemo, useState } from 'react';
import PlayerMatchCard from '../components/PlayerMatchCard';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { HeroFace } from '../components/HeroFace';
import RankBadge from '../components/RankBadge';
import { getGloat } from '../data/heroGloat';
import RankHistory from '../components/RankHistory';
import { SiteFooter } from '../components/Shell';
import { getHeroColor } from '../data/heroColors';
import { getHeroBg } from '../data/heroStats';
import { badgeLabel, badgeParts } from '../data/leaderboard';
import {
  fmtDuration, fmtHours, formSummary, heroesIn, kdaRatio, QUEUE_LABEL, shownRank, timeAgo, winPct,
  type PlayerCore, type PlayerHeroLine, type PlayerMate, type PlayerMatchLine, type PlayerMatches, type QueueKind,
} from '../data/player';
import { RANK_COLOR } from '../data/ranks';
import { getHero, shortName } from '../data/roster';
import { dataSource } from '../data/source';
import { useAsync } from '../data/useAsync';
import { rememberPlayer } from '../lib/recentPlayers';
import { safeSteamHref, toAccountId, toSteam64 } from '../lib/steam';
import { fmtInt } from '../lib/stats';
import { useTitle } from '../lib/useTitle';
import PlayerLookup from './PlayerLookup';
import Avatar from '../components/Avatar';
import steamOrb from '../assets/ui/steam-orb.webp';
import SectionHeading from '../components/SectionHeading';
import { PlaysAtCard, PlaystyleCard } from '../components/PlayerModels';

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
// Header: the dossier
// ---------------------------------------------------------------------------------------------------------

/**
 * The top of a player page (Round 59, per V): the Steam picture (click it to refresh the page's data), the name with a
 * small Steam orb beside it linking to their profile, and under the name the rank as a plain medallion with its name.
 * Behind it all, the hero they play most: that hero's own backdrop across the whole banner, and the hero on the right.
 */
function ProfileHead({ core, matches, onRefresh }: { core: PlayerCore; matches: PlayerMatchLine[] | null; onRefresh: () => void }) {
  const top = core.heroes[0]?.slug;
  const bg = getHeroBg(top);
  const hero = getHero(top);
  // the largest art there is for the hero: the painted splash where we have one, else the promo render
  const splash = hero?.art ?? hero?.render ?? (top ? getGloat(top) : undefined);
  const steamHref = safeSteamHref(core.profileUrl);
  const r = shownRank(core, matches);
  return (
    <section className="phead ph2" style={{ ['--hc' as string]: getHeroColor(top ?? 'haze'), ...(r ? { ['--rc' as string]: RANK_COLOR[r.name as keyof typeof RANK_COLOR] } : {}) } as React.CSSProperties} aria-label="Player summary">
      {bg && <div className="pl-bg" style={{ backgroundImage: `url(${bg})` }} aria-hidden="true" />}
      {splash && <img className="pl-splash" src={splash} alt="" loading="lazy" />}
      <div className="ph-card">
        <button type="button" className="ph-photo" onClick={onRefresh} title="Refresh" aria-label="Refresh this player's data">
          <Avatar src={core.avatar} size={124} />
          <span className="ph-refresh" aria-hidden="true">{'\u21bb'}</span>
        </button>
        <div className="ph-id">
          <div className="ph-name">
            <h1>{core.name}</h1>
            {steamHref && (
              <a className="ph-steam" href={steamHref} target="_blank" rel="noreferrer noopener" title="Steam profile" aria-label="Steam profile">
                <img src={steamOrb} alt="" width={30} height={30} />
              </a>
            )}
          </div>
          <div className="ph-rank" aria-label={r ? `Rank: ${r.label}` : 'Unranked'}>
            {r ? <RankBadge rank={r.name} sub={r.sub} size="lg" /> : <span className="pl-unranked" aria-hidden="true">?</span>}
            <b>{r ? r.label : 'Unranked'}</b>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Recent form
// ---------------------------------------------------------------------------------------------------------

function RankCard({ core, matches }: { core: PlayerCore; matches: PlayerMatchLine[] | null }) {
  const r = shownRank(core, matches);
  const t = core.totals;
  const wr = t ? winPct(t.wins, t.matches) : null;
  return (
    <div className="panel pad pc-card ph-rankcard" style={r ? { ['--rc' as string]: RANK_COLOR[r.name as keyof typeof RANK_COLOR] } as React.CSSProperties : undefined}>
      <div className="pc-card-h"><h3>Rank</h3><h3>Record</h3></div>
      <div className="ph-rc">
        {r ? <RankBadge rank={r.name} sub={r.sub} size="md" /> : <span className="pl-unranked" aria-hidden="true">?</span>}
        <span className="ph-rc-n"><b>{r ? r.label : 'Unranked'}</b><small>{r?.fromHistory ? `Going into their last ranked game, ${timeAgo(r.fromHistory)}` : r?.streak && r.streak >= 3 ? `${r.streak} ranked wins in a row` : r ? 'Current rank' : 'No ranked rating yet'}</small></span>
        {t && <span className="ph-rc-wl"><b><span className="w">{n0(t.wins)}</span>{' / '}<span className="l">{n0(t.matches - t.wins)}</span></b>{wr !== null && <small className={wr >= 50 ? 'good' : 'bad'}>{wr.toFixed(1)}%</small>}</span>}
      </div>
    </div>
  );
}

/** The rank going into each of the last twelve ranked games, oldest to newest, with the result under it. */
function Trajectory({ matches }: { matches: PlayerMatchLine[] }) {
  const ranked = matches.filter((m) => m.kind === 'ranked' && m.badge).slice(0, 12).reverse();
  if (ranked.length < 2) return null;
  const first = ranked[0].badge as number;
  const lastB = ranked[ranked.length - 1].badge as number;
  return (
    <div className="panel pad pc-card">
      <div className="pc-card-h"><h3>Trajectory</h3><small>Last {ranked.length} ranked</small></div>
      <ol className="ph-traj">
        {ranked.map((m, i) => {
          const b = badgeParts(m.badge as number);
          return (
            <li key={m.id} className={`${m.won ? 'w' : 'l'}${i === ranked.length - 1 ? ' now' : ''}`} title={`${badgeLabel(m.badge as number)} going in · ${m.won ? 'won' : 'lost'}`}>
              <RankBadge rank={b.rank} sub={b.sub} size="xs" />
              <i aria-hidden="true" />
            </li>
          );
        })}
      </ol>
      <p className="ph-traj-sum">{lastB > first ? <b className="good">Climbing</b> : lastB < first ? <b className="bad">Slipping</b> : <b>Holding</b>}{' '}<span className="muted">{badgeLabel(first)} {'→'} {badgeLabel(lastB)}</span></p>
    </div>
  );
}

function Performance({ core, matches }: { core: PlayerCore; matches: PlayerMatchLine[] | null }) {
  const t = core.totals;
  if (!t) return null;
  const g = Math.max(1, t.matches);
  const wr = winPct(t.wins, t.matches);
  const s = matches ? formSummary(matches, 20) : null;
  const recent = matches ? matches.slice(0, 20) : [];
  const avgSouls = recent.length ? recent.reduce((n, m) => n + m.netWorth, 0) / recent.length : null;
  const avgCs = recent.length ? recent.reduce((n, m) => n + m.lastHits, 0) / recent.length : null;
  return (
    <div className="panel pad pc-card">
      <div className="pc-card-h"><h3>Performance</h3><small>{n0(t.matches)} games {'·'} {fmtHours(t.seconds)}</small></div>
      <dl className="ph-perf">
        <div><dt>Avg kills</dt><dd className="k">{(t.kills / g).toFixed(1)}</dd></div>
        <div><dt>Avg deaths</dt><dd className="d">{(t.deaths / g).toFixed(1)}</dd></div>
        <div><dt>Avg assists</dt><dd className="a">{(t.assists / g).toFixed(1)}</dd></div>
        <div><dt>KDA</dt><dd>{kdaRatio(t.kills, t.deaths, t.assists).toFixed(2)}</dd></div>
        {avgSouls !== null && <div><dt>Avg souls <i>last {recent.length}</i></dt><dd className="souls">{souls(avgSouls)}</dd></div>}
        {wr !== null && <div><dt>Win rate</dt><dd className={wr >= 50 ? 'good' : 'bad'}>{Math.round(wr)}%</dd></div>}
        {avgCs !== null && <div><dt>Avg CS <i>last {recent.length}</i></dt><dd>{Math.round(avgCs)}</dd></div>}
        {core.matches30d !== undefined && <div><dt>Last 30 days</dt><dd>{n0(core.matches30d)}</dd></div>}
      </dl>
      {s && s.n > 0 && (
        <>
          <div className="pc-card-h sub"><h3>Last {s.n}</h3><b className={s.wins * 2 >= s.n ? 'good' : 'bad'}>{s.wins}–{s.n - s.wins}</b></div>
          <ol className="pl-pips" aria-label={`Results, newest first: ${matches!.slice(0, 20).map((m) => (m.won ? 'win' : 'loss')).join(', ')}`}>
            {matches!.slice(0, 20).map((m) => <li key={m.id} className={m.won ? 'w' : 'l'} title={`${m.won ? 'Won' : 'Lost'} as ${getHero(m.heroSlug)?.name ?? 'a hero'} · ${m.kills}/${m.deaths}/${m.assists}`}>{m.won ? 'W' : 'L'}</li>)}
          </ol>
          <p className="muted ph-len">Average game {fmtDuration(s.avgSeconds)}</p>
        </>
      )}
    </div>
  );
}

/**
 * Heroes over the last 30 days (Round 58, after a reference V liked): the three most played stand as busts with their
 * win rate on a tab, games and KDA under them, and lift out of the card on hover; the next five follow as a ranked list.
 */
function Recent30({ matches, now }: { matches: PlayerMatchLine[]; now: number }) {
  const month = matches.filter((m) => m.start >= now - 30 * DAY_S);
  const list = heroesIn(month).slice(0, 8).map((h) => {
    const mine = month.filter((m) => m.heroSlug === h.slug);
    const k = mine.reduce((a, m) => a + m.kills, 0), d = mine.reduce((a, m) => a + m.deaths, 0), as = mine.reduce((a, m) => a + m.assists, 0);
    return { ...h, kda: kdaRatio(k, d, as) };
  });
  if (!list.length) return null;
  const wr = (h: { wins: number; matches: number }) => Math.round((h.wins / h.matches) * 100);
  const top = list.slice(0, 3);
  const rest = list.slice(3);
  return (
    <div className="panel pad pl-side pc-card pl-lately">
      <div className="pc-card-h"><h3>Most played</h3><small>{n0(month.length)} games · 30 days</small></div>
      <div className="pl-podium">
        {top.map((h) => {
          const hero = getHero(h.slug);
          const pic = getGloat(h.slug) ?? hero?.portrait;
          const w = wr(h);
          return (
            <Link key={h.slug} to={`/hero/${h.slug}`} className="pl-pod" style={{ ['--hc' as string]: getHeroColor(h.slug) } as React.CSSProperties}>
              <span className="pl-pod-pic">{pic && <img src={pic} alt="" loading="lazy" />}<b className={w >= 50 ? 'up' : 'down'}>{w}%</b></span>
              <strong>{hero ? shortName(hero) : h.slug}</strong>
              <small>{h.matches} games</small>
              <small>{h.kda.toFixed(2)} KDA</small>
            </Link>
          );
        })}
      </div>
      {rest.length > 0 && (
        <ol className="pl-rest" start={4}>
          {rest.map((h, i) => {
            const hero = getHero(h.slug);
            const w = wr(h);
            return (
              <li key={h.slug}>
                <span className="n">{i + 4}</span>
                {hero ? <HeroFace hero={hero} size="sm" /> : <span />}
                <span className="nm"><Link to={`/hero/${h.slug}`}>{hero ? shortName(hero) : h.slug}</Link><small>{h.matches} games · {h.kda.toFixed(2)} KDA</small></span>
                <b className={w >= 50 ? 'up' : 'down'}>{w}%</b>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function Mates({ mates }: { mates: PlayerMate[] }) {
  if (!mates.length) return null;
  return (
    <div className="panel pad pl-side pc-card">
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
const SECTIONS = [
  { id: 'games', label: 'Matches' },
  { id: 'heroes', label: 'Heroes' },
  { id: 'rank', label: 'Rank' },
  { id: 'mates', label: 'Teammates' },
];

function Matches({ data, accountId }: { data: PlayerMatches; accountId: number }) {
  const [kind, setKind] = useState<QueueKind | 'all'>('all');
  const [hero, setHero] = useState('');
  const [shown, setShown] = useState(12);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: data.matches.length, ranked: 0, unranked: 0, brawl: 0, other: 0 };
    for (const m of data.matches) c[m.kind]++;
    return c;
  }, [data]);
  const heroes = useMemo(() => heroesIn(data.matches).map((h) => getHero(h.slug)).filter((h): h is NonNullable<typeof h> => !!h).sort((a, b) => a.name.localeCompare(b.name)), [data]);
  const list = useMemo(() => data.matches.filter((m) => (kind === 'all' || m.kind === kind) && (!hero || m.heroSlug === hero)), [data, kind, hero]);
  if (!data.matches.length) return <div className="panel empty"><h3>No matches on record</h3><p>The Deadlock API has no games for this account yet.</p></div>;
  return (
    <div className="pl-matches">
      <div className="pc-filters">
        <div className="pills" role="group" aria-label="Queue">
          {KINDS.filter((k) => k === 'all' || counts[k] > 0).map((k) => (
            <button key={k} type="button" className="pill" aria-pressed={kind === k} onClick={() => { setKind(k); setShown(12); }}>{k === 'all' ? 'All' : k === 'unranked' ? 'Standard' : QUEUE_LABEL[k]}<small>{n0(counts[k])}</small></button>
          ))}
        </div>
        <label className="pc-hero-pick">
          <span className="sr-only">Hero</span>
          <select value={hero} onChange={(e) => { setHero(e.target.value); setShown(12); }}>
            <option value="">Every hero</option>
            {heroes.map((h) => <option key={h.slug} value={h.slug}>{h.name}</option>)}
          </select>
        </label>
      </div>
      {list.length === 0 ? <div className="panel empty"><h3>No games match</h3><p>Try another queue or hero.</p></div> : (
        <ol className="pc-list">
          {list.slice(0, shown).map((m, i) => <PlayerMatchCard key={m.id} m={m} accountId={accountId} prefetch={i < 8} />)}
        </ol>
      )}
      {list.length > shown && (
        <p className="mx-more"><button type="button" className="chip" onClick={() => setShown((n) => n + 12)}>Show {Math.min(12, list.length - shown)} more</button><span className="muted">{shown} of {n0(list.length)}</span></p>
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
  const [sec, setSec] = useState('games');
  const core = useAsync((signal) => (id ? dataSource.player(id, signal) : Promise.resolve(null)), [id, tries]);
  const history = useAsync((signal) => (id ? dataSource.playerMatches(id, signal) : Promise.resolve(null)), [id, tries]);
  const mates = useAsync((signal) => (id ? dataSource.playerMates(id, signal) : Promise.resolve([])), [id, tries]);
  const c = core.status === 'ready' ? core.value : null;
  useTitle(c ? c.name : 'Player');

  useEffect(() => {
    if (c && !c.empty && !c.illustrative) rememberPlayer({ accountId: c.accountId, name: c.name, avatar: c.avatar });
  }, [c]);

  const alt = useMemo(() => (sp.get('alt') ?? '').split(',').map((s) => Number(s)).filter((n) => Number.isInteger(n) && n > 0), [sp]);

  if (param && id === null) return <PlayerLookup problem={`“${param}” isn’t a Steam ID. Paste a 17-digit Steam ID, an account number, or search by name.`} />;
  if (!param || id === null) return <PlayerLookup />;
  if (param !== String(id)) return <Navigate to={`/player/${id}${sp.toString() ? `?${sp.toString()}` : ''}`} replace />;

  const matches = history.status === 'ready' ? history.value : null;
  const now = Math.floor(Date.now() / 1000);

  return (
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
        <ProfileHead core={c} matches={matches?.matches ?? null} onRefresh={() => setTries((n) => n + 1)} />
        <nav className="tabs ph-tabs" aria-label="Page sections">
          {SECTIONS.map((t) => (
            <a key={t.id} href={`#${t.id}`} className={sec === t.id ? 'active' : ''} aria-current={sec === t.id ? 'true' : undefined} onClick={(e) => { e.preventDefault(); setSec(t.id); document.getElementById(t.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{t.label}</a>
          ))}
        </nav>

        <div className="pl-grid ph-grid">
          <aside className="pl-aside" aria-label="Rank, form and teammates">
            <RankCard core={c} matches={matches?.matches ?? null} />
            {matches && <Trajectory matches={matches.matches} />}
            <Performance core={c} matches={matches?.matches ?? null} />
            {matches && <PlaystyleCard matches={matches.matches} />}
            {matches && <PlaysAtCard accountId={c.accountId} matches={matches.matches} rank={shownRank(c, matches.matches)} />}
            {matches && <Recent30 matches={matches.matches} now={now} />}
            {mates.status === 'ready' && <div id="mates"><Mates mates={mates.value} /></div>}
            <p className="muted pl-fine">
              Records are all-time and cover every queue. Win rate counts a game as won when the player’s team won. Data from the Deadlock API
              {c.illustrative ? '.' : `; ${fmtInt(c.totals?.matches ?? 0)} games on record.`}
            </p>
          </aside>
          <div className="pl-main">
            <SectionHeading id="games" title="Match history" />
            {history.status === 'loading' && <p className="muted" role="status">Reading the match history…</p>}
            {history.status === 'error' && <div className="panel empty" role="alert"><h3>Couldn’t load the match history</h3><p>{history.message}.</p></div>}
            {matches && <Matches data={matches} accountId={c.accountId} />}

            <SectionHeading id="heroes" title="Heroes" />
            <Heroes heroes={c.heroes} />

            <SectionHeading id="rank" title="Rank over time" />
            {matches && <RankHistory points={matches.history} illustrative={c.illustrative} />}
          </div>
        </div>
      </>
    )}
    <SiteFooter />
  </div>
  );
}
