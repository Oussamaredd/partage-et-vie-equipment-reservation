#!/usr/bin/env bash
set -euo pipefail

cd frontend
npm ci
npm run test:unit
npm run build
