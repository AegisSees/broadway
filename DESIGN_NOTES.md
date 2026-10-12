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
- **Skyline** closing each page is now the pack's per-lane skyline (yellow for Hidden King, blue for Archmother, green for Night Shift), cropped to its silhouette half.
- **Small things**: the section-heading rule is the pack's dashed line, the footer rule is its scratched edge, empty and error states carry a neutral (bookmoth, ghoul).
- **Not used**: the Broker material, the hero cards in the pack (their file names do not match their pictures), the UI screenshots, the videos, the fonts (already in the app) and about a third of the artwork. They stay in the original zip.
- **Size**: the standalone preview got smaller despite the additions (28.6 MB, limit for upload is 30 MiB), because the two biggest PNGs in `src/assets/art/` (Celeste and Haze art, 3 MB together) were recompressed to WebP.
- Replaced: the 256px film-grain tile (`ui/grain.webp`) and the SVG paper noise.

## Round 19: pinned selection

- **No fill behind the plate.** Selected tabs and toggles had two older rules in `pages.css` painting a solid rectangle behind the new coloured plate: a cream fill on the build tabs (`.btabs`) and the accent colour on the `.seg` toggles. Both are removed; the plate is the only shape.
- **Every "pick one" control shares one plate**: segmented toggles, hero tab strip, build tabs, pills, the hero-directory filters, the Following toggle and the pager (`:is(...)` group in `city.css`). Unselected is a dark skewed plate, selected is the flat orange/blue label.
- **Pinned feeling**: like the tier tags, the selected plate rocks about its own centre in three held frames a second (`pin-rock`, about 1 degree either way, staggered phases so neighbours do not move in step) while the lettering stays still. The hard shadow sits on the button, so it follows the plate. With reduced motion the plate holds a half-degree tilt.
