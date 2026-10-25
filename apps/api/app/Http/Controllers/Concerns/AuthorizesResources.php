<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Conversation;
use App\Models\Listing;
use App\Models\Message;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;

trait AuthorizesResources
{
    /**
     * Participant check - anyone else gets 404 (contract: "Người ngoài nhận 404"),
     * never 403 which would leak existence. Delegates to ConversationPolicy::participate.
     */
    protected function authorizeParticipant(Request $request, Conversation|Message $resource): void
    {
        if (! $request->user()?->can('participate', $resource)) {
            abort(404);
        }
    }

    /**
     * 403 with the standard message unless the current user owns the listing.
     * Delegates to ListingPolicy::manage.
     */
    protected function authorizeOwnership(Request $request, Listing $listing): void
    {
        if (! $request->user()?->can('manage', $listing)) {
            // Rendered as { message: "Bạn không có quyền..." } by the handler.
            throw new AuthorizationException;
        }
    }
}
