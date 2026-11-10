import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Kicker from '../components/Kicker';
import RankBadge from '../components/RankBadge';
import { SiteFooter } from '../components/Shell';
import { badgeLabel, badgeParts } from '../data/leaderboard';
import { RANK_COLOR } from '../data/ranks';
import { dataSource } from '../data/source';
import { useAsync } from '../data/useAsync';
import { forgetPlayers, readRecent, type RecentPlayer } from '../lib/recentPlayers';
import { parseSteamInput } from '../lib/steam';
import { fmtInt } from '../lib/stats';
import { useTitle } from '../lib/useTitle';
import Avatar from '../components/Avatar';

/** Where people land to find a player: by Steam name, Steam ID, account number or a steamcommunity.com link. */
export default function PlayerLookup({ problem }: { problem?: string }) {
  useTitle('Find a player');
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const q = (sp.get('q') ?? '').trim();
  const [text, setText] = useState(q);
  const [recent, setRecent] = useState<RecentPlayer[]>(() => readRecent());
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => setText(q), [q]);

  // A custom profile address (steamcommunity.com/id/name) cannot be turned into an ID without asking Steam, so the name is searched instead.
  const search = useMemo(() => {
    const parsed = q ? parseSteamInput(q) : null;
    return parsed && 'vanity' in parsed ? parsed.vanity : parsed ? '' : q;
  }, [q]);
  const state = useAsync((signal) => (search.length >= 3 ? dataSource.searchPlayers(search, signal) : Promise.resolve([])), [search]);
  const hits = state.status === 'ready' ? state.value : [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    const parsed = parseSteamInput(t);
    if (parsed && 'accountId' in parsed) { navigate(`/player/${parsed.accountId}`); return; }
    setNote(parsed && 'vanity' in parsed ? `That link uses the custom name “${parsed.vanity}”, which can’t be turned into an ID here, so this searches for the name instead.` : t.length < 3 ? 'Type at least three letters of the name.' : null);
    setSp(new URLSearchParams({ q: t }), { replace: false });
  };

  return (
    <div className="wrap pl-lookup">
      <div className="dir-head"><div><Kicker>The files</Kicker><h1>Find a <em>player</em></h1></div></div>
      <p className="muted lb-lead">Look anyone up by Steam name, Steam ID or a steamcommunity.com profile link. Deadlock keeps a record for every account that has played a tracked match.</p>

      <form className="pl-find paint" onSubmit={submit} role="search">
        <label className="search-box">
          <span className="icon" aria-hidden="true">{'⌕'}</span>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Steam name, Steam ID or profile link" aria-label="Find a player by name, Steam ID or profile link" autoComplete="off" spellCheck={false} autoFocus />
        </label>
        <button type="submit" className="pl-go">Look up</button>
      </form>
      {problem && <div className="notice" role="alert">{problem}</div>}
      {note && <div className="notice" role="status">{note}</div>}

      {q && (
        <section aria-label="Search results" className="pl-results">
          <div className="section-heading"><span className="star">{'✦'}</span><h2>{search ? <>Players named “{search}”</> : 'Opening…'}</h2></div>
          {state.status === 'loading' && search.length >= 3 && <p className="muted" role="status">Searching…</p>}
          {state.status === 'error' && <div className="panel empty" role="alert"><h3>Search failed</h3><p>{state.message}.</p></div>}
          {search.length > 0 && search.length < 3 && <p className="muted">Type at least three letters.</p>}
          {state.status === 'ready' && search.length >= 3 && hits.length === 0 && (
            <div className="panel empty"><h3>Nobody by that name</h3><p>The Deadlock API has no Steam name matching “{search}”. Try fewer letters, or paste the player’s Steam ID.</p></div>
          )}
          {hits.length > 0 && (
            <ul className="pl-hits">
              {hits.map((h) => {
                const b = h.lobbyBadge ? badgeParts(h.lobbyBadge) : null;
                return (
                  <li key={h.accountId}>
                    <Link to={`/player/${h.accountId}`} className="pl-hit">
                      <Avatar src={h.avatar} size={48} lazy />
                      <span className="nm"><b>{h.name}</b><small>{h.matches30d !== undefined ? `${fmtInt(h.matches30d)} games in the last 30 days` : 'Player'}</small></span>
                      {b && <span className="lobby" title="Average rank of the lobby in their last game"><RankBadge rank={b.rank} size="xs" /><span style={{ color: RANK_COLOR[b.rank as keyof typeof RANK_COLOR] }}>{badgeLabel(h.lobbyBadge as number)}</span><small>lobby</small></span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {recent.length > 0 && !q && (
        <section aria-label="Recently viewed" className="pl-results">
          <div className="section-heading"><span className="star">{'✦'}</span><h2>Recently viewed</h2></div>
          <ul className="pl-hits">
            {recent.map((r) => (
              <li key={r.accountId}>
                <Link to={`/player/${r.accountId}`} className="pl-hit">
                  <Avatar src={r.avatar} size={48} lazy />
                  <span className="nm"><b>{r.name}</b><small>Account {r.accountId}</small></span>
                </Link>
              </li>
            ))}
          </ul>
          <p><button type="button" className="chip" onClick={() => { forgetPlayers(); setRecent([]); }}>Clear this list</button></p>
        </section>
      )}

      <section className="pl-help panel pad" aria-label="Where to find a Steam ID">
        <h3>Where do I find a Steam ID?</h3>
        <ul>
          <li>Open your Steam profile in a browser. If the address ends in a 17-digit number, that is your Steam ID.</li>
          <li>If it ends in a custom name instead, your Steam <b>Account details</b> page shows the number near the top.</li>
          <li>The <b>friend code</b> on Steam’s Add a Friend page is the account number, and that works here as well.</li>
        </ul>
        <small>Broadway only reads public game records. It never asks you to sign in with Steam. See <Link to="/about">About</Link>.</small>
      </section>
      <SiteFooter />
    </div>
  );
}
