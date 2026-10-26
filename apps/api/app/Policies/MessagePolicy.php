<?php

namespace App\Policies;

use App\Models\Message;
use App\Models\User;

/**
 * Message-level authorization. participate() rides the conversation policy
 * (outsiders keep getting 404, per contract). unsend() encodes the
 * sender-only rule; the 1-hour window stays in the controller because the
 * error is a 422, not a 403.
 */
class MessagePolicy
{
    /** Only the two participants may act on messages in their conversation. */
    public function participate(User $user, Message $message): bool
    {
        $conversation = $message->conversation;

        if ($conversation === null) {
            return false;
        }

        return $conversation->student_id === $user->id
            || $conversation->landlord_id === $user->id;
    }

    /** Only the sender may unsend ("Thu hồi") their own message. */
    public function unsend(User $user, Message $message): bool
    {
        return $message->sender_id === $user->id;
    }
}
