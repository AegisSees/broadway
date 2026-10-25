import { useMemo } from 'react';
import type { MatchDetail, Side } from '../data/matchDetail';
import { useModel } from '../ml/models';
import { draftChance, heroIdOf, matchDraftChance, teamBadge } from '../ml/predict';

/**
 * The draft model's call for a lobby: the Hidden King's chance of winning from the twelve heroes (and the players'
 * ranks, when at least half of each team has one). Used on live match cards, where the feed has no kills or levels yet.
 */
export function DraftOddsBar({ team0, team1 }: { team0: { heroSlug: string; badge?: number }[]; team1: { heroSlug: string; badge?: number }[] }) {
  const model = useModel('draft');
  const p = useMemo(() => {
    if (!model || team0.length !== 6 || team1.length !== 6) return null;
    const a = team0.map((x) => heroIdOf(x.heroSlug));
    const b = team1.map((x) => heroIdOf(x.heroSlug));
    if (a.some((x) => x === undefined) || b.some((x) => x === undefined)) return null;
    return draftChance(model, a as number[], b as number[], teamBadge(team0.map((x) => x.badge)), teamBadge(team1.map((x) => x.badge)));
  }, [model, team0, team1]);
  if (p === null) return null;
  const hk = Math.round(p * 100);
  return (
    <div className="ml-odds" title="The draft model's chance for each side, from the twelve heroes and the ranks we know. It picks the winner about six times in ten.">
      <span className="ml-odds-l">Draft odds</span>
      <span className="ml-odds-bar" role="img" aria-label={`Draft odds: Hidden King ${hk}%, Archmother ${100 - hk}%`}>
        <i className="hk" style={{ width: `${hk}%` }}><b>{hk}%</b></i>
        <i className="am" style={{ width: `${100 - hk}%` }}><b>{100 - hk}%</b></i>
      </span>
    </div>
  );
}

/** A chip with the chance the draft gave one side of a finished game (a player's own side on their match cards). */
export function DraftChip({ m, side }: { m: MatchDetail; side: Side }) {
  const model = useModel('draft');
  const p = useMemo(() => (model ? matchDraftChance(model, m) : null), [model, m]);
  if (p === null) return null;
  const mine = Math.round((side === 'hidden-king' ? p : 1 - p) * 100);
  const tone = mine >= 55 ? 'up' : mine <= 45 ? 'down' : '';
  return <span className={`ml-chip ${tone}`} title="The chance the draft model gave this side before the game started, from the twelve heroes and ranks">Draft {mine}%</span>;
}
