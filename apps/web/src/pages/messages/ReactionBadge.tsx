import type React from "react";
import { cn } from "@/lib/utils";

export const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😠"] as const;

export interface ReactionBadgeProps {
  reactions: string[];
  isMine: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export function ReactionBadge({
  reactions,
  isMine,
  onClick,
  className,
}: ReactionBadgeProps) {
  if (reactions.length === 0) return null;

  // Aggregate count by emoji while preserving order of appearance
  const counts = new Map<string, number>();
  for (const emoji of reactions) {
    counts.set(emoji, (counts.get(emoji) ?? 0) + 1);
  }
  const uniqueEmojis = Array.from(counts.keys());

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Xem biểu cảm"
      className={cn(
        "absolute -bottom-2.5 z-20 flex items-center gap-1 rounded-full border border-line-strong/30",
        "bg-card px-2 py-0.5 text-xs shadow-sm transition-all hover:scale-105 active:scale-95",
        "cursor-pointer select-none",
        isMine ? "right-2" : "left-2",
        className
      )}
    >
      <span className="flex items-center -space-x-0.5">
        {uniqueEmojis.slice(0, 3).map((emoji) => (
          <span key={emoji} className="leading-none text-xs">
            {emoji}
          </span>
        ))}
      </span>
      {reactions.length > 1 ? (
        <span className="text-[10px] font-semibold text-muted ml-0.5 leading-none tabular-nums">
          {reactions.length}
        </span>
      ) : null}
    </button>
  );
}
