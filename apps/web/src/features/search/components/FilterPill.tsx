import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/lib/utils";

export interface FilterPillProps {
  label: string;
  active: boolean;
  onClear: () => void;
  disabled?: boolean;
  disabledTitle?: string;
  children: ReactNode;
}

/** A pill in the filter strip that opens a popover; yellow while its filter is active. */
export function FilterPill({ label, active, onClear, disabled = false, disabledTitle, children }: FilterPillProps) {
  const btn = (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      title={disabled ? (disabledTitle ?? "Vui lòng chọn Tỉnh/Thành phố trước") : undefined}
      className={cn(
        "h-10 flex-none rounded-lg border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate",
        disabled && "cursor-not-allowed opacity-50 hover:bg-white/10",
        !disabled && active ? "border-flyer bg-flyer font-semibold text-flyer-ink" : "border-white/30 bg-white/10 text-white hover:bg-white/20",
      )}
    >
      {label}
    </button>
  );
  if (disabled) return btn;

  return (
    <Popover>
      <PopoverTrigger asChild>{btn}</PopoverTrigger>
      <PopoverContent>
        {children}
        {active ? (
          <button type="button" onClick={onClear} className="mt-3 text-sm font-medium text-muted underline hover:text-ink">
            Xóa lọc này
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}