"""Pulls a training set from the Deadlock API into data/tables/*.parquet.

Run from the ml/ folder on a computer with normal internet access:

    python -m broadway_ml.pull probe                      # 3 tiny calls; saves shapes to data/probe/ so we can check them
    python -m broadway_ml.pull matches --days 14          # bulk match metadata, ranked Normal games, paged by match id
    python -m broadway_ml.pull matches --top-up           # later runs: only matches newer than the newest saved
    python -m broadway_ml.pull crawl --seed-leaderboard Europe --players 500
                                                          # fallback: leaderboard -> match histories -> metadata by id
    python -m broadway_ml.pull histories --players 3000   # per-player match history (playstyle clusters, rank estimate)

Everything is cached under data/cache, so stopping and re-running picks up where it left off.

The bulk endpoint's parameter names below come from the API docs as we remember them and have NOT been checked against
a live response yet (this container cannot reach the API). `probe` exists to check them first: if it reports a 400 or
an empty list, read https://api.deadlock-api.com/docs and fix BULK_PARAMS, or use `crawl`, which only uses endpoints
the site already calls successfully.
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import pandas as pd

from .client import DeadlockApi, chunks
from .flatten import flatten_matches, save_tables

DAY = 86400
OUT = Path("data/tables")

# Unverified: see the module docstring.
BULK_PARAMS = {
    "include_info": True,
    "include_player_info": True,
    "include_player_items": True,
    "include_player_stats": True,
    "include_objectives": False,
    "include_mid_boss": False,
    "include_player_death_details": False,
}


def as_match_list(data) -> list[dict]:
    if data is None:
        return []
    if isinstance(data, dict):
        for key in ("matches", "data", "items"):
            if isinstance(data.get(key), list):
                return data[key]
        return [data]
    return list(data)


def keep_match(m: dict) -> bool:
    info = m.get("match_info", m)
    if str(info.get("game_mode", "Normal")).lower() not in ("normal", "1", "k_ecitadelgamemode_normal"):
        return False
    if info.get("not_scored"):
        return False
    return len(info.get("players") or []) == 12


def cmd_probe(api: DeadlockApi, args) -> None:
    out = Path("data/probe")
    out.mkdir(parents=True, exist_ok=True)
    now = int(time.time())
    tries = {
        "bulk-metadata": ("/v1/matches/metadata", {**BULK_PARAMS, "min_unix_timestamp": now - DAY, "limit": 5}),
        "leaderboard": ("/v1/leaderboard/Europe", None),
        "active": ("/v1/matches/active", None),
    }
    for name, (path, params) in tries.items():
        try:
            data = api.get(path, params, use_cache=False)
            rows = as_match_list(data) if name == "bulk-metadata" else data
            (out / f"{name}.json").write_text(json.dumps(rows[:2] if isinstance(rows, list) else rows, indent=1)[:200_000])
            n = len(rows) if isinstance(rows, list) else "object"
            print(f"OK   {name}: {n} rows -> data/probe/{name}.json")
            if name == "bulk-metadata" and rows:
                m = rows[0].get("match_info", rows[0])
                p = (m.get("players") or [{}])[0]
                print("     match keys:", sorted(m.keys()))
                print("     player keys:", sorted(p.keys()))
                print("     has items:", bool(p.get("items")), " has stats:", bool(p.get("stats")))
        except Exception as e:  # noqa: BLE001 - a probe reports everything
            print(f"FAIL {name}: {e}")


def write_part(batch: list[dict], part: int) -> None:
    tables = flatten_matches(batch)
    save_tables(tables, OUT, suffix=f"_{part:04d}")
    print(f"  part {part}: {len(tables['matches'])} matches, {len(tables['items'])} purchases")


def cmd_matches(api: DeadlockApi, args) -> None:
    now = int(time.time())
    params = {
        **BULK_PARAMS,
        "min_unix_timestamp": now - args.days * DAY,
        "max_unix_timestamp": now,
        "min_average_badge": args.min_badge,
        "order_by": "match_id",
        "order_direction": "asc",
        "limit": args.per_request,
    }
    cursor, batch, part, total = None, [], len(list(OUT.glob("matches_*.parquet"))), 0
    if args.top_up and part:
        cursor = int(pd.concat([pd.read_parquet(p, columns=["match_id"]) for p in OUT.glob("matches_*.parquet")])["match_id"].max()) + 1
        print(f"Topping up from match id {cursor}")
    while total < args.max_matches:
        rows = as_match_list(api.get("/v1/matches/metadata", {**params, "min_match_id": cursor}))
        if not rows:
            break
        kept = [m for m in rows if keep_match(m)]
        batch += kept
        total += len(kept)
        cursor = max(int(m["match_id"]) for m in rows) + 1
        print(f"{total} matches (cursor {cursor}, {api.calls} calls)")
        if len(batch) >= args.part_size:
            write_part(batch, part)
            batch, part = [], part + 1
    if batch:
        write_part(batch, part)


def fetch_by_ids(api: DeadlockApi, match_ids: list[int], part_size: int) -> None:
    part = len(list(OUT.glob("matches_*.parquet")))
    batch: list[dict] = []
    for ids in chunks(match_ids, 20):
        rows = as_match_list(api.get("/v1/matches/metadata", {"match_ids": ids, **BULK_PARAMS}))
        batch += [m for m in rows if keep_match(m)]
        if len(batch) >= part_size:
            write_part(batch, part)
            batch, part = [], part + 1
    if batch:
        write_part(batch, part)


def leaderboard_accounts(api: DeadlockApi, region: str, limit: int) -> list[int]:
    lb = api.get(f"/v1/leaderboard/{region}") or {}
    entries = lb if isinstance(lb, list) else lb.get("entries", [])
    ids = []
    for e in entries:
        cands = e.get("possible_account_ids") or ([e["account_id"]] if e.get("account_id") else [])
        if 0 < len(cands) <= 3:  # skip names shared by many accounts (see "Names are not accounts")
            ids += cands
    return ids[:limit]


def cmd_crawl(api: DeadlockApi, args) -> None:
    accounts = leaderboard_accounts(api, args.seed_leaderboard, args.players)
    since = int(time.time()) - args.days * DAY
    match_ids: set[int] = set()
    for i, acc in enumerate(accounts):
        for row in api.get(f"/v1/players/{acc}/match-history") or []:
            if row.get("start_time", 0) >= since and row.get("game_mode") in (1, "Normal"):
                match_ids.add(int(row["match_id"]))
        if i % 25 == 0:
            print(f"{i}/{len(accounts)} players, {len(match_ids)} match ids")
    print(f"Fetching {len(match_ids)} matches")
    fetch_by_ids(api, sorted(match_ids), args.part_size)


def cmd_histories(api: DeadlockApi, args) -> None:
    players = pd.concat([pd.read_parquet(p) for p in sorted(OUT.glob("players*.parquet"))])
    counts = players["account_id"].value_counts()
    accounts = [int(a) for a in counts.index[: args.players] if a]
    rows = []
    for i, acc in enumerate(accounts):
        rows += api.get(f"/v1/players/{acc}/match-history") or []
        if i % 50 == 0:
            print(f"{i}/{len(accounts)} players")
    pd.DataFrame(rows).to_parquet(OUT / "histories.parquet", index=False)
    print(f"Saved {len(rows)} history rows for {len(accounts)} players")


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="python -m broadway_ml.pull")
    ap.add_argument("--interval", type=float, default=2.0, help="seconds between API calls (default 2)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("probe")
    m = sub.add_parser("matches")
    m.add_argument("--days", type=int, default=14)
    m.add_argument("--min-badge", type=int, default=0)
    m.add_argument("--per-request", type=int, default=100)
    m.add_argument("--max-matches", type=int, default=50_000)
    m.add_argument("--part-size", type=int, default=2_000)
    m.add_argument("--top-up", action="store_true", help="only fetch matches newer than the newest one already saved")
    c = sub.add_parser("crawl")
    c.add_argument("--seed-leaderboard", default="Europe")
    c.add_argument("--players", type=int, default=500)
    c.add_argument("--days", type=int, default=14)
    c.add_argument("--part-size", type=int, default=2_000)
    h = sub.add_parser("histories")
    h.add_argument("--players", type=int, default=3_000)
    args = ap.parse_args(argv)
    api = DeadlockApi(min_interval_s=args.interval)
    {"probe": cmd_probe, "matches": cmd_matches, "crawl": cmd_crawl, "histories": cmd_histories}[args.cmd](api, args)
    print(f"Done, {api.calls} API calls.")


if __name__ == "__main__":
    main()
