#!/usr/bin/env bash
set -euo pipefail
CONFIG_FILE=${CONFIG_FILE:-/etc/synopsis-game/app.env}
DEFAULTS_FILE=${DEFAULTS_FILE:-/opt/synopsis-game/current/deploy/config/defaults.env}
NON_INTERACTIVE=${NON_INTERACTIVE:-0}

[[ -f "$CONFIG_FILE" ]] || cp "$DEFAULTS_FILE" "$CONFIG_FILE"

getv() { sed -n "s/^$1=//p" "$CONFIG_FILE" | tail -n1; }
setv() {
  local key=$1 value=$2 tmp
  tmp=$(mktemp)
  awk -F= -v k="$key" -v v="$value" 'BEGIN{done=0} $1==k {print k"="v;done=1;next} {print} END{if(!done) print k"="v}' "$CONFIG_FILE" > "$tmp"
  install -m 0640 -o root -g synopsis-game "$tmp" "$CONFIG_FILE"
  rm -f "$tmp"
}
prompt() {
  local key=$1 text=$2 current answer
  current=$(getv "$key")
  if [[ "$NON_INTERACTIVE" == 1 ]]; then
    answer=${!key:-$current}
  else
    read -r -p "$text [$current]: " answer
    answer=${answer:-$current}
  fi
  setv "$key" "$answer"
}

prompt PUBLIC_URL "Публичный URL"
prompt WEB_SERVER "Веб-сервер: nginx, apache или none"
prompt TRUSTED_LAN_CIDRS "Разрешённые LAN CIDR через запятую"
prompt MAPS_PROVIDER "Провайдер онлайн-карт или none"
prompt MAPS_BASE_URL "Базовый URL карт"
prompt MAPS_API_KEY "Ключ API карт (если нужен)"
prompt KN01_TRANSPORT "Транспорт КН-01: file, tcp или ws"
prompt KN01_ENDPOINT "Путь/адрес источника КН-01"
prompt KN01_RULESET_ID "Версия правил КН-01"
prompt DATABASE_KIND "БД: sqlite или postgres"
prompt DATABASE_URL "Строка подключения к БД"
prompt UPDATE_MODE "Обновления: auto, notify или manual"

echo "Конфигурация сохранена: $CONFIG_FILE"
