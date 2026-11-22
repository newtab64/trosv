import { GraduationCap, X } from "lucide-react";
import type { School } from "@/shared/types/api";
import { schoolPlace } from "./schoolSearch";

/** The chosen school, with "change" and "clear" actions. */
export function SelectedSchoolCard({
  school,
  onChange,
  onClear,
}: {
  school: School;
  onChange: () => void;
  onClear: () => void;
}) {
  return (
    <div
      className={
        "flex items-center justify-between rounded-xl border border-line bg-card " +
        "p-3.5 shadow-xs transition hover:border-line-strong"
      }
    >
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-plate-tint text-plate">
          <GraduationCap className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink break-words">{school.name}</p>
          <p className="text-xs text-muted">{schoolPlace(school, "Đại học / Cao đẳng")}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onChange}
          className={
            "rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs font-medium " +
            "text-ink-2 hover:bg-tint hover:text-ink transition-colors"
          }
        >
          Đổi trường
        </button>
        <button
          type="button"
          onClick={onClear}
          aria-label="Xóa chọn trường"
          className="rounded-lg p-1.5 text-muted hover:bg-tint hover:text-danger transition-colors"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
