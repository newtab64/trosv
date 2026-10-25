<?php

namespace App\Support;

class StoragePath
{
    public const LISTINGS_PREFIX = 'listings/';

    public const ATTACHMENTS_PREFIX = 'attachments/';

    public static function listing(string $path = ''): string
    {
        return self::LISTINGS_PREFIX.ltrim($path, '/');
    }

    public static function listingImage(string $uuid, string $extension): string
    {
        return self::LISTINGS_PREFIX.$uuid.'.'.$extension;
    }

    public static function attachment(int|string $conversationId, string $filename = ''): string
    {
        $base = self::ATTACHMENTS_PREFIX.$conversationId;

        return $filename !== '' ? $base.'/'.ltrim($filename, '/') : $base;
    }
}
