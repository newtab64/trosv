<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Messenger-style reactions: MỖI USER MỘT REACTION trên mỗi tin.
        // Lưu map { "userId": "emoji" } - 6 emoji chuẩn, đổi/bỏ qua PUT.
        Schema::table('messages', function (Blueprint $table) {
            $table->json('reactions')->nullable()->after('seen_at');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn('reactions');
        });
    }
};
