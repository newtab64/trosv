<?php

namespace App\Http\Requests\Ai;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * POST /api/ai/chat. Rules copied from the previous inline validation so
 * the 422 JSON is unchanged (API_CONTRACT §1).
 */
class AiChatRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // auth:sanctum on the route group
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'message' => ['required', 'string', 'min:1', 'max:1000'],
            'history' => ['sometimes', 'nullable', 'array', 'max:10'],
            'history.*.role' => [Rule::in(['user', 'assistant'])],
            // Giới hạn nội dung từng lượt: không có max, mỗi phần tử history
            // co the lon tuy y (chi bi chan boi post_max_size) va duoc forward
            // nguyen van cho AI service chung - amplification input cho
            // resource exhaustion (audit run 2). Gioi han 10.000 ky tu lon
            // hon bat ky lich su chat hop le nao (message gioi han 1000).
            'history.*.content' => ['required', 'string', 'max:10000'],
            'listing_id' => ['sometimes', 'nullable', 'integer', 'exists:listings,id'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'message.required' => 'Tin nhắn là bắt buộc.',
            'message.max' => 'Tin nhắn tối đa 1000 ký tự.',
            'history.max' => 'Lịch sử tối đa 10 lượt.',
            'history.*.role' => 'Vai trò trong lịch sử chỉ là user hoặc assistant.',
            'history.*.content.max' => 'Nội dung từng lượt lịch sử tối đa 10.000 ký tự.',
            'listing_id.exists' => 'Tin đăng không tồn tại.',
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'message' => 'Tin nhắn',
            'history' => 'Lịch sử',
            'listing_id' => 'Tin đăng',
        ];
    }
}
