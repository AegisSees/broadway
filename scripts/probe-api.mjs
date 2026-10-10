// Calls each Deadlock API endpoint Broadway cares about once, prints what came back, and saves the first rows to
// api-samples/ so the app's types can be checked against reality.
//   npm run probe:api                      (uses https://api.deadlock-api.com)
//   API_BASE=http://localhost:8787 npm run probe:api
// Run it from a computer with normal internet access, then look at api-samples/_summary.txt.
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = (process.env.API_BASE ?? 'https://api.deadlock-api.com').replace(/\/$/, '');
const HEADERS = { accept: 'application/json' };
if (process.env.DEADLOCK_API_KEY) HEADERS[process.env.DEADLOCK_API_KEY_HEADER ?? 'x-api-key'] = process.env.DEADLOCK_API_KEY;

const DAY = 86400;
const since = Math.floor(Date.now() / 1000) - 30 * DAY;
const CALLS = [
  ['hero-stats', '/v1/analytics/hero-stats?bucket=no_bucket&game_mode=normal&match_mode=ranked'],
  ['hero-stats-street-brawl', '/v1/analytics/hero-stats?bucket=no_bucket&game_mode=street_brawl'],
  ['hero-stats-by-badge', '/v1/analytics/hero-stats?bucket=avg_badge&game_mode=normal&match_mode=ranked'],
  ['hero-counter-stats', '/v1/analytics/hero-counter-stats?game_mode=normal&match_mode=ranked&min_matches=50'],
  ['hero-synergy-stats', '/v1/analytics/hero-synergy-stats?game_mode=normal&match_mode=ranked&min_matches=50'],
  ['hero-ban-stats', '/v1/analytics/hero-ban-stats?bucket=no_bucket&match_mode=ranked'],
  ['badge-distribution', '/v1/analytics/badge-distribution?game_mode=normal&match_mode=ranked'],
  ['item-stats', '/v1/analytics/item-stats?bucket=no_bucket&game_mode=normal&match_mode=ranked&min_matches=200'],
  ['item-stats-hero-14', '/v1/analytics/item-stats?bucket=no_bucket&hero_ids=13&match_mode=ranked'],
  ['ability-order-stats', '/v1/analytics/ability-order-stats?hero_id=13&match_mode=ranked'],
  ['hero-build-stats', '/v1/analytics/hero-build-stats/13?match_mode=ranked&min_matches=20'],
  ['build-item-stats', '/v1/analytics/build-item-stats?hero_id=13'],
  ['assets-heroes', '/v1/assets/heroes?only_active=true'],
  ['assets-ranks', '/v1/assets/ranks'],
  ['assets-items', '/v1/assets/items'],
  ['hero-stats-daily', `/v1/analytics/hero-stats?bucket=start_time_day&game_mode=normal&match_mode=ranked&min_unix_timestamp=${since}`],
  ['matches-active', '/v1/matches/active'],
  ['builds', '/v1/builds?hero_id=13&limit=5'],
  ['patches', '/v2/patches'],
  ['leaderboard-namerica', '/v1/leaderboard/NAmerica'],
  ['leaderboard-namerica-hero', '/v1/leaderboard/NAmerica/13'],
  ['steam-search', '/v1/players/steam-search?search_query=a&limit=3'],
];

const shape = (v, depth = 0) => {
  if (Array.isArray(v)) return `[${v.length}] ${v.length ? shape(v[0], depth) : ''}`;
  if (v && typeof v === 'object') return depth > 1 ? '{...}' : '{ ' + Object.entries(v).slice(0, 24).map(([k, x]) => `${k}: ${shape(x, depth + 1)}`).join(', ') + ' }';
  return v === null ? 'null' : typeof v;
};

await mkdir('api-samples', { recursive: true });
const lines = [`Probe of ${BASE} at ${new Date().toISOString()}`, `(since=${since} is not used; every call relies on server defaults unless shown)`, ''];
for (const [name, path] of CALLS) {
  const t = Date.now();
  try {
    const r = await fetch(BASE + path, { headers: HEADERS });
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch { /* not JSON */ }
    const rows = Array.isArray(json) ? json.length : json && typeof json === 'object' ? Object.keys(json).length : 0;
    lines.push(`${r.status} ${name}  (${Date.now() - t} ms, ${rows} ${Array.isArray(json) ? 'rows' : 'keys'})  ${path}`);
    lines.push(`    ${json ? shape(json) : text.slice(0, 200)}`);
    await writeFile(`api-samples/${name}.json`, JSON.stringify(Array.isArray(json) ? json.slice(0, 3) : json, null, 2).slice(0, 20000));
  } catch (e) { lines.push(`ERR ${name}: ${e}`); }
}
// Second phase: player endpoints, using real account ids from the leaderboard sample.
try {
  const lb = JSON.parse(await (await import('node:fs/promises')).readFile('api-samples/leaderboard-namerica.json', 'utf8'));
  const list = Array.isArray(lb) ? lb : lb.entries ?? [];
  const ids = list.flatMap((e) => e.possible_account_ids ?? (e.account_id ? [e.account_id] : [])).slice(0, 3);
  if (ids.length) {
    for (const [name, path] of [['players-steam', `/v1/players/steam?account_ids=${ids.join(',')}`], ['players-hero-stats', `/v1/players/hero-stats?account_ids=${ids.join(',')}`]]) {
      try {
        const r = await fetch(BASE + path, { headers: HEADERS }); const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch { /* not JSON */ }
        lines.push(`${r.status} ${name}  ${path}`, `    ${json ? shape(json) : text.slice(0, 200)}`);
        await writeFile(`api-samples/${name}.json`, JSON.stringify(Array.isArray(json) ? json.slice(0, 3) : json, null, 2).slice(0, 20000));
      } catch (e) { lines.push(`ERR ${name}: ${e}`); }
    }
  } else lines.push('(no account ids found in the leaderboard sample, skipped player endpoints)');
} catch { lines.push('(leaderboard sample missing, skipped player endpoints)'); }
await writeFile('api-samples/_summary.txt', lines.join('\n'));
console.log(lines.join('\n'));
console.log('\nSaved to api-samples/.');
