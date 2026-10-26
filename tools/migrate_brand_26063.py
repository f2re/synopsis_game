#!/usr/bin/env python3
"""One-shot migration of legacy display names to the 26063 brand."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEXT_SUFFIXES = {'.md', '.txt', '.json', '.yaml', '.yml', '.ts', '.tsx', '.js', '.jsx', '.html', '.css', '.svg'}
EXCLUDED_PARTS = {'.git', 'node_modules', 'dist', 'coverage'}

REPLACEMENTS = [
    ('собственный **Синоптический центр**', 'собственный **метеорологический кампус 26063**'),
    ('свой «Синоптический центр»', 'свой кампус 26063'),
    ('Фон «Синоптического центра»', 'Мир кампуса 26063'),
    ('современная сцена «Синоптического центра»', 'современная сцена кампуса 26063'),
    ('## 2. P1 — главный «Синоптический центр»', '## 2. P1 — главный кампус 26063'),
    ('«Синоптического центра»', '«26063: Позывной „Синоптик“»'),
    ('«Синоптический центр»', '«26063: Позывной „Синоптик“»'),
    ('Синоптический центр', '26063: Позывной «Синоптик»'),
    ('Synoptic Center', '26063: Callsign “Synoptician”'),
]


def main() -> int:
    changed: list[str] = []
    for path in ROOT.rglob('*'):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        if any(part in EXCLUDED_PARTS for part in path.parts):
            continue
        text = path.read_text(encoding='utf-8')
        updated = text
        for old, new in REPLACEMENTS:
            updated = updated.replace(old, new)
        if updated != text:
            path.write_text(updated, encoding='utf-8')
            changed.append(str(path.relative_to(ROOT)))

    print(f'Brand migration changed {len(changed)} files:')
    for item in changed:
        print(f' - {item}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
