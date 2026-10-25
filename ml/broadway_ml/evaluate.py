"""Splits and metrics shared by every notebook.

Splits: match models are split by TIME (train on older games, test on the newest), because the site predicts future
games and patches shift the meta. Player models are split by ACCOUNT, so no player is in both sets.

Metrics for win models: ROC AUC (ranking), log loss and Brier score (probability quality), accuracy, and expected
calibration error with a reliability table. A model that says 70% should win about 70% of those games; that matters
more on the site than AUC, because the number is shown to people.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss, mean_absolute_error, roc_auc_score


def time_split(start_time: pd.Series | np.ndarray, test_frac: float = 0.2, gap_frac: float = 0.0):
    """Boolean masks (train, test): the newest `test_frac` of rows are the test set. `gap_frac` leaves a buffer of
    rows between the two (useful when a patch lands right at the cut)."""
    t = np.asarray(start_time)
    cut_test = np.quantile(t, 1 - test_frac)
    cut_train = np.quantile(t, max(0.0, 1 - test_frac - gap_frac))
    return t < cut_train, t >= cut_test


def group_split(groups: pd.Series | np.ndarray, test_frac: float = 0.2, seed: int = 0):
    """Boolean masks (train, test) with every group (account, match) wholly on one side."""
    g = np.asarray(groups)
    uniq = np.unique(g)
    rng = np.random.default_rng(seed)
    test_groups = set(rng.choice(uniq, size=max(1, int(len(uniq) * test_frac)), replace=False).tolist())
    test = np.array([x in test_groups for x in g])
    return ~test, test


def reliability_table(y: np.ndarray, p: np.ndarray, bins: int = 10) -> pd.DataFrame:
    y, p = np.asarray(y), np.clip(np.asarray(p, dtype=float), 1e-6, 1 - 1e-6)
    edges = np.linspace(0, 1, bins + 1)
    b = np.clip(np.digitize(p, edges) - 1, 0, bins - 1)
    df = pd.DataFrame({"bin": b, "p": p, "y": y})
    out = df.groupby("bin").agg(n=("y", "size"), predicted=("p", "mean"), observed=("y", "mean")).reset_index()
    out["lo"], out["hi"] = edges[out["bin"]], edges[out["bin"] + 1]
    return out[["lo", "hi", "n", "predicted", "observed"]]


def expected_calibration_error(y: np.ndarray, p: np.ndarray, bins: int = 10) -> float:
    t = reliability_table(y, p, bins)
    return float((t["n"] * (t["predicted"] - t["observed"]).abs()).sum() / t["n"].sum())


def classification_report(y: np.ndarray, p: np.ndarray, name: str = "model") -> dict:
    y, p = np.asarray(y), np.clip(np.asarray(p, dtype=float), 1e-6, 1 - 1e-6)
    return {
        "model": name,
        "n": int(len(y)),
        "auc": float(roc_auc_score(y, p)) if len(np.unique(y)) > 1 else float("nan"),
        "log_loss": float(log_loss(y, p, labels=[0, 1])),
        "brier": float(brier_score_loss(y, p)),
        "accuracy": float(accuracy_score(y, p >= 0.5)),
        "ece": expected_calibration_error(y, p),
    }


def compare(y: np.ndarray, predictions: dict[str, np.ndarray]) -> pd.DataFrame:
    """One row per model. Always include a baseline such as {"always base rate": np.full(len(y), y_train.mean())}."""
    return pd.DataFrame([classification_report(y, p, k) for k, p in predictions.items()]).set_index("model")


def plot_reliability(y: np.ndarray, predictions: dict[str, np.ndarray], bins: int = 10, ax=None):
    import matplotlib.pyplot as plt

    ax = ax or plt.subplots(figsize=(5, 5))[1]
    ax.plot([0, 1], [0, 1], ls="--", c="grey", lw=1, label="perfect")
    for name, p in predictions.items():
        t = reliability_table(y, p, bins)
        ax.plot(t["predicted"], t["observed"], marker="o", label=name)
    ax.set(xlabel="predicted win chance", ylabel="observed win rate", xlim=(0, 1), ylim=(0, 1))
    ax.legend()
    return ax


def auc_by_minute(df: pd.DataFrame, p: np.ndarray, minute_col: str = "minute", y_col: str = "win") -> pd.DataFrame:
    """For the live model: how good the prediction is at each point of the game."""
    d = df[[minute_col, y_col]].assign(p=p)
    rows = []
    for m, g in d.groupby(minute_col):
        if g[y_col].nunique() > 1 and len(g) >= 50:
            rows.append({"minute": m, "n": len(g), "auc": roc_auc_score(g[y_col], g["p"]),
                         "brier": brier_score_loss(g[y_col], g["p"])})
    return pd.DataFrame(rows)


def rank_report(true_idx: np.ndarray, pred_idx: np.ndarray, name: str = "model") -> dict:
    """Rank estimate quality on the 0..71 level scale (6 levels per rank tier)."""
    t, p = np.asarray(true_idx, float), np.clip(np.rint(pred_idx), 0, 71)
    return {
        "model": name,
        "n": int(len(t)),
        "mae_levels": float(mean_absolute_error(t, p)),
        "within_same_tier": float(np.mean(t // 6 == p // 6)),
        "within_one_tier": float(np.mean(np.abs(t // 6 - p // 6) <= 1)),
    }
