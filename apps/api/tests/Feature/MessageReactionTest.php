<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

/**
 * Characterization tests for Messenger-style reactions
 * (PUT/DELETE /api/messages/{message}/reactions).
 *
 * Pins CURRENT behavior before refactoring: emoji allow-list, one reaction
 * per user, toggle semantics, idempotent DELETE, 404 envelope.
 */
class MessageReactionTest extends TestCase
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

    private function messageFrom(User $sender): Message
    {
        return Message::factory()->create([
            'conversation_id' => $this->conversation->id,
            'sender_id' => $sender->id,
        ]);
    }

    public function test_participant_can_react(): void
    {
        $message = $this->messageFrom($this->student);

        $this->actingAs($this->landlord, 'sanctum')
            ->putJson("/api/messages/{$message->id}/reactions", ['emoji' => '👍'])
            ->assertOk()
            ->assertJsonPath('data.reactions.'.$this->landlord->id, '👍');

        $this->assertSame(
            ['👍'],
            array_values($message->refresh()->reactions)
        );
    }

    public function test_emoji_outside_allowlist_returns_422(): void
    {
        $message = $this->messageFrom($this->student);

        $this->actingAs($this->student, 'sanctum')
            ->putJson("/api/messages/{$message->id}/reactions", ['emoji' => '🎉'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Emoji không nằm trong bộ cho phép.');

        $this->assertNull($message->refresh()->reactions);
    }

    public function test_same_emoji_again_removes_reaction_toggle(): void
    {
        $message = $this->messageFrom($this->student);

        $this->actingAs($this->student, 'sanctum')
            ->putJson("/api/messages/{$message->id}/reactions", ['emoji' => '❤️'])
            ->assertOk();

        $this->actingAs($this->student, 'sanctum')
            ->putJson("/api/messages/{$message->id}/reactions", ['emoji' => '❤️'])
            ->assertOk()
            ->assertJsonPath('data.reactions', []);

        $this->assertSame([], $message->refresh()->reactions ?? []);
    }

    public function test_second_user_reaction_replaces_first_of_same_user_only(): void
    {
        $message = $this->messageFrom($this->student);

        $this->actingAs($this->student, 'sanctum')
            ->putJson("/api/messages/{$message->id}/reactions", ['emoji' => '👍'])
            ->assertOk();

        // Same user switches emoji: replaces, does not add a second entry.
        $this->actingAs($this->student, 'sanctum')
            ->putJson("/api/messages/{$message->id}/reactions", ['emoji' => '😂'])
            ->assertOk();

        $reactions = $message->refresh()->reactions;
        $this->assertSame(['😂'], array_values($reactions));
        $this->assertCount(1, $reactions);

        // The other participant can have their own reaction alongside.
        $this->actingAs($this->landlord, 'sanctum')
            ->putJson("/api/messages/{$message->id}/reactions", ['emoji' => '😮'])
            ->assertOk();

        $this->assertCount(2, $message->refresh()->reactions);
    }

    public function test_delete_removes_only_own_reaction(): void
    {
        $message = $this->messageFrom($this->student);

        $this->actingAs($this->student, 'sanctum')
            ->putJson("/api/messages/{$message->id}/reactions", ['emoji' => '👍'])
            ->assertOk();
        $this->actingAs($this->landlord, 'sanctum')
            ->putJson("/api/messages/{$message->id}/reactions", ['emoji' => '😢'])
            ->assertOk();

        $this->actingAs($this->student, 'sanctum')
            ->deleteJson("/api/messages/{$message->id}/reactions")
            ->assertOk()
            ->assertJsonPath('data.reactions.'.$this->landlord->id, '😢');

        $reactions = $message->refresh()->reactions;
        $this->assertArrayNotHasKey((string) $this->student->id, $reactions);
        $this->assertCount(1, $reactions);
    }

    public function test_delete_reaction_is_idempotent(): void
    {
        $message = $this->messageFrom($this->student);

        $this->actingAs($this->student, 'sanctum')
            ->deleteJson("/api/messages/{$message->id}/reactions")
            ->assertOk()
            ->assertJsonPath('data.reactions', []);

        $this->actingAs($this->student, 'sanctum')
            ->deleteJson("/api/messages/{$message->id}/reactions")
            ->assertOk();
    }

    public function test_reaction_missing_emoji_returns_422(): void
    {
        $message = $this->messageFrom($this->student);

        $this->actingAs($this->student, 'sanctum')
            ->putJson("/api/messages/{$message->id}/reactions", [])
            ->assertStatus(422);
    }

    public function test_outsider_gets_404(): void
    {
        $message = $this->messageFrom($this->student);
        $outsider = User::factory()->student()->create();

        $this->actingAs($outsider, 'sanctum')
            ->putJson("/api/messages/{$message->id}/reactions", ['emoji' => '👍'])
            ->assertNotFound();

        $this->actingAs($outsider, 'sanctum')
            ->deleteJson("/api/messages/{$message->id}/reactions")
            ->assertNotFound();
    }

    public function test_guest_gets_401(): void
    {
        $message = $this->messageFrom($this->student);

        $this->putJson("/api/messages/{$message->id}/reactions", ['emoji' => '👍'])
            ->assertUnauthorized();
    }
}
