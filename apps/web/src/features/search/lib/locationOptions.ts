/*
  Pure rules for the city -> ward & city -> school cascade in the filter popovers.
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

/** Schools of the chosen city (all while no city is chosen). School is bound to city, not ward. */
export function schoolsFor<T extends SchoolLike>(
  schools: readonly T[],
  selection: { cityId: string; wardId?: string },
): T[] {
  return schools.filter((s) => selection.cityId === "" || cityOf(s) === selection.cityId);
}

export function wardPlaceholder(cityId: string): string {
  return cityId === "" ? "Chọn Tỉnh/TP trước" : "Tất cả phường";
}

export function schoolPlaceholder(cityId: string): string {
  return cityId === "" ? "Chọn Tỉnh/TP trước" : "Chọn trường đại học";
}
