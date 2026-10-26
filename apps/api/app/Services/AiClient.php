<?php

namespace App\Services;

use App\Exceptions\AiUnavailableException;
use Illuminate\Support\Facades\Http;

/**
 * HTTP client for the FastAPI AI service (docs/contracts/AI_CONTRACT.md).
 *
 * Any connection failure, non-2xx status, invalid JSON or response missing
 * required fields throws AiUnavailableException - rendered as 503
 * "Dịch vụ AI tạm thời không khả dụng." by the API exception handler.
 */
class AiClient
{
    private const TIMEOUT_SECONDS = 30;

    /**
     * POST a JSON payload to the AI service and return the decoded body.
     *
     * @param  array<string, mixed>  $payload
     * @param  list<string>|null  $requiredKeys  keys that must exist at the
     *                                           top level of the response
     * @return array<string, mixed>
     *
     * @throws AiUnavailableException
     */
    public function post(string $path, array $payload, ?array $requiredKeys = null): array
    {
        $requiredKeys ??= [];

        try {
            $response = Http::timeout(self::TIMEOUT_SECONDS)
                ->acceptJson()
                ->post(rtrim(config('services.ai.url'), '/').'/'.ltrim($path, '/'), $payload);
        } catch (\Throwable) {
            throw new AiUnavailableException('AI service unreachable.');
        }

        if (! $response->successful()) {
            throw new AiUnavailableException("AI service returned HTTP {$response->status()}.");
        }

        $data = $response->json();

        if (! is_array($data)) {
            throw new AiUnavailableException('AI service returned invalid JSON.');
        }

        foreach ($requiredKeys as $key) {
            if (! array_key_exists($key, $data)) {
                throw new AiUnavailableException("AI response is missing required field '{$key}'.");
            }
        }

        return $data;
    }
}
