<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Merge any duplicate conversations between the same two users
        $duplicates = DB::select('
            SELECT LEAST(student_id, landlord_id) AS user_a,
                   GREATEST(student_id, landlord_id) AS user_b,
                   ARRAY_AGG(id ORDER BY id ASC) AS ids
            FROM conversations
            GROUP BY LEAST(student_id, landlord_id), GREATEST(student_id, landlord_id)
            HAVING COUNT(*) > 1
        ');

        foreach ($duplicates as $dup) {
            // Parse array of ids (e.g. {1,8,9} from PostgreSQL)
            $raw = trim($dup->ids, '{}');
            $ids = array_map('intval', explode(',', $raw));
            if (count($ids) > 1) {
                $primaryId = array_shift($ids);
                // Reassign messages to primary conversation
                DB::table('messages')
                    ->whereIn('conversation_id', $ids)
                    ->update(['conversation_id' => $primaryId]);
                // Delete duplicate conversation rows
                DB::table('conversations')
                    ->whereIn('id', $ids)
                    ->delete();
            }
        }

        // 2. Drop old listing-specific and partial direct unique constraints/indexes if they exist
        DB::statement('ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_listing_id_student_id_unique');
        DB::statement('DROP INDEX IF EXISTS conversations_listing_id_student_id_unique');
        DB::statement('DROP INDEX IF EXISTS conversations_direct_unique');

        // 3. Create unique index across the pair of users
        DB::statement('
            CREATE UNIQUE INDEX conversations_user_pair_unique
            ON conversations (LEAST(student_id, landlord_id), GREATEST(student_id, landlord_id))
        ');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS conversations_user_pair_unique');

        DB::statement('
            CREATE UNIQUE INDEX conversations_listing_id_student_id_unique
            ON conversations (listing_id, student_id)
        ');
    }
};
