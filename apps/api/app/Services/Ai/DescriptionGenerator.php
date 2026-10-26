<?php

namespace App\Services\Ai;

use App\Models\Amenity;
use App\Models\Ward;
use App\Services\AiClient;

class DescriptionGenerator
{
    public function __construct(private readonly AiClient $ai) {}

    /**
     * Listing description generator (landlord). ids become names; missing
     * title becomes "Nhà cho thuê".
     *
     * @param  array<string, mixed>  $data  validated request data
     * @return array<string, mixed>
     */
    public function generate(array $data): array
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
}
