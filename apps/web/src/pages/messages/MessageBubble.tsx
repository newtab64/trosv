import { useState } from "react";
import type { Message } from "@/types/api";
import { cn } from "@/lib/utils";
import { Copy, FileText, MoreVertical, RotateCcw, Trash2 } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/ui/popover";
import { toast } from "@/ui/toast";

import { RoomPreviewCard } from "@/pages/messages/RoomPreviewCard";
import { EMOJIS, ReactionBadge } from "@/pages/messages/ReactionBadge";

export { EMOJIS };

export type BubbleShape = "single" | "first" | "middle" | "last";

export function getBubbleRadius(): string {
  // Uniform clean shape: slightly rounded corner (12px), not too round
  return "rounded-xl";
}

export interface MessageBubbleProps {
  msg: Message;
  isMine: boolean;
  grouped: boolean;
  shape?: BubbleShape;
  showTimestamp?: boolean;
  onReact: (m: Message, emoji: string) => void;
  onUnsend: (m: Message) => void;
  onDeleteSelf: (m: Message) => void;
  currentUserId?: number | undefined;
}

/**
 * Chuẩn hóa attachment_url sang đường dẫn tương đối (/attachments/...)
 * để browser gọi đúng port của ứng dụng (5174 hoặc 5173).
 */
export function resolveAttachmentUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const parsed = new URL(url);
      return `${parsed.pathname}${parsed.search}`;
    }
    return url;
  } catch {
    return url;
  }
}

export function isImageAttachment(
  name?: string | null,
  url?: string | null,
  type?: string | null
): boolean {
  if (type && type.startsWith("image/")) return true;
  const imageRegex = /\.(jpg|jpeg|png|webp|gif|bmp|svg|avif)($|\?)/i;
  if (name && imageRegex.test(name)) return true;
  if (url && imageRegex.test(url)) return true;
  return false;
}

function renderBodyWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+|\/rooms\/\d+)/g;
  const parts = text.split(urlRegex);
  if (parts.length === 1) return text;

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      const isInternal = part.startsWith("/rooms/");
      return (
        <a
          key={index}
          href={part}
          target={isInternal ? undefined : "_blank"}
          rel={isInternal ? undefined : "noopener noreferrer"}
          className="font-medium underline hover:opacity-80 transition-opacity break-all text-inherit"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export function MessageBubble(props: MessageBubbleProps) {
  const {
    msg,
    isMine,
    showTimestamp = true,
    onReact,
    onUnsend,
    onDeleteSelf,
    currentUserId,
  } = props;
  const [open, setOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [explicitShowTime, setExplicitShowTime] = useState<boolean | null>(null);

  const isTimeVisible = explicitShowTime !== null ? explicitShowTime : showTimestamp;

  const handleBubbleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, a, input, textarea")) return;
    setExplicitShowTime((prev) => (prev !== null ? !prev : !showTimestamp));
  };

  if (msg.is_unsent) {
    return (
      <div className={cn("flex w-full", isMine ? "justify-end" : "justify-start")}>
        <p
          className={cn(
            "rounded-xl border border-dashed border-line bg-tint/50 px-3.5 py-2 text-xs italic text-muted",
            isMine ? "text-right" : "text-left"
          )}
        >
          Tin nhắn đã được thu hồi
        </p>
      </div>
    );
  }

  const reactionsMap = msg.reactions ?? {};
  const reactions = Object.values(reactionsMap);
  const myReaction = currentUserId ? reactionsMap[String(currentUserId)] : undefined;
  const resolvedUrl = resolveAttachmentUrl(msg.attachment_url);
  const isImage = isImageAttachment(msg.attachment_name, resolvedUrl, msg.attachment_type);

  const dateObj = msg.created_at ? new Date(msg.created_at) : null;
  const timeStr = dateObj
    ? dateObj.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const fullTimeStr = dateObj
    ? `${dateObj.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}, ` +
      dateObj.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";

  // Extract room link if present
  const match = msg.body?.match(/(?:https?:\/\/[^\s]+)?\/rooms\/(\d+)/);
  const roomId = match ? Number(match[1]) : null;

  let cleanText = msg.body ?? "";
  if (roomId) {
    cleanText = cleanText.replace(/(?:https?:\/\/[^\s]+)?\/rooms\/\d+/g, "").trim();
    if (/^Chào bạn,\s*mình quan tâm đến phòng trọ:/i.test(cleanText)) {
      cleanText = "Chào bạn, mình quan tâm đến phòng trọ này:";
    }
  }

  const hasRoomPreview = Boolean(roomId);
  const hasText = Boolean(cleanText);
  const hasAttachment = Boolean(resolvedUrl);

  // Bottom-most element gets the reactions badge attached to it
  const badgeTarget = hasRoomPreview ? "room" : hasText ? "text" : hasAttachment ? "attachment" : null;

  const renderPopoverMenu = (align: "start" | "end") => (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Tùy chọn tin nhắn"
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full border border-line",
            "bg-card/95 text-muted shadow-xs transition-all hover:bg-tint hover:text-ink focus-visible:opacity-100",
            open
              ? "opacity-100 bg-tint text-ink border-plate/30 ring-2 ring-plate/20"
              : "opacity-0 group-hover/msg:opacity-100"
          )}
        >
          <MoreVertical className="size-3.5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side="top"
        sideOffset={6}
        collisionPadding={8}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
        }}
        className="z-50 w-56 rounded-2xl border border-line bg-card p-2 shadow-pop focus:outline-none"
      >
        {/* Reaction picker */}
        <div
          className="flex items-center justify-between gap-0.5 border-b border-line px-1 pb-1.5 pt-0.5 mb-1"
          role="group"
          aria-label="Biểu cảm"
        >
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-base",
                "transition-transform hover:scale-125 hover:bg-tint active:scale-110 focus-visible:outline-none",
                myReaction === e ? "bg-plate/15 ring-2 ring-plate/40" : ""
              )}
              onClick={() => {
                onReact(msg, e);
                setOpen(false);
              }}
              aria-label={`Biểu cảm ${e}`}
            >
              <span className="leading-none">{e}</span>
            </button>
          ))}
        </div>

        {/* Action items */}
        <div className="flex flex-col gap-0.5">
          {msg.body ? (
            <button
              type="button"
              className={
                "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium " +
                "text-ink hover:bg-tint transition-colors"
              }
              onClick={() => {
                void navigator.clipboard.writeText(msg.body ?? "");
                toast("Đã sao chép tin nhắn");
                setOpen(false);
              }}
            >
              <Copy className="size-3.5 text-muted shrink-0" aria-hidden />
              <span>Sao chép văn bản</span>
            </button>
          ) : null}

          {isMine ? (
            <button
              type="button"
              className={
                "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium " +
                "text-danger hover:bg-danger-tint transition-colors"
              }
              onClick={() => {
                onUnsend(msg);
                setOpen(false);
              }}
            >
              <RotateCcw className="size-3.5 text-danger shrink-0" aria-hidden />
              <span>Thu hồi</span>
            </button>
          ) : null}

          <button
            type="button"
            className={
              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium " +
              "text-ink hover:bg-tint transition-colors"
            }
            onClick={() => {
              onDeleteSelf(msg);
              setOpen(false);
            }}
          >
            <Trash2 className="size-3.5 text-muted shrink-0" aria-hidden />
            <span>Xóa chỉ ở phía mình</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <div
      className={cn(
        "flex flex-col w-full max-w-[82%] sm:max-w-[72%]",
        isMine ? "items-end ml-auto" : "items-start mr-auto"
      )}
    >
      <div
        className={cn(
          "group/msg flex items-center gap-1.5 w-full",
          isMine ? "justify-end" : "justify-start"
        )}
      >
        {/* For sender: three-dots trigger on the left of bubble, panel opens rightward over bubble */}
        {isMine ? renderPopoverMenu("start") : null}

        {/* Bubble surface */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div
          onClick={handleBubbleClick}
          title={fullTimeStr}
          className={cn(
            "flex flex-col max-w-full cursor-pointer select-text",
            isMine ? "items-end" : "items-start"
          )}
        >
          {/* Attachment */}
          {resolvedUrl ? (
            <div
              className={cn(
                "relative max-w-full",
                badgeTarget === "attachment" && reactions.length > 0 ? "mb-2.5" : ""
              )}
            >
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  "mb-1 block overflow-hidden rounded-xl border border-line bg-card " +
                  "shadow-xs transition hover:opacity-90 max-w-full"
                }
              >
                {isImage && !imgFailed ? (
                  <img
                    src={resolvedUrl}
                    alt={msg.attachment_name ?? "Ảnh đính kèm"}
                    className="max-h-64 w-auto max-w-full rounded-xl object-contain block bg-sunken"
                    loading="lazy"
                    onError={() => {
                      setImgFailed(true);
                    }}
                  />
                ) : (
                  <span className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-ink hover:underline">
                    <FileText className="size-4 text-plate flex-none" />
                    <span className="max-w-[200px] truncate">
                      {msg.attachment_name ?? "Tài liệu đính kèm"}
                    </span>
                  </span>
                )}
              </a>

              {badgeTarget === "attachment" && reactions.length > 0 ? (
                <ReactionBadge
                  reactions={reactions}
                  isMine={isMine}
                  onClick={() => { setOpen(true); }}
                />
              ) : null}
            </div>
          ) : null}

          {/* Message body */}
          {cleanText ? (
            <div
              className={cn(
                "relative px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap break-words",
                "text-left shadow-xs transition-all",
                getBubbleRadius(),
                badgeTarget === "text" && reactions.length > 0 ? "mb-2.5" : "",
                isMine
                  ? "bg-plate text-white font-normal"
                  : "bg-card text-ink border border-line-strong/30"
              )}
            >
              {renderBodyWithLinks(cleanText)}

              {badgeTarget === "text" && reactions.length > 0 ? (
                <ReactionBadge
                  reactions={reactions}
                  isMine={isMine}
                  onClick={() => { setOpen(true); }}
                />
              ) : null}
            </div>
          ) : null}

          {/* Room preview card (standalone, or after text) */}
          {roomId ? (
            <div
              className={cn(
                "w-full max-w-[340px]",
                cleanText ? "mt-1.5" : ""
              )}
            >
              <RoomPreviewCard
                roomId={roomId}
                isMine={isMine}
                reactions={badgeTarget === "room" ? reactions : []}
                myReaction={myReaction}
                onReact={(emoji) => { onReact(msg, emoji); }}
              />
            </div>
          ) : null}
        </div>

        {/* For recipient: three-dots trigger on the right of bubble, panel opens leftward over bubble */}
        {!isMine ? renderPopoverMenu("end") : null}
      </div>

      {/* Timestamp and seen receipt placed below the bubble (Messenger style: visible on cluster end or on click) */}
      {isTimeVisible ? (
        <div
          className={cn(
            "mt-1 flex items-center gap-1.5 px-1 text-[11px] text-muted",
            "transition-opacity duration-150 animate-fade-in",
            reactions.length > 0 ? "mt-2 pt-0.5" : "",
            isMine ? "justify-end" : "justify-start"
          )}
        >
          <span>{timeStr}</span>
          {isMine && msg.seen_at ? (
            <span className="font-medium text-plate">· Đã xem</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
