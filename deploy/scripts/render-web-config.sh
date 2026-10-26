#!/usr/bin/env bash
set -euo pipefail
CONFIG_FILE=${CONFIG_FILE:-/etc/synopsis-game/app.env}
ROOT=${SYNOPSIS_ROOT:-/opt/synopsis-game/current}

getv() { sed -n "s/^$1=//p" "$CONFIG_FILE" | tail -n1; }
WEB_SERVER=$(getv WEB_SERVER)
API_PORT=$(getv API_PORT)
PUBLIC_URL=$(getv PUBLIC_URL)
SERVER_NAME=$(printf '%s' "$PUBLIC_URL" | sed -E 's#^https?://##; s#/.*##; s/:.*##')
SERVER_NAME=${SERVER_NAME:-_}

case "$WEB_SERVER" in
  nginx)
    command -v nginx >/dev/null || { echo "nginx не установлен" >&2; exit 1; }
    install -d -m 0755 /etc/nginx/sites-available /etc/nginx/sites-enabled
    sed -e "s/__SERVER_NAME__/$SERVER_NAME/g" -e "s/__API_PORT__/$API_PORT/g" \
      "$ROOT/deploy/nginx/synopsis-game.conf.template" > /etc/nginx/sites-available/synopsis-game.conf
    ln -sfn /etc/nginx/sites-available/synopsis-game.conf /etc/nginx/sites-enabled/synopsis-game.conf
    nginx -t
    if systemctl is-active --quiet nginx; then systemctl reload nginx; else systemctl enable --now nginx; fi
    ;;
  apache)
    command -v apache2ctl >/dev/null || { echo "apache2 не установлен" >&2; exit 1; }
    a2enmod proxy proxy_http proxy_wstunnel headers >/dev/null
    sed -e "s/__SERVER_NAME__/$SERVER_NAME/g" -e "s/__API_PORT__/$API_PORT/g" \
      "$ROOT/deploy/apache/synopsis-game.conf.template" > /etc/apache2/sites-available/synopsis-game.conf
    a2ensite synopsis-game >/dev/null
    apache2ctl configtest
    if systemctl is-active --quiet apache2; then systemctl reload apache2; else systemctl enable --now apache2; fi
    ;;
  none) : ;;
  *) echo "WEB_SERVER должен быть nginx, apache или none" >&2; exit 2 ;;
esac
