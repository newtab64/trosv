<?php

namespace App\Http\Controllers;

use App\Events\MessageSeen;
use App\Events\MessageSent;
use App\Http\Requests\Messaging\ConversationStoreRequest;
use App\Http\Requests\Messaging\MessageListRequest;
use App\Http\Requests\Messaging\MessageSendRequest;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Listing;
use App\Models\Message;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Messaging (API_CONTRACT §4 - "Nhắn tin"). One conversation per (student,
 * listing) pair. Outsiders receive 404, not 403. Conversations can also be
 * DIRECT (listing_id null) - started from a student's public profile.
 */
class ConversationController extends Controller
{
    /**
     * POST /api/conversations (Student) - get-or-create single conversation per person.
     * Forward to existing conversation with landlord and automatically send room post link.
     */
    public function store(ConversationStoreRequest $request): JsonResponse
    {
        $validated = $request->validated();

        /** @var User $student */
        $student = $request->user();
        $listing = Listing::findOrFail($validated['listing_id']);

        // A student cannot start a conversation about their own listing
        if ($listing->user_id === $student->id) {
            throw new AuthorizationException;
        }

        [$conversation, $wasCreated] = $this->findOrCreateConversation(
            $student->id,
            $listing->user_id,
            $listing->id
        );

        // Automatically send a link to the room post to the landlord
        // unless already sent recently for this listing within 15 minutes.
        $roomPath = "/rooms/{$listing->id}";
        $recentlySent = $conversation->messages()
            ->where('sender_id', $student->id)
            ->where('body', 'like', "%{$roomPath}%")
            ->where('created_at', '>=', now()->subMinutes(15))
            ->exists();

        if (! $recentlySent) {
            $msg1 = $conversation->messages()->create([
                'sender_id' => $student->id,
                'body' => 'Chào bạn, mình quan tâm đến phòng trọ này:',
            ]);
            $msg2 = $conversation->messages()->create([
                'sender_id' => $student->id,
                'body' => $roomPath,
            ]);
            $conversation->touch();
            rescue(fn () => broadcast(new MessageSent($msg1->load(['sender:id', 'conversation']))), report: false);
            rescue(fn () => broadcast(new MessageSent($msg2->load(['sender:id', 'conversation']))), report: false);
        }

        return $this->respondWithConversation($request, $conversation, $wasCreated);
    }

    /**
     * POST /api/users/{user}/message (Student) - get-or-create a DIRECT
     * conversation (listing_id null) with another student, from their
     * public profile. Targets that are landlords or yourself are 404.
     */
    public function storeDirect(Request $request, User $user): JsonResponse
    {
        if ($user->role !== User::ROLE_STUDENT || $user->id === $request->user()->id) {
            return response()->json([
                'message' => 'Chỉ có thể nhắn tin cho sinh viên khác.',
            ], 404);
        }

        [$conversation, $wasCreated] = $this->findOrCreateConversation(
            $request->user()->id,
            $user->id,
            null
        );

        return $this->respondWithConversation($request, $conversation, $wasCreated);
    }

    /**
     * GET /api/conversations (User) - newest activity first, no pagination
     * (contract). unread_count counts messages from the OTHER user that are
     * not read yet. One query with correlated aggregates (no N+1).
     */
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $conversations = Conversation::query()
            ->whereIn('id', $user->studentConversations()->select('id')
                ->unionAll($user->landlordConversations()->select('id')))
            ->with(['listing.coverImage', 'student', 'landlord', 'lastMessage'])
            ->withCount(['messages as unread_count' => fn ($q) => $q
                ->where('sender_id', '!=', $user->id)
                ->whereNull('read_at'),
            ])
            ->orderByDesc('updated_at')
            ->get();

        return response()->json([
            'data' => ConversationResource::collection($conversations)->resolve($request),
        ]);
    }

    /**
     * GET /api/conversations/{id}/messages (Participant) - oldest first,
     * `after_id` returns only newer messages for cheap polling.
     */
    public function messages(MessageListRequest $request, Conversation $conversation): JsonResponse
    {
        $this->authorizeParticipant($request, $conversation);

        $validated = $request->validated();

        $query = $conversation->messages()
            ->with('sender:id')
            // Facebook "delete for me": hide rows the viewer removed.
            // JSON array cast: check membership without a LIKE on the raw
            // text (Postgres) - the ids are stored as ["4",...] or [4,...].
            ->where(fn ($q) => $q
                ->whereNull('deleted_for_user_ids')
                ->orWhereJsonDoesntContain('deleted_for_user_ids', $request->user()->id))
            ->orderBy('id')
            ->limit(500);

        if (isset($validated['after_id'])) {
            $query->where('id', '>', (int) $validated['after_id']);
        }

        $messages = $query->get();

        return response()->json([
            'data' => MessageResource::collection($messages)->resolve($request),
        ]);
    }

    /**
     * POST /api/conversations/{id}/messages (Participant) - JSON { body } or
     * multipart (body + file: pdf/jpg/png/docx, max 5 MB).
     */
    public function sendMessage(MessageSendRequest $request, Conversation $conversation): JsonResponse
    {
        $this->authorizeParticipant($request, $conversation);

        $isMultipart = $request->hasFile('file');

        $validated = $request->validated();

        $attachmentPath = null;
        $attachmentName = null;

        if ($isMultipart) {
            // Files are PRIVATE (local disk): served only through signed URLs.
            $uploaded = $request->file('file');
            $rawName = $uploaded->getClientOriginalName();
            // Sanitize against path traversal and HTTP header splitting (CRLF) in Content-Disposition
            $attachmentName = preg_replace('/[\r\n\x00-\x1F\x7F]/', '', basename($rawName)) ?: 'attachment';
            $attachmentPath = $uploaded->store("attachments/{$conversation->id}");
        }

        try {
            $message = $conversation->messages()->create([
                'sender_id' => $request->user()->id,
                'body' => $validated['body'] ?? '',
                'attachment_path' => $attachmentPath,
                'attachment_name' => $attachmentName,
            ]);
        } catch (Throwable $e) {
            // No orphaned upload on disk if the INSERT fails after the file
            // was already stored (MessageSent broadcasts outside the try,
            // exactly once, only after a committed row).
            if ($attachmentPath !== null) {
                Storage::disk('local')->delete($attachmentPath);
            }

            throw $e;
        }

        // Touch so GET /conversations sorts by latest activity.
        $conversation->touch();

        // Realtime bubble delivery over Reverb (replaces 5s client polling).
        // Message shape mirrors MessageResource/contract §3 (body/reactions
        // match MessageResource exactly; seen_at starts null).
        rescue(fn () => broadcast(new MessageSent($message->load(['sender:id', 'conversation']))), report: false);

        return response()->json([
            'data' => (new MessageResource($message->load('sender:id')))->resolve($request),
        ], 201);
    }

    /**
     * POST /api/conversations/{id}/read (Participant) - mark the OTHER
     * user's messages as read, return null data.
     */
    public function markRead(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorizeParticipant($request, $conversation);

        $now = now();

        Message::where('conversation_id', $conversation->id)
            ->where('sender_id', '!=', $request->user()->id)
            ->whereNull('read_at')
            ->update([
                'read_at' => $now,
                // Dấu đã xem: thời điểm NGƯỜI NHẬN mở thread.
                'seen_at' => $now,
            ]);

        // Sender hiển thị "Đã xem" ngay khi receiver mở thread.
        rescue(
            fn () => broadcast(new MessageSeen($conversation, $request->user(), $now->toISOString())),
            report: false
        );

        return response()->json(['data' => null]);
    }

    /**
     * Participant check - anyone else gets 404 (contract: "Người ngoài
     * nhận 404"), never 403 which would leak existence. Delegates to
     * ConversationPolicy::participate.
     */
    private function authorizeParticipant(Request $request, Conversation $conversation): void
    {
        if (! $request->user()->can('participate', $conversation)) {
            abort(404);
        }
    }

    /**
     * Get or create a 1-on-1 conversation between two users.
     *
     * @return array{0: Conversation, 1: bool}
     */
    private function findOrCreateConversation(int $userAId, int $userBId, ?int $listingId = null): array
    {
        $conversation = Conversation::where(function ($q) use ($userAId, $userBId) {
            $q->where('student_id', $userAId)->where('landlord_id', $userBId);
        })->orWhere(function ($q) use ($userAId, $userBId) {
            $q->where('student_id', $userBId)->where('landlord_id', $userAId);
        })->first();

        if (! $conversation) {
            $conversation = Conversation::create([
                'student_id' => $userAId,
                'landlord_id' => $userBId,
                'listing_id' => $listingId,
            ]);

            return [$conversation, true];
        }

        if ($listingId !== null && $conversation->listing_id !== $listingId) {
            $conversation->update(['listing_id' => $listingId]);
        }

        return [$conversation, false];
    }

    /**
     * Formats conversation with fresh relationships according to the API contract.
     */
    private function respondWithConversation(
        Request $request,
        Conversation $conversation,
        bool $wasCreated = false
    ): JsonResponse {
        return response()->json([
            'data' => (new ConversationResource(
                $conversation->fresh(['listing.coverImage', 'student', 'landlord', 'lastMessage'])
            ))->resolve($request),
        ], $wasCreated ? 201 : 200);
    }
}
