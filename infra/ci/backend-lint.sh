#!/usr/bin/env bash
set -euo pipefail

cd api

echo "Running PHP syntax lint..."
find . \
  -path './vendor' -prune -o \
  -type f -name '*.php' -print0 |
  while IFS= read -r -d '' file; do
    php -l "$file" >/dev/null
  done

echo "Backend lint passed."
