<?php

namespace App\Http\Requests\Listing;

/**
 * POST /api/listings (landlord). Rules dùng chung từ ListingFormRequest,
 * chế độ tạo: các field bắt buộc giữ 'required' như bản gốc (API_CONTRACT §4).
 */
class ListingStoreRequest extends ListingFormRequest
{
    //
}
