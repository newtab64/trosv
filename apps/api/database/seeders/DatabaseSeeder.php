<?php

namespace Database\Seeders;

use App\Models\City;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Idempotent for the demo boot command: docker-compose.demo.yml runs
        // `db:seed --force` on EVERY backend container start, not just first
        // boot. Reference rows (cities) exist only after a completed seed, so
        // skip instead of duplicating the whole demo dataset. `php artisan
        // migrate:fresh --seed` still seeds fully (a fresh DB has no cities).
        // If a seed ever crashes halfway, recover with:
        //   php artisan migrate:fresh --seed --force
        if (City::exists()) {
            $this->command?->info('DatabaseSeeder skipped - data already present (idempotent demo boot).');

            return;
        }

        $this->call([
            CitySeeder::class,
            WardSeeder::class,
            SchoolSeeder::class,
            AmenitySeeder::class,
            UserSeeder::class,
            ListingSeeder::class,
            ConversationSeeder::class,
            ReviewSeeder::class,
        ]);
    }
}
