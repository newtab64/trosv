<?php

namespace App\Http\Controllers;

use App\Http\Requests\Listing\ListingBrowseRequest;
use App\Http\Resources\ListingDetailResource;
use App\Http\Resources\ListingSummaryResource;
use App\Models\Listing;
use App\Models\User;
use App\Services\ListingFilterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public listing browse (API_CONTRACT §4 - "Duyệt tin đăng").
 */
class ListingController extends Controller
{
    public const PER_PAGE_DEFAULT = 12;

    public const PER_PAGE_MAX = 50;

    public function index(ListingBrowseRequest $request, ListingFilterService $filterService): JsonResponse
    {
        $validated = $request->validated();

        // Validation (422 with Vietnamese messages, per API_CONTRACT §1)
        // lives in ListingBrowseRequest.

        // max_km and sort=distance require school_id.
        if (
            (isset($validated['max_km']) || ($validated['sort'] ?? null) === 'distance')
            && empty($validated['school_id'])
        ) {
            return response()->json([
                'message' => 'Cần cung cấp school_id khi dùng max_km hoặc sort=distance.',
                'errors' => ['school_id' => ['Cần cung cấp school_id khi dùng max_km hoặc sort=distance.']],
            ], 422);
        }

        $perPage = $validated['per_page'] ?? self::PER_PAGE_DEFAULT;

        $query = $filterService->buildQuery($validated);
        $page = $query->paginate($perPage);

        $favoritedIds = $this->favoritedListingIds($request, $page->getCollection());
        $request->attributes->set('favorited_listing_ids', $favoritedIds);

        return response()->json([
            'data' => ListingSummaryResource::collection($page->getCollection())->resolve($request),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => (int) $perPage,
                'total' => $page->total(),
            ],
        ]);
    }

    /**
     * Ids of listings on this page favorited by the current (student) user -
     * exactly ONE query. Guests and landlords get an empty set.
     */
    private function favoritedListingIds(Request $request, $listings): array
    {
        $user = $request->user('sanctum');

        if (! $user || $user->role !== User::ROLE_STUDENT || $listings->isEmpty()) {
            return [];
        }

        return $user->favorites()
            ->whereIn('listings.id', $listings->modelKeys())
            ->pluck('listings.id')
            ->all();
    }

    /**
     * GET /api/listings/{id} - public detail. Hidden listings 404 for
     * everyone except the owner; rented listings stay visible.
     */
    public function show(Request $request, Listing $listing): JsonResponse
    {
        $user = $request->user('sanctum');

        // Hidden listings: 404 unless the viewer is the owner landlord.
        if ($listing->status === Listing::STATUS_HIDDEN
            && (! $user || $user->id !== $listing->user_id)) {
            abort(404);
        }

        $listing->load(['ward.city', 'coverImage', 'images', 'amenities', 'landlord'])
            ->loadCount('reviews')
            ->loadAvg('reviews', 'listing_rating');

        // Personalize is_favorited when a logged-in student is viewing.
        $favorited = $user && $user->role === User::ROLE_STUDENT
            ? $user->favorites()->where('listings.id', $listing->id)->exists()
            : false;
        $request->attributes->set('favorited_listing_ids', $favorited ? [$listing->id] : []);

        return response()->json([
            'data' => (new ListingDetailResource($listing))->resolve($request),
        ]);
    }
}
