<?php

namespace Tests\Feature;

use App\Models\Amenity;
use App\Models\Listing;
use App\Models\School;
use App\Models\User;
use App\Models\Ward;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Step 9: AI proxy endpoints. All tests use Http::fake - the real AI
 * service is never contacted. Per PROMPTS.md: PII must never leave the
 * Backend, candidate filtering must be exact, stats computed in PHP,
 * count < 3 → 422, AI errors/invalid shapes → 503, wrong role → 403,
 * incomplete profile → 422.
 */
class AiProxyTest extends TestCase
{
    use RefreshDatabase;

    private User $student;

    private User $landlord;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = User::factory()->create(); // bare student, empty profile
        $this->landlord = User::factory()->landlord()->create();
    }

    private function completeProfile(User $student, array $overrides = []): User
    {
        $student->forceFill(array_merge([
            'school_id' => School::factory()->create()->id,
            'budget_min' => 1_500_000,
            'budget_max' => 3_000_000,
            'sleep_schedule' => 'normal',
            'cleanliness' => 4,
            'smoking' => false,
            'personality' => 'introvert',
            'interests' => 'music,gym',
            'looking_for_roommate' => true,
        ], $overrides))->save();

        return $student;
    }

    // ------------------------------------------------------------------
    // GET /users/{id} - public student profile (linked from Roommates)
    // ------------------------------------------------------------------

    public function test_public_student_profile_is_pii_safe(): void
    {
        $student = $this->completeProfile(User::factory()->create(), [
            'phone' => '0912345678',
        ]);

        $response = $this->getJson("/api/users/{$student->id}")
            ->assertOk();

        $data = $response->json('data');
        $this->assertSame($student->id, $data['id']);
        $this->assertSame(['music', 'gym'], $data['interests']);
        $this->assertArrayNotHasKey('email', $data);
        $this->assertArrayNotHasKey('phone', $data);

        // Landlord has no public profile (privacy by design).
        $this->getJson("/api/users/{$this->landlord->id}")->assertNotFound();
    }

    // ------------------------------------------------------------------
    // POST /ai/roommates
    // ------------------------------------------------------------------

    public function test_roommates_returns_ranked_candidates_without_pii_leak(): void
    {
        $this->completeProfile($this->student);

        $match = $this->completeProfile(User::factory()->create(), [
            'budget_min' => 2_000_000,
            'budget_max' => 3_500_000,
            'smoking' => false,
            'phone' => '0912345678',
            'interests' => 'music,reading',
        ]);

        // Trùng 2 sở thích (music + gym) - phải xếp trên $match dù AI cho score thấp hơn.
        $betterMatch = $this->completeProfile(User::factory()->create(), [
            'budget_min' => 2_000_000,
            'budget_max' => 3_500_000,
            'interests' => 'music,gym,reading',
        ]);

        $outOfBudget = $this->completeProfile(User::factory()->create(), [
            'budget_min' => 8_000_000,
            'budget_max' => 9_000_000,
        ]);

        $notLooking = $this->completeProfile(User::factory()->create(), [
            'looking_for_roommate' => false,
        ]);

        Http::fake([
            '*/roommates' => Http::response([
                // 999 is not a candidate id - must be dropped. 87 → out of
                // budget, 88 → not looking; neither may appear in results.
                'results' => [
                    // AI xếp $match trước - Backend phải đổi thứ tự theo interests_shared.
                    ['id' => $match->id, 'score' => 92, 'reason' => 'Cùng thích âm nhạc.'],
                    ['id' => $betterMatch->id, 'score' => 70, 'reason' => 'ok'],
                    ['id' => 999, 'score' => 99, 'reason' => 'fabricated'],
                    ['id' => $outOfBudget->id, 'score' => 88, 'reason' => 'nope'],
                    ['id' => $notLooking->id, 'score' => 87, 'reason' => 'nope'],
                ],
            ]),
        ]);

        $response = $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/ai/roommates')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        // betterMatch trùng 2 sở thích -> đầu tiên, dù AI cho score thấp hơn.
        $this->assertSame([
            $betterMatch->id,
            $match->id,
        ], array_column($response->json('data'), 'user_id'));

        $row = $response->json('data.1');
        $this->assertSame(92, $row['score']);
        $this->assertSame('Cùng thích âm nhạc.', $row['reason']);
        $this->assertSame(['music', 'reading'], $row['interests']);
        // Requester has music,gym; match has music,reading -> shared = music.
        $this->assertSame(['music'], $row['interests_shared']);
        $this->assertNotNull($row['name']);
        $this->assertNotNull($row['school']);
        $this->assertNotNull($row['phone']);

        // Payload sent to the AI service: no names, emails, phones.
        Http::assertSent(fn ($request) => ! str_contains($request->body(), $match->name)
            && ! str_contains($request->body(), $match->email)
            && ! str_contains($request->body(), (string) $match->phone));
    }

    public function test_roommates_requires_complete_profile(): void
    {
        $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/ai/roommates')
            ->assertStatus(422)
            ->assertJsonPath('message', 'Hãy hoàn thiện hồ sơ và bật tìm bạn cùng phòng.');
    }

    public function test_roommates_requires_looking_for_roommate(): void
    {
        $student = $this->completeProfile($this->student);
        $student->forceFill(['looking_for_roommate' => false])->save();

        $this->actingAs($student, 'sanctum')
            ->postJson('/api/ai/roommates')
            ->assertStatus(422)
            ->assertJsonPath('message', 'Hãy hoàn thiện hồ sơ và bật tìm bạn cùng phòng.');
    }

    // ------------------------------------------------------------------
    // POST /ai/price-advice
    // ------------------------------------------------------------------

    private function makeListingWithComparables(int $comparableCount): Listing
    {
        $ward = Ward::factory()->create();
        $listing = Listing::factory()->create([
            'user_id' => $this->landlord->id,
            'ward_id' => $ward->id,
            'type' => 'room',
            'price' => 2_500_000,
            'area_m2' => 20,
            'status' => 'available',
        ]);

        Listing::factory()->count($comparableCount)->create([
            'user_id' => $this->landlord->id,
            'ward_id' => $ward->id,
            'type' => 'room',
            'price' => 2_000_000,
            // 20 * 0.6 = 12 .. 20 * 1.4 = 28 - inside the comparable band.
            'area_m2' => 22,
            'status' => 'available',
        ]);

        return $listing;
    }

    public function test_price_advice_returns_ai_verdict_with_backend_stats(): void
    {
        $listing = $this->makeListingWithComparables(4);

        Http::fake([
            '*/price-advice' => Http::response([
                'verdict' => 'high',
                'fair_min' => 1_800_000,
                'fair_max' => 2_200_000,
                'tips' => ['Hỏi về giá khi thuê từ 6 tháng'],
                'message' => 'Chào anh/chị, em thấy mức giá hơi cao so với khu vực.',
            ]),
        ]);

        $response = $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/ai/price-advice', ['listing_id' => $listing->id])
            ->assertOk();

        $this->assertSame('high', $response->json('data.verdict'));
        $this->assertSame(2_500_000, $response->json('data.listing_price'));

        // Stats computed by Backend from the 4 comparables (all 2_000_000).
        $this->assertSame(4, $response->json('data.stats.count'));
        $this->assertSame(2_000_000, $response->json('data.stats.min'));
        $this->assertSame(2_000_000, $response->json('data.stats.median'));
        $this->assertSame(2_000_000, $response->json('data.stats.max'));

        // The listing itself must be excluded: count matches comparables only.
        Http::assertSent(function ($request) use ($listing) {
            $body = $request->data();

            return $body['listing']['price'] === 2_500_000
                && $body['listing']['ward'] === $listing->ward->name
                && $body['stats']['count'] === 4;
        });
    }

    public function test_price_advice_needs_three_comparables(): void
    {
        $listing = $this->makeListingWithComparables(2);

        $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/ai/price-advice', ['listing_id' => $listing->id])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Chưa đủ tin tương tự để so sánh giá.');
    }

    public function test_price_advice_stats_with_differently_priced_comparables_for_odd_and_even_counts(): void
    {
        Http::fake([
            '*/price-advice' => Http::response([
                'verdict' => 'fair',
                'fair_min' => 1_500_000,
                'fair_max' => 3_000_000,
                'tips' => [],
                'message' => 'Giá hợp lý.',
            ]),
        ]);

        // (a) Odd count: 5 comparables at different prices, inserted out of order
        $wardOdd = Ward::factory()->create();
        $listingOdd = Listing::factory()->create([
            'user_id' => $this->landlord->id,
            'ward_id' => $wardOdd->id,
            'type' => 'room',
            'price' => 2_500_000,
            'area_m2' => 20,
            'status' => 'available',
        ]);
        $oddPrices = [2_600_000, 1_500_000, 3_000_000, 1_800_000, 2_000_000];
        foreach ($oddPrices as $price) {
            Listing::factory()->create([
                'user_id' => $this->landlord->id,
                'ward_id' => $wardOdd->id,
                'type' => 'room',
                'price' => $price,
                'area_m2' => 22,
                'status' => 'available',
            ]);
        }

        $resOdd = $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/ai/price-advice', ['listing_id' => $listingOdd->id])
            ->assertOk();

        $this->assertSame(5, $resOdd->json('data.stats.count'));
        $this->assertSame(1_500_000, $resOdd->json('data.stats.min'));
        $this->assertSame(2_000_000, $resOdd->json('data.stats.median'));
        $this->assertSame(3_000_000, $resOdd->json('data.stats.max'));

        // (b) Even count: 4 comparables at different prices, inserted out of order
        $wardEven = Ward::factory()->create();
        $listingEven = Listing::factory()->create([
            'user_id' => $this->landlord->id,
            'ward_id' => $wardEven->id,
            'type' => 'room',
            'price' => 2_500_000,
            'area_m2' => 20,
            'status' => 'available',
        ]);
        $evenPrices = [2_500_000, 1_500_000, 2_100_000, 1_900_000];
        foreach ($evenPrices as $price) {
            Listing::factory()->create([
                'user_id' => $this->landlord->id,
                'ward_id' => $wardEven->id,
                'type' => 'room',
                'price' => $price,
                'area_m2' => 22,
                'status' => 'available',
            ]);
        }

        $resEven = $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/ai/price-advice', ['listing_id' => $listingEven->id])
            ->assertOk();

        $this->assertSame(4, $resEven->json('data.stats.count'));
        $this->assertSame(1_500_000, $resEven->json('data.stats.min'));
        $this->assertSame(2_000_000, $resEven->json('data.stats.median'));
        $this->assertSame(2_500_000, $resEven->json('data.stats.max'));
    }

    // ------------------------------------------------------------------
    // POST /ai/area-suggestions
    // ------------------------------------------------------------------

    public function test_area_suggestions_returns_stats_and_reasons(): void
    {
        $this->completeProfile($this->student);
        $school = School::factory()->create(['latitude' => 10.87, 'longitude' => 106.78]);
        $this->student->forceFill(['school_id' => $school->id])->save();

        $near = Ward::factory()->create(['latitude' => 10.87, 'longitude' => 106.78]);
        $far = Ward::factory()->create(['latitude' => 10.75, 'longitude' => 106.66]);

        $amenity = Amenity::factory()->create();
        Listing::factory()->count(3)->create([
            'user_id' => $this->landlord->id,
            'ward_id' => $near->id,
            'price' => 2_000_000,
            'status' => 'available',
        ]);
        $rated = Listing::factory()->create([
            'user_id' => $this->landlord->id,
            'ward_id' => $near->id,
            'price' => 2_200_000,
            'status' => 'available',
        ]);
        $rated->reviews()->create([
            'student_id' => $this->student->id,
            'listing_rating' => 5,
            'landlord_rating' => 5,
        ]);
        Listing::factory()->create([
            'user_id' => $this->landlord->id,
            'ward_id' => $far->id,
            'price' => 9_000_000, // outside budget - far ward has no in-budget listing
            'status' => 'available',
        ]);

        Http::fake([
            '*/areas' => Http::response([
                'results' => [
                    ['ward_id' => $near->id, 'reason' => 'Giá trung bình nằm trong ngân sách, gần trường.'],
                    ['ward_id' => 999, 'reason' => 'fabricated'],
                ],
            ]),
        ]);

        $response = $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/ai/area-suggestions')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $row = $response->json('data.0');
        $this->assertSame($near->id, $row['ward_id']);
        $this->assertSame($near->name, $row['name']);
        $this->assertSame('Giá trung bình nằm trong ngân sách, gần trường.', $row['reason']);
        $this->assertSame(4, $row['stats']['listings_count']);
        $this->assertEqualsWithDelta(5.0, $row['stats']['avg_rating'], 0.01);
        $this->assertEqualsWithDelta(0.0, $row['stats']['distance_to_school_km'], 0.5);

        // AI receives the full area rows including names (not personal data;
        // docs/contracts/AI_CONTRACT.md §4 includes 'name' in the request) and no PII.
        Http::assertSent(function ($request) use ($near) {
            $areas = $request->data()['areas'];

            return collect($areas)->every(fn ($area) => array_key_exists('name', $area))
                && $areas[0]['name'] === $near->name;
        });
    }

    public function test_area_suggestions_without_any_budget_returns_422(): void
    {
        $student = User::factory()->student()->create([
            'budget_min' => null,
            'budget_max' => null,
            'school_id' => null,
        ]);

        $this->actingAs($student, 'sanctum')
            ->postJson('/api/ai/area-suggestions')
            ->assertStatus(422);
    }

    // ------------------------------------------------------------------
    // POST /ai/chat
    // ------------------------------------------------------------------

    public function test_chat_sends_listing_context_when_provided(): void
    {
        $ward = Ward::factory()->create();
        $amenity = Amenity::factory()->create(['name' => 'Máy lạnh']);
        $listing = Listing::factory()->create([
            'user_id' => $this->landlord->id,
            'ward_id' => $ward->id,
            'price' => 2_500_000,
            'area_m2' => 22.5,
            'description' => 'Phòng đẹp gần trường.',
        ]);
        $listing->amenities()->sync([$amenity->id]);

        Http::fake([
            '*/chat' => Http::response(['reply' => 'Tiền cọc thường bằng 1-2 tháng tiền phòng.']),
        ]);

        $response = $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/ai/chat', [
                'message' => 'Nhà này còn phòng không?',
                'history' => [
                    ['role' => 'user', 'content' => 'Xin chào'],
                    ['role' => 'assistant', 'content' => 'Chào bạn!'],
                ],
                'listing_id' => $listing->id,
            ])->assertOk();

        $this->assertSame('Tiền cọc thường bằng 1-2 tháng tiền phòng.', $response->json('data.reply'));

        Http::assertSent(function ($request) use ($listing) {
            $body = $request->data();

            return $body['listing']['title'] === $listing->title
                && $body['listing']['ward'] === $listing->ward->name
                && $body['listing']['amenities'] === ['Máy lạnh']
                && count($body['history']) === 2;
        });
    }

    public function test_chat_without_listing_sends_null_context(): void
    {
        Http::fake(['*/chat' => Http::response(['reply' => 'Hỏi thêm nhé!'])]);

        $this->actingAs($this->landlord, 'sanctum')
            ->postJson('/api/ai/chat', ['message' => 'Tiền cọc thường là bao nhiêu?'])
            ->assertOk()
            ->assertJsonPath('data.reply', 'Hỏi thêm nhé!');

        Http::assertSent(fn ($request) => $request->data()['listing'] === null);
    }

    public function test_chat_rejects_oversized_history_content(): void
    {
        // Audit run 2: history.*.content had no size cap, so each of the 10
        // allowed turns could be arbitrarily large (bounded only by
        // post_max_size) and was forwarded verbatim to the shared AI service
        // - an input-amplification vector for resource exhaustion.
        Http::fake(['*/chat' => Http::response(['reply' => 'ok'])]);

        $this->actingAs($this->landlord, 'sanctum')
            ->postJson('/api/ai/chat', [
                'message' => 'hi',
                'history' => [
                    ['role' => 'user', 'content' => str_repeat('A', 10001)],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['history.0.content']);

        Http::assertNothingSent();
    }

    public function test_chat_accepts_reasonable_history_content(): void
    {
        // Boundary: 10,000 chars per turn is allowed.
        Http::fake(['*/chat' => Http::response(['reply' => 'ok'])]);

        $this->actingAs($this->landlord, 'sanctum')
            ->postJson('/api/ai/chat', [
                'message' => 'hi',
                'history' => [
                    ['role' => 'user', 'content' => str_repeat('A', 10000)],
                ],
            ])
            ->assertOk();
    }

    // ------------------------------------------------------------------
    // POST /ai/description
    // ------------------------------------------------------------------

    public function test_description_converts_ids_to_names(): void
    {
        $ward = Ward::factory()->create(['name' => 'Phường Thủ Đức']);
        $amenity = Amenity::factory()->create(['name' => 'Wi-Fi']);

        Http::fake([
            '*/description' => Http::response(['description' => 'Phòng trọ thoáng mát gần trường.']),
        ]);

        $this->actingAs($this->landlord, 'sanctum')
            ->postJson('/api/ai/description', [
                'title' => 'Phòng trọ gần ĐHQG',
                'type' => 'room',
                'price' => 2_500_000,
                'area_m2' => 22.5,
                'address' => '12 Đường số 5',
                'ward_id' => $ward->id,
                'amenity_ids' => [$amenity->id],
            ])->assertOk()
            ->assertJsonPath('data.description', 'Phòng trọ thoáng mát gần trường.');

        Http::assertSent(function ($request) {
            $body = $request->data();

            return $body['ward'] === 'Phường Thủ Đức'
                && $body['amenities'] === ['Wi-Fi']
                && ! array_key_exists('ward_id', $body)
                && ! array_key_exists('amenity_ids', $body);
        });
    }

    public function test_description_defaults_missing_title(): void
    {
        Http::fake(['*/description' => Http::response(['description' => 'Nhà cho thuê.'])]);

        $this->actingAs($this->landlord, 'sanctum')
            ->postJson('/api/ai/description', [])
            ->assertOk();

        Http::assertSent(fn ($request) => $request->data()['title'] === 'Nhà cho thuê');
    }

    // ------------------------------------------------------------------
    // Errors: 503 on AI failure / invalid shape, 403 roles, throttle
    // ------------------------------------------------------------------

    public function test_ai_connection_failure_returns_503_in_vietnamese(): void
    {
        Http::fake(['*/chat' => Http::response('', 500)]);

        $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/ai/chat', ['message' => 'hello'])
            ->assertStatus(503)
            ->assertJsonPath('message', 'Dịch vụ AI tạm thời không khả dụng.');
    }

    public function test_ai_invalid_response_shape_returns_503(): void
    {
        // Missing the required 'reply' key - must be treated as unavailable.
        Http::fake(['*/chat' => Http::response(['unexpected' => true])]);

        $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/ai/chat', ['message' => 'hello'])
            ->assertStatus(503)
            ->assertJsonPath('message', 'Dịch vụ AI tạm thời không khả dụng.');
    }

    public function test_ai_wrong_roles_return_403(): void
    {
        Http::fake(['*/chat' => Http::response(['reply' => 'ok'])]);

        $this->actingAs($this->landlord, 'sanctum')
            ->postJson('/api/ai/roommates')->assertStatus(403);

        $this->actingAs($this->landlord, 'sanctum')
            ->postJson('/api/ai/price-advice', ['listing_id' => 1])->assertStatus(403);

        $this->actingAs($this->landlord, 'sanctum')
            ->postJson('/api/ai/area-suggestions')->assertStatus(403);

        $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/ai/description')->assertStatus(403);

        // /ai/chat is for ANY authenticated user.
        $this->actingAs($this->landlord, 'sanctum')
            ->postJson('/api/ai/chat', ['message' => 'hi'])->assertOk();

        // Guests: 401 (forgetGuards: actingAs persists across in-process requests).
        Auth::forgetGuards();
        $this->postJson('/api/ai/chat', ['message' => 'hi'])->assertStatus(401);
    }

    public function test_ai_endpoints_are_throttled_to_10_per_minute(): void
    {
        Http::fake(['*/chat' => Http::response(['reply' => 'ok'])]);

        for ($i = 0; $i < 10; $i++) {
            $this->actingAs($this->student, 'sanctum')
                ->postJson('/api/ai/chat', ['message' => "lần {$i}"])
                ->assertOk();
        }

        $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/ai/chat', ['message' => 'lần 11'])
            ->assertStatus(429)
            ->assertJsonPath('message', 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.');
    }
}
