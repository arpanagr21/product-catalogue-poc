#!/bin/sh
# Dev entrypoint: make the app runnable from a fresh clone, then hand off to CMD.
set -e

# vendor/ lives in a container volume; (re)install only when composer.lock changes.
LOCK_HASH=$(md5sum composer.lock | cut -d' ' -f1)
if [ "$(cat vendor/.lock-hash 2>/dev/null)" != "$LOCK_HASH" ]; then
  composer install --no-interaction --prefer-dist
  echo "$LOCK_HASH" > vendor/.lock-hash
fi

# Config comes from the container environment (docker-compose.yml). Laravel tooling
# such as `php artisan test` still expects a .env file to exist, so keep an empty one.
[ -f .env ] || touch .env

# APP_KEY comes from the environment; generate a throwaway one if absent so first run never fails.
if [ -z "$APP_KEY" ]; then
  export APP_KEY="base64:$(head -c 32 /dev/urandom | base64)"
  echo "APP_KEY not set; generated an ephemeral key for this container."
fi

php artisan migrate --force
php artisan db:seed --force

exec "$@"
