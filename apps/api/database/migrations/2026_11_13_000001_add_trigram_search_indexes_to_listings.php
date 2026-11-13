<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// ILIKE '%q%' in ListingFilterService cannot use a B-tree index; trigram GIN can.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        DB::statement('CREATE INDEX IF NOT EXISTS listings_title_trgm ON listings USING gin (title gin_trgm_ops)');
        DB::statement('CREATE INDEX IF NOT EXISTS listings_address_trgm ON listings USING gin (address gin_trgm_ops)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS listings_title_trgm');
        DB::statement('DROP INDEX IF EXISTS listings_address_trgm');
    }
};
