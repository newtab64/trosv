import api from "./axiosClient";
import { envelope, envelopeArray, pagedEnvelope } from "./envelope";
import type { Conversation, Listing, Message, MessagePayload } from "@/types/api";
import type { Paged } from "./listingApi";

// API_CONTRACT §4 - "Yêu thích (sinh viên)"
export const getFavorites = (page = 1): Promise<Paged<Listing>> =>
  api
    .get("/favorites", { params: { page } })
    .then((r) => {
      const body = pagedEnvelope<Listing>(r);
      return { data: body.data, meta: body.meta };
    });

export const addFavorite = (listingId: number): Promise<unknown> =>
  api.put(`/favorites/${listingId}`).then((r) => envelope<unknown>(r).data);

export const removeFavorite = (listingId: number): Promise<unknown> =>
  api.delete(`/favorites/${listingId}`).then((r) => envelope<unknown>(r).data);

// API_CONTRACT §4 - "Nhắn tin"
export const getConversations = (): Promise<Conversation[]> =>
  api.get("/conversations").then((r) => envelopeArray<Conversation>(r).data);

// Facebook-style deletion: scope "unsent" (Thu hồi, sender only) or
// "self" (Xóa chỉ ở phía mình). Server returns 204-style null data.
export type DeleteScope = "unsent" | "self";

export const deleteMessage = (
  messageId: number,
  scope: DeleteScope
): Promise<unknown> =>
  api.delete(`/messages/${messageId}`, { params: { scope } }).then((r) => envelope<unknown>(r).data);

// Messenger reactions: PUT dat/doi emoji (cung emoji lan nua = bo/toggle).
export const reactToMessage = (
  messageId: number,
  emoji: string
): Promise<Message["reactions"]> =>
  api
    .put(`/messages/${messageId}/reactions`, { emoji })
    .then((r) => envelope<{ reactions: Message["reactions"] }>(r).data.reactions);

export const startConversation = (listingId: number): Promise<Conversation> =>
  api.post("/conversations", { listing_id: listingId }).then((r) => envelope<Conversation>(r).data);

// Hội thoại trực tiếp giữa 2 sinh viên (không qua tin đăng) - từ hồ sơ công khai.
export const startDirectConversation = (userId: number): Promise<Conversation> =>
  api.post(`/users/${userId}/message`).then((r) => envelope<Conversation>(r).data);

export const getMessages = (
  conversationId: number | string,
  afterId: number | null = null
): Promise<Message[]> =>
  api
    .get(`/conversations/${conversationId}/messages`, {
      params: { after_id: afterId || undefined },
    })
    .then((r) => envelopeArray<Message>(r).data);

export interface SendMessagePayload extends MessagePayload {
  file?: File | null;
}

export const sendMessage = (
  conversationId: number | string,
  { body, file }: SendMessagePayload
): Promise<Message> => {
  if (file) {
    const form = new FormData();
    form.append("body", body || "");
    form.append("file", file);
    return api
      .post(`/conversations/${conversationId}/messages`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => envelope<Message>(r).data);
  }
  return api
    .post(`/conversations/${conversationId}/messages`, { body })
    .then((r) => envelope<Message>(r).data);
};

export const markRead = (conversationId: number | string): Promise<unknown> =>
  api.post(`/conversations/${conversationId}/read`);
