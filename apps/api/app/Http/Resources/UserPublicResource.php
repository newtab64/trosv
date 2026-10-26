<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Public student profile (API_CONTRACT §4). PII-safe: no email, no phone.
 * Carries exactly what the Roommates results show, for the public page.
 */
class UserPublicResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var User $user */
        $user = $this->resource;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'role' => $user->role,
            'bio' => $user->bio,
            'school' => $user->school?->name,
            'budget_min' => $user->budget_min !== null ? (int) $user->budget_min : null,
            'budget_max' => $user->budget_max !== null ? (int) $user->budget_max : null,
            'sleep_schedule' => $user->sleep_schedule,
            'cleanliness' => $user->cleanliness !== null ? (int) $user->cleanliness : null,
            'smoking' => $user->smoking !== null ? (bool) $user->smoking : null,
            'personality' => $user->personality,
            'interests' => $user->interests !== null
                ? array_values(array_filter(array_map('trim', explode(',', $user->interests))))
                : [],
            'looking_for_roommate' => (bool) $user->looking_for_roommate,
        ];
    }
}
