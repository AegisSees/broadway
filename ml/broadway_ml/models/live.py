"""2. Live win probability: P(team 0 wins | the state of the game at a 3-minute snapshot).

Inputs are team 0 minus team 1 at that moment: net worth (in thousands), kills, deaths, assists, level, net worth share,
plus the minute. A 5k lead means more at minute 30 than at minute 6, so every gap also enters multiplied by
minute / 30 (named `<gap>__x_min`). The site builds the same columns with liveFeatures() in ml/web/score.ts.
Split by match start time; every snapshot of a match is on the same side.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

from .. import evaluate as ev
from .. import export as ex
from .. import features as fe
from .common import fit_logistic, inner_split, maybe_calibrate, tune_logistic

GAPS = ["nw_k", "kills_diff", "deaths_diff", "assists_diff", "level_diff", "net_worth_share"]


def live_frame(matches: pd.DataFrame, stats: pd.DataFrame) -> pd.DataFrame:
    tl = fe.timeline_features(matches, stats)
    tl["nw_k"] = tl["net_worth_diff"] / 1000.0
    for g in GAPS:
        tl[f"{g}__x_min"] = tl[g] * tl["minute"] / 30.0
    return tl


FEATURES = GAPS + [f"{g}__x_min" for g in GAPS] + ["minute"]


def train(tables: dict, out_dir, test_frac: float = 0.2) -> dict:
    tl = live_frame(tables["matches"], tables["stats"])
    start = tl["match_id"].map(tables["matches"].set_index("match_id")["start_time"]).to_numpy()
    tr, te = ev.time_split(start, test_frac)
    fit_m, val_m = inner_split(start[tr])
    X, y = tl[FEATURES].to_numpy(), tl["win"].to_numpy()
    Xtr, ytr = X[tr], y[tr]

    scaler = StandardScaler().fit(Xtr[fit_m])
    C, grid = tune_logistic(scaler.transform(Xtr[fit_m]), ytr[fit_m], scaler.transform(Xtr[val_m]), ytr[val_m])
    model = fit_logistic(scaler.transform(Xtr[fit_m]), ytr[fit_m], C)
    lin, cal = maybe_calibrate(model, scaler, FEATURES, Xtr[val_m], ytr[val_m])
    scaler_full = StandardScaler().fit(Xtr)
    full = fit_logistic(scaler_full.transform(Xtr), ytr, C)
    a, b = (cal["platt_a"], cal["platt_b"]) if cal["applied"] else (1.0, 0.0)
    coef, icpt = np.ravel(full.coef_) * a, float(full.intercept_[0]) * a + b
    p = 1 / (1 + np.exp(-(scaler_full.transform(X[te]) @ coef + icpt)))

    share = tl[["net_worth_share"]].to_numpy()
    base = LogisticRegression().fit(share[tr], ytr)
    preds = {
        "base rate": np.full(te.sum(), ytr.mean()),
        "net worth share": base.predict_proba(share[te])[:, 1],
        "logistic": p,
    }
    report = ev.compare(y[te], preds)
    by_min = pd.concat(
        {k: ev.auc_by_minute(tl[te], v).set_index("minute")["auc"] for k, v in preds.items() if k != "base rate"}, axis=1
    )
    path = ex.export_linear_arrays(
        FEATURES, coef, icpt, f"{out_dir}/live_win.json", mean=scaler_full.mean_, scale=scaler_full.scale_,
        name="live-win", metrics=report.loc["logistic"].to_dict(),
        notes=f"C={C}; team 0 minus team 1 at a 3-minute snapshot; nw_k = net worth gap / 1000; "
              "<gap>__x_min = gap * minute / 30",
    )
    return {
        "name": "live",
        "export": str(path),
        "C": C,
        "calibration": cal,
        "comparison": report,
        "auc_by_minute": by_min,
        "reliability": ev.reliability_table(y[te], p),
        "n_train_snapshots": int(tr.sum()),
        "n_test_snapshots": int(te.sum()),
        "beats_baselines": bool(report.loc["logistic", "log_loss"] < report["log_loss"].drop("logistic").min()),
    }
