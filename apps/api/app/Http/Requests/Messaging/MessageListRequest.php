<?php

namespace App\Http\Requests\Messaging;

use Illuminate\Foundation\Http\FormRequest;

/**
 * GET /api/conversations/{conversation}/messages query params.
 */
class MessageListRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // participant check runs in the controller (404 semantics)
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'after_id' => ['nullable', 'integer', 'min:0'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'after_id.integer' => ':attribute phải là số nguyên.',
            'after_id.min' => ':attribute phải lớn hơn hoặc bằng 0.',
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'after_id' => 'after_id',
        ];
    }
}
