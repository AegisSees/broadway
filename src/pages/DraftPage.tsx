import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { HeroFace } from '../components/HeroFace';
import Kicker from '../components/Kicker';
import { SiteFooter } from '../components/Shell';
import { SIDE_NAME, SIDE_SHORT, type Side } from '../data/matchDetail';
import { getHero, HEROES, type Hero } from '../data/roster';
import { useModel } from '../ml/models';
import { bestPicks, draftChance, draftTerms, heroIdOf, heroSlugOf, lineupCounters, type DraftTerm } from '../ml/predict';
import { useTitle } from '../lib/useTitle';

const SIDES: Side[] = ['hidden-king', 'archmother'];
const KEY: Record<Side, string> = { 'hidden-king': 'hk', archmother: 'am' };
/** Heroes the models know (released and in the training data). */
const POOL: Hero[] = HEROES.filter((h) => !h.unreleased && heroIdOf(h.slug) !== undefined);
/** Log-odds near an even game -> win-chance points. */
const pts = (z: number) => z * 25;
const signed = (n: number, d = 1) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(d)}`;

function parse(v: string | null): string[] {
  const out: string[] = [];
  for (const s of (v ?? '').split(',')) if (POOL.some((h) => h.slug === s) && !out.includes(s)) out.push(s);
  return out.slice(0, 6);
}

function Slot({ hero, active, onClick, n }: { hero?: Hero; active: boolean; onClick: () => void; n: number }) {
  return (
    <li>
      <button type="button" className={`df-slot${hero ? ' full' : ''}${active ? ' on' : ''}`} onClick={onClick} aria-pressed={active} aria-label={hero ? `Remove ${hero.name}` : `Pick hero ${n}`}>
        {hero ? <><HeroFace hero={hero} size="lg" /><span>{hero.name}</span></> : <><i aria-hidden="true">+</i><span>Open slot</span></>}
      </button>
    </li>
  );
}

function Term({ t }: { t: DraftTerm }) {
  const heroes = t.heroes.map((id) => getHero(heroSlugOf(id))).filter((h): h is Hero => !!h);
  const side: Side = t.value >= 0 ? 'hidden-king' : 'archmother';
  const what = t.kind === 'hero' ? heroes[0]?.name : t.kind === 'pair' ? `${heroes.map((h) => h.name).join(' with ')}` : `${heroes.map((h) => h.name).join(' against ')}`;
  return (
    <li className={side}>
      <span className="df-faces">{heroes.map((h) => <HeroFace key={h.slug} hero={h} />)}</span>
      <span className="df-tw"><b>{what}</b><small>{t.kind === 'hero' ? 'hero strength' : t.kind === 'pair' ? 'teammates' : 'head to head'}</small></span>
      <em>{signed(pts(Math.abs(t.value)))} {SIDE_SHORT[side]}</em>
    </li>
  );
}

/**
 * Draft odds: fill in the two lineups and the draft model (heroes, teammate pairs and head-to-head pairs, trained on
 * recent public games) gives each side's chance. For the side being filled it also lists the best picks for the
 * open slot and, from top-bracket games, the heroes that do best into the enemy lineup.
 */
export default function DraftPage() {
  useTitle('Draft odds');
  const [sp, setSp] = useSearchParams();
  const teams: Record<Side, string[]> = { 'hidden-king': parse(sp.get('hk')), archmother: parse(sp.get('am')) };
  const [active, setActive] = useState<Side>(() => (teams['hidden-king'].length > teams.archmother.length ? 'archmother' : 'hidden-king'));
  const [q, setQ] = useState('');
  const model = useModel('draft');
  const matchups = useModel('matchups');

  const ids = (side: Side) => teams[side].map((s) => heroIdOf(s)!);
  const a = ids('hidden-king');
  const b = ids('archmother');
  const key = `${a.join(',')}|${b.join(',')}`;
  const p = useMemo(() => (model ? draftChance(model, a, b) : 0.5), [model, key]); // eslint-disable-line react-hooks/exhaustive-deps
  const terms = useMemo(() => (model ? draftTerms(model, a, b, 6) : []), [model, key]); // eslint-disable-line react-hooks/exhaustive-deps
  const sideIdx = active === 'hidden-king' ? 0 : 1;
  const open = teams[active].length < 6;
  const pool = POOL.map((h) => heroIdOf(h.slug)!);
  const picks = useMemo(() => (model && open ? bestPicks(model, a, b, sideIdx, pool).slice(0, 5) : []), [model, key, sideIdx, open]); // eslint-disable-line react-hooks/exhaustive-deps
  const enemies = sideIdx === 0 ? b : a;
  const taken = new Set([...a, ...b]);
  const counters = useMemo(() => (matchups && open ? lineupCounters(matchups, enemies, pool.filter((h) => !taken.has(h))).slice(0, 5) : []), [matchups, key, sideIdx, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const write = (next: Record<Side, string[]>) => {
    const n = new URLSearchParams();
    for (const s of SIDES) if (next[s].length) n.set(KEY[s], next[s].join(','));
    setSp(n, { replace: true });
  };
  const add = (slug: string) => {
    if (!open || teams['hidden-king'].includes(slug) || teams.archmother.includes(slug)) return;
    const next = { ...teams, [active]: [...teams[active], slug] };
    write(next);
    // keep filling the same side until it is full, then move to the other one
    if (next[active].length === 6 && next[active === 'hidden-king' ? 'archmother' : 'hidden-king'].length < 6) setActive(active === 'hidden-king' ? 'archmother' : 'hidden-king');
  };
  const remove = (side: Side, slug: string) => { write({ ...teams, [side]: teams[side].filter((s) => s !== slug) }); setActive(side); };

  const needle = q.trim().toLowerCase();
  const grid = POOL.filter((h) => !needle || h.name.toLowerCase().includes(needle));
  const hk = Math.round(p * 100);
  const full = a.length === 6 && b.length === 6;
  const any = a.length + b.length > 0;

  return (
    <div className="wrap df">
      <div className="dir-head">
        <div><Kicker>Draft odds</Kicker><h1>Call <em>the draft</em></h1></div>
        {any && <button type="button" className="chip" onClick={() => { write({ 'hidden-king': [], archmother: [] }); setActive('hidden-king'); }}>Clear both teams</button>}
      </div>
      <p className="muted shop-hint">Pick six heroes a side. The odds come from a model trained on recent public games: hero strength, which heroes work together and how they fare head to head. It picks the winner about six times in ten, so treat a 55% as a lean, not a lock. The link in your address bar keeps the lineups.</p>

      <section className="df-board" aria-label="The two lineups">
        {SIDES.map((side) => (
          <div key={side} className={`df-team panel ${side}${active === side ? ' on' : ''}`}>
            <header>
              <button type="button" className="df-side" aria-pressed={active === side} onClick={() => setActive(side)}>
                <b>{SIDE_NAME[side]}</b><small>{active === side ? (teams[side].length < 6 ? 'Picking for this side' : 'Full') : 'Pick for this side'}</small>
              </button>
            </header>
            <ol className="df-slots">
              {Array.from({ length: 6 }, (_, i) => {
                const slug = teams[side][i];
                const h = getHero(slug);
                return <Slot key={slug ?? `e${i}`} n={i + 1} hero={h} active={!h && active === side && i === teams[side].length} onClick={() => (slug ? remove(side, slug) : setActive(side))} />;
              })}
            </ol>
          </div>
        ))}
        <div className="df-meter panel paint" aria-live="polite">
          <small>{full ? 'Win chance' : any ? 'Win chance so far' : 'Even until the picks start'}</small>
          <div className="df-split">
            <span className="hidden-king"><b>{hk}%</b><em>{SIDE_SHORT['hidden-king']}</em></span>
            <span className="archmother"><b>{100 - hk}%</b><em>{SIDE_SHORT.archmother}</em></span>
          </div>
          <span className="df-bar" role="img" aria-label={`Hidden King ${hk}%, Archmother ${100 - hk}%`}><i className="hk" style={{ width: `${hk}%` }} /><i className="am" style={{ width: `${100 - hk}%` }} /></span>
          {!full && any && <p className="muted">Open slots count as average picks.</p>}
        </div>
      </section>

      <div className="df-grid">
        <section className="panel pad df-pool" aria-label="Heroes">
          <div className="df-pool-h">
            <h3>Heroes</h3>
            <small>{open ? `Adding to the ${SIDE_SHORT[active]}` : `The ${SIDE_SHORT[active]} is full: pick a side with an open slot`}</small>
            <label className="search-box">
              <span className="icon" aria-hidden="true">{'⌕'}</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search heroes" aria-label="Search heroes" />
            </label>
          </div>
          <ul className="df-heroes">
            {grid.map((h) => {
              const side = SIDES.find((s) => teams[s].includes(h.slug));
              return (
                <li key={h.slug}>
                  <button type="button" className={side ? `in ${side}` : ''} disabled={!!side || !open} onClick={() => add(h.slug)} title={side ? `On the ${SIDE_SHORT[side]}` : h.name}>
                    <HeroFace hero={h} size="lg" /><span>{h.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="df-side-col">
          {open && picks.length > 0 && (
            <section className="panel pad df-list" aria-label="Best picks">
              <h3>Best picks for the {SIDE_SHORT[active]}</h3>
              <small>Win chance with each hero in the next slot</small>
              <ol>
                {picks.map((x) => {
                  const h = getHero(heroSlugOf(x.hero));
                  if (!h) return null;
                  return (
                    <li key={x.hero}>
                      <button type="button" onClick={() => add(h.slug)}><HeroFace hero={h} /><b>{h.name}</b><em>{Math.round(x.chance * 100)}%</em></button>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
          {open && counters.length > 0 && (
            <section className="panel pad df-list" aria-label="Counters from top players">
              <h3>Into their lineup, at the top</h3>
              <small>Heroes that beat these enemies most in top-10% games (Phantom and up), win-rate points over their own average</small>
              <ol>
                {counters.map((x) => {
                  const h = getHero(heroSlugOf(x.hero));
                  if (!h) return null;
                  return (
                    <li key={x.hero}>
                      <button type="button" onClick={() => add(h.slug)} title={x.vs.map((v) => `${getHero(v.slug)?.name ?? v.hero}: ${signed(v.delta)} pts over ${v.games} games`).join('\n')}>
                        <HeroFace hero={h} /><b>{h.name}</b><em className={x.total >= 0 ? 'good' : 'bad'}>{signed(x.total)}</em>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
          {terms.length > 0 && (
            <section className="panel pad df-terms" aria-label="What tips it">
              <h3>What tips it</h3>
              <small>The biggest pieces of the call, in win-chance points</small>
              <ul>{terms.map((t, i) => <Term key={i} t={t} />)}</ul>
            </section>
          )}
          {!any && <section className="panel pad df-list"><h3>Start with a hero</h3><p className="muted">Pick from the grid. Suggestions for the open slot and top players’ counters show up here as the lineups fill. Or open a <Link to="/matches">live match</Link> to see the draft odds of games being played now.</p></section>}
        </aside>
      </div>
      <SiteFooter />
    </div>
  );
}
