#!/bin/sh
# Run the render worker alongside the Next server in one container.
set -e

node --import tsx worker/index.ts &
WORKER_PID=$!

trap 'kill $WORKER_PID' EXIT

exec npx next start -p "${PORT:-3000}"
