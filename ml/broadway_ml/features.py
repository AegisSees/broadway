"""Feature builders for the five models. Each returns plain DataFrames / arrays so notebooks stay short.

Conventions: the label is always "team 0 (Hidden King) won" for match-level models and "this player's team won" for
player-level ones. Nothing here may look at information from after the moment being predicted: no match duration in
the live model, no final stats in the draft model, no badge in the rank model's inputs.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

STATS_INTERVAL_S = 180


# ---------------------------------------------------------------- 1. draft win predictor

def draft_features(matches: pd.DataFrame, players: pd.DataFrame, hero_ids: list[int] | None = None):
    """One row per match. Columns h_<id> are +1 if the hero is on team 0, -1 if on team 1, else 0, plus `badge`
    (average badge of the match, /10 so it is on a similar scale). Returns (X, y, hero_ids, match_ids)."""
    hero_ids = hero_ids or sorted(int(h) for h in players["hero_id"].dropna().unique())
    col = {h: i for i, h in enumerate(hero_ids)}
    ms = matches.dropna(subset=["winning_team"]).set_index("match_id")
    X = np.zeros((len(ms), len(hero_ids) + 1), dtype=np.float32)
    row = {mid: i for i, mid in enumerate(ms.index)}
    for p in players.itertuples(index=False):
        i, j = row.get(p.match_id), col.get(int(p.hero_id)) if p.hero_id == p.hero_id else None
        if i is not None and j is not None:
            X[i, j] = 1.0 if p.team == 0 else -1.0
    X[:, -1] = ms["average_badge"].fillna(0).to_numpy() / 10.0
    y = (ms["winning_team"].to_numpy() == 0).astype(int)
    names = [f"h_{h}" for h in hero_ids] + ["badge"]
    return pd.DataFrame(X, columns=names, index=ms.index), y, hero_ids, ms.index.to_numpy()


def mirror_draft(X: pd.DataFrame, y: np.ndarray):
    """Swap the teams (flip hero signs, flip the label). Doubling the data this way removes any side bias the model
    could learn; keep it only if the evaluation shows sides really are even."""
    Xm = X.copy()
    hero_cols = [c for c in X.columns if c.startswith("h_")]
    Xm[hero_cols] = -Xm[hero_cols]
    return pd.concat([X, Xm]), np.concatenate([y, 1 - y])


# ---------------------------------------------------------------- 2. live win probability

def timeline_features(matches: pd.DataFrame, stats: pd.DataFrame, include_final: bool = False) -> pd.DataFrame:
    """One row per (match, snapshot time). Team-0-minus-team-1 differences of net worth, kills, deaths, assists and
    level at that time, the time itself in minutes, and `win` (team 0 won). The extra sample taken just before the end
    is dropped unless `include_final`, because it effectively gives away the result."""
    s = stats.dropna(subset=["t", "team"]).copy()
    if not include_final:
        s = s[s["t"] % STATS_INTERVAL_S == 0]
    sign = np.where(s["team"] == 0, 1, -1)
    for c in ("net_worth", "kills", "deaths", "assists", "level"):
        s[c] = s[c].fillna(0) * sign
    g = s.groupby(["match_id", "t"])[["net_worth", "kills", "deaths", "assists", "level"]].sum().reset_index()
    g = g.rename(columns={c: f"{c}_diff" for c in ("net_worth", "kills", "deaths", "assists", "level")})
    tot = s.assign(abs_nw=s["net_worth"].abs()).groupby(["match_id", "t"])["abs_nw"].sum().reset_index(drop=True)
    g["net_worth_share"] = g["net_worth_diff"] / tot.replace(0, np.nan).to_numpy()
    g["minute"] = g["t"] / 60.0
    win = matches.set_index("match_id")["winning_team"]
    g["win"] = (g["match_id"].map(win) == 0).astype(int)
    return g.fillna(0)


# ---------------------------------------------------------------- 3. build recommender

def held_at(items: pd.DataFrame, t: float) -> pd.DataFrame:
    """Shop items bought at or before t and not yet sold at t."""
    return items[(items["game_time_s"] <= t) & ((items["sold_time_s"] == 0) | (items["sold_time_s"] > t))]


def purchase_events(
    matches: pd.DataFrame,
    players: pd.DataFrame,
    items: pd.DataFrame,
    stats: pd.DataFrame,
    catalog: pd.DataFrame,
    hero_ids: list[int] | None = None,
    min_tier: int = 2,
) -> pd.DataFrame:
    """One row per shop purchase (tier >= min_tier), with the context at that moment:

    own_items      items this player already held
    enemy_heroes   the six enemy hero ids
    enemy_items    every item the enemy team held at that moment (their builds so far)
    enemy_<cat>_spend   souls the enemy team had put into weapon / vitality / spirit items
    nw_diff        this player's team minus the enemy team in net worth at the last snapshot
    win            this player's team won

    `hero_ids` limits the rows to purchases by those heroes, which keeps the table small while exploring."""
    shop = items[items["is_shop"]].merge(catalog[["item_id", "category", "tier", "cost"]], on="item_id", how="left")
    shop = shop.sort_values(["match_id", "game_time_s"])
    win = matches.set_index("match_id")["winning_team"].to_dict()
    lineups = players.groupby(["match_id", "team"])["hero_id"].apply(list).to_dict()
    team_nw = stats.groupby(["match_id", "t", "team"])["net_worth"].sum().unstack("team").fillna(0)
    nw_by_match = {mid: (g.index.get_level_values("t").to_numpy(), g.get(0, 0).to_numpy(), g.get(1, 0).to_numpy())
                   for mid, g in team_nw.groupby(level="match_id")}
    cat_code = {"weapon": 0, "vitality": 1, "spirit": 2}
    hero_set = set(hero_ids) if hero_ids is not None else None
    rows = []
    for mid, mi in shop.groupby("match_id", sort=False):
        acc = mi["account_id"].to_numpy()
        team_arr = mi["team"].to_numpy()
        item = mi["item_id"].to_numpy()
        t_buy = mi["game_time_s"].to_numpy(dtype=float)
        sold = mi["sold_time_s"].fillna(0).to_numpy(dtype=float)
        tier = mi["tier"].fillna(0).to_numpy()
        cost = mi["cost"].fillna(0).to_numpy(dtype=float)
        cat = mi["category"].map(cat_code).fillna(-1).to_numpy()
        hero = mi["hero_id"].to_numpy()
        nw = nw_by_match.get(mid)
        w = win.get(mid)
        for k in np.flatnonzero(tier >= min_tier):
            if hero_set is not None and hero[k] not in hero_set:
                continue
            t, team = t_buy[k], team_arr[k]
            enemy = 1 - team
            alive = (t_buy <= t) & ((sold == 0) | (sold > t))
            mine = (acc == acc[k]) & (t_buy < t) & alive
            theirs = (team_arr == enemy) & alive
            spend = [float(cost[theirs & (cat == c)].sum()) for c in range(3)]
            nw_diff = 0.0
            if nw is not None:
                j = np.searchsorted(nw[0], t, side="right") - 1
                if j >= 0:
                    nw_diff = float((nw[1][j] - nw[2][j]) * (1 if team == 0 else -1))
            rows.append({
                "match_id": mid, "account_id": acc[k], "hero_id": hero[k], "team": team,
                "item_id": item[k], "t": t,
                "own_items": item[mine].tolist(),
                "enemy_heroes": lineups.get((mid, enemy), []),
                "ally_heroes": [h for h in lineups.get((mid, team), []) if h != hero[k]],
                "enemy_items": item[theirs].tolist(),
                "enemy_weapon_spend": spend[0],
                "enemy_vitality_spend": spend[1],
                "enemy_spirit_spend": spend[2],
                "nw_diff": nw_diff,
                "win": int(w == team),
            })
    return pd.DataFrame(rows)


def multi_hot(lists: pd.Series, vocab: list[int], prefix: str) -> pd.DataFrame:
    idx = {v: i for i, v in enumerate(vocab)}
    M = np.zeros((len(lists), len(vocab)), dtype=np.float32)
    for r, vals in enumerate(lists):
        for v in vals:
            j = idx.get(int(v))
            if j is not None:
                M[r, j] += 1
    return pd.DataFrame(M, columns=[f"{prefix}{v}" for v in vocab], index=lists.index)


# ---------------------------------------------------------------- 4 + 6. player profiles and rank estimate

PROFILE_COLS = [
    "kills_pm", "deaths_pm", "assists_pm", "souls_pm", "last_hits_pm", "denies_pm",
    "kda", "win_rate", "hero_entropy", "top_hero_share",
]


def badge_to_index(badge) -> np.ndarray:
    """Badge 116 (Eternus VI) -> a linear 0..71 scale: tier * 6 + (level - 1)."""
    b = np.asarray(badge, dtype=float)
    return (b // 10) * 6 + (b % 10) - 1


def index_to_badge(idx) -> np.ndarray:
    i = np.clip(np.rint(np.asarray(idx, dtype=float)), 0, 71)
    return (i // 6) * 10 + (i % 6) + 1


def _profile(h: pd.DataFrame) -> dict:
    mins = h["match_duration_s"].clip(lower=60).sum() / 60.0
    heroes = h["hero_id"].value_counts(normalize=True)
    return {
        "matches": len(h),
        "kills_pm": h["player_kills"].sum() / mins,
        "deaths_pm": h["player_deaths"].sum() / mins,
        "assists_pm": h["player_assists"].sum() / mins,
        "souls_pm": h["net_worth"].sum() / mins,
        "last_hits_pm": h["last_hits"].sum() / mins,
        "denies_pm": h["denies"].sum() / mins,
        "kda": (h["player_kills"].sum() + h["player_assists"].sum()) / max(1, h["player_deaths"].sum()),
        "win_rate": (h["player_match_outcome"] == 1).mean(),  # API_GUIDE: win is player_match_outcome == 1
        "hero_entropy": float(-(heroes * np.log(heroes)).sum()),
        "top_hero_share": float(heroes.iloc[0]) if len(heroes) else 0.0,
    }


def player_profiles(histories: pd.DataFrame, last_n: int = 50, min_matches: int = 10) -> pd.DataFrame:
    """One row per account from its most recent `last_n` Normal games: per-minute rates, KDA, win rate, hero pool."""
    h = histories[histories["game_mode"].isin([1, "Normal"])].sort_values("start_time")
    rows = []
    for acc, g in h.groupby("account_id"):
        g = g.tail(last_n)
        if len(g) >= min_matches:
            rows.append({"account_id": acc, **_profile(g)})
    return pd.DataFrame(rows).set_index("account_id")


def rank_dataset(histories: pd.DataFrame, window: int = 20, step: int = 5) -> pd.DataFrame:
    """Rows for the rank estimate: profile of `window` consecutive games (inputs) and the badge shown on the last
    of them (label, as `badge` and `badge_idx`). Only ranked games with a badge are used. `step` thins the overlapping
    windows. Split train / test by account, not by row, or the model just memorises players."""
    h = histories[histories["ranked_display_badge"].fillna(0) > 0].sort_values("start_time")
    rows = []
    for acc, g in h.groupby("account_id"):
        for end in range(window, len(g) + 1, step):
            w = g.iloc[end - window : end]
            badge = int(w["ranked_display_badge"].iloc[-1])
            rows.append({"account_id": acc, "start_time": int(w["start_time"].iloc[-1]), **_profile(w),
                         "badge": badge, "badge_idx": float(badge_to_index(badge))})
    return pd.DataFrame(rows)
