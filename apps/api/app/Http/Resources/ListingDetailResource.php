<?php

namespace App\Http\Resources;

use App\Models\Listing;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * Listing detail object per API_CONTRACT §3: every summary field plus
 * description, created_at, images, amenities, landlord, ratings,
 * my_conversation_id and can_review.
 */
class ListingDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var Listing $listing */
        $listing = $this->resource;

        // Summary fields first (same shape as lists).
        $summary = (new ListingSummaryResource($listing))->resolve($request);

        return array_merge($summary, [
            'description' => $listing->description,
            'created_at' => $listing->created_at?->toISOString(),
            'images' => $listing->images
                ->map(fn ($image) => ['id' => $image->id, 'url' => Storage::disk('public')->url($image->path)])
                ->values()
                ->all(),
            'amenities' => $listing->amenities
                ->map(fn ($amenity) => ['id' => $amenity->id, 'name' => $amenity->name])
                ->values()
                ->all(),
            // phone is hidden from guests (no token).
            'landlord' => $listing->landlord ? [
                'id' => $listing->landlord->id,
                'name' => $listing->landlord->name,
                'phone' => $request->user('sanctum') ? $listing->landlord->phone : null,
            ] : null,
            'ratings' => $this->ratings($listing),
            'my_conversation_id' => $myConversationId = $this->myConversationId($listing, $request),
            'can_review' => $this->canReview($listing, $request, $myConversationId),
        ]);
    }

    /**
     * Ratings per ERD §4, rounded to 1 decimal, null when no data:
     * - listing_avg: this listing's reviews
     * - landlord_avg: reviews across ALL of the landlord's listings
     * - area_avg: reviews across ALL listings in the same ward
     */
    private function ratings(Listing $listing): array
    {
        $listingAvg = isset($listing->reviews_avg_listing_rating) && $listing->reviews_avg_listing_rating !== null
            ? (float) $listing->reviews_avg_listing_rating
            : $listing->reviews()->avg('listing_rating');

        $landlordAvg = $listing->user_id
            ? Review::query()
                ->whereIn('listing_id', Listing::where('user_id', $listing->user_id)->select('id'))
                ->avg('listing_rating')
            : null;

        $areaAvg = $listing->ward_id
            ? Review::query()
                ->whereIn('listing_id', Listing::where('ward_id', $listing->ward_id)->select('id'))
                ->avg('listing_rating')
            : null;

        return [
            'listing_avg' => $listingAvg !== null ? round((float) $listingAvg, 1) : null,
            'landlord_avg' => $landlordAvg !== null ? round((float) $landlordAvg, 1) : null,
            'area_avg' => $areaAvg !== null ? round((float) $areaAvg, 1) : null,
        ];
    }

    /** Id of the viewer's conversation about this listing, or null. */
    private function myConversationId(Listing $listing, Request $request): ?int
    {
        $user = $request->user('sanctum');

        if (! $user || $user->role !== User::ROLE_STUDENT) {
            return null;
        }

        return $listing->conversations()
            ->where('student_id', $user->id)
            ->value('id');
    }

    /**
     * can_review: viewer is a student, has a conversation about this
     * listing, and has not reviewed it yet (ERD §4).
     */
    private function canReview(Listing $listing, Request $request, ?int $myConversationId): bool
    {
        $user = $request->user('sanctum');

        if (! $user || $user->role !== User::ROLE_STUDENT || $myConversationId === null) {
            return false;
        }

        $hasReviewed = Review::query()
            ->where('listing_id', $listing->id)
            ->where('student_id', $user->id)
            ->exists();

        return ! $hasReviewed;
    }
}
