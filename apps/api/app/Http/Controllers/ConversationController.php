<?php

namespace App\Http\Controllers;

use App\Http\Requests\Messaging\ConversationStoreRequest;
use App\Http\Requests\Messaging\DirectMessageRequest;
use App\Http\Requests\Messaging\MessageListRequest;
use App\Http\Requests\Messaging\MessageSendRequest;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Listing;
use App\Models\User;
use App\Services\ConversationService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Messaging (API_CONTRACT §4 - "Nhắn tin"). One conversation per (student,
 * listing) pair. Outsiders receive 404, not 403. Conversations can also be
 * DIRECT (listing_id null) - started from a student's public profile.
 */
class ConversationController extends Controller
{
    public function __construct(
        protected ConversationService $conversationService
    ) {}

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

        [$conversation, $wasCreated] = $this->conversationService->findOrCreateConversation(
            $student->id,
            $listing->user_id,
            $listing->id
        );

        $this->conversationService->sendRoomLinkIfNecessary($conversation, $student, $listing);

        return $this->respondWithConversation($request, $conversation, $wasCreated);
    }

    /**
     * POST /api/users/{user}/message (Student) - get-or-create a DIRECT
     * conversation (listing_id null) with another student, from their
     * public profile. Targets that are landlords or yourself are 404.
     */
    public function storeDirect(DirectMessageRequest $request, User $user): JsonResponse
    {
        [$conversation, $wasCreated] = $this->conversationService->findOrCreateConversation(
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

        $message = $this->conversationService->sendMessage(
            $conversation,
            $request->user(),
            $request->validated(),
            $request->file('file')
        );

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

        $this->conversationService->markRead($conversation, $request->user());

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
