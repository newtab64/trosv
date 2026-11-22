/*
  Pure rules for the city -> ward cascade in the filter popovers.
*/

interface WithCity {
  city?: { id: number } | null | undefined;
  city_id?: number | null | undefined;
}

export interface WardLike extends WithCity {
  id: number;
  name: string;
}

const cityOf = (row: WithCity): string => String(row.city?.id ?? row.city_id ?? "");

/** Wards of the chosen city (all wards while no city is chosen). */
export function wardsInCity<T extends WardLike>(wards: readonly T[], cityId: string): T[] {
  return wards.filter((w) => cityId === "" || cityOf(w) === cityId);
}

export function wardPlaceholder(cityId: string): string {
  return cityId === "" ? "Chọn Tỉnh/TP trước" : "Tất cả phường";
}
