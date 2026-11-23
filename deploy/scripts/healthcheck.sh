#!/usr/bin/env bash
set -euo pipefail
if [[ -n ${1:-} ]]; then
  URL=$1
else
  # Старый обновлятор вызывает этот файл из нового релиза без экспорта app.env.
  # Читаем только номер порта; содержимое конфигурации не исполняется как shell.
  PORT=$(python3 - <<'PY'
import os
import re
from pathlib import Path

port = os.environ.get('API_PORT', '4174')
config = Path(os.environ.get('CONFIG_FILE', '/etc/synopsis-game/app.env'))
if config.exists():
    for line in config.read_text(encoding='utf-8').splitlines():
        key, separator, value = line.partition('=')
        if separator and key.strip() == 'API_PORT':
            port = value.strip()
            if len(port) >= 2 and port[0] == port[-1] and port[0] in ('"', "'"):
                port = port[1:-1]
if not re.fullmatch(r'[0-9]+', port) or not 1 <= int(port) <= 65535:
    raise SystemExit('Некорректный API_PORT для проверки готовности сервера')
print(int(port))
PY
  )
  URL="http://127.0.0.1:${PORT}/ready"
fi
for _ in $(seq 1 30); do
  if curl -fsS --max-time 2 -- "$URL" >/dev/null; then
    exit 0
  fi
  sleep 1
done
echo "Health check failed: $URL" >&2
exit 1
