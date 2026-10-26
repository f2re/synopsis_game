#!/usr/bin/env python3
import argparse
from pathlib import Path


def parse_env(path):
    order = []
    values = {}
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


def schema_value(values):
    try:
        return int(values.get('CONFIG_SCHEMA_VERSION', '0'))
    except ValueError:
        return 0


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--defaults', required=True)
    p.add_argument('--current', required=True)
    p.add_argument('--output', required=True)
    args = p.parse_args()
    default_order, defaults = parse_env(Path(args.defaults))
    current_order, current = parse_env(Path(args.current))
    current_schema = schema_value(current)
    target_schema = schema_value(defaults)
    if current_schema > target_schema:
        raise SystemExit('configuration downgrade is not supported: %s -> %s' % (current_schema, target_schema))
    merged = dict(defaults)
    merged.update(current)
    if 'CONFIG_SCHEMA_VERSION' in defaults:
        merged['CONFIG_SCHEMA_VERSION'] = defaults['CONFIG_SCHEMA_VERSION']
    order = default_order + [k for k in current_order if k not in defaults]
    lines = ['# Managed by Synopsis Game. Existing values are preserved during upgrades.']
    lines += ['%s=%s' % (key, merged[key]) for key in order]
    Path(args.output).write_text('\n'.join(lines) + '\n', encoding='utf-8')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
