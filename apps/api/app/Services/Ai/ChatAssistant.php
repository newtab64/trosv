<?php

namespace App\Services\Ai;

use App\Models\Listing;
use App\Services\AiClient;

class ChatAssistant
{
    public function __construct(private readonly AiClient $ai) {}

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
}
