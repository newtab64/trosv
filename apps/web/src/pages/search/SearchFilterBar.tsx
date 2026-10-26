import React from "react";
import { Input } from "@/ui/input";
import { Chip } from "@/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/ui/popover";
import { Map as MapIcon, List as ListIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { useListingSearch } from "@/hooks/useListingSearch";

export const TYPE_OPTIONS = [
  { value: "room", label: "Phòng trọ" },
  { value: "apartment", label: "Căn hộ" },
  { value: "house", label: "Nhà nguyên căn" },
] as const;

export const RADIUS_OPTIONS = [
  { value: "1", label: "Trong 1 km" },
  { value: "2", label: "Trong 2 km" },
  { value: "3", label: "Trong 3 km" },
  { value: "5", label: "Trong 5 km" },
] as const;

export interface FilterPillProps {
  label: string;
  active: boolean;
  onClear: () => void;
  children: React.ReactNode;
}

export function FilterPill({
  label,
  active,
  onClear,
  children,
}: FilterPillProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "h-10 flex-none rounded-lg border px-3.5 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate",
            active
              ? "border-plate bg-plate-tint text-plate font-semibold"
              : "border-line-strong bg-card text-ink hover:bg-tint"
          )}
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent>
        {children}
        {active ? (
          <button
            type="button"
            onClick={onClear}
            className="mt-3 text-sm font-medium text-muted underline hover:text-ink"
          >
            Xóa lọc này
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

const SELECT_FIELD_CLASS =
  "h-10 rounded-lg border border-line-strong bg-card px-3 text-sm text-ink " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate disabled:opacity-50";

interface LocationSelectsProps {
  idPrefix: string;
  search: ReturnType<typeof useListingSearch>;
  cityAllLabel?: string;
}

function LocationSelects({
  idPrefix,
  search,
  cityAllLabel = "Tất cả",
}: LocationSelectsProps) {
  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}-city`} className="flex flex-col gap-1 text-xs font-medium text-ink-2">
          Tỉnh / Thành phố
          <select
            id={`${idPrefix}-city`}
            value={search.filters.city_id}
            onChange={(e) => { search.setCity(e.target.value); }}
            className={SELECT_FIELD_CLASS}
          >
            <option value="">{cityAllLabel}</option>
            {search.cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-ward`} className="flex flex-col gap-1 text-xs font-medium text-ink-2">
          Phường / Xã
          <select
            id={`${idPrefix}-ward`}
            value={search.filters.ward_id}
            onChange={(e) => { search.setWard(e.target.value); }}
            disabled={search.filters.city_id === ""}
            className={SELECT_FIELD_CLASS}
          >
            <option value="">
              {search.filters.city_id === "" ? "Chọn Tỉnh/TP trước" : "Tất cả phường"}
            </option>
            {search.wards
              .filter(
                (w) =>
                  search.filters.city_id === "" ||
                  String(w.city?.id ?? w.city_id ?? "") === search.filters.city_id
              )
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
          </select>
        </label>
      </div>
    </>
  );
}

export interface SearchFilterBarProps {
  search: ReturnType<typeof useListingSearch>;
  showMap: boolean;
  onToggleMap: () => void;
  onSaveSearch: () => void;
}

export function SearchFilterBar({
  search,
  showMap,
  onToggleMap,
  onSaveSearch,
}: SearchFilterBarProps) {
  return (
    <div className="sticky top-14 z-20 flex h-[55px] items-center gap-2 overflow-x-auto border-b border-line bg-paper px-4 min-[890px]:top-[72px] lg:z-10">
      <Input
        value={search.filters.q}
        onChange={(e) => { search.setFilter("q", e.target.value); }}
        placeholder="Khu vực, trường hoặc đường..."
        aria-label="Tìm theo khu vực"
        className="h-10 min-w-52 max-w-80"
      />

      <FilterPill
        label="Bộ lọc"
        active={search.filters.city_id !== "" || search.filters.ward_id !== ""}
        onClear={() => { search.setCity(""); }}
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

      <FilterPill
        label="Gần trường"
        active={search.filters.school_id !== "" || search.filters.max_km !== ""}
        onClear={() => {
          search.setFilter("school_id", "");
          search.setFilter("max_km", "");
        }}
      >
        <div className="flex flex-col gap-3 min-w-[250px]">
          <LocationSelects idPrefix="near-school" search={search} cityAllLabel="Tất cả tỉnh thành" />

          <div>
            <label htmlFor="filter-school" className="flex flex-col gap-1 text-xs font-medium text-ink-2">
              Trường đại học
              <select
                id="filter-school"
                value={search.filters.school_id}
                onChange={(e) => { search.setFilter("school_id", e.target.value); }}
                disabled={search.filters.ward_id === ""}
                className={SELECT_FIELD_CLASS}
              >
                <option value="">
                  {search.filters.city_id === ""
                    ? "Chọn Tỉnh/TP trước"
                    : search.filters.ward_id === ""
                    ? "Chọn Phường trước"
                    : "Chọn trường trong phường này"}
                </option>
                {search.schools
                  .filter((s) =>
                    search.filters.ward_id !== ""
                      ? String(s.ward?.id) === search.filters.ward_id
                      : search.filters.city_id === "" ||
                        String(s.city?.id ?? s.city_id ?? "") === search.filters.city_id
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          {search.filters.school_id !== "" ? (
            <label htmlFor="filter-radius" className="flex flex-col gap-1 text-xs font-medium text-ink-2">
              Bán kính
              <select
                id="filter-radius"
                value={search.filters.max_km}
                onChange={(e) => { search.setFilter("max_km", e.target.value); }}
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

      <FilterPill
        label="Giá"
        active={search.filters.price_min !== "" || search.filters.price_max !== ""}
        onClear={() => {
          search.setFilter("price_min", "");
          search.setFilter("price_max", "");
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <label htmlFor="filter-price-min" className="flex flex-col gap-1 text-xs font-medium text-ink-2">
            Giá từ (VND)
            <Input
              id="filter-price-min"
              type="number"
              value={search.filters.price_min}
              onChange={(e) => { search.setFilter("price_min", e.target.value); }}
              placeholder="1.000.000"
              aria-label="Giá tối thiểu (VND)"
              className="h-10"
            />
          </label>
          <label htmlFor="filter-price-max" className="flex flex-col gap-1 text-xs font-medium text-ink-2">
            Giá đến (VND)
            <Input
              id="filter-price-max"
              type="number"
              value={search.filters.price_max}
              onChange={(e) => { search.setFilter("price_max", e.target.value); }}
              placeholder="3.000.000"
              aria-label="Giá tối đa (VND)"
              className="h-10"
            />
          </label>
        </div>
      </FilterPill>

      <FilterPill
        label="Loại tin"
        active={search.filters.type !== ""}
        onClear={() => { search.setFilter("type", ""); }}
      >
        <div className="flex flex-col gap-1" role="group" aria-label="Loại tin">
          {[{ value: "", label: "Tất cả" }, ...TYPE_OPTIONS].map((o) => (
            <button
              key={o.value || "all"}
              type="button"
              onClick={() => { search.setFilter("type", o.value); }}
              aria-pressed={search.filters.type === o.value}
              className={cn(
                "rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-tint",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate",
                search.filters.type === o.value && "bg-tint font-semibold text-plate"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </FilterPill>

      <FilterPill
        label="Tiện ích"
        active={search.filters.amenity_ids.length > 0}
        onClear={() => {
          for (const id of search.filters.amenity_ids) search.toggleAmenity(id);
        }}
      >
        <div className="flex flex-wrap gap-2">
          {search.amenities.map((a) => (
            <Chip
              key={a.id}
              on={search.filters.amenity_ids.includes(a.id)}
              onClick={() => { search.toggleAmenity(a.id); }}
              className="h-8 px-3 text-xs"
            >
              {a.name ?? `Tiện ích ${a.id}`}
            </Chip>
          ))}
        </div>
      </FilterPill>

      <button
        type="button"
        onClick={onSaveSearch}
        className={
          "ml-auto h-9 flex-none rounded-lg px-3 text-sm font-medium text-ink-2 " +
          "transition-colors hover:bg-tint hover:text-ink focus-visible:outline-none " +
          "focus-visible:ring-2 focus-visible:ring-plate"
        }
      >
        Lưu tìm kiếm
      </button>

      <button
        type="button"
        onClick={onToggleMap}
        className={
          "flex h-9 flex-none items-center gap-1.5 rounded-lg border border-plate " +
          "bg-plate px-3 text-sm font-semibold text-white lg:hidden"
        }
        aria-pressed={showMap}
      >
        {showMap ? (
          <>
            <ListIcon className="size-4" aria-hidden /> Danh sách
          </>
        ) : (
          <>
            <MapIcon className="size-4" aria-hidden /> Bản đồ
          </>
        )}
      </button>
    </div>
  );
}
