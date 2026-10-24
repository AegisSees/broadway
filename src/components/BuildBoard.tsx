import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ItemTile } from './BuildPanel';
import SkillTree from './SkillTree';
import { getAbilities } from '../data/abilities';
import { fmtBuy, itemCount, KIND_LABEL, plannerLink, type BuildItemStat, type HeroBuild } from '../data/builds';
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

function ItemRow({ it }: { it: BuildItemStat }) {
  // published builds have no per-item numbers: the row shows the author's note, if any, instead of the bar
  const stats = it.picks !== undefined && it.of ? { share: Math.round((it.picks / it.of) * 100), picks: it.picks, of: it.of } : null;
  return (
    <li className={`bb-item${stats ? '' : ' plain'}`}>
      <span className="no" aria-hidden="true">{it.order}</span>
      <ItemTile item={{ name: it.name, category: it.category }} />
      <div className="mid">
        <b>{it.name}</b>
        {stats && <span className="bar" aria-hidden="true"><i style={{ width: `${stats.share}%` }} /></span>}
        {stats && <small>in {fmtInt(stats.picks)}/{fmtInt(stats.of)} builds{it.avgBuy !== undefined ? ` · avg buy ${fmtBuy(it.avgBuy)}` : ''}</small>}
        {!stats && it.note && <small>{it.note}</small>}
      </div>
      {it.winRate !== undefined && <span className={`bb-wr ${it.winRate >= 50 ? 'up' : 'down'}`} title="Win rate when this item is bought">{fmtPct(it.winRate)}</span>}
    </li>
  );
}

/** Laning / mid game / late game columns: numbered items with how many builds include them, average buy time and win rate. */
export function BuildPhases({ build }: { build: HeroBuild }) {
  return (
    <div className="bb-phases">
      {build.phases.map((p) => (
        <section key={p.id} className="bb-phase" aria-label={p.range ? `${p.label}, ${p.range}` : p.label}>
          <header><h4>{p.label}</h4>{p.range && <small>{p.range}</small>}</header>
          <ol>{p.items.map((it) => <ItemRow key={it.name} it={it} />)}</ol>
        </section>
      ))}
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
