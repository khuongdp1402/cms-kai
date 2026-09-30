#!/bin/sh
set -x

rm -rf /app/tmp/pids/server.pid
rm -rf /app/tmp/cache/*

bundle check || bundle install
# The container has a TTY (tty: true), so pnpm would otherwise wait forever on
# the "modules directory will be removed" prompt when the volume is stale.
pnpm install --frozen-lockfile --config.confirmModulesPurge=false

echo "Ready to run Vite development server."

exec "$@"

