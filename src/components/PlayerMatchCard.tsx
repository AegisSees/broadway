import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DraftChip } from './DraftOdds';
import { heroIdOf } from '../ml/predict';
import { HeroFace } from './HeroFace';
import { ItemIcon, MvpTag } from './MatchBits';
import { getHeroColor } from '../data/heroColors';
import { badgeLabel } from '../data/leaderboard';
import { SIDE_SHORT, type MatchDetail, type MatchPlayer } from '../data/matchDetail';
import { fmtDuration, kdaRatio, QUEUE_LABEL, timeAgo, type PlayerHit, type PlayerMatchLine } from '../data/player';
import { getHero } from '../data/roster';
import { dataSource } from '../data/source';
import { useAsync } from '../data/useAsync';
import { criticalIsLocalOnly, moodFor, moodImage, type Mood } from '../data/heroMoods';
import { fmtInt } from '../lib/stats';

const k1 = (n: number | undefined) => (n === undefined ? '–' : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(Math.round(n)));
type Names = Map<number, PlayerHit>;

/**
 * Sample mode serves one saved real game for every match id, and the player whose page this is was not in it.
 * So that the card still reads correctly, the sample's player on the right side takes this player's place: same
 * account, hero and line. Live games are never touched.
 */
export function placeSelf(m: MatchDetail, line: PlayerMatchLine, accountId: number): MatchDetail {
  if (!m.illustrative || m.players.some((p) => p.accountId === accountId)) return m;
  const stand = m.players.find((p) => p.won === line.won) ?? m.players[0];
  const me: MatchPlayer = {
    ...stand, accountId, heroSlug: line.heroSlug, heroId: line.heroId || heroIdOf(line.heroSlug) || stand.heroId, kills: line.kills, deaths: line.deaths, assists: line.assists,
    netWorth: line.netWorth, lastHits: line.lastHits, level: line.level,
  };
  const swap = (p: MatchPlayer) => (p === stand ? me : p);
  return { ...m, players: m.players.map(swap), teams: m.teams.map((t) => ({ ...t, players: t.players.map(swap) })) as MatchDetail['teams'] };
}

/**
 * The hero's card in the mood of the game: bloodied (critical) for a loss, normal for a win, proud (gloat) for a win
 * in the top three. A critical card that cannot be loaded falls back to the normal one, washed red.
 */
function MoodFace({ slug, mood }: { slug: string; mood: Mood }) {
  const pick = moodImage(slug, mood);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [pick.src]);
  const src = failed ? pick.fallback : pick.src;
  const tint = pick.tintOnFallback && (failed || criticalIsLocalOnly(slug));
  if (!src) return null;
  return (
    <span className={`pc-mood ${mood}${tint ? ' tinted' : ''}`}>
      <img src={src} alt="" loading="lazy" onError={() => { if (!failed) setFailed(true); }} />
    </span>
  );
}

/** Starts loading a card's game once the card comes near the screen. */
function useNear(ref: React.RefObject<HTMLElement>, enabled: boolean): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || near || !el) return;
    if (typeof IntersectionObserver === 'undefined') { setNear(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) setNear(true); }, { rootMargin: '200px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, enabled, near]);
  return near;
}

type Tab = 'board' | 'me' | 'build';
const TABS: { id: Tab; label: string }[] = [
  { id: 'board', label: 'Scoreboard' },
  { id: 'me', label: 'Your numbers' },
  { id: 'build', label: 'Build' },
];

function Lobby({ m, me, names }: { m: MatchDetail; me: number; names: Names }) {
  return (
    <div className="pc-lobby" aria-label="Who played">
      {m.teams.map((t) => (
        <ul key={t.side} className={t.side}>
          {t.players.map((p) => {
            const h = getHero(p.heroSlug);
            return (
              <li key={p.slot} className={p.accountId === me ? 'me' : undefined}>
                {h?.icon ? <img src={h.icon} alt="" loading="lazy" /> : <i aria-hidden="true" />}
                {/* everyone else links straight to their own page, without opening this game */}
                {p.accountId !== me && p.accountId > 0
                  ? <Link to={`/player/${p.accountId}`} title={h ? `${h.name} · open their profile` : 'Open their profile'}>{names.get(p.accountId)?.name ?? `Player ${p.accountId}`}</Link>
                  : <span>{names.get(p.accountId)?.name ?? (p.accountId === me ? 'You' : `Player ${p.accountId}`)}</span>}
              </li>
            );
          })}
        </ul>
      ))}
    </div>
  );
}

function Board({ m, me, names }: { m: MatchDetail; me: number; names: Names }) {
  return (
    <div className="pc-board">
      {m.teams.map((t) => (
        <section key={t.side} className={`pc-team ${t.side}${t.won ? ' won' : ''}`}>
          <header>
            <h4>{SIDE_SHORT[t.side]}</h4>
            <b className={t.won ? 'good' : 'bad'}>{t.won ? 'Victory' : 'Defeat'}</b>
            <small>{t.kills} kills {'·'} {k1(t.netWorth)} souls</small>
          </header>
          <div className="pc-tw">
            <table>
              <thead><tr><th>Player</th><th className="num">K / D / A</th><th className="num">Souls</th><th className="num">CS</th><th className="num">Lv</th><th className="pc-opt">Items</th></tr></thead>
              <tbody>
                {t.players.map((p) => {
                  const h = getHero(p.heroSlug);
                  const hit = names.get(p.accountId);
                  return (
                    <tr key={p.slot} className={p.accountId === me ? 'me' : undefined}>
                      <td className="who">
                        {h ? <HeroFace hero={h} /> : <span className="face">?</span>}
                        <span>
                          <span className="pc-pn"><Link to={`/player/${p.accountId}`}>{hit?.name ?? `Player ${p.accountId}`}</Link><MvpTag rank={p.mvp} /></span>
                          <small>{h?.name ?? 'Retired hero'}{p.badge ? ` · ${badgeLabel(p.badge)}` : ''}</small>
                        </span>
                      </td>
                      <td className="num kda"><b className="k">{p.kills}</b>{' / '}<b className="d">{p.deaths}</b>{' / '}<b className="a">{p.assists}</b></td>
                      <td className="num souls">{k1(p.netWorth)}</td>
                      <td className="num">{p.lastHits}</td>
                      <td className="num">{p.level}</td>
                      <td className="pc-opt"><span className="pc-held">{p.held.slice(0, 12).map((i) => <ItemIcon key={`${i.id}-${i.at}`} item={i} size="sm" />)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

/** One of the eight numbers on the "Your numbers" tab, with where it ranks in the lobby. */
function Num({ label, v, all, fmt, tone, lowIsGood = false }: { label: string; v?: number; all: (number | undefined)[]; fmt: (n: number) => string; tone: string; lowIsGood?: boolean }) {
  if (v === undefined) return null;
  const vals = all.filter((x): x is number => x !== undefined);
  const place = 1 + vals.filter((x) => (lowIsGood ? x < v : x > v)).length;
  return (
    <div className={`pc-num ${tone}`}>
      <small>{label}</small>
      <b>{fmt(v)}</b>
      <em>{place === 1 ? <span className="best">{lowIsGood ? 'Least' : 'Best'} in lobby</span> : `#${place} of ${vals.length}`}</em>
    </div>
  );
}

function Mine({ m, p }: { m: MatchDetail; p: MatchPlayer }) {
  const col = (f: (x: MatchPlayer) => number | undefined) => m.players.map(f);
  return (
    <div className="pc-mine">
      <section>
        <h4><i className="g" />Economy and lane</h4>
        <div className="pc-nums">
          <Num label="Souls" v={p.netWorth} all={col((x) => x.netWorth)} fmt={k1} tone="souls" />
          <Num label="Last hits" v={p.lastHits} all={col((x) => x.lastHits)} fmt={fmtInt} tone="ink" />
          <Num label="Denies" v={p.denies} all={col((x) => x.denies)} fmt={fmtInt} tone="spirit" />
          <Num label="Level" v={p.level} all={col((x) => x.level)} fmt={fmtInt} tone="blue" />
        </div>
      </section>
      <section>
        <h4><i className="r" />Combat</h4>
        <div className="pc-nums">
          <Num label="Hero damage" v={p.damage} all={col((x) => x.damage)} fmt={k1} tone="souls" />
          <Num label="Objective damage" v={p.bossDamage} all={col((x) => x.bossDamage)} fmt={k1} tone="souls" />
          <Num label="Healing" v={p.healing} all={col((x) => x.healing)} fmt={k1} tone="good" />
          <Num label="Damage taken" v={p.damageTaken} all={col((x) => x.damageTaken)} fmt={k1} tone="ink" lowIsGood />
        </div>
      </section>
    </div>
  );
}

const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th'];

function Build({ p }: { p: MatchPlayer }) {
  const groups = Math.max(0, ...p.skills.map((s) => s.group)) + 1;
  const steps = p.skills.length;
  return (
    <div className="pc-build">
      <h4>Final items <small>{p.held.length} held{p.bought.length > p.held.length ? ` · ${p.bought.length - p.held.length} sold or upgraded` : ''}</small></h4>
      {p.held.length ? <div className="pc-final">{p.held.map((i) => <ItemIcon key={`${i.id}-${i.at}`} item={i} size="md" note={fmtDuration(i.at)} />)}</div> : <p className="muted">No item record for this game.</p>}
      {steps > 0 && (
        <>
          <h4>Ability path <small>{steps} points · rows are abilities in the order they were learned</small></h4>
          <div className="pc-path" style={{ ['--n' as string]: steps } as React.CSSProperties} role="table" aria-label="Ability points in order">
            <div className="pc-path-row head" role="row"><span role="columnheader" />{p.skills.map((_, i) => <span key={i} role="columnheader">{i + 1}</span>)}</div>
            {Array.from({ length: groups }, (_, g) => (
              <div className="pc-path-row" role="row" key={g} data-g={g % 6}>
                <span role="rowheader">{ORD[g] ?? `${g + 1}th`}</span>
                {p.skills.map((s, i) => <span role="cell" key={i} className={s.group === g ? (s.level <= 1 ? 'on pc-unl' : 'on') : undefined} title={s.group === g ? `${s.level <= 1 ? 'Learned' : `Rank ${s.level}`} at ${fmtDuration(s.at)}` : undefined}>{s.group === g ? (s.level <= 1 ? '◆' : s.level) : ''}</span>)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * One game on a player page. The closed card shows the hero, the result, the line and (once the game file has been
 * read) the final items and the twelve players. Opening it shows the two scoreboards, this player's numbers ranked
 * against the lobby, and their build, without leaving the page.
 */
export default function PlayerMatchCard({ m: line, accountId, prefetch }: { m: PlayerMatchLine; accountId: number; prefetch: boolean }) {
  const h = getHero(line.heroSlug);
  const ref = useRef<HTMLLIElement>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('board');
  const near = useNear(ref, prefetch);
  const want = open || near;
  const detail = useAsync((signal) => (want ? dataSource.matchDetail(line.id, signal) : Promise.resolve(null)), [line.id, want]);
  const m = useMemo(() => (detail.status === 'ready' && detail.value ? placeSelf(detail.value, line, accountId) : null), [detail, line, accountId]);
  const ids = useMemo(() => (m ? m.players.map((p) => p.accountId) : []), [m]);
  const people = useAsync((signal) => (ids.length ? dataSource.playerHits(ids, signal) : Promise.resolve(new Map<number, PlayerHit>())), [ids.join(',')]);
  const names: Names = people.status === 'ready' ? people.value : new Map();
  const me = m?.players.find((p) => p.accountId === accountId);
  const kda = kdaRatio(line.kills, line.deaths, line.assists);
  const perMin = line.durationS > 0 ? line.lastHits / (line.durationS / 60) : 0;
  const result = line.abandoned && !line.won ? 'Left' : line.won ? 'Victory' : 'Defeat';
  const bodyId = `pc-${line.id}`;

  return (
    <li ref={ref} className={`pc ${line.won ? 'win' : 'loss'}${open ? ' open' : ''}`} style={{ ['--hc' as string]: getHeroColor(line.heroSlug ?? 'haze') } as React.CSSProperties}>
      <div className="pc-row">
        <Link className="pc-face" to={h ? `/hero/${h.slug}` : '#'} aria-label={h ? `${h.name} hero page` : 'Retired hero'} tabIndex={h ? 0 : -1}>
          {h?.portrait ? <MoodFace slug={h.slug} mood={moodFor(line.won, me?.mvp)} /> : <span className="init">{h?.name[0] ?? '?'}</span>}
          <span className="pc-res">{result}{me?.mvp && line.won ? <i>{me.mvp === 1 ? ' · MVP' : ` · #${me.mvp}`}</i> : null}</span>
        </Link>
        <div className="pc-main">
          <h3>{h?.name ?? 'Retired hero'}</h3>
          <small>{fmtDuration(line.durationS)} {'·'} {timeAgo(line.start)}</small>
          <span className="pc-chips">
            <span className={`qchip ${line.kind}`}>{line.kind === 'unranked' ? 'Standard' : QUEUE_LABEL[line.kind]}</span>
            {me?.mvp ? <MvpTag rank={me.mvp} /> : null}
            {m && me ? <DraftChip m={m} side={me.side} /> : null}
            {line.rankDelta !== undefined && line.badge ? <span className={`dchip ${line.rankDelta >= 0 ? 'up' : 'down'}`} title={`Rank going in: ${badgeLabel(line.badge)}`}>{line.rankDelta >= 0 ? '+' : '−'}{Math.abs(line.rankDelta)}</span> : null}
          </span>
        </div>
        <div className="pc-kda">
          <b><span className="k">{line.kills}</span><i>/</i><span className="d">{line.deaths}</span><i>/</i><span className="a">{line.assists}</span></b>
          <small>{kda.toFixed(2)} KDA</small>
          <small>{line.lastHits} CS {'·'} {perMin.toFixed(1)}/m {'·'} {k1(line.netWorth)} souls</small>
        </div>
        <div className="pc-items" aria-label="Final items">
          {me && me.held.length
            ? me.held.slice(0, 12).map((i) => <ItemIcon key={`${i.id}-${i.at}`} item={i} size="sm" />)
            : Array.from({ length: 12 }, (_, i) => <i key={i} className={`pc-slot${detail.status === 'loading' && want ? ' busy' : ''}`} />)}
        </div>
        {m ? <Lobby m={m} me={accountId} names={names} /> : <div className="pc-lobby pending" aria-hidden="true">{detail.status === 'error' ? 'Lobby unavailable' : ''}</div>}
        <button type="button" className="pc-toggle" aria-expanded={open} aria-controls={bodyId} aria-label={open ? 'Close this game' : 'Open this game'} onClick={() => setOpen((v) => !v)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" /></svg>
        </button>
      </div>

      {open && (
        <div className="pc-body" id={bodyId}>
          <div className="btabs pc-tabs" role="tablist" aria-label="Game details">
            {TABS.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
            <Link className="pc-full" to={`/match/${line.id}?player=${accountId}`}>Full match page {'→'}</Link>
          </div>
          {detail.status === 'loading' && <p className="muted" role="status">Reading the game file…</p>}
          {detail.status === 'error' && <p className="muted" role="alert">Couldn’t read this game: {detail.message}.</p>}
          {m && tab === 'board' && <Board m={m} me={accountId} names={names} />}
          {m && tab === 'me' && (me ? <Mine m={m} p={me} /> : <p className="muted">This player isn’t in the game file.</p>)}
          {m && tab === 'build' && (me ? <Build p={me} /> : <p className="muted">This player isn’t in the game file.</p>)}
          {m?.illustrative && <p className="pc-note muted">Sample game: the lobby is one saved real game with made-up names, shown for every match in sample mode.</p>}
        </div>
      )}
    </li>
  );
}

