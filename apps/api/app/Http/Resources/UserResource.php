<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * User object per API_CONTRACT.md §3: "Các trường chỉ dành cho sinh viên
 * sẽ là null với chủ nhà." Student-only fields are forced to null for
 * landlords no matter what is stored in the database.
 */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var User $user */
        $user = $this->resource;
        $isStudent = $user->role === User::ROLE_STUDENT;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'phone' => $user->phone,
            'bio' => $user->bio,
            // Student-only fields (null for landlords).
            'school_id' => $isStudent ? $user->school_id : null,
            'budget_min' => $isStudent ? $user->budget_min : null,
            'budget_max' => $isStudent ? $user->budget_max : null,
            'sleep_schedule' => $isStudent ? $user->sleep_schedule : null,
            'cleanliness' => $isStudent ? $user->cleanliness : null,
            'smoking' => $isStudent ? $user->smoking : null,
            'personality' => $isStudent ? $user->personality : null,
            'interests' => $isStudent ? $user->interests : null,
            'looking_for_roommate' => $isStudent ? $user->looking_for_roommate : null,
        ];
    }
}
