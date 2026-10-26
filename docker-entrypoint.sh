#!/bin/sh
set -eu

echo "Applying database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "Starting server on ${HOST:-0.0.0.0}:${PORT:-3000}..."
exec node .output/server/index.mjs
