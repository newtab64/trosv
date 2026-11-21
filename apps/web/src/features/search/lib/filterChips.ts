/*
  Pure helpers for the Search page: the "active filter" chips, the area name in
  the result count, the sort label and the pagination window. No React.
*/

import { formatVnd } from "@/shared/lib/format";
import type { ListingFilters } from "@/features/search/lib/searchFilters";

export const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "price_asc", label: "Giá thấp trước" },
  { value: "price_desc", label: "Giá cao trước" },
  { value: "rating", label: "Đánh giá cao trước" },
  // Only offered while a school is picked: the distance is to that school.
  { value: "distance", label: "Gần trường nhất" },
] as const;

export const TYPE_OPTIONS = [
  { value: "room", label: "Phòng trọ" },
  { value: "apartment", label: "Căn hộ" },
  { value: "house", label: "Nhà nguyên căn" },
] as const;

interface Named {
  id: number;
  name: string;
}

export interface FilterRefs {
  cities: readonly Named[];
  wards: readonly Named[];
  schools: readonly Named[];
}

/** How a chip clears its filter. */
export interface ChipActions {
  setFilter: (key: keyof ListingFilters, value: string) => void;
  setCity: (id: string) => void;
  setWard: (id: string) => void;
  setSchool: (id: string) => void;
}

export interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

const findName = (rows: readonly Named[], id: string): string | undefined =>
  rows.find((r) => String(r.id) === id)?.name;

export function priceChipLabel(min: string, max: string): string {
  const from = min ? formatVnd(Number(min)) : "";
  const to = max ? formatVnd(Number(max)) : "";
  if (min && max) return `${from} – ${to}`;
  if (min) return `Từ ${from}`;
  return `Dưới ${to}`;
}

/** One chip per active filter that can be shown, in display order. */
export function buildFilterChips(
  filters: ListingFilters,
  refs: FilterRefs,
  actions: ChipActions,
): FilterChip[] {
  const chips: FilterChip[] = [];
  const add = (key: string, label: string | undefined, onRemove: () => void) => {
    if (label) chips.push({ key, label, onRemove });
  };

  add("q", filters.q ? `"${filters.q}"` : undefined, () => {
    actions.setFilter("q", "");
  });
  add("type", TYPE_OPTIONS.find((o) => o.value === filters.type)?.label, () => {
    actions.setFilter("type", "");
  });
  add("city_id", findName(refs.cities, filters.city_id), () => {
    actions.setCity("");
  });
  add("ward_id", findName(refs.wards, filters.ward_id), () => {
    actions.setWard("");
  });
  add(
    "price",
    filters.price_min || filters.price_max
      ? priceChipLabel(filters.price_min, filters.price_max)
      : undefined,
    () => {
      actions.setFilter("price_min", "");
      actions.setFilter("price_max", "");
    },
  );
  add("school_id", findName(refs.schools, filters.school_id), () => {
    actions.setSchool("");
  });
  return chips;
}

/** Name shown after "N kết quả tại …": the most specific area filter set. */
export function areaName(
  filters: Pick<ListingFilters, "ward_id" | "school_id" | "city_id">,
  refs: FilterRefs,
): string | null {
  return (
    findName(refs.wards, filters.ward_id) ??
    findName(refs.schools, filters.school_id) ??
    findName(refs.cities, filters.city_id) ??
    null
  );
}

export function sortLabel(sort: string): string {
  return SORT_OPTIONS.find((s) => s.value === sort)?.label ?? "Mới nhất";
}

/** Up to 5 page numbers around the current page. */
export function paginationWindow(page: number, lastPage: number): number[] {
  const start = Math.max(0, Math.min((page || 1) - 3, lastPage - 5));
  const end = Math.min(lastPage, start + 5);
  return Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i + 1);
}
