<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Hội thoại trực tiếp giữa sinh viên (từ hồ sơ công khai) không có tin đăng:
// listing_id trở thành nullable. Hàng "trả tin về tin đăng" giữ nguyên
// unique (listing_id, student_id) - NULL không tham gia unique ở Postgres/MySQL.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropForeign(['listing_id']);
            $table->unsignedBigInteger('listing_id')->nullable()->change();
            $table->foreign('listing_id')
                ->references('id')->on('listings')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropForeign(['listing_id']);
            $table->unsignedBigInteger('listing_id')->nullable(false)->change();
            $table->foreign('listing_id')
                ->references('id')->on('listings')
                ->cascadeOnDelete();
        });
    }
};
