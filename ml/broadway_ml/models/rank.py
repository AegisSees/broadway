"""6. Rank estimate: what rank someone plays like, from 20 recent ranked games.

Ridge regression on the profile features predicts the 0..71 level index (6 levels per rank tier). alpha is picked by
account-grouped validation. A gradient-boosted model is trained too, only to show how much a non-linear model would
add; Ridge is what ships, because it exports as linear@1. The test residual spread is exported as `resid_sd`, so the
site can show a range ("plays like Oracle, give or take a tier") rather than a single number.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler

from .. import evaluate as ev
from .. import export as ex
from .. import features as fe

ALPHAS = (0.1, 1.0, 10.0, 100.0)


def train(tables: dict, out_dir, histories: pd.DataFrame | None = None) -> dict:
    hist = histories if histories is not None else tables["histories"]
    rd = fe.rank_dataset(hist, window=20, step=5)
    F = fe.PROFILE_COLS
    tr, te = ev.group_split(rd["account_id"], test_frac=0.2, seed=0)
    train_df = rd[tr]
    fit_m, val_m = ev.group_split(train_df["account_id"], test_frac=0.2, seed=1)

    scaler = StandardScaler().fit(train_df.loc[fit_m, F])
    val_mae = {}
    for a in ALPHAS:
        m = Ridge(alpha=a).fit(scaler.transform(train_df.loc[fit_m, F]), train_df.loc[fit_m, "badge_idx"])
        val_mae[a] = float(np.mean(np.abs(m.predict(scaler.transform(train_df.loc[val_m, F])) - train_df.loc[val_m, "badge_idx"])))
    alpha = min(val_mae, key=val_mae.get)

    scaler = StandardScaler().fit(train_df[F])
    ridge = Ridge(alpha=alpha).fit(scaler.transform(train_df[F]), train_df["badge_idx"])
    pred = ridge.predict(scaler.transform(rd.loc[te, F]))
    hgb = HistGradientBoostingRegressor(max_iter=300, learning_rate=0.05, random_state=0).fit(train_df[F], train_df["badge_idx"])
    pred_hgb = hgb.predict(rd.loc[te, F])
    truth = rd.loc[te, "badge_idx"].to_numpy()
    med = float(np.median(train_df["badge_idx"]))
    report = pd.DataFrame([
        ev.rank_report(truth, np.full(len(truth), med), "median"),
        ev.rank_report(truth, pred, "ridge"),
        ev.rank_report(truth, pred_hgb, "boosted trees (not exported)"),
    ]).set_index("model")
    resid_sd = float(np.std(truth - pred))
    path = ex.export_linear(
        ridge, F, f"{out_dir}/rank_estimate.json", scaler=scaler, name="rank-estimate",
        metrics={**report.loc["ridge"].to_dict(), "resid_sd": resid_sd},
        notes=f"alpha={alpha}; predicts the 0..71 level index from 20 ranked games; convert with indexToBadge; "
              "show +/- resid_sd levels as the range",
    )
    return {"name": "rank", "export": str(path), "alpha": alpha, "comparison": report, "resid_sd_levels": resid_sd,
            "windows": int(len(rd)), "players": int(rd["account_id"].nunique()),
            "beats_baseline": bool(report.loc["ridge", "mae_levels"] < report.loc["median", "mae_levels"])}
