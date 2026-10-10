import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Kicker from '../components/Kicker';
import RankBadge from '../components/RankBadge';
import { SiteFooter } from '../components/Shell';
import Tip from '../components/Tip';
import { badgeLabel, badgeParts } from '../data/leaderboard';
import { distributionStats, type DistributionStats, type RankDistribution } from '../data/rankDistribution';
import { RANK_COLOR, RANK_MATERIAL, ROMAN } from '../data/ranks';
import { dataSource } from '../data/source';
import { DEFAULT_FILTERS } from '../data/types';
import { useAsync } from '../data/useAsync';
import { useTitle } from '../lib/useTitle';

type Mode = 'sub' | 'tier';
const n0 = (n: number) => n.toLocaleString('en-US');
const pctText = (p: number) => (p >= 10 ? p.toFixed(1) : p >= 1 ? p.toFixed(1) : p >= 0.1 ? p.toFixed(2) : p.toFixed(3));

/** Round the tallest bar up to a tidy axis maximum. */
function axis(maxShare: number): { top: number; ticks: number[] } {
  const steps = [0.5, 1, 2, 2.5, 5, 10];
  const step = steps.find((s) => maxShare / s <= 5) ?? 10;
  const top = Math.ceil(maxShare / step) * step;
  return { top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step) };
}

function LevelTip({ level, st, unit }: { level: number; st: DistributionStats; unit: string }) {
  const b = badgeParts(level);
  const d = st.byLevel.get(level)!;
  return (
    <div className="rd-tip" style={{ ['--rc' as string]: RANK_COLOR[b.rank as keyof typeof RANK_COLOR] } as React.CSSProperties}>
      <RankBadge rank={b.rank} size="md" />
      <div>
        <b>{badgeLabel(level)}</b>
        <dl>
          <div><dt>{unit === 'players' ? 'Players' : 'Games'}</dt><dd>{n0(d.count)}</dd></div>
          <div><dt>Share</dt><dd>{pctText(d.share)}%</dd></div>
          <div><dt>Top</dt><dd>{pctText(d.top)}%</dd></div>
        </dl>
      </div>
    </div>
  );
}

function Chart({ dist, st, mode, mine }: { dist: RankDistribution; st: DistributionStats; mode: Mode; mine: number | null }) {
  const bars = mode === 'sub' ? st.tiers.flatMap((t) => t.levels.map((l) => ({ ...l, tier: t }))) : [];
  const maxShare = mode === 'sub' ? Math.max(...bars.map((b) => b.share)) : Math.max(...st.tiers.map((t) => t.share));
  const { top, ticks } = axis(maxShare);
  const h = (share: number) => `${Math.max(0.6, (share / top) * 100)}%`;
  const medianTier = Math.floor(st.median / 10);
  const mineTier = mine ? Math.floor(mine / 10) : null;

  return (
    <div className="rd-scroll">
      <div className="rd" role="img" aria-label={`Rank distribution. Median rank ${badgeLabel(st.median)}.`}>
        <div className="rd-y" aria-hidden="true">
          {ticks.map((t) => <span key={t} style={{ bottom: `${(t / top) * 100}%` }}>{t}%</span>)}
        </div>
        <div className="rd-plot">
          <div className="rd-grid" aria-hidden="true">{ticks.slice(1).map((t) => <i key={t} style={{ bottom: `${(t / top) * 100}%` }} />)}</div>
          <div className="rd-groups">
            {st.tiers.map((t, gi) => (
              <section key={t.rank} className="rd-group" style={{ ['--rc' as string]: t.color, ['--gi' as string]: gi } as React.CSSProperties}>
                <span className="num" aria-hidden="true">{String(t.tier).padStart(2, '0')}</span>
                <div className="cols">
                  {mode === 'sub' ? t.levels.map((l, i) => {
                    const sub = l.level % 10;
                    const isMedian = l.level === st.median;
                    const isMine = l.level === mine;
                    return (
                      <Tip key={l.level} className="rd-tipHost" prefer="above" delay={80} content={<LevelTip level={l.level} st={st} unit={dist.unit} />}>
                        <div className={`col${isMedian ? ' median' : ''}${isMine ? ' mine' : ''}`} style={{ ['--h' as string]: h(l.share), ['--i' as string]: i } as React.CSSProperties} aria-label={`${badgeLabel(l.level)}: ${pctText(l.share)} percent`}>
                          {isMedian && <em className="flag">Median</em>}
                          {isMine && <em className="flag you">You</em>}
                          <span className="bar" />
                          <small>{ROMAN[sub]}</small>
                        </div>
                      </Tip>
                    );
                  }) : (
                    <Tip className="rd-tipHost wide" prefer="above" delay={80} content={<div className="rd-tip" style={{ ['--rc' as string]: t.color } as React.CSSProperties}><RankBadge rank={t.rank} size="md" /><div><b>{t.rank}</b><dl><div><dt>{dist.unit === 'players' ? 'Players' : 'Games'}</dt><dd>{n0(t.count)}</dd></div><div><dt>Share</dt><dd>{pctText(t.share)}%</dd></div><div><dt>Top</dt><dd>{pctText(t.top)}%</dd></div></dl></div></div>}>
                      <div className={`col${medianTier === t.tier ? ' median' : ''}${mineTier === t.tier ? ' mine' : ''}`} style={{ ['--h' as string]: h(t.share), ['--i' as string]: 0 } as React.CSSProperties}  aria-label={`${t.rank}: ${pctText(t.share)} percent`}>
                        {medianTier === t.tier && <em className="flag">Median</em>}
                        {mineTier === t.tier && <em className="flag you">You</em>}
                        <span className="bar" />
                      </div>
                    </Tip>
                  )}
                </div>
                <footer>
                  <RankBadge rank={t.rank} size="md" />
                  <span className="tape" style={{ ['--tilt' as string]: `${gi % 2 ? 2 : -2}deg` } as React.CSSProperties}>{t.rank}</span>
                  {RANK_MATERIAL[t.rank as keyof typeof RANK_MATERIAL] && <small>{RANK_MATERIAL[t.rank as keyof typeof RANK_MATERIAL]}</small>}
                </footer>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TierCard({ t, unit }: { t: DistributionStats['tiers'][number]; unit: string }) {
  const max = Math.max(...t.levels.map((l) => l.share), 0.0001);
  return (
    <article className="rd-card" style={{ ['--rc' as string]: t.color } as React.CSSProperties}>
      <RankBadge rank={t.rank} size="lg" />
      <div className="info">
        <small>Tier {t.tier}{RANK_MATERIAL[t.rank as keyof typeof RANK_MATERIAL] ? ` · ${RANK_MATERIAL[t.rank as keyof typeof RANK_MATERIAL]}` : ''}</small>
        <h3>{t.rank}</h3>
        <p><b>{pctText(t.share)}%</b> of {unit}<span>Top {pctText(t.top)}% from {t.rank} I</span></p>
        <ul className="pips" aria-label={`${t.rank} levels`}>
          {t.levels.map((l) => (
            <li key={l.level} title={`${badgeLabel(l.level)}: ${pctText(l.share)}%`}>
              <div className="b"><span style={{ height: `${Math.max(6, (l.share / max) * 100)}%` }} /></div>
              <i>{ROMAN[l.level % 10]}</i>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

/** How players are spread across the 66 rank levels, drawn in the game's own ink-and-brass style. */
export default function RanksPage() {
  useTitle('Rank distribution');
  const state = useAsync((signal) => dataSource.rankDistribution(DEFAULT_FILTERS, signal), []);
  const [mode, setMode] = useState<Mode>('sub');
  const [mineRaw, setMine] = useState('');
  const dist = state.status === 'ready' ? state.value : null;
  const st = useMemo(() => (dist ? distributionStats(dist) : null), [dist]);
  const mine = mineRaw ? Number(mineRaw) : null;
  const unitWord = dist?.unit === 'games' ? 'games' : 'players';

  return (
    <div className="wrap ranks-page">
      <div className="dir-head"><div><Kicker>The ladder</Kicker><h1>Rank <em>distribution</em></h1></div></div>
      <p className="muted rk-lead">Eleven ranks, six levels each. Every bar is the share of {unitWord} sitting at that level, so the tall bars are where the crowd is. Eternus levels are set by percentile of Eternus itself rather than by points.</p>

      {state.status === 'loading' && <p className="muted" role="status">Loading the ladder…</p>}
      {state.status === 'error' && <div className="panel empty" role="alert"><h3>Couldn't load the distribution</h3><p>{state.message}. Try again in a moment.</p></div>}

      {dist && st && (
        <>
          {dist.illustrative && <div className="notice"><b>Illustrative data.</b> These bars are generated to show the layout, not real player counts. Real numbers appear once live data is connected.</div>}
          {dist.unit === 'games' && <div className="notice"><b>Games, not players.</b> The API reports how many games were played at each rank, so a very active player counts many times.</div>}

          <div className="rd-tickets">
            <div className="ticket"><small>{dist.unit === 'games' ? 'Games counted' : 'Ranked players'}</small><b>{n0(st.total)}</b></div>
            <div className="ticket median"><small>Median rank</small><span><RankBadge rank={badgeParts(st.median).rank} size="xs" /><b>{badgeLabel(st.median)}</b></span></div>
            {dist.placements !== undefined && <div className="ticket"><small>Still in placements</small><b>{n0(dist.placements)}</b></div>}
          </div>

          <div className="rd-controls">
            <div className="seg" role="group" aria-label="Bars">
              <button type="button" aria-pressed={mode === 'sub'} onClick={() => setMode('sub')}>Levels</button>
              <button type="button" aria-pressed={mode === 'tier'} onClick={() => setMode('tier')}>Ranks</button>
            </div>
            <label className="rd-mine">
              <span>Find your rank</span>
              <select value={mineRaw} onChange={(e) => setMine(e.target.value)}>
                <option value="">Pick a rank…</option>
                {[...st.tiers].reverse().map((t) => (
                  <optgroup key={t.rank} label={t.rank}>
                    {[...t.levels].reverse().map((l) => <option key={l.level} value={l.level}>{badgeLabel(l.level)}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            {mine && st.byLevel.get(mine) && <p className="rd-you"><b>{badgeLabel(mine)}</b> is in the top <b>{pctText(st.byLevel.get(mine)!.top)}%</b> of {unitWord}.</p>}
          </div>

          <section className="panel rd-panel" aria-label="Distribution chart">
            <Chart dist={dist} st={st} mode={mode} mine={mine} />
          </section>

          <div className="section-heading"><span className="star">{'✦'}</span><h2>Tier by tier</h2></div>
          <div className="rd-cards">{[...st.tiers].reverse().map((t) => <TierCard key={t.rank} t={t} unit={unitWord} />)}</div>

          <section className="panel rd-how">
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
