<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Cache\RateLimiter;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\InteractsWithTime;
use Symfony\Component\HttpFoundation\Response;

/**
 * API-friendly throttle middleware that always throws a JSON-renderable
 * exception, so rate limiting on /api/* never falls back to an HTML page
 * (API_CONTRACT §1: errors are always JSON with a Vietnamese message).
 */
class ApiThrottle
{
    use InteractsWithTime;

    public function __construct(protected RateLimiter $limiter) {}

    public function handle(Request $request, Closure $next, int $maxAttempts = 60, int $decaySeconds = 60): Response
    {
        $user = $request->user();
        $identifier = $user ? 'u:'.$user->id : 'ip:'.$request->ip();
        $key = 'api-throttle:'.$identifier.':'.sha1($request->method().'|'.$request->getPathInfo());

        if ($this->limiter->tooManyAttempts($key, $maxAttempts)) {
            throw new ThrottleRequestsException(
                'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
                null,
                $this->getHeaders($key, $maxAttempts),
            );
        }

        $response = $next($request);

        return tap($response, fn () => $this->limiter->hit($key, $decaySeconds));
    }

    protected function getHeaders(string $key, int $maxAttempts): array
    {
        return [
            'X-RateLimit-Limit' => $maxAttempts,
            'X-RateLimit-Remaining' => max(0, $this->limiter->remaining($key, $maxAttempts) - 1),
            'Retry-After' => $this->limiter->availableIn($key),
            'X-RateLimit-Reset' => $this->availableAt($this->limiter->availableIn($key)),
        ];
    }
}
