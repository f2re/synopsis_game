"""Independent read-only checks for recovered inventory/art integration.

Writes evidence only. Asset pipelines run exclusively with --check.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import platform
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
CHECKS = [
    ("repository", ["tools/validate_repo.py"]),
    ("architecture", ["tools/validate_architecture.py"]),
    ("brand", ["tools/validate_brand.py"]),
    ("fonts", ["tools/validate_fonts.py"]),
    ("legacy-pixel-art-validator", ["tools/validate_pixel_art.py"]),
    ("asset-contract", ["tools/assets/check_asset_contract.py"]),
    ("asset-manifests", ["tools/assets/check_asset_manifests.py"]),
    ("hub-r01", ["tools/assets/build_hub_r01.py", "--check"]),
    ("characters-r01", ["tools/assets/build_characters_r01.py", "--check"]),
    ("inventory-r01", ["tools/assets/build_inventory_icons_r01.py", "--check"]),
    ("equipment-r01", ["tools/assets/build_equipment_r01.py", "--check"]),
]


def run(item):
    name, args = item
    started = time.monotonic()
    if not (ROOT / args[0]).is_file():
        return {"name": name, "command": ["python", *args], "status": "MISSING",
                "reason": "Referenced by AGENTS.md, absent from restored source; no success claimed."}
    process = subprocess.run([sys.executable, *args], cwd=ROOT, text=True,
                             stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=120)
    log = name + ".log"
    (OUT / log).write_text(process.stdout, encoding="utf-8")
    return {"name": name, "command": ["python", *args], "status": "PASS" if process.returncode == 0 else "FAIL",
            "exitCode": process.returncode, "elapsedSeconds": round(time.monotonic() - started, 3), "log": log}


def main():
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(run, CHECKS))
    manifest_path = ROOT / "assets/manifests/spritecook-assets.json"
    manifest = json.loads(manifest_path.read_text())
    asset_hashes = []
    for entry in manifest["assets"]:
        path = ROOT / entry["id"]
        actual = sha256(path.read_bytes()).hexdigest()[:12] if path.is_file() else None
        asset_hashes.append({"path": entry["id"], "assetId": entry["asset_id"],
                             "recordedSha12": entry["sha12"], "actualSha12": actual,
                             "matches": actual == entry["sha12"]})
    (OUT / "spritecook-manifest-hashes.json").write_text(
        json.dumps(asset_hashes, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    results.append({"name": "spritecook-manifest-hashes", "status": "PASS" if all(x["matches"] for x in asset_hashes) else "FAIL",
                    "entries": len(asset_hashes), "log": "spritecook-manifest-hashes.json"})
    summary = {
        "reviewer": "/root/recover_audit",
        "startedAtUtc": datetime.now(timezone.utc).isoformat(),
        "baseCommit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
        "restoredTree": "249198299e8f0a5ef5ec5c22b3485511c6f5b8cd",
        "pythonVersion": platform.python_version(), "checks": results,
        "scope": "Fresh read-only repository, asset reproducibility and hash checks; not new browser/device or Linux/Astra release testing.",
    }
    (OUT / "checks.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for result in results:
        print(result["name"], result["status"])
    return 1 if any(result["status"] == "FAIL" for result in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
