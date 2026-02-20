#!/usr/bin/env bash
set -euo pipefail

cd api
php bin/console doctrine:migrations:migrate --no-interaction
php bin/phpunit
