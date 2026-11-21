import { describe, expect, it, vi } from "vitest";
import type { ListingFilters } from "@/features/search/lib/searchFilters";
import {
  SORT_OPTIONS,
  areaName,
  buildFilterChips,
  paginationWindow,
  priceChipLabel,
  sortLabel,
} from "./filterChips";

const NO_FILTERS: ListingFilters = {
  q: "",
  type: "",
  city_id: "",
  ward_id: "",
  school_id: "",
  max_km: "",
  price_min: "",
  price_max: "",
  sort: "newest",
  amenity_ids: [],
};

const refs = {
  cities: [{ id: 1, name: "Đà Nẵng" }],
  wards: [{ id: 10, name: "Hải Châu" }],
  schools: [{ id: 5, name: "ĐH Bách Khoa" }],
};

const actions = () => ({
  setFilter: vi.fn(),
  setCity: vi.fn(),
  setWard: vi.fn(),
  setSchool: vi.fn(),
});
const chips = (over: Partial<ListingFilters>, a = actions()) =>
  buildFilterChips({ ...NO_FILTERS, ...over }, refs, a);

describe("priceChipLabel", () => {
  it.each([
    ["1500000", "3000000", "1.500.000đ – 3.000.000đ"],
    ["1500000", "", "Từ 1.500.000đ"],
    ["", "3000000", "Dưới 3.000.000đ"],
  ])("(%j, %j) -> %s", (min, max, label) => {
    expect(priceChipLabel(min, max)).toBe(label);
  });
});

describe("buildFilterChips", () => {
  it("has no chips when nothing is filtered", () => {
    expect(chips({})).toEqual([]);
  });

  it("shows the search text in quotes", () => {
    expect(chips({ q: "gác lửng" })[0]).toMatchObject({ key: "q", label: '"gác lửng"' });
  });

  it("labels each filter and keeps a stable order", () => {
    const result = chips({
      q: "x",
      type: "apartment",
      city_id: "1",
      ward_id: "10",
      price_min: "1000000",
      school_id: "5",
    });
    expect(result.map((c) => [c.key, c.label])).toEqual([
      ["q", '"x"'],
      ["type", "Căn hộ"],
      ["city_id", "Đà Nẵng"],
      ["ward_id", "Hải Châu"],
      ["price", "Từ 1.000.000đ"],
      ["school_id", "ĐH Bách Khoa"],
    ]);
  });

  it("skips a filter whose id is not in the loaded lists (nothing to name)", () => {
    expect(chips({ city_id: "999", ward_id: "999", school_id: "999", type: "castle" })).toEqual([]);
  });

  it("clears the right filters when a chip is removed", () => {
    const a = actions();
    for (const chip of chips(
      { q: "x", type: "room", city_id: "1", ward_id: "10", price_min: "1", school_id: "5" },
      a,
    )) {
      chip.onRemove();
    }
    expect(a.setCity).toHaveBeenCalledWith("");
    expect(a.setWard).toHaveBeenCalledWith("");
    // The school chip also drops its radius and distance sort (setSchool does both).
    expect(a.setSchool).toHaveBeenCalledWith("");
    expect(a.setFilter.mock.calls).toEqual([
      ["q", ""],
      ["type", ""],
      ["price_min", ""],
      ["price_max", ""],
    ]);
  });
});

describe("areaName", () => {
  it("prefers ward, then school, then city", () => {
    expect(areaName({ ward_id: "10", school_id: "5", city_id: "1" }, refs)).toBe("Hải Châu");
    expect(areaName({ ward_id: "", school_id: "5", city_id: "1" }, refs)).toBe("ĐH Bách Khoa");
    expect(areaName({ ward_id: "", school_id: "", city_id: "1" }, refs)).toBe("Đà Nẵng");
  });

  it("is null when no area is set or known", () => {
    expect(areaName({ ward_id: "", school_id: "", city_id: "" }, refs)).toBeNull();
    expect(areaName({ ward_id: "999", school_id: "", city_id: "" }, refs)).toBeNull();
  });
});

describe("sortLabel", () => {
  it.each(SORT_OPTIONS.map((o) => [o.value, o.label]))("%s -> %s", (value, label) => {
    expect(sortLabel(value)).toBe(label);
  });

  it("falls back to the default for an unknown sort", () => {
    expect(sortLabel("bogus")).toBe("Mới nhất");
  });
});

describe("paginationWindow", () => {
  it.each([
    [1, 10, [1, 2, 3, 4, 5]],
    [2, 10, [1, 2, 3, 4, 5]],
    [3, 10, [1, 2, 3, 4, 5]],
    [4, 10, [2, 3, 4, 5, 6]],
    [9, 10, [6, 7, 8, 9, 10]],
    [10, 10, [6, 7, 8, 9, 10]],
    [5, 5, [1, 2, 3, 4, 5]],
    [1, 3, [1, 2, 3]],
    [1, 1, [1]],
    [0, 4, [1, 2, 3, 4]],
  ])("page %i of %i shows %j", (page, last, expected) => {
    expect(paginationWindow(page, last)).toEqual(expected);
  });

  it("is empty when there are no pages", () => {
    expect(paginationWindow(1, 0)).toEqual([]);
  });
});
