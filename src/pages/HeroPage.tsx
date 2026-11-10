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
import { abilitySource, getAbilities } from '../data/abilities';
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
import HeroStatsPanel from '../components/HeroStatsPanel';
import { getHeroBg, getHeroStats } from '../data/heroStats';
import { getHeroColor } from '../data/heroColors';
import SectionHeading from '../components/SectionHeading';
import StatPlates from '../components/StatPlates';
import { HeroFaq, Lore } from '../components/NewHeroExtras';
import { getNewcomer, isOut, releaseDay, releaseWeekday } from '../data/newHeroes';
import { getLore } from '../data/heroLore';

function Stats({ o }: { o: HeroOverview }) {
  const tier = o.tier ?? tierFromWinRate(o.winRate);
  const items: { label: string; value?: string; hi?: boolean; note?: string; lead?: React.ReactNode; tier?: boolean }[] = [
    { label: 'Tier', tier: true, note: o.tier ? undefined : 'By win rate' },
    // the win rate already leads the stat plates above, so it is not repeated here
    ...(o.overallRank ? [{ label: 'Overall rank', value: `${o.overallRank.rank} / ${o.overallRank.of}` }] : []),
    { label: 'Pick rate', value: fmtPct(o.pickRate) },
    ...(o.banRate !== undefined ? [{ label: 'Ban rate', value: fmtPct(o.banRate) }] : []),
    { label: 'Matches', value: fmtInt(o.matches), note: confidenceLabel[confidence(o.matches)] },
  ];
  return (
    <div className="panel stats hero-stats" data-n={items.length} style={{ ['--n' as string]: items.length } as React.CSSProperties}>
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
  const lore = getLore(hero.slug);
  /* City Never Sleeps heroes only get the "new hero" plate, intro and FAQ until they unlock; once out they are
     ordinary heroes (the patch after their release folded them into the regular roster) */
  const newcomer = hero.unreleased ? getNewcomer(hero.slug) : undefined;
  const out = newcomer ? isOut(hero.slug) : true;
  const brawl = filters.mode === 'street_brawl';
  const tabs: { id: string; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'builds', label: 'Builds' },
    ...(!brawl && overview ? [{ id: 'matchups', label: 'Matchups' }] : []),
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
              <div className="kick-row">
                <Kicker key={hero.slug}>{lore?.title ?? (hero.unreleased ? 'New hero' : 'Hero lore')}</Kicker>
                {newcomer && <span className="out-plate">New hero {'·'} {out ? 'Out' : 'Unlocks'} {releaseDay(newcomer)}</span>}
              </div>
              {wordmark ? <h1><img className="wordmark" src={wordmark} alt={hero.name} /></h1> : <h1 className="text-name">{hero.name}</h1>}
              <HeroTags slug={hero.slug} />
              {newcomer
                && <p className="intro">{hero.name} is one of the six heroes of the City Never Sleeps update, {out ? 'out since' : 'unlocking on'} {releaseWeekday(newcomer)}. Kit, base stats and live win rate below.</p>}
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
        <StatPlates slug={hero.slug} overview={overview} status={state.status === 'ready' ? 'ready' : state.status === 'error' ? 'error' : 'loading'} />
        <Controls filters={filters} onChange={setFilters} />
        {state.status === 'loading' && <p className="muted" role="status">Loading {hero.name}…</p>}
        {state.status === 'error' && (
          <div className="panel empty" role="alert"><h3>Couldn't load {hero.name}</h3><p>{state.message}. Try again in a moment.</p></div>
        )}
        {state.status === 'ready' && !overview && (
          <div className="notice hero-note">
            <b>Headline numbers and matchups</b>
            <span>
              need more matches for {hero.name} with these filters. Try All ranks or another queue.
              {' '}<button type="button" className="chip" onClick={() => setFilters({ mode: 'standard', queue: 'ranked', rank: 'all' })}>Reset filters</button>
            </span>
          </div>
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

        {!brawl && (
          <>
            <SectionHeading id="builds" title="Top builds" />
            {builds.status === 'loading' && <p className="muted" role="status">Loading builds…</p>}
            {builds.status === 'error' && <div className="panel empty" role="alert"><h3>Couldn't load builds</h3><p>{builds.message}.</p></div>}
            {builds.status === 'ready' && (builds.value
              ? <BuildBoard key={`${hero.slug}${filters.mode}${filters.queue}${filters.rank}`} builds={builds.value} heroName={hero.name} />
              : <div className="panel empty"><h3>No published builds yet</h3><p>Nobody has published a {hero.name} build in the game’s build browser yet. Check back soon, or plan your own.</p></div>)}
            <p className="bb-more"><Link className="chip" to={`/builds?hero=${hero.slug}`}>Browse every {hero.name} build {'→'}</Link><Link className="chip" to={`/planner?hero=${hero.slug}`}>Plan your own {'→'}</Link></p>

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

        {getHeroStats(hero.slug) && (
          <div id="stats" className="stats-anchor">
            <SectionHeading title="Base stats" />
            <HeroStatsPanel slug={hero.slug} name={hero.name} />
          </div>
        )}
        {abilities && <AbilityBreakdown abilities={abilities} heroName={hero.name} source={abilitySource(hero.slug)} />}
        {newcomer ? (
          <>
            <div className={`new-band${lore ? ' has-lore' : ''}`}>
              <Lore slug={hero.slug} name={hero.name} />
              <div><HeroFaq slug={hero.slug} name={hero.name} overview={overview} /></div>
            </div>
          </>
        ) : lore && (
          <div className="dossier-band">
            <Lore slug={hero.slug} name={hero.name} />
            {(hero.render || hero.portrait) && (
              <figure className="case-print" aria-hidden="true">
                <span className="mat"><img src={(hero.render || hero.portrait) as string} alt="" loading="lazy" /></span>
                <figcaption>{hero.name}</figcaption>
              </figure>
            )}
          </div>
        )}
        <SiteFooter />
      </div>
    </>
  );
}
