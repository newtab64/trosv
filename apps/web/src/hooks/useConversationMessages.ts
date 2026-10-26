import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { deleteMessage, reactToMessage, sendMessage } from "@/api/socialApi";
import { errMessage } from "@/api/axiosClient";
import type { Message } from "@/types/api";

/**
 * Message actions for the thread: send (with dedup against the WS event),
 * delete (unsend/delete-for-me optimistic update), react (optimistic toggle
 * with server reconciliation) and copy. Wraps the API layer so the page
 * component stays declarative. Errors land in `error` for inline display
 * (attachment/send problems); menu actions toast via the caller.
 */
export function useConversationMessages(
  id: string | number,
  setMessages: Dispatch<SetStateAction<Message[]>>,
  lastIdRef: { current: number }
): {
  send: (text: string, file: File | null) => Promise<Message | null>;
  remove: (m: Message | number, scope: "unsent" | "self") => Promise<boolean>;
  react: (m: Message, emoji: string, myId: number) => Promise<boolean>;
  sending: boolean;
  error: string;
  setError: Dispatch<SetStateAction<string>>;
} {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function send(text: string, file: File | null): Promise<Message | null> {
    setError("");
    setSending(true);
    try {
      const msg = await sendMessage(id, { body: text, file });
      // The sender's own .message.sent WS event usually lands BEFORE
      // this HTTP response resolves - skip if already drawn.
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      lastIdRef.current = Math.max(lastIdRef.current, msg.id);
      return msg;
    } catch (err) {
      setError(errMessage(err));
      return null;
    } finally {
      setSending(false);
    }
  }

  async function remove(m: Message | number, scope: "unsent" | "self"): Promise<boolean> {
    const mid = typeof m === "number" ? m : m.id;
    try {
      await deleteMessage(mid, scope);
      setMessages((prev) =>
        scope === "unsent"
          ? prev.map((x) =>
              x.id === mid
                ? { ...x, is_unsent: true, body: null, attachment_url: null, attachment_name: null }
                : x
            )
          : prev.filter((x) => x.id !== mid)
      );
      return true;
    } catch (err) {
      setError(errMessage(err));
      return false;
    }
  }

  /** Optimistic toggle; the .message.reacted event reconciles everyone. */
  async function react(m: Message, emoji: string, myId: number): Promise<boolean> {
    const prevMap = m.reactions || {};
    const mine = String(myId);
    const optimistic: Record<string, string> = {};
    for (const [uid, em] of Object.entries(prevMap)) {
      if (uid !== mine) optimistic[uid] = em;
    }
    if (prevMap[mine] !== emoji) {
      optimistic[mine] = emoji;
    }

    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, reactions: optimistic } : x)));

    try {
      const serverMap = await reactToMessage(m.id, emoji);
      if (serverMap == null) {
        setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, reactions: null } : x)));
      } else {
        setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, reactions: serverMap } : x)));
      }
      return true;
    } catch (err) {
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, reactions: prevMap } : x)));
      setError(errMessage(err));
      return false;
    }
  }

  return { send, remove, react, sending, error, setError };
}
