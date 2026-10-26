<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

/**
 * Characterization tests for Facebook-style message deletion
 * (DELETE /api/messages/{message}?scope=unsent|self).
 *
 * These pin CURRENT behavior before refactoring (docs/reports/PLAN.md Phase 1):
 * unsend window, sender-only unsend, delete-for-me semantics, idempotency.
 */
class MessageDeletionTest extends TestCase
{
    use RefreshDatabase;

    private User $student;

    private User $landlord;

    private Conversation $conversation;

    protected function setUp(): void
    {
        parent::setUp();

        Event::fake(); // never contact Reverb from tests

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

    // ------------------------------------------------------------------
    // scope=unsent ("Thu hồi" - for everyone, sender only, 1h window)
    // ------------------------------------------------------------------

    public function test_sender_can_unsend_within_window(): void
    {
        $message = $this->messageFrom($this->student);

        $this->actingAs($this->student, 'sanctum')
            ->deleteJson("/api/messages/{$message->id}?scope=unsent")
            ->assertOk()
            ->assertJsonPath('data', null);

        $message->refresh();
        $this->assertNotNull($message->deleted_at);
        $this->assertTrue($message->isUnsent());
        // Unsend-for-everyone clears any per-user hides.
        $this->assertNull($message->deleted_for_user_ids);
    }

    public function test_unsend_outside_window_returns_422(): void
    {
        $message = $this->messageFrom($this->student, [
            'created_at' => now()->subHours(2),
        ]);

        $this->actingAs($this->student, 'sanctum')
            ->deleteJson("/api/messages/{$message->id}?scope=unsent")
            ->assertStatus(422)
            ->assertJsonPath('message', 'Đã quá thời gian cho phép thu hồi tin nhắn.');

        $this->assertFalse($message->refresh()->isUnsent());
    }

    public function test_only_sender_can_unsend(): void
    {
        $message = $this->messageFrom($this->student);

        // The other participant is NOT the sender -> 403.
        $this->actingAs($this->landlord, 'sanctum')
            ->deleteJson("/api/messages/{$message->id}?scope=unsent")
            ->assertStatus(403)
            ->assertJsonPath('message', 'Chỉ người gửi mới thu hồi được tin nhắn.');
    }

    public function test_unsend_is_idempotent(): void
    {
        $message = $this->messageFrom($this->student);

        $this->actingAs($this->student, 'sanctum')
            ->deleteJson("/api/messages/{$message->id}?scope=unsent")
            ->assertOk();

        // Second unsend within window: still 200, still unsent, no error.
        $this->actingAs($this->student, 'sanctum')
            ->deleteJson("/api/messages/{$message->id}?scope=unsent")
            ->assertOk()
            ->assertJsonPath('data', null);
    }

    // ------------------------------------------------------------------
    // scope=self (delete-for-me: hidden only for the caller)
    // ------------------------------------------------------------------

    public function test_participant_can_delete_for_self_only(): void
    {
        $message = $this->messageFrom($this->student);

        $this->actingAs($this->landlord, 'sanctum')
            ->deleteJson("/api/messages/{$message->id}?scope=self")
            ->assertOk()
            ->assertJsonPath('data', null);

        $message->refresh();
        $this->assertNull($message->deleted_at); // NOT unsent for everyone
        $this->assertTrue($message->isHiddenFor($this->landlord->id));
        $this->assertFalse($message->isHiddenFor($this->student->id));
    }

    public function test_delete_for_self_is_idempotent(): void
    {
        $message = $this->messageFrom($this->student);

        $this->actingAs($this->landlord, 'sanctum')
            ->deleteJson("/api/messages/{$message->id}?scope=self")
            ->assertOk();

        $this->actingAs($this->landlord, 'sanctum')
            ->deleteJson("/api/messages/{$message->id}?scope=self")
            ->assertOk();

        $message->refresh();
        $this->assertSame(
            [$this->landlord->id],
            $message->deleted_for_user_ids,
            'Repeat hide must not duplicate the user id in deleted_for_user_ids.'
        );
    }

    public function test_sender_can_delete_own_message_for_self(): void
    {
        $message = $this->messageFrom($this->student);

        $this->actingAs($this->student, 'sanctum')
            ->deleteJson("/api/messages/{$message->id}?scope=self")
            ->assertOk();

        $message->refresh();
        $this->assertNull($message->deleted_at);
        $this->assertTrue($message->isHiddenFor($this->student->id));
    }

    // ------------------------------------------------------------------
    // Authorization envelope
    // ------------------------------------------------------------------

    public function test_outsider_gets_404(): void
    {
        $message = $this->messageFrom($this->student);
        $outsider = User::factory()->student()->create();

        $this->actingAs($outsider, 'sanctum')
            ->deleteJson("/api/messages/{$message->id}?scope=self")
            ->assertNotFound();
    }

    public function test_guest_gets_401(): void
    {
        $message = $this->messageFrom($this->student);

        $this->deleteJson("/api/messages/{$message->id}?scope=self")
            ->assertUnauthorized();
    }

    public function test_default_scope_is_self(): void
    {
        $message = $this->messageFrom($this->student);

        // No scope param -> behaves as delete-for-me, not unsend.
        $this->actingAs($this->landlord, 'sanctum')
            ->deleteJson("/api/messages/{$message->id}")
            ->assertOk();

        $message->refresh();
        $this->assertNull($message->deleted_at);
        $this->assertTrue($message->isHiddenFor($this->landlord->id));
    }
}
