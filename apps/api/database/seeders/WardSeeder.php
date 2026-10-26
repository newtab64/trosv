<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\Ward;
use Illuminate\Database\Seeder;

class WardSeeder extends Seeder
{
    public function run(): void
    {
        $wardsByCity = [
            'Hà Nội' => [
                ['name' => 'Phường Dịch Vọng Hậu',  'latitude' => 21.0336, 'longitude' => 105.7865],
                ['name' => 'Phường Bách Khoa',       'latitude' => 21.0050, 'longitude' => 105.8450],
                ['name' => 'Phường Đồng Tâm',        'latitude' => 20.9980, 'longitude' => 105.8420],
                ['name' => 'Phường Láng Thượng',     'latitude' => 21.0230, 'longitude' => 105.8050],
                ['name' => 'Phường Trung Liệt',      'latitude' => 21.0110, 'longitude' => 105.8230],
                ['name' => 'Phường Quang Trung',     'latitude' => 21.0120, 'longitude' => 105.8270],
                ['name' => 'Phường Mai Dịch',        'latitude' => 21.0400, 'longitude' => 105.7760],
                ['name' => 'Phường Phan Chu Trinh',  'latitude' => 21.0210, 'longitude' => 105.8560],
                ['name' => 'Phường Đức Thắng',       'latitude' => 21.0770, 'longitude' => 105.7760],
                ['name' => 'Phường Mộ Lao',          'latitude' => 20.9840, 'longitude' => 105.7860],
                ['name' => 'Phường Thanh Xuân Bắc',  'latitude' => 20.9960, 'longitude' => 105.7980],
                ['name' => 'Phường Thanh Xuân Trung', 'latitude' => 20.9970, 'longitude' => 105.8080],
                ['name' => 'Phường Minh Khai',       'latitude' => 21.0530, 'longitude' => 105.7350],
                ['name' => 'Phường Quan Hoa',        'latitude' => 21.0350, 'longitude' => 105.8010],
                ['name' => 'Phường Nghĩa Tân',       'latitude' => 21.0425, 'longitude' => 105.7930],
            ],
            'TP.HCM' => [
                ['name' => 'Phường Diên Hồng',       'latitude' => 10.7720, 'longitude' => 106.6580],
                ['name' => 'Phường Chợ Quán',        'latitude' => 10.7580, 'longitude' => 106.6780],
                ['name' => 'Phường Bến Nghé',        'latitude' => 10.7780, 'longitude' => 106.7020],
                ['name' => 'Phường Bến Thành',       'latitude' => 10.7713, 'longitude' => 106.6940],
                ['name' => 'Phường Linh Trung',      'latitude' => 10.8700, 'longitude' => 106.7860],
                ['name' => 'Phường Linh Xuân',       'latitude' => 10.8710, 'longitude' => 106.7790],
                ['name' => 'Phường Linh Chiểu',      'latitude' => 10.8520, 'longitude' => 106.7710],
                ['name' => 'Phường Võ Thị Sáu',      'latitude' => 10.7845, 'longitude' => 106.6920],
                ['name' => 'Phường Tân Phong',       'latitude' => 10.7310, 'longitude' => 106.7020],
                ['name' => 'Phường Thạnh Mỹ Tây',    'latitude' => 10.8030, 'longitude' => 106.7160],
                ['name' => 'Phường Bình Lợi Trung',  'latitude' => 10.8180, 'longitude' => 106.6960],
                ['name' => 'Phường Xóm Chiếu',       'latitude' => 10.7650, 'longitude' => 106.7030],
                ['name' => 'Phường Hạnh Thông',      'latitude' => 10.8220, 'longitude' => 106.6870],
                ['name' => 'Phường Chợ Lớn',         'latitude' => 10.7548, 'longitude' => 106.6636],
                ['name' => 'Phường Tân Hưng',        'latitude' => 10.7420, 'longitude' => 106.6950],
                ['name' => 'Phường Thảo Điền',       'latitude' => 10.8060, 'longitude' => 106.7320],
                ['name' => 'Phường Đa Kao',          'latitude' => 10.7917, 'longitude' => 106.6930],
            ],
            'Đà Nẵng' => [
                ['name' => 'Phường Hòa Khánh Bắc', 'latitude' => 16.0750, 'longitude' => 108.1530],
                ['name' => 'Phường Hòa Khánh Nam', 'latitude' => 16.0610, 'longitude' => 108.1580],
                ['name' => 'Phường Mỹ An',         'latitude' => 16.0480, 'longitude' => 108.2410],
                ['name' => 'Phường Khuê Trung',    'latitude' => 16.0280, 'longitude' => 108.2120],
                ['name' => 'Phường Thanh Bình',    'latitude' => 16.0790, 'longitude' => 108.2140],
                ['name' => 'Phường Hòa Quý',       'latitude' => 15.9810, 'longitude' => 108.2490],
                ['name' => 'Phường Thạc Gián',     'latitude' => 16.0610, 'longitude' => 108.2090],
                ['name' => 'Phường Hòa Cường Nam', 'latitude' => 16.0340, 'longitude' => 108.2190],
                ['name' => 'Phường Hòa Hải',       'latitude' => 15.9920, 'longitude' => 108.2580],
                ['name' => 'Phường Hải Châu',      'latitude' => 16.0680, 'longitude' => 108.2200],
                ['name' => 'Phường An Hải Đông',   'latitude' => 16.0630, 'longitude' => 108.2370],
                ['name' => 'Phường An Hải Bắc',    'latitude' => 16.0760, 'longitude' => 108.2370],
                ['name' => 'Phường Thanh Khê Tây', 'latitude' => 16.0660, 'longitude' => 108.1810],
            ],
        ];

        foreach ($wardsByCity as $cityName => $wards) {
            $city = City::where('name', $cityName)->first();
            if (! $city) {
                continue;
            }
            foreach ($wards as $ward) {
                Ward::create([
                    'city_id' => $city->id,
                    'name' => $ward['name'],
                    'latitude' => $ward['latitude'],
                    'longitude' => $ward['longitude'],
                ]);
            }
        }
    }
}
