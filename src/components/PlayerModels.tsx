import { useMemo } from 'react';
import { badgeLabel, badgeParts } from '../data/leaderboard';
import type { PlayerMatchLine, PlayerRank } from '../data/player';
import { RANK_COLOR } from '../data/ranks';
import { useModel } from '../ml/models';
import { PLAYSTYLE_GAMES, PLAYSTYLE_MIN, playstyleOf, RANK_GAMES, rankGuess } from '../ml/predict';
import RankBadge from './RankBadge';

/** One line per playstyle, in the words of the cluster table in ml/models/report.md. */
const STYLE_NOTE: Record<string, string> = {
  Support: 'Lots of assists, few deaths, a small hero pool. Lets others take the farm.',
  'One-trick': 'Sticks to one or two heroes and farms the lane, with fewer assists than most.',
  'Soul farmer': 'Top of the souls and last hits, kills a lot and rarely dies.',
  Brawler: 'Always in the fight: more deaths, less farm, a wide hero pool.',
  'Flex player': 'Plays many heroes with average numbers across the board.',
};

const TRAITS: { key: string; label: string }[] = [
  { key: 'kills_pm', label: 'Kills' },
  { key: 'deaths_pm', label: 'Deaths' },
  { key: 'assists_pm', label: 'Assists' },
  { key: 'souls_pm', label: 'Souls' },
  { key: 'last_hits_pm', label: 'Last hits' },
  { key: 'hero_entropy', label: 'Hero pool' },
];

/** Where the player's numbers sit against the average player, as a bar either side of the middle. */
function Trait({ label, z }: { label: string; z: number }) {
  const c = Math.max(-2, Math.min(2, z));
  const word = z > 0.75 ? 'well above' : z > 0.25 ? 'above' : z < -0.75 ? 'well below' : z < -0.25 ? 'below' : 'about';
  return (
    <li title={`${label}: ${word} average (${z >= 0 ? '+' : ''}${z.toFixed(1)} SD)`}>
      <span>{label}</span>
      <span className="ps-track" aria-label={`${word} average`}>
        <i className={c >= 0 ? 'up' : 'down'} style={{ left: `${c >= 0 ? 50 : 50 + c * 25}%`, width: `${Math.abs(c) * 25}%` }} />
      </span>
    </li>
  );
}

/** Playstyle: the nearest of the five groups the clustering found among ~3,000 players' last 50 games. */
export function PlaystyleCard({ matches }: { matches: PlayerMatchLine[] }) {
  const model = useModel('playstyle');
  const ps = useMemo(() => (model ? playstyleOf(model, matches) : null), [model, matches]);
  if (!model) return null;
  return (
    <div className="panel pad pc-card ml-ps">
      <div className="pc-card-h"><h3>Playstyle</h3><small>{ps ? `Last ${ps.games} games` : 'Needs more games'}</small></div>
      {ps ? (
        <>
          <p className="ps-name"><b>{ps.label}</b>{ps.fit < 0.15 && <small>with a lean to {ps.runnerUp}</small>}</p>
          <p className="muted ps-note">{STYLE_NOTE[ps.label] ?? ''}</p>
          <ul className="ps-traits" aria-label="Per minute, against the average player">
            {TRAITS.map((t) => <Trait key={t.key} label={t.label} z={ps.z[t.key] ?? 0} />)}
          </ul>
          <small className="ps-axis" aria-hidden="true"><span>Below average</span><span>Above</span></small>
        </>
      ) : <p className="muted">The playstyle reads the last {PLAYSTYLE_GAMES} standard games; this record has fewer than {PLAYSTYLE_MIN}.</p>}
    </div>
  );
}

/** Rank estimate: the rank the player's last 20 ranked games play like, from their per-minute numbers and win rate. */
export function RankGuessCard({ matches, rank }: { matches: PlayerMatchLine[]; rank: PlayerRank | null }) {
  const model = useModel('rank');
  const g = useMemo(() => (model ? rankGuess(model, matches) : null), [model, matches]);
  if (!model || !g) return null;
  const p = badgeParts(g.badge);
  const diff = rank ? Math.round((g.badge - rank.badge) / 10) : 0;
  return (
    <div className="panel pad pc-card ml-rg" style={{ ['--rc' as string]: RANK_COLOR[p.rank as keyof typeof RANK_COLOR] } as React.CSSProperties}>
      <div className="pc-card-h"><h3>Plays like</h3><small>Last {g.games} {g.fromRanked ? 'ranked' : 'standard'} games</small></div>
      <div className="rg-row">
        <RankBadge rank={p.rank} sub={p.sub} size="md" />
        <span className="rg-n">
          <b>{badgeLabel(g.badge)}</b>
          <small>Likely {badgeParts(g.low).rank} to {badgeParts(g.high).rank}</small>
        </span>
      </div>
      <p className="muted rg-note">
        {rank
          ? diff >= 1 ? `Playing above the ${rank.label} on the badge.` : diff <= -1 ? `The badge (${rank.label}) is ahead of these numbers.` : `Right around the badge (${rank.label}).`
          : 'An estimate for a player with no badge.'}
        {!g.fromRanked && ` Read from standard games: fewer than ${RANK_GAMES} ranked ones on record.`}
        {' '}A rough read: about half the time it lands within one rank.
      </p>
    </div>
  );
}
