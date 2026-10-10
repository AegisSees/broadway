import { useEffect, useRef, useState } from 'react';
import type { AsyncState } from '../data/useAsync';

/**
 * Like useAsync, but asks again every `ms` and keeps showing the last good answer while it does, so a live list
 * refreshes in place instead of flashing back to "loading". A failed refresh keeps the old data and records the error.
 */
export function usePoll<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number, deps: unknown[]): AsyncState<T> & { updatedAt: number | null; refreshError: string | null } {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;
    let ctl = new AbortController();
    setState({ status: 'loading' });
    setUpdatedAt(null);
    const run = () => {
      ctl = new AbortController();
      fnRef.current(ctl.signal).then(
        (value) => { if (!alive) return; setState({ status: 'ready', value }); setUpdatedAt(Date.now()); setRefreshError(null); },
        (e: unknown) => {
          if (!alive) return;
          const message = e instanceof Error ? e.message : 'Something went wrong';
          setState((cur) => (cur.status === 'ready' ? cur : { status: 'error', message }));
          setRefreshError(message);
        },
      ).finally(() => { if (alive && ms > 0) timer = window.setTimeout(run, ms); });
    };
    run();
    return () => { alive = false; ctl.abort(); if (timer) window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, ...deps]);

  return { ...state, updatedAt, refreshError } as AsyncState<T> & { updatedAt: number | null; refreshError: string | null };
}

/** Re-renders every `ms` and returns the current unix time in seconds, for clocks that tick on screen. */
export function useNowSeconds(ms = 1000): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}
