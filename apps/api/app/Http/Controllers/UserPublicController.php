<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserPublicResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;

/**
 * Public student profiles (API_CONTRACT §4). Email/phone are PII and are
 * never exposed here - the response only carries what Roommates already
 * shows, for linking from the AI results to a public profile page.
 */
class UserPublicController extends Controller
{
    /** GET /api/users/{user} - public student profile. */
    public function show(User $user): JsonResponse
    {
        if ($user->role !== User::ROLE_STUDENT) {
            // Landlords have no public profile (privacy by design).
            return response()->json([
                'message' => 'Chỉ sinh viên mới có hồ sơ công khai.',
            ], 404);
        }

        return response()->json([
            'data' => new UserPublicResource($user),
        ]);
    }
}
