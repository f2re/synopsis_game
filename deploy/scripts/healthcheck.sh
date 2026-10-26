#!/usr/bin/env bash
set -euo pipefail
PORT=${API_PORT:-4174}
URL=${1:-http://127.0.0.1:${PORT}/ready}
for _ in $(seq 1 30); do
  if curl -fsS --max-time 2 "$URL" >/dev/null; then
    exit 0
  fi
  sleep 1
done
echo "Health check failed: $URL" >&2
exit 1
