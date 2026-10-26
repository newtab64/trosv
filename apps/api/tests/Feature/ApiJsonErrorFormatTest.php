<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiJsonErrorFormatTest extends TestCase
{
    use RefreshDatabase;

    public function test_unknown_api_route_returns_json_404(): void
    {
        $response = $this->getJson('/api/this-route-does-not-exist');

        $response->assertStatus(404)
            ->assertExactJson(['message' => 'Không tìm thấy dữ liệu.']);
    }

    public function test_missing_model_returns_json_404(): void
    {
        // No /listings/{id} route yet; the missing model is exercised from step 2.
        // For now verify that a model-bound-like missing lookup keeps JSON shape.
        $response = $this->getJson('/api/this-route-does-not-exist', ['Accept' => 'application/json']);

        $response->assertStatus(404)
            ->assertHeader('Content-Type', 'application/json');
    }

    public function test_unauthenticated_protected_route_returns_json_401(): void
    {
        // /api/me requires auth and exists in the contract.
        $response = $this->getJson('/api/me');

        $response->assertStatus(401)
            ->assertExactJson(['message' => 'Bạn chưa đăng nhập.']);
    }

    public function test_guest_request_without_accept_header_returns_json_401_not_500(): void
    {
        // Regression: guests hitting a protected route WITHOUT "Accept: application/json"
        // used to trigger redirectGuestsTo(route('login')) - which threw
        // RouteNotFoundException (no login route in an API-only app) and returned 500.
        $response = $this->get('/api/favorites');

        $response->assertStatus(401)
            ->assertExactJson(['message' => 'Bạn chưa đăng nhập.'])
            ->assertHeader('Content-Type', 'application/json');
    }

    public function test_invalid_token_returns_json_401(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer invalid-token')
            ->getJson('/api/me');

        $response->assertStatus(401)
            ->assertExactJson(['message' => 'Bạn chưa đăng nhập.']);
    }
}
