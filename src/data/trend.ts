
/** One day of results for a hero. `t` is the UTC midnight that starts the day, in unix seconds. */
export interface TrendPoint { t: number; winRate: number; matches: number }
export interface PatchMark { t: number; label: string }
export interface HeroTrend {
  /** Oldest first, one point per day. */
  points: TrendPoint[];
  /** Patch release days, oldest first. */
  patches: PatchMark[];
}

export type TrendRange = 'all' | '4w' | 'patch';
export const DAY = 86400;
export const todayUtc = (now = Date.now()): number => Math.floor(now / 1000 / DAY) * DAY;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDay = (t: number): string => { const d = new Date(t * 1000); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`; };

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The newest bucket is usually today, which is still being played: a few dozen games where an ordinary day has thousands,
 * so its win rate swings wildly and drags the chart's last point off a cliff (37.6% on 8 Oct 2026). A last day with fewer than
 * 60% of the games of the median of the days before it is treated as unfinished and left off. Needs at least three earlier days to judge.
 */
export function dropPartialLastDay(points: TrendPoint[]): TrendPoint[] {
  if (points.length < 4) return points;
  const last = points[points.length - 1];
  const before = points.slice(-8, -1).map((p) => p.matches).sort((a, b) => a - b);
  const median = before.length % 2 ? before[(before.length - 1) / 2] : (before[before.length / 2 - 1] + before[before.length / 2]) / 2;
  return last.matches < median * 0.6 ? points.slice(0, -1) : points;
}

interface DayRow { bucket: number; hero_id: number; matches: number; wins: number }

/** Builds a trend from /v1/analytics/hero-stats?bucket=start_time_day rows plus patch dates. Shape checked against the live API on 8 Oct 2026 (each row carries the day's start as `bucket`). */
export function normalizeTrend(rows: DayRow[], heroId: number, patches: PatchMark[]): HeroTrend | null {
  const byDay = new Map<number, { m: number; w: number }>();
  for (const r of rows) {
    if (r.hero_id !== heroId || !(r.matches > 0)) continue;
    const day = Math.floor(r.bucket / DAY) * DAY;
    const a = byDay.get(day) ?? { m: 0, w: 0 };
    a.m += r.matches; a.w += r.wins;
    byDay.set(day, a);
  }
  const points = dropPartialLastDay([...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([t, a]) => ({ t, matches: a.m, winRate: r2((a.w / a.m) * 100) })));
  return points.length >= 2 ? { points, patches: patches.filter((p) => p.t >= points[0].t && p.t <= points[points.length - 1].t) } : null;
}

/** Reads a patch date out of whatever field the patch feed uses. Tolerant on purpose: the shape is not verified. */
export function patchMarks(raw: unknown): PatchMark[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: PatchMark[] = [];
  for (const p of list as Record<string, unknown>[]) {
    const v = p?.pub_date ?? p?.published_at ?? p?.date ?? p?.release_date ?? p?.created_at;
    const ms = typeof v === 'number' ? (v > 1e12 ? v : v * 1000) : typeof v === 'string' ? Date.parse(v) : NaN;
    // two posts on the same day are one mark
    if (Number.isFinite(ms)) { const t = todayUtc(ms); if (!out.some((m) => m.t === t)) out.push({ t, label: fmtDay(t) }); }
  }
  return out.sort((a, b) => a.t - b.t);
}

export interface TrendView {
  points: TrendPoint[];
  patches: PatchMark[];
  /** In "by patch" view each point stands for one patch, so the chart spaces them evenly rather than by date. */
  byPatch: boolean;
}

/** Cuts the series down for the chosen range. */
export function trendView(trend: HeroTrend, range: TrendRange): TrendView {
  const last = trend.points[trend.points.length - 1];
  if (!last) return { points: [], patches: [], byPatch: false };
  if (range === 'all') return { points: trend.points, patches: trend.patches, byPatch: false };
  if (range === '4w') {
    const from = last.t - 27 * DAY;
    return { points: trend.points.filter((p) => p.t >= from), patches: trend.patches.filter((p) => p.t >= from), byPatch: false };
  }
  // One point per patch: matches-weighted win rate between that patch and the next one. The first window starts at the series start.
  const edges = [trend.points[0].t, ...trend.patches.map((p) => p.t).filter((t) => t > trend.points[0].t)];
  const points: TrendPoint[] = [];
  const patches: PatchMark[] = [];
  edges.forEach((from, i) => {
    const to = edges[i + 1] ?? Infinity;
    const slice = trend.points.filter((p) => p.t >= from && p.t < to);
    const m = slice.reduce((n, p) => n + p.matches, 0);
    if (!m) return;
    points.push({ t: from, matches: m, winRate: r2(slice.reduce((n, p) => n + p.winRate * p.matches, 0) / m) });
    patches.push({ t: from, label: fmtDay(from) });
  });
  return { points, patches, byPatch: true };
}

export interface TrendSummary { current: number; delta: number | null; matchesWeek: number }

/** Latest win rate (last 7 days, weighted by matches), the change against the 7 days before, and last week's matches. */
export function trendSummary(trend: HeroTrend): TrendSummary | null {
  const pts = trend.points;
  if (!pts.length) return null;
  const end = pts[pts.length - 1].t;
  const wk = (from: number, to: number) => {
    const s = pts.filter((p) => p.t > from && p.t <= to);
    const m = s.reduce((n, p) => n + p.matches, 0);
    return { m, wr: m ? s.reduce((n, p) => n + p.winRate * p.matches, 0) / m : null };
  };
  const cur = wk(end - 7 * DAY, end);
  const prev = wk(end - 14 * DAY, end - 7 * DAY);
  if (cur.wr === null) return null;
  return { current: Math.round(cur.wr * 10) / 10, delta: prev.wr === null ? null : Math.round((cur.wr - prev.wr) * 10) / 10, matchesWeek: cur.m };
}
