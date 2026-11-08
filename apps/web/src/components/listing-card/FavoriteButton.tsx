import type { MouseEvent } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

/** Heart in the card's top-right corner; pops once when a room is saved. */
export function FavoriteButton({
  isFavorite,
  pop,
  onClick,
  onPopEnd,
}: {
  isFavorite: boolean;
  pop: boolean;
  onClick: (e: MouseEvent) => void;
  onPopEnd: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={isFavorite ? "Bỏ lưu phòng" : "Lưu phòng"}
      aria-pressed={isFavorite}
      onClick={onClick}
      className={cn(
        "absolute right-2.5 top-2.5 z-10 flex size-8 items-center justify-center rounded-full bg-card/90 shadow-xs backdrop-blur-xs transition hover:scale-110",
        isFavorite ? "text-danger" : "text-ink hover:text-danger",
      )}
    >
      <Heart
        className={cn(
          "size-4 transition-colors",
          pop && "motion-heart-pop",
          isFavorite ? "fill-danger stroke-danger text-danger" : "stroke-ink hover:stroke-danger",
        )}
        aria-hidden
        onAnimationEnd={onPopEnd}
      />
    </button>
  );
}
