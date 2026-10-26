<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

/**
 * Production config fail-fast (Phase 4 hardening) as MIDDLEWARE, not a
 * boot-time check: middleware runs for HTTP requests only, so composer
 * scripts and artisan commands keep booting even on a machine without a
 * .env (CI: package:discover runs before any .env exists, and Laravel's
 * config defaults resolve APP_ENV to "production").
 *
 * A production deploy serving HTTP with APP_DEBUG=true leaks stack traces,
 * env values and file paths to anyone who can trigger an error, and an
 * empty APP_KEY makes signed URL authorization forgeable (the signature IS
 * the authorization for chat attachments). Instead of serving, every
 * request fails with a generic 500 while the precise reason is logged.
 */
class EnsureProductionConfig
{
    public function handle(Request $request, Closure $next): Response
    {
        if (app()->environment('production')) {
            if ((bool) config('app.debug')) {
                Log::error('Refusing to serve: APP_DEBUG must be false in production.');
                throw new RuntimeException('APP_DEBUG must be false in production.');
            }

            if (config('app.key') === null || config('app.key') === '') {
                Log::error('Refusing to serve: APP_KEY must be set in production.');
                throw new RuntimeException('APP_KEY must be set in production.');
            }
        }

        return $next($request);
    }
}
