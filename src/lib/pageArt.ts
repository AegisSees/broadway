/**
 * Which district photo from the City Never Sleeps pack hangs, tinted and faded, at the top of a page.
 * The key is written to `html[data-art]` and `city-assets.css` maps it to a picture. Pages that bring their own
 * backdrop (a hero's lane art, the home hall) return null and keep the default night-city art.
 */
export type PageArt = 'times-square' | 'stock-exchange' | 'factory' | 'theater' | 'chinatown' | 'seaport' | 'uptown' | 'campus' | 'central-park' | 'fairfax' | 'header-city';

export function pageArtFor(pathname: string): PageArt | null {
  const [, first = '', second] = pathname.split('/');
  switch (first) {
    case '': return 'header-city';
    case 'heroes': return 'times-square';
    case 'tiers': return 'stock-exchange';
    case 'builds':
    case 'items':
    case 'planner': return 'factory';
    case 'leaderboard': return 'theater';
    case 'ranks': return 'uptown';
    case 'player': return second ? 'uptown' : 'campus';
    case 'matches': return 'chinatown';
    case 'match': return 'seaport';
    case 'streams': return 'fairfax';
    case 'compare': return 'campus';
    case 'about': return 'central-park';
    default: return null;
  }
}
