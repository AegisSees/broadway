import type { Ability } from '../data/types';
import Rich from './Rich';

const SLOT = ['Ability 1', 'Ability 2', 'Ability 3', 'Ultimate'];
const GLYPH: Record<string, string> = { cooldown: '◷', charges: 'ϟ', cast: '◔', channel: '◔', duration: '⧖', range: '↔', radius: '◎' };
const TOP = new Set(['cooldown', 'charges', 'cast', 'channel']);

/**
 * Ability card laid out like the in-game one: name with cooldown and charge chips, range, radius and duration chips,
 * a description with its keywords picked out, stat tiles (tinted by spirit or weapon scaling) and the three
 * upgrade tiers. Falls back to a plain card when only the wiki summary is known.
 */
export default function AbilityCard({ ability, slot, inline = false }: { ability: Ability; slot: number; inline?: boolean }) {
  const c = ability.card;
  if (!c) {
    return (
      <div className={`abc plain${inline ? ' inline' : ''}`}>
        <div className="abc-head"><div><div className="abc-slot">{SLOT[slot]}</div><h3>{ability.name}</h3></div>
          <div className="abc-chips top"><span className="chip-c">{GLYPH.cooldown} {ability.cooldown ? `${ability.cooldown}s` : ability.stats ? 'Passive' : ability.desc ? 'Cooldown soon' : 'Details soon'}</span></div></div>
        {ability.desc && <p className="abc-desc">{ability.desc}</p>}
        {ability.stats && <ul className="abc-stats">{ability.stats.split(';').map((s) => <li key={s}>{s.trim()}</li>)}</ul>}
      </div>
    );
  }
  const top = c.chips.filter((x) => TOP.has(x.k));
  const sub = c.chips.filter((x) => !TOP.has(x.k));
  return (
    <div className={`abc${slot === 3 ? ' ult' : ''}${inline ? ' inline' : ''}`}>
      <div className="abc-head">
        <div>
          <div className="abc-slot">{SLOT[slot]}</div>
          <h3>{c.name}</h3>
        </div>
        {top.length > 0 && <div className="abc-chips top">{top.map((x) => <span className="chip-c" key={x.k}><i>{GLYPH[x.k]}</i>{x.v}</span>)}</div>}
      </div>
      {sub.length > 0 && <div className="abc-chips">{sub.map((x) => <span className="chip-c" key={x.k}><i>{GLYPH[x.k]}</i>{x.v}</span>)}</div>}
      <div className="abc-desc">{c.desc.split(/\n\n+/).map((p, i) => <p key={i}><Rich text={p} /></p>)}</div>
      {c.sections.map((sec, i) => (
        <div className="abc-sec" key={i}>
          {sec.title && <div className="abc-sec-t">{sec.title}</div>}
          {sec.tiles.length > 0 && (
            <div className="abc-tiles" style={{ ['--cols' as string]: Math.min(sec.tiles.length, 3) } as React.CSSProperties}>
              {sec.tiles.map((t) => (
                <div className={`atile k-${t.kind}`} key={t.l + t.v}>
                  {t.scale && <span className="sc"><i>{t.kind === 'weapon' ? '◉' : '✧'}</i>x {t.scale}</span>}
                  <b>{t.v}</b><span><Rich text={t.l} /></span>
                </div>
              ))}
            </div>
          )}
          {sec.rows.length > 0 && <div className="abc-rows">{sec.rows.map((r) => <div key={r.l + r.v}><b>{r.v}</b> <Rich text={r.l} /></div>)}</div>}
        </div>
      ))}
      {c.upgrades.length > 0 && (
        <div className="abc-ups">
          {c.upgrades.map((u, i) => <div key={u}><div className="pt">{'◈'} {[1, 2, 5][i]}</div><p><Rich text={u} /></p></div>)}
        </div>
      )}
    </div>
  );
}
