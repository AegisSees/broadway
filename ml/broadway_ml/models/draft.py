"""1. Draft win predictor: P(team 0 wins | the 12 heroes, the rank gap).

Features (all unscaled, so the exported model can be pruned):
    h_<a>        +1 if hero a is on team 0, -1 if on team 1
    s_<a>_<b>    a < b on the same team: +1 on team 0, -1 on team 1 (synergy)
    c_<a>_<b>    a < b on opposite teams: +1 if a is on team 0, -1 if a is on team 1 (a's matchup against b)
    badge_diff   (team 0 average badge - team 1 average badge) / 10, when the API sends both
The intercept is the side advantage. C is tuned on the newest 20% of the training games, then Platt scaling is folded
in if it helps. Pairs make the model much bigger, so they only stay if they beat heroes-only on validation.
"""
from __future__ import annotations

from itertools import combinations

import numpy as np
import pandas as pd
from scipy import sparse

from .. import evaluate as ev
from .. import export as ex
from .common import fit_logistic, inner_split, maybe_calibrate, tune_logistic


def draft_matrix(matches: pd.DataFrame, players: pd.DataFrame, pairs: bool = True):
    """Returns (X sparse, feature names, y, match ids, start times)."""
    ms = matches.dropna(subset=["winning_team"])
    lineup = players[players["match_id"].isin(ms["match_id"])].dropna(subset=["hero_id", "team"])
    by_match = {mid: (g.loc[g.team == 0, "hero_id"].astype(int).tolist(), g.loc[g.team == 1, "hero_id"].astype(int).tolist())
                for mid, g in lineup.groupby("match_id")}
    ms = ms[ms["match_id"].map(lambda m: m in by_match and len(by_match[m][0]) == 6 and len(by_match[m][1]) == 6)]
    names: dict[str, int] = {}
    rows, cols, vals = [], [], []

    def put(r, name, v):
        j = names.setdefault(name, len(names))
        rows.append(r)
        cols.append(j)
        vals.append(v)

    b0 = ms.get("average_badge_team0", pd.Series(0, index=ms.index)).fillna(0).to_numpy()
    b1 = ms.get("average_badge_team1", pd.Series(0, index=ms.index)).fillna(0).to_numpy()
    if "badge" in lineup and not (b0 > 0).any():
        # The API sends 0 for the team averages (2026-10-25), so average the players' own badges (ranked games only).
        tb = lineup[lineup["badge"].fillna(0) > 0].groupby(["match_id", "team"])["badge"].mean().unstack()
        b0 = ms["match_id"].map(tb.get(0, pd.Series(dtype=float))).fillna(0).to_numpy()
        b1 = ms["match_id"].map(tb.get(1, pd.Series(dtype=float))).fillna(0).to_numpy()
    for r, mid in enumerate(ms["match_id"]):
        t0, t1 = by_match[mid]
        for h in t0:
            put(r, f"h_{h}", 1.0)
        for h in t1:
            put(r, f"h_{h}", -1.0)
        if pairs:
            for team, sign in ((t0, 1.0), (t1, -1.0)):
                for a, b in combinations(sorted(team), 2):
                    put(r, f"s_{a}_{b}", sign)
            for a in t0:
                for b in t1:
                    lo, hi, sign = (a, b, 1.0) if a < b else (b, a, -1.0)
                    put(r, f"c_{lo}_{hi}", sign)
        if b0[r] > 0 and b1[r] > 0:
            put(r, "badge_diff", (b0[r] - b1[r]) / 10.0)
    X = sparse.csr_matrix((vals, (rows, cols)), shape=(len(ms), len(names)), dtype=np.float64)
    feats = sorted(names, key=names.get)
    y = (ms["winning_team"].to_numpy() == 0).astype(int)
    return X, feats, y, ms["match_id"].to_numpy(), ms["start_time"].to_numpy()


def hero_logodds_baseline(Xtr, ytr, Xte, feats):
    """Sum of each hero's shrunk win log-odds, team 0 minus team 1."""
    hcols = [i for i, f in enumerate(feats) if f.startswith("h_")]
    H = Xtr[:, hcols].toarray()
    wins = ((H == 1) * ytr[:, None]).sum(0) + ((H == -1) * (1 - ytr)[:, None]).sum(0)
    games = (H != 0).sum(0)
    wr = (wins + 10) / (games + 20)
    lo = np.log(wr / (1 - wr))
    return 1 / (1 + np.exp(-(Xte[:, hcols].toarray() @ lo)))


def train(tables: dict, out_dir, test_frac: float = 0.2) -> dict:
    X, feats, y, mids, start = draft_matrix(tables["matches"], tables["players"], pairs=True)
    tr, te = ev.time_split(start, test_frac)
    fit_m, val_m = inner_split(start[tr])
    Xtr, ytr = X[tr], y[tr]
    hero_cols = np.array([not f.startswith(("s_", "c_")) for f in feats])

    # Heroes-only vs heroes + pairs, each with its own tuned C, compared on validation.
    variants = {}
    for label, mask in (("heroes", hero_cols), ("heroes+pairs", np.ones(len(feats), bool))):
        Xa = Xtr[:, mask]
        C, grid = tune_logistic(Xa[fit_m], ytr[fit_m], Xa[val_m], ytr[val_m])
        variants[label] = (C, min(grid.values()), mask)
    label = min(variants, key=lambda k: variants[k][1])
    C, _, mask = variants[label]
    used = [f for f, k in zip(feats, mask) if k]

    model = fit_logistic(Xtr[fit_m][:, mask], ytr[fit_m], C)
    lin, cal = maybe_calibrate(model, None, used, Xtr[val_m][:, mask], ytr[val_m])
    # Refit on all training games with the chosen C, carrying the calibration over.
    full = fit_logistic(Xtr[:, mask], ytr, C)
    a, b = (cal["platt_a"], cal["platt_b"]) if cal["applied"] else (1.0, 0.0)
    coef, icpt = np.ravel(full.coef_) * a, float(full.intercept_[0]) * a + b

    Xte = X[te][:, mask]
    p = 1 / (1 + np.exp(-(np.asarray(Xte @ coef).ravel() + icpt)))
    preds = {
        "base rate": np.full(te.sum(), ytr.mean()),
        "hero win rates": hero_logodds_baseline(Xtr, ytr, X[te], feats),
        f"logistic ({label})": p,
    }
    report = ev.compare(y[te], preds)
    best = report.loc[f"logistic ({label})"].to_dict()

    # By rank bracket, and a fit that weights high-badge games more (asked 2026-10-25: should the models train on the
    # top players only?). The weighted fit is reported, not exported.
    badge = pd.Series(mids).map(tables["matches"].set_index("match_id")["average_badge"]).to_numpy(dtype=float)
    wfit = fit_logistic(Xtr[:, mask], ytr, C, sample_weight=ev.badge_weights(badge[tr]))
    p_w = wfit.predict_proba(Xte)[:, 1]
    brackets = ev.by_bracket(y[te], {"hero win rates": preds["hero win rates"], f"logistic ({label})": p,
                                     "badge-weighted fit": p_w}, badge[te])

    top = pd.Series(coef, index=used)
    heroes = top[top.index.str.startswith("h_")].sort_values()
    path = ex.export_linear_arrays(
        used, coef, icpt, f"{out_dir}/draft_win.json", name="draft-win", metrics=best, prune=1e-3,
        notes=f"{label}, C={C}, trained on {tr.sum()} matches up to {pd.to_datetime(start[tr].max(), unit='s'):%Y-%m-%d}; "
              "feature layout in ml/broadway_ml/models/draft.py",
    )
    return {
        "name": "draft",
        "export": str(path),
        "variant": label,
        "C": C,
        "variants_val_log_loss": {k: v[1] for k, v in variants.items()},
        "calibration": cal,
        "side_advantage_logit": icpt,
        "comparison": report,
        "reliability": ev.reliability_table(y[te], p),
        "by_badge_bracket": brackets,
        "strongest_heroes": heroes.tail(5).iloc[::-1].to_dict(),
        "weakest_heroes": heroes.head(5).to_dict(),
        "n_train": int(tr.sum()),
        "n_test": int(te.sum()),
        "beats_baselines": bool(best["log_loss"] < report["log_loss"].drop(f"logistic ({label})").min()),
    }
