#!/bin/sh
set -x

rm -rf /app/tmp/pids/server.pid
rm -rf /app/tmp/cache/*

bundle check || bundle install
pnpm install

echo "Ready to run Vite development server."

exec "$@"

