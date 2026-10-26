<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * API_CONTRACT §4 requires GET /favorites to list favorites "tin lưu gần
 * nhất trước" (most recently saved first), which needs saved-at timestamps
 * on the favorites pivot. The ERD does not specify them, so they are added
 * here (deviation from ERD §3, required by the API contract).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('favorites', function (Blueprint $table) {
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::table('favorites', function (Blueprint $table) {
            $table->dropTimestamps();
        });
    }
};
