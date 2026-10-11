import AbilityBreakdown from '../components/AbilityBreakdown';
import Kicker from '../components/Kicker';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BuildBoard from '../components/BuildBoard';
import WinTrend from '../components/WinTrend';
import Controls from '../components/Controls';
import TierTag from '../components/TierTag';
import LaneBackdrop from '../components/LaneBackdrop';
import Tip from '../components/Tip';
import AbilityTip from '../components/AbilityTip';
import MatchupColumn from '../components/MatchupColumn';
import { SiteFooter } from '../components/Shell';
import { getAbilities } from '../data/abilities';
import { getGloat } from '../data/heroGloat';
import { getWordmark } from '../data/names';
import { getHero, initials } from '../data/roster';
import { dataSource } from '../data/source';
import { useAsync } from '../data/useAsync';
import type { HeroOverview } from '../data/types';
import { confidence, confidenceLabel, fmtInt, fmtPct, tierFromWinRate } from '../lib/stats';
import { useFilters } from '../lib/useFilters';
import { useTitle } from '../lib/useTitle';
import NotFound from './NotFound';
import FavStar from '../components/FavStar';
import HeroTags from '../components/HeroTags';
import DraftPlanner from '../components/DraftPlanner';
import HighRolls from '../components/HighRolls';
import TrendsPanel from '../components/TrendsPanel';
import HeroStatsPanel from '../components/HeroStatsPanel';
import { getHeroBg, getHeroStats } from '../data/heroStats';
import { getHeroColor } from '../data/heroColors';
import SectionHeading from '../components/SectionHeading';

function CopyChip({ id }: { id: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="chip" onClick={() => { void navigator.clipboard?.writeText(id).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }); }}>
      {done ? 'Copied' : `#${id} · copy`}
    </button>
  );
}

function Stats({ o }: { o: HeroOverview }) {
  const tier = o.tier ?? tierFromWinRate(o.winRate);
  const items: { label: string; value?: string; hi?: boolean; note?: string; lead?: React.ReactNode; tier?: boolean }[] = [
    { label: 'Tier', tier: true, note: o.tier ? undefined : 'By win rate' },
    { label: 'Win rate', value: fmtPct(o.winRate), hi: true },
    ...(o.overallRank ? [{ label: 'Overall rank', value: `${o.overallRank.rank} / ${o.overallRank.of}` }] : []),
    { label: 'Pick rate', value: fmtPct(o.pickRate) },
    ...(o.banRate !== undefined ? [{ label: 'Ban rate', value: fmtPct(o.banRate) }] : []),
    { label: 'Matches', value: fmtInt(o.matches), note: confidenceLabel[confidence(o.matches)] },
  ];
  return (
    <div className="panel stats" data-n={items.length} style={{ ['--n' as string]: items.length } as React.CSSProperties}>
      {items.map((i) => (
        <div key={i.label} className={i.lead ? 'lead' : i.tier ? 'tiercell' : ''}>
          {i.lead}
          <span className="val">
            <small>{i.label}</small>
            {i.tier ? <TierTag tier={tier} size="md" /> : <b className={i.hi ? 'hi' : ''}>{i.value}</b>}
            {i.note && <em>{i.note}</em>}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function HeroPage() {
  const { slug } = useParams();
  const hero = getHero(slug);
  const [filters, setFilters] = useFilters();
  const state = useAsync((signal) => (hero ? dataSource.heroOverview(hero.slug, filters, signal) : Promise.resolve(null)), [hero?.slug, filters.mode, filters.queue, filters.rank]);
  const trend = useAsync((signal) => (hero ? dataSource.heroTrend(hero.slug, filters, signal) : Promise.resolve(null)), [hero?.slug, filters.mode, filters.queue, filters.rank]);
  const builds = useAsync((signal) => (hero ? dataSource.heroBuilds(hero.slug, filters, signal) : Promise.resolve(null)), [hero?.slug, filters.mode, filters.queue, filters.rank]);
  const [tab, setTab] = useState('overview');
  useTitle(hero?.name ?? 'Hero');
  if (!hero) return <NotFound />;

  const abilities = getAbilities(hero.slug);
  const wordmark = getWordmark(hero.slug);
  const overview = state.status === 'ready' ? state.value : null;
  const isHaze = hero.slug === 'haze';
  const brawl = filters.mode === 'street_brawl';
  const tabs: { id: string; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'builds', label: brawl && overview?.highRolls ? 'High rolls' : 'Builds' },
    ...(!brawl && overview ? [{ id: 'matchups', label: 'Matchups' }] : []),
    ...(overview && (overview.trends || overview.damage) ? [{ id: 'trends', label: 'Pick rate' }] : []),
    ...(getHeroStats(hero.slug) ? [{ id: 'stats', label: 'Base stats' }] : []),
    ...(abilities ? [{ id: 'abilities', label: 'Abilities' }] : []),
  ];
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <>
      <section className="hhero">
        <LaneBackdrop seed={hero.slug} />
        {getHeroBg(hero.slug) && <div className="hbg" style={{ backgroundImage: `url(${getHeroBg(hero.slug)})`, ['--hc' as string]: getHeroColor(hero.slug) } as React.CSSProperties} aria-hidden="true" />}
        <div className="wash" />
        {hero.art ? <img className="art" src={hero.art} alt="" /> : hero.render && <img className="render" src={hero.render} alt="" />}
        <div className="wrap inner">
          <div className="crumbs"><span><Link to="/heroes">Heroes</Link> / {hero.name}</span><FavStar slug={hero.slug} name={hero.name} label /></div>
          <div className="head">
            <div className={`portrait${getGloat(hero.slug) ? ' has-gloat' : ''}`} tabIndex={0} aria-label={hero.name}>
              {getGloat(hero.slug) && <img className="gloat" src={getGloat(hero.slug)} alt="" />}
              {hero.portrait || hero.icon ? <img src={(hero.portrait || hero.icon) as string} alt={hero.name} className={hero.portrait ? undefined : 'icon-fill'} /> : <div className="fallback" aria-hidden="true">{initials(hero.name)}</div>}
            </div>
            <div className="hero-name">
              <Kicker key={hero.slug}>{isHaze ? 'The unseen threat' : hero.unreleased ? 'New hero' : 'Hero dossier'}</Kicker>
              {wordmark ? <h1><img className="wordmark" src={wordmark} alt={hero.name} /></h1> : <h1 className="text-name">{hero.name}</h1>}
              <HeroTags slug={hero.slug} />
              {abilities ? (
                <div className="abil">
                  {abilities.map((a, i) => (
                    <Tip key={a.name} className="abil-tip" prefer="below" content={<AbilityTip ability={a} slot={i} />}>
                      <figure><div className="ic"><img src={a.icon} alt="" /><i>{i + 1}</i></div><figcaption>{a.name}</figcaption></figure>
                    </Tip>
                  ))}
                </div>
              ) : <span className="abil pending">{hero.unreleased ? `${hero.name}'s abilities have not been published yet.` : `Ability icons for ${hero.name} have not been added yet.`}</span>}
            </div>
          </div>
        </div>
      </section>

      <div className="wrap">
        <Controls filters={filters} onChange={setFilters} />
        {state.status === 'loading' && <p className="muted" role="status">Loading {hero.name}…</p>}
        {state.status === 'error' && (
          <div className="panel empty" role="alert"><h3>Couldn't load {hero.name}</h3><p>{state.message}. Try again in a moment.</p></div>
        )}
        {state.status === 'ready' && !overview && (
          <div className="notice hero-note">
            <b>Headline numbers and matchups</b>
            <span>
              {dataSource.id === 'fixture'
                ? `are only in the sample set for Haze (Standard, Ranked, All ranks, plus Street Brawl). ${hero.name}'s trend and builds below are illustrative samples too.`
                : `need more matches for ${hero.name} with these filters. Try All ranks or another queue.`}
              {isHaze && <> <button type="button" className="chip" onClick={() => setFilters({ mode: 'standard', queue: 'ranked', rank: 'all' })}>Reset filters</button></>}
              {!isHaze && dataSource.id === 'fixture' && <> <Link to="/hero/haze" className="chip">See the Haze sample page</Link></>}
            </span>
          </div>
        )}
        {overview?.provenance === 'illustrative' && (
          <div className="notice"><b>Illustrative data.</b> Numbers on this page are samples for design review, not real game statistics.</div>
        )}
        {overview && <Stats o={overview} />}

        <nav className="tabs" aria-label="Page sections">
          {tabs.map((t) => (
            <a key={t.id} href={`#${t.id}`} className={tab === t.id ? 'active' : ''} aria-current={tab === t.id ? 'true' : undefined} onClick={(e) => { e.preventDefault(); setTab(t.id); jump(t.id); }}>{t.label}</a>
          ))}
          <Link to={`/leaderboard?view=heroes&hero=${hero.slug}`}>Leaderboard</Link>
        </nav>

        <SectionHeading id="overview" title="Win rate over time" />
        {trend.status === 'loading' && <p className="muted" role="status">Loading the trend…</p>}
        {trend.status === 'error' && <div className="panel empty" role="alert"><h3>Couldn't load the trend</h3><p>{trend.message}.</p></div>}
        {trend.status === 'ready' && (trend.value
          ? <WinTrend key={`${hero.slug}${filters.mode}${filters.queue}${filters.rank}`} heroName={hero.name} trend={trend.value} />
          : <div className="panel empty"><h3>No history yet</h3><p>Daily win rate for {hero.name} isn't available from this data source yet.</p></div>)}

        {brawl && overview?.highRolls && (
          <>
            <SectionHeading id="builds" title="Street Brawl high rolls" />
            <DraftPlanner tiers={overview.highRolls} heroName={hero.name} />
            <div style={{ height: 18 }} />
            <HighRolls tiers={overview.highRolls} heroName={hero.name} heroIcon={hero.icon} />
          </>
        )}

        {!brawl && (
          <>
            <SectionHeading id="builds" title="Top builds" />
            {builds.status === 'loading' && <p className="muted" role="status">Loading builds…</p>}
            {builds.status === 'error' && <div className="panel empty" role="alert"><h3>Couldn't load builds</h3><p>{builds.message}.</p></div>}
            {builds.status === 'ready' && builds.value?.some((b) => b.illustrative) && overview?.provenance === 'live' && (
              <div className="notice"><b>Sample builds.</b> The numbers above come from real games, but build paths are not connected to the API yet, so the builds below are illustrative.</div>
            )}
            {builds.status === 'ready' && (builds.value
              ? <BuildBoard key={`${hero.slug}${filters.mode}${filters.queue}${filters.rank}`} builds={builds.value} heroName={hero.name} />
              : <div className="panel empty"><h3>Builds aren't connected yet</h3><p>Top builds for {hero.name} appear here once the builds endpoints are connected.</p></div>)}
            <p className="bb-more"><Link className="chip" to={`/builds?hero=${hero.slug}`}>Browse every {hero.name} build {'→'}</Link><Link className="chip" to={`/planner?hero=${hero.slug}`}>Plan your own {'→'}</Link></p>

            {overview && overview.guides.length > 0 && (
              <div className="panel pad guides" id="guides">
                <h3>Published guides</h3>
                <small>Community guides {'·'} Standard {'·'} saved snapshot</small>
                {overview.guides.slice(0, 3).map((g) => (
                  <div className="guide" key={g.id}>
                    <span className="t">{g.title}</span>
                    <small>By {g.author} {'·'} Updated {g.updated}</small>
                    <div className="chips">{g.tags.map((t) => <span key={t} className="chip" style={{ cursor: 'default' }}>{t}</span>)}<CopyChip id={g.id} /></div>
                  </div>
                ))}
              </div>
            )}

            {overview && (
              <>
                <SectionHeading id="matchups" title="Know your matchups" />
                <p className="muted" style={{ marginTop: -6, marginBottom: 14, fontSize: 13 }}>
                  Pick columns show the opponent's win rate over whole matches, not lane results. Lane synergy and lane deficit use the first nine minutes.
                </p>
                {overview.matchups.length > 0
                  ? <div className="mugrid" data-n={overview.matchups.length}>{overview.matchups.map((g) => <MatchupColumn key={g.key} group={g} heroName={hero.name} heroSlug={hero.slug} />)}</div>
                  : <div className="panel empty"><h3>No matchup data yet</h3><p>Matchups need enough head-to-head matches before they are listed.</p></div>}
              </>
            )}
          </>
        )}

        {overview && (overview.trends || overview.damage) && (
          <>
            <SectionHeading id="trends" title="Pick rate & damage" />
            <TrendsPanel heroSlug={hero.slug} heroName={hero.name} trends={overview.trends} damage={overview.damage} />
          </>
        )}
        {getHeroStats(hero.slug) && (
          <div id="stats" className="stats-anchor">
            <SectionHeading title="Base stats" />
            <HeroStatsPanel slug={hero.slug} name={hero.name} />
          </div>
        )}
        {abilities && <AbilityBreakdown abilities={abilities} heroName={hero.name} />}
        <SiteFooter />
      </div>
    </>
  );
}
