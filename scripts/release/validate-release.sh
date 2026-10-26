#!/usr/bin/env bash
set -euo pipefail
ARCHIVE=${1:?archive required}
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
tar -xzf "$ARCHIVE" -C "$TMP"
ROOT=$(find "$TMP" -mindepth 1 -maxdepth 1 -type d | head -n1)
test -f "$ROOT/VERSION"
test -f "$ROOT/manifest.json"
test -x "$ROOT/runtime/node/bin/node"
test -f "$ROOT/web/index.html"
test -f "$ROOT/server/server.mjs"
test -f "$ROOT/deploy/scripts/update.py"
"$ROOT/runtime/node/bin/node" "$ROOT/server/server.mjs" >"$TMP/server.log" 2>&1 & PID=$!
trap 'kill $PID 2>/dev/null || true; rm -rf "$TMP"' EXIT
sleep 1
curl -fsS http://127.0.0.1:4174/ready >/dev/null
kill "$PID"; wait "$PID" 2>/dev/null || true
echo "Release archive OK: $ARCHIVE"
