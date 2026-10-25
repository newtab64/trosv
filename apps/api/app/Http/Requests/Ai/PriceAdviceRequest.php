<?php

namespace App\Http\Requests\Ai;

use Illuminate\Foundation\Http\FormRequest;

/**
 * POST /api/ai/price-advice. Messages/attributes copied from the previous
 * inline validation so the 422 JSON is unchanged (API_CONTRACT §1).
 */
class PriceAdviceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // auth:sanctum + role:student on the route
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'listing_id' => ['required', 'integer', 'exists:listings,id'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'listing_id.required' => 'Tin đăng là bắt buộc.',
            'listing_id.exists' => 'Tin đăng không tồn tại.',
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'listing_id' => 'Tin đăng',
        ];
    }
}
