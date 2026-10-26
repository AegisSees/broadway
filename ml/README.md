# Broadway ML

Offline machine learning for Broadway. Python pulls match data from the Deadlock API and trains small models; the site
loads the exported JSON and scores it in the browser (`web/score.ts`), so it stays a static site.

| # | Feature | Where it shows | Model (`broadway_ml/models/`) | Export |
|---|---|---|---|---|
| 1 | Draft win predictor | match cards, live matches | `draft.py`: logistic on heroes + teammate and matchup pairs, tuned C, optional Platt | `draft_win.json` (linear@1) |
| 2 | Live win probability | match report, curve over the game | `live.py`: logistic on team gaps and gap x minute | `live_win.json` (linear@1) |
| 3 | Build recommender (enemy lineup **and** enemy builds) | Builds page, "next item" | `builds.py`: logistic with item x (my hero, enemy heroes, enemy spend, enemy items) terms | `build_recommender.json` (table@1) |
| 3b | "Top players buy" (what the top 1-10% buy next in this spot) | Builds page, next to "best win rate" | `top_items.py`: multinomial logistic over items, trained on the smallest top bracket with enough purchases | `top_player_items.json` (table@1, + owned items) |
| 5 | Hero matchups as top players play them | hero pages, draft helper | `matchups.py`: pair win-rate deltas, top bracket shrunk toward all ranks | `matchups.json` (table@1) |
| 4 | Playstyle clusters | player pages | `playstyle.py`: k-means, k by silhouette and stability, auto names | `playstyle.json` (centroids@1) |
| 6 | Rank estimate | player pages (hidden or unranked) | `rank.py`: ridge (boosted trees as a ceiling check) | `rank_estimate.json` (linear@1) |

Notebooks `01`-`06` run these models and show the evidence (comparison tables, reliability and AUC-by-minute plots).

## Setup (on your PC)

```
cd ml
python -m venv .venv
.venv\Scripts\activate          # Windows;  source .venv/bin/activate on macOS / Linux
pip install -r requirements.txt
pytest -q                       # 16 tests, no network needed
```

## Pull data

```
python -m broadway_ml.pull probe                     # checks the endpoints and saves their shapes to data/probe/
python -m broadway_ml.pull matches --days 14         # bulk match metadata -> data/tables/*.parquet
python -m broadway_ml.pull matches --top-up          # weekly: only matches newer than the newest saved, then retrain
python -m broadway_ml.pull crawl --players 500       # fallback if `matches` fails: leaderboard -> histories -> matches
python -m broadway_ml.pull histories --players 3000  # match histories for clusters and rank estimate
```

- Calls are spaced 2 s apart by default (`--interval`), every 429 is retried after its `Retry-After`, and every
  response is cached in `data/cache/`, so a stopped pull resumes for free. Analytics endpoints allow 200 requests per
  minute per IP (API_GUIDE.md); check https://api.deadlock-api.com/docs for the match endpoint's limit before speeding up.
- **Run `probe` first.** The bulk parameters (`include_player_items`, `min_match_id`, ...) have not been checked
  against a live response yet. If `probe` shows an error or no items/stats, fix `BULK_PARAMS` in `pull.py` or use `crawl`.
- `data/` is git-ignored. Only Normal-mode, scored, 12-player games are kept.

## Train

```
python -m broadway_ml.train            # all seven; or e.g. `python -m broadway_ml.train draft live`
```

Writes the model JSON files and `models/report.md` (every model against its baselines, calibration tables, AUC by
minute, cluster table, the build recommender's pairwise check). A model whose data is missing is skipped.

## Tables

`broadway_ml.flatten.load_tables("data/tables")` returns:

- `matches`: match_id, start_time (unix), duration_s, winning_team (0 Hidden King, 1 Archmother), average_badge
- `players`: one row per player: team, hero_id, K/D/A, net worth, last hits, `win`, `badge`, `fs_*` final stats
- `items`: one row per purchase: item_id, game_time_s, sold_time_s, `is_shop` (false for ability points)
- `stats`: snapshots every 180 s: net worth, level, K/D/A

`item_catalog()` joins the site's `src/data/itemIds.json` and `itemInfo.json` for item category, tier and cost.

## Rules the notebooks follow

- **Split by time** for match models (train on older games, test on the newest) and **by account** for player models.
- **No leakage:** no duration or final stats in the draft or live model, no snapshot taken in the last second, no badge
  in the rank model's inputs, only items bought *before* a purchase count as "own items".
- **Always beat a baseline** (base rate, hero win rates, net worth lead, median rank) and report AUC, log loss, Brier
  score and calibration error with a reliability plot. The site shows percentages to people, so calibration matters.
- **Patches move the meta.** Train the draft and build models on the current patch, and retrain after big ones.

## Export and the site

`broadway_ml.export` writes models to `models/`: about 1-10 KB each, except the build recommender (up to about 200 KB; raise its `prune` if the bundle needs room) and the top-player item model (about 650 KB; `max_bytes` in top_items.py, and the report's size sweep shows what a smaller file costs). JSON, not ONNX, because the standalone build must stay
under 30 MiB (it is about 28.7 MB) and onnxruntime-web alone is several MB. `web/score.ts` scores every format
(`scoreLinear`, `draftFeatures`, `liveFeatures`, `recommendItems`, `bestInto`, `nearestCentroid`, `indexToBadge`).
`web/golden.json` pins the Python feature layouts and `web/score.test.ts` checks the TypeScript side against it. The site reads the models straight from `models/` (`src/ml/models.ts` loads each one on first use) and
`src/ml/predict.ts` turns pages' records into inputs, so retraining and rebuilding is all it takes to update the site.
Where each one shows: win chance on match pages and draft odds on match cards (draft, live), `/draft` (draft, matchups),
the planner's Next buy panel (builds, top_items), hero pages (matchups), player pages (playstyle, rank).
