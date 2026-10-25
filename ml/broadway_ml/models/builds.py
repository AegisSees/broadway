"""3. Build recommender: which next item gives the best win chance, given my hero, the minute, the enemy heroes and
what the enemy team has bought so far.

One logistic model over every tier 2+ purchase: win ~ context + item terms. Context (net worth gap, minute) soaks up
"rich players buy big items and also win". The item terms are what the site ranks candidates by:

    i_<item>               the item's general value
    it_<item>              value change as the game goes on (x minute / 30)
    ih_<item>_<hero>       fit with my hero
    ie_<item>_<ehero>      value against each enemy hero
    is_<item>_<cat>        value against the enemy's spend share in weapon / vitality / spirit items
    iv_<item>_<eitem>      value against each common enemy item (per enemy copy held)

Context terms cancel when comparing items in one moment, so only item terms are exported (table@1), and
scoreItem() in ml/web/score.ts adds up the terms that apply. This is observational data, so the scores mean "players
who bought this here won more than comparable players", not a guarantee; the pairwise check below measures whether
that signal holds on unseen games.
"""
from __future__ import annotations

from collections import Counter

import numpy as np
import pandas as pd
from scipy import sparse

from .. import evaluate as ev
from .. import export as ex
from .. import features as fe
from ..flatten import item_catalog
from .common import fit_logistic, inner_split, tune_logistic

CATS = ("weapon", "vitality", "spirit")
# Strong regularisation always wins on this many sparse terms (C=0.01 on the first real pull), and each fit on a
# million purchases takes minutes, so the grid skips the weak end.
BUILD_C_GRID = (0.003, 0.01, 0.03, 0.1)


def build_matrix(evts: pd.DataFrame, items: list[int], enemy_items: list[int]):
    ix = {v: i for i, v in enumerate(items)}
    evx = set(enemy_items)
    names: dict[str, int] = {}
    rows, cols, vals = [], [], []

    def put(r, name, v):
        if v:
            rows.append(r)
            cols.append(names.setdefault(name, len(names)))
            vals.append(v)

    spend = evts[[f"enemy_{c}_spend" for c in CATS]].to_numpy()
    tot = spend.sum(1, keepdims=True)
    shares = np.divide(spend, tot, out=np.zeros_like(spend), where=tot > 0)
    for r, ev_ in enumerate(evts.itertuples(index=False)):
        m = ev_.t / 60.0 / 30.0
        nw = ev_.nw_diff / 1000.0
        put(r, "ctx_nw_k", nw)
        put(r, "ctx_min", m)
        put(r, "ctx_nw_x_min", nw * m)
        it = int(ev_.item_id)
        if it not in ix:
            continue
        put(r, f"i_{it}", 1.0)
        put(r, f"it_{it}", m)
        put(r, f"ih_{it}_{int(ev_.hero_id)}", 1.0)
        for e in ev_.enemy_heroes:
            put(r, f"ie_{it}_{int(e)}", 1.0)
        for c, s in zip(CATS, shares[r]):
            put(r, f"is_{it}_{c}", float(s))
        for e, n in Counter(int(x) for x in ev_.enemy_items).items():
            if e in evx:
                put(r, f"iv_{it}_{e}", float(n))
    X = sparse.csr_matrix((vals, (rows, cols)), shape=(len(evts), len(names)))
    return X, sorted(names, key=names.get)


def item_part(X, feats, coef) -> np.ndarray:
    """The item-dependent part of the logit for each row (what the site ranks by)."""
    mask = np.array([not f.startswith("ctx_") for f in feats])
    return np.asarray(X[:, mask] @ coef[mask]).ravel()


def pairwise_check(evts: pd.DataFrame, score: np.ndarray, n_pairs: int = 20000, seed: int = 0) -> dict:
    """Among held-out purchases by the same hero in the same 5-minute window, with different items and different
    results: how often does the winner's item score higher? 0.5 = no signal."""
    rng = np.random.default_rng(seed)
    d = evts.assign(score=score, bucket=(evts["t"] // 300).astype(int))
    hits = total = 0
    for _, g in d.groupby(["hero_id", "bucket"]):
        w, l = g[g.win == 1], g[g.win == 0]
        if w.empty or l.empty:
            continue
        k = min(len(w) * len(l), max(1, n_pairs // 200))
        wi, li = rng.integers(0, len(w), k), rng.integers(0, len(l), k)
        diff_item = w["item_id"].to_numpy()[wi] != l["item_id"].to_numpy()[li]
        sw, sl = w["score"].to_numpy()[wi][diff_item], l["score"].to_numpy()[li][diff_item]
        hits += float((sw > sl).sum() + 0.5 * (sw == sl).sum())
        total += int(diff_item.sum())
    return {"pairs": total, "winner_item_ranked_higher": hits / total if total else float("nan")}


def export_rows(feats, coef, items, prune: float = 0.01) -> dict:
    rows: dict[str, dict] = {str(i): {"b": 0.0, "t": 0.0, "h": {}, "e": {}, "s": [0.0, 0.0, 0.0], "v": {}} for i in items}
    for f, w in zip(feats, coef):
        if f.startswith("ctx_"):
            continue
        parts = f.split("_")
        kind, it = parts[0], parts[1]
        r = rows[it]
        w = round(float(w), 3)
        if kind == "i":
            r["b"] = w
        elif kind == "it":
            r["t"] = w
        elif abs(w) >= prune:
            if kind == "ih":
                r["h"][parts[2]] = w
            elif kind == "ie":
                r["e"][parts[2]] = w
            elif kind == "is":
                r["s"][CATS.index(parts[2])] = w
            elif kind == "iv":
                r["v"][parts[2]] = w
    return rows


def train(tables: dict, out_dir, test_frac: float = 0.2, min_item_events: int = 200, n_enemy_items: int = 40,
          max_matches: int | None = 20000) -> dict:
    cat = item_catalog()
    m = tables["matches"].sort_values("start_time")
    if max_matches and len(m) > max_matches:
        m = m.tail(max_matches)  # the newest games: the current patch matters most for builds
    keep = set(m["match_id"])
    sub = {k: v[v["match_id"].isin(keep)] for k, v in tables.items() if k != "matches"}
    evts = fe.purchase_events(m, sub["players"], sub["items"], sub["stats"], cat, min_tier=2)
    start = evts["match_id"].map(m.set_index("match_id")["start_time"]).to_numpy()
    tr, te = ev.time_split(start, test_frac)

    counts = evts.loc[tr, "item_id"].value_counts()
    items = [int(i) for i in counts[counts >= min_item_events].index]
    enemy_counts = Counter(int(x) for lst in evts.loc[tr, "enemy_items"] for x in lst)
    enemy_items = [i for i, _ in enemy_counts.most_common(n_enemy_items)]
    X, feats = build_matrix(evts, items, enemy_items)
    y = evts["win"].to_numpy()
    Xtr, ytr = X[tr], y[tr]
    fit_m, val_m = inner_split(start[tr])

    ctx = np.array([f.startswith("ctx_") for f in feats])
    one_hot = np.array([f.startswith(("ctx_", "i_")) for f in feats])
    results, models = {}, {}
    for label, mask in (("context only", ctx), ("context + item", one_hot), ("full", np.ones(len(feats), bool))):
        C, _ = tune_logistic(Xtr[fit_m][:, mask], ytr[fit_m], Xtr[val_m][:, mask], ytr[val_m], grid=BUILD_C_GRID)
        mod = fit_logistic(Xtr[:, mask], ytr, C)
        p = mod.predict_proba(X[te][:, mask])[:, 1]
        results[label] = p
        models[label] = (mod, mask, C)
    report = ev.compare(y[te], {"base rate": np.full(te.sum(), ytr.mean()), **results})

    # By rank bracket, plus one fit that weights high-badge games more (reported, not exported).
    badge = evts["match_id"].map(m.set_index("match_id")["average_badge"]).to_numpy(dtype=float)
    full_m, full_mask, full_C = models["full"]
    wfit = fit_logistic(Xtr[:, full_mask], ytr, full_C, sample_weight=ev.badge_weights(badge[tr]))
    brackets = ev.by_bracket(y[te], {"context only": results["context only"], "full": results["full"],
                                     "badge-weighted full": wfit.predict_proba(X[te][:, full_mask])[:, 1]}, badge[te])

    full, mask, C = models["full"]
    coef = np.zeros(len(feats))
    coef[mask] = np.ravel(full.coef_)
    score_full = item_part(X[te], feats, coef)
    v0_coef = np.zeros(len(feats))
    v0_coef[models["context + item"][1]] = np.ravel(models["context + item"][0].coef_)
    pair_full = pairwise_check(evts[te].reset_index(drop=True), score_full)
    pair_v0 = pairwise_check(evts[te].reset_index(drop=True), item_part(X[te], feats, v0_coef))

    # Sanity reads: which items the model favours against each kind of enemy spending.
    names = cat.set_index("item_id")["name"].to_dict()
    vs_spend = {}
    for c in CATS:
        w = {int(f.split("_")[1]): coef[j] for j, f in enumerate(feats) if f.startswith("is_") and f.endswith(f"_{c}")}
        vs_spend[c] = [names.get(i, str(i)) for i in sorted(w, key=w.get, reverse=True)[:5]]

    rows = export_rows(feats, coef, items)
    path = ex.export_table(
        rows, ["item_id"], f"{out_dir}/build_recommender.json", name="build-recommender",
        metrics={**report.loc["full"].to_dict(), **{f"pairwise_{k}": v for k, v in pair_full.items()}},
        notes="score(item) = b + t*minute/30 + h[my hero] + sum e[enemy hero] + s . enemy spend shares "
              "(weapon, vitality, spirit) + sum v[enemy item] * copies; higher = better next buy",
    )
    return {
        "name": "builds",
        "export": str(path),
        "C": C,
        "items": len(items),
        "events_train": int(tr.sum()),
        "events_test": int(te.sum()),
        "comparison": report,
        "by_badge_bracket": brackets,
        "pairwise_full": pair_full,
        "pairwise_item_only": pair_v0,
        "favoured_vs_enemy_spend": vs_spend,
        "item_terms_help": bool(report.loc["full", "log_loss"] < report.loc["context only", "log_loss"]),
        "val_note": f"log loss gain of full over context only: "
                    f"{report.loc['context only', 'log_loss'] - report.loc['full', 'log_loss']:.5f}",
    }

