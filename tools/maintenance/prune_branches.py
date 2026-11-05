#!/usr/bin/env python3
"""Safe one-time branch pruning via GitHub Actions; dry-run by default.

This script never deletes by pattern or by a stale GitHub PR status alone.
It validates every SHA, open PR use, branch protection, and merge/ancestry.
"""
from __future__ import annotations

import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "tools/maintenance/branch_cleanup_20261105.json"
OUTPUT = ROOT / "branch_cleanup_result.json"
EXPECTED_REPO = "f2re/synopsis_game"


def api(method: str, path: str, token: str):
    url = "https://api.github.com/repos/" + EXPECTED_REPO + path
    request = urllib.request.Request(
        url,
        method=method,
        headers={
            "Authorization": "Bearer " + token,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "synopsis-game-safe-branch-prune-20261105",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = response.read()
            return json.loads(payload) if payload else None
    except urllib.error.HTTPError as exc:
        if exc.code == 404 and method == "GET":
            return None
        message = exc.read().decode("utf-8", errors="replace")[:800]
        raise RuntimeError(f"GitHub {method} {path}: HTTP {exc.code}: {message}") from exc


def all_open_pulls(token: str):
    all_items = []
    page = 1
    while True:
        items = api("GET", f"/pulls?state=open&per_page=100&page={page}", token)
        if not isinstance(items, list):
            raise RuntimeError("Expected a list of open PRs")
        all_items.extend(items)
        if len(items) < 100:
            return all_items
        page += 1
        if page > 40:
            raise RuntimeError("Open PR pagination safety limit")


def main() -> int:
    token = os.environ.get("GITHUB_TOKEN", "")
    if not token:
        print("ERROR: GITHUB_TOKEN required for authoritative GitHub branch/PR checks", file=sys.stderr)
        return 2
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if data.get("repository") != EXPECTED_REPO or os.environ.get("GITHUB_REPOSITORY") != EXPECTED_REPO:
        print("ERROR: repository mismatch; aborting all changes", file=sys.stderr)
        return 2
    mode = data.get("mode")
    if mode not in {"dry_run", "apply"}:
        print("ERROR: unknown mode", file=sys.stderr)
        return 2
    items = data.get("delete")
    if not isinstance(items, list) or len(items) != 47:
        print("ERROR: expected exactly 47 audited candidate references; aborting", file=sys.stderr)
        return 2

    opens = all_open_pulls(token)
    active = {"main"}
    for pr in opens:
        for side in ("head", "base"):
            ref = pr.get(side, {}).get("ref")
            if ref:
                active.add(ref)
    preserved = set(data.get("retain", {}).get("active_art_tasks", []))
    preserved.update(data.get("retain", {}).get("unique_work_to_review", []))
    preserved.update(data.get("retain", {}).get("open_pr_head_or_base", []))
    if any(e.get("branch") in active or e.get("branch") in preserved for e in items):
        print("ERROR: candidate now referenced by an open PR or preservation set", file=sys.stderr)
        return 2

    main = api("GET", "/branches/main", token)
    base_sha = main["commit"]["sha"]
    rc = api("GET", "/branches/integration%2Fhub-2-5d-rc-20261104", token)
    rc_sha = rc["commit"]["sha"] if rc else None
    if not rc_sha:
        print("ERROR: active H3D release-candidate branch missing", file=sys.stderr)
        return 2

    checked = []
    failures = []
    names = set()
    for candidate in items:
        branch = candidate.get("branch")
        sha = candidate.get("sha")
        reason = candidate.get("reason")
        if not isinstance(branch, str) or not branch or branch.startswith("/") or ".." in branch:
            failures.append(f"Unsafe branch string: {branch!r}")
            continue
        if not isinstance(sha, str) or len(sha) != 40 or any(c not in "0123456789abcdef" for c in sha):
            failures.append(f"Unsafe SHA for {branch}")
            continue
        if branch in names:
            failures.append(f"Duplicate candidate: {branch}")
            continue
        names.add(branch)
        q = urllib.parse.quote(branch, safe="")
        info = api("GET", "/branches/" + q, token)
        if info is None:
            failures.append(f"Missing reference {branch} (re-run audit)")
            continue
        if info.get("protected"):
            failures.append(f"Branch protection enabled: {branch}")
            continue
        if info.get("commit", {}).get("sha") != sha:
            failures.append(f"Branch advanced since audit: {branch}, new sha={info.get('commit', {}).get('sha')}")
            continue

        if reason == "merged_pr":
            number = candidate.get("pr")
            if not isinstance(number, int):
                failures.append(f"Missing PR id: {branch}")
                continue
            pr = api("GET", f"/pulls/{number}", token)
            if not pr or not pr.get("merged_at") or pr.get("head", {}).get("ref") != branch or pr.get("head", {}).get("sha") != sha:
                failures.append(f"PR #{number} was not merged at exact branch head: {branch}")
                continue
        elif reason in {"ancestor_main", "ancestor_rc"}:
            target = base_sha if reason == "ancestor_main" else rc_sha
            comparison = api("GET", f"/compare/{target}...{sha}", token)
            if not comparison or comparison.get("ahead_by") != 0:
                failures.append(f"Not ancestor of preserved {reason} target: {branch}")
                continue
        else:
            failures.append(f"Unsupported delete reason for {branch}")
            continue
        checked.append({"branch": branch, "sha": sha, "reason": reason, "pr": candidate.get("pr")})
        print(f"VALIDATED {branch} @ {sha[:10]} ({reason})", flush=True)

    result = {
        "repository": EXPECTED_REPO,
        "at_utc": datetime.now(timezone.utc).isoformat(),
        "mode": mode,
        "main_sha": base_sha,
        "rc_sha": rc_sha,
        "open_pr_count": len(opens),
        "validated": checked,
        "failures": failures,
        "deleted": [],
    }
    if failures or len(checked) != len(items):
        OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
        print(f"ABORT: {len(failures)} failed prechecks; no branches deleted", file=sys.stderr)
        return 2

    if mode == "dry_run":
        OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
        print(f"DRY RUN PASS: {len(checked)} branches safe to delete; zero deleted")
        return 0

    for entry in checked:
        branch = entry["branch"]
        encoded = urllib.parse.quote(branch, safe="")
        # We already validated exact HEAD, no PR and no protection. Recheck
        # current HEAD immediately before each DELETE for a safe optimistic lease.
        current = api("GET", "/branches/" + encoded, token)
        if not current or current["commit"]["sha"] != entry["sha"] or current.get("protected"):
            failures.append(f"Stale at deletion boundary: {branch}")
            break
        # Recheck open PR references if the cleanup runs alongside new PRs.
        current_active = {"main"}
        for pr in all_open_pulls(token):
            current_active.add(pr.get("head", {}).get("ref"))
            current_active.add(pr.get("base", {}).get("ref"))
        if branch in current_active:
            failures.append(f"New open PR uses branch: {branch}")
            break
        api("DELETE", "/git/refs/heads/" + encoded, token)
        result["deleted"].append(entry)
        print(f"DELETED {branch} (original {entry['sha']})", flush=True)
        OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
        time.sleep(0.05)

    result["failures"] = failures
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(f"RESULT: {len(result['deleted'])} deleted, {len(failures)} errors")
    return 2 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
