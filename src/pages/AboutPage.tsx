import { SiteFooter } from '../components/Shell';
import { useTitle } from '../lib/useTitle';

const BLOCKS: { h: string; p: string[] }[] = [
  { h: 'What Broadway is', p: ['Broadway is a stats, builds and matchups companion for Deadlock. It is an independent fan project and is not made by, endorsed by or affiliated with Valve.'] },
  { h: 'Where the numbers come from', p: ['Live statistics come from the community Deadlock API, which aggregates public match data: hero win, pick and ban rates, matchups, rank distribution, leaderboards, live games, player pages and full match reports. Builds, skill order and guides are not connected yet, so those are illustrative samples and are labelled that way. The chip in the top bar shows Live, Sample or Offline.', 'Item text, hero base stats, weapon data and rank names are read from the game\'s own files; ability text still comes from the Deadlock wiki and can lag behind the latest patch. When the game and this site disagree, trust the game.'] },
  { h: 'How tiers work', p: ['Each hero gets a Broadway score from 0 to 100 built mostly from win rate, with pick rate as the second signal, and tiers are cut from that score. Heroes with too few matches are not ranked, so a lucky streak cannot buy a high tier.', 'S+ is reserved for the few heroes clearly ahead of everyone else; D marks those clearly behind. Tiers move every patch, so read them next to the match count.'] },
  { h: 'Sample sizes', p: ['Every win rate is shown with its match count. Small samples are marked so you can tell a trend from noise, and builds under a minimum match count are left out instead of listed.'] },
  { h: 'Credits', p: ['Hero art, ability and item icons, the textures, plates, lane art and district pictures taken from the City Never Sleeps update page, and the Deadlock name belong to Valve Corporation. Data courtesy of the Deadlock API and the Deadlock wiki. Type set in the game\'s own faces for a familiar feel.', 'Base stats for the newest heroes (Violet, Solomon and Deadman Danny) come from their release pages on Deadlock Labs until our game-file snapshot is refreshed; the layout of the hero pages follows the look of the official update page.', 'Hero dossiers paraphrase the biographies in the game\u2019s own hero text. Lash\u2019s also draws on the Deadlock wiki\u2019s notes on his voice lines, and Nurse Harrow\u2019s waits for Valve to publish hers.'] },
];

export default function AboutPage() {
  useTitle('About');
  return (
    <div className="wrap about">
      <div className="dir-head"><div><div className="dotline">The fine print</div><h1>About <em>Broadway</em></h1></div></div>
      <div className="about-grid">
        {BLOCKS.map((b) => (
          <section className="panel" key={b.h}>
            <h2>{b.h}</h2>
            {b.p.map((t, i) => <p key={i}>{t}</p>)}
          </section>
        ))}
      </div>
      <SiteFooter />
    </div>
  );
}
