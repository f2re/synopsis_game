#!/usr/bin/env bash
set -euo pipefail
BACKUP_ROOT=${BACKUP_ROOT:-/var/lib/synopsis-game/backups}
KEEP=${BACKUP_KEEP:-10}
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
DEST="$BACKUP_ROOT/$STAMP"
mkdir -p "$DEST"
trap 'rc=$?; if [[ $rc -ne 0 ]]; then rm -rf "$DEST"; fi; exit $rc' ERR
cp -a /etc/synopsis-game "$DEST/etc"
if [[ -d /var/lib/synopsis-game/data ]]; then cp -a /var/lib/synopsis-game/data "$DEST/data"; fi
if [[ -d /var/lib/synopsis-game/migrations ]]; then cp -a /var/lib/synopsis-game/migrations "$DEST/migrations"; fi
if [[ ${DATABASE_KIND:-sqlite} == postgres ]]; then
  command -v pg_dump >/dev/null || { echo "Для безопасного обновления PostgreSQL требуется pg_dump" >&2; exit 1; }
  [[ -n ${DATABASE_URL:-} ]] || { echo "DATABASE_URL не задан" >&2; exit 1; }
  pg_dump "$DATABASE_URL" --format=custom --file="$DEST/postgres.dump"
fi
readlink -f /opt/synopsis-game/current > "$DEST/release.txt" 2>/dev/null || true
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | awk -v keep="$KEEP" 'NR>keep{print $2}' | xargs -r rm -rf --
echo "$DEST"
