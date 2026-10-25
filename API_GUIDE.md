# Broadway and the Deadlock API

Since round 15 Broadway reads **real data** from the community Deadlock API (https://api.deadlock-api.com, docs at
https://api.deadlock-api.com/docs). Everything below was checked against live responses on 8 October 2026. The saved
answers are in `api-samples/` and the unit tests (`src/data/liveMap.test.ts`) run the mapping code against them.

## Run it

```
npm install
npm run dev          # http://localhost:5173, live data by default
npm test             # includes the live-response mapping tests
```

The header chip shows what you are looking at: **Live data**, **Sample data** or **Offline** (the API could not be
reached, so the page fell back to a clearly labelled sample). Click it to switch between live and sample. The choice is
remembered in the browser. To make sample data the default for a build, set `VITE_DATA_SOURCE=fixture` (see `.env.example`).

## What is live

| On the site | Endpoint | Notes |
|---|---|---|
| Tier list, hero win / pick / ban rate, overall rank | `GET /v1/analytics/hero-stats`, `hero-ban-stats` | Tiers are Broadway's own score (80% win-rate z-score, 20% pick-rate z-score) cut by share of heroes. A "week over week" delta needs 100+ games in each week. |
| Win rate over time + patch lines | `hero-stats?bucket=start_time_day`, `GET /v2/patches` | Last 120 days. |
| Best / worst picks, lane synergy | `hero-counter-stats`, `hero-synergy-stats` | Synergy pairs are listed once (lower hero id first). |
| Rank distribution | `GET /v1/players/rank/distribution` | **Players** per rank level (66 rows). The older `badge-distribution` counts games. |
| Leaderboard (region and hero) | `GET /v1/leaderboard/{region}[/{hero_id}]` | See "Names are not accounts" below. |
| Avatars, ranks, W/L on the leaderboard | `players/steam`, `players/rank`, `players/hero-stats` | Fetched for the rows on screen only. |
| Live matches | `GET /v1/matches/active` | About 150 games. Names and ranks are looked up for the games on screen. |
| Patch notes on Home | `GET /v2/patches` | `forum` posts are the real patch notes, `steam` posts are news. |
| **Match report** | `GET /v1/matches/metadata?match_ids=` | One game: players, items, souls curve. Unknown id answers 404 `{"error":"No matches found"}`. See "Match metadata" below. |
| **Player pages** | `players/steam`, `players/rank`, `players/{id}/match-history`, `players/hero-stats`, `players/{id}/mate-stats`, `players/steam-search` | Everything on `/player/:id`. Never replaced by invented data. |
| **Builds** (hero page tabs, builds hub) | `GET /v1/builds`, `/v1/analytics/hero-build-stats/{hero_id}`, `players/steam`, `players/rank` | Published in-game builds, most favorited first. See "Builds" below. |

Still **samples, labelled as such**: the overview's skill order, community guides, damage breakdown, Street Brawl high rolls,
and the livestream list (the streams proxy needs Twitch credentials, see `.env.example`).

Not used: `/v1/players/{id}/card` and `account-stats` answer 403 without a Patreon key.

## Facts worth knowing

- **CORS is open** (`access-control-allow-origin: *`), so the browser can call the API directly. Analytics endpoints share a limit
  of 200 requests per minute per IP. For a public site run `npm run proxy` (a small caching server) and set `VITE_API_BASE`.
- **Win** is `player_match_outcome == 1` in match history. A badge is `tier * 10 + level` (Eternus VI is 116). A SteamID64 is
  `account_id + 76561197960265728`.
- **Pick rate** is the share of games a hero is in, so all heroes add up to about 1,200% (twelve players per game). Ban rate is bans divided by games.
- **Long URLs fail.** Account-id lists are sent 100 at a time (20 for `players/hero-stats`).
- **Names are not accounts.** The leaderboard lists a name and every account that has it, and a popular name can have thousands.
  Broadway only resolves rows with 12 or fewer candidates: it prefers the account with 30+ games in 30 days, then the highest rank. When that is a
  guess, the row shows the other accounts on the player page (`?alt=`). Rows with more candidates open a name search instead.
- **Hero ids** come from `/v1/assets/heroes`; its `class_name` is the key used in `src/data/heroStats.json`. Four roster heroes that are
  still pre-release are not in the API's active list.
- The API is community run and unofficial. Keep the credit line in the footer and the "not endorsed by Valve" notice.

## Match metadata

`/v1/matches/metadata?match_ids=<id>` returns an array of one match (shape checked against a real game on 9 Oct 2026; a trimmed copy is `api-samples/match-metadata.json`).

- `Team0` is the Hidden King, `Team1` the Archmother. `winning_team` uses the same names.
- `mvp_rank` is only present on the top three players. `team_score` is `[]` for normal games and `[a, b]` for Street Brawl; `game_mode` is `Normal` / `StreetBrawl`, `match_mode` `Ranked` / `Unranked`.
- Shop items have `upgrade_id` and a name in `itemIds.json`; ability purchases have no `upgrade_id`. An item is held if `sold_time_s` is 0 or missing.
- `stats` are sampled every 180 s, plus a final sample about a second before the end, so the last souls figure can differ from the final by a few points.
- **Not verified:** `assigned_lane` 1 / 4 / 6 as York / Broadway / Greenwich (about 80% sure). The page uses it only for the lane dot colour.

## Before going public

1. Run the proxy (`server/proxy.mjs`): one cache and one key serve every visitor. Set `ALLOW_ORIGIN` to your site.
2. Tell the API maintainers roughly how much traffic to expect, and ask about a key.
3. The Valve art, fonts, rank badges and backgrounds in `src/assets/` came from a game install. Check Valve's asset policy before publishing them.

## Mapping the rest

## Builds

Mapped in round 51 (`src/data/communityBuilds.ts`, tests on `api-samples/builds.json`). Not verified against the running service
from the build sandbox, which cannot reach the API, so check these on the live site:

- The hub makes one call without `hero_id` (120 most favorited plus 40 weekly), or one hero's 40 with their stats when a hero is picked.
- `/v1/builds` is called with `only_latest=true&sort_by=favorites|weekly_favorites&sort_direction=desc&limit=N&hero_id=` and,
  for the most played and best builds that are not among the favorites, `build_id=`.
- `hero_build.details.mod_categories[].mods[].ability_id` is an item id (itemIds.json). `ability_order.currency_changes` lists
  unlocks (`currency_type` 2) and ability-point spends (`currency_type` 1, `delta` -1/-2/-5); ability ids are in heroAbilityIds.json.
- `hero-build-stats/{hero_id}` rows are joined on `hero_build_id`. `num_weekly_favorites` came back null in the saved sample
  (sorted by favorites); it may only be filled when sorting by weekly favorites.

Still unmapped: `build-item-stats` and `ability-order-stats` (the overview's skill order). `npm run probe:api` saves fresh samples into `api-samples/`; send them
back and the mapping can be written against the real shapes, the same way this round's was.
