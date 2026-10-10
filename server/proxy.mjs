// Tiny caching proxy for the Deadlock API. Node 20+, no dependencies.
//   npm run proxy              (listens on http://localhost:8787)
//
// Why it exists: the analytics endpoints share rate limits (200 requests/min per IP, 400 per key), and the data only
// changes every few hours. One server with one cache answers every visitor from memory, and an API key (if you get
// one) stays on the server instead of being shipped to browsers.
//
// Environment variables (all optional):
//   PORT                   default 8787
//   UPSTREAM               default https://api.deadlock-api.com
//   ALLOW_ORIGIN           default * (set to https://broadway.gg in production)
//   DEADLOCK_API_KEY       sent upstream when set
//   DEADLOCK_API_KEY_HEADER header name for the key. CHECK THE API DOCS for the right name before relying on this.
//   TTL_SECONDS            cache lifetime, default 21600 (6 hours, what the API itself caches)
//   LIVE_TTL_SECONDS       cache lifetime for /v1/matches/active, default 15 (the list changes by the minute)
//   TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET   enable GET /streams (live Deadlock streams). See server/streams.mjs.
//   TWITCH_GAME_ID         optional: skip looking the "Deadlock" category up by name
import http from 'node:http';
import { createStreams } from './streams.mjs';

const PORT = Number(process.env.PORT ?? 8787);
const UPSTREAM = (process.env.UPSTREAM ?? 'https://api.deadlock-api.com').replace(/\/$/, '');
const ORIGIN = process.env.ALLOW_ORIGIN ?? '*';
const KEY = process.env.DEADLOCK_API_KEY;
const KEY_HEADER = process.env.DEADLOCK_API_KEY_HEADER ?? 'x-api-key';
const TTL = Number(process.env.TTL_SECONDS ?? 21600) * 1000;
const LIVE_TTL = Number(process.env.LIVE_TTL_SECONDS ?? 15) * 1000;
const MAX_ENTRIES = 2000;
const getStreams = createStreams({ clientId: process.env.TWITCH_CLIENT_ID, clientSecret: process.env.TWITCH_CLIENT_SECRET, gameId: process.env.TWITCH_GAME_ID });
/** Lists that change by the minute are cached briefly; everything else for TTL. */
const ttlFor = (url) => (url.startsWith('/v1/matches/active') ? LIVE_TTL : TTL);

const cache = new Map(); // url -> { at, status, type, body }
const inflight = new Map();

function cors(res) {
  res.setHeader('access-control-allow-origin', ORIGIN);
  res.setHeader('access-control-allow-methods', 'GET, OPTIONS');
  res.setHeader('access-control-allow-headers', 'accept, content-type');
}

async function fetchUpstream(path) {
  const headers = { accept: 'application/json' };
  if (KEY) headers[KEY_HEADER] = KEY;
  const r = await fetch(UPSTREAM + path, { headers });
  const body = Buffer.from(await r.arrayBuffer());
  return { at: Date.now(), status: r.status, type: r.headers.get('content-type') ?? 'application/json', body, retryAfter: r.headers.get('retry-after') };
}

http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  if (req.method === 'GET' && (req.url ?? '').split('?')[0] === '/streams') {
    const { status, body } = await getStreams();
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'public, max-age=30' }).end(JSON.stringify(body));
    return;
  }
  if (req.method !== 'GET' || !/^\/(v1|v2)\//.test(req.url ?? '')) { res.writeHead(404, { 'content-type': 'application/json' }).end('{"error":"not found"}'); return; }
  const key = req.url;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlFor(key)) { send(res, hit, 'HIT', key); return; }
  try {
    let p = inflight.get(key);
    if (!p) { p = fetchUpstream(key).finally(() => inflight.delete(key)); inflight.set(key, p); }
    const out = await p;
    if (out.status === 200) {
      if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
      cache.set(key, out);
    } else if (hit) { send(res, hit, 'STALE', key); return; } // serve the last good answer rather than an error
    send(res, out, 'MISS', key);
  } catch (e) {
    if (hit) { send(res, hit, 'STALE', key); return; }
    res.writeHead(502, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'upstream unreachable', detail: String(e) }));
  }
}).listen(PORT, () => console.log(`Deadlock API proxy on http://localhost:${PORT} -> ${UPSTREAM}${KEY ? ' (with API key)' : ''}`));

function send(res, o, state, url = '') {
  const maxAge = url.startsWith('/v1/matches/active') ? Math.max(1, Math.floor(LIVE_TTL / 1000)) : 300;
  const h = { 'content-type': o.type, 'x-cache': state, 'cache-control': `public, max-age=${maxAge}` };
  if (o.retryAfter) h['retry-after'] = o.retryAfter;
  res.writeHead(o.status, h).end(o.body);
}
