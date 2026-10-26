<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Role check middleware. Usage: ->middleware('role:landlord') or 'role:student'.
 * Only restricts when the route is hit by an authenticated user with a
 * different role; guests fall through to the auth guard (401).
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (! $request->user()) {
            return $next($request);
        }

        if (! in_array($request->user()->role, $roles, true)) {
            // AuthorizationException is converted to 403 by the API exception handler.
            throw new AuthorizationException;
        }

        return $next($request);
    }
}
