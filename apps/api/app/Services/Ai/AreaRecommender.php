<?php

namespace App\Services\Ai;

use App\Models\School;
use App\Models\User;
use App\Models\Ward;
use App\Services\AiClient;
use App\Support\Geo;
use Illuminate\Validation\ValidationException;

class AreaRecommender
{
    public function __construct(private readonly AiClient $ai) {}

    /**
     * Area suggestions: budget/school fall back to the profile. Per-ward
     * stats computed in PHP; AI ranks and returns reasons; Backend
     * re-attaches names and stats.
     *
     * @param  array<string, mixed>  $data  validated request data
     * @return list<array<string, mixed>>
     */
    public function suggest(User $me, array $data): array
    {
        $budgetMin = $data['budget_min'] ?? $me->budget_min;
        $budgetMax = $data['budget_max'] ?? $me->budget_max;
        $schoolId = $data['school_id'] ?? $me->school_id;

        if ($budgetMin === null && $budgetMax === null) {
            throw ValidationException::withMessages([
                'budget_min' => ['Hãy cung cấp ngân sách hoặc hoàn thiện hồ sơ.'],
            ]);
        }

        $budgetMin ??= 0;
        $budgetMax ??= PHP_INT_MAX;

        $school = $schoolId !== null ? School::find($schoolId) : null;

        $wards = Ward::query()
            ->whereHas('listings', fn ($q) => $q->visible()
                ->whereBetween('price', [$budgetMin, $budgetMax]))
            ->with(['listings' => fn ($q) => $q->visible()
                ->whereBetween('price', [$budgetMin, $budgetMax])
                ->withAvg('reviews', 'listing_rating')])
            ->get();

        $areas = $wards->map(function (Ward $ward) use ($school) {
            $listings = $ward->listings;
            $prices = $listings->pluck('price')->map(fn ($p) => (float) $p)->sort()->values();
            $ratings = $listings->pluck('reviews_avg_listing_rating')->filter()->map(fn ($r) => (float) $r);

            return [
                'ward_id' => $ward->id,
                'name' => $ward->name,
                'listings_count' => $listings->count(),
                'avg_price' => $prices->isEmpty() ? null : (int) round($prices->avg()),
                'avg_rating' => $ratings->isEmpty() ? null : round($ratings->avg(), 1),
                'distance_to_school_km' => ($school !== null && $school->latitude !== null
                    && $school->longitude !== null && $ward->latitude !== null && $ward->longitude !== null)
                    ? Geo::haversineKm(
                        (float) $school->latitude,
                        (float) $school->longitude,
                        (float) $ward->latitude,
                        (float) $ward->longitude
                    )
                    : null,
            ];
        })->values()->all();

        if ($areas === []) {
            return [];
        }

        $response = $this->ai->post('/areas', [
            'preferences' => [
                'budget_min' => (int) $budgetMin,
                'budget_max' => (int) $budgetMax,
                'priorities' => $data['priorities'] ?? [],
            ],
            // Names go through: ward names are not personal data and the
            // AI contract includes them in the request (docs/contracts/AI_CONTRACT.md §4).
            'areas' => $areas,
            'limit' => 3,
        ], ['results']);

        // Re-attach name + stats for the wards the AI kept.
        $byId = collect($areas)->keyBy('ward_id');
        $results = [];
        foreach ($response['results'] as $row) {
            $area = $byId->get($row['ward_id'] ?? null);
            if ($area === null || count($results) >= 3) {
                continue;
            }

            $results[] = [
                'ward_id' => $area['ward_id'],
                'name' => $area['name'],
                'reason' => is_string($row['reason'] ?? null) ? $row['reason'] : '',
                'stats' => [
                    'listings_count' => $area['listings_count'],
                    'avg_price' => $area['avg_price'],
                    'avg_rating' => $area['avg_rating'],
                    'distance_to_school_km' => $area['distance_to_school_km'],
                ],
            ];
        }

        return $results;
    }
}
