import { SiteFooter } from '../components/Shell';
import { useDataNotes } from '../data/dataNotes';
import { ITEM_PRIOR_GAMES } from '../data/heroItems';
import { MIN_WEEK_GAMES, TIER_CUTS } from '../data/tiers';
import { MIN_GAMES, fmtInt } from '../lib/stats';
import { useTitle } from '../lib/useTitle';
import { AUTHOR } from '../lib/credit';

interface Block { id?: string; h: string; p: string[] }

const cuts = TIER_CUTS.map(([tier, min]) => `${tier} from ${min > 0 ? '+' : min < 0 ? '−' : ''}${Math.abs(min)}`).join(', ');

const BLOCKS: Block[] = [
  { h: 'What Broadway is', p: [`Broadway is a stats, builds and matchups companion for Deadlock. It is an independent fan project${AUTHOR ? `, designed and built by ${AUTHOR},` : ''} and is not made by, endorsed by or affiliated with Valve.`] },
  { h: 'Where the numbers come from', p: [
    'Every statistic comes from the community Deadlock API, which collects public match data. The API hands over totals (wins and games per hero, per matchup, per item); Broadway does the arithmetic on this page in your browser. Builds are the ones players publish in the game\'s build browser.',
    'Nothing on the site is invented or simulated. When the API has no answer, the page says so and shows nothing in its place. The chip in the top bar turns to “API offline” when the service cannot be reached.',
    'Item text, hero base stats, weapon data and rank names are read from the game\'s own files; ability text still comes from the Deadlock wiki and can lag behind the latest patch. When the game and this site disagree, trust the game.',
  ] },
  { id: 'method', h: 'One patch at a time', p: [
    'A big patch changes heroes and items so much that games before and after it are not the same game. Every number is therefore cut to one patch: by default the current one, counted from the hour it shipped (City Never Sleeps, 29 September 2026). The 14-day and 7-day views also stop at the patch day, and the previous patch can be picked on its own. Two patches are never added together.',
    'Each data view carries a line saying how many matches it covers, from which date, and how long ago it was fetched. Results are refreshed automatically: the site asks the API again once an hour, and the API itself recounts about once an hour.',
  ] },
  { h: 'Why win rates are “shrunk”', p: [
    'Six wins in ten games is 60%, but so is a coin on a good day. A raw win rate on few games is mostly luck. So every win rate starts from the average hero and moves toward the hero\'s own record as games pile up. In practice the site adds a fixed number of imaginary average games to every hero before dividing. With thousands of real games those imaginary ones stop mattering; with fifty they dominate, which is the point.',
    'How many imaginary games? The data decides. If heroes truly differ a lot, each hero\'s own record deserves trust quickly; if they barely differ, it takes longer. Broadway measures how spread out hero win rates are, subtracts the spread that luck alone would produce, and sets the number from what is left. On this patch it comes to roughly 260 games. (This is called empirical Bayes shrinkage with a Beta prior.)',
  ] },
  { h: 'The range next to a win rate', p: [
    'Beside a win rate you will often see a range such as 51.8 to 52.3. Read it as: the hero\'s true win rate is very likely somewhere in here (a 95% Wilson interval). A wide range means few games. If the range crosses 50%, the data cannot yet say whether the hero is above or below average.',
    `Samples are labelled by the width of that range: Solid when it is at most 2 points wide (about 9,600 games), Fair up to 6 points (about 1,100 games), Thin beyond that. Thin numbers are greyed out. Below a minimum the number is not shown at all: ${MIN_GAMES.hero} games for a hero, ${MIN_GAMES.matchup} for a matchup, ${MIN_GAMES.item} purchases for an item, ${MIN_GAMES.bracket} for a single rank.`,
  ] },
  { h: 'How tiers work', p: [
    'A hero\'s score is measured in win-rate points and has two parts. Strength is how far the shrunk win rate sits from 50%, moved back toward 50% by the amount we are still unsure about it; a hero has to be good and proven. Presence adds half a point for every doubling of pick rate over the typical hero and takes half a point away for every halving, never more than three quarters of a point either way, because a hero that wins in everyone\'s hands matters more than one that wins for a few specialists.',
    `Tiers are fixed lines on that score: ${cuts}, and D below that. They are not quotas. In a balanced patch S+ can be empty and most heroes sit in B.`,
    'Pick rate is the share of games a hero appears in (twelve heroes per game, so pick rates add up to 1,200%). It is counted only over days the hero was available, so a hero released mid-patch is not marked down for the weeks before it existed.',
    `The 7-day change compares the last seven days with the seven before. It is shown only when both weeks have ${fmtInt(MIN_WEEK_GAMES)} games, and it is greyed when the change is small enough to be chance.`,
  ] },
  { h: 'Ranks', p: [
    'The rank filter uses the average rank of everyone in the match, which is what the API records. Neighbouring ranks are grouped into four brackets because one rank alone is often too thin a sample; single ranks can still be picked.',
    'The “win rate by rank” strip on a hero page shows the hero\'s win rate at each rank next to the difference from that hero\'s own average, so it is easy to see whether a hero is a low-rank bully or needs skilled hands. Each rank is shrunk toward the hero\'s own average, not toward 50%.',
  ] },
  { h: 'Matchups', p: [
    'A strong hero is above 50% against nearly everyone, so a raw “54% against Haze” says little. Matchups are shown as the difference from the hero\'s own usual win rate, in points: −3.0 means the hero wins three points less often than usual against that opponent. Lane partners work the same way. Each difference is shrunk for sample size, and greyed when the range still includes “no difference”. Hover a row for the raw win rate, its range and the number of games.',
  ] },
  { h: 'Items', p: [
    'Raw item win rates mislead. Expensive late items are bought mostly by players who are already winning, and cheap comeback items by players who are behind, so the raw number measures the state of the game more than the item.',
    `Broadway compares like with like. Every purchase is grouped by the stage of the game (0 to 8, 8 to 16, 16 to 26, 26 to 34 minutes, and later) and by the buyer's net worth at that moment in steps of 2,000 souls. Inside each group the item's win rate is compared with every other purchase that hero's players made in the same group, and the differences are averaged. The result is then shrunk toward zero as if every item began with ${ITEM_PRIOR_GAMES} neutral purchases, and shown with a margin of error.`,
    'This removes the biggest distortion but it is still a description, not proof: it shows what winning players buy in comparable situations, not that the item causes the win. One distortion remains: items bought as a reaction to losing a fight or a lane (armour against the enemy carry, for example) still look worse than they are, because net worth does not capture who is being beaten. The raw figure is printed beside it so you can see how much the correction changes. Corrupted Items are counted separately by the API and are not included yet.',
  ] },
  { h: 'What is filtered out', p: [
    'The site asks the API only for ranked or unranked matchmaking games in the chosen mode, which excludes bot matches and private lobbies. Broadway receives totals, not single matches, so it cannot check for duplicate matches itself and relies on the API to count each match once. Games shorter than ten minutes (abandoned or remade games) were measured on 10 November 2026 at about 0.009% of ranked matches on this patch, too few to move any number, so they are not removed.',
    'Hero and item ids are checked against the game\'s current lists. Anything the site does not recognise is left out and listed below, along with everything hidden for having too few games, for the pages you have opened in this visit.',
  ] },
  { h: 'Credits', p: ['Hero art, ability and item icons, the textures, plates, lane art and district pictures taken from the City Never Sleeps update page, and the Deadlock name belong to Valve Corporation. Data courtesy of the Deadlock API and the Deadlock wiki. Type set in the game\'s own faces for a familiar feel.', 'Base stats for the newest heroes (Violet, Solomon and Deadman Danny) come from their release pages on Deadlock Labs until our game-file snapshot is refreshed; the layout of the hero pages follows the look of the official update page.', 'Hero lore paraphrases the biographies in the game’s own hero text. Lash’s also draws on the Deadlock wiki’s notes on his voice lines.'] },
];

/** The running list of what was left out of the numbers on the pages opened so far (see data/dataNotes.ts). */
function FilterLog() {
  const notes = useDataNotes();
  return (
    <section className="panel" id="filter-log">
      <h2>Filter log</h2>
      {notes.length === 0
        ? <p>Nothing has been left out yet in this visit. Open a tier list or hero page and come back: anything hidden or dropped is listed here.</p>
        : <ul className="filter-log">{notes.map((n) => <li key={n.id}><b>{n.count}</b> {n.text}</li>)}</ul>}
    </section>
  );
}

export default function AboutPage() {
  useTitle('About');
  return (
    <div className="wrap about">
      <div className="dir-head"><div><div className="dotline">The fine print</div><h1>About <em>Broadway</em></h1></div></div>
      <div className="about-grid">
        {BLOCKS.map((b) => (
          <section className="panel" key={b.h} id={b.id}>
            <h2>{b.h}</h2>
            {b.p.map((t, i) => <p key={i}>{t}</p>)}
          </section>
        ))}
        <FilterLog />
      </div>
      <SiteFooter />
    </div>
  );
}
