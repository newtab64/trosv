<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\URL;

/**
 * A new chat message was created. One private channel per conversation,
 * both participants subscribe - this is the bubble-delivery path that
 * replaces the 5s polling of GET /conversations/{id}/messages.
 *
 * ShouldBroadcastNow (no queue): bubble latency must not depend on the
 * database queue worker running in the demo stack.
 */
class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Message $message) {}

    public function broadcastOn(): array
    {
        // Conversation channel: the open thread. Per-user channels: the
        // sidebar list + unread badge (Navbar) re-render without polling.
        $conversation = $this->message->conversation;

        return [
            new PrivateChannel('conversation.'.$this->message->conversation_id),
            new PrivateChannel('App.Models.User.'.$conversation->student_id),
            new PrivateChannel('App.Models.User.'.$conversation->landlord_id),
        ];
    }

    /** Client listens with .listen('.message.sent', ...) on the private channel. */
    public function broadcastAs(): string
    {
        return 'message.sent';
    }

    /**
     * `message` mirrors MessageResource (API_CONTRACT §3): same fields, same
     * tombstone nulling, reactions included. Two deliberate extensions, both
     * already consumed by the SPA:
     *  - conversation.last_message: sidebar preview (Messenger-style),
     *  - sender_id + is_mine omitted: payload is shared by both recipients,
     *    mine/not-mine is derived on the client from sender_id.
     * `seen_at` is always null on delivery - `.message.seen` flips it later.
     */
    public function broadcastWith(): array
    {
        $m = $this->message;
        $isUnsent = $m->isUnsent();

        return [
            'conversation_id' => $m->conversation_id,
            // Sidebar preview (Messenger): both parties receive this payload,
            // so last_message carries sender_id - each client derives
            // "Bạn: ..." prefix by comparing with its own user id.
            'conversation' => [
                'id' => $m->conversation_id,
                'last_message' => [
                    'sender_id' => $m->sender_id,
                    'body' => $m->body,
                    'attachment_name' => $m->attachment_name,
                    'created_at' => $m->created_at->toISOString(),
                ],
            ],
            'message' => [
                'id' => $m->id,
                'sender_id' => $m->sender_id,
                'is_unsent' => $isUnsent,
                'body' => $isUnsent ? null : $m->body,
                'seen_at' => null,
                // Map { "userId": "emoji" } - empty object when none,
                // identical to MessageResource.
                'reactions' => $m->reactions ?? (object) [],
                'attachment_name' => $isUnsent ? null : $m->attachment_name,
                'attachment_url' => (! $isUnsent && $m->attachment_path)
                    ? URL::temporarySignedRoute(
                        'attachments.show',
                        now()->addMinutes(60),
                        ['message' => $m->id],
                    )
                    : null,
                'created_at' => $m->created_at->toISOString(),
            ],
        ];
    }
}
