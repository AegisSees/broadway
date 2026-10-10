import { useId, useMemo, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CopyCode } from '../components/BuildBoard';
import Avatar from '../components/Avatar';
import { HeroFace } from '../components/HeroFace';
import ItemCard from '../components/ItemCard';
import Kicker from '../components/Kicker';
import RankBadge from '../components/RankBadge';
import { SiteFooter } from '../components/Shell';
import Tip from '../components/Tip';
import { getItem } from '../data/items';
import { badgeLabel, badgeParts } from '../data/leaderboard';
import {
  itemUse, LANE_NAME, leader, SIDE_NAME, SIDE_SHORT, type MatchDetail, type MatchItem, type MatchPlayer, type TeamTotals,
} from '../data/matchDetail';
import { fmtDuration, kdaRatio, QUEUE_LABEL, timeAgo, type PlayerHit } from '../data/player';
import { RANK_COLOR } from '../data/ranks';
import { getHero } from '../data/roster';
import { dataSource } from '../data/source';
import { useAsync } from '../data/useAsync';
import { fmtInt } from '../lib/stats';
import { useTitle } from '../lib/useTitle';
import SectionHeading from '../components/SectionHeading';

const k1 = (n: number | undefined) => (n === undefined ? '–' : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 1 : 2).replace(/\.?0+$/, '')}K` : String(Math.round(n)));
const clock = (s: number) => fmtDuration(s);
const signed = (n: number) => `${n >= 0 ? '+' : '−'}${k1(Math.abs(n))}`;

type Names = Map<number, PlayerHit>;
const nameOf = (names: Names, id: number) => names.get(id)?.name ?? `Player ${id}`;

// ---------------------------------------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------------------------------------

function ItemIcon({ item, size = 'md', note }: { item: MatchItem; size?: 'sm' | 'md' | 'lg'; note?: string }) {
  const info = getItem(item.name);
  const face = (
    <span className={`mt-it ${size}${item.held ? '' : ' sold'}`} data-cat={info?.category ?? 'none'} data-tier={info?.tier ?? 0}>
      {item.icon ? <img src={item.icon} alt={item.name} loading="lazy" /> : <b>{item.name.slice(0, 1)}</b>}
      {note ? <i>{note}</i> : null}
    </span>
  );
  if (!info) return <span title={item.name}>{face}</span>;
  return <Tip content={<ItemCard item={{ name: info.name, category: info.category }} />}>{face}</Tip>;
}

// ---------------------------------------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------------------------------------

function SideScore({ t, brawl }: { t: TeamTotals; brawl: boolean }) {
  return (
    <div className={`mt-side-score ${t.side}${t.won ? ' won' : ''}`}>
      <small>{SIDE_NAME[t.side]}</small>
      <b>{brawl ? t.score ?? 0 : t.kills}</b>
      <em>{t.won ? 'Victory' : 'Defeat'}</em>
      {brawl && <span>{t.kills} kills</span>}
    </div>
  );
}

function Head({ m }: { m: MatchDetail }) {
  const brawl = m.kind === 'brawl';
  const [hk, am] = m.teams;
  const when = m.start ? new Date(m.start * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : null;
  const avg = m.avgBadge ? badgeParts(m.avgBadge) : null;
  return (
    <section className="mt-head panel paint" aria-label="Match summary">
      <div className="mt-title">
        <Kicker>Match report</Kicker>
        <h1>{QUEUE_LABEL[m.kind]} · {SIDE_SHORT[m.winner]} win</h1>
        <div className="mt-meta">
          <span className="chip static">{fmtDuration(m.durationS)}</span>
          {when && <span className="chip static" title={`${timeAgo(m.start)}`}>{when}</span>}
          {avg && m.avgBadge && <span className="chip static mt-avg" style={{ ['--rc' as string]: RANK_COLOR[avg.rank as keyof typeof RANK_COLOR] } as React.CSSProperties}><RankBadge rank={avg.rank} sub={avg.sub} size="xs" />Lobby {badgeLabel(m.avgBadge)}</span>}
          {m.notScored && <span className="chip static" title="The game did not count toward ratings">Not scored</span>}
          <CopyCode code={String(m.id)} label="Copy match ID" />
        </div>
      </div>
      <div className="mt-score" aria-label={`${SIDE_NAME[hk.side]} ${brawl ? hk.score ?? 0 : hk.kills}, ${SIDE_NAME[am.side]} ${brawl ? am.score ?? 0 : am.kills}`}>
        <SideScore t={hk} brawl={brawl} />
        <div className="mt-vs"><i>{brawl ? 'rounds' : 'kills'}</i></div>
        <SideScore t={am} brawl={brawl} />
      </div>
    </section>
  );
}

function Highlights({ m, names, onPick }: { m: MatchDetail; names: Names; onPick: (p: MatchPlayer) => void }) {
  const list: { label: string; p?: MatchPlayer; value: string }[] = [
    (() => { const p = leader(m.players, (x) => x.damage); return { label: 'Most damage', p, value: k1(p?.damage) }; })(),
    (() => { const p = leader(m.players, (x) => x.healing); return { label: 'Most healing', p, value: k1(p?.healing) }; })(),
    (() => { const p = leader(m.players, (x) => x.netWorth); return { label: 'Most souls', p, value: k1(p?.netWorth) }; })(),
    (() => { const p = leader(m.players, (x) => x.bossDamage); return { label: 'Most objective damage', p, value: k1(p?.bossDamage) }; })(),
  ].filter((x) => x.p);
  if (!list.length) return null;
  return (
    <ul className="mt-hl" aria-label="Standouts">
      {list.map((x) => {
        const h = getHero(x.p!.heroSlug);
        return (
          <li key={x.label} className={x.p!.side}>
            <button type="button" onClick={() => onPick(x.p!)} title="Show this player’s build">
              {h ? <HeroFace hero={h} size="lg" /> : <span className="face lg">?</span>}
              <span><small>{x.label}</small><b>{x.value}</b><em>{nameOf(names, x.p!.accountId)}</em></span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Souls lead chart
// ---------------------------------------------------------------------------------------------------------

function LeadChart({ m }: { m: MatchDetail }) {
  const uid = useId().replace(/:/g, '');
  const pts = m.lead;
  if (pts.length < 3) return null;
  const W = 1000, H = 250, L = 56, R = 112, T = 18, B = 34;
  const maxAbs = Math.max(2000, ...pts.map((p) => Math.abs(p.v)));
  const step = maxAbs > 20000 ? 10000 : maxAbs > 8000 ? 5000 : maxAbs > 3000 ? 2000 : 1000;
  const top = Math.ceil(maxAbs / step) * step;
  const tEnd = Math.max(m.durationS, pts[pts.length - 1].t);
  const x = (t: number) => L + (t / tEnd) * (W - L - R);
  const y = (v: number) => T + ((top - v) / (2 * top)) * (H - T - B);
  const y0 = y(0);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join('');
  const area = `${line}L${x(pts[pts.length - 1].t).toFixed(1)} ${y0}L${x(pts[0].t).toFixed(1)} ${y0}Z`;
  const ticks = [top, top / 2, 0, -top / 2, -top];
  const mins: number[] = [];
  for (let s = 0; s <= tEnd; s += step >= 5000 ? 600 : 300) mins.push(s);
  const last = pts[pts.length - 1];
  const final = last.v >= 0 ? 'hidden-king' : 'archmother';
  return (
    <section className="mt-lead panel pad" aria-label="Souls lead over time">
      <div className="mt-lead-head">
        <h3>Souls lead</h3>
        <small>Team net worth, one side minus the other</small>
        <span className={`mt-lead-now ${final}`}>{SIDE_SHORT[final]} <b>{signed(Math.abs(last.v))}</b> at the end</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`The ${SIDE_SHORT[final]} finished ${k1(Math.abs(last.v))} souls ahead`}>
        <defs>
          <clipPath id={`${uid}a`}><rect x={L} y={T} width={W - L - R} height={Math.max(0, y0 - T)} /></clipPath>
          <clipPath id={`${uid}b`}><rect x={L} y={y0} width={W - L - R} height={Math.max(0, H - B - y0)} /></clipPath>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line className={v === 0 ? 'mt-zero' : 'mt-grid-l'} x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
            <text className="mt-ax" x={L - 8} y={y(v) + 4} textAnchor="end">{v === 0 ? '0' : signed(v)}</text>
          </g>
        ))}
        {mins.map((s) => (
          <text key={s} className="mt-ax" x={x(s)} y={H - 10} textAnchor="middle">{s / 60}m</text>
        ))}
        <path className="mt-area hidden-king" d={area} clipPath={`url(#${uid}a)`} />
        <path className="mt-area archmother" d={area} clipPath={`url(#${uid}b)`} />
        <path className="mt-line" d={line} fill="none" />
        {pts.map((p) => (
          <circle key={p.t} className="mt-dot" cx={x(p.t)} cy={y(p.v)} r={3.2}><title>{`${clock(p.t)} · ${p.v >= 0 ? SIDE_SHORT['hidden-king'] : SIDE_SHORT.archmother} ${signed(Math.abs(p.v))}`}</title></circle>
        ))}
        <text className="mt-end hidden-king" x={W - R + 8} y={T + 10}>{SIDE_SHORT['hidden-king']}</text>
        <text className="mt-end archmother" x={W - R + 8} y={H - B - 2}>{SIDE_SHORT.archmother}</text>
      </svg>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------------------------------------

function MvpTag({ rank }: { rank?: number }) {
  if (!rank) return null;
  return <i className={`mt-mvp r${rank}`} title={rank === 1 ? 'Best player of the game' : `Number ${rank} player of the game`}>{rank === 1 ? 'MVP' : `#${rank}`}</i>;
}

function PlayerRow({ p, names, sel, maxDmg, onPick }: { p: MatchPlayer; names: Names; sel: boolean; maxDmg: number; onPick: (p: MatchPlayer) => void }) {
  const h = getHero(p.heroSlug);
  const hit = names.get(p.accountId);
  const badge = p.badge ? badgeParts(p.badge) : null;
  const dmgPct = maxDmg > 0 && p.damage !== undefined ? Math.max(3, (p.damage / maxDmg) * 100) : 0;
  return (
    <li className={`mt-p ${p.side}${sel ? ' sel' : ''}${p.won ? ' won' : ''}`}>
      <button type="button" className="mt-pick" aria-pressed={sel} aria-label={`Show the build of ${hit?.name ?? `player ${p.accountId}`} on ${h?.name ?? 'a hero'}`} onClick={() => onPick(p)} />
      <span className="mt-who">
        {h ? <HeroFace hero={h} size="lg" /> : <span className="face lg">?</span>}
        <span className="mt-names">
          <span className="mt-pn">
            <Avatar src={hit?.avatar} size={20} lazy />
            <Link to={`/player/${p.accountId}`}>{hit?.name ?? `Player ${p.accountId}`}</Link>
            <MvpTag rank={p.mvp} />
          </span>
          <small>{h?.name ?? 'Retired hero'} · Lv {p.level}{p.lane ? <> · <span className={`mt-lane ${p.lane}`}>{LANE_NAME[p.lane]}</span></> : null}{p.abandonedAt ? <> · <span className="bad">left at {clock(p.abandonedAt)}</span></> : null}</small>
        </span>
        {badge && p.badge ? <span className="mt-rank" title={badgeLabel(p.badge)}><RankBadge rank={badge.rank} sub={badge.sub} size="xs" /></span> : null}
      </span>
      <span className="mt-kda"><b>{p.kills} / {p.deaths} / {p.assists}</b><small>{kdaRatio(p.kills, p.deaths, p.assists).toFixed(2)} KDA</small></span>
      <span className="mt-nw"><b>{k1(p.netWorth)}</b><small>{p.lastHits} LH · {p.denies} DN</small></span>
      <span className="mt-dmg">
        {p.damage !== undefined && <><b>{k1(p.damage)}</b><span className="bar" aria-hidden="true"><i style={{ width: `${dmgPct}%` }} /></span></>}
      </span>
      <span className="mt-heal">{p.healing !== undefined && <><b>{k1(p.healing)}</b><small>healing</small></>}</span>
      {p.held.length > 0 && (
        <span className="mt-held">{p.held.map((i) => <ItemIcon key={`${i.id}-${i.at}`} item={i} size="sm" />)}</span>
      )}
    </li>
  );
}

function TeamPanel({ t, names, selected, maxDmg, onPick, brawl }: { t: TeamTotals; names: Names; selected: number | undefined; maxDmg: number; onPick: (p: MatchPlayer) => void; brawl: boolean }) {
  return (
    <section className={`mt-team panel ${t.side}${t.won ? ' won' : ''}`} aria-label={SIDE_NAME[t.side]}>
      <header>
        <span className="mt-flag" aria-hidden="true" />
        <h3>{SIDE_NAME[t.side]}</h3>
        <b className={`mt-res ${t.won ? 'good' : 'bad'}`}>{t.won ? 'Victory' : 'Defeat'}{brawl && t.score !== undefined ? ` · ${t.score} rounds` : ''}</b>
        <span className="mt-tot">
          <span><small>K / D / A</small><b>{t.kills} / {t.deaths} / {t.assists}</b></span>
          <span><small>Souls</small><b>{k1(t.netWorth)}</b></span>
          {t.damage > 0 && <span><small>Damage</small><b>{k1(t.damage)}</b></span>}
          {t.avgBadge ? <span className="mt-opt"><small>Rank</small><b>{badgeLabel(t.avgBadge)}</b></span> : null}
        </span>
      </header>
      <ol className="mt-plist">
        {t.players.map((p) => <PlayerRow key={p.slot} p={p} names={names} sel={selected === p.accountId} maxDmg={maxDmg} onPick={onPick} />)}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------
// One player's build and numbers
// ---------------------------------------------------------------------------------------------------------

function Meter({ label, value, share }: { label: string; value: string; share?: number }) {
  if (value === '–') return null;
  return (
    <div className="mt-stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
      {share !== undefined && <span className="bar" aria-hidden="true"><i style={{ width: `${Math.min(100, Math.max(2, share * 100))}%` }} /></span>}
    </div>
  );
}

function Curve({ p, m }: { p: MatchPlayer; m: MatchDetail }) {
  const uid = useId().replace(/:/g, '');
  if (p.curve.length < 3) return null;
  const W = 360, H = 120, L = 6, R = 6, T = 8, B = 16;
  const others = m.players.filter((o) => o !== p && o.curve.length === p.curve.length);
  const avg = p.curve.map((c, i) => (others.length ? others.reduce((n, o) => n + o.curve[i].v, 0) / others.length : c.v));
  const top = Math.max(...p.curve.map((c) => c.v), ...avg, 1000);
  const tEnd = Math.max(m.durationS, p.curve[p.curve.length - 1].t);
  const x = (t: number) => L + (t / tEnd) * (W - L - R);
  const y = (v: number) => T + (1 - v / top) * (H - T - B);
  const path = (vals: number[]) => p.curve.map((c, i) => `${i ? 'L' : 'M'}${x(c.t).toFixed(1)} ${y(vals[i]).toFixed(1)}`).join('');
  const mine = path(p.curve.map((c) => c.v));
  return (
    <div className="mt-curve">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Souls over the game against the lobby average">
        <defs><linearGradient id={`${uid}g`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity="0.35" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
        <path d={`${mine}L${x(p.curve[p.curve.length - 1].t)} ${H - B}L${x(0)} ${H - B}Z`} fill={`url(#${uid}g)`} className="mt-c-fill" />
        <path d={path(avg)} className="mt-c-avg" fill="none" />
        <path d={mine} className="mt-c-me" fill="none" />
        <text className="mt-ax" x={L} y={H - 3}>0</text>
        <text className="mt-ax" x={W - R} y={H - 3} textAnchor="end">{Math.round(tEnd / 60)}m</text>
      </svg>
      <p><i className="me" />{k1(p.curve[p.curve.length - 1].v)} souls <i className="avg" />lobby average {k1(avg[avg.length - 1])}</p>
    </div>
  );
}

function Detail({ p, m, names }: { p: MatchPlayer; m: MatchDetail; names: Names }) {
  const h = getHero(p.heroSlug);
  const hit = names.get(p.accountId);
  const art = h ? h.art ?? h.render ?? h.portrait : undefined;
  const maxDmg = Math.max(...m.players.map((x) => x.damage ?? 0), 1);
  const maxHeal = Math.max(...m.players.map((x) => x.healing ?? 0), 1);
  const maxTaken = Math.max(...m.players.map((x) => x.damageTaken ?? 0), 1);
  const sold = p.bought.filter((i) => !i.held);
  const groups = Math.max(0, ...p.skills.map((s) => s.group)) + 1;
  return (
    <div className={`mt-detail ${p.side}`}>
      <header>
        {art && <img className="mt-d-art" src={art} alt="" loading="lazy" />}
        <div className="mt-d-top">
          <span className="mt-d-res"><b className={p.won ? 'good' : 'bad'}>{p.won ? 'Won' : 'Lost'}</b>{p.mvp ? <MvpTag rank={p.mvp} /> : null}</span>
          <h3>{hit?.name ?? `Player ${p.accountId}`}</h3>
          <p>{h ? <Link to={`/hero/${h.slug}`}>{h.name}</Link> : 'Retired hero'} · Level {p.level}{p.lane ? ` · ${LANE_NAME[p.lane]}` : ''} · {SIDE_SHORT[p.side]}</p>
          <div className="mt-d-kda"><b>{p.kills}</b><i>/</i><b>{p.deaths}</b><i>/</i><b>{p.assists}</b><small>{kdaRatio(p.kills, p.deaths, p.assists).toFixed(2)} KDA</small></div>
          <Link className="chip" to={`/player/${p.accountId}`}>Player page {'→'}</Link>
        </div>
      </header>

      {p.curve.length > 2 && <><h4 className="mt-d-h">Souls over the game</h4><Curve p={p} m={m} /></>}

      <h4 className="mt-d-h">Final build</h4>
      {p.held.length ? <div className="mt-final">{p.held.map((i) => <ItemIcon key={`${i.id}-${i.at}`} item={i} size="lg" note={clock(i.at)} />)}</div> : <p className="muted">The API has no item record for this game.</p>}

      {p.bought.length > 0 && (
        <>
          <h4 className="mt-d-h">Bought, in order <small>{p.bought.length} items{sold.length ? ` · ${sold.length} sold or upgraded` : ''}</small></h4>
          <ol className="mt-order">
            {p.bought.map((i, n) => (
              <li key={`${i.id}-${i.at}-${n}`} className={i.held ? '' : 'sold'}>
                <ItemIcon item={i} size="sm" />
                <span>{clock(i.at)}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      {p.skills.length > 0 && (
        <>
          <h4 className="mt-d-h">Ability points <small>{p.skills.length} spent · {groups} abilities, coloured by order learned</small></h4>
          <ol className="mt-skills">
            {p.skills.map((s, i) => <li key={i} data-g={s.group % 6} title={`Learned at ${clock(s.at)}`}>{s.level}</li>)}
          </ol>
        </>
      )}

      <h4 className="mt-d-h">Numbers</h4>
      <dl className="mt-stats">
        <Meter label="Hero damage" value={k1(p.damage)} share={p.damage !== undefined ? p.damage / maxDmg : undefined} />
        <Meter label="Healing" value={k1(p.healing)} share={p.healing !== undefined ? p.healing / maxHeal : undefined} />
        <Meter label="Damage taken" value={k1(p.damageTaken)} share={p.damageTaken !== undefined ? p.damageTaken / maxTaken : undefined} />
        <Meter label="Objective damage" value={k1(p.bossDamage)} />
        <Meter label="Neutral damage" value={k1(p.neutralDamage)} />
        <Meter label="Lane creeps" value={p.creeps !== undefined ? fmtInt(p.creeps) : '–'} />
        <Meter label="Accuracy" value={p.accuracy !== undefined ? `${p.accuracy}%` : '–'} />
        <Meter label="Last hits / denies" value={`${p.lastHits} / ${p.denies}`} />
        <Meter label="Souls" value={fmtInt(p.netWorth)} />
      </dl>
    </div>
  );
}

function LobbyItems({ m }: { m: MatchDetail }) {
  const use = useMemo(() => itemUse(m.players, 10), [m]);
  if (!use.length || !use.some((u) => u.count > 1)) return null;
  return (
    <section className="mt-lobby panel pad" aria-label="Items most players ended with">
      <h3>What the lobby ended with</h3>
      <small>Items the most players still held when the game finished</small>
      <ul>
        {use.map((u) => <li key={u.item.id}><ItemIcon item={u.item} size="md" /><b>×{u.count}</b></li>)}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------------------------------------

export default function MatchPage() {
  const { matchId } = useParams();
  const [sp, setSp] = useSearchParams();
  const id = matchId && /^\d{1,12}$/.test(matchId) ? Number(matchId) : null;
  const state = useAsync((signal) => (id ? dataSource.matchDetail(id, signal) : Promise.reject(new Error('That is not a match number'))), [id]);
  const m = state.status === 'ready' ? state.value : null;
  const ids = useMemo(() => (m ? m.players.map((p) => p.accountId) : []), [m]);
  const people = useAsync((signal) => (ids.length ? dataSource.playerHits(ids, signal) : Promise.resolve(new Map<number, PlayerHit>())), [ids.join(',')]);
  const names: Names = people.status === 'ready' ? people.value : new Map();
  const detailRef = useRef<HTMLElement>(null);

  const wanted = Number(sp.get('player'));
  const selected = m ? m.players.find((p) => p.accountId === wanted) ?? m.players.find((p) => p.mvp === 1) ?? m.players[0] : undefined;
  useTitle(m ? `${QUEUE_LABEL[m.kind]} match ${m.id}` : 'Match');

  const pick = (p: MatchPlayer) => {
    setSp((prev) => { const n = new URLSearchParams(prev); n.set('player', String(p.accountId)); return n; }, { replace: true });
    if (window.innerWidth < 1100) window.requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const back = wanted > 0 ? `/player/${wanted}` : '/matches';
  const maxDmg = m ? Math.max(...m.players.map((p) => p.damage ?? 0), 1) : 1;
  const notFound = state.status === 'error' && /404|not found/i.test(state.message);

  return (
    <div className="wrap mt">
      <div className="crumbs">
        <span><Link to={back}>{wanted > 0 ? 'Player' : 'Matches'}</Link> / Match {id ?? matchId}</span>
      </div>

      {state.status === 'loading' && <div className="panel mt-head mt-skeleton" role="status" aria-busy="true"><h1>Pulling the match file…</h1><small>Match {id}</small></div>}
      {state.status === 'error' && (
        <div className="panel empty" role="alert">
          <h3>{id === null ? 'That isn’t a match number' : notFound ? 'No record of this match' : 'Couldn’t load this match'}</h3>
          <p>{id === null ? 'Match numbers are plain digits, like the one in a match link on a player page.' : notFound ? `The Deadlock API has no match ${id}. Games from the last few minutes can take a while to show up, and private lobbies are never recorded.` : `${state.message}. The Deadlock API may be busy.`}</p>
          <p><Link className="chip" to={back}>Go back</Link></p>
        </div>
      )}

      {m && selected && (
        <>
          {m.illustrative && <div className="notice"><b>Sample game.</b> Sample mode shows one saved real game for every match link, with generated player names. Switch to live data in the header to open the real match.</div>}
          <Head m={m} />
          <Highlights m={m} names={names} onPick={pick} />
          <LeadChart m={m} />

          <SectionHeading title="The two teams" />
          <div className="mt-grid">
            <div className="mt-teams">
              <p className="mt-hint muted">Pick a player to see their build, items and ability order.</p>
              {m.teams.map((t) => <TeamPanel key={t.side} t={t} names={names} selected={selected.accountId} maxDmg={maxDmg} onPick={pick} brawl={m.kind === 'brawl'} />)}
              <LobbyItems m={m} />
            </div>
            <aside className="mt-aside panel" ref={detailRef} aria-label="Selected player" aria-live="polite">
              <Detail p={selected} m={m} names={names} />
            </aside>
          </div>
          <p className="muted mt-fine">
            From the Deadlock API. Lane names follow the API’s lane numbers, which are the best reading of the game’s lane colours. The sold or upgraded items are components used to build bigger ones.
          </p>
        </>
      )}
      <SiteFooter />
    </div>
  );
}

