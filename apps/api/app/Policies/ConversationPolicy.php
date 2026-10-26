<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;

/**
 * Conversation participation (API_CONTRACT §4 - "Nhắn tin": "Người ngoài
 * nhận 404"). MessageDeletionController / MessageReactionController use
 * canParticipate() to keep the 404 (not 403) semantics for outsiders -
 * existence must not leak. Replaces the duplicated inline checks.
 */
class ConversationPolicy
{
    /** Only the two participants may act inside a conversation. */
    public function participate(User $user, Conversation $conversation): bool
    {
        return $conversation->student_id === $user->id
            || $conversation->landlord_id === $user->id;
    }
}
