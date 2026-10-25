<?php

namespace App\Http\Requests\Ai;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * POST /api/ai/area-suggestions. Rules copied from the previous inline
 * validation; the profile fallback and 422 for missing budget live in
 * AiService (ValidationException renders the identical JSON).
 */
class AreaSuggestionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // auth:sanctum + role:student on the route
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'budget_min' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'budget_max' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'school_id' => ['sometimes', 'nullable', 'integer', 'exists:schools,id'],
            'priorities' => ['sometimes', 'nullable', 'array'],
            'priorities.*' => [Rule::in(['cheap', 'near_school', 'well_rated', 'many_options'])],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'priorities.*' => 'Giá trị ưu tiên không hợp lệ.',
            'school_id.exists' => 'Trường không tồn tại.',
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'budget_min' => 'Ngân sách tối thiểu',
            'budget_max' => 'Ngân sách tối đa',
            'school_id' => 'Trường',
            'priorities' => 'Ưu tiên',
        ];
    }
}
