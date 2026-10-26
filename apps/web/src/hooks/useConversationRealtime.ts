import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { markRead } from "@/api/socialApi";
import { getEcho } from "@/api/echo";
import type { EchoReactive } from "@/api/echo";
import { useAuth } from "@/context/AuthContext";
import type {
  Message,
  MessageDeletedEvent,
  MessageReactedEvent,
  MessageSeenEvent,
  MessageSentEvent,
  TypingWhisper,
} from "@/types/api";

/**
 * Realtime layer for the /messages/:id thread over the private
 * conversation channel:
 *  - .message.sent  -> append (dedup against own HTTP response)
 *  - whisper typing -> "đang soạn" indicator with 2.5s decay
 *  - .message.reacted / .message.seen / .message.deleted -> merge
 *
 * Shares the message state with useConversationData through the passed
 * setMessages + lastIdRef. Cleanup leaves ONLY the conversation channel
 * (App.Models.User.{id} is shared with Navbar/sidebar - leaving it here
 * would break their subscriptions; see the ghost-listener bug).
 */
export function useConversationRealtime(
  id: string | number,
  setMessages: Dispatch<SetStateAction<Message[]>>,
  lastIdRef: { current: number },
  onPreviewEvent?: (msg: Message) => void
): { otherTyping: boolean; setOtherTyping: Dispatch<SetStateAction<boolean>> } {
  const { user } = useAuth();
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const echo = getEcho();
    if (!echo) return undefined;

    const privateChan = echo.private(`conversation.${id}`) as unknown as EchoReactive;
    privateChan.listen(".message.sent", (e: unknown) => {
      const msg = (e as MessageSentEvent).message;
      setOtherTyping(false); // tin đến = người kia ngừng soạn
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [
          ...prev,
          {
            ...msg,
            is_unsent: false,
            is_mine: msg.sender_id === user?.id,
            seen_at: null,
          },
        ];
      });
      lastIdRef.current = Math.max(lastIdRef.current, msg.id);
      // Sidebar preview (Messenger): thread là nguồn sự thật khi đang
      // mở - phát event để Messages.tsx cập nhật item tương ứng.
      onPreviewEvent?.(msg);
      if (msg.sender_id !== user?.id) markRead(id).catch(() => {});
    });

    // Typing qua client-event (whisper) - không qua backend. Debounce 2.5s.
    privateChan.listenForWhisper("typing", (e: unknown) => {
      const w = e as TypingWhisper;
      if (w.user_id === user?.id) return;
      setOtherTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => { setOtherTyping(false); }, 2500);
    });

    // Reaction: merge lại map reactions mới (đặt/đổi/bỏ của bất kỳ ai).
    privateChan.listen(".message.reacted", (e: unknown) => {
      const ev = e as MessageReactedEvent;
      setMessages((prev) =>
        prev.map((m) => (m.id === ev.message_id ? { ...m, reactions: ev.reactions } : m))
      );
    });

    // Dấu đã xem: người kia markRead -> tất cả tin mine có seen_at.
    privateChan.listen(".message.seen", (e: unknown) => {
      const ev = e as MessageSeenEvent;
      if (ev.reader_id === user?.id) return;
      setMessages((prev) =>
        prev.map((m) => (m.is_mine && !m.seen_at ? { ...m, seen_at: ev.seen_at } : m))
      );
    });

    // Facebook-style deletion: "removed" = unsend cho cả hai phía
    // (thành tombstone); "removed: false" + deleted_for chứa mình =
    // ẩn tin (chỉ ảnh hưởng phía mình).
    privateChan.listen(".message.deleted", (e: unknown) => {
      const ev = e as MessageDeletedEvent;
      const mine = user?.id;
      const affectsMe = ev.removed || (mine != null && (ev.deleted_for ?? []).includes(mine));
      if (!affectsMe) return;

      setMessages((prev) =>
        ev.removed
          ? prev.map((m) =>
              m.id === ev.message_id
                ? { ...m, is_unsent: true, body: null, attachment_url: null, attachment_name: null }
                : m
            )
          : prev.filter((m) => m.id !== ev.message_id)
      );
    });

    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      // CHỈ leave kênh conversation (riêng của thread này). Kênh
      // App.Models.User.{id} là DÙNG CHUNG với Navbar + sidebar -
      // Echo cache channel theo tên, leave() ở đây sẽ phá subscription
      // của họ và sidebar/badge ngừng nhận realtime.
      echo.leave(`conversation.${id}`);
    };
  }, [id, user?.id, setMessages, lastIdRef, onPreviewEvent]);

  return { otherTyping, setOtherTyping };
}
