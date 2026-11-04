#!/usr/bin/env python3
"""Validate cross-provider agent/skill discovery and the local source-of-truth.

Pure Python stdlib. This is a structural/semantic check, NOT a live AI-client smoke.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "agents/capability-catalog.json"
REGISTRY = ROOT / "agents/registry.yaml"
AGENT_DIRS = (".agents/agents", ".claude/agents")
NAME = re.compile(r"^[a-z][a-z0-9-]*$")
ISSUES = []

def fail(message):
    ISSUES.append(message)

def text(path):
    file = ROOT / path
    if not file.is_file():
        fail(f"missing file: {path}")
        return ""
    return file.read_text(encoding="utf-8")

def meta(path):
    raw = text(path)
    match = re.match(r"\A---\r?\n(.*?)\r?\n---\r?\n", raw, re.S)
    if match is None:
        fail(f"missing YAML frontmatter: {path}")
        return {}
    front = match.group(1)
    data = {}
    for key in ("name", "description"):
        field = re.search(r"^" + key + r":\s*(.+)$", front, re.M)
        if not field or field.group(1).strip() in ("", ">", ">-", "|", "|-"):
            fail(f"missing single-line {key}: {path}")
        else:
            data[key] = field.group(1).strip().strip("'\"")
    return data

def roles():
    raw = text("agents/registry.yaml")
    blocks = re.findall(r"(?ms)^  - id: ([a-z][a-z0-9-]*)\n(.*?)(?=^  - id: |\Z)", raw.split("\nacceptance_gates:")[0])
    result = {}
    for role, block in blocks:
        if role in result:
            fail(f"duplicate role: {role}")
        rolefile = re.search(r"^    role_file: (\S+)$", block, re.M)
        owner = rolefile.group(1) if rolefile else f"agents/roles/{role}.md"
        if owner != f"agents/roles/{role}.md":
            fail(f"role file naming drift: {role} => {owner}")
        text(owner)
        if not re.search(r"^    preferred_provider: (claude-code|antigravity-gemini|codex)$", block, re.M):
            fail(f"unknown preferred provider: {role}")
        if not re.search(r"^    fallback_provider: (claude-code|antigravity-gemini|codex)$", block, re.M):
            fail(f"unknown fallback provider: {role}")
        result[role] = owner
    actual = {x.stem for x in (ROOT / "agents/roles").glob("*.md")}
    if actual != set(result):
        fail(f"registry role inventory mismatch: missing={sorted(actual-set(result))}, extra={sorted(set(result)-actual)}")
    for name in ("AGENTS.md", "CLAUDE.md", "GEMINI.md"):
        text(name)
    for provider in ("codex", "claude-code", "antigravity-gemini"):
        if not re.search(r"^  " + re.escape(provider) + r":$", raw, re.M):
            fail(f"missing provider: {provider}")
    return result

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true", help="machine-readable report")
    args = parser.parse_args()
    cat = json.loads(text("agents/capability-catalog.json") or "{}")
    role_files = roles()
    external = cat.get("external_agents", [])
    helpers = {e.get("id") for e in external}
    if len(helpers) != len(external) or set(role_files) & helpers:
        fail("duplicate or colliding external agent IDs")
    for e in external:
        if e.get("source") and not re.fullmatch(r"[0-9a-f]{40}", e.get("sha") or ""):
            fail(f"missing immutable source blob for external helper: {e.get('id')}")
        if e.get("owner") not in role_files:
            fail(f"invalid external owner: {e.get('id')}")
        if not e.get("url") or e.get("mode") != "adapted":
            fail(f"external agent has unreviewed provenance: {e.get('id')}")
    expected_agents = set(role_files) | helpers
    # Codex project custom agents are TOML, not Markdown.
    codex_files = {p.stem for p in (ROOT / ".codex/agents").glob("*.toml")}
    if codex_files != expected_agents:
        fail(f"Codex agent inventory mismatch: missing={sorted(expected_agents-codex_files)}, extra={sorted(codex_files-expected_agents)}")
    for agent in sorted(expected_agents):
        path = f".codex/agents/{agent}.toml"
        try:
            item = tomllib.loads(text(path))
        except (ValueError, OSError) as exc:
            fail(f"invalid Codex TOML {path}: {exc}")
            continue
        owner = role_files.get(agent)
        if owner is None:
            owner = f"agents/roles/{next(e['owner'] for e in external if e['id'] == agent)}.md"
        if item.get("name") != agent or not item.get("description") or owner not in item.get("developer_instructions", ""):
            fail(f"Codex agent metadata/owner mismatch: {path}")
        if any(k in item for k in ("model", "sandbox_mode", "mcp_servers")):
            fail(f"Codex agent overrides inherited runtime settings: {path}")
    for directory in AGENT_DIRS:
        found = {p.stem for p in (ROOT / directory).glob("*.md")}
        if found != expected_agents:
            fail(f"{directory} agent inventory mismatch: missing={sorted(expected_agents-found)}, extra={sorted(found-expected_agents)}")
        for agent in sorted(expected_agents):
            path = f"{directory}/{agent}.md"
            fm = meta(path)
            if fm.get("name") != agent:
                fail(f"agent name mismatch: {path}")
            if not fm.get("description", "").startswith("Use for ") or len(fm.get("description", "")) < 70:
                fail(f"unhelpful agent discovery description: {path}")
            if directory == ".agents/agents" and "subagent: true" not in text(path).split("---", 2)[1]:
                fail(f"Antigravity subagent not explicitly enabled: {path}")
            body = text(path)
            if agent in role_files and role_files[agent] not in body:
                fail(f"canonical role reference missing: {path}")
            if agent in helpers and f"agents/roles/{next(e['owner'] for e in external if e['id']==agent)}.md" not in body:
                fail(f"external agent owner missing: {path}")
    canon_skills = sorted((ROOT / ".agents/skills").glob("*/SKILL.md"))
    skills = {p.parent.name for p in canon_skills}
    claude = {p.parent.name for p in (ROOT / ".claude/skills").glob("*/SKILL.md")}
    if skills != claude:
        fail(f"Claude skill inventory mismatch: missing={sorted(skills-claude)}, extra={sorted(claude-skills)}")
    for skill in sorted(skills):
        if not NAME.fullmatch(skill):
            fail(f"invalid skill name: {skill}")
        source = f".agents/skills/{skill}/SKILL.md"
        wrapper = f".claude/skills/{skill}/SKILL.md"
        if meta(source).get("name") != skill:
            fail(f"canonical skill name mismatch: {source}")
        if meta(wrapper).get("name") != skill:
            fail(f"Claude skill name mismatch: {wrapper}")
        desc = meta(wrapper).get("description", "")
        if not desc.startswith("Use for ") or len(desc) < 70:
            fail(f"unhelpful Claude skill discovery description: {wrapper}")
        if source not in text(wrapper):
            fail(f"Claude adapter lacks canonical reference: {wrapper}")
    declared = cat.get("role_skills", {})
    if set(declared) != set(role_files):
        fail(f"role-skills matrix mismatch: missing={sorted(set(role_files)-set(declared))}, extra={sorted(set(declared)-set(role_files))}")
    for role, names in declared.items():
        if not isinstance(names, list) or not names or len(names) != len(set(names)):
            fail(f"missing/duplicate capability skills: {role}")
        for name in names:
            if name not in skills:
                fail(f"unresolvable skill for {role}: {name}")
    unused = skills - set(name for names in declared.values() for name in names)
    if unused:
        fail(f"unused, unroutable canonical skills: {sorted(unused)}")
    for helper in external:
        for provider in (".agents/agents", ".claude/agents"):
            body = text(f"{provider}/{helper['id']}.md")
            if "## Specific execution checklist" not in body or len(body) < 1100:
                fail(f"external helper lacks task-specific procedure: {provider}/{helper['id']}.md")
    ext_skills = cat.get("external_skills", [])
    if len(ext_skills) != len({e.get("id") for e in ext_skills}):
        fail("duplicate external skill IDs")
    for e in ext_skills:
        name = e.get("id")
        if name not in skills:
            fail(f"external skill not installed: {name}")
            continue
        if e.get("mode") == "vendored":
            path = f".agents/skills/{name}/SKILL.md"
            expected = e.get("blob_sha")
            data = (ROOT / path).read_bytes()
            actual = hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()
            if actual != expected:
                fail(f"vendored source SHA mismatch {name}: {actual} != {expected}")
            if e.get("source") != "cesartevisual/threejs-skills":
                fail(f"unreviewed vendored source: {name}")
        elif e.get("mode") != "adapted":
            fail(f"unknown external skill import mode: {name}")
    for license_path in ("agents/external/licenses/threejs-skills-MIT.txt", "agents/external/licenses/GameStudio-MIT.txt", "agents/external/licenses/3d-web-pack-MIT.txt"):
        if not text(license_path).startswith("MIT License"):
            fail(f"missing MIT notice: {license_path}")
    for entry in ("AGENTS.md", "CLAUDE.md", "GEMINI.md"):
        if "agents/capability-catalog.json" not in text(entry):
            fail(f"missing cross-provider routing entrypoint: {entry}")
    report = {"status":"PASS" if not ISSUES else "FAIL", "internal_roles":len(role_files), "external_helpers":len(helpers), "canonical_skills":len(skills), "providers":cat.get("engines",[]), "checks":"static, not live runtime", "errors":ISSUES}
    print(json.dumps(report,ensure_ascii=False,indent=2) if args.json else f"Agent kit {report['status']}: {len(role_files)} roles, {len(helpers)} external helpers, {len(skills)} skills; {len(ISSUES)} issue(s)")
    if not args.json:
        for issue in ISSUES:
            print(" - "+issue)
    return 1 if ISSUES else 0

if __name__ == "__main__":
    raise SystemExit(main())
