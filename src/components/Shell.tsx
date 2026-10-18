import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import SearchBox from './SearchBox';
import ThemeToggle from './ThemeToggle';
import { dataMode, switchDataMode, useDataHealth } from '../data/dataMode';
import { pageArtFor } from '../lib/pageArt';

const NAV = [
  { to: '/', label: 'Home', glyph: '⌂', end: true },
  { to: '/heroes', label: 'Heroes', glyph: '♘' },
  { to: '/tiers', label: 'Tier list', glyph: '♛' },
  { to: '/items', label: 'Items', glyph: '◈' },
  { to: '/builds', label: 'Builds', glyph: '◇' },
  { to: '/leaderboard', label: 'Leaderboard', glyph: '♚' },
  { to: '/player', label: 'Players', glyph: '☺' },
  { to: '/matches', label: 'Live matches', glyph: '◉' },
  { to: '/streams', label: 'Livestreams', glyph: '▶' },
  { to: '/compare', label: 'Compare', glyph: '⚔' },
  { to: '/planner', label: 'Planner', glyph: '✎' },
  { to: '/ranks', label: 'Ranks', glyph: '♜' },
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
  const [pinned, setPinned] = useState(false);
  const { pathname } = useLocation();
  // the picture at the top of the page follows the route (see lib/pageArt.ts)
  useEffect(() => {
    const art = pageArtFor(pathname);
    if (art) document.documentElement.dataset.art = art; else delete document.documentElement.dataset.art;
  }, [pathname]);
  return (
    <>
      <aside className={`rail ${pinned ? 'pinned' : ''}`} aria-label="Primary">
        <Link to="/" className="logo" aria-label="Broadway home">
          <span className="glyph" aria-hidden="true">{'✦'}</span>
          <span className="label">Broadway</span>
        </Link>
        {NAV.map((n) => (
          <NavLink key={n.label} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="glyph" aria-hidden="true">{n.glyph}</span>
            <span className="label">{n.label}</span>
          </NavLink>
        ))}
        <span className="spacer" />
        <button type="button" className="pin" onClick={() => setPinned((p) => !p)} aria-pressed={pinned}>
          <span className="glyph" aria-hidden="true">{'☰'}</span>
          <span className="label">{pinned ? 'Auto-hide menu' : 'Keep menu open'}</span>
        </button>
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
