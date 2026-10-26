import api from "./axiosClient";
import { envelope, envelopeArray } from "./envelope";
import type {
  AiAreaSuggestion,
  AiChatResult,
  AiChatTurn,
  AiDescriptionResult,
  AiPriceAdvice,
  AiRoommate,
} from "@/types/api";

// API_CONTRACT §4 - "AI". Backend proxies to the AI service; may take ~30s.
export const aiRoommates = (): Promise<AiRoommate[]> =>
  api.post("/ai/roommates").then((r) => envelopeArray<AiRoommate>(r).data);

export const aiPriceAdvice = (listingId: number): Promise<AiPriceAdvice> =>
  api.post("/ai/price-advice", { listing_id: listingId }).then((r) => envelope<AiPriceAdvice>(r).data);

export interface AreaSuggestionsPayload {
  [k: string]: unknown;
}

export const aiAreaSuggestions = (
  payload: AreaSuggestionsPayload
): Promise<AiAreaSuggestion[]> =>
  api.post("/ai/area-suggestions", payload).then((r) => envelopeArray<AiAreaSuggestion>(r).data);

export const aiChat = (
  message: string,
  history: AiChatTurn[] = [],
  listingId: number | null = null
): Promise<AiChatResult> =>
  api
    .post("/ai/chat", {
      message,
      history: history.slice(-10),
      listing_id: listingId || undefined,
    })
    .then((r) => envelope<AiChatResult>(r).data);

export const aiDescription = (
  payload: Record<string, unknown>
): Promise<AiDescriptionResult> =>
  api.post("/ai/description", payload).then((r) => envelope<AiDescriptionResult>(r).data);
