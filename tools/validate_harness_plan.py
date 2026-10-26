#!/usr/bin/env python3
"""Проверка машинного плана программы KN01-AAA (харнесс роя агентов).

Без сторонних зависимостей. Проверяет структуру плана, роли по реестру,
зависимости, переходы статусов, наличие доказательств и независимых подтверждений.

Использование:
    python tools/validate_harness_plan.py            # проверка, код возврата 1 при нарушениях
    python tools/validate_harness_plan.py --report   # ход работ по волнам
    python tools/validate_harness_plan.py --next     # задачи, которые можно начинать
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PLAN = ROOT / "docs" / "roadmap" / "kn01-aaa" / "harness" / "plan.json"
REGISTRY = ROOT / "agents" / "registry.yaml"

STATUSES = ("todo", "in_progress", "review", "done", "blocked")
STARTED = ("in_progress", "review", "done")
TASK_ID = re.compile(r"^W(\d)-\d{2}$")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
REQUIRED_FIELDS: dict[str, type] = {
    "id": str, "wave": int, "title": str, "owner": str, "reviewers": list,
    "depends_on": list, "spec": str, "deliverables": list, "acceptance": list,
    "evidence_required": list, "skills": list, "status": str, "evidence": list,
    "verified_by": list, "notes": str,
}


def load_registry_roles() -> set[str]:
    text = REGISTRY.read_text(encoding="utf-8")
    return set(re.findall(r"^\s*-\s+id:\s*([\w-]+)\s*$", text, flags=re.MULTILINE))


def repo_path_exists(value: str) -> bool:
    path = value.split("#", 1)[0].strip()
    if not path:
        return False
    resolved = (ROOT / path).resolve()
    try:
        resolved.relative_to(ROOT)
    except ValueError:
        return False
    return resolved.exists()


def check_fields(task: dict) -> list[str]:
    errors: list[str] = []
    for field, kind in REQUIRED_FIELDS.items():
        if field not in task:
            errors.append(f"нет поля {field}")
        elif not isinstance(task[field], kind):
            errors.append(f"поле {field} должно иметь тип {kind.__name__}")
    return errors


def check_identity(task: dict, roles: set[str]) -> list[str]:
    errors: list[str] = []
    match = TASK_ID.match(task["id"])
    if not match:
        errors.append("идентификатор не соответствует шаблону W<волна>-<NN>")
    elif int(match.group(1)) != task["wave"]:
        errors.append("номер волны в идентификаторе не совпадает с полем wave")
    if task["owner"] not in roles:
        errors.append(f"владелец {task['owner']} отсутствует в agents/registry.yaml")
    if not task["reviewers"]:
        errors.append("нет ни одного проверяющего")
    for reviewer in task["reviewers"]:
        if reviewer not in roles:
            errors.append(f"проверяющий {reviewer} отсутствует в agents/registry.yaml")
    if task["owner"] in task["reviewers"]:
        errors.append("владелец указан среди проверяющих (самоприёмка запрещена)")
    if task["status"] not in STATUSES:
        errors.append(f"недопустимый статус {task['status']}")
    if not task["acceptance"]:
        errors.append("нет критериев приёмки")
    if not repo_path_exists(task["spec"]):
        errors.append(f"спецификация не найдена: {task['spec']}")
    return errors


def check_dependencies(task: dict, by_id: dict[str, dict]) -> list[str]:
    errors: list[str] = []
    for dep in task["depends_on"]:
        if dep == task["id"]:
            errors.append("задача зависит сама от себя")
        elif dep not in by_id:
            errors.append(f"неизвестная зависимость {dep}")
        elif by_id[dep]["wave"] > task["wave"]:
            errors.append(f"зависимость {dep} находится в более поздней волне")
    if task["status"] in STARTED:
        pending = [d for d in task["depends_on"] if d in by_id and by_id[d]["status"] != "done"]
        if pending:
            errors.append(f"статус {task['status']} при незавершённых зависимостях: {', '.join(pending)}")
    return errors


def check_evidence(task: dict) -> list[str]:
    errors: list[str] = []
    status = task["status"]
    if status == "blocked" and not task["notes"].strip():
        errors.append("статус blocked требует причины в поле notes")
    if status in ("review", "done"):
        if not task["evidence"]:
            errors.append(f"статус {status} требует непустого списка evidence")
        for item in task["evidence"]:
            if not isinstance(item, str) or not repo_path_exists(item):
                errors.append(f"доказательство не найдено: {item}")
    if status == "done":
        for deliverable in task["deliverables"]:
            if not repo_path_exists(deliverable):
                errors.append(f"результат не найден: {deliverable}")
    return errors


def check_verification(task: dict) -> list[str]:
    errors: list[str] = []
    accepted: set[str] = set()
    for entry in task["verified_by"]:
        if not isinstance(entry, dict):
            errors.append("запись verified_by должна быть объектом")
            continue
        role = entry.get("role")
        if role == task["owner"]:
            errors.append("владелец подтвердил собственную задачу")
        if role not in task["reviewers"]:
            errors.append(f"подтверждение от роли вне списка проверяющих: {role}")
        if entry.get("verdict") not in ("accepted", "rejected"):
            errors.append(f"вердикт роли {role} должен быть accepted или rejected")
        if not DATE.match(str(entry.get("date", ""))):
            errors.append(f"дата подтверждения роли {role} должна иметь вид ГГГГ-ММ-ДД")
        ref = entry.get("ref")
        if not isinstance(ref, str) or not repo_path_exists(ref):
            errors.append(f"протокол проверки роли {role} не найден: {ref}")
        if entry.get("verdict") == "accepted":
            accepted.add(role)
    if task["status"] == "done":
        missing = [r for r in task["reviewers"] if r not in accepted]
        if missing:
            errors.append(f"done без подтверждения проверяющих: {', '.join(missing)}")
    return errors


def find_cycles(by_id: dict[str, dict]) -> list[str]:
    state: dict[str, int] = {}
    errors: list[str] = []

    def visit(node: str, trail: list[str]) -> None:
        state[node] = 1
        for dep in by_id[node]["depends_on"]:
            if dep not in by_id:
                continue
            if state.get(dep) == 1:
                errors.append("цикл зависимостей: " + " → ".join(trail + [dep]))
            elif state.get(dep) is None:
                visit(dep, trail + [dep])
        state[node] = 2

    for node in by_id:
        if state.get(node) is None:
            visit(node, [node])
    return errors


def validate(plan: dict, roles: set[str]) -> list[str]:
    tasks = plan.get("tasks")
    if not isinstance(tasks, list) or not tasks:
        return ["план не содержит задач"]
    errors: list[str] = []
    counts = Counter(t.get("id") for t in tasks if isinstance(t, dict))
    errors.extend(f"повторяющийся идентификатор {i}" for i, n in counts.items() if n > 1)
    valid: list[dict] = []
    for task in tasks:
        problems = check_fields(task) if isinstance(task, dict) else ["задача должна быть объектом"]
        if problems:
            errors.extend(f"{task.get('id', '?') if isinstance(task, dict) else '?'}: {p}" for p in problems)
        else:
            valid.append(task)
    by_id = {t["id"]: t for t in valid}
    for task in valid:
        for check in (check_identity(task, roles), check_dependencies(task, by_id),
                      check_evidence(task), check_verification(task)):
            errors.extend(f"{task['id']}: {problem}" for problem in check)
    errors.extend(find_cycles(by_id))
    return errors


def report(plan: dict) -> None:
    tasks = plan["tasks"]
    total = Counter(t["status"] for t in tasks)
    done = total.get("done", 0)
    print(f"{plan.get('plan_id', 'план')}: выполнено {done} из {len(tasks)} ({100 * done // len(tasks)}%)")
    for wave, title in sorted(plan.get("waves", {}).items()):
        items = [t for t in tasks if str(t["wave"]) == wave]
        if not items:
            continue
        stats = Counter(t["status"] for t in items)
        line = ", ".join(f"{s}: {stats[s]}" for s in STATUSES if stats.get(s))
        print(f"\nВолна W{wave} — {title} [{line}]")
        for t in items:
            mark = {"done": "[x]", "review": "[?]", "in_progress": "[~]", "blocked": "[!]"}.get(t["status"], "[ ]")
            print(f"  {mark} {t['id']} {t['title']} — {t['owner']}")


def ready(plan: dict) -> None:
    by_id = {t["id"]: t for t in plan["tasks"]}
    items = [t for t in plan["tasks"] if t["status"] == "todo"
             and all(by_id.get(d, {}).get("status") == "done" for d in t["depends_on"])]
    if not items:
        print("Нет задач, готовых к началу.")
        return
    print("Можно начинать:")
    for t in items:
        print(f"  {t['id']} {t['title']}\n      владелец: {t['owner']}; проверяющие: {', '.join(t['reviewers'])}\n      спецификация: {t['spec']}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Проверка плана харнесса")
    parser.add_argument("--plan", type=Path, default=DEFAULT_PLAN)
    parser.add_argument("--report", action="store_true")
    parser.add_argument("--next", action="store_true")
    args = parser.parse_args()

    try:
        plan = json.loads(args.plan.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"Не удалось прочитать план {args.plan}: {exc}")
        return 1

    errors = validate(plan, load_registry_roles())
    if args.report:
        report(plan)
    if args.next:
        ready(plan)
    if errors:
        print("\nПроверка плана харнесса завершилась с ошибками:")
        for error in errors:
            print(f" - {error}")
        return 1
    if not (args.report or args.next):
        print(f"Проверка плана харнесса успешно завершена: {len(plan['tasks'])} задач.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
