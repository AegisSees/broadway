# Broadway ML

Offline machine learning for Broadway. Python pulls match data from the Deadlock API and trains small models; the site
loads the exported JSON and scores it in the browser (`web/score.ts`), so it stays a static site.

| # | Feature | Where it shows | Notebook | Export |
|---|---|---|---|---|
| 1 | Draft win predictor | match cards, live matches | `02_draft_win_predictor` | `linear@1` (logistic) |
| 2 | Live win probability | match report, curve over the game | `03_live_win_probability` | `linear@1` (logistic) |
| 3 | Build recommender (enemy lineup **and** enemy builds) | Builds page, "next item" | `04_build_recommender` | `table@1` now, `linear@1` later |
| 4 | Playstyle clusters | player pages | `05_playstyle_clusters` | `centroids@1` |
| 6 | Rank estimate | player pages (hidden or unranked) | `06_rank_estimate` | `linear@1` (identity) |

## Setup (on your PC)

```
cd ml
python -m venv .venv
.venv\Scripts\activate          # Windows;  source .venv/bin/activate on macOS / Linux
pip install -r requirements.txt
pytest -q                       # 10 tests, no network needed
```

## Pull data

```
python -m broadway_ml.pull probe                     # checks the endpoints and saves their shapes to data/probe/
python -m broadway_ml.pull matches --days 14         # bulk match metadata -> data/tables/*.parquet
python -m broadway_ml.pull crawl --players 500       # fallback if `matches` fails: leaderboard -> histories -> matches
python -m broadway_ml.pull histories --players 3000  # match histories for clusters and rank estimate
```

- Calls are spaced 2 s apart by default (`--interval`), every 429 is retried after its `Retry-After`, and every
  response is cached in `data/cache/`, so a stopped pull resumes for free. Analytics endpoints allow 200 requests per
  minute per IP (API_GUIDE.md); check https://api.deadlock-api.com/docs for the match endpoint's limit before speeding up.
- **Run `probe` first.** The bulk parameters (`include_player_items`, `min_match_id`, ...) have not been checked
  against a live response yet. If `probe` shows an error or no items/stats, fix `BULK_PARAMS` in `pull.py` or use `crawl`.
- `data/` is git-ignored. Only Normal-mode, scored, 12-player games are kept.

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

`broadway_ml.export` writes models of a few KB each to `models/`. JSON, not ONNX, because the standalone build must stay
under 30 MiB (it is about 28.7 MB) and onnxruntime-web alone is several MB. `web/score.ts` scores every format
(`scoreLinear`, `nearestCentroid`, `draftFeatures`, `indexToBadge`), and `export.score_linear` is its Python twin used
in the tests. Nothing under `ml/` is imported by the site yet; wiring a model in means copying its JSON into `src/` and
calling `score.ts` from the page.
