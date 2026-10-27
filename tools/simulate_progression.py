#!/usr/bin/env python3
"""Моделирование кривой освоения навыков и числа смен до допуска (W1-04)."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "content/balance/kn01_level1_progression.json"

with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    config = json.load(f)

skills_config = {s["id"]: s for s in config["skills"]}
mode_mults = config["mode_multipliers"]
diff_mults = config["difficulty_multipliers"]
params = config["mastery_parameters"]
threshold = config["qualification_thresholds"]["min_skill_mastery"]

class PlayerProfile:
    def __init__(self, name: str, default_mode: str, accuracy: float, shift_schedule: list):
        self.name = name
        self.default_mode = default_mode
        self.accuracy = accuracy
        self.shift_schedule = shift_schedule
        self.mastery = {s: 0.0 for s in skills_config}
        self.history = []

    def update_skill(self, skill_id: str, is_correct: bool, mode: str, difficulty: int = 1, weight: float = 1.0):
        m = self.mastery[skill_id]
        base_gain = skills_config[skill_id]["base_gain"] * weight
        k_mode = mode_mults.get(mode, 1.0)
        k_diff = diff_mults.get(str(difficulty), 1.0)

        if is_correct:
            delta = k_mode * k_diff * base_gain * (1.0 - m / 100.0)
            self.mastery[skill_id] = min(100.0, m + delta)
        else:
            delta = - k_mode * params["error_penalty_factor"] * base_gain * (m / 100.0)
            self.mastery[skill_id] = max(0.0, m + delta)

    def play_shift(self, shift_name: str, mode: str, task_distribution: list):
        for task in task_distribution:
            skill_id = task[0]
            count = task[1]
            diff = task[2]
            for i in range(count):
                is_correct = ((hash((self.name, shift_name, skill_id, i)) % 100) < (self.accuracy * 100))
                self.update_skill(skill_id, is_correct, mode, diff)
                # Комплексные задания (С5) дополнительно тренируют компоненты
                if skill_id == "kn01.full_telegram":
                    for sub in ["kn01.header", "kn01.temperature", "kn01.pressure", "kn01.wind_clouds"]:
                        self.update_skill(sub, is_correct, mode, diff, weight=0.3)

        min_m = min(self.mastery.values())
        avg_m = sum(self.mastery.values()) / len(self.mastery)
        self.history.append({
            "shift": shift_name,
            "mode": mode,
            "min_mastery": round(min_m, 1),
            "avg_mastery": round(avg_m, 1),
            "mastery_by_skill": {k: round(v, 1) for k, v in self.mastery.items()},
            "qualified": min_m >= threshold
        })

    def play_adaptive_shift(self, shift_name: str, mode: str):
        # Адаптивная тренировка по журналу ошибок: выбор двух наименее освоенных навыков
        sorted_skills = sorted(self.mastery.items(), key=lambda kv: kv[1])
        weakest_1 = sorted_skills[0][0]
        weakest_2 = sorted_skills[1][0]
        dist = [(weakest_1, 3, 2), (weakest_2, 3, 2)]
        self.play_shift(shift_name, mode, dist)

def run_simulation():
    # Точные слоты из content/levels/kn01_level1.json:
    # С1: 6 заданий (сложность 1, 1, 2, 1, 2, 1) -> kn01.header
    # С2: 6 заданий (сложность 1, 1, 2, 2, 2, 3) -> kn01.temperature
    # С3: 6 заданий (сложность 1, 2, 2, 2, 2, 3) -> kn01.pressure
    # С4: 6 заданий (сложность 1, 1, 2, 2, 2, 3) -> kn01.wind_clouds
    # С5: 4 комплексных задания (сложность 3, 3, 3, 3) -> kn01.full_telegram (+ подкрепление всех 4)
    # Тренировочные смены (повтор слабо освоенных тем по 6 слотов)

    c1 = [("kn01.header", 4, 1), ("kn01.header", 2, 2)]
    c2 = [("kn01.temperature", 2, 1), ("kn01.temperature", 3, 2), ("kn01.temperature", 1, 3)]
    c3 = [("kn01.pressure", 1, 1), ("kn01.pressure", 4, 2), ("kn01.pressure", 1, 3)]
    c4 = [("kn01.wind_clouds", 2, 1), ("kn01.wind_clouds", 3, 2), ("kn01.wind_clouds", 1, 3)]
    c5 = [("kn01.full_telegram", 4, 3)]

    repeat_c1_c2 = [("kn01.header", 3, 2), ("kn01.temperature", 3, 2)]
    repeat_c3_c4 = [("kn01.pressure", 3, 2), ("kn01.wind_clouds", 3, 2)]
    repeat_general = [("kn01.full_telegram", 2, 2), ("kn01.temperature", 2, 2), ("kn01.pressure", 2, 2)]
    practice_c5 = [("kn01.full_telegram", 3, 2), ("kn01.header", 1, 2), ("kn01.wind_clouds", 2, 2)]

    profiles = [
        PlayerProfile("Сильный студент (Strong)", "solo", 0.95, [
            ("С1: Позывные эфира", "solo", c1),
            ("С2: Термометр", "solo", c2),
            ("С3: Барометр", "solo", c3),
            ("С4: Ветер и облака", "solo", c4),
            ("С5: Полная лента", "solo", c5),
        ]),
        PlayerProfile("Средний студент (Average)", "mentor", 0.82, [
            ("С1: Позывные эфира", "mentor", c1),
            ("С2: Термометр", "mentor", c2),
            ("С3: Барометр", "solo", c3),
            ("С4: Ветер и облака", "solo", c4),
            ("С5: Полная лента", "solo", c5),
            ("Тренировка: повтор С1-С2", "solo", repeat_c1_c2),
            ("Закрепление: полная лента", "solo", practice_c5),
        ]),
        PlayerProfile("Начинающий студент (Struggling)", "mentor", 0.70, [
            ("С1: Позывные эфира", "mentor", c1),
            ("С2: Термометр", "mentor", c2),
            ("С3: Барометр", "mentor", c3),
            ("С4: Ветер и облака", "mentor", c4),
            ("С5: Полная лента", "mentor", c5),
            ("Тренировка 1: слабые навыки", "solo", "adaptive"),
            ("Тренировка 2: слабые навыки", "solo", "adaptive"),
            ("Тренировка 3: закрепление", "solo", "adaptive"),
        ]),
    ]

    report_lines = ["# Результаты математического моделирования кривой освоения (W1-04)\n"]

    for p in profiles:
        report_lines.append(f"## {p.name}")
        report_lines.append(f"- Базовая точность: {int(p.accuracy * 100)}%")
        report_lines.append(f"- Порог допуска: {threshold} баллов по всем навыкам\n")
        report_lines.append("| Смена | Режим | Мин. навык | Средний навык | Допуск к экзамену? |")
        report_lines.append("|---|---|---|---|---|")
        shifts_to_qual = None
        for i, (name, mode, dist) in enumerate(p.shift_schedule, 1):
            if dist == "adaptive":
                p.play_adaptive_shift(name, mode)
            else:
                p.play_shift(name, mode, dist)
            h = p.history[-1]
            status = "**ДОПУЩЕН**" if h["qualified"] else "В процессе"
            if h["qualified"] and shifts_to_qual is None:
                shifts_to_qual = i
            report_lines.append(f"| {i}. {name} | `{mode}` | {h['min_mastery']} | {h['avg_mastery']} | {status} |")

        report_lines.append(f"\n- **Число смен до допуска:** {shifts_to_qual if shifts_to_qual else '> ' + str(len(p.shift_schedule))}")
        report_lines.append(f"- **Соответствие нормативу (5–9 смен):** {'ВЫПОЛНЕНО' if shifts_to_qual and 5 <= shifts_to_qual <= 9 else 'НЕТ'}")
        report_lines.append(f"- **Итоговые показатели навыков:** {json.dumps(p.history[-1]['mastery_by_skill'], ensure_ascii=False)}\n")

    return "\n".join(report_lines)

if __name__ == "__main__":
    out = run_simulation()
    print(out)
