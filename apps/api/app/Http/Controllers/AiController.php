<?php

namespace App\Http\Controllers;

use App\Http\Requests\Ai\AiChatRequest;
use App\Http\Requests\Ai\AiDescriptionRequest;
use App\Http\Requests\Ai\AreaSuggestionsRequest;
use App\Http\Requests\Ai\PriceAdviceRequest;
use App\Http\Requests\Ai\RoommatesRequest;
use App\Services\AiService;
use Illuminate\Http\JsonResponse;

/**
 * AI proxy endpoints (API_CONTRACT §4 "AI", docs/contracts/AI_CONTRACT.md).
 * Thin HTTP layer: validation in FormRequests, data preparation and AI
 * calls in AiService. Backend prepares ALL data (the AI service has no
 * database) and never sends names, emails or phone numbers to it.
 */
class AiController extends Controller
{
    public function __construct(private readonly AiService $ai) {}

    /**
     * POST /api/ai/roommates (Student). 422 when the profile is incomplete
     * (thrown by AiService) - response shape unchanged from the contract.
     */
    public function roommates(RoommatesRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->ai->roommates($request->user())]);
    }

    /**
     * POST /api/ai/price-advice (Student). 422 when there are fewer than 3
     * comparable listings (thrown by AiService).
     */
    public function priceAdvice(PriceAdviceRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->ai->priceAdvice((int) $request->validated('listing_id'))]);
    }

    /**
     * POST /api/ai/area-suggestions (Student). Budget/school fall back to
     * the profile; 422 when no budget is available (thrown by AiService).
     */
    public function areaSuggestions(AreaSuggestionsRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->ai->areaSuggestions($request->user(), $request->validated())]);
    }

    /**
     * POST /api/ai/chat (any authenticated user). Optional listing context.
     */
    public function chat(AiChatRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->ai->chat($request->validated())]);
    }

    /**
     * POST /api/ai/description (Landlord). ids become names; missing title
     * becomes "Nhà cho thuê".
     */
    public function description(AiDescriptionRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->ai->description($request->validated())]);
    }
}
