<?php

namespace Database\Seeders;

use App\Models\Conversation;
use App\Models\Listing;
use App\Models\Message;
use App\Models\User;
use Illuminate\Database\Seeder;

class ConversationSeeder extends Seeder
{
    public function run(): void
    {
        $students = User::where('role', User::ROLE_STUDENT)->orderBy('id')->take(6)->get();
        $visibleListings = Listing::whereIn('status', [Listing::STATUS_AVAILABLE, Listing::STATUS_RENTED])
            ->orderBy('id')->take(6)->get();

        $openers = [
            'Phòng còn trống không ạ?',
            'Cho em hỏi nhà có thu phí giữ xe không ạ?',
            'Em muốn xem phòng cuối tuần này được không ạ?',
            'Nhà có hợp đồng tối thiểu bao nhiêu tháng ạ?',
        ];
        $replies = [
            'Chào bạn, phòng còn trống, bạn muốn xem thì hẹn trước một ngày nhé.',
            'Phí giữ xe 80k/tháng cho xe máy. Bạn có question gì cứ hỏi thêm.',
            'Được bạn ơi, mình rảnh cả thứ 7 và chủ nhật.',
            'Hợp đồng tối thiểu 6 tháng, cọc 1 tháng tiền phòng.',
        ];

        foreach ($students as $k => $student) {
            $listing = $visibleListings[$k];
            $landlordId = $listing->user_id;

            $existing = Conversation::where(function ($q) use ($student, $landlordId) {
                $q->where('student_id', $student->id)->where('landlord_id', $landlordId);
            })->orWhere(function ($q) use ($student, $landlordId) {
                $q->where('student_id', $landlordId)->where('landlord_id', $student->id);
            })->first();

            if ($existing) {
                continue;
            }

            $conversation = Conversation::create([
                'listing_id' => $listing->id,
                'student_id' => $student->id,
                'landlord_id' => $landlordId,
            ]);

            $base = now()->subDays(2)->subHours(6 - $k);

            Message::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $student->id,
                'body' => "/rooms/{$listing->id}",
                'read_at' => $base->copy()->addMinutes(15),
                'created_at' => $base,
            ]);

            Message::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $student->id,
                'body' => $openers[$k % count($openers)],
                'read_at' => $base->copy()->addMinutes(30), // landlord read it
                'created_at' => $base->copy()->addMinutes(5),
            ]);
            Message::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $landlordId,
                'body' => $replies[$k % count($replies)],
                'read_at' => $k % 2 === 0 ? $base->copy()->addHour() : null, // some unread
                'created_at' => $base->copy()->addMinutes(45),
            ]);
            if ($k % 3 === 0) {
                Message::create([
                    'conversation_id' => $conversation->id,
                    'sender_id' => $student->id,
                    'body' => 'Cảm ơn anh/chị, em sẽ ghé xem sớm ạ.',
                    'read_at' => null,
                    'created_at' => $base->copy()->addHours(2),
                ]);
            }
        }
    }
}
