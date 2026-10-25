<?php

namespace App\Services;

use App\Models\Listing;
use App\Models\ListingImage;
use App\Support\StoragePath;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class ListingImageService
{
    /**
     * Upload and store images for a listing within a transaction.
     *
     * @param  array<int, UploadedFile>  $files
     * @return Collection<int, ListingImage>
     */
    public function uploadImages(Listing $listing, array $files): Collection
    {
        $existingCount = $listing->images()->count();

        if ($existingCount + count($files) > 5) {
            throw new HttpResponseException(response()->json([
                'message' => 'Tin đăng chỉ có tối đa 5 ảnh.',
                'errors' => ['images' => ['Tin đăng chỉ có tối đa 5 ảnh (hiện có '.$existingCount.').']],
            ], 422));
        }

        $createdPaths = [];
        try {
            DB::transaction(function () use ($listing, $files, &$createdPaths) {
                foreach ($files as $file) {
                    $extension = match ($file->getMimeType()) {
                        'image/jpeg' => 'jpg',
                        'image/png' => 'png',
                        'image/webp' => 'webp',
                        default => $file->extension(),
                    };
                    $path = StoragePath::listingImage(Str::uuid()->toString(), $extension);
                    Storage::disk('public')->put($path, $file->getContent());
                    $createdPaths[] = $path;
                    $listing->images()->create(['path' => $path]);
                }
            });
        } catch (Throwable $e) {
            foreach ($createdPaths as $path) {
                Storage::disk('public')->delete($path);
            }
            throw $e;
        }

        return $listing->refresh()->load('images')->images->sortBy('id')->values();
    }

    /**
     * Delete an image from storage and database.
     */
    public function deleteImage(Listing $listing, ListingImage $image): void
    {
        if ($image->listing_id !== $listing->id) {
            abort(404);
        }

        Storage::disk('public')->delete($image->path ?? '');
        $image->delete();
    }
}
