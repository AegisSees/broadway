"""Hero matchups: which heroes are best played into which, as top players play them.

For every hero pair (a, b) on opposite teams: how much more often a wins against b than a wins overall, in percentage
points. Top-bracket games are what we want, but there are few of them, so each top-bracket number is pulled toward the
all-ranks number in proportion to how little top data backs it (empirical Bayes shrinkage with strength `k` games).
With plenty of top games the top players' view wins; with few, the estimate falls back to all ranks instead of noise.

Export (table@1): rows[a][b] = {"d": delta in points, "n": top-bracket games}. bestInto() in ml/web/score.ts lists
the heroes with the largest d against a given enemy.
"""
from __future__ import annotations

from collections import defaultdict

import numpy as np
import pandas as pd

from .. import export as ex
from .top_items import top_bracket


def pair_counts(matches: pd.DataFrame, players: pd.DataFrame):
    """(games, wins) per (a, b) where a faced b, and (games, wins) per hero."""
    win = matches.set_index("match_id")["winning_team"].to_dict()
    pg, pw = defaultdict(int), defaultdict(int)
    hg, hw = defaultdict(int), defaultdict(int)
    p = players[players["match_id"].isin(win)].dropna(subset=["hero_id", "team"])
    for mid, g in p.groupby("match_id"):
        w = win[mid]
        t0 = g.loc[g.team == 0, "hero_id"].astype(int).tolist()
        t1 = g.loc[g.team == 1, "hero_id"].astype(int).tolist()
        if len(t0) != 6 or len(t1) != 6:
            continue
        for mine, theirs, won in ((t0, t1, w == 0), (t1, t0, w == 1)):
            for a in mine:
                hg[a] += 1
                hw[a] += won
                for b in theirs:
                    pg[(a, b)] += 1
                    pw[(a, b)] += won
    return pg, pw, hg, hw


def train(tables: dict, out_dir, k: float = 100.0, min_top_matches: int = 2000) -> dict:
    m, players = tables["matches"], tables["players"]
    ag, aw, ahg, ahw = pair_counts(m, players)
    brackets = top_bracket(m)
    frac, cut, ids = next(((f, c, i) for f, c, i in brackets if len(i) >= min_top_matches), brackets[-1])
    tg, tw, thg, thw = pair_counts(m[m["match_id"].isin(ids)], players)

    rows: dict[str, dict] = defaultdict(dict)
    deltas = []
    for (a, b), n_all in ag.items():
        wr_all = (aw[(a, b)] + 5) / (n_all + 10)
        base_all = (ahw[a] + 5) / (ahg[a] + 10)
        n_top = tg.get((a, b), 0)
        # Shrink the top-bracket pair rate toward the all-ranks pair rate.
        wr = (tw.get((a, b), 0) + k * wr_all) / (n_top + k)
        base = (thw.get(a, 0) + k * base_all) / (thg.get(a, 0) + k)
        d = 100.0 * (wr - base)
        rows[str(a)][str(b)] = {"d": round(d, 2), "n": int(n_top)}
        deltas.append({"hero": a, "vs": b, "delta_pts": d, "top_games": n_top, "all_games": n_all})
    df = pd.DataFrame(deltas)
    path = ex.export_table(
        dict(rows), ["hero_id", "enemy_hero_id"], f"{out_dir}/matchups.json", name="hero-matchups",
        metrics={"bracket_top_fraction": frac, "min_average_badge": cut, "top_matches": len(ids), "shrinkage_k": k},
        notes="d = win-rate points hero gains against this enemy vs its own overall rate, top bracket shrunk toward all ranks",
    )
    reliable = df[df["top_games"] >= 50]
    best = reliable.sort_values("delta_pts", ascending=False).head(10)
    return {
        "name": "matchups",
        "export": str(path),
        "bracket": f"top {int(frac * 100)}% of games (average badge >= {cut:.0f}), {len(ids)} matches",
        "pairs": int(len(df)),
        "pairs_with_50_top_games": int(len(reliable)),
        "median_top_games_per_pair": float(np.median(df["top_games"])) if len(df) else 0.0,
        "strongest_matchups": best.set_index(["hero", "vs"])[["delta_pts", "top_games"]].round(2),
    }
