import { baseDps, getHeroStats, isPreRelease, rankAmong } from '../data/heroStats';
import type { HeroOverview } from '../data/types';
import { fmtInt, fmtPct } from '../lib/stats';
import { tiltSeed } from '../lib/tilt';

type Tone = 'hot' | 'black' | 'white';

function Plate({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`plate ${tone}`}><b>{children}</b></span>;
}

/**
 * The four headline numbers under a hero's banner, each on a flat coloured plate like the labels on the official site:
 * health (orange), base gun damage per second (black), complexity (diamonds) and win rate (white). Only the plates move,
 * about three frames a second, and the lettering stays still. Each plate has its own angle, and the whole row shifts
 * with the hero (tiltSeed), so no two heroes' plates lean alike (tilt.css).
 */
export default function StatPlates({ slug, overview, status }: { slug: string; overview: HeroOverview | null; status: 'loading' | 'ready' | 'error' }) {
  const s = getHeroStats(slug);
  if (!s) return null;
  // numbers for a hero who has not unlocked yet are placeholders in the game files: show dashes, not figures that will change
  const pending = isPreRelease(s);
  const hp = pending ? undefined : rankAmong(slug, (x) => x.health);
  const dpsRank = pending ? undefined : rankAmong(slug, baseDps);
  const dps = pending ? null : baseDps(s);
  const rankText = (r?: { rank: number; of: number }): string | undefined => (r ? `#${r.rank} of ${r.of}` : undefined);
  const wr = overview ? fmtPct(overview.winRate) : status === 'loading' ? '…' : '–';
  const soon = pending ? <> <i>{'·'}</i> <em>after unlock</em></> : null;
  return (
    <ul className="vitals" aria-label={`${s.name} headline numbers`} style={{ ['--hk' as string]: tiltSeed(slug) } as React.CSSProperties}>
      <li className="vital">
        <Plate tone="hot">{pending ? '–' : Math.round(s.health).toLocaleString('en-US')}</Plate>
        <span className="cap">Health{hp ? <> <i>{'·'}</i> <em>{rankText(hp)}</em></> : soon}</span>
      </li>
      <li className="vital">
        <Plate tone="black">{dps === null ? '–' : Math.round(dps)}</Plate>
        <span className="cap">Base gun DPS{dpsRank ? <> <i>{'·'}</i> <em>{rankText(dpsRank)}</em></> : soon}</span>
      </li>
      <li className="vital">
        <span className="cx">
          {s.complexity && !pending ? (
            <span className="dia" role="img" aria-label={`Complexity ${s.complexity} of 3`}>{[1, 2, 3].map((i) => <i key={i} className={i <= (s.complexity ?? 0) ? 'on' : ''} />)}</span>
          ) : <span className="dia-none">–</span>}
        </span>
        <span className="cap">Complexity</span>
      </li>
      <li className="vital">
        <Plate tone="white">{wr}</Plate>
        <span className="cap">Win rate{overview && <> <i>{'·'}</i> <em>{fmtInt(overview.matches)} matches</em></>}{!overview && status === 'ready' && <> <i>{'·'}</i> <em>no data</em></>}</span>
      </li>
    </ul>
  );
}
