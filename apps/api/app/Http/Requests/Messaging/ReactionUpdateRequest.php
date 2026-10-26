<?php

namespace App\Http\Requests\Messaging;

use Illuminate\Foundation\Http\FormRequest;

/**
 * PUT /api/messages/{message}/reactions. The 6-emoji allow-list matches
 * the previous inline validation (API_CONTRACT §4 extension).
 */
class ReactionUpdateRequest extends FormRequest
{
    /** Bộ 6 emoji chuẩn của Messenger. */
    public const ALLOWED = ['👍', '❤️', '😂', '😮', '😢', '😠'];

    public function authorize(): bool
    {
        return true; // participant check runs in the controller (404 semantics)
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'emoji' => ['required', 'string', 'in:'.implode(',', self::ALLOWED)],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'emoji.required' => 'Emoji là bắt buộc.',
            'emoji.in' => 'Emoji không nằm trong bộ cho phép.',
        ];
    }
}
