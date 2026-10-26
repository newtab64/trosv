import { useEffect, useRef, useState } from "react";
import { getConversations, getMessages, markRead } from "@/api/socialApi";
import type { Conversation, Message } from "@/types/api";

/**
 * Conversation header + message list for the /messages/:id thread.
 * Owns: header fetch, initial message load (with last-id tracking for
 * the realtime layer), markRead on open, and per-conversation reset.
 * Realtime updates arrive through useConversationRealtime, which shares
 * setMessages/lastIdRef with this hook via the returned refs/state.
 */
export function useConversationData(id: string | number): {
  conversation: Conversation | null;
  convLoaded: boolean;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  loaded: boolean;
  lastIdRef: { current: number };
} {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [convLoaded, setConvLoaded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const lastIdRef = useRef(0);

  // Per-conversation state reset during render (React's recommended
  // "adjust state when props change" idiom) instead of setState inside
  // an effect - the fresh id renders with a clean slate immediately.
  const [prevId, setPrevId] = useState<string | number>(id);
  if (prevId !== id) {
    setPrevId(id);
    setConversation(null);
    setConvLoaded(false);
    setMessages([]);
    setLoaded(false);
  }

  // Load conversation header (other user, listing).
  useEffect(() => {
    let active = true;
    getConversations()
      .then((list) => {
        if (active) setConversation(list.find((c) => String(c.id) === String(id)) || null);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setConvLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [id]);

  // Initial load (polls replaced by the Reverb WebSocket subscription).
  // Render-phase reset above already cleared lastIdRef for the new id; the
  // previous thread's realtime subscription is torn down in cleanup before
  // this runs, so no new id can read a stale last id.
  useEffect(() => {
    let active = true;
    lastIdRef.current = 0;
    getMessages(id)
      .then((rows) => {
        if (!active) return;
        lastIdRef.current = rows.length > 0 ? (rows[rows.length - 1] as { id: number }).id : 0;
        setMessages(rows);
        markRead(id).catch(() => {
          /* silent */
        });
      })
      .catch(() => {
        // transient - the realtime subscriber is not affected
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [id]);

  return {
    conversation,
    convLoaded,
    messages,
    setMessages,
    loaded,
    lastIdRef,
  };
}
