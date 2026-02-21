#!/usr/bin/env bash
set -euo pipefail

cd api
mkdir -p ../database/sqlite
rm -f ../database/sqlite/data_test.db
APP_ENV=test php bin/console doctrine:migrations:migrate --no-interaction
php bin/phpunit
