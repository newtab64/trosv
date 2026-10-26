<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Attaches a request id to every request for log correlation.
 *
 * - Honors an incoming X-Request-Id (load balancer / client supplied) when it
 *   looks sane ([A-Za-z0-9-]{8,64}); otherwise generates a UUID.
 * - Shares the id (and user id once known) with ALL log channels via
 *   Log::shareContext(), so every log line is correlatable to a request.
 * - Echoes the id back as X-Request-Id so clients/support can quote it.
 */
class AddRequestId
{
    public function handle(Request $request, Closure $next): Response
    {
        $incoming = (string) $request->headers->get('X-Request-Id', '');

        $requestId = preg_match('/^[A-Za-z0-9-]{8,64}$/', $incoming)
            ? $incoming
            : (string) Str::uuid();

        Log::shareContext([
            'request_id' => $requestId,
        ]);

        $response = $next($request);

        if ($request->user()) {
            Log::shareContext(['user_id' => $request->user()->id]);
        }

        $response->headers->set('X-Request-Id', $requestId);

        return $response;
    }
}
