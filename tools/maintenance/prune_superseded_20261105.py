#!/usr/bin/env python3
"""Second-stage cleanup, fixed 05.11.2026 audit. Safe, no wildcard deletions."""
from __future__ import annotations
import base64
import json
import os
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from datetime import datetime, timezone

REPO = "f2re/synopsis_game"
ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "tools/maintenance/branch_cleanup_round2_20261105.json"
OUTPUT = ROOT / "branch_cleanup_round2_result.json"

def api(method, path, token):
    url = "https://api.github.com/repos/" + REPO + path
    request = Request(url, method=method, headers={
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "synopsis-branch-review-round2",
    })
    try:
        with urlopen(request, timeout=35) as response:
            body = response.read()
            return json.loads(body) if body else None
    except HTTPError as error:
        if method == "GET" and error.code == 404:
            return None
        raise RuntimeError(f"{method} {path}: HTTP {error.code} {error.read().decode('utf8', errors='replace')[:700]}") from error

def branch(name, token):
    return api("GET", "/branches/" + quote(name, safe=""), token)

def content(path, ref, token):
    result = api("GET", "/contents/" + "/".join(quote(x,safe="") for x in path.split("/")) + "?ref=" + quote(ref,safe=""), token)
    if not result or result.get("type") != "file":
        raise RuntimeError(f"Missing source {path} @ {ref}")
    return result

def file_text(path, ref, token):
    raw = content(path, ref, token).get("content", "")
    return base64.b64decode(raw).decode("utf8")

def open_pull_refs(token):
    result = set()
    page=1
    while True:
        pulls = api("GET", f"/pulls?state=open&per_page=100&page={page}", token)
        if not isinstance(pulls,list): raise RuntimeError("PR inventory unexpectedly missing")
        for p in pulls:
            for key in ("head","base"):
                ref=p.get(key,{}).get("ref")
                if ref: result.add(ref)
        if len(pulls)<100: return result
        page+=1
        if page>25: raise RuntimeError("PR inventory pagination guard")

def check_pr120(token, current_main):
    p=api("GET","/pulls/120",token)
    if not p or not p.get("merged_at"):
        raise RuntimeError("PR #120 is not merged")
    if p["head"]["sha"] != "4cb6fe86887ef7ff76b541986186b5dfded6ffb9":
        raise RuntimeError("Unexpected PR #120 source SHA")
    merged=p.get("merge_commit_sha")
    compare=api("GET", "/compare/"+merged+"..."+current_main,token)
    if not compare or compare.get("behind_by")!=0:
        raise RuntimeError("PR #120 merge commit not included in main")
    needed=[
      "apps/server/src/modules/kn01Live/kn01LiveService.ts",
      "apps/server/src/modules/kn01Live/kn01LiveService.test.ts",
      "packages/kn01-codec/src/synop-header.js",
      "packages/kn01-codec/src/synop-header.d.ts",
      "packages/kn01-codec/test/synop-header.test.mjs",
    ]
    for file in needed: content(file, "main", token)
    pkg=json.loads(file_text("packages/kn01-codec/package.json","main",token))
    if "./synop-header" not in pkg.get("exports",{}):
        raise RuntimeError("KN01 header export missing in main")

def check_semantic_equivalence(name, token):
    if name=="feat/lore-seamless-gameplay":
        file="apps/web/src/features/shift/shiftLore.ts"
        if content(file,name,token)["sha"]!=content(file,"main",token)["sha"]:
            raise RuntimeError("Shift lore text changed; reassess before deleting")
        a=file_text("apps/web/src/App.tsx","main",token)
        b=file_text("apps/web/src/App.tsx",name,token)
        if "SynopticDutyTicker" not in a or "SynopticDutyTicker" in b:
            raise RuntimeError("App delta no longer matches documented review")
        return
    if name=="feat/living-facility-dossiers":
        identical_files=[
          "apps/web/src/game/WorldCanvas.tsx",
          "packages/world-engine/src/scenes/hub/HubBuildingLayer.ts",
          "packages/world-engine/src/scenes/hub/facilityDossiers.ts",
          "packages/world-engine/src/scenes/hub/hubStages.ts",
          "packages/world-engine/src/scenes/hub/locationRegistry.ts",
        ]
        for file in identical_files:
            if content(file,name,token)["sha"]!=content(file,"main",token)["sha"]:
                raise RuntimeError("Dossier source mismatch: "+file)
        current=file_text("packages/world-engine/src/scenes/hub/HubDossierLayer.ts","main",token)
        scene=file_text("packages/world-engine/src/scenes/hub/HubScene.ts","main",token)
        if "WORLD_LOGICAL_WIDTH" not in current or "runtime-approval.json" not in scene:
            raise RuntimeError("Approved scene/dossier geometry unexpectedly changed")
        return
    raise RuntimeError("Unrecognized semantic review target")

def run():
    token=os.environ.get("GITHUB_TOKEN","")
    if not token or os.environ.get("GITHUB_REPOSITORY")!=REPO:
        raise RuntimeError("GITHUB_TOKEN and exact repository required")
    data=json.loads(MANIFEST.read_text(encoding="utf8"))
    entries=data.get("delete")
    mode=data.get("mode")
    if data.get("repository")!=REPO or mode not in ("dry_run","apply") or not isinstance(entries,list) or len(entries)!=4:
        raise RuntimeError("Cleanup manifest invalid")
    main_sha=branch("main",token)["commit"]["sha"]
    expected_reason={
      "feat/lore-seamless-gameplay":"verified_superseded_lore",
      "feat/living-facility-dossiers":"verified_superseded_dossier",
      "feat/kn01-live-ingest":"ported_kn01_pr120",
      "agent/live-kn01-engineer/preserve-live-ingest-20261105":"merged_pr120",
    }
    if {e.get("branch"):e.get("reason") for e in entries}!=expected_reason:
        raise RuntimeError("Unexpected deletion target or reason")
    active=open_pull_refs(token)
    preserved=set(data.get("preserve",[]))|active
    check_pr120(token,main_sha)
    verified=[]
    for entry in entries:
        name=entry["branch"]
        sha=entry["sha"]
        if name in preserved or name=="main":
            raise RuntimeError("A branch is preserved or used by an open PR: "+name)
        if len(sha)!=40 or any(x not in "0123456789abcdef" for x in sha):
            raise RuntimeError("Bad SHA: "+name)
        item=branch(name,token)
        if not item or item.get("protected") or item["commit"]["sha"]!=sha:
            raise RuntimeError("Branch missing, protected or advanced since audit: "+name)
        if entry["reason"].startswith("verified_superseded"):
            check_semantic_equivalence(name,token)
        verified.append(entry)
        print("VALIDATED",name,sha,flush=True)
    result={"timestamp":datetime.now(timezone.utc).isoformat(),"mode":mode,"main_sha":main_sha,
            "validated":verified,"deleted":[],"errors":[]}
    if mode=="dry_run":
        OUTPUT.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
        print("DRY RUN PASS:",len(verified),"branch refs; zero deleted")
        return 0
    for item in verified:
        name=item["branch"]
        before=branch(name,token)
        if not before or before.get("protected") or before["commit"]["sha"]!=item["sha"]:
            result["errors"].append("Branch changed at deletion boundary: "+name)
            break
        if name in open_pull_refs(token):
            result["errors"].append("New open PR uses branch: "+name)
            break
        api("DELETE","/git/refs/heads/"+quote(name,safe=""),token)
        result["deleted"].append(item)
        print("DELETED",name,item["sha"],flush=True)
        OUTPUT.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
    OUTPUT.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
    print("RESULT:",len(result["deleted"]),"deleted,",len(result["errors"]),"errors")
    return 2 if result["errors"] else 0

if __name__ == "__main__":
    try:
        raise SystemExit(run())
    except Exception as exc:
        print("ABORT:",exc,flush=True)
        raise
