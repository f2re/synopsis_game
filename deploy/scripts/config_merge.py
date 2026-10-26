#!/usr/bin/env python3
from __future__ import annotations
import argparse
from pathlib import Path


def parse_env(path: Path) -> tuple[list[str], dict[str, str]]:
    order: list[str] = []
    values: dict[str, str] = {}
    if not path.exists():
        return order, values
    for raw in path.read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        key = key.strip()
        if key and key not in values:
            order.append(key)
        values[key] = value
    return order, values


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument('--defaults', required=True)
    p.add_argument('--current', required=True)
    p.add_argument('--output', required=True)
    args = p.parse_args()
    default_order, defaults = parse_env(Path(args.defaults))
    current_order, current = parse_env(Path(args.current))
    merged = dict(defaults)
    merged.update(current)
    order = default_order + [k for k in current_order if k not in defaults]
    lines = ['# Managed by Synopsis Game. Existing values are preserved during upgrades.']
    lines += [f'{key}={merged[key]}' for key in order]
    Path(args.output).write_text('\n'.join(lines) + '\n', encoding='utf-8')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
