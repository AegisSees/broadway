# BROADWAY design notes

## Themes
- **Hidden King** (default): dark orange / amber and ember on near-black. Uses the York (amber) lane art.
- **Archmother**: blue / white on deep night-blue. Uses the Broadway (blue) lane art.
- Both stay dark; only borders, text, lighting and accents change. Toggle is top right; the choice is saved in localStorage (`broadway-theme-v2`).
- All colours are CSS tokens in `src/styles/base.css`. Add a theme by adding one `:root[data-theme='...']` block and an entry in `src/lib/theme.ts`.

## Tier tags
Replaced the winged-diamond badges in round 17 (see below); `TierBadge.tsx` is gone but lives in git history (commit `de21e95` and earlier) if it is ever wanted back.
- Tier colours are fixed, not themed, so a tier reads the same in both themes.
- Tier source: sample data supplies it. If the data source gives none, `tierFromWinRate` (src/lib/stats.ts) bands win rate as a rough guide only.

## Lanes
York = yellow/amber lane, Broadway = blue lane (what the site is based on), Greenwich = green lane. Art in `src/assets/lanes`.

## Deadlock's visual language (from the official City Never Sleeps page and in-game UI)
- Scenes are near-black with big soft glows and light cones, so backgrounds are gradients, never flat. See `body::after` and `--halo-*` tokens in `base.css`.
- Faction halls: Hidden King = amber hall, Archmother = blue hall (`src/assets/halls`). Home hero uses them; hero pages use the lane art.
- Photos sit in cream mats like taped prints (`.lane-card`); section labels are orange plates (`.kicker`).
- Lane accent colours from the official page: York yellow `#ffe14d`, Broadway blue `#60cde3`, Greenwich green `#97da79`; cream text `#f7e9d5`. The official site uses Oracle, Pulp and Jost fonts.
- Item cards: saturated category header (weapon orange, vitality green, spirit purple) with soul cost, halftone dither on a tinted body, stat rows, a Passive/Active bar, an "Upgrades from" footer. See `.itc` and `src/components/itemText.tsx`.
- Not done yet: the official site's torn-edge item cards, hex lane icons, dotted connector lines, and the Pulp display face (we use Reaver).


## City Never Sleeps pass
- Fonts (from the user's Game Fonts zip): Valve Pulp Bold for headings, Valve Oracle for UI labels, tags, buttons and item cards; Radiance for body text; Reaver only inside the tier badges. Rights to the game fonts must be confirmed before a public launch.
- Hero tag blocks (`HeroTags`, data in `src/data/heroTags.json`, from each hero's wiki page): lavender tilted tiles that straighten with an underline on hover. Nurse Harrow, Lady Geist and Victor have no tags on the wiki yet, so no blocks show.
- Spotlight (`Spotlight.tsx`) rotates through every hero with a wordmark image, pauses on hover/focus, and honours reduced motion.
- Item cards (`ItemCard.tsx`, data in `src/data/itemCards.json`) follow the in-game shop card. Stat rows show 0 > value (nothing owned yet). Values are the wiki's default variant at fetch time; verify against the Deadlock API before launch.
- Torn black tape section strips and cream paper buttons follow the official City Never Sleeps site.
- Tag and spotlight colours come from `src/data/heroColors.ts`: built-in values sampled from each hero's art (Vyper and Celeste set by hand from in-game screenshots), replaced at runtime by `colors.ui` from the Deadlock assets API when the browser can reach it. That fetch could not be tested from the build sandbox, so confirm the field name against the live response.
- Tags do not underline on hover; they only straighten. Underlines are kept for a future style where tags link somewhere.
- Victor, Lady Geist and Nurse Harrow have no tag row on the wiki (Victor's page only has the tagline "You Can't Kill Me"). `HeroTags.tsx` carries PROVISIONAL tags written from their wiki role text; replace them in `heroTags.json` with the real in-game tags.
- Stats row: tier badge (60px) and rank badge (68px) are sized so the first row is no taller than the second. Home hero no longer clips overflow so the search dropdown sits over the page below it.

## Round 4
- Label plates (`Kicker.tsx`) take a random tilt each time they mount and nudge a little when the theme changes.
- Spotlight renders sit over a blurred copy of themselves with feathered edges, so every hero fits whole.
- S+ and S badges redrawn as Eternus-style angel wings (arm line with rows of rounded feathers, upright folded-wing crest). Not final: the user will say whether to keep or revert.
- New: Items page (`/items`, every item as the in-game card, filters), Abilities breakdown on hero pages, hero colours and tags on the directory cards.

## Round 5
- Tooltips (`Tip.tsx`) measure themselves and clamp to the viewport; ability tooltips prefer to open below the icon, and scroll internally if taller than the room.
- Rank icons removed from the Win rate stat. S tier reverted to the earlier fan wings; S+ keeps the angel-wing design.
- Ability cards (`AbilityCard.tsx`, data in `abilityCards.json`) follow the in-game layout: chips, keyword-highlighted description, spirit/weapon tiles, ◈1/◈2/◈5 upgrades. Also used inline in the hero page Abilities section.
- Item cards restyled to the shop layout (flat tinted header, before ▸ after rows, Passive/Active bar, tiles, Upgrades from / Builds into). Fewer dots; palette per category.
- New: About & methodology page (`/about`), directory trait filters, "Builds into" on item cards.
- Verify before launch: Drifter bleed numbers, Sticky Bomb base damage, Mo & Krill Sand Blast T2, Infernus Afterburn T2, Wraith Card Trick T3, Grey Talon Guided Owl channel, Sprint Boots -> Veil Walker. Victor, Lady Geist, Nurse Harrow tags are placeholders.

## Round 6
- Stats row: label pinned to the top of every cell, value centered, sample note absolutely placed, so all values line up.
- Hero page "Trends & damage" (`TrendsPanel.tsx`): 7-day win rate and pick rate lines (hover a day) and a damage-source breakdown (abilities, items, melee, other) with hover cards. Data: `trends` / `damage` on `HeroOverview`.
- Street Brawl high rolls (`HighRolls.tsx`): per item tier, most picked / best win rate, "High roll" mark on the best win rate with a real sample. Brawl mode on a hero page now shows High rolls + Trends + Abilities instead of builds/matchups.
- Tier list page `/tiers` (`TierListPage.tsx`, `sampleTiers.ts`): S+ to D rows, sortable table view, mode/queue/rank filters. Sample list is generated and deterministic; Haze agrees with the Haze page.
- All new numbers are ILLUSTRATIVE. Real version needs: per-day hero stats, per-ability/item damage from match data, and Street Brawl item-tier pick/win stats from the API.

## Round 7
- Stats row: equal-width columns (`--n` set from the item count); Street Brawl now shows Ban rate (bans exist in Street Brawl).
- High rolls: each tier keeps a fixed height and scrolls (custom dashed-track scrollbar, fade at the bottom). Added a Base / Enhanced toggle (Enhanced numbers are generated sample values) and a Legendary (Tier V) panel with the 17 Street Brawl legendaries. Tiers are labelled with the draft rounds that can offer them (wiki rules: R1 T1-3, R2 T2-3, R3 T2-4, R4 T3-4, R5 T4, legendary chance in R4-5).
- Legendary items added to `itemInfo.json` / `itemCards.json` as tier 5 (no soul cost, "Legendary / Street Brawl" header); they have no icons yet, so a lettered tile is used. Items page has a Legendary filter.
- Draft planner: best and most taken item per draft round.
- Tier list: tiers are cut from a Broadway score (80% win rate, 20% pick rate, z-scored); table has a Score column; ban column always present.
- Favourites: follow button on hero pages, directory and tier list filters, "Your heroes" strip on home (localStorage only).
- Real source still needed for: Enhanced stats per item, Legendary pick/win rates, bans in Street Brawl, per-round draft data.

## Round 8
- Item cards follow the newer in-game format: plain "+18 Spirit Power" rows (first row bold, rest dim), no before/after values, key stat tiles tinted by what they measure with secondary numbers as plain rows under them, and separate "Upgrades from" / "Upgrades to" sections. Optional teal usage line ("Picked in X% of ...") is used in Street Brawl high rolls.
- Items page is laid out like the in-game shop: Weapon / Spirit / Vitality columns, a row per price, icon tiles, hover to preview the card in a sticky side panel, click to pin (a bottom sheet on narrow screens). Legendary row at the bottom of each column.
- Hero portrait on hero pages lifts and tilts on hover; heroes with gloat art (Haze) crossfade to it (`src/data/heroGloat.ts`).
- Known gap: the item data predates the newest patch (e.g. Ballistic Enchantment is missing). Sync from the API/game files before launch.

## Round 9 — in-game cursors
- Cursors come from Deadlock install `game/citadel/resource/cursors` (arrow, shop hand, ping). Hotspots per cursor.res. Resized to 30/38px with @2x variants in `src/assets/ui/cursors`, applied via `--cur-arrow/--cur-hand/--cur-ping` in base.css. Valve art: confirm rights before public launch.

## Round 9b — data and art from the game files
- Item data (`itemInfo.json`, `itemCards.json`) is now generated from the installed game: `scripts/abilities.vdata_c` for tier, slot, parts, stat values and removed flags; `citadel_gc_mod_names` and `citadel_mods` localization for names and descriptions. 172 items (was 131); 42 added (Ballistic Enchantment, Cheat Death, etc.), Majestic Leap removed. Costs follow the game's price-per-tier table (800/1600/3200/6400; legendary 0). Item icons are the game's shop art at 128px.
- Hero tags come from `citadel_heroes` localization (real tags for Victor, Lady Geist, Nurse Harrow, Solomon). The provisional tag lists are gone.
- Ability text was spot-checked against `abilities.vdata_c` for Haze and matches; Solomon, Violet, Nurse Harrow and Deadman Danny have no signature abilities in the shipped client, so they stay "unpublished".
- Hero portrait hover now uses each hero's gloat card from the game for 40 heroes.
- Not yet used: enhanced-item values (`m_CorruptedItemInfo`), per-upgrade ability tiers, hero base stats (`m_mapStartingStats`).
- Valve art/data: confirm rights before public launch.

## Round 9c: game-accurate shop, cards and icons
- Item icons: YCoCg-DXT5 textures decoded correctly (no more faded/blocky icons); 172 icons from the game files.
- Baba, Rat King and Venator now use the official hero card art and small icons; unreleased heroes (Solomon, Violet, Nurse Harrow, Deadman Danny) use the vertical art.
- Shop rebuilt to match the in-game look: rounded tinted tiles, cream icon panel, IMBUE strip, 4 per row, alphabetical, price headers. Card opens beside the tile on hover; click pins it.
- Item card: game-marked key properties become the bordered tile box, remaining properties are plain two-column rows, notes in italics, stat tiles use the game's own stat glyphs (src/assets/stat), costs formatted with thousands separators.
- Hero directory: "New" badge moved left so it no longer covers the follow star.
- Limitation: the in-game shop stylesheet was not readable, so tile styling is recreated from screenshots.


## Round 10: overhaul with game assets
- Ranks (superseded in round 12): an earlier pass used the names found in the local game files. Round 12 follows the Deadlock Wiki's Ranked Mode page instead.
- Hero data from the game files (`src/data/heroStats.json`, generated from heroes.vdata and abilities.vdata): health, regen, speeds, melee, per-boon scaling, weapon damage, rate of fire, magazine, reload, falloff, complexity, role. Boon souls come from each hero's level table.
- Hero pages: hero select-screen painting (`src/assets/hero-bg`) behind the dossier, and a Base stats & scaling panel with a boon slider.
- New pages: `/compare`, `/builds` (planner), `/ranks`. Nav and home page link to them.
- Planner maths (`src/lib/buildStats.ts`): sums always-on stats only; resists stack as chained reductions; projections use the boon level the build's souls reach. Conditional effects are not counted and the page says so.
- Search includes items (opens the shop card). Fixed the home page search list hiding under the hero section (topbar z-index).
- Theme toggle now uses the two patrons' masks. Item cards use the game's stat glyphs.
- API: `server/proxy.mjs` (caching proxy), `scripts/probe-api.mjs`, `.env.example`, `API_GUIDE.md`.
- Not extracted yet: hero weapon renders (43 files across 14 archive chunks), minimap and objective art, shop catalog art.


## Round 11

- Ranks page replaced by **Leaderboard**: two views (Top players, By hero), region select, top 100 shown first, more revealed on scroll up to 500,
  find-in-list box, ladder reference folded into a `<details>`. `/ranks` redirects. Fixture mode generates an invented, deterministic ladder and says so.
- Hero page: base stats moved out of the top into their own **Base stats** tab and section after Trends.
- Compare: boon slider removed (stats at spawn only); added a Head to head panel fed by `hero-counter-stats` in live mode.
- Planner: the plain cost split became **Souls invested** with the 11 investment steps (800 to 28,800) and the bonus per category. The step values come
  from the Deadlock Wiki's ItemInvestmentData table, not from the game files, and feed the hero projection. Re-check after balance patches.
- Rank badge art: unchanged this round. Two generations of badge files exist in the game archive; the older flat `rankNN_lg` / `rankNN_chalk` set was
  not used. If the in-game badges differ from the site, the device link is needed to compare the two.


## Round 12

- **Ranks follow the Deadlock Wiki's Ranked Mode page**: Initiate, Seeker, Acolyte, Sentinel, Mystic, Ritualist, Emissary, Oracle, Phantom, Ascendant, Eternus (Obscurus unranked), six levels each as Roman numerals I to VI, no stars. The game files on the dev machine still carried the older names (Alchemist, Arcanist, Archon), so the names and art here come from the wiki, not the install.
- New badge art is the animal plaques from the wiki (`src/assets/rank/rankN.webp`, trimmed and resized). Initiate, Acolyte and Obscurus are drawn stand-ins (`PLACEHOLDER_TIERS` in `ranks.ts`) until the real files are added; they exist in the game archive as `rank01_lg_psd`, `rank03_lg_psd` and `rank00_lg_psd`.
- **Leaderboard**: 100 rows per page, five pages, pager at the bottom (`?page=`), no inner scrolling. Rows: rank, Steam avatar, name, rank badge, W/L, win rate (percent above a bar with a 50% tick), most played. Hero picker is a searchable alphabetical dropdown beside the region select. In live mode avatars and records are fetched for the 100 rows on screen (`playerExtras`); both endpoints are unverified.
- **Rank distribution** (`/ranks`) replaces the ladder `<details>`: ink-and-brass bar chart of the 66 levels, crests and tape labels per rank, median flag, "find your rank", tier cards. Sample data until the API is connected; live mode counts games, not players.
- Planner: the 4.8K investment step is called out on every track, with its jump (weapon +18% to +46%) and souls to go.
- Fixed the expanded side rail painting under the top bar.


## Round 13: "the city never sleeps"

Reference: deadlocklabs.gg. What was taken, and what was deliberately not.

- **Taken**: paint-textured panels, rough orange tape on the active control, skewed pills for filters and tabs, two-tone page titles (orange lead, grey tail), small dotted eyebrows, torn-paper tiles with black label tapes, a win rate chart with dashed patch lines and a value flag, a #1 banner plus four cards for the top five, a builds hub with In-game / Community / Pro tabs, builds shown by game phase.
- **Not taken**: their colour pairings. Contrast stays high: the paint texture is 5 to 6% opaque and never sits behind small text, tape text is dark on orange or light on black, and the green and red in the chart are the same tokens the rest of the site uses for good and bad.
- `src/styles/city.css` is a skin over the existing components and loads last. The textures (`src/assets/ui/paint*.webp`, `streak*.webp`, `tape-edge.webp`) were generated here from periodic noise, not copied from anyone.
- **Chart** (`WinTrend`): ALL shows every day with patch lines, 4W the last 28 days, BY PATCH one matches-weighted point per patch. Hover or touch for the day. The 50% line is always drawn, the axis always includes it, and the curve is green above and red below.
- **Builds**: four lenses per hero. Item rows show purchase order, "in x/y builds", average buy time and win rate; the skill order and a copyable code sit with them. The old planner moved to `/planner`; old `/builds?i=...` links redirect there.
- **Top builds on every hero page, not only Haze.** The hero page no longer hides everything when a hero has no overview: the trend, builds, base stats and abilities show, and a short note says which headline numbers are missing.
- Tabs on the hero page scroll to their section with `scrollIntoView` instead of changing the URL hash, because the standalone file uses hash routing and a bare `#builds` would have been read as a route.
- Top bar: Heroes, Tier list, Builds, Items, Leaderboard, Matches, Streams, then a More menu (Compare, Planner, Rank distribution, About). The side rail lists everything.
- **Illustrative data** is used throughout (see README). Streams in sample mode never link out and never load an embed.


## Round 14: flat labels, no camo, the official page, a third theme

Feedback: the active buttons looked wavy and torn, and the paint backgrounds read as hard camouflage. Reference: playdeadlock.com/cityneversleeps.

- **What the official page actually does**: flat shapes, hard offset shadows (`3px 3px 0` at ~25% black), straight-edged tilted label plates, photos in cream frames, tan torn-paper notes, and only a fine grain. No brush, no paint, no wavy edges. The palette: cream `#F7E9D5`, tan `#D4BBA4`, label orange `#DD6638` with ink `#121D22`, cyan `#60CDE3`, green `#97DA79`, yellow `#FFE14D`, panel teal `#1A3237`, page `#070707`.
- **Active controls** (`.seg`, `.btabs`, `.tabs`, `.pill`): a flat orange plate (`--label`) with dark text, a hard shadow and a 1° tilt, like the HAUNTS tag. The shape sits on `::before` so `filter: drop-shadow` can draw the hard shadow (a `clip-path` on the element itself would cut a `box-shadow` off). Inactive ones are a plain skewed bar. Kickers and tape labels use the same flat plate.
- **Backgrounds**: the paint and streak textures are deleted. Panels now carry a very fine periodic grain (`ui/grain.webp`, generated here, alpha well under 4%) under their content, a flat 5px hard shadow and a 6px radius. The page itself gets the official night-city art, tinted per theme and faded out at the bottom (`html::after`, `ui/city-night.webp`), and a skyline silhouette (`ui/skyline.webp`) rises behind the footer.
- **Official assets used** (Valve's art, taken from the City Never Sleeps page): the torn-paper note for "Latest patch" (`ui/note.webp`), the night-city backdrop and the skyline. Credit them if the site goes public; the site is unofficial.
- **Night Shift** (`data-theme="night-shift"`): a third theme, near-black with teal panels, cream text, orange labels and cyan links. The toggle is now a three-way radiogroup (arrow keys move between options) and the circle-reveal transition starts from the clicked option. `broadway-theme-v2` still stores the choice; unknown values fall back to Hidden King.
- **Item icons**: all 173 icons were re-pulled from the Deadlock wiki (160x160). The old icons were the same art with a different crop; the swap also brings in **Majestic Leap**, which was missing (Vitality, tier 3, 3,200 souls, 45s cooldown).
- Not done: Initiate / Acolyte / Obscurus badge art is still drawn stand-ins; `.lane-card` shadows are still soft.


## Round 15: live API data and the Steam player page

Request: check the install for newer assets, start pulling API data, and add a Steam player page that fits the theme.

- **Assets check**: nothing newer than the 7 Oct pull. The 8 Oct patch (client 6766) only changed two Baba weapon-offset fields; Baba, Celeste and Rat King are already in the roster.
- **Data layer**: a live source, a sample source and a hybrid that falls back per section (never for players). The header chip (`.data-chip`) shows Live / Sample / Offline and flips the mode (stored in `broadway-data-v1`, page reloads so nothing is half loaded). Pages that show a sample say so in a `.notice`.
- **Player dossier** (`/player/:id`, styles in `player.css`, classes `pl-*`): the same panel and tape-label language as the rest of the city, with the player's most-played hero art behind the header, a rank medallion, hard-shadow stat tiles, **last 20** as skewed W/L pips, a heroes table with win-rate bars, match rows tinted green or red with the rank change per game, and a "plays with" column. **Rank history** (`RankHistory.tsx`) draws the rank held going into each ranked game on a ladder of rank bands, stepped rather than sloped because rank only changes between games; it always shows at least two bands. Steam avatars fall back to a plain block if the image cannot load (`Avatar.tsx`).
- **Find a player** (`/player`): name, SteamID64, account id, `[U:1:…]`, `STEAM_0:…` or profile link. Recent lookups stay in the browser; the top search also offers "Find a player" and a pasted id jumps straight to the page.
- **Leaderboard**: avatars, ranks and W/L come from the API for the rows on screen. A leaderboard name can belong to thousands of accounts, so only names with 12 or fewer candidates are resolved (prefer 30+ games in 30 days, then the highest rank); the player page shows the other accounts. Others open a name search.
- **Fixed on the way**: the top bar overflowed at 1440px once the Players link and data chip were added (now compacts at 1640 / 1360 / 1180 / 1120px and the search box can shrink); the three-column matchups stack on small screens; the tools card art no longer pushes the page wider; one aborted request no longer cancels a shared in-flight request for other components.
- Not done: builds, skill order, guides, damage and high rolls are still samples; Streams stay sample without the proxy; Initiate / Acolyte / Obscurus badge art is still drawn stand-ins; `.lane-card` shadows are still soft.


## Round 16: a look for every hero (hero styles removed again in round 17; the match page, click-through, trend fix and card hover stayed)

Request: a friend's idea. Make each page match the hero it is about (including a player's page, which takes the hero they play) so Holliday's grain and ticket stubs stay Holliday's and everyone else gets a look of their own; make the hero cards visibly react on hover; let a player's games open the whole match.

- **Skin engine** (`src/skin/`). A skin is one data record (`heroSkins.ts`, 44 of them): mode, three or four seed colours, a typeface, and a pick from small vocabularies: frame (33), texture (29), label shape, bar style, rule, tile, ambient effect (15), card hover (25) and a few page titles in the hero's own words. `deriveTokens()` turns the seeds into the site's whole token set and pushes every text colour through a WCAG check (`ensure`, `readableOn`); `auditSkin()` exposes the pairs and `skins.test.ts` fails the build if any skin drops below its minimum (this caught seven real misses: label and tag text on light or mid-tone accents).
- **How it is applied.** `SkinScope` renders a `.skin` wrapper that sets the tokens inline and the choices as `data-*` attributes, plus the fixed wallpaper (`.skin-wall`: hero art, texture, vignette, effect). Structural CSS lives in `skins.css`, `skin-frames.css`, `skin-parts.css`, `skin-tex.css`, `skin-fx.css`, `skin-fonts.css`; the textures and effects are generated by `scripts/gen-skin-tex.mjs` and `gen-skin-fx.mjs`. Holliday is `inherit: true`, which makes the wrapper `display:contents`, so the old grainy page is untouched. Two skins are light (Celeste, Paige).
- **Each look comes from the hero's key art and the lore the game ships.** Examples: Abrams is a case file (manila folder frames, blinds, rain); Dynamo a chalkboard; Celeste pink stripes with confetti and a "Now appearing" label; Paige parchment with ruled lines and drifting dust; Mina a wedding-red drip frame; Viscous jelly panels with bubbles. Page titles are only light re-labelling ("Case file", "Evidence locker"); no story is invented. Heroes that are not released yet (Deadman Danny, Nurse Harrow, Solomon, Violet) get quieter skins from their key art only, with a note saying so.
- **Where it shows.** Hero pages (`HeroPage`), player pages (`PlayerPage`: skin of the most-played hero, **Page style** picker to try one of their other most-played heroes or the plain site theme) and the match report (the whole page takes the skin of the selected player's hero; skins are not nested because the descendant selectors would fight). The **Hero style** switch (`broadway-skin-v1` in localStorage) turns it all off. Hero directory and tier list use the per-hero hover and tile accents.
- **Card hover.** Directory and tier-list cards react clearly on hover, and each hero has its own motion (`hero-cards.css`, 25 variants such as tilt, stomp, swoop and sway; reduced-motion users get a plain lift). Checked in the browser that every card (44 of 44 in the directory, 40 of 40 in the tier list) changes its transform when hovered.
- **Match report** (`MatchPage.tsx`, `data/matchDetail.ts`, `match.css`). Built from `/v1/matches/metadata`. Souls lead is drawn from the 180-second samples plus the final one; items come from the shop log (held = never sold); abilities are the purchases without an upgrade id. Street Brawl shows the round score instead of the lead curve; missing fields render nothing rather than zeros.
- **Fixed: the trend's last point.** The newest day is usually still being played, so its handful of games gave a win rate like 37.6% and dragged the line off a cliff. `dropPartialLastDay` leaves out a last day with under 60% of the median games of the days before it (needs at least 4 days).
- **Fonts.** 43 display faces, Latin subsets, from Fontsource (40 SIL OFL 1.1, 3 Apache 2.0: Ultra, Permanent Marker, Special Elite). Licences and copyright lines in `src/assets/fonts/hero/LICENSES.md`, credit on the About page. About 1 MB in all; the browser fetches only the face a page uses.
- **Honest limits.** Lane colours on the match page assume `assigned_lane` 1 / 4 / 6 = York / Broadway / Greenwich (about 80% sure). In Sample mode every match id shows the one saved real game, with generated player names. Fixed-position wallpaper shows black below the first screen in full-page screenshots; it is a capture artifact, the live page is fine.
- Not done: builds, skill order and guides are still samples; the four unreleased heroes' skins will want a second pass once their kits are published.

## Round 17: back to one look, and tier tags

Feedback: the per-hero styles did not work well and undermined Deadlock (the hero name lettering from the game was replaced by plain text), so go back to the previous look and fix from there. Suggested tier labels in the style of an amber S+ ticket.

- **Removed**: the whole skin engine (`src/skin/`), its six stylesheets, the 43 per-hero typefaces and their licence file, the two generator scripts, the Hero style switch, the player page's Page style picker, the fixed wallpaper and the per-hero card motions. Hero pages show the game's own name lettering again, and section titles are the plain ones.
- **Checked against the previous build**: the same 11 pages (home, heroes, tier list, four hero pages, player, leaderboard, builds, ranks) rendered from the previous standalone file and from this build with the same mock API and compared pixel by pixel. Page heights match exactly; the hero directory and tier list are identical; the other differences are the orange kicker label's random tilt, the random home-page spotlight hero, and the new arrow on player game rows.
- **Kept**: the match page (`/match/:id`) and clicking a game on the player page, the trend's partial-day fix, and visible card hover. The hover is now one motion for every hero (lift, glow in the hero's colour, portrait push-in) in `hero-cards.css`; reduced motion gets a small lift.
- **Tier tags** (`TierTag.tsx`, `tier-tags.css`): matched to the orange labels on the official site (the "new", "You", "updated" and red "always a catch" tags). A flat, squarish rectangle in the tier colour with solid black lettering in Valve Oracle (the same face the site's labels use) and the hard offset shadow. Sizes `lg` (tier list captions), `md` (hero page stats) and `sm` (tables). S+ is amber (#fbbf24); S orange, A green, B blue, C grey, D red.
- **Motion**: only the plate moves (a `::before` layer), the lettering stays put. The plate rocks about its centre, like a paper label pinned in the middle, between about -1.4 and +1.1 degrees with no sideways drift. Exactly three frames a second (`steps(1)` over a one-second cycle with three held keyframes). Phases are staggered per tier and per table row so the tags do not all change on the same beat. `prefers-reduced-motion` turns it off and leaves a fixed half-degree tilt.
- **Everywhere**: the same tag is used on the tier list (rows and table), the hero page stats cell and the home page "On the marquee" table. The winged emblem was removed from all three.
- Earlier tries that were rejected: a strongly slanted plate (too tilted), white lettering with a dark outline (not like the site's labels), and moving the whole tag including its letter and drifting it about (only the plate should move, about its centre).
- `broadway-skin-v1` may still sit in a browser's localStorage from round 16; nothing reads it now.

## Round 18: the City Never Sleeps asset pack

Alp supplied the pack extracted from the official update page (`deadlock_city_assets.zip`: backgrounds, artwork, SVG plates, fonts, videos, with `asset_sources.json` mapping each file to its Valve CDN URL) and asked for the page backgrounds to use the page's normal grain, with the lane grain mixed in somewhere.

- **Normal grain** (`backgrounds/grain.jpg`): a dark mottled paint surface, only about 3 levels of contrast, so it cannot be shown raw on tinted themes. `src/assets/ui/grain-detail.webp` is its luminance stretched around mid-grey (x6) and made seamless (edge cross-fade), and it is blended into each theme's own colour: `overlay` on the page background (`body::after` in `base.css`), `soft-light` inside `.panel` and, through `textures.css`, on the plain-colour surfaces (tier rows, hero cards, ability rows, the rail). All three themes therefore share one surface.
- **Lane grain** (`backgrounds/lane_grain.jpg`): film dust and scratches on black. `film-dust.webp` is that with the long vertical scratch and the scanner-edge brightening removed (it would have repeated as a visible line), made seamless. It is `screen`-blended at low strength in three places: a fixed layer over the whole page (`body::before`, opacity `--dust`), inside every panel background, and over the night-city art at the top of the page.
- **Page pictures**: the district photos in the pack hang, tinted by the theme and faded out downward, at the top of each page (`lib/pageArt.ts` maps route to picture, `Shell` writes `html[data-art]`, `city-assets.css` maps that to the file): Times Square for Heroes, Stock Exchange for the tier list, Factory for Builds/Items/Planner, Theater for the leaderboard, Chinatown for live matches, Seaport for a match, Uptown for ranks and a player, Campus for player search and Compare, Fairfax Plaza for Streams, Central Park for About, the pack's new city header for Home. Hero pages keep their own lane art.
- **Plates**: the pack's yellow, green and blue plate SVGs are the card bodies of the three lanes on Home (with the real YORK / BROADWAY / GREENWICH title art, the lane maps and the lane-coloured kicker plates as "Lane 1/2/3" tags) and the backgrounds of the two sides on match pages: Hidden King on yellow, Archmother on blue, on both the live-match cards and the match report score. The SVGs were given `preserveAspectRatio="none"` so they stretch to any box (otherwise a background SVG letterboxes).
- **Skyline** closing each page is now the pack's per-lane skyline (yellow for Hidden King, blue for Archmother, green for Night Shift, now called City Never Sleeps), cropped to its silhouette half.
- **Small things**: the section-heading rule is the pack's dashed line, the footer rule is its scratched edge, empty and error states carry a neutral (bookmoth, ghoul).
- **Not used**: the Broker material, the hero cards in the pack (their file names do not match their pictures), the UI screenshots, the videos, the fonts (already in the app) and about a third of the artwork. They stay in the original zip.
- **Size**: the standalone preview got smaller despite the additions (28.6 MB, limit for upload is 30 MiB), because the two biggest PNGs in `src/assets/art/` (Celeste and Haze art, 3 MB together) were recompressed to WebP.
- Replaced: the 256px film-grain tile (`ui/grain.webp`) and the SVG paper noise.

## Round 19: pinned selection

- **No fill behind the plate.** Selected tabs and toggles had two older rules in `pages.css` painting a solid rectangle behind the new coloured plate: a cream fill on the build tabs (`.btabs`) and the accent colour on the `.seg` toggles. Both are removed; the plate is the only shape.
- **Every "pick one" control shares one plate**: segmented toggles, hero tab strip, build tabs, pills, the hero-directory filters, the Following toggle and the pager (`:is(...)` group in `city.css`). Unselected is a dark skewed plate, selected is the flat orange/blue label.
- **Pinned feeling**: like the tier tags, the selected plate rocks about its own centre in three held frames a second (`pin-rock`, about 1 degree either way, staggered phases so neighbours do not move in step) while the lettering stays still. The hard shadow sits on the button, so it follows the plate. With reduced motion the plate holds a half-degree tilt.

## Round 20: Violet and the new-hero layout

- **Violet is out** (Oct 16, 2026), as are Solomon (Oct 9) and Deadman Danny (Oct 13). Their entries in `heroStats.json` and `abilityInfo.json` were still pre-release placeholders (780 health, complexity 3, no abilities). They now carry the released base stats, weapon (name, damage, rate, magazine, reload) and the four ability names, read from Deadlock Labs' hero pages. `scaling: false` marks them: boon scaling and falloff are not in those pages, so the level slider and the "per boon" lines are hidden rather than showing placeholders. Every rank computed here (health #39, regen #6, move #18, sprint #5, stamina #5, light melee #9, heavy melee #5, all of 43) matched Violet's reference page, which is a good check that the roster-wide numbers agree.
- **Unlock times come from the clock.** `data/newHeroes.ts` lists the six City Never Sleeps heroes with their unlock instants (Tuesdays and Fridays, 2 PM Pacific). A hero stops being `unreleased` by herself when her time passes, so Nurse Harrow flips on Oct 20 with no change. Until then her plates show dashes instead of placeholder numbers.
- **Headline plates** (`StatPlates`): health on the orange plate, base gun DPS on black, complexity as diamonds, win rate on white, each with its rank among the 43 released heroes, as on the official site. Only the plates rock (the `pin-rock` frames), the figures stay still.
- **Newcomer sections** at the foot of each City Never Sleeps hero's page: a paraphrased lore card (where the biography is published), five questions answered from the page's own data, and **The six newcomers**, a row of pinned photo prints with the black "Unlocked" label, a padlock for the hero still to come and an orange "Meet the hero" label on hover (or "You are here" for the current hero). The directory flags a newcomer as New for two weeks.
- **Abilities without icons or descriptions** show their names with a placeholder icon and a "Details soon" chip instead of "Passive", so an unknown is never shown as a fact.
- Sample tier list: jitter can no longer put a hero above the one ranked before her now that the list is longer.

## Round 21: hand-placed tilts, hero dossiers, City Never Sleeps by default

- **Every plate leans its own way.** Before, all pinned labels shared one angle sequence (`pin-rock`) and only their start time differed, so they visibly leaned together. The reference site places each label by hand. `styles/tilt.css` now gives each plate a number (`--tn`) and derives from it a direction (+/-), a resting angle of 1.3 to 3 degrees, three held wobble frames around it, a cycle length between about 0.86 and 1.14 s, and a phase. The number comes from the button's place in its group plus the group's place on the page (so "Standard" and "Ranked" no longer match), the tier and table row for tier labels, and the plate's slot plus a per-hero seed for the headline plates (`lib/tilt.ts`, `tiltSeed`). Hero trait tags flip direction and size per hero (`tagScale`). Reduced motion keeps each plate's own resting angle and drops the wobble. CSS trig (`sin()`) does the derivation, so there is no table of angles to maintain.
- **Prints**: the six newcomer prints each have their own rest angle and their own "Unlocked" label angle and position, and on hover they straighten in three stepped frames (about 10 fps), as in the reference video.
- **Dossiers for every hero** (`data/heroLore.ts`). The game's own localization (`citadel_heroes_english.txt`) has a biography (`hero_*_lore`) and a one-line role (`hero_*_role`) for every hero up to Baba and Rat King. Each hero now has a title on the orange label drawn from that biography (Haze keeps "The unseen threat"), the role line under the name, and a dossier card ("Who is Abrams?") with a 2-3 sentence paraphrase and a pinned print of the hero. Exceptions: Lash's in-game biography is one joke line, so his card also uses his voice lines (Bear Pit champion, Bebop rivalry) via the wiki; Solomon, Deadman Danny and Violet are not in the uploaded files, so theirs are paraphrased from their in-game introductions; Nurse Harrow has no published biography, so her card says so and quotes only her poster ("Be Not Afraid") and intro lines. The home spotlight uses the same titles.
- **City Never Sleeps is the default theme** (formerly "Night Shift", id now `city`), first in the toggle. The storage key moved to `broadway-theme-v3` so everyone starts on it once.

## Round 22: the tilt fix that actually shows, and the player profile as a case file

- **Why plates still leaned together.** The plate outline (`--plate`) is cut on a slant that rises to the right by about 4 degrees. Round 21 rotated each plate by 1.3 to 3 degrees either way, which never overcomes the cut, so every plate still read as "up to the right". Now about half the plates are mirrored (`--sx`, a `scaleX(-1)` on the plate layer only, so the lettering is untouched) and lean down to the right; the extra turn is smaller (0.5 to 1.5 degrees). The headline plates alternate along the row (health one way, gun DPS the other, win rate back) and the whole row flips for about half the heroes. Tier labels have no slanted cut, so they turn further instead of mirroring (a mirrored corner shadow would point the wrong way). Static labels get three more cuts (`--plate-b`, `-c`, `-d`), and section titles rest at an angle taken from their text (`headTilt`).
- **Player profile** (`PlayerPage`, `PlayerMatchCard`, `styles/profile.css`), reworked after the structure of the big stats sites but not copied:
  - Header: the Steam picture pinned on a torn black slab with a strip of tape, the name large, the rank on an orange label, account number, last game, and Copy Steam ID / Steam profile / Share / Refresh. The current streak sits on its own plate (green for wins, red for losses; a quiet plate with the last result when there is no streak).
  - Section tabs (Matches, Heroes, Rank, Teammates), and a left column: Rank and record, Trajectory (the rank going into each of the last twelve ranked games, with the result under it, and whether the player is climbing, holding or slipping), Performance (all-time averages, recent souls and CS, and the win rate circled in pen), Playing lately, Plays with.
  - Match history as cards: portrait with a Victory/Defeat label, time and queue, MVP place and rank change, the K / D / A in colour, CS per minute and souls, the final items and the twelve players. The game file is read when a card comes near the screen (first eight cards) or is opened. An opened card has three tabs: Scoreboard (both teams with items), Your numbers (eight numbers, each ranked against the lobby, "Best in lobby" where it is), and Build (final items with buy times and the ability path as a grid). A hero filter joins the queue filter.
  - Sample mode serves one saved game for every match; `placeSelf` puts the page owner into it so the card reads right. Live games are never changed.
  - Shared bits from the match page (`ItemIcon`, `MvpTag`) moved to `components/MatchBits.tsx`.

## Round 23: level labels, hero moods, pop-out portraits

- **Selected tabs and pills are level by default** (`--plate-level`, an almost square cut, with only a hair of wobble), like the Street Brawl label Alp pointed to. When something new is picked, `lib/plateLean.ts` rolls a lean for that button: level half the time, slanted up or down a quarter each (`data-lean`, which swaps in `--plate` or `--plate-b`). The headline plates and tier labels keep their own angles.
- **Hero moods on match cards** (`data/heroMoods.ts`): a loss shows the hero's critical (low-health) card, a win the normal card, a win in the game's top three the gloat card. Gloat cards ship with the site; critical cards are not in the game-file snapshot, so they load from the Deadlock API asset bucket (addresses saved in `heroMoods.json` from the API's hero list, refreshed from the live list for newer heroes). If one does not load, the normal card is shown washed red. The Victory label now also says MVP or #2 / #3.
- **Pop-out on hover**: the portrait frame lifts and tilts in three held frames, and the hero leans out over the top of the frame (clipped at the sides and bottom only), as on the reference site's cards.
- The critical cards are in the game too (`*_card_critical_psd` in pak01 chunks 005, 077, 083, 227, 271, 280, 283, 288, 292, 302 and 316); with those chunks uploaded they can be bundled locally like the gloat cards.

## Round 24: player header without the slab

- The torn black slab behind the name is gone, so the hero behind the header shows. The name sits in a marquee instead: a straight dashed border in the colour of the hero in the background, the dashes running clockwise round it like theatre-sign bulbs (`.ph-marquee`; still under reduced motion).
- The rank moved to the right side, where the "Last game" plate was: just the medallion and the rank name below it, as on the older design. The streak or last result is now a small chip next to the account number.
- Copy Steam ID has its own line; Steam profile, Share and Refresh sit under it.
- The portrait pop-out on match cards now runs in eight quick held frames instead of three: smoother, with a touch of stop-motion left.

## Round 25: make it pop

Feedback: the site should "pop more" before it goes public. Kept inside the City Never Sleeps look and the plate rules; everything is in `styles/pop.css`, loaded after every sheet except `tilt.css`, so no plate angle changed.

- **Light.** Stronger glows behind the page and a clearer district picture at the top, in all three themes; brighter panel lines and muted text for contrast.
- **Titles.** The grey tail of the two-tone page titles is cream now, both halves sit on a hard printed offset with a soft glow in the accent colour, and they are a little bigger. The home headline and section titles get the same offset.
- **Poster shadows.** Panels, hero cards, tier rows, lane cards and the home spotlight carry a hard black offset shadow, like the official page's pasted-up cards. The spotlight sits in a `.spot-hold` wrapper because its torn-edge `clip-path` would cut a shadow on itself.
- **Hero cards.** The portrait sits on a glow in the hero's own colour, the top stripe is thicker, and hover adds a hard shadow plus a ring and glow in the hero's colour.
- **Top bar.** BROADWAY is stamped in cream over an orange and a black offset; the current page gets an orange plate under its link; the rail marks the current page with an orange edge.
- **Tables and tier rows.** Tier rows are lit faintly in their tier colour with a tier-coloured left edge; table rows light up under the pointer.
- **Pop-in.** Cards, panels and tier rows arrive in three held frames (scale and rise, slight overshoot) when a page opens, staggered by position. It uses the individual `scale`/`translate` properties and `animation-fill-mode: backwards`, so it never fights the hover transforms. Off under reduced motion.
- **Deploy.** `vercel.json` added (SPA rewrites, long cache on hashed assets) and a Deploying section in the README. Live data was already the default unless `VITE_DATA_SOURCE=fixture`.
- Checked: tsc, 159 tests, all three themes, 390 px (no sideways scroll on six pages), reduced motion, standalone build (28.7 MB) opened and four routes rendered with no errors.

## Round 26: steadier stat plates, and the meta right now

Feedback: the headline stat plates moved too much, and the corners of the number hung outside the plate. Look at Deadlock Labs for a few design cues.

- **Stat plates** (`tilt.css`). The steep `--plate` cut sliced off the corners behind the figure, and the turn plus wobble made it worse. They now use a gentle cut of their own (a few percent of slope), rest within about half a degree, wobble by about a fifth of a degree, sit 2-4 px larger than the text box and have a little more padding. The cut still mirrors along the row, so they do not all lean the same way. This settles the old to-do about whether the stat plates should go level: nearly level.
- **The meta right now** (`components/MetaNow.tsx`, home, under the header). Taken structurally from Deadlock Labs' "meta right now" highlight cards, drawn in Broadway's style: four cards lit in the hero's colour with the hero's art, a tape label and one big number. Patch leader (best win rate among heroes with at least 35% of the median sample), Most picked, Sleeper pick (best win rate in the less-picked half), and Climbing (biggest weekly win-rate gain) or Most banned when there is no weekly change. No hero appears twice. Every number comes from the tier list, labelled sample or live. Tests in `MetaNow.test.ts`.
- **Title pattern**: "The meta *right now*", cream with the second half in the accent colour, as on the reference site's section titles.
- Checked: tsc, 163 tests, 390 px (no sideways scroll on six pages), reduced motion, standalone build opened with no errors.

## Round 27: Deadlock Labs cues from Alp's screen recording

Alp sent a recording of Deadlock Labs (home, the Violet page, the City Never Sleeps update page, the item shop). Taken from it, in Broadway's own drawing:

- **The meta right now as solid colour cards.** Orange, blue, cream and gold printed cards (the same in every theme). The hero's gloat bust (`assets/gloat`) rises out over the top edge, clipped at the sides and bottom only; a black tape label, one big black number, the name on a black tag and one line saying why. Under the row: how many heroes are at 52% or better and how many hero games were counted, both straight from the tier list.
- **New-hero banner** (`NewHeroStrip.tsx`) over the home header: the newest City Never Sleeps hero with her card and name lettering, "Meet the hero", and the next unlock date. Driven by `newHeroes.ts`, so it moves on by itself on Oct 20.
- **Explore tiles in coloured frames** (green, red, teal, purple, gold) instead of cream, like the reference site's mode cards.
- **Calmer surface:** the film dust over the page is down from 0.5 to 0.32.
- Not taken (for now): the fanned card stack in the home header, the in-game-style item shop, the ballot and release schedule.
- Checked: tsc, 163 tests, 390 px on six pages, reduced motion, standalone build opened with no errors.

## Round 28: paper that reads, Violet first, fewer sections

- **Torn-paper notes** (patch notes on Home, the hero dossier). The paper art is drawn at a slant and stretched to each note, so the writing sat level on a slanted sheet. `lib/paperTilt.ts` works out the slant of the paper's top edge at the note's actual size and the writing is turned to match (`--pt`), so lines run parallel to the paper. The ink is now fixed dark brown in every theme (the paper is tan in every theme), and the small print and the source line, which were nearly invisible, are dark enough to read.
- **The six newcomers** row at the foot of the new heroes' pages is removed (`Newcomers.tsx` deleted). Its now unused `.pols` styles remain in `vitals.css`/`tilt.css`.
- **Home:** the new-hero banner from Round 27 is gone. Instead the spotlight opens on the newest City Never Sleeps hero that is out (Violet now, Nurse Harrow from Oct 20), holds her for 9 seconds, then rotates through everyone every 5.5 s in a shuffled order. The progress bar under the card shows the longer first hold.
- **Tools of the trade** are printed colour cards (red, cream, purple) with black name tags, matching the meta cards.
- The official City Never Sleeps page renders with script, so its layout could not be read from here; the colour cards and paper fixes follow Alp's screenshots and the asset pack from Round 18.
- Checked: tsc, 165 tests, 390 px on six pages, reduced motion, standalone build opened with no errors.

## Round 29: placeholder bug

- **Fixed:** the "All ranks" row in the rank menu showed a huge empty oval. Round 22's player header used the class `.ph`, which is also the site-wide class for an empty placeholder (rank menu, avatars without a picture, skill-tree numbers, leaderboard and match rows). Every placeholder took the header's 250 px height and padding. The header is now `.phead`; placeholders are back to their own sizes.

## Round 30: All ranks star, the spotlight as a deck

- **Rank menu:** "All ranks" shows a plain brass star, without the dashed ring the rank placeholders use (`.all-star`).
- **Spotlight deck** (`Spotlight.tsx`, `pop.css`). Alp wanted one big card rather than Deadlock Labs' three-card fan, but with a feeling of cards rotating. The big card is now more square, and the next two heroes wait behind it as cream-framed prints with their name lettering, fanned up and to the right (about 4.5 and 9 degrees). When the spotlight moves on, the new front card is dealt off the pile (from the first back card's angle, in four held frames) and the pile shuffles forward. Clicking a back card jumps to that hero. Under reduced motion the deck is still. On phones the fan is smaller.
- Checked: tsc, 165 tests, 390 px, standalone build opened with no errors.

## Round 31: the front card is a card

- The torn-edge spotlight panel is retired. The front of the deck is a cream-framed print like the cards behind it (8 px frame, hard shadow). Under the pointer (or keyboard focus inside it) it lifts off the pile, turns about 1.4 degrees, grows 3% and casts a glow in the hero's colour, in three held frames; the art pushes in a little. Reduced motion: no lift.
- The old hard drop shadow on the whole deck was removed so the cards' own shadows are the only ones.

## Round 32: smooth motion, whole-card deck, scroll reveal

Alp found the stepped motion read as a low frame rate, and that the spotlight photo moved separately from its card. The reference is his own personal page, where everything glides.
- **Smooth easing everywhere I added motion.** Every `steps(n)` hover and pop-in in `pop.css` now uses one eased curve, `cubic-bezier(.2,.8,.2,1)`, with a small overshoot (`cubic-bezier(.2,.9,.25,1.12)`) for things that land. The original label-plate wobble from earlier rounds is left as it was.
- **The deck moves as whole cards.** The art fills the frame and is part of the card, never animated on its own. Moving on throws the old front card off to the left with its caption on it (`.spot-gone`, `deck-throw`); going back tucks it under the pile instead. The new front card is dealt from where the first back card sat (`deal-in`), and the back cards are keyed by hero so they slide forward rather than redraw. Animations use the separate `translate`/`rotate`/`scale` properties so they never fight the hover lift.
- **Scroll reveal** (`lib/reveal.ts`, called from `Shell`). Panels, cards, tiles and section titles wait slightly below and turned, then rise into place with the overshoot as they scroll into view; what is on the first screen arrives in a short stagger. A MutationObserver picks up content that loads later. Nothing is hidden under reduced motion or without script. `main` clips horizontal overflow so a turned card waiting below the fold can't widen the page on phones.
- **Frame rate.** The film-dust layer used `mix-blend-mode: screen` over the whole page, and the spotlight wrapper had a `drop-shadow` filter; both forced full repaints every frame. The dust is now white specks on transparency (`film-dust-alpha.webp`, 119 KB) at normal blending, the filter is gone, moving cards get `will-change: transform`, and the art backdrop blur dropped to 18 px. Idle frame time on Home went from about 34 ms to 16.7 ms (60 fps) in headless Chromium.
- Checked: tsc, 165 tests, three themes, 390 px on six pages, reduced motion, standalone build (28.9 MB) opened with no errors.

## Round 33: no title plate on the spotlight, the flick goes up and right

- **No lore title plate on the spotlight card.** Alp felt the orange title above each hero's name ("The Rising Artist" and so on) covered the art. The card keeps the hero's own name lettering and tags; only the title plate is gone. (A first pass removed the whole caption; Alp wanted the lettering and tags kept, so they are back.)
- **The flick goes up and to the right.** In a full-size window the deck sits on the right, so Round 32's throw to the left crossed the headline, the search and the buttons. The leaving card now flicks up and off the right side (a fast start that eases out, 15 degrees, fading after the first third). `.spot-hold` clips anything above its own top edge, so the card never passes over the search or the top bar, and `.hero` already clips sideways so it can't widen the page. Checked at 390, 1100, 1440, 1920 and 2560 px.
- Checked: tsc, 165 tests, 390 px on six pages, reduced motion (no flick), Archmother theme, standalone build opened with no errors.

## Round 34: a sharp card under the pointer

- Alp saw the spotlight card go blurry on hover. Two causes: the card had its own compositor layer (`will-change: transform`, added in Round 32 for frame rate), which the browser draws once at normal size and then stretches when the hover scales and turns it; and the hover zoomed the card 3% and the art another 4%, while the hero renders are only about 540 px wide, so any zoom enlarges a small picture.
- The hover now lifts the card and turns it about 1.4 degrees with the coloured glow, but does not zoom. Only the back cards and the leaving card keep their own layers, since they never grow under the pointer. The meta, tool and directory cards lost theirs too, so their hovers redraw sharp.
- Frame time is unchanged: 16.7 to 17 ms idle and while scrolling (60 fps).
- Checked: tsc, 165 tests, standalone build opened with no errors.

## Round 35: hero page numbers and builds as printed cards

Alp asked to keep going with the UI. Home now speaks in solid colour printed cards; the inner pages were still dark glass panels. The hero page goes first.
- **One set of numbers.** The second stat row repeated the win rate that already leads the stat plates. It now shows tier, overall rank, pick rate, ban rate and matches only, each on its own solid card (tier on black, then orange, blue, cream, gold) with the label on a black tape and a hard shadow, like the meta cards on Home. Level at rest, a small lift under the pointer. Three across under 1000 px, two on phones with the last card spanning the row.
- **Build phases** (Laning, Mid game, Late game, everywhere `BuildPhases` is used) are cream printed cards with dark ink; each phase is named on its own coloured tape (orange, blue, gold), which also colours its bars. Win-rate green and red are darkened to read on cream.
- Checked: tsc, 165 tests, 390 px on six pages, City and Archmother themes, Hidden King on the stat cards.

## Round 36: tier list and hero directory as prints

- **Tier list, tier-maker style.** Each tier's label column is a solid block of the tier colour, with the tier letter on a black plate lettered in that colour. Heroes are cream-framed prints (104 px, up from 86) with the name on a black tape and the win and pick rates in dark ink; a strip in the hero's colour runs along the bottom of each portrait. On phones the label becomes a coloured band over the row and the cards sit four across.
- **The bust pops out.** Under the pointer the card lifts and turns a degree, the portrait dims, and the hero's gloat bust rises out of the top of the frame with the small overshoot (the meta cards on Home do the same). No zoom, so nothing goes soft. Reduced motion: the bust appears without moving and the lift is small.
- **Hero directory** cards take the same cream print, black name tape and bust pop-out, so the two pages read as one set.
- Checked: tsc, 165 tests, 390 px on six pages, all three themes.

## Round 37: the leaderboard podium

- **Number one** keeps its big hero card and gains a 6 px gold frame (drawn above the hero art, so the art never covers it) and a gold numeral.
- **Two to five** are solid printed cards instead of dark panels with a hero backdrop: silver for second, bronze for third, cream for fourth and fifth, all with dark ink, a black number tape and the hard shadow. They sit level and lift a little under the pointer. Records and win rates use the darker green and red that read on light card stock.
- Checked: tsc, 165 tests, 390 px on six pages, City and Hidden King themes.

## Round 38: build cards as prints

- Every card on the builds page is a cream print. Its top is a band in the hero's colour (a soft gradient of the hero colour), with the hero's gloat bust rising out of it past the top edge and the name on a black tape; the source and Eternus labels sit on black and orange tapes above the name. The bust rises a few pixels more under the pointer while the card lifts.
- Items come straight after the title, then the numbers and tags. The one-line description was the same sentence on most cards, so it now opens with the item paths instead of sitting on every card.
- Opened builds use the cream phase cards from Round 35; the skill order heading is dark ink so it reads on cream.
- Checked: tsc, 165 tests, 390 px on six pages, reduced motion, no element left hidden by the scroll reveal on five pages.
