#!/bin/sh
# Production entrypoint: no gem installation at boot (gems are baked into the image).
set -e

# Remove a stale pid left by an unclean shutdown.
rm -f /app/tmp/pids/server.pid

# Wait for Postgres (compose also gates on its healthcheck).
$(docker/entrypoints/helpers/pg_database_url.rb)
until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USERNAME"; do
  sleep 2
done

# Fail loudly if the image is missing gems instead of installing them.
bundle check

exec "$@"
