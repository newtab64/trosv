<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Router;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

/**
 * Phase 4 hardening: every response carries the minimum security header set
 * (global middleware append, bootstrap/app.php). CSP is ENFORCING, chosen by
 * response type: strict `default-src 'none'` for non-HTML (the app is a JSON
 * API), a tuned policy for the one HTML view, and an existing policy (the
 * storage serve route's sandbox) is never overridden.
 */
class SecurityHeadersTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_probe_carries_security_headers(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    }

    public function test_public_reference_endpoints_carry_security_headers(): void
    {
        $this->getJson('/api/cities')
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY');
    }

    public function test_welcome_html_gets_tuned_policy(): void
    {
        // The only HTML the backend renders: inline styles + bunny.net fonts
        // + laravel.com artwork must keep working under enforcing CSP.
        $response = $this->get('/');
        $response->assertOk();

        $csp = (string) $response->headers->get('Content-Security-Policy');
        $this->assertStringContainsString("style-src 'unsafe-inline' https://fonts.bunny.net", $csp);
        $this->assertStringContainsString('font-src https://fonts.bunny.net', $csp);
        $this->assertStringContainsString('img-src https://laravel.com', $csp);
    }

    public function test_existing_csp_is_not_overridden(): void
    {
        // Any response that already carries a policy keeps it untouched. The
        // storage serve route streams files with its own sandbox CSP - this
        // probe pins the middleware half of that contract without coupling
        // the test to the vendor route's signature details.
        $this->app->make(Router::class)->get('/api/_probe/csp', fn () => response()
            ->json(['ok' => true])
            ->withHeaders(['Content-Security-Policy' => "default-src 'none'; sandbox"]));

        $response = $this->getJson('/api/_probe/csp');
        $response->assertOk();

        $csp = (string) $response->headers->get('Content-Security-Policy');
        $this->assertStringContainsString('sandbox', $csp);
        $this->assertStringNotContainsString('frame-ancestors', $csp);
    }

    public function test_attachment_download_gets_strict_policy(): void
    {
        // Private attachment downloads are binary (application/pdf): they fall
        // under the strict policy - no document may load from that body.
        Storage::fake('local');
        $conversation = Conversation::factory()->create();
        $message = Message::factory()->create([
            'conversation_id' => $conversation->id,
            'attachment_path' => 'attachments/test.pdf',
        ]);
        Storage::disk('local')->put('attachments/test.pdf', 'fake-pdf');

        $url = URL::temporarySignedRoute('attachments.show', now()->addMinutes(5), ['message' => $message->id], false);

        $response = $this->get($url);
        $response->assertOk();

        $csp = (string) $response->headers->get('Content-Security-Policy');
        $this->assertStringContainsString("default-src 'none'", $csp);
        $this->assertStringContainsString('frame-ancestors', $csp);
    }

    public function test_framework_404_page_carries_security_headers(): void
    {
        // HTML error pages are rendered by the exception handler and bypass
        // route middleware entirely; the respond() hook in bootstrap/app.php
        // is what puts the header set on them (these two tests pin that hook).
        $response = $this->get('/khong-ton-tai', ['Accept' => 'text/html']);
        $response->assertNotFound();

        $this->assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));
        $this->assertSame('DENY', $response->headers->get('X-Frame-Options'));
        $this->assertStringContainsString("default-src 'none'", (string) $response->headers->get('Content-Security-Policy'));
    }

    public function test_json_error_response_carries_security_headers(): void
    {
        $response = $this->getJson('/api/khong-ton-tai');
        $response->assertNotFound()
            ->assertExactJson(['message' => 'Không tìm thấy dữ liệu.']);

        $this->assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));
        $this->assertStringContainsString("default-src 'none'", (string) $response->headers->get('Content-Security-Policy'));
    }
}
