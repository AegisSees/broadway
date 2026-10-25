"""Pulls a training set from the Deadlock API into data/tables/*.parquet.

Run from the ml/ folder on a computer with normal internet access:

    python -m broadway_ml.pull probe                      # 3 tiny calls; saves shapes to data/probe/ so we can check them
    python -m broadway_ml.pull matches --days 14          # bulk match metadata, ranked Normal games, paged by match id
    python -m broadway_ml.pull matches --top-up           # later runs: only matches newer than the newest saved
    python -m broadway_ml.pull crawl --seed-leaderboard Europe --players 500
                                                          # fallback: leaderboard -> match histories -> metadata by id
    python -m broadway_ml.pull histories --players 3000   # per-player match history (playstyle clusters, rank estimate)

Everything is cached under data/cache, so stopping and re-running picks up where it left off.

BULK_PARAMS were checked against a live response on 2026-10-25 (`probe`). The bulk endpoint allows 30 requests per
minute per IP and a full match with items and stats is about 0.5 MB of JSON, so `matches` spreads its requests over the
window (one slice per hour by default, `--per-request` matches each) instead of paging from the start, which would only
cover the first few hours: Deadlock plays roughly 150 matches a minute. Bulk responses are written straight to parquet
(one part file per slice, so a stopped pull resumes) rather than to the JSON cache, which would need tens of GB.
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import pandas as pd
import requests

from .client import DeadlockApi, chunks
from .flatten import flatten_matches, save_tables

DAY = 86400
OUT = Path("data/tables")

BULK_PARAMS = {
    "game_mode": "normal",
    "include_info": True,
    "include_player_info": True,
    "include_player_items": True,
    "include_player_stats": True,
    "include_player_final_stats": True,
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
    OUT.mkdir(parents=True, exist_ok=True)
    start = now - args.days * DAY
    if args.top_up and list(OUT.glob("matches_*.parquet")):
        start = int(pd.concat([pd.read_parquet(p, columns=["start_time"]) for p in OUT.glob("matches_*.parquet")])["start_time"].max()) + 1
        print(f"Topping up from {time.strftime('%Y-%m-%d %H:%M', time.gmtime(start))} UTC")
    step = int(args.slice_hours * 3600)
    slices = list(range(start, now - 600, step))
    total = 0
    for i, t0 in enumerate(slices):
        part = OUT / f"matches_{t0}.parquet"
        if part.exists():
            continue
        params = {
            **BULK_PARAMS,
            "min_unix_timestamp": t0,
            "max_unix_timestamp": min(t0 + step, now),
            "min_average_badge": args.min_badge or None,
            "order_by": "match_id",
            "order_direction": "asc",
            "limit": args.per_request,
        }
        rows = as_match_list(api.get("/v1/matches/metadata", params, use_cache=False))
        kept = [m for m in rows if keep_match(m)]
        tables = flatten_matches(kept)
        save_tables(tables, OUT, suffix=f"_{t0}")
        total += len(kept)
        print(f"slice {i + 1}/{len(slices)} {time.strftime('%m-%d %H:%M', time.gmtime(t0))}: {len(kept)} kept, {total} total")


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
    players = pd.concat([pd.read_parquet(p, columns=["account_id", "badge"]) for p in sorted(OUT.glob("players*.parquet"))])
    players = players[players["account_id"].fillna(0) > 0]
    # Ranked players first: the rank estimate needs 20+ ranked games with a badge, and most games are unranked.
    order = players.assign(ranked=players["badge"].fillna(0) > 0).groupby("account_id").agg(
        ranked=("ranked", "sum"), games=("ranked", "size")).sort_values(["ranked", "games"], ascending=False)
    accounts = [int(a) for a in order.index[: args.players]]
    rows, protected = [], 0
    for i, acc in enumerate(accounts):
        try:
            hist = api.get(f"/v1/players/{acc}/match-history") or []
        except requests.HTTPError as e:
            if e.response is None or e.response.status_code != 403:
                raise
            protected += 1  # "The requested user is protected." (the player opted out)
            continue
        rows += [r for r in hist if r.get("game_mode") in (1, "Normal")]
        if i % 50 == 0:
            print(f"{i}/{len(accounts)} players")
    pd.DataFrame(rows).to_parquet(OUT / "histories.parquet", index=False)
    print(f"Saved {len(rows)} history rows for {len(accounts) - protected} players ({protected} protected, skipped)")


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="python -m broadway_ml.pull")
    ap.add_argument("--interval", type=float, default=2.0, help="seconds between API calls (default 2)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("probe")
    m = sub.add_parser("matches")
    m.add_argument("--days", type=int, default=14)
    m.add_argument("--min-badge", type=int, default=0)
    m.add_argument("--per-request", type=int, default=150, help="matches per slice (default 150)")
    m.add_argument("--slice-hours", type=float, default=1.0, help="one request per this many hours (default 1)")
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
