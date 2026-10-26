<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

/**
 * PROMPTS.md step 10, item 3: an authorization matrix over the main
 * endpoints - guest / student / landlord (non-owner) / owner - asserting
 * the exact contract status code (401, 403, 404 or success).
 */
class AuthorizationMatrixTest extends TestCase
{
    use RefreshDatabase;

    private User $student;

    private User $landlord;

    private User $otherLandlord;

    private Listing $listing;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = User::factory()->student()->create();
        $this->landlord = User::factory()->landlord()->create();
        $this->otherLandlord = User::factory()->landlord()->create();
        $this->listing = Listing::factory()->create(['user_id' => $this->landlord->id]);
    }

    public function test_public_endpoints_allow_guests(): void
    {
        $this->getJson('/api/listings')->assertOk();
        $this->getJson("/api/listings/{$this->listing->id}")->assertOk();
        $this->getJson("/api/listings/{$this->listing->id}/reviews")->assertOk();
        $this->getJson('/api/wards')->assertOk();
        $this->getJson('/api/schools')->assertOk();
        $this->getJson('/api/amenities')->assertOk();
    }

    public function test_listings_write_endpoints(): void
    {
        $payload = [
            'title' => 'Phòng test ma trận quyền',
            'type' => 'room',
            'price' => 2000000,
            'area_m2' => 20,
            'address' => '1 Đường test',
            'latitude' => 10.8,
            'longitude' => 106.7,
            'ward_id' => $this->listing->ward_id,
        ];

        // POST /listings - Landlord only.
        $this->postJson('/api/listings', $payload)->assertStatus(401);
        $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/listings', $payload)->assertStatus(403);
        $this->actingAs($this->landlord, 'sanctum')
            ->postJson('/api/listings', $payload)->assertStatus(201);

        // PUT /listings/{id} - Owner only. forgetGuards first: actingAs()
        // persists across in-process requests, so the guest call above would
        // otherwise still be authenticated as the landlord.
        Auth::forgetGuards();
        $this->putJson("/api/listings/{$this->listing->id}", ['price' => 2100000])->assertStatus(401);
        $this->actingAs($this->student, 'sanctum')
            ->putJson("/api/listings/{$this->listing->id}", ['price' => 2100000])->assertStatus(403);
        $this->actingAs($this->otherLandlord, 'sanctum')
            ->putJson("/api/listings/{$this->listing->id}", ['price' => 2100000])->assertStatus(403);
        $this->actingAs($this->landlord, 'sanctum')
            ->putJson("/api/listings/{$this->listing->id}", ['price' => 2100000])->assertOk();

        // DELETE /listings/{id} - Owner only.
        Auth::forgetGuards();
        $this->deleteJson("/api/listings/{$this->listing->id}")->assertStatus(401);
        $this->actingAs($this->student, 'sanctum')
            ->deleteJson("/api/listings/{$this->listing->id}")->assertStatus(403);
        $this->actingAs($this->otherLandlord, 'sanctum')
            ->deleteJson("/api/listings/{$this->listing->id}")->assertStatus(403);
        $this->actingAs($this->landlord, 'sanctum')
            ->deleteJson("/api/listings/{$this->listing->id}")->assertOk();
    }

    public function test_my_listings_is_landlord_only(): void
    {
        $this->getJson('/api/my/listings')->assertStatus(401);
        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/my/listings')->assertStatus(403);
        $this->actingAs($this->landlord, 'sanctum')
            ->getJson('/api/my/listings')->assertOk();
    }

    public function test_favorites_are_student_only(): void
    {
        // GET /favorites.
        $this->getJson('/api/favorites')->assertStatus(401);
        $this->actingAs($this->landlord, 'sanctum')
            ->getJson('/api/favorites')->assertStatus(403);
        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/favorites')->assertOk();

        // PUT/DELETE /favorites/{id}.
        $this->actingAs($this->landlord, 'sanctum')
            ->putJson("/api/favorites/{$this->listing->id}")->assertStatus(403);
        $this->actingAs($this->student, 'sanctum')
            ->putJson("/api/favorites/{$this->listing->id}")->assertOk();
        $this->actingAs($this->landlord, 'sanctum')
            ->deleteJson("/api/favorites/{$this->listing->id}")->assertStatus(403);
        $this->actingAs($this->student, 'sanctum')
            ->deleteJson("/api/favorites/{$this->listing->id}")->assertOk();
    }

    public function test_reviews_are_student_only_and_need_a_conversation(): void
    {
        $body = ['listing_rating' => 4, 'landlord_rating' => 5];

        $this->postJson("/api/listings/{$this->listing->id}/reviews", $body)->assertStatus(401);
        $this->actingAs($this->landlord, 'sanctum')
            ->postJson("/api/listings/{$this->listing->id}/reviews", $body)->assertStatus(403);

        // Student without a conversation about this listing → 403 (contract).
        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/listings/{$this->listing->id}/reviews", $body)->assertStatus(403);
    }

    public function test_conversations_gatekeeping(): void
    {
        // POST /conversations - Student only.
        $this->postJson('/api/conversations', ['listing_id' => $this->listing->id])->assertStatus(401);
        $this->actingAs($this->landlord, 'sanctum')
            ->postJson('/api/conversations', ['listing_id' => $this->listing->id])->assertStatus(403);
        $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/conversations', ['listing_id' => $this->listing->id])->assertStatus(201);

        // GET /conversations - any authenticated user.
        Auth::forgetGuards();
        $this->getJson('/api/conversations')->assertStatus(401);
        $this->actingAs($this->student, 'sanctum')->getJson('/api/conversations')->assertOk();
        $this->actingAs($this->landlord, 'sanctum')->getJson('/api/conversations')->assertOk();

        // Messages/read - participants only, outsiders get 404.
        Auth::forgetGuards();
        $conversation = Conversation::first();
        $outsider = User::factory()->student()->create();

        $this->actingAs($outsider, 'sanctum')
            ->getJson("/api/conversations/{$conversation->id}/messages")->assertStatus(404);
        $this->actingAs($this->landlord, 'sanctum')
            ->getJson("/api/conversations/{$conversation->id}/messages")->assertOk();
        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/conversations/{$conversation->id}/read")->assertOk();
    }

    public function test_hidden_listing_404_for_non_owners(): void
    {
        $hidden = Listing::factory()->create([
            'user_id' => $this->landlord->id,
            'status' => 'hidden',
        ]);

        $this->getJson("/api/listings/{$hidden->id}")->assertStatus(404);
        $this->actingAs($this->student, 'sanctum')
            ->getJson("/api/listings/{$hidden->id}")->assertStatus(404);
        $this->actingAs($this->otherLandlord, 'sanctum')
            ->getJson("/api/listings/{$hidden->id}")->assertStatus(404);

        // Owner still sees their own hidden listing.
        $this->actingAs($this->landlord, 'sanctum')
            ->getJson("/api/listings/{$hidden->id}")->assertOk();
    }
}
