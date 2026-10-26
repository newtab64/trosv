import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ROUTES, route } from "@/constants/routes";
import {
  useConversationData,
} from "@/hooks/useConversationData";
import { useConversationRealtime } from "@/hooks/useConversationRealtime";
import { useConversationMessages } from "@/hooks/useConversationMessages";
import { useStickToBottom } from "@/hooks/useStickToBottom";
import { CONV_PREVIEW_EVENT, type ConvPreviewDetail } from "@/constants/events";
import { getEcho } from "@/api/echo";
import { Avatar } from "@/ui/avatar";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/badge";
import { EmptyState } from "@/ui/empty-state";
import { toast } from "@/ui/toast";
import { cn } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/context/AuthContext";
import { GateScreen, MessagesGateIllustration } from "@/components/gates";
import { Footer } from "@/components/shell";
import { MessageBubble } from "@/pages/messages/MessageBubble";
import {
  Paperclip,
  ArrowDown,
  ChevronDown,
  X,
  FileText,
  Send,
} from "lucide-react";

const MESSAGE_MAX = 1000;

function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

function DaySeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2" aria-hidden={false}>
      <div className="h-px flex-1 bg-line" />
      <span className="text-xs text-muted">{label}</span>
      <div className="h-px flex-1 bg-line" />
    </div>
  );
}

function TimeSeparator({ date }: { date: string }) {
  const d = new Date(date);
  const timeStr = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="flex items-center justify-center py-2 my-1" aria-hidden={false}>
      <span className="rounded-full bg-sunken/60 px-2.5 py-0.5 text-[11px] font-medium text-muted">
        {timeStr}
      </span>
    </div>
  );
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hôm nay";
  if (d.toDateString() === yesterday.toDateString()) return "Hôm qua";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface ThreadProps {
  id: string;
}

function Thread({ id }: ThreadProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const data = useConversationData(id);
  const realtime = useConversationRealtime(
    id,
    data.setMessages,
    data.lastIdRef,
    (msg) => {
      window.dispatchEvent(
        new CustomEvent<ConvPreviewDetail>(CONV_PREVIEW_EVENT, {
          detail: {
            conversationId: Number(id),
            lastMessage: msg.body ?? msg.attachment_name ?? "",
            lastMessageAt: msg.created_at,
          },
        })
      );
    }
  );
  const actions = useConversationMessages(id, data.setMessages, data.lastIdRef);
  /* The thread element's ref is owned here (not by a hook) so attaching
     it and passing it down never touches a hook-returned ref in render. */
  const threadRef = useRef<HTMLDivElement>(null);
  const isReady = data.loaded && Boolean(data.conversation);
  const stick = useStickToBottom(threadRef, data.messages, isReady, id);

  const setThreadNode = useCallback(
    (node: HTMLDivElement | null) => {
      (threadRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      if (node) {
        stick.notifyMounted(node);
      }
    },
    [stick]
  );

  const [draft, setDraft] = useState("");
  const [atBottom, setAtBottom] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);

  const removeAttachment = () => {
    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview);
      setAttachmentPreview(null);
    }
    setAttachment(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  useEffect(() => {
    return () => {
      if (attachmentPreview) {
        URL.revokeObjectURL(attachmentPreview);
      }
    };
  }, [attachmentPreview]);

  useDocumentTitle(
    data.conversation
      ? `${data.conversation.other_user?.name ?? "Tin nhắn"} · TROSV`
      : "Tin nhắn · TROSV"
  );

  /* Whisper typing while the composer has text. */
  useEffect(() => {
    const e = getEcho();
    const chan = e?.private(`conversation.${id}`);
    if (!chan) return;
     
    const ch = chan as unknown as { whisper: (ev: string, data: unknown) => void };
    ch.whisper("typing", { user_id: -1 });
  }, [draft, id]);

  const grouped = useMemo(() => data.messages, [data.messages]);

  if (!data.loaded) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-14" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }
  if (!data.conversation) {
    return (
      <EmptyState
        title="Không tìm thấy hội thoại"
        description="Hội thoại này không tồn tại hoặc bạn không có quyền xem."
        action={
          <Button variant="outline" asChild>
            <Link to={ROUTES.MESSAGES}>Về tin nhắn</Link>
          </Button>
        }
        className="min-h-[50vh]"
      />
    );
  }

  const otherUser = data.conversation.other_user;
  const other = otherUser?.name ?? "Người dùng";
  const otherRole = otherUser?.role === "student" ? "Sinh viên" : otherUser?.role === "landlord" ? "Chủ nhà" : null;

  async function send(): Promise<void> {
    const text = draft.trim();
    if (!text && !attachment) return;
    if (text.length > MESSAGE_MAX) {
      toast(`Tin nhắn tối đa ${MESSAGE_MAX} ký tự.`);
      return;
    }
    const msg = await actions.send(text, attachment);
    if (msg) {
      setDraft("");
      removeAttachment();
      setAtBottom(true);
      stick.scrollToBottom();
      window.dispatchEvent(
        new CustomEvent<ConvPreviewDetail>(CONV_PREVIEW_EVENT, {
          detail: {
            conversationId: Number(id),
            lastMessage: msg.body ?? msg.attachment_name ?? "",
            lastMessageAt: msg.created_at,
            unreadDelta: 0,
          },
        })
      );
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col h-full max-h-full overflow-hidden bg-card">
      {/* Listing context header */}
      <div className="shrink-0 flex items-center gap-3 border-b border-line bg-paper/70 p-3 backdrop-blur-xs">
        <button
          type="button"
          onClick={() => { void navigate(ROUTES.MESSAGES); }}
          className="rounded-lg p-2 text-ink-2 md:hidden hover:bg-tint"
          aria-label="Về danh sách tin nhắn"
        >
          <ChevronDown className="size-4 rotate-90" aria-hidden />
        </button>
        {otherUser?.role === "student" ? (
          <Link
            to={route(ROUTES.STUDENT_PUBLIC, { id: otherUser.id })}
            className="flex items-center gap-2 hover:opacity-80"
          >
            <Avatar name={other} size={40} />
          </Link>
        ) : (
          <Avatar name={other} size={40} />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-sm text-ink">{other}</p>
          {otherRole ? (
            <p className="truncate text-xs text-muted">{otherRole}</p>
          ) : null}
        </div>
      </div>

      {/* Messages: day separators + grouped bubbles */}
      <div
        ref={setThreadNode}
        onScroll={() => { setAtBottom(stick.handleScroll()); }}
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-4 bg-paper/30"
        data-testid="thread"
      >
        {grouped.map((m, i) => {
          const prev = grouped[i - 1];
          const next = grouped[i + 1];

          const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
          const timeSincePrev = prev
            ? new Date(m.created_at).getTime() - new Date(prev.created_at).getTime()
            : 0;
          const showTimeGapHeader = !newDay && timeSincePrev >= 20 * 60 * 1000;

          const isGroupedWithPrev =
            !newDay &&
            !showTimeGapHeader &&
            prev.is_mine === m.is_mine &&
            timeSincePrev < 180000;

          const nextNewDay = next ? dayKey(next.created_at) !== dayKey(m.created_at) : false;
          const timeToNext = next ? new Date(next.created_at).getTime() - new Date(m.created_at).getTime() : 0;
          const nextTimeGap = timeToNext >= 20 * 60 * 1000;

          const isGroupedWithNext =
            Boolean(next) &&
            !nextNewDay &&
            !nextTimeGap &&
            next?.is_mine === m.is_mine &&
            timeToNext < 180000;

          const bubbleShape: "single" | "first" | "middle" | "last" =
            !isGroupedWithPrev && isGroupedWithNext
              ? "first"
              : isGroupedWithPrev && isGroupedWithNext
              ? "middle"
              : isGroupedWithPrev && !isGroupedWithNext
              ? "last"
              : "single";

          const isLastInCluster = !isGroupedWithNext;
          const prevHasReactions = Boolean(prev && prev.reactions && Object.keys(prev.reactions).length > 0);

          return (
            <div key={m.id} className="flex flex-col w-full">
              {newDay ? <DaySeparator label={formatDayLabel(m.created_at)} /> : null}
              {showTimeGapHeader ? <TimeSeparator date={m.created_at} /> : null}
              <div
                className={cn(
                  "flex w-full",
                  m.is_mine ? "justify-end" : "justify-start",
                  prevHasReactions ? "mt-3.5" : isGroupedWithPrev ? "mt-0.5" : "mt-2"
                )}
              >
                <MessageBubble
                  msg={m}
                  isMine={m.is_mine === true}
                  grouped={isGroupedWithPrev}
                  shape={bubbleShape}
                  showTimestamp={isLastInCluster}
                  currentUserId={user?.id}
                  onReact={(mm, e) => { void actions.react(mm, e, user?.id ?? m.sender_id); }}
                  onUnsend={(mm) => { void actions.remove(mm, "unsent"); }}
                  onDeleteSelf={(mm) => { void actions.remove(mm, "self"); }}
                />
              </div>
            </div>
          );
        })}
        {realtime.otherTyping ? (
          <p className="self-start text-xs italic text-muted" aria-live="polite">
            Đang soạn…
          </p>
        ) : null}
      </div>

      {/* Scroll-to-latest */}
      {!atBottom ? (
        <button
          type="button"
          onClick={() => {
            stick.scrollToBottom();
          }}
          aria-label="Xuống tin nhắn mới nhất"
          className={
            "self-center flex items-center gap-1.5 -mt-10 mb-2 z-10 rounded-full " +
            "border border-line bg-card px-3 py-1.5 text-xs font-medium text-ink shadow-sm transition hover:bg-tint"
          }
        >
          <ArrowDown className="size-3.5" aria-hidden />
          <span>Mới nhất</span>
        </button>
      ) : null}

      {/* Composer: auto-growing textarea + attachment */}
      <div className="shrink-0 border-t border-line bg-card/95 backdrop-blur-md p-3">
        {attachment ? (
          <div
            className="mb-2 max-w-sm flex items-center gap-2 rounded-xl border border-line bg-paper/80 p-2 shadow-xs"
          >
            {attachmentPreview ? (
              <img
                src={attachmentPreview}
                alt={attachment.name}
                className="size-10 rounded-lg object-cover border border-line shrink-0"
              />
            ) : (
              <FileText className="size-5 text-plate shrink-0" />
            )}
            <div className="min-w-0 flex-1 text-xs">
              <p className="truncate font-medium text-ink">{attachment.name}</p>
              <p className="text-muted text-[11px]">{(attachment.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              type="button"
              className="rounded-full p-1 text-xs text-muted hover:text-danger hover:bg-danger-tint transition"
              onClick={removeAttachment}
              aria-label="Xóa tệp đính kèm"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}

        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            accept=".pdf,.jpg,.jpeg,.png,.docx"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                if (f.size > 5 * 1024 * 1024) {
                  toast("Tệp đính kèm tối đa 5 MB.");
                  e.target.value = "";
                  return;
                }
                if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
                setAttachment(f);
                if (f.type.startsWith("image/")) {
                  setAttachmentPreview(URL.createObjectURL(f));
                } else {
                  setAttachmentPreview(null);
                }
              }
            }}
          />
          <button
            type="button"
            aria-label="Đính kèm tệp"
            onClick={() => fileRef.current?.click()}
            className={
              "flex size-10 shrink-0 items-center justify-center rounded-full text-ink-2 " +
              "hover:bg-tint hover:text-plate transition-colors focus-visible:outline-none " +
              "focus-visible:ring-2 focus-visible:ring-plate"
            }
          >
            <Paperclip className="size-5" aria-hidden />
          </button>

          <div
            className={
              "relative flex min-h-[42px] max-h-36 flex-1 items-center rounded-2xl border " +
              "border-line bg-paper/40 px-3.5 py-1 focus-within:border-plate focus-within:bg-card " +
              "focus-within:ring-1 focus-within:ring-plate transition-all"
            }
          >
            <textarea
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value.slice(0, MESSAGE_MAX));
                realtime.setOtherTyping(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              aria-label="Tin nhắn"
              placeholder="Nhập tin nhắn..."
              rows={1}
              className={
                "w-full resize-none bg-transparent py-1.5 text-sm text-ink " +
                "placeholder:text-muted focus:outline-none leading-relaxed"
              }
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={actions.sending}
            disabled={actions.sending || (!draft.trim() && !attachment)}
            className="size-10 shrink-0 rounded-full p-0 flex items-center justify-center shadow-xs"
            aria-label="Gửi tin nhắn"
          >
            <Send className="size-4" aria-hidden />
          </Button>
        </form>
        {actions.error ? (
          <p role="alert" className="mt-2 text-xs text-danger">
            {actions.error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function ConversationDetail() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  useDocumentTitle("Tin nhắn · TROSV");
  if (loading) return null;
  /* Logged-out guests see the messages gate (SPEC), not a login
     redirect — the route is intentionally left outside ProtectedRoute. */
  if (!user) {
    return (
      <div className="flex flex-1 flex-col bg-card">
        <GateScreen
          testId="messages-gate"
          title="Trung tâm tin nhắn"
          description={
            "Mọi cuộc trò chuyện với chủ nhà và sinh viên đều ở đây " +
            "để bạn không bỏ lỡ tin nào. Đăng nhập để bắt đầu nhắn tin."
          }
          illustration={<MessagesGateIllustration />}
        />
        <div className="mt-auto">
          <Footer />
        </div>
      </div>
    );
  }
  if (id == null) return null;
  return <Thread id={id} />;
}
