<?php

namespace Tests\Feature;

use App\Events\MessageSeen;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

/**
 * Characterization tests for message "seen" semantics
 * (GET /api/conversations/{conversation}/messages + POST .../read).
 *
 * Pins CURRENT behavior before refactoring: unseen messages carry seen_at
 * null in the API payload, markRead stamps seen_at for the other side's
 * messages, outsiders get 404.
 */
class MessageSeenTest extends TestCase
{
    use RefreshDatabase;

    private User $student;

    private User $landlord;

    private Conversation $conversation;

    protected function setUp(): void
    {
        parent::setUp();

        Event::fake();

        $this->student = User::factory()->student()->create();
        $this->landlord = User::factory()->landlord()->create();
        $this->conversation = Conversation::factory()->create([
            'student_id' => $this->student->id,
            'landlord_id' => $this->landlord->id,
        ]);
    }

    private function messageFrom(User $sender, array $attributes = []): Message
    {
        return Message::factory()->create(array_merge([
            'conversation_id' => $this->conversation->id,
            'sender_id' => $sender->id,
        ], $attributes));
    }

    public function test_messages_list_shows_seen_at_null_when_unread(): void
    {
        $this->messageFrom($this->student);

        $response = $this->actingAs($this->landlord, 'sanctum')
            ->getJson("/api/conversations/{$this->conversation->id}/messages")
            ->assertOk();

        $first = $response->json('data.0');
        $this->assertArrayHasKey('seen_at', $first);
        $this->assertNull($first['seen_at']);
    }

    public function test_read_marks_seen_at_on_the_other_sides_messages(): void
    {
        $m1 = $this->messageFrom($this->student);
        $m2 = $this->messageFrom($this->student);

        $this->actingAs($this->landlord, 'sanctum')
            ->postJson("/api/conversations/{$this->conversation->id}/read")
            ->assertOk();

        $this->assertNotNull($m1->refresh()->seen_at);
        $this->assertNotNull($m2->refresh()->seen_at);
    }

    public function test_own_messages_are_not_marked_seen_by_own_read(): void
    {
        $own = $this->messageFrom($this->landlord);
        $incoming = $this->messageFrom($this->student);

        $this->actingAs($this->landlord, 'sanctum')
            ->postJson("/api/conversations/{$this->conversation->id}/read")
            ->assertOk();

        $this->assertNull($own->refresh()->seen_at, 'Reading must not stamp seen_at on your own messages.');
        $this->assertNotNull($incoming->refresh()->seen_at);
    }

    public function test_read_is_idempotent(): void
    {
        $this->messageFrom($this->student);

        $this->actingAs($this->landlord, 'sanctum')
            ->postJson("/api/conversations/{$this->conversation->id}/read")
            ->assertOk();

        $this->actingAs($this->landlord, 'sanctum')
            ->postJson("/api/conversations/{$this->conversation->id}/read")
            ->assertOk();
    }

    public function test_outsider_gets_404_on_read_and_list(): void
    {
        $outsider = User::factory()->student()->create();

        $this->actingAs($outsider, 'sanctum')
            ->postJson("/api/conversations/{$this->conversation->id}/read")
            ->assertNotFound();

        $this->actingAs($outsider, 'sanctum')
            ->getJson("/api/conversations/{$this->conversation->id}/messages")
            ->assertNotFound();
    }

    public function test_guest_gets_401(): void
    {
        $this->postJson("/api/conversations/{$this->conversation->id}/read")
            ->assertUnauthorized();
    }

    public function test_mark_read_dispatches_message_seen_broadcast_event(): void
    {
        $this->messageFrom($this->student);

        $this->actingAs($this->landlord, 'sanctum')
            ->postJson("/api/conversations/{$this->conversation->id}/read")
            ->assertOk();

        Event::assertDispatched(MessageSeen::class, function ($event) {
            return $event->conversation->id === $this->conversation->id
                && $event->reader->id === $this->landlord->id;
        });
    }
}
