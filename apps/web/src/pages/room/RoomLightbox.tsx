import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RoomLightboxProps {
  images: { id: number; url: string }[];
  index: number;
  onClose: () => void;
  onNavigate: (next: number) => void;
}

export function RoomLightbox({
  images,
  index,
  onClose,
  onNavigate,
}: RoomLightboxProps) {
  const total = images.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNavigate((index - 1 + total) % total);
      if (e.key === "ArrowRight") onNavigate((index + 1) % total);
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); };
  }, [index, total, onClose, onNavigate]);

  const ref = useCallback((node: HTMLDivElement | null) => {
    node?.focus();
  }, []);

  const current = images[index];
  if (!current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ảnh ${index + 1} trên ${total}`}
      ref={ref}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4 focus:outline-none"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng"
        className={cn(
          "absolute right-4 top-4 rounded-full p-2 text-white hover:bg-ink-2",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate"
        )}
      >
        <X className="size-6" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => { onNavigate((index - 1 + total) % total); }}
        aria-label="Ảnh trước"
        className={cn(
          "absolute left-4 rounded-full bg-card/90 p-2 text-ink hover:bg-card",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate"
        )}
      >
        <ChevronLeft className="size-6" aria-hidden />
      </button>
      <img
        src={current.url}
        alt=""
        className="max-h-[85vh] max-w-full rounded-xl object-contain"
        width={1600}
        height={1067}
      />
      <button
        type="button"
        onClick={() => { onNavigate((index + 1) % total); }}
        aria-label="Ảnh sau"
        className={cn(
          "absolute right-4 rounded-full bg-card/90 p-2 text-ink hover:bg-card",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate"
        )}
      >
        <ChevronRight className="size-6" aria-hidden />
      </button>
      <p aria-live="polite" className="absolute bottom-4 text-sm tabular-nums text-white">
        {index + 1} / {total}
      </p>
    </div>
  );
}
