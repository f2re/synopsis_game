#!/usr/bin/env python3
import argparse
import importlib.util
import io
import os
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
    (backup / 'data/latest').symlink_to('old.txt')
    app_env = tmp / 'app.env'; app_env.write_text('DATABASE_KIND=sqlite\n', encoding='utf-8')

    updater.restore_backup(backup, app_env)
    assert (state / 'data/old.txt').read_text(encoding='utf-8') == 'old'
    assert not (state / 'data/new.txt').exists()
    assert (state / 'data/latest').is_symlink()
    assert (state / 'data/latest').read_text(encoding='utf-8') == 'old'
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


def test_healthcheck_uses_installed_port(tmp):
    fixture = tmp / 'healthcheck'
    commands = fixture / 'bin'
    commands.mkdir(parents=True)
    config = fixture / 'app.env'
    log = fixture / 'curl-arguments.txt'
    curl = commands / 'curl'
    curl.write_text('#!/bin/sh\nprintf "%s\\n" "$@" >> "$HEALTHCHECK_CURL_LOG"\n', encoding='utf-8')
    curl.chmod(0o755)
    environment = os.environ.copy()
    environment.pop('API_PORT', None)
    environment.update({
        'PATH': str(commands) + os.pathsep + environment.get('PATH', ''),
        'CONFIG_FILE': str(config),
        'HEALTHCHECK_CURL_LOG': str(log),
    })

    def check(expected_url=None, explicit_url=None):
        if log.exists():
            log.unlink()
        command = ['/bin/bash', str(ROOT / 'deploy/scripts/healthcheck.sh')]
        if explicit_url is not None:
            command.append(explicit_url)
        result = subprocess.run(command, env=environment, text=True, capture_output=True)
        if expected_url is None:
            assert result.returncode != 0, 'Invalid configured port was accepted'
            assert not log.exists(), 'Invalid configuration must not probe a different service'
        else:
            assert result.returncode == 0, result.stderr
            assert log.read_text(encoding='utf-8').splitlines()[-1] == expected_url

    # Тот же вызов, что делает старый update.py: порт есть только в app.env.
    config.write_text('API_PORT=55123\n', encoding='utf-8')
    check('http://127.0.0.1:55123/ready')
    environment['API_PORT'] = '4174'
    check('http://127.0.0.1:55123/ready')
    config.write_text('API_PORT="55124"\n', encoding='utf-8')
    check('http://127.0.0.1:55124/ready')

    config.unlink()
    environment['API_PORT'] = '55125'
    check('http://127.0.0.1:55125/ready')
    environment.pop('API_PORT')
    check('http://127.0.0.1:4174/ready')

    config.write_text('API_PORT=invalid\n', encoding='utf-8')
    check('http://127.0.0.1:55126/ready', 'http://127.0.0.1:55126/ready')
    for invalid in ('invalid', '0', '65536', '55123/path'):
        config.write_text('API_PORT=' + invalid + '\n', encoding='utf-8')
        check()

    marker = fixture / 'must-not-exist'
    config.write_text('API_PORT=$(touch "' + str(marker) + '")\n', encoding='utf-8')
    check()
    assert not marker.exists(), 'Configuration was executed as a shell program'


def test_restore_preserves_ownership(tmp):
    assert os.geteuid() == 0, 'Ownership acceptance requires root in the isolated CI fixture'
    updater = load_module('synopsis_update_ownership', ROOT / 'deploy/scripts/update.py')
    fixture = tmp / 'ownership'
    state = fixture / 'state'
    backup = fixture / 'backup'
    (backup / 'etc').mkdir(parents=True)
    for name in ('data', 'migrations'):
        (state / name).mkdir(parents=True)
        original = backup / name
        original.mkdir()
        (original / 'saved.json').write_text('{"saved": true}\n', encoding='utf-8')
        os.chown(original, 65534, 65534)
        original.chmod(0o750)
        os.chown(original / 'saved.json', 65534, 65534)
        (original / 'saved.json').chmod(0o640)
    saved_config = backup / 'etc/app.env'
    saved_config.write_text('DATABASE_KIND=sqlite\nAPI_PORT=55123\n', encoding='utf-8')
    os.chown(saved_config, 0, 65534)
    saved_config.chmod(0o640)
    app_env = fixture / 'app.env'
    app_env.write_text('DATABASE_KIND=sqlite\n', encoding='utf-8')
    updater.STATE = state

    updater.restore_backup(backup, app_env)

    for name in ('data', 'migrations'):
        for relative, mode in (('', 0o750), ('saved.json', 0o640)):
            restored = state / name / relative
            metadata = restored.stat()
            assert (metadata.st_uid, metadata.st_gid) == (65534, 65534), str(restored)
            assert metadata.st_mode & 0o777 == mode, str(restored)
    assert (app_env.stat().st_uid, app_env.stat().st_gid) == (0, 65534)
    assert app_env.stat().st_mode & 0o777 == 0o640
    assert parse_env(app_env)['API_PORT'] == '55123'
    print('Rollback ownership, permissions and config restore passed.')

    defaults = fixture / 'defaults.env'
    defaults.write_text('CONFIG_SCHEMA_VERSION=2\nAPI_PORT=4174\nNEW_SETTING=added\n', encoding='utf-8')
    merged = fixture / '.app.env.new'
    subprocess.run([
        sys.executable, str(ROOT / 'deploy/scripts/config_merge.py'),
        '--defaults', str(defaults), '--current', str(app_env), '--output', str(merged),
    ], check=True)
    os.chown(merged, 0, 0)
    merged.chmod(0o644)

    updater.install_merged_config(merged, app_env)

    assert not merged.exists()
    assert (app_env.stat().st_uid, app_env.stat().st_gid) == (0, 65534)
    assert app_env.stat().st_mode & 0o777 == 0o640
    settings = parse_env(app_env)
    assert settings['API_PORT'] == '55123'
    assert settings['DATABASE_KIND'] == 'sqlite'
    assert settings['NEW_SETTING'] == 'added'
    assert settings['CONFIG_SCHEMA_VERSION'] == '2'
    print('Merged config ownership, permissions and local settings passed.')


def test_legacy_updater_preflight(tmp):
    fixture = tmp / 'updater-preflight'
    commands = fixture / 'bin'
    commands.mkdir(parents=True)
    probe = fixture / 'side-effects.txt'
    for name in ('sed', 'apt-get'):
        command = commands / name
        command.write_text('#!/bin/sh\nprintf "%s\\n" "$0" >> "$PREFLIGHT_PROBE"\nexit 99\n', encoding='utf-8')
        command.chmod(0o755)
    environment = os.environ.copy()
    environment.pop('SYNOPSIS_UPDATER_PROTOCOL', None)
    environment.update({
        'PATH': str(commands) + os.pathsep + environment.get('PATH', ''),
        'CONFIG_FILE': str(fixture / 'not-read.env'),
        'PREFLIGHT_PROBE': str(probe),
    })
    command = ['/bin/bash', str(ROOT / 'deploy/scripts/ensure-host-deps.sh')]
    for protocol in (None, '1'):
        if protocol is not None:
            environment['SYNOPSIS_UPDATER_PROTOCOL'] = protocol
        result = subprocess.run(command, env=environment, text=True, capture_output=True)
        assert result.returncode == 3, result.stderr
        assert not probe.exists(), 'Old updater reached configuration or package-manager work'

    # Новый установщик допускается к обычной проверке зависимостей.
    (commands / 'sed').unlink()
    config = fixture / 'app.env'
    config.write_text('WEB_SERVER=none\nDATABASE_KIND=sqlite\n', encoding='utf-8')
    for name in ('curl', 'python3', 'tar', 'xz'):
        executable = commands / name
        executable.write_text('#!/bin/sh\nexit 0\n', encoding='utf-8')
        executable.chmod(0o755)
    environment.update({'SYNOPSIS_UPDATER_PROTOCOL': '2', 'CONFIG_FILE': str(config)})
    result = subprocess.run(command, env=environment, text=True, capture_output=True)
    assert result.returncode == 0, result.stderr
    assert not probe.exists(), 'Complete dependencies must not invoke the package manager'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--require-ownership', action='store_true',
                        help='Require the root-only ownership regression in an isolated fixture')
    args = parser.parse_args()
    if args.require_ownership and os.geteuid() != 0:
        raise SystemExit('--require-ownership must run as root inside the CI fixture')
    with tempfile.TemporaryDirectory(prefix='synopsis-deploy-test-') as directory:
        tmp = Path(directory)
        test_config_merge(tmp)
        test_safe_extract(tmp)
        test_restore_clears_failed_migration_state(tmp)
        test_healthcheck_uses_installed_port(tmp)
        test_legacy_updater_preflight(tmp)
        if args.require_ownership:
            test_restore_preserves_ownership(tmp)
    test_release_name_parser()
    test_updater_version_parser()
    print('Deployment tests passed.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
