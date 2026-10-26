<?php

namespace Database\Factories;

use App\Models\Listing;
use App\Models\User;
use App\Models\Ward;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Listing>
 */
class ListingFactory extends Factory
{
    public function definition(): array
    {
        // Coordinates anywhere in Vietnam (roughly 8.2N..23.4N, 102.1E..109.5E).
        return [
            'user_id' => User::factory()->landlord(),
            'ward_id' => Ward::factory(),
            'title' => 'Phòng trọ '.fake()->unique()->numberBetween(1, 999).' gần trường',
            'description' => fake()->sentence(),
            'type' => fake()->randomElement(['room', 'apartment', 'house']),
            'price' => fake()->numberBetween(1_500_000, 6_000_000),
            'area_m2' => fake()->numberBetween(15, 60),
            'address' => fake()->streetAddress(),
            'latitude' => fake()->latitude(8.20, 23.40),
            'longitude' => fake()->longitude(102.10, 109.50),
            'status' => Listing::STATUS_AVAILABLE,
        ];
    }
}
