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

packages=()
command -v curl >/dev/null || packages+=(curl)
command -v python3 >/dev/null || packages+=(python3)
command -v tar >/dev/null || packages+=(tar)
command -v xz >/dev/null || packages+=(xz-utils)
[[ -e /etc/ssl/certs/ca-certificates.crt ]] || packages+=(ca-certificates)
case "$WEB_SERVER" in
  nginx) command -v nginx >/dev/null || packages+=(nginx) ;;
  apache) command -v apache2ctl >/dev/null || packages+=(apache2) ;;
  none) : ;;
  *) echo "WEB_SERVER должен быть nginx, apache или none" >&2; exit 2 ;;
esac
if [[ "$DATABASE_KIND" == postgres ]] && ! command -v pg_dump >/dev/null; then packages+=(postgresql-client); fi

if [[ ${#packages[@]} -gt 0 ]]; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y "${packages[@]}"
fi
