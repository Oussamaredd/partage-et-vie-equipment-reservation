#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  node infra/scripts/dev.mjs down || true
}

trap cleanup EXIT

cd frontend
npm ci
npx playwright install --with-deps chromium
cd ..

node infra/scripts/dev.mjs up

cd frontend
npm run test:e2e:all
