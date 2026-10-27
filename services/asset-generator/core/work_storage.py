from __future__ import annotations

import json
import hashlib
import re
import shutil
import uuid
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parents[1]
WORK_DIR = ROOT_DIR.parents[1] / "assets/work"


class WorkStorage:
    def __init__(self, asset_id: str, base_dir: Path | None = None):
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", asset_id) or ".." in asset_id:
            raise ValueError("Invalid asset ID")
        self.asset_id = asset_id
        self.root = (base_dir or WORK_DIR) / asset_id
        self.raw_dir = self.root / "raw"
        self.selected_dir = self.root / "selected"
        self.refined_dir = self.root / "refined"
        self.review_dir = self.root / "review"
        self.approved_dir = self.root / "approved"

        for d in (self.raw_dir, self.selected_dir, self.refined_dir, self.review_dir, self.approved_dir):
            d.mkdir(parents=True, exist_ok=True)

    def save_spec(self, spec: dict[str, Any]) -> Path:
        p = self.root / "spec.json"
        p.write_text(json.dumps(spec, indent=2, ensure_ascii=False), encoding="utf-8")
        return p

    def save_prompt(self, pos_prompt: str, neg_prompt: str, meta: dict[str, Any] | None = None) -> Path:
        p = self.root / "prompt.json"
        data = {
            "positive_prompt": pos_prompt,
            "negative_prompt": neg_prompt,
            "metadata": meta or {},
        }
        p.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        return p

    def get_raw_path(self, candidate_index: int) -> Path:
        return self.raw_dir / f"candidate-{candidate_index:02d}.png"

    def list_raw_candidates(self) -> list[Path]:
        return sorted(self.raw_dir.glob("candidate-*.png"))

    def next_candidate_index(self) -> int:
        indices = [int(p.stem.split("-")[-1]) for p in self.list_raw_candidates()
                   if p.stem.split("-")[-1].isdigit()]
        return max(indices, default=0) + 1

    def resolve_candidate(self, candidate_id: str | int) -> Path:
        text = str(candidate_id)
        if text.isdigit():
            path = self.get_raw_path(int(text))
        elif re.fullmatch(r"candidate-\d+\.png", text):
            path = self.raw_dir / text
        else:
            raise ValueError("Candidate must be a candidate-NN.png filename")
        if path.resolve().parent != self.raw_dir.resolve():
            raise ValueError("Candidate resolves outside its raw directory")
        return path

    def record_generation(self, spec: dict[str, Any], prompt: str, negative: str,
                          metadata: dict[str, Any], candidates: list[Path],
                          seeds: list[int], backend: str, status: str) -> None:
        record = {
            "run_id": uuid.uuid4().hex, "asset_id": self.asset_id, "spec": spec,
            "prompt": prompt, "negative_prompt": negative, "metadata": metadata,
            "backend": backend, "status": status,
            "candidates": [{"file": p.name, "seed": seed,
                            "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}
                           for p, seed in zip(candidates, seeds)],
        }
        (self.root / f"generation-{record['run_id']}.json").write_text(
            json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8")
        (self.root / "latest-generation.json").write_text(
            json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8")

    def latest_raw_candidates(self) -> list[Path]:
        latest = self.root / "latest-generation.json"
        if not latest.is_file():
            return self.list_raw_candidates()
        record = json.loads(latest.read_text(encoding="utf-8"))
        if record.get("status") != "generated_raw":
            return []
        return [self.raw_dir / entry["file"] for entry in record.get("candidates", [])
                if self.resolve_candidate(entry["file"]).is_file()]

    def select_candidate(self, candidate_path: Path) -> Path:
        target = self.selected_dir / f"selected_{candidate_path.name}"
        if target.exists() and target.read_bytes() != candidate_path.read_bytes():
            raise ValueError("Selected candidate already exists with different content")
        if not target.exists():
            shutil.copy2(candidate_path, target)
        (self.root / "selection.json").write_text(
            json.dumps({"file": target.name}, ensure_ascii=False), encoding="utf-8")
        return target

    def selected_candidate(self) -> Path | None:
        selection = self.root / "selection.json"
        if selection.is_file():
            name = json.loads(selection.read_text(encoding="utf-8")).get("file", "")
            if not re.fullmatch(r"selected_candidate-\d+\.png", name):
                raise ValueError("Invalid selection")
            path = self.selected_dir / name
            if path.resolve().parent != self.selected_dir.resolve():
                raise ValueError("Selection resolves outside its directory")
            return path
        legacy = sorted(self.selected_dir.glob("selected_candidate-*.png"))
        return legacy[-1] if legacy else None

    def creator_for_candidate(self, path: Path) -> str | None:
        name = path.name.removeprefix("selected_")
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        for record_path in self.root.glob("generation-*.json"):
            record = json.loads(record_path.read_text(encoding="utf-8"))
            if any(c.get("file") == name and c.get("sha256") == digest for c in record.get("candidates", [])):
                return record.get("metadata", {}).get("creator_id")
        return None

    def get_refined_path(self, suffix: str = "refined") -> Path:
        return self.refined_dir / f"{self.asset_id}_{suffix}.png"

    def save_review_report(self, report: dict[str, Any]) -> Path:
        p = self.review_dir / "report.json"
        if p.is_file():
            shutil.copy2(p, self.review_dir / f"report-{uuid.uuid4().hex}.json")
        p.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        return p

    def approve_asset(self, source_path: Path) -> Path:
        target = self.approved_dir / f"{self.asset_id}.png"
        shutil.copy2(source_path, target)
        return target
