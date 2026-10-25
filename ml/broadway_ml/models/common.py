"""Shared training helpers: time-ordered tuning, Platt calibration folded into a linear model, and report tables."""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import log_loss

from .. import evaluate as ev

C_GRID = (0.0003, 0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1.0, 3.0)


@dataclass
class Linear:
    """A logistic model in plain arrays, ready for export.linear@1 (mean 0, scale 1 unless set)."""

    features: list[str]
    coef: np.ndarray
    intercept: float
    mean: np.ndarray | None = None
    scale: np.ndarray | None = None
    extra: dict = field(default_factory=dict)

    def logit(self, X) -> np.ndarray:
        Xc = X if self.mean is None else (X - self.mean) / self.scale
        return np.asarray(Xc @ self.coef).ravel() + self.intercept

    def predict(self, X) -> np.ndarray:
        return 1 / (1 + np.exp(-self.logit(X)))


def fit_logistic(X, y, C: float, sample_weight=None) -> LogisticRegression:
    return LogisticRegression(C=C, max_iter=5000, solver="lbfgs").fit(X, y, sample_weight=sample_weight)


def tune_logistic(Xtr, ytr, Xva, yva, grid=C_GRID) -> tuple[float, dict[float, float]]:
    """Picks C by log loss on a later time slice (never random folds: the meta drifts)."""
    scores = {}
    for C in grid:
        m = fit_logistic(Xtr, ytr, C)
        scores[C] = log_loss(yva, m.predict_proba(Xva)[:, 1], labels=[0, 1])
    return min(scores, key=scores.get), scores


def platt(z: np.ndarray, y: np.ndarray) -> tuple[float, float]:
    """Fits p = sigmoid(a * z + b) on held-out logits. a < 1 means the model was over-confident."""
    m = LogisticRegression(C=1e6, max_iter=1000).fit(z.reshape(-1, 1), y)
    return float(m.coef_[0][0]), float(m.intercept_[0])


def to_linear(model: LogisticRegression, features: list[str], scaler=None, a: float = 1.0, b: float = 0.0) -> Linear:
    """sklearn model (+ optional StandardScaler, + optional Platt a, b folded in) -> Linear."""
    return Linear(
        features=list(features),
        coef=np.ravel(model.coef_) * a,
        intercept=float(model.intercept_[0]) * a + b,
        mean=None if scaler is None else scaler.mean_,
        scale=None if scaler is None else scaler.scale_,
    )


def maybe_calibrate(model, scaler, features, Xva, yva, min_gain: float = 0.002) -> tuple[Linear, dict]:
    """Folds Platt scaling into the model when it lowers held-out log loss by at least `min_gain`."""
    lin = to_linear(model, features, scaler)
    z = lin.logit(Xva)
    a, b = platt(z, yva)
    before = log_loss(yva, 1 / (1 + np.exp(-z)), labels=[0, 1])
    after = log_loss(yva, 1 / (1 + np.exp(-(a * z + b))), labels=[0, 1])
    info = {"platt_a": a, "platt_b": b, "val_log_loss_before": before, "val_log_loss_after": after, "applied": False}
    if before - after >= min_gain:
        lin = to_linear(model, features, scaler, a, b)
        info["applied"] = True
    return lin, info


def inner_split(order_key: np.ndarray, val_frac: float = 0.2):
    """Splits a training set into older (fit) and newer (validation) parts."""
    return ev.time_split(order_key, test_frac=val_frac)


def md_table(df) -> str:
    """A DataFrame as a markdown table with 4 decimals (no tabulate dependency)."""
    cols = [df.index.name or ""] + list(df.columns)
    lines = ["| " + " | ".join(str(c) for c in cols) + " |", "|" + "---|" * len(cols)]
    for idx, row in df.iterrows():
        cells = [str(idx)] + [_cell(v) for v in row]
        lines.append("| " + " | ".join(cells) + " |")
    return "\n".join(lines)


def _cell(v) -> str:
    if isinstance(v, float):
        return str(int(v)) if v.is_integer() and abs(v) >= 1 else f"{v:.4f}"
    return str(v)
