#!/usr/bin/env python3
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
required=[
'apps/server/package.json','apps/server/src/index.ts','deploy/config/defaults.env','deploy/systemd/synopsis-game.service',
'deploy/systemd/synopsis-game-update.service','deploy/systemd/synopsis-game-update.timer',
'deploy/nginx/synopsis-game.conf.template','deploy/apache/synopsis-game.conf.template',
'deploy/scripts/install.sh','deploy/scripts/configure.sh','deploy/scripts/render-web-config.sh','deploy/scripts/update.py',
'deploy/scripts/check-update.py','scripts/release/build-release.sh','scripts/release/validate-release.sh',
'.github/workflows/ci.yml','.github/workflows/release.yml']
errors=[p for p in required if not (ROOT/p).exists()]
def text(p): return (ROOT/p).read_text(encoding='utf-8')
if (ROOT/'deploy/config/defaults.env').exists():
    for key in ['TRUSTED_LAN_CIDRS=','MAPS_PROVIDER=','KN01_TRANSPORT=','DATABASE_URL=','UPDATE_MODE=']:
        if key not in text('deploy/config/defaults.env'): errors.append('defaults missing '+key)
if (ROOT/'deploy/systemd/synopsis-game.service').exists():
    service=text('deploy/systemd/synopsis-game.service')
    if '/etc/synopsis-game/app.env' not in service: errors.append('systemd service must use persistent app.env')
    if '/server/index.js' not in service: errors.append('systemd service must run compiled server/index.js')
if (ROOT/'scripts/release/build-release.sh').exists() and 'apps/server/dist' not in text('scripts/release/build-release.sh'):
    errors.append('release must package compiled server dist')
if (ROOT/'deploy/scripts/update.py').exists():
    update=text('deploy/scripts/update.py')
    if 'config_merge.py' not in update or 'migrate.py' not in update or 'render-web-config.sh' not in update:
        errors.append('updater must merge config, migrate data and refresh web config')
if errors:
    print('Deployment validation failed:'); [print(' -',e) for e in errors]; sys.exit(1)
print('Deployment validation passed.')
