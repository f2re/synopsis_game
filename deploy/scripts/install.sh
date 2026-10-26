#!/usr/bin/env bash
set -euo pipefail
if [[ ${EUID:-$(id -u)} -ne 0 ]]; then echo "Запустите от root." >&2; exit 1; fi
RELEASE_ARCHIVE=${1:-}
if [[ -z "$RELEASE_ARCHIVE" || ! -f "$RELEASE_ARCHIVE" ]]; then echo "Использование: $0 <release.tar.gz>" >&2; exit 2; fi
WEB_SERVER=${WEB_SERVER:-nginx}
if [[ -r /etc/os-release ]]; then . /etc/os-release; fi
if [[ ${ID:-} == "astra" || ${ID_LIKE:-} == *debian* ]]; then
  apt-get update
  apt-get install -y ca-certificates curl python3 tar xz-utils
  case "$WEB_SERVER" in nginx) apt-get install -y nginx;; apache) apt-get install -y apache2;; none) :;; *) echo "WEB_SERVER должен быть nginx/apache/none"; exit 2;; esac
fi
getent group synopsis-game >/dev/null || groupadd --system synopsis-game
id synopsis-game >/dev/null 2>&1 || useradd --system --gid synopsis-game --home-dir /var/lib/synopsis-game --shell /usr/sbin/nologin synopsis-game
install -d -m 0755 /opt/synopsis-game/releases
install -d -m 0750 -o root -g synopsis-game /etc/synopsis-game
install -d -m 0750 -o synopsis-game -g synopsis-game /var/lib/synopsis-game/{data,kn01/inbox,backups}
install -d -m 0750 -o synopsis-game -g synopsis-game /var/log/synopsis-game
python3 /dev/stdin "$RELEASE_ARCHIVE" <<'PY'
import tarfile, sys, tempfile, shutil
from pathlib import Path
archive=Path(sys.argv[1]).resolve(); root=Path('/opt/synopsis-game'); releases=root/'releases'
with tempfile.TemporaryDirectory() as td:
    td=Path(td)
    with tarfile.open(archive,'r:*') as tf:
        base=td.resolve()
        for m in tf.getmembers():
            dest=(td/m.name).resolve()
            if dest!=base and base not in dest.parents: raise RuntimeError(f'unsafe archive path: {m.name}')
        tf.extractall(td)
    dirs=[p for p in td.iterdir() if p.is_dir()]; src=dirs[0] if len(dirs)==1 else td
    version=(src/'VERSION').read_text().strip(); dest=releases/version
    if dest.exists(): shutil.rmtree(dest)
    shutil.copytree(src,dest,symlinks=True)
    print(dest)
PY
VERSION=$(tar -xOf "$RELEASE_ARCHIVE" --wildcards '*/VERSION' 2>/dev/null | head -n1 || true)
[[ -n "$VERSION" ]] || VERSION=$(find /opt/synopsis-game/releases -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -V | tail -n1)
ln -sfn "/opt/synopsis-game/releases/$VERSION" /opt/synopsis-game/current
DEFAULTS=/opt/synopsis-game/current/deploy/config/defaults.env
if [[ ! -f /etc/synopsis-game/app.env ]]; then install -m 0640 -o root -g synopsis-game "$DEFAULTS" /etc/synopsis-game/app.env; fi
install -m 0644 /opt/synopsis-game/current/deploy/systemd/synopsis-game.service /etc/systemd/system/synopsis-game.service
install -m 0644 /opt/synopsis-game/current/deploy/systemd/synopsis-game-update.service /etc/systemd/system/synopsis-game-update.service
install -m 0644 /opt/synopsis-game/current/deploy/systemd/synopsis-game-update.timer /etc/systemd/system/synopsis-game-update.timer
systemctl daemon-reload
CONFIG_FILE=/etc/synopsis-game/app.env DEFAULTS_FILE="$DEFAULTS" /bin/bash /opt/synopsis-game/current/deploy/scripts/configure.sh
WEB_SERVER=$(sed -n 's/^WEB_SERVER=//p' /etc/synopsis-game/app.env | tail -n1)
API_PORT=$(sed -n 's/^API_PORT=//p' /etc/synopsis-game/app.env | tail -n1)
SERVER_NAME=$(sed -n 's#^PUBLIC_URL=https\?://##p' /etc/synopsis-game/app.env | sed 's#/.*##;s/:.*##' | head -n1)
SERVER_NAME=${SERVER_NAME:-_}
case "$WEB_SERVER" in
 nginx)
  sed -e "s/__SERVER_NAME__/$SERVER_NAME/g" -e "s/__API_PORT__/$API_PORT/g" /opt/synopsis-game/current/deploy/nginx/synopsis-game.conf.template > /etc/nginx/sites-available/synopsis-game.conf
  ln -sfn /etc/nginx/sites-available/synopsis-game.conf /etc/nginx/sites-enabled/synopsis-game.conf
  nginx -t && systemctl reload nginx
  ;;
 apache)
  a2enmod proxy proxy_http proxy_wstunnel headers >/dev/null
  sed -e "s/__SERVER_NAME__/$SERVER_NAME/g" -e "s/__API_PORT__/$API_PORT/g" /opt/synopsis-game/current/deploy/apache/synopsis-game.conf.template > /etc/apache2/sites-available/synopsis-game.conf
  a2ensite synopsis-game >/dev/null
  apache2ctl configtest && systemctl reload apache2
  ;;
esac
systemctl enable --now synopsis-game.service
systemctl enable --now synopsis-game-update.timer
/bin/bash /opt/synopsis-game/current/deploy/scripts/healthcheck.sh
echo "Synopsis Game $VERSION установлен."
