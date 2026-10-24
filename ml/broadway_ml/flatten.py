"""Turns match metadata JSON into four flat tables (pandas DataFrames, saved as parquet).

    matches   one row per match       match_id, start_time, duration_s, winning_team, average_badge, ...
    players   one row per player      match_id, account_id, team, hero_id, kills, ..., win, badge, final stats
    items     one row per purchase    match_id, account_id, team, hero_id, item_id, game_time_s, sold_time_s, is_shop
    stats     one row per snapshot    match_id, account_id, team, t, net_worth, level, kills, deaths, assists

Team 0 is the Hidden King and team 1 the Archmother (API_GUIDE.md). The API has sent teams as "Team0", 0 and
"k_ECitadelLobbyTeam_Team0" in different places, so `team_index` accepts all of them. `stats` are sampled every 180 s
plus a final sample about a second before the end.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import pandas as pd

REPO = Path(__file__).resolve().parents[2]


def team_index(v: Any) -> int | None:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return int(v)
    s = str(v)
    if s.endswith("0"):
        return 0
    if s.endswith("1"):
        return 1
    return None


def unix_time(v: Any) -> int | None:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return int(v)
    try:
        return int(datetime.fromisoformat(str(v).replace("Z", "")).replace(tzinfo=timezone.utc).timestamp())
    except ValueError:
        return None


def shop_item_ids() -> set[int]:
    """Ids of real shop items (abilities are bought through the same list but are not in itemIds.json)."""
    ids = json.loads((REPO / "src/data/itemIds.json").read_text())
    return {int(k) for k in ids}


def item_catalog() -> pd.DataFrame:
    """item_id, name, category (weapon / vitality / spirit), tier, cost, from the site's own data files."""
    ids = json.loads((REPO / "src/data/itemIds.json").read_text())
    info = json.loads((REPO / "src/data/itemInfo.json").read_text())
    rows = []
    for k, name in ids.items():
        i = info.get(name, {})
        rows.append({"item_id": int(k), "name": name, "category": i.get("category"), "tier": i.get("tier"), "cost": i.get("cost")})
    return pd.DataFrame(rows)


def flatten_matches(raw: Iterable[dict], shop_ids: set[int] | None = None) -> dict[str, pd.DataFrame]:
    shop_ids = shop_ids if shop_ids is not None else shop_item_ids()
    matches, players, items, stats = [], [], [], []
    for m in raw:
        mid = m.get("match_id")
        info = m.get("match_info", m)  # some endpoints wrap the match in match_info
        win_team = team_index(info.get("winning_team"))
        matches.append({
            "match_id": mid,
            "start_time": unix_time(info.get("start_time")),
            "duration_s": info.get("duration_s"),
            "winning_team": win_team,
            "game_mode": str(info.get("game_mode")),
            "match_mode": str(info.get("match_mode")),
            "average_badge": info.get("average_badge"),
            "average_badge_team0": info.get("average_badge_team0"),
            "average_badge_team1": info.get("average_badge_team1"),
            "banned_hero_ids": list(info.get("banned_hero_ids") or []),
        })
        for p in info.get("players") or []:
            team = team_index(p.get("team"))
            acc, hero = p.get("account_id"), p.get("hero_id")
            row = {
                "match_id": mid, "account_id": acc, "team": team, "hero_id": hero,
                "player_slot": p.get("player_slot"), "kills": p.get("kills"), "deaths": p.get("deaths"),
                "assists": p.get("assists"), "net_worth": p.get("net_worth"), "last_hits": p.get("last_hits"),
                "denies": p.get("denies"), "level": p.get("player_level") or p.get("level"),
                "assigned_lane": p.get("assigned_lane"), "abandon_time_s": p.get("abandon_match_time_s"),
                "badge": p.get("player_rank_initial_display_rank"),
                "win": int(team == win_team) if team is not None and win_team is not None else None,
            }
            for k, v in (p.get("final_stats") or {}).items():
                row[f"fs_{k}"] = v
            players.append(row)
            for it in p.get("items") or []:
                iid = it.get("item_id")
                items.append({
                    "match_id": mid, "account_id": acc, "team": team, "hero_id": hero, "item_id": iid,
                    "game_time_s": it.get("game_time_s"), "sold_time_s": it.get("sold_time_s") or 0,
                    "is_shop": iid in shop_ids,
                })
            for s in p.get("stats") or []:
                stats.append({
                    "match_id": mid, "account_id": acc, "team": team, "t": s.get("time_stamp_s"),
                    "net_worth": s.get("net_worth"), "level": s.get("level"), "kills": s.get("kills"),
                    "deaths": s.get("deaths"), "assists": s.get("assists"),
                })
    return {
        "matches": pd.DataFrame(matches),
        "players": pd.DataFrame(players),
        "items": pd.DataFrame(items),
        "stats": pd.DataFrame(stats),
    }


def save_tables(tables: dict[str, pd.DataFrame], out_dir: str | Path, suffix: str = "") -> None:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    for name, df in tables.items():
        df.to_parquet(out / f"{name}{suffix}.parquet", index=False)


def load_tables(data_dir: str | Path = "data/tables") -> dict[str, pd.DataFrame]:
    """Reads every part file (matches.parquet, matches_0003.parquet, ...) into one DataFrame per table."""
    d = Path(data_dir)
    out = {}
    for name in ("matches", "players", "items", "stats"):
        parts = sorted(d.glob(f"{name}*.parquet"))
        out[name] = pd.concat([pd.read_parquet(p) for p in parts], ignore_index=True) if parts else pd.DataFrame()
    if not out["matches"].empty:
        out["matches"] = out["matches"].drop_duplicates("match_id")
        for name in ("players",):
            out[name] = out[name].drop_duplicates(["match_id", "account_id", "player_slot"])
    return out
