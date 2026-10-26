<?php

namespace Database\Factories;

use App\Models\Amenity;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Amenity>
 */
class AmenityFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->randomElement([
                'Wi-Fi', 'Máy lạnh', 'Máy nước nóng', 'Máy giặt', 'Tủ lạnh',
                'Bếp', 'WC riêng', 'Chỗ để xe', 'Bảo vệ', 'Giờ giấc tự do',
                'Ban công', 'Cửa sổ',
            ]),
        ];
    }
}
