/*
  Pure rules for the city -> ward -> school cascade in the filter popovers.
*/

interface WithCity {
  city?: { id: number } | null | undefined;
  city_id?: number | null | undefined;
}

export interface WardLike extends WithCity {
  id: number;
  name: string;
}

export interface SchoolLike extends WithCity {
  id: number;
  name: string;
  ward?: { id: number } | null | undefined;
}

const cityOf = (row: WithCity): string => String(row.city?.id ?? row.city_id ?? "");

/** Wards of the chosen city (all wards while no city is chosen). */
export function wardsInCity<T extends WardLike>(wards: readonly T[], cityId: string): T[] {
  return wards.filter((w) => cityId === "" || cityOf(w) === cityId);
}

/**
 * Schools of the chosen ward, else of the chosen city, else all. A selected
 * school from another ward stays visible so changing the ward keeps it.
 */
export function schoolsFor<T extends SchoolLike>(
  schools: readonly T[],
  selection: { cityId: string; wardId: string },
  selectedId = "",
): T[] {
  const list = schools.filter((s) =>
    selection.wardId !== ""
      ? String(s.ward?.id) === selection.wardId
      : selection.cityId === "" || cityOf(s) === selection.cityId,
  );
  const selected = selectedId === "" ? undefined : schools.find((s) => String(s.id) === selectedId);
  return selected !== undefined && !list.some((s) => s.id === selected.id)
    ? [selected, ...list]
    : list;
}

export function wardPlaceholder(cityId: string): string {
  return cityId === "" ? "Chọn Tỉnh/TP trước" : "Tất cả phường";
}

export function schoolPlaceholder(cityId: string, wardId: string): string {
  if (cityId === "") return "Chọn Tỉnh/TP trước";
  if (wardId === "") return "Chọn trường trong tỉnh/TP này";
  return "Chọn trường trong phường này";
}
