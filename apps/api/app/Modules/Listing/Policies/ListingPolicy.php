<?php

namespace App\Modules\Listing\Policies;

use App\Modules\Auth\Models\User;
use App\Modules\Listing\Models\Listing;

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
        return $user->role === User::ROLE_STUDENT
            && $listing->conversationIdForStudent($user->id) !== null;
    }
}
