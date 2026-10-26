#!/usr/bin/env bash
set -euo pipefail
CONFIG_FILE=${CONFIG_FILE:-/etc/synopsis-game/app.env}
ROOT=${SYNOPSIS_ROOT:-/opt/synopsis-game/current}

getv() { sed -n "s/^$1=//p" "$CONFIG_FILE" | tail -n1; }
WEB_SERVER=$(getv WEB_SERVER)
API_PORT=$(getv API_PORT)
PUBLIC_URL=$(getv PUBLIC_URL)
ACCESS_MODE=$(getv ACCESS_MODE)
TRUSTED_LAN_CIDRS=$(getv TRUSTED_LAN_CIDRS)
WEB_SERVER_EXCLUSIVE=$(getv WEB_SERVER_EXCLUSIVE)
ACCESS_MODE=${ACCESS_MODE:-lan}
WEB_SERVER_EXCLUSIVE=${WEB_SERVER_EXCLUSIVE:-1}

render_template() {
  local template=$1 output=$2 kind=$3
  python3 - "$template" "$output" "$kind" "$PUBLIC_URL" "$API_PORT" "$ACCESS_MODE" "$TRUSTED_LAN_CIDRS" "$WEB_SERVER_EXCLUSIVE" <<'PY'
import ipaddress
import re
import sys
try:
    from urllib.parse import urlparse
except ImportError:
    from urlparse import urlparse
from pathlib import Path

template, output, kind, public_url, api_port, access_mode, cidr_text, exclusive = sys.argv[1:]
if not api_port.isdigit() or not (1 <= int(api_port) <= 65535):
    raise SystemExit('invalid API_PORT: %s' % api_port)
parsed = urlparse(public_url if '://' in public_url else 'http://' + public_url)
host = parsed.hostname or '_'
if not re.match(r'^[A-Za-z0-9._-]+$', host):
    host = '_'
if access_mode not in ('lan', 'public'):
    raise SystemExit('ACCESS_MODE must be lan or public')
networks=[]
for raw in cidr_text.split(','):
    raw=raw.strip()
    if raw:
        networks.append(str(ipaddress.ip_network(raw, strict=False)))
if access_mode == 'lan' and not networks:
    raise SystemExit('ACCESS_MODE=lan requires TRUSTED_LAN_CIDRS')
text=Path(template).read_text(encoding='utf-8')
text=text.replace('__SERVER_NAME__',host).replace('__API_PORT__',api_port)
if kind == 'nginx':
    listen='listen 80 default_server;' if exclusive == '1' else 'listen 80;'
    rules=''
    if access_mode == 'lan':
        rules='\n'.join('    allow %s;' % n for n in networks) + '\n    deny all;'
    text=text.replace('__LISTEN_DIRECTIVE__',listen).replace('__ACCESS_RULES__',rules)
elif kind == 'apache':
    require='Require all granted' if access_mode == 'public' else 'Require ip ' + ' '.join(networks)
    text=text.replace('__ACCESS_REQUIRE__',require)
else:
    raise SystemExit('unknown template kind')
Path(output).write_text(text,encoding='utf-8')
PY
}

case "$WEB_SERVER" in
  nginx)
    command -v nginx >/dev/null || { echo "nginx не установлен" >&2; exit 1; }
    install -d -m 0755 /etc/nginx/sites-available /etc/nginx/sites-enabled
    render_template "$ROOT/deploy/nginx/synopsis-game.conf.template" /etc/nginx/sites-available/synopsis-game.conf nginx
    ln -sfn /etc/nginx/sites-available/synopsis-game.conf /etc/nginx/sites-enabled/synopsis-game.conf
    if [[ "$WEB_SERVER_EXCLUSIVE" == 1 ]]; then
      rm -f /etc/nginx/sites-enabled/default
      if command -v apache2ctl >/dev/null && systemctl is-active --quiet apache2; then systemctl disable --now apache2; fi
    fi
    nginx -t
    if systemctl is-active --quiet nginx; then systemctl reload nginx; else systemctl enable --now nginx; fi
    ;;
  apache)
    command -v apache2ctl >/dev/null || { echo "apache2 не установлен" >&2; exit 1; }
    a2enmod proxy proxy_http proxy_wstunnel headers >/dev/null
    render_template "$ROOT/deploy/apache/synopsis-game.conf.template" /etc/apache2/sites-available/synopsis-game.conf apache
    a2ensite synopsis-game >/dev/null
    if [[ "$WEB_SERVER_EXCLUSIVE" == 1 ]]; then
      a2dissite 000-default >/dev/null 2>&1 || true
      if command -v nginx >/dev/null && systemctl is-active --quiet nginx; then systemctl disable --now nginx; fi
    fi
    apache2ctl configtest
    if systemctl is-active --quiet apache2; then systemctl reload apache2; else systemctl enable --now apache2; fi
    ;;
  none) : ;;
  *) echo "WEB_SERVER должен быть nginx, apache или none" >&2; exit 2 ;;
esac
