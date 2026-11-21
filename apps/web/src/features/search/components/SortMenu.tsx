import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/lib/utils";
import { SORT_OPTIONS, sortLabel } from "../lib/filterChips";

/** "Sắp xếp: Mới nhất ▾" dropdown. */
export function SortMenu({
  sort,
  onChange,
  hasSchool = false,
}: {
  sort: string;
  onChange: (sort: string) => void;
  /** "Gần trường nhất" needs a school to measure from. */
  hasSchool?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const closedByScroll = useRef(false);

  // Portalled above the page, so it would float over the sticky header and filter bar when the
  // page scrolls under it. Like a native select, it closes instead.
  useEffect(() => {
    if (!open) return;
    const close = () => {
      closedByScroll.current = true;
      setOpen(false);
    };
    window.addEventListener("scroll", close, { passive: true });
    return () => {
      window.removeEventListener("scroll", close);
    };
  }, [open]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted hidden sm:inline">Sắp xếp:</span>
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next) closedByScroll.current = false;
          setOpen(next);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className={
              "inline-flex items-center gap-1 rounded-md border border-line bg-card " +
              "px-2.5 py-1 text-xs font-semibold text-ink shadow-2xs hover:bg-tint " +
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate"
            }
          >
            <span>{sortLabel(sort)}</span>
            <ChevronDown className="size-3.5 text-muted" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-44 p-1"
          // Closed by scrolling: do not hand focus back to the button, the browser would scroll to it.
          onCloseAutoFocus={(e) => {
            if (closedByScroll.current) e.preventDefault();
          }}
        >
          {SORT_OPTIONS.filter((opt) => hasSchool || opt.value !== "distance").map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
              }}
              className={cn(
                "w-full rounded px-2.5 py-1.5 text-left text-xs transition-colors",
                sort === opt.value
                  ? "bg-plate-tint font-bold text-plate"
                  : "text-ink hover:bg-tint",
              )}
            >
              {opt.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
