<?php

namespace App\Modules\Listing\Models;

use App\Modules\Auth\Models\User;
use App\Modules\Listing\Policies\ListingPolicy;
use App\Modules\Messaging\Models\Conversation;
use App\Modules\Reference\Models\Amenity;
use App\Modules\Reference\Models\Ward;
use App\Shared\Support\GeoQuery;
use Database\Factories\ListingFactory;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int $ward_id
 * @property string $title
 * @property string|null $description
 * @property string $type
 * @property int $price
 * @property string $area_m2
 * @property string $address
 * @property string $latitude
 * @property string $longitude
 * @property string $status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property float|int|string|null $reviews_avg_listing_rating Set by withAvg('reviews', 'listing_rating')
 * @property float|int|string|null $distance_km Set by scopeNearby()
 */
#[UseFactory(ListingFactory::class)]
#[UsePolicy(ListingPolicy::class)]
class Listing extends Model
{
    /** @use HasFactory<ListingFactory> */
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

    /** @return BelongsTo<User, $this> */
    public function landlord(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** @return BelongsTo<Ward, $this> */
    public function ward(): BelongsTo
    {
        return $this->belongsTo(Ward::class);
    }

    /**
     * Amenities of this listing (pivot table amenity_listing).
     *
     * @return BelongsToMany<Amenity, $this>
     */
    public function amenities(): BelongsToMany
    {
        return $this->belongsToMany(Amenity::class, 'amenity_listing');
    }

    /** @return HasMany<ListingImage, $this> */
    public function images(): HasMany
    {
        return $this->hasMany(ListingImage::class);
    }

    /**
     * Cover image = the image with the smallest id (ERD §3).
     *
     * @return HasMany<ListingImage, $this>
     */
    public function coverImage(): HasMany
    {
        return $this->hasMany(ListingImage::class)->orderBy('id')->limit(1);
    }

    /** @return HasMany<Conversation, $this> */
    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    /** @return BelongsToMany<Conversation, $this> */
    public function contactedConversations(): BelongsToMany
    {
        return $this->belongsToMany(Conversation::class, 'conversation_listing');
    }

    /** Shared chat for a student who contacted this particular room. */
    public function conversationIdForStudent(int $studentId): ?int
    {
        $id = $this->contactedConversations()
            ->where('student_id', $studentId)
            ->where('landlord_id', $this->user_id)
            ->value('conversations.id')
            // Older records and seed data may only have the current room link.
            ?? $this->conversations()
                ->where('student_id', $studentId)
                ->where('landlord_id', $this->user_id)
                ->value('id');

        return is_numeric($id) ? (int) $id : null;
    }

    /**
     * Students who favorited this listing (pivot table favorites).
     *
     * @return BelongsToMany<User, $this>
     */
    public function favoritedBy(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'favorites')->withTimestamps();
    }

    /** @return HasMany<Review, $this> */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /**
     * Scope: public listings only.
     *
     * @param  Builder<Listing>  $query
     * @return Builder<Listing>
     */
    public function scopeVisible(Builder $query): Builder
    {
        return $query->where('status', '!=', self::STATUS_HIDDEN);
    }

    /**
     * Scope: add a `distance_km` select from the given point, optionally
     * filtering to listings within $maxKm.
     *
     * @param  Builder<Listing>  $query
     * @return Builder<Listing>
     */
    public function scopeNearby(Builder $query, float $latitude, float $longitude, ?float $maxKm = null): Builder
    {
        return GeoQuery::applyDistance($query, $latitude, $longitude, $maxKm);
    }
}
