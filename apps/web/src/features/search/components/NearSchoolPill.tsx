import { FilterPill } from "./FilterPill";
import { LocationSelects, SELECT_FIELD_CLASS } from "./LocationSelects";
import { schoolPlaceholder, schoolsFor } from "../lib/locationOptions";
import type { SearchState } from "../lib/types";

export const RADIUS_OPTIONS = [
  { value: "1", label: "Trong 1 km" },
  { value: "2", label: "Trong 2 km" },
  { value: "3", label: "Trong 3 km" },
  { value: "5", label: "Trong 5 km" },
] as const;

const LABEL_CLASS = "flex flex-col gap-1 text-xs font-medium text-ink-2";

/** "Gần trường": city, ward, then the schools in that ward, then a radius. */
export function NearSchoolPill({ search }: { search: SearchState }) {
  const { city_id: cityId, ward_id: wardId, school_id: schoolId, max_km: maxKm } = search.filters;
  const schools = schoolsFor(search.schools, { cityId, wardId });

  return (
    <FilterPill
      label="Gần trường"
      active={schoolId !== "" || maxKm !== ""}
      onClear={() => {
        search.setSchool("");
      }}
    >
      <div className="flex flex-col gap-3 min-w-[250px]">
        <LocationSelects idPrefix="near-school" search={search} cityAllLabel="Tất cả tỉnh thành" />

        <div>
          <label htmlFor="filter-school" className={LABEL_CLASS}>
            Trường đại học
            <select
              id="filter-school"
              value={schoolId}
              onChange={(e) => {
                search.setSchool(e.target.value);
              }}
              disabled={wardId === ""}
              className={SELECT_FIELD_CLASS}
            >
              <option value="">{schoolPlaceholder(cityId, wardId)}</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {schoolId !== "" ? (
          <label htmlFor="filter-radius" className={LABEL_CLASS}>
            Bán kính
            <select
              id="filter-radius"
              value={maxKm}
              onChange={(e) => {
                search.setFilter("max_km", e.target.value);
              }}
              className={SELECT_FIELD_CLASS}
            >
              <option value="">Mọi khoảng cách</option>
              {RADIUS_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </FilterPill>
  );
}
