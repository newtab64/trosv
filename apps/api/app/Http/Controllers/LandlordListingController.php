<?php

namespace App\Http\Controllers;

use App\Http\Requests\Listing\ListingImageUploadRequest;
use App\Http\Requests\Listing\ListingStoreRequest;
use App\Http\Requests\Listing\ListingUpdateRequest;
use App\Http\Resources\ListingDetailResource;
use App\Http\Resources\ListingSummaryResource;
use App\Models\Listing;
use App\Models\ListingImage;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Landlord listing management (API_CONTRACT §4 - "Chủ nhà: quản lý tin đăng").
 * All actions require the landlord role and ownership of the listing.
 */
class LandlordListingController extends Controller
{
    /**
     * GET /api/my/listings - all statuses, optional status filter, paginated.
     */
    public function index(Request $request): JsonResponse
    {
        $query = $request->user()
            ->listings()
            ->with(['ward.city', 'coverImage'])
            ->withCount('reviews')
            ->withAvg('reviews', 'listing_rating')
            ->orderByDesc('id');

        if (! empty($request->query('status'))) {
            $query->where('status', $request->query('status'));
        }

        $page = $query->paginate($this->perPage($request));

        // Landlord view: is_favorited is always false.
        $request->attributes->set('favorited_listing_ids', []);

        return $this->paginated($page, ListingSummaryResource::class, $request);
    }

    /**
     * POST /api/listings - create a listing, status defaults to available.
     */
    public function store(ListingStoreRequest $request): JsonResponse
    {
        $data = $request->validated();

        $listing = $request->user()->listings()->create([
            ...collect($data)->except('amenity_ids')->all(),
            'status' => Listing::STATUS_AVAILABLE,
        ]);

        if (array_key_exists('amenity_ids', $data)) {
            $listing->amenities()->sync($data['amenity_ids']);
        }

        $listing->load(['ward', 'coverImage', 'images', 'amenities', 'landlord']);

        return response()->json([
            'data' => (new ListingDetailResource($listing))->resolve($request),
        ], 201);
    }

    /**
     * PUT /api/listings/{id} - partial update, landlord may also change status.
     */
    public function update(ListingUpdateRequest $request, Listing $listing): JsonResponse
    {
        $this->authorizeOwnership($request, $listing);

        $data = $request->validated();

        $listing->update(collect($data)->except('amenity_ids')->all());

        if (array_key_exists('amenity_ids', $data)) {
            $listing->amenities()->sync($data['amenity_ids']);
        }

        $refreshed = $listing->fresh(['ward', 'coverImage', 'images', 'amenities', 'landlord']);

        return response()->json([
            'data' => (new ListingDetailResource($refreshed))->resolve($request),
        ]);
    }

    /**
     * DELETE /api/listings/{id} - delete the listing AND its image files.
     */
    public function destroy(Request $request, Listing $listing): JsonResponse
    {
        $this->authorizeOwnership($request, $listing);

        $paths = $listing->images()->pluck('path')->all();
        $listing->delete();

        // Delete image files on disk only after database deletion succeeds
        if (! empty($paths)) {
            Storage::disk('public')->delete($paths);
        }

        return response()->json(['data' => null]);
    }

    /**
     * POST /api/listings/{id}/images - upload 1..n images (jpg/png/webp,
     * 2 MB each, 5 total per listing). Returns ALL images of the listing;
     * the smallest id is the cover.
     */
    public function uploadImages(ListingImageUploadRequest $request, Listing $listing): JsonResponse
    {
        $this->authorizeOwnership($request, $listing);

        $existingCount = $listing->images()->count();
        $newFiles = $request->file('images', []);

        if ($existingCount + count($newFiles) > 5) {
            return response()->json([
                'message' => 'Tin đăng chỉ có tối đa 5 ảnh.',
                'errors' => ['images' => ['Tin đăng chỉ có tối đa 5 ảnh (hiện có '.$existingCount.').']],
            ], 422);
        }

        $createdPaths = [];
        try {
            DB::transaction(function () use ($listing, $newFiles, &$createdPaths) {
                foreach ($newFiles as $file) {
                    // The stored extension is derived from the file's VALIDATED content
                    // type (sniffed from the bytes), never from the client-supplied
                    // name: getClientOriginalExtension() is attacker-controlled. A file
                    // named "shell.php" whose content sniffs as image/jpeg must not
                    // keep a server-side .php name - under `php artisan serve` the
                    // Laravel router serves existing files under public/ raw, so a
                    // stored .php would EXECUTE (unauthenticated RCE).
                    $extension = match ($file->getMimeType()) {
                        'image/jpeg' => 'jpg',
                        'image/png' => 'png',
                        'image/webp' => 'webp',
                        // Unreachable behind the mimes: rule; kept identical to the
                        // old fallback (content-sniffed, never client-supplied).
                        default => $file->extension(),
                    };
                    $path = 'listings/'.Str::uuid()->toString().'.'.$extension;
                    Storage::disk('public')->put($path, $file->getContent());
                    $createdPaths[] = $path;
                    $listing->images()->create(['path' => $path]);
                }
            });
        } catch (\Throwable $e) {
            foreach ($createdPaths as $path) {
                Storage::disk('public')->delete($path);
            }
            throw $e;
        }

        $listing->refresh()->load('images');

        return response()->json([
            'data' => $listing->images->sortBy('id')->values()->map(fn (ListingImage $image) => [
                'id' => $image->id,
                'url' => Storage::disk('public')->url($image->path),
            ])->all(),
        ]);
    }

    /**
     * DELETE /api/listings/{id}/images/{image_id} - remove the row AND the file.
     */
    public function deleteImage(Request $request, Listing $listing, ListingImage $image): JsonResponse
    {
        $this->authorizeOwnership($request, $listing);

        // The image must belong to this listing (else treat as not found).
        if ($image->listing_id !== $listing->id) {
            abort(404);
        }

        Storage::disk('public')->delete($image->path ?? '');
        $image->delete();

        return response()->json(['data' => null]);
    }

    /** 403 with the standard message unless the current user owns the listing. */
    private function authorizeOwnership(Request $request, Listing $listing): void
    {
        if (! $request->user()->can('manage', $listing)) {
            // Rendered as { message: "Bạn không có quyền..." } by the handler.
            throw new AuthorizationException;
        }
    }
}
