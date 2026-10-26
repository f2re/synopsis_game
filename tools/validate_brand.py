#!/usr/bin/env python3
"""Проверяет каноническое пользовательское название игры."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CANONICAL = '26063: Позывной «Синоптик»'
TEXT_SUFFIXES = {'.md', '.txt', '.json', '.yaml', '.yml', '.ts', '.tsx', '.js', '.jsx', '.html', '.css', '.svg'}
EXCLUDED_PARTS = {'.git', 'node_modules', 'dist', 'coverage'}
OLD_BRANDS = (
    re.compile(r'синоптическ(?:ий|ого|ому|им|ом)\s+центр(?:а|у|ом|е)?', re.IGNORECASE),
    re.compile(r'\bSynoptic\s+Center\b', re.IGNORECASE),
)


def main() -> int:
    errors: list[str] = []
    canonical_found = False

    for path in ROOT.rglob('*'):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        if any(part in EXCLUDED_PARTS for part in path.parts):
            continue
        try:
            text = path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            continue
        rel = path.relative_to(ROOT)
        canonical_found = canonical_found or CANONICAL in text
        for line_no, line in enumerate(text.splitlines(), start=1):
            for pattern in OLD_BRANDS:
                match = pattern.search(line)
                if match:
                    errors.append(f'{rel}:{line_no}: устаревшее название: {match.group(0)!r}')

    if not canonical_found:
        errors.append(f'каноническое название {CANONICAL!r} не найдено')

    if errors:
        print('Проверка бренда завершилась с ошибками:')
        for error in errors:
            print(f' - {error}')
        return 1

    print(f'Проверка бренда успешно завершена: {CANONICAL}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
