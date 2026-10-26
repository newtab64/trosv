<?php

namespace App\Http\Resources;

use App\Models\Conversation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * Conversation object per API_CONTRACT §3: listing summary (id, title,
 * cover_image), other_user, last_message and unread_count for the viewer.
 */
class ConversationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var Conversation $conversation */
        $conversation = $this->resource;

        $viewer = $request->user();
        $viewerId = $viewer?->id;
        $other = ($viewerId !== null && $conversation->student_id === $viewerId)
            ? $conversation->landlord
            : $conversation->student;

        $cover = $conversation->listing?->coverImage->first();

        // Sidebar preview: skip rows this viewer deleted for themselves and
        // render the tombstone text for unsent messages.
        $last = $conversation->lastMessage;
        if ($last && $viewerId !== null && $last->isHiddenFor($viewerId)) {
            $last = $conversation->messages()
                ->where(fn ($q) => $q
                    ->whereNull('deleted_for_user_ids')
                    ->orWhereJsonDoesntContain('deleted_for_user_ids', $viewerId))
                ->orderByDesc('id')
                ->first();
        }

        return [
            'id' => $conversation->id,
            'listing' => $conversation->listing ? [
                'id' => $conversation->listing->id,
                'title' => $conversation->listing->title,
                'cover_image' => $cover ? Storage::disk('public')->url($cover->path) : null,
            ] : null,
            'other_user' => $other ? [
                'id' => $other->id,
                'name' => $other->name,
                'role' => $other->role, // student => link tới hồ sơ công khai
            ] : null,
            'last_message' => $last ? [
                'body' => $last->isUnsent() ? 'Tin nhắn đã được thu hồi' : $last->body,
                'created_at' => $last->created_at->toISOString(),
            ] : null,
            'unread_count' => (int) ($conversation->unread_count ?? 0),
        ];
    }
}
