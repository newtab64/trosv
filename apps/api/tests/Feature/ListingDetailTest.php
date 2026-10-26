<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Listing;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListingDetailTest extends TestCase
{
    use RefreshDatabase;

    private User $landlord;

    private Listing $listing;

    protected function setUp(): void
    {
        parent::setUp();

        $this->landlord = User::factory()->landlord()->create([
            'name' => 'Chủ Nhà',
            'phone' => '0909999999',
        ]);
        $this->listing = Listing::factory()->create([
            'user_id' => $this->landlord->id,
            'description' => 'Mô tả chi tiết phòng.',
        ]);
    }

    // ------------------------------------------------------------------
    // GET /listings/{id}
    // ------------------------------------------------------------------

    public function test_guest_sees_detail_without_phone(): void
    {
        $this->listing->images()->create(['path' => 'listings/a.jpg']);
        $this->listing->images()->create(['path' => 'listings/b.jpg']);

        $response = $this->getJson("/api/listings/{$this->listing->id}");

        $response->assertOk()
            ->assertJsonPath('data.id', $this->listing->id)
            ->assertJsonPath('data.description', 'Mô tả chi tiết phòng.')
            ->assertJsonPath('data.landlord.name', 'Chủ Nhà')
            ->assertJsonPath('data.landlord.phone', null) // hidden for guests
            ->assertJsonCount(2, 'data.images')
            ->assertJsonPath('data.images.0.url', url('/storage/listings/a.jpg'))
            ->assertJsonPath('data.can_review', false)
            ->assertJsonPath('data.my_conversation_id', null)
            ->assertJsonStructure(['data' => ['ratings' => ['listing_avg', 'landlord_avg', 'area_avg']]]);
    }

    public function test_logged_in_user_sees_landlord_phone(): void
    {
        $student = User::factory()->student()->create();

        $this->actingAs($student, 'sanctum')
            ->getJson("/api/listings/{$this->listing->id}")
            ->assertOk()
            ->assertJsonPath('data.landlord.phone', '0909999999');
    }

    public function test_hidden_listing_returns_404_for_guests_and_others(): void
    {
        $this->listing->update(['status' => 'hidden']);

        // Guest: 404.
        $this->getJson("/api/listings/{$this->listing->id}")
            ->assertStatus(404)
            ->assertExactJson(['message' => 'Không tìm thấy dữ liệu.']);

        // Another landlord: 404.
        $other = User::factory()->landlord()->create();
        $this->actingAs($other, 'sanctum')
            ->getJson("/api/listings/{$this->listing->id}")
            ->assertStatus(404);

        // Owner still sees it.
        $this->actingAs($this->landlord, 'sanctum')
            ->getJson("/api/listings/{$this->listing->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $this->listing->id);
    }

    public function test_rented_listing_stays_visible(): void
    {
        $this->listing->update(['status' => 'rented']);

        $this->getJson("/api/listings/{$this->listing->id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'rented');
    }

    public function test_missing_listing_returns_404(): void
    {
        $this->getJson('/api/listings/99999')
            ->assertStatus(404)
            ->assertExactJson(['message' => 'Không tìm thấy dữ liệu.']);
    }

    public function test_non_numeric_listing_id_returns_404(): void
    {
        // Must be a clean JSON 404, not a database cast error.
        $this->getJson('/api/listings/abc')
            ->assertStatus(404)
            ->assertExactJson(['message' => 'Không tìm thấy dữ liệu.']);
    }

    public function test_is_favorited_is_personalized_on_detail(): void
    {
        $student = User::factory()->student()->create();
        $student->favorites()->syncWithoutDetaching([$this->listing->id]);

        $this->actingAs($student, 'sanctum')
            ->getJson("/api/listings/{$this->listing->id}")
            ->assertOk()
            ->assertJsonPath('data.is_favorited', true);

        // Simulate a fresh request (resolved guards persist between in-test
        // requests and would leak the student's identity to the guest call).
        $this->app->make('auth')->forgetGuards();

        // Guest still sees false.
        $this->getJson("/api/listings/{$this->listing->id}")
            ->assertOk()
            ->assertJsonPath('data.is_favorited', false);
    }

    public function test_ratings_are_computed_per_erd(): void
    {
        $student = User::factory()->student()->create();

        // Review on THIS listing: 5 stars.
        Review::factory()->create([
            'listing_id' => $this->listing->id,
            'student_id' => $student->id,
            'listing_rating' => 5,
            'landlord_rating' => 4,
        ]);

        // Another listing of the SAME landlord with a 2-star review -
        // must drag landlord_avg down but not listing_avg.
        $otherListingOfLandlord = Listing::factory()->create(['user_id' => $this->landlord->id]);
        Review::factory()->create([
            'listing_id' => $otherListingOfLandlord->id,
            'student_id' => User::factory()->student()->create()->id,
            'listing_rating' => 2,
            'landlord_rating' => 2,
        ]);

        // A listing in the SAME ward with a 1-star review -
        // must drag area_avg below listing_avg.
        $sameWardListing = Listing::factory()->create([
            'ward_id' => $this->listing->ward_id,
            'user_id' => User::factory()->landlord()->create()->id,
        ]);
        Review::factory()->create([
            'listing_id' => $sameWardListing->id,
            'student_id' => User::factory()->student()->create()->id,
            'listing_rating' => 1,
            'landlord_rating' => 1,
        ]);

        $ratings = $this->getJson("/api/listings/{$this->listing->id}")->json('data.ratings');

        $this->assertEqualsWithDelta(5.0, $ratings['listing_avg'], 0.001); // only this listing
        $this->assertEqualsWithDelta(3.5, $ratings['landlord_avg'], 0.001); // (5+2)/2 across landlord's listings
        $this->assertEqualsWithDelta(3.0, $ratings['area_avg'], 0.001); // (5+1)/2 - the 2★ listing is in another ward
    }

    public function test_ratings_null_when_no_reviews(): void
    {
        $ratings = $this->getJson("/api/listings/{$this->listing->id}")->json('data.ratings');

        $this->assertNull($ratings['listing_avg']);
        $this->assertNull($ratings['landlord_avg']);
        $this->assertNull($ratings['area_avg']);
    }

    public function test_my_conversation_id_and_can_review_states(): void
    {
        $student = User::factory()->student()->create();

        // No conversation yet.
        $this->actingAs($student, 'sanctum')
            ->getJson("/api/listings/{$this->listing->id}")
            ->assertOk()
            ->assertJsonPath('data.my_conversation_id', null)
            ->assertJsonPath('data.can_review', false);

        // Conversation exists → can_review true.
        $conversation = Conversation::factory()->create([
            'listing_id' => $this->listing->id,
            'student_id' => $student->id,
            'landlord_id' => $this->landlord->id,
        ]);

        $this->actingAs($student, 'sanctum')
            ->getJson("/api/listings/{$this->listing->id}")
            ->assertOk()
            ->assertJsonPath('data.my_conversation_id', $conversation->id)
            ->assertJsonPath('data.can_review', true);

        // After reviewing → can_review false again.
        Review::factory()->create([
            'listing_id' => $this->listing->id,
            'student_id' => $student->id,
        ]);

        $this->actingAs($student, 'sanctum')
            ->getJson("/api/listings/{$this->listing->id}")
            ->assertOk()
            ->assertJsonPath('data.can_review', false);
    }

    // ------------------------------------------------------------------
    // GET /listings/{id}/reviews
    // ------------------------------------------------------------------

    public function test_reviews_list_newest_first_and_paginated(): void
    {
        $older = Review::factory()->create([
            'listing_id' => $this->listing->id,
            'comment' => 'Tin nhắn cũ',
        ]);
        $newer = Review::factory()->create([
            'listing_id' => $this->listing->id,
            'comment' => 'Tin nhắn mới',
        ]);

        $response = $this->getJson("/api/listings/{$this->listing->id}/reviews");

        $response->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('data.0.id', $newer->id) // newest first
            ->assertJsonPath('data.1.id', $older->id)
            ->assertJsonStructure([
                'data' => [['id', 'student' => ['id', 'name'], 'listing_rating', 'landlord_rating', 'comment', 'created_at']],
                'meta',
            ]);

        // student must expose only id + name.
        $firstStudent = $response->json('data.0.student');
        $this->assertSame(['id', 'name'], array_keys($firstStudent));
    }

    // ------------------------------------------------------------------
    // POST /listings/{id}/reviews
    // ------------------------------------------------------------------

    public function test_student_with_conversation_can_review(): void
    {
        $student = User::factory()->student()->create();
        Conversation::factory()->create([
            'listing_id' => $this->listing->id,
            'student_id' => $student->id,
            'landlord_id' => $this->landlord->id,
        ]);

        $response = $this->actingAs($student, 'sanctum')
            ->postJson("/api/listings/{$this->listing->id}/reviews", [
                'listing_rating' => 4,
                'landlord_rating' => 5,
                'comment' => 'Chủ nhà nhiệt tình',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.listing_rating', 4)
            ->assertJsonPath('data.landlord_rating', 5)
            ->assertJsonPath('data.comment', 'Chủ nhà nhiệt tình')
            ->assertJsonPath('data.student.id', $student->id);

        $this->assertDatabaseHas('reviews', [
            'listing_id' => $this->listing->id,
            'student_id' => $student->id,
            'listing_rating' => 4,
        ]);
    }

    public function test_review_without_conversation_returns_403(): void
    {
        $student = User::factory()->student()->create();

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/listings/{$this->listing->id}/reviews", [
                'listing_rating' => 4,
                'landlord_rating' => 5,
            ])
            ->assertStatus(403)
            ->assertExactJson(['message' => 'Bạn cần nhắn tin với chủ nhà trước khi đánh giá.']);
    }

    public function test_second_review_returns_422(): void
    {
        $student = User::factory()->student()->create();
        Conversation::factory()->create([
            'listing_id' => $this->listing->id,
            'student_id' => $student->id,
            'landlord_id' => $this->landlord->id,
        ]);
        Review::factory()->create([
            'listing_id' => $this->listing->id,
            'student_id' => $student->id,
        ]);

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/listings/{$this->listing->id}/reviews", [
                'listing_rating' => 4,
                'landlord_rating' => 5,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['listing_id']);
    }

    public function test_landlord_cannot_review_returns_403(): void
    {
        // Landlords are rejected by role middleware with the standard message.
        $this->actingAs($this->landlord, 'sanctum')
            ->postJson("/api/listings/{$this->listing->id}/reviews", [
                'listing_rating' => 4,
                'landlord_rating' => 5,
            ])
            ->assertStatus(403)
            ->assertExactJson(['message' => 'Bạn không có quyền thực hiện thao tác này.']);
    }

    public function test_review_without_token_returns_401(): void
    {
        $this->postJson("/api/listings/{$this->listing->id}/reviews", [
            'listing_rating' => 4,
            'landlord_rating' => 5,
        ])->assertStatus(401);
    }

    public function test_review_validation_errors(): void
    {
        $student = User::factory()->student()->create();
        Conversation::factory()->create([
            'listing_id' => $this->listing->id,
            'student_id' => $student->id,
            'landlord_id' => $this->landlord->id,
        ]);

        // rating out of range
        $this->actingAs($student, 'sanctum')
            ->postJson("/api/listings/{$this->listing->id}/reviews", [
                'listing_rating' => 6,
                'landlord_rating' => 0,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['listing_rating', 'landlord_rating']);

        // missing fields
        $this->actingAs($student, 'sanctum')
            ->postJson("/api/listings/{$this->listing->id}/reviews", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['listing_rating', 'landlord_rating']);
    }
}
