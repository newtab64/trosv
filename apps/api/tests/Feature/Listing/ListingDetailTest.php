<?php

namespace Tests\Feature\Listing;

use App\Modules\Auth\Models\User;
use App\Modules\Listing\Models\Listing;
use App\Modules\Listing\Models\Review;
use App\Modules\Messaging\Models\Conversation;
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

        // Another listing of the SAME landlord, reviewed 2 stars for the room and 1 star for
        // the landlord - must drag landlord_avg down but not listing_avg.
        $otherListingOfLandlord = Listing::factory()->create(['user_id' => $this->landlord->id]);
        Review::factory()->create([
            'listing_id' => $otherListingOfLandlord->id,
            'student_id' => User::factory()->student()->create()->id,
            'listing_rating' => 2,
            'landlord_rating' => 1,
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
        // The landlord is averaged on landlord_rating across ALL their listings: (4+1)/2. Averaging the
        // room ratings instead would give (5+2)/2 = 3.5, so the three averages must all differ.
        $this->assertEqualsWithDelta(2.5, $ratings['landlord_avg'], 0.001);
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

    public function test_contacting_another_room_keeps_review_access_to_previous_rooms(): void
    {
        $student = User::factory()->student()->create();
        $otherStudent = User::factory()->student()->create();
        $second = Listing::factory()->create(['user_id' => $this->landlord->id]);
        $untouched = Listing::factory()->create(['user_id' => $this->landlord->id]);

        $conversationId = $this->actingAs($student, 'sanctum')
            ->postJson('/api/conversations', ['listing_id' => $this->listing->id])
            ->assertCreated()->json('data.id');
        $this->postJson('/api/conversations', ['listing_id' => $second->id])
            ->assertOk()->assertJsonPath('data.id', $conversationId);
        $this->postJson('/api/conversations', ['listing_id' => $second->id])->assertOk();
        $this->assertDatabaseCount('conversation_listing', 2);

        foreach ([$this->listing, $second] as $room) {
            $this->getJson("/api/listings/{$room->id}")
                ->assertOk()
                ->assertJsonPath('data.my_conversation_id', $conversationId)
                ->assertJsonPath('data.can_review', true);
        }

        $this->getJson("/api/listings/{$untouched->id}")
            ->assertOk()->assertJsonPath('data.can_review', false)
            ->assertJsonPath('data.my_conversation_id', null);
        $this->postJson("/api/listings/{$untouched->id}/reviews", [
            'listing_rating' => 4, 'landlord_rating' => 5,
        ])->assertForbidden();

        $this->actingAs($otherStudent, 'sanctum')
            ->getJson("/api/listings/{$this->listing->id}")
            ->assertOk()->assertJsonPath('data.can_review', false);
        $this->postJson("/api/listings/{$this->listing->id}/reviews", [
            'listing_rating' => 4, 'landlord_rating' => 5,
        ])->assertForbidden();

        $this->actingAs($this->landlord, 'sanctum')
            ->deleteJson("/api/listings/{$second->id}")->assertOk();
        $this->actingAs($student, 'sanctum')
            ->getJson("/api/listings/{$this->listing->id}")
            ->assertOk()->assertJsonPath('data.can_review', true)
            ->assertJsonPath('data.my_conversation_id', $conversationId);
        $payload = ['listing_rating' => 4, 'landlord_rating' => 5];
        $this->postJson("/api/listings/{$this->listing->id}/reviews", $payload)->assertCreated();
        $this->getJson("/api/listings/{$this->listing->id}")
            ->assertOk()->assertJsonPath('data.can_review', false);
        $this->postJson("/api/listings/{$this->listing->id}/reviews", $payload)->assertStatus(422);
    }

    public function test_existing_conversation_keeps_its_previous_room_when_contacting_another(): void
    {
        $student = User::factory()->student()->create();
        $conversation = Conversation::factory()->create([
            'listing_id' => $this->listing->id,
            'student_id' => $student->id,
            'landlord_id' => $this->landlord->id,
        ]);
        $second = Listing::factory()->create(['user_id' => $this->landlord->id]);

        $this->actingAs($student, 'sanctum')
            ->postJson('/api/conversations', ['listing_id' => $second->id])->assertOk();
        $this->getJson("/api/listings/{$this->listing->id}")
            ->assertOk()->assertJsonPath('data.can_review', true)
            ->assertJsonPath('data.my_conversation_id', $conversation->id);
    }

    public function test_contact_history_migration_backfills_existing_room_contexts(): void
    {
        $student = User::factory()->student()->create();
        $conversation = Conversation::factory()->create([
            'listing_id' => $this->listing->id,
            'student_id' => $student->id,
            'landlord_id' => $this->landlord->id,
        ]);
        Conversation::factory()->create(['listing_id' => null]);

        $migration = require database_path('migrations/2026_11_13_000002_track_conversation_listings.php');
        $migration->down();
        $migration->up();

        $this->assertDatabaseCount('conversation_listing', 1);
        $this->assertDatabaseHas('conversation_listing', [
            'conversation_id' => $conversation->id,
            'listing_id' => $this->listing->id,
        ]);
        $this->assertDatabaseCount('conversations', 2);
        $this->actingAs($student, 'sanctum')
            ->getJson("/api/listings/{$this->listing->id}")
            ->assertOk()->assertJsonPath('data.can_review', true);
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
        $this->assertSame(['id', 'name', 'avatar'], array_keys($firstStudent));
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
