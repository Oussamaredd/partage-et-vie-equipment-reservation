#!/bin/sh
set -eu

if [ ! -f "vendor/autoload.php" ]; then
  composer install --no-interaction --prefer-dist
fi

if [ ! -f "/database/sqlite/data.db" ]; then
  mkdir -p /database/sqlite
  php bin/console doctrine:migrations:migrate --no-interaction
  php bin/console doctrine:fixtures:load --no-interaction
fi

exec php -d opcache.enable_cli=1 -S 0.0.0.0:8000 -t public
