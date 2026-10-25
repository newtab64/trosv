<?php

namespace App\Http\Requests\Listing;

use App\Http\Controllers\ListingController;
use App\Models\Listing;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * GET /api/listings - public browse filters (API_CONTRACT §4 "Duyệt tin
 * đăng"). Rules copied verbatim from the previous inline validation. The
 * school_id-requires check for max_km / sort=distance stays in the
 * controller.
 */
class ListingBrowseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'price_min' => ['nullable', 'integer', 'min:0'],
            // gte:price_min would fail when price_min is absent, so the
            // cross-field check only runs when both bounds are provided.
            'price_max' => ['nullable', 'integer', 'min:0', function (string $attribute, mixed $value, \Closure $fail) {
                $min = $this->input('price_min');
                if ($min !== null && $min !== '' && (int) $value < (int) $min) {
                    $fail('Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.');
                }
            }],
            'ward_id' => ['nullable', 'integer', 'exists:wards,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'type' => ['nullable', Rule::in([Listing::TYPE_ROOM, Listing::TYPE_APARTMENT, Listing::TYPE_HOUSE])],
            'amenity_ids' => ['nullable', 'array'],
            'amenity_ids.*' => ['integer', 'exists:amenities,id'],
            'max_km' => ['nullable', 'numeric', 'min:0', 'max:500'],
            'sort' => ['nullable', Rule::in(['newest', 'price_asc', 'price_desc', 'distance', 'rating'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.ListingController::PER_PAGE_MAX],
            'q' => ['nullable', 'string', 'max:200'],
            'school_id' => ['nullable', 'integer', 'exists:schools,id'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'integer' => ':attribute phải là số nguyên.',
            'numeric' => ':attribute phải là số.',
            'string' => ':attribute phải là chuỗi.',
            'array' => ':attribute phải là một mảng.',
            'min.numeric' => ':attribute phải tối thiểu :min.',
            'max.numeric' => ':attribute không được vượt quá :max.',
            'max.string' => ':attribute không được vượt quá :max ký tự.',
            'gte' => ':attribute phải lớn hơn hoặc bằng :value.',
            'exists' => ':attribute không tồn tại.',
            'in' => ':attribute không hợp lệ.',
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'price_min' => 'Giá tối thiểu',
            'price_max' => 'Giá tối đa',
            'ward_id' => 'Quận',
            'type' => 'Loại tin',
            'amenity_ids' => 'Tiện ích',
            'max_km' => 'Bán kính (km)',
            'sort' => 'Sắp xếp',
            'page' => 'Trang',
            'per_page' => 'Số tin mỗi trang',
            'q' => 'Từ khóa',
            'school_id' => 'Trường',
        ];
    }
}
