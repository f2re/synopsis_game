#!/usr/bin/env python3
"""Ranks world-style checkpoints from a filled scorecard.csv by veto first, never by one total score.

Veto 1: interior_isolation >= 4 on the archive and the hall.
Veto 2: cross_prompt_similarity must not clearly exceed the mean of checkpoint-200 and checkpoint-300.
Veto 3: prompt_adherence >= 4 on the workshop and the low radar angle.
Only checkpoints that pass all three are ordered, by style_fidelity, weather_transfer, seed_diversity (all higher is better).
"""
from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass
from pathlib import Path

MIN_SCORE = 4.0
SIMILARITY_MARGIN = 0.05
REFERENCE_CHECKPOINTS = ("checkpoint-200", "checkpoint-300")
BASELINE = "baseline"


@dataclass(frozen=True)
class Row:
    name: str
    values: dict[str, float]


def load_rows(path: Path) -> list[Row]:
    rows: list[Row] = []
    with path.open(newline="", encoding="utf-8") as handle:
        for record in csv.DictReader(handle):
            values = {key: float(value) for key, value in record.items() if key not in {"checkpoint", "notes"} and value != ""}
            rows.append(Row(record["checkpoint"], values))
    return rows


def vetoes(row: Row, similarity_limit: float) -> list[str]:
    """Names of the failed vetoes; a missing manual score counts as a failure."""
    failed: list[str] = []
    if not all(row.values.get(key, 0.0) >= MIN_SCORE for key in ("interior_isolation_archive", "interior_isolation_hall")):
        failed.append("interior_isolation")
    if row.values.get("cross_prompt_similarity", 1.0) > similarity_limit:
        failed.append("cross_prompt_similarity")
    if not all(row.values.get(key, 0.0) >= MIN_SCORE for key in ("prompt_adherence_workshop", "prompt_adherence_radar")):
        failed.append("prompt_adherence")
    return failed


def rank(rows: list[Row]) -> tuple[list[Row], dict[str, list[str]]]:
    checkpoints = [row for row in rows if row.name != BASELINE]
    reference = [row.values["cross_prompt_similarity"] for row in checkpoints
                 if row.name in REFERENCE_CHECKPOINTS and "cross_prompt_similarity" in row.values]
    limit = (sum(reference) / len(reference) + SIMILARITY_MARGIN) if reference else 1.0
    failures = {row.name: vetoes(row, limit) for row in checkpoints}
    passed = [row for row in checkpoints if not failures[row.name]]
    passed.sort(key=lambda row: tuple(-row.values.get(key, 0.0) for key in ("style_fidelity", "weather_transfer", "seed_diversity")))
    return passed, failures


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("scorecard", type=Path)
    args = parser.parse_args()
    passed, failures = rank(load_rows(args.scorecard))
    print("passed all vetoes, best first:", [row.name for row in passed] or "none")
    for name, failed in failures.items():
        if failed:
            print(f"  {name}: failed {', '.join(failed)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
