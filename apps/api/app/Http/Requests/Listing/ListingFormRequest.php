<?php

namespace App\Http\Requests\Listing;

use App\Models\Listing;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Dùng chung cho ListingStoreRequest (POST) và ListingUpdateRequest (PUT) -
 * debt #1 trong docs/reports/TECH-DEBT.md: trước đây hai file giữ bản copy rules,
 * messages, attributes và mọi sửa rule phải làm hai nơi, dễ lệch contract.
 *
 * sharedRules() là bản canonical cho chế độ TẠO (required đầy đủ).
 * asPartial() biến đổi thành bản UPDATE: mọi field 'required' thành
 * 'sometimes|...' (giữ nguyên các rule còn lại), KHÔNG đụng field không
 * required. Hai bản 422 (messages/attributes) phải giống hệt trước refactor.
 */
abstract class ListingFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // auth:sanctum + role:landlord trên route; ownership check ở controller
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return $this->wantsPartialUpdate() ? $this->asPartial($this->sharedRules()) : $this->sharedRules();
    }

    /** Chế độ partial (PUT): subclass set true. */
    protected function wantsPartialUpdate(): bool
    {
        return false;
    }

    /**
     * Bản canonical (POST /api/listings) - rules copy verbatim từ bản inline
     * gốc (API_CONTRACT §4).
     *
     * @return array<string, array<int, mixed>>
     */
    protected function sharedRules(): array
    {
        return [
            'title' => ['required', 'string', 'min:5', 'max:200'],
            'type' => ['required', Rule::in([
                Listing::TYPE_ROOM, Listing::TYPE_APARTMENT, Listing::TYPE_HOUSE,
            ])],
            'price' => ['required', 'integer', 'between:100000,100000000'],
            'area_m2' => ['required', 'numeric', 'between:5,1000'],
            'address' => ['required', 'string', 'max:300'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'ward_id' => ['required', 'integer', 'exists:wards,id'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'amenity_ids' => ['sometimes', 'array'],
            'amenity_ids.*' => ['integer', 'exists:amenities,id'],
        ];
    }

    /**
     * 'required' -> 'sometimes|...' trên từng field; các field không required
     * giữ nguyên. (Giữ đúng hành vi PUT cũ - partial update.)
     *
     * @param  array<string, array<int, mixed>>  $rules
     * @return array<string, array<int, mixed>>
     */
    protected function asPartial(array $rules): array
    {
        foreach ($rules as $field => $constraints) {
            if (in_array('required', $constraints, true)) {
                $rules[$field] = array_merge(['sometimes'], array_values(array_diff($constraints, ['required'])));
            }
        }

        return $rules;
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'required' => 'Cần cung cấp :attribute.',
            'string' => ':attribute phải là chuỗi.',
            'integer' => ':attribute phải là số nguyên.',
            'numeric' => ':attribute phải là số.',
            'array' => ':attribute phải là một mảng.',
            'min.string' => ':attribute phải có ít nhất :min ký tự.',
            'max.string' => ':attribute không được vượt quá :max ký tự.',
            'between.numeric' => ':attribute phải trong khoảng :min đến :max.',
            'exists' => ':attribute không tồn tại.',
            'in' => ':attribute không hợp lệ.',
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'title' => 'Tiêu đề',
            'type' => 'Loại tin',
            'price' => 'Giá',
            'area_m2' => 'Diện tích',
            'address' => 'Địa chỉ',
            'latitude' => 'Vĩ độ',
            'longitude' => 'Kinh độ',
            'ward_id' => 'Quận',
            'description' => 'Mô tả',
            'amenity_ids' => 'Tiện ích',
            'amenity_ids.*' => 'Tiện ích',
        ];
    }
}
