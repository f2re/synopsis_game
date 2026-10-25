#!/usr/bin/env python3
"""Lightweight repository validation with no third-party dependencies."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
MARKDOWN_LINK = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
ID_PATTERNS = [
    re.compile(r"\b(M-\d{3})\b"),
    re.compile(r"\b(IDEA-\d{3})\b"),
    re.compile(r"\b(ADR-\d{4})\b"),
]


def check_json() -> list[str]:
    errors: list[str] = []
    for path in ROOT.rglob("*.json"):
        if ".git" in path.parts:
            continue
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001
            errors.append(f"invalid JSON: {path.relative_to(ROOT)}: {exc}")
    return errors


def check_markdown_links() -> list[str]:
    errors: list[str] = []
    for path in ROOT.rglob("*.md"):
        if ".git" in path.parts:
            continue
        text = path.read_text(encoding="utf-8")
        for target in MARKDOWN_LINK.findall(text):
            target = target.strip()
            if not target or target.startswith(("http://", "https://", "mailto:", "#")):
                continue
            target = target.split("#", 1)[0]
            if not target:
                continue
            resolved = (path.parent / unquote(target)).resolve()
            try:
                resolved.relative_to(ROOT)
            except ValueError:
                errors.append(f"link escapes repository: {path.relative_to(ROOT)} -> {target}")
                continue
            if not resolved.exists():
                errors.append(f"broken local link: {path.relative_to(ROOT)} -> {target}")
    return errors


def check_duplicate_catalog_ids() -> list[str]:
    errors: list[str] = []
    seen: dict[str, Path] = {}
    roots = [ROOT / "docs" / "game-design", ROOT / "docs" / "ideas", ROOT / "docs" / "decisions"]
    for base in roots:
        if not base.exists():
            continue
        for path in base.rglob("*.md"):
            text = path.read_text(encoding="utf-8")
            for pattern in ID_PATTERNS:
                for identifier in pattern.findall(text):
                    previous = seen.get(identifier)
                    if previous and previous != path:
                        errors.append(
                            f"duplicate catalog id {identifier}: "
                            f"{previous.relative_to(ROOT)} and {path.relative_to(ROOT)}"
                        )
                    else:
                        seen[identifier] = path
    return errors


def _load_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def _collect_records(directory: str, list_key: str | None = None) -> tuple[list[dict], list[str]]:
    records: list[dict] = []
    errors: list[str] = []
    base = ROOT / "content" / directory
    if not base.exists():
        return records, errors
    for path in sorted(base.rglob("*.json")):
        try:
            data = _load_json(path)
        except Exception:
            continue  # check_json reports syntax errors separately
        items: object
        if list_key and isinstance(data, dict) and list_key in data:
            items = data[list_key]
        elif isinstance(data, list):
            items = data
        else:
            items = [data]
        if not isinstance(items, list):
            errors.append(f"content container is not a list: {path.relative_to(ROOT)}:{list_key}")
            continue
        for item in items:
            if not isinstance(item, dict):
                errors.append(f"content record is not an object: {path.relative_to(ROOT)}")
                continue
            item = dict(item)
            item["__path__"] = path
            records.append(item)
    return records, errors


def _index_records(records: list[dict], kind: str) -> tuple[dict[str, dict], list[str]]:
    index: dict[str, dict] = {}
    errors: list[str] = []
    for record in records:
        identifier = record.get("id")
        path = record.get("__path__", ROOT)
        rel = path.relative_to(ROOT) if isinstance(path, Path) else path
        if not isinstance(identifier, str) or not identifier:
            errors.append(f"{kind} without id: {rel}")
            continue
        if identifier in index:
            prev = index[identifier].get("__path__", ROOT)
            prev_rel = prev.relative_to(ROOT) if isinstance(prev, Path) else prev
            errors.append(f"duplicate {kind} id {identifier}: {prev_rel} and {rel}")
            continue
        index[identifier] = record
    return index, errors


def _source_ids(value: object) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list):
        return []
    result: list[str] = []
    for item in value:
        if isinstance(item, str):
            result.append(item)
        elif isinstance(item, dict) and isinstance(item.get("source_id"), str):
            result.append(item["source_id"])
    return result


def check_content_integrity() -> list[str]:
    errors: list[str] = []
    source_records, e = _collect_records("sources", "sources")
    errors.extend(e)
    method_records, e = _collect_records("method-profiles")
    errors.extend(e)
    skill_records, e = _collect_records("skills", "skills")
    errors.extend(e)
    task_records, e = _collect_records("tasks", "tasks")
    errors.extend(e)
    balance_records, e = _collect_records("balance")
    errors.extend(e)
    pack_records, e = _collect_records("packs")
    errors.extend(e)

    sources, e = _index_records(source_records, "source")
    errors.extend(e)
    methods, e = _index_records(method_records, "method profile")
    errors.extend(e)
    skills, e = _index_records(skill_records, "skill")
    errors.extend(e)
    tasks, e = _index_records(task_records, "task")
    errors.extend(e)
    balances, e = _index_records(balance_records, "balance profile")
    errors.extend(e)
    packs, e = _index_records(pack_records, "content pack")
    errors.extend(e)

    for identifier, method in methods.items():
        for source_id in _source_ids(method.get("sources")):
            if source_id not in sources:
                errors.append(f"method profile {identifier} references unknown source {source_id}")
        rules = method.get("rules")
        if isinstance(rules, dict):
            kn01_source = rules.get("kn01_ruleset_source")
            if isinstance(kn01_source, str) and kn01_source not in sources:
                errors.append(f"method profile {identifier} references unknown KN-01 source {kn01_source}")

    for identifier, task in tasks.items():
        method_id = task.get("method_profile")
        if not isinstance(method_id, str) or method_id not in methods:
            errors.append(f"task {identifier} references unknown method profile {method_id}")
        for source_id in _source_ids(task.get("sources")):
            if source_id not in sources:
                errors.append(f"task {identifier} references unknown source {source_id}")
        task_skills = task.get("skills", [])
        if not isinstance(task_skills, list):
            errors.append(f"task {identifier} has non-list skills")
        else:
            for skill_id in task_skills:
                if not isinstance(skill_id, str) or skill_id not in skills:
                    errors.append(f"task {identifier} references unknown skill {skill_id}")

    for identifier, pack in packs.items():
        method_id = pack.get("method_profile")
        if not isinstance(method_id, str) or method_id not in methods:
            errors.append(f"content pack {identifier} references unknown method profile {method_id}")
        balance_id = pack.get("balance_profile")
        if balance_id is not None and (not isinstance(balance_id, str) or balance_id not in balances):
            errors.append(f"content pack {identifier} references unknown balance profile {balance_id}")
        pack_tasks = pack.get("tasks", [])
        if not isinstance(pack_tasks, list):
            errors.append(f"content pack {identifier} has non-list tasks")
        else:
            for task_id in pack_tasks:
                if not isinstance(task_id, str) or task_id not in tasks:
                    errors.append(f"content pack {identifier} references unknown task {task_id}")

    return errors


def check_required_files() -> list[str]:
    required = [
        "README.md",
        "CONTRIBUTING.md",
        "SECURITY.md",
        "CHANGELOG.md",
        "docs/README.md",
        "docs/00_VISION_GDD.md",
        "docs/01_RUSSIAN_SYNOPIC_SCHOOL.md",
        "docs/09_SOURCE_POLICY.md",
        "docs/testing/QUALITY_GATES.md",
    ]
    return [f"missing required file: {name}" for name in required if not (ROOT / name).exists()]


def main() -> int:
    errors = []
    errors.extend(check_required_files())
    errors.extend(check_json())
    errors.extend(check_markdown_links())
    errors.extend(check_duplicate_catalog_ids())
    errors.extend(check_content_integrity())

    if errors:
        print("Repository validation failed:")
        for error in errors:
            print(f" - {error}")
        return 1

    print("Repository validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
