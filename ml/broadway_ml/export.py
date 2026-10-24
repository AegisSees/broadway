"""Writes trained models as small JSON files the static site can load (ml/web/score.ts reads them).

Why JSON and not ONNX: the standalone build must stay under 30 MiB and is already about 28.7 MB, and onnxruntime-web
alone is several MB of WebAssembly. Every model planned here is linear, a lookup table or a set of centroids, which
fit in a few KB of JSON and score in a few lines of TypeScript. If a model ever needs trees or a network, revisit.

Formats (all carry `format`, `name`, `trained_at`, `metrics` and `notes`):

    broadway-ml/linear@1     features[], mean[], scale[], coef[], intercept, link ("logistic" | "identity")
                             score = intercept + sum(coef_i * (x_i - mean_i) / scale_i), then the link
    broadway-ml/centroids@1  features[], mean[], scale[], centroids[][] (in scaled space), labels[]
                             nearest centroid by Euclidean distance after scaling
    broadway-ml/table@1      key_names[], rows: {key: value}; for lookups such as item scores per hero
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np


def _base(fmt: str, name: str, metrics: dict | None, notes: str) -> dict[str, Any]:
    return {
        "format": fmt,
        "name": name,
        "trained_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "metrics": {k: (round(v, 5) if isinstance(v, float) else v) for k, v in (metrics or {}).items()},
        "notes": notes,
    }


def _write(obj: dict, path: str | Path) -> Path:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, separators=(",", ":")))
    return p


def _r(a) -> list:
    return [round(float(x), 6) for x in np.ravel(a)]


def export_linear(model, features: list[str], path: str | Path, scaler=None, name: str = "", metrics: dict | None = None,
                  notes: str = "") -> Path:
    """A fitted sklearn LogisticRegression / LinearRegression / Ridge, optionally after a StandardScaler. For a
    Pipeline pass pipeline[-1] as `model` and pipeline[0] as `scaler`."""
    n = len(features)
    is_logistic = hasattr(model, "predict_proba")
    coef = np.ravel(model.coef_)
    if len(coef) != n:
        raise ValueError(f"{len(coef)} coefficients for {n} features")
    obj = _base("broadway-ml/linear@1", name, metrics, notes)
    obj.update({
        "link": "logistic" if is_logistic else "identity",
        "features": list(features),
        "mean": _r(scaler.mean_) if scaler is not None else [0.0] * n,
        "scale": _r(scaler.scale_) if scaler is not None else [1.0] * n,
        "coef": _r(coef),
        "intercept": round(float(np.ravel(model.intercept_)[0]), 6),
    })
    return _write(obj, path)


def export_centroids(kmeans, features: list[str], labels: list[str], path: str | Path, scaler=None, name: str = "",
                     metrics: dict | None = None, notes: str = "") -> Path:
    n = len(features)
    obj = _base("broadway-ml/centroids@1", name, metrics, notes)
    obj.update({
        "features": list(features),
        "mean": _r(scaler.mean_) if scaler is not None else [0.0] * n,
        "scale": _r(scaler.scale_) if scaler is not None else [1.0] * n,
        "centroids": [_r(c) for c in kmeans.cluster_centers_],
        "labels": list(labels),
    })
    return _write(obj, path)


def export_table(rows: dict[str, Any], key_names: list[str], path: str | Path, name: str = "",
                 metrics: dict | None = None, notes: str = "") -> Path:
    obj = _base("broadway-ml/table@1", name, metrics, notes)
    obj.update({"key_names": key_names, "rows": rows})
    return _write(obj, path)


def score_linear(obj: dict, x: dict[str, float]) -> float:
    """Python twin of score.ts, used by the tests to prove the export matches sklearn."""
    z = obj["intercept"] + sum(
        c * (x.get(f, 0.0) - m) / (s or 1.0) for f, c, m, s in zip(obj["features"], obj["coef"], obj["mean"], obj["scale"])
    )
    return 1 / (1 + np.exp(-z)) if obj["link"] == "logistic" else z
