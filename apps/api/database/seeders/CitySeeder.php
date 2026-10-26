<?php

namespace Database\Seeders;

use App\Models\City;
use Illuminate\Database\Seeder;

class CitySeeder extends Seeder
{
    public function run(): void
    {
        // 3 thành phố trọng điểm theo yêu cầu: Hà Nội, TP.HCM, Đà Nẵng
        $cities = [
            [
                'name' => 'TP.HCM',
                'type' => City::TYPE_CITY,
                'latitude' => 10.7769,
                'longitude' => 106.7009,
            ],
            [
                'name' => 'Hà Nội',
                'type' => City::TYPE_CITY,
                'latitude' => 21.0285,
                'longitude' => 105.8542,
            ],
            [
                'name' => 'Đà Nẵng',
                'type' => City::TYPE_CITY,
                'latitude' => 16.0545,
                'longitude' => 108.2022,
            ],
        ];

        foreach ($cities as $city) {
            City::create($city);
        }
    }
}
