<?php

use App\Shared\Http\Controllers\HealthController;
use Illuminate\Support\Facades\Route;

// Internal liveness probe (load balancers, docker healthcheck, CI smoke).
// NOT part of docs/contracts/API_CONTRACT.md - intentionally unauthenticated, minimal payload.
Route::get('/health', [HealthController::class, 'show']);

// Each domain module owns its endpoints in app/Modules/<Module>/routes.php
// (loaded alphabetically; all are mounted under /api by bootstrap/app.php).
foreach (glob(app_path('Modules/*/routes.php')) ?: [] as $moduleRoutes) {
    require $moduleRoutes;
}

// pr-guard-e2e: test comment
