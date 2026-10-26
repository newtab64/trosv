/**
 * Cross-component window event names. Kept out of component files so the
 * react-refresh fast-refresh rule stays happy (components must only
 * export components).
 */

// Home tile dispatches this to open the AI chat widget instead of
// navigating; AiChatWidget listens for it site-wide.
export const AI_CHAT_OPEN_EVENT = "trosv:ai-chat-open";

// ConversationDetail dispatches per-thread preview updates so the
// /messages sidebar keeps its rows in sync while a thread is open.
export interface ConvPreviewDetail {
  conversationId: number;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadDelta?: number;
}

export const CONV_PREVIEW_EVENT = "trosv:conv-preview";
