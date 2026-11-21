<?php

namespace Tests\Feature\Seeders;

use App\Modules\Listing\Models\Listing;
use App\Modules\Reference\Models\School;
use App\Shared\Support\Geo;
use Database\Seeders\AmenitySeeder;
use Database\Seeders\CitySeeder;
use Database\Seeders\ListingSeeder;
use Database\Seeders\SchoolSeeder;
use Database\Seeders\UserSeeder;
use Database\Seeders\WardSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ListingSeederPhotosTest extends TestCase
{
    use RefreshDatabase;

    private function seedListings(): void
    {
        Storage::fake('public');
        $this->seed([CitySeeder::class, WardSeeder::class, SchoolSeeder::class, AmenitySeeder::class, UserSeeder::class, ListingSeeder::class]);
    }

    public function test_seeds_the_22_real_rooms_split_by_city(): void
    {
        $this->seedListings();

        $byCity = Listing::with('ward.city')->get()->groupBy(fn (Listing $l) => $l->ward?->city?->name)->map->count();
        $this->assertEquals(['Hà Nội' => 7, 'Đà Nẵng' => 7, 'TP.HCM' => 8], $byCity->all());
        $this->assertSame(22, Listing::count());
    }

    public function test_every_room_shows_all_photos_of_its_folder_as_webp(): void
    {
        $this->seedListings();

        $listings = Listing::with('images')->orderBy('id')->get();
        foreach ($listings as $i => $listing) {
            $folder = database_path(sprintf('seeders/images/rooms/%02d', $i + 1));
            $sources = glob("$folder/*.webp") ?: [];
            sort($sources, SORT_NATURAL);
            $this->assertGreaterThanOrEqual(3, count($sources));
            $this->assertCount(count($sources), $listing->images, "listing {$listing->id}");
            foreach ($listing->images->sortBy('id')->values() as $k => $image) {
                $this->assertStringEndsWith('.webp', $image->path);
                $this->assertSame(file_get_contents($sources[$k]), Storage::disk('public')->get($image->path));
            }
        }
    }

    public function test_description_matches_address_and_the_room_sits_near_its_school(): void
    {
        $this->seedListings();

        foreach (Listing::with('ward.city')->get() as $listing) {
            $this->assertStringContainsString($listing->address, (string) $listing->description);
            $this->assertStringContainsString((string) $listing->ward?->name, $listing->address);
            $this->assertStringContainsString((string) $listing->ward?->city?->name, $listing->address);

            $school = School::where('city_id', $listing->ward?->city_id)->get()
                ->first(fn (School $s) => str_contains((string) $listing->description, $s->name));
            $this->assertNotNull($school, "listing {$listing->id} names no school of its city");
            $km = Geo::haversineKm((float) $listing->latitude, (float) $listing->longitude, (float) $school->latitude, (float) $school->longitude);
            $this->assertLessThan(1.5, $km, "listing {$listing->id} is {$km} km from {$school->name}");
            $this->assertSame($school->ward_id, $listing->ward_id, "listing {$listing->id} not in its school's ward");
        }
    }
}
