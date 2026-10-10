// Live Deadlock streams from Twitch, for the /streams route of the Broadway proxy. Node 20+, no dependencies.
//
// Twitch needs an app token (client credentials) for every call. The id and secret stay on this server; the browser
// only ever sees the trimmed list this returns.
//
//   TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET   from https://dev.twitch.tv/console (register an application)
//   TWITCH_GAME_ID                           optional; skips the lookup of the "Deadlock" category by name

const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const HELIX = 'https://api.twitch.tv/helix';

/**
 * @param {{ clientId?: string, clientSecret?: string, gameId?: string, gameName?: string, fetchImpl?: typeof fetch, now?: () => number, ttlMs?: number, limit?: number }} opts
 * @returns {() => Promise<{ status: number, body: object }>}
 */
export function createStreams(opts = {}) {
  const { clientId, clientSecret, gameName = 'Deadlock', fetchImpl = fetch, now = Date.now, ttlMs = 60_000, limit = 40 } = opts;
  let gameId = opts.gameId;
  let token = null; // { value, expires }
  let cached = null; // { at, result }
  let inflight = null;

  async function getToken(force = false) {
    if (!force && token && token.expires - 60_000 > now()) return token.value;
    const url = `${TOKEN_URL}?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`;
    const r = await fetchImpl(url, { method: 'POST' });
    if (!r.ok) throw new Error(`Twitch token request answered ${r.status}`);
    const j = await r.json();
    token = { value: j.access_token, expires: now() + (Number(j.expires_in) || 3600) * 1000 };
    return token.value;
  }

  async function helix(path) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const t = await getToken(attempt > 0);
      const r = await fetchImpl(`${HELIX}${path}`, { headers: { 'client-id': clientId, authorization: `Bearer ${t}`, accept: 'application/json' } });
      if (r.status === 401 && attempt === 0) continue; // token expired early: get a fresh one and retry once
      if (!r.ok) throw new Error(`Twitch answered ${r.status} for ${path.split('?')[0]}`);
      return r.json();
    }
    throw new Error('Twitch rejected the token twice');
  }

  async function load() {
    if (!gameId) {
      const g = await helix(`/games?name=${encodeURIComponent(gameName)}`);
      gameId = g?.data?.[0]?.id;
      if (!gameId) return { status: 200, body: { streams: [], note: `Twitch has no category named "${gameName}"` } };
    }
    const j = await helix(`/streams?game_id=${encodeURIComponent(gameId)}&first=${limit}&type=live`);
    const streams = (j?.data ?? []).map((s) => ({
      id: String(s.id),
      channel: String(s.user_login ?? '').toLowerCase(),
      name: s.user_name,
      title: s.title,
      viewers: s.viewer_count,
      language: s.language,
      thumbnail: typeof s.thumbnail_url === 'string' ? s.thumbnail_url.replace('{width}', '440').replace('{height}', '248') : undefined,
      startedAt: s.started_at ? Math.floor(Date.parse(s.started_at) / 1000) : undefined,
    }));
    return { status: 200, body: { streams, updatedAt: Math.floor(now() / 1000) } };
  }

  return async function getStreams() {
    if (!clientId || !clientSecret) {
      return { status: 503, body: { error: 'streams not configured', hint: 'Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET on the proxy.' } };
    }
    if (cached && now() - cached.at < ttlMs) return cached.result;
    if (!inflight) {
      inflight = load()
        .then((result) => { cached = { at: now(), result }; return result; })
        .catch((e) => (cached ? cached.result : { status: 502, body: { error: 'twitch unreachable', detail: String(e?.message ?? e) } }))
        .finally(() => { inflight = null; });
    }
    return inflight;
  };
}
