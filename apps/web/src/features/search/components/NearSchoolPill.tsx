import { SchoolCombobox } from "@/features/profile/components/SchoolCombobox";
import { cn } from "@/shared/lib/utils";
import { FilterPill } from "./FilterPill";
import type { SearchState } from "../lib/types";

/** "" = no radius: every room, sorted by distance to the school. */
const RADIUS_OPTIONS = [
  { value: "1", label: "1 km" },
  { value: "2", label: "2 km" },
  { value: "3", label: "3 km" },
  { value: "5", label: "5 km" },
  { value: "", label: "Mọi khoảng cách" },
] as const;

const LABEL_CLASS = "text-xs font-medium text-ink-2";
const CHIP = "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors";

/** "Gần trường": type to find a school (no city or ward first), then pick a radius. */
export function NearSchoolPill({ search }: { search: SearchState }) {
  const { school_id: schoolId, max_km: maxKm } = search.filters;

  return (
    <FilterPill
      label="Gần trường"
      active={schoolId !== "" || maxKm !== ""}
      onClear={() => {
        search.setSchool("");
      }}
      contentClassName="w-[380px] max-w-[calc(100vw-2rem)]"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className={LABEL_CLASS}>Trường</span>
          <SchoolCombobox
            schools={search.schools}
            value={schoolId}
            onChange={(id) => {
              search.setSchool(id);
            }}
          />
        </div>

        {schoolId !== "" ? (
          <div role="group" aria-label="Bán kính" className="flex flex-col gap-1.5">
            <span className={LABEL_CLASS}>Bán kính</span>
            <div className="flex flex-wrap gap-1.5">
              {RADIUS_OPTIONS.map((r) => {
                const on = maxKm === r.value;
                return (
                  <button
                    key={r.value || "all"}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      search.setFilter("max_km", r.value);
                    }}
                    className={cn(
                      CHIP,
                      on
                        ? "border-plate bg-plate text-white"
                        : "border-line bg-card text-ink hover:bg-tint",
                    )}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </FilterPill>
  );
}
