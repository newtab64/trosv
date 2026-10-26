import * as React from "react";
import { cn } from "@/lib/utils";

/*
  TROSV form controls. One shared surface so Input, Textarea and
  PasswordInput cannot drift: 48px, white, 1px strong line, 8px radius.
  Focus uses the global plate ring; `invalid` swaps the border to danger.
*/
export function controlClass(invalid?: boolean): string {
  return cn(
    "w-full rounded-lg border bg-card text-base text-ink placeholder:text-muted",
    "transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50",
    invalid ? "border-danger" : "border-line-strong hover:border-ink-2"
  );
}

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, invalid, ...props }, ref) => (
    <input
      type={type}
      className={cn(controlClass(invalid), "h-12 px-4", className)}
      ref={ref}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
);
Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      className={cn(controlClass(invalid), "min-h-24 p-4", className)}
      ref={ref}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Input, Textarea };
