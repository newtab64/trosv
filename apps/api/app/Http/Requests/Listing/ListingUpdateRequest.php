<?php

namespace App\Http\Requests\Listing;

use App\Models\Listing;
use Illuminate\Validation\Rule;

/**
 * PUT /api/listings/{id} (landlord) - partial update, có thể đổi cả status.
 * Rules dùng chung từ ListingFormRequest ở chế độ partial ('required' ->
 * 'sometimes'); status là field riêng của update (POST không có).
 */
class ListingUpdateRequest extends ListingFormRequest
{
    protected function wantsPartialUpdate(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'status' => ['sometimes', Rule::in([
                Listing::STATUS_AVAILABLE, Listing::STATUS_RENTED, Listing::STATUS_HIDDEN,
            ])],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            ...parent::attributes(),
            'status' => 'Trạng thái',
        ];
    }
}
