<?php

namespace App\Http\Controllers;

use App\Http\Requests\Ai\AiChatRequest;
use App\Http\Requests\Ai\AiDescriptionRequest;
use App\Http\Requests\Ai\AreaSuggestionsRequest;
use App\Http\Requests\Ai\PriceAdviceRequest;
use App\Http\Requests\Ai\RoommatesRequest;
use App\Services\Ai\AreaRecommender;
use App\Services\Ai\ChatAssistant;
use App\Services\Ai\DescriptionGenerator;
use App\Services\Ai\PriceAdvisor;
use App\Services\Ai\RoommateMatcher;
use Illuminate\Http\JsonResponse;

/**
 * AI proxy endpoints (API_CONTRACT §4 "AI", docs/contracts/AI_CONTRACT.md).
 * Thin HTTP layer: validation in FormRequests, data preparation and AI
 * calls in dedicated feature services. Backend prepares ALL data (the AI service
 * has no database) and never sends names, emails or phone numbers to it.
 */
class AiController extends Controller
{
    public function __construct(
        private readonly RoommateMatcher $roommates,
        private readonly PriceAdvisor $priceAdvice,
        private readonly AreaRecommender $areaSuggestions,
        private readonly ChatAssistant $chat,
        private readonly DescriptionGenerator $description,
    ) {}

    /**
     * POST /api/ai/roommates (Student). 422 when the profile is incomplete.
     */
    public function roommates(RoommatesRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->roommates->match($request->user())]);
    }

    /**
     * POST /api/ai/price-advice (Student). 422 when there are fewer than 3 comparables.
     */
    public function priceAdvice(PriceAdviceRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->priceAdvice->advise((int) $request->validated('listing_id'))]);
    }

    /**
     * POST /api/ai/area-suggestions (Student). Budget/school fall back to the profile.
     */
    public function areaSuggestions(AreaSuggestionsRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->areaSuggestions->suggest($request->user(), $request->validated())]);
    }

    /**
     * POST /api/ai/chat (any authenticated user). Optional listing context.
     */
    public function chat(AiChatRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->chat->chat($request->validated())]);
    }

    /**
     * POST /api/ai/description (Landlord). ids become names; missing title becomes "Nhà cho thuê".
     */
    public function description(AiDescriptionRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->description->generate($request->validated())]);
    }
}
