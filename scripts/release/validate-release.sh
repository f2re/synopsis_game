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
test -f "$ROOT/server/index.js"
test -f "$ROOT/content/packs/core_ru_001.json"
test -f "$ROOT/server/node_modules/@synopsis/kn01-codec/src/index.js"
test -f "$ROOT/server/node_modules/@synopsis/content-engine/src/index.js"
test -f "$ROOT/deploy/scripts/update.py"
python3 - "$ROOT" <<'PY'
import hashlib, json, sys
from pathlib import Path
root=Path(sys.argv[1]); manifest=json.loads((root/'manifest.json').read_text(encoding='utf-8'))
for rel, expected in manifest.get('files',{}).items():
    path=root/rel
    if not path.is_file(): raise SystemExit('manifest file missing: %s' % rel)
    actual=hashlib.sha256(path.read_bytes()).hexdigest()
    if actual!=expected: raise SystemExit('manifest SHA mismatch: %s' % rel)
print('Manifest hashes OK:',len(manifest.get('files',{})))
PY
SYNOPSIS_VERSION_FILE="$ROOT/VERSION" \
SYNOPSIS_IDENTITY_STORE="$TMP/identity.json" \
SYNOPSIS_CONTENT_ROOT="$ROOT/content" \
SYNOPSIS_ATTEMPT_LOG="$TMP/attempts.jsonl" \
API_BIND=127.0.0.1 API_PORT=4174 \
  "$ROOT/runtime/node/bin/node" "$ROOT/server/index.js" >"$TMP/server.log" 2>&1 & PID=$!
trap 'kill $PID 2>/dev/null || true; rm -rf "$TMP"' EXIT
for _ in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:4174/ready >/dev/null; then break; fi
  sleep 0.25
done
if ! curl -fsS http://127.0.0.1:4174/ready >/dev/null; then
  cat "$TMP/server.log" >&2 || true
  exit 1
fi
curl -fsS http://127.0.0.1:4174/api/identity/groups >/dev/null
kill "$PID"; wait "$PID" 2>/dev/null || true
echo "Release archive OK: $ARCHIVE"
