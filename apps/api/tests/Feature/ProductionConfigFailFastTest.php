<?php

namespace Tests\Feature;

use App\Providers\AppServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Routing\Router;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

/**
 * Phase 4 hardening: production must refuse to SERVE with unsafe config
 * (APP_DEBUG=true leaks stack traces and env values; an empty APP_KEY makes
 * signed attachment URLs forgeable - the signature IS the authorization).
 *
 * The guard is the EnsureProductionConfig MIDDLEWARE (HTTP only), not a
 * boot-time check: package:discover boots the app during composer install
 * with no .env present, and Laravel's config defaults resolve APP_ENV to
 * "production" - a boot-time throw broke CI. environment() reads the
 * app['env'] INSTANCE (set from APP_ENV), not config('app.env'), so the
 * tests set BOTH. The exception's reason goes to the log only; clients get
 * the generic 500 envelope (API_CONTRACT §1 - never leak internals).
 */
class ProductionConfigFailFastTest extends TestCase
{
    private function forceEnvironment(string $environment): void
    {
        $this->app->detectEnvironment(fn () => $environment);
        Config::set('app.env', $environment);
    }

    // Registered under api/* on purpose: that is where the app's exception
    // handler renders the generic JSON 500 envelope (API_CONTRACT §1).
    private function registerProbeRoute(Router $router): void
    {
        $router->get('/api/_probe/ping', fn (Request $request) => response()->json(['ok' => true]));
    }

    public function test_debug_true_in_production_returns_generic_500(): void
    {
        $this->forceEnvironment('production');
        Config::set('app.debug', true);
        $this->registerProbeRoute($this->app->make(Router::class));

        $this->getJson('/api/_probe/ping')
            ->assertStatus(500)
            ->assertExactJson(['message' => 'Lỗi máy chủ.']);
    }

    public function test_missing_app_key_in_production_returns_generic_500(): void
    {
        $this->forceEnvironment('production');
        Config::set('app.debug', false);
        Config::set('app.key', '');
        $this->registerProbeRoute($this->app->make(Router::class));

        $this->getJson('/api/_probe/ping')
            ->assertStatus(500)
            ->assertExactJson(['message' => 'Lỗi máy chủ.']);
    }

    public function test_local_environment_serves_with_debug_and_empty_key(): void
    {
        $this->forceEnvironment('local');
        Config::set('app.debug', true);
        Config::set('app.key', '');
        $this->registerProbeRoute($this->app->make(Router::class));

        // Local development legitimately runs without a key and with debug.
        $this->getJson('/api/_probe/ping')->assertOk();
    }

    public function test_booting_without_env_does_not_throw_composer_context(): void
    {
        // The exact CI failure this middleware fixes: provider boot in a
        // "production" default env with no APP_KEY must NOT throw, because
        // composer scripts (package:discover) boot the app before any .env
        // exists. The guard refuses HTTP requests instead (tests above).
        $this->forceEnvironment('production');
        Config::set('app.debug', false);
        Config::set('app.key', null);

        (new AppServiceProvider($this->app))->boot();

        $this->assertTrue(true); // reached without exception
    }
}
