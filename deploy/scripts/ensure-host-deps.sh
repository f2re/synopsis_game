#!/usr/bin/env bash
set -euo pipefail
CONFIG_FILE=${CONFIG_FILE:-/etc/synopsis-game/app.env}
getv() { sed -n "s/^$1=//p" "$CONFIG_FILE" | tail -n1; }
WEB_SERVER=$(getv WEB_SERVER)
DATABASE_KIND=$(getv DATABASE_KIND)

packages=()
missing=()
command -v curl >/dev/null || { packages+=(curl); missing+=(curl); }
command -v python3 >/dev/null || { packages+=(python3); missing+=(python3); }
command -v tar >/dev/null || { packages+=(tar); missing+=(tar); }
command -v xz >/dev/null || { packages+=(xz-utils); missing+=(xz); }
[[ -e /etc/ssl/certs/ca-certificates.crt ]] || { packages+=(ca-certificates); missing+=(ca-certificates); }
case "$WEB_SERVER" in
  nginx) command -v nginx >/dev/null || { packages+=(nginx); missing+=(nginx); } ;;
  apache) command -v apache2ctl >/dev/null || { packages+=(apache2); missing+=(apache2); } ;;
  none) : ;;
  *) echo "WEB_SERVER должен быть nginx, apache или none" >&2; exit 2 ;;
esac
if [[ "$DATABASE_KIND" == postgres ]] && ! command -v pg_dump >/dev/null; then packages+=(postgresql-client); missing+=(pg_dump); fi

[[ ${#packages[@]} -eq 0 ]] && exit 0

if [[ -r /etc/os-release ]]; then . /etc/os-release; fi
if [[ ${ID:-} == "astra" || ${ID_LIKE:-} == *debian* ]]; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y "${packages[@]}"
  exit 0
fi

echo "Не хватает системных зависимостей: ${missing[*]}. Установите их пакетным менеджером ОС." >&2
exit 1
