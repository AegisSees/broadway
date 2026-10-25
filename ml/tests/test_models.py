"""The five models train and export on fixture data, and the browser scorer (web/score.ts) builds the same features.

web/golden.json pins the Python side of the feature layouts; web/score.test.ts checks the TypeScript side against it.
Regenerate after changing a layout with: UPDATE_GOLDEN=1 pytest tests/test_models.py
"""
import json
import os

import numpy as np
import pandas as pd

from broadway_ml import export as ex
from broadway_ml.flatten import flatten_matches
from broadway_ml.models import builds, draft, live, playstyle, rank
from broadway_ml.train import main as train_main
from conftest import ML
from test_pipeline import _histories

GOLDEN = ML / "web" / "golden.json"


def _tables(fake_matches):
    t = flatten_matches(fake_matches)
    t["histories"] = _histories(120, 40)
    return t


def test_all_models_train_and_export(fake_matches, tmp_path):
    t = _tables(fake_matches)
    d = draft.train(t, tmp_path)
    assert d["beats_baselines"] and json.loads((tmp_path / "draft_win.json").read_text())["format"] == "broadway-ml/linear@1"
    assert "h_1" in d["strongest_heroes"]  # the planted strong hero
    lv = live.train(t, tmp_path)
    assert lv["comparison"].loc["logistic", "auc"] > 0.9
    b = builds.train(t, tmp_path, min_item_events=20)
    obj = json.loads((tmp_path / "build_recommender.json").read_text())
    assert obj["format"] == "broadway-ml/table@1" and len(obj["rows"]) == b["items"]
    p = playstyle.train(t, tmp_path)
    assert 4 <= p["k"] <= 8 and len(set(p["centroids_z"].index)) == p["k"]
    r = rank.train(t, tmp_path)
    assert r["beats_baseline"]


def test_train_cli_writes_report(fake_matches, tmp_path):
    t = flatten_matches(fake_matches[:300])
    from broadway_ml.flatten import save_tables
    save_tables(t, tmp_path / "tables", "_0000")
    train_main(["draft", "live", "rank", "--data", str(tmp_path / "tables"), "--out", str(tmp_path / "out")])
    md = (tmp_path / "out" / "report.md").read_text()
    assert "## draft" in md and "Skipped: no" in md  # rank has no histories here


def test_draft_pruned_export_scores_like_the_model(fake_matches, tmp_path):
    t = flatten_matches(fake_matches)
    X, feats, y, mids, start = draft.draft_matrix(t["matches"], t["players"])
    rng = np.random.default_rng(0)
    coef = rng.normal(0, 0.1, len(feats))
    path = ex.export_linear_arrays(feats, coef, 0.05, tmp_path / "d.json", prune=0.0)
    obj = json.loads(path.read_text())
    row = X[0].toarray().ravel()
    x = {f: v for f, v in zip(feats, row) if v}
    z = 0.05 + row @ coef
    assert abs(ex.score_linear(obj, x) - 1 / (1 + np.exp(-z))) < 1e-4


def _golden(fake_matches):
    t = flatten_matches(fake_matches[:3])
    X, feats, *_ = draft.draft_matrix(t["matches"], t["players"])
    m0 = t["players"][t["players"].match_id == t["matches"].match_id.iloc[0]]
    draft_case = {
        "team0": m0[m0.team == 0].hero_id.astype(int).tolist(),
        "team1": m0[m0.team == 1].hero_id.astype(int).tolist(),
        "features": {f: float(v) for f, v in zip(feats, X[0].toarray().ravel()) if v},
    }
    lf = live.live_frame(t["matches"], t["stats"]).iloc[4]
    live_case = {
        "gaps": {"netWorth": float(lf.net_worth_diff), "kills": float(lf.kills_diff), "deaths": float(lf.deaths_diff),
                 "assists": float(lf.assists_diff), "level": float(lf.level_diff), "netWorthShare": float(lf.net_worth_share)},
        "minute": float(lf.minute),
        "features": {f: float(lf[f]) for f in live.FEATURES},
    }
    evts = pd.DataFrame([{"t": 900.0, "nw_diff": 1500.0, "item_id": 11, "hero_id": 3, "enemy_heroes": [4, 5, 6, 7, 8, 9],
                          "enemy_items": [21, 21, 22, 99], "enemy_weapon_spend": 3000.0, "enemy_vitality_spend": 1000.0,
                          "enemy_spirit_spend": 0.0}])
    Xb, fb = builds.build_matrix(evts, items=[11], enemy_items=[21, 22])
    coef = np.round(np.random.default_rng(1).normal(0, 0.3, len(fb)), 3)
    rows = builds.export_rows(fb, coef, [11], prune=0.0)
    build_case = {
        "rows": rows,
        "context": {"hero": 3, "minute": 15.0, "enemyHeroes": [4, 5, 6, 7, 8, 9], "enemyItems": [21, 21, 22, 99],
                    "enemySpend": [3000.0, 1000.0, 0.0]},
        "item": 11,
        "score": float(builds.item_part(Xb, fb, coef)[0]),
    }
    return {"draft": draft_case, "live": live_case, "build": build_case}


def test_golden_feature_layouts(fake_matches):
    g = json.loads(json.dumps(_golden(fake_matches)))
    if os.environ.get("UPDATE_GOLDEN") or not GOLDEN.exists():
        GOLDEN.write_text(json.dumps(g, indent=1))
    assert json.loads(GOLDEN.read_text()) == g
