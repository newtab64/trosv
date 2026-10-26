<?php

namespace Tests\Unit;

use App\Support\StoragePath;
use PHPUnit\Framework\TestCase;

class StoragePathTest extends TestCase
{
    public function test_listing_image_path_format_matches_legacy(): void
    {
        $uuid = '12345678-1234-1234-1234-123456789abc';
        $this->assertSame('listings/'.$uuid.'.jpg', StoragePath::listingImage($uuid, 'jpg'));
        $this->assertSame('listings/'.$uuid.'.png', StoragePath::listingImage($uuid, 'png'));
        $this->assertSame('listings/'.$uuid.'.webp', StoragePath::listingImage($uuid, 'webp'));
    }

    public function test_attachment_path_format_matches_legacy(): void
    {
        $this->assertSame('attachments/42', StoragePath::attachment(42));
        $this->assertSame('attachments/42/doc.pdf', StoragePath::attachment(42, 'doc.pdf'));
    }
}
