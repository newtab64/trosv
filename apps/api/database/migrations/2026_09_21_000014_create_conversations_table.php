<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('listing_id')->constrained('listings')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('landlord_id')->constrained('users')->cascadeOnDelete(); // copied from listings.user_id
            $table->timestamps();

            $table->unique(['listing_id', 'student_id']); // one conversation per student per listing
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
