import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

/*
  Field: wraps Label + control + hint / error. Inline Vietnamese 422
  messages map in via `error`; no layout jump (the error slot is
  always rendered with min-height).
*/

export function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "text-sm font-medium leading-none text-ink peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  );
}

export interface FieldProps {
  /** Must match the input's id — used by both <label htmlFor> and error aria-describedby. */
  id: string;
  label: string;
  hint?: string | null;
  /** undefined = no error slot state change required; null = explicitly no error. */
  error?: string | null | undefined;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: FieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span aria-hidden className="ml-1 text-plate">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-normal text-danger"
        >
          {error}
        </p>
      ) : (
        <>
          {hint ? (
            <p id={hintId} className="text-xs text-muted">
              {hint}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
