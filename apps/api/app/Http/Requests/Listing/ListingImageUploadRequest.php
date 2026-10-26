<?php

namespace App\Http\Requests\Listing;

use Illuminate\Foundation\Http\FormRequest;

/**
 * POST /api/listings/{id}/images (landlord) - 1..n images, jpg/png/webp,
 * 2 MB each. The "max 5 images per listing" check stays in the controller
 * (it depends on the persisted image count and returns a custom body).
 */
class ListingImageUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // ownership check runs in the controller
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'images' => ['required', 'array', 'min:1'],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'required' => 'Cần cung cấp :attribute.',
            'array' => ':attribute phải là một mảng.',
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'images' => 'Ảnh',
            'images.*' => 'Ảnh',
        ];
    }
}
