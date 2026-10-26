<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Moi truong gan 1 phuong (nullable: cac truong ngoai TP.HCM chua
        // rang buoc). Phai dung nullOnDelete - mat phuong khong duoc mat
        // truong. Helper loc phong gan truong doc cot nay truc tiep.
        Schema::table('schools', function (Blueprint $table) {
            $table->foreignId('ward_id')
                ->nullable()
                ->after('city_id')
                ->constrained('wards')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->dropConstrainedForeignId('ward_id');
        });
    }
};
