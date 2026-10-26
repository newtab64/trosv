<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Foreign key and composite query indexes for query optimization.
 *
 * Index rationale:
 * - listings(user_id): Landlord listing management (GET /api/my/listings) and
 *   foreign key cascade when a user is deleted.
 * - listings(ward_id, status): Compound index for ward-level queries filtering
 *   on visibility/availability (AI area suggestions and browse).
 * - reviews(student_id): Speeds up review lookups and duplicate checks by student.
 * - schools(ward_id): Foreign key index on the nullable ward_id added in 2026_09_29.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('listings', function (Blueprint $table) {
            $table->index('user_id');
            $table->index(['ward_id', 'status']);
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->index('student_id');
        });

        Schema::table('schools', function (Blueprint $table) {
            $table->index('ward_id');
        });
    }

    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->dropIndex(['ward_id']);
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->dropIndex(['student_id']);
        });

        Schema::table('listings', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
            $table->dropIndex(['ward_id', 'status']);
        });
    }
};
