import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import SearchBox from './SearchBox';
import ThemeToggle from './ThemeToggle';
import { dataMode, switchDataMode, useDataHealth } from '../data/dataMode';
import { pageArtFor } from '../lib/pageArt';
import { useReveal } from '../lib/reveal';

// The side rail is drawn as a subway line, Broadway being one: each page is a stop with its own coloured bullet.
// The main pages are round local stops; the tools (compare, planner, ranks) are diamonds, like express service.
const NAV: { to: string; label: string; mark: string; color: string; ink?: string; end?: boolean; express?: boolean }[] = [
  { to: '/', label: 'Home', mark: '✦', color: '#0d0a07', ink: '#efc46a', end: true },
  { to: '/heroes', label: 'Heroes', mark: 'H', color: '#ec7a2e' },
  { to: '/tiers', label: 'Tier list', mark: 'T', color: '#dfa125', ink: '#140c05' },
  { to: '/items', label: 'Items', mark: 'I', color: '#6c9a3a' },
  { to: '/builds', label: 'Builds', mark: 'B', color: '#4f86d6' },
  { to: '/leaderboard', label: 'Leaderboard', mark: 'L', color: '#c4473a' },
  { to: '/player', label: 'Players', mark: 'P', color: '#8d6fc0' },
  { to: '/matches', label: 'Live matches', mark: 'M', color: '#e2573b' },
  { to: '/streams', label: 'Livestreams', mark: 'S', color: '#3fa7c2' },
  { to: '/compare', label: 'Compare', mark: 'C', color: '#efe3cf', ink: '#140c05', express: true },
  { to: '/planner', label: 'Planner', mark: 'P', color: '#efe3cf', ink: '#140c05', express: true },
  { to: '/ranks', label: 'Ranks', mark: 'R', color: '#efe3cf', ink: '#140c05', express: true },
];

/** Less-used pages live under "More" so the top bar stays on one line. */
const MORE = [
  { to: '/player', label: 'Find a player' },
  { to: '/compare', label: 'Compare heroes' },
  { to: '/planner', label: 'Build planner' },
  { to: '/ranks', label: 'Rank distribution' },
  { to: '/about', label: 'About' },
];

function MoreMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const active = MORE.some((m) => pathname.startsWith(m.to));
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="more" ref={ref}>
      <button type="button" className={active ? 'active' : ''} aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>More <span aria-hidden="true">{'▾'}</span></button>
      {open && (
        <div className="more-pop">
          {MORE.map((m) => <NavLink key={m.to} to={m.to}>{m.label}</NavLink>)}
        </div>
      )}
    </div>
  );
}

/** Says whether the numbers are live or samples, and switches between them. A failed live call that fell back to samples shows here too. */
function DataChip() {
  const health = useDataHealth();
  const live = dataMode === 'live';
  const state = !live ? 'sample' : health.degraded ? 'warn' : 'live';
  const label = state === 'sample' ? 'Sample data' : state === 'warn' ? 'Offline' : 'Live data';
  const title = state === 'sample'
    ? 'Showing built-in sample data. Click to switch to live data from the Deadlock API.'
    : state === 'warn'
      ? `The Deadlock API could not be reached (${health.reason ?? 'no answer'}), so some pages show labelled samples. Click to switch to sample data.`
      : 'Showing live data from the Deadlock API. Click to switch to the built-in sample data.';
  return (
    <button type="button" className={`data-chip ${state}`} title={title} aria-label={`${label}. ${title}`} onClick={() => switchDataMode(live ? 'sample' : 'live')}>
      <i aria-hidden="true" /><span>{label}</span>
    </button>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  useReveal(pathname);
  // the picture at the top of the page follows the route (see lib/pageArt.ts)
  useEffect(() => {
    const art = pageArtFor(pathname);
    if (art) document.documentElement.dataset.art = art; else delete document.documentElement.dataset.art;
  }, [pathname]);
  return (
    <>
      <aside className="rail" aria-label="Primary">
        <span className="rail-line" aria-hidden="true" />
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `stop${n.express ? ' express' : ''}${isActive ? ' active' : ''}`} aria-label={n.label}
            style={{ ['--bc' as string]: n.color, ['--bi' as string]: n.ink ?? '#fff' } as React.CSSProperties}>
            <span className="bullet" aria-hidden="true"><b>{n.mark}</b></span>
            <span className="label" aria-hidden="true">{n.label}</span>
          </NavLink>
        ))}
      </aside>
      <header className="topbar">
        <Link to="/" className="brand">
          BROADWAY<small>DEADLOCK COMPANION</small>
        </Link>
        <SearchBox />
        <nav aria-label="Main">
          <NavLink to="/heroes">Heroes</NavLink>
          <NavLink to="/tiers">Tier list</NavLink>
          <NavLink to="/builds">Builds</NavLink>
          <NavLink to="/items">Items</NavLink>
          <NavLink to="/leaderboard">Leaderboard</NavLink>
          <NavLink to="/player">Players</NavLink>
          <NavLink to="/matches">Matches<i className="live-dot" aria-hidden="true" /></NavLink>
          <NavLink to="/streams">Streams</NavLink>
          <MoreMenu />
        </nav>
        <DataChip />
        <ThemeToggle />
      </header>
      <main>{children}</main>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-foot">
      <span>{'✦'} Broadway is an independent fan project by Alp Kiziltas, not made or endorsed by Valve. Deadlock is a trademark of Valve Corporation.</span>
      <span>
        <Link to="/about">About &amp; methodology</Link> · {dataMode === 'live' ? 'Live data from' : 'Sample mode. Live data comes from'} the <a href="https://github.com/deadlock-api/deadlock-api" rel="noreferrer">Deadlock API</a> (MIT).
      </span>
    </footer>
  );
}
