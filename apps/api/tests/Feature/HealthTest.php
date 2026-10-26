<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HealthTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_returns_ok_when_database_available(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertOk()
            ->assertJsonStructure(['ok', 'app', 'database', 'time'])
            ->assertJsonPath('ok', true)
            ->assertJsonPath('database', 'ok');
    }

    public function test_health_does_not_leak_internals(): void
    {
        $response = $this->getJson('/api/health');

        $body = $response->getContent();

        $this->assertStringNotContainsString('exception', $body);
        $this->assertStringNotContainsString('trace', $body);
        $this->assertStringNotContainsString('pgsql', $body);
        $this->assertStringNotContainsString(PHP_VERSION, $body);
    }

    public function test_health_response_carries_request_id_header(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertOk()->assertHeader('X-Request-Id');

        $this->assertMatchesRegularExpression(
            '/^[A-Za-z0-9-]{8,64}$/',
            (string) $response->headers->get('X-Request-Id')
        );
    }
}
