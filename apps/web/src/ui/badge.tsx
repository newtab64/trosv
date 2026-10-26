import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/* Tag: small square label, e.g. listing type over a photo. */
const tagVariants = cva(
  "inline-flex items-center whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        paper: "bg-paper text-ink",
        sunken: "bg-sunken text-ink",
        outline: "border border-line-strong bg-transparent text-ink",
      },
    },
    defaultVariants: { variant: "paper" },
  }
);

export interface TagProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof tagVariants> {}

export function Tag({ className, variant, ...props }: TagProps) {
  return <span className={cn(tagVariants({ variant }), className)} {...props} />;
}

/* Chip: interactive filter pill; `on` = selected state (plate fill). */
export interface ChipProps extends React.ComponentProps<"button"> {
  on?: boolean;
}

export function Chip({ className, on, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full border px-4",
        "text-sm font-medium transition-colors duration-150 ease-out",
        on
          ? "border-plate bg-plate text-white hover:bg-plate-hover"
          : "border-line-strong bg-card text-ink hover:bg-tint",
        "disabled:opacity-50",
        className
      )}
      aria-pressed={on}
      {...props}
    />
  );
}

/* Unread-count badge: plate fill, white text. */
export function Badge({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-full",
        "bg-plate px-1.5 text-xs font-bold leading-5 text-white",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/* Skeleton: slow opacity pulse mirroring the real layout. */
export function Skeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-sunken",
        className
      )}
      aria-hidden
      {...props}
    />
  );
}

/* Star rating, display only. With no rating yet it says so without a star. */
export function Rating({
  value,
  count,
  className,
}: {
  value: number | null | undefined;
  count?: number | null | undefined;
  className?: string;
}) {
  if (value == null) {
    return <span className={cn("text-sm text-muted", className)}>Chưa có đánh giá</span>;
  }
  const hasCount = count != null && count > 0;
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-sm", className)}
      aria-label={
        hasCount
          ? `${value.toFixed(1)} trên 5 sao, ${count} đánh giá`
          : `${value.toFixed(1)} trên 5 sao`
      }
    >
      <Star className="size-4 fill-ink stroke-ink" aria-hidden />
      <span className="tabular-nums font-medium text-ink">{value.toFixed(1)}</span>
      {hasCount ? <span className="tabular-nums text-muted">({count})</span> : null}
    </span>
  );
}
