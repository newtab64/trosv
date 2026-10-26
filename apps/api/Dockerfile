# ============================================================
# TROSV backend - PHP 8.3 CLI, Debian 13 "trixie" (latest stable).
# ============================================================
FROM php:8.3-cli-trixie

# libpng/jpeg/freetype are required for the GD extension (seeder sample images).
# pcntl is required by Laravel Reverb (SIGINT/SIGTERM constants + signal
# handlers) and is NOT compiled into the PHP images by default - without it
# "reverb:start" dies with "Undefined constant SIGINT".
# Debian (apt) package names khac Alpine (apk): libicu-dev (khong phai
# icu-dev), libonig-dev (khong phai oniguruma-dev), libjpeg-dev, libfreetype6-dev.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libpq-dev libicu-dev libonig-dev libzip-dev libpng-dev libjpeg-dev libfreetype6-dev \
    && rm -rf /var/lib/apt/lists/* \
    && docker-php-ext-configure gd --with-jpeg --with-freetype \
    && docker-php-ext-install pdo_pgsql pgsql bcmath intl zip gd pcntl

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Dependencies first so they are cached between builds.
ARG COMPOSER_FLAGS="--no-dev"
COPY composer.json composer.lock ./
RUN composer install ${COMPOSER_FLAGS} --no-interaction --prefer-dist --no-scripts

COPY . .

# bootstrap/cache must be empty here: .dockerignore excludes local *.php caches
# (they reference dev packages like laravel/pail and would crash every artisan
# command in a --no-dev image). Without this, artisan cannot even resolve providers.
RUN mkdir -p bootstrap/cache && rm -f bootstrap/cache/*.php

# Relative storage link so /storage URLs work behind APP_URL.
# No "|| true": a failure here must break the build, not hide a broken image.
RUN php artisan storage:link --relative --force

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
