import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataSource } from '../data/source';
import { useAsync } from '../data/useAsync';
import { buildResults, type SearchResult } from '../lib/search';
import { parseSteamInput } from '../lib/steam';
import { fmtInt } from '../lib/stats';
import { HeroFace } from './HeroFace';

function usePlayers(query: string): SearchResult[] {
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);
  const state = useAsync<SearchResult[]>(
    async (signal) => {
      if (dataSource.id !== 'live' || debounced.length < 3 || /^\d+$/.test(debounced) || parseSteamInput(debounced)) return [];
      const hits = await dataSource.searchPlayers(debounced, signal);
      return hits.slice(0, 6).map((p) => ({
        kind: 'player' as const, accountId: p.accountId, name: p.name, avatar: p.avatar,
        note: p.matches30d !== undefined ? `${fmtInt(p.matches30d)} games in 30 days` : undefined,
      }));
    },
    [debounced],
  );
  return state.status === 'ready' ? state.value : [];
}

export default function SearchBox({ large = false }: { large?: boolean }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const navigate = useNavigate();
  const players = usePlayers(query);
  const results = useMemo(() => buildResults(query, players), [query, players]);

  // "/" focuses the search from anywhere (unless the user is already typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === '/' && t && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const go = (r: SearchResult) => {
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
    navigate(r.kind === 'hero' ? `/hero/${r.hero.slug}` : r.kind === 'item' ? `/items?item=${r.slug}` : r.kind === 'find' ? `/player?q=${encodeURIComponent(r.query)}` : `/player/${r.accountId}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0))); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); go(results[active]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  const heroResults = results.filter((r) => r.kind === 'hero' || r.kind === 'item');
  const others = results.filter((r) => r.kind !== 'hero' && r.kind !== 'item');
  const finds = others.filter((r) => r.kind === 'find');
  const showList = open && query.trim().length > 0;
  const idx = (r: SearchResult) => results.indexOf(r);

  const row = (r: SearchResult) => {
    const i = idx(r);
    const common = { role: 'option' as const, id: `${listId}-${i}`, 'aria-selected': i === active };
    if (r.kind === 'hero')
      return (
        <li key={`h-${r.hero.slug}`} {...common} onMouseEnter={() => setActive(i)}>
          <button type="button" onClick={() => go(r)} tabIndex={-1}>
            <HeroFace hero={r.hero} size="sm" />
            <span>{r.hero.name}<span className="sub">Hero</span></span>
          </button>
        </li>
      );
    if (r.kind === 'item')
      return (
        <li key={`i-${r.slug}`} {...common} onMouseEnter={() => setActive(i)}>
          <button type="button" onClick={() => go(r)} tabIndex={-1}>
            <span className="face sm item" aria-hidden="true">{r.item.icon ? <img className="icon" src={r.item.icon} alt="" loading="lazy" /> : r.item.name[0]}</span>
            <span>{r.item.name}<span className="sub">Item · {r.item.category} · {r.item.tier === 5 ? 'Legendary' : r.item.cost.toLocaleString('en-US')}</span></span>
          </button>
        </li>
      );
    if (r.kind === 'find')
      return (
        <li key={`f-${r.query}`} {...common} onMouseEnter={() => setActive(i)}>
          <button type="button" onClick={() => go(r)} tabIndex={-1}>
            <span className="face sm" aria-hidden="true">{'⌕'}</span>
            <span>Find players named “{r.query}”<span className="sub">Search Steam names</span></span>
          </button>
        </li>
      );
    return (
      <li key={`p-${i}`} {...common} onMouseEnter={() => setActive(i)}>
        <button type="button" onClick={() => go(r)} tabIndex={-1}>
          <span className="face sm" aria-hidden="true">{r.kind === 'player' && r.avatar ? <img className="icon" src={r.avatar} alt="" loading="lazy" /> : r.kind === 'steam-id' ? '#' : '☺'}</span>
          <span>
            {r.kind === 'steam-id' ? `Open player ${r.accountId}` : r.name}
            <span className="sub">{r.kind === 'steam-id' ? 'Steam ID lookup' : r.note ?? 'Player'}</span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className={`search ${large ? 'large' : ''}`} ref={rootRef}>
      <div className="search-box">
        <span className="icon" aria-hidden="true">{'⌕'}</span>
        <input
          ref={inputRef}
          value={query}
          placeholder={large ? 'Search heroes, items, players' : 'Heroes, items, players'}
          aria-label="Search heroes, items, players or Steam ID"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <kbd aria-hidden="true">/</kbd>
      </div>
      {showList && (
        <ul className="search-list" id={listId} role="listbox" aria-label="Search results">
          {others.some((r) => r.kind === 'steam-id') && others.filter((r) => r.kind === 'steam-id').map(row)}
          {heroResults.some((r) => r.kind === 'hero') && <li className="grp" role="presentation">Heroes</li>}
          {heroResults.filter((r) => r.kind === 'hero').map(row)}
          {heroResults.some((r) => r.kind === 'item') && <li className="grp" role="presentation">Items</li>}
          {heroResults.filter((r) => r.kind === 'item').map(row)}
          {others.some((r) => r.kind === 'player') && <li className="grp" role="presentation">Players</li>}
          {others.filter((r) => r.kind === 'player').map(row)}
          {finds.map(row)}
          {results.length === 0 && <li className="none" role="presentation">No heroes match. Paste a Steam ID or profile link to open a player.</li>}
        </ul>
      )}
    </div>
  );
}
