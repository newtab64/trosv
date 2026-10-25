<?php

namespace App\Services;

use App\Models\Amenity;
use App\Models\Listing;
use App\Models\School;
use App\Models\User;
use App\Models\Ward;
use App\Support\Geo;
use Illuminate\Validation\ValidationException;

/**
 * AI feature layer (docs/contracts/AI_CONTRACT.md): prepares ALL data the AI service
 * needs (it has no database and never receives names, emails or phones),
 * calls AiClient and sanitizes the response. Controllers only map
 * HTTP in/out; all 422 semantics live here as ValidationException so the
 * rendered JSON is identical to the previous inline implementation.
 */
class AiService
{
    public function __construct(private readonly AiClient $ai) {}

    /**
     * Roommate matching: profile must be complete and looking_for_roommate
     * set, otherwise 422. Candidates: other students with intersecting
     * budgets, max 20. Response rows get name/school/phone re-attached by
     * Backend (AI only ever sees the anonymous profile shape).
     *
     * @return list<array<string, mixed>>
     */
    public function roommates(User $me): array
    {
        if (! $this->profileComplete($me)) {
            throw ValidationException::withMessages([
                'profile' => ['Hãy hoàn thiện hồ sơ và bật tìm bạn cùng phòng.'],
            ]);
        }

        $candidates = User::query()
            ->where('role', User::ROLE_STUDENT)
            ->where('looking_for_roommate', true)
            ->where('id', '!=', $me->id)
            ->where('budget_min', '<=', $me->budget_max)
            ->where('budget_max', '>=', $me->budget_min)
            ->with('school:id,name')
            ->limit(20)
            ->get();

        // The requester comes from the auth guard without eager loads.
        $me->load('school:id,name');
        $myInterests = $this->interestList($me->interests);

        if ($candidates->isEmpty()) {
            return [];
        }

        $response = $this->ai->post('/roommates', [
            'requester' => $this->candidatePayload($me),
            'candidates' => $candidates->map(fn (User $u) => $this->candidatePayload($u))->all(),
            'limit' => 5,
        ], ['results']);

        // Keep only ids that are actually in the candidate set (contract §4),
        // cap at 5 and re-attach the personal fields Backend owns.
        $byId = $candidates->keyBy('id');
        $results = [];
        foreach ($response['results'] as $row) {
            $candidate = $byId->get($row['id'] ?? null);
            if ($candidate === null || count($results) >= 5) {
                continue;
            }

            $results[] = [
                'user_id' => $candidate->id,
                'name' => $candidate->name,
                'school' => $candidate->school?->name,
                'phone' => $candidate->phone,
                'interests' => $this->interestList($candidate->interests),
                'interests_shared' => array_values(
                    array_intersect($myInterests, $this->interestList($candidate->interests))
                ),
                'score' => is_numeric($row['score'] ?? null) ? (int) $row['score'] : 0,
                'reason' => is_string($row['reason'] ?? null) ? $row['reason'] : '',
            ];
        }

        // Ưu tiên ứng viên trùng nhiều sở thích nhất với người yêu cầu;
        // hòa nhau thì theo score của AI, rồi theo id để ổn định.
        usort($results, fn (array $a, array $b) => count($b['interests_shared']) <=> count($a['interests_shared'])
            ?: $b['score'] <=> $a['score']
            ?: $a['user_id'] <=> $b['user_id']);

        return $results;
    }

    /**
     * Price advice: comparable listings = same ward + type, area within 40%,
     * available or rented, excluding the listing itself. Backend computes
     * the stats; fewer than 3 comparables → 422.
     *
     * @return array<string, mixed>
     */
    public function priceAdvice(int $listingId): array
    {
        /** @var Listing $listing */
        $listing = Listing::query()
            ->visible()
            ->with(['amenities', 'ward'])
            ->findOrFail($listingId);

        $minArea = (float) $listing->area_m2 * 0.6;
        $maxArea = (float) $listing->area_m2 * 1.4;

        $comparables = Listing::query()
            ->visible()
            ->where('id', '!=', $listing->id)
            ->where('ward_id', $listing->ward_id)
            ->where('type', $listing->type)
            ->whereBetween('area_m2', [$minArea, $maxArea])
            ->pluck('price')
            ->all();

        if (count($comparables) < 3) {
            throw ValidationException::withMessages([
                'listing_id' => ['Chưa đủ tin tương tự để so sánh giá.'],
            ]);
        }

        sort($comparables);
        $count = count($comparables);
        $stats = [
            'count' => $count,
            'min' => (int) $comparables[0],
            'median' => (int) round($this->median($comparables)),
            'max' => (int) $comparables[$count - 1],
        ];

        $response = $this->ai->post('/price-advice', [
            'listing' => [
                'type' => $listing->type,
                'price' => (int) $listing->price,
                'area_m2' => (float) $listing->area_m2,
                'ward' => $listing->ward?->name,
                'amenities' => $listing->amenities->pluck('name')->values()->all(),
            ],
            'stats' => $stats,
        ], ['verdict', 'fair_min', 'fair_max', 'tips', 'message']);

        return [
            'listing_price' => (int) $listing->price,
            'verdict' => $response['verdict'],
            'fair_min' => (int) $response['fair_min'],
            'fair_max' => (int) $response['fair_max'],
            'tips' => array_values(array_filter((array) $response['tips'], 'is_string')),
            'message' => $response['message'],
            'stats' => $stats,
        ];
    }

    /**
     * Area suggestions: budget/school fall back to the profile. Per-ward
     * stats computed in PHP; AI ranks and returns reasons; Backend
     * re-attaches names and stats.
     *
     * @param  array<string, mixed>  $data  validated request data
     * @return list<array<string, mixed>>
     */
    public function areaSuggestions(User $me, array $data): array
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
                    ? $this->haversineKm(
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

    /**
     * Chatbot proxy with optional listing context.
     *
     * @param  array<string, mixed>  $data  validated request data
     * @return array<string, mixed>
     */
    public function chat(array $data): array
    {
        $listingPayload = null;
        if (! empty($data['listing_id'])) {
            $listing = Listing::query()
                ->visible()
                ->with(['amenities', 'ward'])
                ->find($data['listing_id']);

            if ($listing !== null) {
                $listingPayload = [
                    'title' => $listing->title,
                    'price' => (int) $listing->price,
                    'area_m2' => (float) $listing->area_m2,
                    'address' => $listing->address,
                    'ward' => $listing->ward?->name,
                    'amenities' => $listing->amenities->pluck('name')->values()->all(),
                    'description' => $listing->description,
                ];
            }
        }

        $response = $this->ai->post('/chat', [
            'message' => $data['message'],
            'history' => array_map(
                fn (array $turn) => ['role' => $turn['role'], 'content' => $turn['content']],
                array_slice($data['history'] ?? [], -10),
            ),
            'listing' => $listingPayload,
        ], ['reply']);

        return ['reply' => $response['reply']];
    }

    /**
     * Listing description generator (landlord). ids become names; missing
     * title becomes "Nhà cho thuê".
     *
     * @param  array<string, mixed>  $data  validated request data
     * @return array<string, mixed>
     */
    public function description(array $data): array
    {
        $ward = isset($data['ward_id'])
            ? Ward::find($data['ward_id'])?->name
            : null;
        $amenities = isset($data['amenity_ids'])
            ? Amenity::whereIn('id', $data['amenity_ids'])->pluck('name')->values()->all()
            : null;

        $response = $this->ai->post('/description', [
            'title' => $data['title'] ?? 'Nhà cho thuê',
            'type' => $data['type'] ?? null,
            'price' => $data['price'] ?? null,
            'area_m2' => $data['area_m2'] ?? null,
            'address' => $data['address'] ?? null,
            'ward' => $ward,
            'amenities' => $amenities,
        ], ['description']);

        return ['description' => $response['description']];
    }

    // ------------------------------------------------------------------

    /** The AI contract profile shape - no name, email or phone here. */
    private function candidatePayload(User $user): array
    {
        return [
            'id' => $user->id,
            'budget_min' => (int) $user->budget_min,
            'budget_max' => (int) $user->budget_max,
            'sleep_schedule' => $user->sleep_schedule,
            'cleanliness' => $user->cleanliness !== null ? (int) $user->cleanliness : null,
            'smoking' => (bool) $user->smoking,
            'personality' => $user->personality,
            'interests' => $this->interestList($user->interests),
        ];
    }

    /** "music, gym" -> ["music", "gym"] (null -> []).
     * @return list<string>
     */
    private function interestList(?string $csv): array
    {
        return $csv !== null
            ? array_values(array_filter(array_map('trim', explode(',', $csv))))
            : [];
    }

    private function profileComplete(User $user): bool
    {
        return $user->school_id !== null
            && $user->budget_min !== null
            && $user->budget_max !== null
            && $user->sleep_schedule !== null
            && $user->cleanliness !== null
            && $user->smoking !== null
            && $user->personality !== null
            && $user->looking_for_roommate === true;
    }

    /** @param  list<int|float>  $values  sorted ascending */
    private function median(array $values): float
    {
        $count = count($values);
        $middle = intdiv($count, 2);

        return $count % 2 === 1
            ? (float) $values[$middle]
            : ($values[$middle - 1] + $values[$middle]) / 2;
    }

    private function haversineKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        return Geo::haversineKm($lat1, $lon1, $lat2, $lon2);
    }
}
