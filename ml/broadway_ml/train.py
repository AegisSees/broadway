"""Trains, evaluates and exports every model, then writes models/report.md.

    python -m broadway_ml.train                 # all five
    python -m broadway_ml.train draft live      # just these
    python -m broadway_ml.train --data data/tables --out models

Needs data/tables from `python -m broadway_ml.pull matches` (or `crawl`), and histories.parquet from
`python -m broadway_ml.pull histories` for playstyle and rank. A model whose data is missing is skipped, not failed.
"""
from __future__ import annotations

import argparse
import json
import time
import traceback
from pathlib import Path

import pandas as pd

from .flatten import load_tables
from .models import builds, draft, live, matchups, playstyle, rank, top_items
from .models.common import md_table

MODELS = {"draft": draft, "live": live, "builds": builds, "top_items": top_items, "matchups": matchups,
          "playstyle": playstyle, "rank": rank}
NEEDS_HISTORIES = {"playstyle", "rank"}


def _section(rep: dict) -> str:
    lines = [f"## {rep['name']}", ""]
    for k, v in rep.items():
        if k == "name":
            continue
        if isinstance(v, pd.DataFrame):
            lines += [f"**{k}**", "", md_table(v), ""]
        elif isinstance(v, pd.Series):
            lines += [f"**{k}**", "", md_table(v.to_frame()), ""]
        elif isinstance(v, dict):
            lines += [f"- **{k}:** " + ", ".join(f"{a}: {b:.4f}" if isinstance(b, float) else f"{a}: {b}" for a, b in v.items())]
        else:
            lines += [f"- **{k}:** {v:.4f}" if isinstance(v, float) else f"- **{k}:** {v}"]
    return "\n".join(lines) + "\n"


def _jsonable(rep: dict) -> dict:
    out = {}
    for k, v in rep.items():
        if isinstance(v, (pd.DataFrame, pd.Series)):
            out[k] = json.loads(v.to_json())
        elif isinstance(v, dict):
            out[k] = {str(a): b for a, b in v.items()}
        else:
            out[k] = v
    return out


def main(argv: list[str] | None = None) -> dict:
    ap = argparse.ArgumentParser(prog="python -m broadway_ml.train")
    ap.add_argument("models", nargs="*", help=f"any of {', '.join(MODELS)} (default: all)")
    ap.add_argument("--data", default="data/tables")
    ap.add_argument("--out", default="models")
    args = ap.parse_args(argv)
    unknown = set(args.models) - set(MODELS)
    if unknown:
        ap.error(f"unknown model(s): {', '.join(sorted(unknown))}")
    args.models = args.models or list(MODELS)
    tables = load_tables(args.data)
    hist_path = Path(args.data) / "histories.parquet"
    if hist_path.exists():
        tables["histories"] = pd.read_parquet(hist_path)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    reports, sections = {}, [f"# Broadway ML report\n\nTrained {time.strftime('%Y-%m-%d %H:%M')} on "
                             f"{len(tables['matches'])} matches"
                             f"{' and ' + str(tables['histories']['account_id'].nunique()) + ' player histories' if 'histories' in tables else ''}.\n"]
    for name in args.models:
        if name in NEEDS_HISTORIES and "histories" not in tables:
            sections.append(f"## {name}\n\nSkipped: no {hist_path}. Run `python -m broadway_ml.pull histories`.\n")
            continue
        if tables["matches"].empty and name not in NEEDS_HISTORIES:
            sections.append(f"## {name}\n\nSkipped: no match tables in {args.data}.\n")
            continue
        t0 = time.time()
        print(f"Training {name}...")
        try:
            rep = MODELS[name].train(tables, out)
            rep["seconds"] = round(time.time() - t0, 1)
            reports[name] = rep
            sections.append(_section(rep))
        except Exception:  # noqa: BLE001 - one model failing should not stop the others
            sections.append(f"## {name}\n\nFailed:\n\n```\n{traceback.format_exc()}\n```\n")
            print(traceback.format_exc())
    (out / "report.md").write_text("\n".join(sections))
    (out / "report.json").write_text(json.dumps({k: _jsonable(v) for k, v in reports.items()}, indent=1, default=str))
    print(f"Wrote {out / 'report.md'}")
    return reports


if __name__ == "__main__":
    main()
