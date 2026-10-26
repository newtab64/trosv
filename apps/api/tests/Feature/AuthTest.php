<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    // ------------------------------------------------------------------
    // POST /register
    // ------------------------------------------------------------------

    public function test_register_creates_student_and_returns_token_with_user(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Nguyễn Văn A',
            'email' => 'Student1@Example.com', // mixed case on purpose
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'student',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => ['token', 'user' => ['id', 'name', 'email', 'role']],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'student1@example.com', // stored lowercase
            'role' => 'student',
        ]);

        $user = User::where('email', 'student1@example.com')->first();
        $this->assertSame($user->id, $response->json('data.user.id'));

        // The token actually works.
        $this->withHeader('Authorization', 'Bearer '.$response->json('data.token'))
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'student1@example.com');
    }

    public function test_register_can_create_landlord(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Trần Thị B',
            'email' => 'landlord-new@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'landlord',
        ]);

        $response->assertStatus(201);
        $this->assertSame('landlord', $response->json('data.user.role'));

        // All student-only fields are null for landlords (API_CONTRACT §3).
        $this->assertNull($response->json('data.user.school_id'));
        $this->assertNull($response->json('data.user.budget_min'));
        $this->assertNull($response->json('data.user.budget_max'));
        $this->assertNull($response->json('data.user.sleep_schedule'));
        $this->assertNull($response->json('data.user.cleanliness'));
        $this->assertNull($response->json('data.user.smoking'));
        $this->assertNull($response->json('data.user.personality'));
        $this->assertNull($response->json('data.user.interests'));
        $this->assertNull($response->json('data.user.looking_for_roommate'));
    }

    public function test_register_student_defaults_looking_for_roommate_to_false(): void
    {
        // ERD: looking_for_roommate defaults to false (not null) for students.
        $response = $this->postJson('/api/register', [
            'name' => 'Sinh Viên',
            'email' => 'default-lfr@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'student',
        ]);

        $response->assertStatus(201);
        $this->assertFalse($response->json('data.user.looking_for_roommate'));
    }

    public function test_register_rejects_duplicate_email(): void
    {
        User::factory()->create(['email' => 'dup@example.com']);

        $this->postJson('/api/register', [
            'name' => 'Someone',
            'email' => 'dup@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'student',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_register_rejects_duplicate_email_ignoring_case(): void
    {
        // Emails are stored lowercase (ERD §3), so uniqueness is case-insensitive.
        User::factory()->create(['email' => 'dup@example.com']);

        $this->postJson('/api/register', [
            'name' => 'Someone Else',
            'email' => 'DUP@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'student',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_register_rejects_invalid_role(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Someone',
            'email' => 'role@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'admin',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['role']);
    }

    public function test_register_rejects_short_password(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Someone',
            'email' => 'shortpw@example.com',
            'password' => 'short',
            'password_confirmation' => 'short',
            'role' => 'student',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    // ------------------------------------------------------------------
    // POST /login
    // ------------------------------------------------------------------

    public function test_login_returns_token_and_user(): void
    {
        $user = User::factory()->student()->create([
            'email' => 'login@example.com',
            'password' => 'password123',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'LOGIN@example.com', // case-insensitive lookup
            'password' => 'password123',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['data' => ['token', 'user' => ['id', 'name', 'email', 'role']]]);
        $this->assertSame($user->id, $response->json('data.user.id'));
    }

    public function test_login_with_wrong_password_returns_422_on_email_key(): void
    {
        User::factory()->create(['email' => 'wrongpw@example.com', 'password' => 'password123']);

        $response = $this->postJson('/api/login', [
            'email' => 'wrongpw@example.com',
            'password' => 'totally-wrong',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
        $this->assertSame(
            ['Email hoặc mật khẩu không đúng.'],
            $response->json('errors.email'),
        );
    }

    public function test_login_with_unknown_email_returns_422_on_email_key(): void
    {
        $this->postJson('/api/login', [
            'email' => 'ghost@example.com',
            'password' => 'password123',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_login_is_throttled_to_10_per_minute(): void
    {
        $user = User::factory()->create(['password' => 'password123']);

        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/login', [
                'email' => $user->email,
                'password' => 'wrong-password',
            ])->assertStatus(422);
        }

        // The 11th attempt within the same minute is rate limited (429).
        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertStatus(429)
            ->assertExactJson(['message' => 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.']);
    }

    // ------------------------------------------------------------------
    // GET /me and POST /logout
    // ------------------------------------------------------------------

    public function test_me_returns_current_user(): void
    {
        $user = User::factory()->student()->create();

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/me');

        $response->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email', $user->email)
            ->assertJsonPath('data.role', 'student');
    }

    public function test_me_without_token_returns_401(): void
    {
        $this->getJson('/api/me')
            ->assertStatus(401)
            ->assertExactJson(['message' => 'Bạn chưa đăng nhập.']);
    }

    public function test_me_with_invalid_token_returns_401(): void
    {
        $this->withHeader('Authorization', 'Bearer nope')
            ->getJson('/api/me')
            ->assertStatus(401)
            ->assertExactJson(['message' => 'Bạn chưa đăng nhập.']);
    }

    public function test_logout_revokes_current_token(): void
    {
        $user = User::factory()->create();

        // Login to get a real token.
        $token = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->json('data.token');

        // Token works before logout.
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/me')->assertOk();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/logout')
            ->assertOk()
            ->assertExactJson(['data' => null]);

        // The token row must be gone from the database.
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $user->id,
        ]);

        // Simulate a fresh request: in a test the resolved guard instance is
        // reused across requests and caches the user, while in production
        // every HTTP request rebuilds the guard from scratch.
        $this->app->make('auth')->forgetGuards();

        // The same token no longer works after logout.
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/me')->assertStatus(401);
    }

    public function test_logout_without_token_returns_401(): void
    {
        $this->postJson('/api/logout')->assertStatus(401);
    }
}
