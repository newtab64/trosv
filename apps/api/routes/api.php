<?php

use App\Http\Controllers\AiController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\ProfileController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\FavoriteController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\LandlordListingController;
use App\Http\Controllers\ListingController;
use App\Http\Controllers\MessageDeletionController;
use App\Http\Controllers\MessageReactionController;
use App\Http\Controllers\ReferenceController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\UserPublicController;
use Illuminate\Support\Facades\Route;

// Internal liveness probe (load balancers, docker healthcheck, CI smoke).
// NOT part of docs/contracts/API_CONTRACT.md - intentionally unauthenticated, minimal payload.
Route::get('/health', [HealthController::class, 'show']);

// Authentication and profile (API_CONTRACT §4 - "Xác thực và hồ sơ").
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle.api:10,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle.api:10,1');
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::get('/me', [AuthController::class, 'me'])->middleware('auth:sanctum');
Route::put('/profile', [ProfileController::class, 'update'])->middleware('auth:sanctum');

// Reference data (API_CONTRACT §4 - "Dữ liệu tham chiếu").
// Cascade: chọn Tỉnh/TP trước (GET /cities), rồi lọc ward/trường theo city_id.
Route::get('/cities', [ReferenceController::class, 'cities']);
Route::get('/wards', [ReferenceController::class, 'wards']);
Route::get('/schools', [ReferenceController::class, 'schools']);
Route::get('/amenities', [ReferenceController::class, 'amenities']);

// Listing browse (API_CONTRACT §4 - "Duyệt tin đăng").
// Public student profiles (API_CONTRACT §4) - PII-safe, landlords 404.
Route::get('/users/{user}', [UserPublicController::class, 'show'])->whereNumber('user');

// Listing browse (API_CONTRACT §4 - "Duyệt tin đăng").
Route::get('/listings', [ListingController::class, 'index']);
Route::get('/listings/{listing}', [ListingController::class, 'show'])->whereNumber('listing');
Route::get('/listings/{listing}/reviews', [ReviewController::class, 'index'])->whereNumber('listing');

// Reviews (API_CONTRACT §4 - "Đánh giá", Student only).
Route::post('/listings/{listing}/reviews', [ReviewController::class, 'store'])
    ->middleware(['auth:sanctum', 'role:student'])
    ->whereNumber('listing');

// Landlord listing management (API_CONTRACT §4 - "Chủ nhà: quản lý tin đăng").
Route::get('/my/listings', [LandlordListingController::class, 'index'])->middleware(['auth:sanctum', 'role:landlord']);
Route::post('/listings', [LandlordListingController::class, 'store'])->middleware(['auth:sanctum', 'role:landlord']);
Route::put('/listings/{listing}', [LandlordListingController::class, 'update'])
    ->middleware(['auth:sanctum', 'role:landlord'])->whereNumber('listing');
Route::delete('/listings/{listing}', [LandlordListingController::class, 'destroy'])
    ->middleware(['auth:sanctum', 'role:landlord'])->whereNumber('listing');
Route::post('/listings/{listing}/images', [LandlordListingController::class, 'uploadImages'])
    ->middleware(['auth:sanctum', 'role:landlord'])->whereNumber('listing');
Route::delete('/listings/{listing}/images/{image}', [LandlordListingController::class, 'deleteImage'])
    ->middleware(['auth:sanctum', 'role:landlord'])->whereNumber(['listing', 'image']);

// Favorites (API_CONTRACT §4 - "Yêu thích", Student only).
Route::get('/favorites', [FavoriteController::class, 'index'])->middleware(['auth:sanctum', 'role:student']);
Route::put('/favorites/{listing_id}', [FavoriteController::class, 'attach'])
    ->middleware(['auth:sanctum', 'role:student'])->whereNumber('listing_id');
Route::delete('/favorites/{listing_id}', [FavoriteController::class, 'detach'])
    ->middleware(['auth:sanctum', 'role:student'])->whereNumber('listing_id');

// Messaging (API_CONTRACT §4 - "Nhắn tin"). Outsiders get 404.
Route::post('/conversations', [ConversationController::class, 'store'])->middleware(['auth:sanctum', 'role:student']);
// Hội thoại trực tiếp giữa 2 sinh viên (không qua tin đăng) từ hồ sơ công khai.
Route::post('/users/{user}/message', [ConversationController::class, 'storeDirect'])
    ->middleware(['auth:sanctum', 'role:student'])->whereNumber('user');
Route::get('/conversations', [ConversationController::class, 'index'])->middleware('auth:sanctum');
Route::get('/conversations/{conversation}/messages', [ConversationController::class, 'messages'])
    ->middleware('auth:sanctum')->whereNumber('conversation');
Route::post('/conversations/{conversation}/messages', [ConversationController::class, 'sendMessage'])
    ->middleware(['auth:sanctum', 'throttle.api:30,1'])->whereNumber('conversation');
Route::post('/conversations/{conversation}/read', [ConversationController::class, 'markRead'])
    ->middleware('auth:sanctum')->whereNumber('conversation');

// Facebook-style deletion: sender "Thu hồi" (for everyone) or participant
// "Xóa chỉ ở phía mình". Outsiders get 404 like the rest of messaging.
Route::delete('/messages/{message}', [MessageDeletionController::class, 'destroy'])
    ->middleware('auth:sanctum')->whereNumber('message');

// Messenger-style reactions: PUT dat/doi (toggle cung emoji = bo), DELETE xoa.
Route::put('/messages/{message}/reactions', [MessageReactionController::class, 'update'])
    ->middleware('auth:sanctum')->whereNumber('message');
Route::delete('/messages/{message}/reactions', [MessageReactionController::class, 'destroy'])
    ->middleware('auth:sanctum')->whereNumber('message');

// AI proxy (API_CONTRACT §4 - "AI", docs/contracts/AI_CONTRACT.md).
// All endpoints: auth + 10 req/min per user; 503 when the AI service is down.
Route::middleware(['auth:sanctum', 'throttle.api:10,1'])->group(function () {
    Route::post('/ai/roommates', [AiController::class, 'roommates'])->middleware('role:student');
    Route::post('/ai/price-advice', [AiController::class, 'priceAdvice'])->middleware('role:student');
    Route::post('/ai/area-suggestions', [AiController::class, 'areaSuggestions'])->middleware('role:student');
    Route::post('/ai/chat', [AiController::class, 'chat']);
    Route::post('/ai/description', [AiController::class, 'description'])->middleware('role:landlord');
});
