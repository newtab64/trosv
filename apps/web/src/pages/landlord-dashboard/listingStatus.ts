/*
  How a listing's status looks on the landlord dashboard. A table, not a chain
  of conditions, so a new status is one more line.
*/

export const STATUS_FILTERS = [
  { value: "", label: "Tất cả" },
  { value: "available", label: "Còn trống" },
  { value: "rented", label: "Đã thuê" },
  { value: "hidden", label: "Ẩn" },
] as const;

interface StatusStyle {
  label: string;
  /** Background of the pill. */
  pill: string;
  /** Background of the small dot inside it. */
  dot: string;
}

const STATUS_STYLES: Record<string, StatusStyle> = {
  available: { label: "Còn trống", pill: "bg-moss/90 text-white", dot: "bg-white" },
  rented: { label: "Đã thuê", pill: "bg-ink/80 text-white", dot: "bg-white/70" },
  hidden: { label: "Ẩn", pill: "bg-muted/90 text-white", dot: "bg-white/50" },
};

const DEFAULT_DOT = "bg-white";

/** Pill text: the known label, the raw status if unknown, or "Mới" when there is none. */
export function statusLabel(status: string | undefined): string {
  if (!status) return "Mới";
  return STATUS_STYLES[status]?.label ?? status;
}

export function statusPillClass(status: string | undefined): string {
  return (status && STATUS_STYLES[status]?.pill) || "";
}

export function statusDotClass(status: string | undefined): string {
  return (status && STATUS_STYLES[status]?.dot) || DEFAULT_DOT;
}
