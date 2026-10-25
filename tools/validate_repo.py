#!/usr/bin/env python3
"""Лёгкая проверка структуры репозитория без сторонних зависимостей."""

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

# Эти выражения запрещены только в обычном пояснительном Markdown-тексте.
# Блоки кода, inline-code, URL и специально посвящённая языку страница исключаются.
LANGUAGE_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\bStatus\s*:", re.IGNORECASE), "используйте «Статус:»"),
    (re.compile(r"\bliving document\b", re.IGNORECASE), "используйте «постоянно обновляемый документ»"),
    (re.compile(r"\bAcceptance criteria\b", re.IGNORECASE), "используйте «критерии приёмки»"),
    (re.compile(r"\bDefinition of Ready\b", re.IGNORECASE), "используйте «условия готовности к началу работы»"),
    (re.compile(r"\bDefinition of Done\b", re.IGNORECASE), "используйте «условия завершения»"),
    (re.compile(r"\bgameplay\b", re.IGNORECASE), "используйте «игровая механика» или «игровой процесс»"),
    (re.compile(r"\bruntime\b", re.IGNORECASE), "используйте «рабочий контур» или «работа системы»"),
    (re.compile(r"\bbacklog\b", re.IGNORECASE), "используйте «перечень задач»"),
    (re.compile(r"\broadmap\b", re.IGNORECASE), "используйте «план реализации»"),
    (re.compile(r"\brealtime\b", re.IGNORECASE), "используйте «в реальном времени»"),
    (re.compile(r"\bleaderboard\b", re.IGNORECASE), "используйте «таблица лидеров»"),
    (re.compile(r"\bmatchmaking\b", re.IGNORECASE), "используйте «подбор соперников»"),
    (re.compile(r"\battract mode\b", re.IGNORECASE), "используйте «демонстрационный режим»"),
    (re.compile(r"\bliving world\b", re.IGNORECASE), "используйте «живой мир»"),
    (re.compile(r"\bpay[- ]to[- ]win\b", re.IGNORECASE), "используйте «продажа игровой силы»"),
    (re.compile(r"\bgame[- ]first\b", re.IGNORECASE), "опишите приоритет текущей задачи по-русски"),
    (re.compile(r"\bweb[- ]first\b", re.IGNORECASE), "используйте «браузерная архитектура»"),
    (re.compile(r"\bконтент(?:а|е|ом|у)?\b", re.IGNORECASE), "используйте «учебное содержание» или «материал»"),
    (re.compile(r"\bгеймпле(?:й|я|ем|ю)\b", re.IGNORECASE), "используйте «игровая механика» или «игровой процесс»"),
    (re.compile(r"\bрантайм(?:а|е|ом|у)?\b", re.IGNORECASE), "используйте «рабочий контур»"),
    (re.compile(r"\bбэклог(?:а|е|ом|у)?\b", re.IGNORECASE), "используйте «перечень задач»"),
    (re.compile(r"\bроадмап(?:а|е|ом|у)?\b", re.IGNORECASE), "используйте «план реализации»"),
    (re.compile(r"\bревью\b", re.IGNORECASE), "используйте «проверка» или «приёмка»"),
    (re.compile(r"\bворкфлоу\b", re.IGNORECASE), "используйте «порядок работы»"),
    (re.compile(r"\bпайплайн(?:а|е|ом|у)?\b", re.IGNORECASE), "используйте «поток обработки» или «конвейер»"),
    (re.compile(r"\bснапшот(?:а|е|ом|у)?\b", re.IGNORECASE), "используйте «снимок данных»"),
    (re.compile(r"\bрепле(?:й|я|ем|ю)\b", re.IGNORECASE), "используйте «повтор» или «воспроизведение»"),
    (re.compile(r"\bлидерборд(?:а|е|ом|у)?\b", re.IGNORECASE), "используйте «таблица лидеров»"),
    (re.compile(r"\bматчмейкинг(?:а|е|ом|у)?\b", re.IGNORECASE), "используйте «подбор соперников»"),
)


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


def strip_nonprose_markdown(text: str) -> str:
    """Убирает области, где иностранные идентификаторы являются частью контракта."""
    text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
    text = re.sub(r"`[^`]+`", "", text)
    text = re.sub(r"\[[^\]]*\]\([^)]+\)", "", text)
    text = re.sub(r"https?://\S+", "", text)
    return text


def check_documentation_language() -> list[str]:
    errors: list[str] = []
    paths = [ROOT / "README.md", ROOT / "CONTRIBUTING.md"]
    docs_root = ROOT / "docs"
    if docs_root.exists():
        paths.extend(sorted(docs_root.rglob("*.md")))

    excluded = {
        ROOT / "docs" / "LANGUAGE_POLICY.md",  # содержит примеры запрещённых слов намеренно
    }

    for path in paths:
        if not path.exists() or path in excluded:
            continue
        prose = strip_nonprose_markdown(path.read_text(encoding="utf-8"))
        for line_no, line in enumerate(prose.splitlines(), start=1):
            for pattern, recommendation in LANGUAGE_PATTERNS:
                match = pattern.search(line)
                if match:
                    fragment = match.group(0)
                    errors.append(
                        f"documentation language: {path.relative_to(ROOT)}:{line_no}: "
                        f"{fragment!r}; {recommendation}"
                    )
    return errors


def check_required_files() -> list[str]:
    required = [
        "README.md",
        "CONTRIBUTING.md",
        "SECURITY.md",
        "CHANGELOG.md",
        "docs/README.md",
        "docs/LANGUAGE_POLICY.md",
        "docs/00_VISION_GDD.md",
        "docs/01_RUSSIAN_SYNOPIC_SCHOOL.md",
        "docs/09_SOURCE_POLICY.md",
        "docs/agents/MULTI_AGENT_DEVELOPMENT.md",
        "docs/testing/QUALITY_GATES.md",
    ]
    return [f"missing required file: {name}" for name in required if not (ROOT / name).exists()]


def main() -> int:
    errors: list[str] = []
    errors.extend(check_required_files())
    errors.extend(check_json())
    errors.extend(check_markdown_links())
    errors.extend(check_duplicate_catalog_ids())
    errors.extend(check_documentation_language())

    if errors:
        print("Проверка репозитория завершилась с ошибками:")
        for error in errors:
            print(f" - {error}")
        return 1

    print("Проверка репозитория успешно завершена.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
