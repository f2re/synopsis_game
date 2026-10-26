#!/usr/bin/env python3
"""Проверка согласованности типов учебных заданий и эталонных ответов."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TASKS_PATH = ROOT / "content" / "tasks" / "core_tasks.json"


def main() -> int:
    data = json.loads(TASKS_PATH.read_text(encoding="utf-8"))
    errors: list[str] = []

    for task in data.get("tasks", []):
        identifier = task.get("id", "<без id>")
        task_type = task.get("type")
        answer = task.get("answer") if isinstance(task.get("answer"), dict) else {}
        payload = task.get("payload") if isinstance(task.get("payload"), dict) else {}

        if task_type in {"decode", "numeric"}:
            if answer.get("kind") != "numeric":
                errors.append(f"{identifier}: {task_type} требует answer.kind=numeric")
            if task_type == "decode" and (not payload.get("group") or not payload.get("encoded")):
                errors.append(f"{identifier}: decode требует payload.group и payload.encoded")

        elif task_type == "choice":
            options = payload.get("options")
            if answer.get("kind") != "choice_index":
                errors.append(f"{identifier}: choice требует answer.kind=choice_index")
            if not isinstance(options, list) or len(options) < 2:
                errors.append(f"{identifier}: choice требует минимум два варианта")
            else:
                value = answer.get("value")
                if not isinstance(value, int) or not 0 <= value < len(options):
                    errors.append(f"{identifier}: choice_index вне диапазона вариантов")

        elif task_type == "multiChoice":
            if answer.get("kind") == "choice_index":
                errors.append(f"{identifier}: multiChoice не может иметь одиночный choice_index; используйте choice")

        elif task_type == "sequence":
            steps = task.get("steps")
            order = task.get("correct_order")
            if not isinstance(steps, list) or not isinstance(order, list):
                errors.append(f"{identifier}: sequence требует steps и correct_order")
            elif sorted(order) != list(range(len(steps))):
                errors.append(f"{identifier}: correct_order должен быть перестановкой всех шагов")

    if errors:
        print("Проверка контрактов учебных заданий завершилась с ошибками:")
        for error in errors:
            print(f" - {error}")
        return 1

    print("Контракты учебных заданий согласованы.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
