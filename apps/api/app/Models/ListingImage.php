<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ListingImage extends Model
{
    public $timestamps = false;

    protected $fillable = ['listing_id', 'path'];

    public function listing(): BelongsTo
    {
        return $this->belongsTo(Listing::class);
    }
}
