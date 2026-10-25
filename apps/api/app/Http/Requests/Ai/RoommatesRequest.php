<?php

namespace App\Http\Requests\Ai;

use Illuminate\Foundation\Http\FormRequest;

/**
 * POST /api/ai/roommates takes no request body - this FormRequest exists so
 * every AI endpoint shares the same controller signature and validation
 * entrypoint. Real 422s (incomplete profile) come from AiService.
 */
class RoommatesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // auth:sanctum + role:student on the route
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [];
    }
}
