import { Toaster as Sonner } from "sonner";

/*
  Toast: bottom-centre, ink on white text, 4s. Sonner handles aria-live.
  Sits above the mobile tab bar.
*/

import { useTheme } from "@/context/ThemeContext";

export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme}
      position="bottom-center"
      duration={4000}
      style={{ fontFamily: "var(--font-sans)" }}
      toastOptions={{
        classNames: {
          toast: "!bg-card !text-ink !border-line-strong !rounded-lg !shadow-pop !text-sm",
          description: "!text-muted",
          actionButton: "!bg-plate !text-white !rounded-md !font-semibold",
        },
      }}
    />
  );
}

export { toast } from "sonner";
