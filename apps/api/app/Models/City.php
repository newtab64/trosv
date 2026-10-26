<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Đơn vị hành chính cấp tỉnh (34 tỉnh/TP sau sắp xếp 2025).
 */
class City extends Model
{
    use HasFactory;

    public const TYPE_CITY = 'city';       // thành phố trực thuộc TW

    public const TYPE_PROVINCE = 'province'; // tỉnh

    public $timestamps = false;

    protected $fillable = ['name', 'type', 'latitude', 'longitude'];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
        ];
    }

    public function wards(): HasMany
    {
        return $this->hasMany(Ward::class);
    }

    public function schools(): HasMany
    {
        return $this->hasMany(School::class);
    }
}
