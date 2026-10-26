<?php

namespace App\Services;

use App\Models\Listing;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Encapsulates search, filtering, geo-distance and sorting for listings.
 */
class ListingFilterService
{
    /**
     * Build the filtered and sorted Eloquent query for public listing search.
     *
     * @param  array<string, mixed>  $filters
     */
    public function buildQuery(array $filters): Builder
    {
        $query = Listing::query()
            ->where('status', Listing::STATUS_AVAILABLE)
            ->with(['ward.city', 'coverImage'])
            ->withCount('reviews')
            ->withAvg('reviews', 'listing_rating');

        $this->applySearchTerm($query, $filters['q'] ?? null);
        $this->applyPriceRange($query, $filters['price_min'] ?? null, $filters['price_max'] ?? null);
        $this->applyLocation($query, $filters['ward_id'] ?? null, $filters['city_id'] ?? null);
        $this->applyRoomType($query, $filters['type'] ?? null);
        $this->applyAmenities($query, $filters['amenity_ids'] ?? []);
        $this->applyDistance($query, $filters['school_id'] ?? null, $filters['max_km'] ?? null);
        $this->applySorting($query, $filters['sort'] ?? 'newest');

        // Deterministic tiebreaker for stable pagination.
        $query->orderBy('id', 'desc');

        return $query;
    }

    protected function applySearchTerm(Builder $query, ?string $q): void
    {
        if (! empty($q)) {
            // ILIKE: PostgreSQL case-insensitive search (ERD §4).
            $query->where(function (Builder $sub) use ($q) {
                $sub->where('title', 'ilike', "%{$q}%")
                    ->orWhere('address', 'ilike', "%{$q}%");
            });
        }
    }

    protected function applyPriceRange(Builder $query, mixed $min, mixed $max): void
    {
        if ($min !== null) {
            $query->where('price', '>=', $min);
        }

        if ($max !== null) {
            $query->where('price', '<=', $max);
        }
    }

    protected function applyLocation(Builder $query, mixed $wardId, mixed $cityId): void
    {
        if (! empty($wardId)) {
            $query->where('ward_id', $wardId);
        }

        // City filter: listing's ward belongs to the selected provincial unit.
        if (! empty($cityId)) {
            $query->whereHas('ward', fn (Builder $q) => $q->where('city_id', $cityId));
        }
    }

    protected function applyRoomType(Builder $query, ?string $type): void
    {
        if (! empty($type)) {
            $query->where('type', $type);
        }
    }

    /**
     * @param  array<int, int|string>  $amenityIds
     */
    protected function applyAmenities(Builder $query, array $amenityIds): void
    {
        // Listing must have ALL requested amenities.
        foreach ($amenityIds as $amenityId) {
            $query->whereHas('amenities', fn (Builder $q) => $q->where('amenities.id', $amenityId));
        }
    }

    protected function applyDistance(Builder $query, mixed $schoolId, mixed $maxKm): void
    {
        // Distance calculation only when school_id is provided.
        if (! empty($schoolId)) {
            $school = DB::table('schools')->find($schoolId);

            if ($school && $school->latitude !== null && $school->longitude !== null) {
                $max = $maxKm !== null ? (float) $maxKm : null;
                $query->nearby((float) $school->latitude, (float) $school->longitude, $max);
            }
        }
    }

    protected function applySorting(Builder $query, string $sort): void
    {
        match ($sort) {
            'price_asc' => $query->orderBy('price'),
            'price_desc' => $query->orderBy('price', 'desc'),
            'distance' => $query->orderBy('distance_km'),
            // Single subquery with NULLS LAST in PostgreSQL replaces redundant double subquery scan.
            'rating' => $query->orderByRaw(
                '(SELECT AVG(listing_rating) FROM reviews WHERE reviews.listing_id = listings.id) DESC NULLS LAST'
            ),
            default => $query->orderBy('id', 'desc'), // newest
        };
    }
}
