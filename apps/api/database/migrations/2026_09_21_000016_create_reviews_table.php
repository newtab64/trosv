<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('listing_id')->constrained('listings')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->tinyInteger('listing_rating');  // 1..5
            $table->tinyInteger('landlord_rating'); // 1..5
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->unique(['listing_id', 'student_id']); // one review per student per listing
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
