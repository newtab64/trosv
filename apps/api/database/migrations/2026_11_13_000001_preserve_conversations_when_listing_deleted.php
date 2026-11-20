<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropForeign(['listing_id']);
            // A shared chat can contain messages about several listings.
            $table->foreign('listing_id')
                ->references('id')->on('listings')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropForeign(['listing_id']);
            $table->foreign('listing_id')
                ->references('id')->on('listings')
                ->cascadeOnDelete();
        });
    }
};
