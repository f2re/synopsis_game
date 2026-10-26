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
    apt-get update >/dev/null
    DEBIAN_FRONTEND=noninteractive apt-get install -y python3 ca-certificates >/dev/null
    python3 --version
    python3 - <<"PY"
from pathlib import Path
for path in sorted(Path("/release/deploy/scripts").glob("*.py")):
    compile(path.read_bytes(), str(path), "exec")
    print("syntax OK:", path.name)
PY
    for f in /release/deploy/scripts/*.sh; do bash -n "$f"; done
    /release/runtime/node/bin/node --version
    SYNOPSIS_VERSION_FILE=/release/VERSION \
    SYNOPSIS_IDENTITY_STORE=/tmp/identity.json \
    SYNOPSIS_CONTENT_ROOT=/release/content \
    SYNOPSIS_ATTEMPT_LOG=/tmp/attempts.jsonl \
    API_BIND=127.0.0.1 API_PORT=4174 \
      /release/runtime/node/bin/node /release/server/index.js >/tmp/server.log 2>&1 &
    pid=$!
    trap "kill $pid 2>/dev/null || true" EXIT
    if ! python3 - <<"PY"
import json, time
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
response=urlopen("http://127.0.0.1:4174/api/identity/groups", timeout=1)
if response.getcode()!=200:
    raise SystemExit("Astra Linux identity API check failed")
json.loads(response.read().decode("utf-8"))
PY
    then
      cat /tmp/server.log >&2 || true
      exit 1
    fi
  '
echo "Astra Linux 1.7 compatibility check passed: $ARCHIVE"
