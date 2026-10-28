import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ItemTile } from './BuildPanel';
import SkillTree from './SkillTree';
import { getAbilities } from '../data/abilities';
import { itemCount, KIND_LABEL, phaseCost, phaseWidths, plannerLink, type BuildItemStat, type HeroBuild } from '../data/builds';
import { getItem } from '../data/items';
import { copyText } from '../lib/clipboard';
import { fmtInt, fmtPct } from '../lib/stats';

export function CopyCode({ code, label = 'Copy code' }: { code: string; label?: string }) {
  const [done, setDone] = useState<'yes' | 'no' | null>(null);
  const copy = () => {
    void copyText(code).then((ok) => { setDone(ok ? 'yes' : 'no'); window.setTimeout(() => setDone(null), 1800); });
  };
  return (
    <button type="button" className="code-btn" onClick={copy} title="Copy the build code to the clipboard">
      <code>{code}</code>
      <span>{done === 'yes' ? 'Copied' : done === 'no' ? 'Select & copy' : label}</span>
      <span className="sr-only" role="status">{done === 'yes' ? 'Copied to the clipboard' : done === 'no' ? 'Could not copy automatically' : ''}</span>
    </button>
  );
}

const TIER = ['', 'I', 'II', 'III', 'IV', 'V'];
const souls = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);

function ShelfItem({ it }: { it: BuildItemStat }) {
  const share = it.picks !== undefined && it.of ? Math.round((it.picks / it.of) * 100) : null;
  const info = getItem(it.name);
  const cat = info?.category ?? it.category;
  return (
    <li className={`bs-it ${cat}`}>
      <ItemTile item={{ name: it.name, category: it.category }} note={it.note} />
      <span className="nm">{it.name}</span>
      {info && info.tier > 0 && <i className="tr" aria-hidden="true">{TIER[info.tier]}</i>}
      {it.note && <i className="dot" aria-hidden="true" title="The author left a note: hover the item" />}
      {share !== null && it.winRate !== undefined && (
        <small className={`st ${it.winRate >= 50 ? 'up' : 'down'}`} title={`In ${share}% of builds · win rate ${fmtPct(it.winRate)} when bought`}>{fmtPct(it.winRate)}</small>
      )}
    </li>
  );
}

/**
 * The build as a board of sections (the author's own, or laning / mid / late for samples): each a dark box with its
 * item count and soul cost, items as cards tinted by category with the tier in the corner, in buy order. Two short
 * sections in a row share a line. The author's notes sit behind each item's tooltip and, all at once, behind the
 * toggle underneath.
 */
export function BuildPhases({ build }: { build: HeroBuild }) {
  const [notesOpen, setNotesOpen] = useState(false);
  const noteCount = build.phases.reduce((n, p) => n + p.items.filter((i) => i.note).length, 0);
  const sampled = build.phases.some((p) => p.items.some((i) => i.picks !== undefined));
  const widths = phaseWidths(build.phases);
  return (
    <div className="bs">
      {build.phases.map((p, i) => {
        const notes = p.items.filter((it) => it.note);
        const cost = phaseCost(p.items);
        return (
          <section key={p.id} className={`bs-row ${widths[i]}`} aria-label={p.range ? `${p.label}, ${p.range}` : p.label}>
            <header>
              <h4>{p.label}</h4>
              {p.range && <small>{p.range}</small>}
              <span className="bs-sum">{p.items.length} {p.items.length === 1 ? 'item' : 'items'}{cost > 0 && <b title={`${fmtInt(cost)} souls`}>{souls(cost)}<i> souls</i></b>}</span>
            </header>
            <ol className="bs-items">{p.items.map((it) => <ShelfItem key={it.name} it={it} />)}</ol>
            {notesOpen && notes.length > 0 && (
              <ul className="bs-notes">{notes.map((it) => <li key={it.name}><b>{it.name}</b> {it.note}</li>)}</ul>
            )}
          </section>
        );
      })}
      <div className="bs-foot">
        {sampled && <small className="muted">Under each card: the win rate when it is bought. Hover for how many builds include it.</small>}
        {noteCount > 0 && (
          <button type="button" className="chip" aria-expanded={notesOpen} onClick={() => setNotesOpen((o) => !o)}>
            {notesOpen ? 'Hide the author’s notes' : `Show the author’s notes (${noteCount})`}
          </button>
        )}
      </div>
    </div>
  );
}

export function BuildSkill({ build }: { build: HeroBuild }) {
  if (!build.skill) return null;
  return (
    <div className="bb-skill">
      <div className="bb-skillhead">
        <h4>Skill order</h4>
        <small>{build.skill.winRate !== undefined ? `${fmtPct(build.skill.winRate)} win rate` : ''}{build.skill.matches ? ` · ${fmtInt(build.skill.matches)} matches` : ''}</small>
      </div>
      <SkillTree path={build.skill} abilities={getAbilities(build.heroSlug)} compact />
    </div>
  );
}

/**
 * The top builds for a hero: pick one of four lenses (meta consensus, highest win rate, most popular, Eternus) and see
 * which items are bought in each stage of the match, how many of the sampled builds include each one, when they are
 * bought on average and what the win rate is. The skill order and the shareable build code sit with it.
 */
export default function BuildBoard({ builds, heroName }: { builds: HeroBuild[]; heroName: string }) {
  const [id, setId] = useState(builds[0]?.id);
  const b = builds.find((x) => x.id === id) ?? builds[0];
  if (!b) return null;
  return (
    <div className="bb panel paint">
      <div className="btabs" role="tablist" aria-label={`${heroName} builds`}>
        {builds.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={x.id === b.id} onClick={() => setId(x.id)}>{x.tab ?? KIND_LABEL[x.kind]}</button>
        ))}
      </div>

      <div className="bb-head">
        <div className="bb-who">
          <h3>{b.title}</h3>
          <p>{b.blurb}</p>
          <div className="bb-tags">
            {b.tags.map((t) => <span key={t} className="tagchip">{t}</span>)}
            {b.author && <span className="bb-by">by {b.author}</span>}
          </div>
        </div>
        <dl className="bb-nums">
          {b.winRate !== null && <div><dt>Win rate</dt><dd className={b.winRate >= 50 ? 'up' : 'down'}>{fmtPct(b.winRate)}</dd></div>}
          {b.pickRate !== null && <div><dt>Pick rate</dt><dd>{fmtPct(b.pickRate)}</dd></div>}
          {b.matches !== null && <div><dt>Matches</dt><dd>{fmtInt(b.matches)}</dd></div>}
          {b.likes !== undefined && b.pickRate === null && <div><dt>Favorites</dt><dd>{fmtInt(b.likes)}</dd></div>}
          <div><dt>Items</dt><dd>{itemCount(b)}</dd></div>
        </dl>
      </div>

      <div className="bb-code">
        <span className="lbl">Build code</span>
        <CopyCode code={b.code} />
        <Link className="chip" to={plannerLink(b)}>Open in planner {'→'}</Link>
        <small>{b.sample}{b.illustrative ? ' · sample code, not a real in-game build' : ''}</small>
      </div>

      <BuildPhases build={b} />
      <BuildSkill build={b} />
    </div>
  );
}
