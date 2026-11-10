# Broadway

Ranked Deadlock hero stats, builds, matchups, player pages and a leaderboard, dressed in the 1940s occult New York
look of the game's City Never Sleeps update. Live data comes from the community [Deadlock API](https://deadlock-api.com),
and a small set of machine-learning models (`ml/`) adds win chances, draft odds and build suggestions.

Designed and built by **Alp Kiziltas** ([@AegisSees](https://github.com/AegisSees)).

> Broadway is an unofficial fan project. It is not affiliated with or endorsed by Valve. Deadlock, its heroes, art,
> fonts and other game assets are trademarks and copyright of Valve Corporation and are used here for fan purposes only.

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
- **Tier list** (`/tiers`): tier labels are flat rectangular plates with black lettering, like the orange labels on the official site (S+ amber, S orange, A green, B blue, C grey, D red). The plate rocks about its centre three times a second, like low-frame-rate animation, while the lettering stays still; it sits still for reduced-motion users. The same tag is used on the hero page and the home table. Hero cards lift and glow on hover.
- **Selected controls**: every toggle, tab, pill and filter shows its selected state as a flat coloured plate (no fill behind it), pinned like the tier tags: the plate rocks about its centre three times a second while the lettering stays still (static for reduced-motion users).
- **Hero dossiers**: every hero page opens with the hero's own title on the orange label ("The unseen threat", "The hard-boiled detective", "Champion of the Bear Pit"), the game's one-line role, and a dossier card with a short biography paraphrased from the in-game hero lore (`data/heroLore.ts`).
- **Hero pages**: four headline plates under the banner (health, base gun DPS, complexity, win rate, with each hero's rank among the released roster). The six City Never Sleeps heroes also get a lore card, a few questions and a row of pinned photo prints; Violet, Solomon and Deadman Danny now carry their released stats and ability names.
- **Three themes**: City Never Sleeps (the default: near-black teal and orange, like the official update page), Hidden King (amber) and Archmother (blue), switched from the top bar. All three sit on the official page's grain texture, with its film dust mixed in, a district photo at the top of each page, lane plates and titles on Home, amber and blue plates for the two sides on match pages, and the lane skyline closing every page (round 18, see DESIGN_NOTES).
- **Win rate trend** on every hero page: chart with patch lines, green above 50% and red below, ALL / 4W / BY PATCH.
- **Live matches** (`/matches`): games in progress with running clocks, teams, net worth lead and match id. **Livestreams** (`/streams`): who is streaming Deadlock, with an optional in-page Twitch player.
- **Build planner** (`/planner`): twelve slots, cost, always-on stat totals, hero projection at the boon level your souls reach, shareable link, builds saved in the browser.
- **Compare heroes** (`/compare/haze/abrams`): base stats and weapon data from the game files at any boon level.
- **Hero stat panel** on every hero page, with a boon slider, plus each hero's own key art in the header.
- **Steam player pages** (`/player/:id`, find one at `/player`): a case-file header (pinned Steam photo, rank label, current streak), a rank column (rank and record, trajectory over the last twelve ranked games, performance averages, form, recent heroes, teammates), match history as cards that open in place (scoreboard, the player's numbers ranked against the lobby, build and ability path), a heroes table and rank history. Look people up by Steam name, SteamID64, account id, `[U:1:…]`, `STEAM_0:…` or a steamcommunity.com link. Recently viewed players are remembered in the browser.
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

- `api-samples/` is tracked on purpose: the unit tests read these saved real responses. The site never does. `npm run probe:api` refreshes it.
- Never commit `.env.local` (Twitch keys live there). `.env.example` is the template.
- `src/assets/` holds Valve's hero art, fonts, rank badges, item icons and the City Never Sleeps page assets (`src/assets/city/`, `ui/grain-detail.webp`, `ui/film-dust.webp`), taken from a game install and the official update page. They remain Valve's property (see the note at the top).
- `dist/` and `dist-standalone/` are build output and are not tracked. `npm run build:standalone` rebuilds the single-file `index.html`.

## Data: read this before launch

Every number Broadway shows comes from the Deadlock API. There is no sample mode and no fallback data: when a
call fails, the page shows an error or an empty state, and the header chip reads "API offline".

`src/data/source.ts` defines the `DataSource` interface and its one implementation, `createLiveSource`, which calls the
API and maps real responses (shapes verified 8 Oct 2026, tests in `liveMap.test.ts`). `withHealth` wraps it so the header
knows when the API stops answering.

`src/noMockData.test.ts` fails the test run if any shipped file imports a saved API response, a test helper, a fixture
or a fake-data generator.

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
5. **Art and fonts.** The Valve artwork, hero cards, rank badges and fonts in `src/assets/` come from the game and the
   official update page. They are Valve's; credit them and remove anything Valve asks to be taken down.
6. **Item icons** are placeholder tiles; load them from the API's assets endpoints.

## Layout

```
src/
  api/        typed client, rank -> API filter mapping, matchup ranking (pure, tested)
  components/ Shell, SearchBox, Controls, WinTrend, BuildBoard, SkillTree, MatchupColumn, HeroFace, RankBadge
  data/       roster (portraits), the live data source, player + leaderboard + tier mapping, ability icons
  lib/        stats helpers, search, Steam ID parsing, URL filters
  pages/      Home, TierListPage, HeroDirectory, HeroPage, BuildsHub, PlannerPage, MatchesPage, StreamsPage, LeaderboardPage, RanksPage, PlayerLookup, PlayerPage, NotFound
  styles/     base (tokens), shell, pages, city (the flat-label "city never sleeps" skin), player (Steam pages, data chip, top-bar fit; loaded last)
server/       proxy.mjs (caching proxy + /streams), streams.mjs (Twitch lookup, tested)
  assets/     fonts, art, hero portraits, ability icons, rank badges
```

## Next steps

1. Map builds: `hero-build-stats`, `build-item-stats`, `ability-order-stats` (responses are in `api-samples/`).
2. Run `npm run proxy` and set `VITE_API_BASE` before a public launch (shared cache, one API key).
3. Streams: add Twitch credentials to the proxy (`.env.example`).
4. Optional: Steam sign-in so a visitor lands on their own page (needs a server; today they paste an id, name or link).

See **API_GUIDE.md** for what is live, the verified facts about the API, and how the leaderboard resolves names to accounts.

## Deploying (Vercel)

`vercel.json` holds everything Vercel needs: it runs `npm run build`, serves `dist/`, sends every page route to
`index.html` (the site uses normal browser routing) and caches the hashed files under `/assets` for a year.

1. Push the repo to GitHub (or fork it).
2. On vercel.com, *Add New → Project*, import that repository, keep the detected settings and deploy.
3. Leave `VITE_DATA_SOURCE` unset so visitors land on live Deadlock API data. Set `VITE_API_BASE` / `VITE_STREAMS_BASE`
   only if you also host `server/proxy.mjs` somewhere (see `.env.example`).
