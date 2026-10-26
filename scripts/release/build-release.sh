#!/usr/bin/env bash
set -euo pipefail
VERSION=${1:?version required, e.g. 0.2.0}
NODE_VERSION=${NODE_VERSION:-22.23.4}
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
OUT=${OUT_DIR:-$ROOT/dist-release}
PKG="$OUT/synopsis-game-$VERSION"
rm -rf "$PKG"; mkdir -p "$PKG"/{web,server,runtime/node,deploy,content}

cd "$ROOT"
pnpm bootstrap
pnpm typecheck
pnpm test:server
pnpm build
cp -a apps/web/dist/. "$PKG/web/"
cp -a apps/server/dist/. "$PKG/server/"
cp -a deploy/. "$PKG/deploy/"
cp -a content/. "$PKG/content/"
mkdir -p "$PKG/server/node_modules/@synopsis/kn01-codec" "$PKG/server/node_modules/@synopsis/content-engine"
cp packages/kn01-codec/package.json "$PKG/server/node_modules/@synopsis/kn01-codec/"
cp -a packages/kn01-codec/src "$PKG/server/node_modules/@synopsis/kn01-codec/"
cp packages/content-engine/package.json "$PKG/server/node_modules/@synopsis/content-engine/"
cp -a packages/content-engine/src "$PKG/server/node_modules/@synopsis/content-engine/"
printf '%s\n' "$VERSION" > "$PKG/VERSION"

NODE_TAR="node-v${NODE_VERSION}-linux-x64.tar.xz"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
curl -fsSLo "$TMP/$NODE_TAR" "https://nodejs.org/download/release/v${NODE_VERSION}/$NODE_TAR"
curl -fsSLo "$TMP/SHASUMS256.txt" "https://nodejs.org/download/release/v${NODE_VERSION}/SHASUMS256.txt"
(cd "$TMP" && grep "  $NODE_TAR$" SHASUMS256.txt | sha256sum -c -)
tar -xJf "$TMP/$NODE_TAR" -C "$TMP"
cp -a "$TMP/node-v${NODE_VERSION}-linux-x64/." "$PKG/runtime/node/"

python3 "$ROOT/scripts/release/write-manifest.py" "$PKG" "$VERSION" "$NODE_VERSION" "${GITHUB_SHA:-unknown}"
tar -C "$OUT" -czf "$OUT/synopsis-game-$VERSION-linux-x64.tar.gz" "synopsis-game-$VERSION"
(cd "$OUT" && sha256sum "synopsis-game-$VERSION-linux-x64.tar.gz" > "synopsis-game-$VERSION-linux-x64.tar.gz.sha256")
echo "$OUT/synopsis-game-$VERSION-linux-x64.tar.gz"
