<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Dấu đã xem: thời điểm NGƯỜI NHẬN đọc tin (người gửi để null).
        // Receiver cập nhật cột này khi markRead; sender hiển thị "Đã xem".
        Schema::table('messages', function (Blueprint $table) {
            $table->timestamp('seen_at')->nullable()->after('read_at');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn('seen_at');
        });
    }
};
