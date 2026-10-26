import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/*
  TROSV buttons. `primary` (plate blue) is the screen's main action, at
  most one per section. `ink` is a heavy secondary, `outline` and `ghost`
  are quiet. Flat and border-based; focus uses the global ring.
*/
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border",
    "text-sm font-semibold transition-all duration-150 ease-out active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary:
          "border-plate bg-plate text-white hover:border-plate-hover hover:bg-plate-hover",
        ink: "border-ink bg-ink text-white hover:bg-ink-2",
        outline: "border-line-strong bg-card text-ink hover:bg-tint",
        ghost: "border-transparent bg-transparent text-ink hover:bg-tint",
        danger: "border-danger bg-danger text-white hover:bg-danger/90",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-5",
        lg: "h-12 px-6 text-base",
        icon: "size-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Keeps width stable while swapping the label for a spinner. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, children, disabled, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled ?? loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            <span aria-hidden>{children}</span>
            <span className="sr-only">{typeof children === "string" ? children : ""}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
