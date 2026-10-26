<?php

namespace Database\Seeders;

use App\Models\Conversation;
use App\Models\Review;
use Illuminate\Database\Seeder;

class ReviewSeeder extends Seeder
{
    public function run(): void
    {
        // A review exists only for a conversation the student already has (ERD rule can_review).
        $conversations = Conversation::with('listing')->orderBy('id')->take(4)->get();

        $comments = [
            'Chủ nhà nhiệt tình, phòng sạch sẽ, đúng như tin đăng.',
            'Khu vực yên tĩnh, đi học tiện. Máy nước nóng hơi yếu.',
            'Giá hợp lý, an ninh tốt. Sẽ giới thiệu bạn bè thuê.',
            'Nhà xa trường một chút nhưng rẻ, chủ nhà dễ tính.',
        ];

        foreach ($conversations as $i => $conversation) {
            Review::create([
                'listing_id' => $conversation->listing_id,
                'student_id' => $conversation->student_id,
                'listing_rating' => [5, 4, 4, 3][$i],
                'landlord_rating' => [5, 5, 4, 4][$i],
                'comment' => $comments[$i % count($comments)],
            ]);
        }
    }
}
