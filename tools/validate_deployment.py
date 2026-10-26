#!/usr/bin/env python3
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
required=[
'apps/server/server.mjs','deploy/config/defaults.env','deploy/systemd/synopsis-game.service',
'deploy/systemd/synopsis-game-update.service','deploy/systemd/synopsis-game-update.timer',
'deploy/nginx/synopsis-game.conf.template','deploy/apache/synopsis-game.conf.template',
'deploy/scripts/install.sh','deploy/scripts/configure.sh','deploy/scripts/update.py',
'deploy/scripts/check-update.py','scripts/release/build-release.sh','scripts/release/validate-release.sh',
'.github/workflows/ci.yml','.github/workflows/release.yml']
errors=[p for p in required if not (ROOT/p).exists()]
def text(p): return (ROOT/p).read_text(encoding='utf-8')
if (ROOT/'deploy/config/defaults.env').exists():
    for key in ['TRUSTED_LAN_CIDRS=','MAPS_PROVIDER=','KN01_TRANSPORT=','DATABASE_URL=','UPDATE_MODE=']:
        if key not in text('deploy/config/defaults.env'): errors.append('defaults missing '+key)
if (ROOT/'deploy/systemd/synopsis-game.service').exists() and '/etc/synopsis-game/app.env' not in text('deploy/systemd/synopsis-game.service'):
    errors.append('systemd service must use persistent app.env')
if errors:
    print('Deployment validation failed:'); [print(' -',e) for e in errors]; sys.exit(1)
print('Deployment validation passed.')
