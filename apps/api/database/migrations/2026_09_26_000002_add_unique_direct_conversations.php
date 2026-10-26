<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Direct conversations (listing_id NULL) previously had NO database-level
 * uniqueness: Postgres unique indexes treat NULLs as distinct, so two
 * simultaneous POST /users/{id}/message calls could both miss the
 * firstOrCreate lookup and insert duplicate rows. This expression index
 * closes the gap; the controller catches the violation and re-reads the
 * winner's row.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Expression (partial) index - PostgreSQL 9.0+. Functionally
        // equivalent options exist on MySQL 8 (functional index) and
        // MariaDB 10.0.5+; the demo/CI stack is Postgres 16.
        DB::statement(
            'CREATE UNIQUE INDEX IF NOT EXISTS conversations_direct_unique '.
            'ON conversations (student_id, landlord_id) '.
            'WHERE listing_id IS NULL'
        );
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS conversations_direct_unique');
    }
};
