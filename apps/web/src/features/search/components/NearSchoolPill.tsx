import { FilterPill } from "./FilterPill";
import { SELECT_FIELD_CLASS } from "./LocationSelects";
import { schoolPlaceholder, schoolsFor } from "../lib/locationOptions";
import type { SearchState } from "../lib/types";

export const RADIUS_OPTIONS = [
  { value: "1", label: "Trong 1 km" },
  { value: "2", label: "Trong 2 km" },
  { value: "3", label: "Trong 3 km" },
  { value: "5", label: "Trong 5 km" },
] as const;

const LABEL_CLASS = "flex flex-col gap-1 text-xs font-medium text-ink-2";

/** "Gần trường": only school select (filtered by city) and optional radius. Disabled until city is chosen. */
export function NearSchoolPill({ search }: { search: SearchState }) {
  const { city_id: cityId, school_id: schoolId, max_km: maxKm } = search.filters;
  const isCityChosen = cityId !== "";
  const schools = schoolsFor(search.schools, { cityId });

  return (
    <FilterPill
      label="Gần trường"
      active={schoolId !== "" || maxKm !== ""}
      disabled={!isCityChosen}
      disabledTitle="Vui lòng chọn Tỉnh/Thành phố ở mục Khu vực trước"
      onClear={() => {
        search.setFilter("school_id", "");
        search.setFilter("max_km", "");
      }}
    >
      <div className="flex flex-col gap-3 min-w-[250px]">
        <div>
          <label htmlFor="filter-school" className={LABEL_CLASS}>
            Trường đại học
            <select
              id="filter-school"
              value={schoolId}
              onChange={(e) => {
                search.setFilter("school_id", e.target.value);
              }}
              className={SELECT_FIELD_CLASS}
            >
              <option value="">{schoolPlaceholder(cityId)}</option>
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
