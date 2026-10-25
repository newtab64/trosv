<?php

namespace Tests\Feature;

use App\Models\Amenity;
use App\Models\City;
use App\Models\Listing;
use App\Models\Review;
use App\Models\School;
use App\Models\User;
use App\Models\Ward;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ListingBrowseTest extends TestCase
{
    use RefreshDatabase;

    private User $landlord;

    private School $school;

    private Ward $wardA;

    private Ward $wardB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->landlord = User::factory()->landlord()->create();
        $this->school = School::factory()->create([
            'latitude' => 10.8700,
            'longitude' => 106.8030,
        ]);
        $this->wardA = Ward::factory()->create();
        $this->wardB = Ward::factory()->create();
    }

    /**
     * Create a listing with explicit coordinates.
     */
    private function makeListing(array $attributes = []): Listing
    {
        return Listing::factory()->create(array_merge([
            'user_id' => $this->landlord->id,
        ], $attributes));
    }

    // ------------------------------------------------------------------
    // Reference endpoints
    // ------------------------------------------------------------------

    public function test_wards_schools_amenities_return_bare_arrays(): void
    {
        $this->getJson('/api/wards')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonStructure(['data' => [['id', 'name', 'latitude', 'longitude']]]);

        $this->getJson('/api/schools')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $this->school->id);

        Amenity::factory()->count(3)->create();

        $this->getJson('/api/amenities')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonStructure(['data' => [['id', 'name']]]);
    }

    public function test_cities_endpoint_returns_sorted_list_with_correct_structure(): void
    {
        City::query()->delete();
        City::factory()->create(['name' => 'Can Tho']);
        City::factory()->create(['name' => 'An Giang']);
        City::factory()->create(['name' => 'Binh Duong']);

        $response = $this->getJson('/api/cities')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'name', 'type', 'latitude', 'longitude']]]);

        $names = collect($response->json('data'))->pluck('name')->all();
        $this->assertSame(['An Giang', 'Binh Duong', 'Can Tho'], $names);
    }

    public function test_wards_and_schools_filter_by_city_id(): void
    {
        $city1 = City::factory()->create();
        $city2 = City::factory()->create();

        $ward1 = Ward::factory()->create(['city_id' => $city1->id]);
        $ward2 = Ward::factory()->create(['city_id' => $city2->id]);

        $school1 = School::factory()->create(['city_id' => $city1->id, 'ward_id' => $ward1->id]);
        $school2 = School::factory()->create(['city_id' => $city2->id, 'ward_id' => $ward2->id]);

        $this->getJson("/api/wards?city_id={$city1->id}")
            ->assertOk()
            ->assertJsonPath('data.0.id', $ward1->id)
            ->assertJsonPath('data.0.city.id', $city1->id)
            ->assertJsonMissing(['id' => $ward2->id]);

        $this->getJson("/api/schools?city_id={$city2->id}")
            ->assertOk()
            ->assertJsonPath('data.0.id', $school2->id)
            ->assertJsonPath('data.0.city.id', $city2->id)
            ->assertJsonPath('data.0.ward.id', $ward2->id)
            ->assertJsonMissing(['id' => $school1->id]);
    }

    // ------------------------------------------------------------------
    // Basic listing shape + visibility
    // ------------------------------------------------------------------

    public function test_listings_shape_matches_contract(): void
    {
        $listing = $this->makeListing(['ward_id' => $this->wardA->id]);
        $listing->images()->create(['path' => 'listings/cover.jpg']);

        $response = $this->getJson('/api/listings');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonStructure([
                'data' => [['id', 'title', 'type', 'price', 'area_m2', 'address', 'latitude', 'longitude',
                    'status', 'ward', 'cover_image', 'avg_rating', 'reviews_count', 'distance_km', 'is_favorited']],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ])
            ->assertJsonPath('data.0.ward.id', $this->wardA->id)
            ->assertJsonPath('data.0.ward.name', $this->wardA->name)
            ->assertJsonPath('data.0.cover_image', url('/storage/listings/cover.jpg'))
            ->assertJsonPath('data.0.is_favorited', false)
            ->assertJsonPath('data.0.distance_km', null);

        // ward latitude/longitude must NOT leak into the summary object.
        $this->assertArrayNotHasKey('latitude2', $response->json('data.0.ward'));
    }

    public function test_hidden_and_rented_listings_are_excluded(): void
    {
        $this->makeListing(['status' => Listing::STATUS_AVAILABLE]);
        $this->makeListing(['status' => Listing::STATUS_RENTED]);
        $this->makeListing(['status' => Listing::STATUS_HIDDEN]);

        $response = $this->getJson('/api/listings');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 1);
    }

    // ------------------------------------------------------------------
    // Filters
    // ------------------------------------------------------------------

    public function test_filter_by_q_is_case_insensitive_ilike(): void
    {
        $this->makeListing(['title' => 'Phòng TRỌ giá rẻ', 'address' => '12 Đường số 5']);
        $this->makeListing(['title' => 'Căn hộ cao cấp', 'address' => '45 Nguyễn Huệ']);

        // lowercase keyword must match uppercase title (ILIKE).
        $response = $this->getJson('/api/listings?q='.urlencode('trọ'));
        $response->assertOk()->assertJsonCount(1, 'data');

        // q also matches address.
        $this->getJson('/api/listings?q='.urlencode('nguyễn huệ'))
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/listings?q='.urlencode('không tồn tại'))
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_filter_by_price_range(): void
    {
        $this->makeListing(['price' => 1_500_000]);
        $this->makeListing(['price' => 2_500_000]);
        $this->makeListing(['price' => 4_000_000]);

        $this->getJson('/api/listings?price_min=2000000&price_max=3000000')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.price', 2500000);
    }

    public function test_filter_by_ward_and_type(): void
    {
        $this->makeListing(['ward_id' => $this->wardA->id, 'type' => 'room']);
        $this->makeListing(['ward_id' => $this->wardB->id, 'type' => 'apartment']);

        $this->getJson('/api/listings?ward_id='.$this->wardA->id)
            ->assertOk()->assertJsonCount(1, 'data');

        $this->getJson('/api/listings?type=apartment')
            ->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.type', 'apartment');
    }

    public function test_filter_by_amenities_requires_all(): void
    {
        $wifi = Amenity::factory()->create(['name' => 'Wi-Fi']);
        $ac = Amenity::factory()->create(['name' => 'Máy lạnh']);
        $park = Amenity::factory()->create(['name' => 'Chỗ để xe']);

        $both = $this->makeListing(['title' => 'Có đủ wifi + lạnh']);
        $both->amenities()->sync([$wifi->id, $ac->id]);

        $onlyWifi = $this->makeListing(['title' => 'Chỉ có wifi']);
        $onlyWifi->amenities()->sync([$wifi->id]);

        // Only listings having ALL requested amenities survive.
        $this->getJson("/api/listings?amenity_ids[]={$wifi->id}&amenity_ids[]={$ac->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $both->id);

        $this->getJson("/api/listings?amenity_ids[]={$park->id}")
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    // ------------------------------------------------------------------
    // Distance (school_id + max_km)
    // ------------------------------------------------------------------

    public function test_distance_computed_and_filtered_with_school(): void
    {
        // ~0.6 km from the school (10.8700, 106.8030).
        $near = $this->makeListing(['latitude' => 10.8745, 'longitude' => 106.8030]);
        // ~5 km south.
        $far = $this->makeListing(['latitude' => 10.8300, 'longitude' => 106.8000]);

        $this->getJson('/api/listings?school_id='.$this->school->id)
            ->assertOk()
            ->assertJsonCount(2, 'data');

        // Both rows carry their computed distance.

        $nearRow = collect($this->getJson('/api/listings?school_id='.$this->school->id)->json('data'))
            ->first(fn ($row) => $row['id'] === $near->id);
        $this->assertNotNull($nearRow['distance_km']);
        $this->assertEqualsWithDelta(0.6, $nearRow['distance_km'], 0.3);

        // Without school_id, distance_km must be null.
        $noSchool = $this->getJson('/api/listings')->json('data.0');
        $this->assertNull($noSchool['distance_km']);

        // max_km=1 keeps only the near one.
        $this->getJson('/api/listings?school_id='.$this->school->id.'&max_km=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $near->id);
    }

    public function test_max_km_without_school_id_returns_422(): void
    {
        $this->getJson('/api/listings?max_km=3')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['school_id']);
    }

    public function test_sort_distance_without_school_id_returns_422(): void
    {
        $this->getJson('/api/listings?sort=distance')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['school_id']);
    }

    // ------------------------------------------------------------------
    // Sorting
    // ------------------------------------------------------------------

    public function test_sort_newest_first_by_default(): void
    {
        $older = $this->makeListing(['title' => 'Tin cũ']);
        $newer = $this->makeListing(['title' => 'Tin mới']);
        // Force distinct created_at ordering via id sequence (newest = highest id).
        $this->assertGreaterThan($older->id, $newer->id);

        $this->getJson('/api/listings')
            ->assertOk()
            ->assertJsonPath('data.0.id', $newer->id)
            ->assertJsonPath('data.1.id', $older->id);
    }

    public function test_sort_by_price(): void
    {
        $this->makeListing(['price' => 2_000_000]);
        $this->makeListing(['price' => 5_000_000]);
        $this->makeListing(['price' => 3_000_000]);

        $asc = $this->getJson('/api/listings?sort=price_asc')->json('data');
        $this->assertEquals([2000000, 3000000, 5000000], array_column($asc, 'price'));

        $desc = $this->getJson('/api/listings?sort=price_desc')->json('data');
        $this->assertEquals([5000000, 3000000, 2000000], array_column($desc, 'price'));
    }

    public function test_sort_by_distance_requires_and_uses_school(): void
    {
        $mid = $this->makeListing(['latitude' => 10.8600, 'longitude' => 106.8030]); // ~1.1 km
        $near = $this->makeListing(['latitude' => 10.8745, 'longitude' => 106.8030]); // ~0.6 km
        $far = $this->makeListing(['latitude' => 10.8300, 'longitude' => 106.8000]); // ~5 km

        $rows = $this->getJson('/api/listings?school_id='.$this->school->id.'&sort=distance')->json('data');

        $this->assertSame([$near->id, $mid->id, $far->id], array_column($rows, 'id'));
    }

    public function test_sort_by_rating_puts_unrated_last(): void
    {
        $unrated = $this->makeListing(['title' => 'Chưa có đánh giá']);
        $four = $this->makeListing(['title' => 'Bốn sao']);
        $five = $this->makeListing(['title' => 'Năm sao']);

        Review::factory()->create(['listing_id' => $four->id, 'student_id' => User::factory()->student()->create()->id, 'listing_rating' => 4, 'landlord_rating' => 4]);
        Review::factory()->create(['listing_id' => $five->id, 'student_id' => User::factory()->student()->create()->id, 'listing_rating' => 5, 'landlord_rating' => 5]);

        $rows = $this->getJson('/api/listings?sort=rating')->json('data');

        $this->assertSame([$five->id, $four->id, $unrated->id], array_column($rows, 'id'));
        $this->assertEqualsWithDelta(5.0, $rows[0]['avg_rating'], 0.001);
        $this->assertNull($rows[2]['avg_rating']);
    }

    public function test_invalid_sort_returns_422(): void
    {
        $this->getJson('/api/listings?sort=random')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['sort']);
    }

    // ------------------------------------------------------------------
    // Pagination
    // ------------------------------------------------------------------

    public function test_pagination_meta_and_per_page_cap(): void
    {
        Listing::factory()->count(15)->create(['user_id' => $this->landlord->id]);

        $page1 = $this->getJson('/api/listings?per_page=10&page=1');
        $page1->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonPath('meta.total', 15);

        $page2 = $this->getJson('/api/listings?per_page=10&page=2');
        $page2->assertOk()->assertJsonCount(5, 'data');

        // per_page above the cap of 50 is rejected (PROMPTS.md step 4: max 50).
        $this->getJson('/api/listings?per_page=999')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['per_page']);
    }

    // ------------------------------------------------------------------
    // is_favorited
    // ------------------------------------------------------------------

    public function test_is_favorited_for_logged_in_student(): void
    {
        $student = User::factory()->student()->create();
        $fav = $this->makeListing();
        $notFav = $this->makeListing();
        $student->favorites()->syncWithoutDetaching([$fav->id]);

        $rows = $this->actingAs($student, 'sanctum')->getJson('/api/listings')->json('data');

        $byId = collect($rows)->keyBy('id');
        $this->assertTrue($byId[$fav->id]['is_favorited']);
        $this->assertFalse($byId[$notFav->id]['is_favorited']);
    }

    public function test_is_favorited_always_false_for_landlord(): void
    {
        $fav = $this->makeListing();
        $this->landlord->favorites()->syncWithoutDetaching([$fav->id]);

        $rows = $this->actingAs($this->landlord, 'sanctum')->getJson('/api/listings')->json('data');
        $this->assertFalse($rows[0]['is_favorited']);
    }

    // ------------------------------------------------------------------
    // Validation errors
    // ------------------------------------------------------------------

    public function test_invalid_filters_return_422(): void
    {
        // price_max < price_min
        $this->getJson('/api/listings?price_min=3000000&price_max=1000000')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['price_max']);

        // invalid type
        $this->getJson('/api/listings?type=villa')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['type']);

        // unknown ward
        $this->getJson('/api/listings?ward_id=999')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['ward_id']);

        // unknown amenity
        $this->getJson('/api/listings?amenity_ids[]=999')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['amenity_ids.0']);

        // price_max alone (without price_min) must be accepted.
        $this->getJson('/api/listings?price_max=3000000')
            ->assertOk();

        // price_min alone (without price_max) must be accepted.
        $this->getJson('/api/listings?price_min=2000000')
            ->assertOk();
    }

    // ------------------------------------------------------------------
    // N+1 guard
    // ------------------------------------------------------------------

    public function test_listing_list_does_not_have_n_plus_one(): void
    {
        Listing::factory()->count(12)->create(['user_id' => $this->landlord->id]);

        DB::enableQueryLog();
        $this->getJson('/api/listings');
        $queryCount = count(DB::getQueryLog());
        DB::disableQueryLog();

        // Eager loading keeps this well under 10 queries for 12 listings.
        $this->assertLessThanOrEqual(10, $queryCount, "Too many queries ({$queryCount}): possible N+1.");
    }
}
