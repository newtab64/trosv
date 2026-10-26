<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Query-path indexes (Postgres does NOT auto-index the local column of a FK)
 * and json -> jsonb promotion for the message JSON columns.
 *
 * Index rationale (measured against actual query patterns):
 * - conversations(student_id), conversations(landlord_id): every
 *   GET /api/conversations resolves the caller's conversations by one of
 *   these columns (unionAll in ConversationController::index). Previously
 *   sequential scans.
 * - favorites(listing_id): listing-side favorite lookups and the ON DELETE
 *   CASCADE scan when a landlord deletes a listing. The user side is already
 *   covered by the (user_id, listing_id) PK.
 * Deliberately NOT added (no query uses them, parents are never deleted):
 * messages(sender_id), reviews(student_id).
 *
 * jsonb rationale: API_CONTRACT treats both columns as opaque JSON objects,
 * so the wire format is unchanged. jsonb gives binary storage and supports
 * JSON operators/indexes if message queries ever filter on them. No GIN
 * indexes yet: no server-side query filters on these columns (membership
 * checks ride the (conversation_id, id) path).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->index('student_id');
            $table->index('landlord_id');
        });

        Schema::table('favorites', function (Blueprint $table) {
            $table->index('listing_id');
        });

        // pgsql-only app (phpunit.xml forces the pgsql connection) - plain DDL.
        DB::statement('ALTER TABLE messages ALTER COLUMN reactions TYPE jsonb USING reactions::jsonb');
        DB::statement(
            'ALTER TABLE messages ALTER COLUMN deleted_for_user_ids TYPE jsonb USING deleted_for_user_ids::jsonb'
        );
    }

    public function down(): void
    {
        Schema::table('favorites', function (Blueprint $table) {
            $table->dropIndex(['listing_id']);
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->dropIndex(['student_id']);
            $table->dropIndex(['landlord_id']);
        });

        DB::statement('ALTER TABLE messages ALTER COLUMN reactions TYPE json USING reactions::json');
        DB::statement(
            'ALTER TABLE messages ALTER COLUMN deleted_for_user_ids TYPE json USING deleted_for_user_ids::json'
        );
    }
};
