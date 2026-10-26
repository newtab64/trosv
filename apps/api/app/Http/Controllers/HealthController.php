<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Internal health probe for load balancers / docker healthchecks / CI smoke.
 *
 * NOT part of docs/contracts/API_CONTRACT.md - internal only. Shape is intentionally
 * minimal and does not leak internals (no exception messages, no versions).
 */
class HealthController extends Controller
{
    public function show(): JsonResponse
    {
        try {
            DB::select('select 1');
            $database = 'ok';
            $httpStatus = 200;
        } catch (\Throwable) {
            // Never expose the underlying error to unauthenticated callers.
            $database = 'unavailable';
            $httpStatus = 503;
        }

        return response()->json([
            'ok' => $database === 'ok',
            'app' => config('app.name'),
            'database' => $database,
            'time' => now()->toIso8601String(),
        ], $httpStatus);
    }
}
