<?php

namespace App\Policies;

use App\Models\Listing;
use App\Models\User;

/**
 * Listing ownership (API_CONTRACT §4 - "Chủ nhà: quản lý tin đăng").
 * replaces the inline authorizeOwnership() check; AuthorizationException
 * renders as 403 { message: "Bạn không có quyền..." } via bootstrap/app.php.
 */
class ListingPolicy
{
    /** Landlord may fully manage their own listing. */
    public function manage(User $user, Listing $listing): bool
    {
        return $listing->user_id === $user->id;
    }

    /**
     * Review creation prerequisite (ERD §4): a student may only review a
     * listing they already have a conversation about. The 403 carries the
     * contract's specific message, so the controller renders it via
     * abort_unless() with this policy supplying the decision.
     */
    public function review(User $user, Listing $listing): bool
    {
        return $listing->conversations()
            ->where('student_id', $user->id)
            ->exists();
    }
}
