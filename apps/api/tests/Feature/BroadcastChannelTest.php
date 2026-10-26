<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Channel authorization is the realtime security boundary: anyone holding a
 * valid token could otherwise subscribe to private conversations. These tests
 * exercise the REAL /broadcasting/auth endpoint (api group + auth:sanctum via
 * withBroadcasting in bootstrap/app.php) and the closures in channels.php.
 */
class BroadcastChannelTest extends TestCase
{
    use RefreshDatabase;

    private Conversation $conversation;

    protected function setUp(): void
    {
        parent::setUp();

        // phpunit.xml dat BROADCAST_CONNECTION=null (suite khong can Reverb
        // song) NHUNG NullBroadcaster chap nhan moi /broadcasting/auth ma
        // khong evaluate channel closure. Test nay kiem chung chinh ranh gioi
        // do, nen phai pin connection that: PusherBroadcaster::auth() chi
        // tinh signature local + chay closure, khong goi HTTP den server.
        config(['broadcasting.default' => 'reverb']);

        // routes/channels.php duoc include khi app boot voi driver null -
        // phai include lai de closure duoc bind vao driver reverb.
        require base_path('routes/channels.php');

        $this->conversation = Conversation::factory()->create([
            'student_id' => User::factory()->student()->create()->id,
            'landlord_id' => User::factory()->landlord()->create()->id,
        ]);
    }

    private function authChannel(User $user, string $channelName)
    {
        return $this->actingAs($user, 'sanctum')
            ->postJson('/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => $channelName,
            ]);
    }

    public function test_participants_can_subscribe_to_conversation_channel(): void
    {
        $channel = 'private-conversation.'.$this->conversation->id;

        $this->authChannel($this->conversation->student, $channel)->assertOk();
        $this->authChannel($this->conversation->landlord, $channel)->assertOk();
    }

    public function test_outsider_cannot_subscribe_to_conversation_channel(): void
    {
        $outsider = User::factory()->student()->create();

        $this->authChannel($outsider, 'private-conversation.'.$this->conversation->id)
            ->assertForbidden();
    }

    public function test_owner_can_subscribe_to_personal_user_channel(): void
    {
        $user = $this->conversation->student;

        $this->authChannel($user, 'private-App.Models.User.'.$user->id)
            ->assertOk();
    }

    public function test_user_cannot_subscribe_to_someone_elses_user_channel(): void
    {
        $outsider = User::factory()->student()->create();
        $victim = $this->conversation->student;

        $this->authChannel($outsider, 'private-App.Models.User.'.$victim->id)
            ->assertForbidden();
    }

    public function test_guest_gets_401_from_broadcasting_auth(): void
    {
        $this->postJson('/broadcasting/auth', [
            'socket_id' => '1234.5678',
            'channel_name' => 'private-conversation.'.$this->conversation->id,
        ])->assertUnauthorized();
    }
}
