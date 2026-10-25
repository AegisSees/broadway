"""3b. "Top players buy": the next item a top-bracket player picks in this spot.

The build recommender (builds.py) learns which items WIN. This model learns what the best players actually BUY: they
know how to answer an enemy lineup and its builds at the right time, so copying them is a strong signal of its own.
It learns from purchases rather than matches, and each game has a few hundred, so even the top 1% of games is enough.

Model: multinomial logistic regression whose classes are items. Context features:
    minute / 30, my hero, the enemy heroes, enemy spend shares (weapon / vitality / spirit), the common enemy items
    held (per copy), and the items I already own.
A multinomial model has one weight per (item, feature), which is exactly the table@1 layout builds.py uses, plus `o`
for owned items: scoreItem() in ml/web/score.ts ranks with it unchanged, and owned items are never suggested.

The bracket is the smallest top fraction of games (1%, 2%, 5%, 10% by average badge) with at least `min_events`
training purchases, so the model stays as close to the top 1% as the data allows.
"""
from __future__ import annotations

import json
from collections import Counter

import numpy as np
import pandas as pd
from scipy import sparse
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import log_loss

from .. import evaluate as ev
from .. import export as ex
from .. import features as fe
from ..flatten import item_catalog
from .builds import CATS
from .common import inner_split

FRACTIONS = (0.01, 0.02, 0.05, 0.10)


def top_bracket(matches: pd.DataFrame, fractions=FRACTIONS):
    """[(fraction, min average badge, match ids)] for each candidate bracket."""
    m = matches.dropna(subset=["average_badge"])
    out = []
    for f in fractions:
        cut = float(m["average_badge"].quantile(1 - f))
        out.append((f, cut, set(m.loc[m["average_badge"] >= cut, "match_id"])))
    return out


def context_matrix(evts: pd.DataFrame, heroes: list[int], enemy_items: list[int], own_items: list[int]):
    """Sparse context features shared by every class; names say which table@1 slot each lands in."""
    cols: dict[str, int] = {}
    rows, cidx, vals = [], [], []

    def put(r, name, v):
        if v:
            rows.append(r)
            cidx.append(cols.setdefault(name, len(cols)))
            vals.append(v)

    hs, evx, own = set(heroes), set(enemy_items), set(own_items)
    spend = evts[[f"enemy_{c}_spend" for c in CATS]].to_numpy()
    tot = spend.sum(1, keepdims=True)
    shares = np.divide(spend, tot, out=np.zeros_like(spend), where=tot > 0)
    for r, e in enumerate(evts.itertuples(index=False)):
        put(r, "t", e.t / 60.0 / 30.0)
        if int(e.hero_id) in hs:
            put(r, f"h_{int(e.hero_id)}", 1.0)
        for h in e.enemy_heroes:
            if int(h) in hs:
                put(r, f"e_{int(h)}", 1.0)
        for c, s in zip(CATS, shares[r]):
            put(r, f"s_{c}", float(s))
        for i, n in Counter(int(x) for x in e.enemy_items).items():
            if i in evx:
                put(r, f"v_{i}", float(n))
        for i in set(int(x) for x in e.own_items):
            if i in own:
                put(r, f"o_{i}", 1.0)
    X = sparse.csr_matrix((vals, (rows, cidx)), shape=(len(evts), len(cols)))
    return X, sorted(cols, key=cols.get)


def owned_mask(evts: pd.DataFrame, classes: np.ndarray) -> np.ndarray:
    """True where the class item is already owned: those are never suggested."""
    idx = {int(c): j for j, c in enumerate(classes)}
    M = np.zeros((len(evts), len(classes)), dtype=bool)
    for r, own in enumerate(evts["own_items"]):
        for i in own:
            j = idx.get(int(i))
            if j is not None:
                M[r, j] = True
    return M


def topk_hit(P: np.ndarray, y: np.ndarray, classes: np.ndarray, k: int) -> float:
    top = classes[np.argsort(-P, axis=1)[:, :k]]
    return float(np.mean([yy in row for yy, row in zip(y, top)]))


def frequency_baseline(train: pd.DataFrame, test: pd.DataFrame, classes: np.ndarray) -> np.ndarray:
    """P(item | hero, 5-minute window) from training counts, with a small global prior."""
    cidx = {int(c): j for j, c in enumerate(classes)}
    glob = np.full(len(classes), 1.0)
    for i in train["item_id"]:
        if int(i) in cidx:
            glob[cidx[int(i)]] += 1
    glob /= glob.sum()
    table: dict[tuple, np.ndarray] = {}
    for (h, b), g in train.groupby([train["hero_id"], train["t"] // 300]):
        v = 5 * glob.copy()
        for i in g["item_id"]:
            if int(i) in cidx:
                v[cidx[int(i)]] += 1
        table[(h, b)] = v / v.sum()
    return np.vstack([table.get((h, b), glob) for h, b in zip(test["hero_id"], test["t"] // 300)])


def masked(P: np.ndarray, mask: np.ndarray) -> np.ndarray:
    Q = np.where(mask, 0.0, P)
    return Q / np.clip(Q.sum(1, keepdims=True), 1e-12, None)


def export_rows(feats: list[str], classes: np.ndarray, coef: np.ndarray, intercept: np.ndarray, prune: float = 0.02):
    rows = {}
    for j, c in enumerate(classes):
        r = {"b": round(float(intercept[j]), 3), "t": 0.0, "h": {}, "e": {}, "s": [0.0, 0.0, 0.0], "v": {}, "o": {}}
        for f, w in zip(feats, coef[j]):
            w = round(float(w), 3)
            if f == "t":
                r["t"] = w
                continue
            if abs(w) < prune:
                continue
            kind, key = f.split("_", 1)
            if kind == "s":
                r["s"][CATS.index(key)] = w
            else:
                r[kind][key] = w
        rows[str(int(c))] = r
    return rows


def train(tables: dict, out_dir, min_events: int = 40000, min_class_events: int = 50, n_enemy_items: int = 40,
          test_frac: float = 0.2, max_bytes: int = 250_000) -> dict:
    cat = item_catalog()
    m = tables["matches"]
    brackets = top_bracket(m)
    events_all = None
    chosen = None
    for frac, cut, ids in brackets:
        # Purchases per match are roughly constant, so estimate before building the (slow) event table.
        sub_m = m[m["match_id"].isin(ids)]
        sub = {k: v[v["match_id"].isin(ids)] for k, v in tables.items() if k in ("players", "items", "stats")}
        est = int(sub["items"]["is_shop"].sum() * 0.6 * (1 - test_frac))
        if est >= min_events or frac == brackets[-1][0]:
            events_all = fe.purchase_events(sub_m, sub["players"], sub["items"], sub["stats"], cat, min_tier=1)
            chosen = (frac, cut, len(ids))
            break
    evts = events_all.reset_index(drop=True)
    start = evts["match_id"].map(m.set_index("match_id")["start_time"]).to_numpy()
    tr, te = ev.time_split(start, test_frac)

    counts = evts.loc[tr, "item_id"].value_counts()
    classes_keep = set(int(i) for i in counts[counts >= min_class_events].index)
    keep = evts["item_id"].astype(int).isin(classes_keep).to_numpy()
    evts, start, tr, te = evts[keep].reset_index(drop=True), start[keep], tr[keep], te[keep]

    heroes = sorted(int(h) for h in tables["players"]["hero_id"].dropna().unique())
    enemy_counts = Counter(int(x) for lst in evts.loc[tr, "enemy_items"] for x in lst)
    enemy_items = [i for i, _ in enemy_counts.most_common(n_enemy_items)]
    X, feats = context_matrix(evts, heroes, enemy_items, sorted(classes_keep))
    y = evts["item_id"].astype(int).to_numpy()

    fit_m, val_m = inner_split(start[tr])
    Xtr, ytr = X[tr], y[tr]
    best = None
    for C in (0.1, 0.3, 1.0):
        mod = LogisticRegression(C=C, max_iter=300, solver="lbfgs").fit(Xtr[fit_m], ytr[fit_m])
        P = masked(mod.predict_proba(Xtr[val_m]), owned_mask(evts[tr][val_m], mod.classes_))
        ll = log_loss(ytr[val_m], np.clip(P, 1e-9, 1), labels=mod.classes_)
        if best is None or ll < best[1]:
            best = (C, ll)
    C = best[0]
    model = LogisticRegression(C=C, max_iter=500, solver="lbfgs").fit(Xtr, ytr)
    classes = model.classes_
    mask_te = owned_mask(evts[te], classes)
    P = masked(model.predict_proba(X[te]), mask_te)
    B = masked(frequency_baseline(evts[tr], evts[te], classes), mask_te)
    yte = y[te]
    report = pd.DataFrame([
        {"model": "hero + minute frequency", "top1": topk_hit(B, yte, classes, 1), "top3": topk_hit(B, yte, classes, 3),
         "top5": topk_hit(B, yte, classes, 5), "log_loss": float(log_loss(yte, np.clip(B, 1e-9, 1), labels=classes))},
        {"model": "top-player model", "top1": topk_hit(P, yte, classes, 1), "top3": topk_hit(P, yte, classes, 3),
         "top5": topk_hit(P, yte, classes, 5), "log_loss": float(log_loss(yte, np.clip(P, 1e-9, 1), labels=classes))},
    ]).set_index("model")

    # Softmax only sees differences between classes, so each feature's weights can be shifted by their mean over the
    # items without changing a single probability. Centring first puts most weights near 0, so pruning costs far less
    # (uncentred, the pruning that fit 250 KB scored below the frequency baseline).
    coef_c = model.coef_ - model.coef_.mean(axis=0, keepdims=True)
    icpt_c = model.intercept_ - model.intercept_.mean()
    model.coef_, model.intercept_ = coef_c, icpt_c
    # Prune small weights until the file fits the site bundle (the standalone build is near its 30 MiB cap). Every
    # level is scored as the site would run it, so the report shows what each size costs.
    def as_exported(prune):
        keep_w = (np.abs(np.round(model.coef_, 3)) >= prune) | (np.array(feats) == "t")[None, :]
        Z = np.asarray(X[te] @ (np.round(model.coef_, 3) * keep_w).T) + np.round(model.intercept_, 3)
        Pp = np.exp(Z - Z.max(1, keepdims=True))
        return masked(Pp / Pp.sum(1, keepdims=True), mask_te)

    sweep, chosen_rows, chosen_prune = [], None, None
    for prune in (0.02, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.6):
        rows = export_rows(feats, classes, model.coef_, model.intercept_, prune=prune)
        size = len(json.dumps(rows, separators=(",", ":")))
        Pp = as_exported(prune)
        sweep.append({"prune": prune, "kb": round(size / 1000), "top1": topk_hit(Pp, yte, classes, 1),
                      "top3": topk_hit(Pp, yte, classes, 3), "log_loss": float(log_loss(yte, np.clip(Pp, 1e-9, 1), labels=classes))})
        if chosen_rows is None and size <= max_bytes:
            chosen_rows, chosen_prune = rows, prune
    if chosen_rows is None:
        chosen_rows, chosen_prune = rows, prune
    rows, prune = chosen_rows, chosen_prune
    Pp = as_exported(prune)
    report.loc["top-player model (as exported)"] = [topk_hit(Pp, yte, classes, 1), topk_hit(Pp, yte, classes, 3),
                                                    topk_hit(Pp, yte, classes, 5),
                                                    float(log_loss(yte, np.clip(Pp, 1e-9, 1), labels=classes))]
    frac, cut, n_matches = chosen
    path = ex.export_table(
        rows, ["item_id"], f"{out_dir}/top_player_items.json", name="top-player-items",
        metrics={**report.loc["top-player model (as exported)"].to_dict(), "bracket_top_fraction": frac, "min_average_badge": cut,
                 "matches": n_matches, "prune": prune},
        notes="multinomial: score(item) = b + t*minute/30 + h[my hero] + sum e[enemy hero] + s . enemy spend shares "
              "+ sum v[enemy item]*copies + sum o[owned item]; softmax over unowned items = chance a top player buys it next",
    )
    names = cat.set_index("item_id")["name"].to_dict()
    return {
        "name": "top_items",
        "export": str(path),
        "bracket": f"top {int(frac * 100)}% of games (average badge >= {cut:.0f}), {n_matches} matches",
        "C": C,
        "export_prune": prune,
        "items": int(len(classes)),
        "events_train": int(tr.sum()),
        "events_test": int(te.sum()),
        "comparison": report,
        "export_size_sweep": pd.DataFrame(sweep).set_index("prune"),
        "most_bought_by_top_players": [names.get(int(i), str(i)) for i in counts.index[:10]],
        "beats_baseline": bool(report.loc["top-player model (as exported)", "log_loss"]
                               < report.loc["hero + minute frequency", "log_loss"]),
    }
