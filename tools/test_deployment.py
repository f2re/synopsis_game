#!/usr/bin/env python3
import importlib.util
import io
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def parse_env(path):
    out = {}
    for line in path.read_text(encoding='utf-8').splitlines():
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            out[key] = value
    return out


def test_config_merge(tmp):
    defaults = tmp / 'defaults.env'
    current = tmp / 'current.env'
    output = tmp / 'merged.env'
    defaults.write_text('CONFIG_SCHEMA_VERSION=2\nMAPS_PROVIDER=none\nNEW_SETTING=added\n', encoding='utf-8')
    current.write_text('CONFIG_SCHEMA_VERSION=1\nMAPS_PROVIDER=local\nLOCAL_SECRET=keep-me\n', encoding='utf-8')
    subprocess.run([
        sys.executable, str(ROOT / 'deploy/scripts/config_merge.py'),
        '--defaults', str(defaults), '--current', str(current), '--output', str(output),
    ], check=True)
    merged = parse_env(output)
    assert merged['CONFIG_SCHEMA_VERSION'] == '2'
    assert merged['MAPS_PROVIDER'] == 'local'
    assert merged['NEW_SETTING'] == 'added'
    assert merged['LOCAL_SECRET'] == 'keep-me'


def test_safe_extract(tmp):
    updater = load_module('synopsis_update_extract', ROOT / 'deploy/scripts/update.py')
    good = tmp / 'good.tar.gz'
    with tarfile.open(good, 'w:gz') as tf:
        data = b'ok\n'
        info = tarfile.TarInfo('release/VERSION')
        info.size = len(data)
        tf.addfile(info, io.BytesIO(data))
    good_out = tmp / 'good-out'; good_out.mkdir()
    updater.safe_extract(good, good_out)
    assert (good_out / 'release/VERSION').read_text() == 'ok\n'

    bad = tmp / 'bad.tar.gz'
    with tarfile.open(bad, 'w:gz') as tf:
        data = b'escape'
        info = tarfile.TarInfo('../escape.txt')
        info.size = len(data)
        tf.addfile(info, io.BytesIO(data))
    bad_out = tmp / 'bad-out'; bad_out.mkdir()
    try:
        updater.safe_extract(bad, bad_out)
    except RuntimeError:
        pass
    else:
        raise AssertionError('path traversal archive was accepted')


def test_restore_clears_failed_migration_state(tmp):
    updater = load_module('synopsis_update_restore', ROOT / 'deploy/scripts/update.py')
    state = tmp / 'state'; state.mkdir()
    updater.STATE = state
    (state / 'data').mkdir(); (state / 'data/new.txt').write_text('new', encoding='utf-8')
    (state / 'migrations').mkdir(); (state / 'migrations/applied.json').write_text('{"new": "hash"}', encoding='utf-8')

    backup = tmp / 'backup'; (backup / 'etc').mkdir(parents=True); (backup / 'data').mkdir()
    (backup / 'etc/app.env').write_text('DATABASE_KIND=sqlite\nDATABASE_URL=file:/tmp/test.sqlite3\n', encoding='utf-8')
    (backup / 'data/old.txt').write_text('old', encoding='utf-8')
    app_env = tmp / 'app.env'; app_env.write_text('DATABASE_KIND=sqlite\n', encoding='utf-8')

    updater.restore_backup(backup, app_env)
    assert (state / 'data/old.txt').read_text(encoding='utf-8') == 'old'
    assert not (state / 'data/new.txt').exists()
    assert (state / 'migrations').is_dir()
    assert not (state / 'migrations/applied.json').exists()


def test_release_name_parser():
    checker = load_module('synopsis_check_update', ROOT / 'deploy/scripts/check-update.py')
    assert checker.release_version('synopsis-game-1.2.3-linux-x64.tar.gz') == '1.2.3'
    assert checker.release_version('other.tar.gz') is None
    assert checker.semver('2.10.3') > checker.semver('2.9.99')


def test_updater_version_parser():
    updater = load_module('synopsis_update_version', ROOT / 'deploy/scripts/update.py')
    assert updater.semver('2.10.3') > updater.semver('2.9.99')
    assert updater.semver('invalid') is None


def main():
    with tempfile.TemporaryDirectory(prefix='synopsis-deploy-test-') as directory:
        tmp = Path(directory)
        test_config_merge(tmp)
        test_safe_extract(tmp)
        test_restore_clears_failed_migration_state(tmp)
    test_release_name_parser()
    test_updater_version_parser()
    print('Deployment tests passed.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
