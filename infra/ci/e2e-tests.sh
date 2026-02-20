#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cleanup() {
  node "$ROOT_DIR/infra/scripts/dev.mjs" down || true
}

trap cleanup EXIT

cd "$ROOT_DIR/frontend"
npm ci
npx playwright install --with-deps chromium
cd "$ROOT_DIR"

node infra/scripts/dev.mjs up

cd "$ROOT_DIR/frontend"
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 PLAYWRIGHT_DISABLE_WEBSERVER=1 npm run test:e2e:all
