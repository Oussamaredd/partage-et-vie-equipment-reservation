#!/usr/bin/env bash
set -euo pipefail

cd frontend
npm ci

echo "Running JS syntax lint..."
find . \
  -path './node_modules' -prune -o \
  -path './dist' -prune -o \
  -type f -name '*.js' -print0 |
  while IFS= read -r -d '' file; do
    node --check "$file"
  done

echo "Frontend lint passed."
