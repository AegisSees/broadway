import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/client';
import { getDataHealth, reportHealthy } from './dataMode';
import { createHybridSource, fixtureSource, type DataSource } from './source';

const failing = (err: unknown): DataSource => ({
  ...fixtureSource,
  id: 'live',
  tierList: async () => { throw err; },
  player: async () => { throw err; },
  searchPlayers: async () => { throw err; },
});

describe('hybrid source reporting', () => {
  it('falls back to the labelled sample for the tier list and says so', async () => {
    reportHealthy();
    const src = createHybridSource(failing(new TypeError('Failed to fetch')), fixtureSource);
    const list = await src.tierList({} as never);
    expect(list.illustrative).toBe(true);
    expect(getDataHealth().degraded).toBe(true);
  });

  it('never invents a player: a network failure rejects and flags the data as degraded', async () => {
    reportHealthy();
    const src = createHybridSource(failing(new TypeError('Failed to fetch')), fixtureSource);
    await expect(src.player(1162416085)).rejects.toThrow('Failed to fetch');
    expect(getDataHealth().degraded).toBe(true);
  });

  it('treats "not found" as an answer, not an outage', async () => {
    reportHealthy();
    const src = createHybridSource(failing(new ApiError(404, 'not found')), fixtureSource);
    await expect(src.searchPlayers('nobody')).rejects.toBeInstanceOf(ApiError);
    expect(getDataHealth().degraded).toBe(false);
  });

  it('clears the flag once a call succeeds again', async () => {
    reportHealthy();
    const down = createHybridSource(failing(new TypeError('Failed to fetch')), fixtureSource);
    await expect(down.player(1)).rejects.toThrow();
    expect(getDataHealth().degraded).toBe(true);
    const up = createHybridSource({ ...fixtureSource, id: 'live', player: async () => fixtureSource.player(1) }, fixtureSource);
    await up.player(1);
    expect(getDataHealth().degraded).toBe(false);
  });
});
