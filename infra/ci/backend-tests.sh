#!/usr/bin/env bash
set -euo pipefail

cd api
mkdir -p ../database/sqlite
APP_ENV=test php bin/console doctrine:migrations:migrate --no-interaction
php bin/phpunit
