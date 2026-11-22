#!/bin/sh
# Dev entrypoint: (re)install dependencies only when package-lock.json changes.
# node_modules lives in a container volume, so the host's (macOS) modules never leak in.
set -e

LOCK_HASH=$(md5sum package-lock.json | cut -d' ' -f1)
if [ "$(cat node_modules/.lock-hash 2>/dev/null)" != "$LOCK_HASH" ]; then
  npm ci --no-audit --no-fund
  echo "$LOCK_HASH" > node_modules/.lock-hash
fi

exec "$@"
