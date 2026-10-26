<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Bảng đơn vị hành chính cấp tỉnh (34 tỉnh/TP theo Nghị quyết 202/2025/QH15,
// hiệu lực 12/6/2025: 6 thành phố trực thuộc TW + 28 tỉnh).
// wards và schools tham chiếu city_id để lọc cascade City -> Ward/School.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cities', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('type', 20); // 'city' (TP trực thuộc TW) | 'province' (tỉnh)
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
        });

        Schema::table('wards', function (Blueprint $table) {
            $table->foreignId('city_id')->nullable()->after('id')
                ->constrained('cities')->nullOnDelete();
        });

        Schema::table('schools', function (Blueprint $table) {
            $table->foreignId('city_id')->nullable()->after('id')
                ->constrained('cities')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->dropConstrainedForeignId('city_id');
        });
        Schema::table('wards', function (Blueprint $table) {
            $table->dropConstrainedForeignId('city_id');
        });
        Schema::dropIfExists('cities');
    }
};
