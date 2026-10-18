import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Kicker from '../components/Kicker';
import RankBadge from '../components/RankBadge';
import { SiteFooter } from '../components/Shell';
import Tip from '../components/Tip';
import { badgeLabel, badgeParts } from '../data/leaderboard';
import { distributionStats, type DistributionStats } from '../data/rankDistribution';
import { RANK_MATERIAL, ROMAN } from '../data/ranks';
import { dataSource } from '../data/source';
import { DEFAULT_FILTERS } from '../data/types';
import { useAsync } from '../data/useAsync';
import { useTitle } from '../lib/useTitle';

const n0 = (n: number) => n.toLocaleString('en-US');
const pctText = (p: number) => (p >= 10 ? p.toFixed(1) : p >= 1 ? p.toFixed(1) : p >= 0.1 ? p.toFixed(2) : p.toFixed(3));
type Tier = DistributionStats['tiers'][number];

/** Everything about one rank on hover: its share, where it starts, and its six levels. */
function RankTip({ t, st, unit }: { t: Tier; st: DistributionStats; unit: string }) {
  return (
    <div className="rx-tip" style={{ ['--rc' as string]: t.color } as React.CSSProperties}>
      <header><RankBadge rank={t.rank} size="sm" /><b>{t.rank}</b><span>{pctText(t.share)}%</span></header>
      <p>{n0(t.count)} {unit} {'·'} top {pctText(t.top)}% from {t.rank} I</p>
      <ol>
        {[...t.levels].reverse().map((l) => (
          <li key={l.level}><i>{ROMAN[l.level % 10]}</i><span><u style={{ width: `${Math.max(3, (l.share / Math.max(...t.levels.map((x) => x.share), 0.0001)) * 100)}%` }} /></span><b>{pctText(st.byLevel.get(l.level)!.share)}%</b></li>
        ))}
      </ol>
    </div>
  );
}

/**
 * The crowd: one solid column per rank on a cream card, as tall as its share of players, with the badge standing on
 * top. Each column is cut into its six levels (I at the bottom, VI at the top), so the levels show without 66 bars.
 */
function Crowd({ st, unit, mine }: { st: DistributionStats; unit: string; mine: number | null }) {
  const top = Math.max(...st.tiers.map((t) => t.share)) * 1.04;
  const medianTier = Math.floor(st.median / 10);
  const mineTier = mine ? Math.floor(mine / 10) : null;
  return (
    <div className="rx-scroll">
      <div className="rx-chart" role="img" aria-label={`Rank distribution. Median rank ${badgeLabel(st.median)}.`}>
        {st.tiers.map((t) => (
          <Tip key={t.rank} className="rx-colHost" prefer="above" delay={60} content={<RankTip t={t} st={st} unit={unit} />}>
            <div className={`rx-col${medianTier === t.tier ? ' median' : ''}${mineTier === t.tier ? ' mine' : ''}`} style={{ ['--rc' as string]: t.color } as React.CSSProperties}>
              <div className="rx-room">
                <div className="rx-stack" style={{ height: `${Math.max(1.5, (t.share / top) * 100)}%` }}>
                  <span className="rx-badge"><RankBadge rank={t.rank} size="md" /></span>
                  <b className="rx-pct">{pctText(t.share)}%</b>
                  {mineTier === t.tier ? <em className="rx-flag you">You</em> : medianTier === t.tier && <em className="rx-flag">Median</em>}
                  {[...t.levels].reverse().map((l) => (
                    <i key={l.level} className={`rx-seg${l.level === st.median ? ' median' : ''}${l.level === mine ? ' mine' : ''}`} style={{ flexGrow: Math.max(l.share, 0.0001) }} />
                  ))}
                </div>
              </div>
              <span className="rx-name">{t.rank}</span>
            </div>
          </Tip>
        ))}
      </div>
    </div>
  );
}

/** One rung of the ladder: badge, name, share, the six levels, and how high up the ladder it starts. */
function Rung({ t, unit }: { t: Tier; unit: string }) {
  const max = Math.max(...t.levels.map((l) => l.share), 0.0001);
  const material = RANK_MATERIAL[t.rank as keyof typeof RANK_MATERIAL];
  return (
    <li className="rx-rung" style={{ ['--rc' as string]: t.color } as React.CSSProperties}>
      <span className="rx-rbadge"><RankBadge rank={t.rank} size="lg" /></span>
      <div className="rx-id"><b>{t.rank}</b><small>Tier {t.tier}{material ? ` · ${material}` : ''}</small></div>
      <div className="rx-share"><b>{pctText(t.share)}%</b><small>of {unit}</small></div>
      <ul className="rx-subs" aria-label={`${t.rank} levels`}>
        {t.levels.map((l) => (
          <li key={l.level} title={`${badgeLabel(l.level)}: ${pctText(l.share)}%`}><span><u style={{ height: `${Math.max(8, (l.share / max) * 100)}%` }} /></span><i>{ROMAN[l.level % 10]}</i></li>
        ))}
      </ul>
      <div className="rx-top" title={`${t.rank} I and above is the top ${pctText(t.top)}% of ${unit}`}>
        <small>Top <b>{pctText(t.top)}%</b></small>
        <span className="track"><u style={{ width: `${Math.min(100, t.top)}%` }} /></span>
      </div>
    </li>
  );
}

/** How players are spread across the 66 rank levels: a column per rank on a printed card, then the ladder rung by rung. */
export default function RanksPage() {
  useTitle('Rank distribution');
  const state = useAsync((signal) => dataSource.rankDistribution(DEFAULT_FILTERS, signal), []);
  const [mineRaw, setMine] = useState('');
  const dist = state.status === 'ready' ? state.value : null;
  const st = useMemo(() => (dist ? distributionStats(dist) : null), [dist]);
  const mine = mineRaw ? Number(mineRaw) : null;
  const unitWord = dist?.unit === 'games' ? 'games' : 'players';

  return (
    <div className="wrap ranks-page">
      <div className="dir-head"><div><Kicker>The ladder</Kicker><h1>Rank <em>distribution</em></h1></div></div>
      <p className="muted rk-lead">Eleven ranks, six levels each. Each column is the share of {unitWord} in that rank, so the tall columns are where the crowd is. Eternus levels are set by percentile of Eternus itself rather than by points.</p>

      {state.status === 'loading' && <p className="muted" role="status">Loading the ladder…</p>}
      {state.status === 'error' && <div className="panel empty" role="alert"><h3>Couldn't load the distribution</h3><p>{state.message}. Try again in a moment.</p></div>}

      {dist && st && (
        <>
          {dist.illustrative && <div className="notice"><b>Illustrative data.</b> These bars are generated to show the layout, not real player counts. Real numbers appear once live data is connected.</div>}
          {dist.unit === 'games' && <div className="notice"><b>Games, not players.</b> The API reports how many games were played at each rank, so a very active player counts many times.</div>}

          <div className="rx-stats">
            <div className="rx-stat c-orange"><small>{dist.unit === 'games' ? 'Games counted' : 'Ranked players'}</small><b>{n0(st.total)}</b></div>
            <div className="rx-stat c-cream"><small>Median rank</small><span><RankBadge rank={badgeParts(st.median).rank} size="sm" /><b>{badgeLabel(st.median)}</b></span></div>
            {dist.placements !== undefined && <div className="rx-stat c-blue"><small>Still in placements</small><b>{n0(dist.placements)}</b></div>}
            <label className="rx-stat c-black rx-find">
              <small>Find your rank</small>
              <select value={mineRaw} onChange={(e) => setMine(e.target.value)}>
                <option value="">Pick a rank…</option>
                {[...st.tiers].reverse().map((t) => (
                  <optgroup key={t.rank} label={t.rank}>
                    {[...t.levels].reverse().map((l) => <option key={l.level} value={l.level}>{badgeLabel(l.level)}</option>)}
                  </optgroup>
                ))}
              </select>
              {mine && st.byLevel.get(mine) ? <em>Top <b>{pctText(st.byLevel.get(mine)!.top)}%</b> of {unitWord}</em> : <em>See where you stand</em>}
            </label>
          </div>

          <section className="rx-board" aria-label="Distribution chart">
            <header><span className="tape">The crowd</span><small>One column per rank, cut into its six levels with I at the bottom. Point at a column for the numbers.</small></header>
            <small className="rx-swipe" aria-hidden="true">Swipe for the higher ranks {'→'}</small>
            <Crowd st={st} unit={unitWord} mine={mine} />
          </section>

          <div className="section-heading"><span className="star">{'✦'}</span><h2>Rung by rung</h2></div>
          <ol className="rx-ladder">{[...st.tiers].reverse().map((t) => <Rung key={t.rank} t={t} unit={unitWord} />)}</ol>

          <section className="rx-how">
            <h3>Getting on the ladder</h3>
            <ul>
              <li>Ranked opens after <b>60 standard wins</b> and three heroes unlocked for ranked, each with <b>15 standard wins</b>.</li>
              <li>Players start unranked (<b>Obscurus</b>) and play <b>8 placement matches</b>, solo only. The highest starting rank is Oracle VI.</li>
              <li>The best players in each region are on the <Link to="/leaderboard">leaderboard</Link>.</li>
            </ul>
            <small className="muted">Rank rules from the Deadlock Wiki's Ranked Mode page. Rank names and badge art follow the same page.</small>
          </section>
        </>
      )}
      <SiteFooter />
    </div>
  );
}
