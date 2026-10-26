<?php

namespace App\Http\Controllers;

use App\Http\Resources\ListingSummaryResource;
use App\Models\Listing;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Student favorites (API_CONTRACT §4 - "Yêu thích (sinh viên)").
 */
class FavoriteController extends Controller
{
    /**
     * GET /api/favorites - paginated, most recently saved first,
     * is_favorited always true.
     */
    public function index(Request $request): JsonResponse
    {
        $page = $request->user()
            ->favorites()
            ->with(['ward.city', 'coverImage'])
            ->withCount('reviews')
            ->withAvg('reviews', 'listing_rating')
            ->orderByDesc('favorites.created_at')
            ->orderByDesc('favorites.listing_id')
            ->paginate($this->perPage($request));

        // Every row in this list is favorited by definition.
        $request->attributes->set(
            'favorited_listing_ids',
            $page->getCollection()->modelKeys(),
        );

        return $this->paginated($page, ListingSummaryResource::class, $request);
    }

    /**
     * PUT /api/favorites/{listing_id} - add safely (idempotent).
     */
    public function attach(Request $request, int $listingId): JsonResponse
    {
        $listing = Listing::find($listingId);

        if (! $listing) {
            abort(404);
        }

        // syncWithoutDetaching: calling twice never errors nor duplicates.
        $request->user()->favorites()->syncWithoutDetaching([$listing->id]);

        return response()->json(['data' => ['is_favorited' => true]]);
    }

    /**
     * DELETE /api/favorites/{listing_id} - remove safely (idempotent).
     */
    public function detach(Request $request, int $listingId): JsonResponse
    {
        $listing = Listing::find($listingId);

        if (! $listing) {
            abort(404);
        }

        // Detaching a non-favorited listing is still a success.
        $request->user()->favorites()->detach([$listing->id]);

        return response()->json(['data' => ['is_favorited' => false]]);
    }
}
