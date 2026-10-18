import { Link } from 'react-router-dom';
import { getAbilities } from '../data/abilities';
import { getHeroStats } from '../data/heroStats';
import { getLore, LORE_SOURCE } from '../data/heroLore';
import { getTags } from './HeroTags';
import { getNewcomer, isOut, nextUnlock, releaseWeekday } from '../data/newHeroes';
import { getHero } from '../data/roster';
import type { HeroOverview } from '../data/types';
import { fmtInt, fmtPct } from '../lib/stats';
import Kicker from './Kicker';
import { usePaperTilt } from '../lib/paperTilt';
import SectionHeading from './SectionHeading';

/** The hero's dossier on a torn paper card: who they are, in a few sentences, with the game's one-line role. */
export function Lore({ slug, name }: { slug: string; name: string }) {
  const lore = getLore(slug);
  const paper = usePaperTilt<HTMLElement>();
  if (!lore) return null;
  return (
    <aside className="paper-note lore" id="dossier" aria-labelledby="lore-h" ref={paper}>
      <Kicker>Dossier</Kicker>
      <h2 id="lore-h">Who is {name}?</h2>
      {lore.role && <p className="lore-role">{lore.role}.</p>}
      {lore.bio.map((p) => <p key={p}>{p}</p>)}
      <p className="lore-src"><small>{LORE_SOURCE[lore.from]}</small></p>
    </aside>
  );
}

/** Plain questions with answers worked out from the data on this page, so they stay right as the numbers move. */
export function HeroFaq({ slug, name, overview }: { slug: string; name: string; overview: HeroOverview | null }) {
  const n = getNewcomer(slug);
  if (!n) return null;
  const out = isOut(slug);
  const abilities = getAbilities(slug);
  const s = getHeroStats(slug);
  const tags = getTags(slug);
  const next = nextUnlock();
  const nextHero = next ? getHero(next.slug) : undefined;
  const items: { q: string; a: React.ReactNode }[] = [
    {
      q: `When ${out ? 'was' : 'is'} ${name} released?`,
      a: `${name} ${out ? 'unlocked' : 'unlocks'} on ${releaseWeekday(n)} at 2 PM Pacific, as part of the City Never Sleeps update. New heroes arrive on Tuesdays and Fridays.`,
    },
    ...(abilities ? [{
      q: `What are ${name}'s abilities?`,
      a: <>{abilities.map((a) => a.name).join(', ')}. The fourth is the ultimate. {abilities.every((a) => !a.desc) ? 'Descriptions and numbers for the kit are not in our data yet; the official game files are the source once we read them.' : ''}</>,
    }] : []),
    ...(tags.length > 0 || s?.complexity ? [{
      q: `What kind of hero is ${name}?`,
      a: `${tags.length > 0 ? `${name} is ${tags.join(', ').toLowerCase()}. ` : ''}${s?.complexity ? `Complexity is ${s.complexity} out of 3.` : ''}`.trim(),
    }] : []),
    {
      q: `Is ${name} good?`,
      a: overview
        ? `With the filters you have selected, ${name} wins ${fmtPct(overview.winRate)} of ${fmtInt(overview.matches)} matches. New heroes often start lower and climb as players learn them.`
        : `Win rate shows here once enough matches are in for the filters you have selected. New heroes often start lower and climb as players learn them.`,
    },
    {
      q: 'Who unlocks next?',
      a: nextHero && next
        ? <>{nextHero.name} unlocks on {releaseWeekday(next)} at 2 PM Pacific. <Link to={`/hero/${nextHero.slug}`}>See the page {'→'}</Link></>
        : 'All six City Never Sleeps heroes are out.',
    },
  ];
  return (
    <>
      <SectionHeading id="faq" title="Questions" />
      <div className="faq">
        {items.map((i) => (
          <details key={i.q} className="panel">
            <summary>{i.q}</summary>
            <p>{i.a}</p>
          </details>
        ))}
      </div>
    </>
  );
}
