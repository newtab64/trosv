import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useParams } from "react-router-dom";
import { ROUTES, route } from "@/constants/routes";
import { getConversations } from "@/api/socialApi";
import type { Conversation } from "@/types/api";
import { CONV_PREVIEW_EVENT, type ConvPreviewDetail } from "@/constants/events";
import { Avatar } from "@/ui/avatar";
import { Skeleton } from "@/ui/badge";
import { EmptyState } from "@/ui/empty-state";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/*
  Two panes from 890px (sidebar + thread), single pane on mobile where
  selecting a conversation navigates to /messages/:id as its own screen.
  Sidebar rows stay in sync while a thread is open via CONV_PREVIEW_EVENT
  dispatches from the thread (Messenger-style).
*/

export default function MessagesList() {
  const { id } = useParams();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useDocumentTitle("Tin nhắn · TROSV");

  useEffect(() => {
    let active = true;
    getConversations()
      .then((rows) => {
        if (active) setConvs(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  /* Thread -> sidebar preview sync while the thread is open. */
  useEffect(() => {
    function onPreview(e: Event): void {
      const detail = (e as CustomEvent<ConvPreviewDetail>).detail;
      setConvs((rows) =>
        rows.map((c): Conversation =>
          c.id === detail.conversationId
            ? {
                ...c,
                last_message: {
                  ...c.last_message,
                  body: detail.lastMessage ?? c.last_message?.body ?? null,
                  created_at: detail.lastMessageAt ?? c.last_message?.created_at ?? "",
                },
                unread_count:
                  detail.unreadDelta != null
                    ? Math.max(0, (c.unread_count ?? 0) + detail.unreadDelta)
                    : (c.unread_count ?? 0),
              }
            : c
        )
      );
    }
    window.addEventListener(CONV_PREVIEW_EVENT, onPreview);
    return () => { window.removeEventListener(CONV_PREVIEW_EVENT, onPreview); };
  }, []);

  const isThreadOpen = id != null;

  const sidebar = useMemo(
    () => (
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col md:max-w-[340px] md:flex-none border-r border-line bg-card h-full max-h-full overflow-hidden",
          isThreadOpen && "hidden md:flex"
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3.5 bg-paper/50">
          <h2 className="font-semibold text-base text-ink">Tin nhắn</h2>
          {convs.length > 0 ? (
            <span className="rounded-full bg-tint px-2 py-0.5 text-xs font-medium text-ink-2">
              {convs.length}
            </span>
          ) : null}
        </div>
        {loading ? (
          <div className="flex flex-col gap-2 p-3">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        ) : convs.length === 0 ? (
          <EmptyState
            title="Chưa có cuộc trò chuyện nào"
            description="Mở một tin đăng và nhấn Nhắn tin cho chủ nhà để bắt đầu."
            action={
              <Link
                to={ROUTES.ROOMS}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-plate px-4 text-sm font-semibold text-white shadow-xs hover:bg-plate-hover transition-colors"
              >
                Tìm phòng
              </Link>
            }
            className="py-10"
          />
        ) : (
          <ul className="flex flex-1 min-h-0 flex-col overflow-y-auto divide-y divide-line">
            {convs.map((c) => {
              const other = c.other_user?.name ?? "Người dùng";
              const isActive = isThreadOpen && c.id === Number(id);
              return (
                <li key={c.id}>
                  <Link
                    to={route(ROUTES.CONVERSATION, { id: c.id })}
                    data-testid={`conversation-${c.id}`}
                    className={cn(
                      "flex items-center gap-3 p-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-plate",
                      isActive
                        ? "bg-plate-tint/70 border-l-4 border-plate"
                        : "border-l-4 border-transparent hover:bg-tint"
                    )}
                  >
                    <Avatar name={other} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm text-ink", isActive ? "font-semibold" : "font-medium")}>
                        {other}
                      </p>
                      <p className="truncate text-xs text-muted mt-0.5">
                        {c.last_message?.body ?? ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[11px] text-muted tabular-nums">
                        {c.last_message?.created_at ? timeAgo(c.last_message.created_at) : ""}
                      </span>
                      {c.unread_count && c.unread_count > 0 ? (
                        <span className="flex size-5 items-center justify-center rounded-full bg-plate text-[10px] font-bold text-white">
                          {c.unread_count}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    ),
    [convs, loading, id, isThreadOpen]
  );

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row min-h-0 flex-1 bg-card h-full max-h-full overflow-hidden"
      )}
    >
      {sidebar}
      {/* Thread pane on desktop; on mobile the /messages/:id route renders
          inside the same Outlet region when a conversation is selected. */}
      <div
        className={cn(
          "min-w-0 flex-1 border-l border-line flex flex-col h-full max-h-full min-h-0 overflow-hidden",
          !isThreadOpen && "hidden md:flex"
        )}
      >
        <Outlet />
      </div>
    </div>
  );
}
