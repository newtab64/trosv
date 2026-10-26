<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Conversation;
use App\Models\Listing;
use App\Models\Message;
use App\Models\Review;
use App\Models\School;
use App\Models\User;
use App\Models\Ward;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SeedAndRelationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_seed_command_runs_without_errors(): void
    {
        $this->artisan('db:seed', ['--force' => true])->assertExitCode(0);

        $this->assertDatabaseCount('users', 13);
        $this->assertDatabaseCount('listings', 48);
        // Sample image files need GD (bundled in the Docker image); without GD
        // the seeder still seeds everything except the picture files.
        $this->assertDatabaseCount('listing_images', extension_loaded('gd') ? 48 : 0);
        $this->assertDatabaseCount('conversations', 6);
        $this->assertDatabaseCount('reviews', 4);

        // Demo accounts exist with the shared password.
        $student = User::where('email', 'student1@example.com')->first();
        $landlord = User::where('email', 'landlord1@example.com')->first();
        $this->assertNotNull($student, 'student1@example.com must exist');
        $this->assertNotNull($landlord, 'landlord1@example.com must exist');
        $this->assertTrue(Hash::check('password', $student->password));
        $this->assertTrue(Hash::check('password', $landlord->password));

        // Seeded prices stay in the 1.5M..12M VND range (including student houses).
        $this->assertTrue(Listing::whereBetween('price', [1_500_000, 12_000_000])->count() === 48);
    }

    public function test_hcmc_schools_are_pinned_to_wards(): void
    {
        $this->seed();

        $hcmc = City::where('name', 'TP.HCM')->firstOrFail();
        $schools = School::where('city_id', $hcmc->id)->get();

        $this->assertCount(20, $schools);

        // Every HCMC school sits in a ward OF THE SAME CITY (not just any ward).
        $hcmcWardIds = Ward::where('city_id', $hcmc->id)->pluck('id');
        foreach ($schools as $school) {
            $this->assertNotNull($school->ward_id, "{$school->name} must have a ward");
            $this->assertTrue($hcmcWardIds->contains($school->ward_id));
        }

        // Shared campuses are legal: HCMIU, UIT and NLU all map to Phường Linh Trung.
        $linhTrung = Ward::where('name', 'Phường Linh Trung')->where('city_id', $hcmc->id)->firstOrFail();
        $this->assertSame(3, School::where('ward_id', $linhTrung->id)->count());
    }

    public function test_listing_ward_and_amenity_relations_work(): void
    {
        $this->seed();

        $listing = Listing::has('amenities')->first();

        $this->assertNotNull($listing->ward);
        $this->assertDatabaseHas('wards', ['id' => $listing->ward_id]);
        $this->assertGreaterThanOrEqual(4, $listing->amenities->count());
        $this->assertLessThanOrEqual(7, $listing->amenities->count());
        $this->assertSame($listing->user_id, $listing->landlord->id);
    }

    public function test_conversation_message_relation_works(): void
    {
        $this->seed();

        // Eager load so preventLazyLoading (step 10) does not flag $message->conversation.
        $conversation = Conversation::has('messages')->with('messages.conversation')->first();

        $this->assertGreaterThanOrEqual(1, $conversation->messages->count());
        $this->assertInstanceOf(Message::class, $conversation->messages->first());

        $message = $conversation->messages->first();
        $this->assertSame($conversation->id, $message->conversation->id);
        $this->assertContains($message->sender_id, [$conversation->student_id, $conversation->landlord_id]);
    }

    public function test_cover_image_is_image_with_smallest_id(): void
    {
        $this->seed();

        $listing = Listing::first();
        $listing->images()->delete();

        $listing->images()->createMany([
            ['path' => 'listings/test-b.jpg'],
            ['path' => 'listings/test-a.jpg'],
            ['path' => 'listings/test-c.jpg'],
        ]);

        // Cover = image with the smallest id, regardless of insertion order/path.
        $this->assertSame(
            $listing->images()->min('id'),
            $listing->coverImage->first()->id,
        );
    }

    public function test_reviews_are_backed_by_conversations(): void
    {
        $this->seed();

        // ERD rule: a student can only review a listing they have a conversation about.
        $orphanReviews = Review::whereNotExists(function ($query) {
            $query->selectRaw(1)
                ->from('conversations')
                ->whereColumn('conversations.student_id', 'reviews.student_id')
                ->whereColumn('conversations.listing_id', 'reviews.listing_id');
        })->count();

        $this->assertSame(0, $orphanReviews);
    }

    public function test_user_messages_and_reviews_relations_work(): void
    {
        $this->seed();

        $sender = User::whereHas('messages')->first();
        $this->assertNotNull($sender);
        $this->assertGreaterThanOrEqual(1, $sender->messages()->count());

        $reviewer = User::whereHas('reviews')->first();
        $this->assertNotNull($reviewer);
        $this->assertGreaterThanOrEqual(1, $reviewer->reviews()->count());
    }
}
