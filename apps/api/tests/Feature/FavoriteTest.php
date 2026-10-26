<?php

namespace Tests\Feature;

use App\Models\Listing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FavoriteTest extends TestCase
{
    use RefreshDatabase;

    private User $student;

    private User $otherStudent;

    private User $landlord;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = User::factory()->student()->create();
        $this->otherStudent = User::factory()->student()->create();
        $this->landlord = User::factory()->landlord()->create();
    }

    private function makeListing(): Listing
    {
        return Listing::factory()->create(['user_id' => $this->landlord->id]);
    }

    // ------------------------------------------------------------------
    // PUT /favorites/{listing_id}
    // ------------------------------------------------------------------

    public function test_student_can_add_favorite(): void
    {
        $listing = $this->makeListing();

        $this->actingAs($this->student, 'sanctum')
            ->putJson("/api/favorites/{$listing->id}")
            ->assertOk()
            ->assertExactJson(['data' => ['is_favorited' => true]]);

        $this->assertDatabaseHas('favorites', [
            'user_id' => $this->student->id,
            'listing_id' => $listing->id,
        ]);
    }

    public function test_adding_twice_is_idempotent(): void
    {
        $listing = $this->makeListing();

        foreach (['first', 'second'] as $_) {
            $this->actingAs($this->student, 'sanctum')
                ->putJson("/api/favorites/{$listing->id}")
                ->assertOk()
                ->assertExactJson(['data' => ['is_favorited' => true]]);
        }

        // Only ONE pivot row exists.
        $this->assertDatabaseCount('favorites', 1);
    }

    public function test_add_unknown_listing_returns_404(): void
    {
        $this->actingAs($this->student, 'sanctum')
            ->putJson('/api/favorites/99999')
            ->assertStatus(404)
            ->assertExactJson(['message' => 'Không tìm thấy dữ liệu.']);
    }

    // ------------------------------------------------------------------
    // DELETE /favorites/{listing_id}
    // ------------------------------------------------------------------

    public function test_student_can_remove_favorite(): void
    {
        $listing = $this->makeListing();
        $this->student->favorites()->syncWithoutDetaching([$listing->id]);

        $this->actingAs($this->student, 'sanctum')
            ->deleteJson("/api/favorites/{$listing->id}")
            ->assertOk()
            ->assertExactJson(['data' => ['is_favorited' => false]]);

        $this->assertDatabaseMissing('favorites', [
            'user_id' => $this->student->id,
            'listing_id' => $listing->id,
        ]);
    }

    public function test_removing_twice_still_succeeds(): void
    {
        $listing = $this->makeListing();

        // Never favorited - both calls must succeed with false.
        foreach (['first', 'second'] as $_) {
            $this->actingAs($this->student, 'sanctum')
                ->deleteJson("/api/favorites/{$listing->id}")
                ->assertOk()
                ->assertExactJson(['data' => ['is_favorited' => false]]);
        }
    }

    public function test_remove_unknown_listing_returns_404(): void
    {
        $this->actingAs($this->student, 'sanctum')
            ->deleteJson('/api/favorites/99999')
            ->assertStatus(404);
    }

    // ------------------------------------------------------------------
    // GET /favorites
    // ------------------------------------------------------------------

    public function test_favorites_list_newest_first_and_paginated(): void
    {
        $older = $this->makeListing();
        $newer = $this->makeListing();
        $notFavorited = $this->makeListing();

        $this->student->favorites()->syncWithoutDetaching([$older->id]);
        // Ensure distinct created_at ordering on the pivot.
        DB::table('favorites')->where('listing_id', $older->id)->update(['created_at' => now()->subMinute()]);
        $this->student->favorites()->syncWithoutDetaching([$newer->id]);

        $response = $this->actingAs($this->student, 'sanctum')->getJson('/api/favorites');

        $response->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('data.0.id', $newer->id) // most recently saved first
            ->assertJsonPath('data.1.id', $older->id);

        foreach ($response->json('data') as $row) {
            $this->assertTrue($row['is_favorited']); // always true in this list
        }

        // The other student's view stays empty (favorites are per-user).
        $this->actingAs($this->otherStudent, 'sanctum')
            ->getJson('/api/favorites')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_per_page_validation_matches_listing_convention(): void
    {
        // >50 and non-numeric must be 422 (same convention as GET /listings),
        // not silently clamped (per_page=abc used to become paginate(0)).
        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/favorites?per_page=999')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['per_page']);

        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/favorites?per_page=abc')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['per_page']);

        // Boundary: exactly 50 is still valid.
        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/favorites?per_page=50')
            ->assertOk();
    }

    public function test_favorites_supports_pagination(): void
    {
        $listings = Listing::factory()->count(15)->create(['user_id' => $this->landlord->id]);
        foreach ($listings as $listing) {
            $this->student->favorites()->syncWithoutDetaching([$listing->id]);
        }

        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/favorites?per_page=10&page=2')
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('meta.total', 15);
    }

    // ------------------------------------------------------------------
    // Authorization
    // ------------------------------------------------------------------

    public function test_landlord_cannot_access_favorites(): void
    {
        $listing = $this->makeListing();

        $this->actingAs($this->landlord, 'sanctum')
            ->getJson('/api/favorites')
            ->assertStatus(403)
            ->assertExactJson(['message' => 'Bạn không có quyền thực hiện thao tác này.']);

        $this->actingAs($this->landlord, 'sanctum')
            ->putJson("/api/favorites/{$listing->id}")
            ->assertStatus(403);

        $this->actingAs($this->landlord, 'sanctum')
            ->deleteJson("/api/favorites/{$listing->id}")
            ->assertStatus(403);
    }

    public function test_guest_cannot_access_favorites(): void
    {
        $listing = $this->makeListing();

        $this->getJson('/api/favorites')->assertStatus(401);
        $this->putJson("/api/favorites/{$listing->id}")->assertStatus(401);
        $this->deleteJson("/api/favorites/{$listing->id}")->assertStatus(401);
    }

    // ------------------------------------------------------------------
    // Integration with GET /listings
    // ------------------------------------------------------------------

    public function test_is_favorited_reflects_in_public_listing_list(): void
    {
        $fav = $this->makeListing();
        $notFav = $this->makeListing();
        $this->student->favorites()->syncWithoutDetaching([$fav->id]);

        $rows = $this->actingAs($this->student, 'sanctum')->getJson('/api/listings')->json('data');

        $byId = collect($rows)->keyBy('id');
        $this->assertTrue($byId[$fav->id]['is_favorited']);
        $this->assertFalse($byId[$notFav->id]['is_favorited']);
    }
}
