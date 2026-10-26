#!/usr/bin/env bash
set -euo pipefail
BACKUP_ROOT=${BACKUP_ROOT:-/var/lib/synopsis-game/backups}
KEEP=${BACKUP_KEEP:-10}
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
DEST="$BACKUP_ROOT/$STAMP"
mkdir -p "$DEST"
cp -a /etc/synopsis-game "$DEST/etc" 2>/dev/null || true
cp -a /var/lib/synopsis-game/data "$DEST/data" 2>/dev/null || true
cp -a /var/lib/synopsis-game/migrations "$DEST/migrations" 2>/dev/null || true
readlink -f /opt/synopsis-game/current > "$DEST/release.txt" 2>/dev/null || true
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | awk -v keep="$KEEP" 'NR>keep{print $2}' | xargs -r rm -rf --
echo "$DEST"
