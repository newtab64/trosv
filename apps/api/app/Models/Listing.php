<?php

namespace App\Models;

use App\Support\Geo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Listing extends Model
{
    use HasFactory;

    // type values
    public const TYPE_ROOM = 'room';

    public const TYPE_APARTMENT = 'apartment';

    public const TYPE_HOUSE = 'house';

    // status values
    public const STATUS_AVAILABLE = 'available';

    public const STATUS_RENTED = 'rented';

    public const STATUS_HIDDEN = 'hidden';

    protected $fillable = [
        'user_id',
        'ward_id',
        'title',
        'description',
        'type',
        'price',
        'area_m2',
        'address',
        'latitude',
        'longitude',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'integer',
            'area_m2' => 'decimal:1',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
        ];
    }

    public function landlord(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function ward(): BelongsTo
    {
        return $this->belongsTo(Ward::class);
    }

    /** Amenities of this listing (pivot table amenity_listing). */
    public function amenities(): BelongsToMany
    {
        return $this->belongsToMany(Amenity::class, 'amenity_listing');
    }

    public function images(): HasMany
    {
        return $this->hasMany(ListingImage::class);
    }

    /** Cover image = the image with the smallest id (ERD §3). */
    public function coverImage(): HasMany
    {
        return $this->hasMany(ListingImage::class)->orderBy('id')->limit(1);
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    /** Students who favorited this listing (pivot table favorites). */
    public function favoritedBy(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'favorites')->withTimestamps();
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /**
     * Haversine distance (km) between a point and listings - PostgreSQL
     * flavor from ERD §4 (parameters must be CAST to float8; placeholder
     * order: point lat, point lng, point lat).
     */
    public const DISTANCE_SQL =
        Geo::EARTH_RADIUS_KM.' * ACOS(LEAST(1, COS(RADIANS(CAST(? AS float8))) * COS(RADIANS(latitude)) * '
        .'COS(RADIANS(longitude) - RADIANS(CAST(? AS float8))) + '
        .'SIN(RADIANS(CAST(? AS float8))) * SIN(RADIANS(latitude))))';

    /** Scope: public listings only. */
    public function scopeVisible(Builder $query): Builder
    {
        return $query->where('status', '!=', self::STATUS_HIDDEN);
    }

    /**
     * Scope: add a `distance_km` select from the given point, optionally
     * filtering to listings within $maxKm. Callers can `orderBy('distance_km')`
     * afterwards. Bindings follow the placeholder order in DISTANCE_SQL;
     * 'select' bindings are flattened BEFORE 'where' bindings by the query
     * builder, matching the placeholder order in the SQL above.
     */
    public function scopeNearby(Builder $query, float $latitude, float $longitude, ?float $maxKm = null): Builder
    {
        $bindings = [$latitude, $longitude, $latitude];

        $query->addSelect(DB::raw(self::DISTANCE_SQL.' AS distance_km'));
        $query->addBinding($bindings, 'select');

        if ($maxKm !== null) {
            $query->whereRaw(self::DISTANCE_SQL.' <= ?', array_merge($bindings, [$maxKm]));
        }

        return $query;
    }
}
