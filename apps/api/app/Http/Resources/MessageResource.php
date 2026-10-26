<?php

namespace App\Http\Resources;

use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\URL;

/**
 * Message object per API_CONTRACT §3. attachment_url is a temporary signed
 * URL (60 minutes) on the attachments route - opens directly in a browser
 * tab, no token needed. Both attachment fields are null without a file.
 */
class MessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var Message $message */
        $message = $this->resource;
        $viewer = $request->user();

        // Per-user deleted rows are filtered out by the controller; a tombstone
        // (unsent) still renders as "Tin nh\u00e3n \u0111\u00e3 \u0111\u01b0\u1ee3c thu h\u1ed3i" on every client.
        $isUnsent = $message->isUnsent();

        return [
            'id' => $message->id,
            'sender_id' => $message->sender_id,
            'is_mine' => $viewer ? $message->sender_id === $viewer->id : false,
            'is_unsent' => $isUnsent,
            'body' => $isUnsent ? null : $message->body,
            // Dấu đã xem: thời điểm NGƯỜI NHẬN đọc; null = chưa seen.
            'seen_at' => $message->seen_at?->toISOString(),
            // Messenger reactions: map { "userId": "emoji" }, rỗng = không có.
            'reactions' => $message->reactions ?? (object) [],
            'attachment_name' => $isUnsent ? null : $message->attachment_name,
            'attachment_url' => (! $isUnsent && $message->attachment_path) ? URL::temporarySignedRoute(
                'attachments.show',
                now()->addMinutes(60),
                ['message' => $message->id],
                false,
            ) : null,
            'created_at' => $message->created_at->toISOString(),
        ];
    }
}
