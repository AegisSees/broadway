import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_FILTERS, RANKS, type Filters, type Mode, type Queue, type RankKey } from '../data/types';

/** Mode, queue and rank live in the URL so a filtered page can be shared or bookmarked. */
export function useFilters(): [Filters, (patch: Partial<Filters>) => void] {
  const [params, setParams] = useSearchParams();
  const filters = useMemo<Filters>(() => {
    const mode: Mode = params.get('mode') === 'street_brawl' ? 'street_brawl' : DEFAULT_FILTERS.mode;
    const queue: Queue = params.get('queue') === 'unranked' ? 'unranked' : DEFAULT_FILTERS.queue;
    const r = params.get('rank');
    const rank: RankKey = r && (RANKS as readonly string[]).includes(r) ? (r as RankKey) : 'all';
    return { mode, queue, rank };
  }, [params]);

  const update = useCallback(
    (patch: Partial<Filters>) => {
      const next = { ...filters, ...patch };
      const p = new URLSearchParams(params);
      const set = (k: string, v: string, d: string) => (v === d ? p.delete(k) : p.set(k, v));
      set('mode', next.mode, DEFAULT_FILTERS.mode);
      set('queue', next.queue, DEFAULT_FILTERS.queue);
      set('rank', next.rank, 'all');
      setParams(p, { replace: true });
    },
    [filters, params, setParams],
  );
  return [filters, update];
}
