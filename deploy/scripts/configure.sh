#!/usr/bin/env bash
set -euo pipefail
CONFIG_FILE=${CONFIG_FILE:-/etc/synopsis-game/app.env}
DEFAULTS_FILE=${DEFAULTS_FILE:-/opt/synopsis-game/current/deploy/config/defaults.env}
NON_INTERACTIVE=${NON_INTERACTIVE:-0}

[[ -f "$CONFIG_FILE" ]] || cp "$DEFAULTS_FILE" "$CONFIG_FILE"

getv() { sed -n "s/^$1=//p" "$CONFIG_FILE" | tail -n1; }
setv() {
  local key=$1 value=$2
  CONFIG_PATH="$CONFIG_FILE" CONFIG_KEY="$key" CONFIG_VALUE="$value" python3 - <<'PY'
import os
from pathlib import Path
path=Path(os.environ['CONFIG_PATH']); key=os.environ['CONFIG_KEY']; value=os.environ['CONFIG_VALUE']
lines=path.read_text(encoding='utf-8').splitlines() if path.exists() else []
out=[]; done=False
for line in lines:
    if line.startswith(key+'='):
        if not done: out.append(key+'='+value); done=True
    else: out.append(line)
if not done: out.append(key+'='+value)
path.write_text('\n'.join(out)+'\n',encoding='utf-8')
PY
  chown root:synopsis-game "$CONFIG_FILE"
  chmod 0640 "$CONFIG_FILE"
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
prompt_secret() {
  local key=$1 text=$2 current answer state
  current=$(getv "$key")
  [[ -n "$current" ]] && state="сохранено" || state="не задано"
  if [[ "$NON_INTERACTIVE" == 1 ]]; then
    answer=${!key:-$current}
  else
    read -r -s -p "$text [$state; Enter — оставить]: " answer
    printf '\n'
    answer=${answer:-$current}
  fi
  setv "$key" "$answer"
}

prompt PUBLIC_URL "Публичный URL"
prompt API_PORT "Локальный порт API"
prompt WEB_SERVER "Веб-сервер: nginx, apache или none"
prompt WEB_SERVER_EXCLUSIVE "Выделенный веб-сервер (1 — можно отключить стандартный сайт, 0 — совместное размещение)"
prompt ACCESS_MODE "Режим доступа: lan или public"
prompt TRUSTED_LAN_CIDRS "Разрешённые LAN CIDR через запятую"
prompt MAPS_PROVIDER "Провайдер онлайн-карт или none"
prompt MAPS_BASE_URL "Базовый URL карт"
prompt_secret MAPS_API_KEY "Ключ API карт"
prompt KN01_TRANSPORT "Транспорт КН-01: file, tcp или ws"
prompt KN01_ENDPOINT "Путь/адрес источника КН-01"
prompt KN01_RULESET_ID "Версия правил КН-01"
prompt KN01_TLS_VERIFY "Проверять TLS источника КН-01: 1 или 0"
prompt_secret KN01_AUTH_TOKEN "Токен доступа к источнику КН-01"
prompt DATABASE_KIND "БД: sqlite или postgres"
prompt_secret DATABASE_URL "Строка подключения к БД"
prompt UPDATE_MODE "Обновления: auto, notify или manual"
prompt UPDATE_SOURCE "Источник обновлений: github или directory"
prompt UPDATE_REPOSITORY "GitHub repository owner/name"
prompt UPDATE_DIRECTORY "Локальный каталог релизов"
prompt BACKUP_KEEP "Количество локальных резервных копий"
prompt RELEASE_KEEP "Количество хранимых версий приложения"

echo "Конфигурация сохранена: $CONFIG_FILE"
