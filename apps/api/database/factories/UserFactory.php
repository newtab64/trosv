<?php

namespace Database\Factories;

use App\Models\School;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * 'role' is deliberately NOT fillable (step 10 security - no endpoint
     * may change roles via mass assignment). The factory is the one place
     * that legitimately sets it: default "student", or the role passed by
     * the landlord() state / inline overrides.
     */
    public function newModel(array $attributes = []): User
    {
        $model = parent::newModel($attributes);
        $model->forceFill(['role' => $attributes['role'] ?? User::ROLE_STUDENT]);

        return $model;
    }

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // Note: the users table (ERD §3) has no email_verified_at column.
        // Role is handled in newModel() - see above.
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * A student with a fully filled profile.
     */
    public function student(): static
    {
        return $this->state(fn () => [
            'school_id' => School::factory(),
            'budget_min' => 1_500_000,
            'budget_max' => 3_000_000,
            'sleep_schedule' => 'normal',
            'cleanliness' => 4,
            'smoking' => false,
            'personality' => 'introvert',
            'interests' => 'music,gym',
            'looking_for_roommate' => true,
        ]);
    }

    /**
     * A landlord (student-only fields stay null).
     */
    public function landlord(): static
    {
        return $this->state(fn () => [
            'role' => User::ROLE_LANDLORD,
        ]);
    }
}
