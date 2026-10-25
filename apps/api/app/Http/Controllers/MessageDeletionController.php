<?php

namespace App\Http\Controllers;

use App\Events\MessageDeleted;
use App\Models\Message;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Facebook-style message deletion (API_CONTRACT §4 extension):
 *  - Sender, chưa hết 1 giờ: DELETE với scope=unsent - "Thu hồi" cho cả
 *    hai phía, body bị thay bằng tombstone "Tin nhắn đã được thu hồi".
 *  - Bất kỳ participant nào: scope=self - ẩn tin với chính mình, bên kia
 *    vẫn thấy bình thường.
 */
class MessageDeletionController extends Controller
{
    /** Cửa sổ thu hồi của Messenger: 1 giờ sau khi gửi. */
    private const UNSEND_WINDOW_MINUTES = 60;

    public function destroy(Request $request, Message $message): JsonResponse
    {
        $this->authorizeParticipant($request, $message);

        $user = $request->user();

        $scope = $request->string('scope', 'self')->toString();

        if ($scope === 'unsent') {
            if (! $user->can('unsend', $message)) {
                return response()->json([
                    'message' => 'Chỉ người gửi mới thu hồi được tin nhắn.',
                ], 403);
            }
            if ($message->isUnsent()) {
                return response()->json(['data' => null]); // idempotent
            }
            if ($message->created_at->lt(now()->subMinutes(self::UNSEND_WINDOW_MINUTES))) {
                return response()->json([
                    'message' => 'Đã quá thời gian cho phép thu hồi tin nhắn.',
                ], 422);
            }

            // Transaction + SELECT ... FOR UPDATE: two racing "unsend" calls
            // (retry, other tab) must not double-broadcast. The row is
            // re-read under lock inside the transaction and the window is
            // re-checked on the FRESH row, so the loser sees isUnsent() and
            // short-circuits idempotently.
            $unsent = DB::transaction(function () use ($message): bool {
                $fresh = Message::query()
                    ->whereKey($message->getKey())
                    ->lockForUpdate()
                    ->first();
                if ($fresh->isUnsent()) {
                    return false;
                }
                $fresh->deleted_at = now();
                $fresh->deleted_for_user_ids = null;
                $fresh->save();

                return true;
            });

            if (! $unsent) {
                return response()->json(['data' => null]); // racing loser
            }

            rescue(fn () => broadcast(new MessageDeleted($message, true, [])), report: false);

            return response()->json(['data' => null]);
        }

        // scope=self: hidden only for this viewer; idempotent per user.
        // Re-read via fresh() so a concurrent delete-for-self from the same
        // user (double-tap) is not clobbered by a stale array.
        $hidden = $message->fresh()->deleted_for_user_ids ?? [];
        if (! in_array($user->id, $hidden, true)) {
            $hidden[] = $user->id;
            $message->deleted_for_user_ids = $hidden;
            $message->save();

            // Local effect only - other clients must not hide it, so the
            // payload marks the caller as the sole "deleted_for" recipient.
            rescue(fn () => broadcast(new MessageDeleted($message, false, [$user->id])), report: false);
        }

        return response()->json(['data' => null]);
    }
}
