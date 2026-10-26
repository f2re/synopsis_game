#!/usr/bin/env bash
set -euo pipefail
ARCHIVE=${1:?archive required}
IMAGE=${ASTRA_IMAGE:-registry.astralinux.ru/library/astra/ubi17:1.7.5}
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
tar -xzf "$ARCHIVE" --strip-components=1 -C "$TMP"
docker run --rm \
  -v "$TMP:/release:ro" \
  "$IMAGE" \
  /bin/bash -lc '
    set -euo pipefail
    python3 --version
    python3 -m py_compile /release/deploy/scripts/*.py
    for f in /release/deploy/scripts/*.sh; do bash -n "$f"; done
    /release/runtime/node/bin/node --version
    API_BIND=127.0.0.1 API_PORT=4174 /release/runtime/node/bin/node /release/server/server.mjs >/tmp/server.log 2>&1 &
    pid=$!
    trap "kill $pid 2>/dev/null || true" EXIT
    python3 - <<"PY"
import time
try:
    from urllib.request import urlopen
except ImportError:
    from urllib2 import urlopen
for _ in range(20):
    try:
        if urlopen("http://127.0.0.1:4174/ready", timeout=1).getcode() == 200:
            break
    except Exception:
        time.sleep(0.25)
else:
    raise SystemExit("Astra Linux health check failed")
PY
  '
echo "Astra Linux 1.7 compatibility check passed: $ARCHIVE"
