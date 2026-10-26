<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('listings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();      // landlord
            $table->foreignId('ward_id')->constrained('wards')->cascadeOnDelete();
            $table->string('title', 200);
            $table->text('description')->nullable();
            $table->string('type', 20);                        // room | apartment | house
            $table->unsignedInteger('price');                  // VND/month, 100000..100000000
            $table->decimal('area_m2', 6, 1);
            $table->string('address', 300);
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->string('status', 20)->default('available'); // available | rented | hidden
            $table->timestamps();

            $table->index(['status', 'price']);
            $table->index('ward_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('listings');
    }
};
