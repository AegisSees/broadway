import { useMemo, useState } from 'react';
import AbilityTip from './AbilityTip';
import ItemCard from './ItemCard';
import Tip from './Tip';
import { getAbilities } from '../data/abilities';
import { getHeroColor } from '../data/heroColors';
import { getItem } from '../data/items';
import type { DamageBreakdown, DamageSource, TrendPoint } from '../data/types';
import { fmtInt, fmtPct } from '../lib/stats';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayLabel = (daysAgo: number): string => (daysAgo === 0 ? 'Today' : DAY[new Date(Date.now() - daysAgo * 864e5).getDay()]);

const CAT_COLOR = { weapon: '#e6a653', spirit: '#c58ad6', vitality: '#9bbd55' } as const;

/** A small line chart with a y range fitted to the data. Hovering (or tabbing) a day shows its value. */
function Line({ title, unit, points, pick, color, digits = 1 }: { title: string; unit: string; points: TrendPoint[]; pick: (p: TrendPoint) => number; color: string; digits?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560, H = 190, L = 44, R = 14, T = 16, B = 28;
  const vals = points.map(pick);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = Math.max((hi - lo) * 0.35, 0.25);
  const min = Math.floor((lo - pad) * 2) / 2, max = Math.ceil((hi + pad) * 2) / 2;
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(1, points.length - 1);
  const y = (v: number) => T + ((max - v) / (max - min || 1)) * (H - T - B);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(pick(p)).toFixed(1)}`).join('');
  const area = `${path}L${x(points.length - 1).toFixed(1)} ${H - B}L${x(0).toFixed(1)} ${H - B}Z`;
  const ticks = [min, (min + max) / 2, max];
  const last = vals[vals.length - 1], first = vals[0];
  const d = last - first;
  const shown = hover ?? points.length - 1;
  const gid = `tg-${title.replace(/\W/g, '')}`;
  return (
    <div className="trend">
      <div className="trend-top">
        <div><div className="trend-t">{title}</div><div className="trend-v" style={{ color }}>{pick(points[shown]).toFixed(digits)}{unit}<small>{dayLabel(points[shown].daysAgo)}</small></div></div>
        <span className={`delta ${d >= 0 ? 'up' : 'down'}`}>{d >= 0 ? '▲' : '▼'} {Math.abs(d).toFixed(digits)} pts <i>7 days</i></span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title} over the last ${points.length} days`} onMouseLeave={() => setHover(null)}>
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.32" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="grid" /><text x={L - 8} y={y(t) + 4} textAnchor="end" className="ax">{t.toFixed(1)}</text></g>)}
        <path d={area} fill={`url(#${gid})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="cursor" />}
        {points.map((p, i) => (
          <g key={p.daysAgo}>
            <circle cx={x(i)} cy={y(pick(p))} r={i === shown ? 5.5 : 3.4} fill={i === shown ? color : 'var(--s2)'} stroke={color} strokeWidth="2" />
            <text x={x(i)} y={H - 8} textAnchor="middle" className={`ax${i === shown ? ' on' : ''}`}>{dayLabel(p.daysAgo)}</text>
            <rect x={x(i) - (W - L - R) / (points.length - 1) / 2} y={0} width={(W - L - R) / (points.length - 1)} height={H} fill="transparent" tabIndex={0} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
          </g>
        ))}
      </svg>
    </div>
  );
}

function colorFor(s: DamageSource, i: number, hero: string): string {
  if (s.kind === 'melee') return '#8aa0b8';
  if (s.kind === 'misc') return '#6f6a63';
  if (s.kind === 'item') { const it = getItem(s.name); return it ? CAT_COLOR[it.category] : '#c9a24a'; }
  const base = getHeroColor(hero);
  return `color-mix(in srgb, ${base} ${100 - i * 9}%, #fff)`;
}

function SourceRow({ s, color, perMatch, heroSlug, max }: { s: DamageSource; color: string; perMatch: number; heroSlug: string; max: number }) {
  const abilities = getAbilities(heroSlug);
  const ai = s.kind === 'ability' && abilities ? abilities.findIndex((a) => a.name === s.name) : -1;
  const item = s.kind === 'item' ? getItem(s.name) : undefined;
  const icon = ai >= 0 ? abilities![ai].icon : item?.icon;
  const label = { ability: 'Ability', item: 'Item', melee: 'Melee', misc: 'Other' }[s.kind];
  const row = (
    <div className="dmg-row">
      <span className="dmg-ic" style={{ borderColor: color }}>{icon ? <img src={icon} alt="" /> : <i style={{ background: color }} />}</span>
      <span className="dmg-n"><b>{s.name}</b><small>{label}</small></span>
      <span className="dmg-bar"><i style={{ width: `${(s.share / max) * 100}%`, background: color }} /></span>
      <span className="dmg-v"><b>{fmtPct(s.share, 0)}</b><small>{fmtInt(Math.round((s.share / 100) * perMatch))}</small></span>
    </div>
  );
  if (ai >= 0) return <Tip className="dmg-tip" prefer="below" content={<AbilityTip ability={abilities![ai]} slot={ai} />}>{row}</Tip>;
  if (item) return <Tip className="dmg-tip" content={<ItemCard item={{ name: item.name, category: item.category }} />}>{row}</Tip>;
  return row;
}

/** Seven-day win rate and pick rate lines, plus where the hero's damage comes from. */
export default function TrendsPanel({ heroSlug, heroName, trends, damage }: { heroSlug: string; heroName: string; trends?: TrendPoint[]; damage?: DamageBreakdown }) {
  const pts = useMemo(() => (trends ? [...trends].sort((a, b) => b.daysAgo - a.daysAgo) : []), [trends]);
  const accent = getHeroColor(heroSlug);
  const sources = damage ? [...damage.sources].sort((a, b) => (a.kind === 'misc' ? 1 : b.kind === 'misc' ? -1 : b.share - a.share)) : [];
  const max = Math.max(1, ...sources.map((s) => s.share));
  const total = pts.reduce((n, p) => n + p.matches, 0);
  return (
    <div className="trends-grid">
      {pts.length > 1 && (
        <div className="panel pad trends">
          <h3>Last 7 days</h3>
          <small className="muted">{fmtInt(total)} matches in the window. Hover a day to read it.</small>
          <div className="trend-pair">
            <Line title="Win rate" unit="%" points={pts} pick={(p) => p.winRate} color="var(--good)" />
            <Line title="Pick rate" unit="%" points={pts} pick={(p) => p.pickRate} color={accent} />
          </div>
        </div>
      )}
      {damage && (
        <div className="panel pad dmg">
          <h3>Where {heroName}'s damage comes from</h3>
          <small className="muted">Share of an average {fmtInt(damage.perMatch)} damage per match. Hover a row for the card.</small>
          <div className="dmg-stack" role="img" aria-label="Damage share by source">
            {sources.map((s, i) => <i key={s.name} style={{ flexGrow: s.share, background: colorFor(s, i, heroSlug) }} title={`${s.name} ${s.share}%`} />)}
          </div>
          <div className="dmg-list">
            {sources.map((s, i) => <SourceRow key={s.name} s={s} color={colorFor(s, i, heroSlug)} perMatch={damage.perMatch} heroSlug={heroSlug} max={max} />)}
          </div>
          <p className="note">Other is damage the source tracking does not attribute to an ability or item, such as passives and gun damage without a named source.</p>
        </div>
      )}
    </div>
  );
}
