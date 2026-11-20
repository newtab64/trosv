import { Chip } from "@/shared/ui/badge";
import { PriceRange } from "@/shared/ui/price-range";
import { cn } from "@/shared/lib/utils";
import { FilterPill } from "./FilterPill";
import { LocationSelects } from "./LocationSelects";
import { TYPE_OPTIONS } from "../lib/filterChips";
import type { SearchState } from "../lib/types";

/** "Khu vực": province and ward, plus a reset for everything. */
export function AreaPill({ search }: { search: SearchState }) {
  return (
    <FilterPill
      label="Khu vực"
      active={search.filters.city_id !== "" || search.filters.ward_id !== ""}
      onClear={() => {
        search.setCity("");
      }}
    >
      <div className="flex flex-col gap-3 min-w-[240px]">
        <LocationSelects idPrefix="filter" search={search} cityAllLabel="Tất cả" />
        <button
          type="button"
          onClick={search.resetFilters}
          className="mt-1 self-start text-xs font-medium text-muted underline hover:text-ink"
        >
          Đặt lại
        </button>
      </div>
    </FilterPill>
  );
}

/** "Giá": the two-dot price bar. */
export function PricePill({ search }: { search: SearchState }) {
  return (
    <FilterPill
      label="Giá"
      active={search.filters.price_min !== "" || search.filters.price_max !== ""}
      onClear={() => {
        search.setFilter("price_min", "");
        search.setFilter("price_max", "");
      }}
    >
      <div className="w-64 max-w-full">
        <PriceRange
          id="filter-price"
          min={search.filters.price_min}
          max={search.filters.price_max}
          onChange={(lo, hi) => {
            search.setFilter("price_min", lo);
            search.setFilter("price_max", hi);
          }}
        />
      </div>
    </FilterPill>
  );
}

/** "Loại tin": one of room / apartment / house, or all. */
export function TypePill({ search }: { search: SearchState }) {
  const current = search.filters.type;
  return (
    <FilterPill
      label="Loại tin"
      active={current !== ""}
      onClear={() => {
        search.setFilter("type", "");
      }}
    >
      <div className="flex flex-col gap-1" role="group" aria-label="Loại tin">
        {[{ value: "", label: "Tất cả" }, ...TYPE_OPTIONS].map((o) => (
          <button
            key={o.value || "all"}
            type="button"
            onClick={() => {
              search.setFilter("type", o.value);
            }}
            aria-pressed={current === o.value}
            className={cn(
              "rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-tint",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate",
              current === o.value && "bg-tint font-semibold text-plate",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </FilterPill>
  );
}

/** "Tiện ích": a listing must have every chosen amenity. */
export function AmenitiesPill({ search }: { search: SearchState }) {
  const chosen = search.filters.amenity_ids;
  return (
    <FilterPill
      label="Tiện ích"
      active={chosen.length > 0}
      onClear={() => {
        for (const id of chosen) search.toggleAmenity(id);
      }}
    >
      <div className="flex flex-wrap gap-2">
        {search.amenities.map((a) => (
          <Chip
            key={a.id}
            on={chosen.includes(a.id)}
            onClick={() => {
              search.toggleAmenity(a.id);
            }}
            className="h-8 px-3 text-xs"
          >
            {a.name ?? `Tiện ích ${a.id}`}
          </Chip>
        ))}
      </div>
    </FilterPill>
  );
}
