<?php

namespace Tests\Unit;

use App\Models\Listing;
use App\Support\Geo;
use PHPUnit\Framework\TestCase;

class GeoTest extends TestCase
{
    private function legacyHaversineKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;

        return round($earthRadius * 2 * asin(min(1.0, sqrt($a))), 2);
    }

    public function test_haversine_with_known_coordinates(): void
    {
        // Same point has distance 0.0
        $this->assertSame(0.0, Geo::haversineKm(10.8231, 106.6297, 10.8231, 106.6297));

        // Hanoi (21.0285, 105.8542) to Ho Chi Minh City (10.8231, 106.6297) ~ 1138 km
        $distance = Geo::haversineKm(21.0285, 105.8542, 10.8231, 106.6297);
        $this->assertGreaterThan(1135.0, $distance);
        $this->assertLessThan(1145.0, $distance);
        $this->assertSame(1137.8, $distance);

        // Listing DISTANCE_SQL references Geo::EARTH_RADIUS_KM
        $this->assertStringStartsWith('6371 * ACOS(', Listing::DISTANCE_SQL);
    }

    public function test_legacy_and_new_haversine_results_equal_for_twenty_sample_pairs(): void
    {
        $pairs = [
            // [lat1, lon1, lat2, lon2]
            [21.0285, 105.8542, 10.8231, 106.6297], // Hanoi - HCMC
            [10.7769, 106.7009, 10.7626, 106.6602], // District 1 - District 5 (HCMC)
            [16.0544, 108.2022, 10.8231, 106.6297], // Da Nang - HCMC
            [20.8449, 106.6881, 21.0285, 105.8542], // Hai Phong - Hanoi
            [10.0452, 105.7469, 10.8231, 106.6297], // Can Tho - HCMC
            [48.8566, 2.3522, 51.5074, -0.1278],    // Paris - London
            [35.6762, 139.6503, 37.5665, 126.9780], // Tokyo - Seoul
            [40.7128, -74.0060, 34.0522, -118.2437], // New York - Los Angeles
            [-33.8688, 151.2093, -37.8136, 144.9631], // Sydney - Melbourne
            [1.3521, 103.8198, 3.1390, 101.6869],  // Singapore - Kuala Lumpur
            [0.0, 0.0, 0.0, 1.0],                  // Equator 1 degree lon
            [0.0, 0.0, 1.0, 0.0],                  // Prime meridian 1 degree lat
            [-10.0, -20.0, 10.0, 20.0],            // Cross equator & prime meridian
            [21.0333, 105.8000, 21.0340, 105.8010], // Two close houses in Hanoi (~100m)
            [10.7500, 106.6500, 10.7510, 106.6510], // Two close houses in HCMC
            [55.7558, 37.6173, 59.9343, 30.3351],  // Moscow - St Petersburg
            [52.5200, 13.4050, 48.1351, 11.5820],  // Berlin - Munich
            [25.0330, 121.5654, 22.3193, 114.1694], // Taipei - Hong Kong
            [13.7563, 100.5018, 10.8231, 106.6297], // Bangkok - HCMC
            [12.2388, 109.1967, 11.9404, 108.4583], // Nha Trang - Da Lat
        ];

        $this->assertCount(20, $pairs);

        foreach ($pairs as $index => [$lat1, $lon1, $lat2, $lon2]) {
            $legacy = $this->legacyHaversineKm($lat1, $lon1, $lat2, $lon2);
            $new = Geo::haversineKm($lat1, $lon1, $lat2, $lon2);

            $this->assertSame(
                $legacy,
                $new,
                "Pair #{$index} failed parity: ({$lat1}, {$lon1}) to ({$lat2}, {$lon2})"
            );
        }
    }
}
