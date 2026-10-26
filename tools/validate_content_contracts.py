#!/usr/bin/env python3
"""Проверка согласованности типов учебных заданий и эталонных ответов."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TASKS_ROOT = ROOT / "content" / "tasks"


def validate_placements(identifier: str, payload: dict, answer: dict, expected_kind: str, type_name: str, errors: list[str]):
    observations = payload.get("observations")
    slots = payload.get("slots")
    placements = answer.get("placements")
    if answer.get("kind") != expected_kind:
        errors.append(f"{identifier}: {type_name} требует answer.kind={expected_kind}")
    if not isinstance(observations, list) or len(observations) < 2:
        errors.append(f"{identifier}: {type_name} требует минимум два наблюдения")
        return None
    if not isinstance(slots, list) or len(slots) < 2:
        errors.append(f"{identifier}: {type_name} требует минимум две позиции")
        return None
    if not isinstance(placements, dict):
        errors.append(f"{identifier}: {type_name} требует answer.placements")
        return None

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
    if payload.get("canvas") != {"width": 1000, "height": 1000}:
        errors.append(f"{identifier}: {type_name} должен использовать координатное пространство 1000×1000")
    return observations, slots, placements


def validate_find_error(identifier: str, payload: dict, answer: dict, errors: list[str]):
    stations = payload.get("stations")
    observations = payload.get("observations")
    if answer.get("kind") != "station_id":
        errors.append(f"{identifier}: findError требует answer.kind=station_id")
    if not isinstance(stations, list) or len(stations) < 3:
        errors.append(f"{identifier}: findError требует минимум три станции")
        return
    if not isinstance(observations, list):
        errors.append(f"{identifier}: findError требует observations")
        return
    if payload.get("canvas") != {"width": 1000, "height": 1000}:
        errors.append(f"{identifier}: findError должен использовать координатное пространство 1000×1000")

    station_ids = {item.get("id") for item in stations if isinstance(item, dict)}
    expected = answer.get("value")
    if expected not in station_ids:
        errors.append(f"{identifier}: эталонная station_id отсутствует в stations")

    by_station: dict[str, dict[str, float]] = {}
    for observation in observations:
        if not isinstance(observation, dict):
            continue
        station_id = observation.get("stationId")
        field = observation.get("field")
        value = observation.get("numericValue")
        if station_id not in station_ids:
            errors.append(f"{identifier}: наблюдение ссылается на неизвестную stationId {station_id}")
            continue
        if field not in {"T", "Td"}:
            errors.append(f"{identifier}: для первого findError допустимы только поля T и Td")
            continue
        if not isinstance(value, (int, float)):
            errors.append(f"{identifier}: {station_id}/{field} требует numericValue")
            continue
        by_station.setdefault(station_id, {})[field] = float(value)

    violations: list[str] = []
    for station_id in station_ids:
        fields = by_station.get(station_id, {})
        if set(fields) != {"T", "Td"}:
            errors.append(f"{identifier}: станция {station_id} должна иметь ровно T и Td")
            continue
        if fields["Td"] > fields["T"]:
            violations.append(station_id)

    if len(violations) != 1:
        errors.append(f"{identifier}: должно быть ровно одно однозначное нарушение Td > T, найдено {len(violations)}")
    elif violations[0] != expected:
        errors.append(f"{identifier}: скрытый эталон {expected} не совпадает с физическим нарушением {violations[0]}")
    elif by_station[expected]["Td"] - by_station[expected]["T"] < 2.0:
        errors.append(f"{identifier}: учебное нарушение должно превышать 2 °C, чтобы не имитировать пограничную погрешность")


def load_tasks(errors: list[str]) -> list[dict]:
    tasks: list[dict] = []
    seen: set[str] = set()
    files = sorted(TASKS_ROOT.glob("*.json"))
    if not files:
        errors.append("content/tasks не содержит JSON-файлов")
        return tasks
    for path in files:
        data = json.loads(path.read_text(encoding="utf-8"))
        module_tasks = data.get("tasks")
        if not isinstance(module_tasks, list):
            errors.append(f"{path.name}: отсутствует массив tasks")
            continue
        for task in module_tasks:
            identifier = task.get("id") if isinstance(task, dict) else None
            if not identifier:
                errors.append(f"{path.name}: задание без id")
                continue
            if identifier in seen:
                errors.append(f"дублирующийся id задания: {identifier}")
            seen.add(identifier)
            tasks.append(task)
    return tasks


def main() -> int:
    errors: list[str] = []
    tasks = load_tasks(errors)

    for task in tasks:
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
            validate_placements(identifier, payload, answer, "station_plot", "stationPlot", errors)

        elif task_type == "stationBoard":
            checked = validate_placements(identifier, payload, answer, "station_board", "stationBoard", errors)
            stations = payload.get("stations")
            if not isinstance(stations, list) or len(stations) < 2:
                errors.append(f"{identifier}: stationBoard требует несколько станций")
                continue
            station_ids = {item.get("id") for item in stations if isinstance(item, dict)}
            if None in station_ids or len(station_ids) != len(stations):
                errors.append(f"{identifier}: station.id должны быть уникальными и непустыми")
            if identifier == "station_board_three_001" and len(stations) != 3:
                errors.append(f"{identifier}: этап трёх станций должен содержать ровно 3 станции")
            if identifier == "station_board_eight_001" and not 7 <= len(stations) <= 10:
                errors.append(f"{identifier}: плотный этап должен содержать от 7 до 10 станций")
            for station in stations:
                if not isinstance(station, dict):
                    continue
                x, y = station.get("x"), station.get("y")
                if not isinstance(x, (int, float)) or not isinstance(y, (int, float)) or not 0 <= x <= 1000 or not 0 <= y <= 1000:
                    errors.append(f"{identifier}: координаты станции {station.get('id')} вне диапазона 0..1000")
            if checked:
                observations, slots, placements = checked
                observation_station = {item.get("id"): item.get("stationId") for item in observations if isinstance(item, dict)}
                slot_station = {item.get("id"): item.get("stationId") for item in slots if isinstance(item, dict)}
                for item_id, station_id in {**observation_station, **slot_station}.items():
                    if station_id not in station_ids:
                        errors.append(f"{identifier}: {item_id} ссылается на неизвестную stationId {station_id}")
                for observation_id, slot_id in placements.items():
                    if observation_station.get(observation_id) != slot_station.get(slot_id):
                        errors.append(f"{identifier}: эталон переносит {observation_id} на позицию другой станции {slot_id}")

        elif task_type == "findError":
            validate_find_error(identifier, payload, answer, errors)

    if errors:
        print("Проверка контрактов учебных заданий завершилась с ошибками:")
        for error in errors:
            print(f" - {error}")
        return 1

    print(f"Контракты учебных заданий согласованы: {len(tasks)} заданий в {len(list(TASKS_ROOT.glob('*.json')))} файлах.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
