<?php

namespace App\Http\Requests\Listing;

use Illuminate\Foundation\Http\FormRequest;

/**
 * POST /api/listings/{listing}/reviews (student). The conversation
 * prerequisite (403) and one-review-per-student rule stay in the
 * controller; only field validation lives here.
 */
class ReviewStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'listing_rating' => ['required', 'integer', 'between:1,5'],
            'landlord_rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'required' => 'Cần cung cấp :attribute.',
            'integer' => ':attribute phải là số nguyên.',
            'between' => ':attribute phải từ :min đến :max sao.',
            'max.string' => ':attribute không được vượt quá :max ký tự.',
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'listing_rating' => 'Điểm tin đăng',
            'landlord_rating' => 'Điểm chủ nhà',
            'comment' => 'Bình luận',
        ];
    }
}
