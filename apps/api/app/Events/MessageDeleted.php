<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * A participant deleted a message (unsend-for-everyone or delete-for-me).
 * Both private per-user channels (each participant's sidebar re-renders the
 * preview/unread badge) AND the conversation channel (the open thread drops
 * or updates the bubble) receive the event. Payload carries the per-recipient
 * effect so no client can infer another user's private deletions:
 *   - removed: true  -> unsend for everyone ("Tin nhắn đã được thu hồi")
 *   - removed: false -> deleted only for SOME participants; clients compare
 *     deleted_for (their own id inside = hide locally).
 */
class MessageDeleted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  array<int, int>  $deletedFor  User ids that hide the message
     */
    public function __construct(
        public Message $message,
        public bool $removed,
        public array $deletedFor,
    ) {}

    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('conversation.'.$this->message->conversation_id),
            new PrivateChannel('App.Models.User.'.$this->message->conversation->student_id),
            new PrivateChannel('App.Models.User.'.$this->message->conversation->landlord_id),
        ];

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'message.deleted';
    }

    public function broadcastWith(): array
    {
        return [
            'conversation_id' => $this->message->conversation_id,
            'message_id' => $this->message->id,
            'sender_id' => $this->message->sender_id,
            'removed' => $this->removed,
            'deleted_for' => $this->deletedFor,
            'conversation' => [
                'id' => $this->message->conversation_id,
                'last_message' => $this->message->isUnsent()
                    ? ['body' => 'Tin nhắn đã được thu hồi', 'created_at' => $this->message->created_at->toISOString()]
                    : null,
            ],
        ];
    }
}
