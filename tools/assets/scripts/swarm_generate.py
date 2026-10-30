#!/usr/bin/env python3
"""Swarm generation runner for 26063: Позывной «Синоптик».

Executes structured asset production lifecycle through synopsis-assets MCP:
1. asset_spec
2. generate_candidates
3. rank_candidates
4. select_candidate
5. refine_candidate
6. check_asset_contract
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from typing import Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("swarm-generator")

DEFAULT_MCP_URL = "http://10.7.88.12:9200/mcp"
REPO_ROOT = Path(__file__).resolve().parents[3]

SPEC_PATH = REPO_ROOT / "assets/source/kn01_level1.image-spec.json"

GROUPS = {
    "keyframes": ["KF-01", "KF-02", "KF-03", "KF-04", "KF-05", "KF-06", "KF-07"],
    "hub_core": ["HUB-L0-SKY-DAY", "HUB-L2-HORIZON", "HUB-L6-GROUND", "BLD-SYNOPTIC-DAY", "BLD-RADAR-DAY", "PROP-STEVENSON"],
    "bld_night": [
        "BLD-SYNOPTIC-NIGHT",
        "BLD-RADAR-NIGHT",
        "BLD-CARTOGRAPHY-NIGHT",
        "BLD-ARCHIVE-NIGHT",
        "BLD-AEROLOGY-NIGHT",
        "BLD-TOURNAMENT-NIGHT",
    ],
    "props_core": [
        "PROP-LAMP",
        "PROP-LAMP-GLOW",
        "PROP-BENCH",
        "PROP-ANEMOMETER",
        "PROP-FLAG",
        "PROP-RADAR-ANTENNA",
        "PROP-BEACON-LIGHT",
        "PROP-SIGNPOST",
        "PROP-BICYCLE",
    ],
    "room_codepost": [
        "ROOM-CODEPOST-SHELL",
        "ROOM-WINDOW-VIEW",
        "ROOM-WINDOW-RAIN",
        "ROOM-TELETYPE",
        "ROOM-BAROGRAPH",
        "ROOM-CLOCK",
        "ROOM-CLOCK-HANDS",
        "ROOM-LAMP",
        "ROOM-LAMP-GLOW",
    ],
    "fauna": [
        "TIT-M1",
        "TIT-M2",
        "SPARROW-M1",
        "GULL-M1",
        "MALLARD-M1",
        "SQUIRREL-M1",
        "SQUIRREL-M2",
        "CAT-M1",
        "CAT-M2",
        "PIGEON-M1",
        "BULLFINCH-M1",
        "FLOCK-FAR",
    ],
    "npcs": [
        "MENTOR-PORTRAIT",
        "MENTOR-M1",
        "TECH-M1",
        "LAB-M1",
    ],
    "ui_icons": [
        "ICON-JOURNAL", "ICON-DISCOVERIES", "ICON-PERSON", "ICON-GEAR",
        "ICON-SOUND-ON", "ICON-SOUND-OFF", "ICON-MOON", "ICON-SUN", "ICON-DAWN",
        "ICON-LOCK", "ICON-UNLOCK", "ICON-PAUSE", "ICON-BOOK", "ICON-CHECK",
        "ICON-CROSS", "ICON-ARROW-LEFT", "ICON-ARROW-RIGHT", "ICON-STAR",
        "ICON-CLOCK", "ICON-TAPE", "ICON-STATION", "ICON-THERMOMETER",
        "ICON-BAROMETER", "ICON-VANE", "ICON-CLOUD", "ICON-MODE-MENTOR",
        "ICON-MODE-SOLO", "ICON-MODE-BLITZ",
    ],
    "ui_panels": [
        "UI-PANEL-DARK", "UI-PANEL-RAISED", "UI-DIALOG", "UI-PAPER-SHEET",
        "UI-PAPER-PERF", "UI-CLIPBOARD", "UI-TAPE", "UI-TAPE-END",
        "UI-BTN-PRIMARY", "UI-BTN-SECONDARY", "UI-BTN-GHOST", "UI-KEY",
        "UI-CHOICE-CARD", "UI-LAMP", "UI-STAMP-RECT", "UI-STAMP-ROUND",
        "UI-BUBBLE", "UI-TAB", "UI-PORTRAIT-FRAME", "UI-PASSEPARTOUT",
        "UI-BOOK-SPREAD", "UI-JOURNAL-SPREAD", "UI-USER-CARD", "UI-LEVEL-NODE",
        "UI-CERTIFICATE-PAPER", "UI-ENVELOPE",
    ],
    "brand_rewards": [
        "BRAND-MARK-26063", "BRAND-EMBLEM-64", "BRAND-EMBLEM-32", "TITLE-MID", "TITLE-FG",
        "REW-PENCIL-32", "REW-BADGE-THERMO-32", "REW-BADGE-BARO-32", "REW-BADGE-VANE-32",
        "REW-LAMP-32", "REW-TOKEN-32", "REW-CERTIFICATE-32", "REW-LAMP-DESK-M2",
        "FX-RIPPLE", "FX-STAMP-TOOL", "FX-PENCIL-CIRCLE", "FX-VALUE-TRAIL", "FX-WINDOW-GLOW",
    ],
}


class MCPClient:
    def __init__(self, base_url: str = DEFAULT_MCP_URL):
        self.base_url = base_url
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        self.session_id: str | None = None
        self._msg_id = 0

    def _next_id(self) -> int:
        self._msg_id += 1
        return self._msg_id

    def initialize(self) -> str:
        req_data = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "synopsis-swarm", "version": "1.0"},
            },
        }
        headers = {
            "Content-Type": "application/json",
            "Accept": "text/event-stream, application/json",
        }
        req = urllib.request.Request(self.base_url, data=json.dumps(req_data).encode("utf-8"), headers=headers)
        with self.opener.open(req, timeout=30) as resp:
            self.session_id = resp.headers.get("mcp-session-id")
            if not self.session_id:
                raise RuntimeError("No mcp-session-id returned by server")
            log.info("Initialized MCP session: %s", self.session_id)
            return self.session_id

    def call_tool(self, name: str, arguments: dict[str, Any], timeout: int = 300, max_retries: int = 3) -> dict[str, Any]:
        for attempt in range(1, max_retries + 1):
            if not self.session_id:
                self.initialize()
            req_data = {
                "jsonrpc": "2.0",
                "id": self._next_id(),
                "method": "tools/call",
                "params": {"name": name, "arguments": arguments},
            }
            headers = {
                "Content-Type": "application/json",
                "Accept": "text/event-stream, application/json",
                "mcp-session-id": self.session_id,
            }
            req = urllib.request.Request(self.base_url, data=json.dumps(req_data).encode("utf-8"), headers=headers)
            try:
                with self.opener.open(req, timeout=timeout) as resp:
                    raw_lines = resp.read().decode("utf-8").splitlines()
                    for line in raw_lines:
                        if line.startswith("data: "):
                            payload = json.loads(line[6:])
                            if payload.get("error"):
                                raise RuntimeError(f"MCP JSON-RPC error ({name}): {payload['error']}")
                            res = payload.get("result", {})
                            if res.get("isError"):
                                content = res.get("content", [])
                                err_text = content[0]["text"] if content and "text" in content[0] else str(res)
                                raise RuntimeError(f"MCP tool error ({name}): {err_text}")
                            content = res.get("content", [])
                            if content and "text" in content[0]:
                                try:
                                    return json.loads(content[0]["text"])
                                except json.JSONDecodeError:
                                    return {"text": content[0]["text"]}
                            return res
                raise RuntimeError(f"No valid response received for tool {name}")
            except Exception as exc:
                log.warning("Tool call %s attempt %d/%d failed: %s", name, attempt, max_retries, exc)
                self.session_id = None
                if attempt == max_retries:
                    raise
                time.sleep(4)


def process_asset(client: MCPClient, asset_id: str, count: int = 2, seed: int = 26063, backend: str = "auto") -> dict[str, Any]:
    log.info("=== Processing asset [%s] ===", asset_id)
    summary: dict[str, Any] = {"asset_id": asset_id, "start_time": time.time()}

    # 1. Spec
    log.info("[%s] Fetching asset_spec...", asset_id)
    spec = client.call_tool("asset_spec", {"asset_id": asset_id})
    summary["asset_class"] = spec.get("asset_class")
    summary["size"] = spec.get("size")

    # 2. Generate
    log.info("[%s] Generating %d candidates (backend=%s)...", asset_id, count, backend)
    gen = client.call_tool("generate_candidates", {
        "asset_id": asset_id,
        "count": count,
        "seed": seed,
        "backend": backend,
    }, timeout=600)
    summary["generation"] = gen
    log.info("[%s] Generated %d raw candidates.", asset_id, gen.get("count_generated", 0))

    # 3. Rank
    log.info("[%s] Ranking candidates...", asset_id)
    rank = client.call_tool("rank_candidates", {"asset_id": asset_id})
    summary["ranking"] = rank
    rec_candidate = rank.get("recommended_candidate")
    if not rec_candidate:
        log.warning("[%s] No recommended candidate from ranking!", asset_id)
        return summary
    log.info("[%s] Recommended candidate: %s", asset_id, rec_candidate)

    # 4. Select
    log.info("[%s] Selecting candidate %s...", asset_id, rec_candidate)
    sel = client.call_tool("select_candidate", {"asset_id": asset_id, "candidate_id": rec_candidate})
    summary["selection"] = sel

    # 5. Refine
    log.info("[%s] Refining candidate into pixel art...", asset_id)
    ref = client.call_tool("refine_candidate", {"asset_id": asset_id})
    summary["refinement"] = ref
    metrics = ref.get("metrics", {})
    log.info("[%s] Refinement complete. Size: %s, Colors: %s/%s, Binary alpha: %s",
             asset_id, metrics.get("size"), metrics.get("colors_used"), metrics.get("max_colors"), metrics.get("is_binary_alpha"))

    # 6. Check contract
    log.info("[%s] Checking runtime asset contract...", asset_id)
    contract = client.call_tool("check_asset_contract", {"asset_id": asset_id})
    summary["contract"] = contract
    passed = contract.get("technical_contract_pass", False)
    log.info("[%s] Runtime contract: %s (reasons: %s)", asset_id, "PASS" if passed else "FAIL", contract.get("technical_reasons", []))

    summary["end_time"] = time.time()
    summary["duration_sec"] = round(summary["end_time"] - summary["start_time"], 2)
    summary["status"] = "technical_pass" if passed else "technical_fail"
    return summary


def sync_asset_from_remote(asset_id: str) -> None:
    """Syncs the refined asset folder from remote server to local workspace."""
    remote_src = f"user@10.7.88.12:/home/user/synopsis-ai/synopsis_game/assets/work/{asset_id}/"
    local_dst = REPO_ROOT / f"assets/work/{asset_id}/"
    local_dst.mkdir(parents=True, exist_ok=True)
    try:
        subprocess.run(
            ["rsync", "-avz", "--timeout=30", remote_src, str(local_dst)],
            check=True,
            capture_output=True,
            text=True
        )
        log.info("[%s] Synced assets from remote to %s", asset_id, local_dst)
    except Exception as exc:
        log.warning("[%s] Failed to rsync from remote: %s", asset_id, exc)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--group", choices=list(GROUPS.keys()) + ["all"], help="Predefined asset group to run")
    parser.add_argument("--task", help="Run all assets for a given task ID (e.g. W2-10, W2-11, etc.)")
    parser.add_argument("--assets", nargs="+", help="Specific asset IDs to generate")
    parser.add_argument("--count", type=int, default=2, help="Candidate count per asset (default: 2)")
    parser.add_argument("--seed", type=int, default=26063, help="Base seed")
    parser.add_argument("--backend", default="auto", help="Generator backend (auto, z_image_style, z_image_turbo)")
    parser.add_argument("--sync", action="store_true", default=True, help="Sync generated outputs to local assets/work/")
    parser.add_argument("--skip-existing", action="store_true", default=True, help="Skip assets that already have refined output locally")
    parser.add_argument("--force", action="store_true", help="Force regenerate even if refined output exists")
    args = parser.parse_args()

    targets: list[str] = []
    if args.assets:
        targets.extend(args.assets)
    elif args.task:
        if not SPEC_PATH.exists():
            parser.error(f"Spec file not found: {SPEC_PATH}")
        spec_data = json.loads(SPEC_PATH.read_text(encoding="utf-8"))
        task_assets = [a["id"] for a in spec_data.get("assets", []) if a.get("task") == args.task]
        if not task_assets:
            parser.error(f"No assets found for task {args.task}")
        targets.extend(task_assets)
    elif args.group == "all":
        for grp in GROUPS.values():
            targets.extend(grp)
    elif args.group:
        targets.extend(GROUPS[args.group])
    else:
        parser.error("Specify --group, --task, or --assets")

    # Deduplicate while preserving order
    targets = list(dict.fromkeys(targets))

    # Skip existing if requested and not forced
    if args.skip_existing and not args.force:
        filtered = []
        for aid in targets:
            refined_dir = REPO_ROOT / f"assets/work/{aid}/refined"
            if refined_dir.exists() and any(refined_dir.glob("*.png")):
                log.info("[%s] Already has refined asset locally, skipping (--skip-existing).", aid)
            else:
                filtered.append(aid)
        targets = filtered

    if not targets:
        log.info("No targets to process (all specified assets already exist).")
        return 0

    log.info("Starting swarm generation for %d asset(s): %s", len(targets), targets)
    client = MCPClient()
    client.initialize()

    results: list[dict[str, Any]] = []
    for idx, aid in enumerate(targets, start=1):
        log.info("\n>>> [%d/%d] Beginning lifecycle for %s", idx, len(targets), aid)
        try:
            res = process_asset(client, aid, count=args.count, seed=args.seed + idx * 7, backend=args.backend)
            results.append(res)
            if args.sync:
                sync_asset_from_remote(aid)
        except Exception as exc:
            log.error("[%s] Lifecycle failed with exception: %s", aid, exc, exc_info=True)
            results.append({"asset_id": aid, "status": "error", "error": str(exc)})

    # Summary
    log.info("\n================ SWARM BATCH REPORT ================")
    for r in results:
        log.info("- %s: status=%s (duration=%ss)", r["asset_id"], r.get("status"), r.get("duration_sec", "?"))

    out_file = REPO_ROOT / f"assets/work/swarm_batch_{int(time.time())}.json"
    out_file.write_text(json.dumps(results, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    log.info("Wrote batch summary to %s", out_file)
    return 0


if __name__ == "__main__":
    sys.exit(main())
