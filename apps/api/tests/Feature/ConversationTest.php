<?php

namespace Tests\Feature;

use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\Listing;
use App\Models\Message;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ConversationTest extends TestCase
{
    use RefreshDatabase;

    private User $student;

    private User $landlord;

    private Listing $listing;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = User::factory()->student()->create();
        $this->landlord = User::factory()->landlord()->create();
        $this->listing = Listing::factory()->create(['user_id' => $this->landlord->id]);
        Storage::fake('local');
    }

    private function createConversation(): Conversation
    {
        return Conversation::factory()->create([
            'listing_id' => $this->listing->id,
            'student_id' => $this->student->id,
            'landlord_id' => $this->landlord->id,
        ]);
    }

    // ------------------------------------------------------------------
    // POST /users/{id}/message - direct student-to-student conversation
    // ------------------------------------------------------------------

    public function test_student_starts_direct_conversation_with_another_student(): void
    {
        $other = User::factory()->student()->create();

        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/users/{$other->id}/message")
            ->assertStatus(201)
            ->assertJsonPath('data.listing', null)
            ->assertJsonPath('data.other_user.id', $other->id);

        $this->assertDatabaseHas('conversations', [
            'listing_id' => null,
            'student_id' => $this->student->id,
            'landlord_id' => $other->id,
        ]);

        // Get-or-create: calling again returns the same conversation (200).
        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/users/{$other->id}/message")
            ->assertOk()
            ->assertJsonPath('data.other_user.id', $other->id);
    }

    public function test_direct_conversation_rejects_landlord_and_self(): void
    {
        // Guest - unauthenticated (must run before any actingAs in this test).
        $guest = User::factory()->student()->create();
        $this->postJson("/api/users/{$guest->id}/message")
            ->assertUnauthorized();

        // Landlord target - 404 like the public profile.
        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/users/{$this->landlord->id}/message")
            ->assertNotFound();

        // Self - 404.
        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/users/{$this->student->id}/message")
            ->assertNotFound();

        // Landlord requester - role middleware 403.
        $other = User::factory()->student()->create();
        $this->actingAs($this->landlord, 'sanctum')
            ->postJson("/api/users/{$other->id}/message")
            ->assertForbidden();
    }

    public function test_direct_conversation_supports_messages_and_read(): void
    {
        $other = User::factory()->student()->create();

        $conversationId = $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/users/{$other->id}/message")
            ->json('data.id');

        // Sender sends, then the other side sees it unread.
        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/conversations/{$conversationId}/messages", ['body' => 'Chào bạn!'])
            ->assertStatus(201);

        $this->actingAs($other, 'sanctum')
            ->getJson('/api/conversations')
            ->assertOk()
            ->assertJsonPath('data.0.other_user.id', $this->student->id)
            ->assertJsonPath('data.0.unread_count', 1);

        // And both can chat + mark read like any conversation.
        $this->actingAs($other, 'sanctum')
            ->postJson("/api/conversations/{$conversationId}/messages", ['body' => 'Chào!'])
            ->assertStatus(201);
        $this->actingAs($other, 'sanctum')
            ->postJson("/api/conversations/{$conversationId}/read")
            ->assertOk();
    }

    // ------------------------------------------------------------------
    // POST /conversations - get-or-create
    // ------------------------------------------------------------------

    public function test_student_creates_conversation_for_listing(): void
    {
        $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/conversations', ['listing_id' => $this->listing->id])
            ->assertStatus(201)
            ->assertJsonPath('data.listing.id', $this->listing->id)
            ->assertJsonPath('data.other_user.id', $this->landlord->id)
            ->assertJsonPath('data.unread_count', 0)
            ->assertJsonPath('data.last_message.body', "/rooms/{$this->listing->id}");

        $this->assertDatabaseHas('conversations', [
            'listing_id' => $this->listing->id,
            'student_id' => $this->student->id,
            'landlord_id' => $this->landlord->id,
        ]);
    }

    public function test_creating_twice_returns_same_conversation(): void
    {
        $firstId = $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/conversations', ['listing_id' => $this->listing->id])
            ->assertStatus(201)
            ->json('data.id');

        $secondId = $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/conversations', ['listing_id' => $this->listing->id])
            ->assertStatus(200)
            ->json('data.id');

        $this->assertSame($firstId, $secondId);
        $this->assertDatabaseCount('conversations', 1);
    }

    public function test_conversation_creation_deduplicates_automatic_messages_within_fifteen_minutes(): void
    {
        $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/conversations', ['listing_id' => $this->listing->id])
            ->assertStatus(201);

        $this->assertDatabaseCount('messages', 2);

        $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/conversations', ['listing_id' => $this->listing->id])
            ->assertStatus(200);

        $this->assertDatabaseCount('messages', 2);
    }

    public function test_student_cannot_start_conversation_on_own_listing(): void
    {
        $ownListing = Listing::factory()->create(['user_id' => $this->student->id]);

        $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/conversations', ['listing_id' => $ownListing->id])
            ->assertStatus(403);
    }

    public function test_unknown_listing_id_returns_422(): void
    {
        $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/conversations', ['listing_id' => 99999])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['listing_id']);
    }

    // ------------------------------------------------------------------
    // GET /conversations - newest activity first, unread counts
    // ------------------------------------------------------------------

    public function test_list_shows_unread_count_and_last_message(): void
    {
        $conv = $this->createConversation();

        Message::factory()->count(2)->create([
            'conversation_id' => $conv->id,
            'sender_id' => $this->landlord->id,
            'body' => 'Phòng còn không?',
        ]);
        Message::factory()->create([
            'conversation_id' => $conv->id,
            'sender_id' => $this->student->id,
            'body' => 'Cho mình hỏi chút',
        ]);

        $this->actingAs($this->landlord, 'sanctum')
            ->getJson('/api/conversations')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $conv->id)
            // Unread from the LANDLORD's perspective: the student's message.
            ->assertJsonPath('data.0.unread_count', 1)
            ->assertJsonPath('data.0.other_user.id', $this->student->id)
            ->assertJsonPath('data.0.last_message.body', 'Cho mình hỏi chút');
    }

    public function test_list_orders_by_latest_activity(): void
    {
        $older = $this->createConversation();
        $otherStudent = User::factory()->create(['role' => User::ROLE_STUDENT]);
        $newer = Conversation::factory()->create([
            'listing_id' => Listing::factory()->create(['user_id' => $this->landlord->id])->id,
            'student_id' => $otherStudent->id,
            'landlord_id' => $this->landlord->id,
        ]);

        // Older conversation gets the most recent message AFTER the other
        // was touched, so it must come first (activity, not creation order).
        $newer->touch();
        Message::factory()->create([
            'conversation_id' => $older->id,
            'sender_id' => $this->student->id,
        ]);

        $this->actingAs($this->landlord, 'sanctum')
            ->getJson('/api/conversations')
            ->assertOk()
            ->assertJsonPath('data.0.id', $older->id)
            ->assertJsonPath('data.1.id', $newer->id);
    }

    public function test_list_empty_for_user_without_conversations(): void
    {
        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/conversations')
            ->assertOk()
            ->assertExactJson(['data' => []]);
    }

    // ------------------------------------------------------------------
    // Messages: send JSON, poll with after_id
    // ------------------------------------------------------------------

    public function test_send_message_and_poll_with_after_id(): void
    {
        $conv = $this->createConversation();

        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/conversations/{$conv->id}/messages", ['body' => 'Phòng còn trống không ạ?'])
            ->assertStatus(201)
            ->assertJsonPath('data.body', 'Phòng còn trống không ạ?')
            ->assertJsonPath('data.is_mine', true)
            ->assertJsonPath('data.attachment_name', null)
            ->assertJsonPath('data.attachment_url', null);

        $firstId = Message::query()->where('conversation_id', $conv->id)->value('id');

        // Landlord sees it oldest-first, is_mine false.
        $landlordView = $this->actingAs($this->landlord, 'sanctum')
            ->getJson("/api/conversations/{$conv->id}/messages")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->assertFalse($landlordView->json('data.0.is_mine'));
        $this->assertSame($this->student->id, $landlordView->json('data.0.sender_id'));

        // after_id filters out everything up to and including that message.
        Message::factory()->create([
            'conversation_id' => $conv->id,
            'sender_id' => $this->landlord->id,
            'body' => 'Còn, bạn đến xem nhé',
        ]);

        $this->actingAs($this->landlord, 'sanctum')
            ->getJson("/api/conversations/{$conv->id}/messages?after_id={$firstId}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.body', 'Còn, bạn đến xem nhé');
    }

    public function test_message_body_over_1000_chars_rejected(): void
    {
        $conv = $this->createConversation();

        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/conversations/{$conv->id}/messages", ['body' => str_repeat('a', 1001)])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['body']);
    }

    public function test_after_id_must_be_numeric(): void
    {
        $conv = $this->createConversation();

        // Non-numeric after_id must 422 (project convention), not silently
        // cast to 0 and return the whole history.
        $this->actingAs($this->student, 'sanctum')
            ->getJson("/api/conversations/{$conv->id}/messages?after_id=abc")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['after_id']);
    }

    // ------------------------------------------------------------------
    // Phase 3 - race safety + contract-shape regressions
    // ------------------------------------------------------------------

    public function test_direct_conversation_double_post_returns_same_conversation(): void
    {
        $other = User::factory()->student()->create();

        $first = $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/users/{$other->id}/message")
            ->assertStatus(201);

        // Double-POST (double-submit on the profile page): the SAME
        // conversation comes back with 200 and exactly ONE row exists.
        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/users/{$other->id}/message")
            ->assertStatus(200)
            ->assertJsonPath('data.id', $first->json('data.id'));

        $count = DB::table('conversations')
            ->where('student_id', $this->student->id)
            ->where('landlord_id', $other->id)
            ->whereNull('listing_id')
            ->count();
        $this->assertSame(1, $count);
    }

    public function test_direct_conversations_have_database_uniqueness(): void
    {
        // Postgres NULLs skip ordinary unique indexes - the partial
        // expression index (conversations_direct_unique) is what makes
        // direct conversations race-safe. Raw inserts bypass Eloquent to
        // prove the DATABASE enforces it, not just the controller.
        $other = User::factory()->student()->create();

        DB::table('conversations')->insert([
            'student_id' => $this->student->id,
            'landlord_id' => $other->id,
            'listing_id' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->expectException(UniqueConstraintViolationException::class);

        DB::table('conversations')->insert([
            'student_id' => $this->student->id,
            'landlord_id' => $other->id,
            'listing_id' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_send_message_dispatches_message_sent_broadcast_event(): void
    {
        Event::fake([MessageSent::class]);

        $conv = $this->createConversation();

        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/conversations/{$conv->id}/messages", [
                'body' => 'Xin chào Reverb!',
            ])
            ->assertStatus(201);

        Event::assertDispatched(MessageSent::class, function ($event) use ($conv) {
            return $event->message->conversation_id === $conv->id
                && $event->message->body === 'Xin chào Reverb!';
        });
    }

    public function test_message_sent_event_matches_message_resource_shape(): void
    {
        // The realtime payload must mirror MessageResource (contract §3):
        // assert the event's broadcastWith() directly (the send path and
        // broadcast plumbing are covered by the POST tests).
        $conv = $this->createConversation();
        $message = Message::factory()->create([
            'conversation_id' => $conv->id,
            'sender_id' => $this->student->id,
            'body' => 'xin chao',
        ]);

        $payload = (new MessageSent($message->load('sender:id')))->broadcastWith()['message'];

        // All §3 keys present (reactions was missing before Phase 3).
        foreach (['id', 'sender_id', 'is_unsent', 'body', 'seen_at', 'reactions', 'attachment_name', 'attachment_url', 'created_at'] as $key) {
            $this->assertArrayHasKey($key, $payload, "missing key: {$key}");
        }

        $this->assertSame('xin chao', $payload['body']);
        $this->assertFalse($payload['is_unsent']);
        // Empty reactions encode as {} (object), matching MessageResource.
        $this->assertSame('{}', json_encode($payload['reactions']));
        $this->assertNull($payload['seen_at']);
    }

    public function test_message_sent_event_nulls_tombstone_fields(): void
    {
        // Unsent (thu hồi) message: body/attachment must be null in the
        // realtime payload exactly like MessageResource renders it.
        $conv = $this->createConversation();
        $message = Message::factory()->create([
            'conversation_id' => $conv->id,
            'sender_id' => $this->student->id,
            'body' => 'se bi thu hoi',
            'deleted_at' => now(),
        ]);

        $payload = (new MessageSent($message->load('sender:id')))->broadcastWith()['message'];

        $this->assertTrue($payload['is_unsent']);
        $this->assertNull($payload['body']);
        $this->assertNull($payload['attachment_name']);
        $this->assertNull($payload['attachment_url']);
    }

    // ------------------------------------------------------------------
    // Attachments: multipart upload + signed URL
    // ------------------------------------------------------------------

    public function test_attachment_upload_and_signed_url_download(): void
    {
        $conv = $this->createConversation();

        $response = $this->actingAs($this->landlord, 'sanctum')
            ->post("/api/conversations/{$conv->id}/messages", [
                'body' => 'Gửi bạn hợp đồng',
                'file' => UploadedFile::fake()->create('hop-dong.pdf', 100, 'application/pdf'),
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.attachment_name', 'hop-dong.pdf');

        $url = $response->json('data.attachment_url');
        $this->assertNotNull($url);

        // File stored on the private local disk.
        $relativePath = Message::where('conversation_id', $conv->id)->value('attachment_path');
        $this->assertNotNull($relativePath);
        Storage::disk('local')->assertExists($relativePath);

        // Signed URL opens in a browser without any token, inline with the
        // correct content type (contract: "Mở thẳng trong tab trình duyệt").
        $this->get($url)
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_attachment_signed_url_stops_working_after_unsend(): void
    {
        // F1 (security-audit run 1): the signed URL stays valid for up to 60
        // minutes by design, so the sink itself must refuse unsent messages -
        // a receiver's already-rendered tab must not keep a working direct
        // download after the sender "thu hồi" for everyone.
        $conv = $this->createConversation();

        $response = $this->actingAs($this->landlord, 'sanctum')
            ->post("/api/conversations/{$conv->id}/messages", [
                'body' => 'Gửi bạn hợp đồng',
                'file' => UploadedFile::fake()->create('hop-dong.pdf', 100, 'application/pdf'),
            ])
            ->assertStatus(201);

        $url = $response->json('data.attachment_url');
        $messageId = $response->json('data.id');

        // Positive control: the very same URL downloads before the unsend.
        $this->get($url)->assertOk();

        // Sender unsends for everyone (within the 1-hour window).
        $this->actingAs($this->landlord, 'sanctum')
            ->deleteJson("/api/messages/{$messageId}?scope=unsent")
            ->assertOk();

        // The still-cryptographically-valid URL is dead immediately.
        $this->get($url)->assertNotFound();
    }

    public function test_attachment_wrong_type_rejected(): void
    {
        $conv = $this->createConversation();

        $this->actingAs($this->student, 'sanctum')
            ->post("/api/conversations/{$conv->id}/messages", [
                'body' => 'file',
                'file' => UploadedFile::fake()->create('malware.exe', 10),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_attachment_over_5mb_rejected(): void
    {
        $conv = $this->createConversation();

        $this->actingAs($this->student, 'sanctum')
            ->post("/api/conversations/{$conv->id}/messages", [
                'file' => UploadedFile::fake()->create('big.pdf', 5121, 'application/pdf'),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_signed_url_is_tamper_proof(): void
    {
        $conv = $this->createConversation();
        $message = Message::factory()->create([
            'conversation_id' => $conv->id,
            'sender_id' => $this->student->id,
            'attachment_path' => 'attachments/1/fake.pdf',
            'attachment_name' => 'fake.pdf',
        ]);

        // Tampered signature must be rejected even though the message exists.
        $this->get("/attachments/{$message->id}?signature=invalid&expires=".now()->addHour()->getTimestamp())
            ->assertStatus(403);
    }

    // ------------------------------------------------------------------
    // POST /read - mark the other side's messages read
    // ------------------------------------------------------------------

    public function test_read_receipt_marks_only_other_users_messages(): void
    {
        $conv = $this->createConversation();

        $fromLandlord = Message::factory()->create([
            'conversation_id' => $conv->id, 'sender_id' => $this->landlord->id,
        ]);
        $fromStudent = Message::factory()->create([
            'conversation_id' => $conv->id, 'sender_id' => $this->student->id,
        ]);

        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/conversations/{$conv->id}/read")
            ->assertOk()
            ->assertExactJson(['data' => null]);

        $this->assertNotNull($fromLandlord->refresh()->read_at);
        $this->assertNull($fromStudent->refresh()->read_at);

        // unread_count drops to 0 for the student afterwards.
        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/conversations')
            ->assertOk()
            ->assertJsonPath('data.0.unread_count', 0);
    }

    // ------------------------------------------------------------------
    // Isolation: outsiders 404, guests 401, roles
    // ------------------------------------------------------------------

    public function test_outsider_gets_404_not_403(): void
    {
        $conv = $this->createConversation();
        $outsider = User::factory()->student()->create();

        $this->actingAs($outsider, 'sanctum')
            ->getJson("/api/conversations/{$conv->id}/messages")->assertStatus(404);

        $this->actingAs($outsider, 'sanctum')
            ->postJson("/api/conversations/{$conv->id}/messages", ['body' => 'hack'])->assertStatus(404);

        $this->actingAs($outsider, 'sanctum')
            ->postJson("/api/conversations/{$conv->id}/read")->assertStatus(404);
    }

    public function test_guest_gets_401_on_all_conversation_endpoints(): void
    {
        $conv = $this->createConversation();

        $this->postJson('/api/conversations', ['listing_id' => $this->listing->id])->assertStatus(401);
        $this->getJson('/api/conversations')->assertStatus(401);
        $this->getJson("/api/conversations/{$conv->id}/messages")->assertStatus(401);
        $this->postJson("/api/conversations/{$conv->id}/messages", ['body' => 'x'])->assertStatus(401);
        $this->postJson("/api/conversations/{$conv->id}/read")->assertStatus(401);
    }
}
