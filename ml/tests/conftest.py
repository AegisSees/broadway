"""Test fixtures. `fake_matches` makes random but well-formed match JSON so the pipeline can be exercised end to end
without the API. It is for tests only: nothing trained on it means anything."""
import json
import sys
from pathlib import Path

import numpy as np
import pytest

ML = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML))
REPO = ML.parent

HEROES = list(range(1, 21))


def fake_match(rng, mid, shop_ids):
    heroes = rng.choice(HEROES, 12, replace=False)
    # hero 1 is "strong" so a draft model has something to find
    edge = (1 in heroes[:6]) - (1 in heroes[6:])
    win = 0 if rng.random() < 0.5 + 0.2 * edge else 1
    players = []
    for slot, h in enumerate(heroes):
        team = 0 if slot < 6 else 1
        boost = 1.15 if team == win else 1.0
        stats, nw = [], 0
        for t in list(range(180, 1800, 180)) + [1799]:
            nw = int(t * 15 * boost * rng.uniform(0.8, 1.2))
            stats.append({"time_stamp_s": t, "net_worth": nw, "level": t // 60, "kills": t // 300, "deaths": 1, "assists": 2})
        items = [{"game_time_s": int(60 + 120 * k), "item_id": int(rng.choice(shop_ids)), "sold_time_s": 0} for k in range(8)]
        items.append({"game_time_s": 30, "item_id": 1282689113})  # an ability purchase, not a shop item
        players.append({"account_id": 1000 + mid * 12 + slot, "hero_id": int(h), "player_slot": slot,
                        "team": f"Team{team}", "kills": 5, "deaths": 4, "assists": 7, "net_worth": nw,
                        "last_hits": 100, "denies": 5, "player_level": 30, "items": items, "stats": stats,
                        "player_rank_initial_display_rank": 74})
    return {"match_id": mid, "start_time": 1_790_000_000 + mid * 600, "winning_team": f"Team{win}", "duration_s": 1800,
            "game_mode": "Normal", "match_mode": "Ranked", "average_badge": 74, "players": players}


@pytest.fixture(scope="session")
def shop_ids():
    return sorted(int(k) for k in json.loads((REPO / "src/data/itemIds.json").read_text()))


@pytest.fixture(scope="session")
def fake_matches(shop_ids):
    rng = np.random.default_rng(7)
    return [fake_match(rng, mid, shop_ids) for mid in range(1, 801)]


@pytest.fixture(scope="session")
def sample_match():
    return json.loads((REPO / "api-samples/match-metadata.json").read_text())
