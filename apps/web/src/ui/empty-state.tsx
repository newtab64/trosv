import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
  EmptyState: an invitation to act, not a mood. Copy is written in the
  interface's voice (plain verbs, second person "bạn"), with one clear
  next action when one exists.
*/

export interface EmptyStateProps {
  /** Spot illustration (inline SVG component), aria-hidden. */
  illustration?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  illustration,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16 text-center",
        className
      )}
    >
      {illustration ? (
        <div aria-hidden className="w-full max-w-64">
          {illustration}
        </div>
      ) : null}
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      {description ? (
        <p className="max-w-md text-lg text-ink-2">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/*
  ErrorState: explains what went wrong and how to fix it, in the
  interface's voice. No apology, no vagueness.
*/
export interface ErrorStateProps {
  title?: string;
  message: string;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = "Có lỗi xảy ra",
  message,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-center",
        className
      )}
    >
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <p className="max-w-md text-base text-muted">{message}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
