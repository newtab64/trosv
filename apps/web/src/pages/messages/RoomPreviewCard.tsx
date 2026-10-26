import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getListing } from "@/api/listingApi";
import type { Listing } from "@/types/api";
import { formatPriceShort } from "@/lib/format";
import { ExternalLink, Home, SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { EMOJIS, ReactionBadge } from "@/pages/messages/ReactionBadge";

export interface RoomPreviewCardProps {
  roomId: number;
  isMine?: boolean;
  reactions?: string[];
  myReaction?: string | null | undefined;
  onReact?: (emoji: string) => void;
}

// Simple in-memory cache to prevent repeated fetches across bubbles
const roomCache = new Map<number, Listing>();

export function RoomPreviewCard({
  roomId,
  isMine = false,
  reactions = [],
  myReaction = null,
  onReact,
}: RoomPreviewCardProps) {
  const cached = roomCache.get(roomId);
  const [room, setRoom] = useState<Listing | null>(() => cached ?? null);
  const [loading, setLoading] = useState<boolean>(() => !cached);
  const [reactOpen, setReactOpen] = useState(false);

  useEffect(() => {
    if (roomCache.has(roomId)) {
      return;
    }

    let active = true;
    getListing(roomId)
      .then((data) => {
        if (!active) return;
        roomCache.set(roomId, data);
        setRoom(data);
      })
      .catch(() => {
        if (!active) return;
        setRoom(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [roomId]);

  if (loading) {
    return (
      <div className={cn("relative w-full", reactions.length > 0 ? "mb-2.5" : "")}>
        <div
          className={cn(
            "flex w-full max-w-[320px] items-center gap-3 rounded-xl border p-2.5",
            isMine ? "border-white/20 bg-white/10" : "border-line bg-tint/40"
          )}
        >
          <div className="size-16 animate-pulse rounded-lg bg-black/10" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 animate-pulse rounded bg-black/10" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-black/10" />
          </div>
        </div>
        {reactions.length > 0 ? (
          <ReactionBadge reactions={reactions} isMine={isMine} />
        ) : null}
      </div>
    );
  }

  if (!room) {
    return (
      <div className={cn("relative inline-flex flex-col", reactions.length > 0 ? "mb-2.5" : "")}>
        <Link
          to={`/rooms/${roomId}`}
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium underline hover:opacity-80 transition-opacity",
            isMine ? "text-white" : "text-plate"
          )}
        >
          <span>Xem thông tin phòng #{roomId}</span>
          <ExternalLink className="size-3" />
        </Link>
        {reactions.length > 0 ? (
          <ReactionBadge reactions={reactions} isMine={isMine} />
        ) : null}
      </div>
    );
  }

  const coverUrl = room.cover_image ?? room.images?.[0]?.url;
  const locationText =
    [room.ward?.name, room.ward?.city?.name ?? room.city_name].filter(Boolean).join(", ") ||
    room.address;
  const typeLabel =
    room.type === "apartment" ? "Căn hộ" : room.type === "house" ? "Nhà nguyên căn" : "Phòng trọ";

  return (
    <div className={cn("relative w-full group/card", reactions.length > 0 ? "mb-2.5" : "")}>
      <Link
        to={`/rooms/${roomId}`}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border border-line-strong/30 bg-card p-2.5",
          "shadow-xs transition hover:border-plate/50 hover:shadow-md text-left"
        )}
      >
        {/* Square Thumbnail */}
        <div className="relative size-18 shrink-0 overflow-hidden rounded-lg bg-sunken">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={room.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted">
              <Home className="size-6" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch py-0.5">
          <div>
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 text-[11px] font-medium text-muted">
                <span>{typeLabel}</span>
                {room.area_m2 ? (
                  <>
                    <span>•</span>
                    <span>{room.area_m2} m²</span>
                  </>
                ) : null}
              </div>

              {/* Reaction button on preview card */}
              {onReact ? (
                <div className="relative shrink-0">
                  <Popover open={reactOpen} onOpenChange={setReactOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-label="Thả cảm xúc phòng này"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setReactOpen((prev) => !prev);
                        }}
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full border border-line",
                          "bg-card/95 text-muted transition-all hover:bg-tint hover:text-plate hover:scale-110",
                          "focus-visible:outline-none",
                          myReaction
                            ? "text-plate border-plate/30 bg-tint/80 ring-1 ring-plate/20"
                            : "opacity-80 sm:opacity-0 group-hover/card:opacity-100"
                        )}
                      >
                        {myReaction ? (
                          <span className="text-xs leading-none">{myReaction}</span>
                        ) : (
                          <SmilePlus className="size-3.5" aria-hidden />
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align={isMine ? "end" : "start"}
                      side="bottom"
                      sideOffset={6}
                      collisionPadding={8}
                      onCloseAutoFocus={(e) => {
                        e.preventDefault();
                      }}
                      className="z-50 w-auto rounded-2xl border border-line bg-card p-1.5 shadow-pop focus:outline-none"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <div className="flex items-center gap-1" role="group" aria-label="Biểu cảm">
                        {EMOJIS.map((e) => (
                          <button
                            key={e}
                            type="button"
                            className={cn(
                              "flex size-7 shrink-0 items-center justify-center rounded-full text-base",
                              "transition-transform hover:scale-125 hover:bg-tint",
                              "active:scale-110 focus-visible:outline-none",
                              myReaction === e ? "bg-plate/15 ring-2 ring-plate/40" : ""
                            )}
                            onClick={(ev) => {
                              ev.preventDefault();
                              ev.stopPropagation();
                              onReact(e);
                              setReactOpen(false);
                            }}
                            aria-label={`Biểu cảm ${e}`}
                          >
                            <span className="leading-none">{e}</span>
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              ) : null}
            </div>

            <h4 className="mt-0.5 line-clamp-1 text-xs font-semibold text-ink group-hover:text-plate transition-colors">
              {room.title}
            </h4>
            {locationText ? (
              <p className="text-[11px] text-muted truncate">{locationText}</p>
            ) : null}
          </div>

          <div className="mt-1 flex items-baseline justify-between gap-1">
            <span className="text-xs font-bold text-plate tabular-nums">
              {formatPriceShort(room.price)}/tháng
            </span>
            <span
              className="text-[10px] text-muted group-hover:text-plate flex items-center gap-0.5 font-medium shrink-0"
            >
              Xem chi tiết
              <ExternalLink className="size-2.5" />
            </span>
          </div>
        </div>
      </Link>

      {/* Reaction Badge on preview card */}
      {reactions.length > 0 ? (
        <ReactionBadge
          reactions={reactions}
          isMine={isMine}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setReactOpen((prev) => !prev);
          }}
        />
      ) : null}
    </div>
  );
}
