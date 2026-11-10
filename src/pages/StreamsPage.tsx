import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Kicker from '../components/Kicker';
import { SiteFooter } from '../components/Shell';
import { dataSource } from '../data/source';
import { embedUrl, LANG_NAME, type LiveStream } from '../data/streams';
import { fmtClock } from '../data/matches';
import { useTitle } from '../lib/useTitle';
import { usePoll, useNowSeconds } from '../lib/usePoll';

const REFRESH_MS = 60_000;
const channelUrl = (c: string) => `https://www.twitch.tv/${encodeURIComponent(c)}`;
const k = (n: number) => (n >= 10_000 ? `${Math.round(n / 1000)}K` : n >= 1000 ? `${Math.round(n / 100) / 10}K` : String(n));

function Thumb({ s }: { s: LiveStream }) {
  return <div className="st-thumb">{s.thumbnail && <img src={s.thumbnail} alt="" loading="lazy" />}</div>;
}

function StreamCard({ s, now, onWatch, featured }: { s: LiveStream; now: number; onWatch: (s: LiveStream) => void; featured: boolean }) {
  return (
    <article className={`st panel paint${featured ? ' on' : ''}`}>
      <div className="st-top">
        <Thumb s={s} />
        <span className="st-live"><i aria-hidden="true" />Live</span>
        <span className="st-views" title="Viewers">{'◉'} {k(s.viewers)}</span>
        {s.startedAt && <span className="st-up">{fmtClock(now - s.startedAt)}</span>}
      </div>
      <div className="st-body">
        <h3>{s.name}</h3>
        <p title={s.title}>{s.title}</p>
        <div className="st-meta"><span className="tagchip">{LANG_NAME[s.language] ?? s.language.toUpperCase()}</span></div>
        <div className="st-actions">
          <button type="button" className="chip" onClick={() => onWatch(s)}>Watch here</button>
          <a className="chip" href={channelUrl(s.channel)} target="_blank" rel="noreferrer noopener">Open on Twitch {'↗'}</a>
        </div>
      </div>
    </article>
  );
}

/** Who is streaming Deadlock right now. The embed only loads for real channels, and only after someone chooses to watch. */
export default function StreamsPage() {
  useTitle('Livestreams');
  const [sp, setSp] = useSearchParams();
  const lang = sp.get('lang') ?? 'all';
  const now = useNowSeconds();
  const [watching, setWatching] = useState<LiveStream | null>(null);
  const state = usePoll((signal) => dataSource.liveStreams(signal), REFRESH_MS, []);
  const all = state.status === 'ready' ? state.value : null;
  const langs = useMemo(() => [...new Set((all ?? []).map((s) => s.language))].sort(), [all]);
  const list = useMemo(() => (all ?? []).filter((s) => lang === 'all' || s.language === lang), [all, lang]);
  const total = (all ?? []).reduce((n, s) => n + s.viewers, 0);
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  return (
    <div className="wrap sx">
      <div className="dir-head">
        <div><Kicker>Broadcasting</Kicker><h1>Live<em>streams</em></h1></div>
        {all && <div className="mx-count"><b>{all.length}</b><span>live · {k(total)} watching</span></div>}
      </div>
      <p className="muted mx-lead">People streaming Deadlock right now, busiest first. Watch from here or jump to their channel.</p>

      {watching && (
        <div className="st-embed panel">
          <div className="st-embed-head"><b>{watching.name}</b><span className="muted">{watching.title}</span><button type="button" className="chip" onClick={() => setWatching(null)}>Close player</button></div>
          <div className="st-frame"><iframe title={`${watching.name} on Twitch`} src={embedUrl(watching.channel, host)} allowFullScreen loading="lazy" /></div>
        </div>
      )}

      {all && langs.length > 1 && (
        <div className="pills hub-sort" role="group" aria-label="Language">
          <span className="lbl">Language</span>
          <button type="button" className="pill" aria-pressed={lang === 'all'} onClick={() => setSp(new URLSearchParams(), { replace: true })}>All</button>
          {langs.map((l) => <button key={l} type="button" className="pill" aria-pressed={lang === l} onClick={() => setSp(new URLSearchParams({ lang: l }), { replace: true })}>{LANG_NAME[l] ?? l.toUpperCase()}</button>)}
        </div>
      )}

      {state.status === 'loading' && <p className="muted" role="status">Looking for live streams…</p>}
      {state.status === 'error' && <div className="panel empty" role="alert"><h3>Couldn’t load streams</h3><p>{state.message}. It will try again in a minute.</p></div>}
      {state.status === 'ready' && !all && <div className="panel empty"><h3>Streams aren’t connected yet</h3><p>Livestreams need Broadway’s small streams service, which asks Twitch who is live. See the README for the two settings it needs.</p></div>}
      {all && list.length === 0 && <div className="panel empty"><h3>Nobody is live in that language</h3><p>Try another language, or <Link to="/streams" className="chip">show everyone</Link>.</p></div>}
      {list.length > 0 && <div className="st-grid">{list.map((s) => <StreamCard key={s.id} s={s} now={now} onWatch={setWatching} featured={watching?.id === s.id} />)}</div>}
      <SiteFooter />
    </div>
  );
}
