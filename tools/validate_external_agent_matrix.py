#!/usr/bin/env python3
"""Structural verifier for externally adapted agents, skill routing and reviewer gates."""
import argparse
import json
import re
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_HELPERS = set("""
webgl-shader-specialist shader-artist threejs-architect web3d-asset-pipeline
asset-pipeline-engineer motion-choreographer web2d-asset-pipeline level-designer
gameplay-programmer ui-programmer qa-lead qa-tester audio-director
""".split())
REQUIRED_SKILLS = set("""
glsl-webgl-shaders shader-art-direction threejs-architecture gltf-3d-pipeline
asset-provenance-review motion-choreography pixel-atlas-production
level-layout-design gameplay-implementation ui-runtime-components
game-qa-automation audio-direction-qa
""".split())
SHA = re.compile(r"^[0-9a-f]{40}$")


def validate(root=ROOT):
    errors = []
    def fail(message):
        errors.append(message)
    def read(path):
        file = root / path
        if not file.is_file():
            fail("missing: " + path)
            return ""
        return file.read_text(encoding="utf-8")
    def fm(path):
        raw = read(path)
        match = re.match(r"\A---\r?\n(.*?)\r?\n---\r?\n", raw, re.S)
        if not match:
            fail("missing YAML frontmatter: " + path)
            return {}, []
        head = match.group(1)
        pairs = dict(re.findall(r"^([a-zA-Z]+): (.+)$", head, re.M))
        m = re.search(r"^skills:\s*\n((?:  - [^\n]+\n?)+)", head, re.M)
        skills = re.findall(r"^  - ([^\n]+)$", m.group(1), re.M) if m else []
        return pairs, skills

    try:
        cat = json.loads(read("agents/capability-catalog.json"))
    except ValueError as exc:
        return {"status": "FAIL", "errors": [str(exc)]}
    reg = read("agents/registry.yaml")
    roles = set(re.findall(r"^  - id: ([a-z0-9-]+)$", reg, re.M))
    helpers = cat.get("external_agents", [])
    helper_ids = {a.get("id") for a in helpers}
    mapping = cat.get("role_skills", {})
    skills = {p.parent.name for p in (root / ".agents/skills").glob("*/SKILL.md")}
    claude_skills = {p.parent.name for p in (root / ".claude/skills").glob("*/SKILL.md")}
    if cat.get("version") != 2 or len(roles) != 19 or set(mapping) != roles:
        fail("canonical registry or catalog version mismatch")
    if len(helpers) != 18 or len(helper_ids) != 18 or not REQUIRED_HELPERS <= helper_ids:
        fail("missing/duplicate external specialists (expect 18, including all 13 additions)")
    if len(skills) < 35 or skills != claude_skills or not REQUIRED_SKILLS <= skills:
        fail("missing skills or Claude wrappers (expect at least 35, including all 12 additions)")
    for name, assigned in mapping.items():
        if not assigned or len(assigned) != len(set(assigned)) or not set(assigned) <= skills:
            fail("invalid internal skill mapping: " + name)
    if skills - set().union(*(set(v) for v in mapping.values())):
        fail("unassigned canonical skill")
    all_agents = roles | helper_ids
    for dirpath, extension in (
        (".claude/agents", ".md"), (".agents/agents", ".md"), (".codex/agents", ".toml")
    ):
        found = {p.stem for p in (root / dirpath).glob("*" + extension)}
        if found != all_agents:
            fail("provider inventory mismatch: " + dirpath)

    def check_agent(name, expected_skills, external=False, owner=None, reviewers=()):
        for directory in (".agents/agents", ".claude/agents"):
            path = f"{directory}/{name}.md"
            head, preload = fm(path)
            expected = [("skills/" if directory == ".agents/agents" else "") + s
                        for s in expected_skills]
            if head.get("name") != name or "Use for " not in head.get("description", ""):
                fail("invalid agent discovery metadata: " + path)
            if preload != expected:
                fail("broken skill preloads: " + path)
            if directory == ".agents/agents" and (
                head.get("subagent") != "true" or
                (external and (head.get("mainAgent") != "false" or
                               head.get("commandExecutionPolicy") != "sandbox"))
            ):
                fail("invalid Antigravity execution boundaries: " + path)
            if external and (f"agents/roles/{owner}.md" not in read(path) or
                             "## Specific execution checklist" not in read(path)):
                fail("helper missing owner/checklist: " + path)
        path = f".codex/agents/{name}.toml"
        try:
            item = tomllib.loads(read(path))
        except (OSError, ValueError) as exc:
            fail(f"invalid TOML {path}: {exc}")
            return
        instructions = item.get("developer_instructions", "")
        if item.get("name") != name or "Use for " not in item.get("description", ""):
            fail("invalid Codex discovery metadata: " + path)
        if any(k in item for k in ("sandbox_mode", "mcp_servers", "approval_policy")):
            fail("Codex profile may not override inherited permissions: " + path)
        if external and (f"agents/roles/{owner}.md" not in instructions or
                         any(f".agents/skills/{s}/SKILL.md" not in instructions
                             for s in expected_skills) or
                         any(reviewer not in instructions for reviewer in reviewers)):
            fail("Codex helper missing owner, skill, or reviewers: " + path)
        if not external and "agents/capability-catalog.json" not in instructions:
            fail("internal Codex role missing dynamic skill catalog: " + path)

    for role, assigned in mapping.items():
        check_agent(role, assigned)
    for helper in helpers:
        name = helper.get("id", "")
        owner = helper.get("owner")
        assigned = helper.get("skills", [])
        reviewers = helper.get("reviewers", [])
        if (owner not in roles or not isinstance(assigned, list) or not assigned
            or len(assigned) != len(set(assigned)) or not set(assigned) <= skills
            or not set(assigned) & set(mapping.get(owner, []))):
            fail("invalid helper owner/skills: " + name)
        if (not reviewers or len(reviewers) != len(set(reviewers)) or
            not set(reviewers) <= roles or owner in reviewers):
            fail("invalid independent reviewer list: " + name)
        if (helper.get("mode") != "adapted" or
            helper.get("source") not in ("bullish0x/GameStudio", "skinnye/3d-web-pack") or
            not SHA.fullmatch(helper.get("sha", "")) or
            helper.get("url") != "https://github.com/" + helper.get("source", "") +
                "/blob/main/" + helper.get("file", "")):
            fail("helper not pinned to reviewed MIT source: " + name)
        check_agent(name, assigned, external=True, owner=owner, reviewers=reviewers)
    for skill in skills:
        for directory in (".agents/skills", ".claude/skills"):
            path = f"{directory}/{skill}/SKILL.md"
            head, _ = fm(path)
            if head.get("name") != skill or "description" not in head:
                fail("invalid skill discovery metadata: " + path)
            if directory == ".claude/skills" and f".agents/skills/{skill}/SKILL.md" not in read(path):
                fail("Claude skill adapter not pointing to canonical skill: " + path)
    for s in cat.get("external_skills", []):
        if s.get("id") not in skills:
            fail("missing registered external skill: " + str(s.get("id")))
        if s.get("mode") == "adapted" and s.get("source") and (
            not SHA.fullmatch(s.get("blob_sha") or "") or not s.get("url")
        ):
            fail("adaptation missing upstream SHA: " + str(s.get("id")))
    doc = read("agents/EXTERNAL_SPECIALISTS_ROUTING.md")
    for name in all_agents | REQUIRED_SKILLS:
        if chr(96) + name + chr(96) not in doc:
            fail("missing role/skill in routing document: " + name)
    return {"status": "FAIL" if errors else "PASS",
            "internal_roles": len(roles), "external_helpers": len(helpers),
            "canonical_skills": len(skills), "profiles_per_provider": len(all_agents),
            "validation": "static; not live AI client execution", "errors": errors}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--root", type=Path, default=ROOT)
    args = parser.parse_args()
    result = validate(args.root)
    print(json.dumps(result, ensure_ascii=False, indent=2) if args.json
          else f"Extended agent kit {result['status']}: {result['errors']}")
    return 0 if result["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
