import { describe, expect, it } from 'vitest';
import { createStreams } from './streams.mjs';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function fakeTwitch({ expired = false } = {}) {
  const calls = [];
  let tokens = 0;
  const fetchImpl = async (url, init = {}) => {
    const u = String(url);
    calls.push(u);
    if (u.startsWith('https://id.twitch.tv/oauth2/token')) { tokens++; return json({ access_token: `tok${tokens}`, expires_in: 3600 }); }
    if (expired && init.headers?.authorization === 'Bearer tok1') return new Response('', { status: 401 });
    if (u.includes('/helix/games')) return json({ data: [{ id: '42', name: 'Deadlock' }] });
    if (u.includes('/helix/streams')) {
      return json({ data: [{ id: '1', user_login: 'MidnightFox', user_name: 'MidnightFox', title: 'Climbing', viewer_count: 120, language: 'en', thumbnail_url: 'https://x/{width}x{height}.jpg', started_at: '2026-10-08T00:00:00Z' }] });
    }
    return json({}, 404);
  };
  return { fetchImpl, calls };
}

describe('createStreams', () => {
  it('answers 503 with a hint when credentials are missing', async () => {
    const r = await createStreams({})();
    expect(r.status).toBe(503);
    expect(JSON.stringify(r.body)).toContain('TWITCH_CLIENT_ID');
  });

  it('looks up the category, trims the list and sizes the thumbnail', async () => {
    const t = fakeTwitch();
    const r = await createStreams({ clientId: 'id', clientSecret: 'secret', fetchImpl: t.fetchImpl })();
    expect(r.status).toBe(200);
    expect(r.body.streams).toEqual([{ id: '1', channel: 'midnightfox', name: 'MidnightFox', title: 'Climbing', viewers: 120, language: 'en', thumbnail: 'https://x/440x248.jpg', startedAt: Date.parse('2026-10-08T00:00:00Z') / 1000 }]);
    expect(t.calls.some((c) => c.includes('game_id=42'))).toBe(true);
  });

  it('caches for the ttl, so repeat visitors do not hit Twitch', async () => {
    const t = fakeTwitch();
    let clock = 0;
    const get = createStreams({ clientId: 'id', clientSecret: 's', fetchImpl: t.fetchImpl, now: () => clock, ttlMs: 60_000 });
    await get(); const n = t.calls.length;
    clock = 30_000; await get();
    expect(t.calls.length).toBe(n);
    clock = 90_000; await get();
    expect(t.calls.length).toBeGreaterThan(n);
  });

  it('gets a fresh token once when Twitch rejects the first', async () => {
    const t = fakeTwitch({ expired: true });
    const r = await createStreams({ clientId: 'id', clientSecret: 's', fetchImpl: t.fetchImpl, gameId: '42' })();
    expect(r.status).toBe(200);
    expect(t.calls.filter((c) => c.startsWith('https://id.twitch.tv')).length).toBe(2);
  });

  it('reports a bad gateway when Twitch is unreachable and nothing is cached', async () => {
    const r = await createStreams({ clientId: 'id', clientSecret: 's', fetchImpl: async () => { throw new Error('offline'); } })();
    expect(r.status).toBe(502);
  });
});
