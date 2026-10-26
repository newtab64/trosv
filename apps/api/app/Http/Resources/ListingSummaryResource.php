<?php

namespace App\Http\Resources;

use App\Models\Listing;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * Listing summary object per API_CONTRACT §3 - used for lists, favorites
 * and the map. Cover image = image with the smallest id.
 */
class ListingSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var Listing $listing */
        $listing = $this->resource;

        return [
            'id' => $listing->id,
            'title' => $listing->title,
            'type' => $listing->type,
            'price' => $listing->price,
            'area_m2' => $listing->area_m2 !== null ? (float) $listing->area_m2 : null,
            'address' => $listing->address,
            'latitude' => $listing->latitude !== null ? (float) $listing->latitude : null,
            'longitude' => $listing->longitude !== null ? (float) $listing->longitude : null,
            'status' => $listing->status,
            'ward' => $listing->ward ? [
                'id' => $listing->ward->id,
                'name' => $listing->ward->name,
                'city' => $listing->ward->relationLoaded('city') && $listing->ward->city ? [
                    'id' => $listing->ward->city->id,
                    'name' => $listing->ward->city->name,
                ] : null,
            ] : null,
            'cover_image' => $this->coverImageUrl(),
            'avg_rating' => $this->avgRating(),
            'reviews_count' => $listing->reviews_count ?? $listing->reviews()->count(),
            'distance_km' => $this->distanceKm(),
            'is_favorited' => $this->isFavorited($request),
        ];
    }

    /** Full public URL of the cover image (smallest id), or null. */
    private function coverImageUrl(): ?string
    {
        $cover = $this->coverImage->first();

        if (! $cover) {
            return null;
        }

        return Storage::disk('public')->url($cover->path);
    }

    /** avg_rating from the withAvg aggregate, rounded to 1 decimal; null when unrated. */
    private function avgRating(): ?float
    {
        if (! isset($this->reviews_avg_listing_rating) || $this->reviews_avg_listing_rating === null) {
            return null;
        }

        return round((float) $this->reviews_avg_listing_rating, 1);
    }

    /**
     * distance_km is only present when the request carried school_id
     * (the Haversine select); otherwise always null.
     */
    private function distanceKm(): ?float
    {
        if (! isset($this->distance_km)) {
            return null;
        }

        return round((float) $this->distance_km, 2);
    }

    /**
     * true only for the logged-in student who favorited this listing.
     * The controller passes the pre-fetched set of favorited ids for the
     * current page, so this costs no extra query.
     */
    private function isFavorited(Request $request): bool
    {
        $favoritedIds = $request->attributes->get('favorited_listing_ids');

        return $favoritedIds !== null && in_array($this->id, $favoritedIds, true);
    }
}
