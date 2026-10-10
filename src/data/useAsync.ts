import { useEffect, useState } from 'react';

export type AsyncState<T> = { status: 'loading' } | { status: 'ready'; value: T } | { status: 'error'; message: string };

/** Runs an abortable async function whenever `deps` change and exposes its state. */
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  useEffect(() => {
    const ctl = new AbortController();
    setState({ status: 'loading' });
    fn(ctl.signal).then(
      (value) => !ctl.signal.aborted && setState({ status: 'ready', value }),
      (e: unknown) => !ctl.signal.aborted && setState({ status: 'error', message: e instanceof Error ? e.message : 'Something went wrong' }),
    );
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
