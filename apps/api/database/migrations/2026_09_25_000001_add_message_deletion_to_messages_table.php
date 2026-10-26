<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            // Unsend-for-everyone: body/attachment replaced by the tombstone
            // at UI level; sender can never unsend twice.
            $table->timestamp('deleted_at')->nullable()->after('read_at');
            // Facebook "delete for me": per-viewer hidden rows (JSON int array).
            $table->json('deleted_for_user_ids')->nullable()->after('deleted_at');
            $table->index('deleted_at');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex(['deleted_at']);
            $table->dropColumn(['deleted_at', 'deleted_for_user_ids']);
        });
    }
};
