<?php

namespace App\Http\Requests\Ai;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * POST /api/ai/description (landlord). Rules copied from the previous
 * inline validation so the 422 JSON is unchanged (API_CONTRACT §1).
 */
class AiDescriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // auth:sanctum + role:landlord on the route
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'nullable', 'string', 'max:200'],
            'type' => ['sometimes', 'nullable', Rule::in(['room', 'apartment', 'house'])],
            'price' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'area_m2' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'ward_id' => ['sometimes', 'nullable', 'integer', 'exists:wards,id'],
            'amenity_ids' => ['sometimes', 'nullable', 'array'],
            'amenity_ids.*' => ['integer', 'exists:amenities,id'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'type' => 'Loại nhà không hợp lệ.',
            'ward_id.exists' => 'Quận không tồn tại.',
            'amenity_ids.*.exists' => 'Tiện ích không tồn tại.',
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'title' => 'Tiêu đề',
            'type' => 'Loại nhà',
            'price' => 'Giá thuê',
            'area_m2' => 'Diện tích',
            'address' => 'Địa chỉ',
            'ward_id' => 'Quận',
            'amenity_ids' => 'Tiện ích',
        ];
    }
}
