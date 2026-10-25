<?php

namespace App\Http\Controllers;

use App\Events\MessageReacted;
use App\Http\Requests\Messaging\ReactionUpdateRequest;
use App\Models\Message;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Messenger-style reactions: PUT để đặt/đổi emoji của mình trên một tin
 * (map { user_id: emoji }), DELETE để bỏ. Mỗi user MỘT reaction - gọi PUT
 * lần nữa với cùng emoji là bỏ (idempotent cho nút toggle). Mỗi handler
 * re-read reactions qua fresh() trước khi ghi: two nearly-simultaneous
 * reactions from DIFFERENT users (rare in a 1-1 chat, but the menu allows
 * it in group-like reuse) no longer overwrite each other.
 */
class MessageReactionController extends Controller
{
    public function update(ReactionUpdateRequest $request, Message $message): JsonResponse
    {
        $this->authorizeParticipant($request, $message);

        $user = $request->user();

        $validated = $request->validated();

        // fresh(): re-read the row so a reaction arriving milliseconds
        // earlier (double-tap on slow networks, other device) is never
        // clobbered by a stale in-memory reactions map.
        $fresh = $message->fresh();
        $reactions = $fresh->reactions ?? [];
        $mine = (string) $user->id;

        if (($reactions[$mine] ?? null) === $validated['emoji']) {
            unset($reactions[$mine]); // toggle: cùng emoji lần nữa = bỏ
        } else {
            $reactions[$mine] = $validated['emoji']; // đặt / đổi
        }

        $message->reactions = $reactions;
        $message->save();

        rescue(fn () => broadcast(new MessageReacted($message, $user->id)), report: false);

        return response()->json(['data' => ['reactions' => $reactions]]);
    }

    public function destroy(Request $request, Message $message): JsonResponse
    {
        $this->authorizeParticipant($request, $message);

        $user = $request->user();

        $fresh = $message->fresh();
        $reactions = $fresh->reactions ?? [];
        unset($reactions[(string) $user->id]);
        $message->reactions = $reactions;
        $message->save();

        rescue(fn () => broadcast(new MessageReacted($message, $user->id)), report: false);

        return response()->json(['data' => ['reactions' => $reactions]]);
    }
}
