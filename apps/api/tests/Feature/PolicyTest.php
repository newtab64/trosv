<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Listing;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Direct policy unit checks. The HTTP envelope (404-for-outsiders,
 * 403-with-message) is pinned by AuthorizationMatrixTest and the
 * characterization tests; these verify the decision logic itself.
 */
class PolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_listing_manage_is_owner_only(): void
    {
        $landlord = User::factory()->landlord()->create();
        $other = User::factory()->landlord()->create();
        $listing = Listing::factory()->create(['user_id' => $landlord->id]);

        $this->assertTrue($landlord->can('manage', $listing));
        $this->assertFalse($other->can('manage', $listing));
        $this->assertFalse(User::factory()->student()->create()->can('manage', $listing));
    }

    public function test_listing_review_requires_conversation(): void
    {
        $student = User::factory()->student()->create();
        $landlord = User::factory()->landlord()->create();
        $listing = Listing::factory()->create(['user_id' => $landlord->id]);

        $this->assertFalse($student->can('review', $listing));

        Conversation::factory()->create([
            'listing_id' => $listing->id,
            'student_id' => $student->id,
            'landlord_id' => $landlord->id,
        ]);

        $this->assertTrue($student->can('review', $listing));
    }

    public function test_conversation_participate_covers_both_sides_only(): void
    {
        $conversation = Conversation::factory()->create();

        $this->assertTrue($conversation->student->can('participate', $conversation));
        $this->assertTrue($conversation->landlord->can('participate', $conversation));
        $this->assertFalse(User::factory()->student()->create()->can('participate', $conversation));
    }

    public function test_message_participate_and_unsend(): void
    {
        $conversation = Conversation::factory()->create();
        $message = Message::factory()->create([
            'conversation_id' => $conversation->id,
            'sender_id' => $conversation->student_id,
        ]);

        $student = User::find($conversation->student_id);
        $landlord = User::find($conversation->landlord_id);
        $outsider = User::factory()->student()->create();

        // Both participants may act on messages; only the sender may unsend.
        $this->assertTrue($student->can('participate', $message));
        $this->assertTrue($landlord->can('participate', $message));
        $this->assertFalse($outsider->can('participate', $message));

        $this->assertTrue($student->can('unsend', $message));
        $this->assertFalse($landlord->can('unsend', $message));
        $this->assertFalse($outsider->can('unsend', $message));
    }
}
