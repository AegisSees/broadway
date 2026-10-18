import Kicker from '../components/Kicker';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import SearchBox from '../components/SearchBox';
import TierTag from '../components/TierTag';
import { BROADWAY, GREENWICH, HallBackdrop, YORK } from '../components/LaneBackdrop';
import { SiteFooter } from '../components/Shell';
import { HeroFace } from '../components/HeroFace';
import { getHero } from '../data/roster';
import { getItem } from '../data/items';
import { getHeroBg } from '../data/heroStats';
import { rankBadge } from '../data/ranks';
import Spotlight from '../components/Spotlight';
import MetaNow from '../components/MetaNow';
import { SAMPLE_MOVERS, SAMPLE_PATCH_NOTES } from '../data/fixtures';
import { dataSource } from '../data/source';
import { DEFAULT_FILTERS } from '../data/types';
import { useAsync } from '../data/useAsync';
import { useFavorites } from '../lib/favorites';
import { fmtInt, fmtPct } from '../lib/stats';
import type { PatchNote } from '../data/patches';
import type { TierRow } from '../data/tiers';
import { useTitle } from '../lib/useTitle';
import { usePaperTilt } from '../lib/paperTilt';
import titleYellow from '../assets/city/lane-title-yellow.webp';
import titleBlue from '../assets/city/lane-title-blue.webp';
import titleGreen from '../assets/city/lane-title-green.webp';
import mapYellow from '../assets/city/map-yellow.webp';
import mapBlue from '../assets/city/map-blue.webp';
import mapGreen from '../assets/city/map-green.webp';

const LANES = [
  { n: 1, name: 'York', note: 'The yellow lane', imgs: YORK, cls: 'york', title: titleYellow, map: mapYellow },
  { n: 2, name: 'Broadway', note: 'The blue lane. Where Broadway began', imgs: BROADWAY, cls: 'broadway', title: titleBlue, map: mapBlue },
  { n: 3, name: 'Greenwich', note: 'The green lane', imgs: GREENWICH, cls: 'greenwich', title: titleGreen, map: mapGreen },
];

const bgFor = (...slugs: string[]) => slugs.map((s) => getHeroBg(s)).find(Boolean);
const renderFor = (...slugs: string[]) => slugs.map((s) => getHero(s)?.render).find(Boolean);

function Tiles() {
  const [seed] = useState(() => Math.floor(Math.random() * 4));
  const pool = [['haze', 'ivy', 'wraith', 'abrams'], ['lash', 'bebop', 'grey-talon', 'seven'], ['viscous', 'vindicta', 'mirage', 'paradox'], ['infernus', 'kelvin', 'mo-and-krill', 'yamato']];
  const pic = (i: number) => bgFor(...[...pool[(seed + i) % 4], ...pool[(seed + i + 1) % 4]]);
  const face = (i: number) => renderFor(...[...pool[(seed + i) % 4], ...pool[(seed + i + 1) % 4]]);
  const tiles = [
    { to: '/heroes', label: 'Heroes', note: 'Every hero, stats and builds', bg: face(0), cls: 'heroes' },
    { to: '/leaderboard', label: 'Ranked', note: 'The top 500, per region and hero', bg: pic(1), cls: 'ranked' },
    { to: '/matches', label: 'Live matches', note: 'Games being played right now', bg: face(2), cls: 'live', live: true },
    { to: '/streams', label: 'Livestreams', note: 'Who is on air', bg: face(3), cls: 'streams', live: true },
    { to: '/builds', label: 'Builds', note: 'Meta, community and Eternus', bg: pic(4), cls: 'builds' },
  ];
  return (
    <section className="tiles" aria-labelledby="tiles-h">
      <div className="dotline"><span id="tiles-h">Explore the city</span></div>
      <div className="tile-row">
        {tiles.map((t, i) => (
          <Link key={t.to} to={t.to} className={`tile ${t.cls}`} style={{ ['--tilt' as string]: `${[-1.2, 0.8, -0.6, 1, -0.9][i]}deg` } as React.CSSProperties}>
            <span className="pic" style={t.bg ? { backgroundImage: `url(${t.bg})` } : undefined} aria-hidden="true">
              {t.cls === 'ranked' && <span className="badges">{['Phantom', 'Ascendant', 'Eternus'].map((r) => <img key={r} src={rankBadge(r)} alt="" loading="lazy" />)}</span>}
              {t.cls === 'builds' && <span className="badges">{['Rapid Rounds', 'Ricochet', 'Unstoppable'].map((n) => { const it = getItem(n); return it?.icon ? <img key={n} src={it.icon} alt="" loading="lazy" /> : null; })}</span>}
            </span>
            <span className="tape">{t.label}{t.live && <i className="live-dot" aria-hidden="true" />}</span>
            <small>{t.note}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (unix: number) => { const d = new Date(unix * 1000); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`; };

/** The game's own update posts, newest first. Falls back to a labelled example block when the source has none. */
function Patches() {
  const paper = usePaperTilt<HTMLElement>();
  const state = useAsync((signal) => dataSource.patchNotes(signal), []);
  const notes: PatchNote[] | null = state.status === 'ready' ? state.value : null;
  return (
    <aside className="paper-note" aria-labelledby="patch-h" ref={paper}>
      <Kicker>Latest patch</Kicker>
      <h2 id="patch-h">What changed</h2>
      {state.status === 'loading' && <p className="muted" role="status">Reading the notice board…</p>}
      {notes && notes.length > 0 && notes.slice(0, 3).map((p) => (
        <div className="patch" key={p.link}>
          <span className={`tag-pill ${p.source === 'forum' ? 'buff' : 'adj'}`}>{p.source === 'forum' ? 'Patch notes' : 'News'}</span>{' '}
          <a href={p.link} target="_blank" rel="noreferrer noopener"><b>{p.title}</b></a> <small>{fmtDate(p.date)}</small>
          {p.excerpt && <><br /><small>{p.excerpt}</small></>}
        </div>
      ))}
      {notes && notes.length > 0 && <p className="patch-src"><small>From Valve’s update posts. Broadway links to the originals rather than restating numbers.</small></p>}
      {(state.status === 'error' || (state.status === 'ready' && (!notes || notes.length === 0))) && (
        <>
          {SAMPLE_PATCH_NOTES.map((p) => (
            <div className="patch" key={p.title}>
              <span className={`tag-pill ${p.tag}`}>{p.tag === 'adj' ? 'Adjust' : p.tag}</span><b>{p.title}</b><br /><small>{p.body}</small>
            </div>
          ))}
          <p className="patch-src"><small>Example entries. Real update posts appear with live data.</small></p>
        </>
      )}
    </aside>
  );
}

/** Top of the tier list, and the heroes that moved most over the last week. */
function useMarquee() {
  const state = useAsync((signal) => dataSource.tierList(DEFAULT_FILTERS, signal), []);
  const list = state.status === 'ready' ? state.value : null;
  const top: TierRow[] = list ? list.rows.slice(0, 8) : [];
  const movers = list && !list.illustrative
    ? (() => {
        const withDelta = list.rows.filter((r) => r.delta !== undefined && Math.abs(r.delta) >= 0.1 && r.matches >= 2000);
        const up = [...withDelta].sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0)).slice(0, 2);
        const down = [...withDelta].sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0)).filter((r) => !up.includes(r)).slice(0, 2);
        return [...up.filter((r) => (r.delta ?? 0) > 0), ...down.filter((r) => (r.delta ?? 0) < 0)].map((r) => ({ slug: r.slug, delta: r.delta ?? 0 }));
      })()
    : SAMPLE_MOVERS;
  return { state, list, top, movers };
}

export default function Home() {
  useTitle('');
  // A different spotlight hero and lane photo are picked on every visit; they stay fixed while browsing the page.
  const [pick] = useState(() => Math.floor(Math.random() * 3));
  const { favs } = useFavorites();
  const followed = favs.map((s) => getHero(s)).filter((h) => !!h);
  const { state: tierState, list: tierList, top, movers } = useMarquee();
  return (
    <>
      <section className="hero">
        <HallBackdrop />
        <div className="wash" />
        <div className="wrap">
          <div className="inner">
            <div>
              <Kicker>The city has its secrets</Kicker>
              <h1>Find your edge.<em>Rule Manhattan.</em></h1>
              <p className="lede">Ranked hero stats, builds and matchups, with the sample size shown next to every number.</p>
              <div style={{ marginTop: 24 }}><SearchBox large /></div>
              <div className="quick">
                {['haze', 'ivy', 'wraith'].map((s) => { const h = getHero(s); return h && (
                  <Link key={s} to={`/hero/${s}`}><HeroFace hero={h} size="sm" />{h.name}</Link>
                ); })}
                <Link to="/tiers" className="plain">Tier list</Link>
                <Link to="/player" className="plain">Find a player</Link>
                <Link to="/hero/haze?mode=street_brawl" className="plain">Street Brawl</Link>
              </div>
            </div>
            <div className="spot-hold"><Spotlight /></div>
          </div>
        </div>
      </section>
      <div className="wrap">
        <MetaNow list={tierList} />
        <Tiles />
        <div className="home-grid">
          <section className="panel">
            <div className="eyebrow">Standard {'·'} Ranked {'·'} {tierList && !tierList.illustrative ? 'live' : 'illustrative sample'}</div>
            <h2>On the marquee</h2>
            {tierState.status === 'loading' && <p className="muted" role="status">Reading the standings…</p>}
            {tierState.status === 'error' && <p role="alert">Couldn’t load the standings: {tierState.message}.</p>}
            <table className="data tl">
              <thead><tr><th>Hero</th><th style={{ textAlign: 'center' }}>Tier</th><th>Win rate</th><th>Pick rate</th><th>Matches</th></tr></thead>
              <tbody>
                {top.map((r) => { const h = getHero(r.slug); return (
                  <tr key={r.slug}>
                    <td><span className="hn">{h && <HeroFace hero={h} />}<Link to={`/hero/${r.slug}`}>{h?.name ?? r.slug}</Link></span></td>
                    <td className="tiercell"><TierTag tier={r.tier} size="sm" /></td>
                    <td className="good">{fmtPct(r.winRate)}</td><td>{fmtPct(r.pickRate)}</td><td className="muted">{fmtInt(r.matches)}</td>
                  </tr>
                ); })}
              </tbody>
            </table>
            <p style={{ marginTop: 12 }}><Link to="/tiers" className="chip">See the full tier list</Link></p>
          </section>
          <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
            <Patches />
            {movers.length > 0 && <section className="panel">
              <div className="eyebrow">This week {'·'} {tierList && !tierList.illustrative ? 'live' : 'sample'}</div>
              <h2>Biggest movers</h2>
              <div className="strip">
                {movers.map((m) => { const h = getHero(m.slug); return h && (
                  <Link key={m.slug} to={`/hero/${m.slug}`}>
                    <HeroFace hero={h} size="lg" />{h.name}<br />
                    <small className={m.delta >= 0 ? 'good' : 'bad'}>{m.delta >= 0 ? '+' : '−'}{Math.abs(m.delta).toFixed(1)} pts</small>
                  </Link>
                ); })}
              </div>
            </section>}
          </div>
        </div>
        {followed.length > 0 && (
          <section className="panel followed" aria-label="Followed heroes">
            <div className="eyebrow">Your heroes</div>
            <div className="strip">
              {followed.map((h) => h && (
                <Link key={h.slug} to={`/hero/${h.slug}`}><HeroFace hero={h} size="lg" />{h.name}</Link>
              ))}
            </div>
          </section>
        )}
        <section className="tools" aria-labelledby="tools-h">
          <div className="section-heading"><span className="star">{'✦'}</span><h2 id="tools-h">Tools of the trade</h2></div>
          <div className="tool-row">
            <Link to="/planner" className="tool-card">
              <div className="art items">{['Rapid Rounds', 'Swift Striker', 'Ricochet', 'Unstoppable'].map((n) => { const i = getItem(n); return i?.icon ? <img key={n} src={i.icon} alt="" loading="lazy" /> : null; })}</div>
              <b>Build planner</b><span>Pick twelve items, see the cost, the stat totals and what your hero looks like with them. Share the link.</span>
            </Link>
            <Link to="/compare/haze/abrams" className="tool-card">
              <div className="art duel">{['haze', 'abrams'].map((s) => { const h = getHero(s); return h?.portrait ? <img key={s} src={h.portrait} alt="" loading="lazy" /> : null; })}<i>VS</i></div>
              <b>Compare heroes</b><span>Base health, speed, weapon and melee side by side from the game files, plus their head-to-head record once live data is on.</span>
            </Link>
            <Link to="/leaderboard" className="tool-card">
              <div className="art ranks">{['Sentinel', 'Oracle', 'Phantom', 'Eternus'].map((r) => <img key={r} src={rankBadge(r)} alt="" loading="lazy" />)}</div>
              <b>Leaderboards</b><span>The top 100 players in every region, or the best players of each hero. Scroll on to reach the top 500.</span>
            </Link>
          </div>
        </section>
        <section className="lanes" aria-labelledby="lanes-h">
          <div className="section-heading"><span className="star">{'✦'}</span><h2 id="lanes-h">Three lanes, one city</h2></div>
          <div className="lane-row">
            {LANES.map((l) => (
              <figure key={l.name} className={`lane-card ${l.cls}`}>
                <div className="print">
                  <img src={l.imgs[pick % l.imgs.length]} alt="" loading="lazy" />
                  <span className="lane-tag">Lane {l.n}</span>
                  <img className="lane-map" src={l.map} alt="" loading="lazy" />
                </div>
                <figcaption><img className="lane-title" src={l.title} alt={l.name} loading="lazy" /><small>{l.note}</small></figcaption>
              </figure>
            ))}
          </div>
        </section>
        <SiteFooter />
      </div>
    </>
  );
}
