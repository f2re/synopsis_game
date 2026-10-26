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

        elif task_type == "stationPlot":
            observations = payload.get("observations")
            slots = payload.get("slots")
            placements = answer.get("placements")
            if answer.get("kind") != "station_plot":
                errors.append(f"{identifier}: stationPlot требует answer.kind=station_plot")
            if not isinstance(observations, list) or len(observations) < 2:
                errors.append(f"{identifier}: stationPlot требует минимум два наблюдения")
                continue
            if not isinstance(slots, list) or len(slots) < 2:
                errors.append(f"{identifier}: stationPlot требует минимум две позиции")
                continue
            if not isinstance(placements, dict):
                errors.append(f"{identifier}: stationPlot требует answer.placements")
                continue

            observation_ids = {item.get("id") for item in observations if isinstance(item, dict)}
            slot_ids = {item.get("id") for item in slots if isinstance(item, dict)}
            if None in observation_ids or len(observation_ids) != len(observations):
                errors.append(f"{identifier}: идентификаторы observations должны быть уникальными и непустыми")
            if None in slot_ids or len(slot_ids) != len(slots):
                errors.append(f"{identifier}: идентификаторы slots должны быть уникальными и непустыми")
            if set(placements) != observation_ids:
                errors.append(f"{identifier}: placements должен покрывать все observations")
            unknown_slots = set(placements.values()) - slot_ids
            if unknown_slots:
                errors.append(f"{identifier}: placements содержит неизвестные slots: {sorted(unknown_slots)}")
            canvas = payload.get("canvas")
            if canvas != {"width": 1000, "height": 1000}:
                errors.append(f"{identifier}: первый stationPlot должен использовать координатное пространство 1000×1000")

    if errors:
        print("Проверка контрактов учебных заданий завершилась с ошибками:")
        for error in errors:
            print(f" - {error}")
        return 1

    print("Контракты учебных заданий согласованы.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
