import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md";
}

export function ThemeToggle({ className, size = "md" }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
      title={isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
      className={cn(
        "relative inline-flex items-center justify-center rounded-lg border border-line",
        "bg-card text-ink transition-all hover:bg-tint active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate",
        size === "sm" ? "size-8" : "size-9",
        className,
      )}
    >
      {isDark ? (
        <Sun
          className="size-4.5 text-amber-400 transition-transform duration-200 rotate-0"
          aria-hidden
        />
      ) : (
        <Moon
          className="size-4.5 text-ink-2 transition-transform duration-200 rotate-0"
          aria-hidden
        />
      )}
    </button>
  );
}
