import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { attrLabel, baseDps, getHeroStats, hasScaling, isPreRelease, MAX_BOON, rankAmong, statRange, statsAtBoon, type HeroBaseStats } from '../data/heroStats';

const f = (n: number | null | undefined, d = 0): string => (n === null || n === undefined || !Number.isFinite(n) ? '–' : n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }));

/** One stat with a bar showing where the hero sits between the lowest and highest in the roster. */
export function StatBar({ label, value, barValue, range, unit = '', digits = 0, note, invert, rank }: {
  label: string; value: number | null; barValue?: number | null; range: { min: number; max: number }; unit?: string; digits?: number; note?: string; invert?: boolean; rank?: string;
}) {
  const bv = barValue === undefined ? value : barValue;
  const pct = bv === null || range.max === range.min ? 0 : Math.max(0.04, Math.min(1, (bv - range.min) / (range.max - range.min)));
  return (
    <div className="sbar">
      <div className="top"><span className="lb">{label}{rank && <small className="rk">{rank}</small>}</span><b>{f(value, digits)}<i>{unit}</i></b></div>
      <div className="trk" aria-hidden="true"><span className={invert ? 'inv' : ''} style={{ width: `${pct * 100}%` }} /></div>
      {note && <small>{note}</small>}
    </div>
  );
}

const RANGES = {
  health: statRange((s) => s.health), regen: statRange((s) => s.regen), move: statRange((s) => s.move), stamina: statRange((s) => s.stamina),
  dmg: statRange((s) => (s.weapon.bulletDamage ? s.weapon.bulletDamage * s.weapon.pellets : null)), dps: statRange((s) => (s.weapon.bulletDamage && s.weapon.rps ? s.weapon.bulletDamage * s.weapon.pellets * s.weapon.rps : null)),
  clip: statRange((s) => s.weapon.clip), reload: statRange((s) => s.weapon.reload), light: statRange((s) => s.light),
};

export function Complexity({ n }: { n: number | null }) {
  if (!n) return null;
  return <span className="cplx" role="img" aria-label={`Complexity ${n} of 3`}>{[1, 2, 3].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}</span>;
}

/**
 * Base stats and level scaling for one hero, from the game files. A boon slider shows what each stat becomes
 * as the hero levels up (souls needed for each boon are read from the hero's own level table).
 */
export default function HeroStatsPanel({ slug, name }: { slug: string; name: string }) {
  const s = getHeroStats(slug);
  const [boon, setBoon] = useState(1);
  const at = useMemo(() => (s ? statsAtBoon(s, boon) : null), [s, boon]);
  if (!s || !at) return null;
  const w = s.weapon;
  const max = MAX_BOON(s);
  const pre = isPreRelease(s);
  const scaled = hasScaling(s);
  const rk = (pick: (x: HeroBaseStats) => number | null): string | undefined => {
    if (pre) return undefined;
    const r = rankAmong(slug, pick);
    return r ? `#${r.rank} of ${r.of}` : undefined;
  };
  const base = statsAtBoon(s, 1);
  const delta = (a: number | null, b: number | null) => (a !== null && b !== null && a !== b ? `+${f(a - b, 1)} from boons` : undefined);
  return (
    <section className="panel hstats" aria-label={`${name} base stats`}>
      <header className="hs-head">
        <div>
          <h3>From the game files</h3>
          <p className="muted">{scaled ? <>Read from the game files{pre ? '. This hero is still in development, so numbers can change.' : '.'} Drag the slider to see level scaling.</> : <>Base numbers from the hero's release, with the rank among every released hero. Level scaling is not in our data yet.</>}</p>
        </div>
        <div className="hs-tags">
          {s.type && <span className="chip tag" style={{ cursor: 'default' }}>{s.type}</span>}
          {s.complexity ? <span className="chip tag" style={{ cursor: 'default' }}>Complexity <Complexity n={s.complexity} /></span> : null}
          <Link className="chip" to={`/compare/${slug}`}>Compare {'→'}</Link>
          <Link className="chip" to={`/planner?hero=${slug}`}>Plan a build {'→'}</Link>
        </div>
      </header>
      {scaled && (
        <div className="hs-boon">
          <label htmlFor="boon">Boon level</label>
          <input id="boon" type="range" min={1} max={max} value={boon} onChange={(e) => setBoon(Number(e.target.value))} aria-valuetext={`Boon ${boon}`} />
          <output><b>{boon}</b>{at.souls !== null && <small>{f(at.souls)} souls</small>}</output>
        </div>
      )}
      <div className="hs-cols">
        <div>
          <h4>Vitality</h4>
          <StatBar label="Health" value={at.health} range={{ min: RANGES.health.min, max: RANGES.health.max + 40 * (boon - 1) }} note={delta(at.health, base.health)} rank={rk((x) => x.health)} />
          <StatBar label="Health regen" value={s.regen} range={RANGES.regen} unit="/s" digits={1} rank={rk((x) => x.regen)} />
          <StatBar label="Move speed" value={s.move} range={RANGES.move} unit=" m/s" digits={1} note={`Sprint +${f(s.sprint, 1)} m/s`} rank={rk((x) => x.move)} />
          <StatBar label="Stamina" value={s.stamina} range={RANGES.stamina} rank={rk((x) => x.stamina)} />
        </div>
        <div>
          <h4>Weapon{w.name && <small className="wname">{w.name}</small>}</h4>
          <StatBar label="Bullet damage" value={at.bulletDamage} barValue={at.bulletDamage === null ? null : at.bulletDamage * w.pellets} range={RANGES.dmg} digits={2} unit={w.pellets > 1 ? ` ×${w.pellets}` : ''} note={delta(at.bulletDamage, base.bulletDamage)} />
          <StatBar label="Damage per second" value={at.dps} range={RANGES.dps} digits={0} note={w.rps ? `${f(w.rps, 2)} shots/s` : undefined} rank={rk(baseDps)} />
          <StatBar label="Magazine" value={w.clip} range={RANGES.clip} />
          <StatBar label="Reload" value={w.reload} range={RANGES.reload} unit="s" digits={2} invert />
        </div>
        <div>
          <h4>Melee &amp; spirit</h4>
          <StatBar label="Light melee" value={at.light} range={RANGES.light} digits={0} note={delta(at.light, base.light)} rank={rk((x) => x.light)} />
          <StatBar label="Heavy melee" value={at.heavy} range={{ min: RANGES.light.min * 2, max: RANGES.light.max * 2.6 }} digits={0} />
          {s.perBoon.spirit !== null && <div className="sline"><span>Spirit power per boon</span><b>+{f(s.perBoon.spirit, 2)}</b></div>}
          {w.falloffStart && w.falloffEnd && <div className="sline"><span>Damage falloff</span><b>{w.falloffStart}–{w.falloffEnd} m</b></div>}
          {w.attrs.length > 0 && <div className="sline"><span>Weapon</span><b className="wattrs">{w.attrs.map(attrLabel).join(' · ')}</b></div>}
        </div>
      </div>
    </section>
  );
}
export type { HeroBaseStats };
