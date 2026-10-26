<?php

namespace Tests\Feature;

use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_can_update_own_profile_fields(): void
    {
        $user = User::factory()->student()->create();

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/profile', [
            'name' => 'Tên Mới',
            'phone' => '0901112223',
            'bio' => 'Sinh viên năm 3.',
            'school_id' => School::factory()->create()->id,
            'budget_min' => 1_500_000,
            'budget_max' => 3_000_000,
            'sleep_schedule' => 'late',
            'cleanliness' => 4,
            'smoking' => false,
            'personality' => 'introvert',
            'interests' => 'music,gym',
            'looking_for_roommate' => true,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.name', 'Tên Mới')
            ->assertJsonPath('data.budget_min', 1500000)
            ->assertJsonPath('data.budget_max', 3000000)
            ->assertJsonPath('data.sleep_schedule', 'late')
            ->assertJsonPath('data.cleanliness', 4)
            ->assertJsonPath('data.interests', 'music,gym');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Tên Mới',
            'phone' => '0901112223',
            'sleep_schedule' => 'late',
            'looking_for_roommate' => true,
        ]);
    }

    public function test_profile_update_is_partial(): void
    {
        $user = User::factory()->student()->create([
            'name' => 'Tên Cũ',
            'bio' => 'Bio cũ.',
            'cleanliness' => 3,
        ]);

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/profile', ['cleanliness' => 5])
            ->assertOk()
            ->assertJsonPath('data.cleanliness', 5);

        // Untouched fields keep their old values.
        $this->assertSame('Tên Cũ', $user->fresh()->name);
        $this->assertSame('Bio cũ.', $user->fresh()->bio);
    }

    public function test_landlord_student_only_fields_are_dropped(): void
    {
        $landlord = User::factory()->create(['role' => 'landlord']);

        $response = $this->actingAs($landlord, 'sanctum')->putJson('/api/profile', [
            'name' => 'Chủ nhà',
            'phone' => '0909999999',
            // Student-only fields below must be ignored entirely.
            'school_id' => School::factory()->create()->id,
            'budget_min' => 1_000_000,
            'budget_max' => 2_000_000,
            'sleep_schedule' => 'late',
            'cleanliness' => 5,
            'smoking' => true,
            'personality' => 'extrovert',
            'interests' => 'music',
            'looking_for_roommate' => true,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.name', 'Chủ nhà')
            ->assertJsonPath('data.phone', '0909999999');

        $landlord->refresh();
        $this->assertNull($landlord->school_id);
        $this->assertNull($landlord->budget_min);
        $this->assertNull($landlord->budget_max);
        $this->assertNull($landlord->sleep_schedule);
        $this->assertNull($landlord->cleanliness);
        $this->assertFalse($landlord->looking_for_roommate);
    }

    public function test_budget_max_below_min_returns_422(): void
    {
        $user = User::factory()->student()->create([
            'budget_min' => 2_000_000,
            'budget_max' => 3_000_000,
        ]);

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/profile', ['budget_max' => 1_000_000])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['budget_max']);
    }

    public function test_budget_max_below_new_min_returns_422(): void
    {
        $user = User::factory()->student()->create();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/profile', ['budget_min' => 5_000_000, 'budget_max' => 2_000_000])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['budget_max']);
    }

    public function test_cleanliness_out_of_range_returns_422(): void
    {
        $user = User::factory()->student()->create();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/profile', ['cleanliness' => 6])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['cleanliness']);
    }

    public function test_invalid_sleep_schedule_returns_422(): void
    {
        $user = User::factory()->student()->create();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/profile', ['sleep_schedule' => 'whenever'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['sleep_schedule']);
    }

    public function test_unknown_school_id_returns_422(): void
    {
        $user = User::factory()->student()->create();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/profile', ['school_id' => 999])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['school_id']);
    }

    public function test_profile_requires_authentication(): void
    {
        $this->putJson('/api/profile', ['name' => 'X'])
            ->assertStatus(401)
            ->assertExactJson(['message' => 'Bạn chưa đăng nhập.']);
    }

    public function test_role_is_not_updatable_via_profile(): void
    {
        $user = User::factory()->student()->create();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/profile', ['role' => 'landlord', 'email' => 'hacked@example.com'])
            ->assertOk();

        $user->refresh();
        $this->assertSame('student', $user->role);
        $this->assertNotSame('hacked@example.com', $user->email);
    }
}
