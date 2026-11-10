import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { WINDOW_KEYS, type WindowKey } from '../data/patchWindow';
import { BRACKETS, DEFAULT_FILTERS, RANKS, type Filters, type Mode, type Queue, type RankKey } from '../data/types';

/** Every rank filter value the URL may carry: single ranks and brackets. */
const RANK_KEYS: readonly string[] = [...RANKS, ...BRACKETS.map((b) => b.key)];

/** Mode, queue, rank and time window live in the URL so a filtered page can be shared or bookmarked. */
export function useFilters(): [Filters, (patch: Partial<Filters>) => void] {
  const [params, setParams] = useSearchParams();
  const filters = useMemo<Filters>(() => {
    const mode: Mode = params.get('mode') === 'street_brawl' ? 'street_brawl' : DEFAULT_FILTERS.mode;
    const queue: Queue = params.get('queue') === 'unranked' ? 'unranked' : DEFAULT_FILTERS.queue;
    const r = params.get('rank');
    const rank: RankKey = r && RANK_KEYS.includes(r) ? (r as RankKey) : 'all';
    const w = params.get('window');
    const window: WindowKey = w && (WINDOW_KEYS as readonly string[]).includes(w) ? (w as WindowKey) : DEFAULT_FILTERS.window;
    return { mode, queue, rank, window };
  }, [params]);

  const update = useCallback(
    (patch: Partial<Filters>) => {
      const next = { ...filters, ...patch };
      const p = new URLSearchParams(params);
      const set = (k: string, v: string, d: string) => (v === d ? p.delete(k) : p.set(k, v));
      set('mode', next.mode, DEFAULT_FILTERS.mode);
      set('queue', next.queue, DEFAULT_FILTERS.queue);
      set('rank', next.rank, 'all');
      set('window', next.window, DEFAULT_FILTERS.window);
      setParams(p, { replace: true });
    },
    [filters, params, setParams],
  );
  return [filters, update];
}
