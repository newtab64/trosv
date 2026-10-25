<?php

namespace App\Support;

class Geo
{
    /** Earth mean radius in kilometers. */
    public const EARTH_RADIUS_KM = 6371;

    /**
     * Calculate great-circle distance between two coordinates in kilometers using Haversine formula.
     */
    public static function haversineKm(float $lat1, float $lon1, float $lat2, float $lon2, int $precision = 2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;

        return round(self::EARTH_RADIUS_KM * 2 * asin(min(1.0, sqrt($a))), $precision);
    }
}
