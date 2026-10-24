import json

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.preprocessing import StandardScaler

from broadway_ml import evaluate as ev
from broadway_ml import export as ex
from broadway_ml import features as fe
from broadway_ml.flatten import flatten_matches, item_catalog, team_index, unix_time
from broadway_ml.pull import as_match_list, keep_match


def test_team_and_time_parsing():
    assert [team_index(v) for v in ("Team0", "Team1", 0, 1, "k_ECitadelLobbyTeam_Team1", None)] == [0, 1, 0, 1, 1, None]
    assert unix_time("2026-10-08 21:42:53") == 1791495773  # matches match-history start_time for the same game
    assert unix_time(5) == 5


def test_flatten_real_sample(sample_match):
    t = flatten_matches([sample_match])
    assert len(t["matches"]) == 1 and len(t["players"]) == 12
    assert t["matches"].iloc[0]["winning_team"] == 0
    assert t["players"]["win"].sum() == 6
    assert t["items"]["is_shop"].any() and not t["items"]["is_shop"].all()
    assert t["stats"]["t"].max() == 1719
    assert "fs_player_damage" in t["players"].columns


def test_keep_and_unwrap(sample_match):
    assert keep_match(sample_match)
    assert as_match_list({"matches": [1, 2]}) == [1, 2] and as_match_list(None) == []


def test_item_catalog_has_categories():
    c = item_catalog()
    assert c["category"].isin(["weapon", "vitality", "spirit"]).mean() > 0.8


def test_draft_model_end_to_end(fake_matches, tmp_path):
    t = flatten_matches(fake_matches)
    X, y, heroes, mids = fe.draft_features(t["matches"], t["players"])
    assert X.shape == (800, len(heroes) + 1) and set(np.unique(X.iloc[:, :-1])) <= {-1, 0, 1}
    assert ((X.iloc[:, :-1] == 1).sum(axis=1) == 6).all()
    start = t["matches"].set_index("match_id").loc[mids, "start_time"]
    tr, te = ev.time_split(start)
    Xm, ym = fe.mirror_draft(X[tr], y[tr])
    scaler = StandardScaler().fit(Xm)
    lr = LogisticRegression(C=1.0, max_iter=1000).fit(scaler.transform(Xm), ym)
    p = lr.predict_proba(scaler.transform(X[te]))[:, 1]
    rep = ev.compare(y[te], {"lr": p, "base": np.full(te.sum(), y[tr].mean())})
    assert rep.loc["lr", "auc"] > 0.55  # hero 1 is planted as strong
    assert lr.coef_[0][heroes.index(1)] > 0
    path = ex.export_linear(lr, list(X.columns), tmp_path / "draft.json", scaler=scaler, metrics=rep.loc["lr"].to_dict())
    obj = json.loads(path.read_text())
    row = X[te].iloc[0]
    assert abs(ex.score_linear(obj, row.to_dict()) - p[0]) < 1e-4


def test_live_features_no_final_sample(fake_matches):
    t = flatten_matches(fake_matches[:50])
    tl = fe.timeline_features(t["matches"], t["stats"])
    assert (tl["t"] % 180 == 0).all() and len(tl) == 50 * 9
    corr = np.corrcoef(tl["net_worth_diff"], tl["win"] == 1)[0, 1]
    assert corr > 0.3  # the winning side is richer in the fixture, and the diff is team 0 minus team 1


def test_purchase_events_see_enemy_builds(fake_matches):
    t = flatten_matches(fake_matches[:20])
    ev_ = fe.purchase_events(t["matches"], t["players"], t["items"], t["stats"], item_catalog(), min_tier=1)
    assert len(ev_) > 0
    assert ev_["enemy_heroes"].map(len).eq(6).all() and ev_["ally_heroes"].map(len).eq(5).all()
    late = ev_[ev_["t"] > 600]
    assert late["enemy_items"].map(len).gt(0).all()  # by 10 minutes the enemy has bought something
    assert (late[["enemy_weapon_spend", "enemy_vitality_spend", "enemy_spirit_spend"]].sum(axis=1) > 0).all()
    # nothing from the future: own items were all bought before this purchase
    shop = t["items"][t["items"]["is_shop"]]
    for r in ev_.sample(30, random_state=0).itertuples():
        earlier = shop[(shop["account_id"] == r.account_id) & (shop["game_time_s"] < r.t)]
        assert sorted(r.own_items) == sorted(earlier["item_id"])
    vocab = sorted({i for lst in ev_["enemy_items"] for i in lst})
    assert fe.multi_hot(ev_["enemy_items"], vocab, "e_").to_numpy().sum() == ev_["enemy_items"].map(len).sum()


def _histories(n_players=60, n_games=40, seed=1):
    rng = np.random.default_rng(seed)
    rows = []
    for a in range(n_players):
        skill = rng.uniform(0, 1)
        for g in range(n_games):
            rows.append({"account_id": a, "match_id": a * 1000 + g, "hero_id": int(rng.integers(1, 6)),
                         "start_time": 1_790_000_000 + g * 3600, "game_mode": 1, "match_duration_s": 1800,
                         "player_kills": int(5 + 10 * skill), "player_deaths": int(8 - 5 * skill), "player_assists": 8,
                         "net_worth": int(30000 + 20000 * skill), "last_hits": int(100 + 100 * skill), "denies": 5,
                         "player_match_outcome": int(rng.random() < 0.5), "ranked_display_badge": int(fe.index_to_badge(skill * 70))})
    return pd.DataFrame(rows)


def test_badge_scale_round_trips():
    for b in (11, 16, 74, 116):
        assert fe.index_to_badge(fe.badge_to_index(b)) == b
    assert fe.badge_to_index(116) == 71 and fe.badge_to_index(11) == 6


def test_rank_and_clusters_end_to_end(tmp_path):
    h = _histories()
    rd = fe.rank_dataset(h)
    tr, te = ev.group_split(rd["account_id"])
    assert not set(rd.loc[tr, "account_id"]) & set(rd.loc[te, "account_id"])
    scaler = StandardScaler().fit(rd.loc[tr, fe.PROFILE_COLS])
    m = Ridge().fit(scaler.transform(rd.loc[tr, fe.PROFILE_COLS]), rd.loc[tr, "badge_idx"])
    rep = ev.rank_report(rd.loc[te, "badge_idx"], m.predict(scaler.transform(rd.loc[te, fe.PROFILE_COLS])))
    assert rep["mae_levels"] < 6
    obj = json.loads(ex.export_linear(m, fe.PROFILE_COLS, tmp_path / "rank.json", scaler=scaler).read_text())
    assert obj["link"] == "identity"

    prof = fe.player_profiles(h)
    assert len(prof) == 60
    sc = StandardScaler().fit(prof[fe.PROFILE_COLS])
    km = KMeans(n_clusters=3, n_init=5, random_state=0).fit(sc.transform(prof[fe.PROFILE_COLS]))
    obj = json.loads(ex.export_centroids(km, fe.PROFILE_COLS, ["a", "b", "c"], tmp_path / "c.json", scaler=sc).read_text())
    assert len(obj["centroids"]) == 3 and len(obj["centroids"][0]) == len(fe.PROFILE_COLS)


def test_calibration_helpers():
    rng = np.random.default_rng(0)
    p = rng.uniform(0, 1, 20000)
    y = (rng.uniform(0, 1, 20000) < p).astype(int)
    assert ev.expected_calibration_error(y, p) < 0.02
    assert ev.expected_calibration_error(y, np.clip(p * 1.6 - 0.3, 0, 1)) > 0.05
    tr, te = ev.time_split(np.arange(100))
    assert tr.sum() == 80 and te.sum() == 20
