import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SiteFooter } from '../components/Shell';
import { HEROES, initials } from '../data/roster';
import { getHeroColor } from '../data/heroColors';
import { getGloat } from '../data/heroGloat';
import { getTags } from '../components/HeroTags';
import FavStar from '../components/FavStar';
import { useFavorites } from '../lib/favorites';
import { searchHeroes } from '../lib/search';
import { useTitle } from '../lib/useTitle';

export default function HeroDirectory() {
  useTitle('Heroes');
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const { favs } = useFavorites();
  const [onlyFavs, setOnlyFavs] = useState(false);
  const base = useMemo(() => (q.trim() ? searchHeroes(q, HEROES.length) : HEROES), [q]);
  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of HEROES) for (const t of getTags(h.slug)) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 14);
  }, []);
  const list = base.filter((h) => (!tag || getTags(h.slug).includes(tag)) && (!onlyFavs || favs.includes(h.slug)));
  return (
    <div className="wrap">
      <div className="dir-head">
        <div><div className="dotline">Hero directory</div><h1>Every hero <em>in the city</em></h1></div>
        <label className="search-box" style={{ width: 280 }}>
          <span className="icon" aria-hidden="true">{'⌕'}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter heroes" aria-label="Filter heroes" />
        </label>
      </div>
      {(tagCounts.length > 0 || favs.length > 0) && (
        <div className="dir-filters" role="group" aria-label="Filter by trait">
          <button type="button" className={tag === null && !onlyFavs ? 'on' : ''} onClick={() => { setTag(null); setOnlyFavs(false); }}>All</button>
          <button type="button" className={onlyFavs ? 'on' : ''} onClick={() => setOnlyFavs((v) => !v)}>{'★'} Following <i>{favs.length}</i></button>
          {tagCounts.map(([t, n]) => <button type="button" key={t} className={tag === t ? 'on' : ''} onClick={() => setTag(tag === t ? null : t)}>{t} <i>{n}</i></button>)}
        </div>
      )}
      <div className="dir-grid">
        {list.map((h) => (
          <Link key={h.slug} to={`/hero/${h.slug}`} className={`dir-card${getGloat(h.slug) ? ' has-bust' : ''}`} style={{ ['--hc' as string]: getHeroColor(h.slug) } as React.CSSProperties}>
            <FavStar slug={h.slug} name={h.name} />
            <div className="pic">{h.portrait ? <img src={h.portrait} alt="" loading="lazy" /> : h.icon ? <img className="icon-pic" src={h.icon} alt="" loading="lazy" /> : initials(h.name)}{h.unreleased && <span className="new-flag">New</span>}</div>
            {getGloat(h.slug) && <span className="bust" aria-hidden="true"><img src={getGloat(h.slug)} alt="" loading="lazy" /></span>}
            <div className="nm">{h.name}</div>
            <div className="dtags">{getTags(h.slug).join(' · ') || '\u00a0'}</div>
          </Link>
        ))}
      </div>
      {list.length === 0 && <p className="muted" style={{ marginTop: 24 }}>No heroes match{q ? ` “${q}”` : ''}{tag ? ` with the ${tag} tag` : ''}{onlyFavs ? ' in your followed list' : ''}.</p>}
      <SiteFooter />
    </div>
  );
}
