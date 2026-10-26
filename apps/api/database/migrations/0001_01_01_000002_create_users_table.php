<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('email')->unique();
            $table->string('password');
            $table->string('role', 20); // student | landlord
            $table->string('phone', 20)->nullable();
            $table->text('bio')->nullable();

            // Student-only profile fields (null for landlords).
            $table->foreignId('school_id')->nullable()->constrained('schools')->nullOnDelete();
            $table->unsignedInteger('budget_min')->nullable();
            $table->unsignedInteger('budget_max')->nullable();
            $table->string('sleep_schedule', 10)->nullable();  // early | normal | late
            $table->tinyInteger('cleanliness')->nullable();    // 1..5
            $table->boolean('smoking')->nullable();
            $table->string('personality', 15)->nullable();     // introvert | ambivert | extrovert
            $table->string('interests', 255)->nullable();      // comma-separated
            $table->boolean('looking_for_roommate')->default(false);

            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
