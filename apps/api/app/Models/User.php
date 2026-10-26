<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    // role values
    public const ROLE_STUDENT = 'student';

    public const ROLE_LANDLORD = 'landlord';

    // sleep_schedule values
    public const SLEEP_EARLY = 'early';

    public const SLEEP_NORMAL = 'normal';

    public const SLEEP_LATE = 'late';

    // personality values
    public const PERSONALITY_INTROVERT = 'introvert';

    public const PERSONALITY_AMBIVERT = 'ambivert';

    public const PERSONALITY_EXTROVERT = 'extrovert';

    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'bio',
        'school_id',
        'budget_min',
        'budget_max',
        'sleep_schedule',
        'cleanliness',
        'smoking',
        'personality',
        'interests',
        'looking_for_roommate',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'smoking' => 'boolean',
            'looking_for_roommate' => 'boolean',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    /** Listings posted by this user (landlord). */
    public function listings(): HasMany
    {
        return $this->hasMany(Listing::class);
    }

    /** Listings favorited by this user (pivot keeps saved-at timestamps). */
    public function favorites(): BelongsToMany
    {
        return $this->belongsToMany(Listing::class, 'favorites')->withTimestamps()->withPivot('created_at');
    }

    /** Conversations where this user is the student. */
    public function studentConversations(): HasMany
    {
        return $this->hasMany(Conversation::class, 'student_id');
    }

    /** Conversations where this user is the landlord. */
    public function landlordConversations(): HasMany
    {
        return $this->hasMany(Conversation::class, 'landlord_id');
    }

    /** Messages sent by this user. */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class, 'sender_id');
    }

    /** Reviews written by this user (student). */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class, 'student_id');
    }
}
