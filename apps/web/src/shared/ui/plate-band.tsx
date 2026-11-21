import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

/*
  PlateBand: the navy "street-name plate" that opens a page. One component,
  two sizes, so the few places that use it share one brand moment.

  - hero:   full Home hero. `backdrop` (artwork) sits behind the content.
  - strip:  slim bar for tools (search + filters). No heading.

  Reserved for the Home hero and the Search strip; other pages use PageHeader.

  The highlighted keyword is the one place flyer yellow appears in a title.
*/

export interface PlateBandProps {
  size: "hero" | "strip";
  title?: ReactNode;
  /** Keyword shown on a yellow flyer tab after the title. */
  highlight?: string;
  description?: ReactNode;
  /** Artwork rendered behind the content (hero size). */
  backdrop?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Overrides the inner column width/padding so the band lines up with the page below. */
  contentClassName?: string;
  /** Extra classes for the hero heading (e.g. a smaller size when art sits beside it). */
  headingClassName?: string;
}

const MARK = "rounded-md bg-flyer px-2 text-flyer-ink";

export function PlateBand({
  size,
  title,
  highlight,
  description,
  backdrop,
  children,
  className,
  contentClassName,
  headingClassName,
}: PlateBandProps) {
  const heading =
    title != null || highlight ? (
      <h1
        className={cn(
          "font-display font-extrabold tracking-tight text-white",
          size === "hero"
            ? "max-w-2xl text-3xl sm:text-4xl md:text-5xl lg:text-6xl"
            : "text-2xl sm:text-3xl",
          headingClassName,
        )}
      >
        {title}
        {highlight ? (
          <>
            {title != null ? size === "hero" ? <br /> : " " : null}
            <mark
              className={cn(
                MARK,
                "box-decoration-clone",
                size === "hero" ? "inline-block w-fit leading-[1.15]" : "inline-block",
              )}
            >
              {highlight}
            </mark>
          </>
        ) : null}
      </h1>
    ) : null;

  const intro = description ? (
    <p className="mt-1 max-w-2xl text-sm text-white/80 sm:text-base">{description}</p>
  ) : null;

  if (size === "strip") {
    return (
      <section
        data-testid="plate-band"
        data-size="strip"
        className={cn("relative z-10 bg-band text-white shadow-seam", className)}
      >
        <div
          className={cn(
            "flex min-h-16 w-full items-center gap-3 px-4 py-3 sm:px-6",
            contentClassName,
          )}
        >
          {children}
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="plate-band"
      data-size="hero"
      className={cn(
        "relative z-10 flex items-center bg-band text-white shadow-seam md:min-h-[420px]",
        className,
      )}
    >
      {/* Clip only the artwork: clipping the section also cut off popovers such as the search suggestions. */}
      {backdrop ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {backdrop}
        </div>
      ) : null}
      <div
        className={cn(
          "relative mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 md:gap-6 md:px-8 md:py-12",
          contentClassName,
        )}
      >
        {heading}
        {intro}
        {children}
      </div>
    </section>
  );
}
