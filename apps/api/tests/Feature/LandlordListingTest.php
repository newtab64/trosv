<?php

namespace Tests\Feature;

use App\Models\Listing;
use App\Models\User;
use App\Models\Ward;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class LandlordListingTest extends TestCase
{
    use RefreshDatabase;

    private User $landlord;

    private User $otherLandlord;

    private User $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->landlord = User::factory()->landlord()->create();
        $this->otherLandlord = User::factory()->landlord()->create();
        $this->student = User::factory()->student()->create();

        Storage::fake('public');
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Phòng trọ mới đẹp gần trường',
            'type' => 'room',
            'price' => 2_500_000,
            'area_m2' => 22.5,
            'address' => '12 Đường số 5, Thủ Đức',
            'latitude' => 10.8712,
            'longitude' => 106.7801,
            'ward_id' => Ward::factory()->create()->id,
            'description' => 'Phòng thoáng mát.',
            'amenity_ids' => [],
        ], $overrides);
    }

    private function makeOwnedListing(array $attributes = []): Listing
    {
        return Listing::factory()->create(array_merge([
            'user_id' => $this->landlord->id,
        ], $attributes));
    }

    // ------------------------------------------------------------------
    // POST /listings
    // ------------------------------------------------------------------

    public function test_landlord_can_create_listing(): void
    {
        $payload = $this->validPayload(['amenity_ids' => []]);

        $response = $this->actingAs($this->landlord, 'sanctum')
            ->postJson('/api/listings', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', $payload['title'])
            ->assertJsonPath('data.status', 'available') // default status
            ->assertJsonPath('data.landlord.id', $this->landlord->id);

        $this->assertDatabaseHas('listings', [
            'user_id' => $this->landlord->id,
            'title' => $payload['title'],
            'status' => 'available',
        ]);
    }

    public function test_create_listing_validates_ranges(): void
    {
        // price below 100000
        $this->actingAs($this->landlord, 'sanctum')
            ->postJson('/api/listings', $this->validPayload(['price' => 99_000]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['price']);

        // latitude out of range
        $this->actingAs($this->landlord, 'sanctum')
            ->postJson('/api/listings', $this->validPayload(['latitude' => 95]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['latitude']);

        // title too short (min 5)
        $this->actingAs($this->landlord, 'sanctum')
            ->postJson('/api/listings', $this->validPayload(['title' => 'abc']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['title']);
    }

    public function test_student_cannot_create_listing(): void
    {
        $this->actingAs($this->student, 'sanctum')
            ->postJson('/api/listings', $this->validPayload())
            ->assertStatus(403)
            ->assertExactJson(['message' => 'Bạn không có quyền thực hiện thao tác này.']);
    }

    public function test_create_listing_requires_authentication(): void
    {
        $this->postJson('/api/listings', $this->validPayload())->assertStatus(401);
    }

    // ------------------------------------------------------------------
    // GET /my/listings
    // ------------------------------------------------------------------

    public function test_my_listings_shows_all_statuses_and_filters(): void
    {
        $this->makeOwnedListing(['status' => 'available']);
        $this->makeOwnedListing(['status' => 'rented']);
        $this->makeOwnedListing(['status' => 'hidden']);
        // Another landlord's listing must NOT appear.
        Listing::factory()->create(['user_id' => $this->otherLandlord->id]);

        $response = $this->actingAs($this->landlord, 'sanctum')->getJson('/api/my/listings');
        $response->assertOk()->assertJsonPath('meta.total', 3);

        $this->actingAs($this->landlord, 'sanctum')
            ->getJson('/api/my/listings?status=rented')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'rented');
    }

    public function test_my_listings_rejects_students(): void
    {
        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/my/listings')
            ->assertStatus(403);
    }

    // ------------------------------------------------------------------
    // PUT /listings/{id}
    // ------------------------------------------------------------------

    public function test_owner_can_update_listing_partially(): void
    {
        $listing = $this->makeOwnedListing();
        $originalTitle = $listing->title;

        $this->actingAs($this->landlord, 'sanctum')
            ->putJson("/api/listings/{$listing->id}", [
                'price' => 3_100_000,
                'status' => 'rented',
            ])
            ->assertOk()
            ->assertJsonPath('data.price', 3100000)
            ->assertJsonPath('data.status', 'rented');

        // Untouched fields keep their values (partial update).
        $this->assertSame($originalTitle, $listing->fresh()->title);
    }

    public function test_other_landlord_cannot_update_returns_403(): void
    {
        $listing = $this->makeOwnedListing();

        $this->actingAs($this->otherLandlord, 'sanctum')
            ->putJson("/api/listings/{$listing->id}", ['price' => 1_000_000])
            ->assertStatus(403)
            ->assertExactJson(['message' => 'Bạn không có quyền thực hiện thao tác này.']);
    }

    public function test_update_rejects_invalid_status(): void
    {
        $listing = $this->makeOwnedListing();

        $this->actingAs($this->landlord, 'sanctum')
            ->putJson("/api/listings/{$listing->id}", ['status' => 'deleted'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    // ------------------------------------------------------------------
    // DELETE /listings/{id}
    // ------------------------------------------------------------------

    public function test_owner_can_delete_listing_and_files(): void
    {
        $listing = $this->makeOwnedListing();
        $image = $listing->images()->create(['path' => 'listings/doomed.jpg']);
        Storage::disk('public')->put('listings/doomed.jpg', 'fake-content');

        $this->actingAs($this->landlord, 'sanctum')
            ->deleteJson("/api/listings/{$listing->id}")
            ->assertOk()
            ->assertExactJson(['data' => null]);

        $this->assertDatabaseMissing('listings', ['id' => $listing->id]);
        $this->assertDatabaseMissing('listing_images', ['id' => $image->id]);
        Storage::disk('public')->assertMissing('listings/doomed.jpg'); // file also gone
    }

    public function test_other_landlord_cannot_delete_returns_403(): void
    {
        $listing = $this->makeOwnedListing();

        $this->actingAs($this->otherLandlord, 'sanctum')
            ->deleteJson("/api/listings/{$listing->id}")
            ->assertStatus(403);

        $this->assertDatabaseHas('listings', ['id' => $listing->id]);
    }

    // ------------------------------------------------------------------
    // POST /listings/{id}/images
    // ------------------------------------------------------------------

    public function test_owner_can_upload_images(): void
    {
        $listing = $this->makeOwnedListing();

        $response = $this->actingAs($this->landlord, 'sanctum')
            ->postJson("/api/listings/{$listing->id}/images", [
                'images' => [
                    UploadedFile::fake()->create('a.jpg', 100, 'image/jpeg'),
                    UploadedFile::fake()->create('b.png', 100, 'image/png'),
                ],
            ]);

        $response->assertOk()->assertJsonCount(2, 'data');
        $this->assertDatabaseCount('listing_images', 2);

        // The file really exists on the (fake) public disk under its stored path.
        $storedPath = $listing->images()->orderBy('id')->first()->path;
        Storage::disk('public')->assertExists($storedPath);

        // The returned URL points at the /storage route (relative under the
        // faked disk, absolute with APP_URL on the real disk - both valid).
        $this->assertStringEndsWith('/storage/'.$storedPath, $response->json('data.0.url'));
    }

    public function test_stored_file_paths_for_new_uploads_match_legacy_format(): void
    {
        Storage::fake('public');
        $listing = $this->makeOwnedListing();

        $this->actingAs($this->landlord, 'sanctum')
            ->postJson("/api/listings/{$listing->id}/images", [
                'images' => [
                    UploadedFile::fake()->create('photo.jpg', 100, 'image/jpeg'),
                    UploadedFile::fake()->create('graphic.png', 100, 'image/png'),
                    UploadedFile::fake()->create('modern.webp', 100, 'image/webp'),
                ],
            ])
            ->assertOk();

        $images = $listing->images()->orderBy('id')->get();
        $this->assertCount(3, $images);
        $this->assertMatchesRegularExpression('#^listings/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$#', $images[0]->path);
        $this->assertMatchesRegularExpression('#^listings/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$#', $images[1]->path);
        $this->assertMatchesRegularExpression('#^listings/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$#', $images[2]->path);
    }

    public function test_upload_rejects_more_than_five_total_images(): void
    {
        $listing = $this->makeOwnedListing();
        $listing->images()->createMany([
            ['path' => 'listings/x1.jpg'],
            ['path' => 'listings/x2.jpg'],
            ['path' => 'listings/x3.jpg'],
            ['path' => 'listings/x4.jpg'],
        ]);

        $this->actingAs($this->landlord, 'sanctum')
            ->postJson("/api/listings/{$listing->id}/images", [
                'images' => [
                    UploadedFile::fake()->create('n1.jpg', 100, 'image/jpeg'),
                    UploadedFile::fake()->create('n2.jpg', 100, 'image/jpeg'),
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['images']);

        $this->assertDatabaseCount('listing_images', 4); // nothing stored
    }

    public function test_upload_rejects_wrong_format(): void
    {
        $listing = $this->makeOwnedListing();

        $this->actingAs($this->landlord, 'sanctum')
            ->postJson("/api/listings/{$listing->id}/images", [
                'images' => [UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf')],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['images.0']);
    }

    public function test_upload_accepts_file_without_extension(): void
    {
        // Some clients send the blob without a name extension; the validated
        // mime type must be used instead of crashing on an empty extension.
        $listing = $this->makeOwnedListing();

        $response = $this->actingAs($this->landlord, 'sanctum')
            ->postJson("/api/listings/{$listing->id}/images", [
                'images' => [UploadedFile::fake()->createWithContent('noext', 'fake-jpeg-bytes')->mimeType('image/jpeg')],
            ]);

        $response->assertOk()->assertJsonCount(1, 'data');
        $this->assertStringEndsWith('.jpg', $response->json('data.0.url'));
    }

    public function test_upload_ignores_client_supplied_extension(): void
    {
        // A client can name the upload "shell.pht" while sending image bytes:
        // the mimes: rule sniffs CONTENT (not the name), so the request passes
        // validation. The stored name must be derived from the validated
        // content type, never from getClientOriginalExtension(). (Laravel's
        // shouldBlockPhpUpload already rejects *.php names outright; this
        // pins that the extension NEVER propagates from the client name.)
        $listing = $this->makeOwnedListing();

        $response = $this->actingAs($this->landlord, 'sanctum')
            ->postJson("/api/listings/{$listing->id}/images", [
                'images' => [UploadedFile::fake()->createWithContent('shell.pht', 'fake-jpeg-bytes')->mimeType('image/jpeg')],
            ]);

        $response->assertOk()->assertJsonCount(1, 'data');
        $url = $response->json('data.0.url');
        $this->assertStringEndsWith('.jpg', $url);
        $this->assertStringEndsNotWith('.pht', $url);
    }

    public function test_upload_rejects_oversized_file(): void
    {
        $listing = $this->makeOwnedListing();

        $this->actingAs($this->landlord, 'sanctum')
            ->postJson("/api/listings/{$listing->id}/images", [
                'images' => [UploadedFile::fake()->create('big.jpg', 3000, 'image/jpeg')], // 3 MB > 2 MB
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['images.0']);
    }

    public function test_student_cannot_upload_images(): void
    {
        $listing = $this->makeOwnedListing();

        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/listings/{$listing->id}/images", [
                'images' => [UploadedFile::fake()->create('x.jpg', 100, 'image/jpeg')],
            ])
            ->assertStatus(403);
    }

    // ------------------------------------------------------------------
    // DELETE /listings/{id}/images/{image_id}
    // ------------------------------------------------------------------

    public function test_owner_can_delete_image_and_file_is_removed(): void
    {
        $listing = $this->makeOwnedListing();
        $image = $listing->images()->create(['path' => 'listings/gone.jpg']);
        Storage::disk('public')->put('listings/gone.jpg', 'fake-content');

        $this->actingAs($this->landlord, 'sanctum')
            ->deleteJson("/api/listings/{$listing->id}/images/{$image->id}")
            ->assertOk()
            ->assertExactJson(['data' => null]);

        $this->assertDatabaseMissing('listing_images', ['id' => $image->id]);
        Storage::disk('public')->assertMissing('listings/gone.jpg');
    }

    public function test_delete_image_of_other_listing_returns_404(): void
    {
        $listing = $this->makeOwnedListing();
        $foreignListing = $this->makeOwnedListing();
        $image = $foreignListing->images()->create(['path' => 'listings/foreign.jpg']);

        // Image belongs to a different listing → 404 even for its owner.
        $this->actingAs($this->landlord, 'sanctum')
            ->deleteJson("/api/listings/{$listing->id}/images/{$image->id}")
            ->assertStatus(404);

        $this->assertDatabaseHas('listing_images', ['id' => $image->id]);
    }

    public function test_other_landlord_cannot_delete_image(): void
    {
        $listing = $this->makeOwnedListing();
        $image = $listing->images()->create(['path' => 'listings/keep.jpg']);

        $this->actingAs($this->otherLandlord, 'sanctum')
            ->deleteJson("/api/listings/{$listing->id}/images/{$image->id}")
            ->assertStatus(403);

        $this->assertDatabaseHas('listing_images', ['id' => $image->id]);
    }

    public function test_delete_image_with_non_numeric_id_returns_404(): void
    {
        $listing = $this->makeOwnedListing();

        // Non-numeric {image_id} must be a clean JSON 404, not a DB error.
        $this->actingAs($this->landlord, 'sanctum')
            ->deleteJson("/api/listings/{$listing->id}/images/abc")
            ->assertStatus(404)
            ->assertExactJson(['message' => 'Không tìm thấy dữ liệu.']);
    }

    public function test_listing_cover_image_updates_when_smallest_id_image_is_deleted(): void
    {
        Storage::fake('public');
        $listing = $this->makeOwnedListing();

        $this->actingAs($this->landlord, 'sanctum')
            ->postJson("/api/listings/{$listing->id}/images", [
                'images' => [
                    UploadedFile::fake()->create('first.jpg', 100, 'image/jpeg'),
                    UploadedFile::fake()->create('second.jpg', 100, 'image/jpeg'),
                ],
            ])
            ->assertOk();

        $images = $listing->images()->orderBy('id')->get();
        $this->assertCount(2, $images);
        $img1 = $images[0];
        $img2 = $images[1];

        $detail = $this->actingAs($this->landlord, 'sanctum')
            ->getJson("/api/listings/{$listing->id}")
            ->assertOk();
        $this->assertStringContainsString($img1->path, $detail->json('data.cover_image'));

        $this->actingAs($this->landlord, 'sanctum')
            ->deleteJson("/api/listings/{$listing->id}/images/{$img1->id}")
            ->assertOk();

        $detailAfter = $this->actingAs($this->landlord, 'sanctum')
            ->getJson("/api/listings/{$listing->id}")
            ->assertOk();
        $this->assertStringContainsString($img2->path, $detailAfter->json('data.cover_image'));
    }
}
