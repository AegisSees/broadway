# Broadway

Ranked Deadlock hero stats, builds and matchups. Independent fan project, not endorsed by Valve.

React 18 + TypeScript + Vite. No UI framework; the design system is plain CSS in `src/styles/`.

## Run it

Requires Node 20+ (https://nodejs.org).

```
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (stats, search, Steam IDs, API client, matches)
npm run build      # typecheck + production build into dist/
```

## What works today

- **Builds hub** (`/builds`): every hero's builds in one place. Filter All / In-game / Community / Pro (Eternus), sort Popular / Trending / Newest / Win rate, pick a hero or search. Each card has a copyable build code and expands to the laning, mid and late item paths plus skill order.
- **Top builds on every hero page**: Meta consensus, Highest win rate, Most popular and Pro · Eternus, each with items by phase (how many builds include them, average buy time, win rate), the skill order and the build code.
- **Tier list** (`/tiers`): tier labels are flat rectangular plates with black lettering, like the orange labels on the official site (S+ amber, S orange, A green, B blue, C grey, D red). They step three times a second, like low-frame-rate animation, and sit still for reduced-motion users. The same tag is used on the hero page and the home table. Hero cards lift and glow on hover.
- **Three themes**: Hidden King (amber), Archmother (blue) and Night Shift (near-black teal and orange), switched from the top bar.
- **Win rate trend** on every hero page: chart with patch lines, green above 50% and red below, ALL / 4W / BY PATCH.
- **Live matches** (`/matches`): games in progress with running clocks, teams, net worth lead and match id. **Livestreams** (`/streams`): who is streaming Deadlock, with an optional in-page Twitch player.
- **Build planner** (`/planner`): twelve slots, cost, always-on stat totals, hero projection at the boon level your souls reach, shareable link, builds saved in the browser.
- **Compare heroes** (`/compare/haze/abrams`): base stats and weapon data from the game files at any boon level.
- **Hero stat panel** on every hero page, with a boon slider, plus each hero's own key art in the header.
- **Steam player pages** (`/player/:id`, find one at `/player`): a "player dossier" with the Steam avatar, rank medallion, record, last-20-games form pips, a heroes table, recent matches with rank change per game, rank history, and the players they queue with. Look people up by Steam name, SteamID64, account id, `[U:1:…]`, `STEAM_0:…` or a steamcommunity.com link. Recently viewed players are remembered in the browser.
- **Live Deadlock API data** (round 15): tier list, hero win / pick / ban rate and rank, matchups, lane synergy, win-rate history with patch lines, leaderboards, rank distribution, live matches and patch notes. The header chip shows Live / Sample / Offline and switches between them. Builds, skill order and guides are still labelled samples. See **API_GUIDE.md**.
- **Leaderboard** (`/leaderboard`): a top-five feature (a #1 banner and four cards) above the table, per region or per hero, with avatar, W/L and win rate. 100 per page, five pages. Sample ladder until live data is on.
- **Ranks** (`/ranks`): rank distribution chart across the 66 levels, with the current rank names and badge art from the Deadlock Wiki.
- **Match report** (`/match/:id?player=:accountId`): click any game on a player page. Souls-lead curve, highlights (damage, healing, souls, objectives), both teams with items, K/D/A, souls and damage, and a side panel for the selected player with their souls curve, final build, buy order and ability points. Handles Street Brawl, games with sparse data and unknown ids.
- Search finds items as well as heroes and players.

- Home, hero directory (36 heroes + Celeste), hero pages, player pages, 404.
- Hero-first search: heroes always rank above players; a pasted SteamID64 or account id opens a player page.
  Keyboard: `/` focuses search, arrows + Enter select, Escape closes.
- Hero page: Standard / Street Brawl, Ranked / Unranked, average-match-rank filter (kept in the URL), stats strip with
  sample-size label, build paths, skill priority tree, community builds, four matchup columns.
- Rail expands on hover or keyboard focus, and can be pinned open.
- Responsive down to phone width.

## Repository

- `api-samples/` is tracked on purpose: the unit tests and the Sample-mode match page read it. `npm run probe:api` refreshes it.
- Never commit `.env.local` (Twitch keys live there). `.env.example` is the template.
- `src/assets/` holds Valve's hero art, fonts, rank badges and item icons taken from a game install. Keep the repository **private**, or check Valve's asset policy (and move those files out of git) before making it public.
- `dist/` and `dist-standalone/` are build output and are not tracked. `npm run build:standalone` rebuilds the single-file `index.html`.

## Data: read this before launch

Broadway shows **live data from the Deadlock API by default**. `src/data/source.ts` defines the `DataSource` interface and three
implementations:

| Source | When | What it does |
|---|---|---|
| live (`createLiveSource`) | default | Calls the API and maps real responses (shapes verified 8 Oct 2026, tests in `liveMap.test.ts`). |
| fixture (`fixtureSource`) | header chip → Sample, or `VITE_DATA_SOURCE=fixture` | Invented, clearly labelled samples for design work and offline demos. |
| hybrid (`createHybridSource`) | wraps live | If a live call fails, that section falls back to its labelled sample and the chip says Offline. **Player pages are never faked**: a failed lookup shows an error. |

Builds, skill order, guides, damage breakdown and Street Brawl high rolls have no live mapping yet, so they stay on labelled samples.

`src/api/client.ts` is a typed client written from the Deadlock API OpenAPI spec (api.deadlock-api.com/openapi.json).
It caches identical queries for 6 hours (the server does the same), de-duplicates in-flight requests and retries once on 429.

### Before a public launch

1. **Put a small backend in front of the API.** Analytics endpoints share limits (200 req/min per IP, 400 per key,
   2000 global). One server with one API key and one cache serves everyone; browsers should not call the API directly,
   and never ship a key in the browser bundle.
2. **Rank mapping.** Tiers Initiate=1 ... Eternus=11 with sub-tiers 1-6 match the game's own strings and the spec maximum of 116. One check against `/v1/assets/ranks` is still worth it. Note the API filters on the average badge of BOTH teams,
   not each player's own rank, so keep the "Average match rank" label.
3. **Check Street Brawl and Ranked coverage** per endpoint with real calls.
4. **Credit and terms.** Keep the Deadlock API credit and the not-endorsed-by-Valve disclaimer. Ask the maintainers
   (Discord link is in the spec) about expected load and API keys.
5. **Art and fonts.** The Valve artwork, hero cards, rank badges and fonts in `src/assets/` were supplied as
   reference assets. Redistribution rights are not established. Keep them out of any public repository until settled.
6. **Item icons** are placeholder tiles; load them from the API's assets endpoints.

## Layout

```
src/
  api/        typed client, rank -> API filter mapping, matchup ranking (pure, tested)
  components/ Shell, SearchBox, Controls, WinTrend, BuildBoard, SkillTree, MatchupColumn, HeroFace, RankBadge
  data/       roster (portraits), fixtures, data sources (live / sample / hybrid), player + leaderboard + tier mapping, ability icons
  lib/        stats helpers, search, Steam ID parsing, URL filters
  pages/      Home, TierListPage, HeroDirectory, HeroPage, BuildsHub, PlannerPage, MatchesPage, StreamsPage, LeaderboardPage, RanksPage, PlayerLookup, PlayerPage, NotFound
  styles/     base (tokens), shell, pages, city (the flat-label "city never sleeps" skin), player (Steam pages, data chip, top-bar fit; loaded last)
server/       proxy.mjs (caching proxy + /streams), streams.mjs (Twitch lookup, tested)
  assets/     fonts, art, hero portraits, ability icons, rank badges
```

## Sample data

Invented and labelled as samples on the page whenever they appear: every build (items, numbers, authors, likes) and its code, skill order, guides, and the streams list. In Sample mode (or when the API is unreachable) the tier list, leaderboard ladder, rank distribution, win-rate trends and live matches are samples too.
Build codes start with `sample-` so they cannot be mistaken for real in-game build ids. Sample mode makes no network request.

## Next steps

1. Map builds: `hero-build-stats`, `build-item-stats`, `ability-order-stats` (responses are in `api-samples/`).
2. Run `npm run proxy` and set `VITE_API_BASE` before a public launch (shared cache, one API key).
3. Streams: add Twitch credentials to the proxy (`.env.example`).
4. Optional: Steam sign-in so a visitor lands on their own page (needs a server; today they paste an id, name or link).

See **API_GUIDE.md** for what is live, the verified facts about the API, and how the leaderboard resolves names to accounts.
