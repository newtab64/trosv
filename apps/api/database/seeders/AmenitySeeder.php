<?php

namespace Database\Seeders;

use App\Models\Amenity;
use Illuminate\Database\Seeder;

class AmenitySeeder extends Seeder
{
    public function run(): void
    {
        $names = [
            'Wi-Fi', 'Máy lạnh', 'Máy nước nóng', 'Máy giặt', 'Tủ lạnh',
            'Bếp', 'WC riêng', 'Chỗ để xe', 'Bảo vệ', 'Giờ giấc tự do',
        ];

        foreach ($names as $name) {
            Amenity::create(['name' => $name]);
        }
    }
}
