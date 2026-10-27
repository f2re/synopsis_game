#!/usr/bin/env python3
"""Проверка согласованности типов учебных заданий, методических графов и эталонов."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TASKS_ROOT = ROOT / "content" / "tasks"
PROFILES_ROOT = ROOT / "content" / "method-profiles"
LEVELS_ROOT = ROOT / "content" / "levels"
SCHEMAS_ROOT = ROOT / "content" / "schemas"

FORBIDDEN_CLIENT_KEYS = {"answer", "correctAnswer", "solution", "expected", "secret"}


def validate_levels(errors: list[str]) -> int:
    schema_path = SCHEMAS_ROOT / "level.schema.json"
    if schema_path.exists():
        try:
            json.loads(schema_path.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"level.schema.json: синтаксическая ошибка JSON: {exc}")
            return 0
    levels = sorted(LEVELS_ROOT.glob("*.json")) if LEVELS_ROOT.exists() else []
    for path in levels:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"{path.name}: синтаксическая ошибка JSON: {exc}")
            continue
        for req in ("schema_version", "level_id", "title", "description", "method_profile", "shifts", "game_modes"):
            if req not in data:
                errors.append(f"{path.name}: отсутствует обязательное поле {req}")
        # Проверка безопасности: клиентская схема уровня никогда не содержит ответов
        raw_text = path.read_text(encoding="utf-8")
        for key in FORBIDDEN_CLIENT_KEYS:
            if f'"{key}"' in raw_text:
                errors.append(f"{path.name}: утечка ответа: обнаружен запрещённый ключ \"{key}\"")
        for shift in data.get("shifts", []):
            if not isinstance(shift, dict):
                continue
            for slot in shift.get("task_slots", []):
                for key in FORBIDDEN_CLIENT_KEYS:
                    if key in slot:
                        errors.append(f"{path.name} / {shift.get('id')}: обнаружен ключ ответа \"{key}\" в task_slot")
    return len(levels)


def validate_dag(identifier: str, operations: list[dict], dependencies: list, errors: list[str]) -> None:
    ids = [item.get("id") for item in operations if isinstance(item, dict)]
    if len(ids) != len(operations) or None in ids or len(set(ids)) != len(ids):
        errors.append(f"{identifier}: operation.id должны быть уникальными и непустыми")
        return
    known = set(ids)
    outgoing = {item_id: [] for item_id in ids}
    indegree = {item_id: 0 for item_id in ids}
    for edge in dependencies:
        if not isinstance(edge, list) or len(edge) != 2:
            errors.append(f"{identifier}: каждая зависимость должна содержать два id")
            continue
        before, after = edge
        if before not in known or after not in known or before == after:
            errors.append(f"{identifier}: некорректная зависимость {before} -> {after}")
            continue
        outgoing[before].append(after)
        indegree[after] += 1
    queue = [item_id for item_id, degree in indegree.items() if degree == 0]
    visited = 0
    while queue:
        current = queue.pop()
        visited += 1
        for nxt in outgoing[current]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)
    if visited != len(ids):
        errors.append(f"{identifier}: граф зависимостей содержит цикл")


def load_profiles(errors: list[str]) -> dict[str, dict]:
    profiles: dict[str, dict] = {}
    for path in sorted(PROFILES_ROOT.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        profile_id = data.get("id")
        if not profile_id:
            errors.append(f"{path.name}: методический профиль без id")
            continue
        if profile_id in profiles:
            errors.append(f"дублирующийся id методического профиля: {profile_id}")
        profiles[profile_id] = data
        for graph_id, graph in (data.get("dependency_graphs") or {}).items():
            operations = graph.get("operations") if isinstance(graph, dict) else None
            dependencies = graph.get("dependencies") if isinstance(graph, dict) else None
            if not isinstance(operations, list) or len(operations) < 2 or not isinstance(dependencies, list):
                errors.append(f"{profile_id}/{graph_id}: нужны operations и dependencies")
                continue
            validate_dag(f"{profile_id}/{graph_id}", operations, dependencies, errors)
            review = graph.get("review") or {}
            if review.get("publication_allowed") and graph.get("status") != "published":
                errors.append(f"{profile_id}/{graph_id}: publication_allowed=true при status={graph.get('status')}")
    return profiles


def validate_placements(identifier: str, payload: dict, answer: dict, expected_kind: str, type_name: str, errors: list[str]):
    observations, slots, placements = payload.get("observations"), payload.get("slots"), answer.get("placements")
    if answer.get("kind") != expected_kind:
        errors.append(f"{identifier}: {type_name} требует answer.kind={expected_kind}")
    if not isinstance(observations, list) or len(observations) < 2:
        errors.append(f"{identifier}: {type_name} требует минимум два наблюдения"); return None
    if not isinstance(slots, list) or len(slots) < 2:
        errors.append(f"{identifier}: {type_name} требует минимум две позиции"); return None
    if not isinstance(placements, dict):
        errors.append(f"{identifier}: {type_name} требует answer.placements"); return None
    observation_ids = {item.get("id") for item in observations if isinstance(item, dict)}
    slot_ids = {item.get("id") for item in slots if isinstance(item, dict)}
    if None in observation_ids or len(observation_ids) != len(observations): errors.append(f"{identifier}: observations.id должны быть уникальными")
    if None in slot_ids or len(slot_ids) != len(slots): errors.append(f"{identifier}: slots.id должны быть уникальными")
    if set(placements) != observation_ids: errors.append(f"{identifier}: placements должен покрывать все observations")
    unknown_slots = set(placements.values()) - slot_ids
    if unknown_slots: errors.append(f"{identifier}: placements содержит неизвестные slots: {sorted(unknown_slots)}")
    if payload.get("canvas") != {"width": 1000, "height": 1000}: errors.append(f"{identifier}: {type_name} должен использовать 1000×1000")
    return observations, slots, placements


def validate_find_error(identifier: str, payload: dict, answer: dict, errors: list[str]):
    stations, observations = payload.get("stations"), payload.get("observations")
    if answer.get("kind") != "station_id": errors.append(f"{identifier}: findError требует answer.kind=station_id")
    if not isinstance(stations, list) or len(stations) < 3 or not isinstance(observations, list):
        errors.append(f"{identifier}: findError требует минимум три станции и observations"); return
    station_ids = {item.get("id") for item in stations if isinstance(item, dict)}
    expected = answer.get("value")
    if expected not in station_ids: errors.append(f"{identifier}: эталонная station_id отсутствует")
    by_station: dict[str, dict[str, float]] = {}
    for obs in observations:
        if not isinstance(obs, dict): continue
        sid, field, value = obs.get("stationId"), obs.get("field"), obs.get("numericValue")
        if sid not in station_ids: errors.append(f"{identifier}: неизвестная stationId {sid}"); continue
        if field not in {"T", "Td"} or not isinstance(value, (int, float)):
            errors.append(f"{identifier}: первый findError требует числовые T и Td"); continue
        by_station.setdefault(sid, {})[field] = float(value)
    violations = []
    for sid in station_ids:
        fields = by_station.get(sid, {})
        if set(fields) != {"T", "Td"}: errors.append(f"{identifier}: станция {sid} должна иметь T и Td"); continue
        if fields["Td"] > fields["T"]: violations.append(sid)
    if len(violations) != 1: errors.append(f"{identifier}: должно быть ровно одно нарушение Td > T, найдено {len(violations)}")
    elif violations[0] != expected: errors.append(f"{identifier}: эталон {expected} не совпадает с нарушением {violations[0]}")
    elif by_station[expected]["Td"] - by_station[expected]["T"] < 2.0: errors.append(f"{identifier}: нарушение должно превышать 2 °C")


def load_tasks(errors: list[str]) -> list[dict]:
    tasks, seen = [], set()
    for path in sorted(TASKS_ROOT.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        module_tasks = data.get("tasks")
        if not isinstance(module_tasks, list): errors.append(f"{path.name}: отсутствует массив tasks"); continue
        for task in module_tasks:
            identifier = task.get("id") if isinstance(task, dict) else None
            if not identifier: errors.append(f"{path.name}: задание без id"); continue
            if identifier in seen: errors.append(f"дублирующийся id задания: {identifier}")
            seen.add(identifier); tasks.append(task)
    return tasks


def main() -> int:
    errors: list[str] = []
    profiles = load_profiles(errors)
    tasks = load_tasks(errors)

    for task in tasks:
        identifier, task_type = task.get("id", "<без id>"), task.get("type")
        answer = task.get("answer") if isinstance(task.get("answer"), dict) else {}
        payload = task.get("payload") if isinstance(task.get("payload"), dict) else {}
        if task_type in {"decode", "numeric"}:
            if answer.get("kind") != "numeric": errors.append(f"{identifier}: {task_type} требует answer.kind=numeric")
            if task_type == "decode" and (not payload.get("group") or not payload.get("encoded")): errors.append(f"{identifier}: decode требует group/encoded")
        elif task_type == "choice":
            options = payload.get("options")
            if answer.get("kind") != "choice_index": errors.append(f"{identifier}: choice требует choice_index")
            if not isinstance(options, list) or len(options) < 2: errors.append(f"{identifier}: choice требует минимум два варианта")
            elif not isinstance(answer.get("value"), int) or not 0 <= answer["value"] < len(options): errors.append(f"{identifier}: choice_index вне диапазона")
        elif task_type == "sequence":
            steps, order = task.get("steps"), task.get("correct_order")
            if not isinstance(steps, list) or not isinstance(order, list): errors.append(f"{identifier}: sequence требует steps/correct_order")
            elif sorted(order) != list(range(len(steps))): errors.append(f"{identifier}: correct_order должен быть перестановкой")
        elif task_type == "dependencySequence":
            profile_id, graph_id = task.get("method_profile"), task.get("dependency_graph")
            graph = (profiles.get(profile_id, {}).get("dependency_graphs") or {}).get(graph_id)
            if not graph: errors.append(f"{identifier}: не найден граф {profile_id}/{graph_id}")
            elif graph.get("review", {}).get("publication_allowed") is True and graph.get("status") != "published": errors.append(f"{identifier}: используется некорректно опубликованный граф")
        elif task_type == "stationPlot": validate_placements(identifier, payload, answer, "station_plot", "stationPlot", errors)
        elif task_type == "stationBoard":
            checked = validate_placements(identifier, payload, answer, "station_board", "stationBoard", errors)
            stations = payload.get("stations")
            if not isinstance(stations, list) or len(stations) < 2: errors.append(f"{identifier}: stationBoard требует несколько станций"); continue
            station_ids = {item.get("id") for item in stations if isinstance(item, dict)}
            if identifier == "station_board_three_001" and len(stations) != 3: errors.append(f"{identifier}: нужно ровно 3 станции")
            if identifier == "station_board_eight_001" and not 7 <= len(stations) <= 10: errors.append(f"{identifier}: нужно 7–10 станций")
            if checked:
                observations, slots, placements = checked
                obs_station = {item.get("id"): item.get("stationId") for item in observations if isinstance(item, dict)}
                slot_station = {item.get("id"): item.get("stationId") for item in slots if isinstance(item, dict)}
                for item_id, sid in {**obs_station, **slot_station}.items():
                    if sid not in station_ids: errors.append(f"{identifier}: {item_id} ссылается на неизвестную станцию")
                for obs_id, slot_id in placements.items():
                    if obs_station.get(obs_id) != slot_station.get(slot_id): errors.append(f"{identifier}: {obs_id} перенесён на другую станцию")
        elif task_type == "findError": validate_find_error(identifier, payload, answer, errors)

    levels_count = validate_levels(errors)

    if errors:
        print("Проверка контрактов учебных заданий завершилась с ошибками:")
        for error in errors: print(f" - {error}")
        return 1
    print(f"Контракты согласованы: {len(tasks)} заданий, {len(profiles)} методических профилей, {levels_count} уровней.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
