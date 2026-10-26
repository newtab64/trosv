import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getConversations } from "@/api/socialApi";
import { getEcho } from "@/api/echo";
import type { EchoReactive } from "@/api/echo";

/**
 * Total unread count for the messages rail badge. Loaded once per
 * session, then kept live by the private user channel (badge sync),
 * without re-fetching on every navigation.
 */
export function useUnreadCount(): number {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    getConversations()
      .then((convs) => {
        if (cancelled) return;
        setUnread(convs.reduce((sum, c) => sum + (c.unread_count ?? 0), 0));
      })
      .catch(() => {});

    /* Realtime badge sync on App.Models.User.{id}. Uses getEcho() which
       returns null while logged out. */
    const e = getEcho();
    if (e) {
      const userChan: EchoReactive = e.private(`App.Models.User.${user.id}`);
      userChan.listen(".message.sent", (payload: unknown) => {
        const p = payload as { sender_id?: number };
        /* Own outgoing messages do not increment my own badge. */
        if (p.sender_id !== user.id) setUnread((n) => n + 1);
      });
      userChan.listen(".message.deleted", (payload: unknown) => {
        const p = payload as {
          sender_id?: number;
          removed?: boolean;
          deleted_for?: number[];
        };
        if (p.sender_id !== user.id && p.removed) {
          setUnread((n) => Math.max(0, n - 1));
        }
      });
    }

    return () => {
      cancelled = true;
      /* Leave ONLY the user channel: conversation channels are owned by
         the thread hooks (see useConversationRealtime cleanup note). */
      if (e) e.leave(`App.Models.User.${user.id}`);
    };
  }, [user]);

  return unread;
}
