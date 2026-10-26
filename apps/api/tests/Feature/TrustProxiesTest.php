<?php

namespace Tests\Feature;

use Illuminate\Http\Request;
use Illuminate\Routing\Router;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Phase 4 hardening: reverse-proxy trust is OPT-IN via TRUSTED_PROXIES
 * (bootstrap/app.php passes env('TRUSTED_PROXIES') to trustProxies(at:)).
 *
 * Default trusts NOTHING: when the app is reached directly (docker demo
 * publishes :8000), X-Forwarded-For is attacker-controlled and honoring it
 * would let anyone rotate IPs to defeat the per-IP rate limiter. Behind
 * Caddy (TLS profile) TRUSTED_PROXIES="*" makes request->ip() the real
 * client IP.
 *
 * The tests exercise the config fallback path (TrustProxies middleware
 * reads config('trustedproxy.proxies') at request time when no static
 * value is set), so Config::set cannot leak between tests.
 */
class TrustProxiesTest extends TestCase
{
    // This framework build has no defineRoutes() test hook, so the probe
    // route is registered per test. TrustProxies is GLOBAL middleware, so it
    // applies to this route regardless of middleware groups.
    private function registerProbeRoute(Router $router): void
    {
        $router->get('/_probe/ip', fn (Request $request) => response()->json(['ip' => $request->ip()]));
    }

    public function test_forwarded_header_is_ignored_by_default(): void
    {
        // No trusted proxies configured: the client-supplied X-Forwarded-For
        // must NOT influence request->ip() (spoof-proof rate limiting).
        $this->registerProbeRoute($this->app->make(Router::class));

        $this->getJson('/_probe/ip', ['X-Forwarded-For' => '203.0.113.7'])
            ->assertOk()
            ->assertJsonPath('ip', '127.0.0.1');
    }

    public function test_trusted_proxy_resolves_real_client_ip(): void
    {
        // TLS-profile behavior (TRUSTED_PROXIES="*"): the only route to the
        // backend is the compose-internal proxy, so the forwarded chain is
        // trusted and the real client IP surfaces.
        $this->registerProbeRoute($this->app->make(Router::class));
        Config::set('trustedproxy.proxies', '*');

        $this->getJson('/_probe/ip', ['X-Forwarded-For' => '203.0.113.7'])
            ->assertOk()
            ->assertJsonPath('ip', '203.0.113.7');
    }
}
