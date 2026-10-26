<?php

namespace Database\Seeders;

use App\Models\School;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('password');

        // 3 landlords.
        $landlordNames = ['Trần Văn Thành', 'Lê Thị Hồng', 'Phạm Minh Đức'];
        foreach ($landlordNames as $i => $name) {
            User::forceCreate([
                'name' => $name,
                'email' => 'landlord'.($i + 1).'@example.com',
                'password' => $password,
                'role' => User::ROLE_LANDLORD,
                'phone' => '090'.str_pad((string) ($i + 1), 7, '0', STR_PAD_LEFT),
                'bio' => 'Chủ nhà cho thuê nhà trọ dành cho sinh viên trên toàn quốc.',
            ]);
        }

        // 10 students with complete profiles.
        // Resolve school ids dynamically: PostgreSQL sequences do not roll back,
        // so hardcoded ids would break when seeds run after a rollback (tests).
        $schoolIds = School::orderBy('id')->pluck('id')->all();
        $sleepSchedules = [User::SLEEP_EARLY, User::SLEEP_NORMAL, User::SLEEP_LATE];
        $personalities = [User::PERSONALITY_INTROVERT, User::PERSONALITY_AMBIVERT, User::PERSONALITY_EXTROVERT];
        $interestPool = [
            'music', 'gym', 'reading', 'gaming', 'cooking', 'photography',
            'football', 'studying', 'movies', 'travel', 'badminton', 'cafés',
        ];
        $studentNames = [
            'Nguyễn Văn An', 'Trần Thị Bình', 'Lê Hoàng Cường', 'Phạm Thị Dung', 'Hoàng Văn Em',
            'Đỗ Thị Phương', 'Vũ Minh Giang', 'Bùi Thị Hoa', 'Đặng Quốc Hưng', 'Ngô Thu Thảo',
        ];

        for ($i = 1; $i <= 10; $i++) {
            $interests = array_slice($interestPool, ($i - 1) % 6, 3);

            User::forceCreate([
                'name' => $studentNames[$i - 1],
                'email' => "student{$i}@example.com",
                'password' => $password,
                'role' => User::ROLE_STUDENT,
                'phone' => '093'.str_pad((string) $i, 7, '0', STR_PAD_LEFT),
                'bio' => 'Sinh viên năm '.(($i % 4) + 1).', đang tìm phòng trọ gần trường.',
                'school_id' => $schoolIds[$i % count($schoolIds)],
                'budget_min' => 1_200_000 + ($i % 4) * 100_000,
                'budget_max' => 2_500_000 + ($i % 5) * 200_000,
                'sleep_schedule' => $sleepSchedules[$i % 3],
                'cleanliness' => (($i - 1) % 5) + 1,
                'smoking' => $i % 5 === 0,
                'personality' => $personalities[$i % 3],
                'interests' => implode(',', $interests),
                'looking_for_roommate' => $i !== 4, // most students are looking
            ]);
        }
    }
}
