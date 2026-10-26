#!/usr/bin/env bash
set -euo pipefail
CONFIG_FILE=${CONFIG_FILE:-/etc/synopsis-game/app.env}
getv() { sed -n "s/^$1=//p" "$CONFIG_FILE" | tail -n1; }
WEB_SERVER=$(getv WEB_SERVER)
DATABASE_KIND=$(getv DATABASE_KIND)

if [[ -r /etc/os-release ]]; then . /etc/os-release; fi
if [[ ${ID:-} != "astra" && ${ID_LIKE:-} != *debian* ]]; then
  echo "Автоматическая установка пакетов поддерживается только для Astra/Debian-подобных систем." >&2
  exit 1
fi

packages=(ca-certificates curl python3 tar xz-utils)
case "$WEB_SERVER" in
  nginx) packages+=(nginx) ;;
  apache) packages+=(apache2) ;;
  none) : ;;
  *) echo "WEB_SERVER должен быть nginx, apache или none" >&2; exit 2 ;;
esac
if [[ "$DATABASE_KIND" == postgres ]]; then packages+=(postgresql-client); fi

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y "${packages[@]}"
