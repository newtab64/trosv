<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversation_listing', function (Blueprint $table) {
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('listing_id')->constrained()->cascadeOnDelete();
            $table->primary(['conversation_id', 'listing_id']);
            $table->index('listing_id');
        });

        // Preserve the known room context of conversations created before this migration.
        DB::table('conversation_listing')->insertUsing(
            ['conversation_id', 'listing_id'],
            DB::table('conversations')->select('id', 'listing_id')->whereNotNull('listing_id'),
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('conversation_listing');
    }
};
