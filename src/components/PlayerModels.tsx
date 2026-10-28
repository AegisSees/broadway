import { useMemo } from 'react';
import { badgeLabel, badgeParts } from '../data/leaderboard';
import { placement, type PlayerMatchLine, type PlayerRank } from '../data/player';
import { dataSource } from '../data/source';
import { useAsync } from '../data/useAsync';
import { RANK_COLOR } from '../data/ranks';
import { useModel } from '../ml/models';
import { badgeToIndex } from '../../ml/web/score';
import { PLAYSTYLE_GAMES, PLAYSTYLE_MIN, playstyleOf } from '../ml/predict';
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

const LOBBY_GAMES = 20;

/**
 * Plays at: the rank of the lobbies matchmaking puts the player in, from the other eleven players' badges in their
 * last 20 ranked games (topped up with standard games when there are few ranked ones). Matchmaking already weighs everything the player does, so this places a player far better
 * than their per-minute numbers can (those are measured against opponents of the same rank, so every rank looks
 * average to a stats-only model). Players whose lobbies carry no badges get no card rather than a guess.
 */
export function PlaysAtCard({ accountId, matches, rank }: { accountId: number; matches: PlayerMatchLine[]; rank: (PlayerRank & { fromHistory?: number }) | null }) {
  // ranked games first; players with few of them are placed by their standard games too, whose lobbies often carry badges
  const ranked = useMemo(() => matches.filter((m) => m.kind === 'ranked').slice(0, LOBBY_GAMES), [matches]);
  const ids = useMemo(() => (ranked.length >= LOBBY_GAMES / 2 ? ranked : [...ranked, ...matches.filter((m) => m.kind === 'unranked').slice(0, LOBBY_GAMES - ranked.length)]).map((m) => m.id), [matches, ranked]);
  const what = ranked.length >= LOBBY_GAMES / 2 ? 'ranked lobbies' : ranked.length ? 'lobbies' : 'standard lobbies';
  const state = useAsync((signal) => (ids.length ? dataSource.lobbyRanks(accountId, ids, signal) : Promise.resolve(new Map<number, number>())), [accountId, ids.join(',')]);
  if (!ids.length || state.status === 'error') return null;
  const at = state.status === 'ready' ? placement([...state.value.values()]) : null;
  if (state.status === 'ready' && (!at || at.n < 3)) return null;
  const p = at ? badgeParts(at.badge) : null;
  const diff = at && rank ? badgeToIndex(at.badge) - badgeToIndex(rank.badge) : 0;
  return (
    <div className="panel pad pc-card ml-rg" style={p ? { ['--rc' as string]: RANK_COLOR[p.rank as keyof typeof RANK_COLOR] } as React.CSSProperties : undefined}>
      <div className="pc-card-h"><h3>Plays in</h3><small>{at ? `Last ${at.n} ${what}` : 'Reading lobbies…'}</small></div>
      {at && p ? (
        <>
          <div className="rg-row">
            <RankBadge rank={p.rank} sub={p.sub} size="md" />
            <span className="rg-n">
              <b>{badgeLabel(at.badge)}</b>
              <small>{at.low === at.high ? 'Every lobby about there' : `Most between ${badgeLabel(at.low)} and ${badgeLabel(at.high)}`}</small>
            </span>
          </div>
          <p className="muted rg-note">
            The average rank of each game’s lobby.
            {rank ? (diff >= 4 ? ` Matchmaking puts them above their ${rank.label} badge.` : diff <= -4 ? ` Their lobbies sit below their ${rank.label} badge.` : ` In line with their ${rank.label} badge.`) : ''}
          </p>
        </>
      ) : <div className="rg-row" aria-busy="true"><span className="rg-n"><small>Looking up the ranks of their recent lobbies…</small></span></div>}
    </div>
  );
}
