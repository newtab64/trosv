<?php

namespace App\Services\Ai;

use App\Models\Listing;
use App\Services\AiClient;
use Illuminate\Validation\ValidationException;

class PriceAdvisor
{
    public function __construct(private readonly AiClient $ai) {}

    /**
     * Price advice: comparable listings = same ward + type, area within 40%,
     * available or rented, excluding the listing itself. Backend computes
     * the stats; fewer than 3 comparables → 422.
     *
     * @return array<string, mixed>
     */
    public function advise(int $listingId): array
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

    /** @param  list<int|float>  $values  sorted ascending */
    private function median(array $values): float
    {
        $count = count($values);
        $middle = intdiv($count, 2);

        return $count % 2 === 1
            ? (float) $values[$middle]
            : ($values[$middle - 1] + $values[$middle]) / 2;
    }
}
