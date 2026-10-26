<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ProfileUpdateRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    /**
     * PUT /api/profile - partial update. Student-only fields are silently
     * dropped when the requester is a landlord (API_CONTRACT §4).
     */
    public function update(ProfileUpdateRequest $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validated();

        // Cross-field rule: budget_max >= budget_min (combined with the
        // persisted values, because updates are partial).
        $this->validateBudgetRange($request, $user);

        $user->update($data);

        return response()->json(['data' => new UserResource($user->fresh())]);
    }

    /**
     * budget_max >= budget_min considering both the request payload and the
     * other half already stored on the user (partial updates).
     */
    private function validateBudgetRange(Request $request, User $user): void
    {
        $min = $request->input('budget_min', $user->budget_min);
        $max = $request->input('budget_max', $user->budget_max);

        if ($min !== null && $max !== null && (int) $max < (int) $min) {
            throw ValidationException::withMessages([
                'budget_max' => ['Ngân sách tối đa phải lớn hơn hoặc bằng ngân sách tối thiểu.'],
            ]);
        }
    }
}
